import { createStudioPrimaryDocument } from "@/components/design-studio/studio-defaults";
import { createMigratedStudioDocument } from "@shared/studio/migrate";
import type {
  StudioAction,
  StudioDocument,
  StudioDraftMode,
  StudioEmbedDraft,
  StudioNode,
  StudioNodeType,
  StudioView,
} from "@shared/schema";

export type StudioSelection =
  | { kind: "message"; region?: "body" }
  | {
    kind: "embed";
    embedIndex: number;
    region?: "embed" | "author" | "title" | "description" | "field_name" | "field_value" | "color" | "footer" | "image" | "thumbnail";
    fieldIndex?: number | null;
  }
  | { kind: "node"; nodeId: string };

export function makeId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

export function cloneDocument<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export function parseDate(value: unknown) {
  const parsed = value instanceof Date ? value : new Date(value as string | number);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatRelativeEditTime(value: unknown) {
  const parsed = parseDate(value);
  if (!parsed) return "Updated recently";

  const diffMs = parsed.getTime() - Date.now();
  const absMinutes = Math.round(Math.abs(diffMs) / 60000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (absMinutes < 60) return formatter.format(Math.round(diffMs / 60000), "minute");

  const absHours = Math.round(absMinutes / 60);
  if (absHours < 24) return formatter.format(Math.round(diffMs / 3600000), "hour");

  const absDays = Math.round(absHours / 24);
  if (absDays < 7) return formatter.format(Math.round(diffMs / 86400000), "day");

  return parsed.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function normalizeStudioDocument(document: unknown, fallbackName = "Untitled Message"): StudioDocument {
  if (!document || typeof document !== "object") {
    return createStudioPrimaryDocument("message", fallbackName);
  }

  const candidate = document as Partial<StudioDocument>;
  if (candidate.version === 2 && candidate.meta?.entryViewId) {
    return createMigratedStudioDocument(candidate as StudioDocument).document;
  }

  return createStudioPrimaryDocument("message", fallbackName);
}

export function getView(document: StudioDocument, viewId?: string | null): StudioView {
  return document.views[viewId || document.meta.entryViewId] || document.views[document.meta.entryViewId];
}

export function draftModeLabel(mode: StudioDraftMode) {
  return mode === "layout_v2" ? "Interactive Layout" : "Standard Message";
}

export function createDefaultAction(label = "Reply"): StudioAction {
  return {
    id: makeId("act"),
    type: "reply_message",
    label,
    replyMode: "ephemeral",
    response: {
      mode: "inline",
      inline: {
        content: "Action received.",
        embeds: [],
      },
    },
  };
}

export interface StudioNodeBundle {
  nodeIds: string[];
  nodes: StudioNode[];
  actions: StudioAction[];
}

type StudioSelectBundleKind = "select" | "role_select" | "user_select" | "channel_select" | "mentionable_select";

function createSelectNodeBundle(kind: StudioSelectBundleKind, viewId: string): StudioNodeBundle {
  const action = createDefaultAction("Selection action");
  const selectId = makeId("select");
  const baseProps: Record<string, unknown> = {
    label: kind === "select"
      ? "Dropdown"
      : kind === "role_select"
        ? "Role Selector"
        : kind === "user_select"
          ? "User Selector"
          : kind === "channel_select"
            ? "Channel Selector"
            : "Mentionable Selector",
    customId: `${selectId}:menu`,
    placeholder: kind === "select" ? "Choose an option" : "Choose from Discord",
    minValues: 1,
    maxValues: 1,
    defaultValues: [],
  };

  if (kind === "channel_select") {
    baseProps.channelTypes = ["guild_text"];
  }

  const select: StudioNode = {
    id: selectId,
    type: kind === "select" ? "string_select" : kind,
    viewId,
    childIds: [],
    actionId: action.id,
    optionActionIds: kind === "select" ? { "option-1": action.id } : undefined,
    props: kind === "select"
      ? {
        ...baseProps,
        options: [
          {
            label: "Option 1",
            value: "option-1",
            description: "First choice",
          },
        ],
      }
      : baseProps,
  };

  return { nodeIds: [select.id], nodes: [select], actions: [action] };
}

export function createNodeBundle(
  kind: "text" | "divider" | "notice" | "section" | "button_row" | "button" | "select_menu" | "select" | "role_select" | "user_select" | "channel_select" | "mentionable_select" | "file" | "gallery",
  viewId: string,
): StudioNodeBundle {
  if (kind === "text") {
    const node: StudioNode = {
      id: makeId("txt"),
      type: "text_display",
      viewId,
      childIds: [],
      props: { text: "" },
    };
    return { nodeIds: [node.id], nodes: [node], actions: [] };
  }

  if (kind === "divider") {
    const node: StudioNode = {
      id: makeId("div"),
      type: "divider",
      viewId,
      childIds: [],
      props: { mode: "line", text: "--------" },
    };
    return { nodeIds: [node.id], nodes: [node], actions: [] };
  }

  if (kind === "notice") {
    const node: StudioNode = {
      id: makeId("note"),
      type: "style_block",
      viewId,
      childIds: [],
      props: {
        title: "Important",
        description: "",
        accentColor: "#B11226",
      },
    };
    return { nodeIds: [node.id], nodes: [node], actions: [] };
  }

  if (kind === "section") {
    const node: StudioNode = {
      id: makeId("sec"),
      type: "section",
      viewId,
      childIds: [],
      props: {
        heading: "New section",
        description: "",
      },
    };
    return { nodeIds: [node.id], nodes: [node], actions: [] };
  }

  if (kind === "file") {
    const node: StudioNode = {
      id: makeId("file"),
      type: "file",
      viewId,
      childIds: [],
      props: {
        label: "Download",
        url: "",
      },
    };
    return { nodeIds: [node.id], nodes: [node], actions: [] };
  }

  if (kind === "gallery") {
    const node: StudioNode = {
      id: makeId("gallery"),
      type: "media_gallery",
      viewId,
      childIds: [],
      props: {
        title: "Gallery",
        items: [],
      },
    };
    return { nodeIds: [node.id], nodes: [node], actions: [] };
  }

  if (kind === "select" || kind === "role_select" || kind === "user_select" || kind === "channel_select" || kind === "mentionable_select") {
    return createSelectNodeBundle(kind, viewId);
  }

  if (kind === "select_menu") {
    const selectBundle: StudioNodeBundle = createNodeBundle("select", viewId);
    const row: StudioNode = {
      id: makeId("row"),
      type: "action_row",
      viewId,
      childIds: [...selectBundle.nodeIds],
      props: {},
    };
    selectBundle.nodes.forEach((node: StudioNode) => {
      node.parentId = row.id;
    });
    return { nodeIds: [row.id], nodes: [row, ...selectBundle.nodes], actions: selectBundle.actions };
  }

  if (kind === "button") {
    const action = createDefaultAction("Primary action");
    const button: StudioNode = {
      id: makeId("btn"),
      type: "button",
      viewId,
      childIds: [],
      actionId: action.id,
      props: {
        label: "Primary Action",
        style: 1,
        customId: makeId("button"),
      },
    };
    return { nodeIds: [button.id], nodes: [button], actions: [action] };
  }

  const buttonBundle: StudioNodeBundle = createNodeBundle("button", viewId);
  const row: StudioNode = {
    id: makeId("row"),
    type: "action_row",
    viewId,
    childIds: [...buttonBundle.nodeIds],
    props: {},
  };
  buttonBundle.nodes.forEach((node: StudioNode) => {
    node.parentId = row.id;
  });
  return { nodeIds: [row.id], nodes: [row, ...buttonBundle.nodes], actions: buttonBundle.actions };
}

export function appendBundleToDocument(
  document: StudioDocument,
  viewId: string,
  bundle: StudioNodeBundle,
  parentId?: string | null,
) {
  bundle.nodes.forEach((node: StudioNode) => {
    document.nodes[node.id] = node;
  });
  bundle.actions.forEach((action: StudioAction) => {
    document.actions[action.id] = action;
  });

  if (parentId && document.nodes[parentId]) {
    bundle.nodeIds.forEach((nodeId: string) => {
      document.nodes[nodeId].parentId = parentId;
    });
    document.nodes[parentId].childIds.push(...bundle.nodeIds);
  } else {
    document.views[viewId].rootNodeIds.push(...bundle.nodeIds);
  }
}

export function removeNodeBranch(document: StudioDocument, nodeId: string) {
  const node = document.nodes[nodeId];
  if (!node) return;

  [...node.childIds].forEach((childId) => removeNodeBranch(document, childId));

  if (node.parentId && document.nodes[node.parentId]) {
    document.nodes[node.parentId].childIds = document.nodes[node.parentId].childIds.filter((childId) => childId !== nodeId);
  }

  Object.values(document.views).forEach((view) => {
    view.rootNodeIds = view.rootNodeIds.filter((id) => id !== nodeId);
  });

  if (node.actionId) {
    delete document.actions[node.actionId];
  }

  if (node.optionActionIds) {
    Object.values(node.optionActionIds).forEach((actionId) => {
      delete document.actions[actionId];
    });
  }

  delete document.nodes[nodeId];
}

export function collectInteractionRows(document: StudioDocument, viewId: string) {
  const rows: Array<{ label: string; action: string }> = [];
  const visit = (nodeId: string) => {
    const node = document.nodes[nodeId];
    if (!node) return;

    if (node.type === "button") {
      const label = String(node.props.label || "Button");
      const action = node.actionId ? document.actions[node.actionId] : null;
      rows.push({ label, action: action?.label || action?.type || "Missing handler" });
    }

    if (node.type === "string_select") {
      const label = String(node.props.placeholder || "Dropdown");
      rows.push({ label, action: node.optionActionIds ? `${Object.keys(node.optionActionIds).length} mapped options` : "Missing option handlers" });
    }

    node.childIds.forEach(visit);
  };

  getView(document, viewId).rootNodeIds.forEach(visit);
  return rows;
}

export function selectionFromPath(document: StudioDocument, path?: string | null): StudioSelection | null {
  if (!path) return null;

  const embedMatch = path.match(/embeds\[(\d+)\]/);
  if (embedMatch) {
    const embedIndex = Number(embedMatch[1]);
    const fieldMatch = path.match(/fields\[(\d+)\]\.(name|value|inline)/);
    if (fieldMatch) {
      return {
        kind: "embed",
        embedIndex,
        region: fieldMatch[2] === "name" ? "field_name" : "field_value",
        fieldIndex: Number(fieldMatch[1]),
      };
    }
    if (path.includes("author")) return { kind: "embed", embedIndex, region: "author" };
    if (path.includes(".title") || path.endsWith("title")) return { kind: "embed", embedIndex, region: "title" };
    if (path.includes("description")) return { kind: "embed", embedIndex, region: "description" };
    if (path.includes("color")) return { kind: "embed", embedIndex, region: "color" };
    if (path.includes("footer") || path.includes("timestamp")) return { kind: "embed", embedIndex, region: "footer" };
    if (path.includes("thumbnail")) return { kind: "embed", embedIndex, region: "thumbnail" };
    if (path.includes("image")) return { kind: "embed", embedIndex, region: "image" };
    return { kind: "embed", embedIndex, region: "embed" };
  }

  const nodeIds = Object.keys(document.nodes);
  const matchingNodeId = nodeIds.find((nodeId) => path.includes(nodeId) || path.includes(`nodes.${nodeId}`));
  if (matchingNodeId) {
    return { kind: "node", nodeId: matchingNodeId };
  }

  if (path.includes("messageContent")) {
    return { kind: "message", region: "body" };
  }

  return null;
}

export function createBlankEmbed(): StudioEmbedDraft {
  return {
    title: "",
    description: "",
    color: "#B11226",
  };
}

export function getSelectionLabel(selection: StudioSelection, document: StudioDocument, viewId: string) {
  if (selection.kind === "message") return selection.region === "body" ? "Message Body" : "Message";
  if (selection.kind === "embed") {
    if (!selection.region || selection.region === "embed") return `Embed ${selection.embedIndex + 1}`;
    if (selection.region === "author") return `Embed ${selection.embedIndex + 1} Author`;
    if (selection.region === "title") return `Embed ${selection.embedIndex + 1} Title`;
    if (selection.region === "description") return `Embed ${selection.embedIndex + 1} Description`;
    if (selection.region === "color") return `Embed ${selection.embedIndex + 1} Color`;
    if (selection.region === "footer") return `Embed ${selection.embedIndex + 1} Footer`;
    if (selection.region === "image") return `Embed ${selection.embedIndex + 1} Image`;
    if (selection.region === "thumbnail") return `Embed ${selection.embedIndex + 1} Thumbnail`;
    if (selection.region === "field_name" || selection.region === "field_value") {
      const fieldLabel = typeof selection.fieldIndex === "number" ? `Field ${selection.fieldIndex + 1}` : "Field";
      return `Embed ${selection.embedIndex + 1} ${fieldLabel}`;
    }
    return `Embed ${selection.embedIndex + 1}`;
  }
  const node = document.nodes[selection.nodeId];
  if (!node) return "Selection";
  const typeLabel: Record<StudioNodeType, string> = {
    container: "Container",
    section: "Section",
    text_display: "Text Block",
    media_gallery: "Gallery",
    file: "File",
    action_row: "Action Row",
    button: "Button",
    string_select: "Dropdown",
    role_select: "Role Menu",
    user_select: "User Menu",
    channel_select: "Channel Menu",
    mentionable_select: "Mention Menu",
    divider: "Divider",
    style_block: "Notice",
  };
  return typeLabel[node.type] || `Node in ${getView(document, viewId).name}`;
}
