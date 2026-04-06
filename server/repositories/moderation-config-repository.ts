import {
  punishmentConfig,
  warnings,
  type PunishmentConfigType,
  type Warning,
} from "@shared/schema";
import { and, eq } from "drizzle-orm";
import { db } from "../db";

export async function listWarningRecords(serverId: number): Promise<Warning[]> {
  return await db.select().from(warnings).where(eq(warnings.serverId, serverId));
}

export async function createWarningRecord(serverId: number, data: any): Promise<Warning> {
  const [created] = await db.insert(warnings).values({ ...data, serverId } as any).returning();
  return created;
}

export async function deleteWarningRecord(id: number): Promise<void> {
  await db.delete(warnings).where(eq(warnings.id, id));
}

export async function clearWarningRecords(serverId: number, userId: string): Promise<void> {
  await db.delete(warnings).where(and(eq(warnings.serverId, serverId), eq(warnings.userId, userId)));
}

export async function listPunishmentConfigRecords(serverId: number): Promise<PunishmentConfigType[]> {
  return await db.select().from(punishmentConfig).where(eq(punishmentConfig.serverId, serverId));
}

export async function upsertPunishmentConfigRecord(serverId: number, data: any): Promise<PunishmentConfigType> {
  const existing = await db
    .select()
    .from(punishmentConfig)
    .where(and(eq(punishmentConfig.serverId, serverId), eq(punishmentConfig.warningThreshold, data.warningThreshold)));

  if (existing.length > 0) {
    const [updated] = await db
      .update(punishmentConfig)
      .set(data as any)
      .where(eq(punishmentConfig.id, existing[0].id))
      .returning();
    return updated;
  }

  const [created] = await db.insert(punishmentConfig).values({ ...data, serverId } as any).returning();
  return created;
}

export async function deletePunishmentConfigRecord(id: number): Promise<void> {
  await db.delete(punishmentConfig).where(eq(punishmentConfig.id, id));
}
