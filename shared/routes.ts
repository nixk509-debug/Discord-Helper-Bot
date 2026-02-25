import { z } from 'zod';
import {
  insertSettingsSchema, insertCommandSchema, insertEmbedSchema,
  insertChannelSettingsSchema, insertReactionRoleSchema, insertAutoRoleSchema,
  insertWarningSchema, insertPunishmentConfigSchema, insertLevelingConfigSchema,
  insertStarboardConfigSchema, insertTicketConfigSchema, insertTicketPanelSchema,
  insertScheduledMessageSchema, insertAuditLogConfigSchema,
  type Embed, type ServerResponse,
} from './schema';

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
};

const dashboardStatsSchema = z.object({
  totalServers: z.number(),
  totalMembers: z.number(),
  commandsExecuted: z.number(),
  uptime: z.string(),
});

export const api = {
  stats: {
    get: { method: 'GET' as const, path: '/api/stats' as const, responses: { 200: dashboardStatsSchema } },
  },
  servers: {
    list: { method: 'GET' as const, path: '/api/servers' as const, responses: { 200: z.array(z.custom<ServerResponse>()) } },
    get: { method: 'GET' as const, path: '/api/servers/:id' as const, responses: { 200: z.custom<ServerResponse>(), 404: errorSchemas.notFound } },
  },
  settings: {
    update: { method: 'PATCH' as const, path: '/api/servers/:serverId/settings' as const, input: insertSettingsSchema.partial(), responses: { 200: z.any(), 400: errorSchemas.validation, 404: errorSchemas.notFound } },
  },
  commands: {
    list: { method: 'GET' as const, path: '/api/servers/:serverId/commands' as const, responses: { 200: z.array(z.any()) } },
    create: { method: 'POST' as const, path: '/api/servers/:serverId/commands' as const, input: insertCommandSchema, responses: { 201: z.any(), 400: errorSchemas.validation } },
    update: { method: 'PATCH' as const, path: '/api/commands/:id' as const, input: insertCommandSchema.partial(), responses: { 200: z.any(), 400: errorSchemas.validation } },
    delete: { method: 'DELETE' as const, path: '/api/commands/:id' as const, responses: { 204: z.void(), 404: errorSchemas.notFound } },
  },
  embeds: {
    list: { method: 'GET' as const, path: '/api/servers/:serverId/embeds' as const, responses: { 200: z.array(z.custom<Embed>()) } },
    create: { method: 'POST' as const, path: '/api/servers/:serverId/embeds' as const, input: insertEmbedSchema, responses: { 201: z.custom<Embed>(), 400: errorSchemas.validation } },
    update: { method: 'PATCH' as const, path: '/api/embeds/:id' as const, input: insertEmbedSchema.partial(), responses: { 200: z.custom<Embed>(), 400: errorSchemas.validation } },
    delete: { method: 'DELETE' as const, path: '/api/embeds/:id' as const, responses: { 204: z.void(), 404: errorSchemas.notFound } },
  },
  channelSettings: {
    list: { method: 'GET' as const, path: '/api/servers/:serverId/channels' as const, responses: { 200: z.array(z.any()) } },
    upsert: { method: 'PUT' as const, path: '/api/servers/:serverId/channels' as const, input: insertChannelSettingsSchema, responses: { 200: z.any(), 400: errorSchemas.validation } },
    delete: { method: 'DELETE' as const, path: '/api/channels/:id' as const, responses: { 204: z.void() } },
  },
  reactionRoles: {
    list: { method: 'GET' as const, path: '/api/servers/:serverId/reaction-roles' as const, responses: { 200: z.array(z.any()) } },
    create: { method: 'POST' as const, path: '/api/servers/:serverId/reaction-roles' as const, input: insertReactionRoleSchema, responses: { 201: z.any(), 400: errorSchemas.validation } },
    delete: { method: 'DELETE' as const, path: '/api/reaction-roles/:id' as const, responses: { 204: z.void() } },
  },
  autoRoles: {
    list: { method: 'GET' as const, path: '/api/servers/:serverId/auto-roles' as const, responses: { 200: z.array(z.any()) } },
    create: { method: 'POST' as const, path: '/api/servers/:serverId/auto-roles' as const, input: insertAutoRoleSchema, responses: { 201: z.any(), 400: errorSchemas.validation } },
    delete: { method: 'DELETE' as const, path: '/api/auto-roles/:id' as const, responses: { 204: z.void() } },
  },
  warnings: {
    list: { method: 'GET' as const, path: '/api/servers/:serverId/warnings' as const, responses: { 200: z.array(z.any()) } },
    create: { method: 'POST' as const, path: '/api/servers/:serverId/warnings' as const, input: insertWarningSchema, responses: { 201: z.any(), 400: errorSchemas.validation } },
    delete: { method: 'DELETE' as const, path: '/api/warnings/:id' as const, responses: { 204: z.void() } },
    clear: { method: 'DELETE' as const, path: '/api/servers/:serverId/warnings/user/:userId' as const, responses: { 204: z.void() } },
  },
  punishments: {
    list: { method: 'GET' as const, path: '/api/servers/:serverId/punishments' as const, responses: { 200: z.array(z.any()) } },
    upsert: { method: 'PUT' as const, path: '/api/servers/:serverId/punishments' as const, input: insertPunishmentConfigSchema, responses: { 200: z.any(), 400: errorSchemas.validation } },
    delete: { method: 'DELETE' as const, path: '/api/punishments/:id' as const, responses: { 204: z.void() } },
  },
  leveling: {
    get: { method: 'GET' as const, path: '/api/servers/:serverId/leveling' as const, responses: { 200: z.any() } },
    upsert: { method: 'PUT' as const, path: '/api/servers/:serverId/leveling' as const, input: insertLevelingConfigSchema, responses: { 200: z.any(), 400: errorSchemas.validation } },
  },
  starboard: {
    get: { method: 'GET' as const, path: '/api/servers/:serverId/starboard' as const, responses: { 200: z.any() } },
    upsert: { method: 'PUT' as const, path: '/api/servers/:serverId/starboard' as const, input: insertStarboardConfigSchema, responses: { 200: z.any(), 400: errorSchemas.validation } },
  },
  tickets: {
    getConfig: { method: 'GET' as const, path: '/api/servers/:serverId/tickets/config' as const, responses: { 200: z.any() } },
    upsertConfig: { method: 'PUT' as const, path: '/api/servers/:serverId/tickets/config' as const, input: insertTicketConfigSchema, responses: { 200: z.any(), 400: errorSchemas.validation } },
    listPanels: { method: 'GET' as const, path: '/api/servers/:serverId/tickets/panels' as const, responses: { 200: z.array(z.any()) } },
    createPanel: { method: 'POST' as const, path: '/api/servers/:serverId/tickets/panels' as const, input: insertTicketPanelSchema, responses: { 201: z.any(), 400: errorSchemas.validation } },
    deletePanel: { method: 'DELETE' as const, path: '/api/ticket-panels/:id' as const, responses: { 204: z.void() } },
  },
  scheduledMessages: {
    list: { method: 'GET' as const, path: '/api/servers/:serverId/scheduled-messages' as const, responses: { 200: z.array(z.any()) } },
    create: { method: 'POST' as const, path: '/api/servers/:serverId/scheduled-messages' as const, input: insertScheduledMessageSchema, responses: { 201: z.any(), 400: errorSchemas.validation } },
    update: { method: 'PATCH' as const, path: '/api/scheduled-messages/:id' as const, input: insertScheduledMessageSchema.partial(), responses: { 200: z.any(), 400: errorSchemas.validation } },
    delete: { method: 'DELETE' as const, path: '/api/scheduled-messages/:id' as const, responses: { 204: z.void() } },
  },
  auditLog: {
    get: { method: 'GET' as const, path: '/api/servers/:serverId/audit-log' as const, responses: { 200: z.any() } },
    upsert: { method: 'PUT' as const, path: '/api/servers/:serverId/audit-log' as const, input: insertAuditLogConfigSchema, responses: { 200: z.any(), 400: errorSchemas.validation } },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type DashboardStatsResponse = z.infer<typeof dashboardStatsSchema>;
export type ServerWithRelations = ServerResponse;
export type UpdateSettingsInput = z.infer<typeof api.settings.update.input>;
export type CreateCommandInput = z.infer<typeof api.commands.create.input>;
export type UpdateCommandInput = z.infer<typeof api.commands.update.input>;
export type CreateEmbedInput = z.infer<typeof api.embeds.create.input>;
export type UpdateEmbedInput = z.infer<typeof api.embeds.update.input>;
