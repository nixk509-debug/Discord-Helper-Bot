import type { CustomCommandV2Record } from "@shared/schema";
import { storage } from "../../../storage";

const CACHE_TTL_MS = 30_000;
const commandV2Cache = new Map<number, { expiresAt: number; commands: CustomCommandV2Record[] }>();

function now() {
  return Date.now();
}

export function invalidateCustomCommandV2Cache(serverId?: number) {
  if (typeof serverId === "number") {
    commandV2Cache.delete(serverId);
    return;
  }
  commandV2Cache.clear();
}

export async function getCommandsV2ForServer(serverId: number) {
  const cached = commandV2Cache.get(serverId);
  if (cached && cached.expiresAt > now()) return cached.commands;

  const commands = await storage.getCommandsV2(serverId);
  commandV2Cache.set(serverId, { expiresAt: now() + CACHE_TTL_MS, commands });
  return commands;
}

export async function getActiveCommandsV2ForServer(serverId: number) {
  const commands = await getCommandsV2ForServer(serverId);
  return commands.filter((command) => command.enabled !== false && command.compiled?.behavior?.enabled !== false);
}
