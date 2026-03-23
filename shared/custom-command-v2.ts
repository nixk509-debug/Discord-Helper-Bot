import { z } from "zod";
import {
  normalizeCustomCommandV2ImportText,
} from "./custom-command-v2-import-normalize";

export const CUSTOM_COMMAND_V2_SCHEMA_VERSION = 1 as const;
const strictObject = <T extends z.ZodRawShape>(shape: T) => z.object(shape).strict();
const stepIdSchema = z.string().min(1).max(80).regex(/^[a-zA-Z0-9:_-]+$/, "Step IDs can use letters, numbers, :, _, and -.");
const variableKeySchema = z.string().min(1).max(64).regex(/^[a-zA-Z][a-zA-Z0-9_.-]*$/, "Variable keys must start with a letter.");
const optionalTrimmedString = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : value),
  z.string().min(1).optional(),
);

export const customCommandV2TriggerTypeSchema = z.enum([
  "slash",
  "keyword",
  "button",
  "select",
  "modal_submit",
  "schedule",
  "join",
  "role_add",
  "reaction",
]);

export const customCommandV2ScalarSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
export const customCommandV2JsonValueSchema: z.ZodType<CustomCommandV2JsonValue> = z.lazy(() =>
  z.union([
    customCommandV2ScalarSchema,
    z.array(customCommandV2JsonValueSchema),
    z.record(z.string(), customCommandV2JsonValueSchema),
  ]),
);

export const customCommandV2OperandSchema = z.discriminatedUnion("source", [
  strictObject({
    source: z.literal("literal"),
    value: customCommandV2JsonValueSchema,
  }),
  strictObject({
    source: z.literal("variable"),
    key: variableKeySchema,
  }),
  strictObject({
    source: z.literal("context"),
    key: z.string().min(1).max(120),
  }),
]);

export const customCommandV2ConditionSchema = strictObject({
  left: customCommandV2OperandSchema,
  operator: z.enum([
    "eq",
    "neq",
    "contains",
    "gt",
    "gte",
    "lt",
    "lte",
    "truthy",
    "falsy",
    "includes_any",
  ]),
  right: customCommandV2OperandSchema.optional(),
  caseSensitive: z.boolean().default(false),
});

export const customCommandV2EmbedFieldSchema = strictObject({
  name: z.string().min(1).max(256),
  value: z.string().min(1).max(1024),
  inline: z.boolean().default(false),
});

export const customCommandV2EmbedSchema = strictObject({
  title: z.string().max(256).optional(),
  description: z.string().max(4096).optional(),
  url: z.string().url().optional(),
  color: z.string().regex(/^#?[0-9a-fA-F]{6}$/).optional(),
  imageUrl: z.string().url().optional(),
  thumbnailUrl: z.string().url().optional(),
  footerText: z.string().max(2048).optional(),
  footerIconUrl: z.string().url().optional(),
  authorName: z.string().max(256).optional(),
  authorUrl: z.string().url().optional(),
  authorIconUrl: z.string().url().optional(),
  fields: z.array(customCommandV2EmbedFieldSchema).max(25).default([]),
});

const accessArraySchema = z.array(z.string().min(1).max(64)).default([]);

export const customCommandV2AccessSchema = strictObject({
  mode: z.enum(["allow_all", "restricted"]).default("allow_all"),
  allowedRoleIds: accessArraySchema,
  blockedRoleIds: accessArraySchema,
  allowedChannelIds: accessArraySchema,
  blockedChannelIds: accessArraySchema,
  requiredPermissions: accessArraySchema,
  ownerOnly: z.boolean().default(false),
  premiumOnly: z.boolean().default(false),
});

export const customCommandV2BehaviorSchema = strictObject({
  enabled: z.boolean().default(true),
  cooldownSeconds: z.number().int().min(0).max(86_400).default(0),
  cooldownScope: z.enum(["user", "channel", "server", "global"]).default("user"),
  defaultEphemeral: z.boolean().default(false),
  deleteInvocation: z.boolean().default(false),
  logRuns: z.boolean().default(true),
});

export const customCommandV2VariableDeclarationSchema = strictObject({
  key: variableKeySchema,
  label: z.string().min(1).max(80),
  description: z.string().max(240).optional(),
  scope: z.enum(["execution", "server", "user", "session"]).default("execution"),
  dataType: z.enum(["string", "number", "boolean", "json"]).default("string"),
  initialValue: customCommandV2JsonValueSchema.optional(),
});

export const customCommandV2UiSchema = strictObject({
  mode: z.enum(["simple", "workflow"]).default("simple"),
  advancedSections: z.array(z.string().min(1).max(48)).default([]),
  starterTemplate: z.string().max(80).optional(),
});

export const customCommandV2FallbacksSchema = strictObject({
  permissionDeniedMessage: z.string().max(4000).optional(),
  cooldownMessage: z.string().max(4000).optional(),
  runtimeErrorMessage: z.string().max(4000).optional(),
  emptyStateMessage: z.string().max(4000).optional(),
});

export const customCommandV2ButtonSchema = strictObject({
  id: stepIdSchema,
  label: z.string().min(1).max(80),
  customId: z.string().min(1).max(100),
  style: z.enum(["primary", "secondary", "success", "danger", "link"]).default("primary"),
  url: z.string().url().optional(),
  nextStepId: stepIdSchema.optional(),
});

export const customCommandV2SelectOptionSchema = strictObject({
  label: z.string().min(1).max(100),
  value: z.string().min(1).max(100),
  description: z.string().max(100).optional(),
  emoji: z.string().max(60).optional(),
  nextStepId: stepIdSchema.optional(),
});

export const customCommandV2ModalFieldSchema = strictObject({
  id: variableKeySchema,
  label: z.string().min(1).max(45),
  style: z.enum(["short", "paragraph"]).default("short"),
  placeholder: z.string().max(100).optional(),
  required: z.boolean().default(true),
  minLength: z.number().int().min(0).max(4_000).optional(),
  maxLength: z.number().int().min(1).max(4_000).optional(),
});

const baseStepSchema = strictObject({
  id: stepIdSchema,
  label: z.string().min(1).max(80).optional(),
  description: z.string().max(240).optional(),
});

export const customCommandV2WorkflowStepSchema = z.discriminatedUnion("type", [
  baseStepSchema.extend({
    type: z.literal("send_message"),
    content: z.string().max(4000).default(""),
    channelTarget: z.enum(["current", "dm", "configured"]).default("current"),
    channelId: optionalTrimmedString,
    mentionUser: z.boolean().default(false),
    nextStepId: stepIdSchema.optional(),
    onFailureStepId: stepIdSchema.optional(),
  }),
  baseStepSchema.extend({
    type: z.literal("send_embed"),
    embed: customCommandV2EmbedSchema,
    channelTarget: z.enum(["current", "dm", "configured"]).default("current"),
    channelId: optionalTrimmedString,
    nextStepId: stepIdSchema.optional(),
    onFailureStepId: stepIdSchema.optional(),
  }),
  baseStepSchema.extend({
    type: z.literal("reply_ephemeral"),
    content: z.string().max(4000).default(""),
    embed: customCommandV2EmbedSchema.optional(),
    nextStepId: stepIdSchema.optional(),
  }),
  baseStepSchema.extend({
    type: z.literal("add_button_row"),
    responseMode: z.enum(["reply", "followup", "edit"]).default("reply"),
    buttons: z.array(customCommandV2ButtonSchema).min(1).max(5),
    nextStepId: stepIdSchema.optional(),
  }),
  baseStepSchema.extend({
    type: z.literal("add_select_menu"),
    customId: z.string().min(1).max(100),
    placeholder: z.string().max(100).optional(),
    minValues: z.number().int().min(1).max(25).default(1),
    maxValues: z.number().int().min(1).max(25).default(1),
    options: z.array(customCommandV2SelectOptionSchema).min(1).max(25),
    nextStepId: stepIdSchema.optional(),
  }),
  baseStepSchema.extend({
    type: z.literal("on_button_click"),
    customIds: z.array(z.string().min(1).max(100)).min(1).default([]),
    timeoutSeconds: z.number().int().min(5).max(86_400).default(900),
    nextStepId: stepIdSchema,
    onTimeoutStepId: stepIdSchema.optional(),
  }),
  baseStepSchema.extend({
    type: z.literal("on_select"),
    customId: z.string().min(1).max(100),
    acceptedValues: z.array(z.string().min(1).max(100)).default([]),
    timeoutSeconds: z.number().int().min(5).max(86_400).default(900),
    nextStepId: stepIdSchema,
    onTimeoutStepId: stepIdSchema.optional(),
  }),
  baseStepSchema.extend({
    type: z.literal("open_modal"),
    customId: z.string().min(1).max(100),
    title: z.string().min(1).max(45),
    fields: z.array(customCommandV2ModalFieldSchema).min(1).max(5),
    nextStepId: stepIdSchema.optional(),
    onCancelStepId: stepIdSchema.optional(),
  }),
  baseStepSchema.extend({
    type: z.literal("save_input"),
    source: z.enum(["modal", "select", "button", "slash", "keyword", "context"]),
    inputKey: z.string().min(1).max(80),
    variableKey: variableKeySchema,
    defaultValue: customCommandV2JsonValueSchema.optional(),
    nextStepId: stepIdSchema.optional(),
  }),
  baseStepSchema.extend({
    type: z.literal("set_variable"),
    variableKey: variableKeySchema,
    operation: z.enum(["set", "append", "increment", "decrement"]).default("set"),
    value: customCommandV2OperandSchema,
    nextStepId: stepIdSchema.optional(),
  }),
  baseStepSchema.extend({
    type: z.literal("add_role"),
    roleId: z.string().min(1).max(64),
    target: z.enum(["actor", "target"]).default("actor"),
    nextStepId: stepIdSchema.optional(),
    onFailureStepId: stepIdSchema.optional(),
  }),
  baseStepSchema.extend({
    type: z.literal("remove_role"),
    roleId: z.string().min(1).max(64),
    target: z.enum(["actor", "target"]).default("actor"),
    nextStepId: stepIdSchema.optional(),
    onFailureStepId: stepIdSchema.optional(),
  }),
  baseStepSchema.extend({
    type: z.literal("check_permission"),
    permissions: z.array(z.string().min(1).max(64)).min(1),
    mode: z.enum(["all", "any"]).default("all"),
    onDeniedStepId: stepIdSchema.optional(),
    denialMessage: z.string().max(4000).optional(),
    nextStepId: stepIdSchema.optional(),
  }),
  baseStepSchema.extend({
    type: z.literal("check_cooldown"),
    seconds: z.number().int().min(0).max(86_400).optional(),
    scope: z.enum(["user", "channel", "server", "global"]).optional(),
    onDeniedStepId: stepIdSchema.optional(),
    denialMessage: z.string().max(4000).optional(),
    nextStepId: stepIdSchema.optional(),
  }),
  baseStepSchema.extend({
    type: z.literal("branch_if"),
    condition: customCommandV2ConditionSchema,
    trueStepId: stepIdSchema,
    falseStepId: stepIdSchema.optional(),
  }),
  baseStepSchema.extend({
    type: z.literal("log_action"),
    level: z.enum(["info", "warn", "error"]).default("info"),
    message: z.string().min(1).max(4000),
    nextStepId: stepIdSchema.optional(),
  }),
  baseStepSchema.extend({
    type: z.literal("call_webhook"),
    method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("POST"),
    url: z.string().url(),
    headers: z.record(z.string().min(1).max(64), z.string().max(500)).default({}),
    body: z.record(z.string(), customCommandV2JsonValueSchema).default({}),
    timeoutMs: z.number().int().min(500).max(10_000).default(3_500),
    nextStepId: stepIdSchema.optional(),
    onFailureStepId: stepIdSchema.optional(),
  }),
  baseStepSchema.extend({
    type: z.literal("fallback_response"),
    content: z.string().max(4000).default(""),
    ephemeral: z.boolean().default(false),
    stopAfter: z.boolean().default(true),
    nextStepId: stepIdSchema.optional(),
  }),
]);

export const customCommandV2WorkflowSchema = strictObject({
  entryStepId: stepIdSchema,
  steps: z.array(customCommandV2WorkflowStepSchema).min(1),
});

export const customCommandV2TriggerSchema = z.discriminatedUnion("type", [
  strictObject({
    type: z.literal("slash"),
    name: z.string().min(1).max(32),
    description: z.string().max(100).optional(),
  }),
  strictObject({
    type: z.literal("keyword"),
    pattern: z.string().min(1).max(120),
    aliases: z.array(z.string().min(1).max(120)).default([]),
    matchMode: z.enum(["exact", "starts_with", "contains"]).default("exact"),
    caseSensitive: z.boolean().default(false),
  }),
  strictObject({
    type: z.literal("button"),
    customId: z.string().min(1).max(100),
    channelId: optionalTrimmedString,
    messageId: optionalTrimmedString,
  }),
  strictObject({
    type: z.literal("select"),
    customId: z.string().min(1).max(100),
    acceptedValues: z.array(z.string().min(1).max(100)).default([]),
    channelId: optionalTrimmedString,
    messageId: optionalTrimmedString,
  }),
  strictObject({
    type: z.literal("modal_submit"),
    customId: z.string().min(1).max(100),
  }),
  strictObject({
    type: z.literal("schedule"),
    cron: z.string().min(5).max(120),
    timezone: z.string().min(1).max(80).default("UTC"),
  }),
  strictObject({
    type: z.literal("join"),
  }),
  strictObject({
    type: z.literal("role_add"),
    roleIds: z.array(z.string().min(1).max(64)).default([]),
  }),
  strictObject({
    type: z.literal("reaction"),
    emoji: z.string().min(1).max(120),
    channelId: optionalTrimmedString,
    messageId: optionalTrimmedString,
  }),
]);

export const customCommandV2MetaSchema = strictObject({
  name: z.string().min(1).max(80),
  description: z.string().max(240).optional(),
  category: z.string().max(48).default("utility"),
  tags: z.array(z.string().min(1).max(32)).max(12).default([]),
});

export const customCommandV2DefinitionSchema = strictObject({
  meta: customCommandV2MetaSchema,
  trigger: customCommandV2TriggerSchema,
  access: customCommandV2AccessSchema.default({}),
  behavior: customCommandV2BehaviorSchema.default({}),
  variables: z.array(customCommandV2VariableDeclarationSchema).default([]),
  workflow: customCommandV2WorkflowSchema,
  fallbacks: customCommandV2FallbacksSchema.default({}),
  ui: customCommandV2UiSchema.default({}),
});

export const customCommandV2ImportPayloadSchema = strictObject({
  schemaVersion: z.literal(CUSTOM_COMMAND_V2_SCHEMA_VERSION),
  kind: z.literal("archivist-command"),
  command: customCommandV2DefinitionSchema,
});

export const customCommandV2IssueSchema = strictObject({
  path: z.string().min(1),
  code: z.string().min(1),
  message: z.string().min(1),
  severity: z.enum(["error", "warning"]).default("error"),
  suggestedFix: z.string().optional(),
});

export const customCommandV2ImportNoticeSchema = strictObject({
  code: z.string().min(1),
  title: z.string().min(1),
  detail: z.string().min(1),
  severity: z.enum(["info", "warning"]).default("info"),
});

export const customCommandV2ImportParseLocationSchema = strictObject({
  position: z.number().int().min(0),
  line: z.number().int().min(1),
  column: z.number().int().min(1),
  snippet: z.string().max(240).optional(),
  likelyReason: z.string().max(240).optional(),
  nextSuggestion: z.string().max(320).optional(),
  technicalMessage: z.string().max(320).optional(),
});

export const customCommandV2CompiledSchema = strictObject({
  schemaVersion: z.literal(CUSTOM_COMMAND_V2_SCHEMA_VERSION),
  kind: z.literal("archivist-command-runtime"),
  meta: customCommandV2MetaSchema,
  trigger: customCommandV2TriggerSchema,
  triggerType: customCommandV2TriggerTypeSchema,
  match: strictObject({
    names: z.array(z.string()).default([]),
    customIds: z.array(z.string()).default([]),
    acceptedValues: z.array(z.string()).default([]),
    cron: z.string().optional(),
    timezone: z.string().optional(),
    emoji: z.string().optional(),
  }),
  access: customCommandV2AccessSchema,
  behavior: customCommandV2BehaviorSchema,
  variables: z.array(customCommandV2VariableDeclarationSchema).default([]),
  workflow: strictObject({
    entryStepId: stepIdSchema,
    stepOrder: z.array(stepIdSchema).default([]),
    stepsById: z.record(stepIdSchema, customCommandV2WorkflowStepSchema),
  }),
  fallbacks: customCommandV2FallbacksSchema,
  ui: customCommandV2UiSchema,
});

export const customCommandV2ImportSourceSchema = strictObject({
  kind: z.enum(["manual", "paste-json", "share-code", "template", "dashboard"]),
  raw: z.string().optional(),
  importedAt: z.string().optional(),
  note: z.string().max(240).optional(),
});

export const customCommandV2PreviewSchema = strictObject({
  name: z.string(),
  description: z.string().optional(),
  triggerLabel: z.string(),
  triggerType: customCommandV2TriggerTypeSchema,
  enabled: z.boolean(),
  mode: z.enum(["simple", "workflow"]),
  stepCount: z.number().int().min(0),
  actionCount: z.number().int().min(0),
  conditionCount: z.number().int().min(0),
  advancedStepCount: z.number().int().min(0),
  tags: z.array(z.string()),
  sections: z.array(z.string()),
  permissionSummary: z.string(),
  actionsSummary: z.string(),
  workflowSummary: z.string(),
  fallbackSummary: z.string().optional(),
  whatTriggers: z.string(),
  whatSends: z.string(),
  interactionsSummary: z.string(),
  roleSummary: z.string(),
  successSummary: z.string(),
  failureSummary: z.string(),
  outputPreview: strictObject({
    mode: z.enum(["none", "message", "embed", "message_with_embed", "interaction"]),
    message: z.string().optional(),
    embedTitle: z.string().optional(),
    embedDescription: z.string().optional(),
    buttonLabels: z.array(z.string()).default([]),
    selectOptions: z.array(z.string()).default([]),
    note: z.string().optional(),
  }),
  highlights: z.array(z.string()),
});

export const customCommandV2ImportDiagnosticsSchema = strictObject({
  normalizedText: z.string(),
  extractedText: z.string().nullable(),
  extractedCandidateCount: z.number().int().min(0).default(0),
  notices: z.array(customCommandV2ImportNoticeSchema).default([]),
  wrapperPrefixRemoved: z.boolean().default(false),
  wrapperSuffixRemoved: z.boolean().default(false),
  parseLocation: customCommandV2ImportParseLocationSchema.nullable(),
});

export const customCommandV2ImportPreviewRequestSchema = strictObject({
  raw: z.string().min(1),
  sourceKind: customCommandV2ImportSourceSchema.shape.kind.default("paste-json"),
});

export const customCommandV2ImportPreviewResponseSchema = strictObject({
  ok: z.boolean(),
  importReady: z.boolean(),
  draftReady: z.boolean(),
  issues: z.array(customCommandV2IssueSchema),
  diagnostics: customCommandV2ImportDiagnosticsSchema,
  preview: customCommandV2PreviewSchema.nullable(),
  definition: customCommandV2DefinitionSchema.nullable(),
  compiled: customCommandV2CompiledSchema.nullable(),
});

export const createCustomCommandV2InputSchema = strictObject({
  schemaVersion: z.literal(CUSTOM_COMMAND_V2_SCHEMA_VERSION).default(CUSTOM_COMMAND_V2_SCHEMA_VERSION),
  kind: z.literal("archivist-command").default("archivist-command"),
  definition: customCommandV2DefinitionSchema,
  importSource: customCommandV2ImportSourceSchema.nullish(),
});

export const updateCustomCommandV2InputSchema = createCustomCommandV2InputSchema.partial();

export const customCommandV2ImportCreateRequestSchema = strictObject({
  raw: z.string().min(1),
  sourceKind: customCommandV2ImportSourceSchema.shape.kind.default("paste-json"),
  saveAsDraft: z.boolean().default(false),
});

export const customCommandV2DryRunInputSchema = strictObject({
  definition: customCommandV2DefinitionSchema,
  actor: strictObject({
    id: z.string().optional(),
    username: z.string().optional(),
    tag: z.string().optional(),
    roleIds: z.array(z.string()).default([]),
    permissions: z.array(z.string()).default([]),
    isOwner: z.boolean().default(false),
    isPremium: z.boolean().default(false),
  }).default({ roleIds: [], permissions: [] }),
  channel: strictObject({
    id: z.string().optional(),
    name: z.string().optional(),
  }).default({}),
  input: z.record(z.string(), customCommandV2JsonValueSchema).default({}),
});

export type CustomCommandV2JsonValue =
  | string
  | number
  | boolean
  | null
  | CustomCommandV2JsonValue[]
  | { [key: string]: CustomCommandV2JsonValue };

export type CustomCommandV2TriggerType = z.infer<typeof customCommandV2TriggerTypeSchema>;
export type CustomCommandV2Operand = z.infer<typeof customCommandV2OperandSchema>;
export type CustomCommandV2Condition = z.infer<typeof customCommandV2ConditionSchema>;
export type CustomCommandV2Embed = z.infer<typeof customCommandV2EmbedSchema>;
export type CustomCommandV2Access = z.infer<typeof customCommandV2AccessSchema>;
export type CustomCommandV2Behavior = z.infer<typeof customCommandV2BehaviorSchema>;
export type CustomCommandV2VariableDeclaration = z.infer<typeof customCommandV2VariableDeclarationSchema>;
export type CustomCommandV2Ui = z.infer<typeof customCommandV2UiSchema>;
export type CustomCommandV2Fallbacks = z.infer<typeof customCommandV2FallbacksSchema>;
export type CustomCommandV2WorkflowStep = z.infer<typeof customCommandV2WorkflowStepSchema>;
export type CustomCommandV2Workflow = z.infer<typeof customCommandV2WorkflowSchema>;
export type CustomCommandV2Trigger = z.infer<typeof customCommandV2TriggerSchema>;
export type CustomCommandV2Meta = z.infer<typeof customCommandV2MetaSchema>;
export type CustomCommandV2Definition = z.infer<typeof customCommandV2DefinitionSchema>;
export type CustomCommandV2ImportPayload = z.infer<typeof customCommandV2ImportPayloadSchema>;
export type CustomCommandV2Issue = z.infer<typeof customCommandV2IssueSchema>;
export type CustomCommandV2ImportNotice = z.infer<typeof customCommandV2ImportNoticeSchema>;
export type CustomCommandV2ImportParseLocation = z.infer<typeof customCommandV2ImportParseLocationSchema>;
export type CustomCommandV2Compiled = z.infer<typeof customCommandV2CompiledSchema>;
export type CustomCommandV2ImportSource = z.infer<typeof customCommandV2ImportSourceSchema>;
export type CustomCommandV2Preview = z.infer<typeof customCommandV2PreviewSchema>;
export type CustomCommandV2ImportDiagnostics = z.infer<typeof customCommandV2ImportDiagnosticsSchema>;
export type CreateCustomCommandV2Input = z.infer<typeof createCustomCommandV2InputSchema>;
export type UpdateCustomCommandV2Input = z.infer<typeof updateCustomCommandV2InputSchema>;
export type CustomCommandV2ImportPreviewRequest = z.infer<typeof customCommandV2ImportPreviewRequestSchema>;
export type CustomCommandV2ImportPreviewResponse = z.infer<typeof customCommandV2ImportPreviewResponseSchema>;
export type CustomCommandV2ImportCreateRequest = z.infer<typeof customCommandV2ImportCreateRequestSchema>;
export type CustomCommandV2DryRunInput = z.infer<typeof customCommandV2DryRunInputSchema>;

function normalizeLegacyTrigger(trigger: unknown, description?: string) {
  if (typeof trigger === "object" && trigger) {
    const record = trigger as Record<string, unknown>;
    const type = typeof record.type === "string" ? record.type : null;

    switch (type) {
      case "slash":
        return {
          type: "slash" as const,
          name: typeof record.name === "string" && record.name.trim()
            ? record.name.trim().replace(/\s+/g, "-").toLowerCase()
            : "archivist-command",
          description: typeof record.description === "string" && record.description.trim()
            ? record.description.trim()
            : description || "Imported Archivist command",
        };
      case "keyword":
        return {
          type: "keyword" as const,
          pattern: typeof record.pattern === "string" && record.pattern.trim() ? record.pattern.trim() : "hello archivist",
          aliases: Array.isArray(record.aliases)
            ? record.aliases.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
            : [],
          matchMode: record.matchMode === "starts_with" || record.matchMode === "contains" ? record.matchMode : "exact",
          caseSensitive: Boolean(record.caseSensitive),
        };
      case "button":
        return {
          type: "button" as const,
          customId: typeof record.customId === "string" && record.customId.trim() ? record.customId.trim() : "archivist:button",
          channelId: typeof record.channelId === "string" ? record.channelId.trim() || undefined : undefined,
          messageId: typeof record.messageId === "string" ? record.messageId.trim() || undefined : undefined,
        };
      case "select":
        return {
          type: "select" as const,
          customId: typeof record.customId === "string" && record.customId.trim() ? record.customId.trim() : "archivist:select",
          acceptedValues: Array.isArray(record.acceptedValues)
            ? record.acceptedValues.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
            : [],
          channelId: typeof record.channelId === "string" ? record.channelId.trim() || undefined : undefined,
          messageId: typeof record.messageId === "string" ? record.messageId.trim() || undefined : undefined,
        };
      case "modal_submit":
        return {
          type: "modal_submit" as const,
          customId: typeof record.customId === "string" && record.customId.trim() ? record.customId.trim() : "archivist:modal",
        };
      case "schedule":
        return {
          type: "schedule" as const,
          cron: typeof record.cron === "string" && record.cron.trim() ? record.cron.trim() : "0 9 * * *",
          timezone: typeof record.timezone === "string" && record.timezone.trim() ? record.timezone.trim() : "UTC",
        };
      case "join":
        return { type: "join" as const };
      case "role_add":
        return {
          type: "role_add" as const,
          roleIds: Array.isArray(record.roleIds)
            ? record.roleIds.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
            : [],
        };
      case "reaction":
        return {
          type: "reaction" as const,
          emoji: typeof record.emoji === "string" && record.emoji.trim() ? record.emoji.trim() : "🔥",
          channelId: typeof record.channelId === "string" ? record.channelId.trim() || undefined : undefined,
          messageId: typeof record.messageId === "string" ? record.messageId.trim() || undefined : undefined,
        };
      default:
        return null;
    }
  }

  if (typeof trigger === "string") {
    const trimmed = trigger.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith("/")) {
      const name = trimmed.replace(/^\/+/, "").trim().replace(/\s+/g, "-").toLowerCase();
      return {
        type: "slash" as const,
        name: name || "archivist-command",
        description: description || "Imported Archivist command",
      };
    }

    return {
      type: "keyword" as const,
      pattern: trimmed,
      aliases: [],
      matchMode: "exact" as const,
      caseSensitive: false,
    };
  }

  return null;
}

function normalizeLegacyImportPayload(input: unknown) {
  if (!input || typeof input !== "object") return input;

  const record = input as Record<string, unknown>;
  const command = record.command;
  if (!command || typeof command !== "object") return input;

  const commandRecord = command as Record<string, unknown>;
  if ("meta" in commandRecord || "workflow" in commandRecord) {
    if (record.kind === "custom-command") {
      return {
        ...record,
        kind: "archivist-command",
      };
    }
    return input;
  }

  const normalizedTrigger = normalizeLegacyTrigger(
    commandRecord.trigger,
    typeof commandRecord.description === "string" ? commandRecord.description : undefined,
  );
  const steps = Array.isArray(commandRecord.steps) ? commandRecord.steps : [];
  const permissions = Array.isArray(commandRecord.permissions)
    ? commandRecord.permissions.filter((value): value is string => typeof value === "string")
    : [];
  const nonEveryonePermissions = permissions.filter((value) => value.toLowerCase() !== "everyone");

  return {
    schemaVersion: record.schemaVersion,
    kind: "archivist-command",
    command: {
      meta: {
        name: typeof commandRecord.name === "string" ? commandRecord.name : "Imported Archivist Command",
        description: typeof commandRecord.description === "string" ? commandRecord.description : undefined,
        category: "utility",
        tags: [],
      },
      trigger: normalizedTrigger ?? {
        type: "slash",
        name: "imported-command",
        description: "Imported Archivist command",
      },
      access: {
        mode: nonEveryonePermissions.length > 0 ? "restricted" : "allow_all",
        allowedRoleIds: [],
        blockedRoleIds: [],
        allowedChannelIds: [],
        blockedChannelIds: [],
        requiredPermissions: nonEveryonePermissions,
        ownerOnly: false,
        premiumOnly: false,
      },
      behavior: {
        enabled: commandRecord.enabled !== false,
        cooldownSeconds: typeof commandRecord.cooldown === "number" ? commandRecord.cooldown : 0,
        cooldownScope: "user",
        defaultEphemeral: false,
        deleteInvocation: false,
        logRuns: true,
      },
      variables: [],
      workflow: {
        entryStepId:
          typeof commandRecord.entryStepId === "string"
            ? commandRecord.entryStepId
            : typeof (steps[0] as any)?.id === "string"
              ? (steps[0] as any).id
              : "step-1",
        steps,
      },
      fallbacks: {},
      ui: {
        mode: commandRecord.type === "workflow" ? "workflow" : "simple",
        advancedSections: [],
      },
    },
  };
}

export function buildCustomCommandV2Slug(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96) || "archivist-command";
}

export function stripCustomCommandV2ImportWrapper(raw: string) {
  return normalizeCustomCommandV2ImportText(raw).normalizedText;
}

export function extractCustomCommandV2ImportJsonCandidates(raw: string) {
  return normalizeCustomCommandV2ImportText(raw).extractedCandidates;
}

export function extractCustomCommandV2ImportJson(raw: string) {
  return normalizeCustomCommandV2ImportText(raw).extractedText;
}

export function normalizeCustomCommandV2ImportPayload(input: unknown) {
  return normalizeLegacyImportPayload(input);
}

export function summarizeCustomCommandV2(definition: CustomCommandV2Definition): CustomCommandV2Preview {
  const stepCount = definition.workflow.steps.length;
  const conditionCount = definition.workflow.steps.filter((step) =>
    ["branch_if", "check_permission", "check_cooldown"].includes(step.type),
  ).length;
  const advancedStepCount = definition.workflow.steps.filter((step) =>
    [
      "add_button_row",
      "add_select_menu",
      "on_button_click",
      "on_select",
      "open_modal",
      "save_input",
      "set_variable",
      "branch_if",
      "call_webhook",
    ].includes(step.type),
  ).length;

  const triggerLabel =
    definition.trigger.type === "slash"
      ? `/${definition.trigger.name}`
      : definition.trigger.type === "keyword"
        ? definition.trigger.pattern
        : definition.trigger.type === "schedule"
          ? `${definition.trigger.cron} (${definition.trigger.timezone})`
          : definition.trigger.type === "reaction"
            ? `Reaction ${definition.trigger.emoji}`
            : definition.trigger.type.replace(/_/g, " ");

  const sendStepSummaries = definition.workflow.steps.flatMap((step) => {
    switch (step.type) {
      case "send_message":
        return [`send a message${step.channelTarget === "dm" ? " in DMs" : step.channelTarget === "configured" ? " in a configured channel" : ""}`];
      case "send_embed":
        return [`send an embed${step.channelTarget === "dm" ? " in DMs" : step.channelTarget === "configured" ? " in a configured channel" : ""}`];
      case "reply_ephemeral":
        return ["send a private reply"];
      case "fallback_response":
        return [`send a ${step.ephemeral ? "private" : "fallback"} response`];
      default:
        return [];
    }
  });

  const interactionKinds = new Set<string>();
  definition.workflow.steps.forEach((step) => {
    if (step.type === "add_button_row" || step.type === "on_button_click") interactionKinds.add("buttons");
    if (step.type === "add_select_menu" || step.type === "on_select") interactionKinds.add("select menus");
    if (step.type === "open_modal" || step.type === "save_input") interactionKinds.add("forms");
  });

  const roleActions = definition.workflow.steps.flatMap((step) => {
    if (step.type === "add_role") return [`add role ${step.roleId}`];
    if (step.type === "remove_role") return [`remove role ${step.roleId}`];
    return [];
  });

  const sections = [
    "Basics",
    "Trigger",
    stepCount > 1 ? "Workflow" : "Response",
    definition.variables.length > 0 ? "Variables" : null,
    definition.access.mode !== "allow_all" ? "Access" : null,
    definition.behavior.cooldownSeconds > 0 ? "Cooldowns" : null,
  ].filter(Boolean) as string[];

  const permissionSummary =
    definition.access.ownerOnly
      ? "Owner only"
      : definition.access.requiredPermissions.length > 0
        ? `Requires ${definition.access.requiredPermissions.join(", ")}`
        : definition.access.mode === "restricted"
          ? "Restricted access"
          : "Everyone";

  const stepLabels = definition.workflow.steps.slice(0, 4).map((step) => step.label || step.type.replace(/_/g, " "));
  const actionsSummary = stepLabels.length
    ? `${stepLabels.join(", ")}${definition.workflow.steps.length > 4 ? `, +${definition.workflow.steps.length - 4} more` : ""}`
    : "No workflow steps yet";
  const workflowSummary = definition.workflow.steps.length === 1
    ? `One action starts at ${definition.workflow.entryStepId}.`
    : `${definition.workflow.steps.length} workflow steps start at ${definition.workflow.entryStepId}.`;

  const fallbackSummary = [
    definition.fallbacks.permissionDeniedMessage ? "Permission fallback" : null,
    definition.fallbacks.cooldownMessage ? "Cooldown fallback" : null,
    definition.fallbacks.runtimeErrorMessage ? "Runtime fallback" : null,
  ].filter(Boolean).join(", ");

  const whatTriggers = `Runs when ${triggerLabel}.`;
  const whatSends = sendStepSummaries.length
    ? `Archivist will ${sendStepSummaries.slice(0, 3).join(", ")}${sendStepSummaries.length > 3 ? `, and ${sendStepSummaries.length - 3} more response step${sendStepSummaries.length - 3 === 1 ? "" : "s"}` : ""}.`
    : "No message or embed response steps are configured yet.";
  const interactionsSummary = interactionKinds.size > 0
    ? `Uses ${Array.from(interactionKinds).join(", ")}.`
    : "No interactive buttons, menus, or forms are configured.";
  const roleSummary = roleActions.length > 0
    ? `Role actions: ${roleActions.slice(0, 3).join(", ")}${roleActions.length > 3 ? `, and ${roleActions.length - 3} more` : ""}.`
    : "This command does not add or remove roles.";
  const successSummary = `On success, Archivist will ${actionsSummary.charAt(0).toLowerCase()}${actionsSummary.slice(1)}.`;
  const failureSummary = fallbackSummary
    ? `On failure, Archivist uses ${fallbackSummary.toLowerCase()}.`
    : "On failure, Archivist falls back to default validation and runtime handling.";

  const highlights = [
    `Trigger: ${triggerLabel}`,
    `Permissions: ${permissionSummary}`,
    `Actions: ${actionsSummary}`,
    `Conditions: ${conditionCount}`,
    `Responses: ${whatSends}`,
    fallbackSummary ? `Fallbacks: ${fallbackSummary}` : "Fallbacks: default behavior",
  ];

  const firstMessageStep = definition.workflow.steps.find((step) =>
    ["send_message", "reply_ephemeral", "fallback_response"].includes(step.type),
  );
  const firstEmbedStep = definition.workflow.steps.find((step) => step.type === "send_embed");
  const firstButtonRow = definition.workflow.steps.find((step) => step.type === "add_button_row");
  const firstSelectMenu = definition.workflow.steps.find((step) => step.type === "add_select_menu");

  const outputPreview = {
    mode: firstMessageStep && firstEmbedStep
      ? "message_with_embed" as const
      : firstEmbedStep
        ? "embed" as const
        : firstMessageStep
          ? "message" as const
          : firstButtonRow || firstSelectMenu
            ? "interaction" as const
            : "none" as const,
    message: firstMessageStep && "content" in firstMessageStep
      ? firstMessageStep.content || undefined
      : undefined,
    embedTitle: firstEmbedStep?.type === "send_embed" ? firstEmbedStep.embed.title : undefined,
    embedDescription: firstEmbedStep?.type === "send_embed" ? firstEmbedStep.embed.description : undefined,
    buttonLabels: firstButtonRow?.type === "add_button_row" ? firstButtonRow.buttons.map((button) => button.label) : [],
    selectOptions: firstSelectMenu?.type === "add_select_menu" ? firstSelectMenu.options.map((option) => option.label) : [],
    note: firstMessageStep || firstEmbedStep || firstButtonRow || firstSelectMenu
      ? undefined
      : "No message-producing action is configured yet.",
  };

  return {
    name: definition.meta.name,
    description: definition.meta.description,
    triggerLabel,
    triggerType: definition.trigger.type,
    enabled: definition.behavior.enabled,
    mode: definition.ui.mode,
    stepCount,
    actionCount: stepCount,
    conditionCount,
    advancedStepCount,
    tags: definition.meta.tags,
    sections,
    permissionSummary,
    actionsSummary,
    workflowSummary,
    fallbackSummary: fallbackSummary || undefined,
    whatTriggers,
    whatSends,
    interactionsSummary,
    roleSummary,
    successSummary,
    failureSummary,
    outputPreview,
    highlights,
  };
}

export function createDefaultCustomCommandV2Definition(): CustomCommandV2Definition {
  return customCommandV2DefinitionSchema.parse({
    meta: {
      name: "Archivist Welcome",
      description: "A starter Archivist command workflow.",
      category: "utility",
      tags: ["starter"],
    },
    trigger: {
      type: "slash",
      name: "archivist-welcome",
      description: "Run the Archivist welcome flow",
    },
    workflow: {
      entryStepId: "send-message",
      steps: [
        {
          id: "send-message",
          type: "send_message",
          label: "Send message",
          content: "Hello {user}, welcome in.",
        },
      ],
    },
  });
}
