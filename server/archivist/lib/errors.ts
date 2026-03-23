import { DiscordAPIError } from "discord.js";

export type CommandErrorCode =
  | "VALIDATION_FAILED"
  | "USER_PERMISSION_MISSING"
  | "BOT_PERMISSION_MISSING"
  | "ROLE_HIERARCHY"
  | "MEMBER_HIERARCHY"
  | "UNSUPPORTED_OPERATION"
  | "NOT_FOUND"
  | "DISCORD_API_ERROR"
  | "INTERNAL_ERROR";

export class CommandError extends Error {
  readonly code: CommandErrorCode;
  readonly ephemeral: boolean;
  readonly status: number;

  constructor(code: CommandErrorCode, message: string, options?: { ephemeral?: boolean; status?: number }) {
    super(message);
    this.name = "CommandError";
    this.code = code;
    this.ephemeral = options?.ephemeral ?? true;
    this.status = options?.status ?? 400;
  }
}

export function toCommandError(error: unknown) {
  if (error instanceof CommandError) return error;
  if (error instanceof DiscordAPIError) {
    return new CommandError("DISCORD_API_ERROR", error.message, { status: 502 });
  }
  if (error instanceof Error) {
    return new CommandError("INTERNAL_ERROR", error.message, { status: 500 });
  }
  return new CommandError("INTERNAL_ERROR", "An unknown error occurred.", { status: 500 });
}
