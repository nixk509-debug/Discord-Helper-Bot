import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  REST,
  Routes,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type Client,
  type Guild,
  type GuildMember,
  type InteractionReplyOptions,
  type Message,
  type MessageReaction,
  type ModalSubmitInteraction,
  type PartialGuildMember,
  type PartialMessageReaction,
  type PartialUser,
  type StringSelectMenuInteraction,
  type TextBasedChannel,
  type User,
} from "discord.js";
import type { CustomCommandV2Compiled, CustomCommandV2Definition, CustomCommandV2Embed, CustomCommandV2JsonValue } from "@shared/custom-command-v2";
import type { CustomCommandV2Record, CustomCommandV2SessionRecord } from "@shared/schema";
import { storage } from "../../../storage";
import { isPremiumEnabledForServer } from "../../../premium-service";
import type { ArchivistEnv } from "../../config/env";
import type { ArchivistLogger } from "../../lib/logger";
import { commandActivityStore } from "../../lib/logger/activity-store";
import { truncateText } from "../../lib/utils/format";
import { getActiveCommandsV2ForServer } from "./cache";
import { executeCustomCommandV2 } from "./executor";

const CACHE_TTL_MS = 30_000;
const SCHEDULE_TICK_MS = 30_000;
const SCHEDULE_LOOKBACK_MINUTES = 240;
const DEFAULT_INTERACTION_TIMEOUT_SECONDS = 900;
const WEBHOOK_BODY_LIMIT_BYTES = 32_000;
const WEBHOOK_PREVIEW_LIMIT_BYTES = 4_000;

type V2InvocationSource =
  | { kind: "slash"; interaction: ChatInputCommandInteraction<"cached">; guild: Guild; member: GuildMember; channel: TextBasedChannel | null }
  | { kind: "keyword"; message: Message<true>; guild: Guild; member: GuildMember; channel: TextBasedChannel }
  | { kind: "button"; interaction: ButtonInteraction<"cached">; guild: Guild; member: GuildMember; channel: TextBasedChannel | null }
  | { kind: "select"; interaction: StringSelectMenuInteraction<"cached">; guild: Guild; member: GuildMember; channel: TextBasedChannel | null; values: string[] }
  | { kind: "modal_submit"; interaction: ModalSubmitInteraction<"cached">; guild: Guild; member: GuildMember; channel: TextBasedChannel | null }
  | { kind: "join"; guild: Guild; member: GuildMember; channel: TextBasedChannel | null }
  | { kind: "role_add"; guild: Guild; member: GuildMember; channel: TextBasedChannel | null; addedRoleIds: string[] }
  | { kind: "reaction"; reaction: MessageReaction; message: Message<true>; guild: Guild; member: GuildMember; channel: TextBasedChannel | null }
  | { kind: "schedule"; guild: Guild; member: GuildMember; channel: TextBasedChannel | null; scheduledAt: Date };

type RuntimeInteraction =
  | ChatInputCommandInteraction<"cached">
  | ButtonInteraction<"cached">
  | StringSelectMenuInteraction<"cached">
  | ModalSubmitInteraction<"cached">;

const serverCache = new Map<string, { serverId: number; expiresAt: number }>();
const premiumCache = new Map<number, { allowed: boolean; expiresAt: number }>();
const lastScheduledRunCache = new Map<string, number>();
const timezoneFormatterCache = new Map<string, Intl.DateTimeFormat>();

let scheduleTimer: NodeJS.Timeout | null = null;
let scheduleStartedAt = 0;

function now() {
  return Date.now();
}

function cloneJsonRecord(input: Record<string, CustomCommandV2JsonValue>) {
  return JSON.parse(JSON.stringify(input ?? {})) as Record<string, CustomCommandV2JsonValue>;
}

export function normalizeCustomCommandV2SlashName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

function isInteractionSource(source: V2InvocationSource): source is Extract<V2InvocationSource, { interaction: RuntimeInteraction }> {
  return "interaction" in source;
}

function isSendableChannel(channel: unknown): channel is TextBasedChannel & { send: (...args: any[]) => Promise<unknown> } {
  return Boolean(channel && typeof channel === "object" && "send" in channel && typeof (channel as any).send === "function");
}

function getSourceMessageId(source: V2InvocationSource) {
  switch (source.kind) {
    case "keyword":
      return source.message.id;
    case "button":
    case "select":
      return source.interaction.message.id;
    case "reaction":
      return source.message.id;
    default:
      return null;
  }
}

function toMessageRef(response: unknown): { id?: string; channelId?: string | null } | null {
  if (!response || typeof response !== "object") return null;
  const candidate = response as { id?: unknown; channelId?: unknown };
  return {
    id: typeof candidate.id === "string" ? candidate.id : undefined,
    channelId: typeof candidate.channelId === "string" ? candidate.channelId : null,
  };
}

function getFallbackChannel(guild: Guild) {
  if (guild.systemChannel?.isTextBased()) return guild.systemChannel;
  return guild.channels.cache.find((channel) => channel.isTextBased() && isSendableChannel(channel)) as TextBasedChannel | undefined;
}

async function resolveServerIdForGuild(guildId: string) {
  const cached = serverCache.get(guildId);
  if (cached && cached.expiresAt > now()) return cached.serverId;

  const server = await storage.getServerByDiscordId(guildId);
  if (!server) return null;

  serverCache.set(guildId, { serverId: server.id, expiresAt: now() + CACHE_TTL_MS });
  return server.id;
}

async function getCommandsV2ForGuild(guildId: string) {
  const serverId = await resolveServerIdForGuild(guildId);
  if (!serverId) return null;
  const commands = await getActiveCommandsV2ForServer(serverId);
  return { serverId, commands };
}

async function isPremiumEnabled(serverId: number) {
  const cached = premiumCache.get(serverId);
  if (cached && cached.expiresAt > now()) return cached.allowed;

  const allowed = await isPremiumEnabledForServer(serverId);
  premiumCache.set(serverId, { allowed, expiresAt: now() + CACHE_TTL_MS });
  return allowed;
}

function matchesScopedInteraction(config: { channelId?: string; messageId?: string }, channelId: string | null, messageId: string | null) {
  if (config.channelId && config.channelId !== channelId) return false;
  if (config.messageId && config.messageId !== messageId) return false;
  return true;
}

function matchesKeywordCommandV2(command: CustomCommandV2Record, message: Message<true>) {
  const trigger = command.compiled.trigger;
  if (trigger.type !== "keyword") return false;

  const caseSensitive = Boolean(trigger.caseSensitive);
  const haystack = caseSensitive ? message.content.trim() : message.content.trim().toLowerCase();
  const values = [trigger.pattern, ...trigger.aliases]
    .map((value) => caseSensitive ? value.trim() : value.trim().toLowerCase())
    .filter(Boolean);

  return values.some((value) => {
    switch (trigger.matchMode) {
      case "contains":
        return haystack.includes(value);
      case "starts_with":
        return haystack.startsWith(value);
      case "exact":
      default:
        return haystack === value;
    }
  });
}

function matchesButtonCommandV2(command: CustomCommandV2Record, interaction: ButtonInteraction<"cached">) {
  const trigger = command.compiled.trigger;
  if (trigger.type !== "button") return false;
  if (trigger.customId !== interaction.customId) return false;
  return matchesScopedInteraction(trigger, interaction.channel?.id || null, interaction.message?.id || null);
}

function matchesSelectCommandV2(command: CustomCommandV2Record, interaction: StringSelectMenuInteraction<"cached">) {
  const trigger = command.compiled.trigger;
  if (trigger.type !== "select") return false;
  if (trigger.customId !== interaction.customId) return false;
  if (!matchesScopedInteraction(trigger, interaction.channel?.id || null, interaction.message?.id || null)) return false;
  if (trigger.acceptedValues.length === 0) return true;
  return interaction.values.some((value) => trigger.acceptedValues.includes(value));
}

function matchesModalSubmitCommandV2(command: CustomCommandV2Record, interaction: ModalSubmitInteraction<"cached">) {
  const trigger = command.compiled.trigger;
  return trigger.type === "modal_submit" && trigger.customId === interaction.customId;
}

function matchesSessionActor(session: CustomCommandV2SessionRecord, actorId: string) {
  return !session.actorId || session.actorId === actorId;
}

function matchesButtonSession(session: CustomCommandV2SessionRecord, interaction: ButtonInteraction<"cached">) {
  return session.continuationType === "button"
    && matchesSessionActor(session, interaction.user.id)
    && (!session.channelId || session.channelId === interaction.channel?.id)
    && (!session.messageId || session.messageId === interaction.message.id)
    && Array.isArray(session.customIds)
    && session.customIds.includes(interaction.customId);
}

function matchesSelectSession(session: CustomCommandV2SessionRecord, interaction: StringSelectMenuInteraction<"cached">) {
  const acceptedValues = Array.isArray(session.acceptedValues) ? session.acceptedValues : [];
  return session.continuationType === "select"
    && matchesSessionActor(session, interaction.user.id)
    && (!session.channelId || session.channelId === interaction.channel?.id)
    && (!session.messageId || session.messageId === interaction.message.id)
    && session.customId === interaction.customId
    && (acceptedValues.length === 0 || interaction.values.some((value) => acceptedValues.includes(value)));
}

function matchesModalSession(session: CustomCommandV2SessionRecord, interaction: ModalSubmitInteraction<"cached">) {
  return session.continuationType === "modal_submit"
    && matchesSessionActor(session, interaction.user.id)
    && (!session.channelId || session.channelId === interaction.channel?.id)
    && session.customId === interaction.customId;
}

function matchesReactionEmoji(input: string, reaction: MessageReaction) {
  const normalized = input.trim();
  if (!normalized) return false;

  const emojiId = reaction.emoji.id || "";
  const emojiName = reaction.emoji.name || "";
  const emojiTag = emojiId && emojiName ? `<:${emojiName}:${emojiId}>` : "";
  const animatedEmojiTag = emojiId && emojiName ? `<a:${emojiName}:${emojiId}>` : "";
  return normalized === emojiName || normalized === emojiId || normalized === emojiTag || normalized === animatedEmojiTag;
}

function matchesReactionCommandV2(command: CustomCommandV2Record, reaction: MessageReaction) {
  const trigger = command.compiled.trigger;
  if (trigger.type !== "reaction") return false;
  if (!matchesReactionEmoji(trigger.emoji, reaction)) return false;
  if (trigger.channelId && reaction.message.channelId !== trigger.channelId) return false;
  if (trigger.messageId && reaction.message.id !== trigger.messageId) return false;
  return true;
}

function getTimezoneFormatter(timezone: string) {
  const cached = timezoneFormatterCache.get(timezone);
  if (cached) return cached;

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    minute: "numeric",
    hour: "numeric",
    day: "numeric",
    month: "numeric",
    weekday: "short",
    hourCycle: "h23",
  });
  timezoneFormatterCache.set(timezone, formatter);
  return formatter;
}

function getZonedDateParts(date: Date, timezone: string) {
  const parts = getTimezoneFormatter(timezone).formatToParts(date);
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const weekdayRaw = String(lookup.weekday || "").toLowerCase();
  const weekdayByName: Record<string, number> = {
    sun: 0,
    mon: 1,
    tue: 2,
    wed: 3,
    thu: 4,
    fri: 5,
    sat: 6,
  };
  return {
    minute: Number(lookup.minute || 0),
    hour: Number(lookup.hour || 0),
    day: Number(lookup.day || 1),
    month: Number(lookup.month || 1),
    weekday: weekdayByName[weekdayRaw.slice(0, 3)] ?? 0,
  };
}

function matchesCronSegment(segment: string, value: number, min: number, max: number, mapSevenToZero = false) {
  if (!segment) return false;
  if (segment === "*") return true;

  const [rawBase, rawStep] = segment.split("/");
  const step = rawStep ? Number(rawStep) : null;
  if (rawStep && (!Number.isFinite(step) || Number(step) <= 0)) return false;

  const normalizeValue = (input: number) => {
    if (mapSevenToZero && input === 7) return 0;
    return input;
  };

  const parseNumber = (raw: string) => {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return null;
    return normalizeValue(parsed);
  };

  let rangeStart = min;
  let rangeEnd = max;

  if (rawBase && rawBase !== "*") {
    if (rawBase.includes("-")) {
      const [startRaw, endRaw] = rawBase.split("-");
      const start = parseNumber(startRaw);
      const end = parseNumber(endRaw);
      if (start === null || end === null) return false;
      rangeStart = start;
      rangeEnd = end;
    } else {
      const exact = parseNumber(rawBase);
      if (exact === null) return false;
      rangeStart = exact;
      rangeEnd = exact;
    }
  }

  if (value < rangeStart || value > rangeEnd) return false;
  if (!step) return true;
  return (value - rangeStart) % step === 0;
}

function matchesCronField(field: string, value: number, min: number, max: number, mapSevenToZero = false) {
  return field.split(",").some((segment) => matchesCronSegment(segment.trim(), value, min, max, mapSevenToZero));
}

function matchesCronExpression(cronExpression: string, date: Date, timezone: string) {
  const fields = cronExpression.trim().split(/\s+/);
  if (fields.length !== 5) return false;

  const [minuteField, hourField, dayField, monthField, weekdayField] = fields;
  const parts = getZonedDateParts(date, timezone);

  return matchesCronField(minuteField, parts.minute, 0, 59)
    && matchesCronField(hourField, parts.hour, 0, 23)
    && matchesCronField(dayField, parts.day, 1, 31)
    && matchesCronField(monthField, parts.month, 1, 12)
    && matchesCronField(weekdayField, parts.weekday, 0, 6, true);
}

function floorToMinute(date: Date) {
  return new Date(Math.floor(date.getTime() / 60_000) * 60_000);
}

function findMostRecentDueSlotBefore(input: {
  before: Date;
  cronExpression: string;
  timezone: string;
  lookbackMinutes: number;
}) {
  let cursor = new Date(floorToMinute(input.before).getTime() - 60_000);
  for (let index = 0; index < input.lookbackMinutes; index += 1) {
    if (matchesCronExpression(input.cronExpression, cursor, input.timezone)) return cursor;
    cursor = new Date(cursor.getTime() - 60_000);
  }
  return null;
}

function getScheduledDueSlot(command: CustomCommandV2Record, nowDate: Date) {
  const trigger = command.compiled.trigger;
  if (trigger.type !== "schedule") return null;

  const currentSlot = floorToMinute(nowDate);
  const lastRunMs = command.lastRunAt ? new Date(command.lastRunAt).getTime() : 0;
  const lastLocalRunMs = lastScheduledRunCache.get(`v2:${command.id}`) ?? 0;
  const effectiveLastRunMs = Math.max(lastRunMs, lastLocalRunMs);

  if (matchesCronExpression(trigger.cron, currentSlot, trigger.timezone)) {
    return currentSlot.getTime() > effectiveLastRunMs ? currentSlot : null;
  }

  if (scheduleStartedAt <= 0 || nowDate.getTime() - scheduleStartedAt > 5 * 60_000) {
    return null;
  }

  const catchUpSlot = findMostRecentDueSlotBefore({
    before: new Date(scheduleStartedAt),
    cronExpression: trigger.cron,
    timezone: trigger.timezone,
    lookbackMinutes: SCHEDULE_LOOKBACK_MINUTES,
  });
  if (!catchUpSlot) return null;
  return catchUpSlot.getTime() > effectiveLastRunMs ? catchUpSlot : null;
}

function getInteractionForSource(source: V2InvocationSource) {
  return isInteractionSource(source) ? source.interaction : null;
}

async function resolveActionChannel(source: V2InvocationSource, channelId?: string | null) {
  if (channelId) {
    const fetched = await source.guild.channels.fetch(channelId).catch(() => null);
    if (fetched?.isTextBased() && isSendableChannel(fetched)) return fetched as TextBasedChannel;
  }
  if (source.channel && isSendableChannel(source.channel)) return source.channel;
  return getFallbackChannel(source.guild) || null;
}

function buildRuntimeInput(source: V2InvocationSource): Record<string, CustomCommandV2JsonValue> {
  switch (source.kind) {
    case "slash":
      return {
        commandName: source.interaction.commandName,
        interactionId: source.interaction.id,
        channelId: source.channel?.id || null,
      };
    case "keyword":
      return {
        content: source.message.content,
        messageId: source.message.id,
        channelId: source.channel.id,
      };
    case "button":
      return {
        customId: source.interaction.customId,
        messageId: source.interaction.message.id,
        channelId: source.channel?.id || null,
      };
    case "select":
      return {
        customId: source.interaction.customId,
        values: source.values,
        selectedValue: source.values[0] ?? null,
        messageId: source.interaction.message.id,
        channelId: source.channel?.id || null,
      };
    case "modal_submit": {
      const fields = Object.fromEntries(source.interaction.fields.fields.map((field) => [field.customId, field.value]));
      return {
        customId: source.interaction.customId,
        channelId: source.channel?.id || null,
        ...fields,
      };
    }
    case "join":
      return { memberId: source.member.id };
    case "role_add":
      return { memberId: source.member.id, addedRoleIds: source.addedRoleIds };
    case "reaction":
      return {
        emoji: source.reaction.emoji.id || source.reaction.emoji.name || null,
        messageId: source.message.id,
        channelId: source.channel?.id || null,
      };
    case "schedule":
      return { scheduledAt: source.scheduledAt.toISOString() };
    default:
      return {};
  }
}

function toRuntimeChannel(source: V2InvocationSource) {
  return {
    id: source.channel?.id,
    name: source.channel && "name" in source.channel ? String(source.channel.name || "") : undefined,
  };
}

async function toRuntimeActor(source: V2InvocationSource, serverId: number) {
  return {
    id: source.kind === "schedule" ? undefined : source.member.id,
    username: source.member.user.username,
    tag: source.member.user.tag,
    roleIds: Array.from(source.member.roles.cache.keys()),
    permissions: source.member.permissions.toArray(),
    isOwner: source.kind !== "schedule" && source.guild.ownerId === source.member.id,
    isPremium: await isPremiumEnabled(serverId),
  };
}

function toDiscordEmbed(embed: CustomCommandV2Embed) {
  return {
    title: embed.title,
    description: embed.description,
    url: embed.url,
    color: embed.color ? Number.parseInt(embed.color.replace(/^#/, ""), 16) : undefined,
    thumbnail: embed.thumbnailUrl ? { url: embed.thumbnailUrl } : undefined,
    image: embed.imageUrl ? { url: embed.imageUrl } : undefined,
    footer: embed.footerText ? { text: embed.footerText, icon_url: embed.footerIconUrl } : undefined,
    author: embed.authorName
      ? {
          name: embed.authorName,
          url: embed.authorUrl,
          icon_url: embed.authorIconUrl,
        }
      : undefined,
    fields: embed.fields.map((field) => ({
      name: field.name,
      value: field.value,
      inline: field.inline,
    })),
  };
}

function toDiscordButtonStyle(style: string) {
  switch (style) {
    case "secondary":
      return ButtonStyle.Secondary;
    case "success":
      return ButtonStyle.Success;
    case "danger":
      return ButtonStyle.Danger;
    case "link":
      return ButtonStyle.Link;
    case "primary":
    default:
      return ButtonStyle.Primary;
  }
}

async function sendInteractionPayload(
  interaction: RuntimeInteraction,
  payload: InteractionReplyOptions,
  input?: { mode?: "reply" | "followup" | "edit" | "auto" },
): Promise<{ id?: string; channelId?: string | null } | null> {
  const mode = input?.mode ?? "auto";

  if (mode === "edit" && "update" in interaction && typeof interaction.update === "function" && !interaction.deferred && !interaction.replied) {
    await interaction.update(payload as any);
    return interaction.message ?? null;
  }

  if (interaction.deferred && !interaction.replied) {
    if (mode === "followup") {
      return await interaction.followUp({ ...(payload as any), fetchReply: true } as any).catch(() => null) as { id?: string; channelId?: string | null } | null;
    }
    await interaction.editReply(payload as any);
    return await interaction.fetchReply().catch(() => null) as { id?: string; channelId?: string | null } | null;
  }

  if (interaction.replied) {
    if (mode === "edit") {
      await interaction.editReply(payload as any);
      return await interaction.fetchReply().catch(() => null) as { id?: string; channelId?: string | null } | null;
    }
    return await interaction.followUp({ ...(payload as any), fetchReply: true } as any).catch(() => null) as { id?: string; channelId?: string | null } | null;
  }

  await interaction.reply(payload as any);
  return await interaction.fetchReply().catch(() => null) as { id?: string; channelId?: string | null } | null;
}

async function sendRuntimeNotice(source: V2InvocationSource, message: string, ephemeral = true) {
  const interaction = getInteractionForSource(source);
  if (!interaction) return false;

  await sendInteractionPayload(interaction, {
    content: message,
    ephemeral,
  });
  return true;
}

function isSafeWebhookHost(hostname: string) {
  const normalized = hostname.trim().toLowerCase();
  if (!normalized) return false;
  if (normalized === "localhost" || normalized.endsWith(".localhost") || normalized.endsWith(".local")) return false;
  if (/^(127\.|10\.|192\.168\.|169\.254\.)/.test(normalized)) return false;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(normalized)) return false;
  if (normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd")) return false;
  return true;
}

function sanitizeWebhookHeaders(headers: Record<string, string>) {
  const output: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    const normalized = key.trim().toLowerCase();
    if (!normalized) continue;
    if (normalized === "authorization" || normalized === "accept" || normalized === "content-type" || normalized.startsWith("x-")) {
      output[normalized] = value;
    }
  }
  return output;
}

function createLiveExecutionAdapter(input: {
  source: V2InvocationSource;
  command: CustomCommandV2Record;
  serverId: number;
  logger: ArchivistLogger;
}) {
  let sentVisibleOutput = false;
  let sentAnyResponse = false;
  let lastResponseMessageId = getSourceMessageId(input.source);
  let lastResponseChannelId = input.source.channel?.id || null;

  const rememberResponse = (visible = true, messageId?: string | null, channelId?: string | null) => {
    sentAnyResponse = true;
    if (visible) sentVisibleOutput = true;
    if (messageId) lastResponseMessageId = messageId;
    if (channelId) lastResponseChannelId = channelId;
  };

  return {
    state: {
      get sentVisibleOutput() {
        return sentVisibleOutput;
      },
      get sentAnyResponse() {
        return sentAnyResponse;
      },
      get lastResponseMessageId() {
        return lastResponseMessageId;
      },
    },
    adapter: {
      async sendMessage(payload: { content: string; channelTarget: string; channelId?: string; mentionUser?: boolean }) {
        const content = payload.mentionUser && input.source.kind !== "schedule" && input.source.member.id
          ? `<@${input.source.member.id}> ${payload.content}`.trim()
          : payload.content;

        if (payload.channelTarget === "dm") {
          if (input.source.kind === "schedule") {
            throw new Error("Scheduled Archivist commands cannot DM a user without an invoking member.");
          }
          await input.source.member.user.send({ content });
          rememberResponse(false);
          return;
        }

        if (isInteractionSource(input.source) && payload.channelTarget === "current") {
          const response = await sendInteractionPayload(input.source.interaction, {
            content,
            ephemeral: input.command.compiled.behavior.defaultEphemeral,
          });
          rememberResponse(
            !input.command.compiled.behavior.defaultEphemeral,
            response?.id,
            response?.channelId || input.source.channel?.id || null,
          );
          return;
        }

        const channel = await resolveActionChannel(input.source, payload.channelTarget === "configured" ? payload.channelId || null : null);
        if (!channel || !isSendableChannel(channel)) {
          throw new Error("Archivist could not find a text channel to send this message.");
        }
        const response = toMessageRef(await channel.send({ content }));
        rememberResponse(true, response?.id, response?.channelId || channel.id);
      },
      async sendEmbed(payload: { embed: unknown; channelTarget: string; channelId?: string }) {
        const embed = toDiscordEmbed(payload.embed as CustomCommandV2Embed);
        if (isInteractionSource(input.source) && payload.channelTarget === "current") {
          const response = await sendInteractionPayload(input.source.interaction, {
            embeds: [embed],
            ephemeral: input.command.compiled.behavior.defaultEphemeral,
          });
          rememberResponse(
            !input.command.compiled.behavior.defaultEphemeral,
            response?.id,
            response?.channelId || input.source.channel?.id || null,
          );
          return;
        }

        const channel = await resolveActionChannel(input.source, payload.channelTarget === "configured" ? payload.channelId || null : null);
        if (!channel || !isSendableChannel(channel)) {
          throw new Error("Archivist could not find a text channel to send this embed.");
        }
        const response = toMessageRef(await channel.send({ embeds: [embed] }));
        rememberResponse(true, response?.id, response?.channelId || channel.id);
      },
      async replyEphemeral(payload: { content: string; embed?: unknown }) {
        const interaction = getInteractionForSource(input.source);
        if (interaction) {
          const response = await sendInteractionPayload(interaction, {
            content: payload.content,
            embeds: payload.embed ? [toDiscordEmbed(payload.embed as CustomCommandV2Embed)] : undefined,
            ephemeral: true,
          });
          rememberResponse(false, response?.id, response?.channelId || input.source.channel?.id || null);
          return;
        }

        const channel = await resolveActionChannel(input.source);
        if (!channel || !isSendableChannel(channel)) {
          throw new Error("Archivist could not find a fallback channel for this response.");
        }
        const response = toMessageRef(await channel.send({
          content: payload.content,
          embeds: payload.embed ? [toDiscordEmbed(payload.embed as CustomCommandV2Embed)] : undefined,
        }));
        rememberResponse(true, response?.id, response?.channelId || channel.id);
      },
      async addButtonRow(payload: { buttons: unknown[]; responseMode: string }) {
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          (payload.buttons as Array<Record<string, unknown>>).map((button) => {
            const builder = new ButtonBuilder()
              .setLabel(String(button.label || "Button"))
              .setStyle(toDiscordButtonStyle(String(button.style || "primary")));
            if (String(button.style || "primary") === "link" && button.url) {
              return builder.setURL(String(button.url));
            }
            return builder.setCustomId(String(button.customId || button.id || "archivist-button"));
          }),
        );

        const interaction = getInteractionForSource(input.source);
        if (interaction) {
          const responseMode = payload.responseMode === "edit" ? "edit" : payload.responseMode === "followup" ? "followup" : "reply";
          const response = await sendInteractionPayload(interaction, {
            components: [row.toJSON()] as any,
            ephemeral: input.command.compiled.behavior.defaultEphemeral && responseMode !== "edit",
          }, { mode: responseMode });
          rememberResponse(
            responseMode === "edit" ? true : !input.command.compiled.behavior.defaultEphemeral,
            response?.id,
            response?.channelId || input.source.channel?.id || null,
          );
          return;
        }

        const channel = await resolveActionChannel(input.source);
        if (!channel || !isSendableChannel(channel)) {
          throw new Error("Archivist could not find a channel for buttons.");
        }
        const response = toMessageRef(await channel.send({ components: [row.toJSON() as any] }));
        rememberResponse(true, response?.id, response?.channelId || channel.id);
      },
      async addSelectMenu(payload: { customId: string; placeholder?: string; options: unknown[]; minValues: number; maxValues: number }) {
        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(payload.customId)
            .setPlaceholder(payload.placeholder || "Choose an option")
            .setMinValues(payload.minValues)
            .setMaxValues(payload.maxValues)
            .addOptions(
              (payload.options as Array<Record<string, unknown>>).map((option) => ({
                label: String(option.label || "Option"),
                value: String(option.value || option.label || "option"),
                description: option.description ? String(option.description) : undefined,
                emoji: option.emoji ? String(option.emoji) : undefined,
              })),
            ),
        );

        const interaction = getInteractionForSource(input.source);
        if (interaction) {
          const response = await sendInteractionPayload(interaction, {
            components: [row.toJSON()] as any,
            ephemeral: input.command.compiled.behavior.defaultEphemeral,
          });
          rememberResponse(
            !input.command.compiled.behavior.defaultEphemeral,
            response?.id,
            response?.channelId || input.source.channel?.id || null,
          );
          return;
        }

        const channel = await resolveActionChannel(input.source);
        if (!channel || !isSendableChannel(channel)) {
          throw new Error("Archivist could not find a channel for the select menu.");
        }
        const response = toMessageRef(await channel.send({ components: [row.toJSON() as any] }));
        rememberResponse(true, response?.id, response?.channelId || channel.id);
      },
      async openModal(payload: { customId: string; title: string; fields: unknown[] }) {
        const interaction = getInteractionForSource(input.source);
        if (!interaction || input.source.kind === "modal_submit" || typeof (interaction as any).showModal !== "function") {
          throw new Error("Modals can only open from an Archivist interaction trigger.");
        }
        if (interaction.deferred || interaction.replied) {
          throw new Error("Archivist cannot open a modal after the interaction has already been answered.");
        }

        const modal = new ModalBuilder().setCustomId(payload.customId).setTitle(payload.title);
        const rows = (payload.fields as Array<Record<string, unknown>>).map((field) => {
          const builder = new TextInputBuilder()
            .setCustomId(String(field.id || "field"))
            .setLabel(String(field.label || "Field"))
            .setStyle(String(field.style || "short") === "paragraph" ? TextInputStyle.Paragraph : TextInputStyle.Short)
            .setRequired(Boolean(field.required ?? true));
          if (field.placeholder) builder.setPlaceholder(String(field.placeholder));
          if (typeof field.minLength === "number") builder.setMinLength(field.minLength);
          if (typeof field.maxLength === "number") builder.setMaxLength(field.maxLength);
          return new ActionRowBuilder<TextInputBuilder>().addComponents(builder);
        });
        modal.addComponents(...rows);
        await (interaction as any).showModal(modal as any);
        rememberResponse(false);
      },
      async createContinuationSession(payload: {
        continuationType: "button" | "select" | "modal_submit";
        stepId: string;
        nextStepId: string;
        timeoutSeconds: number;
        onTimeoutStepId?: string;
        customId?: string;
        customIds?: string[];
        acceptedValues?: string[];
        variables: Record<string, CustomCommandV2JsonValue>;
        input: Record<string, CustomCommandV2JsonValue>;
      }) {
        await storage.createCommandV2Session(input.serverId, {
          commandId: input.command.id,
          continuationType: payload.continuationType,
          stepId: payload.stepId,
          nextStepId: payload.nextStepId,
          onTimeoutStepId: payload.onTimeoutStepId ?? null,
          actorId: input.source.kind === "schedule" ? null : input.source.member.id,
          channelId: lastResponseChannelId || input.source.channel?.id || null,
          messageId: lastResponseMessageId,
          customId: payload.customId ?? null,
          customIds: payload.customIds ?? [],
          acceptedValues: payload.acceptedValues ?? [],
          definition: input.command.definition,
          compiled: input.command.compiled,
          variables: cloneJsonRecord(payload.variables),
          input: cloneJsonRecord(payload.input),
          expiresAt: new Date(Date.now() + Math.max(payload.timeoutSeconds || DEFAULT_INTERACTION_TIMEOUT_SECONDS, 5) * 1000),
        }).catch((error) => {
          throw new Error(error instanceof Error ? error.message : "Archivist could not save the interaction session.");
        });
      },
      async addRole(payload: { roleId: string; target: string }) {
        const targetMember = payload.target === "target"
          ? input.source.kind === "keyword"
            ? input.source.message.mentions.members?.first() || input.source.member
            : input.source.member
          : input.source.member;
        const role = input.source.guild.roles.cache.get(payload.roleId);
        if (!role) throw new Error("One of the configured roles no longer exists.");
        if (!input.source.guild.members.me?.permissions.has("ManageRoles")) {
          throw new Error("Archivist needs Manage Roles to add roles.");
        }
        if (input.source.guild.members.me.roles.highest.position <= role.position) {
          throw new Error("Archivist cannot manage one of the configured roles because of role hierarchy.");
        }
        await targetMember.roles.add(role);
      },
      async removeRole(payload: { roleId: string; target: string }) {
        const targetMember = payload.target === "target"
          ? input.source.kind === "keyword"
            ? input.source.message.mentions.members?.first() || input.source.member
            : input.source.member
          : input.source.member;
        const role = input.source.guild.roles.cache.get(payload.roleId);
        if (!role) throw new Error("One of the configured roles no longer exists.");
        if (!input.source.guild.members.me?.permissions.has("ManageRoles")) {
          throw new Error("Archivist needs Manage Roles to remove roles.");
        }
        if (input.source.guild.members.me.roles.highest.position <= role.position) {
          throw new Error("Archivist cannot manage one of the configured roles because of role hierarchy.");
        }
        await targetMember.roles.remove(role);
      },
      async callWebhook(payload: { method: string; url: string; headers: Record<string, string>; body: Record<string, CustomCommandV2JsonValue>; timeoutMs: number }) {
        const parsed = new URL(payload.url);
        if (!["http:", "https:"].includes(parsed.protocol)) {
          throw new Error("Archivist webhooks only support HTTP and HTTPS URLs.");
        }
        if (!isSafeWebhookHost(parsed.hostname)) {
          throw new Error("Archivist blocked an unsafe webhook host.");
        }

        const headers = sanitizeWebhookHeaders(payload.headers);
        const bodyText = JSON.stringify(payload.body ?? {});
        if (Buffer.byteLength(bodyText, "utf8") > WEBHOOK_BODY_LIMIT_BYTES) {
          throw new Error("Archivist blocked a webhook body that was too large.");
        }

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), Math.min(payload.timeoutMs, 10_000));
        try {
          const response = await fetch(payload.url, {
            method: payload.method,
            headers: {
              "content-type": "application/json",
              ...headers,
            },
            body: payload.method === "GET" ? undefined : bodyText,
            signal: controller.signal,
          });
          const previewText = truncateText(await response.text().catch(() => ""), WEBHOOK_PREVIEW_LIMIT_BYTES);
          return {
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
            previewText,
          };
        } finally {
          clearTimeout(timer);
        }
      },
      log(payload: { level: "info" | "warn" | "error"; message: string }) {
        input.logger[payload.level]("Archivist Custom Command V2 log.", {
          guildId: input.source.guild.id,
          memberId: input.source.kind === "schedule" ? null : input.source.member.id,
          message: payload.message,
        });
      },
    },
  };
}

function getSummaryFromResult(result: Awaited<ReturnType<typeof executeCustomCommandV2>>) {
  return truncateText(
    result.outputs[result.outputs.length - 1]?.summary
      || result.trace[result.trace.length - 1]?.summary
      || result.preview.triggerLabel
      || "Archivist Custom Command ran.",
  );
}

async function maybeDeleteInvocation(command: CustomCommandV2Record, source: V2InvocationSource) {
  if (!command.definition.behavior.deleteInvocation || source.kind !== "keyword") return;
  if (!source.guild.members.me?.permissions.has("ManageMessages")) return;
  await source.message.delete().catch(() => null);
}

type RunCommandV2Options = {
  definition?: CustomCommandV2Definition;
  compiled?: CustomCommandV2Compiled;
  runtimeInput?: Record<string, CustomCommandV2JsonValue>;
  entryStepId?: string;
  initialVariables?: Record<string, CustomCommandV2JsonValue>;
  skipBehaviorCooldown?: boolean;
  countUsage?: boolean;
};

function findPendingSessionMatch(
  sessions: CustomCommandV2SessionRecord[],
  matcher: (session: CustomCommandV2SessionRecord) => boolean,
) {
  const matchingSessions = sessions.filter(matcher);
  if (matchingSessions.length === 0) return null;

  const activeMatch = matchingSessions.find((session) => new Date(session.expiresAt).getTime() > Date.now());
  if (activeMatch) return { session: activeMatch, expired: false as const };
  return { session: matchingSessions[0], expired: true as const };
}

async function resumeCommandV2Session(
  session: CustomCommandV2SessionRecord,
  source: Extract<V2InvocationSource, { interaction: RuntimeInteraction }>,
  serverId: number,
  logger: ArchivistLogger,
  options?: { entryStepId?: string },
) {
  const claimedSession = await storage.claimCommandV2Session(session.id).catch(() => null);
  if (!claimedSession) return true;

  const liveCommand = await storage.getCommandV2ById(claimedSession.commandId).catch(() => undefined);

  if (!liveCommand || liveCommand.serverId !== serverId || liveCommand.enabled === false) {
    await sendRuntimeNotice(source, "This Archivist interaction is no longer active. Run the command again.", true).catch(() => null);
    return true;
  }

  await runCommandV2(liveCommand, source, serverId, logger, {
    definition: liveCommand.definition,
    compiled: liveCommand.compiled,
    runtimeInput: {
      ...cloneJsonRecord(claimedSession.input ?? {}),
      ...buildRuntimeInput(source),
    },
    entryStepId: options?.entryStepId ?? claimedSession.nextStepId,
    initialVariables: cloneJsonRecord(claimedSession.variables ?? {}),
    skipBehaviorCooldown: true,
    countUsage: false,
  });

  return true;
}

async function runCommandV2(
  command: CustomCommandV2Record,
  source: V2InvocationSource,
  serverId: number,
  logger: ArchivistLogger,
  options: RunCommandV2Options = {},
) {
  const startedAt = Date.now();
  const actor = await toRuntimeActor(source, serverId);
  const channel = toRuntimeChannel(source);
  const definition = options.definition ?? command.definition;
  const compiled = options.compiled ?? command.compiled;
  const runtimeInput = options.runtimeInput ?? buildRuntimeInput(source);
  const executionCommand: CustomCommandV2Record = {
    ...command,
    definition,
    compiled,
  };
  const adapterBridge = createLiveExecutionAdapter({
    source,
    command: executionCommand,
    serverId,
    logger,
  });

  const result = await executeCustomCommandV2({
    serverId,
    commandId: command.id,
    commandKey: `archivist-v2:${command.id}`,
    definition,
    compiled,
    actor,
    channel,
    runtimeInput,
    entryStepId: options.entryStepId,
    initialVariables: options.initialVariables,
    skipBehaviorCooldown: options.skipBehaviorCooldown,
    mode: "live",
    adapter: adapterBridge.adapter,
  });

  if (!result.ok) {
    const summary = result.outputs[0]?.summary || result.trace[result.trace.length - 1]?.summary || "Archivist could not run that command.";
    if (isInteractionSource(source) && !adapterBridge.state.sentAnyResponse) {
      await sendRuntimeNotice(source, summary, true).catch(() => null);
    }
    throw new Error(summary);
  }

  if (isInteractionSource(source) && !adapterBridge.state.sentAnyResponse) {
    await sendRuntimeNotice(source, `Ran \`${command.name}\`.`, compiled.behavior.defaultEphemeral).catch(() => null);
  }

  if (options.countUsage !== false) {
    await maybeDeleteInvocation(executionCommand, source);
    const completedAt = source.kind === "schedule" ? source.scheduledAt : new Date();
    await storage.touchCommandV2Usage(command.id, { lastRunAt: completedAt }).catch(() => null);
    lastScheduledRunCache.set(`v2:${command.id}`, completedAt.getTime());
    command.lastRunAt = completedAt;
    command.usageCount = Number(command.usageCount || 0) + 1;
  }

  commandActivityStore.recordSuccess({
    guildId: source.guild.id,
    guildName: source.guild.name,
    commandPath: command.name,
    actorId: source.member.id,
    actorTag: source.member.user.tag,
    summary: getSummaryFromResult(result),
    durationMs: Date.now() - startedAt,
  });

  return true;
}

function recordCustomV2Failure(input: {
  guildId: string;
  guildName: string;
  commandName: string;
  actorId: string;
  actorTag: string;
  durationMs: number;
  message: string;
}) {
  commandActivityStore.recordFailure({
    guildId: input.guildId,
    guildName: input.guildName,
    commandPath: input.commandName,
    actorId: input.actorId,
    actorTag: input.actorTag,
    summary: truncateText(input.message),
    durationMs: input.durationMs,
    code: "ARCHIVIST_CUSTOM_COMMAND_V2_FAILED",
    message: input.message,
  });
}

export function buildCustomCommandV2SlashPayloads(commands: CustomCommandV2Record[]) {
  const seenNames = new Set<string>();

  return commands
    .filter((command) => command.enabled !== false && command.compiled.trigger.type === "slash")
    .flatMap((command) => {
      const trigger = command.compiled.trigger;
      if (trigger.type !== "slash") return [];

      const normalizedName = normalizeCustomCommandV2SlashName(trigger.name || command.name);
      if (!normalizedName || seenNames.has(normalizedName)) return [];
      seenNames.add(normalizedName);

      return [
        new SlashCommandBuilder()
          .setName(normalizedName)
          .setDescription((trigger.description || command.definition.meta.description || `Run ${normalizedName}`).slice(0, 100))
          .toJSON(),
      ];
    });
}

export async function getCustomCommandV2SlashPayloadsForServer(serverId: number) {
  const commands = await getActiveCommandsV2ForServer(serverId);
  return buildCustomCommandV2SlashPayloads(commands);
}

export function invalidateCustomCommandV2RuntimeCache(serverId?: number) {
  if (typeof serverId === "number") {
    premiumCache.delete(serverId);
    return;
  }
  premiumCache.clear();
  serverCache.clear();
}

export async function syncCustomCommandsV2ForServer(input: {
  env: ArchivistEnv;
  logger: ArchivistLogger;
  serverId: number;
}) {
  if (!input.env.clientId || !input.env.token) return;

  const server = await storage.getServer(input.serverId);
  if (!server?.discordId) return;

  const rest = new REST({ version: "10" }).setToken(input.env.token);
  const payload = await getCustomCommandV2SlashPayloadsForServer(input.serverId);
  await rest.put(Routes.applicationGuildCommands(input.env.clientId, server.discordId), { body: payload as any });
  input.logger.info("Synchronized Archivist Custom Commands V2.", {
    serverId: input.serverId,
    guildId: server.discordId,
    count: payload.length,
  });
}

export async function handleCustomV2SlashInteraction(interaction: ChatInputCommandInteraction, logger: ArchivistLogger) {
  if (!interaction.inCachedGuild() || !interaction.guild) return false;

  const payload = await getCommandsV2ForGuild(interaction.guild.id);
  if (!payload) return false;

  const matched = payload.commands.find((command) =>
    command.compiled.trigger.type === "slash"
    && normalizeCustomCommandV2SlashName(command.compiled.trigger.name || command.name) === interaction.commandName,
  );
  if (!matched) return false;

  await runCommandV2(matched, {
    kind: "slash",
    interaction: interaction as ChatInputCommandInteraction<"cached">,
    guild: interaction.guild,
    member: interaction.member as GuildMember,
    channel: interaction.channel?.isTextBased() ? (interaction.channel as TextBasedChannel) : null,
  }, payload.serverId, logger.child(`archivist-v2:${matched.name}`));
  return true;
}

export async function handleCustomV2KeywordMessage(message: Message, logger: ArchivistLogger) {
  if (!message.inGuild() || message.author.bot || !message.member) return false;

  const payload = await getCommandsV2ForGuild(message.guild.id);
  if (!payload) return false;

  const commands = payload.commands.filter((command) =>
    command.compiled.trigger.type === "keyword" && matchesKeywordCommandV2(command, message as Message<true>),
  );
  if (commands.length === 0) return false;

  for (const command of commands) {
    const startedAt = Date.now();
    try {
      await runCommandV2(command, {
        kind: "keyword",
        message: message as Message<true>,
        guild: message.guild,
        member: message.member,
        channel: message.channel as TextBasedChannel,
      }, payload.serverId, logger.child(`archivist-v2:${command.name}`));
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "Archivist Custom Command V2 failed.";
      logger.error("Archivist Custom Command V2 keyword failed.", {
        guildId: message.guild.id,
        commandName: command.name,
        message: messageText,
      });
      recordCustomV2Failure({
        guildId: message.guild.id,
        guildName: message.guild.name,
        commandName: command.name,
        actorId: message.author.id,
        actorTag: message.author.tag,
        durationMs: Date.now() - startedAt,
        message: messageText,
      });
    }
  }

  return true;
}

export async function handleCustomV2ButtonInteraction(interaction: ButtonInteraction, logger: ArchivistLogger) {
  if (!interaction.inCachedGuild() || !interaction.guild) return false;

  const payload = await getCommandsV2ForGuild(interaction.guild.id);
  if (!payload) return false;

  const source = {
    kind: "button",
    interaction: interaction as ButtonInteraction<"cached">,
    guild: interaction.guild,
    member: interaction.member as GuildMember,
    channel: interaction.channel?.isTextBased() ? (interaction.channel as TextBasedChannel) : null,
  } as const;
  const sessions = await storage.getPendingCommandV2Sessions(payload.serverId, "button");
  const sessionMatch = findPendingSessionMatch(sessions, (session) =>
    matchesButtonSession(session, interaction as ButtonInteraction<"cached">),
  );
  if (sessionMatch) {
    if (sessionMatch.expired) {
      if (sessionMatch.session.onTimeoutStepId) {
        try {
          return await resumeCommandV2Session(
            sessionMatch.session,
            source,
            payload.serverId,
            logger.child(`archivist-v2:timeout:${sessionMatch.session.commandId}`),
            { entryStepId: sessionMatch.session.onTimeoutStepId },
          );
        } catch (error) {
          const messageText = error instanceof Error ? error.message : "Archivist Custom Command V2 failed.";
          await sendRuntimeNotice(source, messageText, true).catch(() => null);
          return true;
        }
      }
      const claimed = await storage.claimCommandV2Session(sessionMatch.session.id).catch(() => null);
      if (claimed) {
        await sendRuntimeNotice(source, "That Archivist button expired. Run the command again.", true).catch(() => null);
      }
      return true;
    }

    const startedAt = Date.now();
    try {
      return await resumeCommandV2Session(sessionMatch.session, source, payload.serverId, logger.child(`archivist-v2:resume:${sessionMatch.session.commandId}`));
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "Archivist Custom Command V2 failed.";
      logger.error("Archivist Custom Command V2 button continuation failed.", {
        guildId: interaction.guild.id,
        commandId: sessionMatch.session.commandId,
        customId: interaction.customId,
        message: messageText,
      });
      recordCustomV2Failure({
        guildId: interaction.guild.id,
        guildName: interaction.guild.name,
        commandName: `archivist-v2:${sessionMatch.session.commandId}`,
        actorId: interaction.user.id,
        actorTag: interaction.user.tag,
        durationMs: Date.now() - startedAt,
        message: messageText,
      });
      await sendRuntimeNotice(source, messageText, true).catch(() => null);
      return true;
    }
  }

  const matched = payload.commands.find((command) => matchesButtonCommandV2(command, interaction as ButtonInteraction<"cached">));
  if (!matched) return false;

  const startedAt = Date.now();
  try {
    await runCommandV2(matched, source, payload.serverId, logger.child(`archivist-v2:${matched.name}`));
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "Archivist Custom Command V2 failed.";
    logger.error("Archivist Custom Command V2 button failed.", {
      guildId: interaction.guild.id,
      commandName: matched.name,
      customId: interaction.customId,
      message: messageText,
    });
    recordCustomV2Failure({
      guildId: interaction.guild.id,
      guildName: interaction.guild.name,
      commandName: matched.name,
      actorId: interaction.user.id,
        actorTag: interaction.user.tag,
        durationMs: Date.now() - startedAt,
        message: messageText,
      });
    await sendRuntimeNotice(source, messageText, true).catch(() => null);
  }

  return true;
}

export async function handleCustomV2SelectInteraction(interaction: StringSelectMenuInteraction, logger: ArchivistLogger) {
  if (!interaction.inCachedGuild() || !interaction.guild) return false;

  const payload = await getCommandsV2ForGuild(interaction.guild.id);
  if (!payload) return false;

  const source = {
    kind: "select",
    interaction: interaction as StringSelectMenuInteraction<"cached">,
    guild: interaction.guild,
    member: interaction.member as GuildMember,
    channel: interaction.channel?.isTextBased() ? (interaction.channel as TextBasedChannel) : null,
    values: interaction.values,
  } as const;
  const sessions = await storage.getPendingCommandV2Sessions(payload.serverId, "select");
  const sessionMatch = findPendingSessionMatch(sessions, (session) =>
    matchesSelectSession(session, interaction as StringSelectMenuInteraction<"cached">),
  );
  if (sessionMatch) {
    if (sessionMatch.expired) {
      if (sessionMatch.session.onTimeoutStepId) {
        try {
          return await resumeCommandV2Session(
            sessionMatch.session,
            source,
            payload.serverId,
            logger.child(`archivist-v2:timeout:${sessionMatch.session.commandId}`),
            { entryStepId: sessionMatch.session.onTimeoutStepId },
          );
        } catch (error) {
          const messageText = error instanceof Error ? error.message : "Archivist Custom Command V2 failed.";
          await sendRuntimeNotice(source, messageText, true).catch(() => null);
          return true;
        }
      }
      const claimed = await storage.claimCommandV2Session(sessionMatch.session.id).catch(() => null);
      if (claimed) {
        await sendRuntimeNotice(source, "That Archivist menu expired. Run the command again.", true).catch(() => null);
      }
      return true;
    }

    const startedAt = Date.now();
    try {
      return await resumeCommandV2Session(sessionMatch.session, source, payload.serverId, logger.child(`archivist-v2:resume:${sessionMatch.session.commandId}`));
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "Archivist Custom Command V2 failed.";
      logger.error("Archivist Custom Command V2 select continuation failed.", {
        guildId: interaction.guild.id,
        commandId: sessionMatch.session.commandId,
        customId: interaction.customId,
        message: messageText,
      });
      recordCustomV2Failure({
        guildId: interaction.guild.id,
        guildName: interaction.guild.name,
        commandName: `archivist-v2:${sessionMatch.session.commandId}`,
        actorId: interaction.user.id,
        actorTag: interaction.user.tag,
        durationMs: Date.now() - startedAt,
        message: messageText,
      });
      await sendRuntimeNotice(source, messageText, true).catch(() => null);
      return true;
    }
  }

  const matched = payload.commands.find((command) => matchesSelectCommandV2(command, interaction as StringSelectMenuInteraction<"cached">));
  if (!matched) return false;

  const startedAt = Date.now();
  try {
    await runCommandV2(matched, source, payload.serverId, logger.child(`archivist-v2:${matched.name}`));
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "Archivist Custom Command V2 failed.";
    logger.error("Archivist Custom Command V2 select failed.", {
      guildId: interaction.guild.id,
      commandName: matched.name,
      customId: interaction.customId,
      message: messageText,
    });
    recordCustomV2Failure({
      guildId: interaction.guild.id,
      guildName: interaction.guild.name,
      commandName: matched.name,
      actorId: interaction.user.id,
        actorTag: interaction.user.tag,
        durationMs: Date.now() - startedAt,
        message: messageText,
      });
    await sendRuntimeNotice(source, messageText, true).catch(() => null);
  }

  return true;
}

export async function handleCustomV2ModalInteraction(interaction: ModalSubmitInteraction, logger: ArchivistLogger) {
  if (!interaction.inCachedGuild() || !interaction.guild) return false;

  const payload = await getCommandsV2ForGuild(interaction.guild.id);
  if (!payload) return false;

  const source = {
    kind: "modal_submit",
    interaction: interaction as ModalSubmitInteraction<"cached">,
    guild: interaction.guild,
    member: interaction.member as GuildMember,
    channel: interaction.channel?.isTextBased() ? (interaction.channel as TextBasedChannel) : null,
  } as const;
  const sessions = await storage.getPendingCommandV2Sessions(payload.serverId, "modal_submit");
  const sessionMatch = findPendingSessionMatch(sessions, (session) =>
    matchesModalSession(session, interaction as ModalSubmitInteraction<"cached">),
  );
  if (sessionMatch) {
    if (sessionMatch.expired) {
      if (sessionMatch.session.onTimeoutStepId) {
        try {
          return await resumeCommandV2Session(
            sessionMatch.session,
            source,
            payload.serverId,
            logger.child(`archivist-v2:timeout:${sessionMatch.session.commandId}`),
            { entryStepId: sessionMatch.session.onTimeoutStepId },
          );
        } catch (error) {
          const messageText = error instanceof Error ? error.message : "Archivist Custom Command V2 failed.";
          await sendRuntimeNotice(source, messageText, true).catch(() => null);
          return true;
        }
      }
      const claimed = await storage.claimCommandV2Session(sessionMatch.session.id).catch(() => null);
      if (claimed) {
        await sendRuntimeNotice(source, "That Archivist form expired. Run the command again.", true).catch(() => null);
      }
      return true;
    }

    const startedAt = Date.now();
    try {
      return await resumeCommandV2Session(sessionMatch.session, source, payload.serverId, logger.child(`archivist-v2:resume:${sessionMatch.session.commandId}`));
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "Archivist Custom Command V2 failed.";
      logger.error("Archivist Custom Command V2 modal continuation failed.", {
        guildId: interaction.guild.id,
        commandId: sessionMatch.session.commandId,
        customId: interaction.customId,
        message: messageText,
      });
      recordCustomV2Failure({
        guildId: interaction.guild.id,
        guildName: interaction.guild.name,
        commandName: `archivist-v2:${sessionMatch.session.commandId}`,
        actorId: interaction.user.id,
        actorTag: interaction.user.tag,
        durationMs: Date.now() - startedAt,
        message: messageText,
      });
      await sendRuntimeNotice(source, messageText, true).catch(() => null);
      return true;
    }
  }

  const matched = payload.commands.find((command) => matchesModalSubmitCommandV2(command, interaction as ModalSubmitInteraction<"cached">));
  if (!matched) return false;

  const startedAt = Date.now();
  try {
    await runCommandV2(matched, source, payload.serverId, logger.child(`archivist-v2:${matched.name}`));
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "Archivist Custom Command V2 failed.";
    logger.error("Archivist Custom Command V2 modal submit failed.", {
      guildId: interaction.guild.id,
      commandName: matched.name,
      customId: interaction.customId,
      message: messageText,
    });
    recordCustomV2Failure({
      guildId: interaction.guild.id,
      guildName: interaction.guild.name,
      commandName: matched.name,
      actorId: interaction.user.id,
        actorTag: interaction.user.tag,
        durationMs: Date.now() - startedAt,
        message: messageText,
      });
    await sendRuntimeNotice(source, messageText, true).catch(() => null);
  }

  return true;
}

export async function handleCustomV2MemberJoin(member: GuildMember, logger: ArchivistLogger) {
  const payload = await getCommandsV2ForGuild(member.guild.id);
  if (!payload) return false;

  const commands = payload.commands.filter((command) => command.compiled.trigger.type === "join");
  for (const command of commands) {
    const startedAt = Date.now();
    try {
      await runCommandV2(command, {
        kind: "join",
        guild: member.guild,
        member,
        channel: getFallbackChannel(member.guild) || null,
      }, payload.serverId, logger.child(`archivist-v2:${command.name}`));
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "Archivist Custom Command V2 failed.";
      recordCustomV2Failure({
        guildId: member.guild.id,
        guildName: member.guild.name,
        commandName: command.name,
        actorId: member.id,
        actorTag: member.user.tag,
        durationMs: Date.now() - startedAt,
        message: messageText,
      });
    }
  }

  return commands.length > 0;
}

export async function handleCustomV2RoleAdd(oldMember: GuildMember | PartialGuildMember, newMember: GuildMember | PartialGuildMember, logger: ArchivistLogger) {
  if (oldMember.partial || newMember.partial) return false;
  const previousMember = oldMember as GuildMember;
  const currentMember = newMember as GuildMember;
  const addedRoleIds = currentMember.roles.cache.filter((role) => !previousMember.roles.cache.has(role.id)).map((role) => role.id);
  if (addedRoleIds.length === 0) return false;

  const payload = await getCommandsV2ForGuild(currentMember.guild.id);
  if (!payload) return false;

  const commands = payload.commands.filter((command) => {
    const trigger = command.compiled.trigger;
    return trigger.type === "role_add"
      && (trigger.roleIds.length === 0 || trigger.roleIds.some((roleId) => addedRoleIds.includes(roleId)));
  });

  for (const command of commands) {
    const startedAt = Date.now();
    try {
      await runCommandV2(command, {
        kind: "role_add",
        guild: currentMember.guild,
        member: currentMember,
        channel: getFallbackChannel(currentMember.guild) || null,
        addedRoleIds,
      }, payload.serverId, logger.child(`archivist-v2:${command.name}`));
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "Archivist Custom Command V2 failed.";
      recordCustomV2Failure({
        guildId: currentMember.guild.id,
        guildName: currentMember.guild.name,
        commandName: command.name,
        actorId: currentMember.id,
        actorTag: currentMember.user.tag,
        durationMs: Date.now() - startedAt,
        message: messageText,
      });
    }
  }

  return commands.length > 0;
}

export async function handleCustomV2ReactionAdd(
  reactionInput: MessageReaction | PartialMessageReaction,
  userInput: User | PartialUser,
  logger: ArchivistLogger,
) {
  if (userInput.bot) return false;

  const reaction = reactionInput.partial ? await reactionInput.fetch().catch(() => null) : reactionInput;
  if (!reaction) return false;
  const message = reaction.message.partial ? await reaction.message.fetch().catch(() => null) : reaction.message;
  if (!message || !message.inGuild()) return false;

  const member = await message.guild.members.fetch(userInput.id).catch(() => null);
  if (!member) return false;

  const payload = await getCommandsV2ForGuild(message.guild.id);
  if (!payload) return false;

  const commands = payload.commands.filter((command) => matchesReactionCommandV2(command, reaction as MessageReaction));
  if (commands.length === 0) return false;

  for (const command of commands) {
    const startedAt = Date.now();
    try {
      await runCommandV2(command, {
        kind: "reaction",
        reaction: reaction as MessageReaction,
        message: message as Message<true>,
        guild: message.guild,
        member,
        channel: message.channel.isTextBased() ? (message.channel as TextBasedChannel) : null,
      }, payload.serverId, logger.child(`archivist-v2:${command.name}`));
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "Archivist Custom Command V2 failed.";
      logger.error("Archivist Custom Command V2 reaction failed.", {
        guildId: message.guild.id,
        commandName: command.name,
        message: messageText,
      });
      recordCustomV2Failure({
        guildId: message.guild.id,
        guildName: message.guild.name,
        commandName: command.name,
        actorId: member.id,
        actorTag: member.user.tag,
        durationMs: Date.now() - startedAt,
        message: messageText,
      });
    }
  }

  return true;
}

async function runScheduledCommandsV2(client: Client<true>, logger: ArchivistLogger) {
  const currentNow = new Date();

  for (const guild of Array.from(client.guilds.cache.values())) {
    const payload = await getCommandsV2ForGuild(guild.id);
    if (!payload) continue;

    const commands = payload.commands.filter((command) => command.compiled.trigger.type === "schedule");
    if (commands.length === 0) continue;

    const botMember = guild.members.me ?? await guild.members.fetchMe().catch(() => null);
    if (!botMember) continue;

    for (const command of commands) {
      const dueSlot = getScheduledDueSlot(command, currentNow);
      if (!dueSlot) continue;

      const startedAt = Date.now();
      try {
        await runCommandV2(command, {
          kind: "schedule",
          guild,
          member: botMember,
          channel: getFallbackChannel(guild) || null,
          scheduledAt: dueSlot,
        }, payload.serverId, logger.child(`archivist-v2:${command.name}`));
      } catch (error) {
        const messageText = error instanceof Error ? error.message : "Archivist Custom Command V2 failed.";
        logger.error("Scheduled Archivist Custom Command V2 failed.", {
          guildId: guild.id,
          commandName: command.name,
          message: messageText,
        });
        recordCustomV2Failure({
          guildId: guild.id,
          guildName: guild.name,
          commandName: command.name,
          actorId: botMember.id,
          actorTag: botMember.user.tag,
          durationMs: Date.now() - startedAt,
          message: messageText,
        });
      }
    }
  }
}

export function startCustomCommandV2Scheduler(input: {
  client: Client<true>;
  logger: ArchivistLogger;
}) {
  scheduleStartedAt = now();
  if (scheduleTimer) clearInterval(scheduleTimer);
  scheduleTimer = setInterval(() => {
    runScheduledCommandsV2(input.client, input.logger).catch((error) => {
      input.logger.error("Archivist Custom Command V2 schedule tick failed.", {
        message: error instanceof Error ? error.message : String(error),
      });
    });
  }, SCHEDULE_TICK_MS);
}

export function stopCustomCommandV2Scheduler() {
  if (!scheduleTimer) return;
  clearInterval(scheduleTimer);
  scheduleTimer = null;
}
