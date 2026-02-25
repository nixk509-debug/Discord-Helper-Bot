import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// --- BOT SERVERS ---
export const servers = pgTable("servers", {
  id: serial("id").primaryKey(),
  discordId: text("discord_id").notNull().unique(),
  name: text("name").notNull(),
  iconUrl: text("icon_url"),
  memberCount: integer("member_count").default(0),
  joinedAt: timestamp("joined_at").defaultNow(),
  ownerId: text("owner_id").notNull(),
});

// --- SERVER SETTINGS ---
export const serverSettings = pgTable("server_settings", {
  id: serial("id").primaryKey(),
  serverId: integer("server_id").notNull().references(() => servers.id, { onDelete: 'cascade' }),
  prefix: text("prefix").default("!").notNull(),
  botNickname: text("bot_nickname"),
  locale: text("locale").default("en"),

  welcomeEnabled: boolean("welcome_enabled").default(false),
  welcomeChannelId: text("welcome_channel_id"),
  welcomeMessage: text("welcome_message"),
  welcomeEmbedId: integer("welcome_embed_id"),
  welcomeDmEnabled: boolean("welcome_dm_enabled").default(false),
  welcomeDmMessage: text("welcome_dm_message"),
  leaveEnabled: boolean("leave_enabled").default(false),
  leaveChannelId: text("leave_channel_id"),
  leaveMessage: text("leave_message"),
  leaveEmbedId: integer("leave_embed_id"),

  automodEnabled: boolean("automod_enabled").default(false),
  antiSpamEnabled: boolean("anti_spam_enabled").default(false),
  antiLinkEnabled: boolean("anti_link_enabled").default(false),
  antiCapsEnabled: boolean("anti_caps_enabled").default(false),
  antiEmojiSpamEnabled: boolean("anti_emoji_spam_enabled").default(false),
  antiMassMentionEnabled: boolean("anti_mass_mention_enabled").default(false),
  antiInviteEnabled: boolean("anti_invite_enabled").default(false),
  maxMentions: integer("max_mentions").default(5),
  capsThreshold: integer("caps_threshold").default(70),
  bannedWords: jsonb("banned_words").$type<string[]>().default([]),
  automodWhitelistedRoles: jsonb("automod_whitelisted_roles").$type<string[]>().default([]),
  automodWhitelistedChannels: jsonb("automod_whitelisted_channels").$type<string[]>().default([]),
  automodAction: text("automod_action").default("delete"),
  automodActionDuration: integer("automod_action_duration").default(0),
  muteRoleId: text("mute_role_id"),
  modLogChannelId: text("mod_log_channel_id"),

  raidProtectionEnabled: boolean("raid_protection_enabled").default(false),
  raidJoinThreshold: integer("raid_join_threshold").default(10),
  raidJoinWindow: integer("raid_join_window").default(10),
  raidAction: text("raid_action").default("lockdown"),
  raidMinAccountAge: integer("raid_min_account_age").default(0),

  logChannelId: text("log_channel_id"),
  logEvents: jsonb("log_events").$type<string[]>().default([]),

  updatedAt: timestamp("updated_at").defaultNow(),
});

// --- USERS ---
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  discordId: text("discord_id").notNull().unique(),
  username: text("username").notNull(),
  discriminator: text("discriminator"),
  avatar: text("avatar"),
  email: text("email"),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  isPremium: boolean("is_premium").default(false),
  premiumSince: timestamp("premium_since"),
  premiumExpiresAt: timestamp("premium_expires_at"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- TEMPLATES ---
export const templates = pgTable("templates", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  serverId: integer("server_id").references(() => servers.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  type: text("type").notNull(),
  data: jsonb("data").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- CUSTOM COMMANDS ---
export const customCommands = pgTable("custom_commands", {
  id: serial("id").primaryKey(),
  serverId: integer("server_id").notNull().references(() => servers.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  description: text("description"),
  response: text("response").notNull(),
  responseType: text("response_type").default("text"),
  embedResponse: jsonb("embed_response"),
  aliases: jsonb("aliases").$type<string[]>().default([]),
  cooldown: integer("cooldown").default(0),
  requiredRoles: jsonb("required_roles").$type<string[]>().default([]),
  blockedRoles: jsonb("blocked_roles").$type<string[]>().default([]),
  allowedChannels: jsonb("allowed_channels").$type<string[]>().default([]),
  blockedChannels: jsonb("blocked_channels").$type<string[]>().default([]),
  enabled: boolean("enabled").default(true),
  deleteInvocation: boolean("delete_invocation").default(false),
  dmResponse: boolean("dm_response").default(false),
  triggerType: text("trigger_type").default("command"),
  conditions: jsonb("conditions").$type<CommandCondition[]>().default([]),
  actions: jsonb("actions").$type<CommandAction[]>().default([]),
  usageCount: integer("usage_count").default(0),
  lastUsedAt: timestamp("last_used_at"),
  premiumOnly: boolean("premium_only").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- EMBEDS ---
export const embeds = pgTable("embeds", {
  id: serial("id").primaryKey(),
  serverId: integer("server_id").notNull().references(() => servers.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  title: text("title"),
  description: text("description"),
  url: text("url"),
  color: text("color"),
  timestamp: boolean("timestamp").default(false),
  footerText: text("footer_text"),
  footerIconUrl: text("footer_icon_url"),
  imageUrl: text("image_url"),
  thumbnailUrl: text("thumbnail_url"),
  authorName: text("author_name"),
  authorUrl: text("author_url"),
  authorIconUrl: text("author_icon_url"),
  fields: jsonb("fields").$type<EmbedFieldType[]>().default([]),
  components: jsonb("components").$type<EmbedComponentType[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- CHANNEL SETTINGS ---
export const channelSettings = pgTable("channel_settings", {
  id: serial("id").primaryKey(),
  serverId: integer("server_id").notNull().references(() => servers.id, { onDelete: 'cascade' }),
  channelId: text("channel_id").notNull(),
  channelName: text("channel_name").notNull(),
  slowmode: integer("slowmode").default(0),
  autoDeleteAfter: integer("auto_delete_after").default(0),
  automodOverride: boolean("automod_override"),
  lockedDown: boolean("locked_down").default(false),
  allowedContentTypes: jsonb("allowed_content_types").$type<string[]>().default(["text", "images", "embeds", "files", "stickers", "links"]),
  nsfw: boolean("nsfw").default(false),
  topic: text("topic"),
  customPermissions: jsonb("custom_permissions"),
});

// --- REACTION ROLES ---
export const reactionRoles = pgTable("reaction_roles", {
  id: serial("id").primaryKey(),
  serverId: integer("server_id").notNull().references(() => servers.id, { onDelete: 'cascade' }),
  channelId: text("channel_id").notNull(),
  messageId: text("message_id"),
  emoji: text("emoji").notNull(),
  roleId: text("role_id").notNull(),
  roleName: text("role_name").notNull(),
  mode: text("mode").default("toggle"),
  groupId: text("group_id"),
});

// --- AUTO ROLES ---
export const autoRoles = pgTable("auto_roles", {
  id: serial("id").primaryKey(),
  serverId: integer("server_id").notNull().references(() => servers.id, { onDelete: 'cascade' }),
  roleId: text("role_id").notNull(),
  roleName: text("role_name").notNull(),
  delay: integer("delay").default(0),
  type: text("type").default("join"),
});

// --- WARNINGS ---
export const warnings = pgTable("warnings", {
  id: serial("id").primaryKey(),
  serverId: integer("server_id").notNull().references(() => servers.id, { onDelete: 'cascade' }),
  userId: text("user_id").notNull(),
  userName: text("user_name"),
  moderatorId: text("moderator_id").notNull(),
  moderatorName: text("moderator_name"),
  reason: text("reason").notNull(),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- PUNISHMENT CONFIG ---
export const punishmentConfig = pgTable("punishment_config", {
  id: serial("id").primaryKey(),
  serverId: integer("server_id").notNull().references(() => servers.id, { onDelete: 'cascade' }),
  warningThreshold: integer("warning_threshold").notNull(),
  action: text("action").notNull(),
  duration: integer("duration"),
});

// --- LEVELING CONFIG ---
export const levelingConfig = pgTable("leveling_config", {
  id: serial("id").primaryKey(),
  serverId: integer("server_id").notNull().references(() => servers.id, { onDelete: 'cascade' }),
  enabled: boolean("enabled").default(false),
  xpPerMessage: integer("xp_per_message").default(15),
  xpCooldown: integer("xp_cooldown").default(60),
  levelUpChannelId: text("level_up_channel_id"),
  levelUpMessage: text("level_up_message").default("Congratulations {user}, you reached level {level}!"),
  ignoredChannels: jsonb("ignored_channels").$type<string[]>().default([]),
  ignoredRoles: jsonb("ignored_roles").$type<string[]>().default([]),
  roleRewards: jsonb("role_rewards").$type<{ level: number; roleId: string; roleName: string }[]>().default([]),
  xpMultipliers: jsonb("xp_multipliers").$type<{ roleId: string; roleName: string; multiplier: number }[]>().default([]),
  stackRewards: boolean("stack_rewards").default(true),
});

// --- STARBOARD CONFIG ---
export const starboardConfig = pgTable("starboard_config", {
  id: serial("id").primaryKey(),
  serverId: integer("server_id").notNull().references(() => servers.id, { onDelete: 'cascade' }),
  enabled: boolean("enabled").default(false),
  channelId: text("channel_id"),
  threshold: integer("threshold").default(3),
  emoji: text("emoji").default("⭐"),
  selfStar: boolean("self_star").default(false),
  ignoredChannels: jsonb("ignored_channels").$type<string[]>().default([]),
  nsfwAllowed: boolean("nsfw_allowed").default(false),
});

// --- TICKET CONFIG ---
export const ticketConfig = pgTable("ticket_config", {
  id: serial("id").primaryKey(),
  serverId: integer("server_id").notNull().references(() => servers.id, { onDelete: 'cascade' }),
  enabled: boolean("enabled").default(false),
  categoryChannelId: text("category_channel_id"),
  supportRoleId: text("support_role_id"),
  supportRoleName: text("support_role_name"),
  maxTicketsPerUser: integer("max_tickets_per_user").default(3),
  namingScheme: text("naming_scheme").default("ticket-{number}"),
  transcriptChannelId: text("transcript_channel_id"),
  dmOnClose: boolean("dm_on_close").default(true),
});

// --- TICKET PANELS ---
export const ticketPanels = pgTable("ticket_panels", {
  id: serial("id").primaryKey(),
  serverId: integer("server_id").notNull().references(() => servers.id, { onDelete: 'cascade' }),
  channelId: text("channel_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  buttonLabel: text("button_label").default("Create Ticket"),
  buttonEmoji: text("button_emoji").default("🎫"),
  buttonStyle: integer("button_style").default(1),
  embedColor: text("embed_color").default("#5865F2"),
});

// --- SCHEDULED MESSAGES ---
export const scheduledMessages = pgTable("scheduled_messages", {
  id: serial("id").primaryKey(),
  serverId: integer("server_id").notNull().references(() => servers.id, { onDelete: 'cascade' }),
  channelId: text("channel_id").notNull(),
  content: text("content"),
  embedId: integer("embed_id"),
  cronExpression: text("cron_expression").notNull(),
  timezone: text("timezone").default("UTC"),
  enabled: boolean("enabled").default(true),
  lastRunAt: timestamp("last_run_at"),
  nextRunAt: timestamp("next_run_at"),
});

// --- AUDIT LOG CONFIG ---
export const auditLogConfig = pgTable("audit_log_config", {
  id: serial("id").primaryKey(),
  serverId: integer("server_id").notNull().references(() => servers.id, { onDelete: 'cascade' }),
  enabled: boolean("enabled").default(false),
  messageLogChannel: text("message_log_channel"),
  memberLogChannel: text("member_log_channel"),
  modLogChannel: text("mod_log_channel"),
  serverLogChannel: text("server_log_channel"),
  voiceLogChannel: text("voice_log_channel"),
  enabledEvents: jsonb("enabled_events").$type<string[]>().default([]),
  format: text("format").default("detailed"),
  webhookUrl: text("webhook_url"),
  ignoredChannels: jsonb("ignored_channels").$type<string[]>().default([]),
  ignoredRoles: jsonb("ignored_roles").$type<string[]>().default([]),
});

// --- RELATIONS ---
export const serverRelations = relations(servers, ({ one, many }) => ({
  settings: one(serverSettings, { fields: [servers.id], references: [serverSettings.serverId] }),
  customCommands: many(customCommands),
  embeds: many(embeds),
  channelSettings: many(channelSettings),
  reactionRoles: many(reactionRoles),
  autoRoles: many(autoRoles),
  warnings: many(warnings),
  punishmentConfig: many(punishmentConfig),
  levelingConfig: one(levelingConfig, { fields: [servers.id], references: [levelingConfig.serverId] }),
  starboardConfig: one(starboardConfig, { fields: [servers.id], references: [starboardConfig.serverId] }),
  ticketConfig: one(ticketConfig, { fields: [servers.id], references: [ticketConfig.serverId] }),
  ticketPanels: many(ticketPanels),
  scheduledMessages: many(scheduledMessages),
  auditLogConfig: one(auditLogConfig, { fields: [servers.id], references: [auditLogConfig.serverId] }),
}));

export const settingsRelations = relations(serverSettings, ({ one }) => ({
  server: one(servers, { fields: [serverSettings.serverId], references: [servers.id] }),
}));

export const customCommandsRelations = relations(customCommands, ({ one }) => ({
  server: one(servers, { fields: [customCommands.serverId], references: [servers.id] }),
}));

export const embedsRelations = relations(embeds, ({ one }) => ({
  server: one(servers, { fields: [embeds.serverId], references: [servers.id] }),
}));

export const channelSettingsRelations = relations(channelSettings, ({ one }) => ({
  server: one(servers, { fields: [channelSettings.serverId], references: [servers.id] }),
}));

export const reactionRolesRelations = relations(reactionRoles, ({ one }) => ({
  server: one(servers, { fields: [reactionRoles.serverId], references: [servers.id] }),
}));

export const autoRolesRelations = relations(autoRoles, ({ one }) => ({
  server: one(servers, { fields: [autoRoles.serverId], references: [servers.id] }),
}));

export const warningsRelations = relations(warnings, ({ one }) => ({
  server: one(servers, { fields: [warnings.serverId], references: [servers.id] }),
}));

export const punishmentConfigRelations = relations(punishmentConfig, ({ one }) => ({
  server: one(servers, { fields: [punishmentConfig.serverId], references: [servers.id] }),
}));

export const levelingConfigRelations = relations(levelingConfig, ({ one }) => ({
  server: one(servers, { fields: [levelingConfig.serverId], references: [servers.id] }),
}));

export const starboardConfigRelations = relations(starboardConfig, ({ one }) => ({
  server: one(servers, { fields: [starboardConfig.serverId], references: [servers.id] }),
}));

export const ticketConfigRelations = relations(ticketConfig, ({ one }) => ({
  server: one(servers, { fields: [ticketConfig.serverId], references: [servers.id] }),
}));

export const ticketPanelsRelations = relations(ticketPanels, ({ one }) => ({
  server: one(servers, { fields: [ticketPanels.serverId], references: [servers.id] }),
}));

export const scheduledMessagesRelations = relations(scheduledMessages, ({ one }) => ({
  server: one(servers, { fields: [scheduledMessages.serverId], references: [servers.id] }),
}));

export const auditLogConfigRelations = relations(auditLogConfig, ({ one }) => ({
  server: one(servers, { fields: [auditLogConfig.serverId], references: [servers.id] }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  templates: many(templates),
}));

export const templatesRelations = relations(templates, ({ one }) => ({
  user: one(users, { fields: [templates.userId], references: [users.id] }),
  server: one(servers, { fields: [templates.serverId], references: [servers.id] }),
}));

// --- COMMAND CONDITION/ACTION TYPES ---
export interface CommandCondition {
  type: 'hasRole' | 'inChannel' | 'hasPermission' | 'isOwner' | 'isPremium';
  value?: string;
  negate?: boolean;
}

export interface CommandAction {
  type: 'reply' | 'addRole' | 'removeRole' | 'createThread' | 'sendDM' | 'react' | 'wait';
  value?: string;
  duration?: number;
}

// --- COMPONENT V2 TYPES ---
export interface EmbedFieldType {
  name: string;
  value: string;
  inline?: boolean;
}

export interface EmbedComponentType {
  type: number;
  id?: string;
  label?: string;
  style?: number;
  customId?: string;
  url?: string;
  emoji?: string;
  disabled?: boolean;
  content?: string;
  description?: string;
  spoiler?: boolean;
  spacing?: "small" | "large";
  divider?: boolean;
  accentColor?: string;
  items?: EmbedMediaItem[];
  accessory?: EmbedComponentType;
  components?: EmbedComponentType[];
  options?: { label: string; value: string; description?: string; emoji?: string }[];
}

export interface EmbedMediaItem {
  url: string;
  description?: string;
  spoiler?: boolean;
}

// Component type constants
export const COMPONENT_TYPES = {
  ACTION_ROW: 1,
  BUTTON: 2,
  SELECT_MENU: 3,
  TEXT_INPUT: 4,
  THUMBNAIL: 7,
  SECTION: 9,
  TEXT_DISPLAY: 10,
  FILE: 11,
  MEDIA_GALLERY: 12,
  SEPARATOR: 14,
  CONTAINER: 17,
} as const;

// --- INSERT SCHEMAS ---
export const insertServerSchema = createInsertSchema(servers).omit({ id: true, joinedAt: true });
export const insertSettingsSchema = createInsertSchema(serverSettings).omit({ id: true, updatedAt: true, serverId: true });
export const insertCommandSchema = createInsertSchema(customCommands).omit({ id: true, createdAt: true, serverId: true });
export const insertEmbedSchema = createInsertSchema(embeds).omit({ id: true, createdAt: true, serverId: true });
export const insertChannelSettingsSchema = createInsertSchema(channelSettings).omit({ id: true, serverId: true });
export const insertReactionRoleSchema = createInsertSchema(reactionRoles).omit({ id: true, serverId: true });
export const insertAutoRoleSchema = createInsertSchema(autoRoles).omit({ id: true, serverId: true });
export const insertWarningSchema = createInsertSchema(warnings).omit({ id: true, createdAt: true, serverId: true });
export const insertPunishmentConfigSchema = createInsertSchema(punishmentConfig).omit({ id: true, serverId: true });
export const insertLevelingConfigSchema = createInsertSchema(levelingConfig).omit({ id: true, serverId: true });
export const insertStarboardConfigSchema = createInsertSchema(starboardConfig).omit({ id: true, serverId: true });
export const insertTicketConfigSchema = createInsertSchema(ticketConfig).omit({ id: true, serverId: true });
export const insertTicketPanelSchema = createInsertSchema(ticketPanels).omit({ id: true, serverId: true });
export const insertScheduledMessageSchema = createInsertSchema(scheduledMessages).omit({ id: true, serverId: true });
export const insertAuditLogConfigSchema = createInsertSchema(auditLogConfig).omit({ id: true, serverId: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertTemplateSchema = createInsertSchema(templates).omit({ id: true, createdAt: true });

// --- SELECT TYPES ---
export type Server = typeof servers.$inferSelect;
export type ServerSettings = typeof serverSettings.$inferSelect;
export type CustomCommand = typeof customCommands.$inferSelect;
export type Embed = typeof embeds.$inferSelect;
export type ChannelSetting = typeof channelSettings.$inferSelect;
export type ReactionRole = typeof reactionRoles.$inferSelect;
export type AutoRole = typeof autoRoles.$inferSelect;
export type Warning = typeof warnings.$inferSelect;
export type PunishmentConfigType = typeof punishmentConfig.$inferSelect;
export type LevelingConfigType = typeof levelingConfig.$inferSelect;
export type StarboardConfigType = typeof starboardConfig.$inferSelect;
export type TicketConfigType = typeof ticketConfig.$inferSelect;
export type TicketPanel = typeof ticketPanels.$inferSelect;
export type ScheduledMessage = typeof scheduledMessages.$inferSelect;
export type AuditLogConfigType = typeof auditLogConfig.$inferSelect;
export type User = typeof users.$inferSelect;
export type Template = typeof templates.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;

// --- COMPOSITE TYPES ---
export type ServerResponse = Server & {
  settings?: ServerSettings;
  customCommands?: CustomCommand[];
  embeds?: Embed[];
  channelSettings?: ChannelSetting[];
  reactionRoles?: ReactionRole[];
  autoRoles?: AutoRole[];
  warnings?: Warning[];
  punishmentConfig?: PunishmentConfigType[];
  levelingConfig?: LevelingConfigType;
  starboardConfig?: StarboardConfigType;
  ticketConfig?: TicketConfigType;
  ticketPanels?: TicketPanel[];
  scheduledMessages?: ScheduledMessage[];
  auditLogConfig?: AuditLogConfigType;
};

export type UpdateSettingsRequest = Partial<z.infer<typeof insertSettingsSchema>>;
export type CreateCommandRequest = z.infer<typeof insertCommandSchema>;
export type UpdateCommandRequest = Partial<CreateCommandRequest>;
export type CreateEmbedRequest = z.infer<typeof insertEmbedSchema>;
export type UpdateEmbedRequest = Partial<CreateEmbedRequest>;

export interface DashboardStats {
  totalServers: number;
  totalMembers: number;
  commandsExecuted: number;
  uptime: string;
}
