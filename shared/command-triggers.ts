export type CommandTriggerType =
  | "slash"
  | "keyword"
  | "button"
  | "select"
  | "schedule"
  | "join"
  | "role_add"
  | "reaction";

export type KeywordMatchMode = "contains" | "starts_with" | "exact";

export interface KeywordTriggerConfig {
  matchMode: KeywordMatchMode;
  caseSensitive: boolean;
}

export interface ButtonTriggerConfig {
  customId: string;
  channelId?: string;
  messageId?: string;
  allowAnyMessage: boolean;
}

export interface SelectTriggerConfig {
  customId: string;
  allowedValues: string[];
  channelId?: string;
  messageId?: string;
  allowAnyMessage: boolean;
}

export interface ScheduleTriggerConfig {
  cronExpression: string;
  timezone: string;
  runMissedOnBoot: boolean;
  channelId?: string;
}

export interface RoleAddTriggerConfig {
  watchedRoleIds: string[];
}

export interface ReactionTriggerConfig {
  emoji: string;
  channelId?: string;
  messageId?: string;
  event: "add";
}

export type CommandTriggerConfig =
  | Record<string, never>
  | KeywordTriggerConfig
  | ButtonTriggerConfig
  | SelectTriggerConfig
  | ScheduleTriggerConfig
  | RoleAddTriggerConfig
  | ReactionTriggerConfig;

function getResolvedTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function asTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asOptionalString(value: unknown) {
  const normalized = asTrimmedString(value);
  return normalized || undefined;
}

function asStringList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean);
}

export function createDefaultTriggerConfig(triggerType: string): CommandTriggerConfig {
  switch (triggerType) {
    case "keyword":
      return {
        matchMode: "contains",
        caseSensitive: false,
      };
    case "button":
      return {
        customId: "",
        channelId: undefined,
        messageId: undefined,
        allowAnyMessage: true,
      };
    case "select":
      return {
        customId: "",
        allowedValues: [],
        channelId: undefined,
        messageId: undefined,
        allowAnyMessage: true,
      };
    case "schedule":
      return {
        cronExpression: "0 9 * * *",
        timezone: getResolvedTimezone(),
        runMissedOnBoot: false,
        channelId: undefined,
      };
    case "role_add":
      return {
        watchedRoleIds: [],
      };
    case "reaction":
      return {
        emoji: "",
        channelId: undefined,
        messageId: undefined,
        event: "add",
      };
    default:
      return {};
  }
}

export function normalizeTriggerConfig(triggerType: string, value: unknown): CommandTriggerConfig {
  const source = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

  switch (triggerType) {
    case "keyword":
      return {
        matchMode:
          source.matchMode === "starts_with" || source.matchMode === "exact"
            ? source.matchMode
            : "contains",
        caseSensitive: Boolean(source.caseSensitive),
      };
    case "button":
      return {
        customId: asTrimmedString(source.customId),
        channelId: asOptionalString(source.channelId),
        messageId: asOptionalString(source.messageId),
        allowAnyMessage: source.allowAnyMessage === undefined ? true : Boolean(source.allowAnyMessage),
      };
    case "select":
      return {
        customId: asTrimmedString(source.customId),
        allowedValues: asStringList(source.allowedValues),
        channelId: asOptionalString(source.channelId),
        messageId: asOptionalString(source.messageId),
        allowAnyMessage: source.allowAnyMessage === undefined ? true : Boolean(source.allowAnyMessage),
      };
    case "schedule":
      return {
        cronExpression: asTrimmedString(source.cronExpression) || "0 9 * * *",
        timezone: asTrimmedString(source.timezone) || getResolvedTimezone(),
        runMissedOnBoot: Boolean(source.runMissedOnBoot),
        channelId: asOptionalString(source.channelId),
      };
    case "role_add":
      return {
        watchedRoleIds: asStringList(source.watchedRoleIds),
      };
    case "reaction":
      return {
        emoji: asTrimmedString(source.emoji),
        channelId: asOptionalString(source.channelId),
        messageId: asOptionalString(source.messageId),
        event: "add",
      };
    default:
      return createDefaultTriggerConfig(triggerType);
  }
}

export function getTriggerConfigErrors(triggerType: string, value: unknown) {
  const config = normalizeTriggerConfig(triggerType, value);

  switch (triggerType) {
    case "button":
      return "customId" in config && config.customId ? [] : ["Button triggers need a custom ID."];
    case "select":
      return "customId" in config && config.customId ? [] : ["Select triggers need a custom ID."];
    case "schedule":
      return "cronExpression" in config && config.cronExpression ? [] : ["Scheduled triggers need a cron expression."];
    case "reaction":
      return "emoji" in config && config.emoji ? [] : ["Reaction triggers need an emoji."];
    default:
      return [];
  }
}

export function usesMessageScope(triggerType: string, value: unknown) {
  const config = normalizeTriggerConfig(triggerType, value);
  return (
    ("allowAnyMessage" in config && config.allowAnyMessage === false)
    || ("messageId" in config && Boolean(config.messageId))
    || ("channelId" in config && Boolean(config.channelId))
  );
}
