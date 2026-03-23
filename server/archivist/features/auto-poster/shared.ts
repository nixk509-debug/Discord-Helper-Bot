import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type APIActionRowComponent,
  type APIButtonComponent,
  type APIEmbed,
} from "discord.js";
import { CommandError } from "../../lib/errors";

export const AUTO_POSTER_THEMES = {
  crimson: { color: 0xb11226, accent: "Crimson Signal", marker: "*" },
  midnight: { color: 0x20304d, accent: "Midnight Control", marker: "#" },
  gold: { color: 0xd2a43d, accent: "Gold Broadcast", marker: "+" },
  ice: { color: 0x6ac7e0, accent: "Ice Relay", marker: "~" },
  emerald: { color: 0x2e9c74, accent: "Emerald Pulse", marker: ">" },
} as const;

export const AUTO_POSTER_LAYOUTS = {
  announcement: {
    eyebrow: "Server Announcement",
    helper: "A polished broadcast poster for updates and notices.",
  },
  launch: {
    eyebrow: "Feature Launch",
    helper: "A more dramatic launch-style poster with a hype-first voice.",
  },
  event: {
    eyebrow: "Event Spotlight",
    helper: "A schedule/event poster that still feels premium in Discord.",
  },
  alert: {
    eyebrow: "Important Notice",
    helper: "Sharper copy and higher urgency for rule, ops, or warning posts.",
  },
  spotlight: {
    eyebrow: "Spotlight",
    helper: "A clean feature card style for standout updates.",
  },
  roadmap: {
    eyebrow: "Roadmap Update",
    helper: "Built for progress reports, milestones, and next steps.",
  },
  status: {
    eyebrow: "Status Update",
    helper: "A compact, high-clarity poster for operational updates.",
  },
} as const;

export interface AutoPosterButtonLink {
  label: string;
  url: string;
}

export interface AutoPosterStat {
  label: string;
  value: string;
}

export interface AutoPosterPayloadInput {
  title: string;
  body: string;
  layoutKey: string;
  themeKey: string;
  eyebrow?: string | null;
  subtitle?: string | null;
  footer?: string | null;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  mentionRole?: string | null;
  actorLabel: string;
  brandIconUrl?: string | null;
  buttonLinks?: AutoPosterButtonLink[];
  statFields?: AutoPosterStat[];
}

export interface StoredAutoPosterPayload {
  content?: string;
  embeds: APIEmbed[];
  components: APIActionRowComponent<APIButtonComponent>[];
}

export interface StoredAutoPosterSchedule {
  kind: "auto_poster";
  version: 1;
  title: string;
  layoutKey: string;
  themeKey: string;
  payload: StoredAutoPosterPayload;
}

export function clean(value: string | null | undefined) {
  return value?.trim() || "";
}

export function normalizeBody(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

export function pickTheme(value: string | null) {
  const key = (value || "crimson") as keyof typeof AUTO_POSTER_THEMES;
  return AUTO_POSTER_THEMES[key] || AUTO_POSTER_THEMES.crimson;
}

export function pickLayout(value: string | null) {
  const key = (value || "announcement") as keyof typeof AUTO_POSTER_LAYOUTS;
  return AUTO_POSTER_LAYOUTS[key] || AUTO_POSTER_LAYOUTS.announcement;
}

export function collectButtonLinks(buttons: Array<{ label: string | null | undefined; url: string | null | undefined }>) {
  const links: AutoPosterButtonLink[] = [];

  for (const button of buttons) {
    const label = clean(button.label);
    const url = clean(button.url);
    if (!label && !url) continue;
    if (!label || !url) {
      throw new CommandError("VALIDATION_FAILED", "Set both a button label and button URL together.");
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new CommandError("VALIDATION_FAILED", "Button URLs need to be valid http or https links.");
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new CommandError("VALIDATION_FAILED", "Button URLs need to be valid http or https links.");
    }

    links.push({ label, url: parsed.toString() });
  }

  if (links.length > 3) {
    throw new CommandError("VALIDATION_FAILED", "Auto posters support up to 3 CTA buttons.");
  }

  return links;
}

export function collectStatFields(stats: Array<{ label: string | null | undefined; value: string | null | undefined }>) {
  return stats
    .map((stat) => ({
      label: clean(stat.label),
      value: clean(stat.value),
    }))
    .filter((stat) => stat.label && stat.value)
    .slice(0, 3);
}

export function normalizeTimezone(value: string | null | undefined) {
  const timezone = clean(value) || "UTC";

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
  } catch {
    throw new CommandError("VALIDATION_FAILED", "Schedule timezone must be a valid IANA timezone like America/New_York.");
  }

  return timezone;
}

export function isLikelyCronExpression(value: string) {
  const fields = clean(value).split(/\s+/).filter(Boolean);
  return fields.length === 5;
}

function getTimezoneFormatter(timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getZonedDateParts(date: Date, timezone: string) {
  const parts = getTimezoneFormatter(timezone).formatToParts(date);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value || 0);
  return {
    minute: read("minute"),
    hour: read("hour"),
    day: read("day"),
    month: read("month"),
    weekday: new Date(date.toLocaleString("en-US", { timeZone: timezone })).getDay(),
  };
}

function matchesCronSegment(segment: string, value: number, min: number, max: number, mapSevenToZero = false) {
  const raw = segment.trim();
  if (!raw) return false;

  if (raw === "*") return true;

  const [rangePart, stepPart] = raw.split("/");
  const step = stepPart ? Number.parseInt(stepPart, 10) : 1;
  if (!Number.isFinite(step) || step <= 0) return false;

  const mapValue = mapSevenToZero && value === 0 ? 7 : value;
  const matchesRange = (candidate: number) => {
    const normalized = mapSevenToZero && candidate === 0 ? 7 : candidate;
    return normalized === mapValue;
  };

  let candidates: number[] = [];
  if (rangePart === "*") {
    candidates = Array.from({ length: max - min + 1 }, (_, index) => min + index);
  } else if (rangePart.includes("-")) {
    const [startRaw, endRaw] = rangePart.split("-");
    const start = Number.parseInt(startRaw, 10);
    const end = Number.parseInt(endRaw, 10);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < min || end > max || end < start) return false;
    candidates = Array.from({ length: end - start + 1 }, (_, index) => start + index);
  } else {
    const single = Number.parseInt(rangePart, 10);
    if (!Number.isFinite(single) || single < min || single > max) return false;
    candidates = [single];
  }

  return candidates.some((candidate, index) => {
    if (index % step !== 0) return false;
    return matchesRange(candidate);
  });
}

function matchesCronField(field: string, value: number, min: number, max: number, mapSevenToZero = false) {
  return clean(field)
    .split(",")
    .some((segment) => matchesCronSegment(segment, value, min, max, mapSevenToZero));
}

export function matchesCronExpression(cronExpression: string, date: Date, timezone: string) {
  const fields = clean(cronExpression).split(/\s+/);
  if (fields.length !== 5) return false;

  const [minuteField, hourField, dayField, monthField, weekdayField] = fields;
  const parts = getZonedDateParts(date, timezone);

  return matchesCronField(minuteField, parts.minute, 0, 59)
    && matchesCronField(hourField, parts.hour, 0, 23)
    && matchesCronField(dayField, parts.day, 1, 31)
    && matchesCronField(monthField, parts.month, 1, 12)
    && matchesCronField(weekdayField, parts.weekday, 0, 6, true);
}

export function floorToMinute(date: Date) {
  const clone = new Date(date);
  clone.setSeconds(0, 0);
  return clone;
}

export function findNextCronSlotAfter(
  cronExpression: string,
  after: Date,
  timezone: string,
  lookaheadMinutes = 60 * 24 * 90,
) {
  const cursor = floorToMinute(new Date(after.getTime() + 60_000));
  const deadline = after.getTime() + lookaheadMinutes * 60_000;

  while (cursor.getTime() <= deadline) {
    if (matchesCronExpression(cronExpression, cursor, timezone)) {
      return cursor;
    }
    cursor.setMinutes(cursor.getMinutes() + 1);
  }

  return null;
}

export function buildAutoPosterPayload(input: AutoPosterPayloadInput): StoredAutoPosterPayload {
  const theme = pickTheme(input.themeKey);
  const layout = pickLayout(input.layoutKey);
  const buttonLinks = input.buttonLinks || [];
  const statFields = input.statFields || [];
  const eyebrow = clean(input.eyebrow) || `${theme.marker} ${layout.eyebrow}`;
  const subtitle = clean(input.subtitle);
  const footer = clean(input.footer) || `Posted by ${input.actorLabel}`;

  const embed = new EmbedBuilder()
    .setColor(theme.color)
    .setAuthor({
      name: `${theme.accent} Poster`,
      iconURL: input.brandIconUrl || undefined,
    })
    .setTitle(clean(input.title))
    .setDescription(
      [
        `### ${eyebrow}`,
        subtitle ? `**${subtitle}**` : null,
        `> ${layout.helper}`,
        clean(input.body),
      ]
        .filter(Boolean)
        .join("\n\n"),
    )
    .setFooter({ text: footer })
    .setTimestamp();

  if (input.imageUrl) embed.setImage(clean(input.imageUrl));
  if (input.thumbnailUrl) embed.setThumbnail(clean(input.thumbnailUrl));
  if (statFields.length > 0) {
    embed.addFields(statFields.map((field) => ({ name: field.label, value: field.value, inline: true })));
  }

  const components: APIActionRowComponent<APIButtonComponent>[] = [];
  if (buttonLinks.length > 0) {
    const row = new ActionRowBuilder<ButtonBuilder>();
    for (const button of buttonLinks) {
      row.addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Link)
          .setLabel(button.label)
          .setURL(button.url),
      );
    }
    components.push(row.toJSON() as APIActionRowComponent<APIButtonComponent>);
  }

  return {
    content: input.mentionRole ? `${input.mentionRole}` : undefined,
    embeds: [embed.toJSON()],
    components,
  };
}
