import { db } from "./db";
import { getServerByDiscordIdRecord, getServerRecord, listServerRecords } from "./repositories/server-repository";
import {
  claimCustomCommandV2SessionRecord,
  consumeCustomCommandV2SessionRecord,
  createCustomCommandRecord,
  createCustomCommandV2Record,
  createCustomCommandV2SessionRecord,
  deleteCustomCommandRecord,
  deleteCustomCommandV2Record,
  getCustomCommandRecord,
  getCustomCommandV2Record,
  listCustomCommandRecords,
  listCustomCommandV2Records,
  listPendingCustomCommandV2SessionRecords,
  touchCustomCommandUsageRecord,
  touchCustomCommandV2UsageRecord,
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
import {
  servers, serverSettings, customCommands, siteContentSurfaces,
  auditLogConfig,
  users, templates, automations, serverVariables, economy, roleShop,
  economyTransactions, memberNotes, serverInsights, commandShares,
  commandImports, serverWebhooks, polls, giveaways, userPreferences,
  type Server, type ServerSettings, type CustomCommand, type CustomCommandV2Record, type CustomCommandV2SessionRecord, type SiteContentSurfaceRecord, type Embed,
  type ChannelSetting, type ReactionRole, type AutoRole, type Warning,
  type PunishmentConfigType, type LevelingConfigType, type StarboardConfigType,
  type TicketConfigType, type TicketPanel, type ScheduledMessage, type AuditLogConfigType,
  type User, type Template, type Automation, type ServerVariable, type EconomyAccount,
  type RoleShopItem, type EconomyTransaction, type MemberNote, type ServerInsight,
  type CommandShare, type CommandImport, type ServerWebhook, type Poll, type Giveaway,
  type UserPreferences,
} from "@shared/schema";
import {
  SITE_EDITOR_SURFACE_LABELS,
  areSiteEditorDocumentsEqual,
  buildDefaultSiteEditorDocument,
  normalizeSiteEditorDocument,
  type SiteEditorSurfaceKey,
  type SiteEditorSurfaceState,
} from "@shared/site-editor";
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
  private mapSiteContentSurface(record: SiteContentSurfaceRecord): SiteEditorSurfaceState {
    const draftContent = normalizeSiteEditorDocument(record.surfaceKey, record.draftContent);
    const publishedContent = normalizeSiteEditorDocument(record.surfaceKey, record.publishedContent);

    return {
      surfaceKey: record.surfaceKey,
      label: SITE_EDITOR_SURFACE_LABELS[record.surfaceKey],
      schemaVersion: record.schemaVersion ?? 1,
      draftContent,
      publishedContent,
      hasUnpublishedChanges: !areSiteEditorDocumentsEqual(draftContent, publishedContent),
      updatedAt: record.updatedAt?.toISOString?.() ?? null,
      publishedAt: record.publishedAt?.toISOString?.() ?? null,
      updatedByUserId: record.updatedByUserId ?? null,
      publishedByUserId: record.publishedByUserId ?? null,
      updatedByLabel: record.updatedByLabel ?? null,
      publishedByLabel: record.publishedByLabel ?? null,
    };
  }

  private async ensureSiteContentSurface(surfaceKey: SiteEditorSurfaceKey): Promise<SiteContentSurfaceRecord> {
    const [existing] = await db.select().from(siteContentSurfaces).where(eq(siteContentSurfaces.surfaceKey, surfaceKey));
    if (existing) return existing;

    const defaults = buildDefaultSiteEditorDocument(surfaceKey);
    const [created] = await db
      .insert(siteContentSurfaces)
      .values({
        surfaceKey,
        schemaVersion: defaults.schemaVersion,
        draftContent: defaults,
        publishedContent: defaults,
        updatedAt: new Date(),
        publishedAt: new Date(),
      } as any)
      .returning();

    return created;
  }

  async listSiteContentSurfaces(): Promise<SiteEditorSurfaceState[]> {
    const surfaceKeys = Object.keys(SITE_EDITOR_SURFACE_LABELS) as SiteEditorSurfaceKey[];
    const records = await Promise.all(surfaceKeys.map((surfaceKey) => this.ensureSiteContentSurface(surfaceKey)));
    return records.map((record) => this.mapSiteContentSurface(record));
  }

  async getSiteContentSurface(surfaceKey: SiteEditorSurfaceKey): Promise<SiteEditorSurfaceState> {
    const record = await this.ensureSiteContentSurface(surfaceKey);
    return this.mapSiteContentSurface(record);
  }

  async saveSiteContentDraft(
    surfaceKey: SiteEditorSurfaceKey,
    draftContent: unknown,
    actor?: { userId?: number | null; label?: string | null },
  ): Promise<SiteEditorSurfaceState> {
    const record = await this.ensureSiteContentSurface(surfaceKey);
    const normalizedDraft = normalizeSiteEditorDocument(surfaceKey, draftContent);

    const [updated] = await db
      .update(siteContentSurfaces)
      .set({
        schemaVersion: normalizedDraft.schemaVersion,
        draftContent: normalizedDraft,
        updatedByUserId: actor?.userId ?? null,
        updatedByLabel: actor?.label ?? null,
        updatedAt: new Date(),
      } as any)
      .where(eq(siteContentSurfaces.id, record.id))
      .returning();

    return this.mapSiteContentSurface(updated);
  }

  async publishSiteContentSurface(
    surfaceKey: SiteEditorSurfaceKey,
    actor?: { userId?: number | null; label?: string | null },
  ): Promise<SiteEditorSurfaceState> {
    const record = await this.ensureSiteContentSurface(surfaceKey);
    const normalizedDraft = normalizeSiteEditorDocument(surfaceKey, record.draftContent);

    const [updated] = await db
      .update(siteContentSurfaces)
      .set({
        schemaVersion: normalizedDraft.schemaVersion,
        draftContent: normalizedDraft,
        publishedContent: normalizedDraft,
        updatedByUserId: actor?.userId ?? null,
        publishedByUserId: actor?.userId ?? null,
        updatedByLabel: actor?.label ?? null,
        publishedByLabel: actor?.label ?? null,
        updatedAt: new Date(),
        publishedAt: new Date(),
      } as any)
      .where(eq(siteContentSurfaces.id, record.id))
      .returning();

    return this.mapSiteContentSurface(updated);
  }

  async resetSiteContentDraft(
    surfaceKey: SiteEditorSurfaceKey,
    actor?: { userId?: number | null; label?: string | null },
  ): Promise<SiteEditorSurfaceState> {
    const record = await this.ensureSiteContentSurface(surfaceKey);
    const normalizedPublished = normalizeSiteEditorDocument(surfaceKey, record.publishedContent);

    const [updated] = await db
      .update(siteContentSurfaces)
      .set({
        draftContent: normalizedPublished,
        updatedByUserId: actor?.userId ?? null,
        updatedByLabel: actor?.label ?? null,
        updatedAt: new Date(),
      } as any)
      .where(eq(siteContentSurfaces.id, record.id))
      .returning();

    return this.mapSiteContentSurface(updated);
  }

  async getServers(): Promise<ServerWithRelations[]> {
    return listServerRecords();
  }

  async getServer(id: number): Promise<ServerWithRelations | undefined> {
    const server = await getServerRecord(id);
    if (!server) return undefined;

    const [serverCommands, serverEmbeds] = await Promise.all([
      this.getCommands(id),
      this.getEmbeds(id),
    ]);

    return {
      ...server,
      customCommands: serverCommands,
      embeds: serverEmbeds,
    } as any;
  }
  // --- SETTINGS ---
  async updateSettings(serverId: number, settings: any): Promise<ServerSettings> {
    const [updated] = await db.update(serverSettings)
      .set({ ...settings, updatedAt: new Date() } as any)
      .where(eq(serverSettings.serverId, serverId)).returning();
    return updated;
  }
  async setServerPremiumState(serverId: number, premiumState: Partial<ServerSettings>): Promise<ServerSettings> {
    const [existing] = await db
      .select()
      .from(serverSettings)
      .where(eq(serverSettings.serverId, serverId));

    const patch = {
      ...premiumState,
      updatedAt: new Date(),
    } as any;

    if (existing) {
      const [updated] = await db
        .update(serverSettings)
        .set(patch)
        .where(eq(serverSettings.serverId, serverId))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(serverSettings)
      .values({
        serverId,
        ...patch,
      } as any)
      .returning();
    return created;
  }

  // --- COMMANDS ---
  async getCommands(serverId: number): Promise<CustomCommand[]> {
    return listCustomCommandRecords(serverId);
  }
  async getCommandById(id: number): Promise<CustomCommand | undefined> {
    return getCustomCommandRecord(id);
  }
  async createCommand(serverId: number, cmd: any): Promise<CustomCommand> {
    return createCustomCommandRecord(serverId, cmd);
  }
  async updateCommand(id: number, cmd: any): Promise<CustomCommand> {
    return updateCustomCommandRecord(id, cmd);
  }
  async deleteCommand(id: number): Promise<void> {
    await deleteCustomCommandRecord(id);
  }
  async touchCommandUsage(id: number): Promise<void> {
    await touchCustomCommandUsageRecord(id);
  }

  async getCommandsV2(serverId: number): Promise<CustomCommandV2Record[]> {
    return listCustomCommandV2Records(serverId);
  }
  async getCommandV2ById(id: number): Promise<CustomCommandV2Record | undefined> {
    return getCustomCommandV2Record(id);
  }
  async createCommandV2(serverId: number, cmd: any): Promise<CustomCommandV2Record> {
    return createCustomCommandV2Record(serverId, cmd);
  }
  async updateCommandV2(id: number, cmd: any): Promise<CustomCommandV2Record> {
    return updateCustomCommandV2Record(id, cmd);
  }
  async touchCommandV2Usage(id: number, input?: { lastRunAt?: Date }): Promise<void> {
    await touchCustomCommandV2UsageRecord(id, input);
  }
  async deleteCommandV2(id: number): Promise<void> {
    await deleteCustomCommandV2Record(id);
  }
  async getPendingCommandV2Sessions(
    serverId: number,
    continuationType?: "button" | "select" | "modal_submit",
  ): Promise<CustomCommandV2SessionRecord[]> {
    return listPendingCustomCommandV2SessionRecords(serverId, continuationType);
  }
  async createCommandV2Session(serverId: number, session: any): Promise<CustomCommandV2SessionRecord> {
    return createCustomCommandV2SessionRecord(serverId, session);
  }
  async claimCommandV2Session(id: number): Promise<CustomCommandV2SessionRecord | null> {
    return claimCustomCommandV2SessionRecord(id);
  }
  async consumeCommandV2Session(id: number): Promise<void> {
    await consumeCustomCommandV2SessionRecord(id);
  }

  // --- EMBEDS ---
  async getEmbeds(serverId: number): Promise<Embed[]> {
    return listEmbedRecords(serverId);
  }
  async createEmbed(serverId: number, embed: any): Promise<Embed> {
    return createEmbedRecord(serverId, embed);
  }
  async getEmbedById(id: number): Promise<Embed | undefined> {
    return getEmbedRecord(id);
  }
  async updateEmbed(id: number, embed: any): Promise<Embed> {
    return updateEmbedRecord(id, embed);
  }
  async deleteEmbed(id: number): Promise<void> {
    await deleteEmbedRecord(id);
  }

  // --- CHANNEL SETTINGS ---
  async getChannelSettings(serverId: number): Promise<ChannelSetting[]> {
    return listChannelSettingRecords(serverId);
  }
  async upsertChannelSettings(serverId: number, data: any): Promise<ChannelSetting> {
    return upsertChannelSettingRecord(serverId, data);
  }
  async getChannelSettingsById(id: number): Promise<ChannelSetting | undefined> {
    return getChannelSettingRecord(id);
  }
  async deleteChannelSettings(id: number): Promise<void> {
    await deleteChannelSettingRecord(id);
  }

  // --- REACTION ROLES ---
  async getReactionRoles(serverId: number): Promise<ReactionRole[]> {
    return listReactionRoleRecords(serverId);
  }
  async createReactionRole(serverId: number, data: any): Promise<ReactionRole> {
    return createReactionRoleRecord(serverId, data);
  }
  async getReactionRoleById(id: number): Promise<ReactionRole | undefined> {
    return getReactionRoleRecord(id);
  }
  async deleteReactionRole(id: number): Promise<void> {
    await deleteReactionRoleRecord(id);
  }

  // --- AUTO ROLES ---
  async getAutoRoles(serverId: number): Promise<AutoRole[]> {
    return listAutoRoleRecords(serverId);
  }
  async createAutoRole(serverId: number, data: any): Promise<AutoRole> {
    return createAutoRoleRecord(serverId, data);
  }
  async getAutoRoleById(id: number): Promise<AutoRole | undefined> {
    return getAutoRoleRecord(id);
  }
  async deleteAutoRole(id: number): Promise<void> {
    await deleteAutoRoleRecord(id);
  }

  // --- WARNINGS ---
  async getWarnings(serverId: number): Promise<Warning[]> {
    return listWarningRecords(serverId);
  }
  async createWarning(serverId: number, data: any): Promise<Warning> {
    return createWarningRecord(serverId, data);
  }
  async deleteWarning(id: number): Promise<void> {
    await deleteWarningRecord(id);
  }
  async clearWarnings(serverId: number, userId: string): Promise<void> {
    await clearWarningRecords(serverId, userId);
  }

  // --- PUNISHMENT CONFIG ---
  async getPunishmentConfig(serverId: number): Promise<PunishmentConfigType[]> {
    return listPunishmentConfigRecords(serverId);
  }
  async upsertPunishmentConfig(serverId: number, data: any): Promise<PunishmentConfigType> {
    return upsertPunishmentConfigRecord(serverId, data);
  }
  async deletePunishmentConfig(id: number): Promise<void> {
    await deletePunishmentConfigRecord(id);
  }

  // --- LEVELING ---
  async getLevelingConfig(serverId: number): Promise<LevelingConfigType | undefined> {
    return getLevelingConfigRecord(serverId);
  }
  async upsertLevelingConfig(serverId: number, data: any): Promise<LevelingConfigType> {
    return upsertLevelingConfigRecord(serverId, data);
  }

  // --- STARBOARD ---
  async getStarboardConfig(serverId: number): Promise<StarboardConfigType | undefined> {
    return getStarboardConfigRecord(serverId);
  }
  async upsertStarboardConfig(serverId: number, data: any): Promise<StarboardConfigType> {
    return upsertStarboardConfigRecord(serverId, data);
  }

  // --- TICKETS ---
  async getTicketConfig(serverId: number): Promise<TicketConfigType | undefined> {
    return getTicketConfigRecord(serverId);
  }
  async upsertTicketConfig(serverId: number, data: any): Promise<TicketConfigType> {
    return upsertTicketConfigRecord(serverId, data);
  }
  async getTicketPanels(serverId: number): Promise<TicketPanel[]> {
    return listTicketPanelRecords(serverId);
  }
  async createTicketPanel(serverId: number, data: any): Promise<TicketPanel> {
    return createTicketPanelRecord(serverId, data);
  }
  async updateTicketPanel(id: number, data: any): Promise<TicketPanel> {
    return updateTicketPanelRecord(id, data);
  }
  async deleteTicketPanel(id: number): Promise<void> {
    await deleteTicketPanelRecord(id);
  }

  // --- SCHEDULED MESSAGES ---
  async getScheduledMessages(serverId: number): Promise<ScheduledMessage[]> {
    return listScheduledMessageRecords(serverId);
  }
  async createScheduledMessage(serverId: number, data: any): Promise<ScheduledMessage> {
    return createScheduledMessageRecord(serverId, data);
  }
  async updateScheduledMessage(id: number, data: any): Promise<ScheduledMessage> {
    return updateScheduledMessageRecord(id, data);
  }
  async deleteScheduledMessage(id: number): Promise<void> {
    await deleteScheduledMessageRecord(id);
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
    return getServerByDiscordIdRecord(discordId);
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

