import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  ModalBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ButtonInteraction,
  type Guild,
  type GuildMember,
  type HexColorString,
  type ModalSubmitInteraction,
  type SendableChannels,
  type StringSelectMenuInteraction,
  type TextBasedChannel,
  type User,
} from "discord.js";
import { and, eq } from "drizzle-orm";
import { db } from "../../../db";
import { serverSettings, servers, templates, users } from "@shared/schema";
import { storage } from "../../../storage";
import { getServerByDiscordIdRecord } from "../../../repositories/server-repository";
import type { CommandContext, CommandModule } from "../../commands/types";
import { CommandError } from "../../lib/errors";
import {
  assertBotCanManageMember,
  assertBotCanManageRole,
  assertUserCanManageMember,
  assertUserCanManageRole,
} from "../../lib/guards/hierarchy";
import type { ArchivistLogger } from "../../lib/logger";

const PANEL_TEMPLATE_TYPE = "discord_panel_builder";
const PANEL_VERSION = 1;
const MAX_BUTTONS = 20;
const MAX_OPTIONS = 25;
const BUILDER_PREFIX = "panel:builder";
const MODAL_PREFIX = "panel:modal";
const LIVE_PREFIX = "panel:live";
const PANEL_COLOR = 0xb11226;

type PanelActionType = "reply" | "role_add" | "role_remove" | "role_toggle" | "open_panel" | "link";
type PanelButtonStyle = "primary" | "secondary" | "success" | "danger" | "link";
type EditorPage = "main" | "buttons" | "menu";

interface PanelAction {
  type: PanelActionType;
  target: string;
}

interface PanelButtonDraft {
  id: string;
  label: string;
  style: PanelButtonStyle;
  emoji?: string | null;
  action: PanelAction;
}

interface PanelSelectOptionDraft {
  id: string;
  label: string;
  description?: string | null;
  emoji?: string | null;
  action: PanelAction;
}

interface PanelData {
  version: number;
  name: string;
  content: string;
  embed: {
    title?: string | null;
    description?: string | null;
    color?: HexColorString | null;
  };
  buttons: PanelButtonDraft[];
  selectMenu: {
    placeholder: string;
    minValues: number;
    maxValues: number;
    options: PanelSelectOptionDraft[];
  };
  publishedMessages: Array<{
    channelId: string;
    messageId: string;
    updatedAt: string;
  }>;
  updatedAt: string;
}

interface PanelRecord {
  id: number;
  userId: number;
  serverId: number | null;
  name: string;
  data: PanelData;
}

function makeId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function trimText(input: string, max: number) {
  return input.length > max ? `${input.slice(0, Math.max(0, max - 1))}…` : input;
}

function normalizeColor(input: string | null | undefined): HexColorString | null {
  const value = String(input || "").trim();
  if (!value) return null;
  const hex = value.startsWith("#") ? value.slice(1) : value;
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    throw new CommandError("VALIDATION_FAILED", "Embed color must be a 6-digit hex like #B11226.");
  }
  return `#${hex.toUpperCase()}` as HexColorString;
}

function normalizeButtonStyle(input: string) {
  const value = String(input || "").trim().toLowerCase();
  if (value === "primary" || value === "secondary" || value === "success" || value === "danger" || value === "link") {
    return value as PanelButtonStyle;
  }
  throw new CommandError("VALIDATION_FAILED", "Button style must be primary, secondary, success, danger, or link.");
}

function normalizeActionType(input: string) {
  const value = String(input || "").trim().toLowerCase();
  if (
    value === "reply" ||
    value === "role_add" ||
    value === "role_remove" ||
    value === "role_toggle" ||
    value === "open_panel" ||
    value === "link"
  ) {
    return value as PanelActionType;
  }
  throw new CommandError(
    "VALIDATION_FAILED",
    "Action must be reply, role_add, role_remove, role_toggle, open_panel, or link.",
  );
}

function parsePositiveInt(input: string, label: string) {
  const value = Number.parseInt(String(input).trim(), 10);
  if (!Number.isFinite(value) || value <= 0) {
    throw new CommandError("VALIDATION_FAILED", `${label} must be a positive number.`);
  }
  return value;
}

function parseRangeInt(input: string, label: string, min: number, max: number) {
  const value = Number.parseInt(String(input).trim(), 10);
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new CommandError("VALIDATION_FAILED", `${label} must be between ${min} and ${max}.`);
  }
  return value;
}

function normalizeRoleId(input: string) {
  const value = String(input || "").replace(/[<@&>]/g, "").trim();
  if (!/^\d{5,}$/.test(value)) {
    throw new CommandError("VALIDATION_FAILED", "Role actions need a role id or role mention.");
  }
  return value;
}

function normalizeAction(actionType: string, rawTarget: string): PanelAction {
  const type = normalizeActionType(actionType);
  const target = String(rawTarget || "").trim();
  if (!target) {
    throw new CommandError("VALIDATION_FAILED", "Action target cannot be empty.");
  }

  if (type === "link") {
    try {
      const url = new URL(target);
      if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("bad protocol");
      return { type, target: url.toString() };
    } catch {
      throw new CommandError("VALIDATION_FAILED", "Link actions need a full http or https URL.");
    }
  }

  if (type === "open_panel") {
    return { type, target: String(parsePositiveInt(target, "Target panel id")) };
  }

  if (type === "role_add" || type === "role_remove" || type === "role_toggle") {
    return { type, target: normalizeRoleId(target) };
  }

  return { type, target };
}

function defaultPanelData(name: string): PanelData {
  return {
    version: PANEL_VERSION,
    name,
    content: "",
    embed: {
      title: name,
      description: "",
      color: "#B11226",
    },
    buttons: [],
    selectMenu: {
      placeholder: "Choose an option",
      minValues: 1,
      maxValues: 1,
      options: [],
    },
    publishedMessages: [],
    updatedAt: new Date().toISOString(),
  };
}

function normalizePanelData(input: unknown, fallbackName: string): PanelData {
  const source = (input && typeof input === "object" ? input : {}) as Partial<PanelData>;
  const fallback = defaultPanelData(fallbackName);
  const buttons = Array.isArray(source.buttons) ? source.buttons.slice(0, MAX_BUTTONS) : [];
  const options = Array.isArray(source.selectMenu?.options) ? source.selectMenu.options.slice(0, MAX_OPTIONS) : [];

  const normalizedOptions = options.map((option, index) => ({
    id: String(option.id || makeId(`opt${index}`)),
    label: String(option.label || `Option ${index + 1}`).slice(0, 100),
    description: option.description ? String(option.description).slice(0, 100) : null,
    emoji: option.emoji ? String(option.emoji).slice(0, 32) : null,
    action: normalizeAction(String(option.action?.type || "reply"), String(option.action?.target || "Configured action")),
  }));

  const maxValues = Math.max(1, Math.min(Number(source.selectMenu?.maxValues ?? fallback.selectMenu.maxValues) || 1, Math.max(1, normalizedOptions.length || 1)));
  const minValues = Math.max(0, Math.min(Number(source.selectMenu?.minValues ?? fallback.selectMenu.minValues) || 1, maxValues));

  return {
    version: PANEL_VERSION,
    name: String(source.name || fallback.name).slice(0, 80),
    content: String(source.content || ""),
    embed: {
      title: source.embed?.title ? String(source.embed.title).slice(0, 256) : fallback.embed.title,
      description: source.embed?.description ? String(source.embed.description).slice(0, 4000) : fallback.embed.description,
      color: normalizeColor(source.embed?.color ?? fallback.embed.color),
    },
    buttons: buttons.map((button, index) => ({
      id: String(button.id || makeId(`btn${index}`)),
      label: String(button.label || `Button ${index + 1}`).slice(0, 80),
      style: normalizeButtonStyle(String(button.style || "primary")),
      emoji: button.emoji ? String(button.emoji).slice(0, 32) : null,
      action: normalizeAction(String(button.action?.type || "reply"), String(button.action?.target || "Configured action")),
    })),
    selectMenu: {
      placeholder: String(source.selectMenu?.placeholder || fallback.selectMenu.placeholder).slice(0, 150),
      minValues,
      maxValues,
      options: normalizedOptions,
    },
    publishedMessages: Array.isArray(source.publishedMessages)
      ? source.publishedMessages
        .filter((entry): entry is PanelData["publishedMessages"][number] => Boolean(entry?.channelId && entry?.messageId))
        .map((entry) => ({
          channelId: String(entry.channelId),
          messageId: String(entry.messageId),
          updatedAt: String(entry.updatedAt || new Date().toISOString()),
        }))
      : [],
    updatedAt: String(source.updatedAt || new Date().toISOString()),
  };
}

function createStarterButton(index: number): PanelButtonDraft {
  return {
    id: makeId("btn"),
    label: `Button ${index}`,
    style: "primary",
    emoji: null,
    action: {
      type: "reply",
      target: `Button ${index} clicked.`,
    },
  };
}

function createStarterOption(index: number): PanelSelectOptionDraft {
  return {
    id: makeId("opt"),
    label: `Option ${index}`,
    description: `Choice ${index}`,
    emoji: null,
    action: {
      type: "reply",
      target: `Option ${index} selected.`,
    },
  };
}

function chunk<T>(items: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

function toButtonStyle(style: PanelButtonStyle) {
  switch (style) {
    case "primary":
      return ButtonStyle.Primary;
    case "secondary":
      return ButtonStyle.Secondary;
    case "success":
      return ButtonStyle.Success;
    case "danger":
      return ButtonStyle.Danger;
    case "link":
      return ButtonStyle.Link;
  }
}

function buildPanelEmbeds(panel: PanelData) {
  const embed = new EmbedBuilder();
  if (panel.embed.color) embed.setColor(panel.embed.color);
  if (panel.embed.title) embed.setTitle(panel.embed.title);
  if (panel.embed.description) embed.setDescription(panel.embed.description);
  if (!panel.embed.title && !panel.embed.description) return [];
  return [embed];
}

function buildPanelPayload(record: PanelRecord) {
  const rows: Array<ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>> = [];
  const buttons = record.data.buttons.map((button) => {
    const builder = new ButtonBuilder().setLabel(button.label).setStyle(toButtonStyle(button.style));
    if (button.emoji) builder.setEmoji(button.emoji);
    if (button.style === "link" || button.action.type === "link") {
      return builder.setStyle(ButtonStyle.Link).setURL(button.action.target);
    }
    return builder.setCustomId(`${LIVE_PREFIX}:${record.id}:button:${button.id}`);
  });

  for (const rowButtons of chunk(buttons, 5).slice(0, 4)) {
    rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(rowButtons));
  }

  if (record.data.selectMenu.options.length > 0 && rows.length < 5) {
    rows.push(
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`${LIVE_PREFIX}:${record.id}:select`)
          .setPlaceholder(record.data.selectMenu.placeholder || "Choose an option")
          .setMinValues(Math.min(record.data.selectMenu.minValues, record.data.selectMenu.options.length))
          .setMaxValues(Math.max(1, Math.min(record.data.selectMenu.maxValues, record.data.selectMenu.options.length)))
          .addOptions(
            record.data.selectMenu.options.map((option) => ({
              label: option.label,
              value: option.id,
              description: option.description || undefined,
              emoji: option.emoji || undefined,
            })),
          ),
      ),
    );
  }

  return {
    content: record.data.content || undefined,
    embeds: buildPanelEmbeds(record.data),
    components: rows,
  };
}

function editorButtonId(action: string, panelId: number) {
  return `${BUILDER_PREFIX}:${action}:${panelId}`;
}

function editorModalId(action: string, panelId: number, targetId?: string) {
  return `${MODAL_PREFIX}:${action}:${panelId}${targetId ? `:${targetId}` : ""}`;
}

function parseScopedId(customId: string, prefix: string) {
  const parts = customId.split(":");
  if (`${parts[0]}:${parts[1]}` !== prefix) return null;
  return parts;
}

function assertBuilderPermissions(member: GuildMember) {
  if (member.permissions.has(PermissionFlagsBits.Administrator) || member.permissions.has(PermissionFlagsBits.ManageGuild)) {
    return;
  }
  throw new CommandError("USER_PERMISSION_MISSING", "You need Manage Server or Administrator to build panels.");
}

type PanelPublishChannel = SendableChannels & TextBasedChannel;

function isSendableChannel(channel: TextBasedChannel | null): channel is PanelPublishChannel {
  return typeof (channel as SendableChannels | null)?.send === "function";
}

async function ensurePanelUser(actor: User) {
  const existing = await storage.getUserByDiscordId(actor.id);
  if (existing) {
    await db.update(users).set({ username: actor.globalName || actor.username, avatar: actor.avatarURL() } as any).where(eq(users.id, existing.id));
    return existing;
  }
  const [created] = await db.insert(users).values({
    discordId: actor.id,
    username: actor.globalName || actor.username,
    avatar: actor.avatarURL(),
  } as any).returning();
  return created;
}

async function ensurePanelServer(guild: Guild) {
  const existing = await getServerByDiscordIdRecord(guild.id);
  if (existing) return existing;
  const [created] = await db.insert(servers).values({
    discordId: guild.id,
    name: guild.name,
    iconUrl: guild.iconURL(),
    memberCount: guild.memberCount,
    ownerId: guild.ownerId || "unknown",
  } as any).returning();
  await db.insert(serverSettings).values({ serverId: created.id } as any);
  return created;
}

async function getOwnedPanel(panelId: number, actor: User, guild: Guild) {
  const owner = await ensurePanelUser(actor);
  const server = await ensurePanelServer(guild);
  const [record] = await db.select().from(templates).where(and(
    eq(templates.id, panelId),
    eq(templates.userId, owner.id),
    eq(templates.serverId, server.id),
    eq(templates.type, PANEL_TEMPLATE_TYPE),
  ));
  if (!record) throw new CommandError("NOT_FOUND", "That panel draft was not found in this server.");
  return {
    id: record.id,
    userId: record.userId,
    serverId: record.serverId,
    name: record.name,
    data: normalizePanelData(record.data, record.name),
  } satisfies PanelRecord;
}

async function getServerPanel(panelId: number, guild: Guild) {
  const server = await ensurePanelServer(guild);
  const [record] = await db.select().from(templates).where(and(
    eq(templates.id, panelId),
    eq(templates.serverId, server.id),
    eq(templates.type, PANEL_TEMPLATE_TYPE),
  ));
  if (!record) throw new CommandError("NOT_FOUND", "That panel was not found.");
  return {
    id: record.id,
    userId: record.userId,
    serverId: record.serverId,
    name: record.name,
    data: normalizePanelData(record.data, record.name),
  } satisfies PanelRecord;
}

async function savePanel(record: PanelRecord) {
  const nextData = normalizePanelData({ ...record.data, updatedAt: new Date().toISOString() }, record.data.name);
  const [updated] = await db.update(templates).set({
    name: nextData.name,
    data: nextData,
  } as any).where(eq(templates.id, record.id)).returning();
  return {
    id: updated.id,
    userId: updated.userId,
    serverId: updated.serverId,
    name: updated.name,
    data: normalizePanelData(updated.data, updated.name),
  } satisfies PanelRecord;
}

function formatPublished(record: PanelRecord) {
  if (record.data.publishedMessages.length === 0) return "No live messages yet.";
  return record.data.publishedMessages
    .slice(0, 5)
    .map((entry) => `<#${entry.channelId}> • \`${entry.messageId}\``)
    .join("\n");
}

function builderEmbed(record: PanelRecord, page: EditorPage, note?: string) {
  const pageTitle = page === "main" ? "Overview" : page === "buttons" ? "Buttons" : "Select Menu";
  const embed = new EmbedBuilder()
    .setColor(PANEL_COLOR)
    .setTitle(`Panel Builder • ${record.data.name}`)
    .setDescription(
      [
        note || "Build the draft, tune the interactions, preview it, then publish it into the current channel.",
        "",
        `View: \`${pageTitle}\``,
        `Draft ID: \`${record.id}\``,
        `Buttons: \`${record.data.buttons.length}\` / ${MAX_BUTTONS}`,
        `Select options: \`${record.data.selectMenu.options.length}\` / ${MAX_OPTIONS}`,
      ].join("\n"),
    )
    .setFooter({ text: "Archivist panel builder" })
    .setTimestamp(new Date(record.data.updatedAt));

  if (page === "main") {
    embed.addFields(
      { name: "Message Content", value: record.data.content ? trimText(record.data.content, 1024) : "None" },
      {
        name: "Embed",
        value: [
          `Title: ${record.data.embed.title ? trimText(record.data.embed.title, 120) : "None"}`,
          `Description: ${record.data.embed.description ? trimText(record.data.embed.description, 240) : "None"}`,
          `Color: ${record.data.embed.color || "Default"}`,
        ].join("\n"),
      },
      { name: "Published", value: formatPublished(record) },
    );
    return embed;
  }

  if (page === "buttons") {
    embed.addFields({
      name: "Configured Buttons",
      value: record.data.buttons.length > 0
        ? record.data.buttons.map((button, index) => `${index + 1}. ${trimText(`${button.label} [${button.style}] -> ${button.action.type}:${button.action.target}`, 120)}`).join("\n")
        : "No buttons yet.",
    });
    return embed;
  }

  embed.addFields(
    {
      name: "Menu Settings",
      value: [
        `Placeholder: ${record.data.selectMenu.placeholder || "Choose an option"}`,
        `Min values: ${record.data.selectMenu.minValues}`,
        `Max values: ${record.data.selectMenu.maxValues}`,
      ].join("\n"),
    },
    {
      name: "Options",
      value: record.data.selectMenu.options.length > 0
        ? record.data.selectMenu.options.map((option, index) => `${index + 1}. ${trimText(`${option.label} -> ${option.action.type}:${option.action.target}`, 120)}`).join("\n")
        : "No select options yet.",
    },
  );
  return embed;
}

function mainEditorComponents(record: PanelRecord) {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(editorButtonId("content", record.id)).setLabel("Edit Content").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(editorButtonId("buttons", record.id)).setLabel("Buttons").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(editorButtonId("menu", record.id)).setLabel("Select Menu").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(editorButtonId("preview", record.id)).setLabel("Preview").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(editorButtonId("publish", record.id)).setLabel("Publish Here").setStyle(ButtonStyle.Success),
    ),
  ];
}

function buttonsEditorComponents(record: PanelRecord) {
  const rows: Array<ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>> = [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(editorButtonId("add_button", record.id)).setLabel("Quick Add Button").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(editorButtonId("clear_buttons", record.id)).setLabel("Clear Buttons").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(editorButtonId("preview", record.id)).setLabel("Preview").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(editorButtonId("publish", record.id)).setLabel("Publish Here").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(editorButtonId("back", record.id)).setLabel("Back").setStyle(ButtonStyle.Secondary),
    ),
  ];

  if (record.data.buttons.length > 0) {
    rows.push(
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(editorButtonId("edit_button_select", record.id))
          .setPlaceholder("Edit a button")
          .addOptions(record.data.buttons.slice(0, 25).map((button) => ({
            label: trimText(button.label, 100),
            value: button.id,
            description: trimText(`${button.action.type}:${button.action.target}`, 100),
          }))),
      ),
    );
    rows.push(
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(editorButtonId("remove_button_select", record.id))
          .setPlaceholder("Remove a button")
          .addOptions(record.data.buttons.slice(0, 25).map((button) => ({
            label: trimText(button.label, 100),
            value: button.id,
            description: "Delete this button from the draft",
          }))),
      ),
    );
  }

  return rows;
}

function menuEditorComponents(record: PanelRecord) {
  const rows: Array<ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>> = [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(editorButtonId("edit_menu", record.id)).setLabel("Edit Menu").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(editorButtonId("add_option", record.id)).setLabel("Quick Add Option").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(editorButtonId("clear_menu", record.id)).setLabel("Clear Menu").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(editorButtonId("publish", record.id)).setLabel("Publish Here").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(editorButtonId("back", record.id)).setLabel("Back").setStyle(ButtonStyle.Secondary),
    ),
  ];

  if (record.data.selectMenu.options.length > 0) {
    rows.push(
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(editorButtonId("edit_option_select", record.id))
          .setPlaceholder("Edit a select option")
          .addOptions(record.data.selectMenu.options.slice(0, 25).map((option) => ({
            label: trimText(option.label, 100),
            value: option.id,
            description: trimText(`${option.action.type}:${option.action.target}`, 100),
          }))),
      ),
    );
    rows.push(
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(editorButtonId("remove_option_select", record.id))
          .setPlaceholder("Remove a select option")
          .addOptions(record.data.selectMenu.options.slice(0, 25).map((option) => ({
            label: trimText(option.label, 100),
            value: option.id,
            description: "Delete this option from the draft",
          }))),
      ),
    );
  }

  return rows;
}

function editorPayload(record: PanelRecord, page: EditorPage, note?: string) {
  return {
    ephemeral: true,
    embeds: [builderEmbed(record, page, note)],
    components: page === "buttons"
      ? buttonsEditorComponents(record)
      : page === "menu"
        ? menuEditorComponents(record)
        : mainEditorComponents(record),
  };
}

function contentModal(record: PanelRecord) {
  return new ModalBuilder()
    .setCustomId(editorModalId("content", record.id))
    .setTitle(`Edit ${trimText(record.data.name, 35)}`)
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder().setCustomId("name").setLabel("Panel name").setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(80).setValue(record.data.name),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder().setCustomId("content").setLabel("Message content").setStyle(TextInputStyle.Paragraph).setRequired(false).setMaxLength(2000).setValue(record.data.content || ""),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder().setCustomId("embed_title").setLabel("Embed title").setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(256).setValue(record.data.embed.title || ""),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder().setCustomId("embed_description").setLabel("Embed description").setStyle(TextInputStyle.Paragraph).setRequired(false).setMaxLength(4000).setValue(record.data.embed.description || ""),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder().setCustomId("embed_color").setLabel("Embed color (#RRGGBB)").setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(7).setValue(record.data.embed.color || ""),
      ),
    );
}

function buttonModal(record: PanelRecord, button?: PanelButtonDraft) {
  return new ModalBuilder()
    .setCustomId(editorModalId("button", record.id, button?.id || "new"))
    .setTitle(button ? `Edit ${trimText(button.label, 35)}` : `Add button to ${trimText(record.data.name, 25)}`)
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder().setCustomId("label").setLabel("Button label").setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(80).setValue(button?.label || ""),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder().setCustomId("style").setLabel("Style (primary/secondary/success/danger/link)").setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(16).setValue(button?.style || "primary"),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder().setCustomId("action").setLabel("Action (reply/role_add/role_remove/role_toggle/open_panel/link)").setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(24).setValue(button?.action.type || "reply"),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder().setCustomId("target").setLabel("Target text / role id / panel id / URL").setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(2000).setValue(button?.action.target || ""),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder().setCustomId("emoji").setLabel("Emoji (optional)").setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(32).setValue(button?.emoji || ""),
      ),
    );
}

function menuModal(record: PanelRecord) {
  return new ModalBuilder()
    .setCustomId(editorModalId("menu", record.id))
    .setTitle(`Menu for ${trimText(record.data.name, 30)}`)
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder().setCustomId("placeholder").setLabel("Placeholder").setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(150).setValue(record.data.selectMenu.placeholder || "Choose an option"),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder().setCustomId("min_values").setLabel("Minimum values").setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(2).setValue(String(record.data.selectMenu.minValues)),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder().setCustomId("max_values").setLabel("Maximum values").setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(2).setValue(String(record.data.selectMenu.maxValues)),
      ),
    );
}

function optionModal(record: PanelRecord, option?: PanelSelectOptionDraft) {
  return new ModalBuilder()
    .setCustomId(editorModalId("option", record.id, option?.id || "new"))
    .setTitle(option ? `Edit ${trimText(option.label, 35)}` : `Add option to ${trimText(record.data.name, 25)}`)
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder().setCustomId("label").setLabel("Option label").setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(100).setValue(option?.label || ""),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder().setCustomId("description").setLabel("Description").setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(100).setValue(option?.description || ""),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder().setCustomId("action").setLabel("Action (reply/role_add/role_remove/role_toggle/open_panel/link)").setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(24).setValue(option?.action.type || "reply"),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder().setCustomId("target").setLabel("Target text / role id / panel id / URL").setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(2000).setValue(option?.action.target || ""),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder().setCustomId("emoji").setLabel("Emoji (optional)").setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(32).setValue(option?.emoji || ""),
      ),
    );
}

function modalValue(interaction: ModalSubmitInteraction<"cached">, key: string) {
  return interaction.fields.getTextInputValue(key).trim();
}

async function replyWithEditor(interaction: ModalSubmitInteraction<"cached">, record: PanelRecord, page: EditorPage, note: string) {
  const payload = editorPayload(record, page, note) as any;
  if (interaction.deferred || interaction.replied) {
    await interaction.editReply(payload);
    return;
  }

  await interaction.reply(payload);
}

async function updateEditor(
  interaction: ButtonInteraction<"cached"> | StringSelectMenuInteraction<"cached">,
  record: PanelRecord,
  page: EditorPage,
  note?: string,
) {
  await interaction.update(editorPayload(record, page, note) as any);
}

async function deferBuilderUpdate(
  interaction: ButtonInteraction<"cached"> | StringSelectMenuInteraction<"cached">,
) {
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferUpdate();
  }
}

async function sendBuilderPreview(
  interaction: ButtonInteraction<"cached"> | StringSelectMenuInteraction<"cached">,
  record: PanelRecord,
) {
  await deferBuilderUpdate(interaction);
  await interaction.followUp({ ...buildPanelPayload(record), ephemeral: true } as any);
}

async function replyBuilderFailure(
  interaction: ButtonInteraction<"cached"> | StringSelectMenuInteraction<"cached">,
  error: unknown,
  fallbackMessage: string,
) {
  const message = error instanceof CommandError ? error.message : fallbackMessage;
  const payload = { content: message, embeds: [], components: [] } as any;

  if (interaction.deferred || interaction.replied) {
    await interaction.editReply(payload).catch(() => {});
    return;
  }

  await interaction.reply({ ...payload, ephemeral: true } as any).catch(() => {});
}

async function showEditorModal(
  interaction: ButtonInteraction<"cached"> | StringSelectMenuInteraction<"cached">,
  modal: ModalBuilder,
) {
  await interaction.showModal(modal.toJSON() as any);
}

async function publishPanel(record: PanelRecord, channel: PanelPublishChannel, actorLabel: string) {
  const payload = buildPanelPayload(record);
  const existing = record.data.publishedMessages.find((entry) => entry.channelId === channel.id);
  let messageId = "";

  if (existing) {
    const message = await channel.messages.fetch(existing.messageId).catch(() => null);
    if (message) {
      await message.edit(payload as any);
      messageId = message.id;
    }
  }

  if (!messageId) {
    const created = await channel.send(payload as any);
    messageId = created.id;
  }

  record.data.publishedMessages = [
    { channelId: channel.id, messageId, updatedAt: new Date().toISOString() },
    ...record.data.publishedMessages.filter((entry) => entry.channelId !== channel.id),
  ].slice(0, 10);

  return savePanel(record).then((updated) => ({
    updated,
    summary: `Published to <#${channel.id}> as \`${messageId}\` by ${actorLabel}.`,
  }));
}

async function resolvePanelAction(guild: Guild, member: GuildMember, action: PanelAction, actorLabel: string) {
  if (action.type === "reply") {
    return { kind: "reply" as const, content: action.target };
  }

  if (action.type === "open_panel") {
    const panelId = parsePositiveInt(action.target, "Target panel id");
    return { kind: "open" as const, panel: await getServerPanel(panelId, guild) };
  }

  if (action.type === "link") {
    return { kind: "reply" as const, content: `Open the link: ${action.target}` };
  }

  const role = guild.roles.cache.get(action.target) || await guild.roles.fetch(action.target).catch(() => null);
  if (!role) {
    throw new CommandError("NOT_FOUND", "The configured role could not be found.");
  }

  const botMember = guild.members.me || await guild.members.fetchMe();
  const guardCtx = { guild, member, botMember } as unknown as CommandContext;
  assertUserCanManageRole(guardCtx, role);
  assertBotCanManageRole(guardCtx, role);
  assertUserCanManageMember(guardCtx, member);
  assertBotCanManageMember(guardCtx, member);

  const hasRole = member.roles.cache.has(role.id);
  if (action.type === "role_add" && hasRole) return { kind: "reply" as const, content: `You already have <@&${role.id}>.` };
  if (action.type === "role_remove" && !hasRole) return { kind: "reply" as const, content: `You do not have <@&${role.id}>.` };

  if (action.type === "role_add" || (action.type === "role_toggle" && !hasRole)) {
    await member.roles.add(role, `Panel action by ${actorLabel}`);
    return { kind: "reply" as const, content: `Added <@&${role.id}>.` };
  }

  await member.roles.remove(role, `Panel action by ${actorLabel}`);
  return { kind: "reply" as const, content: `Removed <@&${role.id}>.` };
}

export const panelCommand: CommandModule = {
  data: new SlashCommandBuilder()
    .setName("panel")
    .setDescription("Build interactive embed panels inside Discord.")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("create")
        .setDescription("Create a new panel draft.")
        .addStringOption((option) => option.setName("name").setDescription("Panel name").setRequired(true).setMaxLength(80)),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("open")
        .setDescription("Open a saved panel draft.")
        .addIntegerOption((option) => option.setName("panel_id").setDescription("Draft id").setRequired(true).setMinValue(1)),
    )
    .addSubcommand((subcommand) => subcommand.setName("list").setDescription("List your panel drafts for this server."))
    .addSubcommand((subcommand) =>
      subcommand
        .setName("publish")
        .setDescription("Publish a panel draft into a channel.")
        .addIntegerOption((option) => option.setName("panel_id").setDescription("Draft id").setRequired(true).setMinValue(1))
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("Target channel")
            .addChannelTypes(
              ChannelType.GuildText,
              ChannelType.GuildAnnouncement,
              ChannelType.PublicThread,
              ChannelType.PrivateThread,
              ChannelType.AnnouncementThread,
            ),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("delete")
        .setDescription("Delete a panel draft.")
        .addIntegerOption((option) => option.setName("panel_id").setDescription("Draft id").setRequired(true).setMinValue(1)),
    ),
  async execute(ctx) {
    assertBuilderPermissions(ctx.member);
    const actor = await ensurePanelUser(ctx.interaction.user);
    const server = await ensurePanelServer(ctx.guild);
    const subcommand = ctx.interaction.options.getSubcommand(true);

    if (subcommand === "create") {
      const name = ctx.interaction.options.getString("name", true).trim();
      const [created] = await db.insert(templates).values({
        userId: actor.id,
        serverId: server.id,
        name,
        type: PANEL_TEMPLATE_TYPE,
        data: defaultPanelData(name),
      } as any).returning();

      const record: PanelRecord = {
        id: created.id,
        userId: created.userId,
        serverId: created.serverId,
        name: created.name,
        data: normalizePanelData(created.data, created.name),
      };
      await ctx.interaction.reply(editorPayload(record, "main", "Draft created. Build it out, preview it, then publish it.") as any);
      return null;
    }

    if (subcommand === "open") {
      const panelId = ctx.interaction.options.getInteger("panel_id", true);
      const record = await getOwnedPanel(panelId, ctx.interaction.user, ctx.guild);
      await ctx.interaction.reply(editorPayload(record, "main", "Draft reopened.") as any);
      return null;
    }

    if (subcommand === "list") {
      const records = (await storage.getTemplates(actor.id, server.id)).filter((entry) => entry.type === PANEL_TEMPLATE_TYPE);
      if (records.length === 0) {
        return {
          title: "No panel drafts yet",
          description: "Run `/panel create` to start your first editable panel.",
        };
      }

      return {
        title: "Your panel drafts",
        description: records.slice(0, 15).map((entry) => `\`${entry.id}\` • ${normalizePanelData(entry.data, entry.name).name}`).join("\n"),
        fields: [{ name: "Open", value: "Use `/panel open panel_id:<id>` to jump back into the builder." }],
      };
    }

    if (subcommand === "publish") {
      const panelId = ctx.interaction.options.getInteger("panel_id", true);
      const channel = (ctx.interaction.options.getChannel("channel") as TextBasedChannel | null) || ctx.interaction.channel;
      if (!isSendableChannel(channel)) {
        throw new CommandError("UNSUPPORTED_OPERATION", "Choose a text channel for publishing.");
      }
      const record = await getOwnedPanel(panelId, ctx.interaction.user, ctx.guild);
      const result = await publishPanel(record, channel, ctx.interaction.user.username);
      return {
        title: "Panel published",
        description: result.summary,
      };
    }

    const panelId = ctx.interaction.options.getInteger("panel_id", true);
    const record = await getOwnedPanel(panelId, ctx.interaction.user, ctx.guild);
    await db.delete(templates).where(eq(templates.id, record.id));
    return {
      title: "Panel deleted",
      description: `Removed draft \`${record.id}\` (${record.data.name}).`,
    };
  },
};

export async function handlePanelButtonInteraction(interaction: ButtonInteraction<"cached">, logger: ArchivistLogger) {
  const parts = parseScopedId(interaction.customId, BUILDER_PREFIX);
  if (!parts) return false;
  const action = parts[2];
  const panelId = Number.parseInt(parts[3] || "", 10);
  if (!Number.isFinite(panelId)) return false;

  try {
    assertBuilderPermissions(interaction.member);

    if (action === "preview" || action === "publish") {
      await deferBuilderUpdate(interaction);
    }

    const record = await getOwnedPanel(panelId, interaction.user, interaction.guild);

    if (action === "content") {
      await showEditorModal(interaction, contentModal(record));
      return true;
    }
    if (action === "buttons") {
      await updateEditor(interaction, record, "buttons");
      return true;
    }
    if (action === "menu") {
      await updateEditor(interaction, record, "menu");
      return true;
    }
    if (action === "back") {
      await updateEditor(interaction, record, "main");
      return true;
    }
    if (action === "preview") {
      await sendBuilderPreview(interaction, record);
      return true;
    }
    if (action === "publish") {
      if (!isSendableChannel(interaction.channel)) {
        throw new CommandError("UNSUPPORTED_OPERATION", "This channel cannot receive a panel.");
      }
      const result = await publishPanel(record, interaction.channel, interaction.user.username);
      await interaction.editReply(editorPayload(result.updated, "main", result.summary) as any);
      return true;
    }
    if (action === "add_button") {
      if (record.data.buttons.length >= MAX_BUTTONS) {
        throw new CommandError("VALIDATION_FAILED", `This draft already has ${MAX_BUTTONS} buttons.`);
      }
      record.data.buttons.push(createStarterButton(record.data.buttons.length + 1));
      await updateEditor(interaction, await savePanel(record), "buttons", "Starter button added. Use the picker below to customize it.");
      return true;
    }
    if (action === "clear_buttons") {
      record.data.buttons = [];
      await updateEditor(interaction, await savePanel(record), "buttons", "All buttons removed.");
      return true;
    }
    if (action === "edit_menu") {
      await showEditorModal(interaction, menuModal(record));
      return true;
    }
    if (action === "add_option") {
      if (record.data.selectMenu.options.length >= MAX_OPTIONS) {
        throw new CommandError("VALIDATION_FAILED", `This draft already has ${MAX_OPTIONS} select options.`);
      }
      record.data.selectMenu.options.push(createStarterOption(record.data.selectMenu.options.length + 1));
      record.data.selectMenu.maxValues = Math.max(1, Math.min(record.data.selectMenu.maxValues, record.data.selectMenu.options.length));
      record.data.selectMenu.minValues = Math.min(record.data.selectMenu.minValues, record.data.selectMenu.maxValues);
      await updateEditor(interaction, await savePanel(record), "menu", "Starter option added. Use the picker below to edit it.");
      return true;
    }
    if (action === "clear_menu") {
      record.data.selectMenu.options = [];
      record.data.selectMenu.minValues = 1;
      record.data.selectMenu.maxValues = 1;
      await updateEditor(interaction, await savePanel(record), "menu", "Select options cleared.");
      return true;
    }

    logger.debug("Unhandled panel builder button action.", { action, panelId });
    return false;
  } catch (error) {
    logger.error("Panel builder button interaction failed.", {
      panelId,
      action,
      message: error instanceof Error ? error.message : String(error),
    });
    await replyBuilderFailure(interaction, error, "That panel action could not be completed.");
    return true;
  }
}

export async function handlePanelSelectInteraction(interaction: StringSelectMenuInteraction<"cached">, logger: ArchivistLogger) {
  if (interaction.customId.startsWith(`${LIVE_PREFIX}:`)) {
    const parts = interaction.customId.split(":");
    const panelId = Number.parseInt(parts[2] || "", 10);
    if (!Number.isFinite(panelId)) return false;
    await interaction.deferUpdate();
    const record = await getServerPanel(panelId, interaction.guild);
    const replies: string[] = [];

    for (const value of interaction.values) {
      const option = record.data.selectMenu.options.find((entry) => entry.id === value);
      if (!option) continue;
      const result = await resolvePanelAction(interaction.guild, interaction.member, option.action, interaction.user.username);
      if (result.kind === "open") {
        await interaction.editReply(buildPanelPayload(result.panel) as any);
        return true;
      }
      replies.push(result.content);
    }

    await interaction.followUp({ ephemeral: true, content: replies.join("\n") || "Selection processed." });
    return true;
  }

  const parts = parseScopedId(interaction.customId, BUILDER_PREFIX);
  if (!parts) return false;
  const action = parts[2];
  const panelId = Number.parseInt(parts[3] || "", 10);
  if (!Number.isFinite(panelId)) return false;

  try {
    assertBuilderPermissions(interaction.member);

    if (action !== "edit_button_select" && action !== "edit_option_select") {
      await deferBuilderUpdate(interaction);
    }

    const record = await getOwnedPanel(panelId, interaction.user, interaction.guild);
    const selectedId = interaction.values[0];

    if (action === "edit_button_select") {
      const button = record.data.buttons.find((entry) => entry.id === selectedId);
      if (!button) throw new CommandError("NOT_FOUND", "That button no longer exists.");
      await showEditorModal(interaction, buttonModal(record, button));
      return true;
    }
    if (action === "remove_button_select") {
      record.data.buttons = record.data.buttons.filter((entry) => entry.id !== selectedId);
      await interaction.editReply(editorPayload(await savePanel(record), "buttons", "Button removed.") as any);
      return true;
    }
    if (action === "edit_option_select") {
      const option = record.data.selectMenu.options.find((entry) => entry.id === selectedId);
      if (!option) throw new CommandError("NOT_FOUND", "That select option no longer exists.");
      await showEditorModal(interaction, optionModal(record, option));
      return true;
    }
    if (action === "remove_option_select") {
      record.data.selectMenu.options = record.data.selectMenu.options.filter((entry) => entry.id !== selectedId);
      record.data.selectMenu.maxValues = Math.max(1, Math.min(record.data.selectMenu.maxValues, Math.max(1, record.data.selectMenu.options.length || 1)));
      record.data.selectMenu.minValues = Math.min(record.data.selectMenu.minValues, record.data.selectMenu.maxValues);
      await interaction.editReply(editorPayload(await savePanel(record), "menu", "Select option removed.") as any);
      return true;
    }

    logger.debug("Unhandled panel builder select action.", { action, panelId });
    return false;
  } catch (error) {
    logger.error("Panel builder select interaction failed.", {
      panelId,
      action,
      message: error instanceof Error ? error.message : String(error),
    });
    await replyBuilderFailure(interaction, error, "That panel selection could not be completed.");
    return true;
  }
}

export async function handlePanelModalInteraction(interaction: ModalSubmitInteraction<"cached">, logger: ArchivistLogger) {
  const parts = parseScopedId(interaction.customId, MODAL_PREFIX);
  if (!parts) return false;
  const action = parts[2];
  const panelId = Number.parseInt(parts[3] || "", 10);
  const targetId = parts[4] || "";
  if (!Number.isFinite(panelId)) return false;

  try {
    assertBuilderPermissions(interaction.member);
    await interaction.deferReply({ ephemeral: true });
    const record = await getOwnedPanel(panelId, interaction.user, interaction.guild);

    if (action === "content") {
      record.data.name = modalValue(interaction, "name").slice(0, 80);
      record.data.content = modalValue(interaction, "content");
      record.data.embed.title = modalValue(interaction, "embed_title") || null;
      record.data.embed.description = modalValue(interaction, "embed_description") || null;
      record.data.embed.color = normalizeColor(modalValue(interaction, "embed_color") || null);
      await replyWithEditor(interaction, await savePanel(record), "main", "Panel content saved.");
      return true;
    }

    if (action === "button") {
      const nextButton: PanelButtonDraft = {
        id: targetId && targetId !== "new" ? targetId : makeId("btn"),
        label: modalValue(interaction, "label").slice(0, 80),
        style: normalizeButtonStyle(modalValue(interaction, "style")),
        emoji: modalValue(interaction, "emoji") || null,
        action: normalizeAction(modalValue(interaction, "action"), modalValue(interaction, "target")),
      };
      if (nextButton.action.type === "link") nextButton.style = "link";
      if (nextButton.style === "link" && nextButton.action.type !== "link") {
        throw new CommandError("VALIDATION_FAILED", "Link-style buttons must use the link action.");
      }
      const index = record.data.buttons.findIndex((entry) => entry.id === nextButton.id);
      if (index >= 0) record.data.buttons[index] = nextButton;
      else record.data.buttons.push(nextButton);
      await replyWithEditor(interaction, await savePanel(record), "buttons", "Button saved.");
      return true;
    }

    if (action === "menu") {
      const minValues = parseRangeInt(modalValue(interaction, "min_values"), "Minimum values", 0, 25);
      const maxValues = parseRangeInt(modalValue(interaction, "max_values"), "Maximum values", 1, 25);
      if (maxValues < minValues) {
        throw new CommandError("VALIDATION_FAILED", "Maximum values cannot be lower than minimum values.");
      }
      record.data.selectMenu.placeholder = modalValue(interaction, "placeholder").slice(0, 150) || "Choose an option";
      record.data.selectMenu.minValues = minValues;
      record.data.selectMenu.maxValues = maxValues;
      await replyWithEditor(interaction, await savePanel(record), "menu", "Select menu settings saved.");
      return true;
    }

    if (action === "option") {
      const nextOption: PanelSelectOptionDraft = {
        id: targetId && targetId !== "new" ? targetId : makeId("opt"),
        label: modalValue(interaction, "label").slice(0, 100),
        description: modalValue(interaction, "description") || null,
        emoji: modalValue(interaction, "emoji") || null,
        action: normalizeAction(modalValue(interaction, "action"), modalValue(interaction, "target")),
      };
      const index = record.data.selectMenu.options.findIndex((entry) => entry.id === nextOption.id);
      if (index >= 0) record.data.selectMenu.options[index] = nextOption;
      else record.data.selectMenu.options.push(nextOption);
      record.data.selectMenu.maxValues = Math.max(1, Math.min(record.data.selectMenu.maxValues, record.data.selectMenu.options.length));
      record.data.selectMenu.minValues = Math.min(record.data.selectMenu.minValues, record.data.selectMenu.maxValues);
      await replyWithEditor(interaction, await savePanel(record), "menu", "Select option saved.");
      return true;
    }

    logger.debug("Unhandled panel modal action.", { action, panelId });
    return false;
  } catch (error) {
    logger.error("Panel builder modal interaction failed.", {
      panelId,
      action,
      message: error instanceof Error ? error.message : String(error),
    });
    await interaction.editReply({ content: error instanceof CommandError ? error.message : "That panel change could not be saved.", components: [], embeds: [] } as any).catch(() => {});
    return true;
  }
}

export async function handleLivePanelButtonInteraction(interaction: ButtonInteraction<"cached">) {
  if (!interaction.customId.startsWith(`${LIVE_PREFIX}:`)) return false;
  const parts = interaction.customId.split(":");
  const panelId = Number.parseInt(parts[2] || "", 10);
  const targetType = parts[3];
  const buttonId = parts[4];
  if (!Number.isFinite(panelId) || targetType !== "button") return false;

  await interaction.deferUpdate();
  const record = await getServerPanel(panelId, interaction.guild);
  const button = record.data.buttons.find((entry) => entry.id === buttonId);
  if (!button) throw new CommandError("NOT_FOUND", "That panel button no longer exists.");

  const result = await resolvePanelAction(interaction.guild, interaction.member, button.action, interaction.user.username);
  if (result.kind === "open") {
    await interaction.editReply(buildPanelPayload(result.panel) as any);
    return true;
  }

  await interaction.followUp({ ephemeral: true, content: result.content });
  return true;
}
