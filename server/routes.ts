import type { Express } from "express";
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
  memberNotes,
  economy,
  studioDocuments,
  studioPublications,
  studioPublicationSnapshots,
  studioRuntimeEvents,
  type EmbedComponentType,
  type EmbedComponentOption,
  type InteractiveActionConfig,
  type StudioLibraryCategory,
  type StudioLibraryScope,
  type StudioDocument,
} from "@shared/schema";
import { db, hasDatabaseUrl } from "./db";
import { eq, sql, and } from "drizzle-orm";
import { requireAuth } from "./auth";
import { getBotClient, getBotStatus } from "./bot/index";
import { recordAudit, getAuditLog } from "./auditService";
import { createSnapshot, listSnapshots, rollback } from "./snapshotService";
import { generateCode, redeemCode, listCodes, revokeCode } from "./codeVaultService";
import { listPermissionRules, createPermissionRule, deletePermissionRule, checkPermission } from "./permissionsService";
import { patchGuildConfig } from "./configService";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
} from "discord.js";
import { EMBED_ACTION_TOKEN_PREFIX, encodeEmbedActionToken } from "./bot/embed-action-token";
import {
  createStudioDocumentRecord,
  createStudioPublicationRecord,
  createStudioPublicationSnapshotRecord,
  getCurrentStudioPublicationSnapshot,
  getStudioDocumentById,
  getStudioPublicationById,
  getStudioPublicationByMessage,
  getStudioPublicationSnapshotById,
  listStudioDocuments,
  listStudioLibraryItems,
  listStudioPublicationSnapshots,
  listStudioPublications,
  listStudioRuntimeEvents,
  normalizeStudioDocument,
  recordStudioRuntimeEvent,
  renderStudioDocumentView,
  createStudioLibraryItem,
  deleteStudioLibraryItemRecord,
  getStudioLibraryItemById,
  updateStudioDocumentRecord,
  updateStudioLibraryItemRecord,
  updateStudioPublicationRecord,
} from "./studio-service";
import { buildStudioDiscordPayload } from "./studio-discord";

export async function registerRoutes(_server: Server, app: Express) {

  // Protect all /api/servers/* routes - exempt only the public code-redeem endpoint
  app.use("/api/servers", (req, res, next) => {
    if (req.path.match(/\/codes\/redeem$/) && req.method === "POST") return next();
    return requireAuth(req as any, res, next);
  });

  app.use("/api/studio", requireAuth);

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

  // --- USER PREFERENCES ---
  app.get("/api/preferences", requireAuth, async (req, res) => {
    const prefs = await storage.getUserPreferences(req.user!.id);
    res.json(prefs || { 
      accentColor: "#B11226", 
      embedStyle: "modern", 
      brandName: null,
      eyeIntensity: "subtle",
      glowStrength: 50,
      uiDensity: "comfort",
      glitchFx: true
    });
  });

  app.put("/api/preferences", requireAuth, async (req, res) => {
    const updated = await storage.upsertUserPreferences(req.user!.id, req.body);
    res.json(updated);
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
  app.get(api.servers.studioDocuments.list.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    const items = await listStudioDocuments(serverId, req.user!.id);
    res.json(items);
  });

  app.post(api.servers.studioDocuments.create.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });

    const parsed = api.servers.studioDocuments.create.input.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid payload" });
    }

    const document = normalizeStudioDocument(parsed.data.document, parsed.data.name);
    const created = await createStudioDocumentRecord({
      serverId,
      ownerUserId: req.user!.id,
      scope: parsed.data.scope,
      kind: parsed.data.kind,
      name: parsed.data.name,
      slug: parsed.data.slug,
      moduleBinding: parsed.data.moduleBinding || null,
      document,
      isArchived: parsed.data.isArchived,
    });
    res.status(201).json(created);
  });

  app.patch(api.studio.documents.update.path, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid document ID" });

    const existing = await getStudioDocumentById(id);
    if (!existing) return res.status(404).json({ message: "Document not found" });

    const parsed = api.studio.documents.update.input.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid payload" });
    }

    const updated = await updateStudioDocumentRecord(id, {
      ...parsed.data,
      document: parsed.data.document ? normalizeStudioDocument(parsed.data.document, existing.name) : existing.document,
    } as any);
    res.json(updated);
  });

  app.get(api.servers.studioLibrary.list.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });

    const scopeRaw = String(req.query.scope || "all");
    const categoryRaw = String(req.query.category || "all");
    const scope = (["all", "personal", "server"] as const).includes(scopeRaw as any) ? (scopeRaw as "all" | StudioLibraryScope) : "all";
    const category = ([
      "all",
      "divider",
      "symbol",
      "emoji",
      "format",
      "style_block",
      "style_pack",
      "asset_link",
      "snippet",
    ] as const).includes(categoryRaw as any)
      ? (categoryRaw as "all" | StudioLibraryCategory)
      : "all";
    const search = typeof req.query.q === "string" ? req.query.q : "";
    const favoritesOnly = String(req.query.favorites || "").toLowerCase() === "true" || String(req.query.favorites || "") === "1";

    const items = await listStudioLibraryItems(serverId, req.user!.id, {
      scope,
      category,
      search,
      favoritesOnly,
    });
    res.json(items);
  });

  app.post(api.servers.studioLibrary.create.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });

    const parsed = api.servers.studioLibrary.create.input.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid payload" });
    }

    const created = await createStudioLibraryItem({
      serverId,
      ownerUserId: req.user!.id,
      scope: parsed.data.scope,
      category: parsed.data.category,
      name: parsed.data.name,
      payload: parsed.data.payload,
      tags: parsed.data.tags,
      favorite: parsed.data.favorite,
    });
    res.status(201).json(created);
  });

  app.patch(api.studio.library.update.path, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid library item ID" });
    const existing = await getStudioLibraryItemById(id);
    if (!existing) return res.status(404).json({ message: "Library item not found" });
    if (existing.scope === "personal" && existing.ownerUserId !== req.user!.id) {
      return res.status(403).json({ message: "Not allowed to edit this item" });
    }

    const parsed = api.studio.library.update.input.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid payload" });
    }

    const patch: any = { ...parsed.data };
    if (patch.scope === "personal") {
      patch.ownerUserId = req.user!.id;
    }
    if (patch.scope === "server") {
      patch.ownerUserId = null;
    }

    const updated = await updateStudioLibraryItemRecord(id, patch);
    res.json(updated);
  });

  app.patch(api.studio.library.favorite.path, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid library item ID" });
    const existing = await getStudioLibraryItemById(id);
    if (!existing) return res.status(404).json({ message: "Library item not found" });
    if (existing.scope === "personal" && existing.ownerUserId !== req.user!.id) {
      return res.status(403).json({ message: "Not allowed to edit this item" });
    }

    const parsed = api.studio.library.favorite.input.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid payload" });
    }

    const updated = await updateStudioLibraryItemRecord(id, { favorite: parsed.data.favorite } as any);
    res.json(updated);
  });

  app.delete(api.studio.library.delete.path, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid library item ID" });
    const existing = await getStudioLibraryItemById(id);
    if (!existing) return res.status(404).json({ message: "Library item not found" });
    if (existing.scope === "personal" && existing.ownerUserId !== req.user!.id) {
      return res.status(403).json({ message: "Not allowed to delete this item" });
    }
    await deleteStudioLibraryItemRecord(id);
    res.status(204).send();
  });

  app.get(api.servers.studioPublications.list.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    const publications = await listStudioPublications(serverId);
    const events = await listStudioRuntimeEvents(serverId);
    const eventMap = new Map<number, any[]>();
    for (const event of events) {
      if (!event.publicationId) continue;
      const current = eventMap.get(event.publicationId) || [];
      current.push(event);
      eventMap.set(event.publicationId, current);
    }
    const payload = await Promise.all(publications.map(async (publication) => {
      const snapshots = await listStudioPublicationSnapshots(publication.id);
      const document = await getStudioDocumentById(publication.documentId);
      return {
        ...publication,
        documentName: document?.name || `Document ${publication.documentId}`,
        snapshots: snapshots.slice(0, 10),
        recentEvents: (eventMap.get(publication.id) || []).slice(0, 5),
      };
    }));
    res.json(payload);
  });

  app.post(api.servers.studioPublish.publish.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });

    const parsed = api.servers.studioPublish.publish.input.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid payload" });
    }

    try {
      const result = await publishStudioMessage({
        serverId,
        actorUserId: req.user!.id,
        actorDiscordId: req.user!.discordId,
        documentId: parsed.data.documentId,
        documentInput: parsed.data.document,
        target: parsed.data.target,
      });
      res.json(result);
    } catch (err: any) {
      res.status(err?.statusCode || 400).json({ message: err?.message || "Failed to publish Studio document." });
    }
  });

  app.post(api.studio.publications.clone.path, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid publication ID" });
    const parsed = api.studio.publications.clone.input.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid payload" });
    }

    try {
      const result = await cloneStudioPublication({
        publicationId: id,
        actorUserId: req.user!.id,
        targetChannelId: parsed.data.channelId,
      });
      res.json(result);
    } catch (err: any) {
      res.status(err?.statusCode || 400).json({ message: err?.message || "Failed to clone publication." });
    }
  });

  app.post(api.studio.publications.rollback.path, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid publication ID" });
    const parsed = api.studio.publications.rollback.input.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid payload" });
    }

    try {
      const result = await rollbackStudioPublication({
        publicationId: id,
        snapshotId: parsed.data.snapshotId,
        actorUserId: req.user!.id,
      });
      res.json(result);
    } catch (err: any) {
      res.status(err?.statusCode || 400).json({ message: err?.message || "Failed to rollback publication." });
    }
  });

  app.post(api.studio.publications.archive.path, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid publication ID" });
    const publication = await getStudioPublicationById(id);
    if (!publication) return res.status(404).json({ message: "Publication not found" });

    const updated = await updateStudioPublicationRecord(id, { active: false, status: "archived" });
    res.json(updated);
  });

  app.patch(api.studio.publications.status.path, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid publication ID" });
    const publication = await getStudioPublicationById(id);
    if (!publication) return res.status(404).json({ message: "Publication not found" });

    const parsed = api.studio.publications.status.input.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid payload" });
    }

    const updated = await updateStudioPublicationRecord(id, parsed.data);
    res.json(updated);
  });
  // --- STATS ---
  app.get(api.stats.get.path, async (_req, res) => {
    const bot = getBotStatus();
    const uptimeStr = formatDuration(bot.uptimeMs);

    let allServers: any[] = [];
    let totalMembers = 0;
    let commandsExecuted = 0;

    try {
      allServers = await storage.getServers();
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
      const allServers = await storage.getServers();
      return res.json(allServers);
    } catch (err: any) {
      console.error("[Servers] Failed to list servers:", err?.message || err);
      // Keep dashboard shell usable even if database access is temporarily degraded.
      return res.status(200).json([]);
    }
  });

  app.get(api.servers.get.path, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const server = await storage.getServer(id);
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

      const server = await storage.getServer(serverId);
      if (!server) return res.status(404).json({ message: "Server not found" });

      const client = getBotClient();
      if (!client?.isReady()) {
        return res.status(503).json({ message: "Bot is offline. Start the bot to load roles/channels." });
      }

      const guild = client.guilds.cache.get(server.discordId) ?? await client.guilds.fetch(server.discordId).catch(() => null);
      if (!guild) return res.status(404).json({ message: "Bot is not in this Discord server." });

      await guild.channels.fetch().catch(() => null);
      await guild.roles.fetch().catch(() => null);

      const channels = Array.from(guild.channels.cache.values())
        .filter((channel: any) => !!channel)
        .map((channel: any) => ({
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
        }))
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
    res.json(await storage.getCommands(serverId));
  });

  app.post(api.commands.create.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    try {
      const created = await storage.createCommand(serverId, req.body);
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  app.patch(api.commands.update.path, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    try {
      const updated = await storage.updateCommand(id, req.body);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  app.delete(api.commands.delete.path, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    await storage.deleteCommand(id);
    res.status(204).send();
  });

  // --- EMBEDS ---
  app.get(api.embeds.list.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    res.json(await storage.getEmbeds(serverId));
  });

  app.post(api.embeds.create.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    try {
      const created = await storage.createEmbed(serverId, req.body);
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  app.patch(api.embeds.update.path, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    const updated = await storage.updateEmbed(id, req.body);
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

    const server = await storage.getServer(serverId);
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
    await storage.deleteEmbed(id);
    res.status(204).send();
  });

  // --- CHANNEL SETTINGS ---
  app.get(api.channelSettings.list.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    res.json(await storage.getChannelSettings(serverId));
  });

  app.put(api.channelSettings.upsert.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    const result = await storage.upsertChannelSettings(serverId, req.body);
    res.json(result);
  });

  app.delete(api.channelSettings.delete.path, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    await storage.deleteChannelSettings(id);
    res.status(204).send();
  });

  // --- REACTION ROLES ---
  app.get(api.reactionRoles.list.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    res.json(await storage.getReactionRoles(serverId));
  });

  app.post(api.reactionRoles.create.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    const created = await storage.createReactionRole(serverId, req.body);
    res.status(201).json(created);
  });

  app.delete(api.reactionRoles.delete.path, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    await storage.deleteReactionRole(id);
    res.status(204).send();
  });

  // --- AUTO ROLES ---
  app.get(api.autoRoles.list.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    res.json(await storage.getAutoRoles(serverId));
  });

  app.post(api.autoRoles.create.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    const created = await storage.createAutoRole(serverId, req.body);
    res.status(201).json(created);
  });

  app.delete(api.autoRoles.delete.path, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    await storage.deleteAutoRole(id);
    res.status(204).send();
  });

  // --- WARNINGS ---
  app.get(api.warnings.list.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    res.json(await storage.getWarnings(serverId));
  });

  app.post(api.warnings.create.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    const created = await storage.createWarning(serverId, req.body);
    res.status(201).json(created);
  });

  app.delete(api.warnings.delete.path, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    await storage.deleteWarning(id);
    res.status(204).send();
  });

  app.delete(api.warnings.clear.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    const userId = req.params.userId;
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    await storage.clearWarnings(serverId, userId);
    res.status(204).send();
  });

  // --- PUNISHMENT CONFIG ---
  app.get(api.punishments.list.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    res.json(await storage.getPunishmentConfig(serverId));
  });

  app.put(api.punishments.upsert.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    const result = await storage.upsertPunishmentConfig(serverId, req.body);
    res.json(result);
  });

  app.delete(api.punishments.delete.path, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    await storage.deletePunishmentConfig(id);
    res.status(204).send();
  });

  // --- LEVELING ---
  app.get(api.leveling.get.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    const config = await storage.getLevelingConfig(serverId);
    res.json(config || { enabled: false });
  });

  app.put(api.leveling.upsert.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    const result = await storage.upsertLevelingConfig(serverId, req.body);
    res.json(result);
  });

  // --- STARBOARD ---
  app.get(api.starboard.get.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    const config = await storage.getStarboardConfig(serverId);
    res.json(config || { enabled: false });
  });

  app.put(api.starboard.upsert.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    const result = await storage.upsertStarboardConfig(serverId, req.body);
    res.json(result);
  });

  // --- TICKETS ---
  app.get(api.tickets.getConfig.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    const config = await storage.getTicketConfig(serverId);
    res.json(config || { enabled: false });
  });

  app.put(api.tickets.upsertConfig.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    const result = await storage.upsertTicketConfig(serverId, req.body);
    res.json(result);
  });

  app.get(api.tickets.listPanels.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    res.json(await storage.getTicketPanels(serverId));
  });

  app.post(api.tickets.createPanel.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    const created = await storage.createTicketPanel(serverId, req.body);
    res.status(201).json(created);
  });

  app.patch(api.tickets.updatePanel.path, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    const updated = await storage.updateTicketPanel(id, req.body);
    res.json(updated);
  });

  app.delete(api.tickets.deletePanel.path, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    await storage.deleteTicketPanel(id);
    res.status(204).send();
  });

  // --- SCHEDULED MESSAGES ---
  app.get(api.scheduledMessages.list.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    res.json(await storage.getScheduledMessages(serverId));
  });

  app.post(api.scheduledMessages.create.path, async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    const created = await storage.createScheduledMessage(serverId, req.body);
    res.status(201).json(created);
  });

  app.patch(api.scheduledMessages.update.path, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    const updated = await storage.updateScheduledMessage(id, req.body);
    res.json(updated);
  });

  app.delete(api.scheduledMessages.delete.path, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    await storage.deleteScheduledMessage(id);
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

  // --- MEMBERS ---
  app.get("/api/servers/:serverId/members", async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(200, parseInt(req.query.limit as string) || 50));
    const search = (req.query.search as string | undefined)?.trim().toLowerCase();

    const server = await storage.getServer(serverId);
    if (!server) return res.status(404).json({ message: "Server not found" });

    const client = getBotClient();
    if (!client?.isReady()) {
      return res.status(503).json({ message: "Bot is offline. Start the bot to load members." });
    }

    const guild = client.guilds.cache.get(server.discordId) ?? await client.guilds.fetch(server.discordId).catch(() => null);
    if (!guild) return res.status(404).json({ message: "Bot is not in this Discord server." });

    await guild.members.fetch().catch(() => null);

    const [allWarnings, allNotes, allEconomy] = await Promise.all([
      storage.getWarnings(serverId),
      db.select().from(memberNotes).where(eq(memberNotes.serverId, serverId)),
      db.select().from(economy).where(eq(economy.serverId, serverId)),
    ]);

    const warningsByUser: Record<string, number> = {};
    for (const warning of allWarnings) {
      if (warning.active) warningsByUser[warning.userId] = (warningsByUser[warning.userId] || 0) + 1;
    }

    const notesByUser: Record<string, number> = {};
    for (const note of allNotes) {
      notesByUser[note.targetUserId] = (notesByUser[note.targetUserId] || 0) + 1;
    }

    const economyByUser: Record<string, number> = {};
    for (const balance of allEconomy) {
      economyByUser[balance.userId] = balance.balance ?? 0;
    }

    const membersData = Array.from(guild.members.cache.values()).map((member: any) => {
      const username = member.displayName || member.user?.username || member.user?.tag || member.id;
      return {
        userId: member.id,
        username,
        warningCount: warningsByUser[member.id] || 0,
        noteCount: notesByUser[member.id] || 0,
        economyBalance: Object.prototype.hasOwnProperty.call(economyByUser, member.id) ? economyByUser[member.id] : null,
      };
    });

    const filtered = search
      ? membersData.filter((member) =>
          member.username.toLowerCase().includes(search) ||
          member.userId.includes(search),
        )
      : membersData;

    filtered.sort((a, b) => a.username.localeCompare(b.username));

    const total = filtered.length;
    const offset = (page - 1) * limit;

    await db
      .update(servers)
      .set({ memberCount: guild.memberCount })
      .where(eq(servers.id, serverId))
      .catch(() => undefined);

    res.json({ members: filtered.slice(offset, offset + limit), total });
  });

  app.get("/api/servers/:serverId/members/:userId", async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    const profile = await storage.getMemberProfile(serverId, req.params.userId);
    res.json(profile);
  });

  app.post("/api/servers/:serverId/members/bulk", async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    const { action, userIds, reason, roleId, message } = req.body;
    if (!action || !userIds || !Array.isArray(userIds)) {
      return res.status(400).json({ message: "action and userIds required" });
    }
    const results: any[] = [];
    if (action === "addWarning" && reason) {
      for (const userId of userIds) {
        const created = await storage.createWarning(serverId, {
          userId,
          userName: userId,
          moderatorId: "dashboard",
          moderatorName: "Dashboard",
          reason: reason || "Bulk action",
        });
        results.push(created);
      }
    }
    res.json({ success: true, action, affected: userIds.length, results });
  });

  // --- MEMBER NOTES ---
  app.get("/api/servers/:serverId/members/:userId/notes", async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    res.json(await storage.getMemberNotes(serverId, req.params.userId));
  });
  app.post("/api/servers/:serverId/members/:userId/notes", async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    const created = await storage.createMemberNote(serverId, { ...req.body, targetUserId: req.params.userId });
    res.status(201).json(created);
  });
  app.delete("/api/servers/:serverId/members/:userId/notes/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    await storage.deleteMemberNote(id);
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
  app.get("/api/marketplace", async (req, res) => {
    const { category, search, limit, offset } = req.query;
    const shares = await storage.listMarketplace({
      category: category as string,
      search: search as string,
      limit: limit ? parseInt(limit as string) : 20,
      offset: offset ? parseInt(offset as string) : 0,
    });
    res.json(shares);
  });
  app.get("/api/marketplace/:shareCode", async (req, res) => {
    const share = await storage.getCommandShare(req.params.shareCode);
    if (!share) return res.status(404).json({ message: "Share not found" });
    await storage.incrementShareView(req.params.shareCode);
    res.json(share);
  });
  app.post("/api/marketplace/:shareCode/import", requireAuth, async (req, res) => {
    const { serverId } = req.body;
    if (!serverId) return res.status(400).json({ message: "serverId required" });
    try {
      const imported = await storage.importCommand(parseInt(serverId), req.params.shareCode as string);
      res.status(201).json(imported);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });
  app.delete("/api/marketplace/:shareCode", requireAuth, async (req, res) => {
    const share = await storage.getCommandShare(req.params.shareCode as string);
    if (!share) return res.status(404).json({ message: "Share not found" });
    await storage.deleteCommandShare(share.id);
    res.status(204).send();
  });
  app.get("/api/servers/:serverId/shares", async (req, res) => {
    const serverId = parseInt(req.params.serverId);
    if (isNaN(serverId)) return res.status(400).json({ message: "Invalid server ID" });
    res.json(await storage.getServerShares(serverId));
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
  await seedDatabase();

  // =========================================================
  // === NEW ROUTES: Audit, Snapshots, Codes, Sync, Permissions, Lock
  // =========================================================

  function srvId(req: any): number { return parseInt(req.params.serverId); }

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
    const snapshotId = parseInt(req.params.snapshotId);
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
    const server = await storage.getServer(serverId);
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
    const server = await storage.getServer(serverId);
    if (!server) return res.status(404).json({ message: "Server not found" });
    const result = await redeemCode(code.toUpperCase(), userId, server.discordId);
    if (!result.success) return res.status(400).json({ message: result.error });
    res.json(result);
  });

  app.post("/api/servers/:serverId/codes/:id/revoke", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
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
    const id = parseInt(req.params.id);
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

    const channelSettingsList = await storage.getChannelSettings(serverId);
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
      await storage.upsertChannelSettings(serverId, { ...ch, ...templateSettings });
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
    const id = parseInt(req.params.id);
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

function studioHttpError(statusCode: number, message: string) {
  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = statusCode;
  return error;
}

async function resolveStudioGuildChannel(serverId: number, channelId: string) {
  const server = await storage.getServer(serverId);
  if (!server) throw studioHttpError(404, "Server not found");

  const client = getBotClient();
  if (!client?.isReady()) throw studioHttpError(503, "Bot is offline. Start the bot before publishing.");

  const guild = client.guilds.cache.get(server.discordId) ?? await client.guilds.fetch(server.discordId).catch(() => null);
  if (!guild) throw studioHttpError(404, "Bot is not in this Discord server.");

  const channel = await guild.channels.fetch(channelId.trim()).catch(() => null);
  if (!channel || !channel.isTextBased() || channel.isThread()) {
    throw studioHttpError(400, "Selected channel is not a valid text channel.");
  }

  return { server, guild, channel };
}

async function publishStudioMessage(input: {
  serverId: number;
  actorUserId: number;
  actorDiscordId?: string;
  documentId?: number;
  documentInput?: unknown;
  target: {
    channelId: string;
    messageId?: string;
    viewId?: string;
  };
}) {
  let documentRecord = input.documentId ? await getStudioDocumentById(input.documentId) : null;
  if (documentRecord && documentRecord.serverId !== input.serverId) {
    throw studioHttpError(404, "Studio document not found for this server.");
  }

  let document: StudioDocument;
  if (documentRecord) {
    document = input.documentInput
      ? normalizeStudioDocument(input.documentInput, documentRecord.name)
      : normalizeStudioDocument(documentRecord.document, documentRecord.name);

    if (input.documentInput) {
      documentRecord = await updateStudioDocumentRecord(documentRecord.id, {
        name: document.meta.name,
        document,
      } as any);
    }
  } else if (input.documentInput) {
    document = normalizeStudioDocument(input.documentInput, "Untitled Project");
    documentRecord = await createStudioDocumentRecord({
      serverId: input.serverId,
      ownerUserId: input.actorUserId,
      scope: "server",
      kind: "surface",
      name: document.meta.name,
      slug: undefined,
      moduleBinding: null,
      document,
    });
  } else {
    throw studioHttpError(400, "Publish requires a documentId or document payload.");
  }

  const targetChannelId = input.target.channelId.trim();
  const { guild, channel } = await resolveStudioGuildChannel(input.serverId, targetChannelId);
  const rendered = renderStudioDocumentView(document, input.target.viewId);

  if (!rendered.content && rendered.embeds.length === 0 && rendered.interactiveComponents.length === 0) {
    throw studioHttpError(400, "Nothing to publish. Add content, embeds, or interactive components.");
  }

  let publication = input.target.messageId?.trim()
    ? await getStudioPublicationByMessage(input.serverId, targetChannelId, input.target.messageId.trim())
    : null;

  if (!publication) {
    publication = await createStudioPublicationRecord({
      serverId: input.serverId,
      documentId: documentRecord.id,
      channelId: targetChannelId,
      messageId: input.target.messageId?.trim() || "pending",
      currentViewId: rendered.viewId,
    });
  }

  const snapshotPayload = {
    documentId: documentRecord.id,
    documentName: documentRecord.name,
    documentVersion: document.version,
    publishedViewId: rendered.viewId,
    channelId: targetChannelId,
    guildId: guild.id,
    render: {
      content: rendered.content,
      embeds: rendered.embeds,
      components: rendered.interactiveComponents,
    },
    diagnostics: rendered.diagnostics,
    document,
  };

  const snapshotRecord = await createStudioPublicationSnapshotRecord({
    publicationId: publication.id,
    createdByUserId: input.actorUserId,
    snapshot: snapshotPayload,
  });

  publication = await updateStudioPublicationRecord(publication.id, {
    currentSnapshotId: snapshotRecord.id,
    currentViewId: rendered.viewId,
    status: rendered.diagnostics.some((diag) => diag.level === "error") ? "degraded" : "published",
  });

  const payload = buildStudioDiscordPayload(snapshotPayload, publication.id);

  try {
    let messageId = input.target.messageId?.trim();
    if (messageId) {
      const existing = await (channel as any).messages.fetch(messageId).catch(() => null);
      if (!existing) throw studioHttpError(404, "Message not found for update.");
      const updated = await existing.edit({
        content: payload.content,
        embeds: payload.embeds,
        components: payload.components,
      });
      messageId = updated.id;
    } else {
      const sent = await (channel as any).send({
        content: payload.content,
        embeds: payload.embeds,
        components: payload.components,
      });
      messageId = sent.id;
    }

    publication = await updateStudioPublicationRecord(publication.id, {
      messageId,
      channelId: targetChannelId,
      currentSnapshotId: snapshotRecord.id,
      currentViewId: rendered.viewId,
      lastPublishedAt: new Date(),
      active: true,
      status: payload.diagnostics.some((diag) => diag.level === "error") ? "degraded" : "published",
      lastFailureAt: null,
      lastFailureSummary: null,
    } as any);

    await recordStudioRuntimeEvent({
      serverId: input.serverId,
      publicationId: publication.id,
      documentId: documentRecord.id,
      severity: payload.diagnostics.some((diag) => diag.level === "warning") ? "warning" : "info",
      eventType: "publish",
      summary: `Published ${documentRecord.name} to ${targetChannelId}.`,
      details: { diagnostics: payload.diagnostics, viewId: rendered.viewId, messageId },
    });

    return {
      publicationId: publication.id,
      messageId,
      channelId: targetChannelId,
      snapshotVersion: snapshotRecord.version,
      diagnostics: payload.diagnostics,
    };
  } catch (err: any) {
    await updateStudioPublicationRecord(publication.id, {
      status: "failed",
      lastFailureAt: new Date(),
      lastFailureSummary: err?.message || "Publish failed",
    } as any);
    await recordStudioRuntimeEvent({
      serverId: input.serverId,
      publicationId: publication.id,
      documentId: documentRecord.id,
      severity: "error",
      eventType: "publish_failed",
      summary: err?.message || "Publish failed",
      details: { diagnostics: payload.diagnostics, targetChannelId },
    });
    throw err;
  }
}

async function cloneStudioPublication(input: {
  publicationId: number;
  actorUserId: number;
  targetChannelId: string;
}) {
  const publication = await getStudioPublicationById(input.publicationId);
  if (!publication) throw studioHttpError(404, "Publication not found");

  const snapshot = await getCurrentStudioPublicationSnapshot(publication.id);
  if (!snapshot) throw studioHttpError(404, "Publication snapshot not found");

  return publishStudioMessage({
    serverId: publication.serverId,
    actorUserId: input.actorUserId,
    documentId: publication.documentId,
    documentInput: (snapshot.snapshot as any)?.document,
    target: {
      channelId: input.targetChannelId,
      viewId: (snapshot.snapshot as any)?.publishedViewId,
    },
  });
}

async function rollbackStudioPublication(input: {
  publicationId: number;
  snapshotId: number;
  actorUserId: number;
}) {
  const publication = await getStudioPublicationById(input.publicationId);
  if (!publication) throw studioHttpError(404, "Publication not found");

  const snapshotRecord = await getStudioPublicationSnapshotById(input.snapshotId);
  if (!snapshotRecord || snapshotRecord.publicationId !== publication.id) {
    throw studioHttpError(404, "Snapshot not found for this publication.");
  }

  const snapshot = snapshotRecord.snapshot as any;
  const { channel } = await resolveStudioGuildChannel(publication.serverId, publication.channelId);
  const payload = buildStudioDiscordPayload(snapshot, publication.id);
  const existing = await (channel as any).messages.fetch(publication.messageId).catch(() => null);
  if (!existing) throw studioHttpError(404, "Published message no longer exists.");

  await existing.edit({
    content: payload.content,
    embeds: payload.embeds,
    components: payload.components,
  });

  await updateStudioPublicationRecord(publication.id, {
    currentSnapshotId: snapshotRecord.id,
    currentViewId: snapshot.publishedViewId,
    lastPublishedAt: new Date(),
    active: true,
    status: payload.diagnostics.some((diag) => diag.level === "error") ? "degraded" : "published",
  });

  await recordStudioRuntimeEvent({
    serverId: publication.serverId,
    publicationId: publication.id,
    documentId: publication.documentId,
    severity: "info",
    eventType: "rollback",
    summary: `Rolled back publication ${publication.id} to snapshot ${snapshotRecord.version}.`,
    details: { snapshotId: snapshotRecord.id },
  });

  return {
    publicationId: publication.id,
    messageId: publication.messageId,
    channelId: publication.channelId,
    snapshotVersion: snapshotRecord.version,
    diagnostics: payload.diagnostics,
  };
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

  await storage.createCommand(s1.id, {
    name: "rules",
    response: "1. Be respectful to all members\n2. No spamming or flooding\n3. No NSFW content\n4. Use channels appropriately\n5. Have fun!",
    description: "Display server rules",
    aliases: ["r", "serverrules"],
    cooldown: 10,
    enabled: true,
    responseType: "text",
  });

  await storage.createCommand(s1.id, {
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

  await storage.createCommand(s2.id, {
    name: "recommend",
    response: "Check out Frieren: Beyond Journey's End!",
    description: "Get an anime recommendation",
    cooldown: 30,
    enabled: true,
    responseType: "text",
  });
}

