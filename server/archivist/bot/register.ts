import { REST, Routes, type Client } from "discord.js";
import type { ArchivistEnv } from "../config/env";
import { buildCommandPayloads } from "../commands/registry";
import type { ArchivistLogger } from "../lib/logger";

export async function registerArchivistCommands(client: Client<true>, env: ArchivistEnv, logger: ArchivistLogger) {
  if (!env.clientId || env.registerMode === "off") {
    logger.info("Command registration skipped.", { reason: env.clientId ? "mode_off" : "missing_client_id" });
    return;
  }

  const rest = new REST({ version: "10" }).setToken(env.token || "");
  const payload = buildCommandPayloads();

  if (env.registerMode === "guild") {
    const guildIds = env.guildIds.length > 0 ? env.guildIds : client.guilds.cache.map((guild) => guild.id).slice(0, 1);
    for (const guildId of guildIds) {
      await rest.put(Routes.applicationGuildCommands(env.clientId, guildId), { body: payload });
      logger.info("Registered guild commands.", { guildId, count: payload.length });
    }
    return;
  }

  await rest.put(Routes.applicationCommands(env.clientId), { body: payload });
  logger.info("Registered global commands.", { count: payload.length });
}
