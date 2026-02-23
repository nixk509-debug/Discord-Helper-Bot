import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// --- BOT SERVERS ---
export const servers = pgTable("servers", {
  id: serial("id").primaryKey(),
  discordId: text("discord_id").notNull().unique(), // The server ID in Discord
  name: text("name").notNull(),
  iconUrl: text("icon_url"),
  memberCount: integer("member_count").default(0),
  joinedAt: timestamp("joined_at").defaultNow(),
  ownerId: text("owner_id").notNull(), // The Discord User ID of the owner
});

// --- SERVER SETTINGS ---
export const serverSettings = pgTable("server_settings", {
  id: serial("id").primaryKey(),
  serverId: integer("server_id").notNull().references(() => servers.id, { onDelete: 'cascade' }),
  prefix: text("prefix").default("!").notNull(),
  
  // Welcome/Leave
  welcomeChannelId: text("welcome_channel_id"),
  welcomeMessage: text("welcome_message"),
  leaveMessage: text("leave_message"),
  
  // Automod
  automodEnabled: boolean("automod_enabled").default(false),
  antiSpamEnabled: boolean("anti_spam_enabled").default(false),
  antiLinkEnabled: boolean("anti_link_enabled").default(false),
  bannedWords: jsonb("banned_words").$type<string[]>().default([]),
  
  // Logging
  logChannelId: text("log_channel_id"),
  logEvents: jsonb("log_events").$type<string[]>().default([]), // e.g. ["messageDelete", "memberJoin"]
  
  updatedAt: timestamp("updated_at").defaultNow(),
});

// --- CUSTOM COMMANDS ---
export const customCommands = pgTable("custom_commands", {
  id: serial("id").primaryKey(),
  serverId: integer("server_id").notNull().references(() => servers.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  response: text("response").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- RELATIONS ---
export const serverRelations = relations(servers, ({ one, many }) => ({
  settings: one(serverSettings, {
    fields: [servers.id],
    references: [serverSettings.serverId],
  }),
  customCommands: many(customCommands),
}));

export const settingsRelations = relations(serverSettings, ({ one }) => ({
  server: one(servers, {
    fields: [serverSettings.serverId],
    references: [servers.id],
  }),
}));

export const customCommandsRelations = relations(customCommands, ({ one }) => ({
  server: one(servers, {
    fields: [customCommands.serverId],
    references: [servers.id],
  }),
}));


// --- SCHEMAS ---
export const insertServerSchema = createInsertSchema(servers).omit({ id: true, joinedAt: true });
export const insertSettingsSchema = createInsertSchema(serverSettings).omit({ id: true, updatedAt: true, serverId: true });
export const insertCommandSchema = createInsertSchema(customCommands).omit({ id: true, createdAt: true, serverId: true });

// --- API TYPES ---

// Base types
export type Server = typeof servers.$inferSelect;
export type ServerSettings = typeof serverSettings.$inferSelect;
export type CustomCommand = typeof customCommands.$inferSelect;

// Request/Response types
export type ServerResponse = Server & { settings?: ServerSettings, customCommands?: CustomCommand[] };

export type UpdateSettingsRequest = Partial<z.infer<typeof insertSettingsSchema>>;
export type CreateCommandRequest = z.infer<typeof insertCommandSchema>;
export type UpdateCommandRequest = Partial<CreateCommandRequest>;

export interface DashboardStats {
  totalServers: number;
  totalMembers: number;
  commandsExecuted: number; // Mock stat for dashboard
  uptime: string;
}