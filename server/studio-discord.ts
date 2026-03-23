import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
} from "discord.js";
import {
  ContainerBuilder,
  FileBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  SectionBuilder,
  SeparatorBuilder,
  TextDisplayBuilder,
} from "@discordjs/builders";
import { existsSync } from "node:fs";
import path from "node:path";
import type {
  EmbedComponentOption,
  EmbedComponentType,
  StudioDiagnostic,
  StudioPublishPlan,
  StudioPublishAttachment,
} from "@shared/schema";
import { COMPONENT_TYPES } from "@shared/schema";
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

function toAttachmentFilename(value: string, fallback: string) {
  const base = path.basename(value || fallback).replace(/[^a-zA-Z0-9._-]/g, "-");
  return base || fallback;
}

function toStudioUploadPath(url: string) {
  const normalized = String(url || "").trim().replace(/^https?:\/\/[^/]+/i, "");
  const relative = normalized.replace(/^\/+/, "");
  const absolute = path.resolve(process.cwd(), relative);
  return existsSync(absolute) ? absolute : null;
}

function isBuilderLike(value: unknown): value is { toJSON: () => any } {
  return Boolean(value && typeof value === "object" && typeof (value as any).toJSON === "function");
}

function isRawDiscordComponent(value: unknown): value is Record<string, unknown> {
  return Boolean(
    value &&
    typeof value === "object" &&
    typeof (value as any).type === "number" &&
    !("action" in (value as any)) &&
    !("options" in (value as any) && Array.isArray((value as any).options) && (value as any).options.some((option: any) => option?.action)),
  );
}

export function buildStudioEmbedBuilders(embedsInput: unknown[], tokenContext?: StudioTokenContext) {
  const resolvedEmbeds = tokenContext
    ? resolveStudioTokensInValue(embedsInput || [], tokenContext)
    : (embedsInput || []);

  return (resolvedEmbeds as any[]).flatMap((rawEmbed: any) => {
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
        rawEmbed.fields.slice(0, 25).map((field: any) => ({
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

function buildPayloadFiles(attachmentsInput: StudioPublishAttachment[] | undefined) {
  const files: AttachmentBuilder[] = [];
  const attachmentMap = new Map<string, { name: string; url: string }>();

  for (const attachment of attachmentsInput || []) {
    if (attachment.source !== "asset") continue;
    const absolutePath = toStudioUploadPath(attachment.url);
    if (!absolutePath) continue;
    const baseName = toAttachmentFilename(attachment.url, `${attachment.id || "studio-file"}.bin`);
    const name = attachment.spoiler && !baseName.startsWith("SPOILER_") ? `SPOILER_${baseName}` : baseName;
    files.push(new AttachmentBuilder(absolutePath, { name }));
    attachmentMap.set(attachment.url, { name, url: attachment.url });
    if (attachment.id) attachmentMap.set(attachment.id, { name, url: attachment.url });
  }

  return { files, attachmentMap };
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

function buildV2Component(
  component: EmbedComponentType,
  publicationId: number,
  diagnostics: StudioDiagnostic[],
  attachmentMap: Map<string, { name: string; url: string }>,
) {
  switch (component.type) {
    case COMPONENT_TYPES.TEXT_DISPLAY:
      return new TextDisplayBuilder().setContent(String(component.content || ""));
    case COMPONENT_TYPES.SEPARATOR:
      return new SeparatorBuilder({
        divider: component.divider ?? true,
        spacing: component.spacing === "large" ? 2 : 1,
      });
    case COMPONENT_TYPES.FILE: {
      const url = String(component.url || "").trim();
      const attachment = attachmentMap.get(url) || attachmentMap.get(String(component.id || ""));
      if (!attachment) {
        diagnostics.push({
          level: "warning",
          code: "FILE_ATTACHMENT_MISSING",
          message: `File ${component.id || component.label || "file"} is missing a publishable attachment.`,
        });
        return null;
      }
      return new FileBuilder().setURL(`attachment://${attachment.name}`).setSpoiler(Boolean(component.spoiler));
    }
    case COMPONENT_TYPES.MEDIA_GALLERY: {
      const items = Array.isArray(component.items) ? component.items : [];
      if (items.length === 0) {
        diagnostics.push({
          level: "warning",
          code: "MEDIA_GALLERY_EMPTY",
          message: "Media gallery had no valid items for live publish.",
        });
        return null;
      }
      return new MediaGalleryBuilder().addItems(
        ...items.map((item) =>
          new MediaGalleryItemBuilder({
            description: item.description,
            spoiler: Boolean(item.spoiler),
            media: { url: String(item.url) },
          }),
        ),
      );
    }
    case COMPONENT_TYPES.SECTION: {
      const section = new SectionBuilder();
      const textChildren = (component.components || []).filter((child) => child.type === COMPONENT_TYPES.TEXT_DISPLAY);
      if (textChildren.length === 0) {
        diagnostics.push({
          level: "warning",
          code: "SECTION_TEXT_EMPTY",
          message: "Section had no text display content for live publish.",
        });
        return null;
      }
      section.addTextDisplayComponents(
        ...textChildren.map((child) => new TextDisplayBuilder().setContent(String(child.content || ""))),
      );
      if (component.accessory?.type === COMPONENT_TYPES.BUTTON) {
        const button = buildButton(component.accessory, publicationId, diagnostics);
        if (button) section.setButtonAccessory(button as any);
      }
      return section;
    }
    case COMPONENT_TYPES.CONTAINER: {
      const container = new ContainerBuilder();
      const accentColor = parseColor(component.accentColor);
      if (accentColor !== null) container.setAccentColor(accentColor);
      container.setSpoiler(Boolean(component.spoiler));
      for (const child of component.components || []) {
        const built = buildV2Component(child, publicationId, diagnostics, attachmentMap);
        if (!built) continue;
        container.spliceComponents(
          container.components.length,
          0,
          safeToApiComponent(built, diagnostics, child) as any,
        );
      }
      return container;
    }
    case COMPONENT_TYPES.ACTION_ROW:
      return buildActionRows([component], publicationId, diagnostics)[0] || null;
    case COMPONENT_TYPES.BUTTON:
      return buildButton(component, publicationId, diagnostics);
    case COMPONENT_TYPES.SELECT_MENU:
      return buildStringSelect(component, publicationId, diagnostics);
    default:
      diagnostics.push({
        level: "warning",
        code: "UNSUPPORTED_V2_COMPONENT",
        message: `Unsupported live component type ${component.type}.`,
      });
      return null;
  }
}

function safeToApiComponent(
  input: unknown,
  diagnostics: StudioDiagnostic[],
  source?: { type?: number; id?: string },
) {
  if (!input) return null;
  if (isBuilderLike(input)) return input.toJSON();
  if (isRawDiscordComponent(input)) return input;
  diagnostics.push({
    level: "warning",
    code: "SERIALIZER_GAP",
    message: `Component ${source?.id || source?.type || "unknown"} could not be converted into Discord API JSON safely.`,
  });
  return null;
}

function buildStudioMessageComponents(
  componentsInput: Array<EmbedComponentType | Record<string, unknown> | { toJSON: () => any }> | undefined,
  publicationId: number,
  diagnostics: StudioDiagnostic[],
  attachmentMap: Map<string, { name: string; url: string }>,
) {
  const built: any[] = [];

  for (const component of componentsInput || []) {
    if (isBuilderLike(component)) {
      const next = safeToApiComponent(component, diagnostics);
      if (next) built.push(next);
      continue;
    }
    if (isRawDiscordComponent(component)) {
      built.push(component);
      continue;
    }
    const next = buildV2Component(component as EmbedComponentType, publicationId, diagnostics, attachmentMap);
    const json = safeToApiComponent(next, diagnostics, component as any);
    if (!json) continue;
    built.push(json);
  }

  return built;
}

export function buildStudioDiscordPayload(
  plan: StudioPublishPlan,
  publicationId: number,
  tokenContext?: StudioTokenContext,
) {
  const diagnostics = [...(plan.diagnostics || [])];
  const resolvedContent = tokenContext
    ? resolveStudioTokensInValue(plan.liveMessage.content || "", tokenContext)
    : plan.liveMessage.content || "";
  const resolvedComponents = tokenContext
    ? resolveStudioTokensInValue(plan.liveMessage.components || [], tokenContext)
    : plan.liveMessage.components || [];
  const embeds = buildStudioEmbedBuilders(plan.liveMessage.embeds || [], tokenContext);
  const { files, attachmentMap } = buildPayloadFiles(plan.liveMessage.attachments || []);
  const components = buildStudioMessageComponents(resolvedComponents as any, publicationId, diagnostics, attachmentMap);

  return {
    content: resolvedContent || undefined,
    embeds,
    components,
    files,
    flags: plan.liveMessage.flags,
    diagnostics,
  };
}
