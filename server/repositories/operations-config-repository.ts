import {
  scheduledMessages,
  ticketConfig,
  ticketPanels,
  type ScheduledMessage,
  type TicketConfigType,
  type TicketPanel,
} from "@shared/schema";
import { eq } from "drizzle-orm";
import { db } from "../db";

export async function getTicketConfigRecord(serverId: number): Promise<TicketConfigType | undefined> {
  const results = await db.select().from(ticketConfig).where(eq(ticketConfig.serverId, serverId));
  return results[0];
}

export async function upsertTicketConfigRecord(serverId: number, data: any): Promise<TicketConfigType> {
  const existing = await db.select().from(ticketConfig).where(eq(ticketConfig.serverId, serverId));
  if (existing.length > 0) {
    const [updated] = await db
      .update(ticketConfig)
      .set(data as any)
      .where(eq(ticketConfig.serverId, serverId))
      .returning();
    return updated;
  }

  const [created] = await db.insert(ticketConfig).values({ ...data, serverId } as any).returning();
  return created;
}

export async function listTicketPanelRecords(serverId: number): Promise<TicketPanel[]> {
  return await db.select().from(ticketPanels).where(eq(ticketPanels.serverId, serverId));
}

export async function createTicketPanelRecord(serverId: number, data: any): Promise<TicketPanel> {
  const [created] = await db.insert(ticketPanels).values({ ...data, serverId } as any).returning();
  return created;
}

export async function updateTicketPanelRecord(id: number, data: any): Promise<TicketPanel> {
  const [updated] = await db.update(ticketPanels).set(data as any).where(eq(ticketPanels.id, id)).returning();
  return updated;
}

export async function deleteTicketPanelRecord(id: number): Promise<void> {
  await db.delete(ticketPanels).where(eq(ticketPanels.id, id));
}

export async function listScheduledMessageRecords(serverId: number): Promise<ScheduledMessage[]> {
  return await db.select().from(scheduledMessages).where(eq(scheduledMessages.serverId, serverId));
}

export async function createScheduledMessageRecord(serverId: number, data: any): Promise<ScheduledMessage> {
  const [created] = await db.insert(scheduledMessages).values({ ...data, serverId } as any).returning();
  return created;
}

export async function updateScheduledMessageRecord(id: number, data: any): Promise<ScheduledMessage> {
  const [updated] = await db
    .update(scheduledMessages)
    .set(data as any)
    .where(eq(scheduledMessages.id, id))
    .returning();
  return updated;
}

export async function deleteScheduledMessageRecord(id: number): Promise<void> {
  await db.delete(scheduledMessages).where(eq(scheduledMessages.id, id));
}
