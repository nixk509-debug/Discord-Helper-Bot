export interface ParsedDiscordEmoji {
  raw: string;
  name: string;
  id?: string;
  animated: boolean;
  custom: boolean;
}

export const CUSTOM_DISCORD_EMOJI_PATTERN = /<(a?):([a-zA-Z0-9_]+):(\d+)>/g;

export function parseDiscordEmojiToken(value: unknown): ParsedDiscordEmoji | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw) return null;

  const customMatch = raw.match(/^<?(a?):([a-zA-Z0-9_]+):(\d+)>?$/);
  if (customMatch) {
    return {
      raw,
      name: customMatch[2],
      id: customMatch[3],
      animated: customMatch[1] === "a",
      custom: true,
    };
  }

  return {
    raw,
    name: raw,
    animated: false,
    custom: false,
  };
}

export function toDiscordEmojiObject(value: unknown) {
  const parsed = parseDiscordEmojiToken(value);
  if (!parsed) return undefined;
  if (parsed.custom) {
    return {
      id: parsed.id,
      name: parsed.name,
      animated: parsed.animated,
    };
  }
  return { name: parsed.name };
}

export function getDiscordEmojiAssetUrl(value: ParsedDiscordEmoji | string | null | undefined, size = 64) {
  const parsed = typeof value === "string" ? parseDiscordEmojiToken(value) : value;
  if (!parsed?.custom || !parsed.id) return null;
  const extension = parsed.animated ? "gif" : "png";
  return `https://cdn.discordapp.com/emojis/${parsed.id}.${extension}?size=${size}&quality=lossless`;
}

export function splitTextWithDiscordEmoji(value: string) {
  const parts: Array<
    | { type: "text"; value: string }
    | { type: "emoji"; value: ParsedDiscordEmoji }
  > = [];

  let lastIndex = 0;
  for (const match of Array.from(value.matchAll(CUSTOM_DISCORD_EMOJI_PATTERN))) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      parts.push({ type: "text", value: value.slice(lastIndex, index) });
    }

    const parsed = parseDiscordEmojiToken(match[0]);
    if (parsed) {
      parts.push({ type: "emoji", value: parsed });
    } else {
      parts.push({ type: "text", value: match[0] });
    }

    lastIndex = index + match[0].length;
  }

  if (lastIndex < value.length) {
    parts.push({ type: "text", value: value.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ type: "text" as const, value }];
}
