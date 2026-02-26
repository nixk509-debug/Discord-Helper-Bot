import passport from "passport";
import { Strategy as DiscordStrategy } from "passport-discord";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import type { Express, Request, Response, NextFunction } from "express";
import { db, hasDatabaseUrl, pool } from "./db";
import { users, type User } from "@shared/schema";
import { eq } from "drizzle-orm";

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
    }
  }
}

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;

function getAppBaseUrl() {
  return process.env.APP_URL || process.env.PUBLIC_BASE_URL || "http://localhost:5000";
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
      sameSite: isProduction ? "none" : "lax",
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
            } else {
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

  app.get(
    "/auth/discord/callback",
    (req, res, next) => {
      if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
        return res.redirect("/?error=discord_not_configured");
      }
      if (!hasDatabaseUrl) {
        return res.redirect("/?error=database_not_configured");
      }
      passport.authenticate("discord", {
        failureRedirect: "/?error=auth_failed",
        successRedirect: "/dashboard",
      })(req, res, next);
    }
  );

  app.post("/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) return res.status(500).json({ message: "Logout failed" });
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const ownerIds = (process.env.OWNER_IDS || "").split(",").filter(Boolean);
    const isPremium = req.user.isPremium || ownerIds.includes(req.user.discordId);

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
    });
  });

  app.get("/api/auth/guilds", requireAuth, async (req, res) => {
    try {
      const response = await fetch("https://discord.com/api/v10/users/@me/guilds", {
        headers: { Authorization: `Bearer ${req.user!.accessToken}` },
      });
      if (!response.ok) {
        return res.status(502).json({ message: "Failed to fetch guilds from Discord" });
      }
      const guilds = await response.json();
      const manageableGuilds = guilds.filter(
        (g: any) => (BigInt(g.permissions) & BigInt(0x20)) === BigInt(0x20)
      );
      res.json(manageableGuilds);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch guilds" });
    }
  });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && req.user) {
    return next();
  }
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
