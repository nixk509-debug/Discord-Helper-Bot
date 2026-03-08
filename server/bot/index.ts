import {
  Client,
  GatewayIntentBits,
  Events,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ChannelType,
  PermissionsBitField,
  type Interaction,
  type Message,
  type ChatInputCommandInteraction,
  type ButtonInteraction,
  type StringSelectMenuInteraction,
  type ModalSubmitInteraction,
  type Guild,
  type GuildMember,
  type PartialGuildMember,
} from "discord.js";
import { db } from "../db";
import { servers, serverSettings, customCommands, ticketConfig, ticketPanels } from "@shared/schema";
import { eq } from "drizzle-orm";
import { economyCommands, handleEconomyCommand } from "./commands/economy";
import { funCommand, handleFunCommand } from "./commands/fun";
import { setCommand, handleSetCommand } from "./commands/set";
import { lockCommand, handleLockCommand } from "./commands/lock";
import { codeCommand, handleCodeCommand } from "./commands/code";
import { auditCommand, handleAuditCommand } from "./commands/audit";
import { syncCommand, handleSyncCommand } from "./commands/sync";
import { decodeEmbedActionToken } from "./embed-action-token";
import {
  createStudioPublicationRecord,
  getCurrentStudioPublicationSnapshot,
  getStudioDocumentById,
  getStudioPublicationById,
  getStudioPublicationSnapshotById,
  recordStudioRuntimeEvent,
  renderStudioDocumentView,
  updateStudioPublicationRecord,
  createStudioPublicationSnapshotRecord,
} from "../studio-service";
import { buildStudioDiscordPayload } from "../studio-discord";
import {
  decodeStudioToken,
  encodeStudioModalToken,
  STUDIO_ACTION_TOKEN_PREFIX,
} from "./studio-action-token";

let botClient: Client | null = null;
let botStartTime: Date | null = null;
let botHeartbeatTimer: NodeJS.Timeout | null = null;
let botLastHeartbeatAt: Date | null = null;

type StudioAutomationMember = GuildMember | PartialGuildMember;
const TICKET_TOPIC_PREFIX = "archivist-ticket";

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

  client.on(Events.GuildMemberAdd, async (member) => {
    await handleGuildMemberAdd(member).catch((err) => {
      console.error("[Bot] GuildMemberAdd handler failed:", err);
    });
  });

  client.on(Events.GuildMemberRemove, async (member) => {
    await handleGuildMemberRemove(member).catch((err) => {
      console.error("[Bot] GuildMemberRemove handler failed:", err);
    });
  });

  client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    if (interaction.isModalSubmit()) {
      await handleStudioModalSubmit(interaction);
      return;
    }
    if (interaction.isButton() || interaction.isStringSelectMenu()) {
      const handledStudio = await handleStudioInteraction(interaction);
      if (handledStudio) return;
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

async function getServerContextForGuild(guildId: string) {
  const [server] = await db.select().from(servers).where(eq(servers.discordId, guildId));
  if (!server) return { server: null, settings: null };
  const [settings] = await db.select().from(serverSettings).where(eq(serverSettings.serverId, server.id));
  return { server, settings: settings || null };
}

async function syncServerSnapshotForGuild(guild: Guild) {
  await db.update(servers).set({
    name: guild.name,
    iconUrl: guild.iconURL(),
    memberCount: guild.memberCount,
  }).where(eq(servers.discordId, guild.id));
}

function buildStudioVariableMap(input: {
  member: StudioAutomationMember;
  guild: Guild;
  channelName?: string | null;
  channelId?: string | null;
}) {
  const user = input.member.user;
  const displayName = "displayName" in input.member && input.member.displayName
    ? input.member.displayName
    : user?.username || "Member";
  const avatarUrl = user?.displayAvatarURL?.() || user?.avatarURL?.() || "";
  const now = new Date();
  const channelName = input.channelName || "";
  const channelId = input.channelId || "";

  return {
    "{user}": user?.username || displayName,
    "{user.name}": displayName,
    "{user.id}": user?.id || "",
    "{user.mention}": user?.id ? `<@${user.id}>` : displayName,
    "{user.avatar}": avatarUrl,
    "{server}": input.guild.name,
    "{server.name}": input.guild.name,
    "{server.id}": input.guild.id,
    "{server.membercount}": String(input.guild.memberCount),
    "{channel}": channelName,
    "{channel.mention}": channelId ? `<#${channelId}>` : channelName,
    "{date}": now.toLocaleDateString(),
    "{time}": now.toLocaleTimeString(),
  };
}

function interpolateStudioVariables<T>(value: T, variables: Record<string, string>): T {
  if (typeof value === "string") {
    let output = value;
    for (const [token, replacement] of Object.entries(variables)) {
      output = output.split(token).join(replacement);
    }
    return output as T;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => interpolateStudioVariables(entry, variables)) as T;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        interpolateStudioVariables(entry, variables),
      ]),
    ) as T;
  }
  return value;
}

async function sendStudioAutomationSurface(input: {
  serverId: number;
  documentId: number;
  guild: Guild;
  member: StudioAutomationMember;
  eventType: string;
  defaultViewId?: string | null;
  channelId?: string | null;
  dm?: boolean;
}) {
  const documentRecord = await getStudioDocumentById(input.documentId);
  if (!documentRecord || documentRecord.serverId !== input.serverId) return;

  const channel = input.dm
    ? await input.member.user.createDM().catch(() => null)
    : input.channelId
      ? await input.guild.channels.fetch(input.channelId).catch(() => null)
      : null;

  if (!channel) {
    await recordStudioRuntimeEvent({
      serverId: input.serverId,
      documentId: documentRecord.id,
      severity: "warning",
      eventType: `${input.eventType}_skipped`,
      summary: "Studio automation target channel could not be resolved.",
      details: { channelId: input.channelId || null, dm: Boolean(input.dm) },
    });
    return;
  }

  const guildChannel: any = input.dm ? null : channel;
  if (!input.dm && (!guildChannel?.isTextBased?.() || guildChannel?.isThread?.())) {
    await recordStudioRuntimeEvent({
      serverId: input.serverId,
      documentId: documentRecord.id,
      severity: "warning",
      eventType: `${input.eventType}_skipped`,
      summary: "Studio automation target is not a text channel.",
      details: { channelId: input.channelId },
    });
    return;
  }

  const variables = buildStudioVariableMap({
    member: input.member,
    guild: input.guild,
    channelName: "name" in channel ? channel.name : "Direct Message",
    channelId: channel.id,
  });
  const personalizedDocument = interpolateStudioVariables(documentRecord.document, variables);
  const rendered = renderStudioDocumentView(
    personalizedDocument,
    input.defaultViewId || personalizedDocument.meta.entryViewId,
  );

  if (!rendered.content && rendered.embeds.length === 0 && rendered.interactiveComponents.length === 0) {
    return;
  }

  if (rendered.interactiveComponents.length === 0) {
    await (channel as any).send({
      content: rendered.content || undefined,
      embeds: buildResponseEmbeds(rendered.embeds),
    });
    await recordStudioRuntimeEvent({
      serverId: input.serverId,
      documentId: documentRecord.id,
      severity: rendered.diagnostics.some((diag) => diag.level === "warning") ? "warning" : "info",
      eventType: input.eventType,
      summary: `Delivered ${documentRecord.name} via Studio automation.`,
      details: { channelId: channel.id, dm: Boolean(input.dm), diagnostics: rendered.diagnostics },
    });
    return;
  }

  const publication = await createStudioPublicationRecord({
    serverId: input.serverId,
    documentId: documentRecord.id,
    channelId: channel.id,
    messageId: "pending",
    currentViewId: rendered.viewId,
  });

  const snapshotPayload = {
    documentId: documentRecord.id,
    documentName: documentRecord.name,
    documentVersion: personalizedDocument.version,
    publishedViewId: rendered.viewId,
    channelId: channel.id,
    guildId: input.guild.id,
    render: {
      content: rendered.content,
      embeds: rendered.embeds,
      components: rendered.interactiveComponents,
    },
    diagnostics: rendered.diagnostics,
    document: personalizedDocument,
  };

  const snapshotRecord = await createStudioPublicationSnapshotRecord({
    publicationId: publication.id,
    snapshot: snapshotPayload,
  });
  const payload = buildStudioDiscordPayload(snapshotPayload, publication.id);

  try {
    const message = await (channel as any).send({
      content: payload.content,
      embeds: payload.embeds,
      components: payload.components,
    });

    await updateStudioPublicationRecord(publication.id, {
      messageId: message.id,
      currentSnapshotId: snapshotRecord.id,
      currentViewId: rendered.viewId,
      active: true,
      status: payload.diagnostics.some((diag) => diag.level === "error") ? "degraded" : "published",
      lastPublishedAt: new Date(),
      lastFailureAt: null,
      lastFailureSummary: null,
    } as any);

    await recordStudioRuntimeEvent({
      serverId: input.serverId,
      publicationId: publication.id,
      documentId: documentRecord.id,
      severity: payload.diagnostics.some((diag) => diag.level === "warning") ? "warning" : "info",
      eventType: input.eventType,
      summary: `Delivered ${documentRecord.name} via Studio automation.`,
      details: { channelId: channel.id, messageId: message.id, dm: Boolean(input.dm), diagnostics: payload.diagnostics },
    });
  } catch (err: any) {
    await updateStudioPublicationRecord(publication.id, {
      currentSnapshotId: snapshotRecord.id,
      status: "failed",
      active: false,
      lastFailureAt: new Date(),
      lastFailureSummary: err?.message || "Studio automation delivery failed",
    } as any);

    await recordStudioRuntimeEvent({
      serverId: input.serverId,
      publicationId: publication.id,
      documentId: documentRecord.id,
      severity: "error",
      eventType: `${input.eventType}_failed`,
      summary: err?.message || "Studio automation delivery failed",
      details: { channelId: channel.id, dm: Boolean(input.dm), diagnostics: payload.diagnostics },
    });
  }
}

async function handleGuildMemberAdd(member: GuildMember) {
  await ensureGuildRegistered(member.guild);
  await syncServerSnapshotForGuild(member.guild);

  const { server, settings } = await getServerContextForGuild(member.guild.id);
  if (!server || !settings) return;

  if (settings.welcomeEnabled && settings.welcomeStudioDocumentId && settings.welcomeChannelId) {
    await sendStudioAutomationSurface({
      serverId: server.id,
      documentId: settings.welcomeStudioDocumentId,
      guild: member.guild,
      member,
      eventType: "welcome_surface_sent",
      defaultViewId: "entry",
      channelId: settings.welcomeChannelId,
    });
  } else if (settings.welcomeEnabled && settings.welcomeChannelId && settings.welcomeMessage) {
    const channel = await member.guild.channels.fetch(settings.welcomeChannelId).catch(() => null);
    if (channel && channel.isTextBased() && !channel.isThread()) {
      const content = interpolateStudioVariables(settings.welcomeMessage, buildStudioVariableMap({
        member,
        guild: member.guild,
        channelName: "name" in channel ? channel.name : "",
        channelId: channel.id,
      }));
      await (channel as any).send({ content }).catch(() => {});
    }
  }

  if (settings.welcomeDmEnabled && settings.welcomeDmStudioDocumentId) {
    await sendStudioAutomationSurface({
      serverId: server.id,
      documentId: settings.welcomeDmStudioDocumentId,
      guild: member.guild,
      member,
      eventType: "welcome_dm_surface_sent",
      defaultViewId: "entry",
      dm: true,
    });
  } else if (settings.welcomeDmEnabled && settings.welcomeDmMessage) {
    const content = interpolateStudioVariables(settings.welcomeDmMessage, buildStudioVariableMap({
      member,
      guild: member.guild,
      channelName: "Direct Message",
      channelId: null,
    }));
    await member.user.send({ content }).catch(() => {});
  }
}

async function handleGuildMemberRemove(member: GuildMember | PartialGuildMember) {
  await syncServerSnapshotForGuild(member.guild);

  const { server, settings } = await getServerContextForGuild(member.guild.id);
  if (!server || !settings) return;

  if (settings.leaveEnabled && settings.leaveStudioDocumentId && settings.leaveChannelId) {
    await sendStudioAutomationSurface({
      serverId: server.id,
      documentId: settings.leaveStudioDocumentId,
      guild: member.guild,
      member,
      eventType: "leave_surface_sent",
      defaultViewId: "entry",
      channelId: settings.leaveChannelId,
    });
    return;
  }

  if (settings.leaveEnabled && settings.leaveChannelId && settings.leaveMessage) {
    const channel = await member.guild.channels.fetch(settings.leaveChannelId).catch(() => null);
    if (channel && channel.isTextBased() && !channel.isThread()) {
      const content = interpolateStudioVariables(settings.leaveMessage, buildStudioVariableMap({
        member,
        guild: member.guild,
        channelName: "name" in channel ? channel.name : "",
        channelId: channel.id,
      }));
      await (channel as any).send({ content }).catch(() => {});
    }
  }
}

function sanitizeTicketSegment(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 20);
  return normalized || "ticket";
}

function formatTicketChannelName(input: {
  namingScheme?: string | null;
  ticketNumber: number;
  username: string;
  subject?: string;
}) {
  const subject = sanitizeTicketSegment(input.subject || "");
  const username = sanitizeTicketSegment(input.username || "member");
  const scheme = String(input.namingScheme || "ticket-{number}");
  const rendered = scheme
    .replace(/\{number\}/gi, String(input.ticketNumber))
    .replace(/\{user\}/gi, username)
    .replace(/\{subject\}/gi, subject);
  return sanitizeTicketSegment(rendered).slice(0, 90) || `ticket-${input.ticketNumber}`;
}

function buildTicketTopicMeta(input: {
  serverId: number;
  userId: string;
  panelId?: number | null;
  publicationId: number;
  departmentId?: string | null;
}) {
  return [
    TICKET_TOPIC_PREFIX,
    `server:${input.serverId}`,
    `user:${input.userId}`,
    `panel:${input.panelId || 0}`,
    `publication:${input.publicationId}`,
    `department:${input.departmentId || "default"}`,
    `opened:${Date.now()}`,
  ].join("|");
}

function countOpenTicketsForUser(guild: Guild, serverId: number, userId: string) {
  return Array.from(guild.channels.cache.values()).filter((channel: any) => {
    const topic = String(channel?.topic || "");
    return Boolean(
      topic.includes(TICKET_TOPIC_PREFIX) &&
      topic.includes(`server:${serverId}`) &&
      topic.includes(`user:${userId}`),
    );
  }).length;
}

function countAllTicketChannels(guild: Guild, serverId: number) {
  return Array.from(guild.channels.cache.values()).filter((channel: any) => {
    const topic = String(channel?.topic || "");
    return Boolean(topic.includes(TICKET_TOPIC_PREFIX) && topic.includes(`server:${serverId}`));
  }).length;
}

function buildTicketSubmissionEmbed(submission?: Record<string, string>) {
  const entries = Object.entries(submission || {}).filter(([, value]) => String(value || "").trim().length > 0);
  if (entries.length === 0) return null;
  return new EmbedBuilder()
    .setTitle("Ticket Intake")
    .setColor(0x5865F2)
    .addFields(
      entries.slice(0, 25).map(([key, value]) => ({
        name: key.slice(0, 256),
        value: String(value).slice(0, 1024) || "-",
        inline: false,
      })),
    );
}

async function resolveTicketPanelContext(serverId: number, publication: any, action: any) {
  if (action.ticketPanelId) {
    const [panelById] = await db.select().from(ticketPanels).where(eq(ticketPanels.id, Number(action.ticketPanelId)));
    if (panelById && panelById.serverId === serverId) return panelById;
  }

  const [panelByDocument] = await db.select().from(ticketPanels).where(eq(ticketPanels.studioDocumentId, publication.documentId));
  if (panelByDocument && panelByDocument.serverId === serverId) return panelByDocument;

  const [panelByPublication] = await db.select().from(ticketPanels).where(eq(ticketPanels.publicationId, publication.id));
  if (panelByPublication && panelByPublication.serverId === serverId) return panelByPublication;

  return null;
}

async function executeTicketCreateAction(input: {
  interaction: ButtonInteraction | StringSelectMenuInteraction | ModalSubmitInteraction;
  publication: any;
  action: any;
  submission?: Record<string, string>;
  guild: Guild | null;
}) {
  const { interaction, publication, action, submission } = input;
  const guild = input.guild;
  if (!guild) {
    await replyStudioInteraction(interaction, "Ticket creation requires a server context.", "ephemeral");
    return;
  }

  const [config] = await db.select().from(ticketConfig).where(eq(ticketConfig.serverId, publication.serverId));
  if (!config?.enabled) {
    await replyStudioInteraction(interaction, "Ticket system is disabled for this server.", "ephemeral");
    return;
  }

  await guild.channels.fetch().catch(() => null);
  const panel = await resolveTicketPanelContext(publication.serverId, publication, action);
  const department = Array.isArray(config.departments)
    ? config.departments.find((entry: any) => entry?.id === action.ticketDepartmentId)
    : null;

  const me = guild.members.me ?? await guild.members.fetchMe().catch(() => null);
  if (!me?.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
    await replyStudioInteraction(interaction, "I need Manage Channels permission to create tickets.", "ephemeral");
    return;
  }

  const openTicketsForUser = countOpenTicketsForUser(guild, publication.serverId, interaction.user.id);
  if (openTicketsForUser >= Number(config.maxTicketsPerUser || 1)) {
    await replyStudioInteraction(
      interaction,
      `You already have ${openTicketsForUser} open ticket${openTicketsForUser === 1 ? "" : "s"}.`,
      "ephemeral",
    );
    return;
  }

  let parentCategoryId = config.categoryChannelId || null;
  let departmentNotifyChannelId: string | null = null;
  if (department?.channelId) {
    const departmentChannel = await guild.channels.fetch(department.channelId).catch(() => null);
    if (departmentChannel?.type === ChannelType.GuildCategory) {
      parentCategoryId = departmentChannel.id;
    } else if (departmentChannel?.isTextBased?.() && !departmentChannel?.isThread?.()) {
      departmentNotifyChannelId = departmentChannel.id;
    }
  }

  const supportRoleId = department?.supportRoleId || config.supportRoleId || null;
  const subjectSource = Object.values(submission || {}).find((value) => String(value || "").trim().length > 0);
  const ticketNumber = countAllTicketChannels(guild, publication.serverId) + 1;
  const channelName = formatTicketChannelName({
    namingScheme: config.namingScheme,
    ticketNumber,
    username: interaction.user.username,
    subject: typeof subjectSource === "string" ? subjectSource : "",
  });

  const permissionOverwrites: any[] = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionsBitField.Flags.ViewChannel],
    },
    {
      id: interaction.user.id,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory,
        PermissionsBitField.Flags.AttachFiles,
        PermissionsBitField.Flags.EmbedLinks,
      ],
    },
    {
      id: me.id,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory,
        PermissionsBitField.Flags.ManageChannels,
        PermissionsBitField.Flags.ManageMessages,
        PermissionsBitField.Flags.AttachFiles,
        PermissionsBitField.Flags.EmbedLinks,
      ],
    },
  ];

  if (supportRoleId) {
    permissionOverwrites.push({
      id: supportRoleId,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory,
        PermissionsBitField.Flags.AttachFiles,
        PermissionsBitField.Flags.EmbedLinks,
      ],
    });
  }

  const ticketChannel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: parentCategoryId || undefined,
    topic: buildTicketTopicMeta({
      serverId: publication.serverId,
      userId: interaction.user.id,
      panelId: panel?.id,
      publicationId: publication.id,
      departmentId: department?.id,
    }),
    permissionOverwrites,
    reason: `Ticket created by ${interaction.user.tag}`,
  });

  const responsePayload = await buildStudioResponsePayload(action, submission);
  const intakeEmbed = buildTicketSubmissionEmbed(submission);
  const supportMention = supportRoleId ? `<@&${supportRoleId}>` : "";
  const openerMention = `<@${interaction.user.id}>`;

  await (ticketChannel as any).send({
    content: [supportMention, openerMention, responsePayload.content || `Ticket opened by ${openerMention}.`].filter(Boolean).join(" ").trim(),
    embeds: [
      ...buildResponseEmbeds(responsePayload.embeds || []),
      ...(intakeEmbed ? [intakeEmbed] : []),
    ],
  }).catch(() => {});

  const logEmbed = new EmbedBuilder()
    .setTitle("Ticket Created")
    .setColor(0x57F287)
    .setDescription(`${openerMention} opened ${ticketChannel.toString()}.`)
    .addFields(
      { name: "Panel", value: panel?.title || "Studio", inline: true },
      { name: "Department", value: department?.name || "Default", inline: true },
      { name: "Channel", value: ticketChannel.toString(), inline: true },
    )
    .setTimestamp(new Date());

  if (intakeEmbed) {
    const fields = intakeEmbed.data.fields || [];
    if (fields.length > 0) {
      logEmbed.addFields(fields.slice(0, 10).map((field: any) => ({
        name: String(field.name || "-").slice(0, 256),
        value: String(field.value || "-").slice(0, 1024),
        inline: false,
      })));
    }
  }

  const notifyChannelIds = [departmentNotifyChannelId, config.transcriptChannelId].filter(Boolean) as string[];
  for (const notifyChannelId of Array.from(new Set(notifyChannelIds))) {
    const notifyChannel = await guild.channels.fetch(notifyChannelId).catch(() => null);
    if (notifyChannel?.isTextBased?.() && !notifyChannel?.isThread?.()) {
      await (notifyChannel as any).send({ embeds: [logEmbed] }).catch(() => {});
    }
  }

  await replyStudioInteraction(interaction, `Ticket created: ${ticketChannel.toString()}`, action.replyMode || "ephemeral");
  await recordStudioRuntimeEvent({
    serverId: publication.serverId,
    publicationId: publication.id,
    documentId: publication.documentId,
    severity: "info",
    eventType: "ticket_created",
    summary: `Created ticket channel ${ticketChannel.id} for ${interaction.user.tag}.`,
    details: {
      ticketChannelId: ticketChannel.id,
      panelId: panel?.id,
      departmentId: department?.id || null,
      openerId: interaction.user.id,
    },
    actionId: action.id,
  });
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

async function handleStudioInteraction(interaction: ButtonInteraction | StringSelectMenuInteraction) {
  const tokenSource = interaction.isButton() ? interaction.customId : interaction.values[0];
  if (!tokenSource || !tokenSource.startsWith(STUDIO_ACTION_TOKEN_PREFIX)) return false;

  const decoded = decodeStudioToken(tokenSource);
  if (!decoded) {
    await replyStudioInteraction(interaction, "This Studio action is no longer valid.", "ephemeral");
    return true;
  }

  const publication = await getStudioPublicationById(decoded.publicationId);
  if (!publication) {
    await replyStudioInteraction(interaction, "This Studio publication no longer exists.", "ephemeral");
    return true;
  }

  const snapshotRecord = publication.currentSnapshotId
    ? await getStudioPublicationSnapshotById(publication.currentSnapshotId)
    : await getCurrentStudioPublicationSnapshot(publication.id);
  const snapshot = snapshotRecord?.snapshot as any;

  if (!snapshot?.document) {
    await replyStudioInteraction(interaction, "Studio snapshot is unavailable.", "ephemeral");
    return true;
  }

  if (interaction.guildId && interaction.guildId !== snapshot.guildId) {
    await replyStudioInteraction(interaction, "This action does not belong to this server.", "ephemeral");
    return true;
  }

  const document = snapshot.document as any;
  const node = decoded.nodeId ? document.nodes?.[decoded.nodeId] : null;
  let action =
    (decoded.actionId && document.actions?.[decoded.actionId]) ||
    (node?.actionId && document.actions?.[node.actionId]) ||
    null;

  if (!action && node?.optionActionIds && decoded.optionValue) {
    const optionActionId = node.optionActionIds[decoded.optionValue];
    if (optionActionId) action = document.actions?.[optionActionId];
  }

  if (!action && node?.props?.options && decoded.optionValue) {
    const selectedOption = node.props.options.find((option: any) => String(option?.value) === decoded.optionValue);
    const optionActionId = node.optionActionIds?.[decoded.optionValue];
    if (selectedOption && optionActionId) {
      action = document.actions?.[optionActionId];
    }
  }

  if (!action) {
    await replyStudioInteraction(interaction, "This action is no longer configured.", "ephemeral");
    return true;
  }

  const gateFailure = await getStudioGateFailure(interaction, action, snapshot.guildId);
  if (gateFailure) {
    await replyStudioInteraction(interaction, gateFailure, "ephemeral");
    return true;
  }

  try {
    await executeStudioAction({
      interaction,
      publication,
      snapshot,
      node,
      action,
    });
    await updateStudioPublicationRecord(publication.id, { lastInteractionAt: new Date() } as any);
    await recordStudioRuntimeEvent({
      serverId: publication.serverId,
      publicationId: publication.id,
      documentId: publication.documentId,
      severity: "info",
      eventType: "interaction",
      summary: `Executed ${action.type} from Studio publication ${publication.id}.`,
      details: { nodeId: node?.id, actionId: action.id || decoded.actionId || null },
      nodeId: node?.id,
      actionId: action.id || decoded.actionId || undefined,
    });
  } catch (err: any) {
    console.error("[Bot] Studio interaction failed:", err?.message || err);
    await updateStudioPublicationRecord(publication.id, {
      lastFailureAt: new Date(),
      lastFailureSummary: err?.message || "Studio interaction failed",
    } as any);
    await recordStudioRuntimeEvent({
      serverId: publication.serverId,
      publicationId: publication.id,
      documentId: publication.documentId,
      severity: "error",
      eventType: "interaction_failed",
      summary: err?.message || "Studio interaction failed",
      details: { nodeId: node?.id, actionType: action.type },
      nodeId: node?.id,
      actionId: action.id || decoded.actionId || undefined,
    });
    await replyStudioInteraction(interaction, "Action failed to execute.", "ephemeral");
  }

  return true;
}

async function handleStudioModalSubmit(interaction: ModalSubmitInteraction) {
  if (!interaction.customId.startsWith(STUDIO_ACTION_TOKEN_PREFIX)) return;

  const decoded = decodeStudioToken(interaction.customId);
  if (!decoded?.publicationId || !decoded.modalId) {
    await interaction.reply({ content: "This Studio modal is no longer valid.", ephemeral: true }).catch(() => {});
    return;
  }

  const publication = await getStudioPublicationById(decoded.publicationId);
  if (!publication) {
    await interaction.reply({ content: "This Studio publication no longer exists.", ephemeral: true }).catch(() => {});
    return;
  }

  const snapshotRecord = publication.currentSnapshotId
    ? await getStudioPublicationSnapshotById(publication.currentSnapshotId)
    : await getCurrentStudioPublicationSnapshot(publication.id);
  const snapshot = snapshotRecord?.snapshot as any;
  const modal = snapshot?.document?.modals?.[decoded.modalId];
  if (!snapshot?.document || !modal) {
    await interaction.reply({ content: "Modal configuration could not be loaded.", ephemeral: true }).catch(() => {});
    return;
  }

  const submission = Object.fromEntries(
    (modal.fields || []).map((field: any) => [field.id, interaction.fields.getTextInputValue(field.id) || ""]),
  );

  let modalFailure: Error | null = null;
  for (const actionId of modal.submitActionIds || []) {
    const action = snapshot.document.actions?.[actionId];
    if (!action) continue;
    const gateFailure = await getStudioGateFailure(interaction, action, snapshot.guildId);
    if (gateFailure) {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.reply({ content: gateFailure, ephemeral: true }).catch(() => {});
      }
      return;
    }
    try {
      await executeStudioAction({
        interaction,
        publication,
        snapshot,
        node: null,
        action,
        submission,
      });
    } catch (err: any) {
      console.error("[Bot] Studio modal action failed:", err?.message || err);
      modalFailure = err instanceof Error ? err : new Error(err?.message || "Studio modal action failed");
    }
  }

  if (modalFailure) {
    await updateStudioPublicationRecord(publication.id, {
      lastFailureAt: new Date(),
      lastFailureSummary: modalFailure.message,
    } as any);
    await recordStudioRuntimeEvent({
      serverId: publication.serverId,
      publicationId: publication.id,
      documentId: publication.documentId,
      severity: "error",
      eventType: "modal_submit_failed",
      summary: modalFailure.message,
      details: { modalId: modal.id, fields: submission },
      actionId: decoded.actionId,
    });
    if (!interaction.deferred && !interaction.replied) {
      await interaction.reply({ content: modalFailure.message || "The modal action failed.", ephemeral: true }).catch(() => {});
    }
    return;
  }

  if (!interaction.deferred && !interaction.replied) {
    await interaction.reply({ content: "Submission received.", ephemeral: true }).catch(() => {});
  }

  await updateStudioPublicationRecord(publication.id, { lastInteractionAt: new Date() } as any);
  await recordStudioRuntimeEvent({
    serverId: publication.serverId,
    publicationId: publication.id,
    documentId: publication.documentId,
    severity: "info",
    eventType: "modal_submit",
    summary: `Modal ${modal.title} submitted.`,
    details: { modalId: modal.id, fields: submission },
    actionId: decoded.actionId,
  });
}

async function resolveStudioGuildForInteraction(
  interaction: ButtonInteraction | StringSelectMenuInteraction | ModalSubmitInteraction,
  guildId?: string,
) {
  if (interaction.guild) return interaction.guild;
  if (!guildId || !botClient?.isReady()) return null;
  return botClient.guilds.cache.get(guildId) ?? await botClient.guilds.fetch(guildId).catch(() => null);
}

async function getStudioGateFailure(
  interaction: ButtonInteraction | StringSelectMenuInteraction | ModalSubmitInteraction,
  action: any,
  guildId?: string,
) {
  if (action.disabled || action.hiddenByGate) return "This action is currently disabled.";
  const guildMember: any = interaction.member as any;
  let roleIds: string[] = guildMember?.roles?.cache?.map((role: any) => role.id) || [];

  if (roleIds.length === 0 && guildId) {
    const guild = await resolveStudioGuildForInteraction(interaction, guildId);
    const member = guild ? await guild.members.fetch(interaction.user.id).catch(() => null) : null;
    roleIds = member?.roles?.cache?.map((role: any) => role.id) || [];
  }

  const allowedRoleIds = normalizeIdList(action.allowedRoleIds);
  if (allowedRoleIds.length > 0 && !allowedRoleIds.some((roleId) => roleIds.includes(roleId))) {
    return "You do not have permission to use this action.";
  }

  const blockedRoleIds = normalizeIdList(action.blockedRoleIds);
  if (blockedRoleIds.some((roleId) => roleIds.includes(roleId))) {
    return "You do not have permission to use this action.";
  }

  return null;
}

function interpolateStudioText(text: string | undefined, submission?: Record<string, string>) {
  let value = String(text || "");
  for (const [key, entry] of Object.entries(submission || {})) {
    value = value.replace(new RegExp(`\\{${key}\\}`, "g"), entry);
    value = value.replace(new RegExp(`\\{modal\\.${key}\\}`, "g"), entry);
  }
  return value;
}

async function buildStudioResponsePayload(action: any, submission?: Record<string, string>) {
  const mode = action.response?.mode || "inline";
  let source: any = action.response?.inline || {};

  if (mode === "template" && action.response?.templateDocumentId) {
    const templateDocument = await getStudioDocumentById(action.response.templateDocumentId);
    if (!templateDocument) {
      return { content: "Referenced template no longer exists.", embeds: [] };
    }
    const rendered = renderStudioDocumentView(
      templateDocument.document as any,
      action.response?.templateViewId,
    );
    source = {
      content: rendered.content,
      embeds: rendered.embeds,
    };
  }

  return {
    content: interpolateStudioText(source?.content, submission) || undefined,
    embeds: (Array.isArray(source?.embeds) ? source.embeds : []).map((embed: any) => {
      const next = { ...embed };
      if (next.title) next.title = interpolateStudioText(next.title, submission);
      if (next.description) next.description = interpolateStudioText(next.description, submission);
      if (Array.isArray(next.fields)) {
        next.fields = next.fields.map((field: any) => ({
          ...field,
          name: interpolateStudioText(field.name, submission),
          value: interpolateStudioText(field.value, submission),
        }));
      }
      return next;
    }),
  };
}

async function executeStudioAction(input: {
  interaction: ButtonInteraction | StringSelectMenuInteraction | ModalSubmitInteraction;
  publication: any;
  snapshot: any;
  node: any;
  action: any;
  submission?: Record<string, string>;
}) {
  const { interaction, publication, snapshot, action, submission } = input;
  const studioGuild = await resolveStudioGuildForInteraction(interaction, snapshot.guildId);

  if (action.type === "role_add" || action.type === "role_remove" || action.type === "role_toggle") {
    await executeRoleAction(interaction as any, action, action.replyMode || "ephemeral", studioGuild);
    return;
  }

  if (action.type === "ticket_create") {
    await executeTicketCreateAction({
      interaction,
      publication,
      action,
      submission,
      guild: studioGuild,
    });
    return;
  }

  if (action.type === "run_command") {
    await executeCommandAction(interaction as any, publication.serverId, action, action.replyMode || "ephemeral");
    return;
  }

  if (action.type === "open_url" && action.url) {
    await replyStudioInteraction(interaction as any, `Open: ${action.url}`, action.replyMode || "ephemeral");
    return;
  }

  if (action.type === "open_modal") {
    const modal = snapshot.document?.modals?.[action.modalId || action.id];
    if (!modal) {
      await replyStudioInteraction(interaction as any, "Modal is misconfigured.", "ephemeral");
      return;
    }
    const builder = new ModalBuilder()
      .setCustomId(encodeStudioModalToken({
        publicationId: publication.id,
        modalId: modal.id,
        actionId: action.id,
      }))
      .setTitle(String(modal.title || "Modal").slice(0, 45));

    const rows = (modal.fields || []).slice(0, 5).map((field: any) =>
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId(String(field.id))
          .setLabel(String(field.label || "Field").slice(0, 45))
          .setStyle(field.style === "paragraph" ? TextInputStyle.Paragraph : TextInputStyle.Short)
          .setPlaceholder(field.placeholder ? String(field.placeholder).slice(0, 100) : "")
          .setRequired(Boolean(field.required))
          .setMinLength(field.minLength ? Number(field.minLength) : undefined)
          .setMaxLength(field.maxLength ? Number(field.maxLength) : undefined),
      ),
    );
    builder.addComponents(...rows);
    await (interaction as ButtonInteraction | StringSelectMenuInteraction).showModal(builder);
    return;
  }

  if (action.type === "goto_view" || action.type === "back_view" || action.type === "cancel_view" || (action.type === "confirm" && action.targetViewId)) {
    const targetViewId = action.targetViewId || action.fallbackViewId || snapshot.document?.meta?.entryViewId;
    await switchStudioPublicationView(publication, snapshot, String(targetViewId), interaction as any);
    if (action.response) {
      const payload = await buildStudioResponsePayload(action, submission);
      if (payload.content || (payload.embeds && payload.embeds.length > 0)) {
        await sendStudioResponse(interaction as any, payload, action.replyMode || "ephemeral", "reply");
      }
    }
    return;
  }

  if (action.type === "follow_up_message") {
    const payload = await buildStudioResponsePayload(action, submission);
    await sendStudioResponse(interaction as any, payload, action.replyMode || "ephemeral", "followUp");
    return;
  }

  if (action.type === "reply_message" || action.type === "confirm") {
    const payload = await buildStudioResponsePayload(action, submission);
    await sendStudioResponse(interaction as any, payload, action.replyMode || "ephemeral", "reply");
    return;
  }

  if (action.type === "channel_message" || action.type === "log_action") {
    const payload = await buildStudioResponsePayload(action, submission);
    const channelId = String(action.channelId || "").trim();
    if (!channelId || !studioGuild) {
      await replyStudioInteraction(interaction as any, "Destination channel is not configured.", "ephemeral");
      return;
    }
    const channel = await studioGuild.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased() || channel.isThread()) {
      await replyStudioInteraction(interaction as any, "Destination channel is invalid.", "ephemeral");
      return;
    }
    await (channel as any).send({
      content: payload.content,
      embeds: buildResponseEmbeds(payload.embeds),
    });
    await replyStudioInteraction(interaction as any, "Sent.", action.replyMode || "ephemeral");
    return;
  }

  if (action.type === "dm_user") {
    const payload = await buildStudioResponsePayload(action, submission);
    await interaction.user.send({
      content: payload.content,
      embeds: buildResponseEmbeds(payload.embeds),
    }).catch(() => {});
    await replyStudioInteraction(interaction as any, "Sent via DM.", action.replyMode || "ephemeral");
    return;
  }

  await replyStudioInteraction(interaction as any, "This Studio action is not supported yet.", "ephemeral");
}

async function switchStudioPublicationView(
  publication: any,
  snapshot: any,
  targetViewId: string,
  interaction: ButtonInteraction | StringSelectMenuInteraction,
) {
  const rendered = renderStudioDocumentView(snapshot.document, targetViewId);
  const nextSnapshot = {
    ...snapshot,
    publishedViewId: rendered.viewId,
    render: {
      content: rendered.content,
      embeds: rendered.embeds,
      components: rendered.interactiveComponents,
    },
    diagnostics: rendered.diagnostics,
  };
  const snapshotRecord = await createStudioPublicationSnapshotRecord({
    publicationId: publication.id,
    snapshot: nextSnapshot,
  });
  const payload = buildStudioDiscordPayload(nextSnapshot, publication.id);
  const message = interaction.message;
  await message.edit({
    content: payload.content,
    embeds: payload.embeds,
    components: payload.components,
  });
  await updateStudioPublicationRecord(publication.id, {
    currentSnapshotId: snapshotRecord.id,
    currentViewId: rendered.viewId,
    lastInteractionAt: new Date(),
  } as any);
}

function buildResponseEmbeds(embeds: any[]) {
  return (embeds || []).flatMap((embed) => {
    const builder = new EmbedBuilder();
    let hasData = false;
    if (embed.title) {
      builder.setTitle(String(embed.title));
      hasData = true;
    }
    if (embed.description) {
      builder.setDescription(String(embed.description));
      hasData = true;
    }
    const color = parseEmbedColor(embed.color);
    if (color !== null) {
      builder.setColor(color);
      hasData = true;
    }
    if (Array.isArray(embed.fields) && embed.fields.length > 0) {
      builder.addFields(embed.fields.slice(0, 25).map((field: any) => ({
        name: String(field.name || "-"),
        value: String(field.value || "-"),
        inline: Boolean(field.inline),
      })));
      hasData = true;
    }
    return hasData ? [builder] : [];
  });
}

async function sendStudioResponse(
  interaction: ButtonInteraction | StringSelectMenuInteraction | ModalSubmitInteraction,
  payload: { content?: string; embeds?: any[] },
  replyMode: "ephemeral" | "channel",
  mode: "reply" | "followUp",
) {
  const response = {
    content: payload.content,
    embeds: buildResponseEmbeds(payload.embeds || []),
    ephemeral: replyMode !== "channel",
  };
  if (mode === "followUp" || interaction.deferred || interaction.replied) {
    await interaction.followUp(response).catch(() => {});
  } else {
    await interaction.reply(response).catch(() => {});
  }
}

async function replyStudioInteraction(
  interaction: ButtonInteraction | StringSelectMenuInteraction | ModalSubmitInteraction,
  content: string,
  replyMode: "ephemeral" | "channel",
) {
  await sendStudioResponse(interaction, { content }, replyMode, "reply");
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
  interaction: ButtonInteraction | StringSelectMenuInteraction | ModalSubmitInteraction,
  action: { type: "role_add" | "role_remove" | "role_toggle"; roleId?: string },
  replyMode: "ephemeral" | "channel",
  guildOverride?: Guild | null,
) {
  const roleId = normalizeId(action.roleId || "");
  if (!roleId) {
    await replyEmbedAction(interaction, "Role action is misconfigured.", "ephemeral");
    return;
  }

  const guild = guildOverride || interaction.guild;
  if (!guild) {
    await replyEmbedAction(interaction, "This action requires a server context.", "ephemeral");
    return;
  }
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
  interaction: ButtonInteraction | StringSelectMenuInteraction | ModalSubmitInteraction,
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
  interaction: ButtonInteraction | StringSelectMenuInteraction | ModalSubmitInteraction,
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


