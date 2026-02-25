import { Client, GatewayIntentBits, Events, REST, Routes, SlashCommandBuilder, type Interaction, type Message, type ChatInputCommandInteraction } from "discord.js";
import { db } from "../db";
import { servers, serverSettings, customCommands } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { economyCommands, handleEconomyCommand } from "./commands/economy";

let botClient: Client | null = null;
let botStartTime: Date | null = null;

export function getBotClient() {
  return botClient;
}

export function getBotUptime() {
  if (!botStartTime) return null;
  return Date.now() - botStartTime.getTime();
}

export async function startBot() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    console.log("[Bot] DISCORD_BOT_TOKEN not set — bot will not start. Dashboard still works.");
    return;
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers,
    ],
  });

  client.once(Events.ClientReady, async (c) => {
    console.log(`[Bot] Logged in as ${c.user.tag}`);
    botStartTime = new Date();
    await registerSlashCommands(c);
  });

  client.on(Events.GuildCreate, async (guild) => {
    console.log(`[Bot] Joined server: ${guild.name} (${guild.id})`);
    try {
      const existing = await db.select().from(servers).where(eq(servers.discordId, guild.id));
      if (existing.length === 0) {
        const [server] = await db
          .insert(servers)
          .values({
            discordId: guild.id,
            name: guild.name,
            iconUrl: guild.iconURL(),
            memberCount: guild.memberCount,
            ownerId: guild.ownerId,
          })
          .returning();
        await db.insert(serverSettings).values({ serverId: server.id } as any);
        console.log(`[Bot] Auto-setup complete for ${guild.name}`);
      }
    } catch (err) {
      console.error(`[Bot] Failed to auto-setup ${guild.name}:`, err);
    }
  });

  client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    const economyCommandNames = economyCommands.map((c) => c.name);
    if (commandName === "setup") {
      await handleSetupCommand(interaction);
    } else if (commandName === "premium") {
      await handlePremiumCommand(interaction);
    } else if (commandName === "help") {
      await handleHelpCommand(interaction);
    } else if (economyCommandNames.includes(commandName)) {
      await handleEconomyCommand(interaction as ChatInputCommandInteraction);
    }
  });

  client.on(Events.MessageCreate, async (message: Message) => {
    if (message.author.bot || !message.guild) return;
    await handleCustomCommand(message);
  });

  try {
    await client.login(token);
    botClient = client;
  } catch (err) {
    console.error("[Bot] Failed to login:", err);
  }
}

async function registerSlashCommands(client: Client<true>) {
  const commands = [
    new SlashCommandBuilder()
      .setName("setup")
      .setDescription("Set up Archivist in this server"),
    new SlashCommandBuilder()
      .setName("premium")
      .setDescription("Check premium status for this server"),
    new SlashCommandBuilder()
      .setName("help")
      .setDescription("Show Archivist help and dashboard link"),
    ...economyCommands,
  ];

  try {
    const rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN!);
    await rest.put(Routes.applicationCommands(client.user.id), {
      body: commands.map((c) => c.toJSON()),
    });
    console.log(`[Bot] Registered ${commands.length} slash commands`);
  } catch (err) {
    console.error("[Bot] Failed to register slash commands:", err);
  }
}

async function handleSetupCommand(interaction: any) {
  const guild = interaction.guild;
  if (!guild) {
    return interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
  }

  const member = await guild.members.fetch(interaction.user.id);
  if (!member.permissions.has("ManageGuild")) {
    return interaction.reply({ content: "You need the **Manage Server** permission.", ephemeral: true });
  }

  try {
    const existing = await db.select().from(servers).where(eq(servers.discordId, guild.id));
    if (existing.length > 0) {
      const dashUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}/dashboard/servers/${existing[0].id}`;
      return interaction.reply({
        content: `This server is already set up! Manage it here: ${dashUrl}`,
        ephemeral: true,
      });
    }

    const [server] = await db
      .insert(servers)
      .values({
        discordId: guild.id,
        name: guild.name,
        iconUrl: guild.iconURL(),
        memberCount: guild.memberCount,
        ownerId: guild.ownerId,
      })
      .returning();
    await db.insert(serverSettings).values({ serverId: server.id } as any);

    const dashUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}/dashboard/servers/${server.id}`;
    await interaction.reply({
      content: `Server setup complete! Configure Archivist here: ${dashUrl}`,
      ephemeral: true,
    });
  } catch (err) {
    console.error("[Bot] Setup error:", err);
    await interaction.reply({ content: "Setup failed. Please try again.", ephemeral: true });
  }
}

async function handlePremiumCommand(interaction: any) {
  const guild = interaction.guild;
  if (!guild) {
    return interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
  }

  const ownerIds = (process.env.OWNER_IDS || "").split(",").filter(Boolean);
  const isOwner = ownerIds.includes(interaction.user.id);

  const dashUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}/premium`;
  if (isOwner) {
    return interaction.reply({
      content: "You have **Owner Premium** — all features are unlocked!",
      ephemeral: true,
    });
  }

  await interaction.reply({
    content: `Check your premium status and upgrade here: ${dashUrl}`,
    ephemeral: true,
  });
}

async function handleHelpCommand(interaction: any) {
  const dashUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;
  await interaction.reply({
    content: [
      "**Archivist** — Your all-in-one Discord server manager",
      "",
      "**Slash Commands:**",
      "`/setup` — Set up Archivist in this server",
      "`/premium` — Check premium status",
      "`/help` — Show this help message",
      "",
      `**Dashboard:** ${dashUrl}/dashboard`,
      "",
      "Configure custom commands, automod, leveling, tickets, and more from the dashboard!",
    ].join("\n"),
    ephemeral: true,
  });
}

async function handleCustomCommand(message: Message) {
  const guildId = message.guild!.id;

  const [server] = await db.select().from(servers).where(eq(servers.discordId, guildId));
  if (!server) return;

  const [settings] = await db.select().from(serverSettings).where(eq(serverSettings.serverId, server.id));
  const prefix = settings?.prefix || "!";

  const cmds = await db.select().from(customCommands).where(eq(customCommands.serverId, server.id));
  if (cmds.length === 0) return;

  const content = message.content;

  for (const cmd of cmds) {
    if (!cmd.enabled) continue;

    let matched = false;
    const triggerType = cmd.triggerType || "command";

    if (triggerType === "command") {
      const trigger = `${prefix}${cmd.name}`;
      if (content === trigger || content.startsWith(trigger + " ")) {
        matched = true;
      }
      if (!matched && cmd.aliases) {
        for (const alias of cmd.aliases as string[]) {
          const aliasTrigger = `${prefix}${alias}`;
          if (content === aliasTrigger || content.startsWith(aliasTrigger + " ")) {
            matched = true;
            break;
          }
        }
      }
    } else if (triggerType === "keyword") {
      matched = content.toLowerCase().includes(cmd.name.toLowerCase());
    } else if (triggerType === "regex") {
      try {
        matched = new RegExp(cmd.name, "i").test(content);
      } catch {}
    } else if (triggerType === "startsWith") {
      matched = content.toLowerCase().startsWith(cmd.name.toLowerCase());
    }

    if (!matched) continue;

    if (cmd.blockedChannels && (cmd.blockedChannels as string[]).includes(message.channel.id)) continue;
    if (cmd.allowedChannels && (cmd.allowedChannels as string[]).length > 0 && !(cmd.allowedChannels as string[]).includes(message.channel.id)) continue;

    const memberRoles = message.member?.roles.cache.map((r) => r.id) || [];
    if (cmd.blockedRoles && (cmd.blockedRoles as string[]).some((r) => memberRoles.includes(r))) continue;
    if (cmd.requiredRoles && (cmd.requiredRoles as string[]).length > 0 && !(cmd.requiredRoles as string[]).some((r) => memberRoles.includes(r))) continue;

    let response = resolveVariables(cmd.response, message);

    try {
      if (cmd.dmResponse) {
        await message.author.send(response);
      } else {
        await message.reply(response);
      }

      if (cmd.deleteInvocation) {
        await message.delete().catch(() => {});
      }

      await db
        .update(customCommands)
        .set({
          usageCount: (cmd.usageCount || 0) + 1,
          lastUsedAt: new Date(),
        })
        .where(eq(customCommands.id, cmd.id));
    } catch (err) {
      console.error(`[Bot] Command error (${cmd.name}):`, err);
    }

    break;
  }
}

function resolveVariables(text: string, message: Message): string {
  return text
    .replace(/\{user\}/g, message.author.toString())
    .replace(/\{username\}/g, message.author.username)
    .replace(/\{server\}/g, message.guild?.name || "")
    .replace(/\{channel\}/g, message.channel.toString())
    .replace(/\{membercount\}/g, String(message.guild?.memberCount || 0))
    .replace(/\{random:([^}]+)\}/g, (_match, options) => {
      const items = options.split(",");
      return items[Math.floor(Math.random() * items.length)].trim();
    });
}
