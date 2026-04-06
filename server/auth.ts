import passport from "passport";
import { Strategy as DiscordStrategy } from "passport-discord";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import type { Express, Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { z } from "zod";
import { db, hasDatabaseUrl, pool } from "./db";
import { users, type User } from "@shared/schema";
import { eq } from "drizzle-orm";
import { storage } from "./storage";
import { getServerRecord, listServerRecords } from "./repositories/server-repository";

declare global {
  namespace Express {
    interface User {
      id: number;
      discordId: string;
      username: string;
      discriminator: string | null;
      avatar: string | null;
      email: string | null;
      isPremium: boolean | null;
      accessToken: string | null;
      refreshToken: string | null;
      stripeCustomerId: string | null;
      stripeSubscriptionId: string | null;
      isQaBypass?: boolean;
      qaServerId?: number;
      isOwnerSession?: boolean;
      ownerServerIds?: number[] | null;
    }
  }
}

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const QA_BYPASS_ENABLED = process.env.QA_BYPASS_ENABLED === "true";
const QA_BYPASS_TOKEN = process.env.QA_BYPASS_TOKEN?.trim() || null;
const QA_BYPASS_SERVER_ID = Number.parseInt(process.env.QA_BYPASS_SERVER_ID || "", 10);
const OWNER_IDS = (process.env.OWNER_IDS || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const OWNER_LOGIN_USERNAME = process.env.OWNER_LOGIN_USERNAME?.trim() || "owner";
const OWNER_LOGIN_PASSWORD = process.env.OWNER_LOGIN_PASSWORD?.trim() || null;

function parseServerIdList(raw: string | undefined) {
  const ids = (raw || "")
    .split(",")
    .map((value) => Number.parseInt(value.trim(), 10))
    .filter((value) => Number.isFinite(value) && value > 0);
  return ids.length ? Array.from(new Set(ids)) : null;
}

const OWNER_LOGIN_SERVER_IDS = parseServerIdList(process.env.OWNER_LOGIN_SERVER_IDS);
const OWNER_LOGIN_ENABLED = Boolean(OWNER_LOGIN_PASSWORD);
const ownerLoginSchema = z.object({
  username: z.string().trim().min(1).max(120),
  password: z.string().min(1).max(512),
});

function getAppBaseUrl() {
  return process.env.APP_URL || process.env.PUBLIC_BASE_URL || "http://localhost:5000";
}

function getQaBypassServerIdValue() {
  return Number.isFinite(QA_BYPASS_SERVER_ID) && QA_BYPASS_SERVER_ID > 0 ? QA_BYPASS_SERVER_ID : null;
}

function getOwnerSessionServerIdsValue() {
  return OWNER_LOGIN_SERVER_IDS;
}

function safeSecretEqual(left: string, right: string) {
  const leftHash = crypto.createHash("sha256").update(left).digest();
  const rightHash = crypto.createHash("sha256").update(right).digest();
  return crypto.timingSafeEqual(leftHash, rightHash);
}

function buildQaBypassUser(serverId: number): Express.User {
  return {
    id: -serverId,
    discordId: `qa-bypass-${serverId}`,
    username: "Archivist QA",
    discriminator: null,
    avatar: null,
    email: null,
    isPremium: true,
    accessToken: null,
    refreshToken: null,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    isQaBypass: true,
    qaServerId: serverId,
  };
}

function buildOwnerSessionUser(serverIds: number[] | null): Express.User {
  return {
    id: -900001,
    discordId: "owner-session",
    username: "Archivist Owner",
    discriminator: null,
    avatar: null,
    email: null,
    isPremium: true,
    accessToken: null,
    refreshToken: null,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    isOwnerSession: true,
    ownerServerIds: serverIds,
  };
}

function getSessionQaBypassUser(req: Request): Express.User | null {
  const qaUser = (req.session as session.Session & { qaBypassUser?: Express.User })?.qaBypassUser;
  return qaUser && qaUser.isQaBypass ? qaUser : null;
}

function getSessionOwnerUser(req: Request): Express.User | null {
  const ownerUser = (req.session as session.Session & { ownerSessionUser?: Express.User })?.ownerSessionUser;
  return ownerUser && ownerUser.isOwnerSession ? ownerUser : null;
}

export function isQaBypassUser(user: Express.User | undefined | null): user is Express.User & { isQaBypass: true; qaServerId: number } {
  return Boolean(user?.isQaBypass && typeof user.qaServerId === "number" && user.qaServerId > 0);
}

export function isOwnerSessionUser(user: Express.User | undefined | null): user is Express.User & { isOwnerSession: true; ownerServerIds?: number[] | null } {
  return Boolean(user?.isOwnerSession);
}

export function getQaBypassServerId(req: Request) {
  return isQaBypassUser(req.user) ? req.user.qaServerId : null;
}

export function getOwnerSessionServerIds(req: Request) {
  return isOwnerSessionUser(req.user) ? (req.user.ownerServerIds ?? null) : null;
}

export function hasOwnerAccess(user: Express.User | undefined | null) {
  return Boolean(user && (isOwnerSessionUser(user) || OWNER_IDS.includes(user.discordId)));
}

export function requireOwnerAccess(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  if (!hasOwnerAccess(req.user)) {
    return res.status(403).json({ message: "Owner access required." });
  }

  return next();
}

export async function setupAuth(app: Express) {
  const isProduction = process.env.NODE_ENV === "production";
  const sessionSecret = process.env.SESSION_SECRET;

  if (!sessionSecret && isProduction) {
    throw new Error("SESSION_SECRET must be set in production.");
  }

  const sessionConfig: session.SessionOptions = {
    secret: sessionSecret || "archivist-dev-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: isProduction,
      // Same-site dashboard + OAuth callback works reliably with lax behind nginx.
      // Using "none" can cause cookie drops in some browser/proxy combinations.
      sameSite: "lax",
    },
  };

  if (hasDatabaseUrl) {
    // Create session table manually so connect-pg-simple never needs to read table.sql
    // (which fails in production when bundled)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE
      ) WITH (OIDS=FALSE);
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
    `);

    const PgSession = connectPgSimple(session);
    sessionConfig.store = new PgSession({
      pool: pool as any,
      tableName: "session",
      createTableIfMissing: false,
    });
  }

  app.use(session(sessionConfig));

  app.use(passport.initialize());
  app.use(passport.session());

  app.use((req, _res, next) => {
    const ownerUser = getSessionOwnerUser(req);
    if (ownerUser) {
      (req as Request & { user: Express.User }).user = ownerUser;
      (req as Request & { isAuthenticated: typeof req.isAuthenticated }).isAuthenticated = (() => true) as typeof req.isAuthenticated;
      return next();
    }

    const qaUser = getSessionQaBypassUser(req);
    if (qaUser) {
      (req as Request & { user: Express.User }).user = qaUser;
      (req as Request & { isAuthenticated: typeof req.isAuthenticated }).isAuthenticated = (() => true) as typeof req.isAuthenticated;
    }
    next();
  });

  app.use((req, res, next) => {
    if (!isQaBypassUser(req.user)) return next();
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
    if (req.path === "/auth/logout") return next();
    return res.status(403).json({ message: "QA bypass is read-only." });
  });

  if (DISCORD_CLIENT_ID && DISCORD_CLIENT_SECRET) {
    const callbackURL = `${getAppBaseUrl().replace(/\/$/, "")}/auth/discord/callback`;

    passport.use(
      new DiscordStrategy(
        {
          clientID: DISCORD_CLIENT_ID,
          clientSecret: DISCORD_CLIENT_SECRET,
          callbackURL,
          scope: ["identify", "email", "guilds"],
        },
        async (accessToken: string, refreshToken: string, profile: any, done: any) => {
          try {
            const existing = await db
              .select()
              .from(users)
              .where(eq(users.discordId, profile.id));

            let user: User;
            if (existing.length > 0) {
              try {
                const [updated] = await db
                  .update(users)
                  .set({
                    username: profile.username,
                    discriminator: profile.discriminator || null,
                    avatar: profile.avatar,
                    email: profile.email || null,
                    accessToken,
                    refreshToken,
                  })
                  .where(eq(users.discordId, profile.id))
                  .returning();
                user = updated;
              } catch (err: any) {
                // Fallback for older DB schemas that may be missing optional OAuth columns.
                console.warn("[Auth] Full profile update failed; using minimal update:", err?.message || err);
                const [updated] = await db
                  .update(users)
                  .set({
                    username: profile.username,
                  })
                  .where(eq(users.discordId, profile.id))
                  .returning();
                user = updated as User;
              }
            } else {
              try {
                const [created] = await db
                  .insert(users)
                  .values({
                    discordId: profile.id,
                    username: profile.username,
                    discriminator: profile.discriminator || null,
                    avatar: profile.avatar,
                    email: profile.email || null,
                    accessToken,
                    refreshToken,
                  })
                  .returning();
                user = created;
              } catch (err: any) {
                console.warn("[Auth] Full profile insert failed; using minimal insert:", err?.message || err);
                const [created] = await db
                  .insert(users)
                  .values({
                    discordId: profile.id,
                    username: profile.username,
                  })
                  .returning();
                user = created as User;
              }
            }

            return done(null, user);
          } catch (err) {
            return done(err);
          }
        }
      )
    );
  }

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      done(null, user || null);
    } catch (err) {
      done(err);
    }
  });

  app.get("/auth/discord", (req, res, next) => {
    if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
      return res.status(503).json({ message: "Discord OAuth not configured. Set DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET." });
    }
    if (!hasDatabaseUrl) {
      return res.status(503).json({ message: "Authentication requires DATABASE_URL to persist sessions." });
    }
    passport.authenticate("discord")(req, res, next);
  });

  app.get("/auth/qa-login", async (req, res) => {
    if (!QA_BYPASS_ENABLED) {
      return res.status(404).json({ message: "Not found" });
    }

    const expectedToken = QA_BYPASS_TOKEN;
    const providedToken = String(req.query.token || "");
    if (expectedToken && providedToken !== expectedToken) {
      return res.status(403).json({ message: "Invalid QA token" });
    }

    const serverId = getQaBypassServerIdValue();
    if (!serverId) {
      return res.status(503).json({ message: "QA bypass server is not configured." });
    }

    const server = await getServerRecord(serverId);
    if (!server) {
      return res.status(404).json({ message: "Configured QA server was not found." });
    }

    (req.session as session.Session & { qaBypassUser?: Express.User }).qaBypassUser = buildQaBypassUser(server.id);
    delete (req.session as session.Session & { ownerSessionUser?: Express.User }).ownerSessionUser;
    req.session.save((error) => {
      if (error) {
        console.error("[Auth] QA bypass session save error:", error?.message || error);
        return res.status(500).json({ message: "Failed to start QA session." });
      }

      return res.redirect(`/dashboard/servers/${server.id}/commands`);
    });
  });

  app.get("/api/auth/options", (_req, res) => {
    return res.json({
      discordLoginEnabled: Boolean(DISCORD_CLIENT_ID && DISCORD_CLIENT_SECRET && hasDatabaseUrl),
      ownerLoginEnabled: OWNER_LOGIN_ENABLED,
    });
  });

  app.post("/auth/owner-login", async (req, res) => {
    if (!OWNER_LOGIN_ENABLED || !OWNER_LOGIN_PASSWORD) {
      return res.status(503).json({ message: "Owner login is not configured on this deployment." });
    }

    const parsed = ownerLoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid owner login payload." });
    }

    const usernameMatches = safeSecretEqual(parsed.data.username.trim(), OWNER_LOGIN_USERNAME);
    const passwordMatches = safeSecretEqual(parsed.data.password, OWNER_LOGIN_PASSWORD);
    if (!usernameMatches || !passwordMatches) {
      return res.status(401).json({ message: "Invalid owner credentials." });
    }

    const ownerServerIds = getOwnerSessionServerIdsValue();
    if (ownerServerIds?.length) {
      const knownServers = await Promise.all(ownerServerIds.map((serverId) => getServerRecord(serverId)));
      if (knownServers.some((server) => !server)) {
        return res.status(503).json({ message: "Owner login server access is misconfigured." });
      }
    }

    req.session.regenerate((error) => {
      if (error) {
        console.error("[Auth] Owner session regeneration error:", error?.message || error);
        return res.status(500).json({ message: "Failed to start owner session." });
      }

      (req.session as session.Session & { ownerSessionUser?: Express.User }).ownerSessionUser = buildOwnerSessionUser(ownerServerIds);
      const redirectTo = ownerServerIds?.length === 1
        ? `/dashboard/servers/${ownerServerIds[0]}/commands`
        : "/dashboard";
      req.session.save((saveError) => {
        if (saveError) {
          console.error("[Auth] Owner session save error:", saveError?.message || saveError);
          return res.status(500).json({ message: "Failed to persist owner session." });
        }

        return res.json({
          success: true,
          redirectTo,
        });
      });
    });
  });

  app.get(
    "/auth/discord/callback",
    (req, res, next) => {
      const failRedirect = (code: string) => `/login?error=${encodeURIComponent(code)}`;

      if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
        return res.redirect(failRedirect("discord_not_configured"));
      }
      if (!hasDatabaseUrl) {
        return res.redirect(failRedirect("database_not_configured"));
      }

      passport.authenticate("discord", (err: any, user: any, info: any) => {
        if (err) {
          console.error("[Auth] Discord callback error:", err?.message || err);
          return res.redirect(failRedirect(err?.code || "auth_failed"));
        }

        if (!user) {
          const infoMsg = typeof info === "string" ? info : info?.message;
          if (infoMsg) {
            console.warn("[Auth] Discord callback failed:", infoMsg);
          } else {
            console.warn("[Auth] Discord callback failed: no user returned");
          }
          return res.redirect(failRedirect("auth_failed"));
        }

        req.logIn(user, (loginErr) => {
          if (loginErr) {
            console.error("[Auth] Session login error:", (loginErr as any)?.message || loginErr);
            return res.redirect(failRedirect("session_failed"));
          }
          req.session.save((sessionErr) => {
            if (sessionErr) {
              console.error("[Auth] Session save error:", (sessionErr as any)?.message || sessionErr);
              return res.redirect(failRedirect("session_failed"));
            }

            return res.redirect("/dashboard");
          });
        });
      })(req, res, next);
    }
  );

  app.post("/auth/logout", (req, res) => {
    if (isOwnerSessionUser(req.user)) {
      delete (req.session as session.Session & { ownerSessionUser?: Express.User }).ownerSessionUser;
      return req.session.destroy((error) => {
        if (error) return res.status(500).json({ message: "Logout failed" });
        res.clearCookie("connect.sid");
        return res.json({ success: true });
      });
    }

    if (isQaBypassUser(req.user)) {
      delete (req.session as session.Session & { qaBypassUser?: Express.User }).qaBypassUser;
      return req.session.destroy((error) => {
        if (error) return res.status(500).json({ message: "Logout failed" });
        res.clearCookie("connect.sid");
        return res.json({ success: true });
      });
    }

    req.logout((err) => {
      if (err) return res.status(500).json({ message: "Logout failed" });
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const ownerAccess = hasOwnerAccess(req.user);
    const isPremium = req.user.isPremium || ownerAccess;

    res.json({
      id: req.user.id,
      discordId: req.user.discordId,
      username: req.user.username,
      discriminator: req.user.discriminator,
      avatar: req.user.avatar,
      email: req.user.email,
      isPremium,
      stripeCustomerId: req.user.stripeCustomerId,
      stripeSubscriptionId: req.user.stripeSubscriptionId,
      ownerAccess,
      ownerSession: isOwnerSessionUser(req.user),
      ownerServerIds: isOwnerSessionUser(req.user) ? (req.user.ownerServerIds ?? null) : null,
      qaBypass: isQaBypassUser(req.user),
      qaServerId: getQaBypassServerId(req),
    });
  });

  app.get("/api/auth/guilds", requireAuth, async (req, res) => {
    if (isOwnerSessionUser(req.user)) {
      const allowedServerIds = req.user.ownerServerIds ?? null;
      const allServers = await listServerRecords();
      const visibleServers = allowedServerIds?.length
        ? allServers.filter((server) => allowedServerIds.includes(server.id))
        : allServers;

      return res.json(visibleServers.map((server) => ({
        id: server.discordId,
        name: server.name,
        icon: server.iconUrl || null,
        owner: true,
        permissions: "32",
      })));
    }

    if (isQaBypassUser(req.user)) {
      const serverId = req.user.qaServerId;
      const server = await getServerRecord(serverId);
      if (!server) return res.json([]);
      return res.json([
        {
          id: server.discordId,
          name: server.name,
          icon: server.iconUrl || null,
          owner: true,
          permissions: "32",
        },
      ]);
    }

    const sessionState = (req as Request & {
      session?: {
        manageableGuildCache?: {
          guildIds: string[];
          fetchedAt: number;
        };
      };
    }).session;
    const cachedGuilds = sessionState?.manageableGuildCache;
    const now = Date.now();
    if (cachedGuilds && Array.isArray(cachedGuilds.guildIds) && now - cachedGuilds.fetchedAt < 30 * 60 * 1000) {
      const allServers = await listServerRecords();
      const cachedServerMap = new Map(allServers.map((server) => [server.discordId, server]));
      return res.json(
        cachedGuilds.guildIds.map((guildId) => {
          const server = cachedServerMap.get(guildId);
          return {
            id: guildId,
            name: server?.name || guildId,
            icon: server?.iconUrl || null,
            owner: true,
            permissions: "32",
          };
        }),
      );
    }

    try {
      const response = await fetch("https://discord.com/api/v10/users/@me/guilds", {
        headers: { Authorization: `Bearer ${req.user!.accessToken}` },
      });
      if (!response.ok) {
        if (cachedGuilds?.guildIds?.length) {
          const allServers = await listServerRecords();
          const cachedServerMap = new Map(allServers.map((server) => [server.discordId, server]));
          return res.json(
            cachedGuilds.guildIds.map((guildId) => {
              const server = cachedServerMap.get(guildId);
              return {
                id: guildId,
                name: server?.name || guildId,
                icon: server?.iconUrl || null,
                owner: true,
                permissions: "32",
              };
            }),
          );
        }
        return res.status(502).json({ message: "Failed to fetch guilds from Discord" });
      }
      const guilds = await response.json();
      const manageableGuilds = guilds.filter(
        (g: any) => (BigInt(g.permissions) & BigInt(0x20)) === BigInt(0x20)
      );
      if (sessionState) {
        sessionState.manageableGuildCache = {
          guildIds: manageableGuilds.map((guild: any) => guild.id),
          fetchedAt: now,
        };
      }
      res.json(manageableGuilds);
    } catch (err) {
      if (cachedGuilds?.guildIds?.length) {
        const allServers = await listServerRecords();
        const cachedServerMap = new Map(allServers.map((server) => [server.discordId, server]));
        return res.json(
          cachedGuilds.guildIds.map((guildId) => {
            const server = cachedServerMap.get(guildId);
            return {
              id: guildId,
              name: server?.name || guildId,
              icon: server?.iconUrl || null,
              owner: true,
              permissions: "32",
            };
          }),
        );
      }
      res.status(500).json({ message: "Failed to fetch guilds" });
    }
  });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && req.user) {
    return next();
  }

  console.warn(`[Auth] Unauthorized request: ${req.method} ${req.originalUrl} ip=${req.ip}`);
  res.status(401).json({ message: "Authentication required" });
}

export function requirePremium(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  const ownerIds = (process.env.OWNER_IDS || "").split(",").filter(Boolean);
  if (req.user.isPremium || ownerIds.includes(req.user.discordId)) {
    return next();
  }
  res.status(403).json({ message: "Premium subscription required" });
}
