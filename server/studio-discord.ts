import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
} from "discord.js";
import type {
  EmbedComponentOption,
  EmbedComponentType,
  StudioDiagnostic,
  StudioPublicationSnapshot,
} from "@shared/schema";
import { toDiscordEmojiObject } from "@shared/discord-emoji";
import { resolveStudioTokensInValue, type StudioTokenContext } from "@shared/studio-tokens";
import { encodeStudioActionToken } from "./bot/studio-action-token";

function parseColor(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;
  return parseInt(normalized, 16);
}

export function buildStudioEmbedBuilders(snapshot: StudioPublicationSnapshot, tokenContext?: StudioTokenContext) {
  const resolvedEmbeds = tokenContext
    ? resolveStudioTokensInValue(snapshot.render.embeds || [], tokenContext)
    : (snapshot.render.embeds || []);

  return resolvedEmbeds.flatMap((rawEmbed) => {
    const embed = new EmbedBuilder();
    let hasContent = false;

    if (rawEmbed.title) {
      embed.setTitle(String(rawEmbed.title));
      hasContent = true;
    }
    if (rawEmbed.description) {
      embed.setDescription(String(rawEmbed.description));
      hasContent = true;
    }
    if (rawEmbed.url) {
      embed.setURL(String(rawEmbed.url));
      hasContent = true;
    }
    const color = parseColor(rawEmbed.color);
    if (color !== null) {
      embed.setColor(color);
      hasContent = true;
    }
    if (rawEmbed.authorName) {
      embed.setAuthor({
        name: String(rawEmbed.authorName),
        url: rawEmbed.authorUrl || undefined,
        iconURL: rawEmbed.authorIconUrl || undefined,
      });
      hasContent = true;
    }
    if (rawEmbed.footerText) {
      embed.setFooter({
        text: String(rawEmbed.footerText),
        iconURL: rawEmbed.footerIconUrl || undefined,
      });
      hasContent = true;
    }
    if (rawEmbed.thumbnailUrl) {
      embed.setThumbnail(String(rawEmbed.thumbnailUrl));
      hasContent = true;
    }
    if (rawEmbed.imageUrl) {
      embed.setImage(String(rawEmbed.imageUrl));
      hasContent = true;
    }
    if (Array.isArray(rawEmbed.fields) && rawEmbed.fields.length > 0) {
      embed.addFields(
        rawEmbed.fields.slice(0, 25).map((field) => ({
          name: String(field.name || "-"),
          value: String(field.value || "-"),
          inline: Boolean(field.inline),
        })),
      );
      hasContent = true;
    }
    if (rawEmbed.timestamp) {
      embed.setTimestamp(new Date());
      hasContent = true;
    }

    return hasContent ? [embed] : [];
  });
}

function buildButton(component: EmbedComponentType, publicationId: number, diagnostics: StudioDiagnostic[]) {
  const button = new ButtonBuilder()
    .setLabel(String(component.label || "Action").slice(0, 80))
    .setDisabled(Boolean(component.disabled));

  const emoji = toDiscordEmojiObject(component.emoji);
  if (emoji) button.setEmoji(emoji);

  if (component.action?.type === "open_url" || component.style === 5) {
    const url = String(component.action?.url || component.url || "").trim();
    if (!/^https?:\/\//i.test(url)) {
      diagnostics.push({
        level: "warning",
        code: "BUTTON_URL_INVALID",
        message: `Button ${component.id || component.label || "button"} has an invalid URL.`,
      });
      return null;
    }
    return button.setStyle(ButtonStyle.Link).setURL(url);
  }

  const token = encodeStudioActionToken({
    publicationId,
    nodeId: String(component.id || "button"),
    actionId: String((component.action as any)?.id || component.id || "action"),
  });

  return button
    .setStyle(mapButtonStyle(component.style))
    .setCustomId(token);
}

function buildStringSelect(component: EmbedComponentType, publicationId: number, diagnostics: StudioDiagnostic[]) {
  const minValues = Math.max(0, Math.min(25, Number(component.minValues || 1)));
  const maxValues = Math.max(minValues || 1, Math.min(25, Number(component.maxValues || 1)));
  const menu = new StringSelectMenuBuilder()
    .setCustomId(String(component.customId || component.id || `studio_select_${publicationId}`))
    .setPlaceholder(String(component.placeholder || component.label || "Select an option").slice(0, 150))
    .setDisabled(Boolean(component.disabled))
    .setMinValues(minValues || 1)
    .setMaxValues(maxValues);

  const options = (component.options || []).flatMap((option: EmbedComponentOption) => {
    const action = option.action || component.action;
    if (!action) {
      diagnostics.push({
        level: "warning",
        code: "SELECT_ACTION_MISSING",
        message: `Select option ${option.label} has no action.`,
      });
      return [];
    }

    return [{
      label: String(option.label || "Option").slice(0, 100),
      value: encodeStudioActionToken({
        publicationId,
        nodeId: String(component.id || "select"),
        actionId: String((action as any)?.id || component.id || "action"),
        optionValue: String(option.value || option.label || "option"),
      }),
      description: option.description ? String(option.description).slice(0, 100) : undefined,
      emoji: toDiscordEmojiObject(option.emoji),
      default: Boolean((option as any).default),
    }];
  });

  if (options.length === 0) return null;
  menu.addOptions(options.slice(0, 25));
  return menu;
}

function mapButtonStyle(style?: number) {
  switch (style) {
    case 2:
      return ButtonStyle.Secondary;
    case 3:
      return ButtonStyle.Success;
    case 4:
      return ButtonStyle.Danger;
    default:
      return ButtonStyle.Primary;
  }
}

function buildActionRows(
  components: EmbedComponentType[] | undefined,
  publicationId: number,
  diagnostics: StudioDiagnostic[],
) {
  const rows: Array<ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>> = [];
  let buttonBuffer: ButtonBuilder[] = [];

  const flushButtons = () => {
    if (buttonBuffer.length === 0 || rows.length >= 5) return;
    rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(...buttonBuffer));
    buttonBuffer = [];
  };

  for (const component of components || []) {
    if (!component) continue;
    if (component.type === 1 && Array.isArray(component.components)) {
      flushButtons();
      const rowButtons: ButtonBuilder[] = [];
      let rowSelect: StringSelectMenuBuilder | null = null;
      for (const child of component.components) {
        if (child.type === 2) {
          const button = buildButton(child, publicationId, diagnostics);
          if (button) rowButtons.push(button);
        } else if (child.type === 3) {
          rowSelect = buildStringSelect(child, publicationId, diagnostics);
        }
      }
      if (rowSelect && rowButtons.length > 0) {
        diagnostics.push({
          level: "warning",
          code: "ROW_MIXED_COMPONENTS",
          message: "Action row mixed buttons and select menus. Select menu was skipped.",
        });
        rowSelect = null;
      }
      if (rowButtons.length > 0) {
        rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(...rowButtons.slice(0, 5)));
      } else if (rowSelect) {
        rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(rowSelect));
      }
      continue;
    }

    if (component.type === 2) {
      const button = buildButton(component, publicationId, diagnostics);
      if (button) buttonBuffer.push(button);
      if (buttonBuffer.length >= 5) flushButtons();
      continue;
    }

    if (component.type === 3) {
      flushButtons();
      const select = buildStringSelect(component, publicationId, diagnostics);
      if (select) rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select));
    }
  }

  flushButtons();
  return rows.slice(0, 5);
}

export function buildStudioDiscordPayload(
  snapshot: StudioPublicationSnapshot,
  publicationId: number,
  tokenContext?: StudioTokenContext,
) {
  const diagnostics = [...(snapshot.diagnostics || [])];
  const resolvedContent = tokenContext
    ? resolveStudioTokensInValue(snapshot.render.content || "", tokenContext)
    : snapshot.render.content || "";
  const resolvedComponents = tokenContext
    ? resolveStudioTokensInValue(snapshot.render.components || [], tokenContext)
    : snapshot.render.components || [];
  const embeds = buildStudioEmbedBuilders(snapshot, tokenContext);
  const components = buildActionRows(resolvedComponents, publicationId, diagnostics);

  return {
    content: resolvedContent || undefined,
    embeds,
    components,
    diagnostics,
  };
}
