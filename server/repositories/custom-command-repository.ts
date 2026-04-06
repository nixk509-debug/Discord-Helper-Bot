import {
  customCommands,
  customCommandsV2,
  customCommandV2Sessions,
  type CustomCommand,
  type CustomCommandV2Record,
  type CustomCommandV2SessionRecord,
} from "@shared/schema";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "../db";

export async function listCustomCommandRecords(serverId: number): Promise<CustomCommand[]> {
  return await db.select().from(customCommands).where(eq(customCommands.serverId, serverId));
}

export async function getCustomCommandRecord(id: number): Promise<CustomCommand | undefined> {
  const [command] = await db.select().from(customCommands).where(eq(customCommands.id, id));
  return command;
}

export async function createCustomCommandRecord(serverId: number, command: any): Promise<CustomCommand> {
  const [created] = await db.insert(customCommands).values({ ...command, serverId } as any).returning();
  return created;
}

export async function updateCustomCommandRecord(id: number, command: any): Promise<CustomCommand> {
  const [updated] = await db.update(customCommands).set(command as any).where(eq(customCommands.id, id)).returning();
  return updated;
}

export async function deleteCustomCommandRecord(id: number): Promise<void> {
  await db.delete(customCommands).where(eq(customCommands.id, id));
}

export async function touchCustomCommandUsageRecord(id: number): Promise<void> {
  await db
    .update(customCommands)
    .set({
      usageCount: sql`${customCommands.usageCount} + 1`,
      lastUsedAt: new Date(),
    } as any)
    .where(eq(customCommands.id, id));
}

export async function listCustomCommandV2Records(serverId: number): Promise<CustomCommandV2Record[]> {
  return await db
    .select()
    .from(customCommandsV2)
    .where(eq(customCommandsV2.serverId, serverId));
}

export async function getCustomCommandV2Record(id: number): Promise<CustomCommandV2Record | undefined> {
  const [command] = await db.select().from(customCommandsV2).where(eq(customCommandsV2.id, id));
  return command;
}

export async function createCustomCommandV2Record(serverId: number, command: any): Promise<CustomCommandV2Record> {
  const [created] = await db
    .insert(customCommandsV2)
    .values({
      ...command,
      serverId,
      updatedAt: new Date(),
    } as any)
    .returning();
  return created;
}

export async function updateCustomCommandV2Record(id: number, command: any): Promise<CustomCommandV2Record> {
  const [updated] = await db
    .update(customCommandsV2)
    .set({
      ...command,
      updatedAt: new Date(),
    } as any)
    .where(eq(customCommandsV2.id, id))
    .returning();
  return updated;
}

export async function touchCustomCommandV2UsageRecord(id: number, input?: { lastRunAt?: Date }): Promise<void> {
  await db
    .update(customCommandsV2)
    .set({
      usageCount: sql`${customCommandsV2.usageCount} + 1`,
      lastRunAt: input?.lastRunAt ?? new Date(),
      updatedAt: new Date(),
    })
    .where(eq(customCommandsV2.id, id));
}

export async function deleteCustomCommandV2Record(id: number): Promise<void> {
  await db.delete(customCommandsV2).where(eq(customCommandsV2.id, id));
}

export async function listPendingCustomCommandV2SessionRecords(
  serverId: number,
  continuationType?: "button" | "select" | "modal_submit",
): Promise<CustomCommandV2SessionRecord[]> {
  const filters = [eq(customCommandV2Sessions.serverId, serverId), isNull(customCommandV2Sessions.consumedAt)];
  if (continuationType) {
    filters.push(eq(customCommandV2Sessions.continuationType, continuationType));
  }

  return await db
    .select()
    .from(customCommandV2Sessions)
    .where(and(...filters))
    .orderBy(desc(customCommandV2Sessions.createdAt));
}

export async function createCustomCommandV2SessionRecord(
  serverId: number,
  session: any,
): Promise<CustomCommandV2SessionRecord> {
  const [created] = await db
    .insert(customCommandV2Sessions)
    .values({
      ...session,
      serverId,
      updatedAt: new Date(),
    } as any)
    .returning();
  return created;
}

export async function claimCustomCommandV2SessionRecord(id: number): Promise<CustomCommandV2SessionRecord | null> {
  const [claimed] = await db
    .update(customCommandV2Sessions)
    .set({
      consumedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(customCommandV2Sessions.id, id), isNull(customCommandV2Sessions.consumedAt)))
    .returning();
  return claimed ?? null;
}

export async function consumeCustomCommandV2SessionRecord(id: number): Promise<void> {
  await db
    .update(customCommandV2Sessions)
    .set({
      consumedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(customCommandV2Sessions.id, id));
}
