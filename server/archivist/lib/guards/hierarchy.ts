import type { GuildMember, Role } from "discord.js";
import { CommandError } from "../errors";
import type { CommandContext } from "../../commands/types";

export function assertRoleIsEditable(role: Role) {
  if (role.id === role.guild.id) {
    throw new CommandError("UNSUPPORTED_OPERATION", "The @everyone role cannot be changed through this command.");
  }
  if (role.managed) {
    throw new CommandError("UNSUPPORTED_OPERATION", "Managed roles cannot be changed safely.");
  }
}

export function assertUserCanManageRole(ctx: CommandContext, role: Role) {
  assertRoleIsEditable(role);
  if (ctx.guild.ownerId === ctx.member.id) return;
  if (ctx.member.roles.highest.comparePositionTo(role) <= 0) {
    throw new CommandError("ROLE_HIERARCHY", "That role is at or above your highest role.");
  }
}

export function assertBotCanManageRole(ctx: CommandContext, role: Role) {
  assertRoleIsEditable(role);
  if (ctx.botMember.roles.highest.comparePositionTo(role) <= 0) {
    throw new CommandError("ROLE_HIERARCHY", "That role is above Archivist in the role list.");
  }
}

export function assertRolePositionIsSafe(ctx: CommandContext, position: number) {
  if (position < 1) {
    throw new CommandError("VALIDATION_FAILED", "Role positions must be at least 1.");
  }
  if (position >= ctx.botMember.roles.highest.position) {
    throw new CommandError("ROLE_HIERARCHY", "Archivist cannot move a role to or above its highest role.");
  }
  if (ctx.guild.ownerId !== ctx.member.id && position >= ctx.member.roles.highest.position) {
    throw new CommandError("ROLE_HIERARCHY", "You cannot move a role to or above your highest role.");
  }
}

export function assertUserCanManageMember(ctx: CommandContext, target: GuildMember) {
  if (target.id === ctx.member.id) return;
  if (ctx.guild.ownerId === ctx.member.id) return;
  if (ctx.member.roles.highest.comparePositionTo(target.roles.highest) <= 0) {
    throw new CommandError("MEMBER_HIERARCHY", "That member is at or above your highest role.");
  }
}

export function assertBotCanManageMember(ctx: CommandContext, target: GuildMember) {
  if (target.id === ctx.botMember.id) {
    throw new CommandError("MEMBER_HIERARCHY", "Archivist cannot operate on itself.");
  }
  if (ctx.botMember.roles.highest.comparePositionTo(target.roles.highest) <= 0) {
    throw new CommandError("MEMBER_HIERARCHY", "That member is above Archivist in the role hierarchy.");
  }
}
