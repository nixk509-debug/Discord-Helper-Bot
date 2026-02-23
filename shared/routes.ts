import { z } from 'zod';
import { insertServerSchema, insertSettingsSchema, insertCommandSchema, insertEmbedSchema, servers, serverSettings, customCommands, embeds, type Embed } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

// Response models that include relations
const serverWithRelationsSchema = z.custom<typeof servers.$inferSelect>().and(z.object({
  settings: z.custom<typeof serverSettings.$inferSelect>().optional(),
  customCommands: z.array(z.custom<typeof customCommands.$inferSelect>()).optional(),
  embeds: z.array(z.custom<Embed>()).optional()
}));

const dashboardStatsSchema = z.object({
  totalServers: z.number(),
  totalMembers: z.number(),
  commandsExecuted: z.number(),
  uptime: z.string(),
});

export const api = {
  stats: {
    get: {
      method: 'GET' as const,
      path: '/api/stats' as const,
      responses: {
        200: dashboardStatsSchema,
      },
    },
  },
  servers: {
    list: {
      method: 'GET' as const,
      path: '/api/servers' as const,
      responses: {
        200: z.array(serverWithRelationsSchema),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/servers/:id' as const,
      responses: {
        200: serverWithRelationsSchema,
        404: errorSchemas.notFound,
      },
    },
  },
  settings: {
    update: {
      method: 'PATCH' as const,
      path: '/api/servers/:serverId/settings' as const,
      input: insertSettingsSchema.partial(),
      responses: {
        200: z.custom<typeof serverSettings.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
  },
  commands: {
    list: {
      method: 'GET' as const,
      path: '/api/servers/:serverId/commands' as const,
      responses: {
        200: z.array(z.custom<typeof customCommands.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/servers/:serverId/commands' as const,
      input: insertCommandSchema,
      responses: {
        201: z.custom<typeof customCommands.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/commands/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    }
  },
  embeds: {
    list: {
      method: 'GET' as const,
      path: '/api/servers/:serverId/embeds' as const,
      responses: {
        200: z.array(z.custom<Embed>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/servers/:serverId/embeds' as const,
      input: insertEmbedSchema,
      responses: {
        201: z.custom<Embed>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/embeds/:id' as const,
      input: insertEmbedSchema.partial(),
      responses: {
        200: z.custom<Embed>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/embeds/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    }
  }
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
export type ServerWithRelations = z.infer<typeof serverWithRelationsSchema>;
export type UpdateSettingsInput = z.infer<typeof api.settings.update.input>;
export type CreateCommandInput = z.infer<typeof api.commands.create.input>;
export type EmbedType = Embed;
export type CreateEmbedInput = z.infer<typeof api.embeds.create.input>;
export type UpdateEmbedInput = z.infer<typeof api.embeds.update.input>;