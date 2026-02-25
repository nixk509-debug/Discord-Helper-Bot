import type { Express } from "express";
import type { Server } from "http";
import { z } from "zod";
import { api } from "@shared/routes";
import { storage } from "./storage";
import { servers } from "@shared/schema";
import { db } from "./db";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "./auth";
import { getBotClient, getBotUptime } from "./bot/index";

export async function registerRoutes(_server: Server, app: Express) {

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
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    await storage.deleteTemplate(id);
    res.status(204).send();
  });
  // --- STATS ---
  app.get(api.stats.get.path, async (_req, res) => {
    const allServers = await storage.getServers();
    const totalMembers = allServers.reduce((sum, s) => sum + (s.memberCount || 0), 0);
    res.json({
      totalServers: allServers.length,
      totalMembers,
      commandsExecuted: 42069,
      uptime: "99.9%",
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
      const updated = await storage.updateSettings(serverId, req.body);
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

  // --- SEED DATABASE ---
  await seedDatabase();
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
