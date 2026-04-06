import {
  levelingConfig,
  starboardConfig,
  type LevelingConfigType,
  type StarboardConfigType,
} from "@shared/schema";
import { eq } from "drizzle-orm";
import { db } from "../db";

export async function getLevelingConfigRecord(serverId: number): Promise<LevelingConfigType | undefined> {
  const results = await db.select().from(levelingConfig).where(eq(levelingConfig.serverId, serverId));
  return results[0];
}

export async function upsertLevelingConfigRecord(serverId: number, data: any): Promise<LevelingConfigType> {
  const existing = await db.select().from(levelingConfig).where(eq(levelingConfig.serverId, serverId));
  if (existing.length > 0) {
    const [updated] = await db
      .update(levelingConfig)
      .set(data as any)
      .where(eq(levelingConfig.serverId, serverId))
      .returning();
    return updated;
  }

  const [created] = await db.insert(levelingConfig).values({ ...data, serverId } as any).returning();
  return created;
}

export async function getStarboardConfigRecord(serverId: number): Promise<StarboardConfigType | undefined> {
  const results = await db.select().from(starboardConfig).where(eq(starboardConfig.serverId, serverId));
  return results[0];
}

export async function upsertStarboardConfigRecord(serverId: number, data: any): Promise<StarboardConfigType> {
  const existing = await db.select().from(starboardConfig).where(eq(starboardConfig.serverId, serverId));
  if (existing.length > 0) {
    const [updated] = await db
      .update(starboardConfig)
      .set(data as any)
      .where(eq(starboardConfig.serverId, serverId))
      .returning();
    return updated;
  }

  const [created] = await db.insert(starboardConfig).values({ ...data, serverId } as any).returning();
  return created;
}
