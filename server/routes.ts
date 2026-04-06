import type { Express, Request, Response } from "express";
import type { Server } from "http";
import { z } from "zod";
import { api } from "@shared/routes";
import { storage } from "./storage";
import {
  servers,
  embeds as embedsTable,
  channelSyncTemplates,
  permissionRules,
  categoryLockSnapshots,
  economy,
  type EmbedComponentType,
  type EmbedComponentOption,
  type InteractiveActionConfig,
} from "@shared/schema";
import { db, hasDatabaseUrl } from "./db";
import { eq, sql, and } from "drizzle-orm";
import { getOwnerSessionServerIds, getQaBypassServerId, isOwnerSessionUser, requireAuth, requireOwnerAccess } from "./auth";
import { getBotClient, getBotStatus } from "./bot/index";
import { getServerCommandLogs, getServerWorkspaceOverview } from "./archivist";
import { getArchivistEnv } from "./archivist/config/env";
import { invalidateCustomCommandCache, syncCustomCommandsForServer } from "./archivist/features/custom-command/runtime";
import { ArchivistLogger } from "./archivist/lib/logger";
import { recordAudit, getAuditLog } from "./auditService";
import { createSnapshot, listSnapshots, rollback } from "./snapshotService";
import { generateCode, redeemCode, listCodes, revokeCode } from "./codeVaultService";
import { listPermissionRules, createPermissionRule, deletePermissionRule, checkPermission } from "./permissionsService";
import { patchGuildConfig } from "./configService";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
} from "discord.js";
import { EMBED_ACTION_TOKEN_PREFIX, encodeEmbedActionToken } from "./bot/embed-action-token";
import {
  buildChannelLockPatch,
  assertCommunityTypeAllowed,
  canSetNsfw,
  canSetSlowmode,
  canSetTopic,
} from "./archivist/features/channel/helpers";
import {
  buildCustomCommandV2Slug,
  createDefaultCustomCommandV2Definition,
} from "@shared/custom-command-v2";
import { invalidateCustomCommandV2Cache } from "./archivist/features/custom-command-v2/cache";
import { buildCustomCommandV2CreateInput, compileCustomCommandV2Definition } from "./archivist/features/custom-command-v2/compile";
import { dryRunCustomCommandV2 } from "./archivist/features/custom-command-v2/executor";
import { prepareCustomCommandV2Import, previewCustomCommandV2Import } from "./archivist/features/custom-command-v2/import-service";
import { invalidateCustomCommandV2RuntimeCache, normalizeCustomCommandV2SlashName } from "./archivist/features/custom-command-v2/runtime";
import { siteEditorSurfaceKeySchema } from "@shared/site-editor";
import {
  buildLockrServerWebhookToken,
  buildServerPremiumPatchFromLockrEvent,
  getLockrWebhookSecret,
  normalizeLockrEventType,
  verifyLockrServerWebhookToken,
} from "./lockr-webhook";
import { registerStudioRoutes } from "./http/studio-routes";
import { publishStudioMessage, registerStudioPublishRoutes } from "./http/studio-publish-routes";
import { getServerRecord, listServerRecords } from "./repositories/server-repository";
import {
  createCustomCommandRecord,
  createCustomCommandV2Record,
  deleteCustomCommandRecord,
  deleteCustomCommandV2Record,
  getCustomCommandRecord,
  getCustomCommandV2Record,
  listCustomCommandRecords,
  listCustomCommandV2Records,
  updateCustomCommandRecord,
  updateCustomCommandV2Record,
} from "./repositories/custom-command-repository";
import {
  createEmbedRecord,
  deleteEmbedRecord,
  getEmbedRecord,
  listEmbedRecords,
  updateEmbedRecord,
} from "./repositories/embed-repository";
import {
  createAutoRoleRecord,
  createReactionRoleRecord,
  deleteAutoRoleRecord,
  deleteChannelSettingRecord,
  deleteReactionRoleRecord,
  getAutoRoleRecord,
  getChannelSettingRecord,
  getReactionRoleRecord,
  listAutoRoleRecords,
  listChannelSettingRecords,
  listReactionRoleRecords,
  upsertChannelSettingRecord,
} from "./repositories/access-config-repository";
import {
  clearWarningRecords,
  createWarningRecord,
  deletePunishmentConfigRecord,
  deleteWarningRecord,
  listPunishmentConfigRecords,
  listWarningRecords,
  upsertPunishmentConfigRecord,
} from "./repositories/moderation-config-repository";
import {
  getLevelingConfigRecord,
  getStarboardConfigRecord,
  upsertLevelingConfigRecord,
  upsertStarboardConfigRecord,
} from "./repositories/community-config-repository";
import {
  createScheduledMessageRecord,
  createTicketPanelRecord,
  deleteScheduledMessageRecord,
  deleteTicketPanelRecord,
  getTicketConfigRecord,
  listScheduledMessageRecords,
  listTicketPanelRecords,
  updateScheduledMessageRecord,
  updateTicketPanelRecord,
  upsertTicketConfigRecord,
} from "./repositories/operations-config-repository";

function consoleSyncLogger(scope: string) {
  return new ArchivistLogger(scope, getArchivistEnv().logLevel);
}

function formatSyncWarning(error: unknown) {
  if (error && typeof error === "object") {
    const rawMessage =
      "rawError" in error && error.rawError && typeof error.rawError === "object" && "message" in error.rawError
        ? String((error.rawError as any).message || "").trim()
        : "";
    if (rawMessage) return rawMessage;
    if ("message" in error && typeof error.message === "string" && error.message.trim()) {
      return error.message.trim();
    }
  }
  return "Discord rejected the slash command sync.";
}

function formatValidationIssues(error: z.ZodError) {
  return error.issues.map((entry) => ({
    path: entry.path.length > 0 ? entry.path.join(".") : "request",
    code: entry.code,
    message: entry.message,
    severity: "error" as const,
  }));
}

function getPublicBaseUrl(req: Request) {
  return (process.env.PUBLIC_BASE_URL || process.env.APP_URL || `${req.protocol}://${req.get("host") || "localhost:5000"}`)
    .replace(/\/$/, "");
}

function applyLockrWebhookHeaders(res: Response) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");
}

function getPersistentActorUserId(req: Request) {
  return isOwnerSessionUser(req.user) ? null : req.user?.id ?? null;
}

async function syncArchivistCustomCommandsAfterChange(input: {
  scope: string;
  serverId: number;
  details?: Record<string, unknown>;
}) {
  let syncWarning: string | null = null;
  const client = getBotClient();
  if (!client) return syncWarning;

  await syncCustomCommandsForServer({
    client,
    env: getArchivistEnv(),
    logger: consoleSyncLogger(input.scope),
    serverId: input.serverId,
  }).catch((error) => {
    syncWarning = formatSyncWarning(error);
    consoleSyncLogger(input.scope).error("Archivist custom command sync failed after change.", {
      serverId: input.serverId,
      error: syncWarning,
      ...input.details,
    });
  });

  return syncWarning;
}

async function getManageableGuildIds(req: Request) {
  const user = (req as Request & { user?: Express.User }).user;
  if (!user?.accessToken || user.isQaBypass || user.isOwnerSession) return null;
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
    return new Set(cachedGuilds.guildIds);
  }

  try {
    const response = await fetch("https://discord.com/api/v10/users/@me/guilds", {
      headers: { Authorization: `Bearer ${user.accessToken}` },
    });
    if (!response.ok) {
      return cachedGuilds?.guildIds?.length ? new Set(cachedGuilds.guildIds) : null;
    }
    const guilds = await response.json() as Array<{ id: string; permissions: string }>;
    const manageableGuildIds = guilds
      .filter((guild) => (BigInt(guild.permissions || "0") & BigInt(0x20)) === BigInt(0x20))
      .map((guild) => guild.id);
    if (sessionState) {
      sessionState.manageableGuildCache = {
        guildIds: manageableGuildIds,
        fetchedAt: now,
      };
    }
    return new Set(
      manageableGuildIds,
    );
  } catch {
    return cachedGuilds?.guildIds?.length ? new Set(cachedGuilds.guildIds) : null;
  }
}

function getConnectedGuildIds() {
  const client = getBotClient();
  if (!client?.isReady()) return null;
  return new Set(Array.from(client.guilds.cache.keys()));
}

function getStudioActorUserId(req: Request) {
  return isOwnerSessionUser((req as Request & { user?: Express.User }).user) ? null : req.user!.id;
}

function normalizeStudioOwnedScope<T extends "personal" | "server" | "starter">(req: Request, scope: T): T | "server" {
  if (scope === "personal" && isOwnerSessionUser((req as Request & { user?: Express.User }).user)) {
    return "server";
  }
  return scope;
}

function getSiteEditorActor(req: Request) {
  const user = (req as Request & { user?: Express.User }).user;
  if (!user) return { userId: null, label: null };

  return {
    userId: isOwnerSessionUser(user) ? null : user.id,
    label: user.username || (isOwnerSessionUser(user) ? "Owner Access" : null),
  };
}

function parseSiteEditorSurface(value: string) {
  const parsed = siteEditorSurfaceKeySchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

async function filterVisibleServersForRequest(req: Request, servers: any[]) {
  const ownerServerIds = getOwnerSessionServerIds(req as any);
  if (isOwnerSessionUser((req as Request & { user?: Express.User }).user)) {
    if (ownerServerIds?.length) {
      return servers.filter((server) => ownerServerIds.includes(server.id));
    }
    return [...servers];
  }

  const qaServerId = getQaBypassServerId(req as any);
  if (qaServerId) {
    return servers.filter((server) => server.id === qaServerId);
  }

  const manageableGuildIds = await getManageableGuildIds(req);
  if (!manageableGuildIds) {
    return [];
  }

  let visibleServers = servers.filter((server) => manageableGuildIds.has(server.discordId));

  const connectedGuildIds = getConnectedGuildIds();
  if (connectedGuildIds) {
    visibleServers = visibleServers.filter((server) => connectedGuildIds.has(server.discordId));
  }

  return visibleServers;
}

async function getVisibleServerForRequest(req: Request, serverId: number) {
  const server = await getServerRecord(serverId);
  if (!server) return null;
  const visibleServers = await filterVisibleServersForRequest(req, [server]);
  return visibleServers[0] ?? null;
}

async function hasStudioRecordAccess(
  req: Request,
  resource: { serverId: number; scope?: string | null; ownerUserId?: number | null },
) {
  if (resource.scope === "personal") {
    const user = (req as Request & { user?: Express.User }).user;
    if (!user || isOwnerSessionUser(user)) return false;
    return resource.ownerUserId === user.id;
  }

  return Boolean(await getVisibleServerForRequest(req, resource.serverId));
}

async function ensureVisibleServerForRequest(req: Request, res: any, serverId: number) {
  const server = await getVisibleServerForRequest(req, serverId);
  if (!server) {
    res.status(403).json({ message: "You do not have access to that Archivist server." });
    return null;
  }
  return server;
}

function getSlashCollisionIssue(normalizedName: string, conflictingName: string) {
  return {
    path: "command.trigger.name",
    code: "duplicate_slash_name",
    message: `Another enabled Archivist slash command already uses /${normalizedName}.`,
    severity: "error" as const,
    suggestedFix: `Rename this slash command so it does not collide with "${conflictingName}".`,
  };
}

async function findConflictingSlashCommandV2(input: {
  serverId: number;
  definition: ReturnType<typeof createDefaultCustomCommandV2Definition>;
  excludeId?: number;
}) {
  if (input.definition.trigger.type !== "slash" || input.definition.behavior.enabled === false) return null;
  const normalizedName = normalizeCustomCommandV2SlashName(input.definition.trigger.name || input.definition.meta.name);
  if (!normalizedName) return null;

  const commands = await listCustomCommandV2Records(input.serverId);
  const conflictingCommand = commands.find((command) => {
    if (input.excludeId && command.id === input.excludeId) return false;
    if (command.enabled === false || command.definition.behavior.enabled === false) return false;
    if (command.compiled.trigger.type !== "slash") return false;
    return normalizeCustomCommandV2SlashName(command.compiled.trigger.name || command.name) === normalizedName;
  });

  if (!conflictingCommand) return null;
  return getSlashCollisionIssue(normalizedName, conflictingCommand.name);
}

export async function registerRoutes(_server: Server, app: Express) {

  // Protect all /api/servers/* routes - exempt only the public code-redeem endpoint
  app.use("/api/servers", (req, res, next) => {
    if (req.path.match(/\/codes\/redeem$/) && req.method === "POST") return next();
    return requireAuth(req as any, res, next);
  });

  app.use("/api/servers", (req, res, next) => {
    const ownerServerIds = getOwnerSessionServerIds(req as any);
    if (!ownerServerIds?.length) return next();

    const match = req.path.match(/^\/(\d+)(?:\/|$)/);
    if (!match) return next();

    if (!ownerServerIds.includes(Number.parseInt(match[1], 10))) {
      return res.status(403).json({ message: "Owner access is limited to the configured dashboard servers." });
    }

    return next();
  });

  app.use("/api/servers", (req, res, next) => {
    const qaServerId = getQaBypassServerId(req as any);
    if (!qaServerId) return next();

    const match = req.path.match(/^\/(\d+)(?:\/|$)/);
    if (!match) return next();

    if (Number.parseInt(match[1], 10) !== qaServerId) {
      return res.status(403).json({ message: "QA access is limited to the configured test server." });
    }

    return next();
  });

  app.use("/api/studio", requireAuth);
  app.use("/api/commands", requireAuth);
  app.use("/api/embeds", requireAuth);
  app.use("/api/channel-settings", requireAuth);
  app.use("/api/reaction-roles", requireAuth);
  app.use("/api/auto-roles", requireAuth);
  app.use("/api/commands-v2", requireAuth);
  app.use("/api/site-editor", requireOwnerAccess);

  app.use("/api/commands-v2", async (req, res, next) => {
    const ownerServerIds = getOwnerSessionServerIds(req as any);
    if (!ownerServerIds?.length) return next();

    const match = req.path.match(/^\/(\d+)(?:\/|$)/);
    if (!match) return next();

    const command = await getCustomCommandV2Record(Number.parseInt(match[1], 10));
    if (!command) return res.status(404).json({ message: "Command not found" });
    if (!ownerServerIds.includes(command.serverId)) {
      return res.status(403).json({ message: "Owner access is limited to the configured dashboard servers." });
    }

    return next();
  });

  app.use("/api/servers", async (req, res, next) => {
    if (req.path.match(/\/codes\/redeem$/) && req.method === "POST") return next();

    const match = req.path.match(/^\/(\d+)(?:\/|$)/);
    if (!match) return next();

    const serverId = Number.parseInt(match[1], 10);
    if (!Number.isFinite(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    const server = await getVisibleServerForRequest(req, serverId);
    if (!server) {
      return res.status(403).json({ message: "You do not have access to that Archivist server." });
    }
    return next();
  });

  app.use("/api/commands", async (req, res, next) => {
    const match = req.path.match(/^\/(\d+)(?:\/|$)/);
    if (!match) return next();

    const command = await getCustomCommandRecord(Number.parseInt(match[1], 10));
    if (!command) return res.status(404).json({ message: "Command not found" });

    const server = await getVisibleServerForRequest(req, command.serverId);
    if (!server) {
      return res.status(403).json({ message: "You do not have access to that Archivist server." });
    }

    return next();
  });

  app.use("/api/embeds", async (req, res, next) => {
    const match = req.path.match(/^\/(\d+)(?:\/|$)/);
    if (!match) return next();

    const embed = await getEmbedRecord(Number.parseInt(match[1], 10));
    if (!embed) return res.status(404).json({ message: "Embed not found" });

    const server = await getVisibleServerForRequest(req, embed.serverId);
    if (!server) {
      return res.status(403).json({ message: "You do not have access to that Archivist server." });
    }

    return next();
  });

  app.use("/api/channel-settings", async (req, res, next) => {
    const match = req.path.match(/^\/(\d+)(?:\/|$)/);
    if (!match) return next();

    const entry = await getChannelSettingRecord(Number.parseInt(match[1], 10));
    if (!entry) return res.status(404).json({ message: "Channel settings not found" });

    const server = await getVisibleServerForRequest(req, entry.serverId);
    if (!server) {
      return res.status(403).json({ message: "You do not have access to that Archivist server." });
    }

    return next();
  });

  app.use("/api/reaction-roles", async (req, res, next) => {
    const match = req.path.match(/^\/(\d+)(?:\/|$)/);
    if (!match) return next();

    const entry = await getReactionRoleRecord(Number.parseInt(match[1], 10));
    if (!entry) return res.status(404).json({ message: "Reaction role not found" });

    const server = await getVisibleServerForRequest(req, entry.serverId);
    if (!server) {
      return res.status(403).json({ message: "You do not have access to that Archivist server." });
    }

    return next();
  });

  app.use("/api/auto-roles", async (req, res, next) => {
    const match = req.path.match(/^\/(\d+)(?:\/|$)/);
    if (!match) return next();

    const entry = await getAutoRoleRecord(Number.parseInt(match[1], 10));
    if (!entry) return res.status(404).json({ message: "Auto role not found" });

    const server = await getVisibleServerForRequest(req, entry.serverId);
    if (!server) {
      return res.status(403).json({ message: "You do not have access to that Archivist server." });
    }

    return next();
  });

  app.use("/api/commands-v2", async (req, res, next) => {
    const match = req.path.match(/^\/(\d+)(?:\/|$)/);
    if (!match) return next();

    const command = await getCustomCommandV2Record(Number.parseInt(match[1], 10));
    if (!command) return res.status(404).json({ message: "Command not found" });

    const server = await getVisibleServerForRequest(req, command.serverId);
    if (!server) {
      return res.status(403).json({ message: "You do not have access to that Archivist server." });
    }

    return next();
  });

  // --- HEALTH ---
  app.get("/health", async (_req, res) => {
    const bot = getBotStatus();

    if (!hasDatabaseUrl) {
      return res.status(503).json({ ok: false, botReady: bot.ready, message: "DATABASE_URL not configured" });
    }

    try {
      await db.execute(sql`SELECT 1`);
      return res.json({ ok: true, botReady: bot.ready, botGuilds: bot.guildCount });
    } catch {
      return res.status(503).json({ ok: false, botReady: bot.ready, message: "Database unavailable" });
    }
  });

  app.get(api.bot.status.path, (_req, res) => {
    const bot = getBotStatus();
    res.json(bot);
  });

  app.get(api.siteEditor.published.get.path, async (req, res) => {
    const surface = parseSiteEditorSurface(String(req.params.surface || ""));
    if (!surface) {
      return res.status(404).json({ message: "Unknown site editor surface" });
    }

    const record = await storage.getSiteContentSurface(surface);
    return res.json(record.publishedContent);
  });

  app.get(api.siteEditor.admin.list.path, async (_req, res) => {
    const surfaces = await storage.listSiteContentSurfaces();
    return res.json(surfaces);
  });

  app.get(api.siteEditor.admin.get.path, async (req, res) => {
    const surface = parseSiteEditorSurface(String(req.params.surface || ""));
    if (!surface) {
      return res.status(404).json({ message: "Unknown site editor surface" });
    }

    const record = await storage.getSiteContentSurface(surface);
    return res.json(record);
  });

  app.put(api.siteEditor.admin.saveDraft.path, async (req, res) => {
    const surface = parseSiteEditorSurface(String(req.params.surface || ""));
    if (!surface) {
      return res.status(404).json({ message: "Unknown site editor surface" });
    }

    const parsed = api.siteEditor.admin.saveDraft.input.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid draft payload." });
    }

    const saved = await storage.saveSiteContentDraft(surface, parsed.data.draftContent, getSiteEditorActor(req));
    return res.json(saved);
  });

  app.post(api.siteEditor.admin.publish.path, async (req, res) => {
    const surface = parseSiteEditorSurface(String(req.params.surface || ""));
    if (!surface) {
      return res.status(404).json({ message: "Unknown site editor surface" });
    }

    const saved = await storage.publishSiteContentSurface(surface, getSiteEditorActor(req));
    return res.json(saved);
  });

  app.post(api.siteEditor.admin.resetDraft.path, async (req, res) => {
    const surface = parseSiteEditorSurface(String(req.params.surface || ""));
    if (!surface) {
      return res.status(404).json({ message: "Unknown site editor surface" });
    }

    const saved = await storage.resetSiteContentDraft(surface, getSiteEditorActor(req));
    return res.json(saved);
  });

  app.get(api.servers.workspaceOverview.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    const visibleServer = await getVisibleServerForRequest(req as Request, serverId);
    if (!visibleServer) return res.status(404).json({ message: "Server not found" });
    const overview = await getServerWorkspaceOverview(serverId);
    if (!overview) return res.status(404).json({ message: "Server not found" });
    res.json(overview);
  });

  app.get(api.servers.commandLogs.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    const visibleServer = await getVisibleServerForRequest(req as Request, serverId);
    if (!visibleServer) return res.status(404).json({ message: "Server not found" });
    const logs = await getServerCommandLogs(serverId);
    if (!logs) return res.status(404).json({ message: "Server not found" });
    res.json(logs);
  });

  // --- INVITE URL ---
  app.get("/api/invite-url", (req, res) => {
    const clientId = process.env.DISCORD_CLIENT_ID;
    if (!clientId) return res.status(503).json({ message: "Bot not configured" });
    const permissions = "8";
    const url = `https://discord.com/oauth2/authorize?client_id=${clientId}&scope=bot%20applications.commands&permissions=${permissions}`;
    if (req.query.redirect === "1" || req.query.redirect === "true") {
      return res.redirect(url);
    }
    return res.json({ url });
  });

  // --- TEMPLATES ---
  app.get("/api/templates", requireAuth, async (req, res) => {
    const serverId = req.query.serverId ? parseInt(req.query.serverId as string) : undefined;
    const tmpl = await storage.getTemplates(req.user!.id, serverId);
    res.json(tmpl);
  });

  app.post("/api/templates", requireAuth, async (req, res) => {
    const created = await storage.createTemplate({ ...req.body, userId: req.user!.id });
    res.status(201).json(created);
  });

  app.patch("/api/templates/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

    const existing = await storage.getTemplateById(id);
    if (!existing || existing.userId !== req.user!.id) {
      return res.status(404).json({ message: "Template not found" });
    }

    const updated = await storage.updateTemplate(id, req.body);
    res.json(updated);
  });

  app.delete("/api/templates/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    const existing = await storage.getTemplateById(id);
    if (!existing || existing.userId !== req.user!.id) {
      return res.status(404).json({ message: "Template not found" });
    }
    await storage.deleteTemplate(id);
    res.status(204).send();
  });

  // --- STUDIO ---
  registerStudioRoutes(app, {
    getStudioActorUserId,
    normalizeStudioOwnedScope,
    hasStudioRecordAccess,
  });
  registerStudioPublishRoutes(app);

  // --- STATS ---
  app.get(api.stats.get.path, async (_req, res) => {
    const bot = getBotStatus();
    const uptimeStr = formatDuration(bot.uptimeMs);

    let allServers: any[] = [];
    let totalMembers = 0;
    let commandsExecuted = 0;

    try {
      allServers = await listServerRecords();
      totalMembers = allServers.reduce((sum, s) => sum + (s.memberCount || 0), 0);
    } catch (err: any) {
      console.error("[Stats] Failed to load server totals:", err?.message || err);
    }

    try {
      const usageResult = await db.execute(sql`SELECT COALESCE(SUM(usage_count), 0) AS total FROM custom_commands`);
      commandsExecuted = Number((usageResult.rows[0] as any)?.total ?? 0);
    } catch (err: any) {
      console.error("[Stats] Failed to load command usage totals:", err?.message || err);
    }

    return res.json({
      totalServers: allServers.length,
      totalMembers,
      commandsExecuted,
      uptime: uptimeStr,
      botReady: bot.ready,
      bot: {
        ready: bot.ready,
        processStatus: bot.ready ? "online" : "offline",
        uptimeMs: bot.uptimeMs,
        uptimeHuman: uptimeStr,
        guildCount: bot.guildCount,
        gatewayPingMs: bot.gatewayPingMs,
        lastHeartbeatAt: bot.lastHeartbeatAt,
        wsStatus: bot.wsStatus,
      },
    });
  });

  // --- SERVERS ---
  app.get(api.servers.list.path, async (_req, res) => {
    try {
      const allServers = await listServerRecords();
      const visibleServers = await filterVisibleServersForRequest(_req as Request, allServers);
      return res.json(visibleServers);
    } catch (err: any) {
      console.error("[Servers] Failed to list servers:", err?.message || err);
      return res.status(503).json({ message: "Unable to load managed servers right now." });
    }
  });

  app.get(api.servers.get.path, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const server = await getVisibleServerForRequest(req as Request, id);
      if (!server) return res.status(404).json({ message: "Server not found" });
      return res.json(server);
    } catch (err: any) {
      console.error(`[Servers] Failed to fetch server ${id}:`, err?.message || err);
      return res.status(503).json({ message: "Unable to load server data right now" });
    }
  });

  app.get(api.servers.discordContext.path, async (req, res) => {
    try {
      const serverId = parseInt(req.params.serverId);
      if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });

      const server = await getVisibleServerForRequest(req as Request, serverId);
      if (!server) return res.status(404).json({ message: "Server not found" });

      const fallbackContext = {
        guildId: server.discordId,
        guildName: server.name,
        memberCount: server.memberCount ?? 0,
        channels: [],
        roles: [],
        emojis: [],
      };

      const client = getBotClient();
      if (!client?.isReady()) {
        return res.json(fallbackContext);
      }

      const guild = client.guilds.cache.get(server.discordId) ?? await client.guilds.fetch(server.discordId).catch(() => null);
      if (!guild) return res.json(fallbackContext);

      await guild.channels.fetch().catch(() => null);
      await guild.roles.fetch().catch(() => null);

      const channels = Array.from(guild.channels.cache.values())
        .filter((channel: any) => !!channel)
        .map((channel: any) => {
          const everyoneOverwrite = channel.permissionOverwrites?.cache?.get(guild.roles.everyone.id);
          const denies = everyoneOverwrite?.deny;
          const lockedForEveryone = Boolean(
            denies?.has(
              channel.isVoiceBased?.()
                ? PermissionFlagsBits.Connect
                : PermissionFlagsBits.SendMessages,
            ),
          );

          return {
            id: channel.id,
            name: channel.name ?? channel.id,
            type: String(channel.type),
            typeName: mapDiscordChannelTypeName(String(channel.type)),
            parentId: channel.parentId ?? null,
            position: typeof channel.position === "number" ? channel.position : 0,
            isTextBased: Boolean(channel.isTextBased?.()),
            isVoiceBased: Boolean(channel.isVoiceBased?.()),
            isAnnouncement: String(channel.type) === "5",
            isForum: String(channel.type) === "15",
            isStage: String(channel.type) === "13",
            isCategory: String(channel.type) === "4",
            isThread: Boolean(channel.isThread?.()),
            nsfw: "nsfw" in channel ? Boolean(channel.nsfw) : false,
            topic: "topic" in channel ? channel.topic ?? null : null,
            slowmodeSeconds: "rateLimitPerUser" in channel ? Number(channel.rateLimitPerUser || 0) : 0,
            lockedForEveryone,
          };
        })
        .sort((a, b) => (a.position - b.position) || a.name.localeCompare(b.name));

      const roles = Array.from(guild.roles.cache.values())
        .filter((role: any) => role && role.id !== guild.id)
        .map((role: any) => ({
          id: role.id,
          name: role.name,
          color: role.color || 0,
          position: role.position || 0,
          managed: Boolean(role.managed),
          mentionable: Boolean(role.mentionable),
          hoist: Boolean(role.hoist),
        }))
        .sort((a, b) => (b.position - a.position) || a.name.localeCompare(b.name));

      const emojis = Array.from(guild.emojis.cache.values())
        .filter((emoji: any) => !!emoji)
        .map((emoji: any) => ({
          id: emoji.id,
          name: emoji.name,
          animated: Boolean(emoji.animated),
          available: Boolean(emoji.available),
          managed: Boolean(emoji.managed),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      return res.json({
        guildId: guild.id,
        guildName: guild.name,
        memberCount: guild.memberCount,
        channels,
        roles,
        emojis,
      });
    } catch (err: any) {
      console.error("[Servers] Failed to load Discord context:", err?.message || err);
      return res.status(503).json({ message: "Unable to load Discord channels/roles right now" });
    }
  });
  // --- SETTINGS ---
  app.patch(api.settings.update.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    try {
      const actorId = (req as any).user?.discordId ?? "dashboard";
      const updated = await patchGuildConfig(serverId, "settings", req.body, actorId);
      await recordAudit(serverId, "settings", actorId, null, updated);
      await createSnapshot(serverId, "settings", updated, actorId);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  // --- COMMANDS ---
  app.get(api.commands.list.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    res.json(await listCustomCommandRecords(serverId));
  });

  app.post(api.commands.create.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });

    const parsed = api.commands.create.input.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid payload" });
    }

    const created = await createCustomCommandRecord(serverId, parsed.data);
    invalidateCustomCommandCache(serverId);

    let syncWarning: string | null = null;
    const client = getBotClient();
    if (client) {
      await syncCustomCommandsForServer({
        client,
        env: getArchivistEnv(),
        logger: consoleSyncLogger("custom-command-create"),
        serverId,
      }).catch((error) => {
        syncWarning = formatSyncWarning(error);
        consoleSyncLogger("custom-command-create").error("Custom command sync failed after create.", {
          serverId,
          commandId: created.id,
          commandName: created.name,
          error: syncWarning,
        });
      });
    }

    res.status(201).json({ ...created, syncWarning });
  });

  app.patch(api.commands.update.path, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

    const existing = await getCustomCommandRecord(id);
    if (!existing) return res.status(404).json({ message: "Command not found" });

    const parsed = api.commands.update.input.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid payload" });
    }

    const updated = await updateCustomCommandRecord(id, parsed.data);
    invalidateCustomCommandCache(existing.serverId);

    let syncWarning: string | null = null;
    const client = getBotClient();
    if (client) {
      await syncCustomCommandsForServer({
        client,
        env: getArchivistEnv(),
        logger: consoleSyncLogger("custom-command-update"),
        serverId: existing.serverId,
      }).catch((error) => {
        syncWarning = formatSyncWarning(error);
        consoleSyncLogger("custom-command-update").error("Custom command sync failed after update.", {
          serverId: existing.serverId,
          commandId: updated.id,
          commandName: updated.name,
          error: syncWarning,
        });
      });
    }

    res.json({ ...updated, syncWarning });
  });

  app.delete(api.commands.delete.path, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

    const existing = await getCustomCommandRecord(id);
    if (!existing) return res.status(404).json({ message: "Command not found" });

    await deleteCustomCommandRecord(id);
    invalidateCustomCommandCache(existing.serverId);

    const client = getBotClient();
    if (client) {
      await syncCustomCommandsForServer({
        client,
        env: getArchivistEnv(),
        logger: consoleSyncLogger("custom-command-delete"),
        serverId: existing.serverId,
      }).catch((error) => {
        consoleSyncLogger("custom-command-delete").error("Custom command sync failed after delete.", {
          serverId: existing.serverId,
          commandId: existing.id,
          commandName: existing.name,
          error: formatSyncWarning(error),
        });
      });
    }

    res.status(204).send();
  });

  app.get(api.commandWorkflowsV2.list.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    if (!await ensureVisibleServerForRequest(req, res, serverId)) return;
    res.json(await listCustomCommandV2Records(serverId));
  });

  app.get(api.commandWorkflowsV2.template.path, async (_req, res) => {
    res.json(createDefaultCustomCommandV2Definition());
  });

  app.post(api.commandWorkflowsV2.previewImport.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    if (!await ensureVisibleServerForRequest(req, res, serverId)) return;

    const parsed = api.commandWorkflowsV2.previewImport.input.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: parsed.error.issues[0]?.message || "Invalid payload",
        issues: formatValidationIssues(parsed.error),
      });
    }

    const preview = previewCustomCommandV2Import(parsed.data.raw, parsed.data.sourceKind);
    if (preview.definition) {
      const conflictIssue = await findConflictingSlashCommandV2({
        serverId,
        definition: preview.definition,
      });
      if (conflictIssue) {
        preview.issues = [...preview.issues, conflictIssue];
        preview.ok = false;
        preview.importReady = false;
      }
    }

    res.json(preview);
  });

  app.post(api.commandWorkflowsV2.import.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    if (!await ensureVisibleServerForRequest(req, res, serverId)) return;

    const parsed = api.commandWorkflowsV2.import.input.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: parsed.error.issues[0]?.message || "Invalid payload",
        issues: formatValidationIssues(parsed.error),
      });
    }

    const prepared = prepareCustomCommandV2Import(parsed.data);
    if (!prepared.ok || !prepared.createInput) {
      return res.status(400).json({
        message: prepared.preview.issues[0]?.message || "Import failed validation",
        issues: prepared.preview.issues,
      });
    }

    const conflictIssue = await findConflictingSlashCommandV2({
      serverId,
      definition: prepared.preview.definition!,
    });
    if (conflictIssue) {
      return res.status(400).json({
        message: conflictIssue.message,
        issues: [conflictIssue],
      });
    }

    const created = await createCustomCommandV2Record(serverId, {
      ...prepared.createInput,
      slug: buildCustomCommandV2Slug(prepared.createInput.name),
      createdByUserId: getPersistentActorUserId(req),
      updatedByUserId: getPersistentActorUserId(req),
    });
    invalidateCustomCommandV2Cache(serverId);
    invalidateCustomCommandV2RuntimeCache(serverId);

    const syncWarning = await syncArchivistCustomCommandsAfterChange({
      scope: "custom-command-v2-import",
      serverId,
      details: {
        commandId: created.id,
        commandName: created.name,
      },
    });

    res.status(201).json({ command: created, preview: prepared.preview.preview, syncWarning });
  });

  app.post(api.commandWorkflowsV2.create.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    if (!await ensureVisibleServerForRequest(req, res, serverId)) return;

    const parsed = api.commandWorkflowsV2.create.input.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: parsed.error.issues[0]?.message || "Invalid payload",
        issues: formatValidationIssues(parsed.error),
      });
    }

    const compiled = compileCustomCommandV2Definition(parsed.data.definition);
    if (!compiled.compiled || compiled.issues.some((entry) => entry.severity === "error")) {
      return res.status(400).json({ message: compiled.issues[0]?.message || "Invalid command definition", issues: compiled.issues });
    }

    const conflictIssue = await findConflictingSlashCommandV2({
      serverId,
      definition: parsed.data.definition,
    });
    if (conflictIssue) {
      return res.status(400).json({ message: conflictIssue.message, issues: [conflictIssue] });
    }

    const createInput = buildCustomCommandV2CreateInput({
      definition: parsed.data.definition,
      compiled: compiled.compiled,
      issues: compiled.issues,
      source: parsed.data.importSource ?? { kind: "dashboard", importedAt: new Date().toISOString() },
    });

    const created = await createCustomCommandV2Record(serverId, {
      ...createInput,
      createdByUserId: getPersistentActorUserId(req),
      updatedByUserId: getPersistentActorUserId(req),
    });
    invalidateCustomCommandV2Cache(serverId);
    invalidateCustomCommandV2RuntimeCache(serverId);

    const syncWarning = await syncArchivistCustomCommandsAfterChange({
      scope: "custom-command-v2-create",
      serverId,
      details: {
        commandId: created.id,
        commandName: created.name,
      },
    });

    res.status(201).json({ ...created, syncWarning });
  });

  app.patch(api.commandWorkflowsV2.update.path, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

    const existing = await getCustomCommandV2Record(id);
    if (!existing) return res.status(404).json({ message: "Command not found" });

    const parsed = api.commandWorkflowsV2.update.input.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: parsed.error.issues[0]?.message || "Invalid payload",
        issues: formatValidationIssues(parsed.error),
      });
    }

    const definition = parsed.data.definition ?? existing.definition;
    const compiled = compileCustomCommandV2Definition(definition);
    if (!compiled.compiled || compiled.issues.some((entry) => entry.severity === "error")) {
      return res.status(400).json({ message: compiled.issues[0]?.message || "Invalid command definition", issues: compiled.issues });
    }

    const conflictIssue = await findConflictingSlashCommandV2({
      serverId: existing.serverId,
      definition,
      excludeId: existing.id,
    });
    if (conflictIssue) {
      return res.status(400).json({ message: conflictIssue.message, issues: [conflictIssue] });
    }

    const updated = await updateCustomCommandV2Record(id, {
      name: definition.meta.name,
      slug: buildCustomCommandV2Slug(definition.meta.name),
      schemaVersion: parsed.data.schemaVersion ?? existing.schemaVersion,
      kind: parsed.data.kind ?? existing.kind,
      enabled: definition.behavior.enabled,
      triggerType: definition.trigger.type,
      definition,
      compiled: compiled.compiled,
      importSource: parsed.data.importSource ?? existing.importSource,
      lastValidation: compiled.issues,
      updatedByUserId: getPersistentActorUserId(req) ?? existing.updatedByUserId ?? null,
    });
    invalidateCustomCommandV2Cache(existing.serverId);
    invalidateCustomCommandV2RuntimeCache(existing.serverId);

    const syncWarning = await syncArchivistCustomCommandsAfterChange({
      scope: "custom-command-v2-update",
      serverId: existing.serverId,
      details: {
        commandId: updated.id,
        commandName: updated.name,
      },
    });

    res.json({ ...updated, syncWarning });
  });

  app.delete(api.commandWorkflowsV2.delete.path, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

    const existing = await getCustomCommandV2Record(id);
    if (!existing) return res.status(404).json({ message: "Command not found" });

    await deleteCustomCommandV2Record(id);
    invalidateCustomCommandV2Cache(existing.serverId);
    invalidateCustomCommandV2RuntimeCache(existing.serverId);

    await syncArchivistCustomCommandsAfterChange({
      scope: "custom-command-v2-delete",
      serverId: existing.serverId,
      details: {
        commandId: existing.id,
        commandName: existing.name,
      },
    });

    res.status(204).send();
  });

  app.post(api.commandWorkflowsV2.dryRun.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    if (!await ensureVisibleServerForRequest(req, res, serverId)) return;

    const parsed = api.commandWorkflowsV2.dryRun.input.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: parsed.error.issues[0]?.message || "Invalid payload",
        issues: formatValidationIssues(parsed.error),
      });
    }

    const compilation = compileCustomCommandV2Definition(parsed.data.definition);
    if (!compilation.compiled) {
      return res.status(400).json({ message: "The definition could not be compiled for dry-run.", issues: compilation.issues });
    }

    const issues = compilation.issues;
    if (issues.some((entry) => entry.severity === "error")) {
      return res.status(400).json({ message: issues[0]?.message || "Invalid command definition", issues });
    }

    const result = await dryRunCustomCommandV2({
      ...parsed.data,
      serverId,
      compiled: compilation.compiled,
    });

    res.json({
      ...result,
      issues,
    });
  });

  // --- EMBEDS ---
  app.get(api.embeds.list.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    res.json(await listEmbedRecords(serverId));
  });

  app.post(api.embeds.create.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    try {
    const created = await createEmbedRecord(serverId, req.body);
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  app.patch(api.embeds.update.path, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    const updated = await updateEmbedRecord(id, req.body);
    res.json(updated);
  });

  app.post(api.embeds.send.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    const embedId = parseInt(req.params.id);
    if (isNaN(serverId) || isNaN(embedId)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const parsed = api.embeds.send.input.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid payload" });
    }

    const server = await getServerRecord(serverId);
    if (!server) return res.status(404).json({ message: "Server not found" });

    const [embedRecord] = await db.select().from(embedsTable)
      .where(and(eq(embedsTable.id, embedId), eq(embedsTable.serverId, serverId)));
    if (!embedRecord) return res.status(404).json({ message: "Embed not found" });

    const client = getBotClient();
    if (!client?.isReady()) {
      return res.status(503).json({ message: "Bot is offline. Start the bot to send embeds." });
    }

    const guild = client.guilds.cache.get(server.discordId) ?? await client.guilds.fetch(server.discordId).catch(() => null);
    if (!guild) return res.status(404).json({ message: "Bot is not in this Discord server." });

    const channelId = parsed.data.channelId.trim();
    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased() || channel.isThread()) {
      return res.status(400).json({ message: "Selected channel is not a valid text channel." });
    }

    const preparedEmbed = buildDiscordEmbed(embedRecord);
    const diagnostics: ComponentDiagnostic[] = [];
    const rawComponents = (embedRecord.components as EmbedComponentType[] | null | undefined) || [];
    const preparedComponents = buildActionRows({
      components: rawComponents,
      serverId,
      guildId: guild.id,
      embedId: embedRecord.id,
      diagnostics,
    });

    if (!preparedEmbed && preparedComponents.length === 0) {
      return res.status(400).json({
        message: rawComponents.length > 0
          ? "Embed has Components V2 content, but no sendable interactive components were generated."
          : "Embed has no sendable content.",
        diagnostics,
      });
    }

    try {
      const sentMessage = await (channel as any).send({
        embeds: preparedEmbed ? [preparedEmbed] : [],
        components: preparedComponents,
      });
      return res.json({ messageId: sentMessage.id, channelId: sentMessage.channelId });
    } catch (err: any) {
      console.error("[Embeds] Failed to send embed:", err?.message || err, {
        embedId,
        serverId,
        channelId,
        diagnostics,
      });
      return res.status(400).json({
        message: "Failed to send embed. Verify bot permissions and interactive component configuration.",
        diagnostics,
      });
    }
  });

  app.get("/api/servers/:serverId/embeds/:id/components-debug", async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    const embedId = parseInt(req.params.id);
    if (isNaN(serverId) || isNaN(embedId)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const [embedRecord] = await db.select().from(embedsTable)
      .where(and(eq(embedsTable.id, embedId), eq(embedsTable.serverId, serverId)));
    if (!embedRecord) return res.status(404).json({ message: "Embed not found" });

    const diagnostics: ComponentDiagnostic[] = [];
    const actionRows = buildActionRows({
      components: (embedRecord.components as EmbedComponentType[] | null | undefined) || [],
      serverId,
      guildId: "debug",
      embedId,
      diagnostics,
      debugMode: true,
    });

    return res.json({
      embedId,
      actionRowCount: actionRows.length,
      diagnostics,
      hasEmbedBody: Boolean(buildDiscordEmbed(embedRecord)),
    });
  });

  app.post("/api/servers/:serverId/design-studio/publish", async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });

    const parsed = z.object({
      channelId: z.string().min(1),
      messageId: z.string().optional(),
      content: z.string().max(2000).optional(),
      embeds: z.array(z.any()).max(10).optional(),
      blocks: z.array(z.any()).optional(),
      interactiveComponents: z.array(z.any()).optional(),
    }).safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid payload" });
    }
    try {
      let legacyNodeCounter = 0;
      let legacyActionCounter = 0;
      const nextNodeId = () => `legacy_node_${++legacyNodeCounter}`;
      const nextActionId = () => `legacy_action_${++legacyActionCounter}`;
      const rootNodeIds: string[] = [];
      const nodes: Record<string, any> = {};
      const actions: Record<string, any> = {};

      const componentTypeMap: Record<string, string> = {
        "1": "action_row",
        "2": "button",
        "3": "string_select",
        "9": "section",
        "10": "text_display",
        "11": "file",
        "12": "media_gallery",
        "14": "divider",
        "17": "container",
        action_row: "action_row",
        button: "button",
        select_menu: "string_select",
        string_select: "string_select",
        text_display: "text_display",
        container: "container",
        section: "section",
        divider: "divider",
        media_gallery: "media_gallery",
        file: "file",
      };

      const ensureLegacyAction = (inputAction: any, fallback: any) => {
        const raw = inputAction || fallback;
        if (!raw) return undefined;
        const id = String(raw.id || nextActionId());
        actions[id] = {
          id,
          type: raw.type || "reply_message",
          label: raw.label || raw.commandName || raw.url || "Legacy Action",
          roleId: raw.roleId,
          url: raw.url,
          commandName: raw.commandName,
          commandArgs: raw.commandArgs,
          replyMode: raw.replyMode || "ephemeral",
          channelId: raw.channelId,
          modalId: raw.modalId,
          targetViewId: raw.targetViewId,
          fallbackViewId: raw.fallbackViewId,
          response: raw.response || {
            mode: "inline",
            inline: {
              content: raw.content || "Action received.",
              embeds: [],
            },
          },
          allowedRoleIds: Array.isArray(raw.allowedRoleIds) ? raw.allowedRoleIds : [],
          blockedRoleIds: Array.isArray(raw.blockedRoleIds) ? raw.blockedRoleIds : [],
          disabled: Boolean(raw.disabled),
          hiddenByGate: Boolean(raw.hiddenByGate),
        };
        return id;
      };

      const appendLegacyNode = (source: any, parentId?: string) => {
        const id = String(source?.id || nextNodeId());
        const nodeType = componentTypeMap[String(source?.type || "text_display")] || "text_display";
        const node: any = {
          id,
          type: nodeType,
          viewId: "entry",
          parentId: parentId || null,
          childIds: [],
          props: {
            label: source?.label,
            text: source?.content || source?.text,
            heading: source?.title || source?.heading,
            description: source?.description,
            url: source?.url,
            style: source?.style,
            emoji: source?.emoji,
            placeholder: source?.placeholder,
            options: Array.isArray(source?.options) ? source.options.map((option: any, index: number) => ({
              label: String(option?.label || `Option ${index + 1}`),
              value: String(option?.value || `option_${index + 1}`),
              description: option?.description,
              emoji: option?.emoji,
            })) : [],
            mode: source?.mode,
            symbol: source?.symbol,
            repeat: source?.repeat,
            accentColor: source?.accentColor,
            items: Array.isArray(source?.items) ? source.items : [],
          },
        };

        if (nodeType === "button") {
          const fallbackAction = (source?.style === 5 || source?.url)
            ? { type: "open_url", url: source?.url }
            : { type: "reply_message", response: { mode: "inline", inline: { content: "Action received.", embeds: [] } } };
          node.actionId = ensureLegacyAction(source?.action, fallbackAction);
        }

        if (nodeType === "string_select") {
          const optionActionIds: Record<string, string> = {};
          const options = Array.isArray(node.props.options) ? node.props.options : [];
          options.forEach((option: any) => {
            const matching = Array.isArray(source?.options)
              ? source.options.find((entry: any) => String(entry?.value || "") === String(option.value))
              : null;
            const actionId = ensureLegacyAction(
              matching?.action,
              source?.action || { type: "reply_message", response: { mode: "inline", inline: { content: `Selected ${option.label}.`, embeds: [] } } },
            );
            if (actionId) optionActionIds[String(option.value)] = actionId;
          });
          node.optionActionIds = optionActionIds;
        }

        nodes[id] = node;

        if (parentId && nodes[parentId]) {
          nodes[parentId].childIds.push(id);
        } else {
          rootNodeIds.push(id);
        }

        const childSources = Array.isArray(source?.components) ? source.components : [];
        childSources.forEach((child: any) => appendLegacyNode(child, id));
      };

      [
        ...(Array.isArray(parsed.data.blocks) ? parsed.data.blocks : []),
        ...(Array.isArray(parsed.data.interactiveComponents) ? parsed.data.interactiveComponents : []),
      ].forEach((source: any) => appendLegacyNode(source));

      const result = await publishStudioMessage({
        serverId,
        actorUserId: req.user!.id,
        actorDiscordId: req.user!.discordId,
        documentInput: {
          version: 2,
          meta: {
            name: "Design Studio Draft",
            category: "surface",
            entryViewId: "entry",
          },
          views: {
            entry: {
              id: "entry",
              name: "Entry",
              messageContent: parsed.data.content || "",
              embeds: parsed.data.embeds || [],
              rootNodeIds,
            },
          },
          nodes,
          actions,
          modals: {},
          assets: [],
          libraries: {
            dividerPresetIds: [],
            styleBlockIds: [],
            themePackIds: [],
          },
          design: {
            dividerPresets: [],
            styleBlocks: [],
            themePacks: [],
          },
        },
        target: {
          channelId: parsed.data.channelId,
          messageId: parsed.data.messageId,
          viewId: "entry",
        },
      });
      res.json(result);
    } catch (err: any) {
      res.status(err?.statusCode || 400).json({ message: err?.message || "Failed to publish design studio message." });
    }
  });

  app.delete(api.embeds.delete.path, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    await deleteEmbedRecord(id);
    res.status(204).send();
  });

  // --- CHANNEL SETTINGS ---
  app.get(api.channelSettings.list.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    res.json(await listChannelSettingRecords(serverId));
  });

  app.put(api.channelSettings.upsert.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    const result = await upsertChannelSettingRecord(serverId, req.body);
    res.json(result);
  });

  app.post(api.channelSettings.createLive.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });

    const parsed = api.channelSettings.createLive.input.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid payload" });
    }

    const server = await getServerRecord(serverId);
    if (!server) return res.status(404).json({ message: "Server not found" });

    const client = getBotClient();
    if (!client?.isReady()) {
      return res.status(503).json({ message: "Bot is offline. Start the bot to create live channels." });
    }

    const input = parsed.data;
    const guild = client.guilds.cache.get(server.discordId) ?? await client.guilds.fetch(server.discordId).catch(() => null);
    if (!guild) return res.status(404).json({ message: "Bot is not in this Discord server." });
    try {
      assertCommunityTypeAllowed(guild.features, input.kind);
    } catch (error) {
      return res.status(400).json({
        message: error instanceof Error ? error.message : "That channel type is not supported in this server.",
      });
    }

    const botMember = guild.members.me ?? await guild.members.fetchMe().catch(() => null);
    if (!botMember) return res.status(503).json({ message: "Bot member state is unavailable." });
    if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return res.status(403).json({ message: "Archivist is missing Manage Channels in this server." });
    }

    const actorId = (req as any).user?.discordId ?? "dashboard";
    const reason = `Archivist dashboard create by ${actorId}`;

    let parentChannel: any = null;
    if (input.parentId && input.kind !== "category") {
      parentChannel = guild.channels.cache.get(input.parentId) ?? await guild.channels.fetch(input.parentId).catch(() => null);
      if (!parentChannel) {
        return res.status(404).json({ message: "Target category was not found in Discord." });
      }
      if (String(parentChannel.type) !== "4") {
        return res.status(400).json({ message: "Target parent must be a category channel." });
      }
    }

    const typeByKind = {
      category: ChannelType.GuildCategory,
      text: ChannelType.GuildText,
      voice: ChannelType.GuildVoice,
      announcement: ChannelType.GuildAnnouncement,
      forum: ChannelType.GuildForum,
      stage: ChannelType.GuildStageVoice,
    } as const;

    const type = typeByKind[input.kind];
    const createOptions: any = {
      name: input.name.trim(),
      type,
      reason,
    };

    if (parentChannel && input.kind !== "category") {
      createOptions.parent = parentChannel.id;
    }

    if (
      (input.kind === "text" || input.kind === "announcement" || input.kind === "forum") &&
      typeof input.topic === "string"
    ) {
      createOptions.topic = input.topic.trim() || undefined;
    }

    const channel = await guild.channels.create(createOptions);

    await recordAudit(serverId, "channel-live-create", actorId, null, {
      channelId: channel.id,
      channelName: channel.name,
      type: input.kind,
      parentId: parentChannel?.id ?? null,
    });

    res.json({
      channelId: channel.id,
      channelName: channel.name,
      typeName: mapDiscordChannelTypeName(String(channel.type)),
    });
  });

  app.post(api.channelSettings.applyLive.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    const channelId = String(req.params.channelId || "").trim();
    if (isNaN(serverId) || !channelId) return res.status(400).json({ message: "Invalid server or channel ID" });

    const parsed = api.channelSettings.applyLive.input.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid payload" });
    }

    const server = await getServerRecord(serverId);
    if (!server) return res.status(404).json({ message: "Server not found" });

    const client = getBotClient();
    if (!client?.isReady()) {
      return res.status(503).json({ message: "Bot is offline. Start the bot to apply live channel changes." });
    }

    const guild = client.guilds.cache.get(server.discordId) ?? await client.guilds.fetch(server.discordId).catch(() => null);
    if (!guild) return res.status(404).json({ message: "Bot is not in this Discord server." });

    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (!channel) return res.status(404).json({ message: "Channel not found in Discord." });

    const botMember = guild.members.me ?? await guild.members.fetchMe().catch(() => null);
    if (!botMember) return res.status(503).json({ message: "Bot member state is unavailable." });

    const actorId = (req as any).user?.discordId ?? "dashboard";
    const reason = `Archivist dashboard apply by ${actorId}`;
    const applied: Array<{ field: string; value: string }> = [];
    const ignored: string[] = [];
    const liveChanges = parsed.data;

    if (liveChanges.name !== undefined) {
      const nextName = liveChanges.name.trim();
      const namePermission = channel.isThread?.()
        ? (PermissionFlagsBits.ManageThreads | PermissionFlagsBits.ManageChannels)
        : PermissionFlagsBits.ManageChannels;

      if (!("setName" in channel) || typeof (channel as any).setName !== "function") {
        ignored.push("name");
      } else if (!botMember.permissionsIn(channel).has(namePermission)) {
        return res.status(403).json({ message: "Archivist is missing rename permissions for this channel." });
      } else {
        await (channel as any).setName(nextName, reason);
        applied.push({ field: "name", value: nextName });
      }
    }

    if (liveChanges.parentId !== undefined) {
      if (channel.isThread?.() || String((channel as any).type) === "4") {
        ignored.push("parentId");
      } else if (!("setParent" in channel) || typeof (channel as any).setParent !== "function") {
        ignored.push("parentId");
      } else if (!botMember.permissionsIn(channel).has(PermissionFlagsBits.ManageChannels)) {
        return res.status(403).json({ message: "Archivist is missing move permissions for this channel." });
      } else {
        let targetParent: any = null;

        if (liveChanges.parentId) {
          targetParent = guild.channels.cache.get(liveChanges.parentId) ?? await guild.channels.fetch(liveChanges.parentId).catch(() => null);
          if (!targetParent) {
            return res.status(404).json({ message: "Target category was not found in Discord." });
          }
          if (String(targetParent.type) !== "4") {
            return res.status(400).json({ message: "Target parent must be a category channel." });
          }
        }

        await (channel as any).setParent(targetParent?.id ?? null, {
          lockPermissions: false,
          reason,
        });
        applied.push({
          field: "parentId",
          value: targetParent ? `Moved to ${targetParent.name}` : "Moved to Uncategorized",
        });
      }
    }

    if (liveChanges.positionMove !== undefined) {
      if (channel.isThread?.() || String((channel as any).type) === "4") {
        ignored.push("positionMove");
      } else if (!("setPosition" in channel) || typeof (channel as any).setPosition !== "function") {
        ignored.push("positionMove");
      } else if (!botMember.permissionsIn(channel).has(PermissionFlagsBits.ManageChannels)) {
        return res.status(403).json({ message: "Archivist is missing reorder permissions for this channel." });
      } else {
        const siblingChannels = Array.from(guild.channels.cache.values())
          .filter((candidate: any) => {
            if (!candidate || candidate.id === channel.id) return false;
            if (candidate.isThread?.()) return false;
            if (String(candidate.type) === "4") return false;
            return (candidate.parentId ?? null) === ((channel as any).parentId ?? null);
          })
          .concat(channel as any)
          .sort((a: any, b: any) => (a.position - b.position) || String(a.id).localeCompare(String(b.id)));

        const currentIndex = siblingChannels.findIndex((candidate: any) => candidate.id === channel.id);
        const maxIndex = siblingChannels.length - 1;

        if (currentIndex === -1 || maxIndex <= 0) {
          ignored.push("positionMove");
        } else if (liveChanges.positionMove === "up") {
          if (currentIndex === 0) {
            ignored.push("positionMove");
          } else {
            await (channel as any).setPosition(-1, { relative: true, reason });
            applied.push({ field: "positionMove", value: "Moved up one slot" });
          }
        } else if (liveChanges.positionMove === "down") {
          if (currentIndex === maxIndex) {
            ignored.push("positionMove");
          } else {
            await (channel as any).setPosition(1, { relative: true, reason });
            applied.push({ field: "positionMove", value: "Moved down one slot" });
          }
        } else {
          const targetIndex = liveChanges.positionMove === "top" ? 0 : maxIndex;
          if (targetIndex === currentIndex) {
            ignored.push("positionMove");
          } else {
            await (channel as any).setPosition(targetIndex, { reason });
            applied.push({
              field: "positionMove",
              value: liveChanges.positionMove === "top" ? "Moved to top" : "Moved to bottom",
            });
          }
        }
      }
    }

    if (liveChanges.topic !== undefined) {
      if (!canSetTopic(channel)) {
        ignored.push("topic");
      } else if (!botMember.permissionsIn(channel).has(PermissionFlagsBits.ManageChannels)) {
        return res.status(403).json({ message: "Archivist is missing Manage Channels for this channel." });
      } else {
        await (channel as any).setTopic(liveChanges.topic, reason);
        applied.push({ field: "topic", value: liveChanges.topic?.trim() ? liveChanges.topic.trim() : "Cleared" });
      }
    }

    if (liveChanges.nsfw !== undefined) {
      if (!canSetNsfw(channel)) {
        ignored.push("nsfw");
      } else if (!botMember.permissionsIn(channel).has(PermissionFlagsBits.ManageChannels)) {
        return res.status(403).json({ message: "Archivist is missing Manage Channels for this channel." });
      } else {
        await (channel as any).setNSFW(liveChanges.nsfw, reason);
        applied.push({ field: "nsfw", value: liveChanges.nsfw ? "Enabled" : "Disabled" });
      }
    }

    if (liveChanges.slowmode !== undefined) {
      if (!canSetSlowmode(channel)) {
        ignored.push("slowmode");
      } else if (!botMember.permissionsIn(channel).has(PermissionFlagsBits.ManageChannels)) {
        return res.status(403).json({ message: "Archivist is missing Manage Channels for this channel." });
      } else {
        await (channel as any).setRateLimitPerUser(liveChanges.slowmode, reason);
        applied.push({ field: "slowmode", value: liveChanges.slowmode === 0 ? "Cleared" : `${liveChanges.slowmode}s` });
      }
    }

    if (liveChanges.lockedDown !== undefined) {
      if (!("permissionOverwrites" in channel)) {
        ignored.push("lockedDown");
      } else if (!botMember.permissionsIn(channel).has(PermissionFlagsBits.ManageRoles | PermissionFlagsBits.ManageChannels)) {
        return res.status(403).json({ message: "Archivist is missing overwrite permissions for this channel." });
      } else {
        const patch = buildChannelLockPatch(channel as any, liveChanges.lockedDown);
        await (channel as any).permissionOverwrites.edit(guild.roles.everyone, patch, { reason });
        applied.push({ field: "lockedDown", value: liveChanges.lockedDown ? "Locked for @everyone" : "Unlocked for @everyone" });
      }
    }

    if (!applied.length && ignored.length) {
      return res.status(400).json({ message: `No supported live changes were applied. Ignored: ${ignored.join(", ")}` });
    }

    if (!applied.length && !ignored.length) {
      return res.status(400).json({ message: "No live Discord changes were requested." });
    }

    await recordAudit(serverId, "channel-live-apply", actorId, null, {
      channelId,
      channelName: channel.name,
      applied,
      ignored,
    });

    res.json({
      channelId,
      channelName: channel.name,
      applied,
      ignored,
    });
  });

  app.delete(api.channelSettings.delete.path, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    await deleteChannelSettingRecord(id);
    res.status(204).send();
  });

  // --- REACTION ROLES ---
  app.get(api.reactionRoles.list.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    res.json(await listReactionRoleRecords(serverId));
  });

  app.post(api.reactionRoles.create.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    const created = await createReactionRoleRecord(serverId, req.body);
    res.status(201).json(created);
  });

  app.delete(api.reactionRoles.delete.path, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    await deleteReactionRoleRecord(id);
    res.status(204).send();
  });

  // --- AUTO ROLES ---
  app.get(api.autoRoles.list.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    res.json(await listAutoRoleRecords(serverId));
  });

  app.post(api.autoRoles.create.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    const created = await createAutoRoleRecord(serverId, req.body);
    res.status(201).json(created);
  });

  app.delete(api.autoRoles.delete.path, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    await deleteAutoRoleRecord(id);
    res.status(204).send();
  });

  // --- WARNINGS ---
  app.get(api.warnings.list.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    res.json(await listWarningRecords(serverId));
  });

  app.post(api.warnings.create.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    const created = await createWarningRecord(serverId, req.body);
    res.status(201).json(created);
  });

  app.delete(api.warnings.delete.path, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    await deleteWarningRecord(id);
    res.status(204).send();
  });

  app.delete(api.warnings.clear.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    const userId = req.params.userId;
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    await clearWarningRecords(serverId, userId);
    res.status(204).send();
  });

  // --- PUNISHMENT CONFIG ---
  app.get(api.punishments.list.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    res.json(await listPunishmentConfigRecords(serverId));
  });

  app.put(api.punishments.upsert.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    const result = await upsertPunishmentConfigRecord(serverId, req.body);
    res.json(result);
  });

  app.delete(api.punishments.delete.path, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    await deletePunishmentConfigRecord(id);
    res.status(204).send();
  });

  // --- LEVELING ---
  app.get(api.leveling.get.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    const config = await getLevelingConfigRecord(serverId);
    res.json(config || { enabled: false });
  });

  app.put(api.leveling.upsert.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    const result = await upsertLevelingConfigRecord(serverId, req.body);
    res.json(result);
  });

  // --- STARBOARD ---
  app.get(api.starboard.get.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    const config = await getStarboardConfigRecord(serverId);
    res.json(config || { enabled: false });
  });

  app.put(api.starboard.upsert.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    const result = await upsertStarboardConfigRecord(serverId, req.body);
    res.json(result);
  });

  // --- TICKETS ---
  app.get(api.tickets.getConfig.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    const config = await getTicketConfigRecord(serverId);
    res.json(config || { enabled: false });
  });

  app.put(api.tickets.upsertConfig.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    const result = await upsertTicketConfigRecord(serverId, req.body);
    res.json(result);
  });

  app.get(api.tickets.listPanels.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    res.json(await listTicketPanelRecords(serverId));
  });

  app.post(api.tickets.createPanel.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    const created = await createTicketPanelRecord(serverId, req.body);
    res.status(201).json(created);
  });

  app.patch(api.tickets.updatePanel.path, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    const updated = await updateTicketPanelRecord(id, req.body);
    res.json(updated);
  });

  app.delete(api.tickets.deletePanel.path, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    await deleteTicketPanelRecord(id);
    res.status(204).send();
  });

  // --- SCHEDULED MESSAGES ---
  app.get(api.scheduledMessages.list.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    res.json(await listScheduledMessageRecords(serverId));
  });

  app.post(api.scheduledMessages.create.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    const created = await createScheduledMessageRecord(serverId, req.body);
    res.status(201).json(created);
  });

  app.patch(api.scheduledMessages.update.path, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    const updated = await updateScheduledMessageRecord(id, req.body);
    res.json(updated);
  });

  app.delete(api.scheduledMessages.delete.path, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    await deleteScheduledMessageRecord(id);
    res.status(204).send();
  });

  // --- AUDIT LOG ---
  app.get(api.auditLog.get.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    const config = await storage.getAuditLogConfig(serverId);
    res.json(config || { enabled: false });
  });

  app.put(api.auditLog.upsert.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    const result = await storage.upsertAuditLogConfig(serverId, req.body);
    res.json(result);
  });

  // --- AUTOMATIONS ---
  app.get("/api/servers/:serverId/automations", async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    res.json(await storage.getAutomations(serverId));
  });
  app.post("/api/servers/:serverId/automations", async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    const created = await storage.createAutomation(serverId, req.body);
    res.status(201).json(created);
  });
  app.put("/api/servers/:serverId/automations/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    const updated = await storage.updateAutomation(id, req.body);
    res.json(updated);
  });
  app.patch("/api/servers/:serverId/automations/:id/toggle", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    const updated = await storage.toggleAutomation(id, req.body.isEnabled);
    res.json(updated);
  });
  app.delete("/api/servers/:serverId/automations/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    await storage.deleteAutomation(id);
    res.status(204).send();
  });

  // --- SERVER VARIABLES ---
  app.get("/api/servers/:serverId/variables", async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    res.json(await storage.getVariables(serverId));
  });
  app.put("/api/servers/:serverId/variables", async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    const { scope, userId, key, value } = req.body;
    const result = await storage.setVariable(serverId, scope || "server", userId || null, key, value);
    res.json(result);
  });
  app.delete("/api/servers/:serverId/variables/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    await storage.deleteVariable(id);
    res.status(204).send();
  });

  // --- ECONOMY ---
  app.get("/api/servers/:serverId/economy/leaderboard", async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    res.json(await storage.getEconomyLeaderboard(serverId));
  });
  app.get("/api/servers/:serverId/economy/:userId", async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    const account = await storage.getOrCreateEconomyAccount(serverId, req.params.userId);
    res.json(account);
  });
  app.post("/api/servers/:serverId/economy/:userId/adjust", async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    const { amount, type, description } = req.body;
    const result = await storage.updateEconomyBalance(serverId, req.params.userId, amount, type || "admin", description);
    res.json(result);
  });
  app.get("/api/servers/:serverId/economy/:userId/transactions", async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    res.json(await storage.getEconomyTransactions(serverId, req.params.userId));
  });

  // --- ROLE SHOP ---
  app.get("/api/servers/:serverId/shop", async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    res.json(await storage.getRoleShop(serverId));
  });
  app.post("/api/servers/:serverId/shop", async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    const created = await storage.createRoleShopItem(serverId, req.body);
    res.status(201).json(created);
  });
  app.put("/api/servers/:serverId/shop/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    const updated = await storage.updateRoleShopItem(id, req.body);
    res.json(updated);
  });
  app.delete("/api/servers/:serverId/shop/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    await storage.deleteRoleShopItem(id);
    res.status(204).send();
  });

  // --- SERVER INSIGHTS ---
  app.get("/api/servers/:serverId/insights", async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    let insights = await storage.getServerInsights(serverId, 30);
    if (insights.length < 7) {
      insights = generateMockInsights(serverId);
    }
    res.json(insights);
  });

  // --- COMMAND SHARES / MARKETPLACE ---
  app.post("/api/servers/:serverId/commands/:commandId/share", requireAuth, async (req, res) => {
    const serverId = parseInt(req.params.serverId as string);
    const commandId = parseInt(req.params.commandId as string);
    if (isNaN(serverId) || isNaN(commandId)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const share = await storage.createCommandShare(serverId, req.user!.discordId, commandId, req.body);
      res.status(201).json(share);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // --- LOCKR BILLING WEBHOOKS ---
  app.get("/api/servers/:serverId/billing/lockr-webhook", requireAuth, async (req, res) => {
    const rawServerId = Array.isArray(req.params.serverId) ? req.params.serverId[0] : req.params.serverId;
    const serverId = parseInt(rawServerId, 10);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });

    const server = await ensureVisibleServerForRequest(req, res, serverId);
    if (!server) return;

    const secret = getLockrWebhookSecret();
    if (!secret) {
      return res.status(503).json({ message: "Lockr webhook secret is not configured." });
    }

    const token = buildLockrServerWebhookToken(serverId, secret);
    const webhookUrl = `${getPublicBaseUrl(req)}/api/billing/lockr/servers/${serverId}/${token}`;
    const settings = (server.settings ?? {}) as Record<string, unknown>;

    return res.json({
      serverId,
      serverName: server.name,
      webhookUrl,
      premiumEnabled: Boolean(settings.serverPremiumEnabled),
      premiumStatus: typeof settings.serverPremiumStatus === "string" ? settings.serverPremiumStatus : null,
      supportedEvents: ["trial.started", "subscription.started", "subscription.cancelled"],
    });
  });

  app.options("/api/billing/lockr/servers/:serverId/:token", (_req, res) => {
    applyLockrWebhookHeaders(res);
    return res.status(204).end();
  });

  app.get("/api/billing/lockr/servers/:serverId/:token", (_req, res) => {
    applyLockrWebhookHeaders(res);
    return res.status(405).json({
      message: "Lockr webhooks must use POST with application/json.",
    });
  });

  app.post("/api/billing/lockr/servers/:serverId/:token", async (req, res) => {
    applyLockrWebhookHeaders(res);
    const rawServerId = Array.isArray(req.params.serverId) ? req.params.serverId[0] : req.params.serverId;
    const serverId = parseInt(rawServerId, 10);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    const providedToken = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;

    const secret = getLockrWebhookSecret();
    if (!secret) {
      return res.status(503).json({ message: "Lockr webhook secret is not configured." });
    }

    if (!verifyLockrServerWebhookToken(serverId, providedToken || "", secret)) {
      return res.status(403).json({ message: "Invalid Lockr webhook token." });
    }

    const server = await getServerRecord(serverId);
    if (!server) return res.status(404).json({ message: "Server not found." });

    const eventType = normalizeLockrEventType(req.body);
    if (!eventType) {
      return res.status(202).json({
        ok: true,
        ignored: true,
        message: "Archivist ignored this Lockr event because it is not supported.",
      });
    }

    const premiumPatch = buildServerPremiumPatchFromLockrEvent(eventType, req.body);
    await storage.setServerPremiumState(serverId, premiumPatch);
    invalidateCustomCommandCache(serverId);
    invalidateCustomCommandV2Cache(serverId);
    invalidateCustomCommandV2RuntimeCache(serverId);

    return res.json({
      ok: true,
      serverId,
      eventType,
      premiumEnabled: Boolean(premiumPatch.serverPremiumEnabled),
      premiumStatus: premiumPatch.serverPremiumStatus ?? null,
    });
  });

  // --- SERVER WEBHOOKS ---
  app.get("/api/servers/:serverId/webhooks", async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    res.json(await storage.getWebhooks(serverId));
  });
  app.post("/api/servers/:serverId/webhooks", async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    const created = await storage.createWebhook(serverId, req.body);
    res.status(201).json(created);
  });
  app.put("/api/servers/:serverId/webhooks/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    const updated = await storage.updateWebhook(id, req.body);
    res.json(updated);
  });
  app.delete("/api/servers/:serverId/webhooks/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    await storage.deleteWebhook(id);
    res.status(204).send();
  });

  // --- POLLS ---
  app.get("/api/servers/:serverId/polls", async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    res.json(await storage.getPolls(serverId));
  });
  app.post("/api/servers/:serverId/polls", async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    const created = await storage.createPoll(serverId, req.body);
    res.status(201).json(created);
  });
  app.put("/api/servers/:serverId/polls/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    const updated = await storage.updatePoll(id, req.body);
    res.json(updated);
  });
  app.delete("/api/servers/:serverId/polls/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    await storage.deletePoll(id);
    res.status(204).send();
  });

  // --- GIVEAWAYS ---
  app.get("/api/servers/:serverId/giveaways", async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    res.json(await storage.getGiveaways(serverId));
  });
  app.post("/api/servers/:serverId/giveaways", async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    const created = await storage.createGiveaway(serverId, req.body);
    res.status(201).json(created);
  });
  app.put("/api/servers/:serverId/giveaways/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    const updated = await storage.updateGiveaway(id, req.body);
    res.json(updated);
  });
  app.post("/api/servers/:serverId/giveaways/:id/reroll", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    const ga = await storage.updateGiveaway(id, { winnerIds: [] });
    res.json(ga);
  });
  app.delete("/api/servers/:serverId/giveaways/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    await storage.deleteGiveaway(id);
    res.status(204).send();
  });

  // --- SEED DATABASE ---
  if (process.env.NODE_ENV !== "production") {
    await seedDatabase();
  }

  // =========================================================
  // === NEW ROUTES: Audit, Snapshots, Codes, Sync, Permissions, Lock
  // =========================================================

  function srvId(req: any): number {
    const raw = Array.isArray(req.params.serverId) ? req.params.serverId[0] : req.params.serverId;
    return parseInt(raw, 10);
  }

  // --- CONFIG AUDIT ---
  app.get("/api/servers/:serverId/config/audit", requireAuth, async (req, res) => {
    const serverId = srvId(req);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    const { limit, moduleId, actorId } = req.query as any;
    const entries = await getAuditLog(serverId, { limit: limit ? parseInt(limit) : 50, moduleId, actorId });
    res.json(entries);
  });

  // --- CONFIG SNAPSHOTS ---
  app.get("/api/servers/:serverId/config/snapshots", requireAuth, async (req, res) => {
    const serverId = srvId(req);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    const { moduleId } = req.query as any;
    const snapshots = await listSnapshots(serverId, moduleId);
    res.json(snapshots);
  });

  app.post("/api/servers/:serverId/config/rollback/:snapshotId", requireAuth, async (req, res) => {
    const serverId = srvId(req);
    const snapshotId = parseInt(Array.isArray(req.params.snapshotId) ? req.params.snapshotId[0] : req.params.snapshotId, 10);
    if (isNaN(serverId) || isNaN(snapshotId)) return res.status(400).json({ message: "Invalid IDs" });
    try {
      const actorId = (req as any).user?.discordId ?? "dashboard";
      const restored = await rollback(serverId, snapshotId, actorId);
      res.json(restored);
    } catch (err: any) {
      res.status(404).json({ message: err.message });
    }
  });

  // --- GUILD CODES ---
  app.get("/api/servers/:serverId/codes", requireAuth, async (req, res) => {
    const serverId = srvId(req);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    const { revoked, tag } = req.query as any;
    const codes = await listCodes(serverId, {
      revoked: revoked !== undefined ? revoked === "true" : undefined,
      tag,
    });
    res.json(codes);
  });

  app.post("/api/servers/:serverId/codes/generate", requireAuth, async (req, res) => {
    const serverId = srvId(req);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    const actorId = (req as any).user?.discordId ?? "dashboard";
    const server = await getServerRecord(serverId);
    if (!server) return res.status(404).json({ message: "Server not found" });
    const code = await generateCode({
      ...req.body,
      serverId,
      guildDiscordId: server.discordId,
      createdBy: actorId,
    });
    res.status(201).json(code);
  });

  app.post("/api/servers/:serverId/codes/redeem", async (req, res) => {
    const serverId = srvId(req);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    const { code, userId } = req.body;
    if (!code || !userId) return res.status(400).json({ message: "code and userId are required" });
    const server = await getServerRecord(serverId);
    if (!server) return res.status(404).json({ message: "Server not found" });
    const result = await redeemCode(code.toUpperCase(), userId, server.discordId);
    if (!result.success) return res.status(400).json({ message: result.error });
    res.json(result);
  });

  app.post("/api/servers/:serverId/codes/:id/revoke", requireAuth, async (req, res) => {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    const updated = await revokeCode(id);
    res.json(updated);
  });

  // --- CHANNEL SYNC TEMPLATES ---
  app.get("/api/servers/:serverId/sync/templates", requireAuth, async (req, res) => {
    const serverId = srvId(req);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    const templates = await db.select().from(channelSyncTemplates).where(eq(channelSyncTemplates.serverId, serverId));
    res.json(templates);
  });

  app.post("/api/servers/:serverId/sync/templates", requireAuth, async (req, res) => {
    const serverId = srvId(req);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    const { name, description, settings } = req.body;
    if (!name) return res.status(400).json({ message: "name is required" });
    const [created] = await db.insert(channelSyncTemplates).values({ serverId, name, description, settings }).returning();
    res.status(201).json(created);
  });

  app.delete("/api/servers/:serverId/sync/templates/:id", requireAuth, async (req, res) => {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    await db.delete(channelSyncTemplates).where(eq(channelSyncTemplates.id, id));
    res.status(204).send();
  });

  app.post("/api/servers/:serverId/sync/apply", requireAuth, async (req, res) => {
    const serverId = srvId(req);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    const { templateId, scope, channelIds, preview } = req.body;
    const [template] = await db.select().from(channelSyncTemplates).where(eq(channelSyncTemplates.id, templateId));
    if (!template) return res.status(404).json({ message: "Template not found" });

    const channelSettingsList = await listChannelSettingRecords(serverId);
    const targetChannels = scope === "channels" && channelIds?.length
      ? channelSettingsList.filter((c: any) => channelIds.includes(c.channelId))
      : channelSettingsList;

    const templateSettings = template.settings as Record<string, any> ?? {};
    const diff = targetChannels.map((ch: any) => {
      const changes = Object.keys(templateSettings).filter(k => JSON.stringify(ch[k]) !== JSON.stringify(templateSettings[k])).map(k => ({ key: k, from: ch[k], to: templateSettings[k] }));
      return { channelId: ch.channelId, channelName: ch.channelName, changes };
    }).filter((d: any) => d.changes.length > 0);

    if (preview) return res.json({ diff });

    for (const ch of targetChannels) {
      await upsertChannelSettingRecord(serverId, { ...ch, ...templateSettings });
    }
    res.json({ applied: true, channels: targetChannels.length });
  });

  // --- PERMISSIONS ---
  app.get("/api/servers/:serverId/permissions", requireAuth, async (req, res) => {
    const serverId = srvId(req);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    const rules = await listPermissionRules(serverId);
    res.json(rules);
  });

  app.post("/api/servers/:serverId/permissions", requireAuth, async (req, res) => {
    const serverId = srvId(req);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    const rule = await createPermissionRule(serverId, req.body);
    res.status(201).json(rule);
  });

  app.delete("/api/servers/:serverId/permissions/:id", requireAuth, async (req, res) => {
    const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    await deletePermissionRule(id);
    res.status(204).send();
  });

  app.post("/api/servers/:serverId/permissions/check", requireAuth, async (req, res) => {
    const serverId = srvId(req);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    const { roleIds, permission } = req.body;
    if (!roleIds || !permission) return res.status(400).json({ message: "roleIds and permission are required" });
    const result = await checkPermission(roleIds, permission, serverId);
    res.json(result);
  });

  // --- CATEGORY LOCK ---
  app.post("/api/servers/:serverId/lock/category", requireAuth, async (req, res) => {
    const serverId = srvId(req);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    const { categoryId, lock, categoryName, message: lockMessage } = req.body;
    const actorId = (req as any).user?.discordId ?? "dashboard";
    if (lock) {
      await db.insert(categoryLockSnapshots).values({
        serverId,
        categoryId,
        categoryName: categoryName ?? categoryId,
        snapshot: { lockedVia: "dashboard" },
        lockedBy: actorId,
        unlocked: false,
      });
      await recordAudit(serverId, "category-lock", actorId, null, { categoryId, locked: true });
      res.json({ locked: true, categoryId });
    } else {
      const [snap] = await db.select().from(categoryLockSnapshots)
        .where(and(eq(categoryLockSnapshots.serverId, serverId), eq(categoryLockSnapshots.categoryId, categoryId)));
      if (snap) {
        await db.update(categoryLockSnapshots).set({ unlocked: true }).where(eq(categoryLockSnapshots.id, snap.id));
      }
      await recordAudit(serverId, "category-lock", actorId, null, { categoryId, locked: false });
      res.json({ locked: false, categoryId });
    }
  });
}

function formatDuration(ms: number | null): string {
  if (!ms || ms <= 0) return "offline";
  const secs = Math.floor(ms / 1000);
  const days = Math.floor(secs / 86400);
  const hours = Math.floor((secs % 86400) / 3600);
  const minutes = Math.floor((secs % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function mapDiscordChannelTypeName(type: string): string {
  switch (type) {
    case "0":
      return "text";
    case "2":
      return "voice";
    case "4":
      return "category";
    case "5":
      return "announcement";
    case "13":
      return "stage";
    case "15":
      return "forum";
    default:
      return "other";
  }
}

function parseEmbedColor(color: unknown): number | null {
  if (typeof color === "number" && Number.isFinite(color)) return color;
  if (typeof color !== "string") return null;
  const normalized = color.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;
  return parseInt(normalized, 16);
}

function toComponentEmoji(emoji: unknown): { name?: string; id?: string; animated?: boolean } | undefined {
  if (typeof emoji !== "string") return undefined;
  const raw = emoji.trim();
  if (!raw) return undefined;

  const customMatch = raw.match(/^<?(a?):([a-zA-Z0-9_]+):(\d+)>?$/);
  if (customMatch) {
    return {
      id: customMatch[3],
      name: customMatch[2],
      animated: customMatch[1] === "a",
    };
  }

  return { name: raw };
}

function buildDiscordEmbed(embedRecord: any): EmbedBuilder | null {
  const embed = new EmbedBuilder();
  let hasContent = false;

  if (embedRecord.title) {
    embed.setTitle(String(embedRecord.title));
    hasContent = true;
  }
  if (embedRecord.description) {
    embed.setDescription(String(embedRecord.description));
    hasContent = true;
  }
  if (embedRecord.url) {
    embed.setURL(String(embedRecord.url));
    hasContent = true;
  }

  const color = parseEmbedColor(embedRecord.color);
  if (color !== null) {
    embed.setColor(color);
    hasContent = true;
  }

  if (embedRecord.authorName) {
    embed.setAuthor({
      name: String(embedRecord.authorName),
      url: embedRecord.authorUrl ? String(embedRecord.authorUrl) : undefined,
      iconURL: embedRecord.authorIconUrl ? String(embedRecord.authorIconUrl) : undefined,
    });
    hasContent = true;
  }

  if (embedRecord.footerText) {
    embed.setFooter({
      text: String(embedRecord.footerText),
      iconURL: embedRecord.footerIconUrl ? String(embedRecord.footerIconUrl) : undefined,
    });
    hasContent = true;
  }

  if (embedRecord.imageUrl) {
    embed.setImage(String(embedRecord.imageUrl));
    hasContent = true;
  }
  if (embedRecord.thumbnailUrl) {
    embed.setThumbnail(String(embedRecord.thumbnailUrl));
    hasContent = true;
  }

  if (Array.isArray(embedRecord.fields)) {
    const fields = embedRecord.fields
      .filter((field: any) => field && typeof field.name === "string" && typeof field.value === "string")
      .slice(0, 25)
      .map((field: any) => ({
        name: field.name,
        value: field.value,
        inline: Boolean(field.inline),
      }));
    if (fields.length > 0) {
      embed.addFields(fields);
      hasContent = true;
    }
  }

  if (embedRecord.timestamp) {
    embed.setTimestamp(new Date());
    hasContent = true;
  }

  return hasContent ? embed : null;
}

function mapButtonStyle(style?: number): ButtonStyle {
  if (style === 2) return ButtonStyle.Secondary;
  if (style === 3) return ButtonStyle.Success;
  if (style === 4) return ButtonStyle.Danger;
  return ButtonStyle.Primary;
}

type ComponentDiagnostic = {
  level: "info" | "warning" | "error";
  code: string;
  message: string;
  path?: string;
};

function isLikelyHttpUrl(value: string): boolean {
  return /^https?:\/\/\S+$/i.test(value.trim());
}

function collectInteractiveComponents(
  components: EmbedComponentType[],
  basePath = "components"
): Array<{ component: EmbedComponentType; path: string }> {
  const output: Array<{ component: EmbedComponentType; path: string }> = [];
  const walk = (items: EmbedComponentType[] | undefined, path: string) => {
    if (!Array.isArray(items)) return;

    for (let index = 0; index < items.length; index++) {
      const current = items[index];
      if (!current || typeof current.type !== "number") continue;
      const currentPath = `${path}[${index}]`;

      if (current.type === 2 || current.type === 3) {
        output.push({ component: current, path: currentPath });
      }

      if (Array.isArray(current.components)) {
        walk(current.components, `${currentPath}.components`);
      }

      if (current.accessory) {
        walk([current.accessory], `${currentPath}.accessory`);
      }
    }
  };

  walk(components, basePath);
  return output;
}

function buildActionRows(input: {
  components: EmbedComponentType[];
  serverId: number;
  guildId: string;
  embedId: number;
  diagnostics?: ComponentDiagnostic[];
  debugMode?: boolean;
}) {
  // Discord.js currently serializes only interactive components (buttons/selects) for message sends.
  // Non-interactive V2 blocks (e.g. section/container/text) are preview-only in this runtime path.
  const diagnostics = input.diagnostics ?? [];
  const rows: Array<ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>> = [];
  let buttonBuffer: ButtonBuilder[] = [];
  const interactiveComponents = collectInteractiveComponents(input.components);

  const flushButtons = () => {
    if (buttonBuffer.length === 0 || rows.length >= 5) return;
    rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(...buttonBuffer));
    buttonBuffer = [];
  };

  const buildToken = (action: InteractiveActionConfig) => {
    const token = encodeEmbedActionToken({
      serverId: input.serverId,
      guildId: input.guildId,
      embedId: input.embedId,
      action,
    });
    return token ? `${EMBED_ACTION_TOKEN_PREFIX}${token}` : null;
  };

  for (let componentIndex = 0; componentIndex < interactiveComponents.length; componentIndex++) {
    if (rows.length >= 5) break;
    const { component, path } = interactiveComponents[componentIndex];

    if (component.type === 2) {
      const action = component.action;
      const isLink = component.style === 5 || action?.type === "open_url";
      const button = new ButtonBuilder();

      const label = (component.label || "Action").slice(0, 80);
      button.setLabel(label);
      if (component.disabled) button.setDisabled(true);

      const emojiData = toComponentEmoji(component.emoji);
      if (emojiData) button.setEmoji(emojiData);

      if (isLink) {
        const url = String(action?.url || component.url || "").trim();
        if (!isLikelyHttpUrl(url)) {
          diagnostics.push({
            level: "warning",
            code: "BUTTON_LINK_URL_INVALID",
            message: "Link button skipped because URL is missing or invalid.",
            path,
          });
          continue;
        }
        button.setStyle(ButtonStyle.Link).setURL(url);
      } else {
        let customId: string | null = null;
        if (action) {
          customId = buildToken(action);
          if (!customId) {
            diagnostics.push({
              level: "warning",
              code: "BUTTON_ACTION_TOKEN_FAILED",
              message: "Button action token generation failed.",
              path,
            });
          }
        }

        if (!customId && component.customId) {
          customId = component.customId.slice(0, 100);
          diagnostics.push({
            level: "info",
            code: "BUTTON_CUSTOM_ID_FALLBACK",
            message: "Button used customId fallback because no action token was available.",
            path,
          });
        }

        if (!customId) {
          diagnostics.push({
            level: "warning",
            code: "BUTTON_NO_CUSTOM_ID",
            message: "Button skipped because it has no valid action token or customId.",
            path,
          });
          continue;
        }

        button.setCustomId(customId).setStyle(mapButtonStyle(component.style));
      }

      buttonBuffer.push(button);
      if (buttonBuffer.length >= 5) {
        flushButtons();
      }
      continue;
    }

    if (component.type === 3) {
      flushButtons();
      if (rows.length >= 5) break;

      const options = Array.isArray(component.options) ? component.options : [];
      const preparedOptions = options.flatMap((option): Array<{
        label: string;
        value: string;
        description?: string;
        emoji?: { name?: string; id?: string; animated?: boolean };
      }> => {
        const opt = option as EmbedComponentOption;
        const action = opt.action || component.action;
        const fallbackValue = String(opt.value || "").trim();
        let tokenValue: string | null = null;
        if (action) {
          tokenValue = buildToken(action);
          if (!tokenValue) {
            diagnostics.push({
              level: "warning",
              code: "SELECT_OPTION_TOKEN_FAILED",
              message: "Select option action token generation failed.",
              path,
            });
          }
        }

        if (!tokenValue && fallbackValue) {
          tokenValue = fallbackValue.slice(0, 100);
          diagnostics.push({
            level: "info",
            code: "SELECT_OPTION_VALUE_FALLBACK",
            message: "Select option used its raw value because no action token was available.",
            path,
          });
        }

        if (!tokenValue) return [];

        return [{
          label: String(opt.label || "Option").slice(0, 100),
          value: tokenValue,
          description: opt.description ? String(opt.description).slice(0, 100) : undefined,
          emoji: toComponentEmoji(opt.emoji),
        }];
      });

      if (preparedOptions.length === 0) {
        diagnostics.push({
          level: "warning",
          code: "SELECT_NO_OPTIONS",
          message: "Select menu skipped because no valid options were generated.",
          path,
        });
        continue;
      }

      const menu = new StringSelectMenuBuilder()
        .setCustomId(
          (component.customId && component.customId.length <= 100)
            ? component.customId
            : `axm_${input.embedId}_${componentIndex}`
        )
        .setPlaceholder(String(component.placeholder || component.label || "Select an option").slice(0, 150))
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(preparedOptions.slice(0, 25));

      if (component.disabled) menu.setDisabled(true);

      rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu));
    }
  }

  flushButtons();
  if (interactiveComponents.length === 0 && input.components.length > 0) {
    diagnostics.push({
      level: "warning",
      code: "NO_INTERACTIVE_COMPONENTS",
      message: "No sendable interactive components were found. Non-interactive Components V2 blocks are not serialized by this Discord.js runtime path.",
    });
  }

  if (rows.length >= 5 && interactiveComponents.length > 5) {
    diagnostics.push({
      level: "warning",
      code: "ACTION_ROW_LIMIT",
      message: "Discord limits interactive rows to 5. Additional components were truncated.",
    });
  }

  return rows.slice(0, 5);
}

function generateMockInsights(serverId: number) {
  const insights = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const base = 200 + Math.floor(Math.random() * 300);
    const hourlyActivity = Array.from({ length: 24 }, (_, h) => {
      const factor = h >= 15 && h <= 22 ? 1.5 : h >= 0 && h <= 7 ? 0.3 : 1;
      return Math.floor(Math.random() * 40 * factor);
    });
    insights.push({
      id: i + 1,
      serverId,
      date: dateStr,
      messageCount: base,
      memberCount: 1000 + Math.floor(Math.random() * 50) - 25,
      memberJoins: Math.floor(Math.random() * 15),
      memberLeaves: Math.floor(Math.random() * 8),
      commandsUsed: Math.floor(Math.random() * 80),
      topChannels: [
        { channelId: "general", channelName: "#general", count: Math.floor(base * 0.4) },
        { channelId: "memes", channelName: "#memes", count: Math.floor(base * 0.25) },
        { channelId: "off-topic", channelName: "#off-topic", count: Math.floor(base * 0.2) },
      ],
      hourlyActivity,
      weekdayActivity: [40, 60, 55, 65, 70, 90, 80],
      createdAt: d,
    });
  }
  return insights;
}

async function seedDatabase() {
  const existing = await db.select().from(servers);
  if (existing.length > 0) return;

  const s1 = await storage._createBaseServer({
    discordId: "123456789012345678",
    name: "The Gaming Hub",
    iconUrl: "https://cdn.discordapp.com/icons/123456789012345678/a_dummy_icon.png",
    memberCount: 1542,
    ownerId: "987654321098765432",
  });

  await storage._createBaseSettings({
    serverId: s1.id,
    prefix: "!",
    welcomeEnabled: true,
    welcomeChannelId: "welcome-1",
    welcomeMessage: "Welcome to The Gaming Hub, {user}!",
    leaveEnabled: true,
    leaveChannelId: "welcome-1",
    leaveMessage: "{user} has left the server.",
    automodEnabled: true,
    antiSpamEnabled: true,
    antiLinkEnabled: false,
    antiCapsEnabled: true,
    antiEmojiSpamEnabled: false,
    antiMassMentionEnabled: true,
    antiInviteEnabled: false,
    bannedWords: ["badword1", "badword2"],
    automodAction: "warn",
    logChannelId: "logs-1",
    logEvents: ["messageDelete", "memberJoin", "memberLeave"],
  } as any);

      await createCustomCommandRecord(s1.id, {
    name: "rules",
    response: "1. Be respectful to all members\n2. No spamming or flooding\n3. No NSFW content\n4. Use channels appropriately\n5. Have fun!",
    description: "Display server rules",
    aliases: ["r", "serverrules"],
    cooldown: 10,
    enabled: true,
    responseType: "text",
  });

      await createCustomCommandRecord(s1.id, {
    name: "ping",
    response: "Pong! Bot latency: {random:12,15,18,22,25}ms",
    description: "Check bot latency",
    aliases: ["p", "latency"],
    cooldown: 5,
    enabled: true,
    responseType: "text",
  });

  const s2 = await storage._createBaseServer({
    discordId: "876543210987654321",
    name: "Anime Enthusiasts",
    iconUrl: "https://cdn.discordapp.com/icons/876543210987654321/a_dummy_icon.png",
    memberCount: 890,
    ownerId: "987654321098765432",
  });

  await storage._createBaseSettings({
    serverId: s2.id,
    prefix: "?",
    welcomeEnabled: true,
    welcomeChannelId: "welcome-2",
    welcomeMessage: "Yokoso, {user}! Welcome to {server}!",
    leaveEnabled: true,
    leaveChannelId: "welcome-2",
    leaveMessage: "Sayonara, {user}.",
    automodEnabled: false,
    antiLinkEnabled: true,
    antiInviteEnabled: true,
    bannedWords: [],
    logChannelId: null,
    logEvents: [],
  } as any);

      await createCustomCommandRecord(s2.id, {
    name: "recommend",
    response: "Check out Frieren: Beyond Journey's End!",
    description: "Get an anime recommendation",
    cooldown: 30,
    enabled: true,
    responseType: "text",
  });
}

