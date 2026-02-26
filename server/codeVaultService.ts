import crypto from "crypto";
import { db } from "./db";
import { guildCodes } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

type CodeFormat = "plain" | "grouped" | "prefixed";

function randChars(n: number): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  const bytes = crypto.randomBytes(n);
  for (let i = 0; i < n; i++) result += chars[bytes[i] % chars.length];
  return result;
}

function buildCode(format: CodeFormat): string {
  switch (format) {
    case "grouped":
      return `${randChars(4)}-${randChars(4)}-${randChars(4)}`;
    case "prefixed":
      return `AX-${randChars(6)}`;
    default:
      return randChars(8);
  }
}

export interface GenerateCodeOpts {
  format?: CodeFormat;
  maxUses?: number;
  expiresHours?: number;
  grantRoles?: string[];
  tags?: string[];
  createdBy: string;
  serverId: number;
  guildDiscordId: string;
}

export async function generateCode(opts: GenerateCodeOpts) {
  const format: CodeFormat = (opts.format as CodeFormat) || "plain";
  let code = buildCode(format);
  let attempts = 0;
  while (attempts < 10) {
    const existing = await db.select().from(guildCodes).where(eq(guildCodes.code, code));
    if (existing.length === 0) break;
    code = buildCode(format);
    attempts++;
  }
  const expiresAt = opts.expiresHours
    ? new Date(Date.now() + opts.expiresHours * 3600 * 1000)
    : null;
  const [created] = await db.insert(guildCodes).values({
    code,
    serverId: opts.serverId,
    guildDiscordId: opts.guildDiscordId,
    createdBy: opts.createdBy,
    expiresAt,
    maxUses: opts.maxUses ?? null,
    grantRoles: opts.grantRoles ?? [],
    tags: opts.tags ?? [],
    format,
    usesCount: 0,
    revoked: false,
  }).returning();
  return created;
}

export async function redeemCode(code: string, userId: string, guildDiscordId: string) {
  const [entry] = await db.select().from(guildCodes)
    .where(and(eq(guildCodes.code, code.toUpperCase()), eq(guildCodes.guildDiscordId, guildDiscordId)));
  if (!entry) return { success: false, error: "Code not found" };
  if (entry.revoked) return { success: false, error: "Code has been revoked" };
  if (entry.expiresAt && new Date() > entry.expiresAt) return { success: false, error: "Code has expired" };
  if (entry.maxUses !== null && (entry.usesCount ?? 0) >= entry.maxUses) return { success: false, error: "Code has reached max uses" };
  await db.update(guildCodes).set({ usesCount: (entry.usesCount ?? 0) + 1 }).where(eq(guildCodes.id, entry.id));
  return { success: true, grantRoles: entry.grantRoles ?? [], code: entry };
}

export async function listCodes(serverId: number, filters?: { revoked?: boolean; tag?: string }) {
  let rows = await db.select().from(guildCodes)
    .where(eq(guildCodes.serverId, serverId))
    .orderBy(desc(guildCodes.createdAt));
  if (filters?.revoked !== undefined) rows = rows.filter(r => r.revoked === filters.revoked);
  if (filters?.tag) rows = rows.filter(r => (r.tags as string[])?.includes(filters.tag!));
  return rows;
}

export async function revokeCode(id: number) {
  const [updated] = await db.update(guildCodes).set({ revoked: true }).where(eq(guildCodes.id, id)).returning();
  return updated;
}
