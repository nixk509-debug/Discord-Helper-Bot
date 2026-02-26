import { db } from "./db";
import { configAuditEntries } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

export interface AuditLogFilters {
  limit?: number;
  moduleId?: string;
  actorId?: string;
}

export async function recordAudit(
  serverId: number,
  moduleId: string,
  actorId: string,
  before: any,
  after: any
): Promise<void> {
  const changedKeys = before && after
    ? Object.keys(after).filter(k => JSON.stringify(before[k]) !== JSON.stringify(after[k]))
    : [];
  await db.insert(configAuditEntries).values({
    serverId,
    moduleId,
    actorId,
    beforeData: before ?? null,
    afterData: after ?? null,
    changedKeys,
  });
}

export async function getAuditLog(serverId: number, opts: AuditLogFilters = {}) {
  const { limit = 50, moduleId, actorId } = opts;
  const conditions = [eq(configAuditEntries.serverId, serverId)];
  if (moduleId) conditions.push(eq(configAuditEntries.moduleId, moduleId));
  if (actorId) conditions.push(eq(configAuditEntries.actorId, actorId));
  return await db.select()
    .from(configAuditEntries)
    .where(and(...conditions))
    .orderBy(desc(configAuditEntries.createdAt))
    .limit(limit);
}
