import type { StudioDiagnostic } from "./schema";

export type StudioTokenContextKind = "static" | "member" | "post_send";
export type StudioTokenCategory = "identity" | "server" | "channel" | "time" | "message";

export interface StudioTokenDefinition {
  id: string;
  label: string;
  primaryAlias: string;
  aliases: string[];
  category: StudioTokenCategory;
  requiredContext: StudioTokenContextKind;
  previewSample: string;
  helperText: string;
  featured?: boolean;
}

export interface StudioTokenContext {
  username?: string | null;
  displayName?: string | null;
  userId?: string | null;
  userMention?: string | null;
  userAvatar?: string | null;
  serverName?: string | null;
  serverId?: string | null;
  memberCount?: string | number | null;
  channelName?: string | null;
  channelId?: string | null;
  channelMention?: string | null;
  messageId?: string | null;
  date?: string | null;
  time?: string | null;
  unix?: string | number | null;
  randomMode?: "sample" | "runtime";
}

export interface StudioTokenAvailability {
  static?: boolean;
  member?: boolean;
  postSend?: boolean;
}

export interface StudioTokenIssue {
  token: string;
  type: "unknown" | "missing_context";
  definition?: StudioTokenDefinition;
  requiredContext?: StudioTokenContextKind;
}

export const DEFAULT_STUDIO_TOKEN_AVAILABILITY: Required<StudioTokenAvailability> = {
  static: true,
  member: false,
  postSend: false,
};

function nowDate() {
  return new Date();
}

function normalizeCount(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value === "number" && Number.isFinite(value)) return new Intl.NumberFormat("en-US").format(value);
  return String(value);
}

export const STUDIO_TOKEN_DEFINITIONS: StudioTokenDefinition[] = [
  {
    id: "username",
    label: "Username",
    primaryAlias: "{username}",
    aliases: ["{username}", "{user}", "{user.name}", "{user.displayName}", "{displayName}", "{userName}"],
    category: "identity",
    requiredContext: "member",
    previewSample: "ArchivistUser",
    helperText: "The acting member's username or display name.",
    featured: true,
  },
  {
    id: "mention",
    label: "Mention",
    primaryAlias: "{mention}",
    aliases: ["{mention}", "{user.mention}", "{userMention}"],
    category: "identity",
    requiredContext: "member",
    previewSample: "@ArchivistUser",
    helperText: "Mentions the acting member.",
    featured: true,
  },
  {
    id: "user_id",
    label: "User ID",
    primaryAlias: "{user_id}",
    aliases: ["{user_id}", "{user.id}", "{userId}"],
    category: "identity",
    requiredContext: "member",
    previewSample: "123456789012345678",
    helperText: "The acting member's Discord user ID.",
  },
  {
    id: "avatar",
    label: "Avatar URL",
    primaryAlias: "{avatar}",
    aliases: ["{avatar}", "{user.avatar}", "{userAvatar}"],
    category: "identity",
    requiredContext: "member",
    previewSample: "https://cdn.discordapp.com/embed/avatars/0.png",
    helperText: "The acting member's avatar image URL.",
  },
  {
    id: "server",
    label: "Server",
    primaryAlias: "{server}",
    aliases: ["{server}", "{server.name}", "{server_name}", "{serverName}", "{guild}", "{guild.name}", "{guildName}"],
    category: "server",
    requiredContext: "static",
    previewSample: "Archivist HQ",
    helperText: "The current Discord server name.",
    featured: true,
  },
  {
    id: "server_id",
    label: "Server ID",
    primaryAlias: "{server_id}",
    aliases: ["{server_id}", "{server.id}", "{guild_id}", "{serverId}", "{guildId}"],
    category: "server",
    requiredContext: "static",
    previewSample: "987654321098765432",
    helperText: "The current Discord server ID.",
  },
  {
    id: "member_count",
    label: "Member Count",
    primaryAlias: "{member_count}",
    aliases: ["{member_count}", "{server.membercount}", "{server.memberCount}", "{memberCount}"],
    category: "server",
    requiredContext: "static",
    previewSample: "1,248",
    helperText: "The current Discord server member count.",
  },
  {
    id: "channel",
    label: "Channel",
    primaryAlias: "{channel}",
    aliases: ["{channel}", "{channel.name}", "{channelName}"],
    category: "channel",
    requiredContext: "static",
    previewSample: "announcements",
    helperText: "The current target channel name.",
    featured: true,
  },
  {
    id: "channel_mention",
    label: "Channel Mention",
    primaryAlias: "{channel_mention}",
    aliases: ["{channel_mention}", "{channel.mention}", "{channelMention}"],
    category: "channel",
    requiredContext: "static",
    previewSample: "#announcements",
    helperText: "Mentions the current target channel.",
  },
  {
    id: "channel_id",
    label: "Channel ID",
    primaryAlias: "{channel_id}",
    aliases: ["{channel_id}", "{channel.id}", "{channelId}"],
    category: "channel",
    requiredContext: "static",
    previewSample: "456789012345678901",
    helperText: "The current target channel ID.",
  },
  {
    id: "date",
    label: "Date",
    primaryAlias: "{date}",
    aliases: ["{date}"],
    category: "time",
    requiredContext: "static",
    previewSample: "03/10/2026",
    helperText: "The current local date.",
    featured: true,
  },
  {
    id: "time",
    label: "Time",
    primaryAlias: "{time}",
    aliases: ["{time}"],
    category: "time",
    requiredContext: "static",
    previewSample: "8:45 PM",
    helperText: "The current local time.",
    featured: true,
  },
  {
    id: "unix",
    label: "Unix Timestamp",
    primaryAlias: "{unix}",
    aliases: ["{unix}", "{timestamp}"],
    category: "time",
    requiredContext: "static",
    previewSample: "1773194700",
    helperText: "The current unix timestamp in seconds.",
  },
  {
    id: "message_id",
    label: "Message ID",
    primaryAlias: "{message_id}",
    aliases: ["{message_id}", "{message.id}", "{messageId}"],
    category: "message",
    requiredContext: "post_send",
    previewSample: "567890123456789012",
    helperText: "The published Discord message ID after send.",
  },
  {
    id: "message_link",
    label: "Message Link",
    primaryAlias: "{message_link}",
    aliases: ["{message_link}", "{message.link}", "{messageLink}"],
    category: "message",
    requiredContext: "post_send",
    previewSample: "https://discord.com/channels/987654321098765432/456789012345678901/567890123456789012",
    helperText: "A direct link to the published Discord message after send.",
  },
];

const STUDIO_TOKEN_ALIAS_MAP = new Map<string, StudioTokenDefinition>();
for (const definition of STUDIO_TOKEN_DEFINITIONS) {
  for (const alias of definition.aliases) {
    STUDIO_TOKEN_ALIAS_MAP.set(alias, definition);
  }
}

const TOKEN_PATTERN = /\{[a-zA-Z0-9._]+\}/g;
const RANDOM_PATTERN = /\{random:([^{}]+)\}/gi;

function normalizeAvailability(availability?: StudioTokenAvailability): Required<StudioTokenAvailability> {
  return {
    static: availability?.static ?? DEFAULT_STUDIO_TOKEN_AVAILABILITY.static,
    member: availability?.member ?? DEFAULT_STUDIO_TOKEN_AVAILABILITY.member,
    postSend: availability?.postSend ?? DEFAULT_STUDIO_TOKEN_AVAILABILITY.postSend,
  };
}

function replacementForDefinition(definition: StudioTokenDefinition, context: StudioTokenContext) {
  const current = nowDate();

  switch (definition.id) {
    case "username":
      return context.displayName || context.username || undefined;
    case "mention":
      return context.userMention || context.displayName || context.username || undefined;
    case "user_id":
      return context.userId || undefined;
    case "avatar":
      return context.userAvatar || undefined;
    case "server":
      return context.serverName || undefined;
    case "server_id":
      return context.serverId || undefined;
    case "member_count":
      return normalizeCount(context.memberCount);
    case "channel":
      return context.channelName || undefined;
    case "channel_mention":
      return context.channelMention || (context.channelId ? `<#${context.channelId}>` : context.channelName || undefined);
    case "channel_id":
      return context.channelId || undefined;
    case "date":
      return context.date || current.toLocaleDateString();
    case "time":
      return context.time || current.toLocaleTimeString();
    case "unix":
      return String(context.unix ?? Math.floor(current.getTime() / 1000));
    case "message_id":
      return context.messageId || undefined;
    case "message_link":
      if (context.serverId && context.channelId && context.messageId) {
        return `https://discord.com/channels/${context.serverId}/${context.channelId}/${context.messageId}`;
      }
      return undefined;
    default:
      return undefined;
  }
}

function resolveRandomSegments(value: string, mode: StudioTokenContext["randomMode"] = "runtime") {
  return value.replace(RANDOM_PATTERN, (_match, group: string) => {
    const options = String(group || "")
      .split("|")
      .map((entry) => entry.trim())
      .filter(Boolean);

    if (options.length === 0) return _match;
    if (mode === "sample") return options[0];

    const index = Math.floor(Math.random() * options.length);
    return options[index] || options[0];
  });
}

export function getStudioFeaturedTokens() {
  return STUDIO_TOKEN_DEFINITIONS.filter((definition) => definition.featured);
}

export function getStudioTokenDefinition(token: string) {
  return STUDIO_TOKEN_ALIAS_MAP.get(token) || null;
}

export function buildStudioPreviewTokenContext(overrides: Partial<StudioTokenContext> = {}): StudioTokenContext {
  const current = nowDate();
  const serverId = overrides.serverId || "987654321098765432";
  const channelId = overrides.channelId || "456789012345678901";
  const messageId = overrides.messageId || null;

  return {
    username: "ArchivistUser",
    displayName: "ArchivistUser",
    userId: "123456789012345678",
    userMention: "@ArchivistUser",
    userAvatar: "https://cdn.discordapp.com/embed/avatars/0.png",
    serverName: "Archivist HQ",
    serverId,
    memberCount: "1,248",
    channelName: "announcements",
    channelId,
    channelMention: "#announcements",
    messageId,
    date: current.toLocaleDateString(),
    time: current.toLocaleTimeString(),
    unix: Math.floor(current.getTime() / 1000),
    randomMode: "sample",
    ...overrides,
  };
}

export function resolveStudioTokensInString(
  value: string,
  context: StudioTokenContext,
) {
  let output = value;

  for (const definition of STUDIO_TOKEN_DEFINITIONS) {
    const replacement = replacementForDefinition(definition, context);
    if (replacement === undefined || replacement === null || replacement === "") continue;

    for (const alias of definition.aliases) {
      output = output.split(alias).join(String(replacement));
    }
  }

  return resolveRandomSegments(output, context.randomMode || "runtime");
}

export function resolveStudioTokensInValue<T>(value: T, context: StudioTokenContext): T {
  if (typeof value === "string") {
    return resolveStudioTokensInString(value, context) as T;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => resolveStudioTokensInValue(entry, context)) as T;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        resolveStudioTokensInValue(entry, context),
      ]),
    ) as T;
  }
  return value;
}

export function inspectStudioTokensInString(
  value: string,
  availability?: StudioTokenAvailability,
) {
  const normalizedAvailability = normalizeAvailability(availability);
  const matches = value.match(TOKEN_PATTERN) || [];
  const issues: StudioTokenIssue[] = [];
  const seen = new Set<string>();

  for (const token of matches) {
    if (seen.has(token)) continue;
    seen.add(token);

    const definition = getStudioTokenDefinition(token);
    if (!definition) {
      issues.push({ token, type: "unknown" });
      continue;
    }

    if (
      (definition.requiredContext === "member" && !normalizedAvailability.member) ||
      (definition.requiredContext === "post_send" && !normalizedAvailability.postSend) ||
      (definition.requiredContext === "static" && !normalizedAvailability.static)
    ) {
      issues.push({
        token,
        type: "missing_context",
        definition,
        requiredContext: definition.requiredContext,
      });
    }
  }

  return issues;
}

export function buildStudioTokenDiagnostics(
  value: string,
  path: string,
  availability?: StudioTokenAvailability,
): StudioDiagnostic[] {
  return inspectStudioTokensInString(value, availability).map((issue) => {
    if (issue.type === "unknown") {
      return {
        level: "warning",
        code: "TOKEN_UNKNOWN",
        message: `${issue.token} is not a supported Studio token.`,
        path,
      };
    }

    const definition = issue.definition!;
    if (issue.requiredContext === "member") {
      return {
        level: "warning",
        code: "TOKEN_MEMBER_CONTEXT_ONLY",
        message: `${definition.primaryAlias} resolves only in member-aware flows. Static publishes leave it as raw text.`,
        path,
      };
    }

    return {
      level: "warning",
      code: "TOKEN_POST_SEND_ONLY",
      message: `${definition.primaryAlias} resolves only after a message exists. It stays raw on first publish.`,
      path,
    };
  });
}
