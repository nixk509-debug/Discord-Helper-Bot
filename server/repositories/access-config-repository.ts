import {
  autoRoles,
  channelSettings,
  reactionRoles,
  type AutoRole,
  type ChannelSetting,
  type ReactionRole,
} from "@shared/schema";
import { and, eq } from "drizzle-orm";
import { db } from "../db";

export async function listChannelSettingRecords(serverId: number): Promise<ChannelSetting[]> {
  return await db.select().from(channelSettings).where(eq(channelSettings.serverId, serverId));
}

export async function upsertChannelSettingRecord(serverId: number, data: any): Promise<ChannelSetting> {
  const existing = await db
    .select()
    .from(channelSettings)
    .where(and(eq(channelSettings.serverId, serverId), eq(channelSettings.channelId, data.channelId)));

  if (existing.length > 0) {
    const [updated] = await db
      .update(channelSettings)
      .set(data as any)
      .where(eq(channelSettings.id, existing[0].id))
      .returning();
    return updated;
  }

  const [created] = await db.insert(channelSettings).values({ ...data, serverId } as any).returning();
  return created;
}

export async function getChannelSettingRecord(id: number): Promise<ChannelSetting | undefined> {
  const [entry] = await db.select().from(channelSettings).where(eq(channelSettings.id, id));
  return entry;
}

export async function deleteChannelSettingRecord(id: number): Promise<void> {
  await db.delete(channelSettings).where(eq(channelSettings.id, id));
}

export async function listReactionRoleRecords(serverId: number): Promise<ReactionRole[]> {
  return await db.select().from(reactionRoles).where(eq(reactionRoles.serverId, serverId));
}

export async function createReactionRoleRecord(serverId: number, data: any): Promise<ReactionRole> {
  const [created] = await db.insert(reactionRoles).values({ ...data, serverId } as any).returning();
  return created;
}

export async function getReactionRoleRecord(id: number): Promise<ReactionRole | undefined> {
  const [entry] = await db.select().from(reactionRoles).where(eq(reactionRoles.id, id));
  return entry;
}

export async function deleteReactionRoleRecord(id: number): Promise<void> {
  await db.delete(reactionRoles).where(eq(reactionRoles.id, id));
}

export async function listAutoRoleRecords(serverId: number): Promise<AutoRole[]> {
  return await db.select().from(autoRoles).where(eq(autoRoles.serverId, serverId));
}

export async function createAutoRoleRecord(serverId: number, data: any): Promise<AutoRole> {
  const [created] = await db.insert(autoRoles).values({ ...data, serverId } as any).returning();
  return created;
}

export async function getAutoRoleRecord(id: number): Promise<AutoRole | undefined> {
  const [entry] = await db.select().from(autoRoles).where(eq(autoRoles.id, id));
  return entry;
}

export async function deleteAutoRoleRecord(id: number): Promise<void> {
  await db.delete(autoRoles).where(eq(autoRoles.id, id));
}
