import { EventEmitter } from "events";
import { db } from "./db";
import { serverSettings } from "@shared/schema";
import { eq } from "drizzle-orm";

export const configEvents = new EventEmitter();

const configCache = new Map<number, any>();

export async function getGuildConfig(serverId: number): Promise<any> {
  if (configCache.has(serverId)) return configCache.get(serverId);
  const [settings] = await db.select().from(serverSettings).where(eq(serverSettings.serverId, serverId));
  if (settings) configCache.set(serverId, settings);
  return settings;
}

export async function patchGuildConfig(
  serverId: number,
  moduleId: string,
  patch: Record<string, any>,
  actorId: string
): Promise<any> {
  const before = await getGuildConfig(serverId);
  const [updated] = await db.update(serverSettings)
    .set({ ...patch, updatedAt: new Date() } as any)
    .where(eq(serverSettings.serverId, serverId))
    .returning();
  configCache.set(serverId, updated);
  configEvents.emit("config.updated", { serverId, moduleId, actorId, before, after: updated, patch });
  return updated;
}

export function invalidateCache(serverId: number): void {
  configCache.delete(serverId);
}
