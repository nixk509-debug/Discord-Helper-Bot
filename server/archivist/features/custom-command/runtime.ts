import {
  ChannelType,
  REST,
  Routes,
  SlashCommandBuilder,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type Client,
  type Guild,
  type GuildMember,
  type Message,
  type MessageReaction,
  type PartialGuildMember,
  type PartialMessageReaction,
  type PartialUser,
  type StringSelectMenuInteraction,
  type TextBasedChannel,
  type User,
} from "discord.js";
import {
  getTriggerConfigErrors,
  normalizeTriggerConfig,
  type ButtonTriggerConfig,
  type KeywordTriggerConfig,
  type ReactionTriggerConfig,
  type RoleAddTriggerConfig,
  type ScheduleTriggerConfig,
  type SelectTriggerConfig,
} from "@shared/command-triggers";
import { buildStudioPublishPlan } from "@shared/studio-publish-plan";
import { resolveStudioTokensInString, resolveStudioTokensInValue, type StudioTokenContext } from "@shared/studio-tokens";
import type { CommandAction, CustomCommand } from "@shared/schema";
import { storage } from "../../../storage";
import { buildStudioDiscordPayload } from "../../../studio-discord";
import { getStudioDocumentById, normalizeStudioDocument } from "../../../studio-service";
import { isPremiumEnabledForServer } from "../../../premium-service";
import type { ArchivistEnv } from "../../config/env";
import { CommandError } from "../../lib/errors";
import type { ArchivistLogger } from "../../lib/logger";
import { commandActivityStore } from "../../lib/logger/activity-store";
import { truncateText } from "../../lib/utils/format";
import { buildCommandPayloads } from "../../commands/registry";
import { getCustomCommandV2SlashPayloadsForServer } from "../custom-command-v2/runtime";

const CACHE_TTL_MS = 30_000;
const SCHEDULE_TICK_MS = 30_000;
const SCHEDULE_LOOKBACK_MINUTES = 240;

type SupportedCustomTrigger = "slash" | "keyword" | "button" | "select" | "schedule" | "join" | "role_add" | "reaction";

type InvocationSource =
  | { kind: "slash"; interaction: ChatInputCommandInteraction; guild: Guild; member: GuildMember; channel: TextBasedChannel | null }
  | { kind: "keyword"; message: Message<true>; guild: Guild; member: GuildMember; channel: TextBasedChannel }
  | { kind: "button"; interaction: ButtonInteraction<"cached">; guild: Guild; member: GuildMember; channel: TextBasedChannel | null }
  | { kind: "select"; interaction: StringSelectMenuInteraction<"cached">; guild: Guild; member: GuildMember; channel: TextBasedChannel | null; values: string[] }
  | { kind: "join"; guild: Guild; member: GuildMember; channel: TextBasedChannel | null }
  | { kind: "role_add"; guild: Guild; member: GuildMember; channel: TextBasedChannel | null; addedRoleIds: string[] }
  | { kind: "reaction"; reaction: MessageReaction; message: Message<true>; guild: Guild; member: GuildMember; channel: TextBasedChannel | null }
  | { kind: "schedule"; guild: Guild; member: GuildMember; channel: TextBasedChannel | null; scheduledAt: Date; triggerConfig: ScheduleTriggerConfig };

const serverCache = new Map<string, { serverId: number; expiresAt: number }>();
const commandCache = new Map<number, { commands: CustomCommand[]; expiresAt: number }>();
const premiumCache = new Map<number, { allowed: boolean; expiresAt: number }>();
const cooldownCache = new Map<string, number>();
const timezoneFormatterCache = new Map<string, Intl.DateTimeFormat>();

let scheduleTimer: NodeJS.Timeout | null = null;
let scheduleStartedAt = 0;

function now() {
  return Date.now();
}

function isSupportedTrigger(value: string): value is SupportedCustomTrigger {
  return value === "slash"
    || value === "keyword"
    || value === "button"
    || value === "select"
    || value === "schedule"
    || value === "join"
    || value === "role_add"
    || value === "reaction";
}

export function normalizeSlashCommandName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

async function resolveServerIdForGuild(guildId: string) {
  const cached = serverCache.get(guildId);
  if (cached && cached.expiresAt > now()) return cached.serverId;

  const server = await storage.getServerByDiscordId(guildId);
  if (!server) return null;

  serverCache.set(guildId, { serverId: server.id, expiresAt: now() + CACHE_TTL_MS });
  return server.id;
}

async function getCommandsForServer(serverId: number) {
  const cached = commandCache.get(serverId);
  if (cached && cached.expiresAt > now()) return cached.commands;

  const commands = await storage.getCommands(serverId);
  commandCache.set(serverId, { commands, expiresAt: now() + CACHE_TTL_MS });
  return commands;
}

async function getCommandsForGuild(guildId: string) {
  const serverId = await resolveServerIdForGuild(guildId);
  if (!serverId) return null;
  const commands = await getCommandsForServer(serverId);
  return { serverId, commands };
}

async function isPremiumEnabled(serverId: number) {
  const cached = premiumCache.get(serverId);
  if (cached && cached.expiresAt > now()) return cached.allowed;

  const allowed = await isPremiumEnabledForServer(serverId);
  premiumCache.set(serverId, { allowed, expiresAt: now() + CACHE_TTL_MS });
  return allowed;
}

function getSourceMessage(source: InvocationSource) {
  switch (source.kind) {
    case "keyword":
      return source.message;
    case "button":
    case "select":
      return source.interaction.message.inGuild() ? (source.interaction.message as Message<true>) : null;
    case "reaction":
      return source.message;
    default:
      return null;
  }
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
  if (rawStep) {
    if (step === null || !Number.isFinite(step) || step <= 0) return false;
  }

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
  return (value - rangeStart) % step! === 0;
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

export function buildCustomSlashPayloads(commands: CustomCommand[]) {
  const seenNames = new Set<string>();

  return commands
    .filter((command) => command.enabled !== false && command.triggerType === "slash")
    .flatMap((command) => {
      const normalizedName = normalizeSlashCommandName(command.name || "");
      if (!normalizedName || seenNames.has(normalizedName)) return [];
      seenNames.add(normalizedName);

      return [
        new SlashCommandBuilder()
          .setName(normalizedName)
          .setDescription((command.description || `Run ${normalizedName}`).slice(0, 100))
          .toJSON(),
      ];
    });
}

async function buildGuildCommandPayload(serverId: number, includeStaticCommands: boolean) {
  const commands = await getCommandsForServer(serverId);
  const customPayloads = buildCustomSlashPayloads(commands);
  const v2Payloads = await getCustomCommandV2SlashPayloadsForServer(serverId);
  const merged = includeStaticCommands ? [...buildCommandPayloads(), ...customPayloads, ...v2Payloads] : [...customPayloads, ...v2Payloads];
  const seenNames = new Set<string>();
  return merged.filter((payload) => {
    const candidate = payload as { name?: string };
    const name = typeof candidate.name === "string" ? candidate.name : "";
    if (!name || seenNames.has(name)) return false;
    seenNames.add(name);
    return true;
  });
}

export function invalidateCustomCommandCache(serverId?: number) {
  if (typeof serverId === "number") {
    commandCache.delete(serverId);
    premiumCache.delete(serverId);
    return;
  }

  commandCache.clear();
  premiumCache.clear();
  serverCache.clear();
}

export async function syncCustomCommandsForServer(input: {
  client: Client;
  env: ArchivistEnv;
  logger: ArchivistLogger;
  serverId: number;
}) {
  if (!input.env.clientId || !input.env.token) return;

  const server = await storage.getServer(input.serverId);
  if (!server?.discordId) return;

  const rest = new REST({ version: "10" }).setToken(input.env.token);
  const payload = await buildGuildCommandPayload(input.serverId, input.env.registerMode === "guild");
  await rest.put(Routes.applicationGuildCommands(input.env.clientId, server.discordId), { body: payload });
  input.logger.info("Synchronized custom commands.", {
    serverId: input.serverId,
    guildId: server.discordId,
    count: payload.length,
  });
}

export async function syncCustomCommandsForClient(input: {
  client: Client<true>;
  env: ArchivistEnv;
  logger: ArchivistLogger;
}) {
  const guilds = Array.from(input.client.guilds.cache.values());
  for (const guild of guilds) {
    const serverId = await resolveServerIdForGuild(guild.id);
    if (!serverId) continue;
    await syncCustomCommandsForServer({ ...input, serverId });
  }
}

function getCooldownKey(command: CustomCommand, source: InvocationSource) {
  const base = `cmd:${command.id}`;
  switch (command.cooldownScope) {
    case "channel":
      return `${base}:channel:${source.channel?.id || source.guild.id}`;
    case "server":
      return `${base}:server:${source.guild.id}`;
    case "user":
    default:
      return `${base}:user:${source.kind === "schedule" ? "scheduler" : source.member.id}`;
  }
}

function getCooldownRemainingMs(command: CustomCommand, source: InvocationSource) {
  const cooldownSeconds = Math.max(0, Number(command.cooldown || 0));
  if (cooldownSeconds <= 0) return 0;
  const expiresAt = cooldownCache.get(getCooldownKey(command, source));
  if (!expiresAt) return 0;
  return Math.max(0, expiresAt - now());
}

function startCooldown(command: CustomCommand, source: InvocationSource) {
  const cooldownSeconds = Math.max(0, Number(command.cooldown || 0));
  if (cooldownSeconds <= 0) return;
  cooldownCache.set(getCooldownKey(command, source), now() + cooldownSeconds * 1000);
}

function matchesScopedMessage(config: { channelId?: string; messageId?: string; allowAnyMessage?: boolean }, channelId: string | null, messageId: string | null) {
  if (config.allowAnyMessage) return true;
  if (config.channelId && config.channelId !== channelId) return false;
  if (config.messageId && config.messageId !== messageId) return false;
  return true;
}

export function matchesKeywordCommand(command: CustomCommand, message: Message<true>) {
  const config = normalizeTriggerConfig(command.triggerType || "keyword", command.triggerConfig) as KeywordTriggerConfig;
  const caseSensitive = Boolean(config.caseSensitive);
  const haystack = caseSensitive ? message.content.trim() : message.content.toLowerCase().trim();
  const values = [command.name, ...(Array.isArray(command.aliases) ? command.aliases : [])]
    .filter(Boolean)
    .map((value) => caseSensitive ? String(value).trim() : String(value).toLowerCase().trim());
  return values.some((value) => {
    if (!value) return false;
    switch (config.matchMode) {
      case "exact":
        return haystack === value;
      case "starts_with":
        return haystack.startsWith(value);
      case "contains":
      default:
        return haystack.includes(value);
    }
  });
}

function matchesButtonCommand(command: CustomCommand, interaction: ButtonInteraction<"cached">) {
  const config = normalizeTriggerConfig(command.triggerType || "button", command.triggerConfig) as ButtonTriggerConfig;
  if (!config.customId || interaction.customId !== config.customId) return false;
  return matchesScopedMessage(config, interaction.channel?.id || null, interaction.message?.id || null);
}

function matchesSelectCommand(command: CustomCommand, interaction: StringSelectMenuInteraction<"cached">) {
  const config = normalizeTriggerConfig(command.triggerType || "select", command.triggerConfig) as SelectTriggerConfig;
  if (!config.customId || interaction.customId !== config.customId) return false;
  if (!matchesScopedMessage(config, interaction.channel?.id || null, interaction.message?.id || null)) return false;
  if (config.allowedValues.length === 0) return true;
  return interaction.values.some((value) => config.allowedValues.includes(value));
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

function matchesReactionCommand(command: CustomCommand, reaction: MessageReaction) {
  const config = normalizeTriggerConfig(command.triggerType || "reaction", command.triggerConfig) as ReactionTriggerConfig;
  if (!config.emoji || !matchesReactionEmoji(config.emoji, reaction)) return false;
  if (config.channelId && reaction.message.channelId !== config.channelId) return false;
  if (config.messageId && reaction.message.id !== config.messageId) return false;
  return true;
}

function getScheduledDueSlot(command: CustomCommand, nowDate: Date) {
  const config = normalizeTriggerConfig(command.triggerType || "schedule", command.triggerConfig) as ScheduleTriggerConfig;
  if (getTriggerConfigErrors(command.triggerType || "schedule", config).length > 0) return null;

  const currentSlot = floorToMinute(nowDate);
  const lastUsedAt = command.lastUsedAt ? new Date(command.lastUsedAt) : null;
  const lastUsedMs = lastUsedAt && Number.isFinite(lastUsedAt.getTime()) ? lastUsedAt.getTime() : 0;

  if (matchesCronExpression(config.cronExpression, currentSlot, config.timezone)) {
    return currentSlot.getTime() > lastUsedMs ? currentSlot : null;
  }

  if (!config.runMissedOnBoot || scheduleStartedAt <= 0 || nowDate.getTime() - scheduleStartedAt > 5 * 60_000) {
    return null;
  }

  const catchUpSlot = findMostRecentDueSlotBefore({
    before: new Date(scheduleStartedAt),
    cronExpression: config.cronExpression,
    timezone: config.timezone,
    lookbackMinutes: SCHEDULE_LOOKBACK_MINUTES,
  });
  if (!catchUpSlot) return null;
  return catchUpSlot.getTime() > lastUsedMs ? catchUpSlot : null;
}

async function evaluateConditions(command: CustomCommand, source: InvocationSource, serverId: number) {
  const member = source.member;
  const guild = source.guild;
  const channelId = source.channel?.id || null;
  const hasMemberContext = source.kind !== "schedule";

  if (hasMemberContext && Array.isArray(command.requiredRoles) && command.requiredRoles.length > 0) {
    const hasRequiredRole = command.requiredRoles.some((roleId) => member.roles.cache.has(roleId));
    if (!hasRequiredRole) return false;
  }

  if (hasMemberContext && Array.isArray(command.blockedRoles) && command.blockedRoles.some((roleId) => member.roles.cache.has(roleId))) {
    return false;
  }

  if (Array.isArray(command.allowedChannels) && command.allowedChannels.length > 0) {
    if (!channelId || !command.allowedChannels.includes(channelId)) return false;
  }

  if (Array.isArray(command.blockedChannels) && channelId && command.blockedChannels.includes(channelId)) {
    return false;
  }

  for (const condition of command.conditions || []) {
    switch (condition.type) {
      case "hasRole":
        if (!hasMemberContext || !condition.value || !member.roles.cache.has(condition.value)) return false;
        break;
      case "inChannel":
        if (!condition.value || !channelId || channelId !== condition.value) return false;
        break;
      case "hasPermission":
        if (!hasMemberContext || !condition.value || !member.permissions.has(condition.value as any)) return false;
        break;
      case "isOwner":
        if (!hasMemberContext || guild.ownerId !== member.id) return false;
        break;
      case "isPremium":
        if (!(await isPremiumEnabled(serverId))) return false;
        break;
      case "randomChance":
        if (typeof condition.chance === "number" && Math.random() * 100 > condition.chance) return false;
        break;
      case "messageContains":
        if (!condition.value) return false;
        if (!getSourceMessage(source)?.content.toLowerCase().includes(condition.value.toLowerCase())) return false;
        break;
      case "accountAge":
        if (!hasMemberContext || typeof condition.days !== "number") return false;
        if (typeof condition.days === "number") {
          const minAgeMs = condition.days * 24 * 60 * 60 * 1000;
          if (Date.now() - member.user.createdTimestamp < minAgeMs) return false;
        }
        break;
      default:
        break;
    }
  }

  return true;
}

function isSendableChannel(channel: unknown): channel is TextBasedChannel & { send: (...args: any[]) => Promise<unknown> } {
  return Boolean(channel && typeof channel === "object" && "send" in channel && typeof (channel as any).send === "function");
}

function getFallbackChannel(guild: Guild) {
  if (guild.systemChannel?.isTextBased()) return guild.systemChannel;
  return guild.channels.cache.find((channel) => channel.isTextBased() && isSendableChannel(channel)) as TextBasedChannel | undefined;
}

function resolveActionChannel(source: InvocationSource, channelId?: string | null) {
  if (channelId) {
    const target = source.guild.channels.cache.get(channelId);
    if (target?.isTextBased() && isSendableChannel(target)) return target as TextBasedChannel;
  }
  if (source.channel) return source.channel;
  return getFallbackChannel(source.guild) || null;
}

function buildStudioTokenContext(source: InvocationSource): StudioTokenContext {
  const nowDate = source.kind === "schedule" ? source.scheduledAt : new Date();
  return {
    username: source.member.user.username,
    displayName: source.member.displayName,
    userId: source.member.id,
    userMention: `<@${source.member.id}>`,
    userAvatar: source.member.displayAvatarURL(),
    serverName: source.guild.name,
    serverId: source.guild.id,
    memberCount: source.guild.memberCount,
    channelName: source.channel && "name" in source.channel ? String(source.channel.name || "") : null,
    channelId: source.channel?.id || null,
    channelMention: source.channel?.id ? `<#${source.channel.id}>` : null,
    date: nowDate.toLocaleDateString(),
    time: nowDate.toLocaleTimeString(),
    unix: Math.floor(nowDate.getTime() / 1000),
    randomMode: "runtime",
  };
}

export function resolveCustomCommandTemplate(value: string, context: StudioTokenContext) {
  return resolveStudioTokensInString(value, context);
}

export function resolveCustomCommandEmbed(value: unknown, context: StudioTokenContext) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return resolveStudioTokensInValue(value as Record<string, unknown>, context);
}

export function buildRuntimeActions(command: CustomCommand): CommandAction[] {
  if (Array.isArray(command.actions) && command.actions.length > 0) {
    return command.actions;
  }

  const hasResponse = Boolean(command.response?.trim());
  const embedData =
    command.embedResponse && typeof command.embedResponse === "object" && !Array.isArray(command.embedResponse)
      ? (command.embedResponse as Record<string, unknown>)
      : undefined;

  if (!hasResponse && !embedData) return [];

  return [
    {
      type: "reply",
      value: command.response || "",
      embedData,
    },
  ];
}

async function sendInteractionPayload(
  interaction: ChatInputCommandInteraction | ButtonInteraction<"cached"> | StringSelectMenuInteraction<"cached">,
  payload: { content?: string; embeds?: any[]; components?: any[]; files?: any[] },
) {
  if (interaction.deferred || interaction.replied) {
    if (interaction.deferred && !interaction.replied) {
      await interaction.editReply(payload);
      return;
    }
    await interaction.followUp(payload);
    return;
  }
  await interaction.reply(payload);
}

async function sendInteractiveFailure(
  interaction: ButtonInteraction<"cached"> | StringSelectMenuInteraction<"cached">,
  message: string,
) {
  const payload = { content: message, ephemeral: true };
  if (interaction.deferred || interaction.replied) {
    await interaction.followUp(payload).catch(() => null);
    return;
  }
  await interaction.reply(payload).catch(() => null);
}

async function sendRuntimeMessage(source: InvocationSource, payload: { content?: string; embeds?: any[]; components?: any[]; files?: any[] }, channelId?: string | null) {
  if (source.kind === "slash" || source.kind === "button" || source.kind === "select") {
    await sendInteractionPayload(source.interaction, payload);
    return true;
  }

  const channel = resolveActionChannel(source, channelId);
  if (!channel || !isSendableChannel(channel)) return false;
  await channel.send(payload as any);
  return true;
}

async function executeActions(command: CustomCommand, source: InvocationSource, logger: ArchivistLogger) {
  const actions = buildRuntimeActions(command);

  let summary = command.description || `Executed ${command.name}`;
  let sentVisibleOutput = false;
  const tokenContext = buildStudioTokenContext(source);
  const canTargetInvokingMember = source.kind !== "schedule";

  for (const action of actions) {
    switch (action.type) {
      case "reply":
      case "sendDM": {
        const content = resolveCustomCommandTemplate(String(action.value || command.response || ""), tokenContext).trim();
        const embed = resolveCustomCommandEmbed(action.embedData, tokenContext);
        if (!content && !embed) continue;
        const payload = {
          content: content || undefined,
          embeds: embed ? [embed] : undefined,
        };
        if (action.type === "sendDM" || command.dmResponse) {
          if (!canTargetInvokingMember) {
            throw new CommandError("UNSUPPORTED_OPERATION", "Scheduled commands cannot DM a member because no invoking user exists.");
          }
          await source.member.user.send(payload).catch(() => null);
        } else {
          sentVisibleOutput = await sendRuntimeMessage(source, payload, "channelId" in action ? action.channelId || null : null);
        }
        summary = truncateText(content || String((embed as { title?: string; description?: string } | null)?.title || (embed as { title?: string; description?: string } | null)?.description || "Sent embed response"));
        break;
      }
      case "addRole":
      case "removeRole": {
        if (!canTargetInvokingMember) {
          throw new CommandError("UNSUPPORTED_OPERATION", "Scheduled commands cannot change member roles without an invoking member.");
        }
        const roleId = action.roleId || action.value;
        if (!roleId) continue;
        const role = source.guild.roles.cache.get(roleId);
        if (!role) throw new CommandError("NOT_FOUND", "The configured role no longer exists.");
        if (!source.guild.members.me?.permissions.has("ManageRoles")) {
          throw new CommandError("BOT_PERMISSION_MISSING", "Archivist needs Manage Roles to run this command.");
        }
        if (source.guild.members.me.roles.highest.position <= role.position) {
          throw new CommandError("ROLE_HIERARCHY", "Archivist cannot manage one of the configured roles.");
        }
        if (action.type === "addRole") await source.member.roles.add(role);
        else await source.member.roles.remove(role);
        summary = `${action.type === "addRole" ? "Added" : "Removed"} role ${role.name}`;
        break;
      }
      case "createChannel": {
        const channelName = resolveCustomCommandTemplate(String(action.value || ""), tokenContext).trim().toLowerCase().replace(/[^a-z0-9-_]+/g, "-").replace(/^-+|-+$/g, "");
        if (!channelName) continue;
        if (!source.guild.members.me?.permissions.has("ManageChannels")) {
          throw new CommandError("BOT_PERMISSION_MISSING", "Archivist needs Manage Channels to create channels for this command.");
        }
        const parent = action.channelId ? source.guild.channels.cache.get(action.channelId) : null;
        const created = await source.guild.channels.create({
          name: channelName,
          type: ChannelType.GuildText,
          parent: parent?.isThread() ? null : parent?.id,
        });
        summary = `Created channel #${created.name}`;
        break;
      }
      case "wait": {
        const duration = Math.min(300, Math.max(0, Number(action.duration || 0)));
        if (duration > 0) await new Promise((resolve) => setTimeout(resolve, duration * 1000));
        break;
      }
      case "sendStudio": {
        if (!action.studioDocumentId) continue;
        const documentRecord = await getStudioDocumentById(action.studioDocumentId);
        if (!documentRecord) throw new CommandError("NOT_FOUND", "The selected Studio draft no longer exists.");
        const document = normalizeStudioDocument(documentRecord.document, documentRecord.name);
        const plan = buildStudioPublishPlan(document, document.meta.entryViewId, {
          tokenAvailability: {
            static: true,
            member: true,
            postSend: false,
          },
        });
        if (!plan.payloadReady || plan.mode === "blocked") {
          throw new CommandError("VALIDATION_FAILED", "The selected Studio draft is not publishable yet.");
        }
        const payload = buildStudioDiscordPayload(plan, 0, buildStudioTokenContext(source));
        sentVisibleOutput = await sendRuntimeMessage(source, payload, action.channelId || null);
        summary = `Sent Studio draft ${documentRecord.name}`;
        break;
      }
      case "logEvent": {
        const message = resolveCustomCommandTemplate(String(action.value || ""), tokenContext);
        logger.info("Custom command log action.", {
          guildId: source.guild.id,
          memberId: source.member.id,
          commandName: command.name,
          message,
        });
        summary = truncateText(message || `Logged ${command.name}`);
        break;
      }
      default:
        logger.warn("Unsupported custom command action skipped.", {
          commandId: command.id,
          actionType: action.type,
        });
        break;
    }
  }

  if ((source.kind === "slash" || source.kind === "button" || source.kind === "select") && !sentVisibleOutput) {
    await sendInteractionPayload(source.interaction, { content: `Ran \`${command.name}\`.` });
  }

  return summary;
}

async function tryDeleteInvocation(command: CustomCommand, source: InvocationSource) {
  if (!command.deleteInvocation || source.kind !== "keyword") return;
  if (!source.guild.members.me?.permissions.has("ManageMessages")) return;
  await source.message.delete().catch(() => null);
}

async function runCommand(command: CustomCommand, source: InvocationSource, serverId: number, logger: ArchivistLogger) {
  const startedAt = Date.now();

  if (command.premiumOnly && !(await isPremiumEnabled(serverId))) {
    if (source.kind === "slash" || source.kind === "button" || source.kind === "select") {
      throw new CommandError("VALIDATION_FAILED", "This command requires premium access for this server.");
    }
    return false;
  }

  const allowed = await evaluateConditions(command, source, serverId);
  if (!allowed) {
    if (source.kind === "slash" || source.kind === "button" || source.kind === "select") {
      throw new CommandError("VALIDATION_FAILED", "This command's conditions were not met for your current context.");
    }
    return false;
  }

  const cooldownRemainingMs = getCooldownRemainingMs(command, source);
  if (cooldownRemainingMs > 0) {
    if (source.kind === "slash" || source.kind === "button" || source.kind === "select") {
      const remainingSeconds = Math.max(1, Math.ceil(cooldownRemainingMs / 1000));
      throw new CommandError("VALIDATION_FAILED", `This command is cooling down. Try again in ${remainingSeconds}s.`);
    }
    return false;
  }

  const summary = await executeActions(command, source, logger);
  startCooldown(command, source);
  await tryDeleteInvocation(command, source);
  await storage.touchCommandUsage(command.id);
  command.lastUsedAt = new Date();
  command.usageCount = Number(command.usageCount || 0) + 1;
  commandActivityStore.recordSuccess({
    guildId: source.guild.id,
    guildName: source.guild.name,
    commandPath: command.name,
    actorId: source.member.id,
    actorTag: source.member.user.tag,
    summary,
    durationMs: Date.now() - startedAt,
  });
  return true;
}

function recordCustomFailure(input: {
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
    code: "CUSTOM_COMMAND_FAILED",
    message: input.message,
  });
}

export async function handleCustomSlashInteraction(interaction: ChatInputCommandInteraction, logger: ArchivistLogger) {
  if (!interaction.inCachedGuild() || !interaction.guild) return false;

  const payload = await getCommandsForGuild(interaction.guild.id);
  if (!payload) return false;

  const matched = payload.commands.find((command) =>
    command.enabled !== false &&
    command.triggerType === "slash" &&
    normalizeSlashCommandName(command.name || "") === interaction.commandName,
  );
  if (!matched) return false;

  await runCommand(matched, {
    kind: "slash",
    interaction,
    guild: interaction.guild,
    member: interaction.member as GuildMember,
    channel: interaction.channel?.isTextBased() ? (interaction.channel as TextBasedChannel) : null,
  }, payload.serverId, logger.child(`custom:${matched.name}`));
  return true;
}

export async function handleCustomKeywordMessage(message: Message, logger: ArchivistLogger) {
  if (!message.inGuild() || message.author.bot || !message.member) return false;

  const payload = await getCommandsForGuild(message.guild.id);
  if (!payload) return false;

  const commands = payload.commands.filter((command) =>
    command.enabled !== false &&
    command.triggerType === "keyword" &&
    matchesKeywordCommand(command, message as Message<true>),
  );
  if (commands.length === 0) return false;

  for (const command of commands) {
    const startedAt = Date.now();
    try {
      await runCommand(command, {
        kind: "keyword",
        message: message as Message<true>,
        guild: message.guild,
        member: message.member,
        channel: message.channel as TextBasedChannel,
      }, payload.serverId, logger.child(`custom:${command.name}`));
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "Custom command failed.";
      logger.error("Keyword custom command failed.", {
        guildId: message.guild.id,
        commandName: command.name,
        message: messageText,
      });
      recordCustomFailure({
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

export async function handleCustomButtonInteraction(interaction: ButtonInteraction, logger: ArchivistLogger) {
  if (!interaction.inCachedGuild() || !interaction.guild) return false;

  const payload = await getCommandsForGuild(interaction.guild.id);
  if (!payload) return false;

  const matched = payload.commands.find((command) =>
    command.enabled !== false &&
    command.triggerType === "button" &&
    matchesButtonCommand(command, interaction as ButtonInteraction<"cached">),
  );
  if (!matched) return false;

  const startedAt = Date.now();
  try {
    await runCommand(matched, {
      kind: "button",
      interaction: interaction as ButtonInteraction<"cached">,
      guild: interaction.guild,
      member: interaction.member as GuildMember,
      channel: interaction.channel?.isTextBased() ? (interaction.channel as TextBasedChannel) : null,
    }, payload.serverId, logger.child(`custom:${matched.name}`));
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "Custom command failed.";
    logger.error("Button custom command failed.", {
      guildId: interaction.guild.id,
      commandName: matched.name,
      customId: interaction.customId,
      message: messageText,
    });
    recordCustomFailure({
      guildId: interaction.guild.id,
      guildName: interaction.guild.name,
      commandName: matched.name,
      actorId: interaction.user.id,
      actorTag: interaction.user.tag,
      durationMs: Date.now() - startedAt,
      message: messageText,
    });
    await sendInteractiveFailure(interaction as ButtonInteraction<"cached">, messageText);
  }

  return true;
}

export async function handleCustomSelectInteraction(interaction: StringSelectMenuInteraction, logger: ArchivistLogger) {
  if (!interaction.inCachedGuild() || !interaction.guild) return false;

  const payload = await getCommandsForGuild(interaction.guild.id);
  if (!payload) return false;

  const matched = payload.commands.find((command) =>
    command.enabled !== false &&
    command.triggerType === "select" &&
    matchesSelectCommand(command, interaction as StringSelectMenuInteraction<"cached">),
  );
  if (!matched) return false;

  const startedAt = Date.now();
  try {
    await runCommand(matched, {
      kind: "select",
      interaction: interaction as StringSelectMenuInteraction<"cached">,
      guild: interaction.guild,
      member: interaction.member as GuildMember,
      channel: interaction.channel?.isTextBased() ? (interaction.channel as TextBasedChannel) : null,
      values: interaction.values,
    }, payload.serverId, logger.child(`custom:${matched.name}`));
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "Custom command failed.";
    logger.error("Select custom command failed.", {
      guildId: interaction.guild.id,
      commandName: matched.name,
      customId: interaction.customId,
      message: messageText,
    });
    recordCustomFailure({
      guildId: interaction.guild.id,
      guildName: interaction.guild.name,
      commandName: matched.name,
      actorId: interaction.user.id,
      actorTag: interaction.user.tag,
      durationMs: Date.now() - startedAt,
      message: messageText,
    });
    await sendInteractiveFailure(interaction as StringSelectMenuInteraction<"cached">, messageText);
  }

  return true;
}

export async function handleCustomMemberJoin(member: GuildMember, logger: ArchivistLogger) {
  const payload = await getCommandsForGuild(member.guild.id);
  if (!payload) return false;

  const commands = payload.commands.filter((command) => command.enabled !== false && command.triggerType === "join");
  for (const command of commands) {
    const startedAt = Date.now();
    try {
      await runCommand(command, {
        kind: "join",
        guild: member.guild,
        member,
        channel: getFallbackChannel(member.guild) || null,
      }, payload.serverId, logger.child(`custom:${command.name}`));
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "Custom command failed.";
      recordCustomFailure({
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

export async function handleCustomRoleAdd(oldMember: GuildMember | PartialGuildMember, newMember: GuildMember | PartialGuildMember, logger: ArchivistLogger) {
  if (oldMember.partial || newMember.partial) return false;
  const previousMember = oldMember as GuildMember;
  const currentMember = newMember as GuildMember;
  const addedRoleIds = currentMember.roles.cache.filter((role) => !previousMember.roles.cache.has(role.id)).map((role) => role.id);
  if (addedRoleIds.length === 0) return false;

  const payload = await getCommandsForGuild(currentMember.guild.id);
  if (!payload) return false;

  const commands = payload.commands.filter((command) => command.enabled !== false && command.triggerType === "role_add");
  for (const command of commands) {
    const triggerConfig = normalizeTriggerConfig(command.triggerType || "role_add", command.triggerConfig) as RoleAddTriggerConfig;
    const watchedRoleIds = triggerConfig.watchedRoleIds.length > 0 ? triggerConfig.watchedRoleIds : [
      ...(Array.isArray(command.requiredRoles) ? command.requiredRoles : []),
      ...((command.conditions || [])
        .filter((condition) => condition.type === "hasRole" && condition.value)
        .map((condition) => String(condition.value))),
    ];
    if (watchedRoleIds.length > 0 && !watchedRoleIds.some((roleId) => addedRoleIds.includes(roleId))) continue;

    const startedAt = Date.now();
    try {
      await runCommand(command, {
        kind: "role_add",
        guild: currentMember.guild,
        member: currentMember,
        channel: getFallbackChannel(currentMember.guild) || null,
        addedRoleIds,
      }, payload.serverId, logger.child(`custom:${command.name}`));
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "Custom command failed.";
      recordCustomFailure({
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

export async function handleCustomReactionAdd(
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

  const payload = await getCommandsForGuild(message.guild.id);
  if (!payload) return false;

  const commands = payload.commands.filter((command) =>
    command.enabled !== false &&
    command.triggerType === "reaction" &&
    matchesReactionCommand(command, reaction as MessageReaction),
  );
  if (commands.length === 0) return false;

  for (const command of commands) {
    const startedAt = Date.now();
    try {
      await runCommand(command, {
        kind: "reaction",
        reaction: reaction as MessageReaction,
        message: message as Message<true>,
        guild: message.guild,
        member,
        channel: message.channel.isTextBased() ? (message.channel as TextBasedChannel) : null,
      }, payload.serverId, logger.child(`custom:${command.name}`));
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "Custom command failed.";
      logger.error("Reaction custom command failed.", {
        guildId: message.guild.id,
        commandName: command.name,
        message: messageText,
      });
      recordCustomFailure({
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

async function runScheduledCommands(client: Client<true>, logger: ArchivistLogger) {
  const currentNow = new Date();

  for (const guild of Array.from(client.guilds.cache.values())) {
    const payload = await getCommandsForGuild(guild.id);
    if (!payload) continue;

    const commands = payload.commands.filter((command) => command.enabled !== false && command.triggerType === "schedule");
    if (commands.length === 0) continue;

    const botMember = guild.members.me ?? await guild.members.fetchMe().catch(() => null);
    if (!botMember) continue;

    for (const command of commands) {
      const scheduleTriggerConfig = normalizeTriggerConfig(command.triggerType || "schedule", command.triggerConfig) as ScheduleTriggerConfig;
      const dueSlot = getScheduledDueSlot(command, currentNow);
      if (!dueSlot) continue;

      const channel = resolveActionChannel(
        {
          kind: "schedule",
          guild,
          member: botMember,
          channel: null,
          scheduledAt: dueSlot,
          triggerConfig: scheduleTriggerConfig,
        },
        scheduleTriggerConfig.channelId || null,
      );

      const startedAt = Date.now();
      try {
        await runCommand(command, {
          kind: "schedule",
          guild,
          member: botMember,
          channel,
          scheduledAt: dueSlot,
          triggerConfig: scheduleTriggerConfig,
        }, payload.serverId, logger.child(`custom:${command.name}`));
      } catch (error) {
        const messageText = error instanceof Error ? error.message : "Custom command failed.";
        logger.error("Scheduled custom command failed.", {
          guildId: guild.id,
          commandName: command.name,
          message: messageText,
        });
        recordCustomFailure({
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

export function startCustomCommandScheduler(input: {
  client: Client<true>;
  logger: ArchivistLogger;
}) {
  scheduleStartedAt = now();
  if (scheduleTimer) clearInterval(scheduleTimer);
  scheduleTimer = setInterval(() => {
    runScheduledCommands(input.client, input.logger).catch((error) => {
      input.logger.error("Scheduled custom command tick failed.", {
        message: error instanceof Error ? error.message : String(error),
      });
    });
  }, SCHEDULE_TICK_MS);
}

export function stopCustomCommandScheduler() {
  if (!scheduleTimer) return;
  clearInterval(scheduleTimer);
  scheduleTimer = null;
}
