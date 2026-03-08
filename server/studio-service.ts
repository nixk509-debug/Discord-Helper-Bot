import { and, desc, eq, or, sql } from "drizzle-orm";
import { db } from "./db";
import {
  COMPONENT_TYPES,
  studioDocuments,
  studioPublications,
  studioPublicationSnapshots,
  studioRuntimeEvents,
  templates,
  type EmbedComponentOption,
  type EmbedComponentType,
  type EmbedFieldType,
  type InteractiveActionConfig,
  type StudioAction,
  type StudioDiagnostic,
  type StudioDividerPreset,
  type StudioDocument,
  type StudioDocumentKind,
  type StudioDocumentRecord,
  type StudioDocumentScope,
  type StudioEmbedDraft,
  type StudioModalDefinition,
  type StudioNode,
  type StudioPublication,
  type StudioPublicationSnapshot,
  type StudioPublicationSnapshotRecord,
  type StudioRuntimeEvent,
  type StudioStyleBlockPreset,
  type StudioThemePack,
  type Template,
} from "@shared/schema";

export const STUDIO_TEMPLATE_TYPE = "design_studio";
export const DEFAULT_STUDIO_ENTRY_VIEW = "entry";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function makeId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createDefaultStudioDocument(input?: {
  name?: string;
  category?: string;
  moduleBinding?: string;
}): StudioDocument {
  const entryViewId = DEFAULT_STUDIO_ENTRY_VIEW;
  const rootTextId = makeId("txt");
  const verifyActionId = makeId("act");
  const ticketCreateActionId = makeId("act");
  const buttonId = makeId("btn");
  const dividerId = makeId("div");
  const modalId = makeId("modal");
  const topicFieldId = makeId("field");
  const detailFieldId = makeId("field");

  const binding = input?.moduleBinding || "";
  const title = input?.name || "Untitled Surface";
  const introText =
    binding === "verify"
      ? "Read the requirements and use the button below to continue."
      : binding === "ticket_panel"
        ? "Open a support flow from the panel below."
        : "Build an interactive surface for your Discord server.";

  return {
    version: 2,
    meta: {
      name: title,
      category: input?.category || "surface",
      entryViewId,
    },
    views: {
      [entryViewId]: {
        id: entryViewId,
        name: "Entry",
        messageContent: "",
        embeds: [{
          title,
          description: introText,
          color: "#B11226",
        }],
        rootNodeIds: [rootTextId, dividerId, buttonId],
      },
    },
    nodes: {
      [rootTextId]: {
        id: rootTextId,
        type: "text_display",
        viewId: entryViewId,
        childIds: [],
        props: {
          text: binding === "welcome"
            ? "Introduce the server, key channels, and how to get started."
            : "Use this document to author reusable Discord interactions.",
        },
      },
      [dividerId]: {
        id: dividerId,
        type: "divider",
        viewId: entryViewId,
        childIds: [],
        props: {
          mode: "symbol",
          symbol: "•",
          repeat: 6,
        },
      },
      [buttonId]: {
        id: buttonId,
        type: "button",
        viewId: entryViewId,
        childIds: [],
        actionId: verifyActionId,
        props: {
          label: binding === "verify" ? "Verify" : binding === "ticket_panel" ? "Open Ticket" : "Continue",
          style: 1,
        },
      },
    },
    actions: {
      [verifyActionId]: {
        id: verifyActionId,
        type: binding === "verify" ? "confirm" : binding === "ticket_panel" ? "open_modal" : "reply_message",
        label: binding === "verify" ? "Confirm access" : binding === "ticket_panel" ? "Open intake modal" : "Reply with confirmation",
        response: {
          mode: "inline",
          inline: {
            content: binding === "verify" ? "Verification confirmed." : binding === "ticket_panel" ? "Fill out the ticket intake form." : "Action received.",
          },
        },
        replyMode: "ephemeral",
        modalId: binding === "ticket_panel" ? modalId : undefined,
      },
      ...(binding === "ticket_panel" ? {
        [ticketCreateActionId]: {
          id: ticketCreateActionId,
          type: "ticket_create" as const,
          label: "Create support ticket",
          replyMode: "ephemeral" as const,
          response: {
            mode: "inline" as const,
            inline: {
              content: "A new support ticket has been opened.",
              embeds: [
                {
                  title: "Support Request",
                  description: "A team member will join this ticket shortly. Include extra details or screenshots in the channel.",
                  color: "#5865F2",
                },
              ],
            },
          },
        },
      } : {}),
    },
    modals: binding === "ticket_panel" ? {
      [modalId]: {
        id: modalId,
        title: "Open Support Ticket",
        customIdSeed: "ticket_intake",
        fields: [
          {
            id: topicFieldId,
            label: "Topic",
            style: "short",
            placeholder: "Billing, report, bug, access issue...",
            required: true,
            minLength: 2,
            maxLength: 100,
          },
          {
            id: detailFieldId,
            label: "Details",
            style: "paragraph",
            placeholder: "Tell the team what you need and include any relevant context.",
            required: true,
            minLength: 5,
            maxLength: 1000,
          },
        ],
        submitActionIds: [ticketCreateActionId],
      },
    } : {},
    assets: [],
    libraries: {
      dividerPresetIds: [],
      styleBlockIds: [],
      themePackIds: [],
    },
    design: {
      dividerPresets: [],
      styleBlocks: [],
      themePacks: [],
    },
  };
}

function legacyBlockToNodes(
  block: any,
  viewId: string,
  actions: Record<string, StudioAction>,
): StudioNode[] {
  const id = String(block?.id || makeId("legacy"));
  const typeMap: Record<string, StudioNode["type"]> = {
    container: "container",
    section: "section",
    text_display: "text_display",
    media_gallery: "media_gallery",
    file: "file",
    action_row: "action_row",
    button: "button",
    select_menu: "string_select",
  };
  const mappedType = typeMap[String(block?.type || "")] || "text_display";
  const node: StudioNode = {
    id,
    type: mappedType,
    viewId,
    childIds: [],
    props: {
      label: block?.label,
      text: block?.content,
      url: block?.url,
      row: block?.row,
      style: block?.style,
      customId: block?.customId,
      placeholder: block?.placeholder,
      options: Array.isArray(block?.options) ? block.options : [],
    },
  };

  if (mappedType === "button") {
    const actionId = makeId("legacy_action");
    node.actionId = actionId;
    actions[actionId] = block?.style === 5 && block?.url
      ? { id: actionId, type: "open_url", url: String(block.url) }
      : {
          id: actionId,
          type: "confirm",
          label: String(block?.label || "Confirm"),
          replyMode: "ephemeral",
          response: { mode: "inline", inline: { content: "Action received." } },
        };
  }

  if (mappedType === "string_select") {
    const options = Array.isArray(block?.options) ? block.options : [];
    const optionActionIds: Record<string, string> = {};
    node.optionActionIds = optionActionIds;
    node.props.options = options.map((option: any) => {
      const actionId = makeId("legacy_option");
      optionActionIds[String(option?.value || actionId)] = actionId;
      actions[actionId] = {
        id: actionId,
        type: "reply_message",
        replyMode: "ephemeral",
        response: {
          mode: "inline",
          inline: { content: `Selected ${String(option?.label || option?.value || "option")}.` },
        },
      };
      return {
        id: String(option?.id || makeId("opt")),
        label: String(option?.label || "Option"),
        value: String(option?.value || option?.id || makeId("value")),
      };
    });
  }

  return [node];
}

export function legacyStudioPayloadToDocument(payload: any, templateName: string): StudioDocument {
  const entryViewId = DEFAULT_STUDIO_ENTRY_VIEW;
  const actions: Record<string, StudioAction> = {};
  const legacyBlocks = Array.isArray(payload?.blocks) ? payload.blocks : [];
  const nodes = Object.fromEntries(
    legacyBlocks
      .flatMap((block: any) => legacyBlockToNodes(block, entryViewId, actions))
      .map((node) => [node.id, node]),
  );

  return {
    version: 2,
    meta: {
      name: String(payload?.name || templateName),
      category: String(payload?.category || "template"),
      entryViewId,
    },
    views: {
      [entryViewId]: {
        id: entryViewId,
        name: "Entry",
        messageContent: String(payload?.message || ""),
        embeds: Array.isArray(payload?.embeds) ? payload.embeds : [],
        rootNodeIds: Object.keys(nodes),
      },
    },
    nodes,
    actions,
    modals: {},
    assets: Array.isArray(payload?.assets) ? payload.assets : [],
    libraries: {
      dividerPresetIds: [],
      styleBlockIds: [],
      themePackIds: [],
    },
    design: {
      dividerPresets: [],
      styleBlocks: [],
      themePacks: [],
    },
  };
}

export function normalizeStudioDocument(document: any, fallbackName = "Untitled Surface"): StudioDocument {
  if (document && typeof document === "object" && document.version === 2 && document.meta?.entryViewId) {
    return {
      version: 2,
      meta: {
        name: String(document.meta?.name || fallbackName),
        category: document.meta?.category ? String(document.meta.category) : "surface",
        entryViewId: String(document.meta.entryViewId),
        themePackId: document.meta?.themePackId ? String(document.meta.themePackId) : undefined,
      },
      views: document.views || {},
      nodes: document.nodes || {},
      actions: document.actions || {},
      modals: document.modals || {},
      assets: Array.isArray(document.assets) ? document.assets : [],
      libraries: {
        dividerPresetIds: Array.isArray(document.libraries?.dividerPresetIds) ? document.libraries.dividerPresetIds : [],
        styleBlockIds: Array.isArray(document.libraries?.styleBlockIds) ? document.libraries.styleBlockIds : [],
        themePackIds: Array.isArray(document.libraries?.themePackIds) ? document.libraries.themePackIds : [],
      },
      design: {
        dividerPresets: Array.isArray(document.design?.dividerPresets) ? document.design.dividerPresets : [],
        styleBlocks: Array.isArray(document.design?.styleBlocks) ? document.design.styleBlocks : [],
        themePacks: Array.isArray(document.design?.themePacks) ? document.design.themePacks : [],
      },
    };
  }

  return legacyStudioPayloadToDocument(document || {}, fallbackName);
}

export async function migrateLegacyDesignStudioTemplates(serverId: number, userId: number) {
  const legacyTemplates = await db.select().from(templates).where(
    and(
      eq(templates.serverId, serverId),
      eq(templates.userId, userId),
      eq(templates.type, STUDIO_TEMPLATE_TYPE),
    ),
  );

  for (const template of legacyTemplates) {
    const slug = `legacy-template-${template.id}`;
    const [existing] = await db.select().from(studioDocuments).where(
      and(eq(studioDocuments.serverId, serverId), eq(studioDocuments.slug, slug)),
    );
    if (existing) continue;

    await db.insert(studioDocuments).values({
      serverId,
      ownerUserId: userId,
      scope: "personal",
      kind: "template",
      name: template.name,
      slug,
      moduleBinding: null,
      document: normalizeStudioDocument(template.data, template.name),
      isArchived: false,
    } as any);
  }
}

export async function listStudioDocuments(serverId: number, userId: number) {
  await migrateLegacyDesignStudioTemplates(serverId, userId);
  return db.select().from(studioDocuments).where(
    and(
      eq(studioDocuments.serverId, serverId),
      or(
        eq(studioDocuments.scope, "server"),
        eq(studioDocuments.scope, "starter"),
        and(eq(studioDocuments.scope, "personal"), eq(studioDocuments.ownerUserId, userId)),
      ),
    ),
  ).orderBy(desc(studioDocuments.updatedAt));
}

export async function getStudioDocumentById(id: number) {
  const [document] = await db.select().from(studioDocuments).where(eq(studioDocuments.id, id));
  return document;
}

export async function createStudioDocumentRecord(input: {
  serverId: number;
  ownerUserId?: number | null;
  scope: StudioDocumentScope;
  kind: StudioDocumentKind;
  name: string;
  slug?: string | null;
  moduleBinding?: string | null;
  document: StudioDocument;
  isArchived?: boolean;
}) {
  const [created] = await db.insert(studioDocuments).values({
    ...input,
    slug: input.slug || slugify(input.name),
    updatedAt: new Date(),
    isArchived: Boolean(input.isArchived),
  } as any).returning();
  return created;
}

export async function updateStudioDocumentRecord(id: number, patch: Partial<StudioDocumentRecord>) {
  const [updated] = await db.update(studioDocuments)
    .set({ ...patch, updatedAt: new Date() } as any)
    .where(eq(studioDocuments.id, id))
    .returning();
  return updated;
}

export async function listStudioPublications(serverId: number) {
  return db.select().from(studioPublications)
    .where(eq(studioPublications.serverId, serverId))
    .orderBy(desc(studioPublications.updatedAt));
}

export async function getStudioPublicationById(id: number) {
  const [publication] = await db.select().from(studioPublications).where(eq(studioPublications.id, id));
  return publication;
}

export async function getStudioPublicationByMessage(serverId: number, channelId: string, messageId: string) {
  const [publication] = await db.select().from(studioPublications).where(
    and(
      eq(studioPublications.serverId, serverId),
      eq(studioPublications.channelId, channelId),
      eq(studioPublications.messageId, messageId),
    ),
  );
  return publication;
}

export async function createStudioPublicationRecord(input: {
  serverId: number;
  documentId: number;
  channelId: string;
  messageId: string;
  currentViewId: string;
}) {
  const [created] = await db.insert(studioPublications).values({
    ...input,
    status: "published",
    active: true,
    lastPublishedAt: new Date(),
    updatedAt: new Date(),
  } as any).returning();
  return created;
}

export async function updateStudioPublicationRecord(id: number, patch: Partial<StudioPublication>) {
  const [updated] = await db.update(studioPublications)
    .set({ ...patch, updatedAt: new Date() } as any)
    .where(eq(studioPublications.id, id))
    .returning();
  return updated;
}

export async function listStudioPublicationSnapshots(publicationId: number) {
  return db.select().from(studioPublicationSnapshots)
    .where(eq(studioPublicationSnapshots.publicationId, publicationId))
    .orderBy(desc(studioPublicationSnapshots.version));
}

export async function getStudioPublicationSnapshotById(id: number) {
  const [snapshot] = await db.select().from(studioPublicationSnapshots).where(eq(studioPublicationSnapshots.id, id));
  return snapshot;
}

export async function getCurrentStudioPublicationSnapshot(publicationId: number) {
  const [snapshot] = await db.select().from(studioPublicationSnapshots)
    .where(eq(studioPublicationSnapshots.publicationId, publicationId))
    .orderBy(desc(studioPublicationSnapshots.version))
    .limit(1);
  return snapshot;
}

export async function createStudioPublicationSnapshotRecord(input: {
  publicationId: number;
  createdByUserId?: number | null;
  snapshot: StudioPublicationSnapshot;
}) {
  const [{ nextVersion }] = await db.select({
    nextVersion: sql<number>`coalesce(max(${studioPublicationSnapshots.version}), 0) + 1`,
  }).from(studioPublicationSnapshots).where(eq(studioPublicationSnapshots.publicationId, input.publicationId));

  const [created] = await db.insert(studioPublicationSnapshots).values({
    publicationId: input.publicationId,
    version: Number(nextVersion || 1),
    snapshot: input.snapshot,
    createdByUserId: input.createdByUserId ?? null,
  } as any).returning();
  return created;
}

export async function recordStudioRuntimeEvent(input: {
  serverId: number;
  publicationId?: number | null;
  documentId?: number | null;
  severity: "info" | "warning" | "error";
  eventType: string;
  summary: string;
  details?: unknown;
  nodeId?: string;
  actionId?: string;
}) {
  const [created] = await db.insert(studioRuntimeEvents).values({
    ...input,
    publicationId: input.publicationId ?? null,
    documentId: input.documentId ?? null,
    details: input.details ?? null,
  } as any).returning();
  return created;
}

export async function listStudioRuntimeEvents(serverId: number, publicationId?: number) {
  return db.select().from(studioRuntimeEvents).where(
    publicationId
      ? and(eq(studioRuntimeEvents.serverId, serverId), eq(studioRuntimeEvents.publicationId, publicationId))
      : eq(studioRuntimeEvents.serverId, serverId),
  ).orderBy(desc(studioRuntimeEvents.occurredAt));
}

export function getStudioView(document: StudioDocument, requestedViewId?: string) {
  const viewId = requestedViewId || document.meta.entryViewId;
  return document.views[viewId] || document.views[document.meta.entryViewId];
}

function buildDividerText(props: Record<string, unknown>): string {
  const mode = String(props.mode || "line");
  const repeat = Math.max(1, Math.min(12, Number(props.repeat || 5)));
  if (mode === "emoji") {
    const emoji = String(props.emoji || "✨");
    return Array.from({ length: repeat }, () => emoji).join(" ");
  }
  if (mode === "symbol") {
    const symbol = String(props.symbol || "•");
    return Array.from({ length: repeat }, () => symbol).join(" ");
  }
  if (mode === "stacked") {
    const text = String(props.text || "────");
    return Array.from({ length: Math.min(3, repeat) }, () => text).join("\n");
  }
  return String(props.text || "────────");
}

function buildStyleBlockEmbed(node: StudioNode): StudioEmbedDraft {
  const variant = String(node.props.variant || "warning_strip");
  const accentColor = String(node.props.accentColor || "#B11226");
  const titleByVariant: Record<string, string> = {
    warning_strip: "Warning",
    rules_block: "Rules",
    locked_access: "Locked Access",
    archive_card: "Archive",
    red_alert: "Alert",
    spotlight_card: "Spotlight",
  };
  return {
    title: String(node.props.title || titleByVariant[variant] || "Panel"),
    description: String(node.props.description || node.props.text || ""),
    color: accentColor,
  };
}

function appendContentPart(parts: string[], nextValue?: string | null) {
  const value = String(nextValue || "").trim();
  if (!value) return;
  parts.push(value);
}

export function renderStudioDocumentView(document: StudioDocument, requestedViewId?: string) {
  const diagnostics: StudioDiagnostic[] = [];
  const view = getStudioView(document, requestedViewId);
  if (!view) {
    return {
      content: "",
      embeds: [] as StudioEmbedDraft[],
      interactiveComponents: [] as EmbedComponentType[],
      diagnostics: [{ level: "error", code: "VIEW_NOT_FOUND", message: "Studio view could not be resolved." }],
      viewId: document.meta.entryViewId,
    };
  }

  const contentParts: string[] = [];
  appendContentPart(contentParts, view.messageContent);
  const embeds: StudioEmbedDraft[] = Array.isArray(view.embeds) ? [...view.embeds] : [];
  const interactiveComponents: EmbedComponentType[] = [];

  const visitNode = (nodeId: string) => {
    const node = document.nodes[nodeId];
    if (!node) {
      diagnostics.push({ level: "warning", code: "NODE_MISSING", message: `Missing node ${nodeId}.`, path: nodeId });
      return;
    }

    switch (node.type) {
      case "container":
      case "section": {
        appendContentPart(contentParts, node.props.heading ? `**${String(node.props.heading)}**` : "");
        appendContentPart(contentParts, node.props.description ? String(node.props.description) : "");
        node.childIds.forEach(visitNode);
        return;
      }
      case "text_display": {
        appendContentPart(contentParts, String(node.props.text || ""));
        return;
      }
      case "divider": {
        appendContentPart(contentParts, buildDividerText(node.props));
        return;
      }
      case "style_block": {
        embeds.push(buildStyleBlockEmbed(node));
        return;
      }
      case "media_gallery": {
        const items = Array.isArray(node.props.items) ? node.props.items : [];
        for (const item of items.slice(0, 4)) {
          const url = String((item as any)?.url || "").trim();
          if (!url) continue;
          embeds.push({
            title: String(node.props.title || ""),
            description: String((item as any)?.description || ""),
            imageUrl: url,
            color: String(node.props.accentColor || "#5865F2"),
          });
        }
        if (items.length === 0) {
          diagnostics.push({ level: "warning", code: "MEDIA_EMPTY", message: "Media gallery has no items.", path: node.id });
        }
        return;
      }
      case "file": {
        const url = String(node.props.url || "").trim();
        if (url) {
          appendContentPart(contentParts, `[${String(node.props.label || "Attachment")}](${url})`);
        } else {
          diagnostics.push({ level: "warning", code: "FILE_URL_MISSING", message: "File block is missing a URL.", path: node.id });
        }
        return;
      }
      case "action_row": {
        const rowComponents = node.childIds
          .map((childId) => renderInteractiveNode(document, childId, diagnostics))
          .filter((entry): entry is EmbedComponentType => Boolean(entry));
        if (rowComponents.length > 0) {
          interactiveComponents.push({
            type: COMPONENT_TYPES.ACTION_ROW,
            components: rowComponents,
          });
        }
        return;
      }
      case "button":
      case "string_select":
      case "role_select":
      case "user_select":
      case "channel_select":
      case "mentionable_select": {
        const interactive = renderInteractiveNode(document, node.id, diagnostics);
        if (interactive) interactiveComponents.push(interactive);
        return;
      }
      default: {
        diagnostics.push({ level: "info", code: "NODE_PREVIEW_ONLY", message: `${node.type} is preview-only in this runtime path.`, path: node.id });
      }
    }
  };

  view.rootNodeIds.forEach(visitNode);

  return {
    content: contentParts.join("\n\n").trim(),
    embeds: embeds.slice(0, 10),
    interactiveComponents,
    diagnostics,
    viewId: view.id,
  };
}

function renderInteractiveNode(document: StudioDocument, nodeId: string, diagnostics: StudioDiagnostic[]) {
  const node = document.nodes[nodeId];
  if (!node) return null;

  if (node.type === "button") {
    const action = node.actionId ? document.actions[node.actionId] : undefined;
    if (!action) {
      diagnostics.push({ level: "warning", code: "BUTTON_ACTION_MISSING", message: "Button has no bound action.", path: node.id });
    }
    return {
      type: COMPONENT_TYPES.BUTTON,
      id: node.id,
      label: String(node.props.label || "Button"),
      style: Number(node.props.style || 1),
      emoji: node.props.emoji ? String(node.props.emoji) : undefined,
      disabled: Boolean(node.props.disabled || action?.disabled),
      url: action?.type === "open_url" ? action.url : undefined,
      action,
    } as EmbedComponentType;
  }

  if (node.type === "string_select") {
    const options = Array.isArray(node.props.options) ? node.props.options : [];
    const preparedOptions: EmbedComponentOption[] = options.slice(0, 25).map((option: any) => {
      const value = String(option?.value || makeId("option"));
      const actionId = node.optionActionIds?.[value];
      return {
        label: String(option?.label || "Option"),
        value,
        description: option?.description ? String(option.description) : undefined,
        emoji: option?.emoji ? String(option.emoji) : undefined,
        action: actionId ? document.actions[actionId] : undefined,
      };
    });
    return {
      type: COMPONENT_TYPES.SELECT_MENU,
      id: node.id,
      customId: String(node.props.customId || node.id),
      placeholder: String(node.props.placeholder || "Choose an option"),
      disabled: Boolean(node.props.disabled),
      options: preparedOptions,
      action: node.actionId ? document.actions[node.actionId] : undefined,
    } as EmbedComponentType;
  }

  diagnostics.push({
    level: "info",
    code: "INTERACTIVE_RUNTIME_GATED",
    message: `${node.type} is schema-ready but runtime-gated in this pass.`,
    path: node.id,
  });
  return null;
}

export function studioEmbedsToFields(embeds: StudioEmbedDraft[] | undefined): EmbedFieldType[] {
  return (embeds || []).flatMap((embed, index) => {
    if (!embed.title && !embed.description) return [];
    return [{
      name: embed.title || `Embed ${index + 1}`,
      value: embed.description || "-",
      inline: false,
    }];
  });
}
