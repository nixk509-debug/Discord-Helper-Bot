import { embeds, type Embed } from "@shared/schema";
import { eq } from "drizzle-orm";
import { db } from "../db";

export async function listEmbedRecords(serverId: number): Promise<Embed[]> {
  return await db.select().from(embeds).where(eq(embeds.serverId, serverId));
}

export async function createEmbedRecord(serverId: number, embed: any): Promise<Embed> {
  const [created] = await db.insert(embeds).values({ ...embed, serverId } as any).returning();
  return created;
}

export async function getEmbedRecord(id: number): Promise<Embed | undefined> {
  const [embed] = await db.select().from(embeds).where(eq(embeds.id, id));
  return embed;
}

export async function updateEmbedRecord(id: number, embed: any): Promise<Embed> {
  const [updated] = await db.update(embeds).set(embed as any).where(eq(embeds.id, id)).returning();
  return updated;
}

export async function deleteEmbedRecord(id: number): Promise<void> {
  await db.delete(embeds).where(eq(embeds.id, id));
}
