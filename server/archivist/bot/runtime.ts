import { Client, Events, GatewayIntentBits, Partials, type ChatInputCommandInteraction, type Guild } from "discord.js";
import { db } from "../../db";
import { servers, serverSettings } from "@shared/schema";
import { eq } from "drizzle-orm";
import { getArchivistEnv } from "../config/env";
import { createCommandContext } from "../commands/types";
import { getCommandModule, listCommandModules } from "../commands/registry";
import { CommandError, toCommandError } from "../lib/errors";
import { replyFailure, replySuccess } from "../lib/discord/replies";
import { ArchivistLogger } from "../lib/logger";
import { commandActivityStore } from "../lib/logger/activity-store";
import { registerArchivistCommands } from "./register";
import { truncateText } from "../lib/utils/format";
import {
  handleCustomButtonInteraction,
  handleCustomKeywordMessage,
  handleCustomMemberJoin,
  handleCustomReactionAdd,
  handleCustomRoleAdd,
  handleCustomSelectInteraction,
  handleCustomSlashInteraction,
  startCustomCommandScheduler,
  syncCustomCommandsForClient,
} from "../features/custom-command/runtime";
import {
  handleCustomV2ButtonInteraction,
  handleCustomV2KeywordMessage,
  handleCustomV2MemberJoin,
  handleCustomV2ModalInteraction,
  handleCustomV2ReactionAdd,
  handleCustomV2RoleAdd,
  handleCustomV2SelectInteraction,
  handleCustomV2SlashInteraction,
  startCustomCommandV2Scheduler,
} from "../features/custom-command-v2/runtime";
import { startAutoPosterScheduler } from "../features/auto-poster/runtime";
import {
  handleLivePanelButtonInteraction,
  handlePanelButtonInteraction,
  handlePanelModalInteraction,
  handlePanelSelectInteraction,
} from "../features/panel/command";

let botClient: Client | null = null;
let botStartTime: Date | null = null;
let botLastHeartbeatAt: Date | null = null;
let botHeartbeatTimer: NodeJS.Timeout | null = null;

const env = getArchivistEnv();
const logger = new ArchivistLogger("archivist", env.logLevel);

function mapWsStatus(status: number | undefined) {
  switch (status) {
    case 0:
      return "ready";
    case 1:
      return "connecting";
    case 2:
      return "reconnecting";
    case 3:
      return "idle";
    case 4:
      return "nearly";
    case 5:
      return "disconnected";
    default:
      return "unknown";
  }
}

export function getBotClient() {
  return botClient;
}

export function getBotUptime() {
  if (!botStartTime) return null;
  return Date.now() - botStartTime.getTime();
}

export function getBotStatus() {
  const ready = !!botClient?.isReady();
  const wsStatus = botClient ? mapWsStatus(botClient.ws.status) : "offline";
  const gatewayPingMs = ready ? botClient!.ws.ping : null;
  return {
    ready,
    uptimeMs: ready && botStartTime ? Date.now() - botStartTime.getTime() : null,
    guildCount: ready ? botClient!.guilds.cache.size : 0,
    gatewayPingMs: Number.isFinite(gatewayPingMs as number) ? gatewayPingMs : null,
    lastHeartbeatAt: botLastHeartbeatAt ? botLastHeartbeatAt.toISOString() : null,
    startedAt: botStartTime ? botStartTime.toISOString() : null,
    wsStatus,
  };
}

async function ensureGuildRegistered(guild: Guild) {
  const existing = await db.select().from(servers).where(eq(servers.discordId, guild.id));
  if (existing.length === 0) {
    const [created] = await db.insert(servers).values({
      discordId: guild.id,
      name: guild.name,
      iconUrl: guild.iconURL(),
      memberCount: guild.memberCount,
      ownerId: guild.ownerId || "unknown",
    }).returning();
    await db.insert(serverSettings).values({ serverId: created.id } as any);
    logger.info("Guild registered.", { guildId: guild.id, name: guild.name });
    return;
  }

  await db.update(servers).set({
    name: guild.name,
    iconUrl: guild.iconURL(),
    memberCount: guild.memberCount,
    ownerId: guild.ownerId || existing[0].ownerId || "unknown",
  }).where(eq(servers.id, existing[0].id));
}

async function syncGuildRegistry(client: Client<true>) {
  await client.guilds.fetch();
  const guilds = Array.from(client.guilds.cache.values());
  await Promise.allSettled(guilds.map((guild) => ensureGuildRegistered(guild)));
  logger.info("Guild registry synced.", { count: guilds.length });
}

async function handleCommandInteraction(interaction: ChatInputCommandInteraction) {
  const command = getCommandModule(interaction.commandName);
  if (!command) {
    const startedAt = Date.now();
    try {
      const handled = await handleCustomSlashInteraction(interaction, logger);
      if (!handled) {
        const handledV2 = await handleCustomV2SlashInteraction(interaction, logger.child("custom-v2"));
        if (!handledV2) {
          await replyFailure(interaction, "Unknown command", "That command is not part of the active Archivist registry.");
        }
      }
    } catch (error) {
      const commandError = toCommandError(error);
      const guildId = interaction.guildId || "unknown";
      const guildName = interaction.guild?.name || "Unknown Guild";
      logger.error("Custom command failed.", {
        guildId,
        actorId: interaction.user.id,
        commandPath: interaction.commandName,
        code: commandError.code,
        message: commandError.message,
      });
      commandActivityStore.recordFailure({
        guildId,
        guildName,
        commandPath: interaction.commandName,
        actorId: interaction.user.id,
        actorTag: interaction.user.tag,
        summary: truncateText(commandError.message),
        durationMs: Date.now() - startedAt,
        code: commandError.code,
        message: commandError.message,
      });
      await replyFailure(interaction, "Command failed", commandError.message, {
        ephemeral: commandError.ephemeral,
      }).catch(() => {});
    }
    return;
  }

  const commandLogger = logger.child(interaction.commandName);
  const startedAt = Date.now();

  try {
    const ctx = await createCommandContext(interaction, commandLogger);
    commandLogger.info("Executing command.", {
      guildId: ctx.guild.id,
      actorId: ctx.interaction.user.id,
      commandPath: ctx.commandPath,
    });

    const outcome = await command.execute(ctx);
    if (outcome) {
      await replySuccess(interaction, outcome.title, outcome.description, { fields: outcome.fields });
    }
    commandActivityStore.recordSuccess({
      guildId: ctx.guild.id,
      guildName: ctx.guild.name,
      commandPath: ctx.commandPath,
      actorId: ctx.interaction.user.id,
      actorTag: ctx.interaction.user.tag,
      summary: truncateText(outcome?.description || "Interactive command completed."),
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    const commandError = toCommandError(error);
    const guildId = interaction.guildId || "unknown";
    const guildName = interaction.guild?.name || "Unknown Guild";
    const subcommand = interaction.options.getSubcommand(false);
    const commandPath = subcommand ? `${interaction.commandName} ${subcommand}` : interaction.commandName;

    commandLogger.error("Command failed.", {
      guildId,
      actorId: interaction.user.id,
      commandPath,
      code: commandError.code,
      message: commandError.message,
    });

    commandActivityStore.recordFailure({
      guildId,
      guildName,
      commandPath,
      actorId: interaction.user.id,
      actorTag: interaction.user.tag,
      summary: truncateText(commandError.message),
      durationMs: Date.now() - startedAt,
      code: commandError.code,
      message: commandError.message,
    });

    await replyFailure(
      interaction,
      commandError instanceof CommandError ? "Command blocked" : "Command failed",
      commandError.message,
      { ephemeral: commandError.ephemeral },
    ).catch(() => {});
  }
}

export async function startBot() {
  if (!env.token) {
    logger.warn("DISCORD_BOT_TOKEN not set. Archivist bot runtime will stay offline.");
    return;
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel, Partials.Message, Partials.Reaction],
  });

  client.once(Events.ClientReady, async (readyClient) => {
    botStartTime = new Date();
    botLastHeartbeatAt = new Date();
    if (botHeartbeatTimer) clearInterval(botHeartbeatTimer);
    botHeartbeatTimer = setInterval(() => {
      if (!client.isReady()) return;
      if (typeof client.ws.ping === "number" && Number.isFinite(client.ws.ping)) {
        botLastHeartbeatAt = new Date();
      }
    }, 15000);

    logger.info("Archivist connected.", {
      user: readyClient.user.tag,
      commands: listCommandModules().map((command) => command.data.name),
    });

    await syncGuildRegistry(readyClient);
    await registerArchivistCommands(readyClient, env, logger.child("register"));
    await syncCustomCommandsForClient({ client: readyClient, env, logger: logger.child("custom-register") });
    startCustomCommandScheduler({ client: readyClient, logger: logger.child("custom-schedule") });
    startCustomCommandV2Scheduler({ client: readyClient, logger: logger.child("custom-v2-schedule") });
    startAutoPosterScheduler({ client: readyClient, logger: logger.child("auto-poster-schedule") });
  });

  client.on(Events.GuildCreate, async (guild) => {
    await ensureGuildRegistered(guild).catch((error) => {
      logger.error("Failed to register guild on join.", { guildId: guild.id, message: error instanceof Error ? error.message : String(error) });
    });
    await syncCustomCommandsForClient({ client: client as Client<true>, env, logger: logger.child("custom-register") }).catch(() => null);
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isChatInputCommand()) {
      await handleCommandInteraction(interaction);
      return;
    }

    if (interaction.isButton()) {
      if (interaction.inCachedGuild()) {
        const cachedInteraction = interaction;
        const handledPanelLive = await handleLivePanelButtonInteraction(cachedInteraction).catch((error) => {
          logger.error("Panel live button runtime failed.", { message: error instanceof Error ? error.message : String(error) });
          return false;
        });
        if (handledPanelLive) {
          return;
        }

        const handledPanel = await handlePanelButtonInteraction(cachedInteraction, logger.child("panel")).catch((error) => {
          logger.error("Panel builder button runtime failed.", { message: error instanceof Error ? error.message : String(error) });
          return false;
        });
        if (handledPanel) {
          return;
        }
      }

      const handledLegacy = await handleCustomButtonInteraction(interaction, logger.child("button")).catch((error) => {
        logger.error("Button runtime failed.", { message: error instanceof Error ? error.message : String(error) });
        return false;
      });
      if (!handledLegacy) {
        await handleCustomV2ButtonInteraction(interaction, logger.child("button-v2")).catch((error) => {
          logger.error("Button V2 runtime failed.", { message: error instanceof Error ? error.message : String(error) });
        });
      }
      return;
    }

    if (interaction.isStringSelectMenu()) {
      if (interaction.inCachedGuild()) {
        const cachedInteraction = interaction;
        const handledPanel = await handlePanelSelectInteraction(cachedInteraction, logger.child("panel-select")).catch((error) => {
          logger.error("Panel select runtime failed.", { message: error instanceof Error ? error.message : String(error) });
          return false;
        });
        if (handledPanel) {
          return;
        }
      }

      const handledLegacy = await handleCustomSelectInteraction(interaction, logger.child("select")).catch((error) => {
        logger.error("Select runtime failed.", { message: error instanceof Error ? error.message : String(error) });
        return false;
      });
      if (!handledLegacy) {
        await handleCustomV2SelectInteraction(interaction, logger.child("select-v2")).catch((error) => {
          logger.error("Select V2 runtime failed.", { message: error instanceof Error ? error.message : String(error) });
        });
      }
      return;
    }

    if (interaction.isModalSubmit()) {
      if (interaction.inCachedGuild()) {
        const cachedInteraction = interaction;
        const handledPanel = await handlePanelModalInteraction(cachedInteraction, logger.child("panel-modal")).catch((error) => {
          logger.error("Panel modal runtime failed.", { message: error instanceof Error ? error.message : String(error) });
          return false;
        });
        if (handledPanel) {
          return;
        }
      }

      await handleCustomV2ModalInteraction(interaction, logger.child("modal-v2")).catch((error) => {
        logger.error("Modal V2 runtime failed.", { message: error instanceof Error ? error.message : String(error) });
      });
    }
  });

  client.on(Events.MessageCreate, async (message) => {
    await handleCustomKeywordMessage(message, logger.child("keyword")).catch((error) => {
      logger.error("Keyword runtime failed.", { message: error instanceof Error ? error.message : String(error) });
    });
    await handleCustomV2KeywordMessage(message, logger.child("keyword-v2")).catch((error) => {
      logger.error("Keyword V2 runtime failed.", { message: error instanceof Error ? error.message : String(error) });
    });
  });

  client.on(Events.GuildMemberAdd, async (member) => {
    await handleCustomMemberJoin(member, logger.child("join")).catch((error) => {
      logger.error("Join runtime failed.", { guildId: member.guild.id, message: error instanceof Error ? error.message : String(error) });
    });
    await handleCustomV2MemberJoin(member, logger.child("join-v2")).catch((error) => {
      logger.error("Join V2 runtime failed.", { guildId: member.guild.id, message: error instanceof Error ? error.message : String(error) });
    });
  });

  client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
    await handleCustomRoleAdd(oldMember, newMember, logger.child("role-add")).catch((error) => {
      logger.error("Role add runtime failed.", { guildId: newMember.guild.id, message: error instanceof Error ? error.message : String(error) });
    });
    await handleCustomV2RoleAdd(oldMember, newMember, logger.child("role-add-v2")).catch((error) => {
      logger.error("Role add V2 runtime failed.", { guildId: newMember.guild.id, message: error instanceof Error ? error.message : String(error) });
    });
  });

  client.on(Events.MessageReactionAdd, async (reaction, user) => {
    await handleCustomReactionAdd(reaction, user, logger.child("reaction")).catch((error) => {
      logger.error("Reaction runtime failed.", { message: error instanceof Error ? error.message : String(error) });
    });
    await handleCustomV2ReactionAdd(reaction, user, logger.child("reaction-v2")).catch((error) => {
      logger.error("Reaction V2 runtime failed.", { message: error instanceof Error ? error.message : String(error) });
    });
  });

  try {
    await client.login(env.token);
    botClient = client;
  } catch (error) {
    logger.error("Failed to log in.", { message: error instanceof Error ? error.message : String(error) });
  }
}
