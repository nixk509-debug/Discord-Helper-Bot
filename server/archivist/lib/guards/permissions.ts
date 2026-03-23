import type { GuildBasedChannel } from "discord.js";
import { CommandError } from "../errors";
import type { CommandContext } from "../../commands/types";

function formatMissingPermissions(permissions: bigint[]) {
  return permissions.map((permission) => permission.toString()).join(", ");
}

export function assertUserPermissions(ctx: CommandContext, permissions: bigint[], channel?: GuildBasedChannel | null) {
  const resolved = channel ? ctx.member.permissionsIn(channel) : ctx.member.permissions;
  const missing = permissions.filter((permission) => !resolved.has(permission));
  if (missing.length > 0) {
    throw new CommandError(
      "USER_PERMISSION_MISSING",
      `You are missing the required permissions for \`/${ctx.commandPath}\`.`,
      { status: 403 },
    );
  }
}

export function assertBotPermissions(ctx: CommandContext, permissions: bigint[], channel?: GuildBasedChannel | null) {
  const resolved = channel ? ctx.botMember.permissionsIn(channel) : ctx.botMember.permissions;
  const missing = permissions.filter((permission) => !resolved.has(permission));
  if (missing.length > 0) {
    throw new CommandError(
      "BOT_PERMISSION_MISSING",
      `Archivist is missing required permissions for this action (${formatMissingPermissions(missing)}).`,
      { status: 403 },
    );
  }
}
