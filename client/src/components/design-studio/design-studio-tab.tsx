import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  ChevronLeft,
  ArrowDown,
  ArrowUp,
  Bot,
  CheckCircle2,
  CircleAlert,
  CircleX,
  Copy,
  Eye,
  FilePlus2,
  FolderTree,
  Grip,
  ImageIcon,
  Library,
  Monitor,
  MousePointer2,
  Plus,
  Rocket,
  Save,
  Smartphone,
  Sparkles,
  Trash2,
  Workflow,
} from "lucide-react";
import type { DiscordContextEmoji } from "@/hooks/use-bot";
import {
  useArchiveStudioPublication,
  useCloneStudioPublication,
  useCreateStudioLibraryItem,
  useCreateStudioDocument,
  useDeleteStudioLibraryItem,
  useDiscordContext,
  usePublishStudio,
  useRollbackStudioPublication,
  useStudioLibraryItems,
  useTicketConfig,
  useTicketPanels,
  useStudioDocuments,
  useStudioPublications,
  useToggleStudioLibraryFavorite,
  useUpdateStudioDocument,
  useUpdateStudioPublicationStatus,
} from "@/hooks/use-bot";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { DiscordChannelPicker } from "@/components/discord/channel-picker";
import { DesignStudioMobileHome } from "@/components/design-studio/design-studio-mobile-home";
import { StudioPreview } from "@/components/design-studio/studio-preview";
import {
  createStudioPrimaryDocument,
  createStudioDocument as createStudioDocumentDraft,
  defaultPrimarySurfaceName,
  defaultSurfaceName,
  inferStudioPrimarySurfaceType,
  parseStudioEntryIntent,
  type StudioPrimarySurfaceType,
  type StudioEntryIntent,
  STUDIO_MAIN_AREAS,
} from "@/components/design-studio/studio-defaults";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { collectStudioDiagnostics } from "@shared/studio-document";
import type {
  InteractiveActionConfig,
  StudioAction,
  StudioDiagnostic,
  StudioLibraryItemRecord,
  StudioDividerPreset,
  StudioDocument,
  StudioDocumentRecord,
  StudioEmbedDraft,
  StudioModalDefinition,
  StudioNode,
  StudioNodeType,
  StudioPublication,
  StudioStyleBlockPreset,
  StudioThemePack,
} from "@shared/schema";

type StudioAreaId = (typeof STUDIO_MAIN_AREAS)[number]["id"];
type PreviewMode = "desktop" | "mobile" | "compact";
type ComposerMode = "edit" | "preview" | "json";
type LibraryScopeFilter = "all" | "personal" | "server";
type LibraryCategoryFilter = "all" | "divider" | "symbol" | "emoji" | "format" | "style_block" | "style_pack" | "asset_link" | "snippet";
type BuildFocusId = "content" | "embeds" | "components" | "actions" | "assets";
type MobilePrimaryBuildFocusId = Exclude<BuildFocusId, "assets">;
type LibraryModeId = "shelf" | "tools" | "templates";

type PublicationWithMeta = StudioPublication & {
  documentName?: string;
  snapshots?: Array<{ id: number; version: number; createdAt: string }>;
  recentEvents?: Array<{ id: number; severity: string; summary: string; occurredAt: string }>;
};

const NODE_TYPE_OPTIONS: Array<{ type: StudioNodeType; label: string; detail: string }> = [
  { type: "container", label: "Container", detail: "Group content and nested sections." },
  { type: "section", label: "Section", detail: "Heading, description, and grouped blocks." },
  { type: "text_display", label: "Text", detail: "Rich text, rules, notices, and body copy." },
  { type: "divider", label: "Divider", detail: "Line, symbol, emoji, or stacked separator." },
  { type: "style_block", label: "Style Block", detail: "Warning, rules, archive, or spotlight blocks." },
  { type: "media_gallery", label: "Media Gallery", detail: "Stack up to four images." },
  { type: "file", label: "File", detail: "Attachment link or downloadable resource." },
  { type: "action_row", label: "Action Row", detail: "Interactive row for buttons or menus." },
  { type: "button", label: "Button", detail: "Link, modal, role, or reply trigger." },
  { type: "string_select", label: "String Menu", detail: "Option-driven menu with mapped actions." },
  { type: "role_select", label: "Role Menu", detail: "Schema-ready, runtime gated." },
  { type: "user_select", label: "User Menu", detail: "Schema-ready, runtime gated." },
  { type: "channel_select", label: "Channel Menu", detail: "Schema-ready, runtime gated." },
  { type: "mentionable_select", label: "Mentionable Menu", detail: "Schema-ready, runtime gated." },
];

const ACTION_TYPE_OPTIONS: Array<{ type: InteractiveActionConfig["type"]; label: string; detail: string }> = [
  { type: "reply_message", label: "Reply", detail: "Reply to the user with content or embeds." },
  { type: "follow_up_message", label: "Follow Up", detail: "Send a follow-up message after the interaction." },
  { type: "open_modal", label: "Open Modal", detail: "Launch a modal form from this interaction." },
  { type: "goto_view", label: "Go To View", detail: "Edit the published message to another view." },
  { type: "back_view", label: "Back", detail: "Return to a configured previous view." },
  { type: "cancel_view", label: "Cancel", detail: "Return to a safe fallback view." },
  { type: "confirm", label: "Confirm", detail: "Send a confirmation response and optionally change view." },
  { type: "role_add", label: "Give Role", detail: "Grant a role to the acting member." },
  { type: "role_remove", label: "Remove Role", detail: "Remove a role from the acting member." },
  { type: "role_toggle", label: "Toggle Role", detail: "Add or remove a role depending on current state." },
  { type: "ticket_create", label: "Create Ticket", detail: "Create a support ticket channel using the server ticket config." },
  { type: "channel_message", label: "Post To Channel", detail: "Post a response payload to a selected channel." },
  { type: "log_action", label: "Log Action", detail: "Send a structured response to a log channel." },
  { type: "dm_user", label: "DM User", detail: "Send a direct message response." },
  { type: "open_url", label: "Open Link", detail: "Open an external link." },
  { type: "hidden_by_gate", label: "Hidden By Gate", detail: "Schema-ready gating flag." },
];

const STYLE_BLOCK_STARTERS: StudioStyleBlockPreset[] = [
  { id: "warning", name: "Warning Strip", variant: "warning_strip", description: "Call out a warning or limit.", accentColor: "#E67E22" },
  { id: "rules", name: "Rules Block", variant: "rules_block", description: "Introduce rules or requirements.", accentColor: "#5865F2" },
  { id: "locked", name: "Locked Access", variant: "locked_access", description: "Show gated access or approval language.", accentColor: "#ED4245" },
  { id: "archive", name: "Archive Card", variant: "archive_card", description: "Link to archive resources or channels.", accentColor: "#4F545C" },
  { id: "alert", name: "Red Alert", variant: "red_alert", description: "Escalation, downtime, or urgent notices.", accentColor: "#B11226" },
  { id: "spotlight", name: "Spotlight Card", variant: "spotlight_card", description: "Feature a member, drop, or announcement.", accentColor: "#57F287" },
];

const THEME_PACK_STARTERS: StudioThemePack[] = [
  { id: "obsidian", name: "Obsidian Control", accentColor: "#B11226", borderStyle: "strong", emojiStyle: "custom_first", spacingFeel: "balanced" },
  { id: "signal", name: "Signal Blue", accentColor: "#4C6EF5", borderStyle: "minimal", emojiStyle: "native", spacingFeel: "compact" },
  { id: "ember", name: "Ember Ops", accentColor: "#E67E22", borderStyle: "soft", emojiStyle: "native", spacingFeel: "airy" },
];

const QUICK_EMOJI = ["🔥", "✨", "✅", "📌", "🎯", "⚠️", "📂", "🔒", "🧭", "🎫", "👋", "📣"];
const QUICK_MACROS = [
  { label: "User", value: "<@{user_id}>" },
  { label: "Username", value: "{username}" },
  { label: "Server", value: "{server_name}" },
  { label: "Channel", value: "<#{channel_id}>" },
  { label: "Role", value: "<@&{role_id}>" },
  { label: "Timestamp", value: "<t:{unix}:f>" },
  { label: "Message Link", value: "https://discord.com/channels/{guild_id}/{channel_id}/{message_id}" },
  { label: "View Ref", value: "{{view:entry}}" },
  { label: "Action Ref", value: "{{action:id}}" },
];

const MOBILE_BUILD_WORKSPACES = [
  { id: "content" as const, label: "Content", detail: "Project setup, views, and body copy.", icon: FilePlus2 },
  { id: "embeds" as const, label: "Embeds", detail: "Cards, images, and rich message styling.", icon: Sparkles },
  { id: "components" as const, label: "Components", detail: "Layout blocks, rows, buttons, and menus.", icon: FolderTree },
  { id: "actions" as const, label: "Actions", detail: "Replies, modals, routing, and interaction logic.", icon: MousePointer2 },
];

const MOBILE_LIBRARY_MODES = [
  { id: "shelf" as const, label: "Library" },
  { id: "tools" as const, label: "Tools" },
  { id: "templates" as const, label: "Templates" },
];

const MOBILE_UTILITY_AREAS = [
  { id: "preview" as const, label: "Preview", icon: Eye },
  { id: "library" as const, label: "Library", icon: Library },
  { id: "assets" as const, label: "Assets", icon: ImageIcon },
  { id: "publish" as const, label: "Publish", icon: Rocket },
];

function formatUnitCount(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function getBuildFocusFromPrimaryType(primaryType: StudioPrimarySurfaceType): BuildFocusId {
  switch (primaryType) {
    case "embed":
      return "embeds";
    case "components":
      return "components";
    case "message":
    default:
      return "content";
  }
}

function makeId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

function cloneDocument<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function normalizeDocumentDraft(document: any, fallbackName = "Untitled Project"): StudioDocument {
  if (!document || typeof document !== "object") {
    return createStudioDocumentDraft(undefined, fallbackName);
  }

  if (document.version === 2 && document.meta?.entryViewId) {
    return {
      version: 2,
      meta: {
        name: String(document.meta?.name || fallbackName),
        category: document.meta?.category ? String(document.meta.category) : "project",
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

  return createStudioDocumentDraft(undefined, fallbackName);
}

function ensureDesign(document: StudioDocument) {
  if (!document.design) {
    document.design = { dividerPresets: [], styleBlocks: [], themePacks: [] };
  }
  document.design.dividerPresets ||= [];
  document.design.styleBlocks ||= [];
  document.design.themePacks ||= [];
  return document.design;
}

function getDocumentKindLabel(kind?: string) {
  return kind === "template" ? "Template" : "Project";
}

function getBindingLabel(binding?: string | null) {
  switch (binding) {
    case "verify":
      return "Verification";
    case "welcome":
      return "Welcome";
    case "welcome_dm":
      return "Welcome DM";
    case "leave":
      return "Leave";
    case "tickets":
      return "Tickets";
    case "ticket_panel":
      return "Ticket Panel";
    default:
      return binding || "";
  }
}

function getView(document: StudioDocument, viewId?: string) {
  return document.views[viewId || document.meta.entryViewId] || document.views[document.meta.entryViewId];
}

function createAction(type: InteractiveActionConfig["type"] = "reply_message"): StudioAction {
  return {
    id: makeId("act"),
    type,
    label: ACTION_TYPE_OPTIONS.find((entry) => entry.type === type)?.label || "Action",
    replyMode: "ephemeral",
    response: {
      mode: "inline",
      inline: {
        content: type === "confirm" ? "Confirmed." : "Action received.",
        embeds: [],
      },
    },
  };
}

function createModal(): StudioModalDefinition {
  return {
    id: makeId("modal"),
    title: "Feedback Modal",
    customIdSeed: `studio_modal_${Math.random().toString(36).slice(2, 6)}`,
    fields: [
      {
        id: makeId("field"),
        label: "Response",
        style: "paragraph",
        placeholder: "Type your answer here...",
        required: true,
        minLength: 1,
        maxLength: 1000,
      },
    ],
    submitActionIds: [],
  };
}

function createNode(type: StudioNodeType, viewId: string): { node: StudioNode; actions: StudioAction[] } {
  const id = makeId(type.slice(0, 3));
  const actions: StudioAction[] = [];

  if (type === "button") {
    const action = createAction("reply_message");
    actions.push(action);
    return {
      node: {
        id,
        type,
        viewId,
        childIds: [],
        actionId: action.id,
        props: { label: "Button", style: 1, emoji: "" },
      },
      actions,
    };
  }

  if (type === "string_select") {
    const optionAction = createAction("reply_message");
    actions.push(optionAction);
    return {
      node: {
        id,
        type,
        viewId,
        childIds: [],
        optionActionIds: { option_1: optionAction.id },
        props: {
          label: "Select Menu",
          placeholder: "Choose an option",
          options: [{ label: "Option 1", value: "option_1", description: "First option" }],
        },
      },
      actions,
    };
  }

  const defaults: Record<StudioNodeType, Record<string, unknown>> = {
    container: { heading: "Container", description: "Group related content." },
    section: { heading: "Section", description: "Add section copy here." },
    text_display: { text: "Add message copy, rules, instructions, or labels here." },
    media_gallery: { title: "Gallery", accentColor: "#5865F2", items: [] },
    file: { label: "Attachment", url: "" },
    action_row: {},
    divider: { mode: "line", text: "----------", repeat: 1 },
    style_block: { variant: "warning_strip", title: "Notice", description: "Style block copy.", accentColor: "#B11226" },
    role_select: { label: "Role Menu", placeholder: "Choose a role" },
    user_select: { label: "User Menu", placeholder: "Choose a user" },
    channel_select: { label: "Channel Menu", placeholder: "Choose a channel" },
    mentionable_select: { label: "Mentionable Menu", placeholder: "Choose a target" },
    button: {},
    string_select: {},
  };

  return {
    node: {
      id,
      type,
      viewId,
      childIds: [],
      props: defaults[type] || {},
    },
    actions,
  };
}

function canNodeContainChildren(nodeType: StudioNodeType) {
  return ["container", "section", "action_row"].includes(nodeType);
}

function canParentNode(parentType: StudioNodeType, childType: StudioNodeType) {
  if (parentType === "action_row") {
    return ["button", "string_select", "role_select", "user_select", "channel_select", "mentionable_select"].includes(childType);
  }
  if (["container", "section"].includes(parentType)) {
    return !["button", "string_select", "role_select", "user_select", "channel_select", "mentionable_select"].includes(childType);
  }
  return false;
}

function getAllowedChildNodeTypes(parentType?: StudioNodeType | null): StudioNodeType[] {
  if (parentType === "action_row") {
    return ["button", "string_select", "role_select", "user_select", "channel_select", "mentionable_select"];
  }

  if (parentType === "container" || parentType === "section") {
    return ["container", "section", "text_display", "divider", "style_block", "media_gallery", "file", "action_row"];
  }

  return NODE_TYPE_OPTIONS.map((option) => option.type);
}

function getStudioNodeTypeLabel(nodeType: StudioNodeType) {
  return NODE_TYPE_OPTIONS.find((option) => option.type === nodeType)?.label || nodeType.replace(/_/g, " ");
}

function getStudioNodeDisplayLabel(node?: StudioNode | null) {
  if (!node) return "View";
  const rawLabel = String(node.props.label || node.props.heading || node.props.title || node.props.text || "").trim();
  return rawLabel || getStudioNodeTypeLabel(node.type);
}

function ensureInlineResponse(action: StudioAction) {
  if (!action.response || action.response.mode !== "inline") {
    action.response = { mode: "inline", inline: { content: "", embeds: [] } };
  }
  if (!action.response.inline) {
    action.response.inline = { content: "", embeds: [] };
  }
  action.response.inline.embeds ||= [];
  return action.response.inline;
}

function actionSummary(action: StudioAction | undefined, document?: StudioDocument) {
  if (!action) return "No action bound";
  switch (action.type) {
    case "open_url":
      return action.url ? `opens ${action.url}` : "opens a link";
    case "role_add":
      return action.roleId ? `gives role ${action.roleId}` : "gives a role";
    case "role_remove":
      return action.roleId ? `removes role ${action.roleId}` : "removes a role";
    case "role_toggle":
      return action.roleId ? `toggles role ${action.roleId}` : "toggles a role";
    case "ticket_create":
      return action.ticketDepartmentId ? `creates a ${action.ticketDepartmentId} ticket` : "creates a ticket";
    case "open_modal": {
      const modalName = action.modalId && document?.modals[action.modalId]?.title;
      return modalName ? `opens modal ${modalName}` : "opens a modal";
    }
    case "goto_view":
      return action.targetViewId ? `goes to ${action.targetViewId}` : "goes to another view";
    case "back_view":
      return action.targetViewId ? `goes back to ${action.targetViewId}` : "goes back";
    case "cancel_view":
      return action.fallbackViewId ? `cancels to ${action.fallbackViewId}` : "cancels to entry";
    case "channel_message":
      return action.channelId ? `posts in ${action.channelId}` : "posts in a channel";
    case "log_action":
      return action.channelId ? `logs in ${action.channelId}` : "logs the action";
    case "dm_user":
      return "DMs the user";
    case "confirm":
      return action.targetViewId ? `confirms and goes to ${action.targetViewId}` : "sends confirmation";
    case "follow_up_message":
      return "sends a follow-up message";
    case "reply_message":
      return action.replyMode === "channel" ? "replies publicly" : "replies ephemerally";
    case "hidden_by_gate":
      return "is hidden by gate";
    default:
      return action.type.replace(/_/g, " ");
  }
}

function collectInteractionMap(document: StudioDocument, viewId: string) {
  const view = getView(document, viewId);
  if (!view) return [] as Array<{ label: string; action: string }>;
  const rows: Array<{ label: string; action: string }> = [];

  const visit = (nodeId: string) => {
    const node = document.nodes[nodeId];
    if (!node) return;
    if (node.type === "button") {
      rows.push({
        label: String(node.props.label || "Button"),
        action: actionSummary(node.actionId ? document.actions[node.actionId] : undefined, document),
      });
      return;
    }
    if (["string_select", "role_select", "user_select", "channel_select", "mentionable_select"].includes(node.type)) {
      rows.push({
        label: String(node.props.label || "Select Menu"),
        action: actionSummary(node.actionId ? document.actions[node.actionId] : undefined, document),
      });
      return;
    }
    node.childIds.forEach(visit);
  };

  view.rootNodeIds.forEach(visit);
  return rows;
}

function collectDiagnostics(document: StudioDocument, viewId: string) {
  const diagnostics: StudioDiagnostic[] = [];
  const view = getView(document, viewId);
  if (!view) {
    return [{ level: "error", code: "VIEW_NOT_FOUND", message: "Selected view no longer exists." }];
  }

  if (!view.messageContent?.trim() && view.embeds.length === 0 && view.rootNodeIds.length === 0) {
    diagnostics.push({ level: "warning", code: "EMPTY_VIEW", message: "This view has no content yet." });
  }

  if (view.embeds.length > 10) {
    diagnostics.push({ level: "error", code: "EMBED_LIMIT", message: "Discord allows up to 10 embeds per message." });
  }

  const visit = (nodeId: string) => {
    const node = document.nodes[nodeId];
    if (!node) {
      diagnostics.push({ level: "warning", code: "NODE_MISSING", message: `Missing node ${nodeId}.` });
      return;
    }

    if (node.type === "button" && node.actionId && !document.actions[node.actionId]) {
      diagnostics.push({ level: "warning", code: "BUTTON_ACTION_MISSING", message: `${node.props.label || "Button"} is missing its action.` });
    }
    if (node.type === "button" && !node.actionId) {
      diagnostics.push({ level: "warning", code: "BUTTON_ACTION_EMPTY", message: `${node.props.label || "Button"} has no action bound.` });
    }

    if (node.type === "string_select") {
      const options = Array.isArray(node.props.options) ? node.props.options : [];
      if (options.length === 0) {
        diagnostics.push({ level: "warning", code: "SELECT_OPTIONS_EMPTY", message: "A string select menu has no options." });
      }
      for (const option of options) {
        const value = String((option as any)?.value || "");
        if (value && node.optionActionIds && !document.actions[node.optionActionIds[value]]) {
          diagnostics.push({ level: "warning", code: "SELECT_OPTION_ACTION_MISSING", message: `Option ${String((option as any)?.label || value)} is missing its action.` });
        }
      }
    }

    if (["role_select", "user_select", "channel_select", "mentionable_select"].includes(node.type)) {
      diagnostics.push({ level: "info", code: "RUNTIME_GATED", message: `${node.type.replace(/_/g, " ")} is schema-ready and currently runtime gated.` });
    }

    if (node.type === "action_row") {
      const children = node.childIds.map((id) => document.nodes[id]).filter(Boolean);
      const buttons = children.filter((child) => child.type === "button");
      const selects = children.filter((child) => child.type !== "button");
      if (buttons.length > 5) diagnostics.push({ level: "error", code: "ROW_BUTTON_LIMIT", message: "An action row has more than 5 buttons." });
      if (selects.length > 1) diagnostics.push({ level: "error", code: "ROW_SELECT_LIMIT", message: "An action row can only have one select menu." });
      if (buttons.length > 0 && selects.length > 0) diagnostics.push({ level: "warning", code: "ROW_MIXED_TYPES", message: "An action row mixes buttons and select menus." });
    }

    node.childIds.forEach(visit);
  };

  view.rootNodeIds.forEach(visit);

  Object.values(document.actions).forEach((action) => {
    if (action.type === "open_modal" && action.modalId && !document.modals[action.modalId]) {
      diagnostics.push({ level: "warning", code: "MODAL_REFERENCE_MISSING", message: `${action.label || "An action"} points to a missing modal.` });
    }
    if (["goto_view", "back_view"].includes(action.type) && action.targetViewId && !document.views[action.targetViewId]) {
      diagnostics.push({ level: "warning", code: "VIEW_REFERENCE_MISSING", message: `${action.label || "An action"} points to a missing view.` });
    }
    if (action.type === "cancel_view" && action.fallbackViewId && !document.views[action.fallbackViewId]) {
      diagnostics.push({ level: "warning", code: "VIEW_FALLBACK_MISSING", message: `${action.label || "An action"} points to a missing fallback view.` });
    }
  });

  return diagnostics;
}

function upsertRecentEmoji(serverId: number, emoji: string) {
  const key = `studio:${serverId}:emoji-state`;
  const existing = JSON.parse(window.localStorage.getItem(key) || "{}");
  const recent = [emoji, ...(existing.recent || []).filter((entry: string) => entry !== emoji)].slice(0, 18);
  const next = { recent, favorites: existing.favorites || [] };
  window.localStorage.setItem(key, JSON.stringify(next));
  return next;
}

function toggleFavoriteEmoji(serverId: number, emoji: string) {
  const key = `studio:${serverId}:emoji-state`;
  const existing = JSON.parse(window.localStorage.getItem(key) || "{}");
  const favorites = (existing.favorites || []).includes(emoji)
    ? (existing.favorites || []).filter((entry: string) => entry !== emoji)
    : [emoji, ...(existing.favorites || [])].slice(0, 24);
  const next = { recent: existing.recent || [], favorites };
  window.localStorage.setItem(key, JSON.stringify(next));
  return next;
}

function emojiToToken(emoji: DiscordContextEmoji) {
  if (!emoji.id) return emoji.name;
  return `<${emoji.animated ? "a" : ""}:${emoji.name}:${emoji.id}>`;
}

function NodeTreeItem({
  document,
  nodeId,
  depth,
  selectedNodeId,
  diagnosticsForPrefix,
  onSelect,
  onAddInside,
}: {
  document: StudioDocument;
  nodeId: string;
  depth: number;
  selectedNodeId: string | null;
  diagnosticsForPrefix?: (prefix: string) => StudioDiagnostic[];
  onSelect: (nodeId: string) => void;
  onAddInside?: (nodeId: string) => void;
}) {
  const node = document.nodes[nodeId];
  if (!node) return null;
  const label = String(node.props.label || node.props.heading || node.props.title || node.props.text || node.type).slice(0, 48);
  const issues = diagnosticsForPrefix ? diagnosticsForPrefix(`nodes.${node.id}`) : [];
  const showAddInside = Boolean(onAddInside && canNodeContainChildren(node.type));

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2" style={{ marginLeft: depth * 12 }}>
        <button
          type="button"
          onClick={() => onSelect(nodeId)}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition",
            selectedNodeId === nodeId ? "border-primary/40 bg-primary/10 text-white" : "border-white/10 bg-background/40 text-muted-foreground hover:border-white/20 hover:text-white",
          )}
        >
          <FolderTree className="h-4 w-4 shrink-0" />
          <span className="truncate">{label}</span>
          {issues.length > 0 ? (
            <Badge variant={issues.some((entry) => entry.level === "error") ? "destructive" : "secondary"} className="ml-auto shrink-0">
              {issues.length}
            </Badge>
          ) : null}
          <Badge variant="outline" className={cn("shrink-0 border-white/10 text-[10px] uppercase", issues.length === 0 ? "ml-auto" : "")}>
            {node.type.replace(/_/g, " ")}
          </Badge>
        </button>
        {showAddInside ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 rounded-full border-white/10 bg-background/30 px-3 text-[11px] text-white/80 hover:bg-background/50"
            onClick={() => onAddInside?.(nodeId)}
          >
            Add Inside
          </Button>
        ) : null}
      </div>
      {node.childIds.map((childId) => (
        <NodeTreeItem
          key={childId}
          document={document}
          nodeId={childId}
          depth={depth + 1}
          selectedNodeId={selectedNodeId}
          diagnosticsForPrefix={diagnosticsForPrefix}
          onSelect={onSelect}
          onAddInside={onAddInside}
        />
      ))}
    </div>
  );
}

interface StudioEditorState {
  draft: StudioDocument | null;
  dirty: boolean;
  selectedViewId: string;
  selectedNodeId: string | null;
  selectedActionId: string | null;
  selectedModalId: string | null;
  selectedEmbedIndex: number | null;
  publishDiagnostics: StudioDiagnostic[];
}

type StudioEditorAction =
  | { type: "load"; draft: StudioDocument }
  | { type: "mutate"; updater: (document: StudioDocument) => void }
  | { type: "mark_clean"; draft?: StudioDocument }
  | { type: "select_view"; viewId: string }
  | { type: "select_node"; nodeId: string | null }
  | { type: "select_action"; actionId: string | null }
  | { type: "select_modal"; modalId: string | null }
  | { type: "select_embed"; index: number | null }
  | { type: "set_publish_diagnostics"; diagnostics: StudioDiagnostic[] };

function createEditorState(): StudioEditorState {
  return {
    draft: null,
    dirty: false,
    selectedViewId: "entry",
    selectedNodeId: null,
    selectedActionId: null,
    selectedModalId: null,
    selectedEmbedIndex: null,
    publishDiagnostics: [],
  };
}

function editorReducer(state: StudioEditorState, action: StudioEditorAction): StudioEditorState {
  switch (action.type) {
    case "load":
      return {
        draft: action.draft,
        dirty: false,
        selectedViewId: action.draft.meta.entryViewId,
        selectedNodeId: null,
        selectedActionId: null,
        selectedModalId: null,
        selectedEmbedIndex: null,
        publishDiagnostics: [],
      };
    case "mutate": {
      if (!state.draft) return state;
      const nextDraft = cloneDocument(state.draft);
      ensureDesign(nextDraft);
      action.updater(nextDraft);
      return {
        ...state,
        draft: nextDraft,
        dirty: true,
      };
    }
    case "mark_clean":
      return {
        ...state,
        draft: action.draft || state.draft,
        dirty: false,
      };
    case "select_view":
      return {
        ...state,
        selectedViewId: action.viewId,
        selectedNodeId: null,
        selectedActionId: null,
        selectedModalId: null,
        selectedEmbedIndex: null,
      };
    case "select_node":
      return {
        ...state,
        selectedNodeId: action.nodeId,
        selectedActionId: null,
        selectedModalId: null,
        selectedEmbedIndex: null,
      };
    case "select_action":
      return {
        ...state,
        selectedActionId: action.actionId,
        selectedNodeId: null,
        selectedModalId: null,
        selectedEmbedIndex: null,
      };
    case "select_modal":
      return {
        ...state,
        selectedModalId: action.modalId,
        selectedNodeId: null,
        selectedActionId: null,
        selectedEmbedIndex: null,
      };
    case "select_embed":
      return {
        ...state,
        selectedEmbedIndex: action.index,
        selectedNodeId: null,
        selectedActionId: null,
        selectedModalId: null,
      };
    case "set_publish_diagnostics":
      return {
        ...state,
        publishDiagnostics: action.diagnostics,
      };
    default:
      return state;
  }
}

export function DesignStudioTab({ serverId, onOpenServerSettings }: { serverId: number; onOpenServerSettings?: () => void; toast?: any }) {
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const studioDocumentsQuery = useStudioDocuments(serverId);
  const studioPublicationsQuery = useStudioPublications(serverId);
  const createDocumentMutation = useCreateStudioDocument(serverId);
  const updateDocumentMutation = useUpdateStudioDocument(serverId);
  const publishMutation = usePublishStudio(serverId);
  const clonePublicationMutation = useCloneStudioPublication(serverId);
  const rollbackPublicationMutation = useRollbackStudioPublication(serverId);
  const archivePublicationMutation = useArchiveStudioPublication(serverId);
  const updatePublicationStatusMutation = useUpdateStudioPublicationStatus(serverId);
  const createLibraryItemMutation = useCreateStudioLibraryItem(serverId);
  const deleteLibraryItemMutation = useDeleteStudioLibraryItem(serverId);
  const toggleLibraryFavoriteMutation = useToggleStudioLibraryFavorite(serverId);

  const documents = ((studioDocumentsQuery.data || []) as StudioDocumentRecord[]).map((record) => ({
    ...record,
    document: normalizeDocumentDraft(record.document, record.name),
  }));
  const publications = (studioPublicationsQuery.data || []) as PublicationWithMeta[];

  const [currentDocumentId, setCurrentDocumentId] = useState<number | null>(null);
  const [draft, setDraft] = useState<StudioDocument | null>(null);
  const [dirty, setDirty] = useState(false);
  const [selectedViewId, setSelectedViewId] = useState("entry");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [selectedModalId, setSelectedModalId] = useState<string | null>(null);
  const [selectedEmbedIndex, setSelectedEmbedIndex] = useState<number | null>(null);
  const [activeArea, setActiveArea] = useState<StudioAreaId>("build");
  const [buildFocusId, setBuildFocusId] = useState<BuildFocusId>("content");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("mobile");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [composerMode, setComposerMode] = useState<ComposerMode>("edit");
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddParentId, setQuickAddParentId] = useState<string | null>(null);
  const [publishChannelId, setPublishChannelId] = useState("");
  const [updateMessageId, setUpdateMessageId] = useState("");
  const [publishViewId, setPublishViewId] = useState("");
  const [cloneChannelId, setCloneChannelId] = useState("");
  const [selectedPublicationId, setSelectedPublicationId] = useState<number | null>(null);
  const [entryIntent, setEntryIntent] = useState<StudioEntryIntent>("blank");
  const [importText, setImportText] = useState("");
  const [emojiState, setEmojiState] = useState<{ recent: string[]; favorites: string[] }>({ recent: [], favorites: [] });
  const [libraryScopeFilter, setLibraryScopeFilter] = useState<LibraryScopeFilter>("all");
  const [libraryCategoryFilter, setLibraryCategoryFilter] = useState<LibraryCategoryFilter>("all");
  const [libraryModeId, setLibraryModeId] = useState<LibraryModeId>("shelf");
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryFavoritesOnly, setLibraryFavoritesOnly] = useState(false);
  const [librarySaveScope, setLibrarySaveScope] = useState<"personal" | "server">("personal");
  const [libraryItemName, setLibraryItemName] = useState("");
  const [libraryAssetName, setLibraryAssetName] = useState("");
  const [libraryAssetUrl, setLibraryAssetUrl] = useState("");
  const [lastDiagnostics, setLastDiagnostics] = useState<StudioDiagnostic[]>([]);
  const loadedDocumentIdRef = useRef<number | null>(null);

  const studioLibraryQuery = useStudioLibraryItems(serverId, {
    enabled: activeArea === "library" || Boolean(draft),
    scope: libraryScopeFilter,
    category: libraryCategoryFilter,
    q: librarySearch,
    favorites: libraryFavoritesOnly,
  });
  const libraryItems = (studioLibraryQuery.data || []) as StudioLibraryItemRecord[];

  const shouldLoadDiscordContext =
    activeArea !== "build" ||
    Boolean(selectedNodeId) ||
    Boolean(selectedActionId) ||
    previewOpen;

  const currentRecord = useMemo(
    () => documents.find((record) => record.id === currentDocumentId) || null,
    [documents, currentDocumentId],
  );
  const hasTicketWork = useMemo(() => {
    if (currentRecord?.moduleBinding === "tickets" || currentRecord?.moduleBinding === "ticket_panel") {
      return true;
    }
    return draft ? Object.values(draft.actions).some((action) => action.type === "ticket_create") : false;
  }, [currentRecord?.moduleBinding, draft]);
  const discordContextQuery = useDiscordContext(serverId, { enabled: shouldLoadDiscordContext });
  const ticketConfigQuery = useTicketConfig(serverId, { enabled: hasTicketWork });
  const ticketPanelsQuery = useTicketPanels(serverId, { enabled: hasTicketWork });
  const ticketConfig = ticketConfigQuery.data as any;
  const ticketPanels = (ticketPanelsQuery.data || []) as any[];
  const boundTicketPanel = useMemo(
    () => ticketPanels.find((panel) => panel.studioDocumentId === currentDocumentId) || null,
    [ticketPanels, currentDocumentId],
  );
  const ticketDepartments = Array.isArray(ticketConfig?.departments) ? ticketConfig.departments : [];

  useEffect(() => {
    const key = `studio:${serverId}:emoji-state`;
    const saved = JSON.parse(window.localStorage.getItem(key) || "{}");
    setEmojiState({ recent: saved.recent || [], favorites: saved.favorites || [] });
  }, [serverId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEntryIntent(parseStudioEntryIntent(params.get("intent")));
  }, [serverId]);

  useEffect(() => {
    if (currentDocumentId) return;
    const params = new URLSearchParams(window.location.search);
    const requested = Number(params.get("documentId") || "0");
    if (requested > 0 && documents.some((record) => record.id === requested)) {
      setCurrentDocumentId(requested);
    }
  }, [documents, currentDocumentId]);

  useEffect(() => {
    if (!currentRecord) return;
    if (dirty && loadedDocumentIdRef.current === currentRecord.id) return;
    const isNewDocument = loadedDocumentIdRef.current !== currentRecord.id;
    const nextDraft = cloneDocument(currentRecord.document as StudioDocument);
    ensureDesign(nextDraft);
    setDraft(nextDraft);
    setDirty(false);
    setSelectedViewId(nextDraft.meta.entryViewId);
    setSelectedNodeId(null);
    setSelectedActionId(null);
    setSelectedModalId(null);
    setSelectedEmbedIndex(null);
    setLastDiagnostics([]);
    if (isNewDocument) {
      setActiveArea("build");
      setBuildFocusId(getBuildFocusFromPrimaryType(inferStudioPrimarySurfaceType(nextDraft)));
      setLibraryModeId("shelf");
      setPreviewOpen(false);
      setInspectorOpen(false);
    }
    loadedDocumentIdRef.current = currentRecord.id;
  }, [currentRecord, dirty]);

  useEffect(() => {
    if (!draft) return;
    const publication = publications.find((entry) => entry.documentId === currentDocumentId && entry.active) || publications.find((entry) => entry.documentId === currentDocumentId);
    if (publication) {
      setSelectedPublicationId(publication.id);
      if (!publishChannelId) setPublishChannelId(publication.channelId);
      if (!publishViewId) setPublishViewId(publication.currentViewId || draft.meta.entryViewId);
    } else if (!publishViewId) {
      setPublishViewId(draft.meta.entryViewId);
    }
  }, [currentDocumentId, draft, publications, publishChannelId, publishViewId]);

  const currentView = draft ? getView(draft, selectedViewId) : null;
  const roleOptions = discordContextQuery.data?.roles || [];
  const emojiOptions = (discordContextQuery.data?.emojis || []).map(emojiToToken);
  const allDividerPresets = useMemo(() => [...(draft?.design?.dividerPresets || [])], [draft]);
  const allStyleBlocks = useMemo(() => [...STYLE_BLOCK_STARTERS, ...(draft?.design?.styleBlocks || [])], [draft]);
  const allThemePacks = useMemo(() => [...THEME_PACK_STARTERS, ...(draft?.design?.themePacks || [])], [draft]);
  const currentViewNodeCount = useMemo(
    () => (draft ? Object.values(draft.nodes).filter((node) => node.viewId === selectedViewId).length : 0),
    [draft, selectedViewId],
  );
  const actionCount = draft ? Object.keys(draft.actions).length : 0;
  const modalCount = draft ? Object.keys(draft.modals).length : 0;

  const interactionRows = useMemo(() => (draft ? collectInteractionMap(draft, selectedViewId) : []), [draft, selectedViewId]);
  const diagnostics = useMemo(() => {
    if (!draft) return lastDiagnostics;
    const next = [...collectStudioDiagnostics(draft, selectedViewId), ...lastDiagnostics];
    const ticketActions = Object.values(draft.actions).filter((action) => action.type === "ticket_create");
    if (ticketActions.length > 0 && !ticketConfig?.enabled) {
      next.push({ level: "warning", code: "TICKETS_DISABLED", message: "Ticket create actions exist, but the ticket system is disabled in module settings." });
    }
    if (ticketActions.length > 0 && !boundTicketPanel && ticketPanels.length === 0) {
      next.push({ level: "warning", code: "TICKET_PANEL_CONTEXT_MISSING", message: "Ticket create actions need a bound ticket panel or a selected panel context." });
    }
    const knownDepartmentIds = new Set(ticketDepartments.map((department: any) => String(department.id)));
    for (const action of ticketActions) {
      if (action.ticketDepartmentId && !knownDepartmentIds.has(String(action.ticketDepartmentId))) {
        next.push({ level: "warning", code: "TICKET_DEPARTMENT_MISSING", message: `${action.label || "A ticket action"} points to a missing ticket department.` });
      }
    }
    return next;
  }, [boundTicketPanel, draft, lastDiagnostics, selectedViewId, ticketConfig?.enabled, ticketDepartments, ticketPanels.length]);
  const errorCount = diagnostics.filter((entry) => entry.level === "error").length;
  const warningCount = diagnostics.filter((entry) => entry.level === "warning").length;
  const diagnosticsForPrefix = (prefix: string) => diagnostics.filter((entry) => typeof entry.path === "string" && entry.path.startsWith(prefix));

  const selectedNode = draft && selectedNodeId ? draft.nodes[selectedNodeId] : null;
  const selectedAction = draft && selectedActionId ? draft.actions[selectedActionId] : null;
  const selectedModal = draft && selectedModalId ? draft.modals[selectedModalId] : null;
  const selectedEmbed = currentView && selectedEmbedIndex !== null ? currentView.embeds[selectedEmbedIndex] : null;
  const selectedPublication = publications.find((entry) => entry.id === selectedPublicationId) || null;
  const quickAddParentNode = quickAddParentId && draft ? draft.nodes[quickAddParentId] : null;
  const quickAddNodeOptions = useMemo(
    () => getAllowedChildNodeTypes(quickAddParentNode?.type ?? null)
      .map((type) => NODE_TYPE_OPTIONS.find((option) => option.type === type))
      .filter((option): option is (typeof NODE_TYPE_OPTIONS)[number] => Boolean(option)),
    [quickAddParentNode],
  );
  const selectedEditorType = selectedEmbed
    ? "embed"
    : selectedNode
      ? "component"
      : selectedAction
        ? "action"
        : selectedModal
          ? "modal"
          : "none";

  const selectedEditorPayload = selectedEmbed
    ? selectedEmbed
    : selectedNode
      ? selectedNode
      : selectedAction
        ? selectedAction
        : selectedModal
          ? selectedModal
          : null;

  const selectedEditorDiagnostics = selectedEmbed && selectedEmbedIndex !== null
    ? diagnosticsForPrefix(`views.${selectedViewId}.embeds[${selectedEmbedIndex}]`)
    : selectedNode
      ? diagnosticsForPrefix(`nodes.${selectedNode.id}`)
      : selectedAction
        ? diagnosticsForPrefix(`actions.${selectedAction.id}`)
        : selectedModal
          ? diagnosticsForPrefix(`modals.${selectedModal.id}`)
          : [];

  const touchDraft = (updater: (document: StudioDocument) => void) => {
    setDraft((previous) => {
      if (!previous) return previous;
      const next = cloneDocument(previous);
      ensureDesign(next);
      updater(next);
      setDirty(true);
      return next;
    });
  };

  const openEmbedEditor = (index: number, viewId = selectedViewId) => {
    setActiveArea("build");
    setBuildFocusId("embeds");
    setSelectedViewId(viewId);
    setSelectedEmbedIndex(index);
    setSelectedNodeId(null);
    setSelectedActionId(null);
    setSelectedModalId(null);
    if (isMobile) setInspectorOpen(true);
  };

  const openNodeEditor = (nodeId: string, viewId = selectedViewId) => {
    setActiveArea("build");
    setBuildFocusId("components");
    setSelectedViewId(viewId);
    setSelectedNodeId(nodeId);
    setSelectedActionId(null);
    setSelectedModalId(null);
    setSelectedEmbedIndex(null);
    if (isMobile) setInspectorOpen(true);
  };

  const openActionEditor = (actionId: string) => {
    setActiveArea("build");
    setBuildFocusId("actions");
    setSelectedActionId(actionId);
    setSelectedNodeId(null);
    setSelectedModalId(null);
    setSelectedEmbedIndex(null);
    if (isMobile) setInspectorOpen(true);
  };

  const openModalEditor = (modalId: string) => {
    setActiveArea("build");
    setBuildFocusId("actions");
    setSelectedModalId(modalId);
    setSelectedNodeId(null);
    setSelectedActionId(null);
    setSelectedEmbedIndex(null);
    if (isMobile) setInspectorOpen(true);
  };

  const openQuickAddDrawer = (parentId?: string | null) => {
    setActiveArea("build");
    setBuildFocusId("components");
    setPreviewOpen(false);
    setQuickAddParentId(parentId || null);
    if (parentId && draft?.nodes[parentId]) {
      setSelectedNodeId(parentId);
      setSelectedActionId(null);
      setSelectedModalId(null);
      setSelectedEmbedIndex(null);
    }
    setQuickAddOpen(true);
  };

  const handleQuickAddOpenChange = (open: boolean) => {
    setQuickAddOpen(open);
    if (!open) {
      setQuickAddParentId(null);
    }
  };

  const addNodeFromQuickAdd = (type: StudioNodeType) => {
    addNodeToCurrentView(type, quickAddParentId);
    setQuickAddOpen(false);
    setQuickAddParentId(null);
  };

  useEffect(() => {
    if (!inspectorOpen) return;
    setComposerMode("edit");
  }, [inspectorOpen]);

  const jumpToDiagnosticPath = (path?: string) => {
    if (!path || !draft) return;

    setActiveArea("build");
    setPreviewOpen(false);

    const embedMatch = path.match(/^views\.([^.]+)\.embeds\[(\d+)\]/);
    if (embedMatch) {
      const [, viewId, rawIndex] = embedMatch;
      const index = Number(rawIndex);
      if (draft.views[viewId] && Number.isFinite(index)) {
        openEmbedEditor(index, viewId);
      }
      return;
    }

    const nodeMatch = path.match(/^nodes\.([^.]+)/);
    if (nodeMatch) {
      const nodeId = nodeMatch[1];
      const node = draft.nodes[nodeId];
      if (node) {
        openNodeEditor(nodeId, node.viewId || selectedViewId);
      }
      return;
    }

    const actionMatch = path.match(/^actions\.([^.]+)/);
    if (actionMatch) {
      const actionId = actionMatch[1];
      if (draft.actions[actionId]) {
        openActionEditor(actionId);
      }
      return;
    }

    const modalMatch = path.match(/^modals\.([^.]+)/);
    if (modalMatch) {
      const modalId = modalMatch[1];
      if (draft.modals[modalId]) {
        openModalEditor(modalId);
      }
      return;
    }

    const viewRootMatch = path.match(/^views\.([^.]+)\.rootNodeIds\[(\d+)\]/);
    if (viewRootMatch) {
      const [, viewId, rawIndex] = viewRootMatch;
      const index = Number(rawIndex);
      const view = draft.views[viewId];
      if (view && Number.isFinite(index) && view.rootNodeIds[index]) {
        openNodeEditor(view.rootNodeIds[index], viewId);
      }
    }
  };

  const loadDocument = (documentId: number) => {
    if (documentId === currentDocumentId) return;
    if (dirty && !window.confirm("Discard unsaved changes and switch documents?")) return;
    setCurrentDocumentId(documentId);
    const url = new URL(window.location.href);
    url.searchParams.set("documentId", String(documentId));
    window.history.replaceState({}, "", `${url.pathname}?${url.searchParams.toString()}`);
  };

  const saveDocument = () => {
    if (!draft || !currentDocumentId) return;
    updateDocumentMutation.mutate(
      {
        id: currentDocumentId,
        data: {
          name: draft.meta.name,
          document: draft,
        },
      },
      {
        onSuccess: (updated: StudioDocumentRecord) => {
          const normalized = normalizeDocumentDraft(updated.document, updated.name);
          setDraft(cloneDocument(normalized));
          setDirty(false);
          loadedDocumentIdRef.current = updated.id;
          toast({ title: "Studio saved", description: "Document changes are stored." });
        },
        onError: (error: any) => toast({ title: "Save failed", description: error.message, variant: "destructive" }),
      },
    );
  };

  const createDocument = (binding?: any, kind: "surface" | "template" = "surface", customName?: string) => {
    const name = customName || defaultSurfaceName(binding);
    const document = createStudioDocumentDraft(binding, name);
    createDocumentMutation.mutate(
      {
        scope: kind === "template" ? "personal" : "server",
        kind,
        name,
        moduleBinding: binding || undefined,
        document,
      },
      {
        onSuccess: (created: StudioDocumentRecord) => {
          const normalized = normalizeDocumentDraft(created.document, created.name);
          setCurrentDocumentId(created.id);
          setDraft(cloneDocument(normalized));
          setDirty(false);
          setActiveArea("build");
          setBuildFocusId(getBuildFocusFromPrimaryType(inferStudioPrimarySurfaceType(normalized)));
          setLibraryModeId("shelf");
          setPreviewOpen(false);
          setInspectorOpen(false);
          loadedDocumentIdRef.current = created.id;
          const url = new URL(window.location.href);
          url.searchParams.set("documentId", String(created.id));
          window.history.replaceState({}, "", `${url.pathname}?${url.searchParams.toString()}`);
          toast({ title: kind === "template" ? "Template created" : "Project created", description: `${created.name} is ready in Studio.` });
        },
        onError: (error: any) => toast({ title: "Create failed", description: error.message, variant: "destructive" }),
      },
    );
  };

  const createPrimaryDocument = (primaryType: StudioPrimarySurfaceType) => {
    const name = defaultPrimarySurfaceName(primaryType);
    const document = createStudioPrimaryDocument(primaryType, name);
    createDocumentMutation.mutate(
      {
        scope: "server",
        kind: "surface",
        name,
        document,
      },
      {
        onSuccess: (created: StudioDocumentRecord) => {
          const normalized = normalizeDocumentDraft(created.document, created.name);
          setCurrentDocumentId(created.id);
          setDraft(cloneDocument(normalized));
          setDirty(false);
          setActiveArea("build");
          setBuildFocusId(getBuildFocusFromPrimaryType(primaryType));
          setLibraryModeId("shelf");
          setPreviewOpen(false);
          setInspectorOpen(false);
          loadedDocumentIdRef.current = created.id;
          const url = new URL(window.location.href);
          url.searchParams.set("documentId", String(created.id));
          window.history.replaceState({}, "", `${url.pathname}?${url.searchParams.toString()}`);
          toast({ title: "Project created", description: `${created.name} is ready in Studio.` });
        },
        onError: (error: any) => toast({ title: "Create failed", description: error.message, variant: "destructive" }),
      },
    );
  };

  const duplicateCurrent = (asTemplate = false) => {
    if (!draft) return;
    createDocumentMutation.mutate(
      {
        scope: asTemplate ? "personal" : "server",
        kind: asTemplate ? "template" : "surface",
        name: `${draft.meta.name} Copy`,
        moduleBinding: currentRecord?.moduleBinding || undefined,
        document: draft,
      },
      {
        onSuccess: (created: StudioDocumentRecord) => {
          const normalized = normalizeDocumentDraft(created.document, created.name);
          toast({ title: asTemplate ? "Template saved" : "Project duplicated", description: created.name });
          setCurrentDocumentId(created.id);
          setDraft(cloneDocument(normalized));
          setDirty(false);
          setActiveArea("build");
          setBuildFocusId(getBuildFocusFromPrimaryType(inferStudioPrimarySurfaceType(normalized)));
          setLibraryModeId("shelf");
          setPreviewOpen(false);
          setInspectorOpen(false);
          loadedDocumentIdRef.current = created.id;
          const url = new URL(window.location.href);
          url.searchParams.set("documentId", String(created.id));
          window.history.replaceState({}, "", `${url.pathname}?${url.searchParams.toString()}`);
        },
        onError: (error: any) => toast({ title: "Duplicate failed", description: error.message, variant: "destructive" }),
      },
    );
  };

  const addView = () => {
    if (!draft) return;
    touchDraft((document) => {
      const id = makeId("view");
      document.views[id] = {
        id,
        name: `View ${Object.keys(document.views).length + 1}`,
        messageContent: "",
        embeds: [],
        rootNodeIds: [],
      };
      setSelectedViewId(id);
      setSelectedNodeId(null);
      setSelectedActionId(null);
      setSelectedModalId(null);
      setSelectedEmbedIndex(null);
    });
  };

  const removeView = (viewId: string) => {
    if (!draft) return;
    if (viewId === draft.meta.entryViewId) {
      toast({ title: "Entry view locked", description: "The entry view cannot be removed.", variant: "destructive" });
      return;
    }
    touchDraft((document) => {
      delete document.views[viewId];
      for (const [nodeId, node] of Object.entries(document.nodes)) {
        if (node.viewId === viewId) delete document.nodes[nodeId];
      }
      Object.values(document.views).forEach((view) => {
        view.rootNodeIds = view.rootNodeIds.filter((nodeId) => document.nodes[nodeId]);
      });
      setSelectedViewId(document.meta.entryViewId);
      setSelectedNodeId(null);
      setSelectedActionId(null);
      setSelectedModalId(null);
      setSelectedEmbedIndex(null);
    });
  };

  const setEntryView = (viewId: string) => {
    touchDraft((document) => {
      if (!document.views[viewId]) return;
      document.meta.entryViewId = viewId;
    });
  };

  const renameView = (viewId: string, name: string) => {
    touchDraft((document) => {
      if (!document.views[viewId]) return;
      document.views[viewId].name = name;
    });
  };

  const duplicateView = (viewId: string) => {
    if (!draft || !draft.views[viewId]) return;
    touchDraft((document) => {
      const sourceView = document.views[viewId];
      if (!sourceView) return;

      const actionMap: Record<string, string> = {};
      const modalMap: Record<string, string> = {};

      const cloneAction = (actionId?: string) => {
        if (!actionId) return undefined;
        if (actionMap[actionId]) return actionMap[actionId];
        const sourceAction = document.actions[actionId];
        if (!sourceAction) return undefined;
        const nextAction = cloneDocument(sourceAction);
        nextAction.id = makeId("act");
        actionMap[actionId] = nextAction.id;
        if (nextAction.modalId) {
          const nextModalId = cloneModal(nextAction.modalId);
          nextAction.modalId = nextModalId;
        }
        document.actions[nextAction.id] = nextAction;
        return nextAction.id;
      };

      const cloneModal = (modalId?: string) => {
        if (!modalId) return undefined;
        if (modalMap[modalId]) return modalMap[modalId];
        const sourceModal = document.modals[modalId];
        if (!sourceModal) return undefined;
        const nextModal = cloneDocument(sourceModal);
        nextModal.id = makeId("modal");
        modalMap[modalId] = nextModal.id;
        nextModal.submitActionIds = (sourceModal.submitActionIds || [])
          .map((actionId) => cloneAction(actionId))
          .filter((actionId): actionId is string => Boolean(actionId));
        document.modals[nextModal.id] = nextModal;
        return nextModal.id;
      };

      const cloneNode = (sourceId: string, newViewId: string, parentId?: string | null): string | null => {
        const sourceNode = document.nodes[sourceId];
        if (!sourceNode) return null;
        const nextNode = cloneDocument(sourceNode);
        nextNode.id = makeId(sourceNode.type.slice(0, 3));
        nextNode.viewId = newViewId;
        nextNode.parentId = parentId || null;
        nextNode.childIds = [];
        nextNode.actionId = cloneAction(sourceNode.actionId);
        if (sourceNode.optionActionIds) {
          const nextOptionActions: Record<string, string> = {};
          for (const [value, actionId] of Object.entries(sourceNode.optionActionIds)) {
            const clonedActionId = cloneAction(actionId);
            if (clonedActionId) nextOptionActions[value] = clonedActionId;
          }
          nextNode.optionActionIds = nextOptionActions;
        }
        document.nodes[nextNode.id] = nextNode;
        sourceNode.childIds.forEach((childId) => {
          const nextChildId = cloneNode(childId, newViewId, nextNode.id);
          if (nextChildId) nextNode.childIds.push(nextChildId);
        });
        return nextNode.id;
      };

      const nextViewId = makeId("view");
      const nextRootNodeIds = sourceView.rootNodeIds
        .map((nodeId) => cloneNode(nodeId, nextViewId, null))
        .filter((nodeId): nodeId is string => Boolean(nodeId));

      document.views[nextViewId] = {
        ...cloneDocument(sourceView),
        id: nextViewId,
        name: `${sourceView.name} Copy`,
        rootNodeIds: nextRootNodeIds,
      };

      setSelectedViewId(nextViewId);
      setSelectedNodeId(null);
      setSelectedActionId(null);
      setSelectedModalId(null);
      setSelectedEmbedIndex(null);
    });
  };

  const moveEmbed = (index: number, direction: "up" | "down") => {
    touchDraft((document) => {
      const embeds = document.views[selectedViewId]?.embeds || [];
      const next = direction === "up" ? index - 1 : index + 1;
      if (next < 0 || next >= embeds.length) return;
      [embeds[index], embeds[next]] = [embeds[next], embeds[index]];
      setSelectedEmbedIndex(next);
    });
  };

  const duplicateEmbed = (index: number) => {
    touchDraft((document) => {
      const embeds = document.views[selectedViewId]?.embeds || [];
      const source = embeds[index];
      if (!source) return;
      embeds.splice(index + 1, 0, cloneDocument(source));
      setSelectedEmbedIndex(index + 1);
    });
  };

  const deleteEmbed = (index: number) => {
    touchDraft((document) => {
      const embeds = document.views[selectedViewId]?.embeds || [];
      if (index < 0 || index >= embeds.length) return;
      embeds.splice(index, 1);
      if (embeds.length === 0) {
        setSelectedEmbedIndex(null);
        return;
      }
      setSelectedEmbedIndex(Math.max(0, index - 1));
    });
  };

  const addNodeToCurrentView = (type: StudioNodeType, parentId?: string | null) => {
    if (!draft || !currentView) return;
    setActiveArea("build");
    setBuildFocusId("components");
    const targetParentId = parentId || (selectedNode && canParentNode(selectedNode.type, type) ? selectedNode.id : null);
    touchDraft((document) => {
      const view = getView(document, selectedViewId);
      if (!view) return;
      const { node, actions } = createNode(type, view.id);
      actions.forEach((action) => {
        document.actions[action.id] = action;
      });
      if (targetParentId && document.nodes[targetParentId] && canParentNode(document.nodes[targetParentId].type, type)) {
        node.parentId = targetParentId;
        document.nodes[targetParentId].childIds.push(node.id);
      } else {
        view.rootNodeIds.push(node.id);
      }
      document.nodes[node.id] = node;
      setSelectedNodeId(node.id);
      setSelectedActionId(null);
      setSelectedModalId(null);
      setSelectedEmbedIndex(null);
      if (isMobile) setInspectorOpen(true);
    });
  };

  const moveNode = (nodeId: string, direction: "up" | "down") => {
    touchDraft((document) => {
      const node = document.nodes[nodeId];
      if (!node) return;
      const list = node.parentId ? document.nodes[node.parentId]?.childIds : document.views[node.viewId]?.rootNodeIds;
      if (!list) return;
      const index = list.indexOf(nodeId);
      const target = direction === "up" ? index - 1 : index + 1;
      if (index < 0 || target < 0 || target >= list.length) return;
      [list[index], list[target]] = [list[target], list[index]];
    });
  };

  const deleteNode = (nodeId: string) => {
    if (!draft) return;
    if (!window.confirm("Delete this block and its nested children?")) return;
    touchDraft((document) => {
      const removeRecursive = (id: string) => {
        const node = document.nodes[id];
        if (!node) return;
        node.childIds.forEach(removeRecursive);
        if (node.actionId) delete document.actions[node.actionId];
        Object.values(node.optionActionIds || {}).forEach((actionId) => delete document.actions[actionId]);
        delete document.nodes[id];
      };

      const node = document.nodes[nodeId];
      if (!node) return;
      const siblings = node.parentId ? document.nodes[node.parentId]?.childIds : document.views[node.viewId]?.rootNodeIds;
      if (siblings) {
        const index = siblings.indexOf(nodeId);
        if (index >= 0) siblings.splice(index, 1);
      }
      removeRecursive(nodeId);
      setSelectedNodeId(null);
      setSelectedActionId(null);
      setSelectedModalId(null);
      setSelectedEmbedIndex(null);
    });
  };

  const duplicateNode = (nodeId: string) => {
    touchDraft((document) => {
      const duplicateRecursive = (sourceId: string, parentId: string | null, viewId: string): string | null => {
        const source = document.nodes[sourceId];
        if (!source) return null;
        const clonedId = makeId(source.type.slice(0, 3));
        const clonedNode: StudioNode = cloneDocument(source);
        clonedNode.id = clonedId;
        clonedNode.viewId = viewId;
        clonedNode.parentId = parentId;
        clonedNode.childIds = [];
        if (source.actionId && document.actions[source.actionId]) {
          const nextAction = cloneDocument(document.actions[source.actionId]);
          nextAction.id = makeId("act");
          document.actions[nextAction.id] = nextAction;
          clonedNode.actionId = nextAction.id;
        }
        if (source.optionActionIds) {
          const nextOptionActionIds: Record<string, string> = {};
          for (const [value, actionId] of Object.entries(source.optionActionIds)) {
            if (!document.actions[actionId]) continue;
            const nextAction = cloneDocument(document.actions[actionId]);
            nextAction.id = makeId("act");
            document.actions[nextAction.id] = nextAction;
            nextOptionActionIds[value] = nextAction.id;
          }
          clonedNode.optionActionIds = nextOptionActionIds;
        }
        document.nodes[clonedId] = clonedNode;
        source.childIds.forEach((childId) => {
          const clonedChildId = duplicateRecursive(childId, clonedId, viewId);
          if (clonedChildId) clonedNode.childIds.push(clonedChildId);
        });
        return clonedId;
      };

      const source = document.nodes[nodeId];
      if (!source) return;
      const newId = duplicateRecursive(nodeId, source.parentId || null, source.viewId);
      if (!newId) return;
      const siblings = source.parentId ? document.nodes[source.parentId]?.childIds : document.views[source.viewId]?.rootNodeIds;
      if (!siblings) return;
      const index = siblings.indexOf(nodeId);
      siblings.splice(index + 1, 0, newId);
      setSelectedNodeId(newId);
      setSelectedActionId(null);
      setSelectedModalId(null);
      setSelectedEmbedIndex(null);
    });
  };

  const insertEmoji = (emoji: string) => {
    if (!draft) return;
    touchDraft((document) => {
      const node = selectedNodeId ? document.nodes[selectedNodeId] : undefined;
      if (node?.type === "text_display") {
        node.props.text = `${String(node.props.text || "")}${emoji}`;
      } else if (node?.type === "button") {
        node.props.label = `${String(node.props.label || "")}${emoji}`;
      } else if (node?.type === "divider") {
        node.props.mode = "emoji";
        node.props.emoji = emoji;
      } else if (node?.type === "string_select") {
        const options = Array.isArray(node.props.options) ? node.props.options : [];
        if (options[0]) {
          (options[0] as any).emoji = emoji;
          node.props.options = options;
        }
      } else if (document.views[selectedViewId]) {
        document.views[selectedViewId].messageContent = `${document.views[selectedViewId].messageContent || ""}${emoji}`;
      }
    });
    setEmojiState(upsertRecentEmoji(serverId, emoji));
  };

  const insertMacro = (macro: string) => {
    touchDraft((document) => {
      const node = selectedNodeId ? document.nodes[selectedNodeId] : undefined;
      const activeView = document.views[selectedViewId];
      if (!activeView) return;
      if (node?.type === "text_display") {
        node.props.text = `${String(node.props.text || "")}${macro}`;
        return;
      }
      if (selectedEmbedIndex !== null && activeView.embeds[selectedEmbedIndex]) {
        activeView.embeds[selectedEmbedIndex].description = `${String(activeView.embeds[selectedEmbedIndex].description || "")}${macro}`;
        return;
      }
      activeView.messageContent = `${String(activeView.messageContent || "")}${macro}`;
    });
  };

  const saveDividerPreset = () => {
    if (!draft || !selectedNode || selectedNode.type !== "divider") return;
    touchDraft((document) => {
      const design = ensureDesign(document);
      design.dividerPresets?.push({
        id: makeId("divpreset"),
        name: String(selectedNode.props.name || `Divider ${design.dividerPresets!.length + 1}`),
        mode: (selectedNode.props.mode as any) || "line",
        text: selectedNode.props.text ? String(selectedNode.props.text) : undefined,
        symbol: selectedNode.props.symbol ? String(selectedNode.props.symbol) : undefined,
        emoji: selectedNode.props.emoji ? String(selectedNode.props.emoji) : undefined,
        repeat: Number(selectedNode.props.repeat || 1),
        spacing: (selectedNode.props.spacing as any) || "normal",
      });
    });
  };

  const addDividerFromPreset = (preset: StudioDividerPreset) => {
    addNodeToCurrentView("divider");
    setTimeout(() => {
      touchDraft((document) => {
        const view = getView(document, selectedViewId);
        const nodeId = view?.rootNodeIds[view.rootNodeIds.length - 1];
        if (!nodeId) return;
        const node = document.nodes[nodeId];
        if (!node || node.type !== "divider") return;
        node.props = {
          mode: preset.mode,
          text: preset.text,
          symbol: preset.symbol,
          emoji: preset.emoji,
          repeat: preset.repeat || 1,
          spacing: preset.spacing || "normal",
        };
      });
    }, 0);
  };

  const addStyleBlock = (preset: StudioStyleBlockPreset) => {
    addNodeToCurrentView("style_block");
    setTimeout(() => {
      touchDraft((document) => {
        const view = getView(document, selectedViewId);
        const nodeId = view?.rootNodeIds[view.rootNodeIds.length - 1];
        if (!nodeId) return;
        const node = document.nodes[nodeId];
        if (!node || node.type !== "style_block") return;
        node.props.variant = preset.variant;
        node.props.title = preset.name;
        node.props.description = preset.description || "";
        node.props.accentColor = preset.accentColor || "#B11226";
      });
    }, 0);
  };

  const saveThemePack = () => {
    if (!draft) return;
    touchDraft((document) => {
      const design = ensureDesign(document);
      design.themePacks?.push({
        id: makeId("theme"),
        name: `${document.meta.name} Theme`,
        accentColor: document.views[document.meta.entryViewId]?.embeds?.[0]?.color || "#B11226",
        borderStyle: "soft",
        emojiStyle: "native",
        spacingFeel: "balanced",
      });
    });
  };

  const applyThemePack = (pack: StudioThemePack) => {
    touchDraft((document) => {
      document.meta.themePackId = pack.id;
      Object.values(document.views).forEach((view) => {
        view.embeds = view.embeds.map((embed) => ({ ...embed, color: pack.accentColor || embed.color || "#5865F2" }));
      });
      Object.values(document.nodes).forEach((node) => {
        if (node.type === "style_block") {
          node.props.accentColor = pack.accentColor || String(node.props.accentColor || "#B11226");
        }
      });
    });
  };

  const saveLibraryItem = (input: {
    category: Exclude<LibraryCategoryFilter, "all">;
    name: string;
    payload: Record<string, unknown>;
    tags?: string[];
  }) => {
    if (!input.name.trim()) {
      toast({ title: "Name required", description: "Give this library item a name before saving.", variant: "destructive" });
      return;
    }
    createLibraryItemMutation.mutate(
      {
        scope: librarySaveScope,
        category: input.category,
        name: input.name.trim(),
        payload: input.payload,
        tags: input.tags || [],
      },
      {
        onSuccess: () => {
          setLibraryItemName("");
          toast({ title: "Saved to Library", description: `${input.name} is now reusable.` });
          studioLibraryQuery.refetch();
        },
        onError: (error: any) => toast({ title: "Save failed", description: error.message, variant: "destructive" }),
      },
    );
  };

  const saveSelectedDividerToLibrary = () => {
    if (!selectedNode || selectedNode.type !== "divider") return;
    saveLibraryItem({
      category: "divider",
      name: libraryItemName || String(selectedNode.props.name || "Divider"),
      payload: {
        mode: String(selectedNode.props.mode || "line"),
        text: selectedNode.props.text ? String(selectedNode.props.text) : "",
        symbol: selectedNode.props.symbol ? String(selectedNode.props.symbol) : "",
        emoji: selectedNode.props.emoji ? String(selectedNode.props.emoji) : "",
        repeat: Number(selectedNode.props.repeat || 1),
      },
      tags: ["divider"],
    });
  };

  const saveSelectedStyleBlockToLibrary = () => {
    if (!selectedNode || selectedNode.type !== "style_block") return;
    saveLibraryItem({
      category: "style_block",
      name: libraryItemName || String(selectedNode.props.title || "Style Block"),
      payload: {
        variant: String(selectedNode.props.variant || "warning_strip"),
        title: String(selectedNode.props.title || "Style Block"),
        description: String(selectedNode.props.description || ""),
        accentColor: String(selectedNode.props.accentColor || "#B11226"),
      },
      tags: ["style"],
    });
  };

  const saveCurrentThemeToLibrary = () => {
    if (!draft) return;
    const activeThemePack = allThemePacks.find((pack) => pack.id === draft.meta.themePackId) || allThemePacks[0];
    if (!activeThemePack) return;
    saveLibraryItem({
      category: "style_pack",
      name: libraryItemName || `${draft.meta.name} Theme`,
      payload: {
        ...activeThemePack,
      },
      tags: ["theme"],
    });
  };

  const saveMessageSnippetToLibrary = () => {
    const snippet = String(currentView?.messageContent || "").trim();
    if (!snippet) {
      toast({ title: "Nothing to save", description: "Write message content first.", variant: "destructive" });
      return;
    }
    saveLibraryItem({
      category: "snippet",
      name: libraryItemName || `${currentView?.name || "View"} Snippet`,
      payload: { text: snippet },
      tags: ["snippet", "message"],
    });
  };

  const saveAssetLinkToLibrary = () => {
    if (!libraryAssetUrl.trim()) {
      toast({ title: "URL required", description: "Paste an asset URL before saving.", variant: "destructive" });
      return;
    }
    saveLibraryItem({
      category: "asset_link",
      name: libraryAssetName || "Asset Link",
      payload: { url: libraryAssetUrl.trim() },
      tags: ["asset"],
    });
    setLibraryAssetName("");
    setLibraryAssetUrl("");
  };

  const insertLibraryItem = (item: StudioLibraryItemRecord) => {
    const payload = (item.payload || {}) as Record<string, unknown>;

    if (item.category === "divider") {
      addNodeToCurrentView("divider");
      setTimeout(() => {
        touchDraft((document) => {
          const view = getView(document, selectedViewId);
          const nodeId = view?.rootNodeIds[view.rootNodeIds.length - 1];
          if (!nodeId) return;
          const node = document.nodes[nodeId];
          if (!node || node.type !== "divider") return;
          node.props = {
            mode: String(payload.mode || "line"),
            text: String(payload.text || ""),
            symbol: String(payload.symbol || ""),
            emoji: String(payload.emoji || ""),
            repeat: Number(payload.repeat || 1),
          };
        });
      }, 0);
      return;
    }

    if (item.category === "style_block") {
      addNodeToCurrentView("style_block");
      setTimeout(() => {
        touchDraft((document) => {
          const view = getView(document, selectedViewId);
          const nodeId = view?.rootNodeIds[view.rootNodeIds.length - 1];
          if (!nodeId) return;
          const node = document.nodes[nodeId];
          if (!node || node.type !== "style_block") return;
          node.props.variant = String(payload.variant || "warning_strip");
          node.props.title = String(payload.title || item.name);
          node.props.description = String(payload.description || "");
          node.props.accentColor = String(payload.accentColor || "#B11226");
        });
      }, 0);
      return;
    }

    if (item.category === "style_pack") {
      applyThemePack({
        id: String(payload.id || makeId("theme")),
        name: String(payload.name || item.name),
        accentColor: payload.accentColor ? String(payload.accentColor) : undefined,
        dividerPresetId: payload.dividerPresetId ? String(payload.dividerPresetId) : undefined,
        borderStyle: payload.borderStyle as any,
        emojiStyle: payload.emojiStyle as any,
        spacingFeel: payload.spacingFeel as any,
      });
      return;
    }

    if (item.category === "emoji") {
      insertEmoji(String(payload.emoji || item.name));
      return;
    }

    if (item.category === "asset_link") {
      touchDraft((document) => {
        document.assets.push({
          id: makeId("asset"),
          name: item.name,
          type: "image",
          url: String(payload.url || ""),
        });
      });
      return;
    }

    const text = String(payload.text || payload.value || "");
    if (text) insertMacro(text);
  };

  const publishDocument = () => {
    if (!draft) return;
    if (!publishChannelId.trim()) {
      toast({ title: "Select a channel", description: "Choose the target channel before publishing.", variant: "destructive" });
      return;
    }
    if (diagnostics.some((entry) => entry.level === "error")) {
      setActiveArea("publish");
      toast({ title: "Fix errors first", description: "Publishing is blocked until validation errors are resolved.", variant: "destructive" });
      return;
    }
    publishMutation.mutate(
      {
        documentId: currentDocumentId || undefined,
        document: draft,
        target: {
          channelId: publishChannelId.trim(),
          messageId: updateMessageId.trim() || undefined,
          viewId: publishViewId || selectedViewId || draft.meta.entryViewId,
        },
      },
      {
        onSuccess: (result: any) => {
          setSelectedPublicationId(result.publicationId);
          setUpdateMessageId(result.messageId || "");
          setLastDiagnostics(result.diagnostics || []);
          setDirty(false);
          toast({ title: "Published", description: `Message ${result.messageId} is live.` });
          studioPublicationsQuery.refetch();
          studioDocumentsQuery.refetch();
        },
        onError: (error: any) => toast({ title: "Publish failed", description: error.message, variant: "destructive" }),
      },
    );
  };

  const clonePublication = (publicationId: number) => {
    if (!cloneChannelId.trim()) {
      toast({ title: "Clone target missing", description: "Choose a channel to clone into.", variant: "destructive" });
      return;
    }
    clonePublicationMutation.mutate(
      { id: publicationId, channelId: cloneChannelId.trim() },
      {
        onSuccess: () => {
          toast({ title: "Publication cloned", description: `Cloned into ${cloneChannelId}.` });
          studioPublicationsQuery.refetch();
        },
        onError: (error: any) => toast({ title: "Clone failed", description: error.message, variant: "destructive" }),
      },
    );
  };

  const rollbackPublication = (publication: PublicationWithMeta) => {
    const previousSnapshot = publication.snapshots?.[1];
    if (!previousSnapshot) {
      toast({ title: "No rollback target", description: "This publication has only one snapshot.", variant: "destructive" });
      return;
    }
    rollbackPublicationMutation.mutate(
      { id: publication.id, snapshotId: previousSnapshot.id },
      {
        onSuccess: () => {
          toast({ title: "Rolled back", description: `Restored snapshot v${previousSnapshot.version}.` });
          studioPublicationsQuery.refetch();
        },
        onError: (error: any) => toast({ title: "Rollback failed", description: error.message, variant: "destructive" }),
      },
    );
  };

  const archivePublication = (publicationId: number) => {
    archivePublicationMutation.mutate(publicationId, {
      onSuccess: () => {
        toast({ title: "Publication archived", description: "The live message is now archived." });
        studioPublicationsQuery.refetch();
      },
      onError: (error: any) => toast({ title: "Archive failed", description: error.message, variant: "destructive" }),
    });
  };

  const togglePublicationStatus = (publication: PublicationWithMeta) => {
    updatePublicationStatusMutation.mutate(
      {
        id: publication.id,
        data: {
          active: !publication.active,
          status: !publication.active ? "published" : "draft",
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Publication updated", description: !publication.active ? "Publication marked active." : "Publication marked inactive." });
          studioPublicationsQuery.refetch();
        },
        onError: (error: any) => toast({ title: "Update failed", description: error.message, variant: "destructive" }),
      },
    );
  };

  const updateSelectedNode = (updater: (node: StudioNode) => void) => {
    if (!selectedNodeId) return;
    touchDraft((document) => {
      const node = document.nodes[selectedNodeId];
      if (!node) return;
      updater(node);
    });
  };

  const updateSelectedAction = (updater: (action: StudioAction) => void) => {
    if (!selectedActionId) return;
    touchDraft((document) => {
      const action = document.actions[selectedActionId];
      if (!action) return;
      updater(action);
    });
  };

  const updateSelectedModal = (updater: (modal: StudioModalDefinition) => void) => {
    if (!selectedModalId) return;
    touchDraft((document) => {
      const modal = document.modals[selectedModalId];
      if (!modal) return;
      updater(modal);
    });
  };

  const duplicateActionById = (actionId: string) => {
    touchDraft((document) => {
      const source = document.actions[actionId];
      if (!source) return;
      const next = cloneDocument(source);
      next.id = makeId("act");
      document.actions[next.id] = next;
      setSelectedActionId(next.id);
      setSelectedNodeId(null);
      setSelectedModalId(null);
      setSelectedEmbedIndex(null);
    });
  };

  const deleteActionById = (actionId: string) => {
    if (!window.confirm("Delete this action?")) return;
    touchDraft((document) => {
      delete document.actions[actionId];
      Object.values(document.nodes).forEach((node) => {
        if (node.actionId === actionId) node.actionId = undefined;
        if (node.optionActionIds) {
          for (const [value, id] of Object.entries(node.optionActionIds)) {
            if (id === actionId) delete node.optionActionIds[value];
          }
        }
      });
      Object.values(document.modals).forEach((modal) => {
        modal.submitActionIds = modal.submitActionIds.filter((id) => id !== actionId);
      });
      setSelectedActionId(null);
    });
  };

  const duplicateModalById = (modalId: string) => {
    touchDraft((document) => {
      const source = document.modals[modalId];
      if (!source) return;
      const actionMap: Record<string, string> = {};
      const cloneAction = (actionId: string) => {
        if (actionMap[actionId]) return actionMap[actionId];
        const sourceAction = document.actions[actionId];
        if (!sourceAction) return "";
        const nextAction = cloneDocument(sourceAction);
        nextAction.id = makeId("act");
        document.actions[nextAction.id] = nextAction;
        actionMap[actionId] = nextAction.id;
        return nextAction.id;
      };

      const next = cloneDocument(source);
      next.id = makeId("modal");
      next.title = `${source.title} Copy`;
      next.submitActionIds = source.submitActionIds.map(cloneAction).filter(Boolean);
      document.modals[next.id] = next;
      setSelectedModalId(next.id);
      setSelectedActionId(null);
      setSelectedNodeId(null);
      setSelectedEmbedIndex(null);
    });
  };

  const deleteModalById = (modalId: string) => {
    if (!window.confirm("Delete this modal?")) return;
    touchDraft((document) => {
      delete document.modals[modalId];
      Object.values(document.actions).forEach((action) => {
        if (action.modalId === modalId) action.modalId = undefined;
      });
      setSelectedModalId(null);
    });
  };

  const addAction = (type: InteractiveActionConfig["type"] = "reply_message") => {
    const action = createAction(type);
    touchDraft((document) => {
      document.actions[action.id] = action;
    });
    setBuildFocusId("actions");
    setSelectedActionId(action.id);
    setSelectedNodeId(null);
    setSelectedModalId(null);
    setSelectedEmbedIndex(null);
    setActiveArea("build");
    if (isMobile) setInspectorOpen(true);
  };

  const addModal = () => {
    const modal = createModal();
    const submitAction = createAction("reply_message");
    modal.submitActionIds = [submitAction.id];
    touchDraft((document) => {
      document.modals[modal.id] = modal;
      document.actions[submitAction.id] = submitAction;
    });
    setBuildFocusId("actions");
    setSelectedModalId(modal.id);
    setSelectedActionId(null);
    setSelectedNodeId(null);
    setSelectedEmbedIndex(null);
    setActiveArea("build");
    if (isMobile) setInspectorOpen(true);
  };

  const importFromJson = () => {
    try {
      const parsed = JSON.parse(importText);
      const normalized = normalizeDocumentDraft(parsed, draft?.meta.name || "Imported Project");
      setDraft(normalized);
      setDirty(true);
      setActiveArea("build");
      setBuildFocusId(getBuildFocusFromPrimaryType(inferStudioPrimarySurfaceType(normalized)));
      setSelectedViewId(normalized.meta.entryViewId);
      toast({ title: "JSON imported", description: "Review and save before publishing." });
    } catch (error: any) {
      toast({ title: "Invalid JSON", description: error.message || "Could not parse Studio JSON.", variant: "destructive" });
    }
  };

  const exportJson = async () => {
    if (!draft) return;
    await navigator.clipboard.writeText(JSON.stringify(draft, null, 2));
    toast({ title: "JSON copied", description: "Studio document JSON is on your clipboard." });
  };

  const renderOverviewSection = () => (
    <div className="space-y-4">
      <Card className="glass-card border-white/10 bg-background/40">
        <CardHeader>
          <CardTitle className="font-display text-base">Project</CardTitle>
          <CardDescription>Keep one message model across embeds, components, actions, and modals.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Project Name</Label>
              <Input value={draft?.meta.name || ""} onChange={(event) => touchDraft((document) => { document.meta.name = event.target.value; })} />
            </div>
            <div className="space-y-2">
              <Label>View Name</Label>
              <Input
                value={currentView?.name || ""}
                onChange={(event) => renameView(selectedViewId, event.target.value)}
                placeholder="Entry"
              />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Start View</Label>
              <Select value={draft?.meta.entryViewId || "entry"} onValueChange={setEntryView}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {draft ? Object.values(draft.views).map((view) => <SelectItem key={view.id} value={view.id}>{view.name}</SelectItem>) : null}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>View Tools</Label>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={addView} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add View
                </Button>
                <Button variant="outline" size="sm" onClick={() => duplicateView(selectedViewId)} className="gap-2">
                  <Copy className="h-4 w-4" />
                  Duplicate
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeView(selectedViewId)}
                  className="text-destructive"
                  disabled={selectedViewId === draft?.meta.entryViewId}
                >
                  Remove
                </Button>
              </div>
            </div>
          </div>
          {!isMobile ? (
            <div className="flex flex-wrap gap-2">
              {draft ? Object.values(draft.views).map((view) => (
                <Button
                  key={view.id}
                  variant={selectedViewId === view.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setSelectedViewId(view.id);
                    setSelectedNodeId(null);
                    setSelectedActionId(null);
                    setSelectedModalId(null);
                    setSelectedEmbedIndex(null);
                  }}
                >
                  {view.name}
                  {draft.meta.entryViewId === view.id ? " - Entry" : ""}
                </Button>
              )) : null}
              <Button variant="ghost" size="sm" onClick={() => setEntryView(selectedViewId)} className="gap-2">
                <Plus className="h-4 w-4" />
                Set Start
              </Button>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-background/25 px-3 py-2 text-xs text-muted-foreground">
              Quick view switching stays in the rail above. Use the view tools here to add, duplicate, remove, or set the start view.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderContentSection = () => (
    <Card className="glass-card border-white/10 bg-background/40">
      <CardHeader>
        <CardTitle className="font-display text-base">Body</CardTitle>
        <CardDescription>Write content for the selected view. Add embeds, components, and actions to the same message.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={currentView?.messageContent || ""}
          onChange={(event) => touchDraft((document) => { document.views[selectedViewId].messageContent = event.target.value; })}
          placeholder="Write message content..."
          className="min-h-[140px]"
        />
        <div className="flex flex-wrap gap-2">
          {QUICK_MACROS.map((macro) => (
            <Button key={`macro-${macro.label}`} variant="outline" size="sm" onClick={() => insertMacro(macro.value)}>
              {macro.label}
            </Button>
          ))}
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{(currentView?.messageContent || "").length}/2000 characters</span>
          <span>Discord markdown and links are supported.</span>
        </div>
      </CardContent>
    </Card>
  );

  const renderEmbedsSection = () => (
    <Card className="glass-card border-white/10 bg-background/40">
      <CardHeader>
        <CardTitle className="font-display text-base">Embeds</CardTitle>
        <CardDescription>Select an embed to edit in the inspector.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {(currentView?.embeds || []).length === 0 ? <p className="text-sm text-muted-foreground">No embeds yet. Add one to start.</p> : null}
        {(currentView?.embeds || []).map((embed, index) => {
          const path = `views.${selectedViewId}.embeds[${index}]`;
          const issues = diagnosticsForPrefix(path);
          const embedLabel = String(embed.title || "").trim() || `Embed ${index + 1}`;
          const totalText = (
            String(embed.title || "").length +
            String(embed.description || "").length +
            String(embed.authorName || "").length +
            String(embed.footerText || "").length +
            (embed.fields || []).reduce((count, field) => count + String(field.name || "").length + String(field.value || "").length, 0)
          );

          return (
            <div
              key={`embed-${index}`}
              role="button"
              tabIndex={0}
              onClick={() => openEmbedEditor(index)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                openEmbedEditor(index);
              }}
              className={cn(
                "w-full rounded-2xl border bg-background/30 p-4 text-left transition",
                selectedEmbedIndex === index ? "border-primary/40 bg-primary/10" : "border-white/10 hover:border-white/20",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{embedLabel}</p>
                  <p className="truncate text-xs text-muted-foreground">{String(embed.description || "No description").slice(0, 96)}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{totalText}/6000 chars</p>
                </div>
                <div className="flex items-center gap-2">
                  {issues.length > 0 ? (
                    <Badge variant={issues.some((entry) => entry.level === "error") ? "destructive" : "secondary"}>
                      {issues.length} issue{issues.length === 1 ? "" : "s"}
                    </Badge>
                  ) : (
                    <Badge variant="outline">OK</Badge>
                  )}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button type="button" variant="ghost" size="icon" onClick={(event) => { event.stopPropagation(); moveEmbed(index, "up"); }}><ArrowUp className="h-4 w-4" /></Button>
                <Button type="button" variant="ghost" size="icon" onClick={(event) => { event.stopPropagation(); moveEmbed(index, "down"); }}><ArrowDown className="h-4 w-4" /></Button>
                <Button type="button" variant="ghost" size="icon" onClick={(event) => { event.stopPropagation(); duplicateEmbed(index); }}><Copy className="h-4 w-4" /></Button>
                <Button type="button" variant="ghost" size="icon" onClick={(event) => { event.stopPropagation(); deleteEmbed(index); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          );
        })}
        <Button variant="outline" className="w-full gap-2" onClick={() => touchDraft((document) => {
          document.views[selectedViewId].embeds.push({ title: "", description: "", color: document.views[selectedViewId].embeds[0]?.color || "#5865F2" });
          setBuildFocusId("embeds");
          setSelectedEmbedIndex(document.views[selectedViewId].embeds.length - 1);
          setSelectedNodeId(null);
          setSelectedActionId(null);
          setSelectedModalId(null);
          if (isMobile) setInspectorOpen(true);
        })}>
          <Plus className="h-4 w-4" />
          Add Embed
        </Button>
      </CardContent>
    </Card>
  );

  const renderLibraryShelfSection = () => (
    <Card className="glass-card border-white/10 bg-background/40">
      <CardHeader>
        <CardTitle className="font-display text-base">Library</CardTitle>
        <CardDescription>Reusable snippets, dividers, blocks, and asset links. Save personal or server-shared items.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Input value={librarySearch} onChange={(event) => setLibrarySearch(event.target.value)} placeholder="Search library" />
          <Select value={libraryScopeFilter} onValueChange={(value: LibraryScopeFilter) => setLibraryScopeFilter(value)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Scopes</SelectItem>
              <SelectItem value="personal">Personal</SelectItem>
              <SelectItem value="server">Server</SelectItem>
            </SelectContent>
          </Select>
          <Select value={libraryCategoryFilter} onValueChange={(value: LibraryCategoryFilter) => setLibraryCategoryFilter(value)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="divider">Dividers</SelectItem>
              <SelectItem value="symbol">Symbols</SelectItem>
              <SelectItem value="emoji">Emoji</SelectItem>
              <SelectItem value="format">Formatting</SelectItem>
              <SelectItem value="style_block">Style Blocks</SelectItem>
              <SelectItem value="style_pack">Style Packs</SelectItem>
              <SelectItem value="asset_link">Asset Links</SelectItem>
              <SelectItem value="snippet">Snippets</SelectItem>
            </SelectContent>
          </Select>
          <Button variant={libraryFavoritesOnly ? "default" : "outline"} onClick={() => setLibraryFavoritesOnly((prev) => !prev)}>
            {libraryFavoritesOnly ? "Favorites Only" : "Show Favorites"}
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {libraryItems.length === 0 ? (
            <p className="text-sm text-muted-foreground md:col-span-2 xl:col-span-3">No saved items for this filter yet.</p>
          ) : null}
          {libraryItems.map((item) => {
            const payload = (item.payload || {}) as Record<string, unknown>;
            const preview = String(payload.text || payload.url || payload.symbol || payload.emoji || payload.title || "");
            return (
              <div key={item.id} className="rounded-2xl border border-white/10 bg-background/30 p-3">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{item.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.category} - {item.scope}</p>
                  </div>
                  <Badge variant={item.favorite ? "default" : "outline"}>{item.favorite ? "Fav" : "Saved"}</Badge>
                </div>
                <p className="line-clamp-2 min-h-[2.5rem] text-xs text-muted-foreground">{preview || "No preview payload"}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => insertLibraryItem(item)}>Insert</Button>
                  {preview ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        await navigator.clipboard.writeText(preview);
                        toast({ title: "Copied", description: `${item.name} copied.` });
                      }}
                    >
                      Copy
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleLibraryFavoriteMutation.mutate({ id: item.id, favorite: !item.favorite })}
                  >
                    {item.favorite ? "Unfavorite" : "Favorite"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => deleteLibraryItemMutation.mutate(item.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <Separator className="bg-white/10" />

        <div className="space-y-3 rounded-2xl border border-white/10 bg-background/25 p-3">
          <div className="grid gap-3 md:grid-cols-[1fr,160px]">
            <Input value={libraryItemName} onChange={(event) => setLibraryItemName(event.target.value)} placeholder="New library item name" />
            <Select value={librarySaveScope} onValueChange={(value: "personal" | "server") => setLibrarySaveScope(value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">Personal</SelectItem>
                <SelectItem value="server">Server Shared</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={saveSelectedDividerToLibrary} disabled={selectedNode?.type !== "divider"}>Save Divider</Button>
            <Button variant="outline" size="sm" onClick={saveSelectedStyleBlockToLibrary} disabled={selectedNode?.type !== "style_block"}>Save Style Block</Button>
            <Button variant="outline" size="sm" onClick={saveCurrentThemeToLibrary}>Save Theme</Button>
            <Button variant="outline" size="sm" onClick={saveMessageSnippetToLibrary}>Save Snippet</Button>
          </div>
          <div className="grid gap-2 md:grid-cols-[180px,1fr,auto]">
            <Input value={libraryAssetName} onChange={(event) => setLibraryAssetName(event.target.value)} placeholder="Asset name" />
            <Input value={libraryAssetUrl} onChange={(event) => setLibraryAssetUrl(event.target.value)} placeholder="https://image-or-file-link" />
            <Button variant="outline" onClick={saveAssetLinkToLibrary}>Save Asset Link</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderDesignSection = () => (
    <div className="space-y-4">
      <Card className="glass-card border-white/10 bg-background/40">
        <CardHeader>
          <CardTitle className="font-display text-base">Divider Library</CardTitle>
          <CardDescription>Create reusable line, symbol, emoji, and stacked separators.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              { name: "Minimal Line", mode: "line", text: "----------" },
              { name: "Symbol Divider", mode: "symbol", symbol: "*", repeat: 8 },
              { name: "Emoji Divider", mode: "emoji", emoji: "✨", repeat: 4 },
              { name: "Stacked", mode: "stacked", text: "----", repeat: 3 },
            ].map((preset) => (
              <button key={preset.name} type="button" className="rounded-2xl border border-white/10 bg-background/30 p-4 text-left hover:border-primary/30" onClick={() => {
                addNodeToCurrentView("divider");
                setTimeout(() => touchDraft((document) => {
                  const view = getView(document, selectedViewId);
                  const nodeId = view?.rootNodeIds[view.rootNodeIds.length - 1];
                  const node = nodeId ? document.nodes[nodeId] : null;
                  if (!node || node.type !== "divider") return;
                  node.props = { ...preset };
                }), 0);
              }}>
                <p className="text-sm font-medium text-white">{preset.name}</p>
                <p className="mt-2 text-xs text-muted-foreground">{preset.mode}</p>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {allDividerPresets.map((preset) => (
              <Button key={preset.id} variant="outline" size="sm" onClick={() => addDividerFromPreset(preset)}>
                {preset.name}
              </Button>
            ))}
            <Button variant="outline" size="sm" onClick={saveDividerPreset} disabled={selectedNode?.type !== "divider"}>
              Save Selected Divider
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card border-white/10 bg-background/40">
        <CardHeader>
          <CardTitle className="font-display text-base">Style Blocks and Emoji Shelf</CardTitle>
          <CardDescription>Drop in reusable message chunks and insert emojis into the active target.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {allStyleBlocks.map((preset) => (
              <button key={preset.id} type="button" onClick={() => addStyleBlock(preset)} className="rounded-2xl border border-white/10 bg-background/30 p-4 text-left transition hover:border-primary/30">
                <div className="mb-2 flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: preset.accentColor || "#B11226" }} />
                  <span className="font-medium text-white">{preset.name}</span>
                </div>
                <p className="text-sm text-muted-foreground">{preset.description}</p>
              </button>
            ))}
          </div>
          <Separator className="bg-white/10" />
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Favorites</p>
            <div className="flex flex-wrap gap-2">
              {emojiState.favorites.length === 0 ? <span className="text-xs text-muted-foreground">No favorites saved yet.</span> : null}
              {emojiState.favorites.map((emoji) => <Button key={`fav-${emoji}`} variant="outline" size="sm" onClick={() => insertEmoji(emoji)}>{emoji}</Button>)}
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {[...QUICK_EMOJI, ...emojiOptions].slice(0, 30).map((emoji) => (
              <div key={emoji} className="rounded-xl border border-white/10 bg-background/30 p-2">
                <Button variant="ghost" className="w-full text-lg" onClick={() => insertEmoji(emoji)}>{emoji}</Button>
                <Button variant="ghost" className="mt-1 h-7 w-full text-xs text-muted-foreground" onClick={() => setEmojiState(toggleFavoriteEmoji(serverId, emoji))}>Favorite</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card border-white/10 bg-background/40">
        <CardHeader>
          <CardTitle className="font-display text-base">Preset Theme Packs</CardTitle>
          <CardDescription>Save and apply a full look: accent color, spacing feel, divider defaults, and emoji preference.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {allThemePacks.map((pack) => (
              <button key={pack.id} type="button" onClick={() => applyThemePack(pack)} className={cn("rounded-2xl border p-4 text-left transition", draft?.meta.themePackId === pack.id ? "border-primary/40 bg-primary/10" : "border-white/10 bg-background/30 hover:border-primary/30")}>
                <div className="mb-3 flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: pack.accentColor || "#B11226" }} />
                  <span className="font-medium text-white">{pack.name}</span>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>Border: {pack.borderStyle || "minimal"}</p>
                  <p>Emoji: {pack.emojiStyle || "native"}</p>
                  <p>Spacing: {pack.spacingFeel || "balanced"}</p>
                </div>
              </button>
            ))}
          </div>
          <Button variant="outline" onClick={saveThemePack}>Save Current Theme Pack</Button>
        </CardContent>
      </Card>

      <Card className="glass-card border-white/10 bg-background/40">
        <CardHeader>
          <CardTitle className="font-display text-base">Decorative Text Helpers</CardTitle>
          <CardDescription>Discord-safe text presets and references you can insert into content or text blocks.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {QUICK_MACROS.map((macro) => (
              <Button key={`lab-macro-${macro.label}`} variant="outline" size="sm" onClick={() => insertMacro(macro.value)}>
                {macro.label}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">These helpers insert Discord-safe tokens and references into your active message context.</p>
        </CardContent>
      </Card>
    </div>
  );

  const renderTemplatesSection = () => (
    <div className="space-y-4">
      <Card className="glass-card border-white/10 bg-background/40">
        <CardHeader>
          <CardTitle className="font-display text-base">Templates and JSON</CardTitle>
          <CardDescription>Duplicate projects into templates, export JSON, and load another Studio payload into the current draft.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => duplicateCurrent(true)} className="gap-2"><Copy className="h-4 w-4" />Save As Template</Button>
            <Button variant="outline" onClick={() => duplicateCurrent(false)} className="gap-2"><FilePlus2 className="h-4 w-4" />Duplicate Project</Button>
            <Button variant="outline" onClick={exportJson}>Export JSON</Button>
          </div>
          <div className="space-y-2">
            <Label>Import JSON Into Current Draft</Label>
            <Textarea value={importText} onChange={(event) => setImportText(event.target.value)} className="min-h-[180px] font-mono text-xs" placeholder="Paste a Studio document JSON payload here." />
            <Button variant="outline" onClick={importFromJson}>Load JSON</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card border-white/10 bg-background/40">
        <CardHeader>
          <CardTitle className="font-display text-base">Saved Projects</CardTitle>
          <CardDescription>Switch between projects, messages, and templates without leaving Studio.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {documents.map((record) => (
            <button key={record.id} type="button" onClick={() => loadDocument(record.id)} className={cn("flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition", currentDocumentId === record.id ? "border-primary/40 bg-primary/10" : "border-white/10 bg-background/30 hover:border-white/20")}>
              <Library className="h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{record.name}</p>
                <p className="text-xs text-muted-foreground">{getDocumentKindLabel(record.kind)} {record.moduleBinding ? `- ${getBindingLabel(record.moduleBinding)}` : ""}</p>
              </div>
              <Badge variant="outline">#{record.id}</Badge>
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );

  const renderAssetsSection = () => (
    <Card className="glass-card border-white/10 bg-background/40">
      <CardHeader>
        <CardTitle className="font-display text-base">Assets and Files</CardTitle>
        <CardDescription>Store image, banner, and file references used by the current document.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {(draft?.assets || []).map((asset, index) => (
          <div key={asset.id || index} className="grid gap-3 rounded-2xl border border-white/10 bg-background/30 p-4 md:grid-cols-[1fr,120px,auto]">
            <Input value={asset.name} onChange={(event) => touchDraft((document) => { document.assets[index].name = event.target.value; })} placeholder="Asset name" />
            <Select value={asset.type} onValueChange={(value: any) => touchDraft((document) => { document.assets[index].type = value; })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="file">File</SelectItem>
                <SelectItem value="banner">Banner</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" onClick={() => touchDraft((document) => { document.assets.splice(index, 1); })}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
            <div className="md:col-span-3">
              <Input value={asset.url} onChange={(event) => touchDraft((document) => { document.assets[index].url = event.target.value; })} placeholder="https://cdn.example.com/file.png" />
            </div>
          </div>
        ))}
        <Button variant="outline" className="gap-2" onClick={() => touchDraft((document) => {
          document.assets.push({ id: makeId("asset"), name: `Asset ${document.assets.length + 1}`, type: "image", url: "" });
        })}>
          <Plus className="h-4 w-4" />
          Add Asset
        </Button>
      </CardContent>
    </Card>
  );

  const renderMobileWorkspaceBanner = ({
    eyebrow,
    title,
    description,
    chips = [],
  }: {
    eyebrow: string;
    title: string;
    description: string;
    chips?: string[];
  }) => (
    <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,20,24,0.96),rgba(8,9,11,0.98))] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.34)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,45,77,0.16),transparent_36%),radial-gradient(circle_at_bottom_left,rgba(177,18,38,0.18),transparent_30%)]" />
      <div className="relative">
        <p className="text-[10px] uppercase tracking-[0.34em] text-white/40">{eyebrow}</p>
        <div className="mt-2 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-xl text-white">{title}</h3>
            <p className="mt-1 max-w-[28rem] text-sm text-muted-foreground">{description}</p>
          </div>
          <Badge className={cn("shrink-0 border border-white/10 bg-white/5 text-[11px] text-white", dirty ? "text-primary" : "text-white/80")}>
            {dirty ? "Unsaved" : "Saved"}
          </Badge>
        </div>
        {chips.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {chips.map((chip) => (
              <Badge key={`${eyebrow}-${chip}`} variant="outline" className="border-white/10 bg-black/20 text-[11px] text-white/75">
                {chip}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );

  const renderBuildWorkspace = () => {
    if (!isMobile) {
      return (
        <div className="space-y-4">
          {renderOverviewSection()}
          {renderContentSection()}
          {renderEmbedsSection()}
          {renderTreeSection()}
          {renderActionsSection()}
        </div>
      );
    }

    switch (buildFocusId) {
      case "embeds":
        return (
          <div className="space-y-4">
            {renderMobileWorkspaceBanner({
              eyebrow: "Embed Workspace",
              title: "Rich message cards",
              description: "Manage embeds, color accents, media, and field-heavy message layouts for the current view.",
              chips: [
                currentView?.name || "No view",
                formatUnitCount(currentView?.embeds?.length || 0, "embed"),
                errorCount > 0 ? `${errorCount} error${errorCount === 1 ? "" : "s"}` : "Preview-safe",
              ],
            })}
            {renderEmbedsSection()}
          </div>
        );
      case "components":
        return (
          <div className="space-y-4">
            {renderMobileWorkspaceBanner({
              eyebrow: "Component Workspace",
              title: "Layout and interaction blocks",
              description: "Shape the structure of the active view with sections, buttons, menus, dividers, galleries, and files.",
              chips: [
                currentView?.name || "No view",
                formatUnitCount(currentViewNodeCount, "block"),
                actionCount > 0 ? `${actionCount} linked action${actionCount === 1 ? "" : "s"}` : "No linked actions",
              ],
            })}
            {renderTreeSection()}
          </div>
        );
      case "actions":
        return (
          <div className="space-y-4">
            {renderMobileWorkspaceBanner({
              eyebrow: "Action Workspace",
              title: "Responses and modal flow",
              description: "Wire buttons, menus, and forms into replies, routes, role updates, and operational actions.",
              chips: [
                formatUnitCount(actionCount, "action"),
                formatUnitCount(modalCount, "modal"),
                warningCount > 0 ? `${warningCount} warning${warningCount === 1 ? "" : "s"}` : "Runtime ready",
              ],
            })}
            {renderActionsSection()}
          </div>
        );
      case "assets":
        return (
          <div className="space-y-4">
            {renderMobileWorkspaceBanner({
              eyebrow: "Asset Utility",
              title: "Images, banners, and file links",
              description: "Keep reusable media references attached to the current project so embeds and layouts stay consistent.",
              chips: [
                formatUnitCount(draft?.assets?.length || 0, "asset"),
                currentView?.name || "Project-wide",
              ],
            })}
            {renderAssetsSection()}
          </div>
        );
      case "content":
      default:
        return (
          <div className="space-y-4">
            {renderMobileWorkspaceBanner({
              eyebrow: "Content Workspace",
              title: "Message surface and view setup",
              description: "Rename the project, switch views, tune the start point, and write the message body from one focused editing lane.",
              chips: [
                currentView?.name || "No view",
                `${(currentView?.messageContent || "").length}/2000 chars`,
                draft ? formatUnitCount(Object.keys(draft.views).length, "view") : "0 views",
              ],
            })}
            {renderOverviewSection()}
            {renderContentSection()}
          </div>
        );
    }
  };

  const renderTreeSection = () => (
    <Card className="glass-card border-white/10 bg-background/40">
      <CardHeader>
        <CardTitle className="font-display text-base">Components</CardTitle>
        <CardDescription>Add root blocks, then use Add Inside on containers, sections, and action rows to nest layouts correctly.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {NODE_TYPE_OPTIONS.map((option) => (
            <Button key={option.type} variant="outline" className="h-auto justify-start py-3" onClick={() => addNodeToCurrentView(option.type)}>
              <div className="text-left">
                <div className="text-sm font-medium text-white">{option.label}</div>
                <div className="text-xs text-muted-foreground">{option.detail}</div>
              </div>
            </Button>
          ))}
        </div>
        <Separator className="bg-white/10" />
        <div className="space-y-2">
          {(currentView?.rootNodeIds || []).length === 0 ? <p className="text-sm text-muted-foreground">No blocks yet. Add a node to start the layout.</p> : null}
          {(currentView?.rootNodeIds || []).map((nodeId) => (
            <NodeTreeItem
              key={nodeId}
              document={draft!}
              nodeId={nodeId}
              depth={0}
              selectedNodeId={selectedNodeId}
              diagnosticsForPrefix={diagnosticsForPrefix}
              onSelect={(node) => openNodeEditor(node)}
              onAddInside={(node) => openQuickAddDrawer(node)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const renderActionsSection = () => (
    <div className="space-y-4">
      <Card className="glass-card border-white/10 bg-background/40">
        <CardHeader>
          <CardTitle className="font-display text-base">Actions</CardTitle>
          <CardDescription>Buttons, menus, and modal submits all resolve through these action definitions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {ACTION_TYPE_OPTIONS.map((option) => (
              <Button key={option.type} variant="outline" className="h-auto justify-start py-3" onClick={() => addAction(option.type)}>
                <div className="text-left">
                  <div className="text-sm font-medium text-white">{option.label}</div>
                  <div className="text-xs text-muted-foreground">{option.detail}</div>
                </div>
              </Button>
            ))}
          </div>
          <Separator className="bg-white/10" />
          <div className="space-y-2">
            {draft && Object.values(draft.actions).length === 0 ? <p className="text-sm text-muted-foreground">No actions yet.</p> : null}
            {draft ? Object.values(draft.actions).map((action) => {
              const issues = diagnosticsForPrefix(`actions.${action.id}`);
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => openActionEditor(action.id)}
                  className={cn("flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition", selectedActionId === action.id ? "border-primary/40 bg-primary/10" : "border-white/10 bg-background/30 hover:border-white/20")}
                >
                  <MousePointer2 className="h-4 w-4 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{action.label || action.type}</p>
                    <p className="truncate text-xs text-muted-foreground">{actionSummary(action, draft)}</p>
                  </div>
                  {issues.length > 0 ? (
                    <Badge variant={issues.some((entry) => entry.level === "error") ? "destructive" : "secondary"}>{issues.length}</Badge>
                  ) : null}
                  <Badge variant="outline">{action.type}</Badge>
                </button>
              );
            }) : null}
          </div>
        </CardContent>
      </Card>
      {renderModalsSection()}
    </div>
  );

  const renderModalsSection = () => (
    <Card className="glass-card border-white/10 bg-background/40">
      <CardHeader>
        <CardTitle className="font-display text-base">Modal Builder</CardTitle>
        <CardDescription>Build modal forms and wire them to button or menu actions.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={addModal} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Modal
        </Button>
        <div className="space-y-2">
          {draft && Object.values(draft.modals).length === 0 ? <p className="text-sm text-muted-foreground">No modals yet.</p> : null}
            {draft ? Object.values(draft.modals).map((modal) => {
              const issues = diagnosticsForPrefix(`modals.${modal.id}`);
              return (
                <button
                  key={modal.id}
                  type="button"
                  onClick={() => openModalEditor(modal.id)}
                  className={cn("flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition", selectedModalId === modal.id ? "border-primary/40 bg-primary/10" : "border-white/10 bg-background/30 hover:border-white/20")}
                >
                  <Workflow className="h-4 w-4 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{modal.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{modal.fields.length} fields - {modal.submitActionIds.length} submit actions</p>
                  </div>
                  {issues.length > 0 ? (
                    <Badge variant={issues.some((entry) => entry.level === "error") ? "destructive" : "secondary"}>{issues.length}</Badge>
                  ) : null}
                  <Badge variant="outline">modal</Badge>
                </button>
              );
            }) : null}
        </div>
      </CardContent>
    </Card>
  );

  const renderPublishSection = () => (
    <div className="space-y-4">
      <Card className="glass-card border-white/10 bg-background/40">
        <CardHeader>
          <CardTitle className="font-display text-base">Validation Summary</CardTitle>
          <CardDescription>Fix errors before publishing. Warnings can publish but may degrade output.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant={diagnostics.some((entry) => entry.level === "error") ? "destructive" : "outline"}>
              {diagnostics.filter((entry) => entry.level === "error").length} errors
            </Badge>
            <Badge variant={diagnostics.some((entry) => entry.level === "warning") ? "secondary" : "outline"}>
              {diagnostics.filter((entry) => entry.level === "warning").length} warnings
            </Badge>
            <Badge variant="outline">{diagnostics.filter((entry) => entry.level === "info").length} info</Badge>
          </div>
          <ScrollArea className="max-h-56 rounded-xl border border-white/10 bg-background/40 p-3">
            <div className="space-y-2">
              {diagnostics.length === 0 ? <p className="text-xs text-muted-foreground">No diagnostics. This message is publish-safe.</p> : null}
              {diagnostics.map((entry, index) => (
                <button
                  key={`${entry.code}-${index}`}
                  type="button"
                  onClick={() => jumpToDiagnosticPath(entry.path)}
                  className="w-full rounded-lg border border-white/10 bg-background/50 px-3 py-2 text-left text-xs transition hover:border-primary/30"
                >
                  <p className={cn("font-medium uppercase", entry.level === "error" ? "text-red-400" : entry.level === "warning" ? "text-amber-300" : "text-muted-foreground")}>{entry.level}</p>
                  <p className="text-muted-foreground">{entry.message}</p>
                  {entry.path ? <p className="text-[10px] text-muted-foreground/80">{entry.path}</p> : null}
                </button>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="glass-card border-white/10 bg-background/40">
        <CardHeader>
          <CardTitle className="font-display text-base">Publish</CardTitle>
          <CardDescription>Pick a channel, publish new, or update an existing message.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <DiscordChannelPicker serverId={serverId} value={publishChannelId} onChange={setPublishChannelId} label="Target Channel" allowedKinds={["text", "announcement", "forum"]} />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>View To Publish</Label>
              <Select value={publishViewId || selectedViewId} onValueChange={setPublishViewId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {draft ? Object.values(draft.views).map((view) => <SelectItem key={view.id} value={view.id}>{view.name}</SelectItem>) : null}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Existing Message ID (optional)</Label>
              <Input value={updateMessageId} onChange={(event) => setUpdateMessageId(event.target.value)} placeholder="Leave empty to publish new" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={publishDocument} disabled={publishMutation.isPending} className="gap-2"><Rocket className="h-4 w-4" />{publishMutation.isPending ? "Publishing..." : updateMessageId ? "Update Message" : "Publish New"}</Button>
            <Button variant="outline" onClick={saveDocument} disabled={!dirty || updateDocumentMutation.isPending} className="gap-2"><Save className="h-4 w-4" />Save Draft</Button>
            <Button variant="outline" onClick={exportJson} className="gap-2">
              <Copy className="h-4 w-4" />
              Export JSON
            </Button>
          </div>
        </CardContent>
      </Card>

      {selectedPublication ? (
        <Card className="glass-card border-white/10 bg-background/40">
          <CardHeader>
            <CardTitle className="font-display text-base">Publish Diagnostics</CardTitle>
            <CardDescription>Latest publication status and runtime hints.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="rounded-xl border border-white/10 bg-background/30 p-3">
              <p className="text-white">Publication #{selectedPublication.id}</p>
              <p className="text-xs text-muted-foreground">{selectedPublication.channelId} - {selectedPublication.messageId}</p>
              <p className="mt-1 text-xs text-muted-foreground">Status: {selectedPublication.status}</p>
              {selectedPublication.lastFailureSummary ? <p className="mt-1 text-xs text-red-300">{selectedPublication.lastFailureSummary}</p> : null}
            </div>
            {(selectedPublication.recentEvents || []).map((event) => (
              <div key={event.id} className="rounded-xl border border-white/10 bg-background/30 p-3 text-xs">
                <p className="font-medium text-white">{event.summary}</p>
                <p className="text-muted-foreground">{new Date(event.occurredAt).toLocaleString()}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );

  const renderDesignWorkspace = () => {
    if (!isMobile) {
      return (
        <div className="space-y-4">
          {renderLibraryShelfSection()}
          {renderDesignSection()}
          {renderTemplatesSection()}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {renderMobileWorkspaceBanner({
          eyebrow: "Studio Library",
          title: "Assets, presets, and reusable parts",
          description: "Browse saved pieces, build new visual helpers, or jump into templates and JSON tools without leaving the editor.",
          chips: [
            formatUnitCount(libraryItems.length, "saved item"),
            librarySearch ? `Search: ${librarySearch}` : "Browse mode",
          ],
        })}
        <div className="grid grid-cols-3 gap-2">
          {MOBILE_LIBRARY_MODES.map((mode) => (
            <Button
              key={`mobile-library-mode-${mode.id}`}
              variant={libraryModeId === mode.id ? "default" : "outline"}
              className={cn("h-auto rounded-2xl px-3 py-3 text-sm", libraryModeId === mode.id ? "shadow-[0_16px_30px_rgba(177,18,38,0.2)]" : "border-white/10 bg-background/35")}
              onClick={() => setLibraryModeId(mode.id)}
            >
              {mode.label}
            </Button>
          ))}
        </div>
        {libraryModeId === "shelf" ? renderLibraryShelfSection() : null}
        {libraryModeId === "tools" ? renderDesignSection() : null}
        {libraryModeId === "templates" ? renderTemplatesSection() : null}
      </div>
    );
  };

  const renderActiveWorkspace = () => {
    switch (activeArea) {
      case "library":
        return renderDesignWorkspace();
      case "publish":
        return isMobile ? (
          <div className="space-y-4">
            {renderMobileWorkspaceBanner({
              eyebrow: "Publish Utility",
              title: "Validate and ship",
              description: "Review diagnostics, target the right channel, and publish or update the live message without leaving Studio.",
              chips: [
                `${errorCount} error${errorCount === 1 ? "" : "s"}`,
                `${warningCount} warning${warningCount === 1 ? "" : "s"}`,
                selectedPublication ? `Live #${selectedPublication.id}` : "No live message",
              ],
            })}
            {renderPublishSection()}
          </div>
        ) : renderPublishSection();
      case "preview":
        return null;
      case "build":
      default:
        return renderBuildWorkspace();
    }
  };

  const inspectorBody = !draft ? null : (
    <div className="space-y-4">
      {selectedEmbed && selectedEmbedIndex !== null ? (
        <Card className="glass-card border-white/10 bg-background/40">
          <CardHeader>
            <CardTitle className="font-display text-base">Embed</CardTitle>
            <CardDescription>Embed {selectedEmbedIndex + 1}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {(() => {
                const issues = diagnosticsForPrefix(`views.${selectedViewId}.embeds[${selectedEmbedIndex}]`);
                if (issues.length === 0) return <Badge variant="outline">No errors</Badge>;
                return (
                  <Badge variant={issues.some((entry) => entry.level === "error") ? "destructive" : "secondary"}>
                    {issues.length} issue{issues.length === 1 ? "" : "s"}
                  </Badge>
                );
              })()}
              <Button variant="outline" size="sm" onClick={() => moveEmbed(selectedEmbedIndex, "up")}><ArrowUp className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" onClick={() => moveEmbed(selectedEmbedIndex, "down")}><ArrowDown className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" onClick={() => duplicateEmbed(selectedEmbedIndex)} className="gap-2"><Copy className="h-4 w-4" />Duplicate</Button>
              <Button variant="ghost" size="sm" onClick={() => deleteEmbed(selectedEmbedIndex)} className="gap-2 text-destructive"><Trash2 className="h-4 w-4" />Delete</Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={selectedEmbed.title || ""} onChange={(event) => touchDraft((document) => {
                  document.views[selectedViewId].embeds[selectedEmbedIndex].title = event.target.value;
                })} />
                <p className="text-[11px] text-muted-foreground">{String(selectedEmbed.title || "").length}/256</p>
              </div>
              <div className="space-y-2">
                <Label>Title URL</Label>
                <Input value={selectedEmbed.url || ""} onChange={(event) => touchDraft((document) => {
                  document.views[selectedViewId].embeds[selectedEmbedIndex].url = event.target.value;
                })} placeholder="https://..." />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={selectedEmbed.description || ""} onChange={(event) => touchDraft((document) => {
                document.views[selectedViewId].embeds[selectedEmbedIndex].description = event.target.value;
              })} className="min-h-[120px]" />
              <p className="text-[11px] text-muted-foreground">{String(selectedEmbed.description || "").length}/4096</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Color</Label>
                <Input value={selectedEmbed.color || "#5865F2"} onChange={(event) => touchDraft((document) => {
                  document.views[selectedViewId].embeds[selectedEmbedIndex].color = event.target.value;
                })} />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2">
                <Label>Timestamp</Label>
                <Switch checked={Boolean(selectedEmbed.timestamp)} onCheckedChange={(checked) => touchDraft((document) => {
                  document.views[selectedViewId].embeds[selectedEmbedIndex].timestamp = checked;
                })} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Author</Label>
                <Input value={selectedEmbed.authorName || ""} onChange={(event) => touchDraft((document) => { document.views[selectedViewId].embeds[selectedEmbedIndex].authorName = event.target.value; })} placeholder="Author name" />
                <Input value={selectedEmbed.authorUrl || ""} onChange={(event) => touchDraft((document) => { document.views[selectedViewId].embeds[selectedEmbedIndex].authorUrl = event.target.value; })} placeholder="Author URL" />
                <Input value={selectedEmbed.authorIconUrl || ""} onChange={(event) => touchDraft((document) => { document.views[selectedViewId].embeds[selectedEmbedIndex].authorIconUrl = event.target.value; })} placeholder="Author icon URL" />
                <Input value={selectedEmbed.authorId || ""} onChange={(event) => touchDraft((document) => { document.views[selectedViewId].embeds[selectedEmbedIndex].authorId = event.target.value; })} placeholder="Author ID (metadata)" />
              </div>
              <div className="space-y-2">
                <Label>Footer</Label>
                <Input value={selectedEmbed.footerText || ""} onChange={(event) => touchDraft((document) => { document.views[selectedViewId].embeds[selectedEmbedIndex].footerText = event.target.value; })} placeholder="Footer text" />
                <Input value={selectedEmbed.footerIconUrl || ""} onChange={(event) => touchDraft((document) => { document.views[selectedViewId].embeds[selectedEmbedIndex].footerIconUrl = event.target.value; })} placeholder="Footer icon URL" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Image URL</Label>
                <Input value={selectedEmbed.imageUrl || ""} onChange={(event) => touchDraft((document) => { document.views[selectedViewId].embeds[selectedEmbedIndex].imageUrl = event.target.value; })} />
              </div>
              <div className="space-y-2">
                <Label>Thumbnail URL</Label>
                <Input value={selectedEmbed.thumbnailUrl || ""} onChange={(event) => touchDraft((document) => { document.views[selectedViewId].embeds[selectedEmbedIndex].thumbnailUrl = event.target.value; })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Fields</Label>
              {(selectedEmbed.fields || []).map((field, fieldIndex) => (
                <div key={`embed-field-${selectedEmbedIndex}-${fieldIndex}`} className="rounded-lg border border-white/10 bg-background/50 p-3 space-y-2">
                  <Input value={field.name || ""} onChange={(event) => touchDraft((document) => {
                    document.views[selectedViewId].embeds[selectedEmbedIndex].fields ||= [];
                    document.views[selectedViewId].embeds[selectedEmbedIndex].fields![fieldIndex] = {
                      ...(document.views[selectedViewId].embeds[selectedEmbedIndex].fields![fieldIndex] || {}),
                      name: event.target.value,
                    };
                  })} placeholder="Field name" />
                  <Textarea value={field.value || ""} onChange={(event) => touchDraft((document) => {
                    document.views[selectedViewId].embeds[selectedEmbedIndex].fields ||= [];
                    document.views[selectedViewId].embeds[selectedEmbedIndex].fields![fieldIndex] = {
                      ...(document.views[selectedViewId].embeds[selectedEmbedIndex].fields![fieldIndex] || {}),
                      value: event.target.value,
                    };
                  })} placeholder="Field value" className="min-h-[80px]" />
                  <div className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2">
                    <Label>Inline</Label>
                    <Switch checked={Boolean(field.inline)} onCheckedChange={(checked) => touchDraft((document) => {
                      document.views[selectedViewId].embeds[selectedEmbedIndex].fields ||= [];
                      document.views[selectedViewId].embeds[selectedEmbedIndex].fields![fieldIndex] = {
                        ...(document.views[selectedViewId].embeds[selectedEmbedIndex].fields![fieldIndex] || {}),
                        inline: checked,
                      };
                    })} />
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => touchDraft((document) => {
                document.views[selectedViewId].embeds[selectedEmbedIndex].fields ||= [];
                document.views[selectedViewId].embeds[selectedEmbedIndex].fields!.push({ name: "", value: "", inline: false });
              })}>
                Add Field
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {selectedNode ? (
        <Card className="glass-card border-white/10 bg-background/40">
          <CardHeader>
            <CardTitle className="font-display text-base">Block</CardTitle>
            <CardDescription>{selectedNode.type.replace(/_/g, " ")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(() => {
                const issues = diagnosticsForPrefix(`nodes.${selectedNode.id}`);
                if (issues.length === 0) return <Badge variant="outline">No errors</Badge>;
                return (
                  <Badge variant={issues.some((entry) => entry.level === "error") ? "destructive" : "secondary"}>
                    {issues.length} issue{issues.length === 1 ? "" : "s"}
                  </Badge>
                );
              })()}
              <Button variant="outline" size="sm" onClick={() => moveNode(selectedNode.id, "up")}><ArrowUp className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" onClick={() => moveNode(selectedNode.id, "down")}><ArrowDown className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" onClick={() => duplicateNode(selectedNode.id)} className="gap-2"><Copy className="h-4 w-4" />Duplicate</Button>
              <Button variant="ghost" size="sm" onClick={() => deleteNode(selectedNode.id)} className="gap-2 text-destructive"><Trash2 className="h-4 w-4" />Delete</Button>
            </div>

            {selectedNode.type === "text_display" ? (
              <div className="space-y-2">
                <Label>Text</Label>
                <Textarea value={String(selectedNode.props.text || "")} onChange={(event) => updateSelectedNode((node) => { node.props.text = event.target.value; })} className="min-h-[180px]" />
                <div className="flex flex-wrap gap-2">
                  {QUICK_MACROS.slice(0, 5).map((macro) => (
                    <Button key={`inspector-macro-${macro.label}`} variant="outline" size="sm" onClick={() => insertMacro(macro.value)}>
                      {macro.label}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}

            {["container", "section"].includes(selectedNode.type) ? (
              <>
                <div className="space-y-2">
                  <Label>Heading</Label>
                  <Input value={String(selectedNode.props.heading || "")} onChange={(event) => updateSelectedNode((node) => { node.props.heading = event.target.value; })} />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={String(selectedNode.props.description || "")} onChange={(event) => updateSelectedNode((node) => { node.props.description = event.target.value; })} />
                </div>
              </>
            ) : null}

            {selectedNode.type === "divider" ? (
              <>
                <div className="space-y-2">
                  <Label>Mode</Label>
                  <Select value={String(selectedNode.props.mode || "line")} onValueChange={(value) => updateSelectedNode((node) => { node.props.mode = value; })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="line">Line</SelectItem>
                      <SelectItem value="symbol">Symbol</SelectItem>
                      <SelectItem value="emoji">Emoji</SelectItem>
                      <SelectItem value="stacked">Stacked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input value={String(selectedNode.props.text || "")} onChange={(event) => updateSelectedNode((node) => { node.props.text = event.target.value; })} placeholder="Text / line" />
                  <Input value={String(selectedNode.props.symbol || selectedNode.props.emoji || "")} onChange={(event) => updateSelectedNode((node) => {
                    if (String(node.props.mode || "line") === "emoji") node.props.emoji = event.target.value;
                    else node.props.symbol = event.target.value;
                  })} placeholder="Symbol / emoji" />
                </div>
                <div className="space-y-2">
                  <Label>Repeat</Label>
                  <Input type="number" value={String(selectedNode.props.repeat || 1)} onChange={(event) => updateSelectedNode((node) => { node.props.repeat = Number(event.target.value || 1); })} />
                </div>
              </>
            ) : null}

            {selectedNode.type === "style_block" ? (
              <>
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={String(selectedNode.props.title || "")} onChange={(event) => updateSelectedNode((node) => { node.props.title = event.target.value; })} />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={String(selectedNode.props.description || "")} onChange={(event) => updateSelectedNode((node) => { node.props.description = event.target.value; })} className="min-h-[100px]" />
                </div>
                <div className="space-y-2">
                  <Label>Accent Color</Label>
                  <Input value={String(selectedNode.props.accentColor || "#B11226")} onChange={(event) => updateSelectedNode((node) => { node.props.accentColor = event.target.value; })} />
                </div>
              </>
            ) : null}

            {selectedNode.type === "media_gallery" ? (
              <>
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={String(selectedNode.props.title || "")} onChange={(event) => updateSelectedNode((node) => { node.props.title = event.target.value; })} />
                </div>
                <div className="space-y-3">
                  {((selectedNode.props.items as any[]) || []).map((item, index) => (
                    <div key={`${selectedNode.id}-media-${index}`} className="rounded-xl border border-white/10 bg-background/30 p-3 space-y-2">
                      <Input value={String(item?.url || "")} placeholder="https://..." onChange={(event) => updateSelectedNode((node) => {
                        const items = Array.isArray(node.props.items) ? [...(node.props.items as any[])] : [];
                        items[index] = { ...(items[index] || {}), url: event.target.value };
                        node.props.items = items;
                      })} />
                      <Input value={String(item?.description || "")} placeholder="Description" onChange={(event) => updateSelectedNode((node) => {
                        const items = Array.isArray(node.props.items) ? [...(node.props.items as any[])] : [];
                        items[index] = { ...(items[index] || {}), description: event.target.value };
                        node.props.items = items;
                      })} />
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => updateSelectedNode((node) => {
                        const items = Array.isArray(node.props.items) ? [...(node.props.items as any[])] : [];
                        items.splice(index, 1);
                        node.props.items = items;
                      })}>
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => updateSelectedNode((node) => {
                    const items = Array.isArray(node.props.items) ? [...(node.props.items as any[])] : [];
                    items.push({ url: "", description: "" });
                    node.props.items = items;
                  })}>
                    Add Media
                  </Button>
                </div>
              </>
            ) : null}

            {selectedNode.type === "file" ? (
              <>
                <div className="space-y-2">
                  <Label>Label</Label>
                  <Input value={String(selectedNode.props.label || "")} onChange={(event) => updateSelectedNode((node) => { node.props.label = event.target.value; })} />
                </div>
                <div className="space-y-2">
                  <Label>URL</Label>
                  <Input value={String(selectedNode.props.url || "")} onChange={(event) => updateSelectedNode((node) => { node.props.url = event.target.value; })} />
                </div>
              </>
            ) : null}

            {selectedNode.type === "action_row" ? (
              <p className="text-sm text-muted-foreground">This row can hold up to five buttons or one select menu.</p>
            ) : null}

            {["button", "string_select", "role_select", "user_select", "channel_select", "mentionable_select"].includes(selectedNode.type) ? (
              <>
                <div className="space-y-2">
                  <Label>{selectedNode.type === "button" ? "Label" : "Menu Label"}</Label>
                  <Input value={String(selectedNode.props.label || "")} onChange={(event) => updateSelectedNode((node) => { node.props.label = event.target.value; })} />
                </div>
                {selectedNode.type === "button" ? (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Emoji</Label>
                        <Input value={String(selectedNode.props.emoji || "")} onChange={(event) => updateSelectedNode((node) => { node.props.emoji = event.target.value; })} placeholder="Optional emoji" />
                      </div>
                      <div className="space-y-2">
                        <Label>Style</Label>
                        <Select value={String(selectedNode.props.style || 1)} onValueChange={(value) => updateSelectedNode((node) => { node.props.style = Number(value); })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Primary</SelectItem>
                            <SelectItem value="2">Secondary</SelectItem>
                            <SelectItem value="3">Success</SelectItem>
                            <SelectItem value="4">Danger</SelectItem>
                            <SelectItem value="5">Link</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Custom ID</Label>
                        <Input value={String(selectedNode.props.customId || "")} onChange={(event) => updateSelectedNode((node) => { node.props.customId = event.target.value; })} />
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2">
                        <Label>Disabled</Label>
                        <Switch checked={Boolean(selectedNode.props.disabled)} onCheckedChange={(checked) => updateSelectedNode((node) => { node.props.disabled = checked; })} />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Placeholder</Label>
                        <Input value={String(selectedNode.props.placeholder || "")} onChange={(event) => updateSelectedNode((node) => { node.props.placeholder = event.target.value; })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Custom ID</Label>
                        <Input value={String(selectedNode.props.customId || "")} onChange={(event) => updateSelectedNode((node) => { node.props.customId = event.target.value; })} />
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Min</Label>
                        <Input type="number" value={String(selectedNode.props.minValues || 1)} onChange={(event) => updateSelectedNode((node) => { node.props.minValues = Number(event.target.value || 1); })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Max</Label>
                        <Input type="number" value={String(selectedNode.props.maxValues || 1)} onChange={(event) => updateSelectedNode((node) => { node.props.maxValues = Number(event.target.value || 1); })} />
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2">
                        <Label>Disabled</Label>
                        <Switch checked={Boolean(selectedNode.props.disabled)} onCheckedChange={(checked) => updateSelectedNode((node) => { node.props.disabled = checked; })} />
                      </div>
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <Label>Action</Label>
                  <Select
                    value={selectedNode.actionId || "__none__"}
                    onValueChange={(value) => {
                      if (value === "__create__") {
                        const nextAction = createAction("reply_message");
                        touchDraft((document) => {
                          document.actions[nextAction.id] = nextAction;
                          if (selectedNodeId && document.nodes[selectedNodeId]) {
                            document.nodes[selectedNodeId].actionId = nextAction.id;
                          }
                        });
                        setSelectedActionId(nextAction.id);
                        setSelectedNodeId(null);
                        return;
                      }
                      updateSelectedNode((node) => { node.actionId = value === "__none__" ? undefined : value; });
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Select action" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No action</SelectItem>
                      <SelectItem value="__create__">Create action</SelectItem>
                      {Object.values(draft.actions).map((action) => <SelectItem key={action.id} value={action.id}>{action.label || action.type}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {selectedNode.actionId ? (
                  <Button variant="outline" size="sm" onClick={() => {
                    setSelectedActionId(selectedNode.actionId || null);
                    setSelectedNodeId(null);
                  }}>
                    Edit Action
                  </Button>
                ) : null}
              </>
            ) : null}

            {selectedNode.type === "string_select" ? (
              <>
                <div className="space-y-3">
                  {((selectedNode.props.options as any[]) || []).map((option, index) => (
                    <div key={`${selectedNode.id}-option-${index}`} className="rounded-xl border border-white/10 bg-background/30 p-3 space-y-2">
                      <Input value={String(option.label || "")} onChange={(event) => updateSelectedNode((node) => {
                        const options = Array.isArray(node.props.options) ? [...(node.props.options as any[])] : [];
                        options[index] = { ...options[index], label: event.target.value };
                        node.props.options = options;
                      })} placeholder="Option label" />
                      <Input value={String(option.value || "")} onChange={(event) => updateSelectedNode((node) => {
                        const options = Array.isArray(node.props.options) ? [...(node.props.options as any[])] : [];
                        options[index] = { ...options[index], value: event.target.value };
                        node.props.options = options;
                      })} placeholder="Option value" />
                      <Input value={String(option.description || "")} onChange={(event) => updateSelectedNode((node) => {
                        const options = Array.isArray(node.props.options) ? [...(node.props.options as any[])] : [];
                        options[index] = { ...options[index], description: event.target.value };
                        node.props.options = options;
                      })} placeholder="Option description" />
                      <Input value={String(option.emoji || "")} onChange={(event) => updateSelectedNode((node) => {
                        const options = Array.isArray(node.props.options) ? [...(node.props.options as any[])] : [];
                        options[index] = { ...options[index], emoji: event.target.value };
                        node.props.options = options;
                      })} placeholder="Option emoji" />
                      <div className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2">
                        <Label>Default</Label>
                        <Switch checked={Boolean(option.default)} onCheckedChange={(checked) => updateSelectedNode((node) => {
                          const options = Array.isArray(node.props.options) ? [...(node.props.options as any[])] : [];
                          options[index] = { ...options[index], default: checked };
                          node.props.options = options;
                        })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Option Action</Label>
                        <Select
                          value={selectedNode.optionActionIds?.[String(option.value || "")] || "__none__"}
                          onValueChange={(value) => {
                            const optionValue = String(option.value || "");
                            if (!optionValue) return;
                            if (value === "__create__") {
                              const nextAction = createAction("reply_message");
                              touchDraft((document) => {
                                document.actions[nextAction.id] = nextAction;
                                if (selectedNodeId && document.nodes[selectedNodeId]) {
                                  document.nodes[selectedNodeId].optionActionIds ||= {};
                                  document.nodes[selectedNodeId].optionActionIds![optionValue] = nextAction.id;
                                }
                              });
                              setSelectedActionId(nextAction.id);
                              setSelectedNodeId(null);
                              return;
                            }
                            touchDraft((document) => {
                              if (!selectedNodeId || !document.nodes[selectedNodeId]) return;
                              document.nodes[selectedNodeId].optionActionIds ||= {};
                              if (value === "__none__") delete document.nodes[selectedNodeId].optionActionIds![optionValue];
                              else document.nodes[selectedNodeId].optionActionIds![optionValue] = value;
                            });
                          }}
                        >
                          <SelectTrigger><SelectValue placeholder="Select action" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">No action</SelectItem>
                            <SelectItem value="__create__">Create action</SelectItem>
                            {Object.values(draft.actions).map((action) => (
                              <SelectItem key={`${selectedNode.id}-${option.value}-${action.id}`} value={action.id}>{action.label || action.type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => updateSelectedNode((node) => {
                        const options = Array.isArray(node.props.options) ? [...(node.props.options as any[])] : [];
                        options.splice(index, 1);
                        node.props.options = options;
                      })}>
                        Remove Option
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => updateSelectedNode((node) => {
                    const options = Array.isArray(node.props.options) ? [...(node.props.options as any[])] : [];
                    options.push({ label: `Option ${options.length + 1}`, value: `option_${options.length + 1}` });
                    node.props.options = options;
                  })}>
                    Add Option
                  </Button>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {selectedAction ? (
        <Card className="glass-card border-white/10 bg-background/40">
          <CardHeader>
            <CardTitle className="font-display text-base">Action</CardTitle>
            <CardDescription>{actionSummary(selectedAction, draft)}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              {(() => {
                const issues = diagnosticsForPrefix(`actions.${selectedAction.id}`);
                if (issues.length === 0) return <Badge variant="outline">No errors</Badge>;
                return (
                  <Badge variant={issues.some((entry) => entry.level === "error") ? "destructive" : "secondary"}>
                    {issues.length} issue{issues.length === 1 ? "" : "s"}
                  </Badge>
                );
              })()}
              <Button variant="outline" size="sm" onClick={() => duplicateActionById(selectedAction.id)} className="gap-2"><Copy className="h-4 w-4" />Duplicate</Button>
              <Button variant="ghost" size="sm" onClick={() => deleteActionById(selectedAction.id)} className="gap-2 text-destructive"><Trash2 className="h-4 w-4" />Delete</Button>
            </div>
            <div className="space-y-2">
              <Label>Label</Label>
              <Input value={selectedAction.label || ""} onChange={(event) => updateSelectedAction((action) => { action.label = event.target.value; })} />
            </div>
            <div className="space-y-2">
              <Label>Action Type</Label>
              <Select value={selectedAction.type} onValueChange={(value: any) => updateSelectedAction((action) => { action.type = value; })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTION_TYPE_OPTIONS.map((option) => <SelectItem key={option.type} value={option.type}>{option.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Reply Mode</Label>
                <Select value={selectedAction.replyMode || "ephemeral"} onValueChange={(value: any) => updateSelectedAction((action) => { action.replyMode = value; })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ephemeral">Ephemeral</SelectItem>
                    <SelectItem value="channel">Channel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2">
                <Label>Disabled</Label>
                <Switch checked={Boolean(selectedAction.disabled)} onCheckedChange={(checked) => updateSelectedAction((action) => { action.disabled = checked; })} />
              </div>
            </div>
            {selectedAction.type === "open_url" ? <Input value={selectedAction.url || ""} onChange={(event) => updateSelectedAction((action) => { action.url = event.target.value; })} placeholder="https://..." /> : null}
            {["role_add", "role_remove", "role_toggle"].includes(selectedAction.type) ? (
              <Select value={selectedAction.roleId || "__none__"} onValueChange={(value) => updateSelectedAction((action) => { action.roleId = value === "__none__" ? undefined : value; })}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No role selected</SelectItem>
                  {roleOptions.map((role) => <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : null}
            {selectedAction.type === "ticket_create" ? (
              <>
                <div className="space-y-2">
                  <Label>Ticket Panel Context</Label>
                  <Select
                    value={selectedAction.ticketPanelId ? String(selectedAction.ticketPanelId) : "__bound__"}
                    onValueChange={(value) => updateSelectedAction((action) => {
                      action.ticketPanelId = value === "__bound__" ? undefined : Number(value);
                    })}
                  >
                    <SelectTrigger><SelectValue placeholder="Use the bound ticket panel" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__bound__">
                        {boundTicketPanel ? `Use bound panel: ${boundTicketPanel.title}` : "Use publication-bound panel"}
                      </SelectItem>
                      {ticketPanels.map((panel) => (
                        <SelectItem key={panel.id} value={String(panel.id)}>
                          {panel.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select
                    value={selectedAction.ticketDepartmentId || "__default__"}
                    onValueChange={(value) => updateSelectedAction((action) => {
                      action.ticketDepartmentId = value === "__default__" ? undefined : value;
                    })}
                  >
                    <SelectTrigger><SelectValue placeholder="Default routing" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__default__">Default routing</SelectItem>
                      {ticketDepartments.map((department: any) => (
                        <SelectItem key={department.id} value={department.id}>
                          {department.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : null}
            {[ "channel_message", "log_action" ].includes(selectedAction.type) ? <DiscordChannelPicker serverId={serverId} value={selectedAction.channelId || ""} onChange={(value) => updateSelectedAction((action) => { action.channelId = value; })} label="Destination Channel" allowedKinds={["text", "announcement", "forum"]} /> : null}
            {selectedAction.type === "open_modal" ? (
              <Select value={selectedAction.modalId || "__none__"} onValueChange={(value) => updateSelectedAction((action) => { action.modalId = value === "__none__" ? undefined : value; })}>
                <SelectTrigger><SelectValue placeholder="Select modal" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No modal</SelectItem>
                  {Object.values(draft.modals).map((modal) => <SelectItem key={modal.id} value={modal.id}>{modal.title}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : null}
            {["goto_view", "back_view", "confirm"].includes(selectedAction.type) ? (
              <div className="space-y-2">
                <Label>Target View</Label>
                <Select value={selectedAction.targetViewId || "__none__"} onValueChange={(value) => updateSelectedAction((action) => { action.targetViewId = value === "__none__" ? undefined : value; })}>
                  <SelectTrigger><SelectValue placeholder="Select view" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No target</SelectItem>
                    {Object.values(draft.views).map((view) => (
                      <SelectItem key={`target-${view.id}`} value={view.id}>{view.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            {selectedAction.type === "cancel_view" ? (
              <div className="space-y-2">
                <Label>Fallback View</Label>
                <Select value={selectedAction.fallbackViewId || "__none__"} onValueChange={(value) => updateSelectedAction((action) => { action.fallbackViewId = value === "__none__" ? undefined : value; })}>
                  <SelectTrigger><SelectValue placeholder="Select fallback" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Use entry view</SelectItem>
                    {Object.values(draft.views).map((view) => (
                      <SelectItem key={`fallback-${view.id}`} value={view.id}>{view.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Allowed Roles (csv)</Label>
                <Input value={(selectedAction.allowedRoleIds || []).join(",")} onChange={(event) => updateSelectedAction((action) => {
                  action.allowedRoleIds = event.target.value.split(",").map((entry) => entry.trim()).filter(Boolean);
                })} placeholder="role_id, role_id" />
              </div>
              <div className="space-y-2">
                <Label>Blocked Roles (csv)</Label>
                <Input value={(selectedAction.blockedRoleIds || []).join(",")} onChange={(event) => updateSelectedAction((action) => {
                  action.blockedRoleIds = event.target.value.split(",").map((entry) => entry.trim()).filter(Boolean);
                })} placeholder="role_id, role_id" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{selectedAction.type === "ticket_create" ? "Ticket Opening Message" : "Inline Response Content"}</Label>
              <Textarea value={ensureInlineResponse(selectedAction).content || ""} onChange={(event) => updateSelectedAction((action) => { ensureInlineResponse(action).content = event.target.value; })} className="min-h-[120px]" />
            </div>
          </CardContent>
        </Card>
      ) : null}

      {selectedModal ? (
        <Card className="glass-card border-white/10 bg-background/40">
          <CardHeader>
            <CardTitle className="font-display text-base">Modal</CardTitle>
            <CardDescription>Title, custom id, fields, and submit actions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              {(() => {
                const issues = diagnosticsForPrefix(`modals.${selectedModal.id}`);
                if (issues.length === 0) return <Badge variant="outline">No errors</Badge>;
                return (
                  <Badge variant={issues.some((entry) => entry.level === "error") ? "destructive" : "secondary"}>
                    {issues.length} issue{issues.length === 1 ? "" : "s"}
                  </Badge>
                );
              })()}
              <Button variant="outline" size="sm" onClick={() => duplicateModalById(selectedModal.id)} className="gap-2"><Copy className="h-4 w-4" />Duplicate</Button>
              <Button variant="ghost" size="sm" onClick={() => deleteModalById(selectedModal.id)} className="gap-2 text-destructive"><Trash2 className="h-4 w-4" />Delete</Button>
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={selectedModal.title} onChange={(event) => updateSelectedModal((modal) => { modal.title = event.target.value; })} />
            </div>
            <div className="space-y-2">
              <Label>Custom ID</Label>
              <Input value={selectedModal.customIdSeed || ""} onChange={(event) => updateSelectedModal((modal) => { modal.customIdSeed = event.target.value; })} />
            </div>
            {selectedModal.fields.map((field, index) => (
              <div key={field.id} className="rounded-xl border border-white/10 bg-background/30 p-3 space-y-2">
                <Label>Field {index + 1}</Label>
                <Input value={field.label} onChange={(event) => updateSelectedModal((modal) => { modal.fields[index].label = event.target.value; })} placeholder="Label" />
                <Input value={field.placeholder || ""} onChange={(event) => updateSelectedModal((modal) => { modal.fields[index].placeholder = event.target.value; })} placeholder="Placeholder" />
                <div className="grid gap-4 md:grid-cols-3">
                  <Select value={field.style} onValueChange={(value: any) => updateSelectedModal((modal) => { modal.fields[index].style = value; })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short">Short</SelectItem>
                      <SelectItem value="paragraph">Paragraph</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input type="number" value={String(field.minLength || 0)} onChange={(event) => updateSelectedModal((modal) => { modal.fields[index].minLength = Number(event.target.value || 0); })} placeholder="Min" />
                  <Input type="number" value={String(field.maxLength || 200)} onChange={(event) => updateSelectedModal((modal) => { modal.fields[index].maxLength = Number(event.target.value || 200); })} placeholder="Max" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2">
                    <Label>Required</Label>
                    <Switch checked={Boolean(field.required)} onCheckedChange={(checked) => updateSelectedModal((modal) => { modal.fields[index].required = checked; })} />
                  </div>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => updateSelectedModal((modal) => { modal.fields.splice(index, 1); })}>
                    Remove
                  </Button>
                </div>
              </div>
            ))}
            <div className="space-y-2">
              <Label>Submit Actions</Label>
              {selectedModal.submitActionIds.map((actionId, index) => (
                <div key={`${selectedModal.id}-submit-${index}`} className="flex items-center gap-2">
                  <Select value={actionId || "__none__"} onValueChange={(value) => updateSelectedModal((modal) => {
                    modal.submitActionIds[index] = value === "__none__" ? "" : value;
                  })}>
                    <SelectTrigger><SelectValue placeholder="Select action" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {Object.values(draft.actions).map((action) => (
                        <SelectItem key={`submit-${selectedModal.id}-${action.id}`} value={action.id}>{action.label || action.type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => updateSelectedModal((modal) => { modal.submitActionIds.splice(index, 1); })}>
                    Remove
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => updateSelectedModal((modal) => { modal.fields.push({ id: makeId("field"), label: `Field ${modal.fields.length + 1}`, style: "short", required: true, minLength: 1, maxLength: 200 }); })}>Add Field</Button>
              <Button variant="outline" onClick={() => {
                const action = createAction("reply_message");
                touchDraft((document) => {
                  document.actions[action.id] = action;
                  document.modals[selectedModal.id].submitActionIds.push(action.id);
                });
                setSelectedActionId(action.id);
                setSelectedModalId(null);
                setSelectedNodeId(null);
                setSelectedEmbedIndex(null);
              }}>Add Submit Action</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
      {!selectedEmbed && !selectedNode && !selectedAction && !selectedModal ? (
        <Card className="glass-card border-white/10 bg-background/40">
          <CardContent className="py-8 text-sm text-muted-foreground">
            Select an embed, block, action, or modal to edit it here.
          </CardContent>
        </Card>
      ) : null}
    </div>
  );

  if (!draft && studioDocumentsQuery.isLoading && !isMobile) {
    return <Card className="glass-card"><CardContent className="py-12 text-sm text-muted-foreground">Loading Design Studio...</CardContent></Card>;
  }

  if (!draft) {
    const templateRecords = documents.filter((record) => record.kind === "template");
    const projectRecords = documents.filter((record) => record.kind !== "template");
    const starterIntentLabel: Record<StudioEntryIntent, string> = {
      blank: "Blank Project",
      ticket: "Ticket Starter",
      welcome: "Welcome Starter",
      verify: "Verify Starter",
      template: "Template Starter",
    };

    if (isMobile) {
      return (
        <DesignStudioMobileHome
          documents={documents}
          publications={publications}
          isLoading={studioDocumentsQuery.isLoading}
          isCreating={createDocumentMutation.isPending}
          onBack={onOpenServerSettings || (() => window.history.back())}
          onOpenSettings={onOpenServerSettings || (() => window.history.back())}
          onOpenDocument={loadDocument}
          onCreatePrimary={createPrimaryDocument}
          onCreateTemplate={() => createDocument(undefined, "template")}
          onCreateModuleTemplate={(binding) => createDocument(binding, "surface")}
        />
      );
    }

    return (
      <div className="space-y-6">
        <Card className="glass-card border-white/10 bg-background/40">
          <CardHeader>
            <CardTitle className="font-display text-xl">Studio Home</CardTitle>
            <CardDescription>
              Start from a blank project, templates, or module starters. Current intent: {starterIntentLabel[entryIntent]}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Button onClick={() => createDocument(undefined, "surface", "Untitled Project")} className="justify-start gap-2">
                <Plus className="h-4 w-4" />
                New Project
              </Button>
              <Button
                variant={entryIntent === "ticket" ? "default" : "outline"}
                onClick={() => createDocument("ticket_panel", "surface", "Ticket Panel")}
                className="justify-start gap-2"
              >
                <Workflow className="h-4 w-4" />
                Ticket Starter
              </Button>
              <Button
                variant={entryIntent === "welcome" ? "default" : "outline"}
                onClick={() => createDocument("welcome", "surface", "Welcome Message")}
                className="justify-start gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Welcome Starter
              </Button>
              <Button
                variant={entryIntent === "verify" ? "default" : "outline"}
                onClick={() => createDocument("verify", "surface", "Verification Panel")}
                className="justify-start gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                Verify Starter
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => createDocument(undefined, "template")} className="gap-2">
                <Copy className="h-4 w-4" />
                New Template
              </Button>
              {entryIntent === "template" && templateRecords[0] ? (
                <Button variant="outline" onClick={() => loadDocument(templateRecords[0].id)} className="gap-2">
                  <Library className="h-4 w-4" />
                  Open Latest Template
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="glass-card border-white/10 bg-background/40">
            <CardHeader>
              <CardTitle className="font-display text-base">Recent Drafts</CardTitle>
              <CardDescription>Jump back into recent project work.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {projectRecords.slice(0, 6).map((record) => (
                <button
                  key={`home-recent-${record.id}`}
                  type="button"
                  onClick={() => loadDocument(record.id)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-background/30 px-3 py-2 text-left hover:border-white/20"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{record.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{record.moduleBinding ? getBindingLabel(record.moduleBinding) : "General project"}</p>
                  </div>
                  <Badge variant="outline">#{record.id}</Badge>
                </button>
              ))}
              {projectRecords.length === 0 ? <p className="text-sm text-muted-foreground">No drafts yet.</p> : null}
            </CardContent>
          </Card>

          <Card className="glass-card border-white/10 bg-background/40">
            <CardHeader>
              <CardTitle className="font-display text-base">Templates</CardTitle>
              <CardDescription>Reusable templates for fast starts.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {templateRecords.slice(0, 6).map((record) => (
                <button
                  key={`home-template-${record.id}`}
                  type="button"
                  onClick={() => loadDocument(record.id)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-background/30 px-3 py-2 text-left hover:border-white/20"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{record.name}</p>
                    <p className="truncate text-xs text-muted-foreground">Template</p>
                  </div>
                  <Badge variant="outline">#{record.id}</Badge>
                </button>
              ))}
              {templateRecords.length === 0 ? <p className="text-sm text-muted-foreground">No templates saved yet.</p> : null}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const topBar = (
    <Card className={cn("sticky top-0 z-20 border-white/10 backdrop-blur", isMobile ? "overflow-hidden bg-[#060709]/95 shadow-[0_20px_60px_rgba(0,0,0,0.38)]" : "glass-card bg-background/95")}>
      <CardContent className="flex items-center gap-2 p-3">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{draft.meta.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {dirty ? "Unsaved" : "Saved"} - {currentRecord?.moduleBinding ? getBindingLabel(currentRecord.moduleBinding) : getDocumentKindLabel(currentRecord?.kind)}
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={() => setPreviewOpen(true)}>
          <Eye className="h-4 w-4" />
        </Button>
        <Button onClick={saveDocument} disabled={!dirty || updateDocumentMutation.isPending} className="gap-2">
          <Save className="h-4 w-4" />
          {!isMobile ? "Save" : null}
        </Button>
      </CardContent>
    </Card>
  );

  const viewChips = (
    <div className="overflow-x-auto pb-1">
      <div className="flex min-w-max gap-2">
        {Object.values(draft.views).map((view) => (
          <Button
            key={`view-chip-${view.id}`}
            variant={selectedViewId === view.id ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setSelectedViewId(view.id);
              setSelectedNodeId(null);
              setSelectedActionId(null);
              setSelectedModalId(null);
              setSelectedEmbedIndex(null);
            }}
          >
            {view.name}
            {draft.meta.entryViewId === view.id ? " - Entry" : ""}
          </Button>
        ))}
        <Button variant="outline" size="sm" onClick={addView} className="gap-2">
          <Plus className="h-4 w-4" />
          + View
        </Button>
      </div>
    </div>
  );

  const activateBuildFocus = (focus: MobilePrimaryBuildFocusId) => {
    setActiveArea("build");
    setBuildFocusId(focus);
    setPreviewOpen(false);
  };

  const activateMobileUtility = (utilityId: (typeof MOBILE_UTILITY_AREAS)[number]["id"]) => {
    if (utilityId === "preview") {
      setPreviewOpen(true);
      return;
    }

    setPreviewOpen(false);

    if (utilityId === "assets") {
      setActiveArea("build");
      setBuildFocusId("assets");
      return;
    }

    setActiveArea(utilityId);
  };

  const activateArea = (sectionId: StudioAreaId) => {
    if (sectionId === "preview") {
      setPreviewOpen(true);
      return;
    }
    setActiveArea(sectionId);
  };

  const primarySectionNav = (
    <div className="overflow-x-auto pb-1">
      <div className="flex min-w-max gap-2">
        {STUDIO_MAIN_AREAS.map((section) => (
          <Button
            key={section.id}
            variant={(section.id === "preview" ? previewOpen : activeArea === section.id) ? "default" : "outline"}
            size="sm"
            onClick={() => activateArea(section.id)}
          >
            {section.label}
          </Button>
        ))}
      </div>
    </div>
  );

  const previewPanel = (
    <StudioPreview document={draft} viewId={selectedViewId} interactionRows={interactionRows} diagnostics={diagnostics} mode={previewMode} />
  );
  const quickAddDrawer = (
    <Drawer open={quickAddOpen} onOpenChange={handleQuickAddOpenChange}>
      <DrawerContent className="max-h-[88vh] overflow-y-auto border-white/10 bg-background/95">
        <DrawerHeader>
          <DrawerTitle>{quickAddParentNode ? `Add Inside ${getStudioNodeTypeLabel(quickAddParentNode.type)}` : "Add to View"}</DrawerTitle>
          <DrawerDescription>
            {quickAddParentNode
              ? `New blocks will be nested inside ${getStudioNodeDisplayLabel(quickAddParentNode)}.`
              : "Add parts to this message and view."}
          </DrawerDescription>
        </DrawerHeader>
        <div className="space-y-4 px-4 pb-6">
          {quickAddParentNode ? (
            <div className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/45">Target</p>
              <p className="mt-1 text-sm font-semibold text-white">{getStudioNodeDisplayLabel(quickAddParentNode)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{getStudioNodeTypeLabel(quickAddParentNode.type)}</p>
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            {quickAddNodeOptions.map((option) => (
              <Button key={`quick-add-${option.type}`} variant="outline" className="h-auto justify-start py-3" onClick={() => addNodeFromQuickAdd(option.type)}>
                <div className="text-left">
                  <div className="text-sm font-medium text-white">{option.label}</div>
                  <div className="text-xs text-muted-foreground">{option.detail}</div>
                </div>
              </Button>
            ))}
          </div>
          {!quickAddParentNode ? (
            <>
              <Separator className="bg-white/10" />
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    touchDraft((document) => {
                      document.views[selectedViewId].embeds.push({ title: "", description: "", color: "#5865F2" });
                      setBuildFocusId("embeds");
                      setSelectedEmbedIndex(document.views[selectedViewId].embeds.length - 1);
                      setSelectedNodeId(null);
                      setSelectedActionId(null);
                      setSelectedModalId(null);
                    });
                    setQuickAddOpen(false);
                    setQuickAddParentId(null);
                    setInspectorOpen(true);
                  }}
                >
                  Add Embed
                </Button>
                <Button variant="outline" onClick={() => { addAction("reply_message"); setQuickAddOpen(false); setQuickAddParentId(null); }}>
                  Add Action
                </Button>
                <Button variant="outline" onClick={() => { addModal(); setQuickAddOpen(false); setQuickAddParentId(null); }}>
                  Add Modal
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </DrawerContent>
    </Drawer>
  );

  const mobileViewChips = (
    <div className="overflow-x-auto pb-1">
      <div className="flex min-w-max gap-2">
        {Object.values(draft.views).map((view) => (
          <Button
            key={`mobile-view-chip-${view.id}`}
            variant={selectedViewId === view.id ? "default" : "outline"}
            size="sm"
            className={cn("rounded-full", selectedViewId !== view.id && "border-white/10 bg-background/30")}
            onClick={() => {
              setSelectedViewId(view.id);
              setSelectedNodeId(null);
              setSelectedActionId(null);
              setSelectedModalId(null);
              setSelectedEmbedIndex(null);
            }}
          >
            {view.name}
            {draft.meta.entryViewId === view.id ? " - Entry" : ""}
          </Button>
        ))}
        <Button variant="ghost" size="sm" className="rounded-full border border-white/10 bg-background/25" onClick={() => activateBuildFocus("content")}>
          Manage Views
        </Button>
      </div>
    </div>
  );

  const mobileBuildNav = (
    <div className="grid grid-cols-4 gap-2">
      {MOBILE_BUILD_WORKSPACES.map(({ id, label, detail, icon: Icon }) => {
        const isActive = activeArea === "build" && buildFocusId === id;
        const detailText =
          id === "content"
            ? `${(currentView?.messageContent || "").length} chars`
            : id === "embeds"
              ? formatUnitCount(currentView?.embeds?.length || 0, "embed")
              : id === "components"
                ? formatUnitCount(currentViewNodeCount, "block")
                : `${actionCount + modalCount} logic`;

        return (
          <button
            key={`mobile-build-focus-${id}`}
            type="button"
            onClick={() => activateBuildFocus(id)}
            className={cn(
              "rounded-[22px] border px-2.5 py-3 text-left transition",
              isActive
                ? "border-primary/45 bg-primary/12 shadow-[0_16px_30px_rgba(177,18,38,0.22)]"
                : "border-white/10 bg-[linear-gradient(180deg,rgba(21,24,29,0.92),rgba(10,11,13,0.98))] hover:border-white/20",
            )}
            title={detail}
          >
            <Icon className={cn("mb-2 h-4 w-4", isActive ? "text-primary" : "text-white/65")} />
            <p className="text-xs font-semibold text-white">{label}</p>
            <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-white/45">{detailText}</p>
          </button>
        );
      })}
    </div>
  );

  const mobileActiveUtilityId = previewOpen
    ? "preview"
    : activeArea === "library"
      ? "library"
      : activeArea === "publish"
        ? "publish"
        : activeArea === "build" && buildFocusId === "assets"
          ? "assets"
          : null;

  if (isMobile) {
    return (
      <div className="space-y-4 pb-28">
        {topBar}
        {mobileBuildNav}
        {activeArea === "build" && buildFocusId !== "assets" ? mobileViewChips : null}
        {renderActiveWorkspace()}

        <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
          <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-3xl border-white/10 bg-background/95 px-4">
            <SheetHeader>
              <SheetTitle>Live Preview</SheetTitle>
              <SheetDescription>Switch between mobile, desktop, and compact preview modes.</SheetDescription>
            </SheetHeader>
            <div className="mt-4 flex gap-2">
              <Button variant={previewMode === "mobile" ? "default" : "outline"} size="sm" onClick={() => setPreviewMode("mobile")} className="gap-2"><Smartphone className="h-4 w-4" />Mobile</Button>
              <Button variant={previewMode === "desktop" ? "default" : "outline"} size="sm" onClick={() => setPreviewMode("desktop")} className="gap-2"><Monitor className="h-4 w-4" />Desktop</Button>
              <Button variant={previewMode === "compact" ? "default" : "outline"} size="sm" onClick={() => setPreviewMode("compact")} className="gap-2"><Bot className="h-4 w-4" />Compact</Button>
            </div>
            <div className="mt-4">{previewPanel}</div>
          </SheetContent>
        </Sheet>

        <Sheet open={inspectorOpen} onOpenChange={setInspectorOpen}>
          <SheetContent side="bottom" className="h-[96vh] overflow-y-auto rounded-t-3xl border-white/10 bg-background/95 px-4">
            <SheetHeader>
              <SheetTitle>Composer</SheetTitle>
              <SheetDescription>
                {selectedEditorType === "none" ? "Pick an embed, component, action, or modal to edit." : `Editing ${selectedEditorType}`}
              </SheetDescription>
            </SheetHeader>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button variant={composerMode === "edit" ? "default" : "outline"} size="sm" onClick={() => setComposerMode("edit")}>Edit</Button>
              <Button variant={composerMode === "preview" ? "default" : "outline"} size="sm" onClick={() => setComposerMode("preview")}>Preview</Button>
              <Button variant={composerMode === "json" ? "default" : "outline"} size="sm" onClick={() => setComposerMode("json")}>JSON</Button>
              {selectedEditorDiagnostics.length > 0 ? (
                <Badge variant={selectedEditorDiagnostics.some((diag) => diag.level === "error") ? "destructive" : "secondary"}>
                  {selectedEditorDiagnostics.length} issue{selectedEditorDiagnostics.length === 1 ? "" : "s"}
                </Badge>
              ) : (
                <Badge variant="outline">No issues</Badge>
              )}
            </div>
            <div className="mt-4 pb-6">
              {composerMode === "edit" ? inspectorBody : null}
              {composerMode === "preview" ? previewPanel : null}
              {composerMode === "json" ? (
                <div className="space-y-2">
                  <Textarea
                    readOnly
                    value={selectedEditorPayload ? JSON.stringify(selectedEditorPayload, null, 2) : "{}"}
                    className="min-h-[65vh] font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    onClick={async () => {
                      const json = selectedEditorPayload ? JSON.stringify(selectedEditorPayload, null, 2) : "{}";
                      await navigator.clipboard.writeText(json);
                      toast({ title: "JSON copied", description: "Composer JSON copied to clipboard." });
                    }}
                  >
                    Copy JSON
                  </Button>
                </div>
              ) : null}
            </div>
          </SheetContent>
        </Sheet>

        {quickAddDrawer}

        {activeArea === "build" && buildFocusId !== "assets" ? (
          <Button
            className="fixed bottom-20 right-4 z-30 gap-2 rounded-full shadow-xl"
            onClick={() => openQuickAddDrawer(null)}
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        ) : null}

        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-background/95 backdrop-blur">
          <div className="grid grid-cols-4 gap-2 p-2">
            {MOBILE_UTILITY_AREAS.map(({ id, label, icon: Icon }) => (
              <button
                key={`mobile-utility-${id}`}
                type="button"
                onClick={() => activateMobileUtility(id)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-2xl border px-2 py-2 text-center transition",
                  mobileActiveUtilityId === id
                    ? "border-primary/40 bg-primary/10 text-white shadow-[0_10px_24px_rgba(177,18,38,0.2)]"
                    : "border-white/5 bg-transparent text-white/60 hover:border-white/10 hover:bg-white/[0.03]",
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="text-[11px] font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {topBar}
      {viewChips}
      {primarySectionNav}
      {quickAddDrawer}
      <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
        <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-3xl border-white/10 bg-background/95 px-4">
          <SheetHeader>
            <SheetTitle>Preview</SheetTitle>
            <SheetDescription>Mobile, desktop, and compact message render.</SheetDescription>
          </SheetHeader>
          <div className="mt-4 flex gap-2">
            <Button variant={previewMode === "mobile" ? "default" : "outline"} size="sm" onClick={() => setPreviewMode("mobile")} className="gap-2"><Smartphone className="h-4 w-4" />Mobile</Button>
            <Button variant={previewMode === "desktop" ? "default" : "outline"} size="sm" onClick={() => setPreviewMode("desktop")} className="gap-2"><Monitor className="h-4 w-4" />Desktop</Button>
            <Button variant={previewMode === "compact" ? "default" : "outline"} size="sm" onClick={() => setPreviewMode("compact")} className="gap-2"><Bot className="h-4 w-4" />Compact</Button>
          </div>
          <div className="mt-4">{previewPanel}</div>
        </SheetContent>
      </Sheet>
      <div className="grid min-h-[70vh] gap-6 xl:grid-cols-[minmax(0,1fr),380px]">
        <div className="space-y-4 min-w-0">
          {renderActiveWorkspace()}
          {inspectorBody}
        </div>

        <div className="space-y-4">
          <Card className="glass-card sticky top-4 border-white/10 bg-background/40">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="font-display text-base">Live Preview</CardTitle>
                  <CardDescription>Discord-style preview plus interaction map and diagnostics.</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant={previewMode === "mobile" ? "default" : "outline"} size="icon" onClick={() => setPreviewMode("mobile")}><Smartphone className="h-4 w-4" /></Button>
                  <Button variant={previewMode === "desktop" ? "default" : "outline"} size="icon" onClick={() => setPreviewMode("desktop")}><Monitor className="h-4 w-4" /></Button>
                  <Button variant={previewMode === "compact" ? "default" : "outline"} size="icon" onClick={() => setPreviewMode("compact")}><Bot className="h-4 w-4" /></Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>{previewPanel}</CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
