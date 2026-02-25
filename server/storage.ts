import { db } from "./db";
import {
  servers, serverSettings, customCommands, embeds,
  channelSettings, reactionRoles, autoRoles, warnings,
  punishmentConfig, levelingConfig, starboardConfig,
  ticketConfig, ticketPanels, scheduledMessages, auditLogConfig,
  users, templates,
  type Server, type ServerSettings, type CustomCommand, type Embed,
  type ChannelSetting, type ReactionRole, type AutoRole, type Warning,
  type PunishmentConfigType, type LevelingConfigType, type StarboardConfigType,
  type TicketConfigType, type TicketPanel, type ScheduledMessage, type AuditLogConfigType,
  type User, type Template,
} from "@shared/schema";
import { type ServerWithRelations } from "@shared/routes";
import { eq, and, sql } from "drizzle-orm";

export class DatabaseStorage {
  async getServers(): Promise<ServerWithRelations[]> {
    return await db.query.servers.findMany({
      with: { settings: true, customCommands: true, embeds: true },
    }) as any;
  }

  async getServer(id: number): Promise<ServerWithRelations | undefined> {
    return await db.query.servers.findFirst({
      where: eq(servers.id, id),
      with: {
        settings: true, customCommands: true, embeds: true,
        channelSettings: true, reactionRoles: true, autoRoles: true,
        warnings: true, punishmentConfig: true, levelingConfig: true,
        starboardConfig: true, ticketConfig: true, ticketPanels: true,
        scheduledMessages: true, auditLogConfig: true,
      },
    }) as any;
  }

  // --- SETTINGS ---
  async updateSettings(serverId: number, settings: any): Promise<ServerSettings> {
    const [updated] = await db.update(serverSettings)
      .set({ ...settings, updatedAt: new Date() } as any)
      .where(eq(serverSettings.serverId, serverId)).returning();
    return updated;
  }

  // --- COMMANDS ---
  async getCommands(serverId: number): Promise<CustomCommand[]> {
    return await db.select().from(customCommands).where(eq(customCommands.serverId, serverId));
  }
  async createCommand(serverId: number, cmd: any): Promise<CustomCommand> {
    const [created] = await db.insert(customCommands).values({ ...cmd, serverId } as any).returning();
    return created;
  }
  async updateCommand(id: number, cmd: any): Promise<CustomCommand> {
    const [updated] = await db.update(customCommands).set(cmd as any).where(eq(customCommands.id, id)).returning();
    return updated;
  }
  async deleteCommand(id: number): Promise<void> {
    await db.delete(customCommands).where(eq(customCommands.id, id));
  }

  // --- EMBEDS ---
  async getEmbeds(serverId: number): Promise<Embed[]> {
    return await db.select().from(embeds).where(eq(embeds.serverId, serverId));
  }
  async createEmbed(serverId: number, embed: any): Promise<Embed> {
    const [created] = await db.insert(embeds).values({ ...embed, serverId } as any).returning();
    return created;
  }
  async updateEmbed(id: number, embed: any): Promise<Embed> {
    const [updated] = await db.update(embeds).set(embed as any).where(eq(embeds.id, id)).returning();
    return updated;
  }
  async deleteEmbed(id: number): Promise<void> {
    await db.delete(embeds).where(eq(embeds.id, id));
  }

  // --- CHANNEL SETTINGS ---
  async getChannelSettings(serverId: number): Promise<ChannelSetting[]> {
    return await db.select().from(channelSettings).where(eq(channelSettings.serverId, serverId));
  }
  async upsertChannelSettings(serverId: number, data: any): Promise<ChannelSetting> {
    const existing = await db.select().from(channelSettings)
      .where(and(eq(channelSettings.serverId, serverId), eq(channelSettings.channelId, data.channelId)));
    if (existing.length > 0) {
      const [updated] = await db.update(channelSettings).set(data as any)
        .where(eq(channelSettings.id, existing[0].id)).returning();
      return updated;
    }
    const [created] = await db.insert(channelSettings).values({ ...data, serverId } as any).returning();
    return created;
  }
  async deleteChannelSettings(id: number): Promise<void> {
    await db.delete(channelSettings).where(eq(channelSettings.id, id));
  }

  // --- REACTION ROLES ---
  async getReactionRoles(serverId: number): Promise<ReactionRole[]> {
    return await db.select().from(reactionRoles).where(eq(reactionRoles.serverId, serverId));
  }
  async createReactionRole(serverId: number, data: any): Promise<ReactionRole> {
    const [created] = await db.insert(reactionRoles).values({ ...data, serverId } as any).returning();
    return created;
  }
  async deleteReactionRole(id: number): Promise<void> {
    await db.delete(reactionRoles).where(eq(reactionRoles.id, id));
  }

  // --- AUTO ROLES ---
  async getAutoRoles(serverId: number): Promise<AutoRole[]> {
    return await db.select().from(autoRoles).where(eq(autoRoles.serverId, serverId));
  }
  async createAutoRole(serverId: number, data: any): Promise<AutoRole> {
    const [created] = await db.insert(autoRoles).values({ ...data, serverId } as any).returning();
    return created;
  }
  async deleteAutoRole(id: number): Promise<void> {
    await db.delete(autoRoles).where(eq(autoRoles.id, id));
  }

  // --- WARNINGS ---
  async getWarnings(serverId: number): Promise<Warning[]> {
    return await db.select().from(warnings).where(eq(warnings.serverId, serverId));
  }
  async createWarning(serverId: number, data: any): Promise<Warning> {
    const [created] = await db.insert(warnings).values({ ...data, serverId } as any).returning();
    return created;
  }
  async deleteWarning(id: number): Promise<void> {
    await db.delete(warnings).where(eq(warnings.id, id));
  }
  async clearWarnings(serverId: number, userId: string): Promise<void> {
    await db.delete(warnings).where(and(eq(warnings.serverId, serverId), eq(warnings.userId, userId)));
  }

  // --- PUNISHMENT CONFIG ---
  async getPunishmentConfig(serverId: number): Promise<PunishmentConfigType[]> {
    return await db.select().from(punishmentConfig).where(eq(punishmentConfig.serverId, serverId));
  }
  async upsertPunishmentConfig(serverId: number, data: any): Promise<PunishmentConfigType> {
    const existing = await db.select().from(punishmentConfig)
      .where(and(eq(punishmentConfig.serverId, serverId), eq(punishmentConfig.warningThreshold, data.warningThreshold)));
    if (existing.length > 0) {
      const [updated] = await db.update(punishmentConfig).set(data as any)
        .where(eq(punishmentConfig.id, existing[0].id)).returning();
      return updated;
    }
    const [created] = await db.insert(punishmentConfig).values({ ...data, serverId } as any).returning();
    return created;
  }
  async deletePunishmentConfig(id: number): Promise<void> {
    await db.delete(punishmentConfig).where(eq(punishmentConfig.id, id));
  }

  // --- LEVELING ---
  async getLevelingConfig(serverId: number): Promise<LevelingConfigType | undefined> {
    const results = await db.select().from(levelingConfig).where(eq(levelingConfig.serverId, serverId));
    return results[0];
  }
  async upsertLevelingConfig(serverId: number, data: any): Promise<LevelingConfigType> {
    const existing = await db.select().from(levelingConfig).where(eq(levelingConfig.serverId, serverId));
    if (existing.length > 0) {
      const [updated] = await db.update(levelingConfig).set(data as any)
        .where(eq(levelingConfig.serverId, serverId)).returning();
      return updated;
    }
    const [created] = await db.insert(levelingConfig).values({ ...data, serverId } as any).returning();
    return created;
  }

  // --- STARBOARD ---
  async getStarboardConfig(serverId: number): Promise<StarboardConfigType | undefined> {
    const results = await db.select().from(starboardConfig).where(eq(starboardConfig.serverId, serverId));
    return results[0];
  }
  async upsertStarboardConfig(serverId: number, data: any): Promise<StarboardConfigType> {
    const existing = await db.select().from(starboardConfig).where(eq(starboardConfig.serverId, serverId));
    if (existing.length > 0) {
      const [updated] = await db.update(starboardConfig).set(data as any)
        .where(eq(starboardConfig.serverId, serverId)).returning();
      return updated;
    }
    const [created] = await db.insert(starboardConfig).values({ ...data, serverId } as any).returning();
    return created;
  }

  // --- TICKETS ---
  async getTicketConfig(serverId: number): Promise<TicketConfigType | undefined> {
    const results = await db.select().from(ticketConfig).where(eq(ticketConfig.serverId, serverId));
    return results[0];
  }
  async upsertTicketConfig(serverId: number, data: any): Promise<TicketConfigType> {
    const existing = await db.select().from(ticketConfig).where(eq(ticketConfig.serverId, serverId));
    if (existing.length > 0) {
      const [updated] = await db.update(ticketConfig).set(data as any)
        .where(eq(ticketConfig.serverId, serverId)).returning();
      return updated;
    }
    const [created] = await db.insert(ticketConfig).values({ ...data, serverId } as any).returning();
    return created;
  }
  async getTicketPanels(serverId: number): Promise<TicketPanel[]> {
    return await db.select().from(ticketPanels).where(eq(ticketPanels.serverId, serverId));
  }
  async createTicketPanel(serverId: number, data: any): Promise<TicketPanel> {
    const [created] = await db.insert(ticketPanels).values({ ...data, serverId } as any).returning();
    return created;
  }
  async deleteTicketPanel(id: number): Promise<void> {
    await db.delete(ticketPanels).where(eq(ticketPanels.id, id));
  }

  // --- SCHEDULED MESSAGES ---
  async getScheduledMessages(serverId: number): Promise<ScheduledMessage[]> {
    return await db.select().from(scheduledMessages).where(eq(scheduledMessages.serverId, serverId));
  }
  async createScheduledMessage(serverId: number, data: any): Promise<ScheduledMessage> {
    const [created] = await db.insert(scheduledMessages).values({ ...data, serverId } as any).returning();
    return created;
  }
  async updateScheduledMessage(id: number, data: any): Promise<ScheduledMessage> {
    const [updated] = await db.update(scheduledMessages).set(data as any)
      .where(eq(scheduledMessages.id, id)).returning();
    return updated;
  }
  async deleteScheduledMessage(id: number): Promise<void> {
    await db.delete(scheduledMessages).where(eq(scheduledMessages.id, id));
  }

  // --- AUDIT LOG ---
  async getAuditLogConfig(serverId: number): Promise<AuditLogConfigType | undefined> {
    const results = await db.select().from(auditLogConfig).where(eq(auditLogConfig.serverId, serverId));
    return results[0];
  }
  async upsertAuditLogConfig(serverId: number, data: any): Promise<AuditLogConfigType> {
    const existing = await db.select().from(auditLogConfig).where(eq(auditLogConfig.serverId, serverId));
    if (existing.length > 0) {
      const [updated] = await db.update(auditLogConfig).set(data as any)
        .where(eq(auditLogConfig.serverId, serverId)).returning();
      return updated;
    }
    const [created] = await db.insert(auditLogConfig).values({ ...data, serverId } as any).returning();
    return created;
  }

  // --- USERS ---
  async getUserByDiscordId(discordId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.discordId, discordId));
    return user;
  }
  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async updateUser(id: number, data: Partial<User>): Promise<User> {
    const [updated] = await db.update(users).set(data as any).where(eq(users.id, id)).returning();
    return updated;
  }

  // --- TEMPLATES ---
  async getTemplates(userId: number, serverId?: number): Promise<Template[]> {
    if (serverId) {
      return await db.select().from(templates).where(and(eq(templates.userId, userId), eq(templates.serverId, serverId)));
    }
    return await db.select().from(templates).where(eq(templates.userId, userId));
  }
  async createTemplate(data: any): Promise<Template> {
    const [created] = await db.insert(templates).values(data).returning();
    return created;
  }
  async deleteTemplate(id: number): Promise<void> {
    await db.delete(templates).where(eq(templates.id, id));
  }
  async getTemplateCount(userId: number): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(templates).where(eq(templates.userId, userId));
    return Number(result[0]?.count || 0);
  }

  // --- PREMIUM HELPERS ---
  async getServerByDiscordId(discordId: string): Promise<Server | undefined> {
    const [server] = await db.select().from(servers).where(eq(servers.discordId, discordId));
    return server;
  }
  async getPremiumUserCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.isPremium, true));
    return Number(result[0]?.count || 0);
  }

  // --- SEED HELPERS ---
  async _createBaseServer(server: Omit<Server, "id" | "joinedAt">): Promise<Server> {
    const [created] = await db.insert(servers).values(server).returning();
    return created;
  }
  async _createBaseSettings(settings: Omit<ServerSettings, "id" | "updatedAt">): Promise<ServerSettings> {
    const [created] = await db.insert(serverSettings).values(settings as any).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
