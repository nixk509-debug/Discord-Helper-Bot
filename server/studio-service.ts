import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "./db";
import {
  COMPONENT_TYPES,
  studioDocuments,
  studioLibraryItems,
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
  type StudioLibraryCategory,
  type StudioLibraryItemRecord,
  type StudioLibraryScope,
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
import { serializeStudioDocumentView, type StudioDocumentRenderOptions } from "@shared/studio-document";
import { createMigratedStudioDocument, inferStudioDraftMode } from "@shared/studio/migrate";

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
  const title = input?.name || "Untitled Project";
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
      mode: "standard",
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
      .map((node: any) => [node.id, node]),
  );

  return {
    version: 2,
    meta: {
      name: String(payload?.name || templateName),
      category: String(payload?.category || "template"),
      entryViewId,
      mode: inferStudioDraftMode({
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
      }),
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

export function normalizeStudioDocument(document: any, fallbackName = "Untitled Project"): StudioDocument {
  if (document && typeof document === "object" && document.version === 2 && document.meta?.entryViewId) {
    const migrated = createMigratedStudioDocument({
      version: 2,
      meta: {
        name: String(document.meta?.name || fallbackName),
        category: document.meta?.category ? String(document.meta.category) : "surface",
        entryViewId: String(document.meta.entryViewId),
        mode: document.meta?.mode === "layout_v2" ? "layout_v2" : document.meta?.mode === "standard" ? "standard" : undefined,
        themePackId: document.meta?.themePackId ? String(document.meta.themePackId) : undefined,
        migration: document.meta?.migration,
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
    });
    return migrated.document;
  }

  return createMigratedStudioDocument(legacyStudioPayloadToDocument(document || {}, fallbackName)).document;
}

function hasPersistentStudioOwner(userId: number | null | undefined): userId is number {
  return typeof userId === "number" && userId > 0;
}

export async function migrateLegacyDesignStudioTemplates(serverId: number, userId: number | null | undefined) {
  if (!hasPersistentStudioOwner(userId)) return;

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

export async function listStudioDocuments(serverId: number, userId: number | null | undefined) {
  await migrateLegacyDesignStudioTemplates(serverId, userId);

  const scopeFilter = hasPersistentStudioOwner(userId)
    ? or(
        eq(studioDocuments.scope, "server"),
        eq(studioDocuments.scope, "starter"),
        and(eq(studioDocuments.scope, "personal"), eq(studioDocuments.ownerUserId, userId)),
      )
    : or(eq(studioDocuments.scope, "server"), eq(studioDocuments.scope, "starter"));

  return db.select().from(studioDocuments).where(
    and(
      eq(studioDocuments.serverId, serverId),
      scopeFilter,
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
  const usePersonalScope = input.scope === "personal" && hasPersistentStudioOwner(input.ownerUserId);
  const normalizedScope = input.scope === "personal" ? (usePersonalScope ? "personal" : "server") : input.scope;
  const [created] = await db.insert(studioDocuments).values({
    ...input,
    scope: normalizedScope,
    ownerUserId: usePersonalScope ? input.ownerUserId : null,
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

export async function deleteStudioDocumentRecord(id: number) {
  await db.delete(studioDocuments).where(eq(studioDocuments.id, id));
}

export async function listStudioLibraryItems(
  serverId: number,
  userId: number | null | undefined,
  options?: {
    scope?: StudioLibraryScope | "all";
    category?: StudioLibraryCategory | "all";
    search?: string;
    favoritesOnly?: boolean;
  },
) {
  const filters: any[] = [eq(studioLibraryItems.serverId, serverId)];
  const allowPersonalScope = hasPersistentStudioOwner(userId);

  if (options?.scope === "server") {
    filters.push(eq(studioLibraryItems.scope, "server"));
  } else if (options?.scope === "personal") {
    if (!allowPersonalScope) {
      return [];
    }
    filters.push(and(eq(studioLibraryItems.scope, "personal"), eq(studioLibraryItems.ownerUserId, userId)));
  } else {
    if (allowPersonalScope) {
      filters.push(
        or(
          eq(studioLibraryItems.scope, "server"),
          and(eq(studioLibraryItems.scope, "personal"), eq(studioLibraryItems.ownerUserId, userId)),
        ),
      );
    } else {
      filters.push(eq(studioLibraryItems.scope, "server"));
    }
  }

  if (options?.category && options.category !== "all") {
    filters.push(eq(studioLibraryItems.category, options.category));
  }

  if (options?.favoritesOnly) {
    filters.push(eq(studioLibraryItems.favorite, true));
  }

  const search = options?.search?.trim();
  if (search) {
    const pattern = `%${search}%`;
    filters.push(
      or(
        ilike(studioLibraryItems.name, pattern),
        sql`cast(${studioLibraryItems.tags} as text) ilike ${pattern}`,
      ),
    );
  }

  return db.select().from(studioLibraryItems).where(and(...filters)).orderBy(desc(studioLibraryItems.updatedAt));
}

export async function getStudioLibraryItemById(id: number) {
  const [item] = await db.select().from(studioLibraryItems).where(eq(studioLibraryItems.id, id));
  return item;
}

export async function createStudioLibraryItem(input: {
  serverId: number;
  ownerUserId?: number | null;
  scope: StudioLibraryScope;
  category: StudioLibraryCategory;
  name: string;
  payload: Record<string, unknown>;
  tags?: string[];
  favorite?: boolean;
}) {
  const usePersonalScope = input.scope === "personal" && hasPersistentStudioOwner(input.ownerUserId);
  const normalizedScope = input.scope === "personal" ? (usePersonalScope ? "personal" : "server") : input.scope;
  const [created] = await db.insert(studioLibraryItems).values({
    ...input,
    scope: normalizedScope,
    ownerUserId: usePersonalScope ? (input.ownerUserId ?? null) : null,
    tags: input.tags || [],
    favorite: Boolean(input.favorite),
    updatedAt: new Date(),
  } as any).returning();
  return created;
}

export async function updateStudioLibraryItemRecord(id: number, patch: Partial<StudioLibraryItemRecord>) {
  const [updated] = await db.update(studioLibraryItems)
    .set({ ...patch, updatedAt: new Date() } as any)
    .where(eq(studioLibraryItems.id, id))
    .returning();
  return updated;
}

export async function deleteStudioLibraryItemRecord(id: number) {
  await db.delete(studioLibraryItems).where(eq(studioLibraryItems.id, id));
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

export function renderStudioDocumentView(
  document: StudioDocument,
  requestedViewId?: string,
  options?: StudioDocumentRenderOptions,
) {
  const serialized = serializeStudioDocumentView(document, requestedViewId, options);
  return {
    content: serialized.content,
    embeds: serialized.embeds,
    interactiveComponents: serialized.interactiveComponents,
    diagnostics: serialized.diagnostics,
    viewId: serialized.viewId,
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
