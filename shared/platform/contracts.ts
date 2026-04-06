import { z } from "zod";

export const platformModuleIdSchema = z.enum([
  "platform",
  "commands",
  "studio",
  "community",
  "operations",
  "integrations",
  "billing",
]);

export const platformEntityKindSchema = z.enum([
  "command",
  "workflow",
  "studio_document",
  "studio_publication",
  "template",
  "variable",
  "permission_rule",
  "integration",
  "webhook",
  "server_setting",
  "community_module",
]);

export const platformPublishStateSchema = z.enum([
  "draft",
  "review",
  "scheduled",
  "live",
  "paused",
  "archived",
  "rolled_back",
]);

export const platformVariableScopeSchema = z.enum([
  "execution",
  "member",
  "channel",
  "server",
  "global",
]);

export const platformPermissionScopeSchema = z.enum([
  "platform",
  "module",
  "entity",
  "action",
]);

export const platformPermissionSubjectTypeSchema = z.enum([
  "owner",
  "admin",
  "manager",
  "moderator",
  "member",
  "role",
  "user",
  "system",
]);

export const platformActorTypeSchema = z.enum([
  "user",
  "system",
  "workflow",
  "integration",
  "schedule",
]);

export const platformEventStatusSchema = z.enum([
  "received",
  "matched",
  "queued",
  "started",
  "succeeded",
  "failed",
  "retried",
  "cancelled",
]);

export const platformEventNameSchema = z.enum([
  "discord.member.join",
  "discord.member.leave",
  "discord.member.update",
  "discord.message.create",
  "discord.message.edit",
  "discord.message.delete",
  "discord.reaction.add",
  "discord.reaction.remove",
  "discord.role.add",
  "discord.role.remove",
  "discord.channel.create",
  "discord.channel.delete",
  "discord.voice.join",
  "discord.voice.leave",
  "archivist.command.executed",
  "archivist.workflow.completed",
  "archivist.workflow.failed",
  "archivist.design.updated",
  "archivist.design.published",
  "archivist.verification.success",
  "archivist.verification.failed",
  "archivist.booster.added",
  "archivist.booster.removed",
  "archivist.game.started",
  "archivist.game.completed",
  "archivist.achievement.unlocked",
  "external.webhook.received",
  "external.integration.succeeded",
  "external.integration.failed",
]);

export const platformActorSchema = z.object({
  type: platformActorTypeSchema,
  id: z.string().min(1).optional(),
  displayName: z.string().min(1).optional(),
});

export const platformEntityRefSchema = z.object({
  kind: platformEntityKindSchema,
  id: z.string().min(1),
  module: platformModuleIdSchema,
  serverId: z.number().int().positive().optional(),
  publishState: platformPublishStateSchema.optional(),
});

export const platformPermissionSubjectSchema = z.object({
  type: platformPermissionSubjectTypeSchema,
  id: z.string().min(1).optional(),
  label: z.string().min(1).optional(),
});

export const platformPermissionTargetSchema = z.object({
  scope: platformPermissionScopeSchema,
  module: platformModuleIdSchema,
  entityKind: platformEntityKindSchema.optional(),
  action: z.string().min(1).optional(),
});

export const platformVariableRefSchema = z.object({
  key: z.string().min(1),
  scope: platformVariableScopeSchema,
  serverId: z.number().int().positive().optional(),
  ownerId: z.string().min(1).optional(),
  ttlSeconds: z.number().int().positive().optional(),
});

export const platformMutationRecordSchema = z.object({
  mutationId: z.string().min(1),
  serverId: z.number().int().positive(),
  module: platformModuleIdSchema,
  entity: platformEntityRefSchema,
  action: z.string().min(1),
  actor: platformActorSchema,
  summary: z.string().min(1),
  changedKeys: z.array(z.string()).default([]),
  before: z.unknown().optional(),
  after: z.unknown().optional(),
  createdAt: z.string().datetime(),
});

export const platformEventRecordSchema = z.object({
  eventId: z.string().min(1),
  eventName: platformEventNameSchema,
  status: platformEventStatusSchema,
  module: platformModuleIdSchema,
  serverId: z.number().int().positive().optional(),
  entity: platformEntityRefSchema.optional(),
  actor: platformActorSchema.optional(),
  relatedMutationId: z.string().min(1).optional(),
  durationMs: z.number().int().nonnegative().optional(),
  summary: z.string().min(1),
  errorCode: z.string().min(1).optional(),
  errorMessage: z.string().min(1).optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.string().datetime(),
});

export type PlatformModuleId = z.infer<typeof platformModuleIdSchema>;
export type PlatformEntityKind = z.infer<typeof platformEntityKindSchema>;
export type PlatformPublishState = z.infer<typeof platformPublishStateSchema>;
export type PlatformVariableScope = z.infer<typeof platformVariableScopeSchema>;
export type PlatformPermissionScope = z.infer<typeof platformPermissionScopeSchema>;
export type PlatformPermissionSubjectType = z.infer<typeof platformPermissionSubjectTypeSchema>;
export type PlatformActorType = z.infer<typeof platformActorTypeSchema>;
export type PlatformEventStatus = z.infer<typeof platformEventStatusSchema>;
export type PlatformEventName = z.infer<typeof platformEventNameSchema>;
export type PlatformActor = z.infer<typeof platformActorSchema>;
export type PlatformEntityRef = z.infer<typeof platformEntityRefSchema>;
export type PlatformPermissionSubject = z.infer<typeof platformPermissionSubjectSchema>;
export type PlatformPermissionTarget = z.infer<typeof platformPermissionTargetSchema>;
export type PlatformVariableRef = z.infer<typeof platformVariableRefSchema>;
export type PlatformMutationRecord = z.infer<typeof platformMutationRecordSchema>;
export type PlatformEventRecord = z.infer<typeof platformEventRecordSchema>;
