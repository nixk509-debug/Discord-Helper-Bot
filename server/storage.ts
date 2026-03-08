import { db, pool } from "./db";
import {
  servers, serverSettings, customCommands, embeds,
  channelSettings, reactionRoles, autoRoles, warnings,
  punishmentConfig, levelingConfig, starboardConfig,
  ticketConfig, ticketPanels, scheduledMessages, auditLogConfig,
  users, templates, automations, serverVariables, economy, roleShop,
  economyTransactions, memberNotes, serverInsights, commandShares,
  commandImports, serverWebhooks, polls, giveaways, userPreferences,
  type Server, type ServerSettings, type CustomCommand, type Embed,
  type ChannelSetting, type ReactionRole, type AutoRole, type Warning,
  type PunishmentConfigType, type LevelingConfigType, type StarboardConfigType,
  type TicketConfigType, type TicketPanel, type ScheduledMessage, type AuditLogConfigType,
  type User, type Template, type Automation, type ServerVariable, type EconomyAccount,
  type RoleShopItem, type EconomyTransaction, type MemberNote, type ServerInsight,
  type CommandShare, type CommandImport, type ServerWebhook, type Poll, type Giveaway,
  type UserPreferences,
} from "@shared/schema";
import { type ServerWithRelations } from "@shared/routes";
import { eq, and, sql } from "drizzle-orm";

function isSchemaMismatchError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /column .* does not exist|relation .* does not exist/i.test(message);
}

function toBasicServerPayload(server: Server): ServerWithRelations {
  return {
    ...server,
    settings: null as any,
    customCommands: [],
    embeds: [],
  } as any;
}

function camelizeKey(key: string) {
  return key.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase());
}

function camelizeValue<T = any>(value: any): T {
  if (Array.isArray(value)) {
    return value.map((item) => camelizeValue(item)) as T;
  }
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [camelizeKey(key), camelizeValue(entryValue)]),
    ) as T;
  }
  return value as T;
}

function buildServerListPayload(row: any): ServerWithRelations {
  const customCommandCount = Number(row.customCommandCount ?? 0);
  const embedCount = Number(row.embedCount ?? 0);

  return {
    id: Number(row.id),
    discordId: row.discordId,
    name: row.name,
    iconUrl: row.iconUrl ?? null,
    memberCount: Number(row.memberCount ?? 0),
    joinedAt: row.joinedAt ?? null,
    ownerId: row.ownerId,
    settings: row.settings ? camelizeValue(row.settings) : null,
    customCommands: Array.from({ length: customCommandCount }, () => ({}) as any),
    embeds: Array.from({ length: embedCount }, () => ({}) as any),
    customCommandCount,
    embedCount,
  } as any;
}

export class DatabaseStorage {
  async getServers(): Promise<ServerWithRelations[]> {
    try {
      const result = await pool.query(`
        SELECT
          s.id,
          s.discord_id AS "discordId",
          s.name,
          s.icon_url AS "iconUrl",
          s.member_count AS "memberCount",
          s.joined_at AS "joinedAt",
          s.owner_id AS "ownerId",
          COALESCE(to_jsonb(ss), '{}'::jsonb) AS settings,
          COALESCE(cmd.command_count, 0) AS "customCommandCount",
          COALESCE(emb.embed_count, 0) AS "embedCount"
        FROM servers s
        LEFT JOIN server_settings ss ON ss.server_id = s.id
        LEFT JOIN (
          SELECT server_id, COUNT(*)::int AS command_count
          FROM custom_commands
          GROUP BY server_id
        ) cmd ON cmd.server_id = s.id
        LEFT JOIN (
          SELECT server_id, COUNT(*)::int AS embed_count
          FROM embeds
          GROUP BY server_id
        ) emb ON emb.server_id = s.id
        ORDER BY s.id ASC
      `);
      return result.rows.map(buildServerListPayload);
    } catch (error) {
      console.warn(
        `[Storage] Failed to load server list${isSchemaMismatchError(error) ? " (schema mismatch)" : ""}:`,
        error instanceof Error ? error.message : error,
      );
      try {
        const baseServers = await db.select().from(servers);
        return baseServers.map(toBasicServerPayload);
      } catch (fallbackError) {
        console.error("[Storage] Basic server fallback failed:", fallbackError instanceof Error ? fallbackError.message : fallbackError);
        throw fallbackError;
      }
    }
  }

  async getServer(id: number): Promise<ServerWithRelations | undefined> {
    try {
      const result = await pool.query(`
        SELECT
          s.id,
          s.discord_id AS "discordId",
          s.name,
          s.icon_url AS "iconUrl",
          s.member_count AS "memberCount",
          s.joined_at AS "joinedAt",
          s.owner_id AS "ownerId",
          COALESCE(to_jsonb(ss), '{}'::jsonb) AS settings
        FROM servers s
        LEFT JOIN server_settings ss ON ss.server_id = s.id
        WHERE s.id = $1
        LIMIT 1
      `, [id]);
      const row = result.rows[0];
      if (!row) return undefined;

      const [serverCommands, serverEmbeds] = await Promise.all([
        this.getCommands(id),
        this.getEmbeds(id),
      ]);

      return {
        id: Number(row.id),
        discordId: row.discordId,
        name: row.name,
        iconUrl: row.iconUrl ?? null,
        memberCount: Number(row.memberCount ?? 0),
        joinedAt: row.joinedAt ?? null,
        ownerId: row.ownerId,
        settings: row.settings ? camelizeValue(row.settings) : null,
        customCommands: serverCommands,
        embeds: serverEmbeds,
      } as any;
    } catch (error) {
      console.warn(
        `[Storage] Failed to load server payload for ${id}${isSchemaMismatchError(error) ? " (schema mismatch)" : ""}:`,
        error instanceof Error ? error.message : error,
      );
      try {
        const [baseServer] = await db.select().from(servers).where(eq(servers.id, id));
        return baseServer ? toBasicServerPayload(baseServer) : undefined;
      } catch (fallbackError) {
        console.error(
          `[Storage] Basic server fallback failed for ${id}:`,
          fallbackError instanceof Error ? fallbackError.message : fallbackError,
        );
        throw fallbackError;
      }
    }
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
  async updateTicketPanel(id: number, data: any): Promise<TicketPanel> {
    const [updated] = await db.update(ticketPanels).set(data as any).where(eq(ticketPanels.id, id)).returning();
    return updated;
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
  async getTemplateById(id: number): Promise<Template | undefined> {
    const [template] = await db.select().from(templates).where(eq(templates.id, id));
    return template;
  }
  async createTemplate(data: any): Promise<Template> {
    const [created] = await db.insert(templates).values(data).returning();
    return created;
  }
  async updateTemplate(id: number, data: any): Promise<Template> {
    const [updated] = await db.update(templates).set(data).where(eq(templates.id, id)).returning();
    return updated;
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

  // --- AUTOMATIONS ---
  async getAutomations(serverId: number): Promise<Automation[]> {
    return await db.select().from(automations).where(eq(automations.serverId, serverId));
  }
  async getAutomation(id: number): Promise<Automation | undefined> {
    const [result] = await db.select().from(automations).where(eq(automations.id, id));
    return result;
  }
  async createAutomation(serverId: number, data: any): Promise<Automation> {
    const [created] = await db.insert(automations).values({ ...data, serverId }).returning();
    return created;
  }
  async updateAutomation(id: number, data: any): Promise<Automation> {
    const [updated] = await db.update(automations).set({ ...data, updatedAt: new Date() }).where(eq(automations.id, id)).returning();
    return updated;
  }
  async deleteAutomation(id: number): Promise<void> {
    await db.delete(automations).where(eq(automations.id, id));
  }
  async toggleAutomation(id: number, isEnabled: boolean): Promise<Automation> {
    const [updated] = await db.update(automations).set({ isEnabled, updatedAt: new Date() }).where(eq(automations.id, id)).returning();
    return updated;
  }

  // --- SERVER VARIABLES ---
  async getVariables(serverId: number): Promise<ServerVariable[]> {
    return await db.select().from(serverVariables).where(eq(serverVariables.serverId, serverId));
  }
  async setVariable(serverId: number, scope: string, userId: string | null, key: string, value: string): Promise<ServerVariable> {
    const existing = await db.select().from(serverVariables).where(
      and(eq(serverVariables.serverId, serverId), eq(serverVariables.scope, scope), eq(serverVariables.key, key),
        userId ? eq(serverVariables.userId, userId) : sql`user_id IS NULL`)
    );
    if (existing.length > 0) {
      const [updated] = await db.update(serverVariables).set({ value, updatedAt: new Date() })
        .where(eq(serverVariables.id, existing[0].id)).returning();
      return updated;
    }
    const [created] = await db.insert(serverVariables).values({ serverId, scope, userId: userId || null, key, value } as any).returning();
    return created;
  }
  async deleteVariable(id: number): Promise<void> {
    await db.delete(serverVariables).where(eq(serverVariables.id, id));
  }

  // --- ECONOMY ---
  async getEconomyAccount(serverId: number, userId: string): Promise<EconomyAccount | undefined> {
    const [result] = await db.select().from(economy).where(and(eq(economy.serverId, serverId), eq(economy.userId, userId)));
    return result;
  }
  async getOrCreateEconomyAccount(serverId: number, userId: string, username?: string): Promise<EconomyAccount> {
    const existing = await this.getEconomyAccount(serverId, userId);
    if (existing) return existing;
    const settings = await db.select().from(serverSettings).where(eq(serverSettings.serverId, serverId));
    const startingBalance = settings[0]?.economyStartingBalance ?? 100;
    const [created] = await db.insert(economy).values({ serverId, userId, username: username || userId, balance: startingBalance } as any).returning();
    return created;
  }
  async updateEconomyBalance(serverId: number, userId: string, amount: number, type: string, description?: string): Promise<EconomyAccount> {
    const account = await this.getOrCreateEconomyAccount(serverId, userId);
    const newBalance = Math.max(0, account.balance! + amount);
    const [updated] = await db.update(economy).set({
      balance: newBalance,
      totalEarned: amount > 0 ? (account.totalEarned || 0) + amount : account.totalEarned,
      totalSpent: amount < 0 ? (account.totalSpent || 0) + Math.abs(amount) : account.totalSpent,
    } as any).where(eq(economy.id, account.id)).returning();
    await db.insert(economyTransactions).values({
      serverId, userId, type, amount, balanceBefore: account.balance || 0, balanceAfter: newBalance, description: description || type
    } as any);
    return updated;
  }
  async getEconomyLeaderboard(serverId: number, limit = 10): Promise<EconomyAccount[]> {
    return await db.select().from(economy).where(eq(economy.serverId, serverId))
      .orderBy(sql`balance DESC`).limit(limit);
  }
  async getEconomyTransactions(serverId: number, userId: string, limit = 20): Promise<EconomyTransaction[]> {
    return await db.select().from(economyTransactions)
      .where(and(eq(economyTransactions.serverId, serverId), eq(economyTransactions.userId, userId)))
      .orderBy(sql`created_at DESC`).limit(limit);
  }

  // --- ROLE SHOP ---
  async getRoleShop(serverId: number): Promise<RoleShopItem[]> {
    return await db.select().from(roleShop).where(eq(roleShop.serverId, serverId));
  }
  async createRoleShopItem(serverId: number, data: any): Promise<RoleShopItem> {
    const [created] = await db.insert(roleShop).values({ ...data, serverId }).returning();
    return created;
  }
  async updateRoleShopItem(id: number, data: any): Promise<RoleShopItem> {
    const [updated] = await db.update(roleShop).set(data).where(eq(roleShop.id, id)).returning();
    return updated;
  }
  async deleteRoleShopItem(id: number): Promise<void> {
    await db.delete(roleShop).where(eq(roleShop.id, id));
  }

  // --- MEMBERS ---
  async getMembers(serverId: number, page = 1, limit = 50, search?: string): Promise<{ members: any[]; total: number }> {
    const allWarnings = await db.select().from(warnings).where(eq(warnings.serverId, serverId));
    const allNotes = await db.select().from(memberNotes).where(eq(memberNotes.serverId, serverId));
    const allEconomy = await db.select().from(economy).where(eq(economy.serverId, serverId));
    const warningsByUser: Record<string, number> = {};
    for (const w of allWarnings) { if (w.active) warningsByUser[w.userId] = (warningsByUser[w.userId] || 0) + 1; }
    const notesByUser: Record<string, number> = {};
    for (const n of allNotes) { notesByUser[n.targetUserId] = (notesByUser[n.targetUserId] || 0) + 1; }
    const economyByUser: Record<string, number> = {};
    for (const e of allEconomy) { economyByUser[e.userId] = e.balance ?? 0; }
    const allUserIds = Array.from(new Set([
      ...allWarnings.map(w => w.userId),
      ...allNotes.map(n => n.targetUserId),
      ...allEconomy.map(e => e.userId),
    ]));
    const membersData = allUserIds.map(userId => {
      const warningEntry = allWarnings.find(w => w.userId === userId);
      return {
        userId,
        username: warningEntry?.userName || allNotes.find(n => n.targetUserId === userId)?.targetUsername || userId,
        warningCount: warningsByUser[userId] || 0,
        noteCount: notesByUser[userId] || 0,
        economyBalance: economyByUser[userId] ?? null,
      };
    });
    const filtered = search
      ? membersData.filter(m => m.username.toLowerCase().includes(search.toLowerCase()) || m.userId.includes(search))
      : membersData;
    const total = filtered.length;
    const offset = (page - 1) * limit;
    return { members: filtered.slice(offset, offset + limit), total };
  }

  async getMemberProfile(serverId: number, userId: string): Promise<any> {
    const userWarnings = await db.select().from(warnings)
      .where(and(eq(warnings.serverId, serverId), eq(warnings.userId, userId)))
      .orderBy(sql`created_at DESC`);
    const userNotes = await db.select().from(memberNotes)
      .where(and(eq(memberNotes.serverId, serverId), eq(memberNotes.targetUserId, userId)))
      .orderBy(sql`created_at DESC`);
    const [economyAccount] = await db.select().from(economy)
      .where(and(eq(economy.serverId, serverId), eq(economy.userId, userId)));
    const userTransactions = await db.select().from(economyTransactions)
      .where(and(eq(economyTransactions.serverId, serverId), eq(economyTransactions.userId, userId)))
      .orderBy(sql`created_at DESC`).limit(20);
    return {
      userId,
      username: userWarnings[0]?.userName || userNotes[0]?.targetUsername || userId,
      warnings: userWarnings,
      notes: userNotes,
      economy: economyAccount || null,
      transactions: userTransactions,
    };
  }

  // --- MEMBER NOTES ---
  async getMemberNotes(serverId: number, targetUserId: string): Promise<MemberNote[]> {
    return await db.select().from(memberNotes)
      .where(and(eq(memberNotes.serverId, serverId), eq(memberNotes.targetUserId, targetUserId)))
      .orderBy(sql`created_at DESC`);
  }
  async createMemberNote(serverId: number, data: any): Promise<MemberNote> {
    const [created] = await db.insert(memberNotes).values({ ...data, serverId }).returning();
    return created;
  }
  async deleteMemberNote(id: number): Promise<void> {
    await db.delete(memberNotes).where(eq(memberNotes.id, id));
  }

  // --- SERVER INSIGHTS ---
  async getServerInsights(serverId: number, days = 30): Promise<ServerInsight[]> {
    return await db.select().from(serverInsights)
      .where(eq(serverInsights.serverId, serverId))
      .orderBy(sql`date DESC`).limit(days);
  }
  async upsertServerInsight(serverId: number, date: string, data: any): Promise<ServerInsight> {
    const existing = await db.select().from(serverInsights).where(
      and(eq(serverInsights.serverId, serverId), eq(serverInsights.date, date))
    );
    if (existing.length > 0) {
      const [updated] = await db.update(serverInsights).set(data).where(eq(serverInsights.id, existing[0].id)).returning();
      return updated;
    }
    const [created] = await db.insert(serverInsights).values({ ...data, serverId, date }).returning();
    return created;
  }

  // --- COMMAND SHARES ---
  async createCommandShare(serverId: number, authorId: string, commandId: number, data: any): Promise<CommandShare> {
    const shareCode = Array.from({ length: 8 }, () => Math.random().toString(36)[2]).join('').toUpperCase();
    const [created] = await db.insert(commandShares).values({ ...data, serverId, authorId, commandId, shareCode } as any).returning();
    return created;
  }
  async getCommandShare(shareCode: string): Promise<CommandShare | undefined> {
    const [result] = await db.select().from(commandShares).where(eq(commandShares.shareCode, shareCode));
    return result;
  }
  async listMarketplace(filters: { category?: string; search?: string; limit?: number; offset?: number }): Promise<CommandShare[]> {
    let query = db.select().from(commandShares).where(eq(commandShares.isPublic, true));
    return await query.orderBy(sql`import_count DESC`).limit(filters.limit || 20).offset(filters.offset || 0);
  }
  async incrementShareView(shareCode: string): Promise<void> {
    await db.update(commandShares).set({ viewCount: sql`view_count + 1` } as any).where(eq(commandShares.shareCode, shareCode));
  }
  async incrementShareImport(shareCode: string): Promise<void> {
    await db.update(commandShares).set({ importCount: sql`import_count + 1` } as any).where(eq(commandShares.shareCode, shareCode));
  }
  async importCommand(serverId: number, shareCode: string): Promise<CustomCommand> {
    const share = await this.getCommandShare(shareCode);
    if (!share) throw new Error("Share not found");
    const [sourceCmd] = await db.select().from(customCommands).where(eq(customCommands.id, share.commandId));
    if (!sourceCmd) throw new Error("Source command not found");
    const { id, serverId: _sid, createdAt: _ca, usageCount: _uc, lastUsedAt: _lua, ...cmdData } = sourceCmd;
    const [imported] = await db.insert(customCommands).values({ ...cmdData, serverId, usageCount: 0 } as any).returning();
    await db.insert(commandImports).values({ serverId, sourceShareCode: shareCode, importedCommandId: imported.id } as any);
    await this.incrementShareImport(shareCode);
    return imported;
  }
  async deleteCommandShare(id: number): Promise<void> {
    await db.delete(commandShares).where(eq(commandShares.id, id));
  }
  async getServerShares(serverId: number): Promise<CommandShare[]> {
    return await db.select().from(commandShares).where(eq(commandShares.serverId, serverId));
  }
  async getCommandImports(serverId: number): Promise<CommandImport[]> {
    return await db.select().from(commandImports).where(eq(commandImports.serverId, serverId));
  }

  // --- SERVER WEBHOOKS ---
  async getWebhooks(serverId: number): Promise<ServerWebhook[]> {
    return await db.select().from(serverWebhooks).where(eq(serverWebhooks.serverId, serverId));
  }
  async createWebhook(serverId: number, data: any): Promise<ServerWebhook> {
    const [created] = await db.insert(serverWebhooks).values({ ...data, serverId }).returning();
    return created;
  }
  async updateWebhook(id: number, data: any): Promise<ServerWebhook> {
    const [updated] = await db.update(serverWebhooks).set(data).where(eq(serverWebhooks.id, id)).returning();
    return updated;
  }
  async deleteWebhook(id: number): Promise<void> {
    await db.delete(serverWebhooks).where(eq(serverWebhooks.id, id));
  }

  // --- POLLS ---
  async getPolls(serverId: number): Promise<Poll[]> {
    return await db.select().from(polls).where(eq(polls.serverId, serverId)).orderBy(sql`created_at DESC`);
  }
  async createPoll(serverId: number, data: any): Promise<Poll> {
    const [created] = await db.insert(polls).values({ ...data, serverId }).returning();
    return created;
  }
  async updatePoll(id: number, data: any): Promise<Poll> {
    const [updated] = await db.update(polls).set(data).where(eq(polls.id, id)).returning();
    return updated;
  }
  async deletePoll(id: number): Promise<void> {
    await db.delete(polls).where(eq(polls.id, id));
  }

  // --- GIVEAWAYS ---
  async getGiveaways(serverId: number): Promise<Giveaway[]> {
    return await db.select().from(giveaways).where(eq(giveaways.serverId, serverId)).orderBy(sql`created_at DESC`);
  }
  async createGiveaway(serverId: number, data: any): Promise<Giveaway> {
    const [created] = await db.insert(giveaways).values({ ...data, serverId }).returning();
    return created;
  }
  async updateGiveaway(id: number, data: any): Promise<Giveaway> {
    const [updated] = await db.update(giveaways).set(data).where(eq(giveaways.id, id)).returning();
    return updated;
  }
  async deleteGiveaway(id: number): Promise<void> {
    await db.delete(giveaways).where(eq(giveaways.id, id));
  }

  // --- USER PREFERENCES ---
  async getUserPreferences(userId: number): Promise<UserPreferences | null> {
    const [prefs] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));
    return prefs || null;
  }
  async upsertUserPreferences(userId: number, data: Partial<Omit<UserPreferences, 'id' | 'userId'>>): Promise<UserPreferences> {
    const existing = await this.getUserPreferences(userId);
    if (existing) {
      const [updated] = await db.update(userPreferences)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(userPreferences.userId, userId))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(userPreferences)
        .values({ userId, ...data })
        .returning();
      return created;
    }
  }
}

export const storage = new DatabaseStorage();

