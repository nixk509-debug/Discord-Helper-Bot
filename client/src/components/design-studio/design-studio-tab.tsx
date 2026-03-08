import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowDown,
  ArrowUp,
  Bot,
  Copy,
  Eye,
  FilePlus2,
  FolderTree,
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
  useCreateStudioDocument,
  useDiscordContext,
  usePublishStudio,
  useRollbackStudioPublication,
  useTicketConfig,
  useTicketPanels,
  useStudioDocuments,
  useStudioPublications,
  useUpdateStudioDocument,
  useUpdateStudioPublicationStatus,
} from "@/hooks/use-bot";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { DiscordChannelPicker } from "@/components/discord/channel-picker";
import { StudioPreview } from "@/components/design-studio/studio-preview";
import {
  createStudioDocument as createStudioDocumentDraft,
  defaultSurfaceName,
  STUDIO_BUILD_SECTIONS,
  STUDIO_MOBILE_SECTIONS,
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type {
  InteractiveActionConfig,
  StudioAction,
  StudioDiagnostic,
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

type MobileSectionId = (typeof STUDIO_MOBILE_SECTIONS)[number]["id"];
type BuildSectionId = (typeof STUDIO_BUILD_SECTIONS)[number]["id"];
type PreviewMode = "desktop" | "mobile" | "compact";

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

function makeId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

function cloneDocument<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function normalizeDocumentDraft(document: any, fallbackName = "Untitled Surface"): StudioDocument {
  if (!document || typeof document !== "object") {
    return createStudioDocumentDraft(undefined, fallbackName);
  }

  if (document.version === 2 && document.meta?.entryViewId) {
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

function canParentNode(parentType: StudioNodeType, childType: StudioNodeType) {
  if (parentType === "action_row") {
    return ["button", "string_select", "role_select", "user_select", "channel_select", "mentionable_select"].includes(childType);
  }
  if (["container", "section"].includes(parentType)) {
    return !["button", "string_select", "role_select", "user_select", "channel_select", "mentionable_select"].includes(childType);
  }
  return false;
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
  onSelect,
}: {
  document: StudioDocument;
  nodeId: string;
  depth: number;
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
}) {
  const node = document.nodes[nodeId];
  if (!node) return null;
  const label = String(node.props.label || node.props.heading || node.props.title || node.props.text || node.type).slice(0, 48);

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => onSelect(nodeId)}
        className={cn(
          "flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition",
          selectedNodeId === nodeId ? "border-primary/40 bg-primary/10 text-white" : "border-white/10 bg-background/40 text-muted-foreground hover:border-white/20 hover:text-white",
        )}
        style={{ marginLeft: depth * 12 }}
      >
        <FolderTree className="h-4 w-4 shrink-0" />
        <span className="truncate">{label}</span>
        <Badge variant="outline" className="ml-auto shrink-0 border-white/10 text-[10px] uppercase">
          {node.type.replace(/_/g, " ")}
        </Badge>
      </button>
      {node.childIds.map((childId) => (
        <NodeTreeItem
          key={childId}
          document={document}
          nodeId={childId}
          depth={depth + 1}
          selectedNodeId={selectedNodeId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

export function DesignStudioTab({ serverId }: { serverId: number; toast?: any }) {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const studioDocumentsQuery = useStudioDocuments(serverId);
  const studioPublicationsQuery = useStudioPublications(serverId);
  const ticketConfigQuery = useTicketConfig(serverId);
  const ticketPanelsQuery = useTicketPanels(serverId);
  const createDocumentMutation = useCreateStudioDocument(serverId);
  const updateDocumentMutation = useUpdateStudioDocument(serverId);
  const publishMutation = usePublishStudio(serverId);
  const clonePublicationMutation = useCloneStudioPublication(serverId);
  const rollbackPublicationMutation = useRollbackStudioPublication(serverId);
  const archivePublicationMutation = useArchiveStudioPublication(serverId);
  const updatePublicationStatusMutation = useUpdateStudioPublicationStatus(serverId);
  const discordContextQuery = useDiscordContext(serverId);

  const documents = ((studioDocumentsQuery.data || []) as StudioDocumentRecord[]).map((record) => ({
    ...record,
    document: normalizeDocumentDraft(record.document, record.name),
  }));
  const publications = (studioPublicationsQuery.data || []) as PublicationWithMeta[];
  const ticketConfig = ticketConfigQuery.data as any;
  const ticketPanels = (ticketPanelsQuery.data || []) as any[];

  const [currentDocumentId, setCurrentDocumentId] = useState<number | null>(null);
  const [draft, setDraft] = useState<StudioDocument | null>(null);
  const [dirty, setDirty] = useState(false);
  const [selectedViewId, setSelectedViewId] = useState("entry");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [selectedModalId, setSelectedModalId] = useState<string | null>(null);
  const [activeMobileSection, setActiveMobileSection] = useState<MobileSectionId>("build");
  const [activeBuildSection, setActiveBuildSection] = useState<BuildSectionId>("overview");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("mobile");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [publishChannelId, setPublishChannelId] = useState("");
  const [updateMessageId, setUpdateMessageId] = useState("");
  const [publishViewId, setPublishViewId] = useState("");
  const [cloneChannelId, setCloneChannelId] = useState("");
  const [selectedPublicationId, setSelectedPublicationId] = useState<number | null>(null);
  const [importText, setImportText] = useState("");
  const [emojiState, setEmojiState] = useState<{ recent: string[]; favorites: string[] }>({ recent: [], favorites: [] });
  const [lastDiagnostics, setLastDiagnostics] = useState<StudioDiagnostic[]>([]);
  const loadedDocumentIdRef = useRef<number | null>(null);

  const currentRecord = useMemo(
    () => documents.find((record) => record.id === currentDocumentId) || null,
    [documents, currentDocumentId],
  );
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
    if (documents.length === 0) return;
    if (currentDocumentId) return;

    const params = new URLSearchParams(window.location.search);
    const requested = Number(params.get("documentId") || "0");
    if (requested && documents.some((record) => record.id === requested)) {
      setCurrentDocumentId(requested);
      return;
    }

    setCurrentDocumentId(documents[0].id);
  }, [documents, currentDocumentId]);

  useEffect(() => {
    if (!currentRecord) return;
    if (dirty && loadedDocumentIdRef.current === currentRecord.id) return;
    const nextDraft = cloneDocument(currentRecord.document as StudioDocument);
    ensureDesign(nextDraft);
    setDraft(nextDraft);
    setDirty(false);
    setSelectedViewId(nextDraft.meta.entryViewId);
    setSelectedNodeId(null);
    setSelectedActionId(null);
    setSelectedModalId(null);
    setLastDiagnostics([]);
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

  const interactionRows = useMemo(() => (draft ? collectInteractionMap(draft, selectedViewId) : []), [draft, selectedViewId]);
  const diagnostics = useMemo(() => {
    if (!draft) return lastDiagnostics;
    const next = [...collectDiagnostics(draft, selectedViewId), ...lastDiagnostics];
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

  const selectedNode = draft && selectedNodeId ? draft.nodes[selectedNodeId] : null;
  const selectedAction = draft && selectedActionId ? draft.actions[selectedActionId] : null;
  const selectedModal = draft && selectedModalId ? draft.modals[selectedModalId] : null;
  const selectedPublication = publications.find((entry) => entry.id === selectedPublicationId) || null;

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

  const loadDocument = (documentId: number) => {
    if (documentId === currentDocumentId) return;
    if (dirty && !window.confirm("Discard unsaved changes and switch documents?")) return;
    setCurrentDocumentId(documentId);
    const url = new URL(window.location.href);
    url.searchParams.set("module", "design-studio");
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

  const createDocument = (binding?: any, kind: "surface" | "template" = "surface") => {
    const name = defaultSurfaceName(binding);
    const document = createStudioDocumentDraft(binding, name);
    createDocumentMutation.mutate(
      {
        scope: kind === "template" ? "personal" : "server",
        kind,
        name,
        moduleBinding: binding || null,
        document,
      },
      {
        onSuccess: (created: StudioDocumentRecord) => {
          setCurrentDocumentId(created.id);
          setDraft(cloneDocument(normalizeDocumentDraft(created.document, created.name)));
          setDirty(false);
          loadedDocumentIdRef.current = created.id;
          toast({ title: "Surface created", description: `${created.name} is ready in Studio.` });
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
        moduleBinding: currentRecord?.moduleBinding || null,
        document: draft,
      },
      {
        onSuccess: (created: StudioDocumentRecord) => {
          toast({ title: asTemplate ? "Template saved" : "Surface duplicated", description: created.name });
          setCurrentDocumentId(created.id);
          setDraft(cloneDocument(normalizeDocumentDraft(created.document, created.name)));
          setDirty(false);
          loadedDocumentIdRef.current = created.id;
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
    });
  };

  const addNodeToCurrentView = (type: StudioNodeType, parentId?: string | null) => {
    if (!draft || !currentView) return;
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
      if (node.actionId) setSelectedActionId(node.actionId);
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

  const publishDocument = () => {
    if (!draft) return;
    if (!publishChannelId.trim()) {
      toast({ title: "Select a channel", description: "Choose the target channel before publishing.", variant: "destructive" });
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
        toast({ title: "Publication archived", description: "The live surface is now archived." });
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

  const addAction = (type: InteractiveActionConfig["type"] = "reply_message") => {
    const action = createAction(type);
    touchDraft((document) => {
      document.actions[action.id] = action;
    });
    setSelectedActionId(action.id);
    setActiveMobileSection("actions");
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
    setSelectedModalId(modal.id);
    setSelectedActionId(submitAction.id);
    setActiveMobileSection("modals");
    if (isMobile) setInspectorOpen(true);
  };

  const importFromJson = () => {
    try {
      const parsed = JSON.parse(importText);
      const normalized = normalizeDocumentDraft(parsed, draft?.meta.name || "Imported Surface");
      setDraft(normalized);
      setDirty(true);
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

  const openModuleSurface = (binding: string) => {
    const existing = documents.find((record) => record.moduleBinding === binding && record.kind === "surface" && !record.isArchived);
    if (existing) {
      loadDocument(existing.id);
      return;
    }
    createDocument(binding, "surface");
  };

  const renderOverviewSection = () => (
    <div className="space-y-4">
      <Card className="glass-card border-white/10 bg-background/40">
        <CardHeader>
          <CardTitle className="font-display text-base">Surface Identity</CardTitle>
          <CardDescription>Name the document, choose the entry view, and jump into shared server surfaces.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Document Name</Label>
              <Input value={draft?.meta.name || ""} onChange={(event) => touchDraft((document) => { document.meta.name = event.target.value; })} />
            </div>
            <div className="space-y-2">
              <Label>Entry View</Label>
              <Select value={draft?.meta.entryViewId || "entry"} onValueChange={(value) => touchDraft((document) => { document.meta.entryViewId = value; setSelectedViewId(value); })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {draft ? Object.values(draft.views).map((view) => <SelectItem key={view.id} value={view.id}>{view.name}</SelectItem>) : null}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              { binding: "verify", title: "Verification", detail: "Panels for onboarding and access confirmation." },
              { binding: "welcome", title: "Welcome", detail: "Orientation messages, DM starts, and rules." },
              { binding: "ticket_panel", title: "Tickets", detail: "Support launchers and intake panels." },
            ].map((surface) => (
              <button
                key={surface.binding}
                type="button"
                onClick={() => openModuleSurface(surface.binding)}
                className="rounded-2xl border border-white/10 bg-background/30 p-4 text-left transition hover:border-primary/30 hover:bg-primary/5"
              >
                <div className="mb-2 flex items-center gap-2 text-white">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="font-medium">{surface.title}</span>
                </div>
                <p className="text-sm text-muted-foreground">{surface.detail}</p>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {draft ? Object.values(draft.views).map((view) => (
              <Button key={view.id} variant={selectedViewId === view.id ? "default" : "outline"} size="sm" onClick={() => setSelectedViewId(view.id)}>
                {view.name}
              </Button>
            )) : null}
            <Button variant="outline" size="sm" onClick={addView} className="gap-2">
              <Plus className="h-4 w-4" />
              Add View
            </Button>
            <Button variant="ghost" size="sm" onClick={() => removeView(selectedViewId)} className="text-destructive">
              Remove Current View
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderContentSection = () => (
    <Card className="glass-card border-white/10 bg-background/40">
      <CardHeader>
        <CardTitle className="font-display text-base">Message Content</CardTitle>
        <CardDescription>Author the main content body for the active view.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={currentView?.messageContent || ""}
          onChange={(event) => touchDraft((document) => { document.views[selectedViewId].messageContent = event.target.value; })}
          placeholder="Write the main message body here."
          className="min-h-[180px]"
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{(currentView?.messageContent || "").length}/2000 characters</span>
          <span>Use views, embeds, and interactive blocks for structure.</span>
        </div>
      </CardContent>
    </Card>
  );

  const renderEmbedsSection = () => (
    <Card className="glass-card border-white/10 bg-background/40">
      <CardHeader>
        <CardTitle className="font-display text-base">Embeds</CardTitle>
        <CardDescription>Stack embeds in the active view and tune titles, descriptions, media, and accent color.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {(currentView?.embeds || []).map((embed, index) => (
          <div key={`embed-${index}`} className="rounded-2xl border border-white/10 bg-background/30 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-white">Embed {index + 1}</p>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={() => touchDraft((document) => {
                  const embeds = document.views[selectedViewId].embeds;
                  if (index > 0) [embeds[index - 1], embeds[index]] = [embeds[index], embeds[index - 1]];
                })}><ArrowUp className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => touchDraft((document) => {
                  const embeds = document.views[selectedViewId].embeds;
                  if (index < embeds.length - 1) [embeds[index + 1], embeds[index]] = [embeds[index], embeds[index + 1]];
                })}><ArrowDown className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => touchDraft((document) => { document.views[selectedViewId].embeds.splice(index, 1); })}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={embed.title || ""} onChange={(event) => touchDraft((document) => { document.views[selectedViewId].embeds[index].title = event.target.value; })} />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <Input value={embed.color || "#5865F2"} onChange={(event) => touchDraft((document) => { document.views[selectedViewId].embeds[index].color = event.target.value; })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={embed.description || ""} onChange={(event) => touchDraft((document) => { document.views[selectedViewId].embeds[index].description = event.target.value; })} className="min-h-[120px]" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Image URL</Label>
                <Input value={embed.imageUrl || ""} onChange={(event) => touchDraft((document) => { document.views[selectedViewId].embeds[index].imageUrl = event.target.value; })} />
              </div>
              <div className="space-y-2">
                <Label>Thumbnail URL</Label>
                <Input value={embed.thumbnailUrl || ""} onChange={(event) => touchDraft((document) => { document.views[selectedViewId].embeds[index].thumbnailUrl = event.target.value; })} />
              </div>
            </div>
          </div>
        ))}
        <Button variant="outline" className="w-full gap-2" onClick={() => touchDraft((document) => {
          document.views[selectedViewId].embeds.push({ title: "", description: "", color: document.views[selectedViewId].embeds[0]?.color || "#5865F2" });
        })}>
          <Plus className="h-4 w-4" />
          Add Embed
        </Button>
      </CardContent>
    </Card>
  );

  const renderDesignSection = () => (
    <div className="space-y-4">
      <Card className="glass-card border-white/10 bg-background/40">
        <CardHeader>
          <CardTitle className="font-display text-base">Divider Lab</CardTitle>
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
    </div>
  );

  const renderTemplatesSection = () => (
    <div className="space-y-4">
      <Card className="glass-card border-white/10 bg-background/40">
        <CardHeader>
          <CardTitle className="font-display text-base">Templates and JSON</CardTitle>
          <CardDescription>Duplicate surfaces into templates, export JSON, and load another Studio payload into the current draft.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => duplicateCurrent(true)} className="gap-2"><Copy className="h-4 w-4" />Save As Template</Button>
            <Button variant="outline" onClick={() => duplicateCurrent(false)} className="gap-2"><FilePlus2 className="h-4 w-4" />Duplicate Surface</Button>
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
          <CardTitle className="font-display text-base">Saved Documents</CardTitle>
          <CardDescription>Switch between surfaces and templates without leaving Studio.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {documents.map((record) => (
            <button key={record.id} type="button" onClick={() => loadDocument(record.id)} className={cn("flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition", currentDocumentId === record.id ? "border-primary/40 bg-primary/10" : "border-white/10 bg-background/30 hover:border-white/20")}>
              <Library className="h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{record.name}</p>
                <p className="text-xs text-muted-foreground">{record.kind} {record.moduleBinding ? `- ${record.moduleBinding}` : ""}</p>
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

  const renderBuildSection = () => {
    switch (activeBuildSection) {
      case "content":
        return renderContentSection();
      case "embeds":
        return renderEmbedsSection();
      case "design":
        return renderDesignSection();
      case "templates":
        return renderTemplatesSection();
      case "assets":
        return renderAssetsSection();
      case "overview":
      default:
        return renderOverviewSection();
    }
  };

  const renderTreeSection = () => (
    <Card className="glass-card border-white/10 bg-background/40">
      <CardHeader>
        <CardTitle className="font-display text-base">Component Tree</CardTitle>
        <CardDescription>Add, reorder, duplicate, and inspect the view hierarchy.</CardDescription>
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
            <NodeTreeItem key={nodeId} document={draft!} nodeId={nodeId} depth={0} selectedNodeId={selectedNodeId} onSelect={(node) => {
              setSelectedNodeId(node);
              const selected = draft?.nodes[node];
              setSelectedActionId(selected?.actionId || Object.values(selected?.optionActionIds || {})[0] || null);
              if (isMobile) setInspectorOpen(true);
            }} />
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const renderActionsSection = () => (
    <Card className="glass-card border-white/10 bg-background/40">
      <CardHeader>
        <CardTitle className="font-display text-base">Action Registry</CardTitle>
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
          {draft ? Object.values(draft.actions).map((action) => (
            <button key={action.id} type="button" onClick={() => { setSelectedActionId(action.id); if (isMobile) setInspectorOpen(true); }} className={cn("flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition", selectedActionId === action.id ? "border-primary/40 bg-primary/10" : "border-white/10 bg-background/30 hover:border-white/20")}>
              <MousePointer2 className="h-4 w-4 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{action.label || action.type}</p>
                <p className="truncate text-xs text-muted-foreground">{actionSummary(action, draft)}</p>
              </div>
              <Badge variant="outline">{action.type}</Badge>
            </button>
          )) : null}
        </div>
      </CardContent>
    </Card>
  );

  const renderModalsSection = () => (
    <Card className="glass-card border-white/10 bg-background/40">
      <CardHeader>
        <CardTitle className="font-display text-base">Modals</CardTitle>
        <CardDescription>Build modal forms and wire them to button or menu actions.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={addModal} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Modal
        </Button>
        <div className="space-y-2">
          {draft && Object.values(draft.modals).length === 0 ? <p className="text-sm text-muted-foreground">No modals yet.</p> : null}
          {draft ? Object.values(draft.modals).map((modal) => (
            <button key={modal.id} type="button" onClick={() => { setSelectedModalId(modal.id); if (isMobile) setInspectorOpen(true); }} className={cn("flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition", selectedModalId === modal.id ? "border-primary/40 bg-primary/10" : "border-white/10 bg-background/30 hover:border-white/20")}>
              <Workflow className="h-4 w-4 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{modal.title}</p>
                <p className="truncate text-xs text-muted-foreground">{modal.fields.length} fields - {modal.submitActionIds.length} submit actions</p>
              </div>
              <Badge variant="outline">modal</Badge>
            </button>
          )) : null}
        </div>
      </CardContent>
    </Card>
  );

  const renderPublishSection = () => (
    <div className="space-y-4">
      <Card className="glass-card border-white/10 bg-background/40">
        <CardHeader>
          <CardTitle className="font-display text-base">Publish and Lifecycle</CardTitle>
          <CardDescription>Publish new messages, update existing ones, clone surfaces, and manage live publications.</CardDescription>
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
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card border-white/10 bg-background/40">
        <CardHeader>
          <CardTitle className="font-display text-base">Publication List</CardTitle>
          <CardDescription>Observe live status, last failures, snapshots, and quick lifecycle operations.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <DiscordChannelPicker serverId={serverId} value={cloneChannelId} onChange={setCloneChannelId} label="Clone Target Channel" allowedKinds={["text", "announcement", "forum"]} />
          <div className="space-y-3">
            {publications.length === 0 ? <p className="text-sm text-muted-foreground">No publications yet.</p> : null}
            {publications.map((publication) => (
              <div key={publication.id} className="rounded-2xl border border-white/10 bg-background/30 p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{publication.documentName || `Document ${publication.documentId}`}</p>
                    <p className="text-xs text-muted-foreground">Publication #{publication.id} - {publication.channelId} - {publication.messageId}</p>
                  </div>
                  <Badge variant={publication.active ? "default" : "outline"}>{publication.status}</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => setSelectedPublicationId(publication.id)}>Inspect</Button>
                  <Button variant="outline" size="sm" onClick={() => clonePublication(publication.id)}>Clone</Button>
                  <Button variant="outline" size="sm" onClick={() => rollbackPublication(publication)}>Rollback</Button>
                  <Button variant="outline" size="sm" onClick={() => togglePublicationStatus(publication)}>{publication.active ? "Deactivate" : "Activate"}</Button>
                  <Button variant="ghost" size="sm" onClick={() => archivePublication(publication.id)} className="text-destructive">Archive</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderActiveWorkspace = () => {
    switch (activeMobileSection) {
      case "tree":
        return renderTreeSection();
      case "actions":
        return renderActionsSection();
      case "modals":
        return renderModalsSection();
      case "publish":
        return renderPublishSection();
      case "build":
      default:
        return renderBuildSection();
    }
  };

  const inspectorBody = !draft ? null : (
    <div className="space-y-4">
      {selectedNode ? (
        <Card className="glass-card border-white/10 bg-background/40">
          <CardHeader>
            <CardTitle className="font-display text-base">Selected Block</CardTitle>
            <CardDescription>{selectedNode.type.replace(/_/g, " ")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => moveNode(selectedNode.id, "up")}><ArrowUp className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" onClick={() => moveNode(selectedNode.id, "down")}><ArrowDown className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" onClick={() => duplicateNode(selectedNode.id)} className="gap-2"><Copy className="h-4 w-4" />Duplicate</Button>
              <Button variant="ghost" size="sm" onClick={() => deleteNode(selectedNode.id)} className="gap-2 text-destructive"><Trash2 className="h-4 w-4" />Delete</Button>
            </div>

            {selectedNode.type === "text_display" ? (
              <div className="space-y-2">
                <Label>Text</Label>
                <Textarea value={String(selectedNode.props.text || "")} onChange={(event) => updateSelectedNode((node) => { node.props.text = event.target.value; })} className="min-h-[180px]" />
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
              </>
            ) : null}

            {["button", "role_select", "user_select", "channel_select", "mentionable_select"].includes(selectedNode.type) ? (
              <>
                <div className="space-y-2">
                  <Label>Label</Label>
                  <Input value={String(selectedNode.props.label || "")} onChange={(event) => updateSelectedNode((node) => { node.props.label = event.target.value; })} />
                </div>
                <div className="space-y-2">
                  <Label>Action</Label>
                  <Select value={selectedNode.actionId || "__none__"} onValueChange={(value) => updateSelectedNode((node) => { node.actionId = value === "__none__" ? undefined : value; setSelectedActionId(value === "__none__" ? null : value); })}>
                    <SelectTrigger><SelectValue placeholder="Select action" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No action</SelectItem>
                      {Object.values(draft.actions).map((action) => <SelectItem key={action.id} value={action.id}>{action.label || action.type}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : null}

            {selectedNode.type === "string_select" ? (
              <>
                <div className="space-y-2">
                  <Label>Placeholder</Label>
                  <Input value={String(selectedNode.props.placeholder || "")} onChange={(event) => updateSelectedNode((node) => { node.props.placeholder = event.target.value; })} />
                </div>
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
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {selectedAction ? (
        <Card className="glass-card border-white/10 bg-background/40">
          <CardHeader>
            <CardTitle className="font-display text-base">Action Editor</CardTitle>
            <CardDescription>{actionSummary(selectedAction, draft)}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
            <CardTitle className="font-display text-base">Modal Builder</CardTitle>
            <CardDescription>Title, fields, and submit actions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input value={selectedModal.title} onChange={(event) => updateSelectedModal((modal) => { modal.title = event.target.value; })} />
            {selectedModal.fields.map((field, index) => (
              <div key={field.id} className="rounded-xl border border-white/10 bg-background/30 p-3 space-y-2">
                <Input value={field.label} onChange={(event) => updateSelectedModal((modal) => { modal.fields[index].label = event.target.value; })} placeholder="Label" />
                <Input value={field.placeholder || ""} onChange={(event) => updateSelectedModal((modal) => { modal.fields[index].placeholder = event.target.value; })} placeholder="Placeholder" />
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => updateSelectedModal((modal) => { modal.fields.push({ id: makeId("field"), label: `Field ${modal.fields.length + 1}`, style: "short", required: true, minLength: 1, maxLength: 200 }); })}>Add Field</Button>
              <Button variant="outline" onClick={() => {
                const action = createAction("reply_message");
                touchDraft((document) => {
                  document.actions[action.id] = action;
                  document.modals[selectedModal.id].submitActionIds.push(action.id);
                });
                setSelectedActionId(action.id);
              }}>Add Submit Action</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );

  if (!draft && studioDocumentsQuery.isLoading) {
    return <Card className="glass-card"><CardContent className="py-12 text-sm text-muted-foreground">Loading Design Studio...</CardContent></Card>;
  }

  if (!draft) {
    return (
      <div className="space-y-6">
        <Card className="glass-card border-white/10 bg-background/40">
          <CardHeader>
            <CardTitle className="font-display text-xl">Design Studio</CardTitle>
            <CardDescription>Build shared Discord interaction surfaces for verification, onboarding, support, and reusable message flows.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button onClick={() => createDocument(undefined, "surface")} className="gap-2"><Plus className="h-4 w-4" />New Surface</Button>
            <Button variant="outline" onClick={() => createDocument(undefined, "template")} className="gap-2"><Copy className="h-4 w-4" />New Template</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const topBar = (
    <Card className="glass-card border-white/10 bg-background/40">
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{currentRecord?.kind || "surface"}</Badge>
            {currentRecord?.moduleBinding ? <Badge variant="outline">{currentRecord.moduleBinding}</Badge> : null}
            <Badge variant={dirty ? "default" : "outline"}>{dirty ? "Unsaved" : "Saved"}</Badge>
          </div>
          <div>
            <h2 className="text-2xl font-display font-bold text-white">{draft.meta.name}</h2>
            <p className="text-sm text-muted-foreground">Documents: {documents.length} - Live publications: {publications.filter((entry) => entry.active).length} - Interaction rows: {interactionRows.length}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => createDocument(undefined, "surface")} className="gap-2"><Plus className="h-4 w-4" />New Surface</Button>
          <Button variant="outline" onClick={() => setPreviewOpen(true)} className="gap-2 lg:hidden"><Eye className="h-4 w-4" />Preview</Button>
          <Button variant="outline" onClick={exportJson}>Export JSON</Button>
          <Button onClick={saveDocument} disabled={!dirty || updateDocumentMutation.isPending} className="gap-2"><Save className="h-4 w-4" />{updateDocumentMutation.isPending ? "Saving..." : "Save"}</Button>
        </div>
      </CardContent>
    </Card>
  );

  const buildSubnav = activeMobileSection === "build" ? (
    <div className="overflow-x-auto pb-1">
      <div className="flex min-w-max gap-2">
        {STUDIO_BUILD_SECTIONS.map((section) => (
          <Button key={section.id} variant={activeBuildSection === section.id ? "default" : "outline"} size="sm" onClick={() => setActiveBuildSection(section.id)}>
            {section.label}
          </Button>
        ))}
      </div>
    </div>
  ) : null;

  const previewPanel = (
    <StudioPreview document={draft} viewId={selectedViewId} interactionRows={interactionRows} diagnostics={diagnostics.map((entry) => ({ level: entry.level, message: entry.message }))} mode={previewMode} />
  );

  if (isMobile) {
    return (
      <div className="space-y-4 pb-24">
        {topBar}
        {buildSubnav}
        {renderActiveWorkspace()}
        {inspectorBody}
        <div className="sticky bottom-0 z-20 -mx-4 border-t border-white/10 bg-background/95 px-3 py-3 backdrop-blur">
          <div className="grid grid-cols-5 gap-2">
            {STUDIO_MOBILE_SECTIONS.map((section) => (
              <Button key={section.id} variant={activeMobileSection === section.id ? "default" : "outline"} className="h-auto flex-col gap-1 py-2 text-[11px]" onClick={() => setActiveMobileSection(section.id)}>
                {section.label}
              </Button>
            ))}
          </div>
        </div>

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

        <Drawer open={inspectorOpen} onOpenChange={setInspectorOpen}>
          <DrawerContent className="max-h-[92vh] overflow-y-auto border-white/10 bg-background/95">
            <DrawerHeader>
              <DrawerTitle>Inspector</DrawerTitle>
              <DrawerDescription>Edit the selected block, action, or modal without leaving the current workspace.</DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-6">{inspectorBody}</div>
          </DrawerContent>
        </Drawer>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {topBar}
      <div className="grid min-h-[70vh] gap-6 xl:grid-cols-[280px,minmax(0,1fr),380px]">
        <div className="space-y-4">
          <Card className="glass-card sticky top-4 border-white/10 bg-background/40">
            <CardHeader>
              <CardTitle className="font-display text-base">Studio Rail</CardTitle>
              <CardDescription>Documents, views, and block entry points.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Documents</p>
                <ScrollArea className="h-48 pr-3">
                  <div className="space-y-2">
                    {documents.map((record) => (
                      <button key={record.id} type="button" onClick={() => loadDocument(record.id)} className={cn("flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left transition", currentDocumentId === record.id ? "border-primary/40 bg-primary/10" : "border-white/10 bg-background/30 hover:border-white/20")}>
                        <Library className="h-4 w-4 text-primary" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-white">{record.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{record.kind}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
              <Separator className="bg-white/10" />
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Views</p>
                <div className="flex flex-wrap gap-2">
                  {Object.values(draft.views).map((view) => (
                    <Button key={view.id} variant={selectedViewId === view.id ? "default" : "outline"} size="sm" onClick={() => setSelectedViewId(view.id)}>{view.name}</Button>
                  ))}
                </div>
              </div>
              <Separator className="bg-white/10" />
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Quick Add</p>
                <div className="grid gap-2">
                  {NODE_TYPE_OPTIONS.slice(0, 8).map((option) => (
                    <Button key={option.type} variant="outline" className="justify-start" onClick={() => addNodeToCurrentView(option.type)}>{option.label}</Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 min-w-0">
          {buildSubnav}
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
