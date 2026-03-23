import { PermissionFlagsBits, type Role } from "discord.js";
import { assertBotPermissions, assertUserPermissions } from "../../lib/guards/permissions";
import {
  assertBotCanManageMember,
  assertBotCanManageRole,
  assertRolePositionIsSafe,
  assertUserCanManageMember,
  assertUserCanManageRole,
} from "../../lib/guards/hierarchy";
import type { CommandContext, CommandOutcome } from "../../commands/types";
import { parseHexColor } from "../../lib/utils/colors";
import { CommandError } from "../../lib/errors";
import { isConfirmationMatch } from "../../lib/utils/format";
import { formatPermissionList, parsePermissionList } from "../../lib/utils/permissions";

const roleManagePermissions = [PermissionFlagsBits.ManageRoles];

function getRequiredRole(ctx: CommandContext) {
  return ctx.interaction.options.getRole("role", true) as Role;
}

async function getRequiredMember(ctx: CommandContext) {
  const user = ctx.interaction.options.getUser("member", true);
  return ctx.guild.members.fetch(user.id);
}

export async function createRole(ctx: CommandContext): Promise<CommandOutcome> {
  assertUserPermissions(ctx, roleManagePermissions);
  assertBotPermissions(ctx, roleManagePermissions);

  const name = ctx.interaction.options.getString("name", true).trim();
  const color = parseHexColor(ctx.interaction.options.getString("color"));
  const hoist = ctx.interaction.options.getBoolean("hoist") ?? false;
  const mentionable = ctx.interaction.options.getBoolean("mentionable") ?? false;
  const permissionsInput = parsePermissionList(ctx.interaction.options.getString("permissions"));
  const position = ctx.interaction.options.getInteger("position");
  const reason = ctx.interaction.options.getString("reason") || `Requested by ${ctx.interaction.user.tag}`;

  if (permissionsInput.invalid.length > 0) {
    throw new CommandError("VALIDATION_FAILED", `Unknown permission names: ${permissionsInput.invalid.join(", ")}`);
  }
  if (position != null) {
    assertRolePositionIsSafe(ctx, position);
  }

  const created = await ctx.guild.roles.create({
    name,
    color: color ?? undefined,
    hoist,
    mentionable,
    permissions: permissionsInput.bitfield,
    reason,
  });

  if (position != null) {
    await created.setPosition(position, { reason });
  }

  return {
    title: "Role created",
    description: `${created} was created successfully.`,
  };
}

export async function editRole(ctx: CommandContext): Promise<CommandOutcome> {
  const role = getRequiredRole(ctx);
  assertUserPermissions(ctx, roleManagePermissions);
  assertBotPermissions(ctx, roleManagePermissions);
  assertUserCanManageRole(ctx, role);
  assertBotCanManageRole(ctx, role);

  const updates: Record<string, unknown> = {};
  const name = ctx.interaction.options.getString("name");
  const hoist = ctx.interaction.options.getBoolean("hoist");
  const mentionable = ctx.interaction.options.getBoolean("mentionable");
  const reason = ctx.interaction.options.getString("reason") || `Requested by ${ctx.interaction.user.tag}`;

  if (name?.trim()) updates.name = name.trim();
  if (hoist != null) updates.hoist = hoist;
  if (mentionable != null) updates.mentionable = mentionable;

  if (Object.keys(updates).length === 0) {
    throw new CommandError("VALIDATION_FAILED", "Provide at least one editable property.");
  }

  await role.edit({ ...updates, reason });
  return {
    title: "Role updated",
    description: `${role} was updated successfully.`,
  };
}

export async function setRoleColor(ctx: CommandContext): Promise<CommandOutcome> {
  const role = getRequiredRole(ctx);
  assertUserPermissions(ctx, roleManagePermissions);
  assertBotPermissions(ctx, roleManagePermissions);
  assertUserCanManageRole(ctx, role);
  assertBotCanManageRole(ctx, role);

  const reset = ctx.interaction.options.getBoolean("reset") ?? false;
  const colorInput = ctx.interaction.options.getString("color");
  const reason = ctx.interaction.options.getString("reason") || `Requested by ${ctx.interaction.user.tag}`;

  if (!reset && !colorInput) {
    throw new CommandError("VALIDATION_FAILED", "Provide a hex color or enable reset.");
  }

  const color = reset ? null : parseHexColor(colorInput);
  if (!reset && color == null) {
    throw new CommandError("VALIDATION_FAILED", "Use a valid hex color like #B11226.");
  }

  await role.edit({ color: reset ? null : color!, reason } as any);
  return {
    title: "Role color updated",
    description: reset ? `${role} color was reset.` : `${role} color is now ${colorInput}.`,
  };
}

export async function setRolePosition(ctx: CommandContext): Promise<CommandOutcome> {
  const role = getRequiredRole(ctx);
  assertUserPermissions(ctx, roleManagePermissions);
  assertBotPermissions(ctx, roleManagePermissions);
  assertUserCanManageRole(ctx, role);
  assertBotCanManageRole(ctx, role);

  const position = ctx.interaction.options.getInteger("position", true);
  assertRolePositionIsSafe(ctx, position);

  const reason = ctx.interaction.options.getString("reason") || `Requested by ${ctx.interaction.user.tag}`;
  await role.setPosition(position, { reason });

  return {
    title: "Role moved",
    description: `${role} moved to position ${position}.`,
  };
}

async function setRoleMembership(ctx: CommandContext, operation: "assign" | "remove"): Promise<CommandOutcome> {
  const role = getRequiredRole(ctx);
  const member = await getRequiredMember(ctx);

  assertUserPermissions(ctx, roleManagePermissions);
  assertBotPermissions(ctx, roleManagePermissions);
  assertUserCanManageRole(ctx, role);
  assertBotCanManageRole(ctx, role);
  assertUserCanManageMember(ctx, member);
  assertBotCanManageMember(ctx, member);

  const reason = ctx.interaction.options.getString("reason") || `Requested by ${ctx.interaction.user.tag}`;

  if (operation === "assign") {
    if (member.roles.cache.has(role.id)) {
      throw new CommandError("VALIDATION_FAILED", `${member.user.tag} already has ${role}.`);
    }
    await member.roles.add(role, reason);
    return {
      title: "Role assigned",
      description: `${role} was added to ${member.user.tag}.`,
    };
  }

  if (!member.roles.cache.has(role.id)) {
    throw new CommandError("VALIDATION_FAILED", `${member.user.tag} does not currently have ${role}.`);
  }

  await member.roles.remove(role, reason);
  return {
    title: "Role removed",
    description: `${role} was removed from ${member.user.tag}.`,
  };
}

export function assignRole(ctx: CommandContext) {
  return setRoleMembership(ctx, "assign");
}

export function removeRole(ctx: CommandContext) {
  return setRoleMembership(ctx, "remove");
}

async function toggleRoleFlag(ctx: CommandContext, field: "hoist" | "mentionable"): Promise<CommandOutcome> {
  const role = getRequiredRole(ctx);
  const enabled = ctx.interaction.options.getBoolean("enabled", true);
  assertUserPermissions(ctx, roleManagePermissions);
  assertBotPermissions(ctx, roleManagePermissions);
  assertUserCanManageRole(ctx, role);
  assertBotCanManageRole(ctx, role);

  const reason = ctx.interaction.options.getString("reason") || `Requested by ${ctx.interaction.user.tag}`;
  await role.edit({ [field]: enabled, reason } as any);
  return {
    title: field === "hoist" ? "Role hoist updated" : "Role mentionable updated",
    description: `${role} is now ${enabled ? "enabled" : "disabled"} for ${field}.`,
  };
}

export function setRoleHoist(ctx: CommandContext) {
  return toggleRoleFlag(ctx, "hoist");
}

export function setRoleMentionable(ctx: CommandContext) {
  return toggleRoleFlag(ctx, "mentionable");
}

export async function editRolePermissions(ctx: CommandContext): Promise<CommandOutcome> {
  const role = getRequiredRole(ctx);
  assertUserPermissions(ctx, roleManagePermissions);
  assertBotPermissions(ctx, roleManagePermissions);
  assertUserCanManageRole(ctx, role);
  assertBotCanManageRole(ctx, role);

  const add = parsePermissionList(ctx.interaction.options.getString("add"));
  const remove = parsePermissionList(ctx.interaction.options.getString("remove"));
  if (add.invalid.length || remove.invalid.length) {
    throw new CommandError("VALIDATION_FAILED", `Unknown permission names: ${[...add.invalid, ...remove.invalid].join(", ")}`);
  }

  if (add.names.length === 0 && remove.names.length === 0) {
    return {
      title: "Role permissions",
        description: role.permissions.toArray().length === 0 ? "This role has no permissions." : formatPermissionList(role.permissions),
    };
  }

  const nextPermissions = new Set(role.permissions.toArray());
  for (const permission of add.names) nextPermissions.add(permission);
  for (const permission of remove.names) nextPermissions.delete(permission);

  const reason = ctx.interaction.options.getString("reason") || `Requested by ${ctx.interaction.user.tag}`;
  await role.setPermissions(Array.from(nextPermissions), reason);

  return {
    title: "Role permissions updated",
    description: `${role} permissions were updated successfully.`,
    fields: [
      add.names.length > 0 ? { name: "Added", value: formatPermissionList(add.names) } : undefined,
      remove.names.length > 0 ? { name: "Removed", value: formatPermissionList(remove.names) } : undefined,
    ].filter(Boolean) as { name: string; value: string }[],
  };
}

export async function deleteRole(ctx: CommandContext): Promise<CommandOutcome> {
  const role = getRequiredRole(ctx);
  assertUserPermissions(ctx, roleManagePermissions);
  assertBotPermissions(ctx, roleManagePermissions);
  assertUserCanManageRole(ctx, role);
  assertBotCanManageRole(ctx, role);

  const confirmation = ctx.interaction.options.getString("confirm", true);
  if (!isConfirmationMatch(confirmation)) {
    throw new CommandError("VALIDATION_FAILED", "Type DELETE in the confirmation field to remove a role.");
  }

  const name = role.name;
  const reason = ctx.interaction.options.getString("reason") || `Requested by ${ctx.interaction.user.tag}`;
  await role.delete(reason);

  return {
    title: "Role deleted",
    description: `${name} was deleted.`,
  };
}
