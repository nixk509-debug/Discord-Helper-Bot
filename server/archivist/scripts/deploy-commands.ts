import { Client, GatewayIntentBits } from "discord.js";
import { getArchivistEnv } from "../config/env";
import { registerArchivistCommands } from "../bot/register";
import { ArchivistLogger } from "../lib/logger";

async function main() {
  const env = getArchivistEnv();
  const logger = new ArchivistLogger("archivist:deploy", env.logLevel);

  if (!env.token) {
    throw new Error("DISCORD_BOT_TOKEN is required.");
  }

  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  await client.login(env.token);
  await new Promise<void>((resolve) => client.once("ready", () => resolve()));

  if (!client.isReady()) {
    throw new Error("Discord client did not become ready.");
  }

  await registerArchivistCommands(client, env, logger);
  client.destroy();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
