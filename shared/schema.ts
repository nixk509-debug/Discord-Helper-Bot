import { pgTable, text, serial, integer, boolean, timestamp, jsonb, date } from "drizzle-orm/pg-core";
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

  // Welcome / Leave
  welcomeEnabled: boolean("welcome_enabled").default(false),
  welcomeChannelId: text("welcome_channel_id"),
  welcomeMessage: text("welcome_message"),
  welcomeEmbedId: integer("welcome_embed_id"),
  welcomeMessages: jsonb("welcome_messages").$type<WelcomeMessage[]>().default([]),
  welcomeDmEnabled: boolean("welcome_dm_enabled").default(false),
  welcomeDmMessage: text("welcome_dm_message"),
  onboardingDms: jsonb("onboarding_dms").$type<OnboardingDm[]>().default([]),
  leaveEnabled: boolean("leave_enabled").default(false),
  leaveChannelId: text("leave_channel_id"),
  leaveMessage: text("leave_message"),
  leaveEmbedId: integer("leave_embed_id"),

  // Automod
  automodEnabled: boolean("automod_enabled").default(false),
  antiSpamEnabled: boolean("anti_spam_enabled").default(false),
  antiLinkEnabled: boolean("anti_link_enabled").default(false),
  antiCapsEnabled: boolean("anti_caps_enabled").default(false),
  antiEmojiSpamEnabled: boolean("anti_emoji_spam_enabled").default(false),
  antiMassMentionEnabled: boolean("anti_mass_mention_enabled").default(false),
  antiInviteEnabled: boolean("anti_invite_enabled").default(false),
  antiPhishingEnabled: boolean("anti_phishing_enabled").default(false),
  antiZalgoEnabled: boolean("anti_zalgo_enabled").default(false),
  maxMentions: integer("max_mentions").default(5),
  capsThreshold: integer("caps_threshold").default(70),
  bannedWords: jsonb("banned_words").$type<string[]>().default([]),
  automodWhitelistedRoles: jsonb("automod_whitelisted_roles").$type<string[]>().default([]),
  automodWhitelistedChannels: jsonb("automod_whitelisted_channels").$type<string[]>().default([]),
  automodAction: text("automod_action").default("delete"),
  automodActionDuration: integer("automod_action_duration").default(0),
  automodChannelOverrides: jsonb("automod_channel_overrides").$type<AutomodChannelOverride[]>().default([]),
  automodTimeRules: jsonb("automod_time_rules").$type<AutomodTimeRule[]>().default([]),
  muteRoleId: text("mute_role_id"),
  modLogChannelId: text("mod_log_channel_id"),

  // Raid Protection
  raidProtectionEnabled: boolean("raid_protection_enabled").default(false),
  raidJoinThreshold: integer("raid_join_threshold").default(10),
  raidJoinWindow: integer("raid_join_window").default(10),
  raidAction: text("raid_action").default("lockdown"),
  raidMinAccountAge: integer("raid_min_account_age").default(0),

  // Logging
  logChannelId: text("log_channel_id"),
  logEvents: jsonb("log_events").$type<string[]>().default([]),

  // Verify Module
  verifyEnabled: boolean("verify_enabled").default(false),
  verifyType: text("verify_type").default("button"),
  verifyChannelId: text("verify_channel_id"),
  verifyRoleId: text("verify_role_id"),
  verifyMessage: text("verify_message"),
  verifyEmbed: jsonb("verify_embed"),
  verifyButtonLabel: text("verify_button_label").default("Verify Me"),
  verifyLogChannelId: text("verify_log_channel_id"),
  unverifiedRoleId: text("unverified_role_id"),
  verifyMinAccountAge: integer("verify_min_account_age").default(0),
  verifyCodeWord: text("verify_code_word"),

  // NSFW Module
  nsfwEnabled: boolean("nsfw_enabled").default(false),
  nsfwAgeVerificationEnabled: boolean("nsfw_age_verification_enabled").default(false),
  nsfwVerificationRoleId: text("nsfw_verification_role_id"),
  nsfwChannels: jsonb("nsfw_channels").$type<string[]>().default([]),
  nsfwRestrictedRoles: jsonb("nsfw_restricted_roles").$type<string[]>().default([]),
  nsfwLogChannelId: text("nsfw_log_channel_id"),
  nsfwAutoDetect: boolean("nsfw_auto_detect").default(false),
  nsfwWarnOnAccess: boolean("nsfw_warn_on_access").default(true),

  // Economy Module
  economyEnabled: boolean("economy_enabled").default(false),
  economyCurrencyName: text("economy_currency_name").default("Coins"),
  economyCurrencySymbol: text("economy_currency_symbol").default("🪙"),
  economyStartingBalance: integer("economy_starting_balance").default(100),
  economyDailyMin: integer("economy_daily_min").default(50),
  economyDailyMax: integer("economy_daily_max").default(200),
  economyWorkMin: integer("economy_work_min").default(20),
  economyWorkMax: integer("economy_work_max").default(100),
  economyWorkMessages: jsonb("economy_work_messages").$type<string[]>().default([]),
  economyMessageRewardEnabled: boolean("economy_message_reward_enabled").default(false),
  economyMessageRewardAmount: integer("economy_message_reward_amount").default(5),
  economyVoiceRewardEnabled: boolean("economy_voice_reward_enabled").default(false),
  economyVoiceRewardRate: integer("economy_voice_reward_rate").default(10),
  economyGamblingEnabled: boolean("economy_gambling_enabled").default(true),
  economyRobEnabled: boolean("economy_rob_enabled").default(false),
  economyRobSuccessChance: integer("economy_rob_success_chance").default(40),

  // Leveling Expansion
  voiceXpEnabled: boolean("voice_xp_enabled").default(false),
  voiceXpRate: integer("voice_xp_rate").default(5),
  doubleXpEvents: jsonb("double_xp_events").$type<DoubleXpEvent[]>().default([]),
  xpDecayEnabled: boolean("xp_decay_enabled").default(false),
  xpDecayDays: integer("xp_decay_days").default(30),
  xpDecayAmount: integer("xp_decay_amount").default(100),
  xpSeasonNumber: integer("xp_season_number").default(1),
  xpSeasonResetDate: text("xp_season_reset_date"),
  xpBoosterRoles: jsonb("xp_booster_roles").$type<XpBoosterRole[]>().default([]),

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
  responseVariations: jsonb("response_variations").$type<string[]>().default([]),
  embedResponse: jsonb("embed_response"),
  aliases: jsonb("aliases").$type<string[]>().default([]),
  category: text("category").default("general"),
  cooldown: integer("cooldown").default(0),
  cooldownScope: text("cooldown_scope").default("user"),
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
  interactiveComponents: jsonb("interactive_components").$type<InteractiveComponent[]>().default([]),
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
  departments: jsonb("departments").$type<TicketDepartment[]>().default([]),
  cannedResponses: jsonb("canned_responses").$type<CannedResponse[]>().default([]),
  satisfactionRatingEnabled: boolean("satisfaction_rating_enabled").default(false),
  autoCloseHours: integer("auto_close_hours").default(0),
  slaTargets: jsonb("sla_targets").$type<SlaTarget[]>().default([]),
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
  embedColor: text("embed_color").default("#dc2626"),
});

// --- SCHEDULED MESSAGES ---
export const scheduledMessages = pgTable("scheduled_messages", {
  id: serial("id").primaryKey(),
  serverId: integer("server_id").notNull().references(() => servers.id, { onDelete: 'cascade' }),
  channelId: text("channel_id").notNull(),
  content: text("content"),
  embedData: jsonb("embed_data"),
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
  categoryWebhooks: jsonb("category_webhooks").$type<Record<string, string>>().default({}),
  ignoredUsers: jsonb("ignored_users").$type<string[]>().default([]),
  ignoredBots: boolean("ignored_bots").default(false),
});

// --- AUTOMATIONS (Visual Flow Builder) ---
export const automations = pgTable("automations", {
  id: serial("id").primaryKey(),
  serverId: integer("server_id").notNull().references(() => servers.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  description: text("description"),
  isEnabled: boolean("is_enabled").default(true),
  flow: jsonb("flow").$type<AutomationFlow>().default({ nodes: [], edges: [] }),
  triggerType: text("trigger_type").default("message"),
  lastRunAt: timestamp("last_run_at"),
  runCount: integer("run_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// --- SERVER VARIABLES (Persistent Variable Storage) ---
export const serverVariables = pgTable("server_variables", {
  id: serial("id").primaryKey(),
  serverId: integer("server_id").notNull().references(() => servers.id, { onDelete: 'cascade' }),
  scope: text("scope").notNull().default("server"),
  userId: text("user_id"),
  key: text("key").notNull(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// --- ECONOMY ---
export const economy = pgTable("economy", {
  id: serial("id").primaryKey(),
  serverId: integer("server_id").notNull().references(() => servers.id, { onDelete: 'cascade' }),
  userId: text("user_id").notNull(),
  username: text("username"),
  balance: integer("balance").default(0),
  totalEarned: integer("total_earned").default(0),
  totalSpent: integer("total_spent").default(0),
  lastDaily: timestamp("last_daily"),
  lastWork: timestamp("last_work"),
  lastRob: timestamp("last_rob"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const roleShop = pgTable("role_shop", {
  id: serial("id").primaryKey(),
  serverId: integer("server_id").notNull().references(() => servers.id, { onDelete: 'cascade' }),
  roleId: text("role_id").notNull(),
  roleName: text("role_name").notNull(),
  price: integer("price").notNull(),
  duration: integer("duration").default(0),
  stock: integer("stock").default(-1),
  totalSold: integer("total_sold").default(0),
  isActive: boolean("is_active").default(true),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const economyTransactions = pgTable("economy_transactions", {
  id: serial("id").primaryKey(),
  serverId: integer("server_id").notNull().references(() => servers.id, { onDelete: 'cascade' }),
  userId: text("user_id").notNull(),
  type: text("type").notNull(),
  amount: integer("amount").notNull(),
  balanceBefore: integer("balance_before").notNull(),
  balanceAfter: integer("balance_after").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- MEMBER NOTES (CRM) ---
export const memberNotes = pgTable("member_notes", {
  id: serial("id").primaryKey(),
  serverId: integer("server_id").notNull().references(() => servers.id, { onDelete: 'cascade' }),
  targetUserId: text("target_user_id").notNull(),
  targetUsername: text("target_username"),
  authorId: text("author_id").notNull(),
  authorUsername: text("author_username"),
  note: text("note").notNull(),
  isPrivate: boolean("is_private").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- SERVER INSIGHTS (Analytics) ---
export const serverInsights = pgTable("server_insights", {
  id: serial("id").primaryKey(),
  serverId: integer("server_id").notNull().references(() => servers.id, { onDelete: 'cascade' }),
  date: text("date").notNull(),
  messageCount: integer("message_count").default(0),
  memberCount: integer("member_count").default(0),
  memberJoins: integer("member_joins").default(0),
  memberLeaves: integer("member_leaves").default(0),
  commandsUsed: integer("commands_used").default(0),
  topChannels: jsonb("top_channels").$type<{ channelId: string; channelName: string; count: number }[]>().default([]),
  hourlyActivity: jsonb("hourly_activity").$type<number[]>().default([]),
  weekdayActivity: jsonb("weekday_activity").$type<number[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- COMMAND SHARES (Marketplace) ---
export const commandShares = pgTable("command_shares", {
  id: serial("id").primaryKey(),
  serverId: integer("server_id").notNull().references(() => servers.id, { onDelete: 'cascade' }),
  authorId: text("author_id").notNull(),
  commandId: integer("command_id").notNull().references(() => customCommands.id, { onDelete: 'cascade' }),
  shareCode: text("share_code").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").default("utility"),
  tags: jsonb("tags").$type<string[]>().default([]),
  isPublic: boolean("is_public").default(true),
  viewCount: integer("view_count").default(0),
  importCount: integer("import_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const commandImports = pgTable("command_imports", {
  id: serial("id").primaryKey(),
  serverId: integer("server_id").notNull().references(() => servers.id, { onDelete: 'cascade' }),
  sourceShareCode: text("source_share_code").notNull(),
  importedCommandId: integer("imported_command_id").references(() => customCommands.id, { onDelete: 'set null' }),
  importedAt: timestamp("imported_at").defaultNow(),
});

// --- SERVER WEBHOOKS ---
export const serverWebhooks = pgTable("server_webhooks", {
  id: serial("id").primaryKey(),
  serverId: integer("server_id").notNull().references(() => servers.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  type: text("type").notNull().default("incoming"),
  channelId: text("channel_id"),
  webhookUrl: text("webhook_url"),
  targetUrl: text("target_url"),
  events: jsonb("events").$type<string[]>().default([]),
  secret: text("secret"),
  isActive: boolean("is_active").default(true),
  lastTriggeredAt: timestamp("last_triggered_at"),
  triggerCount: integer("trigger_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- POLLS ---
export const polls = pgTable("polls", {
  id: serial("id").primaryKey(),
  serverId: integer("server_id").notNull().references(() => servers.id, { onDelete: 'cascade' }),
  channelId: text("channel_id").notNull(),
  messageId: text("message_id"),
  question: text("question").notNull(),
  options: jsonb("options").$type<PollOption[]>().default([]),
  allowMultiple: boolean("allow_multiple").default(false),
  anonymous: boolean("anonymous").default(false),
  endsAt: timestamp("ends_at"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- GIVEAWAYS ---
export const giveaways = pgTable("giveaways", {
  id: serial("id").primaryKey(),
  serverId: integer("server_id").notNull().references(() => servers.id, { onDelete: 'cascade' }),
  channelId: text("channel_id").notNull(),
  messageId: text("message_id"),
  prize: text("prize").notNull(),
  description: text("description"),
  winnersCount: integer("winners_count").default(1),
  requirements: jsonb("requirements").$type<GiveawayRequirements>().default({}),
  startsAt: timestamp("starts_at"),
  endsAt: timestamp("ends_at"),
  isActive: boolean("is_active").default(true),
  winnerIds: jsonb("winner_ids").$type<string[]>().default([]),
  entryCount: integer("entry_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
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
  automations: many(automations),
  serverVariables: many(serverVariables),
  economy: many(economy),
  roleShop: many(roleShop),
  economyTransactions: many(economyTransactions),
  memberNotes: many(memberNotes),
  serverInsights: many(serverInsights),
  commandShares: many(commandShares),
  commandImports: many(commandImports),
  serverWebhooks: many(serverWebhooks),
  polls: many(polls),
  giveaways: many(giveaways),
}));

export const settingsRelations = relations(serverSettings, ({ one }) => ({
  server: one(servers, { fields: [serverSettings.serverId], references: [servers.id] }),
}));

export const customCommandsRelations = relations(customCommands, ({ one, many }) => ({
  server: one(servers, { fields: [customCommands.serverId], references: [servers.id] }),
  shares: many(commandShares),
  imports: many(commandImports),
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

export const automationsRelations = relations(automations, ({ one }) => ({
  server: one(servers, { fields: [automations.serverId], references: [servers.id] }),
}));

export const serverVariablesRelations = relations(serverVariables, ({ one }) => ({
  server: one(servers, { fields: [serverVariables.serverId], references: [servers.id] }),
}));

export const economyRelations = relations(economy, ({ one }) => ({
  server: one(servers, { fields: [economy.serverId], references: [servers.id] }),
}));

export const roleShopRelations = relations(roleShop, ({ one }) => ({
  server: one(servers, { fields: [roleShop.serverId], references: [servers.id] }),
}));

export const economyTransactionsRelations = relations(economyTransactions, ({ one }) => ({
  server: one(servers, { fields: [economyTransactions.serverId], references: [servers.id] }),
}));

export const memberNotesRelations = relations(memberNotes, ({ one }) => ({
  server: one(servers, { fields: [memberNotes.serverId], references: [servers.id] }),
}));

export const serverInsightsRelations = relations(serverInsights, ({ one }) => ({
  server: one(servers, { fields: [serverInsights.serverId], references: [servers.id] }),
}));

export const commandSharesRelations = relations(commandShares, ({ one }) => ({
  server: one(servers, { fields: [commandShares.serverId], references: [servers.id] }),
  command: one(customCommands, { fields: [commandShares.commandId], references: [customCommands.id] }),
}));

export const commandImportsRelations = relations(commandImports, ({ one }) => ({
  server: one(servers, { fields: [commandImports.serverId], references: [servers.id] }),
  importedCommand: one(customCommands, { fields: [commandImports.importedCommandId], references: [customCommands.id] }),
}));

export const serverWebhooksRelations = relations(serverWebhooks, ({ one }) => ({
  server: one(servers, { fields: [serverWebhooks.serverId], references: [servers.id] }),
}));

export const pollsRelations = relations(polls, ({ one }) => ({
  server: one(servers, { fields: [polls.serverId], references: [servers.id] }),
}));

export const giveawaysRelations = relations(giveaways, ({ one }) => ({
  server: one(servers, { fields: [giveaways.serverId], references: [servers.id] }),
}));

// --- COMMAND CONDITION/ACTION TYPES ---
export interface CommandCondition {
  type: 'hasRole' | 'inChannel' | 'hasPermission' | 'isOwner' | 'isPremium' | 'randomChance' | 'messageContains' | 'accountAge' | 'variableCheck' | 'userWarnings' | 'userLevel';
  value?: string;
  negate?: boolean;
  chance?: number;
  days?: number;
  variableKey?: string;
  variableScope?: 'server' | 'user';
  operator?: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains';
}

export interface CommandAction {
  type: 'reply' | 'addRole' | 'removeRole' | 'createThread' | 'sendDM' | 'react' | 'wait' | 'deleteMessage' | 'pinMessage' | 'setVariable' | 'httpRequest' | 'addEconomyCoins' | 'addWarning' | 'sendWebhook' | 'addXP';
  value?: string;
  duration?: number;
  embedData?: Record<string, unknown>;
  variableKey?: string;
  variableScope?: 'server' | 'user';
  httpMethod?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  httpHeaders?: Record<string, string>;
  httpBody?: string;
  responseMapping?: { jsonPath: string; saveAs: string }[];
  amount?: number;
}

// --- AUTOMATION FLOW TYPES ---
export interface AutomationNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    config: Record<string, unknown>;
  };
}

export interface AutomationEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface AutomationFlow {
  nodes: AutomationNode[];
  edges: AutomationEdge[];
}

// --- INTERACTIVE COMPONENT TYPES ---
export interface InteractiveComponent {
  id: string;
  type: 'button' | 'select';
  label?: string;
  style?: 'primary' | 'secondary' | 'success' | 'danger' | 'link';
  emoji?: string;
  url?: string;
  placeholder?: string;
  options?: { label: string; value: string; description?: string; emoji?: string }[];
  action?: CommandAction;
  rowIndex?: number;
}

// --- WELCOME/ONBOARDING TYPES ---
export interface WelcomeMessage {
  content: string;
  embedData?: Record<string, unknown>;
}

export interface OnboardingDm {
  message: string;
  delayMinutes: number;
}

// --- AUTOMOD TYPES ---
export interface AutomodChannelOverride {
  channelId: string;
  strictnessLevel: 'off' | 'low' | 'medium' | 'high';
}

export interface AutomodTimeRule {
  startHour: number;
  endHour: number;
  timezone: string;
  strictnessLevel: 'low' | 'medium' | 'high';
}

// --- LEVELING EXPANSION TYPES ---
export interface DoubleXpEvent {
  name: string;
  multiplier: number;
  startAt: string;
  endAt: string;
  isActive: boolean;
}

export interface XpBoosterRole {
  roleId: string;
  roleName: string;
  multiplier: number;
}

// --- TICKET TYPES ---
export interface TicketDepartment {
  id: string;
  name: string;
  emoji: string;
  channelId?: string;
  supportRoleId?: string;
  supportRoleName?: string;
}

export interface CannedResponse {
  id: string;
  title: string;
  content: string;
}

export interface SlaTarget {
  priority: 'low' | 'medium' | 'high' | 'urgent';
  firstResponseHours: number;
  resolutionHours: number;
}

// --- POLL/GIVEAWAY TYPES ---
export interface PollOption {
  text: string;
  voteCount: number;
  emoji?: string;
}

export interface GiveawayRequirements {
  minLevel?: number;
  requiredRoleId?: string;
  minAccountAgeDays?: number;
  minEconomyBalance?: number;
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
export const insertAutomationSchema = createInsertSchema(automations).omit({ id: true, createdAt: true, updatedAt: true, serverId: true });
export const insertServerVariableSchema = createInsertSchema(serverVariables).omit({ id: true, updatedAt: true, serverId: true });
export const insertEconomySchema = createInsertSchema(economy).omit({ id: true, createdAt: true, serverId: true });
export const insertRoleShopSchema = createInsertSchema(roleShop).omit({ id: true, createdAt: true, serverId: true });
export const insertEconomyTransactionSchema = createInsertSchema(economyTransactions).omit({ id: true, createdAt: true, serverId: true });
export const insertMemberNoteSchema = createInsertSchema(memberNotes).omit({ id: true, createdAt: true, serverId: true });
export const insertServerInsightSchema = createInsertSchema(serverInsights).omit({ id: true, createdAt: true, serverId: true });
export const insertCommandShareSchema = createInsertSchema(commandShares).omit({ id: true, createdAt: true, updatedAt: true, serverId: true });
export const insertCommandImportSchema = createInsertSchema(commandImports).omit({ id: true, importedAt: true, serverId: true });
export const insertServerWebhookSchema = createInsertSchema(serverWebhooks).omit({ id: true, createdAt: true, serverId: true });
export const insertPollSchema = createInsertSchema(polls).omit({ id: true, createdAt: true, serverId: true });
export const insertGiveawaySchema = createInsertSchema(giveaways).omit({ id: true, createdAt: true, serverId: true });

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
export type Automation = typeof automations.$inferSelect;
export type ServerVariable = typeof serverVariables.$inferSelect;
export type EconomyAccount = typeof economy.$inferSelect;
export type RoleShopItem = typeof roleShop.$inferSelect;
export type EconomyTransaction = typeof economyTransactions.$inferSelect;
export type MemberNote = typeof memberNotes.$inferSelect;
export type ServerInsight = typeof serverInsights.$inferSelect;
export type CommandShare = typeof commandShares.$inferSelect;
export type CommandImport = typeof commandImports.$inferSelect;
export type ServerWebhook = typeof serverWebhooks.$inferSelect;
export type Poll = typeof polls.$inferSelect;
export type Giveaway = typeof giveaways.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type InsertAutomation = z.infer<typeof insertAutomationSchema>;
export type InsertServerVariable = z.infer<typeof insertServerVariableSchema>;

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
  automations?: Automation[];
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
