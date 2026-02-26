import type { Express } from "express";
import type { Server } from "http";
import { z } from "zod";
import { api } from "@shared/routes";
import { storage } from "./storage";
import { servers, channelSyncTemplates, permissionRules, categoryLockSnapshots } from "@shared/schema";
import { db } from "./db";
import { eq, sql, and } from "drizzle-orm";
import { requireAuth } from "./auth";
import { getBotClient, getBotUptime } from "./bot/index";
import { recordAudit, getAuditLog } from "./auditService";
import { createSnapshot, listSnapshots, rollback } from "./snapshotService";
import { generateCode, redeemCode, listCodes, revokeCode } from "./codeVaultService";
import { listPermissionRules, createPermissionRule, deletePermissionRule, checkPermission } from "./permissionsService";
import { patchGuildConfig } from "./configService";

export async function registerRoutes(_server: Server, app: Express) {

  // Protect all /api/servers/* routes — exempt only the public code-redeem endpoint
  app.use("/api/servers", (req, res, next) => {
    if (req.path.match(/\/codes\/redeem$/) && req.method === "POST") return next();
    return requireAuth(req as any, res, next);
  });

  // --- HEALTH ---
  app.get("/health", async (_req, res) => {
    const bot = getBotClient();
    const uptime = getBotUptime();
    const premiumCount = await storage.getPremiumUserCount();
    res.json({
      status: "ok",
      bot: bot ? { status: "online", username: bot.user?.tag, guilds: bot.guilds.cache.size } : { status: "offline" },
      uptime: uptime ? `${Math.floor(uptime / 1000)}s` : null,
      premiumUsers: premiumCount,
      timestamp: new Date().toISOString(),
    });
  });

  // --- TEMPLATES ---
  app.get("/api/templates", requireAuth, async (req, res) => {
    const serverId = req.query.serverId ? parseInt(req.query.serverId as string) : undefined;
    const tmpl = await storage.getTemplates(req.user!.id, serverId);
    res.json(tmpl);
  });

  app.post("/api/templates", requireAuth, async (req, res) => {
    const ownerIds = (process.env.OWNER_IDS || "").split(",").filter(Boolean);
    const isPremium = req.user!.isPremium || ownerIds.includes(req.user!.discordId);
    const count = await storage.getTemplateCount(req.user!.id);
    const limit = isPremium ? 10 : 2;
    if (count >= limit) {
      return res.status(403).json({ message: `Template limit reached (${limit}). ${isPremium ? "" : "Upgrade to Premium for more."}` });
    }
    const created = await storage.createTemplate({ ...req.body, userId: req.user!.id });
    res.status(201).json(created);
  });

  app.delete("/api/templates/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    await storage.deleteTemplate(id);
    res.status(204).send();
  });
  // --- STATS ---
  app.get(api.stats.get.path, async (_req, res) => {
    const allServers = await storage.getServers();
    const totalMembers = allServers.reduce((sum, s) => sum + (s.memberCount || 0), 0);
    const usageResult = await db.execute(sql`SELECT COALESCE(SUM(usage_count), 0) AS total FROM custom_commands`);
    const commandsExecuted = Number((usageResult.rows[0] as any)?.total ?? 0);
    const botUptimeMs = getBotUptime();
    const uptimeStr = botUptimeMs != null
      ? (() => {
          const s = Math.floor(botUptimeMs / 1000);
          const h = Math.floor(s / 3600);
          const m = Math.floor((s % 3600) / 60);
          return h > 0 ? `${h}h ${m}m` : `${m}m`;
        })()
      : "offline";
    res.json({
      totalServers: allServers.length,
      totalMembers,
      commandsExecuted,
      uptime: uptimeStr,
    });
  });

  // --- SERVERS ---
  app.get(api.servers.list.path, async (_req, res) => {
    const allServers = await storage.getServers();
    res.json(allServers);
  });

  app.get(api.servers.get.path, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    const server = await storage.getServer(id);
    if (!server) return res.status(404).json({ message: "Server not found" });
    res.json(server);
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
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = req.query.search as string | undefined;
    res.json(await storage.getMembers(serverId, page, limit, search));
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
