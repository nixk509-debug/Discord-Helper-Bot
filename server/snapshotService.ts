import { db } from "./db";
import { configSnapshots } from "@shared/schema";
import { eq, and, desc, max, sql } from "drizzle-orm";
import { patchGuildConfig } from "./configService";
import { recordAudit } from "./auditService";

export async function createSnapshot(
  serverId: number,
  moduleId: string,
  data: any,
  actorId: string
): Promise<void> {
  const [maxRow] = await db.select({ v: max(configSnapshots.version) })
    .from(configSnapshots)
    .where(and(eq(configSnapshots.serverId, serverId), eq(configSnapshots.moduleId, moduleId)));
  const nextVersion = (maxRow?.v ?? 0) + 1;
  await db.insert(configSnapshots).values({
    serverId,
    moduleId,
    version: nextVersion,
    data,
    actorId,
  });
}

export async function listSnapshots(serverId: number, moduleId?: string) {
  const conditions = [eq(configSnapshots.serverId, serverId)];
  if (moduleId) conditions.push(eq(configSnapshots.moduleId, moduleId));
  return await db.select()
    .from(configSnapshots)
    .where(and(...conditions))
    .orderBy(desc(configSnapshots.createdAt));
}

export async function rollback(serverId: number, snapshotId: number, actorId: string) {
  const [snapshot] = await db.select().from(configSnapshots).where(eq(configSnapshots.id, snapshotId));
  if (!snapshot) throw new Error("Snapshot not found");
  const before = await db.select().from(configSnapshots).where(eq(configSnapshots.id, snapshotId));
  const restored = await patchGuildConfig(serverId, snapshot.moduleId, snapshot.data as any, actorId);
  await recordAudit(serverId, snapshot.moduleId, actorId, null, restored);
  return restored;
}
