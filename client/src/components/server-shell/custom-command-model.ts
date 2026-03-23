import type { CommandAction, CommandCondition } from "@shared/schema";
import {
  createDefaultTriggerConfig,
  normalizeTriggerConfig,
  type CommandTriggerConfig,
} from "@shared/command-triggers";
import type { ArchivistCommand } from "@/hooks/use-bot";

export interface CommandDraft {
  id?: number | null;
  name: string;
  description: string;
  response: string;
  responseType: string;
  responseVariations: string[];
  embedResponse: unknown | null;
  aliases: string[];
  category: string;
  cooldown: number;
  cooldownScope: string;
  requiredRoles: string[];
  blockedRoles: string[];
  allowedChannels: string[];
  blockedChannels: string[];
  enabled: boolean;
  deleteInvocation: boolean;
  dmResponse: boolean;
  triggerType: string;
  triggerConfig: CommandTriggerConfig;
  conditions: CommandCondition[];
  actions: CommandAction[];
  usageCount?: number;
  lastUsedAt?: string | Date | null;
  premiumOnly: boolean;
}

export const TRIGGER_OPTIONS = [
  { value: "slash", label: "Slash command" },
  { value: "keyword", label: "Keyword match" },
  { value: "button", label: "Button press" },
  { value: "select", label: "Select menu" },
  { value: "schedule", label: "Scheduled time" },
  { value: "join", label: "Member joins" },
  { value: "role_add", label: "Role added" },
  { value: "reaction", label: "Reaction added" },
] as const;

export const CONDITION_OPTIONS = [
  { value: "hasRole", label: "User has role" },
  { value: "inChannel", label: "In channel" },
  { value: "hasPermission", label: "Has permission" },
  { value: "accountAge", label: "Account age" },
  { value: "messageContains", label: "Message contains" },
  { value: "randomChance", label: "Random chance" },
  { value: "isOwner", label: "Guild owner" },
] as const;

export const ACTION_OPTIONS = [
  { value: "reply", label: "Send message" },
  { value: "sendStudio", label: "Send Design Studio message" },
  { value: "addRole", label: "Add role" },
  { value: "removeRole", label: "Remove role" },
  { value: "createChannel", label: "Create channel" },
  { value: "sendDM", label: "Send DM" },
  { value: "wait", label: "Delay" },
  { value: "logEvent", label: "Log event" },
] as const;

export const COMMAND_PRESETS = [
  {
    id: "welcome",
    label: "Welcome flow",
    description: "Member joins -> send welcome message",
    build(): CommandDraft {
      return {
        ...createDefaultCommandDraft(),
        name: "welcome",
        description: "Welcomes a new member when they join the server.",
        triggerType: "join",
        response: "Welcome to {server}, {userMention}. Read the rules and start in the intro channels.",
        actions: [{ type: "reply", value: "Welcome to {server}, {userMention}. Read the rules and start in the intro channels." }],
      };
    },
  },
  {
    id: "keyword-role",
    label: "Keyword role",
    description: "Keyword -> add role",
    build(): CommandDraft {
      return {
        ...createDefaultCommandDraft(),
        name: "verify-me",
        description: "Gives a role when a keyword appears in chat.",
        triggerType: "keyword",
        aliases: ["verify me"],
        response: "You're in. Archivist updated your access.",
        actions: [
          { type: "addRole", value: "" },
          { type: "reply", value: "You're in. Archivist updated your access." },
        ],
      };
    },
  },
  {
    id: "studio-send",
    label: "Studio send",
    description: "Slash -> send Design Studio draft",
    build(): CommandDraft {
      return {
        ...createDefaultCommandDraft(),
        name: "announcement",
        description: "Sends a saved Design Studio announcement.",
        triggerType: "slash",
        actions: [{ type: "sendStudio", studioDocumentId: undefined }],
      };
    },
  },
  {
    id: "channel-create",
    label: "Create channel",
    description: "Slash -> create a new channel",
    build(): CommandDraft {
      return {
        ...createDefaultCommandDraft(),
        name: "open-room",
        description: "Creates a new text channel when the command runs.",
        triggerType: "slash",
        response: "Created a new room for you.",
        actions: [
          { type: "createChannel", value: "fresh-room" },
          { type: "reply", value: "Created a new room for you." },
        ],
      };
    },
  },
] as const;

export function createDefaultCondition(): CommandCondition {
  return {
    type: "hasRole",
    value: "",
  };
}

export function createDefaultAction(): CommandAction {
  return {
    type: "reply",
    value: "",
  };
}

export function createDefaultCommandDraft(): CommandDraft {
  return {
    name: "announce",
    description: "Posts a configured response when the trigger fires.",
    response: "",
    responseType: "text",
    responseVariations: [],
    embedResponse: null,
    aliases: [],
    category: "custom-commands",
    cooldown: 0,
    cooldownScope: "user",
    requiredRoles: [],
    blockedRoles: [],
    allowedChannels: [],
    blockedChannels: [],
    enabled: true,
    deleteInvocation: false,
    dmResponse: false,
    triggerType: "slash",
    triggerConfig: createDefaultTriggerConfig("slash"),
    conditions: [],
    actions: [createDefaultAction()],
    usageCount: 0,
    lastUsedAt: null,
    premiumOnly: false,
  };
}

export function commandToDraft(command: ArchivistCommand): CommandDraft {
  return {
    id: command.id,
    name: command.name || "untitled",
    description: command.description || "",
    response: command.response || "",
    responseType: command.responseType || "text",
    responseVariations: Array.isArray(command.responseVariations) ? command.responseVariations : [],
    embedResponse: command.embedResponse ?? null,
    aliases: Array.isArray(command.aliases) ? command.aliases : [],
    category: command.category || "custom-commands",
    cooldown: command.cooldown || 0,
    cooldownScope: command.cooldownScope || "user",
    requiredRoles: Array.isArray(command.requiredRoles) ? command.requiredRoles : [],
    blockedRoles: Array.isArray(command.blockedRoles) ? command.blockedRoles : [],
    allowedChannels: Array.isArray(command.allowedChannels) ? command.allowedChannels : [],
    blockedChannels: Array.isArray(command.blockedChannels) ? command.blockedChannels : [],
    enabled: Boolean(command.enabled),
    deleteInvocation: Boolean(command.deleteInvocation),
    dmResponse: Boolean(command.dmResponse),
    triggerType: command.triggerType || "slash",
    triggerConfig: normalizeTriggerConfig(command.triggerType || "slash", (command as any).triggerConfig),
    conditions: Array.isArray(command.conditions) ? command.conditions : [],
    actions: Array.isArray(command.actions) && command.actions.length > 0 ? command.actions : [createDefaultAction()],
    usageCount: command.usageCount || 0,
    lastUsedAt: command.lastUsedAt ?? null,
    premiumOnly: Boolean(command.premiumOnly),
  };
}

export function cleanStringList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function formatRelativeCommandTime(value?: string | Date | null) {
  if (!value) return "Never run";
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return "Saved";

  const diffMs = Date.now() - target.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return target.toLocaleDateString();
}

export function triggerLabel(triggerType: string) {
  return TRIGGER_OPTIONS.find((option) => option.value === triggerType)?.label || triggerType;
}

export function conditionLabel(conditionType: string) {
  return CONDITION_OPTIONS.find((option) => option.value === conditionType)?.label || conditionType;
}

export function actionLabel(actionType: string) {
  return ACTION_OPTIONS.find((option) => option.value === actionType)?.label || actionType;
}

export function ensureTriggerConfig(triggerType: string, triggerConfig: unknown) {
  return normalizeTriggerConfig(triggerType, triggerConfig);
}
