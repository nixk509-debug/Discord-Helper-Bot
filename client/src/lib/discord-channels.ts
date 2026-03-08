import type { DiscordContextChannel } from "@/hooks/use-bot";

export type GuildChannelKind =
  | "text"
  | "announcement"
  | "forum"
  | "category"
  | "voice"
  | "stage"
  | "other";

export function inferChannelKind(channel: DiscordContextChannel): GuildChannelKind {
  if (channel.isCategory) return "category";
  if (channel.isAnnouncement) return "announcement";
  if (channel.isForum) return "forum";
  if (channel.isStage) return "stage";
  if (channel.isVoiceBased && !channel.isTextBased) return "voice";
  if (channel.isTextBased) return "text";
  return "other";
}

export function getChannelKindLabel(kind: GuildChannelKind): string {
  switch (kind) {
    case "text":
      return "Text";
    case "announcement":
      return "Announcement";
    case "forum":
      return "Forum";
    case "category":
      return "Category";
    case "voice":
      return "Voice";
    case "stage":
      return "Stage";
    default:
      return "Other";
  }
}
