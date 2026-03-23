import { z } from 'zod';
import {
  insertSettingsSchema, insertCommandSchema, insertEmbedSchema,
  insertChannelSettingsSchema, insertReactionRoleSchema, insertAutoRoleSchema,
  insertWarningSchema, insertPunishmentConfigSchema, insertLevelingConfigSchema,
  insertStarboardConfigSchema, insertTicketConfigSchema, insertTicketPanelSchema,
  insertScheduledMessageSchema, insertAuditLogConfigSchema,
  type CustomCommand, type CustomCommandV2Record, type Embed, type ServerResponse, type StudioDocumentRecord, type StudioLibraryCategory, type StudioLibraryItem, type StudioLibraryScope, type StudioPublication,
} from './schema';
import {
  customCommandV2CompiledSchema,
  createCustomCommandV2InputSchema,
  customCommandV2DefinitionSchema,
  customCommandV2DryRunInputSchema,
  customCommandV2ImportCreateRequestSchema,
  customCommandV2ImportPreviewRequestSchema,
  customCommandV2ImportPreviewResponseSchema,
  customCommandV2PreviewSchema,
  updateCustomCommandV2InputSchema,
} from "./custom-command-v2";
import {
  siteEditorPublishResponseSchema,
  siteEditorSaveDraftRequestSchema,
  siteEditorSurfaceDocumentSchema,
  siteEditorSurfaceKeySchema,
  siteEditorSurfaceStateSchema,
} from "./site-editor";

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
};

const dashboardStatsSchema = z.object({
  totalServers: z.number(),
  totalMembers: z.number(),
  commandsExecuted: z.number(),
  uptime: z.string().optional(),
  botReady: z.boolean().optional(),
  bot: z.object({
    ready: z.boolean(),
    processStatus: z.enum(["online", "offline"]),
    uptimeMs: z.number().nullable(),
    uptimeHuman: z.string(),
    guildCount: z.number(),
    gatewayPingMs: z.number().nullable(),
    lastHeartbeatAt: z.string().nullable(),
    wsStatus: z.string(),
  }).optional(),
});

const botStatusSchema = z.object({
  ready: z.boolean(),
  uptimeMs: z.number().nullable(),
  guildCount: z.number(),
  gatewayPingMs: z.number().nullable(),
  lastHeartbeatAt: z.string().nullable(),
  startedAt: z.string().nullable(),
  wsStatus: z.string(),
});

const commandActivitySchema = z.object({
  id: z.string(),
  guildId: z.string(),
  guildName: z.string(),
  commandPath: z.string(),
  actorId: z.string(),
  actorTag: z.string(),
  status: z.enum(["success", "failure"]),
  summary: z.string(),
  durationMs: z.number(),
  createdAt: z.string(),
});

const commandFailureSchema = commandActivitySchema.extend({
  code: z.string(),
  message: z.string(),
});

const workspaceOverviewSchema = z.object({
  server: z.object({
    id: z.number(),
    discordId: z.string(),
    name: z.string(),
    iconUrl: z.string().nullable(),
    memberCount: z.number(),
    channelCount: z.number(),
    roleCount: z.number(),
    ownerId: z.string(),
  }),
  bot: botStatusSchema,
  metrics: z.object({
    totalChannels: z.number(),
    totalRoles: z.number(),
    recentCommands: z.number(),
    recentFailures: z.number(),
  }),
  commandUsage: z.array(z.object({
    command: z.string(),
    count: z.number(),
  })),
  recentActivity: z.array(commandActivitySchema),
  recentFailures: z.array(commandFailureSchema),
});

const commandLogsSchema = z.object({
  activity: z.array(commandActivitySchema),
  failures: z.array(commandFailureSchema),
});

const discordContextSchema = z.object({
  guildId: z.string(),
  guildName: z.string(),
  memberCount: z.number(),
  channels: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    typeName: z.string().optional(),
    parentId: z.string().nullable(),
    position: z.number().optional(),
    isTextBased: z.boolean().optional(),
    isVoiceBased: z.boolean().optional(),
    isAnnouncement: z.boolean().optional(),
    isForum: z.boolean().optional(),
    isStage: z.boolean().optional(),
    isCategory: z.boolean().optional(),
    isThread: z.boolean().optional(),
    nsfw: z.boolean().optional(),
    topic: z.string().nullable().optional(),
    slowmodeSeconds: z.number().optional(),
    lockedForEveryone: z.boolean().optional(),
  })),
  roles: z.array(z.object({
    id: z.string(),
    name: z.string(),
    color: z.number(),
    position: z.number(),
    managed: z.boolean().optional(),
    mentionable: z.boolean().optional(),
    hoist: z.boolean().optional(),
  })),
  emojis: z.array(z.object({
    id: z.string(),
    name: z.string(),
    animated: z.boolean().optional(),
    available: z.boolean().optional(),
    managed: z.boolean().optional(),
  })).default([]),
});

const applyChannelLiveChangesSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  parentId: z.string().nullable().optional(),
  positionMove: z.enum(["up", "down", "top", "bottom"]).optional(),
  topic: z.string().max(1024).nullable().optional(),
  nsfw: z.boolean().optional(),
  slowmode: z.number().int().min(0).max(21600).optional(),
  lockedDown: z.boolean().optional(),
});

const applyChannelLiveChangesResponseSchema = z.object({
  channelId: z.string(),
  channelName: z.string(),
  applied: z.array(z.object({
    field: z.string(),
    value: z.string(),
  })),
  ignored: z.array(z.string()),
});

const createLiveChannelSchema = z.object({
  name: z.string().min(1).max(100),
  kind: z.enum(["category", "text", "voice", "announcement", "forum", "stage"]),
  parentId: z.string().nullable().optional(),
  topic: z.string().max(1024).nullable().optional(),
});

const createLiveChannelResponseSchema = z.object({
  channelId: z.string(),
  channelName: z.string(),
  typeName: z.string(),
});


const sendEmbedSchema = z.object({
  channelId: z.string().min(1),
});

const optionalStringInput = z.preprocess((value) => value == null ? undefined : value, z.string().optional());

const studioDocumentInputSchema = z.object({
  scope: z.enum(["server", "personal", "starter"]).default("server"),
  kind: z.enum(["surface", "template", "divider_preset", "style_block", "theme_pack"]).default("surface"),
  name: z.string().min(1),
  slug: optionalStringInput,
  moduleBinding: optionalStringInput,
  document: z.any(),
  isArchived: z.boolean().optional(),
});

const studioPublishSchema = z.object({
  documentId: z.number().optional(),
  document: z.any().optional(),
  allowDowngrade: z.boolean().optional(),
  target: z.object({
    channelId: z.string().min(1),
    messageId: optionalStringInput,
    viewId: optionalStringInput,
  }),
});

const studioTestSchema = z.object({
  documentId: z.number().optional(),
  document: z.any().optional(),
  target: z.object({
    kind: z.enum(["channel", "dm"]).default("channel"),
    channelId: optionalStringInput,
    viewId: optionalStringInput,
  }),
});

const studioPreflightSchema = z.object({
  documentId: z.number().optional(),
  document: z.any().optional(),
  viewId: optionalStringInput,
});

export const studioEntryIntentSchema = z.enum(["blank", "ticket", "welcome", "verify", "template"]);

const studioLibraryItemInputSchema = z.object({
  scope: z.custom<StudioLibraryScope>().default("personal"),
  category: z.custom<StudioLibraryCategory>(),
  name: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).default({}),
  tags: z.array(z.string()).default([]),
  favorite: z.boolean().optional(),
});

const studioLibraryItemPatchSchema = studioLibraryItemInputSchema.partial();

const studioUploadAssetSchema = z.object({
  name: z.string().min(1).max(120),
  dataUrl: z.string().min(1),
  scope: z.enum(["personal", "server"]).default("personal"),
});

export const api = {
  stats: {
    get: { method: 'GET' as const, path: '/api/stats' as const, responses: { 200: dashboardStatsSchema } },
  },
  bot: {
    status: { method: 'GET' as const, path: '/api/bot/status' as const, responses: { 200: botStatusSchema } },
  },
  servers: {
    list: { method: 'GET' as const, path: '/api/servers' as const, responses: { 200: z.array(z.custom<ServerResponse>()) } },
    get: { method: 'GET' as const, path: '/api/servers/:id' as const, responses: { 200: z.custom<ServerResponse>(), 404: errorSchemas.notFound } },
    discordContext: { method: 'GET' as const, path: '/api/servers/:serverId/discord-context' as const, responses: { 200: discordContextSchema, 404: errorSchemas.notFound } },
    workspaceOverview: { method: 'GET' as const, path: '/api/servers/:serverId/workspace-overview' as const, responses: { 200: workspaceOverviewSchema, 404: errorSchemas.notFound } },
    commandLogs: { method: 'GET' as const, path: '/api/servers/:serverId/command-logs' as const, responses: { 200: commandLogsSchema, 404: errorSchemas.notFound } },
    studioDocuments: {
      list: { method: 'GET' as const, path: '/api/servers/:serverId/studio/documents' as const, responses: { 200: z.array(z.custom<StudioDocumentRecord>()) } },
      create: { method: 'POST' as const, path: '/api/servers/:serverId/studio/documents' as const, input: studioDocumentInputSchema, responses: { 201: z.custom<StudioDocumentRecord>(), 400: errorSchemas.validation } },
    },
    studioPublications: {
      list: { method: 'GET' as const, path: '/api/servers/:serverId/studio/publications' as const, responses: { 200: z.array(z.custom<StudioPublication>()) } },
    },
    studioPublish: {
      preflight: { method: 'POST' as const, path: '/api/servers/:serverId/studio/preflight' as const, input: studioPreflightSchema, responses: { 200: z.any(), 400: errorSchemas.validation, 404: errorSchemas.notFound } },
      publish: { method: 'POST' as const, path: '/api/servers/:serverId/studio/publish' as const, input: studioPublishSchema, responses: { 200: z.any(), 400: errorSchemas.validation, 404: errorSchemas.notFound } },
      test: { method: 'POST' as const, path: '/api/servers/:serverId/studio/test' as const, input: studioTestSchema, responses: { 200: z.any(), 400: errorSchemas.validation, 404: errorSchemas.notFound } },
    },
    studioLibrary: {
      list: { method: 'GET' as const, path: '/api/servers/:serverId/studio/library' as const, responses: { 200: z.array(z.custom<StudioLibraryItem>()) } },
      create: { method: 'POST' as const, path: '/api/servers/:serverId/studio/library' as const, input: studioLibraryItemInputSchema, responses: { 201: z.custom<StudioLibraryItem>(), 400: errorSchemas.validation } },
    },
    studioUploads: {
      create: {
        method: 'POST' as const,
        path: '/api/servers/:serverId/studio/uploads' as const,
        input: studioUploadAssetSchema,
        responses: {
          201: z.object({
            url: z.string().url(),
            name: z.string(),
            libraryItem: z.custom<StudioLibraryItem>(),
          }),
          400: errorSchemas.validation,
        },
      },
    },
  },
  studio: {
    documents: {
      update: { method: 'PATCH' as const, path: '/api/studio/documents/:id' as const, input: studioDocumentInputSchema.partial(), responses: { 200: z.custom<StudioDocumentRecord>(), 404: errorSchemas.notFound } },
      delete: { method: 'DELETE' as const, path: '/api/studio/documents/:id' as const, responses: { 204: z.void(), 404: errorSchemas.notFound } },
    },
    library: {
      update: { method: 'PATCH' as const, path: '/api/studio/library/:id' as const, input: studioLibraryItemPatchSchema, responses: { 200: z.custom<StudioLibraryItem>(), 400: errorSchemas.validation, 404: errorSchemas.notFound } },
      delete: { method: 'DELETE' as const, path: '/api/studio/library/:id' as const, responses: { 204: z.void(), 404: errorSchemas.notFound } },
      favorite: { method: 'PATCH' as const, path: '/api/studio/library/:id/favorite' as const, input: z.object({ favorite: z.boolean() }), responses: { 200: z.custom<StudioLibraryItem>(), 400: errorSchemas.validation, 404: errorSchemas.notFound } },
    },
    publications: {
      clone: { method: 'POST' as const, path: '/api/studio/publications/:id/clone' as const, input: z.object({ channelId: z.string().min(1) }), responses: { 200: z.any(), 404: errorSchemas.notFound } },
      rollback: { method: 'POST' as const, path: '/api/studio/publications/:id/rollback' as const, input: z.object({ snapshotId: z.number() }), responses: { 200: z.any(), 404: errorSchemas.notFound } },
      archive: { method: 'POST' as const, path: '/api/studio/publications/:id/archive' as const, responses: { 200: z.any(), 404: errorSchemas.notFound } },
      status: { method: 'PATCH' as const, path: '/api/studio/publications/:id/status' as const, input: z.object({ active: z.boolean().optional(), status: z.string().optional() }), responses: { 200: z.any(), 404: errorSchemas.notFound } },
    },
  },
  settings: {
    update: { method: 'PATCH' as const, path: '/api/servers/:serverId/settings' as const, input: insertSettingsSchema.partial(), responses: { 200: z.any(), 400: errorSchemas.validation, 404: errorSchemas.notFound } },
  },
  commands: {
    list: { method: 'GET' as const, path: '/api/servers/:serverId/commands' as const, responses: { 200: z.array(z.custom<CustomCommand>()) } },
    create: { method: 'POST' as const, path: '/api/servers/:serverId/commands' as const, input: insertCommandSchema, responses: { 201: z.custom<CustomCommand>(), 400: errorSchemas.validation } },
    update: { method: 'PATCH' as const, path: '/api/commands/:id' as const, input: insertCommandSchema.partial(), responses: { 200: z.custom<CustomCommand>(), 400: errorSchemas.validation } },
    delete: { method: 'DELETE' as const, path: '/api/commands/:id' as const, responses: { 204: z.void(), 404: errorSchemas.notFound } },
  },
  commandWorkflowsV2: {
    list: { method: 'GET' as const, path: '/api/servers/:serverId/commands-v2' as const, responses: { 200: z.array(z.custom<CustomCommandV2Record>()) } },
    create: { method: 'POST' as const, path: '/api/servers/:serverId/commands-v2' as const, input: createCustomCommandV2InputSchema, responses: { 201: z.custom<CustomCommandV2Record>(), 400: errorSchemas.validation } },
    update: { method: 'PATCH' as const, path: '/api/commands-v2/:id' as const, input: updateCustomCommandV2InputSchema, responses: { 200: z.custom<CustomCommandV2Record>(), 400: errorSchemas.validation, 404: errorSchemas.notFound } },
    delete: { method: 'DELETE' as const, path: '/api/commands-v2/:id' as const, responses: { 204: z.void(), 404: errorSchemas.notFound } },
    previewImport: {
      method: 'POST' as const,
      path: '/api/servers/:serverId/commands-v2/import/preview' as const,
      input: customCommandV2ImportPreviewRequestSchema,
      responses: { 200: customCommandV2ImportPreviewResponseSchema, 400: errorSchemas.validation },
    },
    import: {
      method: 'POST' as const,
      path: '/api/servers/:serverId/commands-v2/import' as const,
      input: customCommandV2ImportCreateRequestSchema,
      responses: {
        201: z.object({
          command: z.custom<CustomCommandV2Record>(),
          preview: customCommandV2PreviewSchema,
        }),
        400: errorSchemas.validation,
      },
    },
    dryRun: {
      method: 'POST' as const,
      path: '/api/servers/:serverId/commands-v2/dry-run' as const,
      input: customCommandV2DryRunInputSchema,
      responses: {
        200: z.object({
          ok: z.boolean(),
          issues: z.array(z.object({
            path: z.string(),
            code: z.string(),
            message: z.string(),
            severity: z.enum(["error", "warning"]),
            suggestedFix: z.string().optional(),
          })),
          preview: customCommandV2PreviewSchema,
          compiled: customCommandV2CompiledSchema,
          outputs: z.array(z.object({
            kind: z.string(),
            summary: z.string(),
            payload: z.any().optional(),
          })),
          trace: z.array(z.object({
            stepId: z.string(),
            stepType: z.string(),
            status: z.enum(["skipped", "completed", "failed"]),
            summary: z.string(),
          })),
          variables: z.record(z.string(), z.any()),
        }),
        400: errorSchemas.validation,
      },
    },
    template: {
      method: 'GET' as const,
      path: '/api/servers/:serverId/commands-v2/template' as const,
      responses: { 200: customCommandV2DefinitionSchema },
    },
  },
  siteEditor: {
    published: {
      get: {
        method: "GET" as const,
        path: "/api/site-content/:surface" as const,
        responses: {
          200: siteEditorSurfaceDocumentSchema,
          404: errorSchemas.notFound,
        },
      },
    },
    admin: {
      list: {
        method: "GET" as const,
        path: "/api/site-editor/surfaces" as const,
        responses: { 200: z.array(siteEditorSurfaceStateSchema) },
      },
      get: {
        method: "GET" as const,
        path: "/api/site-editor/surfaces/:surface" as const,
        responses: {
          200: siteEditorSurfaceStateSchema,
          404: errorSchemas.notFound,
        },
      },
      saveDraft: {
        method: "PUT" as const,
        path: "/api/site-editor/surfaces/:surface/draft" as const,
        input: siteEditorSaveDraftRequestSchema,
        responses: {
          200: siteEditorSurfaceStateSchema,
          400: errorSchemas.validation,
          404: errorSchemas.notFound,
        },
      },
      publish: {
        method: "POST" as const,
        path: "/api/site-editor/surfaces/:surface/publish" as const,
        responses: {
          200: siteEditorPublishResponseSchema,
          404: errorSchemas.notFound,
        },
      },
      resetDraft: {
        method: "POST" as const,
        path: "/api/site-editor/surfaces/:surface/reset" as const,
        responses: {
          200: siteEditorSurfaceStateSchema,
          404: errorSchemas.notFound,
        },
      },
    },
  },
  embeds: {
    list: { method: 'GET' as const, path: '/api/servers/:serverId/embeds' as const, responses: { 200: z.array(z.custom<Embed>()) } },
    create: { method: 'POST' as const, path: '/api/servers/:serverId/embeds' as const, input: insertEmbedSchema, responses: { 201: z.custom<Embed>(), 400: errorSchemas.validation } },
    update: { method: 'PATCH' as const, path: '/api/embeds/:id' as const, input: insertEmbedSchema.partial(), responses: { 200: z.custom<Embed>(), 400: errorSchemas.validation } },
    send: {
      method: 'POST' as const,
      path: '/api/servers/:serverId/embeds/:id/send' as const,
      input: sendEmbedSchema,
      responses: {
        200: z.object({ messageId: z.string(), channelId: z.string() }),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: { method: 'DELETE' as const, path: '/api/embeds/:id' as const, responses: { 204: z.void(), 404: errorSchemas.notFound } },
  },
  channelSettings: {
    list: { method: 'GET' as const, path: '/api/servers/:serverId/channels' as const, responses: { 200: z.array(z.any()) } },
    upsert: { method: 'PUT' as const, path: '/api/servers/:serverId/channels' as const, input: insertChannelSettingsSchema, responses: { 200: z.any(), 400: errorSchemas.validation } },
    createLive: { method: 'POST' as const, path: '/api/servers/:serverId/channels/create-live' as const, input: createLiveChannelSchema, responses: { 200: createLiveChannelResponseSchema, 400: errorSchemas.validation, 404: errorSchemas.notFound } },
    applyLive: { method: 'POST' as const, path: '/api/servers/:serverId/channels/:channelId/apply-live' as const, input: applyChannelLiveChangesSchema, responses: { 200: applyChannelLiveChangesResponseSchema, 400: errorSchemas.validation, 404: errorSchemas.notFound } },
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
    updatePanel: { method: 'PATCH' as const, path: '/api/ticket-panels/:id' as const, input: insertTicketPanelSchema.partial(), responses: { 200: z.any(), 400: errorSchemas.validation } },
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
export type SendEmbedInput = z.infer<typeof api.embeds.send.input>;
export type DiscordContext = z.infer<typeof discordContextSchema>;
export type StudioEntryIntentQuery = z.infer<typeof studioEntryIntentSchema>;
export type StudioDocumentInput = z.infer<typeof studioDocumentInputSchema>;
export type StudioPublishInput = z.infer<typeof studioPublishSchema>;
export type StudioTestInput = z.infer<typeof studioTestSchema>;
export type StudioLibraryItemInput = z.infer<typeof studioLibraryItemInputSchema>;
export type StudioUploadAssetInput = z.infer<typeof studioUploadAssetSchema>;
export type SiteEditorSurfaceInput = z.infer<typeof siteEditorSaveDraftRequestSchema>;
export type SiteEditorSurfaceParam = z.infer<typeof siteEditorSurfaceKeySchema>;
