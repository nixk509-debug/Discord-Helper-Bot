import { db } from "./db";
import { permissionRules } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

export interface PermissionCheckResult {
  allowed: boolean;
  reason: string;
  matchedRule?: string;
}

export async function checkPermission(
  memberRoleIds: string[],
  permission: string,
  serverId: number
): Promise<PermissionCheckResult> {
  const rules = await db.select()
    .from(permissionRules)
    .where(eq(permissionRules.serverId, serverId))
    .orderBy(desc(permissionRules.priority));

  const matching = rules.filter(r => memberRoleIds.includes(r.roleId) && r.permission === permission);

  if (matching.length === 0) {
    return { allowed: false, reason: "No matching rule found — default deny" };
  }

  const denyRule = matching.find(r => r.effect === "deny");
  if (denyRule) {
    return {
      allowed: false,
      reason: `Denied by rule for role ${denyRule.roleName || denyRule.roleId} (priority ${denyRule.priority})`,
      matchedRule: `${denyRule.roleName || denyRule.roleId}:${denyRule.permission}:deny`,
    };
  }

  const allowRule = matching.find(r => r.effect === "allow");
  if (allowRule) {
    return {
      allowed: true,
      reason: `Allowed by rule for role ${allowRule.roleName || allowRule.roleId} (priority ${allowRule.priority})`,
      matchedRule: `${allowRule.roleName || allowRule.roleId}:${allowRule.permission}:allow`,
    };
  }

  return { allowed: false, reason: "Default deny (no explicit allow)" };
}

export async function listPermissionRules(serverId: number) {
  return await db.select()
    .from(permissionRules)
    .where(eq(permissionRules.serverId, serverId))
    .orderBy(desc(permissionRules.priority));
}

export async function createPermissionRule(serverId: number, data: {
  roleId: string;
  roleName?: string;
  permission: string;
  effect: string;
  priority?: number;
}) {
  const [created] = await db.insert(permissionRules).values({ ...data, serverId }).returning();
  return created;
}

export async function deletePermissionRule(id: number) {
  await db.delete(permissionRules).where(eq(permissionRules.id, id));
}
