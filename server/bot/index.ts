import {
  Client,
  GatewayIntentBits,
  Events,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionsBitField,
  type Interaction,
  type Message,
  type ChatInputCommandInteraction,
  type ButtonInteraction,
  type StringSelectMenuInteraction,
  type Guild,
} from "discord.js";
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
import { decodeEmbedActionToken } from "./embed-action-token";

let botClient: Client | null = null;
let botStartTime: Date | null = null;
let botHeartbeatTimer: NodeJS.Timeout | null = null;
let botLastHeartbeatAt: Date | null = null;

function mapWsStatus(status: number | undefined): string {
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

function getPublicBaseUrl() {
  const explicit = (process.env.APP_URL || process.env.PUBLIC_BASE_URL || "").trim();
  if (explicit) {
    const normalized = explicit.replace(/\/$/, "");
    return /^https?:\/\//i.test(normalized) ? normalized : `https://${normalized}`;
  }

  const replitDomain = process.env.REPLIT_DOMAINS?.split(",")[0]?.trim();
  if (replitDomain) return `https://${replitDomain}`;

  return "http://localhost:5000";
}

function shouldRegisterGuildCommands() {
  if (process.env.DISCORD_REGISTER_GUILD_COMMANDS === "1") return true;
  if (process.env.DISCORD_REGISTER_GUILD_COMMANDS === "0") return false;
  return process.env.NODE_ENV !== "production";
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

export async function startBot() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    console.log("[Bot] DISCORD_BOT_TOKEN not set - bot will not start. Dashboard still works.");
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
    botLastHeartbeatAt = new Date();
    if (botHeartbeatTimer) clearInterval(botHeartbeatTimer);
    botHeartbeatTimer = setInterval(() => {
      if (!client.isReady()) return;
      if (typeof client.ws.ping === "number" && Number.isFinite(client.ws.ping)) {
        botLastHeartbeatAt = new Date();
      }
    }, 15_000);
    await registerSlashCommands(c);
    await syncGuildRegistry(c);
  });

  client.on(Events.GuildCreate, async (guild) => {
    console.log(`[Bot] Joined server: ${guild.name} (${guild.id})`);
    await ensureGuildRegistered(guild);

    if (shouldRegisterGuildCommands()) {
      try {
        await registerGuildSlashCommands(client, guild.id);
      } catch (err) {
        console.error(`[Bot] Failed to register guild commands for ${guild.id}:`, err);
      }
    }
  });

  client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    if (interaction.isButton() || interaction.isStringSelectMenu()) {
      await handleEmbedActionInteraction(interaction);
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

async function ensureGuildRegistered(guild: Guild) {
  try {
    const existing = await db.select().from(servers).where(eq(servers.discordId, guild.id));
    if (existing.length === 0) {
      const [created] = await db
        .insert(servers)
        .values({
          discordId: guild.id,
          name: guild.name,
          iconUrl: guild.iconURL(),
          memberCount: guild.memberCount,
          ownerId: guild.ownerId || "unknown",
        })
        .returning();

      await db.insert(serverSettings).values({ serverId: created.id } as any);
      console.log(`[Bot] Auto-setup complete for ${guild.name}`);
      return;
    }

    const server = existing[0];
    await db
      .update(servers)
      .set({
        name: guild.name,
        iconUrl: guild.iconURL(),
        memberCount: guild.memberCount,
        ownerId: guild.ownerId || server.ownerId || "unknown",
      })
      .where(eq(servers.id, server.id));

    const existingSettings = await db.select().from(serverSettings).where(eq(serverSettings.serverId, server.id));
    if (existingSettings.length === 0) {
      await db.insert(serverSettings).values({ serverId: server.id } as any);
      console.log(`[Bot] Repaired missing settings row for ${guild.name}`);
    }
  } catch (err) {
    console.error(`[Bot] Failed to register guild ${guild.name} (${guild.id}):`, err);
  }
}

async function syncGuildRegistry(client: Client<true>) {
  try {
    await client.guilds.fetch();
    const guilds = Array.from(client.guilds.cache.values());
    if (guilds.length === 0) {
      console.log("[Bot] Guild registry sync skipped: bot is not in any guilds.");
      return;
    }

    await Promise.allSettled(guilds.map((guild) => ensureGuildRegistered(guild)));
    console.log(`[Bot] Guild registry sync complete (${guilds.length} guilds).`);
  } catch (err) {
    console.error("[Bot] Guild registry sync failed:", err);
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

    const registerGuild = shouldRegisterGuildCommands();
    for (const guild of Array.from(client.guilds.cache.values())) {
      if (registerGuild) {
        await registerGuildSlashCommands(client, guild.id);
      } else {
        await clearGuildSlashCommands(client, guild.id);
      }
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

async function clearGuildSlashCommands(client: Client<boolean>, guildId: string) {
  if (!client.user) return;
  const rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN!);
  await rest.put(Routes.applicationGuildCommands(client.user.id, guildId), {
    body: [],
  });
  console.log(`[Bot] Cleared guild slash commands for ${guildId}`);
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
      const dashUrl = `${getPublicBaseUrl()}/dashboard/servers/${existing[0].id}`;
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

    const dashUrl = `${getPublicBaseUrl()}/dashboard/servers/${server.id}`;
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

  const dashUrl = `${getPublicBaseUrl()}/premium`;
  if (isOwner) {
    return interaction.reply({
      content: "You have **Owner Premium** - all features are unlocked!",
      ephemeral: true,
    });
  }

  await interaction.reply({
    content: `Check your premium status and upgrade here: ${dashUrl}`,
    ephemeral: true,
  });
}

async function handleHelpCommand(interaction: any) {
  const dashUrl = getPublicBaseUrl();
  await interaction.reply({
    content: [
      "**Archivist** - Your all-in-one Discord server manager",
      "",
      "**Core Commands:**",
      "`/setup`, `/premium`, `/help`, `/set`, `/lock`, `/sync`, `/audit`, `/code`",
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

  const content = message.content.trim();
  const lowerContent = content.toLowerCase();

  for (const cmd of cmds) {
    if (!cmd.enabled) continue;

    let matched = false;
    const triggerType = (cmd.triggerType || "command").toLowerCase();

    if (triggerType === "command") {
      const trigger = `${prefix}${cmd.name}`.toLowerCase();
      if (lowerContent === trigger || lowerContent.startsWith(trigger + " ")) {
        matched = true;
      }
      if (!matched && Array.isArray(cmd.aliases)) {
        for (const alias of cmd.aliases as string[]) {
          const aliasTrigger = `${prefix}${alias}`.toLowerCase();
          if (lowerContent === aliasTrigger || lowerContent.startsWith(aliasTrigger + " ")) {
            matched = true;
            break;
          }
        }
      }
    } else if (triggerType === "keyword") {
      matched = lowerContent.includes((cmd.name || "").toLowerCase());
    } else if (triggerType === "regex") {
      try {
        matched = new RegExp(cmd.name, "i").test(content);
      } catch {
        matched = false;
      }
    } else if (triggerType === "startswith") {
      matched = lowerContent.startsWith((cmd.name || "").toLowerCase());
    }

    if (!matched) continue;

    const blockedChannels = normalizeIdList(cmd.blockedChannels as string[] | null | undefined);
    const allowedChannels = normalizeIdList(cmd.allowedChannels as string[] | null | undefined);
    if (blockedChannels.includes(message.channel.id)) continue;
    if (allowedChannels.length > 0 && !allowedChannels.includes(message.channel.id)) continue;

    const memberRoles = message.member?.roles.cache.map((role) => role.id) || [];
    const blockedRoles = normalizeIdList(cmd.blockedRoles as string[] | null | undefined);
    const requiredRoles = normalizeIdList(cmd.requiredRoles as string[] | null | undefined);
    if (blockedRoles.some((roleId) => memberRoles.includes(roleId))) continue;
    if (requiredRoles.length > 0 && !requiredRoles.some((roleId) => memberRoles.includes(roleId))) continue;

    const responseTemplate = pickCommandResponseTemplate(cmd.response, cmd.responseVariations as string[] | null | undefined);
    const responseText = resolveVariables(responseTemplate, message);
    const responseType = (cmd.responseType || "text").toLowerCase();
    const includeText = responseType !== "embed";
    const includeEmbed = responseType === "embed" || responseType === "both";

    const payload: { content?: string; embeds?: EmbedBuilder[] } = {};
    if (includeText && responseText.trim().length > 0) {
      payload.content = responseText;
    }
    if (includeEmbed) {
      const embed = buildCommandEmbed(cmd.embedResponse, message);
      if (embed) payload.embeds = [embed];
    }

    if (!payload.content && (!payload.embeds || payload.embeds.length === 0)) {
      console.warn(`[Bot] Skipping command ${cmd.name}: no text/embed content configured.`);
      continue;
    }

    try {
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
      console.error(`[Bot] Command error (${cmd.name}, mode=${responseType}):`, err);
    }

    break;
  }
}

async function handleEmbedActionInteraction(interaction: ButtonInteraction | StringSelectMenuInteraction) {
  const tokenSource = interaction.isButton() ? interaction.customId : interaction.values[0];
  if (!tokenSource) return;

  const decoded = decodeEmbedActionToken(tokenSource);
  if (!decoded) return;

  if (!interaction.inCachedGuild()) {
    await replyEmbedAction(interaction, "This action can only be used in a server.", "ephemeral");
    return;
  }

  if (decoded.guildId && decoded.guildId !== interaction.guildId) {
    await replyEmbedAction(interaction, "This action does not belong to this server.", "ephemeral");
    return;
  }

  const [server] = await db.select().from(servers).where(eq(servers.id, decoded.serverId));
  if (!server || server.discordId !== interaction.guildId) {
    await replyEmbedAction(interaction, "This action is no longer valid.", "ephemeral");
    return;
  }

  const action = decoded.action;
  const replyMode = action.replyMode || "ephemeral";

  try {
    if (action.type === "role_add" || action.type === "role_remove" || action.type === "role_toggle") {
      await executeRoleAction(interaction, action, replyMode);
      return;
    }

    if (action.type === "run_command") {
      await executeCommandAction(interaction, decoded.serverId, action, replyMode);
      return;
    }

    if (action.type === "open_url" && action.url) {
      await replyEmbedAction(interaction, `Open: ${action.url}`, replyMode);
      return;
    }

    await replyEmbedAction(interaction, "Unsupported action.", "ephemeral");
  } catch (err: any) {
    console.error("[Bot] Interactive action failed:", err?.message || err);
    await replyEmbedAction(interaction, "Action failed to execute.", "ephemeral");
  }
}

async function executeRoleAction(
  interaction: ButtonInteraction | StringSelectMenuInteraction,
  action: { type: "role_add" | "role_remove" | "role_toggle"; roleId?: string },
  replyMode: "ephemeral" | "channel"
) {
  const roleId = normalizeId(action.roleId || "");
  if (!roleId) {
    await replyEmbedAction(interaction, "Role action is misconfigured.", "ephemeral");
    return;
  }

  const guild = interaction.guild!;
  const member = await guild.members.fetch(interaction.user.id).catch(() => null);
  const role = await guild.roles.fetch(roleId).catch(() => null);
  const me = guild.members.me ?? await guild.members.fetchMe().catch(() => null);

  if (!member || !role || !me) {
    await replyEmbedAction(interaction, "Could not load member or role.", "ephemeral");
    return;
  }

  if (!me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
    await replyEmbedAction(interaction, "I need Manage Roles permission to do that.", "ephemeral");
    return;
  }

  if (role.position >= me.roles.highest.position) {
    await replyEmbedAction(interaction, "I cannot manage that role due to role hierarchy.", "ephemeral");
    return;
  }

  const hasRole = member.roles.cache.has(role.id);
  if (action.type === "role_add") {
    if (hasRole) {
      await replyEmbedAction(interaction, `You already have **${role.name}**.`, replyMode);
      return;
    }
    await member.roles.add(role.id);
    await replyEmbedAction(interaction, `Added **${role.name}**.`, replyMode);
    return;
  }

  if (action.type === "role_remove") {
    if (!hasRole) {
      await replyEmbedAction(interaction, `You do not have **${role.name}**.`, replyMode);
      return;
    }
    await member.roles.remove(role.id);
    await replyEmbedAction(interaction, `Removed **${role.name}**.`, replyMode);
    return;
  }

  if (hasRole) {
    await member.roles.remove(role.id);
    await replyEmbedAction(interaction, `Removed **${role.name}**.`, replyMode);
  } else {
    await member.roles.add(role.id);
    await replyEmbedAction(interaction, `Added **${role.name}**.`, replyMode);
  }
}

async function executeCommandAction(
  interaction: ButtonInteraction | StringSelectMenuInteraction,
  serverId: number,
  action: { commandName?: string; commandArgs?: string },
  replyMode: "ephemeral" | "channel"
) {
  const commandName = String(action.commandName || "").trim().toLowerCase();
  if (!commandName) {
    await replyEmbedAction(interaction, "Command action is misconfigured.", "ephemeral");
    return;
  }

  const commands = await db.select().from(customCommands).where(eq(customCommands.serverId, serverId));
  const command = commands.find((entry) => (entry.name || "").toLowerCase() === commandName);
  if (!command || !command.enabled) {
    await replyEmbedAction(interaction, `Command \`!${commandName}\` is unavailable.`, "ephemeral");
    return;
  }

  const blockedChannels = normalizeIdList(command.blockedChannels as string[] | null | undefined);
  const allowedChannels = normalizeIdList(command.allowedChannels as string[] | null | undefined);
  if (blockedChannels.includes(interaction.channelId)) {
    await replyEmbedAction(interaction, "That command is blocked in this channel.", "ephemeral");
    return;
  }
  if (allowedChannels.length > 0 && !allowedChannels.includes(interaction.channelId)) {
    await replyEmbedAction(interaction, "That command is not allowed in this channel.", "ephemeral");
    return;
  }

  const guildMember: any = interaction.member as any;
  const memberRoleIds: string[] = guildMember?.roles?.cache?.map((role: any) => role.id) || [];
  const blockedRoles = normalizeIdList(command.blockedRoles as string[] | null | undefined);
  const requiredRoles = normalizeIdList(command.requiredRoles as string[] | null | undefined);
  if (blockedRoles.some((roleId) => memberRoleIds.includes(roleId))) {
    await replyEmbedAction(interaction, "You do not have permission to run that command.", "ephemeral");
    return;
  }
  if (requiredRoles.length > 0 && !requiredRoles.some((roleId) => memberRoleIds.includes(roleId))) {
    await replyEmbedAction(interaction, "You are missing required roles for this command.", "ephemeral");
    return;
  }

  const responseTemplate = pickCommandResponseTemplate(command.response, command.responseVariations as string[] | null | undefined);
  const responseText = resolveInteractionVariables(responseTemplate, interaction, action.commandArgs || "");

  let delivered = false;
  if ((command.responseType || "text").toLowerCase() !== "embed") {
    const content = responseText.trim();
    if (content) {
      if (command.dmResponse) {
        await interaction.user.send({ content });
        await replyEmbedAction(interaction, "Sent the command response via DM.", "ephemeral");
      } else {
        await replyEmbedAction(interaction, content, replyMode);
      }
      delivered = true;
    }
  }

  if (!delivered) {
    await replyEmbedAction(interaction, `Executed \`!${command.name}\`.`, replyMode);
  }

  await db
    .update(customCommands)
    .set({
      usageCount: (command.usageCount || 0) + 1,
      lastUsedAt: new Date(),
    })
    .where(eq(customCommands.id, command.id));
}

async function replyEmbedAction(
  interaction: ButtonInteraction | StringSelectMenuInteraction,
  content: string,
  replyMode: "ephemeral" | "channel"
) {
  const payload = { content, ephemeral: replyMode !== "channel" };
  if (interaction.deferred || interaction.replied) {
    await interaction.followUp(payload).catch(() => {});
  } else {
    await interaction.reply(payload).catch(() => {});
  }
}

function pickCommandResponseTemplate(base: string | null, variations: string[] | null | undefined): string {
  const templates = [base || "", ...((Array.isArray(variations) ? variations : []).filter((v): v is string => typeof v === "string"))]
    .map((template) => template.trim())
    .filter(Boolean);
  if (templates.length === 0) return "";
  return templates[Math.floor(Math.random() * templates.length)] || templates[0];
}

function normalizeId(value: unknown): string {
  const trimmed = String(value ?? "").trim();
  const match = trimmed.match(/\d{15,21}/);
  return match ? match[0] : trimmed;
}

function normalizeIdList(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return values.map((value) => normalizeId(value)).filter(Boolean);
}

function parseEmbedColor(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) return value;
  if (typeof value === "string") {
    const normalized = value.trim().replace(/^#/, "");
    if (/^[0-9a-fA-F]{6}$/.test(normalized)) return parseInt(normalized, 16);
  }
  return null;
}

function buildCommandEmbed(rawEmbed: any, message: Message): EmbedBuilder | null {
  if (!rawEmbed || typeof rawEmbed !== "object") return null;

  const embed = new EmbedBuilder();
  let hasData = false;

  const title = typeof rawEmbed.title === "string" ? resolveVariables(rawEmbed.title, message).trim() : "";
  if (title) {
    embed.setTitle(title);
    hasData = true;
  }

  const description = typeof rawEmbed.description === "string" ? resolveVariables(rawEmbed.description, message).trim() : "";
  if (description) {
    embed.setDescription(description);
    hasData = true;
  }

  const url = typeof rawEmbed.url === "string" ? rawEmbed.url.trim() : "";
  if (url) {
    embed.setURL(url);
    hasData = true;
  }

  const color = parseEmbedColor(rawEmbed.color);
  if (color !== null) {
    embed.setColor(color);
    hasData = true;
  }

  const authorName = typeof rawEmbed.authorName === "string" ? resolveVariables(rawEmbed.authorName, message).trim() : "";
  if (authorName) {
    embed.setAuthor({
      name: authorName,
      url: typeof rawEmbed.authorUrl === "string" && rawEmbed.authorUrl.trim() ? rawEmbed.authorUrl.trim() : undefined,
      iconURL: typeof rawEmbed.authorIconUrl === "string" && rawEmbed.authorIconUrl.trim() ? rawEmbed.authorIconUrl.trim() : undefined,
    });
    hasData = true;
  }

  const footerTextRaw = typeof rawEmbed.footerText === "string"
    ? rawEmbed.footerText
    : typeof rawEmbed.footer === "string"
      ? rawEmbed.footer
      : typeof rawEmbed.footer?.text === "string"
        ? rawEmbed.footer.text
        : "";
  const footerText = resolveVariables(footerTextRaw, message).trim();
  if (footerText) {
    embed.setFooter({
      text: footerText,
      iconURL:
        (typeof rawEmbed.footerIconUrl === "string" && rawEmbed.footerIconUrl.trim()) ||
        (typeof rawEmbed.footer?.icon_url === "string" && rawEmbed.footer.icon_url.trim()) ||
        undefined,
    });
    hasData = true;
  }

  if (typeof rawEmbed.imageUrl === "string" && rawEmbed.imageUrl.trim()) {
    embed.setImage(rawEmbed.imageUrl.trim());
    hasData = true;
  } else if (typeof rawEmbed.image?.url === "string" && rawEmbed.image.url.trim()) {
    embed.setImage(rawEmbed.image.url.trim());
    hasData = true;
  }

  if (typeof rawEmbed.thumbnailUrl === "string" && rawEmbed.thumbnailUrl.trim()) {
    embed.setThumbnail(rawEmbed.thumbnailUrl.trim());
    hasData = true;
  } else if (typeof rawEmbed.thumbnail?.url === "string" && rawEmbed.thumbnail.url.trim()) {
    embed.setThumbnail(rawEmbed.thumbnail.url.trim());
    hasData = true;
  }

  if (Array.isArray(rawEmbed.fields) && rawEmbed.fields.length > 0) {
    const fields = rawEmbed.fields
      .filter((field) => field && typeof field.name === "string" && typeof field.value === "string")
      .slice(0, 25)
      .map((field) => ({
        name: resolveVariables(field.name, message).trim() || "-",
        value: resolveVariables(field.value, message).trim() || "-",
        inline: Boolean(field.inline),
      }));
    if (fields.length > 0) {
      embed.addFields(fields);
      hasData = true;
    }
  }

  if (rawEmbed.timestamp) {
    embed.setTimestamp(new Date());
    hasData = true;
  }

  return hasData ? embed : null;
}

function resolveVariables(text: string, message: Message): string {
  const channelName = (message.channel as any)?.name || "channel";

  return text
    .replace(/\{user\.mention\}/gi, message.author.toString())
    .replace(/\{user\.name\}|\{username\}/gi, message.author.username)
    .replace(/\{user\}/gi, message.author.username)
    .replace(/\{user\.id\}/gi, message.author.id)
    .replace(/\{server\.name\}|\{server\}/gi, message.guild?.name || "")
    .replace(/\{server\.id\}/gi, message.guild?.id || "")
    .replace(/\{server\.membercount\}|\{membercount\}/gi, String(message.guild?.memberCount || 0))
    .replace(/\{channel\.mention\}/gi, message.channel.toString())
    .replace(/\{channel\.name\}|\{channel\}/gi, channelName)
    .replace(/\{channel\.id\}/gi, message.channel.id)
    .replace(/\{random:([^}]+)\}/gi, (_match, options) => {
      const items = String(options)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      if (items.length === 0) return "";
      return items[Math.floor(Math.random() * items.length)] || "";
    });
}

function resolveInteractionVariables(
  text: string,
  interaction: ButtonInteraction | StringSelectMenuInteraction,
  argsText: string
): string {
  const channelName = (interaction.channel as any)?.name || "channel";
  const args = argsText.split(/\s+/).filter(Boolean);

  return text
    .replace(/\{user\.mention\}/gi, interaction.user.toString())
    .replace(/\{user\.name\}|\{username\}/gi, interaction.user.username)
    .replace(/\{user\}/gi, interaction.user.username)
    .replace(/\{user\.id\}/gi, interaction.user.id)
    .replace(/\{server\.name\}|\{server\}/gi, interaction.guild?.name || "")
    .replace(/\{server\.id\}/gi, interaction.guild?.id || "")
    .replace(/\{server\.membercount\}|\{membercount\}/gi, String(interaction.guild?.memberCount || 0))
    .replace(/\{channel\.mention\}/gi, interaction.channel ? `<#${interaction.channelId}>` : "")
    .replace(/\{channel\.name\}|\{channel\}/gi, channelName)
    .replace(/\{channel\.id\}/gi, interaction.channelId)
    .replace(/\{args\}/gi, argsText)
    .replace(/\{args\.(\d+)\}/gi, (_match, index) => args[Number(index)] || "")
    .replace(/\{random:([^}]+)\}/gi, (_match, options) => {
      const items = String(options)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      if (items.length === 0) return "";
      return items[Math.floor(Math.random() * items.length)] || "";
    });
}


