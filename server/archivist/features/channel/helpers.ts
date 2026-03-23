import { ChannelType, OverwriteType, PermissionFlagsBits, type GuildBasedChannel } from "discord.js";
import { CommandError } from "../../lib/errors";
import { parsePermissionList } from "../../lib/utils/permissions";

export type ManageableGuildChannel = GuildBasedChannel & {
  permissionOverwrites: GuildBasedChannel["guild"]["channels"]["cache"]["first"] extends infer _T ? any : any;
  setPosition?: (position: number, options?: any) => Promise<GuildBasedChannel>;
};

export const channelTypeChoices = [
  { name: "Text", value: "text" },
  { name: "Voice", value: "voice" },
  { name: "Announcement", value: "announcement" },
  { name: "Stage", value: "stage" },
  { name: "Forum", value: "forum" },
  { name: "Category", value: "category" },
] as const;

export type SupportedChannelType = (typeof channelTypeChoices)[number]["value"];

const channelTypeMap: Record<SupportedChannelType, ChannelType> = {
  text: ChannelType.GuildText,
  voice: ChannelType.GuildVoice,
  announcement: ChannelType.GuildAnnouncement,
  stage: ChannelType.GuildStageVoice,
  forum: ChannelType.GuildForum,
  category: ChannelType.GuildCategory,
};

export function resolveChannelType(type: string): ChannelType {
  const resolved = channelTypeMap[type as SupportedChannelType];
  if (!resolved) {
    throw new CommandError("VALIDATION_FAILED", `Unsupported channel type: ${type}`);
  }
  return resolved;
}

export function assertCommunityTypeAllowed(guildFeatures: readonly string[], type: SupportedChannelType) {
  if ((type === "announcement" || type === "stage" || type === "forum") && !guildFeatures.includes("COMMUNITY")) {
    throw new CommandError("UNSUPPORTED_OPERATION", `${type} channels require a Discord Community server.`);
  }
}

export function ensureCategoryTarget(channel: GuildBasedChannel | null) {
  if (!channel) return null;
  if (channel.type !== ChannelType.GuildCategory) {
    throw new CommandError("VALIDATION_FAILED", "The selected category target is not a category channel.");
  }
  return channel;
}

export function canSetSlowmode(channel: GuildBasedChannel) {
  return typeof (channel as any).setRateLimitPerUser === "function";
}

export function canSetTopic(channel: GuildBasedChannel) {
  return typeof (channel as any).setTopic === "function";
}

export function canSetNsfw(channel: GuildBasedChannel) {
  return typeof (channel as any).setNSFW === "function";
}

export function buildChannelLockPatch(channel: GuildBasedChannel, locked: boolean) {
  const value = locked ? false : null;
  if (channel.type === ChannelType.GuildVoice || channel.type === ChannelType.GuildStageVoice) {
    return {
      Connect: value,
      Speak: value,
      RequestToSpeak: value,
    };
  }

  return {
    SendMessages: value,
    AddReactions: value,
    CreatePublicThreads: value,
    CreatePrivateThreads: value,
    SendMessagesInThreads: value,
  };
}

export function summarizeOverwrite(channel: ManageableGuildChannel, targetId?: string) {
  const overwrites = targetId
    ? channel.permissionOverwrites.cache.filter((entry: any) => entry.id === targetId)
    : channel.permissionOverwrites.cache;

  if (overwrites.size === 0) {
    return "No permission overwrites are configured.";
  }

  return overwrites
    .first(8)
    .map((entry: any) => {
      const allow = entry.allow.toArray().join(", ") || "none";
      const deny = entry.deny.toArray().join(", ") || "none";
      const label = entry.type === OverwriteType.Role ? `<@&${entry.id}>` : `<@${entry.id}>`;
      return `${label}: allow ${allow}; deny ${deny}`;
    })
    .join("\n");
}

export function buildOverwritePatch(allowInput?: string | null, denyInput?: string | null) {
  const allow = parsePermissionList(allowInput);
  const deny = parsePermissionList(denyInput);

  if (allow.invalid.length || deny.invalid.length) {
    throw new CommandError(
      "VALIDATION_FAILED",
      `Unknown permission names: ${[...allow.invalid, ...deny.invalid].join(", ")}`,
    );
  }

  const patch: Record<string, boolean> = {};
  for (const permission of allow.names) patch[permission] = true;
  for (const permission of deny.names) patch[permission] = false;

  if (Object.keys(patch).length === 0) {
    throw new CommandError("VALIDATION_FAILED", "Provide at least one permission in allow or deny.");
  }

  return patch;
}

export const channelManagePermissions = [PermissionFlagsBits.ManageChannels];
export const overwriteManagePermissions = [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles];
