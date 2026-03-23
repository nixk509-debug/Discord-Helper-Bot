export type CommandRegisterMode = "guild" | "global" | "off";

export interface ArchivistEnv {
  token: string | null;
  clientId: string | null;
  guildIds: string[];
  registerMode: CommandRegisterMode;
  logLevel: "debug" | "info" | "warn" | "error";
}

function parseRegisterMode(): CommandRegisterMode {
  const explicit = String(process.env.DISCORD_COMMAND_REGISTER_MODE || "").trim().toLowerCase();
  if (explicit === "guild" || explicit === "global" || explicit === "off") {
    return explicit;
  }
  return process.env.NODE_ENV === "production" ? "global" : "guild";
}

function parseGuildIds() {
  const raw = process.env.DISCORD_GUILD_IDS || process.env.DISCORD_DEV_GUILD_ID || "";
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function parseLogLevel(): ArchivistEnv["logLevel"] {
  const raw = String(process.env.ARCHIVIST_LOG_LEVEL || "").trim().toLowerCase();
  if (raw === "debug" || raw === "info" || raw === "warn" || raw === "error") {
    return raw;
  }
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

export function getArchivistEnv(): ArchivistEnv {
  return {
    token: process.env.DISCORD_BOT_TOKEN?.trim() || null,
    clientId: process.env.DISCORD_CLIENT_ID?.trim() || null,
    guildIds: parseGuildIds(),
    registerMode: parseRegisterMode(),
    logLevel: parseLogLevel(),
  };
}
