import { db, pool } from "../db";
import { servers, type Server } from "@shared/schema";
import { type ServerWithRelations } from "@shared/routes";
import { eq } from "drizzle-orm";

function isSchemaMismatchError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /column .* does not exist|relation .* does not exist/i.test(message);
}

function toBasicServerPayload(server: Server): ServerWithRelations {
  return {
    ...server,
    settings: null as any,
    customCommands: [],
    embeds: [],
  } as any;
}

function camelizeKey(key: string) {
  return key.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase());
}

function camelizeValue<T = any>(value: any): T {
  if (Array.isArray(value)) {
    return value.map((item) => camelizeValue(item)) as T;
  }
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [camelizeKey(key), camelizeValue(entryValue)]),
    ) as T;
  }
  return value as T;
}

function buildServerListPayload(row: any): ServerWithRelations {
  const customCommandCount = Number(row.customCommandCount ?? 0);
  const embedCount = Number(row.embedCount ?? 0);

  return {
    id: Number(row.id),
    discordId: row.discordId,
    name: row.name,
    iconUrl: row.iconUrl ?? null,
    memberCount: Number(row.memberCount ?? 0),
    joinedAt: row.joinedAt ?? null,
    ownerId: row.ownerId,
    settings: row.settings ? camelizeValue(row.settings) : null,
    customCommands: Array.from({ length: customCommandCount }, () => ({}) as any),
    embeds: Array.from({ length: embedCount }, () => ({}) as any),
    customCommandCount,
    embedCount,
  } as any;
}

export async function listServerRecords(): Promise<ServerWithRelations[]> {
  try {
    const result = await pool.query(`
      SELECT
        s.id,
        s.discord_id AS "discordId",
        s.name,
        s.icon_url AS "iconUrl",
        s.member_count AS "memberCount",
        s.joined_at AS "joinedAt",
        s.owner_id AS "ownerId",
        COALESCE(to_jsonb(ss), '{}'::jsonb) AS settings,
        COALESCE(cmd.command_count, 0) AS "customCommandCount",
        COALESCE(emb.embed_count, 0) AS "embedCount"
      FROM servers s
      LEFT JOIN server_settings ss ON ss.server_id = s.id
      LEFT JOIN (
        SELECT server_id, COUNT(*)::int AS command_count
        FROM custom_commands
        GROUP BY server_id
      ) cmd ON cmd.server_id = s.id
      LEFT JOIN (
        SELECT server_id, COUNT(*)::int AS embed_count
        FROM embeds
        GROUP BY server_id
      ) emb ON emb.server_id = s.id
      ORDER BY s.id ASC
    `);
    return result.rows.map(buildServerListPayload);
  } catch (error) {
    console.warn(
      `[ServerRepository] Failed to load server list${isSchemaMismatchError(error) ? " (schema mismatch)" : ""}:`,
      error instanceof Error ? error.message : error,
    );
    try {
      const baseServers = await db.select().from(servers);
      return baseServers.map(toBasicServerPayload);
    } catch (fallbackError) {
      console.error("[ServerRepository] Basic server fallback failed:", fallbackError instanceof Error ? fallbackError.message : fallbackError);
      throw fallbackError;
    }
  }
}

export async function getServerRecord(id: number): Promise<ServerWithRelations | undefined> {
  try {
    const result = await pool.query(`
      SELECT
        s.id,
        s.discord_id AS "discordId",
        s.name,
        s.icon_url AS "iconUrl",
        s.member_count AS "memberCount",
        s.joined_at AS "joinedAt",
        s.owner_id AS "ownerId",
        COALESCE(to_jsonb(ss), '{}'::jsonb) AS settings
      FROM servers s
      LEFT JOIN server_settings ss ON ss.server_id = s.id
      WHERE s.id = $1
      LIMIT 1
    `, [id]);
    const row = result.rows[0];
    if (!row) return undefined;

    return {
      id: Number(row.id),
      discordId: row.discordId,
      name: row.name,
      iconUrl: row.iconUrl ?? null,
      memberCount: Number(row.memberCount ?? 0),
      joinedAt: row.joinedAt ?? null,
      ownerId: row.ownerId,
      settings: row.settings ? camelizeValue(row.settings) : null,
      customCommands: [],
      embeds: [],
    } as any;
  } catch (error) {
    console.warn(
      `[ServerRepository] Failed to load server payload for ${id}${isSchemaMismatchError(error) ? " (schema mismatch)" : ""}:`,
      error instanceof Error ? error.message : error,
    );
    try {
      const [baseServer] = await db.select().from(servers).where(eq(servers.id, id));
      return baseServer ? toBasicServerPayload(baseServer) : undefined;
    } catch (fallbackError) {
      console.error(
        `[ServerRepository] Basic server fallback failed for ${id}:`,
        fallbackError instanceof Error ? fallbackError.message : fallbackError,
      );
      throw fallbackError;
    }
  }
}

export async function getServerByDiscordIdRecord(discordId: string): Promise<Server | undefined> {
  const [server] = await db.select().from(servers).where(eq(servers.discordId, discordId));
  return server;
}
