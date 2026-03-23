import { Client } from "discord.js";
import { storage } from "../../../storage";
import type { ArchivistLogger } from "../../lib/logger";
import {
  findNextCronSlotAfter,
  floorToMinute,
  matchesCronExpression,
  type StoredAutoPosterPayload,
} from "./shared";

const SCHEDULE_TICK_MS = 30_000;
const serverCache = new Map<string, { serverId: number; expiresAt: number }>();

let scheduleTimer: NodeJS.Timeout | null = null;

function now() {
  return Date.now();
}

async function resolveServerIdForGuild(guildId: string) {
  const cached = serverCache.get(guildId);
  if (cached && cached.expiresAt > now()) return cached.serverId;

  const server = await storage.getServerByDiscordId(guildId);
  if (!server) return null;

  serverCache.set(guildId, { serverId: server.id, expiresAt: now() + SCHEDULE_TICK_MS });
  return server.id;
}

function isAutoPosterPayload(value: unknown): value is { kind: "auto_poster"; payload: StoredAutoPosterPayload } {
  return !!value && typeof value === "object" && (value as any).kind === "auto_poster" && !!(value as any).payload;
}

async function runAutoPosters(client: Client<true>, logger: ArchivistLogger) {
  const currentNow = new Date();

  for (const guild of Array.from(client.guilds.cache.values())) {
    const serverId = await resolveServerIdForGuild(guild.id);
    if (!serverId) continue;

    const scheduledMessages = await storage.getScheduledMessages(serverId);
    if (scheduledMessages.length === 0) continue;

    for (const scheduledMessage of scheduledMessages) {
      if (scheduledMessage.enabled === false) continue;
      if (!isAutoPosterPayload(scheduledMessage.embedData)) continue;

      const cronExpression = String(scheduledMessage.cronExpression || "").trim();
      if (!cronExpression) continue;

      const timezone = String(scheduledMessage.timezone || "UTC");
      const lastRunAt = scheduledMessage.lastRunAt ? new Date(scheduledMessage.lastRunAt) : null;
      const dueSlot = scheduledMessage.nextRunAt ? new Date(scheduledMessage.nextRunAt) : floorToMinute(currentNow);
      if (!Number.isFinite(dueSlot.getTime())) continue;
      if (dueSlot.getTime() > currentNow.getTime()) continue;
      if (lastRunAt && Number.isFinite(lastRunAt.getTime()) && lastRunAt.getTime() >= dueSlot.getTime()) continue;

      if (!matchesCronExpression(cronExpression, dueSlot, timezone)) {
        const correctedNextRunAt = findNextCronSlotAfter(cronExpression, currentNow, timezone);
        await storage.updateScheduledMessage(scheduledMessage.id, {
          nextRunAt: correctedNextRunAt,
        });
        continue;
      }

      const channel = await guild.channels.fetch(scheduledMessage.channelId).catch(() => null);
      if (!channel || !channel.isTextBased() || !("send" in channel)) {
        const correctedNextRunAt = findNextCronSlotAfter(cronExpression, dueSlot, timezone);
        await storage.updateScheduledMessage(scheduledMessage.id, {
          lastRunAt: dueSlot,
          nextRunAt: correctedNextRunAt,
        });
        logger.warn("Auto poster channel is unavailable.", {
          guildId: guild.id,
          channelId: scheduledMessage.channelId,
          scheduledMessageId: scheduledMessage.id,
        });
        continue;
      }

      try {
        await (channel as any).send(scheduledMessage.embedData.payload as StoredAutoPosterPayload);
        const correctedNextRunAt = findNextCronSlotAfter(cronExpression, dueSlot, timezone);
        await storage.updateScheduledMessage(scheduledMessage.id, {
          lastRunAt: dueSlot,
          nextRunAt: correctedNextRunAt,
        });
        logger.info("Auto poster delivered.", {
          guildId: guild.id,
          channelId: scheduledMessage.channelId,
          scheduledMessageId: scheduledMessage.id,
        });
      } catch (error) {
        const correctedNextRunAt = findNextCronSlotAfter(cronExpression, dueSlot, timezone);
        await storage.updateScheduledMessage(scheduledMessage.id, {
          lastRunAt: dueSlot,
          nextRunAt: correctedNextRunAt,
        });
        logger.error("Auto poster delivery failed.", {
          guildId: guild.id,
          channelId: scheduledMessage.channelId,
          scheduledMessageId: scheduledMessage.id,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
}

export function startAutoPosterScheduler(input: {
  client: Client<true>;
  logger: ArchivistLogger;
}) {
  if (scheduleTimer) clearInterval(scheduleTimer);
  scheduleTimer = setInterval(() => {
    runAutoPosters(input.client, input.logger).catch((error) => {
      input.logger.error("Auto poster schedule tick failed.", {
        message: error instanceof Error ? error.message : String(error),
      });
    });
  }, SCHEDULE_TICK_MS);
}

export function stopAutoPosterScheduler() {
  if (!scheduleTimer) return;
  clearInterval(scheduleTimer);
  scheduleTimer = null;
}
