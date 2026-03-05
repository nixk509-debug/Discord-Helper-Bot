import { Client, GatewayIntentBits, Events, REST, Routes, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, type Interaction, type Message, type ChatInputCommandInteraction } from "discord.js";
import { db } from "../db";
import { servers, serverSettings, customCommands } from "@shared/schema";
import { eq } from "drizzle-orm";
import { economyCommands, handleEconomyCommand } from "./commands/economy";
import { funCommand, handleFunCommand } from "./commands/fun";
import { setCommand, handleSetCommand } from "./commands/set";
import { lockCommand, handleLockCommand } from "./commands/lock";
import { codeCommand, handleCodeCommand } from "./commands/code";
import { auditCommand, handleAuditCommand } from "./commands/audit";
import { syncCommand, handleSyncCommand } from "./commands/sync";
import { adminCommand, handleAdminCommand } from "./commands/admin";
import { ownerCommand, handleOwnerCommand } from "./commands/owner";

let botClient: Client | null = null;
let botStartTime: Date | null = null;

export function getBotClient() {
  return botClient;
}

export function getBotUptime() {
  if (!botStartTime) return null;
  return Date.now() - botStartTime.getTime();
}

export function getBotStatus() {
  const ready = !!botClient?.isReady();
  return {
    ready,
    uptimeMs: ready && botStartTime ? Date.now() - botStartTime.getTime() : null,
    guildCount: ready ? botClient!.guilds.cache.size : 0,
  };
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

    try {
      await registerGuildSlashCommands(client, guild.id);
    } catch (err) {
      console.error(`[Bot] Failed to register guild commands for ${guild.id}:`, err);
    }
  });

  client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    if (interaction.isButton() || interaction.isStringSelectMenu()) {
      await handleCustomComponentInteraction(interaction);
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;
    const economyCommandNames = economyCommands.map((c) => c.name);

    try {
      if (commandName === "setup") await handleSetupCommand(interaction);
      else if (commandName === "premium") await handlePremiumCommand(interaction);
      else if (commandName === "help") await handleHelpCommand(interaction);
      else if (commandName === "fun") await handleFunCommand(interaction);
      else if (commandName === "set") await handleSetCommand(interaction);
      else if (commandName === "lock") await handleLockCommand(interaction);
      else if (commandName === "code") await handleCodeCommand(interaction);
      else if (commandName === "audit") await handleAuditCommand(interaction);
      else if (commandName === "sync") await handleSyncCommand(interaction);
      else if (commandName === "admin") await handleAdminCommand(interaction as ChatInputCommandInteraction);
      else if (commandName === "owner") await handleOwnerCommand(interaction as ChatInputCommandInteraction, client);
      else if (economyCommandNames.includes(commandName)) await handleEconomyCommand(interaction as ChatInputCommandInteraction);
    } catch (err: any) {
      console.error(`[Bot] Command error (${commandName}):`, err.message);
      const method = interaction.deferred || interaction.replied ? "followUp" : "reply";
      (interaction as any)[method]({ content: "An error occurred.", ephemeral: true }).catch(() => {});
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
  const commands = getSlashCommandDefinitions();

  try {
    const rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN!);
    await rest.put(Routes.applicationCommands(client.user.id), {
      body: commands.map((c) => c.toJSON()),
    });
    console.log(`[Bot] Registered ${commands.length} global slash commands`);

    for (const guild of Array.from(client.guilds.cache.values())) {
      await registerGuildSlashCommands(client, guild.id);
    }
  } catch (err) {
    console.error("[Bot] Failed to register slash commands:", err);
  }
}

function getSlashCommandDefinitions() {
  return [
    new SlashCommandBuilder().setName("setup").setDescription("Set up Archivist in this server"),
    new SlashCommandBuilder().setName("premium").setDescription("Check premium status for this server"),
    new SlashCommandBuilder().setName("help").setDescription("Show Archivist help and dashboard link"),
    funCommand,
    setCommand,
    lockCommand,
    codeCommand,
    auditCommand,
    syncCommand,
    adminCommand,
    ownerCommand,
    ...economyCommands,
  ];
}

async function registerGuildSlashCommands(client: Client<boolean>, guildId: string) {
  if (!client.user) return;
  const commands = getSlashCommandDefinitions();
  const rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN!);
  await rest.put(Routes.applicationGuildCommands(client.user.id, guildId), {
      body: commands.map((c) => c.toJSON()),
  });
  console.log(`[Bot] Registered ${commands.length} guild slash commands for ${guildId}`);
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
      "**Core Commands:**",
      "`/setup`, `/premium`, `/help`, `/set`, `/lock`, `/sync`, `/audit`, `/code`, `/fun`",
      "",
      "**Admin / Owner Commands:**",
      "`/admin purge|say|slowmode|nickname`, `/owner status|guilds|leave|announce`",
      "",
      "**Economy Commands:**",
      "`/balance`, `/daily`, `/work`, `/pay`, `/transfer`, `/shop`, `/buy`, `/slots`, `/coinflip`, `/richest`, `/transactions`, `/rob`",
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

    try {
      const payload = buildCustomCommandPayload(cmd as any, message);
      if (!payload.content && payload.embeds.length === 0) {
        continue;
      }

      if (cmd.dmResponse) {
        await message.author.send(payload);
      } else {
        await message.reply(payload);
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


function buildCustomCommandPayload(cmd: any, message: Message) {
  const responseType = cmd.responseType || "text";
  const content = responseType === "embed" ? "" : resolveVariables(cmd.response || "", message);
  const embed = (responseType === "embed" || responseType === "both") ? buildEmbedFromResponse(cmd, message) : null;
  const components = buildMessageComponents(cmd);

  return {
    content: content || undefined,
    embeds: embed ? [embed] : [],
    components,
  };
}

function buildEmbedFromResponse(cmd: any, message: Message) {
  const data = cmd.embedResponse as any;
  if (!data) return null;

  const embed = new EmbedBuilder();
  if (data.title) embed.setTitle(resolveVariables(data.title, message));
  if (data.description) embed.setDescription(resolveVariables(data.description, message));
  if (data.url) embed.setURL(data.url);
  if (data.color) {
    const hex = String(data.color).replace("#", "");
    const parsed = Number.parseInt(hex, 16);
    if (!Number.isNaN(parsed)) embed.setColor(parsed);
  }
  if (data.authorName) {
    embed.setAuthor({
      name: resolveVariables(data.authorName, message),
      url: data.authorUrl || undefined,
      iconURL: data.authorIconUrl || undefined,
    });
  }
  if (data.footerText) {
    embed.setFooter({ text: resolveVariables(data.footerText, message), iconURL: data.footerIconUrl || undefined });
  }
  if (data.thumbnailUrl) embed.setThumbnail(data.thumbnailUrl);
  if (data.imageUrl) embed.setImage(data.imageUrl);
  if (data.timestamp) embed.setTimestamp(new Date());
  if (Array.isArray(data.fields) && data.fields.length > 0) {
    embed.addFields(data.fields.slice(0, 25).map((field: any) => ({
      name: resolveVariables(field.name || "​", message),
      value: resolveVariables(field.value || "​", message),
      inline: !!field.inline,
    })));
  }
  return embed;
}

function buildMessageComponents(cmd: any) {
  const components = ((cmd.embedResponse as any)?.components || []) as any[];
  if (!Array.isArray(components) || components.length === 0) return [];

  const rows: any[] = [];
  let buttonRow: ButtonBuilder[] = [];

  for (const component of components) {
    if (component.type === 2) {
      const button = new ButtonBuilder()
        .setLabel(component.label || "Button")
        .setStyle((component.style || 1) as ButtonStyle)
        .setDisabled(!!component.disabled);

      if (component.emoji) button.setEmoji(component.emoji);

      if ((component.style || 1) === 5) {
        if (!component.url) continue;
        button.setURL(component.url);
      } else {
        const key = (component.customId || `btn_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
        button.setCustomId(`cc:${cmd.id}:${key}`);
      }

      buttonRow.push(button);
      if (buttonRow.length === 5) {
        rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(...buttonRow));
        buttonRow = [];
      }
    }

    if (component.type === 3) {
      const options = Array.isArray(component.options) ? component.options.slice(0, 25) : [];
      if (options.length === 0) continue;

      const key = (component.customId || `select_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
      const menu = new StringSelectMenuBuilder()
        .setCustomId(`cc:${cmd.id}:${key}`)
        .setPlaceholder(component.label || "Choose an option")
        .setMinValues(1)
        .setMaxValues(1)
        .setDisabled(!!component.disabled)
        .addOptions(options.map((opt: any) => {
          const option = new StringSelectMenuOptionBuilder()
            .setLabel(String(opt.label || opt.value || "Option").slice(0, 100))
            .setValue(String(opt.value || opt.label || "value").slice(0, 100));
          if (opt.description) option.setDescription(String(opt.description).slice(0, 100));
          return option;
        }));

      if (buttonRow.length > 0) {
        rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(...buttonRow));
        buttonRow = [];
      }
      rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu));
    }
  }

  if (buttonRow.length > 0) {
    rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(...buttonRow));
  }

  return rows.slice(0, 5);
}

async function handleCustomComponentInteraction(interaction: any) {
  const customId = interaction.customId || "";
  if (!customId.startsWith("cc:")) return;

  const [, commandIdRaw, componentKey] = customId.split(":");
  const commandId = Number.parseInt(commandIdRaw, 10);
  if (Number.isNaN(commandId)) return;

  try {
    const [cmd] = await db.select().from(customCommands).where(eq(customCommands.id, commandId));
    if (!cmd || !cmd.enabled) {
      return interaction.reply({ content: "This component is no longer active.", ephemeral: true });
    }

    const components = (((cmd as any).embedResponse as any)?.components || []) as any[];
    const source = components.find((c) => (c.customId || "") === componentKey);
    const baseResponse = source?.content || cmd.response || "Action completed.";

    const messageLike = {
      author: interaction.user,
      guild: interaction.guild,
      channel: interaction.channel,
    } as any;

    let response = resolveVariables(baseResponse, messageLike);
    if (interaction.isStringSelectMenu()) {
      response = response.replace(/\{selection\}/g, interaction.values.join(", "));
    }

    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ content: response, ephemeral: true });
    } else {
      await interaction.reply({ content: response, ephemeral: true });
    }
  } catch (err) {
    console.error("[Bot] Component interaction error:", err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "Component interaction failed.", ephemeral: true }).catch(() => {});
    }
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
