import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSearch } from "wouter";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  Copy,
  ImageIcon,
  Layers3,
  MessageSquareText,
  PencilLine,
  Plus,
  Rocket,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { buildStudioPublishPlan } from "@shared/studio-publish-plan";
import type {
  StudioAsset,
  StudioAction,
  StudioDiagnostic,
  StudioDocument,
  StudioDocumentRecord,
  StudioDraftMode,
  StudioEmbedDraft,
  StudioNode,
  StudioPublication,
  StudioPublishPlan,
} from "@shared/schema";
import { EmbedInspector } from "./studio-embed-inspector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { DiscordChannelPicker } from "@/components/discord/channel-picker";
import { StudioPreview } from "@/components/design-studio/studio-preview";
import { createStudioPrimaryDocument } from "@/components/design-studio/studio-defaults";
import {
  StudioBuilderStatusStrip,
  StudioCompositionOutline,
  StudioInsertCatalog,
  type StudioCompositionGroup,
  type StudioInsertGroup,
} from "@/components/design-studio-v2/studio-v2-builder-primitives";
import { StudioV2EmptyState, type StudioEntryIntent } from "@/components/design-studio-v2/studio-v2-empty-state";
import {
  appendBundleToDocument,
  cloneDocument,
  collectInteractionRows,
  createBlankEmbed,
  createDefaultAction,
  createNodeBundle,
  draftModeLabel,
  formatRelativeEditTime,
  getSelectionLabel,
  getView,
  makeId,
  moveEmbedInView,
  moveNodeInDocument,
  normalizeStudioDocument,
  parseDate,
  removeNodeBranch,
  selectionFromPath,
  type StudioSelection,
} from "@/components/design-studio-v2/studio-v2-utils";
import {
  useDiscordContext,
  useCreateStudioDocument,
  useDeleteStudioDocument,
  usePublishStudio,
  useStudioDocuments,
  useStudioPreflight,
  useStudioPublications,
  useUpdateStudioDocument,
  useUploadStudioAsset,
} from "@/hooks/use-bot";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type StudioTabId = "build" | "assets" | "issues" | "publish";
type MobileStudioScreen = "home" | "editor" | "component";
type StudioSelectNodeKind = Extract<StudioNode["type"], "string_select" | "role_select" | "user_select" | "channel_select" | "mentionable_select">;

interface DesignStudioTabProps {
  serverId: number;
  onOpenServerSettings?: () => void;
  entryIntent?: StudioEntryIntent;
}

type StudioInsertKind =
  | "text"
  | "divider"
  | "notice"
  | "section"
  | "button_row"
  | "button"
  | "select_menu"
  | "select"
  | "role_select"
  | "user_select"
  | "channel_select"
  | "mentionable_select"
  | "file"
  | "gallery";

const STUDIO_SELECT_NODE_TYPES: StudioSelectNodeKind[] = [
  "string_select",
  "role_select",
  "user_select",
  "channel_select",
  "mentionable_select",
];

const STUDIO_SELECT_KIND_LABELS: Record<StudioSelectNodeKind, string> = {
  string_select: "String Menu",
  role_select: "Role Selector",
  user_select: "User Selector",
  channel_select: "Channel Selector",
  mentionable_select: "Mentionable Selector",
};

type StudioInteractiveActionType = StudioAction["type"];

const STUDIO_ACTION_OPTIONS: Array<{
  value: StudioInteractiveActionType;
  label: string;
  description: string;
}> = [
  { value: "reply_message", label: "Reply message", description: "Send an inline reply when the action runs." },
  { value: "follow_up_message", label: "Follow-up message", description: "Send a follow-up style message after the interaction." },
  { value: "channel_message", label: "Post in channel", description: "Send a visible message into a target channel." },
  { value: "dm_user", label: "DM user", description: "Send a direct message to the member who clicks it." },
  { value: "open_url", label: "Open URL", description: "Jump out to a link, docs page, form, or storefront." },
  { value: "open_modal", label: "Open modal", description: "Collect extra user input before continuing." },
  { value: "goto_view", label: "Go to view", description: "Swap the message to another Studio view." },
  { value: "back_view", label: "Back view", description: "Return to a previous or named Studio view." },
  { value: "cancel_view", label: "Cancel view", description: "Exit the flow and fall back to a safer screen." },
  { value: "confirm", label: "Confirm action", description: "Confirm a flow step with a cleaner acknowledgement." },
  { value: "role_add", label: "Add role", description: "Grant a role from the button or menu option." },
  { value: "role_remove", label: "Remove role", description: "Remove a configured role from the member." },
  { value: "role_toggle", label: "Toggle role", description: "Add or remove the same role with one action." },
  { value: "run_command", label: "Run command", description: "Trigger another Archivist command path with arguments." },
  { value: "log_action", label: "Log action", description: "Write a trace or receipt message into a log channel." },
  { value: "ticket_create", label: "Create ticket", description: "Kick off a ticket panel or department intake." },
  { value: "hidden_by_gate", label: "Role gate", description: "Hide or lock the action behind role checks." },
];

const STUDIO_ACTION_QUICK_CHOICES: StudioInteractiveActionType[] = [
  "reply_message",
  "open_url",
  "open_modal",
  "role_toggle",
  "run_command",
  "goto_view",
];

function getStudioActionMeta(value: string | null | undefined) {
  return STUDIO_ACTION_OPTIONS.find((option) => option.value === value) || STUDIO_ACTION_OPTIONS[0];
}

function isStudioSelectNodeType(value: string | null | undefined): value is StudioSelectNodeKind {
  return STUDIO_SELECT_NODE_TYPES.includes(value as StudioSelectNodeKind);
}

function getStudioSelectKindLabel(value: string | null | undefined) {
  return isStudioSelectNodeType(value) ? STUDIO_SELECT_KIND_LABELS[value] : "Select Menu";
}

function parseCommaSeparatedValues(value: string) {
  return Array.from(new Set(
    value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
  ));
}

function formatCommaSeparatedValues(value: unknown) {
  return Array.isArray(value) ? value.map((entry) => String(entry)).filter(Boolean).join(", ") : "";
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read the selected file."));
    reader.readAsDataURL(file);
  });
}

function isMobileTextEditingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT";
}

function countOccurrences(source: string, needle: string) {
  if (!needle) return 0;
  return source.split(needle).length - 1;
}

function countAssetReferences(document: StudioDocument, assetUrl: string) {
  let total = 0;

  Object.values(document.views).forEach((view) => {
    view.embeds.forEach((embed) => {
      [embed.imageUrl, embed.thumbnailUrl, embed.authorIconUrl, embed.footerIconUrl].forEach((value) => {
        if (value === assetUrl) total += 1;
      });
    });
  });

  Object.values(document.nodes).forEach((node) => {
    total += countOccurrences(JSON.stringify(node.props || {}), assetUrl);
  });

  return total;
}

function summarizeStudioCopyLegacy(value: string, fallback: string, maxLength = 72) {
  const trimmed = String(value || "").replace(/\s+/g, " ").trim();
  if (!trimmed) return fallback;
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength - 1)}…` : trimmed;
}

function summarizeStudioCopy(value: string, fallback: string, maxLength = 72) {
  const trimmed = String(value || "").replace(/\s+/g, " ").trim();
  if (!trimmed) return fallback;
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength - 3)}...` : trimmed;
}

function nodeContainsSelection(document: StudioDocument, nodeId: string, selectionNodeId: string | null): boolean {
  if (!selectionNodeId) return false;
  if (nodeId === selectionNodeId) return true;
  const node = document.nodes[nodeId];
  if (!node) return false;
  return node.childIds.some((childId) => nodeContainsSelection(document, childId, selectionNodeId));
}

function getNodeOutlineEyebrow(node: StudioNode) {
  switch (node.type) {
    case "text_display":
      return "Text block";
    case "divider":
      return "Divider";
    case "style_block":
      return "Notice";
    case "section":
      return "Section";
    case "action_row":
      return "Action row";
    case "button":
      return "Button";
    case "string_select":
      return "String menu";
    case "role_select":
      return "Role selector";
    case "user_select":
      return "User selector";
    case "channel_select":
      return "Channel selector";
    case "mentionable_select":
      return "Mention selector";
    case "file":
      return "File";
    case "media_gallery":
      return "Gallery";
    default:
      return "Block";
  }
}

function getNodeOutlineTitle(node: StudioNode) {
  switch (node.type) {
    case "text_display":
      return summarizeStudioCopy(String(node.props.text || ""), "Untitled text");
    case "divider":
      return summarizeStudioCopy(String(node.props.text || node.props.symbol || ""), "Divider");
    case "style_block":
      return summarizeStudioCopy(String(node.props.title || ""), "Notice block");
    case "section":
      return summarizeStudioCopy(String(node.props.heading || ""), "Untitled section");
    case "action_row":
      return summarizeStudioCopy(
        Array.isArray(node.childIds) && node.childIds.length > 0
          ? `${node.childIds.length} interaction${node.childIds.length === 1 ? "" : "s"}`
          : "Empty interaction row",
        "Action row",
      );
    case "button":
      return summarizeStudioCopy(String(node.props.label || ""), "Button");
    case "string_select":
    case "role_select":
    case "user_select":
    case "channel_select":
    case "mentionable_select":
      return summarizeStudioCopy(String(node.props.label || node.props.placeholder || ""), getStudioSelectKindLabel(node.type));
    case "file":
      return summarizeStudioCopy(String(node.props.label || ""), "File block");
    case "media_gallery":
      return summarizeStudioCopy(String(node.props.title || ""), "Media gallery");
    default:
      return "Block";
  }
}

function getNodeOutlineDescription(node: StudioNode) {
  switch (node.type) {
    case "text_display":
      return "Visible copy that reads like part of the message body.";
    case "divider":
      return "A visual break that separates one beat of the message from the next.";
    case "style_block":
      return "A framed notice with title, description, and accent color.";
    case "section":
      return "A layout section for grouping related content and child blocks.";
    case "action_row":
      return node.childIds.length > 0 ? "Interactive controls grouped into one Discord row." : "Add buttons or selectors into this row.";
    case "button":
      return "A primary interaction that runs a Studio action or command follow-up.";
    case "string_select":
    case "role_select":
    case "user_select":
    case "channel_select":
    case "mentionable_select":
      return "A selector block that lets members choose before the next action.";
    case "file":
      return "A downloadable or linked attachment surface inside the message.";
    case "media_gallery":
      return "A group of visual assets that publish together as one gallery.";
    default:
      return "A reusable part of the message structure.";
  }
}

function getNodeOutlineIcon(node: StudioNode): "text" | "divider" | "notice" | "layout" | "button" | "menu" | "file" | "asset" | "role" | "channel" | "mention" {
  switch (node.type) {
    case "text_display":
      return "text";
    case "divider":
      return "divider";
    case "style_block":
      return "notice";
    case "button":
      return "button";
    case "string_select":
      return "menu";
    case "role_select":
      return "role";
    case "channel_select":
      return "channel";
    case "mentionable_select":
      return "mention";
    case "file":
      return "file";
    case "media_gallery":
      return "asset";
    default:
      return "layout";
  }
}

function needsDedicatedMobileNodeScreen(nodeType: StudioNode["type"] | null | undefined) {
  return Boolean(nodeType && (nodeType === "action_row" || nodeType === "button" || isStudioSelectNodeType(nodeType)));
}

function isInsertTargetNode(nodeType: StudioNode["type"] | null | undefined) {
  return nodeType === "section" || nodeType === "container" || nodeType === "action_row";
}

function StudioTabButton({
  tab,
  activeTab,
  onSelect,
  icon: Icon,
  label,
}: {
  tab: StudioTabId;
  activeTab: StudioTabId;
  onSelect: (tab: StudioTabId) => void;
  icon: typeof MessageSquareText;
  label: string;
}) {
  const active = activeTab === tab;
  return (
    <button
      type="button"
      onClick={() => onSelect(tab)}
      className={cn(
        "flex min-w-0 flex-col items-center justify-center gap-1.5 rounded-[18px] border px-2 py-2.5 text-[11px] uppercase tracking-[0.2em] transition sm:flex-row sm:gap-2 sm:px-3 sm:text-sm sm:normal-case sm:tracking-normal",
        active
          ? "border-[rgba(168,41,63,0.22)] bg-[linear-gradient(180deg,rgba(22,14,16,0.98),rgba(11,10,11,1))] text-white shadow-[0_14px_34px_rgba(0,0,0,0.2)]"
          : "border-white/10 bg-[#0b0d10]/95 text-white/62 hover:border-white/20 hover:text-white/82",
      )}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </button>
  );
}

function DesktopEditorSection({
  title,
  description,
  children,
  tone = "default",
}: {
  title: string;
  description: string;
  children: ReactNode;
  tone?: "default" | "danger";
}) {
  return (
    <section
      className={cn(
        "rounded-[20px] border px-4 py-4 shadow-[0_16px_36px_rgba(0,0,0,0.18)]",
        tone === "danger"
          ? "border-[rgba(124,44,58,0.22)] bg-[linear-gradient(180deg,rgba(20,12,14,0.98),rgba(10,9,10,1))]"
          : "border-white/8 bg-[linear-gradient(180deg,rgba(12,13,15,0.98),rgba(8,9,10,1))]",
      )}
    >
      <div className="space-y-1">
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="text-xs leading-5 text-white/44">{description}</p>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function BuildSelectionEditor({
  draft,
  selectedViewId,
  selection,
  isMobile = false,
  roleOptions = [],
  channelOptions = [],
  onChangeDraft,
  onDeleteEmbed,
  onDeleteNode,
  onMoveNode,
  onAddEmbed,
  onSwitchEmbed,
}: {
  draft: StudioDocument;
  selectedViewId: string;
  selection: StudioSelection;
  isMobile?: boolean;
  roleOptions?: Array<{ id: string; name: string }>;
  channelOptions?: Array<{ id: string; name: string }>;
  onChangeDraft: (updater: (document: StudioDocument) => void) => void;
  onDeleteEmbed: (embedIndex: number) => void;
  onDeleteNode: (nodeId: string) => void;
  onMoveNode: (nodeId: string, direction: -1 | 1) => void;
  onAddEmbed?: () => void;
  onSwitchEmbed?: (index: number) => void;
}) {
  const view = getView(draft, selectedViewId);
  const wrapForMobile = (
    defaults: string[],
    sections: Array<{ value: string; title: string; description: string; content: ReactNode }>,
  ) => (
    <Accordion type="multiple" defaultValue={defaults} className="space-y-3">
      {sections.map((section) => (
        <MobileEditorSection key={section.value} value={section.value} title={section.title} description={section.description}>
          {section.content}
        </MobileEditorSection>
      ))}
    </Accordion>
  );
  const renderInspectorSections = (
    defaults: string[],
    sections: Array<{ value: string; title: string; description: string; content: ReactNode; tone?: "default" | "danger" }>,
  ) => (
    isMobile
      ? wrapForMobile(defaults, sections)
      : (
        <div className="space-y-3">
          {sections.map((section) => (
            <DesktopEditorSection
              key={section.value}
              title={section.title}
              description={section.description}
              tone={section.tone}
            >
              {section.content}
            </DesktopEditorSection>
          ))}
        </div>
      )
  );
  const desktopDanger = (onRemove: () => void, label = "Remove Block") => (
    <Button variant="ghost" className="justify-start rounded-[18px] px-0 text-red-300 hover:bg-transparent hover:text-red-200" onClick={onRemove}>
      {label}
    </Button>
  );
  const viewOptions = Object.values(draft.views);
  const modalOptions = Object.values(draft.modals);
  const safeChannelOptions = channelOptions.filter((entry) => String(entry.id || "").trim().length > 0);
  const safeRoleOptions = roleOptions.filter((entry) => String(entry.id || "").trim().length > 0);
  const ensureHelperModal = (document: StudioDocument, label: string) => {
    const existingModalId = Object.keys(document.modals || {})[0];
    if (existingModalId) return existingModalId;
    const modalId = makeId("modal");
    document.modals[modalId] = {
      id: modalId,
      title: `${label} modal`.slice(0, 45),
      customIdSeed: `${modalId}:submit`,
      fields: [
        {
          id: "details",
          label: "Details",
          style: "paragraph",
          required: true,
        },
      ],
      submitActionIds: [],
    };
    return modalId;
  };
  const configureActionType = (
    document: StudioDocument,
    actionId: string,
    nextType: StudioInteractiveActionType,
    label: string,
  ) => {
    const action = document.actions[actionId];
    if (!action) return;
    action.type = nextType as any;
    if (
      nextType === "reply_message"
      || nextType === "follow_up_message"
      || nextType === "channel_message"
      || nextType === "dm_user"
      || nextType === "confirm"
    ) {
      action.replyMode = action.replyMode || "ephemeral";
      action.response = action.response || {
        mode: "inline",
        inline: {
          content: "Action received.",
          embeds: [],
        },
      };
    }
    if (nextType === "open_url") {
      action.url = action.url || "https://example.com";
    }
    if (nextType === "open_modal") {
      action.modalId = action.modalId || ensureHelperModal(document, label);
    }
    if (nextType === "goto_view" || nextType === "back_view") {
      action.targetViewId = action.targetViewId || selectedViewId;
    }
    if (nextType === "cancel_view") {
      action.fallbackViewId = action.fallbackViewId || selectedViewId;
    }
    if (nextType === "role_add" || nextType === "role_remove" || nextType === "role_toggle") {
      action.roleId = action.roleId || safeRoleOptions[0]?.id || "";
    }
    if (nextType === "run_command") {
      action.commandName = action.commandName || "help";
      action.commandArgs = action.commandArgs || "";
    }
    if (nextType === "channel_message" || nextType === "log_action") {
      action.channelId = action.channelId || safeChannelOptions[0]?.id || "";
    }
    if (nextType === "ticket_create") {
      action.ticketPanelId = action.ticketPanelId || 1;
      action.ticketDepartmentId = action.ticketDepartmentId || "";
    }
    if (nextType === "log_action") {
      action.logLabel = action.logLabel || `${label} trace`;
    }
    if (nextType === "hidden_by_gate") {
      action.allowedRoleIds = Array.isArray(action.allowedRoleIds) ? action.allowedRoleIds : [];
      action.blockedRoleIds = Array.isArray(action.blockedRoleIds) ? action.blockedRoleIds : [];
      action.hiddenByGate = action.hiddenByGate ?? true;
    }
  };
  const renderResponseEditor = (
    actionId: string,
    action: StudioAction,
    inputLabel: string,
    placeholder: string,
  ) => (
    <div className="space-y-2">
      <Label>{inputLabel}</Label>
      <Textarea
        value={String(action.response?.inline?.content || "")}
        onChange={(event) => onChangeDraft((document) => {
          if (!document.actions[actionId]) return;
          const currentAction = document.actions[actionId];
          currentAction.response = {
            mode: "inline",
            inline: {
              content: event.target.value,
              embeds: currentAction.response?.inline?.embeds || [],
            },
          };
        })}
        placeholder={placeholder}
        className="min-h-[140px]"
      />
    </div>
  );
  const renderActionEditor = (
    actionId: string,
    action: StudioAction,
    sourceLabel: string,
    options?: { forButton?: boolean; responseLabel?: string; responsePlaceholder?: string },
  ) => {
    const actionMeta = getStudioActionMeta(action.type);
    const responseLabel = options?.responseLabel || "Reply text";
    const responsePlaceholder = options?.responsePlaceholder || "Action received.";
    const showsInlineResponse =
      action.type === "reply_message"
      || action.type === "follow_up_message"
      || action.type === "channel_message"
      || action.type === "dm_user"
      || action.type === "confirm";

    return (
      <>
        <div className="space-y-2">
          <Label>Quick picks</Label>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {STUDIO_ACTION_QUICK_CHOICES.map((option) => {
              const active = action.type === option;
              const meta = getStudioActionMeta(option);
              return (
                <Button
                  key={`${actionId}-${option}`}
                  type="button"
                  size="sm"
                  variant="outline"
                  className={cn(
                    "h-auto min-h-12 justify-start rounded-[14px] border px-3 py-3 text-left",
                    active
                      ? "border-[rgba(168,41,63,0.22)] bg-[linear-gradient(180deg,rgba(22,14,16,0.98),rgba(11,10,11,1))] text-white"
                      : "border-white/10 bg-white/[0.03] text-white/80",
                  )}
                  onClick={() => onChangeDraft((document) => {
                    if (!document.actions[actionId]) return;
                    configureActionType(document, actionId, option, sourceLabel);
                    if (options?.forButton) {
                      const targetNode = Object.values(document.nodes).find((entry) => entry.actionId === actionId);
                      if (targetNode?.type === "button") {
                        const currentStyle = Number(targetNode.props.style || 1);
                        targetNode.props.style = option === "open_url" ? 5 : currentStyle === 5 ? 1 : currentStyle;
                      }
                    }
                  })}
                >
                  <div className="space-y-1">
                    <div className="text-sm font-semibold">{meta.label}</div>
                    <div className="text-[11px] leading-4 text-white/50">{meta.description}</div>
                  </div>
                </Button>
              );
            })}
          </div>
        </div>
        <div className="space-y-2">
          <Label>Action type</Label>
          <Select value={String(action.type || "reply_message")} onValueChange={(value) => onChangeDraft((document) => {
            if (!document.actions[actionId]) return;
            const nextType = value as StudioInteractiveActionType;
            configureActionType(document, actionId, nextType, sourceLabel);
            if (options?.forButton) {
              const targetNode = Object.values(document.nodes).find((entry) => entry.actionId === actionId);
              if (targetNode?.type === "button") {
                const currentStyle = Number(targetNode.props.style || 1);
                targetNode.props.style = nextType === "open_url" ? 5 : currentStyle === 5 ? 1 : currentStyle;
              }
            }
          })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {STUDIO_ACTION_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs leading-5 text-white/48">{actionMeta.description}</p>
        </div>
        {action.type === "open_url" ? (
          <div className="space-y-2">
            <Label>URL</Label>
            <Input value={String(action.url || "")} onChange={(event) => onChangeDraft((document) => {
              if (document.actions[actionId]) document.actions[actionId].url = event.target.value;
            })} placeholder="https://..." />
          </div>
        ) : null}
        {showsInlineResponse ? (
          <>
            {action.type === "reply_message" ? (
              <div className="space-y-2">
                <Label>Reply mode</Label>
                <Select value={String(action.replyMode || "ephemeral")} onValueChange={(value) => onChangeDraft((document) => {
                  if (document.actions[actionId]) {
                    document.actions[actionId].replyMode = value as any;
                  }
                })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ephemeral">Ephemeral</SelectItem>
                    <SelectItem value="channel">Channel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            {action.type === "channel_message" ? (
              <div className="space-y-2">
                <Label>Target channel</Label>
                <Select value={String(action.channelId || "__none")} onValueChange={(value) => onChangeDraft((document) => {
                  if (document.actions[actionId]) document.actions[actionId].channelId = value === "__none" ? "" : value;
                })}>
                  <SelectTrigger><SelectValue placeholder="Pick a channel" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Choose later</SelectItem>
                    {safeChannelOptions.map((entry) => (
                      <SelectItem key={entry.id} value={entry.id}>#{entry.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            {renderResponseEditor(actionId, action, responseLabel, responsePlaceholder)}
          </>
        ) : null}
        {(action.type === "goto_view" || action.type === "back_view") ? (
          <div className="space-y-2">
            <Label>{action.type === "back_view" ? "Back target view" : "Target view"}</Label>
            <Select value={String(action.targetViewId || selectedViewId)} onValueChange={(value) => onChangeDraft((document) => {
              if (document.actions[actionId]) document.actions[actionId].targetViewId = value;
            })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {viewOptions.map((entry) => (
                  <SelectItem key={entry.id} value={entry.id}>{entry.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        {action.type === "cancel_view" ? (
          <div className="space-y-2">
            <Label>Fallback view</Label>
            <Select value={String(action.fallbackViewId || selectedViewId)} onValueChange={(value) => onChangeDraft((document) => {
              if (document.actions[actionId]) document.actions[actionId].fallbackViewId = value;
            })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {viewOptions.map((entry) => (
                  <SelectItem key={entry.id} value={entry.id}>{entry.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        {action.type === "open_modal" ? renderModalEditor(actionId, String(action.label || sourceLabel), action.modalId) : null}
        {(action.type === "role_add" || action.type === "role_remove" || action.type === "role_toggle") ? (
          <div className="space-y-2">
            <Label>Role target</Label>
            <Select value={String(action.roleId || "__none")} onValueChange={(value) => onChangeDraft((document) => {
              if (document.actions[actionId]) document.actions[actionId].roleId = value === "__none" ? "" : value;
            })}>
              <SelectTrigger><SelectValue placeholder="Pick a role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Choose later</SelectItem>
                {safeRoleOptions.map((entry) => (
                  <SelectItem key={entry.id} value={entry.id}>@{entry.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        {action.type === "run_command" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Command name</Label>
              <Input value={String(action.commandName || "")} onChange={(event) => onChangeDraft((document) => {
                if (document.actions[actionId]) document.actions[actionId].commandName = event.target.value;
              })} placeholder="help" />
            </div>
            <div className="space-y-2">
              <Label>Command args</Label>
              <Input value={String(action.commandArgs || "")} onChange={(event) => onChangeDraft((document) => {
                if (document.actions[actionId]) document.actions[actionId].commandArgs = event.target.value;
              })} placeholder="optional arguments" />
            </div>
          </div>
        ) : null}
        {action.type === "log_action" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Log channel</Label>
              <Select value={String(action.channelId || "__none")} onValueChange={(value) => onChangeDraft((document) => {
                if (document.actions[actionId]) document.actions[actionId].channelId = value === "__none" ? "" : value;
              })}>
                <SelectTrigger><SelectValue placeholder="Pick a channel" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Choose later</SelectItem>
                  {safeChannelOptions.map((entry) => (
                    <SelectItem key={entry.id} value={entry.id}>#{entry.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Log label</Label>
              <Input value={String(action.logLabel || "")} onChange={(event) => onChangeDraft((document) => {
                if (document.actions[actionId]) document.actions[actionId].logLabel = event.target.value;
              })} placeholder="Button click trace" />
            </div>
          </div>
        ) : null}
        {action.type === "ticket_create" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Ticket panel ID</Label>
              <Input value={String(action.ticketPanelId || "")} onChange={(event) => onChangeDraft((document) => {
                if (!document.actions[actionId]) return;
                const nextValue = Number(event.target.value);
                document.actions[actionId].ticketPanelId = Number.isFinite(nextValue) ? nextValue : undefined;
              })} placeholder="1" />
            </div>
            <div className="space-y-2">
              <Label>Department ID</Label>
              <Input value={String(action.ticketDepartmentId || "")} onChange={(event) => onChangeDraft((document) => {
                if (document.actions[actionId]) document.actions[actionId].ticketDepartmentId = event.target.value;
              })} placeholder="billing-support" />
            </div>
          </div>
        ) : null}
        {action.type === "hidden_by_gate" ? (
          <div className="space-y-4 rounded-[18px] border border-dashed border-white/10 bg-white/[0.03] p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Allowed role IDs</Label>
                <Input value={formatCommaSeparatedValues(action.allowedRoleIds)} onChange={(event) => onChangeDraft((document) => {
                  if (document.actions[actionId]) document.actions[actionId].allowedRoleIds = parseCommaSeparatedValues(event.target.value);
                })} placeholder="123, 456" />
              </div>
              <div className="space-y-2">
                <Label>Blocked role IDs</Label>
                <Input value={formatCommaSeparatedValues(action.blockedRoleIds)} onChange={(event) => onChangeDraft((document) => {
                  if (document.actions[actionId]) document.actions[actionId].blockedRoleIds = parseCommaSeparatedValues(event.target.value);
                })} placeholder="789, 999" />
              </div>
            </div>
            <label className="flex items-center justify-between rounded-[16px] border border-white/8 bg-[#0b0d10] px-4 py-3 text-sm text-white/72">
              <span>Hide action when gated</span>
              <Switch
                checked={Boolean(action.hiddenByGate)}
                onCheckedChange={(checked) => onChangeDraft((document) => {
                  if (document.actions[actionId]) document.actions[actionId].hiddenByGate = checked;
                })}
              />
            </label>
          </div>
        ) : null}
      </>
    );
  };
  const renderModalEditor = (actionId: string, actionLabel: string, modalId?: string | null) => {
    const modal = modalId ? draft.modals[modalId] : null;
    return (
      <div className="space-y-4 rounded-[18px] border border-dashed border-white/10 bg-white/[0.03] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">Modal helper</p>
            <p className="mt-1 text-xs text-white/46">Choose an existing modal or create one directly from this action.</p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-[14px]"
            onClick={() => onChangeDraft((document) => {
              const nextModalId = ensureHelperModal(document, actionLabel);
              if (document.actions[actionId]) {
                document.actions[actionId].modalId = nextModalId;
              }
            })}
          >
            <Plus className="mr-2 h-3.5 w-3.5" />
            Create Helper Modal
          </Button>
        </div>
        <div className="space-y-2">
          <Label>Modal</Label>
          <Select
            value={modalId || ""}
            onValueChange={(value) => onChangeDraft((document) => {
              if (document.actions[actionId]) {
                document.actions[actionId].modalId = value;
              }
            })}
          >
            <SelectTrigger><SelectValue placeholder="Pick a modal" /></SelectTrigger>
            <SelectContent>
              {modalOptions.map((entry) => (
                <SelectItem key={entry.id} value={entry.id}>{entry.title || entry.id}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {modal ? (
          <div className="space-y-4 rounded-[16px] border border-white/8 bg-[#0b0d10] p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Modal title</Label>
                <Input
                  value={modal.title}
                  onChange={(event) => onChangeDraft((document) => {
                    if (document.modals[modal.id]) document.modals[modal.id].title = event.target.value;
                  })}
                  placeholder="Collect details"
                />
              </div>
              <div className="space-y-2">
                <Label>Custom ID seed</Label>
                <Input
                  value={modal.customIdSeed}
                  onChange={(event) => onChangeDraft((document) => {
                    if (document.modals[modal.id]) document.modals[modal.id].customIdSeed = event.target.value;
                  })}
                  placeholder="modal:submit"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-[14px]"
                onClick={() => onChangeDraft((document) => {
                  const activeModal = document.modals[modal.id];
                  if (!activeModal || activeModal.fields.length >= 5) return;
                  activeModal.fields.push({
                    id: `field_${activeModal.fields.length + 1}`,
                    label: `Field ${activeModal.fields.length + 1}`,
                    style: "short",
                    required: true,
                  });
                })}
              >
                <Plus className="mr-2 h-3.5 w-3.5" />
                Short Field
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-[14px]"
                onClick={() => onChangeDraft((document) => {
                  const activeModal = document.modals[modal.id];
                  if (!activeModal || activeModal.fields.length >= 5) return;
                  activeModal.fields.push({
                    id: `field_${activeModal.fields.length + 1}`,
                    label: `Field ${activeModal.fields.length + 1}`,
                    style: "paragraph",
                    required: true,
                  });
                })}
              >
                <Plus className="mr-2 h-3.5 w-3.5" />
                Paragraph Field
              </Button>
            </div>
            <div className="space-y-3">
              {modal.fields.map((field, fieldIndex) => (
                <div key={`${modal.id}-field-${fieldIndex}`} className="grid gap-4 rounded-[16px] border border-white/8 bg-[#101318] p-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Field label</Label>
                    <Input
                      value={field.label}
                      onChange={(event) => onChangeDraft((document) => {
                        document.modals[modal.id].fields[fieldIndex].label = event.target.value;
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Field ID</Label>
                    <Input
                      value={field.id}
                      onChange={(event) => onChangeDraft((document) => {
                        document.modals[modal.id].fields[fieldIndex].id = event.target.value;
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Style</Label>
                    <Select
                      value={field.style}
                      onValueChange={(value) => onChangeDraft((document) => {
                        document.modals[modal.id].fields[fieldIndex].style = value as "short" | "paragraph";
                      })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="short">Short</SelectItem>
                        <SelectItem value="paragraph">Paragraph</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Placeholder</Label>
                    <Input
                      value={field.placeholder || ""}
                      onChange={(event) => onChangeDraft((document) => {
                        document.modals[modal.id].fields[fieldIndex].placeholder = event.target.value || undefined;
                      })}
                    />
                  </div>
                  <label className="flex items-center justify-between rounded-[16px] border border-white/8 bg-[#0b0d10] px-4 py-3 text-sm text-white/72">
                    <span>Required</span>
                    <Switch
                      checked={Boolean(field.required)}
                      onCheckedChange={(checked) => onChangeDraft((document) => {
                        document.modals[modal.id].fields[fieldIndex].required = checked;
                      })}
                    />
                  </label>
                  <div className="flex items-end justify-end">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-red-300 hover:bg-transparent hover:text-red-200"
                      onClick={() => onChangeDraft((document) => {
                        document.modals[modal.id].fields = document.modals[modal.id].fields.filter((_, index) => index !== fieldIndex);
                      })}
                    >
                      Remove Field
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-[16px] border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            This action does not have a modal selected yet.
          </div>
        )}
      </div>
    );
  };

  if (selection.kind === "message") {
    return renderInspectorSections(["identity", "body"], [
      {
        value: "identity",
        title: "Draft identity",
        description: "Name the draft so it is easy to reuse in commands and publish flows.",
        content: (
          <div className="space-y-2">
            <Label>Draft name</Label>
            <Input value={draft.meta.name} onChange={(event) => onChangeDraft((document) => { document.meta.name = event.target.value; })} placeholder="Untitled Message" />
          </div>
        ),
      },
      {
        value: "body",
        title: "Message body",
        description: "Write the main message members will see in Discord.",
        content: (
          <div className="space-y-2">
            <Label>Message body</Label>
            <Textarea
              value={String(view.messageContent || "")}
              onChange={(event) => onChangeDraft((document) => { document.views[selectedViewId].messageContent = event.target.value; })}
              placeholder="Write the message members will see..."
              className="min-h-[220px]"
            />
          </div>
        ),
      },
    ]);
  }

  if (selection.kind === "embed") {
    const updateSelectedEmbed = (updater: (currentEmbed: StudioEmbedDraft) => void) => {
      onChangeDraft((document) => {
        while (document.views[selectedViewId].embeds.length <= selection.embedIndex) {
          document.views[selectedViewId].embeds.push(createBlankEmbed());
        }
        updater(document.views[selectedViewId].embeds[selection.embedIndex]);
      });
    };
    return (
      <EmbedInspector
        embeds={view.embeds}
        embedIndex={selection.embedIndex}
        onSwitchEmbed={(i) => onSwitchEmbed?.(i)}
        onAddEmbed={() => onAddEmbed?.()}
        onChange={updateSelectedEmbed}
        onDelete={() => onDeleteEmbed(selection.embedIndex)}
        activeRegion={selection.region ?? null}
      />
    );
  }

  const node = draft.nodes[selection.nodeId];
  if (!node) {
    return <p className="text-sm text-muted-foreground">This selection no longer exists.</p>;
  }

  if (node.type === "text_display") {
    if (isMobile) {
      return wrapForMobile(["content"], [
        {
          value: "content",
          title: "Text block",
          description: "Keep the body tight and readable. This becomes part of the live message immediately.",
          content: (
            <div className="space-y-2">
              <Label>Text block</Label>
              <Textarea value={String(node.props.text || "")} onChange={(event) => onChangeDraft((document) => { document.nodes[node.id].props.text = event.target.value; })} placeholder="Write the block content..." className="min-h-[220px]" />
            </div>
          ),
        },
        {
          value: "danger",
          title: "Danger zone",
          description: "Remove this block from the draft.",
          content: desktopDanger(() => onDeleteNode(node.id)),
        },
      ]);
    }

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Text block</Label>
          <Textarea value={String(node.props.text || "")} onChange={(event) => onChangeDraft((document) => { document.nodes[node.id].props.text = event.target.value; })} placeholder="Write the block content..." className="min-h-[220px]" />
        </div>
        {desktopDanger(() => onDeleteNode(node.id))}
      </div>
    );
  }

  if (node.type === "style_block") {
    const noticeEditor = (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Heading</Label>
          <Input value={String(node.props.title || "")} onChange={(event) => onChangeDraft((document) => { document.nodes[node.id].props.title = event.target.value; })} placeholder="Important" />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea value={String(node.props.description || "")} onChange={(event) => onChangeDraft((document) => { document.nodes[node.id].props.description = event.target.value; })} placeholder="Explain the notice..." className="min-h-[160px]" />
        </div>
        <div className="space-y-2">
          <Label>Accent color</Label>
          <Input value={String(node.props.accentColor || "#B11226")} onChange={(event) => onChangeDraft((document) => { document.nodes[node.id].props.accentColor = event.target.value; })} placeholder="#B11226" />
        </div>
      </div>
    );

    if (isMobile) {
      return wrapForMobile(["notice"], [
        {
          value: "notice",
          title: "Notice block",
          description: "Use this for alerts, callouts, and high-contrast information panels.",
          content: noticeEditor,
        },
        {
          value: "danger",
          title: "Danger zone",
          description: "Remove this notice block from the draft.",
          content: desktopDanger(() => onDeleteNode(node.id)),
        },
      ]);
    }

    return <div className="space-y-4">{noticeEditor}{desktopDanger(() => onDeleteNode(node.id))}</div>;
  }

  if (node.type === "divider") {
    const dividerEditor = (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Divider mode</Label>
          <Select value={String(node.props.mode || "line")} onValueChange={(value) => onChangeDraft((document) => { document.nodes[node.id].props.mode = value; })}>
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
          <div className="space-y-2">
            <Label>Text or symbol</Label>
            <Input value={String(node.props.text || node.props.symbol || "")} onChange={(event) => onChangeDraft((document) => {
              document.nodes[node.id].props.text = event.target.value;
              document.nodes[node.id].props.symbol = event.target.value;
            })} placeholder="--------" />
          </div>
          <div className="space-y-2">
            <Label>Emoji</Label>
            <Input value={String(node.props.emoji || "")} onChange={(event) => onChangeDraft((document) => { document.nodes[node.id].props.emoji = event.target.value; })} placeholder="⭐" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Repeat count</Label>
          <Input type="number" min={1} max={12} value={String(node.props.repeat ?? 5)} onChange={(event) => onChangeDraft((document) => { document.nodes[node.id].props.repeat = Number(event.target.value || 1); })} />
        </div>
      </div>
    );

    if (isMobile) {
      return wrapForMobile(["divider"], [
        {
          value: "divider",
          title: "Divider",
          description: "Keep structure tight without breaking the visual flow.",
          content: dividerEditor,
        },
        {
          value: "danger",
          title: "Danger zone",
          description: "Remove this divider from the draft.",
          content: desktopDanger(() => onDeleteNode(node.id)),
        },
      ]);
    }

    return <div className="space-y-4">{dividerEditor}{desktopDanger(() => onDeleteNode(node.id))}</div>;
  }

  if (node.type === "section" || node.type === "container") {
    const sectionEditor = (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>{node.type === "section" ? "Section heading" : "Layout heading"}</Label>
          <Input value={String(node.props.heading || "")} onChange={(event) => onChangeDraft((document) => { document.nodes[node.id].props.heading = event.target.value; })} placeholder={node.type === "section" ? "New section" : "Container heading"} />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea value={String(node.props.description || "")} onChange={(event) => onChangeDraft((document) => { document.nodes[node.id].props.description = event.target.value; })} placeholder="Add section copy..." className="min-h-[160px]" />
        </div>
        <div className="rounded-[16px] border border-white/8 bg-[#0b0d10] px-4 py-3 text-xs text-white/46">
          This layout currently contains {node.childIds.length} child {node.childIds.length === 1 ? "part" : "parts"}.
        </div>
        <div className="rounded-[18px] border border-dashed border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">Insertion stays in one flow</p>
              <p className="mt-1 text-xs text-white/46">Use the insert action above to add text, layout, or interaction inside this {node.type === "section" ? "section" : "container"} without switching to a different add model.</p>
            </div>
            <Badge variant="outline">{node.childIds.length} child{node.childIds.length === 1 ? "" : "ren"}</Badge>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="rounded-[16px] border border-white/8 bg-[#0b0d10] px-4 py-3">
              <p className="text-sm font-semibold text-white">Current target</p>
              <p className="mt-1 text-xs leading-5 text-white/46">{node.type === "container" ? "Containers can hold nested sections plus content blocks." : "Sections work best for grouped copy, notices, and interaction beats."}</p>
            </div>
            <div className="rounded-[16px] border border-white/8 bg-[#0b0d10] px-4 py-3">
              <p className="text-sm font-semibold text-white">Why this changed</p>
              <p className="mt-1 text-xs leading-5 text-white/46">Studio now keeps the grouped insert catalog as the primary way to add the next block, so the builder reads consistently on mobile.</p>
            </div>
          </div>
        </div>
      </div>
    );

    if (isMobile) {
      return wrapForMobile(["layout"], [
        {
          value: "layout",
          title: node.type === "section" ? "Section" : "Container",
          description: "Organize grouped content without losing the live message context.",
          content: sectionEditor,
        },
        {
          value: "danger",
          title: "Danger zone",
          description: `Remove this ${node.type === "section" ? "section" : "container"} from the draft.`,
          content: desktopDanger(() => onDeleteNode(node.id), node.type === "section" ? "Remove Section" : "Remove Container"),
        },
      ]);
    }

    return <div className="space-y-4">{sectionEditor}{desktopDanger(() => onDeleteNode(node.id), node.type === "section" ? "Remove Section" : "Remove Container")}</div>;
  }

  if (node.type === "file") {
    const fileEditor = (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Label</Label>
          <Input value={String(node.props.label || "")} onChange={(event) => onChangeDraft((document) => { document.nodes[node.id].props.label = event.target.value; })} placeholder="Download" />
        </div>
        <div className="space-y-2">
          <Label>File URL</Label>
          <Input value={String(node.props.url || "")} onChange={(event) => onChangeDraft((document) => { document.nodes[node.id].props.url = event.target.value; })} placeholder="https://..." />
        </div>
      </div>
    );

    if (isMobile) {
      return wrapForMobile(["file"], [
        {
          value: "file",
          title: "File block",
          description: "Attach a visible file reference or upload-backed asset.",
          content: fileEditor,
        },
        {
          value: "danger",
          title: "Danger zone",
          description: "Remove this file block from the draft.",
          content: desktopDanger(() => onDeleteNode(node.id), "Remove File Block"),
        },
      ]);
    }

    return <div className="space-y-4">{fileEditor}{desktopDanger(() => onDeleteNode(node.id), "Remove File Block")}</div>;
  }

  if (node.type === "media_gallery") {
    const items = Array.isArray(node.props.items) ? node.props.items : [];
    const galleryEditor = (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Gallery title</Label>
          <Input value={String(node.props.title || "")} onChange={(event) => onChangeDraft((document) => { document.nodes[node.id].props.title = event.target.value; })} placeholder="Gallery" />
        </div>
        <div className="space-y-3">
          {[0, 1].map((index) => {
            const item = items[index] || {};
            return (
              <div key={index} className="rounded-[16px] border border-white/8 bg-[#0b0d10] p-3">
                <p className="mb-3 text-xs uppercase tracking-[0.2em] text-white/34">Image {index + 1}</p>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Image URL</Label>
                    <Input
                      value={String(item.url || "")}
                      onChange={(event) => onChangeDraft((document) => {
                        const nextItems = Array.isArray(document.nodes[node.id].props.items) ? [...(document.nodes[node.id].props.items as any[])] : [];
                        nextItems[index] = { ...(nextItems[index] || {}), url: event.target.value };
                        document.nodes[node.id].props.items = nextItems;
                      })}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Caption</Label>
                    <Input
                      value={String(item.description || "")}
                      onChange={(event) => onChangeDraft((document) => {
                        const nextItems = Array.isArray(document.nodes[node.id].props.items) ? [...(document.nodes[node.id].props.items as any[])] : [];
                        nextItems[index] = { ...(nextItems[index] || {}), description: event.target.value };
                        document.nodes[node.id].props.items = nextItems;
                      })}
                      placeholder="Optional caption"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );

    if (isMobile) {
      return wrapForMobile(["gallery"], [
        {
          value: "gallery",
          title: "Gallery",
          description: "Keep the gallery tight. Add only the images the message really needs.",
          content: galleryEditor,
        },
        {
          value: "danger",
          title: "Danger zone",
          description: "Remove this gallery from the draft.",
          content: desktopDanger(() => onDeleteNode(node.id), "Remove Gallery"),
        },
      ]);
    }

    return <div className="space-y-4">{galleryEditor}{desktopDanger(() => onDeleteNode(node.id), "Remove Gallery")}</div>;
  }

  if (node.type === "action_row") {
    const rowChildren = node.childIds.map((childId) => draft.nodes[childId]).filter(Boolean);
    const rowHasButtons = rowChildren.some((child) => child.type === "button");
    const rowHasSelect = rowChildren.some((child) => child.type !== "button");
    const rowEditor = (
      <div className="space-y-4">
        <div className="rounded-[16px] border border-white/8 bg-[#0b0d10] px-4 py-3 text-sm text-white/72">
          This row contains {node.childIds.length} item{node.childIds.length === 1 ? "" : "s"}.
          <p className="mt-1 text-xs text-white/42">Discord rows can hold up to 5 buttons or 1 select menu. Mixing both is technically possible in the draft but warned against before publish.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-[16px] border border-white/8 bg-[#0b0d10] px-4 py-3">
            <p className="text-sm font-semibold text-white">Add through the grouped flow</p>
            <p className="mt-1 text-xs leading-5 text-white/42">
              {rowHasSelect
                ? "This row already has a menu. Keep button groups and menu rows separate when you add the next interaction."
                : rowHasButtons
                  ? "Use the grouped add flow to keep stacking buttons into this row without opening a second insertion pattern."
                  : "Open the grouped add flow above to insert either a button set or a single menu into this row."}
            </p>
          </div>
          <div className="rounded-[16px] border border-white/8 bg-[#0b0d10] px-4 py-3">
            <p className="text-sm font-semibold text-white">Discord row limits</p>
            <p className="mt-1 text-xs leading-5 text-white/42">
              {rowHasSelect
                ? "A menu owns the whole row. Add another row if you need more actions."
                : node.childIds.length >= 5
                  ? "This row is full. Reorder, trim, or create another row for additional actions."
                  : "Rows hold up to 5 buttons or 1 menu. Studio keeps that publish reality visible while you work."}
            </p>
          </div>
        </div>
        <div className="space-y-2">
          {node.childIds.map((childId, index) => {
            const child = draft.nodes[childId];
            if (!child) return null;
            const canMoveUp = index > 0;
            const canMoveDown = index < node.childIds.length - 1;
            return (
              <div key={childId} className="flex items-center justify-between gap-3 rounded-[16px] border border-white/8 bg-[#0b0d10] px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-white">{String(child.props.label || (isStudioSelectNodeType(child.type) ? `${getStudioSelectKindLabel(child.type)} ${index + 1}` : `Button ${index + 1}`))}</p>
                  <p className="mt-1 text-xs text-white/42">{isStudioSelectNodeType(child.type) ? "Tap the selector in preview to edit its behavior." : "Tap the button in preview to edit its behavior."}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-full border-white/10 bg-white/[0.03]"
                      onClick={() => onMoveNode(childId, -1)}
                      disabled={!canMoveUp}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-full border-white/10 bg-white/[0.03]"
                      onClick={() => onMoveNode(childId, 1)}
                      disabled={!canMoveDown}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <Badge variant="outline">{index + 1}</Badge>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );

    if (isMobile) {
      return wrapForMobile(["row"], [
        {
          value: "row",
          title: "Action row",
          description: "Keep actions grouped and visible without crowding the message.",
          content: rowEditor,
        },
        {
          value: "danger",
          title: "Danger zone",
          description: "Remove this entire action row from the draft.",
          content: desktopDanger(() => onDeleteNode(node.id), "Remove Action Row"),
        },
      ]);
    }

    return <div className="space-y-4">{rowEditor}{desktopDanger(() => onDeleteNode(node.id), "Remove Action Row")}</div>;
  }

  if (node.type === "button") {
    const action = node.actionId ? draft.actions[node.actionId] : null;
    const buttonEditor = (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Button label</Label>
          <Input value={String(node.props.label || "")} onChange={(event) => onChangeDraft((document) => { document.nodes[node.id].props.label = event.target.value; })} placeholder="Primary Action" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Button style</Label>
            <Select value={String(node.props.style || 1)} onValueChange={(value) => onChangeDraft((document) => { document.nodes[node.id].props.style = Number(value); })}>
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
          <div className="space-y-2">
            <Label>Emoji</Label>
            <Input value={String(node.props.emoji || "")} onChange={(event) => onChangeDraft((document) => { document.nodes[node.id].props.emoji = event.target.value; })} placeholder="Optional emoji" />
          </div>
        </div>
        {action ? (
          <>
            <div className="space-y-2">
              <Label>Action label</Label>
              <Input value={String(action.label || "")} onChange={(event) => onChangeDraft((document) => { if (node.actionId && document.actions[node.actionId]) document.actions[node.actionId].label = event.target.value; })} placeholder="Primary action" />
            </div>
            {renderActionEditor(node.actionId || "", action, String(node.props.label || "Button"), {
              forButton: true,
              responseLabel: "Reply text",
              responsePlaceholder: "Action received.",
            })}
          </>
        ) : (
          <div className="rounded-[16px] border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            This button does not have a handler yet.
          </div>
        )}
      </div>
    );

    if (isMobile) {
      return wrapForMobile(["button"], [
        {
          value: "button",
          title: "Button",
          description: "Tune the label, style, and handler before you publish the row.",
          content: buttonEditor,
        },
        {
          value: "danger",
          title: "Danger zone",
          description: "Remove this button from the draft.",
          content: desktopDanger(() => onDeleteNode(node.id), "Remove Button"),
        },
      ]);
    }

    return <div className="space-y-4">{buttonEditor}{desktopDanger(() => onDeleteNode(node.id), "Remove Button")}</div>;
  }

  if (isStudioSelectNodeType(node.type)) {
    const isStringSelect = node.type === "string_select";
    const selectKindLabel = getStudioSelectKindLabel(node.type);
    const options = Array.isArray(node.props.options) ? node.props.options as Array<Record<string, unknown>> : [];
    const selectEditor = (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Selector type</Label>
            <Select value={node.type} onValueChange={(value) => onChangeDraft((document) => {
              if (!isStudioSelectNodeType(value)) return;
              const currentNode = document.nodes[node.id];
              if (!currentNode || !isStudioSelectNodeType(currentNode.type)) return;
              currentNode.type = value;
              currentNode.props.label = String(currentNode.props.label || STUDIO_SELECT_KIND_LABELS[value]);
              currentNode.props.placeholder = String(currentNode.props.placeholder || (value === "string_select" ? "Choose an option" : "Choose from Discord"));
              currentNode.props.minValues = Number(currentNode.props.minValues ?? 1);
              currentNode.props.maxValues = Number(currentNode.props.maxValues ?? 1);

              if (value === "string_select") {
                const nextOptions = Array.isArray(currentNode.props.options)
                  ? [...(currentNode.props.options as Array<Record<string, unknown>>)]
                  : [];
                if (nextOptions.length === 0) {
                  const nextValue = "option-1";
                  const action = createDefaultAction("Option 1 action");
                  document.actions[action.id] = action;
                  nextOptions.push({
                    label: "Option 1",
                    value: nextValue,
                    description: "First choice",
                  });
                  currentNode.optionActionIds = {
                    ...(currentNode.optionActionIds || {}),
                    [nextValue]: action.id,
                  };
                }
                currentNode.props.options = nextOptions;
                delete currentNode.props.defaultValues;
                delete currentNode.props.channelTypes;
                return;
              }

              delete currentNode.props.options;
              currentNode.optionActionIds = undefined;
              currentNode.props.defaultValues = Array.isArray(currentNode.props.defaultValues)
                ? (currentNode.props.defaultValues as string[])
                : [];
              if (value === "channel_select") {
                currentNode.props.channelTypes = Array.isArray(currentNode.props.channelTypes)
                  ? currentNode.props.channelTypes
                  : ["guild_text"];
              } else {
                delete currentNode.props.channelTypes;
              }
            })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STUDIO_SELECT_NODE_TYPES.map((kind) => (
                  <SelectItem key={kind} value={kind}>{STUDIO_SELECT_KIND_LABELS[kind]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{isStringSelect ? "Menu label" : "Selector label"}</Label>
            <Input value={String(node.props.label || "")} onChange={(event) => onChangeDraft((document) => { document.nodes[node.id].props.label = event.target.value; })} placeholder={isStringSelect ? "Dropdown" : selectKindLabel} />
          </div>
          <div className="space-y-2">
            <Label>Custom ID</Label>
            <Input value={String(node.props.customId || "")} onChange={(event) => onChangeDraft((document) => { document.nodes[node.id].props.customId = event.target.value; })} placeholder="panel:menu" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Placeholder</Label>
            <Input value={String(node.props.placeholder || "")} onChange={(event) => onChangeDraft((document) => { document.nodes[node.id].props.placeholder = event.target.value; })} placeholder="Choose an option" />
          </div>
          <div className="space-y-2">
            <Label>Minimum Values</Label>
            <Input type="number" min={0} max={25} value={String(node.props.minValues ?? 1)} onChange={(event) => onChangeDraft((document) => { document.nodes[node.id].props.minValues = Number(event.target.value || 1); })} />
          </div>
          <div className="space-y-2">
            <Label>Maximum Values</Label>
            <Input type="number" min={1} max={25} value={String(node.props.maxValues ?? 1)} onChange={(event) => onChangeDraft((document) => { document.nodes[node.id].props.maxValues = Number(event.target.value || 1); })} />
          </div>
        </div>
        {!isStringSelect ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Default selected IDs</Label>
              <Textarea
                value={formatCommaSeparatedValues(node.props.defaultValues)}
                onChange={(event) => onChangeDraft((document) => {
                  document.nodes[node.id].props.defaultValues = parseCommaSeparatedValues(event.target.value);
                })}
                className="min-h-[96px]"
                placeholder="Optional IDs, comma separated"
              />
            </div>
            {node.type === "channel_select" ? (
              <div className="space-y-2 md:col-span-2">
                <Label>Allowed channel types</Label>
                <Input
                  value={formatCommaSeparatedValues(node.props.channelTypes)}
                  onChange={(event) => onChangeDraft((document) => {
                    document.nodes[node.id].props.channelTypes = parseCommaSeparatedValues(event.target.value);
                  })}
                  placeholder="guild_text, guild_voice, guild_announcement"
                />
              </div>
            ) : null}
            <div className="rounded-[18px] border border-dashed border-white/10 bg-white/[0.03] p-4 md:col-span-2">
              <p className="text-sm font-semibold text-white">Discord-driven selector</p>
              <p className="mt-1 text-xs leading-5 text-white/46">
                Discord fills these selectors live. You do not have to manually create options for roles, users, channels, or mentionables.
              </p>
            </div>
          </div>
        ) : null}
        {isStringSelect ? (
          <div className="rounded-[18px] border border-dashed border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">Options</p>
                <p className="mt-1 text-xs text-white/46">Each option can trigger its own reply or link action.</p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-[14px]"
                onClick={() => onChangeDraft((document) => {
                  const nextOptions = Array.isArray(document.nodes[node.id].props.options)
                    ? [...(document.nodes[node.id].props.options as Array<Record<string, unknown>>)]
                    : [];
                  const nextIndex = nextOptions.length + 1;
                  const nextValue = `option-${nextIndex}`;
                  const action = createDefaultAction(`Option ${nextIndex} action`);
                  document.actions[action.id] = action;
                  nextOptions.push({
                    label: `Option ${nextIndex}`,
                    value: nextValue,
                    description: "",
                  });
                  document.nodes[node.id].props.options = nextOptions;
                  document.nodes[node.id].optionActionIds = {
                    ...(document.nodes[node.id].optionActionIds || {}),
                    [nextValue]: action.id,
                  };
                })}
                disabled={options.length >= 25}
              >
                <Plus className="mr-2 h-3.5 w-3.5" />
                Add Option
              </Button>
            </div>
            <div className="mt-4 space-y-3">
              {options.length === 0 ? <div className="rounded-[16px] border border-dashed border-white/10 px-4 py-3 text-sm text-white/46">No options yet. Add one to make this menu usable.</div> : null}
              {options.map((option, index) => {
              const optionValue = String(option.value || "");
              const actionId = optionValue ? node.optionActionIds?.[optionValue] : undefined;
              const action = actionId ? draft.actions[actionId] : null;
              return (
                <div key={`${optionValue || "option"}-${index}`} className="space-y-4 rounded-[18px] border border-white/10 bg-[#151920] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{String(option.label || `Option ${index + 1}`)}</p>
                      <p className="mt-1 text-xs text-white/42">{optionValue || "Missing option value"}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-300 hover:bg-transparent hover:text-red-200"
                      onClick={() => onChangeDraft((document) => {
                        const nextOptions = Array.isArray(document.nodes[node.id].props.options)
                          ? [...(document.nodes[node.id].props.options as Array<Record<string, unknown>>)]
                          : [];
                        const current = nextOptions[index];
                        nextOptions.splice(index, 1);
                        document.nodes[node.id].props.options = nextOptions;
                        const currentValue = String(current?.value || "");
                        if (currentValue && document.nodes[node.id].optionActionIds?.[currentValue]) {
                          delete document.actions[document.nodes[node.id].optionActionIds![currentValue]];
                          delete document.nodes[node.id].optionActionIds![currentValue];
                        }
                      })}
                    >
                      Remove
                    </Button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Label</Label>
                      <Input value={String(option.label || "")} onChange={(event) => onChangeDraft((document) => {
                        const nextOptions = [...((document.nodes[node.id].props.options as Array<Record<string, unknown>>) || [])];
                        nextOptions[index] = { ...nextOptions[index], label: event.target.value };
                        document.nodes[node.id].props.options = nextOptions;
                      })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Value</Label>
                      <Input value={optionValue} onChange={(event) => onChangeDraft((document) => {
                        const nextOptions = [...((document.nodes[node.id].props.options as Array<Record<string, unknown>>) || [])];
                        const previousValue = String(nextOptions[index]?.value || "");
                        const nextValue = event.target.value;
                        nextOptions[index] = { ...nextOptions[index], value: nextValue };
                        document.nodes[node.id].props.options = nextOptions;
                        const mapping = { ...(document.nodes[node.id].optionActionIds || {}) };
                        if (previousValue && mapping[previousValue]) {
                          mapping[nextValue] = mapping[previousValue];
                          delete mapping[previousValue];
                        }
                        document.nodes[node.id].optionActionIds = mapping;
                      })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input value={String(option.description || "")} onChange={(event) => onChangeDraft((document) => {
                        const nextOptions = [...((document.nodes[node.id].props.options as Array<Record<string, unknown>>) || [])];
                        nextOptions[index] = { ...nextOptions[index], description: event.target.value };
                        document.nodes[node.id].props.options = nextOptions;
                      })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Emoji</Label>
                      <Input value={String(option.emoji || "")} onChange={(event) => onChangeDraft((document) => {
                        const nextOptions = [...((document.nodes[node.id].props.options as Array<Record<string, unknown>>) || [])];
                        nextOptions[index] = { ...nextOptions[index], emoji: event.target.value };
                        document.nodes[node.id].props.options = nextOptions;
                      })} />
                    </div>
                  </div>
                  {action ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Action Label</Label>
                        <Input value={String(action.label || "")} onChange={(event) => onChangeDraft((document) => {
                          const optionActionId = document.nodes[node.id].optionActionIds?.[String((document.nodes[node.id].props.options as Array<Record<string, unknown>>)?.[index]?.value || "")];
                          if (optionActionId && document.actions[optionActionId]) {
                            document.actions[optionActionId].label = event.target.value;
                          }
                        })} />
                      </div>
                      {renderActionEditor(actionId || "", action, String(option.label || `Option ${index + 1}`), {
                        responseLabel: "Result text",
                        responsePlaceholder: "Tell members what happens after they choose this option.",
                      })}
                    </div>
                  ) : (
                    <div className="rounded-[16px] border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                      This option does not have a handler yet.
                    </div>
                  )}
                </div>
              );
              })}
            </div>
          </div>
        ) : null}
      </div>
    );

    if (isMobile) {
      return wrapForMobile(["menu"], [
        {
          value: "menu",
          title: selectKindLabel,
          description: isStringSelect ? "Configure the dropdown and its option-level actions without leaving the live message." : "Configure the selector without fighting Discord internals.",
          content: selectEditor,
        },
        {
          value: "danger",
          title: "Danger zone",
          description: `Remove this ${selectKindLabel.toLowerCase()} from the draft.`,
          content: desktopDanger(() => onDeleteNode(node.id), `Remove ${selectKindLabel}`),
        },
      ]);
    }

    return <div className="space-y-4">{selectEditor}{desktopDanger(() => onDeleteNode(node.id), `Remove ${selectKindLabel}`)}</div>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Use the preview to keep this pass simple. More block editors are being reintroduced in a cleaner format.</p>
      <Textarea readOnly value={JSON.stringify(node, null, 2)} className="min-h-[220px] font-mono text-xs" />
      {desktopDanger(() => onDeleteNode(node.id))}
    </div>
  );
}

function MobileEditorSection({
  value,
  title,
  description,
  children,
}: {
  value: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <AccordionItem value={value} className="overflow-hidden rounded-[18px] border border-white/8 bg-[#0c0e11]/92 px-4">
      <AccordionTrigger className="py-4 text-left hover:no-underline">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="pr-4 text-xs leading-5 text-white/42">{description}</p>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pb-4">
        {children}
      </AccordionContent>
    </AccordionItem>
  );
}

export function DesignStudioTab({ serverId, onOpenServerSettings, entryIntent }: DesignStudioTabProps) {
  const isMobile = useIsMobile();
  const search = useSearch();
  const { toast } = useToast();
  const documentsQuery = useStudioDocuments(serverId);
  const publicationsQuery = useStudioPublications(serverId);
  const createDocumentMutation = useCreateStudioDocument(serverId);
  const deleteDocumentMutation = useDeleteStudioDocument(serverId);
  const updateDocumentMutation = useUpdateStudioDocument(serverId);
  const preflightMutation = useStudioPreflight(serverId);
  const publishMutation = usePublishStudio(serverId);
  const uploadStudioAssetMutation = useUploadStudioAsset(serverId);
  const discordContextQuery = useDiscordContext(serverId, { enabled: true });

  const [currentDocumentId, setCurrentDocumentId] = useState<number | null>(null);
  const [draft, setDraft] = useState<StudioDocument | null>(null);
  const [dirty, setDirty] = useState(false);
  const [activeTab, setActiveTab] = useState<StudioTabId>("build");
  const [mobileStudioScreen, setMobileStudioScreen] = useState<MobileStudioScreen>("home");
  const [selectedViewId, setSelectedViewId] = useState("entry");
  const [selection, setSelection] = useState<StudioSelection>({ kind: "message", region: "body" });
  const [hideMobileChrome, setHideMobileChrome] = useState(false);
  const [publishChannelId, setPublishChannelId] = useState("");
  const [updateMessageId, setUpdateMessageId] = useState("");
  const [allowDowngrade, setAllowDowngrade] = useState(false);
  const [assetQuery, setAssetQuery] = useState("");
  const [documentManagerOpen, setDocumentManagerOpen] = useState(false);
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);
  const [mobileInsertOpen, setMobileInsertOpen] = useState(false);
  const [renameDocumentId, setRenameDocumentId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [homeStatusBanner, setHomeStatusBanner] = useState<{ tone: "working" | "error"; title: string; description: string } | null>(null);
  const [serverPreflight, setServerPreflight] = useState<any | null>(null);
  const preflightRequestRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const documents = useMemo(
    () => ((documentsQuery.data || []) as StudioDocumentRecord[]).map((record) => ({ ...record, document: normalizeStudioDocument(record.document, record.name) })),
    [documentsQuery.data],
  );
  const publications = (publicationsQuery.data || []) as StudioPublication[];
  const templateDocuments = useMemo(
    () =>
      [...documents]
        .filter((record) => record.kind === "template" && !record.isArchived)
        .sort((a, b) => (parseDate(b.updatedAt)?.getTime() || 0) - (parseDate(a.updatedAt)?.getTime() || 0)),
    [documents],
  );
  const sortedDocuments = useMemo(
    () =>
      [...documents]
        .filter((record) => record.kind !== "template" && !record.isArchived)
        .sort((a, b) => (parseDate(b.updatedAt)?.getTime() || 0) - (parseDate(a.updatedAt)?.getTime() || 0)),
    [documents],
  );
  const manageableDocuments = useMemo(
    () =>
      [...documents]
        .filter((record) => !record.isArchived)
        .sort((a, b) => (parseDate(b.updatedAt)?.getTime() || 0) - (parseDate(a.updatedAt)?.getTime() || 0)),
    [documents],
  );
  const activePublicationDocumentIds = useMemo(
    () => new Set(publications.filter((entry) => entry?.active !== false).map((entry) => entry.documentId)),
    [publications],
  );
  const draftsNeedingAttention = useMemo(
    () => sortedDocuments.filter((record) => !activePublicationDocumentIds.has(record.id)).slice(0, 4),
    [sortedDocuments, activePublicationDocumentIds],
  );
  const recentPublishFailures = useMemo(
    () =>
      [...publications]
        .filter((entry) => entry?.lastFailureSummary)
        .sort((a, b) => (parseDate(b.lastFailureAt || b.updatedAt)?.getTime() || 0) - (parseDate(a.lastFailureAt || a.updatedAt)?.getTime() || 0))
        .slice(0, 3),
    [publications],
  );
  const latestDraft = sortedDocuments[0];
  const currentPublication = currentDocumentId ? publications.find((entry) => entry.documentId === currentDocumentId && entry.active !== false) || null : null;
  const currentRecord = currentDocumentId ? documents.find((entry) => entry.id === currentDocumentId) || null : null;

  useEffect(() => {
    if (!isMobile) {
      setMobileStudioScreen("editor");
      return;
    }

    if (!draft) {
      setMobileStudioScreen("home");
    }
  }, [draft, isMobile]);

  useEffect(() => {
    if (!isMobile || typeof window === "undefined" || typeof document === "undefined") {
      setHideMobileChrome(false);
      return;
    }

    const viewport = window.visualViewport;
    const updateChromeVisibility = () => {
      const hasEditingFocus = isMobileTextEditingTarget(document.activeElement);
      const viewportHeight = viewport?.height ?? window.innerHeight;
      const keyboardOpen = window.innerHeight - viewportHeight > 120;
      setHideMobileChrome(hasEditingFocus || keyboardOpen);
    };
    const handleFocusOut = () => window.setTimeout(updateChromeVisibility, 0);

    updateChromeVisibility();
    document.addEventListener("focusin", updateChromeVisibility);
    document.addEventListener("focusout", handleFocusOut);
    viewport?.addEventListener("resize", updateChromeVisibility);
    window.addEventListener("resize", updateChromeVisibility);

    return () => {
      document.removeEventListener("focusin", updateChromeVisibility);
      document.removeEventListener("focusout", handleFocusOut);
      viewport?.removeEventListener("resize", updateChromeVisibility);
      window.removeEventListener("resize", updateChromeVisibility);
    };
  }, [isMobile]);

  useEffect(() => {
    if (isMobile && activeTab === "issues") {
      setActiveTab("publish");
    }
  }, [activeTab, isMobile]);

  useEffect(() => {
    if (!isMobile) {
      setMobileInspectorOpen(false);
      setMobileInsertOpen(false);
      return;
    }

    if (activeTab !== "build") {
      setMobileInspectorOpen(false);
      setMobileInsertOpen(false);
      return;
    }

    if (selection.kind !== "node") {
      setMobileInspectorOpen(false);
    }
  }, [activeTab, isMobile, selection.kind]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const requestedId = Number(new URLSearchParams(search).get("documentId") || 0);
    if (!requestedId || documents.length === 0 || requestedId === currentDocumentId) return;
    const requested = documents.find((record) => record.id === requestedId);
    if (!requested) return;
    if (dirty && currentDocumentId && !window.confirm("Discard unsaved changes and open another Studio draft?")) {
      const url = new URL(window.location.href);
      if (currentDocumentId) {
        url.searchParams.set("documentId", String(currentDocumentId));
      } else {
        url.searchParams.delete("documentId");
      }
      window.history.replaceState({}, "", `${url.pathname}${url.search}`);
      return;
    }
    const entryView = getView(requested.document, requested.document.meta.entryViewId);
    const nextSelection: StudioSelection =
      entryView.embeds.length > 0 && !String(entryView.messageContent || "").trim() && entryView.rootNodeIds.length === 0
        ? { kind: "embed", embedIndex: 0 }
        : { kind: "message", region: "body" };
    setCurrentDocumentId(requested.id);
    setDraft(cloneDocument(requested.document));
    setDirty(false);
    setSelectedViewId(requested.document.meta.entryViewId);
    setSelection(nextSelection);
    setActiveTab("build");
    setMobileStudioScreen("editor");
  }, [currentDocumentId, dirty, documents, search]);

  useEffect(() => {
    if (!draft) {
      setServerPreflight(null);
      return;
    }

    const requestId = ++preflightRequestRef.current;
    const timer = window.setTimeout(async () => {
      try {
        const result = await preflightMutation.mutateAsync({
          documentId: currentDocumentId || undefined,
          document: draft,
          viewId: selectedViewId,
        });
        if (requestId === preflightRequestRef.current) {
          setServerPreflight(result);
        }
      } catch {
        if (requestId === preflightRequestRef.current) {
          setServerPreflight(null);
        }
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [draft, selectedViewId, currentDocumentId]);

  const localPlan = useMemo(() => (draft ? buildStudioPublishPlan(draft, selectedViewId) : null), [draft, selectedViewId]);
  const publishPlan = (serverPreflight?.publishPlan || localPlan) as StudioPublishPlan | null;
  const diagnostics = (publishPlan?.diagnostics || []) as StudioDiagnostic[];
  const interactionRows = useMemo(() => (draft ? collectInteractionRows(draft, selectedViewId) : []), [draft, selectedViewId]);
  const currentView = draft ? getView(draft, selectedViewId) : null;
  const errorCount = diagnostics.filter((entry) => entry.level === "error").length;
  const warningCount = diagnostics.filter((entry) => entry.level === "warning").length;
  const currentMode = (draft?.meta.mode || "standard") as StudioDraftMode;
  const previewMode: "mobile" | "desktop" | "compact" = isMobile ? "mobile" : currentMode === "layout_v2" ? "desktop" : "compact";
  const selectedLabel = draft ? getSelectionLabel(selection, draft, selectedViewId) : "Selection";
  const discordEmojis = discordContextQuery.data?.emojis || [];
  const assetUsage = useMemo(() => {
    if (!draft) return new Map<string, number>();
    return new Map(draft.assets.map((asset) => [asset.id, countAssetReferences(draft, asset.url)]));
  }, [draft]);
  const filteredAssets = useMemo(() => {
    if (!draft) return [] as StudioAsset[];
    const query = assetQuery.trim().toLowerCase();
    if (!query) return draft.assets;
    return draft.assets.filter((asset) => asset.name.toLowerCase().includes(query) || asset.url.toLowerCase().includes(query) || asset.type.toLowerCase().includes(query));
  }, [assetQuery, draft]);
  const selectedNode = draft && selection.kind === "node" ? draft.nodes[selection.nodeId] || null : null;
  const activeInsertTargetId = selectedNode && isInsertTargetNode(selectedNode.type) ? selectedNode.id : null;
  const activeInsertTargetType = activeInsertTargetId ? selectedNode?.type || null : null;
  const contextualInsertLabel = activeInsertTargetType === "section"
    ? "Adding into selected section"
    : activeInsertTargetType === "container"
      ? "Adding into selected container"
      : activeInsertTargetType === "action_row"
        ? "Adding into selected action row"
      : "Add parts";
  const assetSelectionHint =
    selection.kind === "embed"
      ? "Quick apply can place this asset into the selected embed image, thumbnail, author icon, or footer icon."
      : selectedNode?.type === "file"
        ? "Quick apply will attach the asset URL to the selected file block."
        : selectedNode?.type === "media_gallery"
          ? "Quick apply will add the asset into the selected gallery."
          : "Select an embed, file block, or gallery to unlock quick apply actions.";

  const syncRoute = (documentId: number | null) => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (documentId) url.searchParams.set("documentId", String(documentId));
    else url.searchParams.delete("documentId");
    window.history.replaceState({}, "", `${url.pathname}${url.search}`);
  };

  const select = (
    nextSelection: StudioSelection,
    options?: { nodeType?: StudioNode["type"] | null },
  ) => {
    setSelection(nextSelection);
    if (isMobile) {
      if (nextSelection.kind === "message") {
        setMobileStudioScreen("editor");
        setMobileInspectorOpen(false);
        return;
      }

      if (nextSelection.kind === "embed") {
        setMobileStudioScreen("editor");
        setMobileInspectorOpen(true);
        return;
      }

      const nextNodeType = options?.nodeType || draft?.nodes[nextSelection.nodeId]?.type || null;
      const dedicatedScreen = needsDedicatedMobileNodeScreen(nextNodeType);
      setMobileStudioScreen(dedicatedScreen ? "component" : "editor");
      setMobileInspectorOpen(!dedicatedScreen);
    }
  };

  const touchDraft = (updater: (document: StudioDocument) => void) => {
    setDraft((current) => {
      if (!current) return current;
      const next = cloneDocument(current);
      updater(next);
      return next;
    });
    setDirty(true);
  };

  const openInsertFlow = (parentId?: string | null) => {
    if (parentId && draft?.nodes[parentId]) {
      if (selection.kind !== "node" || selection.nodeId !== parentId) {
        select({ kind: "node", nodeId: parentId }, { nodeType: draft.nodes[parentId].type });
      }
    } else if (selection.kind !== "message") {
      select({ kind: "message", region: "body" });
    }

    if (isMobile) {
      setMobileInspectorOpen(false);
    }
    setMobileInsertOpen(true);
  };

  const moveNode = (nodeId: string, direction: -1 | 1) => {
    if (!draft) return;
    const currentNode = draft.nodes[nodeId];
    if (!currentNode) return;
    const currentSiblings =
      currentNode.parentId && draft.nodes[currentNode.parentId]
        ? draft.nodes[currentNode.parentId].childIds
        : draft.views[currentNode.viewId]?.rootNodeIds || [];
    const currentIndex = currentSiblings.indexOf(nodeId);
    if (currentIndex === -1) return;
    const nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= currentSiblings.length) return;

    let moved = false;
    touchDraft((document) => {
      moved = moveNodeInDocument(document, nodeId, direction);
    });
    if (!moved) return;
    select({ kind: "node", nodeId }, { nodeType: draft.nodes[nodeId]?.type || null });
  };

  const moveEmbed = (embedIndex: number, direction: -1 | 1) => {
    if (!currentView) return;
    const nextIndex = embedIndex + direction;
    if (nextIndex < 0 || nextIndex >= currentView.embeds.length) return;

    let moved = false;
    touchDraft((document) => {
      moved = moveEmbedInView(document, selectedViewId, embedIndex, direction);
    });
    if (!moved) return;

    select({
      kind: "embed",
      embedIndex: nextIndex,
      region: selection.kind === "embed" ? selection.region : "embed",
      fieldIndex: selection.kind === "embed" ? selection.fieldIndex : undefined,
    });
  };

  const beginRename = (record: StudioDocumentRecord) => {
    setRenameDocumentId(record.id);
    setRenameValue(record.name);
  };

  const saveDocumentName = async (recordId: number) => {
    const value = renameValue.trim();
    if (!value) {
      toast({ title: "Name required", description: "Give the draft or template a name before saving.", variant: "destructive" });
      return;
    }

    const record = documents.find((entry) => entry.id === recordId);
    if (!record) return;

    try {
      const nextDocument = cloneDocument(record.document);
      nextDocument.meta.name = value;

      await updateDocumentMutation.mutateAsync({
        id: recordId,
        data: {
          name: value,
          document: nextDocument,
        },
      });

      if (currentDocumentId === recordId) {
        setDraft(nextDocument);
      }

      setRenameDocumentId(null);
      setRenameValue("");
      toast({ title: "Saved", description: "Studio updated the name." });
    } catch (error: any) {
      toast({ title: "Rename failed", description: error?.message || "Studio could not save the new name.", variant: "destructive" });
    }
  };

  const createBlankTemplate = async () => {
    try {
      const document = createStudioPrimaryDocument("message", "Reusable Template");
      const created = await createDocumentMutation.mutateAsync({
        scope: "server",
        kind: "template",
        name: document.meta.name,
        document,
      });
      setDocumentManagerOpen(false);
      openDraftRecord(created, "editor");
      toast({ title: "Template ready", description: "The new template opened in Studio." });
    } catch (error: any) {
      toast({ title: "Template failed", description: error?.message || "Studio could not create the template.", variant: "destructive" });
    }
  };

  const saveAsTemplate = async () => {
    if (!draft) return;

    try {
      const template = cloneDocument(draft);
      template.meta.name = draft.meta.name.endsWith(" Template") ? draft.meta.name : `${draft.meta.name} Template`;
      const created = await createDocumentMutation.mutateAsync({
        scope: "server",
        kind: "template",
        name: template.meta.name,
        document: template,
      });
      setDocumentManagerOpen(false);
      openDraftRecord(created, "editor");
      toast({ title: "Saved as template", description: "This draft is now reusable from Studio templates." });
    } catch (error: any) {
      toast({ title: "Template save failed", description: error?.message || "Studio could not save this template.", variant: "destructive" });
    }
  };

  const deleteDocument = async (record: StudioDocumentRecord) => {
    const label = record.kind === "template" ? "template" : "draft";
    if (!window.confirm(`Delete ${record.name}? This ${label} will be removed from Studio.`)) return;

    try {
      await deleteDocumentMutation.mutateAsync(record.id);
      setDocumentManagerOpen(false);

      if (currentDocumentId === record.id) {
        const nextRecord = manageableDocuments.find((entry) => entry.id !== record.id) || null;
        if (nextRecord) openDraftRecord(nextRecord, "editor");
        else clearDraft();
      }

      if (renameDocumentId === record.id) {
        setRenameDocumentId(null);
        setRenameValue("");
      }

      toast({ title: "Removed", description: `${record.name} was deleted from Studio.` });
    } catch (error: any) {
      toast({ title: "Delete failed", description: error?.message || "Studio could not delete that document.", variant: "destructive" });
    }
  };

  const changeMessageContent = (value: string) => {
    touchDraft((document) => {
      document.views[selectedViewId].messageContent = value;
    });
  };

  const changeEmbed = (embedIndex: number, updater: (embed: StudioDocument["views"][string]["embeds"][number]) => void) => {
    touchDraft((document) => {
      const view = document.views[selectedViewId];
      while (view.embeds.length <= embedIndex) {
        view.embeds.push(createBlankEmbed());
      }
      const nextEmbed = { ...(view.embeds[embedIndex] || createBlankEmbed()) };
      nextEmbed.fields = Array.isArray(nextEmbed.fields) ? [...nextEmbed.fields] : [];
      view.embeds[embedIndex] = nextEmbed;
      updater(view.embeds[embedIndex]);
    });
  };

  const openDraftRecord = (record: StudioDocumentRecord, screen: MobileStudioScreen = "editor") => {
    const entryView = getView(record.document, record.document.meta.entryViewId);
    const nextSelection: StudioSelection =
      entryView.embeds.length > 0 && !String(entryView.messageContent || "").trim() && entryView.rootNodeIds.length === 0
        ? { kind: "embed", embedIndex: 0 }
        : { kind: "message", region: "body" };
    setCurrentDocumentId(record.id);
    setDraft(cloneDocument(record.document));
    setDirty(false);
    setSelectedViewId(record.document.meta.entryViewId);
    setSelection(nextSelection);
    setActiveTab("build");
    setPublishChannelId("");
    setUpdateMessageId("");
    setAllowDowngrade(false);
    setMobileInspectorOpen(false);
    setMobileInsertOpen(false);
    setMobileStudioScreen(screen);
    syncRoute(record.id);
  };

  const loadDraft = (documentId: number, screen: MobileStudioScreen = "editor") => {
    if (dirty && !window.confirm("Discard unsaved changes and open another draft?")) return;
    const record = documents.find((entry) => entry.id === documentId);
    if (!record) return;
    openDraftRecord(record, screen);
  };

  const clearDraft = () => {
    setCurrentDocumentId(null);
    setDraft(null);
    setDirty(false);
    setSelection({ kind: "message", region: "body" });
    setMobileInspectorOpen(false);
    setMobileInsertOpen(false);
    setDocumentManagerOpen(false);
    setActiveTab("build");
    syncRoute(null);
  };

  const createDraft = async (primaryType: "message" | "embed" | "components") => {
    const label = primaryType === "components" ? "Interactive Layout" : primaryType === "embed" ? "Embed" : "Message";
    setHomeStatusBanner({
      tone: "working",
      title: `Opening ${label} draft...`,
      description: "Studio is preparing the new live message workspace.",
    });
    try {
      const document = createStudioPrimaryDocument(primaryType);
      const created = await createDocumentMutation.mutateAsync({
        scope: "server",
        kind: "surface",
        name: document.meta.name,
        document,
      });
      setHomeStatusBanner(null);
      openDraftRecord(created, "editor");
      toast({ title: `${label} draft ready`, description: "Tap any visible part of the message to edit it." });
    } catch (error: any) {
      setHomeStatusBanner({
        tone: "error",
        title: "Could not create the draft",
        description: error?.message || "Studio hit an issue before the draft could open.",
      });
      toast({ title: "Create failed", description: error?.message || "Could not create the draft.", variant: "destructive" });
    }
  };

  const saveDraft = async () => {
    if (!draft || !currentDocumentId) return;
    await updateDocumentMutation.mutateAsync({
      id: currentDocumentId,
      data: {
        name: draft.meta.name,
        document: draft,
      },
    });
    setDirty(false);
  };

  const duplicateDraft = async () => {
    if (!draft) return;

    try {
      const duplicate = cloneDocument(draft);
      duplicate.meta.name = `${draft.meta.name} Copy`;
      const created = await createDocumentMutation.mutateAsync({
        scope: "server",
        kind: currentRecord?.kind || "surface",
        name: duplicate.meta.name,
        document: duplicate,
      });
      openDraftRecord(created, "editor");
      toast({ title: "Draft duplicated", description: "A copy is ready to edit or publish." });
    } catch (error: any) {
      toast({ title: "Duplicate failed", description: error?.message || "Could not duplicate this draft.", variant: "destructive" });
    }
  };

  const duplicateRecord = async (record: StudioDocumentRecord) => {
    try {
      const duplicate = cloneDocument(record.document);
      duplicate.meta.name = `${record.name} Copy`;
      const created = await createDocumentMutation.mutateAsync({
        scope: record.scope,
        kind: record.kind,
        name: duplicate.meta.name,
        document: duplicate,
      });
      setDocumentManagerOpen(false);
      openDraftRecord(created, "editor");
      toast({ title: record.kind === "template" ? "Template duplicated" : "Draft duplicated", description: "The copy is ready to edit." });
    } catch (error: any) {
      toast({ title: "Duplicate failed", description: error?.message || "Studio could not duplicate that item.", variant: "destructive" });
    }
  };

  const addEmbed = () => {
    let nextIndex = 0;
    touchDraft((document) => {
      const nextEmbeds = [...document.views[selectedViewId].embeds, createBlankEmbed()];
      nextIndex = nextEmbeds.length - 1;
      document.views[selectedViewId].embeds = nextEmbeds;
    });
    setMobileInsertOpen(false);
    select({ kind: "embed", embedIndex: nextIndex });
  };

  const appendButtonToRow = (document: StudioDocument, rowId: string) => {
    const row = document.nodes[rowId];
    if (!row || row.type !== "action_row") return null;
    const children = row.childIds.map((childId) => document.nodes[childId]).filter(Boolean);
    if (children.some((child) => child.type !== "button") || row.childIds.length >= 5) return null;
    const action = createDefaultAction(`Action ${row.childIds.length + 1}`);
    const buttonId = makeId("btn");
    document.actions[action.id] = action;
    document.nodes[buttonId] = {
      id: buttonId,
      type: "button",
      viewId: selectedViewId,
      parentId: rowId,
      childIds: [],
      actionId: action.id,
      props: {
        label: `Button ${row.childIds.length + 1}`,
        style: 1,
      },
    };
    row.childIds.push(buttonId);
    return buttonId;
  };

  const appendSelectToRow = (document: StudioDocument, rowId: string, kind: StudioSelectNodeKind = "string_select") => {
    const row = document.nodes[rowId];
    if (!row || row.type !== "action_row") return null;
    const children = row.childIds.map((childId) => document.nodes[childId]).filter(Boolean);
    if (children.length > 0) return null;
    const bundle = createNodeBundle(kind === "string_select" ? "select" : kind, selectedViewId);
    const selectNode = bundle.nodes.find((entry) => isStudioSelectNodeType(entry.type));
    bundle.actions.forEach((action) => {
      document.actions[action.id] = action;
    });
    bundle.nodes.forEach((entry) => {
      entry.parentId = rowId;
      document.nodes[entry.id] = entry;
    });
    const selectId = selectNode?.id;
    if (!selectId) return null;
    row.childIds.push(selectId);
    return selectId;
  };

  const addInteractivePart = (
    document: StudioDocument,
    kind: "button" | StudioSelectNodeKind,
    parentId: string | null,
  ) => {
    const targetNode = parentId ? document.nodes[parentId] : null;
    if (targetNode?.type === "action_row") {
      const directInsertId = kind === "button"
        ? appendButtonToRow(document, targetNode.id)
        : appendSelectToRow(document, targetNode.id, kind);
      if (directInsertId) return directInsertId;
      parentId = targetNode.parentId && document.nodes[targetNode.parentId] ? targetNode.parentId : null;
    }

    const bundle = createNodeBundle(
      kind === "button"
        ? "button_row"
        : kind === "string_select"
          ? "select_menu"
          : kind,
      selectedViewId,
    );
    appendBundleToDocument(document, selectedViewId, bundle, parentId);
    return bundle.nodes.find((entry: StudioNode) => entry.type === "button" || isStudioSelectNodeType(entry.type))?.id || bundle.nodes[0]?.id || null;
  };

  const deleteEmbed = (embedIndex: number) => {
    touchDraft((document) => {
      document.views[selectedViewId].embeds = document.views[selectedViewId].embeds.filter((_, index) => index !== embedIndex);
    });
    select({ kind: "message", region: "body" });
  };

  const addPart = (
    kind: StudioInsertKind,
    parentIdOverride?: string | null,
  ) => {
    let nextSelection: StudioSelection = { kind: "message", region: "body" };
    let nextNodeType: StudioNode["type"] | null = null;
    touchDraft((document) => {
      const parentId = typeof parentIdOverride !== "undefined"
        ? parentIdOverride
        : selection.kind === "node" && isInsertTargetNode(document.nodes[selection.nodeId]?.type || null)
          ? selection.nodeId
          : null;
      if (kind === "button" || kind === "select" || isStudioSelectNodeType(kind)) {
        const interactiveNodeId = addInteractivePart(document, kind === "select" ? "string_select" : kind, parentId);
        nextSelection = interactiveNodeId ? { kind: "node", nodeId: interactiveNodeId } : { kind: "message", region: "body" };
        nextNodeType = interactiveNodeId ? document.nodes[interactiveNodeId]?.type || null : null;
        return;
      }
      const bundle = createNodeBundle(kind, selectedViewId);
      appendBundleToDocument(document, selectedViewId, bundle, parentId);
      const firstId = bundle.nodes[0]?.id;
      if ((kind === "button_row" || kind === "select_menu") && firstId) {
        const interactiveNode = bundle.nodes.find((entry: StudioNode) => entry.type === "button" || isStudioSelectNodeType(entry.type));
        nextSelection = interactiveNode ? { kind: "node", nodeId: interactiveNode.id } : { kind: "node", nodeId: firstId };
        nextNodeType = interactiveNode?.type || document.nodes[firstId]?.type || null;
      } else if (firstId) {
        nextSelection = { kind: "node", nodeId: firstId };
        nextNodeType = document.nodes[firstId]?.type || null;
      }
    });
    setMobileInsertOpen(false);
    select(nextSelection, { nodeType: nextNodeType });
  };

  const deleteNode = (nodeId: string) => {
    touchDraft((document) => {
      removeNodeBranch(document, nodeId);
    });
    select({ kind: "message", region: "body" });
  };

  const jumpToDiagnostic = (path?: string) => {
    if (!draft) return;
    const nextSelection = selectionFromPath(draft, path);
    setActiveTab("build");
    if (nextSelection) select(nextSelection);
  };

  const handleUploadAsset = async (file: File) => {
    const dataUrl = await readFileAsDataUrl(file);
    const result = await uploadStudioAssetMutation.mutateAsync({
      name: file.name,
      dataUrl,
      scope: "server",
    });
    touchDraft((document) => {
      const nextAsset: StudioAsset = {
        id: makeId("asset"),
        name: result.name,
        type: file.type.startsWith("image/") ? "image" : "file",
        url: result.url,
      };
      document.assets = [...document.assets, nextAsset];
      if (selection.kind === "embed" && !document.views[selectedViewId].embeds[selection.embedIndex].imageUrl && nextAsset.type === "image") {
        document.views[selectedViewId].embeds[selection.embedIndex].imageUrl = nextAsset.url;
      }
    });
    toast({ title: "Asset added", description: "The uploaded asset is now available in this draft." });
  };

  const copyAssetUrl = async (asset: StudioAsset) => {
    await navigator.clipboard.writeText(asset.url);
    toast({ title: "Copied", description: `${asset.name} URL copied to clipboard.` });
  };

  const applyAssetToSelection = (
    asset: StudioAsset,
    target: "embed_image" | "embed_thumbnail" | "author_icon" | "footer_icon" | "file_url" | "gallery_item",
  ) => {
    let applied = false;

    touchDraft((document) => {
      if (target === "embed_image" && selection.kind === "embed") {
        document.views[selectedViewId].embeds[selection.embedIndex].imageUrl = asset.url;
        applied = true;
        return;
      }
      if (target === "embed_thumbnail" && selection.kind === "embed") {
        document.views[selectedViewId].embeds[selection.embedIndex].thumbnailUrl = asset.url;
        applied = true;
        return;
      }
      if (target === "author_icon" && selection.kind === "embed") {
        document.views[selectedViewId].embeds[selection.embedIndex].authorIconUrl = asset.url;
        applied = true;
        return;
      }
      if (target === "footer_icon" && selection.kind === "embed") {
        document.views[selectedViewId].embeds[selection.embedIndex].footerIconUrl = asset.url;
        applied = true;
        return;
      }
      if (target === "file_url" && selection.kind === "node") {
        const node = document.nodes[selection.nodeId];
        if (node?.type === "file") {
          node.props.url = asset.url;
          node.props.label = String(node.props.label || asset.name);
          applied = true;
        }
        return;
      }
      if (target === "gallery_item" && selection.kind === "node") {
        const node = document.nodes[selection.nodeId];
        if (node?.type === "media_gallery") {
          const items = Array.isArray(node.props.items) ? [...node.props.items] : [];
          items.push({ url: asset.url, description: asset.name });
          node.props.items = items;
          applied = true;
        }
      }
    });

    if (!applied) {
      toast({ title: "No target selected", description: "Pick an embed, file block, or gallery first.", variant: "destructive" });
      return;
    }

    if (target === "embed_image") select({ kind: "embed", embedIndex: selection.kind === "embed" ? selection.embedIndex : 0, region: "image" });
    if (target === "embed_thumbnail") select({ kind: "embed", embedIndex: selection.kind === "embed" ? selection.embedIndex : 0, region: "thumbnail" });
    if (target === "author_icon") select({ kind: "embed", embedIndex: selection.kind === "embed" ? selection.embedIndex : 0, region: "author" });
    if (target === "footer_icon") select({ kind: "embed", embedIndex: selection.kind === "embed" ? selection.embedIndex : 0, region: "footer" });

    toast({ title: "Asset applied", description: `${asset.name} is now attached to the current selection.` });
  };

  const removeAssetFromDraft = (asset: StudioAsset) => {
    if ((assetUsage.get(asset.id) || 0) > 0) {
      toast({ title: "Asset still in use", description: "Remove it from embeds or blocks before deleting it from the asset tray.", variant: "destructive" });
      return;
    }

    touchDraft((document) => {
      document.assets = document.assets.filter((entry) => entry.id !== asset.id);
    });
    toast({ title: "Asset removed", description: `${asset.name} was removed from this draft.` });
  };

  const publishDraft = async () => {
    if (!draft || !publishPlan) return;
    if (publishPlan.publishPath === "blocked") {
      toast({ title: "Publish blocked", description: "Fix the fatal issues before publishing.", variant: "destructive" });
      return;
    }
    if (!publishChannelId) {
      toast({ title: "Channel required", description: "Choose the channel that should receive this message.", variant: "destructive" });
      return;
    }
    if (publishPlan.requiresSimplifiedConfirmation && !allowDowngrade) {
      toast({ title: "Confirmation required", description: "This draft publishes in a downgraded form. Confirm that first.", variant: "destructive" });
      return;
    }

    try {
      await saveDraft();
      await publishMutation.mutateAsync({
        documentId: currentDocumentId || undefined,
        document: draft,
        allowDowngrade,
        target: {
          channelId: publishChannelId,
          messageId: updateMessageId || undefined,
          viewId: selectedViewId,
        },
      });
      toast({ title: "Publish complete", description: updateMessageId ? "The live message was updated." : "The message was published." });
    } catch (error: any) {
      toast({ title: "Publish failed", description: error?.message || "Studio could not publish this draft.", variant: "destructive" });
    }
  };

  if (!draft) {
    return (
      <StudioV2EmptyState
        latestDraft={latestDraft}
        draftsNeedingAttention={draftsNeedingAttention}
        recentPublishFailures={recentPublishFailures}
        isLoading={documentsQuery.isLoading}
        isWorking={createDocumentMutation.isPending}
        statusBanner={homeStatusBanner}
        onCreateMessage={() => createDraft("message")}
        onCreateEmbed={() => createDraft("embed")}
        onCreateComponents={() => createDraft("components")}
        onOpenDraft={loadDraft}
        entryIntent={entryIntent}
      />
    );
  }

  const buildPreview = (
    <StudioPreview
      document={draft}
      viewId={selectedViewId}
      interactionRows={interactionRows}
      diagnostics={diagnostics}
      mode={previewMode}
      publishPlan={publishPlan}
      surface="editor"
      onEditMessage={() => select({ kind: "message", region: "body" })}
      onChangeMessage={changeMessageContent}
      onEditEmbed={(embedIndex, region, fieldIndex) =>
        select({
          kind: "embed",
          embedIndex,
          region: region || "embed",
          fieldIndex: fieldIndex ?? null,
        })
      }
      onChangeEmbed={changeEmbed}
      onDeleteEmbed={deleteEmbed}
      onEditNode={(nodeId) => select({ kind: "node", nodeId })}
      onOpenInsertRoot={() => openInsertFlow(null)}
      onOpenInsertNode={(parentId) => openInsertFlow(parentId)}
      selectedMessage={selection.kind === "message"}
      selectedMessageRegion={selection.kind === "message" ? selection.region ?? "body" : null}
      selectedEmbedIndex={selection.kind === "embed" ? selection.embedIndex : null}
      selectedEmbedRegion={selection.kind === "embed" ? selection.region ?? "embed" : null}
      selectedEmbedFieldIndex={selection.kind === "embed" ? selection.fieldIndex ?? null : null}
      selectedNodeId={selection.kind === "node" ? selection.nodeId : null}
      discordEmojis={discordEmojis}
    />
  );

  const selectionPanelTitle = selection.kind === "node" ? "Component controls" : selection.kind === "embed" ? "Embed inspector" : "Message controls";
  const selectionPanelDescription = selection.kind === "node"
    ? "Only the controls for the selected block stay visible here."
    : selection.kind === "embed"
      ? "Keep the live canvas visual while this inspector handles embed structure, fields, media, and footer details."
      : "The live message is the editor. Use this panel only when you need deeper settings.";
  const selectedEmbed = selection.kind === "embed" ? currentView?.embeds[selection.embedIndex] || null : null;
  const selectedEmbedIndex = selection.kind === "embed" ? selection.embedIndex : -1;
  const selectedEmbedRegion = selection.kind === "embed" ? selection.region ?? "embed" : null;
  const selectedEmbedCount = currentView?.embeds.length || 0;
  const canMoveSelectedEmbedUp = selectedEmbedIndex > 0;
  const canMoveSelectedEmbedDown = selectedEmbedIndex > -1 && selectedEmbedIndex < selectedEmbedCount - 1;
  const selectedNodeSiblings = selectedNode
    ? selectedNode.parentId && draft.nodes[selectedNode.parentId]
      ? draft.nodes[selectedNode.parentId].childIds
      : currentView?.rootNodeIds || []
    : [];
  const selectedNodeIndex = selectedNode ? selectedNodeSiblings.indexOf(selectedNode.id) : -1;
  const canMoveSelectedNodeUp = selectedNodeIndex > 0;
  const canMoveSelectedNodeDown = selectedNodeIndex > -1 && selectedNodeIndex < selectedNodeSiblings.length - 1;
  const selectedNodeSupportsInlineInspector = Boolean(selectedNode && !needsDedicatedMobileNodeScreen(selectedNode.type));
  const openSelectedEmbedInspector = () => {
    if (!selectedEmbed) return;
    setMobileStudioScreen("editor");
    setMobileInspectorOpen(true);
  };
  const openSelectedNodeEditor = () => {
    if (!selectedNode) return;
    if (needsDedicatedMobileNodeScreen(selectedNode.type)) {
      setMobileStudioScreen("component");
      setMobileInspectorOpen(false);
      return;
    }
    setMobileStudioScreen("editor");
    setMobileInspectorOpen(true);
  };
  const closeMobileInspector = () => {
    setMobileInspectorOpen(false);
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };
  const closeMobileInsert = () => {
    setMobileInsertOpen(false);
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  const selectionContextPanel = selectedNode ? (
    <div className="rounded-[20px] border border-white/8 bg-[linear-gradient(180deg,rgba(13,14,17,0.98),rgba(7,8,9,1))] px-4 py-4 shadow-[0_18px_44px_rgba(0,0,0,0.26)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/34">{getNodeOutlineEyebrow(selectedNode)}</p>
          <p className="mt-2 text-base font-semibold text-white">{getNodeOutlineTitle(selectedNode)}</p>
          <p className="mt-1 text-sm leading-6 text-white/52">{getNodeOutlineDescription(selectedNode)}</p>
        </div>
        <Badge variant="outline">{selectedLabel}</Badge>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full border-white/10 bg-white/[0.03]"
          onClick={() => moveNode(selectedNode.id, -1)}
          disabled={!canMoveSelectedNodeUp}
        >
          <ArrowUp className="h-4 w-4" />
          Move up
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full border-white/10 bg-white/[0.03]"
          onClick={() => moveNode(selectedNode.id, 1)}
          disabled={!canMoveSelectedNodeDown}
        >
          <ArrowDown className="h-4 w-4" />
          Move down
        </Button>
        {isInsertTargetNode(selectedNode.type) ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full border-white/10 bg-white/[0.03]"
            onClick={() => openInsertFlow(selectedNode.id)}
          >
            <Plus className="h-4 w-4" />
            Insert inside
          </Button>
        ) : null}
      </div>
    </div>
  ) : selectedEmbed ? (
    <div className="rounded-[20px] border border-white/8 bg-[linear-gradient(180deg,rgba(13,14,17,0.98),rgba(7,8,9,1))] px-4 py-4 shadow-[0_18px_44px_rgba(0,0,0,0.26)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/34">Embed surface</p>
          <p className="mt-2 text-base font-semibold text-white">
            {summarizeStudioCopy(String(selectedEmbed.title || selectedEmbed.description || ""), `Embed ${selectedEmbedIndex + 1}`)}
          </p>
          <p className="mt-1 text-sm leading-6 text-white/52">
            {(selectedEmbed.fields?.length || 0) > 0 || selectedEmbed.imageUrl || selectedEmbed.thumbnailUrl
              ? `${selectedEmbed.fields?.length || 0} field${(selectedEmbed.fields?.length || 0) === 1 ? "" : "s"}${selectedEmbed.imageUrl || selectedEmbed.thumbnailUrl ? " / media attached" : ""}`
              : "Start with content, then add media or fields only when the embed needs stronger structure."}
          </p>
        </div>
        <Badge variant="outline">{selectedLabel}</Badge>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full border-white/10 bg-white/[0.03]"
          onClick={() => moveEmbed(selectedEmbedIndex, -1)}
          disabled={!canMoveSelectedEmbedUp}
        >
          <ArrowUp className="h-4 w-4" />
          Move up
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full border-white/10 bg-white/[0.03]"
          onClick={() => moveEmbed(selectedEmbedIndex, 1)}
          disabled={!canMoveSelectedEmbedDown}
        >
          <ArrowDown className="h-4 w-4" />
          Move down
        </Button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {[
          {
            id: "content",
            label: "Content",
            active: !selectedEmbedRegion || selectedEmbedRegion === "embed" || selectedEmbedRegion === "title" || selectedEmbedRegion === "description" || selectedEmbedRegion === "color",
            onSelect: () => select({ kind: "embed", embedIndex: selectedEmbedIndex, region: "embed" }),
          },
          {
            id: "author",
            label: "Author",
            active: selectedEmbedRegion === "author",
            onSelect: () => select({ kind: "embed", embedIndex: selectedEmbedIndex, region: "author" }),
          },
          {
            id: "media",
            label: "Media",
            active: selectedEmbedRegion === "image" || selectedEmbedRegion === "thumbnail",
            onSelect: () => select({ kind: "embed", embedIndex: selectedEmbedIndex, region: selectedEmbed.imageUrl ? "image" : selectedEmbed.thumbnailUrl ? "thumbnail" : "image" }),
          },
          {
            id: "fields",
            label: "Fields",
            active: selectedEmbedRegion === "fields" || selectedEmbedRegion === "field_name" || selectedEmbedRegion === "field_value",
            onSelect: () => select({ kind: "embed", embedIndex: selectedEmbedIndex, region: "fields" }),
          },
          {
            id: "footer",
            label: "Footer",
            active: selectedEmbedRegion === "footer",
            onSelect: () => select({ kind: "embed", embedIndex: selectedEmbedIndex, region: "footer" }),
          },
        ].map((action) => (
          <Button
            key={action.id}
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              "rounded-full border-white/10 bg-white/[0.03]",
              action.active ? "border-[rgba(168,41,63,0.24)] bg-[linear-gradient(180deg,rgba(23,14,16,0.98),rgba(10,10,11,1))] text-white" : "text-white/72",
            )}
            onClick={action.onSelect}
          >
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  ) : null;

  const selectionPanelContent = (
    <div className="space-y-4">
      {selectionContextPanel}
      <BuildSelectionEditor
        draft={draft}
        selectedViewId={selectedViewId}
        selection={selection}
        isMobile={isMobile}
        roleOptions={(discordContextQuery.data?.roles || []).map((role: any) => ({ id: String(role.id), name: String(role.name || role.id) }))}
        channelOptions={(discordContextQuery.data?.channels || []).map((channel: any) => ({ id: String(channel.id), name: String(channel.name || channel.id) }))}
        onChangeDraft={touchDraft}
        onDeleteEmbed={deleteEmbed}
        onDeleteNode={deleteNode}
        onMoveNode={moveNode}
        onAddEmbed={addEmbed}
        onSwitchEmbed={(i) => select({ kind: "embed", embedIndex: i })}
      />
    </div>
  );

  const selectionPanel = (
    <Card className="archivist-panel archivist-panel-muted">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-xl text-white">{selectionPanelTitle}</CardTitle>
            <CardDescription>{selectionPanelDescription}</CardDescription>
          </div>
          <Badge variant="outline">{selectedLabel}</Badge>
        </div>
      </CardHeader>
      <CardContent>{selectionPanelContent}</CardContent>
    </Card>
  );

  const mobileComponentScreen = isMobile ? (
    <div className="space-y-4">
      <Card className="archivist-panel archivist-panel-muted border-white/10 bg-[#090a0d]/96">
        <CardContent className="space-y-4 p-4">
          <div className="flex items-start gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-full text-white/76 hover:bg-white/10 hover:text-white"
              onClick={() => {
                setMobileStudioScreen("editor");
                setMobileInspectorOpen(false);
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/34">Component editor</p>
              <p className="mt-2 truncate text-base font-semibold text-white">{selectedLabel}</p>
              <p className="mt-1 text-sm text-white/54">{selectionPanelDescription}</p>
            </div>
          </div>
          <div className="rounded-[18px] border border-white/8 bg-[#0b0d10] px-3 py-3 text-sm text-white/62">
            Buttons, menus, and selectors now open in a dedicated mobile editor screen instead of a trapping drawer.
          </div>
        </CardContent>
      </Card>
      <div className="space-y-4">{selectionPanelContent}</div>
    </div>
  ) : null;

  const handleMobileBack = () => {
    if (isMobile && mobileStudioScreen === "component") {
      setMobileStudioScreen("editor");
      setMobileInspectorOpen(false);
      return;
    }
    if (dirty && !window.confirm("Discard unsaved changes and leave this draft?")) return;
    clearDraft();
  };

  const mobileEditTargets: Array<{ id: string; label: string; action: () => void; active: boolean }> = currentView
    ? [
        {
          id: "message",
          label: "Message",
          action: () => select({ kind: "message", region: "body" }),
          active: selection.kind === "message",
        },
        ...currentView.embeds.map((_, index) => ({
          id: `embed-${index}`,
          label: `Embed ${index + 1}`,
          action: () => select({ kind: "embed", embedIndex: index, region: "embed" }),
          active: selection.kind === "embed" && selection.embedIndex === index,
        })),
      ]
    : [];

  const insertGroups: StudioInsertGroup[] = [
    {
      id: "surface",
      title: "Surface layers",
      description: "Start with the visible message surface before you add richer interaction.",
      options: [
        {
          id: "insert-text",
          label: "Text block",
          description: "Add a clean copy block for the core message or a supporting paragraph.",
          eyebrow: "Copy",
          icon: "text",
          onSelect: () => addPart("text"),
        },
        {
          id: "insert-embed",
          label: "Embed surface",
          description: "Add a richer visual layer with title, description, image, fields, and footer.",
          eyebrow: "Rich",
          icon: "embed",
          onSelect: addEmbed,
        },
        {
          id: "insert-divider",
          label: "Divider",
          description: "Break the message into calmer beats without adding heavy chrome.",
          eyebrow: "Spacing",
          icon: "divider",
          onSelect: () => addPart("divider"),
        },
        {
          id: "insert-notice",
          label: "Notice block",
          description: "Drop in an emphasized callout for warnings, reminders, or key guidance.",
          eyebrow: "Callout",
          icon: "notice",
          onSelect: () => addPart("notice"),
        },
      ],
    },
    {
      id: "interactive",
      title: "Interactive blocks",
      description: "Actions live as blocks too, so the message and interaction model stay in one flow.",
      options: [
        {
          id: "insert-button",
          label: "Button",
          description: "Add a primary action without manually wiring a separate desktop-shaped row first.",
          eyebrow: "Action",
          icon: "button",
          onSelect: () => addPart("button"),
        },
        {
          id: "insert-menu",
          label: "Select menu",
          description: "Let members choose a path, option, or next action directly in the message.",
          eyebrow: "Choice",
          icon: "menu",
          onSelect: () => addPart("select"),
        },
        {
          id: "insert-role",
          label: "Role selector",
          description: "Build role-aware pickers when Discord roles are the real interaction surface.",
          eyebrow: "Role-aware",
          icon: "role",
          onSelect: () => addPart("role_select"),
        },
        {
          id: "insert-channel",
          label: "Channel selector",
          description: "Route members into the right destination when the next step depends on a channel choice.",
          eyebrow: "Routing",
          icon: "channel",
          onSelect: () => addPart("channel_select"),
        },
        {
          id: "insert-user",
          label: "User selector",
          description: "Use a member picker when the action needs a person before it can continue.",
          eyebrow: "People",
          icon: "role",
          onSelect: () => addPart("user_select"),
        },
        {
          id: "insert-mention",
          label: "Mention selector",
          description: "Pick the next mentionable target without leaving the Studio flow.",
          eyebrow: "Flexible",
          icon: "mention",
          onSelect: () => addPart("mentionable_select"),
        },
      ],
    },
    {
      id: "structure",
      title: "Layout and assets",
      description: "Use structure only where it improves clarity, not as default chrome.",
      options: [
        {
          id: "insert-section",
          label: "Section",
          description: "Create a grouped layout area for content that needs a clear parent container.",
          eyebrow: "Layout",
          icon: "layout",
          onSelect: () => addPart("section"),
          disabled: currentMode !== "layout_v2",
        },
        {
          id: "insert-button-row",
          label: "Button group",
          description: "Start a dedicated interaction row when the message needs more than one action.",
          eyebrow: "Layout",
          icon: "layout",
          onSelect: () => addPart("button_row"),
        },
        {
          id: "insert-gallery",
          label: "Gallery",
          description: "Place multiple visuals together when the message needs a stronger media surface.",
          eyebrow: "Media",
          icon: "asset",
          onSelect: () => addPart("gallery"),
        },
        {
          id: "insert-file",
          label: "File block",
          description: "Attach a file or download surface directly inside the message structure.",
          eyebrow: "Asset",
          icon: "file",
          onSelect: () => addPart("file"),
        },
      ],
    },
  ];

  const compositionGroups: StudioCompositionGroup[] = currentView
    ? [
        {
          id: "message",
          title: "Message",
          description: "The top-level message body anchors the whole surface.",
          items: [
            {
              id: "composition-message",
              eyebrow: "Message",
              title: summarizeStudioCopy(String(currentView.messageContent || ""), "Message body"),
              description: String(currentView.messageContent || "").trim()
                ? "Core message copy that members read before embeds or interactions."
                : "No body text yet. Leave it empty only if the embed or interaction surface carries the whole message.",
              meta: String(currentView.messageContent || "").trim() ? `${String(currentView.messageContent || "").length} chars` : "Empty",
              icon: "message",
              selected: selection.kind === "message",
              onSelect: () => select({ kind: "message", region: "body" }),
            },
          ],
        },
        {
          id: "embeds",
          title: "Embeds",
          description: "Embeds add richer hierarchy, images, and structured detail.",
          emptyLabel: "No embeds yet. Add one when the message needs stronger visual structure.",
          items: currentView.embeds.map((embed, index) => {
            const fieldCount = Array.isArray(embed.fields) ? embed.fields.length : 0;
            const mediaCount = [embed.imageUrl, embed.thumbnailUrl].filter(Boolean).length;
            return {
              id: `composition-embed-${index}`,
              eyebrow: `Embed ${index + 1}`,
              title: summarizeStudioCopy(String(embed.title || embed.description || ""), `Embed ${index + 1}`),
              description: fieldCount > 0 || mediaCount > 0
                ? `${fieldCount > 0 ? `${fieldCount} field${fieldCount === 1 ? "" : "s"}` : "No fields yet"}${mediaCount > 0 ? ` / ${mediaCount} media slot${mediaCount === 1 ? "" : "s"}` : ""}`
                : "No structured details yet. Start with headline, description, or media.",
              meta: embed.color || "#B11226",
              icon: "embed",
              selected: selection.kind === "embed" && selection.embedIndex === index,
              onSelect: () => select({ kind: "embed", embedIndex: index, region: "embed" }),
            };
          }),
        },
        {
          id: "blocks",
          title: "Blocks",
          description: "Everything interactive or structural lives here as clear message blocks.",
          emptyLabel: "No blocks yet. Add text, structure, or interaction when the message needs more than copy and embeds.",
          items: currentView.rootNodeIds
            .map((nodeId) => draft.nodes[nodeId])
            .filter((node): node is StudioNode => Boolean(node))
            .map((node) => ({
              id: `composition-node-${node.id}`,
              eyebrow: getNodeOutlineEyebrow(node),
              title: getNodeOutlineTitle(node),
              description: getNodeOutlineDescription(node),
              meta: node.childIds.length > 0 ? `${node.childIds.length} child${node.childIds.length === 1 ? "" : "ren"}` : undefined,
              icon: getNodeOutlineIcon(node),
              selected: selection.kind === "node" ? nodeContainsSelection(draft, node.id, selection.nodeId) : false,
              onSelect: () => select({ kind: "node", nodeId: node.id }),
            })),
        },
      ]
    : [];

  const compositionPanel = (
    <StudioCompositionOutline
      title={currentMode === "layout_v2" ? "Message + blocks" : "Message structure"}
      description={
        currentMode === "layout_v2"
          ? "The message body, embeds, and interaction blocks all live in one composition map so it is obvious what you are building."
          : "Start with the message, add richer surfaces only when needed, and keep the whole composition legible on mobile."
      }
      groups={compositionGroups}
      actions={
        <>
          {activeInsertTargetId ? <Badge variant="outline">Child target active</Badge> : null}
          {isMobile ? (
            <Button variant="outline" className="rounded-[16px] border-white/10 bg-white/[0.03]" onClick={() => openInsertFlow(activeInsertTargetId)}>
              <Plus className="h-4 w-4" />
              Add block
            </Button>
          ) : null}
        </>
      }
    />
  );

  const builderStatusStrip = (
    <StudioBuilderStatusStrip
      modeLabel={draftModeLabel(currentMode)}
      selectedLabel={selectedLabel}
      publishLabel={publishPlan?.label || "Publish ready"}
      publishPath={publishPlan?.publishPath || null}
      errorCount={errorCount}
      warningCount={warningCount}
      onOpenIssues={() => setActiveTab("issues")}
      onOpenPublish={() => setActiveTab("publish")}
    />
  );

  const addPartPanel = (
    <Card className="archivist-panel archivist-panel-muted border-white/10 bg-[#090a0d]/96">
      <CardContent className="p-4">
        <StudioInsertCatalog
          title={currentMode === "layout_v2" ? contextualInsertLabel : "Add the next part"}
          description={
            currentMode === "layout_v2"
              ? activeInsertTargetId
                ? "The selected layout block is the current insertion target, so new parts will land inside it."
                : "Choose the next block by what it does: visible copy, richer surface, interaction, or structural layout."
              : "Choose the next visible part of the message. Studio keeps the preview and the publish reality attached while you build."
          }
          groups={insertGroups}
        />
      </CardContent>
    </Card>
  );

  const documentManagerContent = (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <Button onClick={createBlankTemplate} className="rounded-[18px]">
          <Plus className="h-4 w-4" />
          New template
        </Button>
        {draft ? (
          <Button variant="outline" onClick={saveAsTemplate} className="rounded-[18px]">
            <Copy className="h-4 w-4" />
            Save current as template
          </Button>
        ) : null}
      </div>

      <ScrollArea className="max-h-[68vh] pr-1">
        <div className="space-y-5">
          {[
            {
              key: "drafts",
              title: "Working drafts",
              description: "Switch between active Studio drafts and reopen them quickly.",
              records: sortedDocuments,
            },
            {
              key: "templates",
              title: "Templates",
              description: "Reusable layouts you can open, rename, duplicate, or remove.",
              records: templateDocuments,
            },
          ].map((section) => (
            <div key={section.key} className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-white">{section.title}</p>
                <p className="mt-1 text-sm text-white/52">{section.description}</p>
              </div>
              {section.records.length === 0 ? (
                <div className="rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-white/48">
                  {section.key === "templates" ? "No templates yet. Save one from the current draft." : "No drafts yet. Create a message, embed, or interactive layout to get started."}
                </div>
              ) : (
                <div className="space-y-3">
                  {section.records.map((record) => {
                    const isActive = currentDocumentId === record.id;
                    const isRenaming = renameDocumentId === record.id;
                    const published = activePublicationDocumentIds.has(record.id);

                    return (
                      <div key={record.id} className={cn("rounded-[18px] border px-4 py-4", isActive ? "border-[rgba(168,41,63,0.22)] bg-[linear-gradient(180deg,rgba(18,13,15,0.98),rgba(11,10,11,1))]" : "border-white/10 bg-white/[0.03]")}>
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <button
                            type="button"
                            onClick={() => {
                              if (dirty && currentDocumentId !== record.id && !window.confirm("Discard unsaved changes and open another draft?")) return;
                              setDocumentManagerOpen(false);
                              openDraftRecord(record, "editor");
                            }}
                            className="min-w-0 text-left"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-semibold text-white">{record.name}</p>
                              {isActive ? <Badge variant="secondary">Active</Badge> : null}
                              {record.kind === "template" ? <Badge variant="outline">Template</Badge> : null}
                              {published ? <Badge variant="outline">Published</Badge> : null}
                            </div>
                            <p className="mt-1 text-xs text-white/48">Updated {formatRelativeEditTime(record.updatedAt)}</p>
                          </button>

                          <div className="flex flex-wrap gap-2">
                            <Button variant="outline" size="sm" className="rounded-[14px]" onClick={() => beginRename(record)}>
                              Rename
                            </Button>
                            <Button variant="outline" size="sm" className="rounded-[14px]" onClick={() => duplicateRecord(record)}>
                              Duplicate
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="rounded-[14px] text-red-300 hover:bg-red-500/10 hover:text-red-200"
                              onClick={() => deleteDocument(record)}
                              disabled={deleteDocumentMutation.isPending && currentDocumentId === record.id}
                            >
                              <Trash2 className="mr-1 h-4 w-4" />
                              Delete
                            </Button>
                          </div>
                        </div>

                        {isRenaming ? (
                          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                            <Input
                              value={renameValue}
                              onChange={(event) => setRenameValue(event.target.value)}
                              placeholder="Template name"
                              className="rounded-[14px]"
                            />
                            <div className="flex gap-2">
                              <Button size="sm" className="rounded-[14px]" onClick={() => saveDocumentName(record.id)}>Save</Button>
                              <Button size="sm" variant="outline" className="rounded-[14px]" onClick={() => {
                                setRenameDocumentId(null);
                                setRenameValue("");
                              }}>Cancel</Button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <div className={cn("space-y-4", isMobile ? "pb-[calc(env(safe-area-inset-bottom)+5rem)]" : "")}>
      <Card className="sticky top-0 z-20 overflow-hidden border-white/10 bg-[#060709]/95 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur">
        <CardContent className="flex items-center gap-3 p-3">
          <Button variant="ghost" size="icon" onClick={() => (draft ? handleMobileBack() : onOpenServerSettings?.())}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{draft.meta.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {dirty ? "Unsaved editing state" : "Saved editing state"} · {draftModeLabel(currentMode)}
            </p>
          </div>
          <Badge variant={errorCount > 0 ? "destructive" : warningCount > 0 ? "secondary" : "outline"}>
            {errorCount > 0 ? "Blocked" : warningCount > 0 ? "Review" : "Ready"}
          </Badge>
          <Button variant="outline" size={isMobile ? "icon" : "default"} onClick={() => setDocumentManagerOpen(true)} className="rounded-[16px]">
            <Layers3 className="h-4 w-4" />
            {!isMobile ? <span>Templates</span> : null}
          </Button>
          {isMobile ? (
            <>
              <Button variant="outline" size="icon" onClick={saveDraft} disabled={!dirty || updateDocumentMutation.isPending} className="rounded-[16px]">
                <Save className="h-4 w-4" />
              </Button>
              <Button size="icon" onClick={() => setActiveTab("publish")} className="rounded-[16px]">
                <Rocket className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={saveAsTemplate}>
                <Copy className="h-4 w-4" />
                Save as Template
              </Button>
              <Button variant="outline" onClick={saveDraft} disabled={!dirty || updateDocumentMutation.isPending}>
                <Save className="h-4 w-4" />
                Save
              </Button>
              <Button onClick={() => setActiveTab("publish")}>
                <Rocket className="h-4 w-4" />
                Publish
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {!isMobile ? (
        <div className="grid gap-2 sm:grid-cols-4">
          <StudioTabButton tab="build" activeTab={activeTab} onSelect={setActiveTab} icon={MessageSquareText} label="Build" />
          <StudioTabButton tab="assets" activeTab={activeTab} onSelect={setActiveTab} icon={ImageIcon} label="Assets" />
          <StudioTabButton tab="issues" activeTab={activeTab} onSelect={setActiveTab} icon={AlertTriangle} label="Issues" />
          <StudioTabButton tab="publish" activeTab={activeTab} onSelect={setActiveTab} icon={Rocket} label="Publish" />
        </div>
      ) : null}

      {activeTab === "build" ? (
        isMobile && mobileStudioScreen === "component" ? (
          mobileComponentScreen
        ) : (
          <div className="space-y-4">
            {builderStatusStrip}

            {isMobile ? (
              <>
                <Card className="archivist-panel archivist-panel-muted border-white/10 bg-[#090a0d]/96">
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-xl text-white">{currentMode === "layout_v2" ? "Live composition canvas" : "Live message canvas"}</CardTitle>
                        <CardDescription>
                          {selection.kind === "node"
                            ? "The canvas stays visual. Select the block you want, then refine only that block."
                            : "Tap the exact part of the Discord message you want to change. The canvas is the editor."}
                        </CardDescription>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{publishPlan?.publishPath === "v2" ? "Interactive publish path" : publishPlan?.publishPath === "downgraded" ? "Simplified publish path" : "Message publish path"}</Badge>
                        <Badge variant="outline">
                          {selectedLabel}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      {mobileEditTargets.length > 0 ? (
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {mobileEditTargets.map((target) => (
                            <button
                              key={target.id}
                              type="button"
                              onClick={target.action}
                              className={cn(
                                "shrink-0 rounded-full border px-3 py-2 text-xs font-medium transition",
                                target.active
                                  ? "border-[rgba(168,41,63,0.22)] bg-[linear-gradient(180deg,rgba(21,14,16,0.98),rgba(11,10,11,1))] text-white"
                                  : "border-white/10 bg-[#0b0d10] text-white/62 hover:border-white/20 hover:text-white",
                              )}
                            >
                              {target.label}
                            </button>
                          ))}
                        </div>
                      ) : null}
                      <div className="flex flex-wrap items-center gap-2 rounded-[18px] border border-white/8 bg-[#0b0d10] px-3 py-3">
                        <Badge variant="outline">{selectedLabel}</Badge>
                        <span className="text-xs text-white/56">
                          {selection.kind === "node"
                            ? selectedNodeSupportsInlineInspector
                              ? "The block stays on-canvas while its focused editor opens as a lighter mobile inspector."
                              : "Interaction-heavy blocks still open in a dedicated screen so the canvas never gets cramped."
                            : selection.kind === "embed"
                              ? "Embeds stay visual on the canvas while the inspector handles structure, fields, media, and footer details."
                            : "Build directly on the live message surface."}
                        </span>
                        <div className="ml-auto flex gap-2">
                          <Button variant="outline" size="sm" className="rounded-full" onClick={() => openInsertFlow(activeInsertTargetId)}>
                            <Plus className="h-4 w-4" />
                            Add
                          </Button>
                          {selection.kind === "node" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-full"
                              onClick={openSelectedNodeEditor}
                            >
                              <PencilLine className="h-4 w-4" />
                              {selectedNodeSupportsInlineInspector ? "Inspect" : "Deep edit"}
                            </Button>
                          ) : selection.kind === "embed" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-full"
                              onClick={openSelectedEmbedInspector}
                            >
                              <PencilLine className="h-4 w-4" />
                              Inspect
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    {buildPreview}
                  </CardContent>
                </Card>

                {compositionPanel}
              </>
            ) : (
              <div
                className={cn(
                  "grid gap-4",
                  selection.kind !== "message"
                    ? "xl:grid-cols-[320px_minmax(0,1fr)_360px]"
                    : "xl:grid-cols-[320px_minmax(0,1fr)]",
                )}
              >
                <div className="space-y-4">
                  {compositionPanel}
                  {addPartPanel}
                </div>

                <Card className="archivist-panel archivist-panel-muted border-white/10 bg-[#090a0d]/96">
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-xl text-white">{currentMode === "layout_v2" ? "Live composition canvas" : "Live message canvas"}</CardTitle>
                        <CardDescription>
                          {selection.kind === "node"
                            ? "The canvas stays visual. Select the block you want, then refine only that block."
                            : "Tap the exact part of the Discord message you want to change. The canvas is the editor."}
                        </CardDescription>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{publishPlan?.publishPath === "v2" ? "Interactive publish path" : publishPlan?.publishPath === "downgraded" ? "Simplified publish path" : "Message publish path"}</Badge>
                        <Badge variant="outline">
                          {selectedLabel}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2 rounded-[18px] border border-white/8 bg-[#0b0d10] px-4 py-3">
                      <Badge variant="outline">{selectedLabel}</Badge>
                      <span className="text-sm text-white/58">
                        {selection.kind === "node"
                          ? "The right panel stays focused on the selected block while the canvas stays visible."
                          : selection.kind === "embed"
                            ? "The embed preview stays visual while the inspector carries deeper structure, media, and field controls."
                          : "Use the composition map for structure, then add the next surface from the catalog instead of jumping between insertion patterns."}
                      </span>
                    </div>
                    {buildPreview}
                  </CardContent>
                </Card>

                {selection.kind !== "message" ? selectionPanel : null}
              </div>
            )}
          </div>
        )
      ) : null}

      {activeTab === "assets" ? (
        <Card className="archivist-panel archivist-panel-muted">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-xl text-white">Assets</CardTitle>
                <CardDescription>Keep media links and uploads attached to the current draft.</CardDescription>
              </div>
              <Button onClick={() => fileInputRef.current?.click()} disabled={uploadStudioAssetMutation.isPending}>
                <ImageIcon className="h-4 w-4" />
                Upload
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                try {
                  await handleUploadAsset(file);
                } catch (error: any) {
                  toast({ title: "Upload failed", description: error?.message || "Could not upload that file.", variant: "destructive" });
                }
                event.target.value = "";
              }}
            />
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-2">
                <Label>Search assets</Label>
                <Input value={assetQuery} onChange={(event) => setAssetQuery(event.target.value)} placeholder="Search by name, URL, or type..." />
              </div>
              <div className="rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.22em] text-white/34">Current target</p>
                <p className="mt-1 text-sm font-semibold text-white">{selectedLabel}</p>
                <p className="mt-1 text-xs text-white/65">{assetSelectionHint}</p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 text-xs text-white/55">
              <span>Showing {filteredAssets.length} of {draft.assets.length} assets</span>
              {discordEmojis.length > 0 ? <span>{discordEmojis.length} server emoji available in inline insert</span> : null}
            </div>
            {draft.assets.length === 0 ? (
              <div className="rounded-[18px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-5 text-sm text-muted-foreground">
                No assets in this draft yet.
              </div>
            ) : filteredAssets.length === 0 ? (
              <div className="rounded-[18px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-5 text-sm text-muted-foreground">
                No assets match that search yet.
              </div>
            ) : (
              <div className="grid gap-3 xl:grid-cols-2">
                {filteredAssets.map((asset) => {
                  const usageCount = assetUsage.get(asset.id) || 0;
                  const canApplyToEmbed = selection.kind === "embed" && asset.type === "image";
                  const canApplyToFile = selectedNode?.type === "file";
                  const canApplyToGallery = selectedNode?.type === "media_gallery" && asset.type === "image";

                  return (
                    <div key={asset.id} className="overflow-hidden rounded-[20px] border border-white/10 bg-white/[0.03]">
                      <div className="relative aspect-[16/9] overflow-hidden border-b border-white/10 bg-[#111317]">
                        {asset.type === "image" ? (
                          <img src={asset.url} alt={asset.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm font-medium text-white/60">
                            {asset.type === "banner" ? "Banner asset" : "File asset"}
                          </div>
                        )}
                      </div>
                      <div className="space-y-3 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">{asset.name}</p>
                            <p className="mt-1 break-all text-xs text-muted-foreground">{asset.url}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">{asset.type}</Badge>
                            <Badge variant="outline">{usageCount > 0 ? `${usageCount} refs` : "Unused"}</Badge>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" className="rounded-[14px]" onClick={() => copyAssetUrl(asset)}>
                            <Copy className="h-3.5 w-3.5" />
                            Copy URL
                          </Button>
                          {canApplyToEmbed ? (
                            <>
                              <Button variant="outline" size="sm" className="rounded-[14px]" onClick={() => applyAssetToSelection(asset, "embed_image")}>Set Image</Button>
                              <Button variant="outline" size="sm" className="rounded-[14px]" onClick={() => applyAssetToSelection(asset, "embed_thumbnail")}>Set Thumb</Button>
                              <Button variant="outline" size="sm" className="rounded-[14px]" onClick={() => applyAssetToSelection(asset, "author_icon")}>Author Icon</Button>
                              <Button variant="outline" size="sm" className="rounded-[14px]" onClick={() => applyAssetToSelection(asset, "footer_icon")}>Footer Icon</Button>
                            </>
                          ) : null}
                          {canApplyToFile ? (
                            <Button variant="outline" size="sm" className="rounded-[14px]" onClick={() => applyAssetToSelection(asset, "file_url")}>Attach to File</Button>
                          ) : null}
                          {canApplyToGallery ? (
                            <Button variant="outline" size="sm" className="rounded-[14px]" onClick={() => applyAssetToSelection(asset, "gallery_item")}>Add to Gallery</Button>
                          ) : null}
                          <Button variant="ghost" size="sm" className="rounded-[14px] text-white/65 hover:text-white" onClick={() => removeAssetFromDraft(asset)} disabled={usageCount > 0}>
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "issues" ? (
        <Card className="archivist-panel archivist-panel-muted">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-xl text-white">Issues</CardTitle>
                <CardDescription>This uses the same preflight result publish uses. No fake green state.</CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge variant={errorCount > 0 ? "destructive" : "outline"}>{errorCount} errors</Badge>
                <Badge variant={warningCount > 0 ? "secondary" : "outline"}>{warningCount} warnings</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <StudioPreview
              document={draft}
              viewId={selectedViewId}
              interactionRows={interactionRows}
              diagnostics={diagnostics}
              mode="mobile"
              publishPlan={publishPlan}
            />
            <ScrollArea className="max-h-[28rem] rounded-[20px] border border-white/10 bg-white/[0.03] p-3">
              <div className="space-y-2">
                {diagnostics.length === 0 ? (
                  <div className="rounded-[16px] border border-emerald-500/20 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-100">
                    No issues found in the current message draft.
                  </div>
                ) : diagnostics.map((entry, index) => (
                  <button
                    key={`${entry.code}-${index}`}
                    type="button"
                    onClick={() => jumpToDiagnostic(entry.path)}
                    className="w-full rounded-[16px] border border-white/10 bg-background/40 px-4 py-3 text-left transition hover:border-primary/35"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={entry.level === "error" ? "destructive" : entry.level === "warning" ? "secondary" : "outline"}>{entry.level}</Badge>
                      <p className="text-sm font-medium text-white">{entry.message}</p>
                    </div>
                    {entry.path ? <p className="mt-2 text-xs text-muted-foreground">{entry.path}</p> : null}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "publish" ? (
        <Card className="archivist-panel archivist-panel-muted">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-xl text-white">Publish</CardTitle>
                <CardDescription>Choose where the message should go, review any downgrade warning, then publish.</CardDescription>
              </div>
              <Badge variant={publishPlan?.publishPath === "blocked" ? "destructive" : publishPlan?.publishPath === "downgraded" ? "secondary" : "outline"}>
                {publishPlan?.label || "No plan"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isMobile ? (
              <div className="space-y-3 rounded-[18px] border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={errorCount > 0 ? "destructive" : "outline"}>{errorCount} errors</Badge>
                  <Badge variant={warningCount > 0 ? "secondary" : "outline"}>{warningCount} warnings</Badge>
                </div>
                {diagnostics.length === 0 ? (
                  <p className="text-sm text-white/68">No blocking issues found in the current message draft.</p>
                ) : (
                  <div className="space-y-2">
                    {diagnostics.map((entry, index) => (
                      <button
                        key={`${entry.code}-${index}`}
                        type="button"
                        onClick={() => {
                          setActiveTab("build");
                          jumpToDiagnostic(entry.path);
                        }}
                        className="w-full rounded-[14px] border border-white/10 bg-[#0b0d10] px-3 py-3 text-left transition hover:border-primary/35"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={entry.level === "error" ? "destructive" : entry.level === "warning" ? "secondary" : "outline"}>{entry.level}</Badge>
                          <p className="text-sm font-medium text-white">{entry.message}</p>
                        </div>
                        {entry.path ? <p className="mt-2 text-xs text-white/50">{entry.path}</p> : null}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
            <div className="grid gap-4 md:grid-cols-2">
              <DiscordChannelPicker
                serverId={serverId}
                value={publishChannelId}
                onChange={setPublishChannelId}
                label="Target channel"
                allowedKinds={["text", "announcement", "forum"]}
                placeholder="Select channel..."
                testIdPrefix="studio-v2-publish-channel"
              />
              <div className="space-y-2">
                <Label>Update message ID</Label>
                <Input value={updateMessageId} onChange={(event) => setUpdateMessageId(event.target.value)} placeholder="Leave blank to publish as a new message" />
              </div>
            </div>

            {publishPlan?.requiresSimplifiedConfirmation ? (
              <div className="flex items-center justify-between rounded-[18px] border border-amber-400/20 bg-amber-500/10 px-4 py-4">
                <div>
                  <p className="text-sm font-semibold text-white">Allow downgraded publish</p>
                  <p className="text-xs text-white/72">This draft cannot publish exactly as designed. Confirm before publishing the simplified version.</p>
                </div>
                <Switch checked={allowDowngrade} onCheckedChange={setAllowDowngrade} />
              </div>
            ) : null}

            {currentPublication?.lastFailureSummary ? (
              <div className="rounded-[18px] border border-red-400/20 bg-red-500/10 px-4 py-4">
                <p className="text-sm font-semibold text-white">Last failure</p>
                <p className="mt-1 text-sm text-white/75">{currentPublication.lastFailureSummary}</p>
                {currentPublication.lastFailureAt ? <p className="mt-2 text-xs text-white/55">Seen {formatRelativeEditTime(currentPublication.lastFailureAt)}</p> : null}
              </div>
            ) : null}

            <div className="space-y-2">
              <Label>Advanced publish debug</Label>
              <Textarea readOnly value={JSON.stringify(publishPlan?.debug || publishPlan?.liveMessage || {}, null, 2)} className="min-h-[240px] font-mono text-xs" />
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={async () => {
                  await navigator.clipboard.writeText(JSON.stringify(publishPlan?.debug || publishPlan?.liveMessage || {}, null, 2));
                  toast({ title: "Copied", description: "Publish debug copied to clipboard." });
                }}>
                  Copy Debug JSON
                </Button>
                <Button onClick={publishDraft} disabled={publishMutation.isPending || publishPlan?.publishPath === "blocked"}>
                  <Rocket className="h-4 w-4" />
                  {updateMessageId ? "Update Message" : "Publish Message"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {isMobile ? (
        <Drawer shouldScaleBackground={false} open={documentManagerOpen} onOpenChange={setDocumentManagerOpen}>
          <DrawerContent className="h-[min(88dvh,calc(100dvh-0.75rem))] overflow-y-auto overscroll-contain border-white/10 bg-[#090a0d]/98 px-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
            <DrawerHeader className="px-0">
              <DrawerTitle className="text-white">Templates & drafts</DrawerTitle>
              <DrawerDescription>Switch, rename, duplicate, or delete Studio work without leaving the editor.</DrawerDescription>
            </DrawerHeader>
            {documentManagerContent}
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={documentManagerOpen} onOpenChange={setDocumentManagerOpen}>
          <DialogContent className="max-w-3xl border-white/10 bg-[#090a0d]/98 text-white">
            <DialogHeader>
              <DialogTitle>Templates & drafts</DialogTitle>
              <DialogDescription>Manage the full Studio lifecycle from one calmer surface.</DialogDescription>
            </DialogHeader>
            {documentManagerContent}
          </DialogContent>
        </Dialog>
      )}

      {isMobile ? (
        <Drawer shouldScaleBackground={false} open={mobileInsertOpen} onOpenChange={setMobileInsertOpen}>
          <DrawerContent className="h-[min(80dvh,calc(100dvh-0.75rem))] overflow-y-auto overscroll-contain border-white/10 bg-[#090a0d]/98 px-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
            <DrawerHeader className="px-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <DrawerTitle className="text-white">{currentMode === "layout_v2" ? "Add block" : "Add message part"}</DrawerTitle>
                  <DrawerDescription>
                    {currentMode === "layout_v2"
                      ? "Add structure or interactions right where you are working."
                      : "Add only the next thing the message still needs."}
                  </DrawerDescription>
                </div>
                <DrawerClose asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 shrink-0 rounded-full text-white/72 hover:bg-white/10 hover:text-white"
                    onClick={closeMobileInsert}
                    aria-label="Close add drawer"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </DrawerClose>
              </div>
            </DrawerHeader>
            <div className="pb-2">
              <StudioInsertCatalog
                title={currentMode === "layout_v2" ? contextualInsertLabel : "Add the next part"}
                description={
                  currentMode === "layout_v2"
                    ? "Pick the next visible or interactive block. Studio will insert it into the current lane and move focus naturally."
                    : "Pick the next visible part of the message. Studio keeps the canvas and publish truth attached while you add."
                }
                groups={insertGroups}
              />
            </div>
          </DrawerContent>
        </Drawer>
      ) : null}

      {isMobile ? (
        <Drawer shouldScaleBackground={false} open={mobileInspectorOpen} onOpenChange={setMobileInspectorOpen}>
          <DrawerContent className="h-[min(88dvh,calc(100dvh-0.75rem))] overflow-y-auto overscroll-contain border-white/10 bg-[#090a0d]/98 px-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
            <DrawerHeader className="px-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <DrawerTitle className="text-white">{selectionPanelTitle}</DrawerTitle>
                  <DrawerDescription>{selectionPanelDescription}</DrawerDescription>
                </div>
                <DrawerClose asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 shrink-0 rounded-full text-white/72 hover:bg-white/10 hover:text-white"
                    onClick={closeMobileInspector}
                    aria-label="Close component controls"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </DrawerClose>
              </div>
            </DrawerHeader>
            <div className="sticky top-0 z-10 -mx-4 mb-3 border-b border-white/10 bg-[#090a0d]/96 px-4 py-2 backdrop-blur">
              <Button
                type="button"
                variant="ghost"
                className="h-10 rounded-full px-3 text-white/76 hover:bg-white/10 hover:text-white"
                onClick={closeMobileInspector}
              >
                <ChevronLeft className="h-4 w-4" />
                Back to canvas
              </Button>
            </div>
            <div className="space-y-4 pb-2">{selectionPanelContent}</div>
          </DrawerContent>
        </Drawer>
      ) : null}

      {isMobile && !hideMobileChrome ? (
        <>
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#090a0d]/96 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-[0_-18px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            <div className="grid grid-cols-3 gap-2">
              <StudioTabButton tab="build" activeTab={activeTab} onSelect={setActiveTab} icon={MessageSquareText} label="Edit" />
              <StudioTabButton tab="assets" activeTab={activeTab} onSelect={setActiveTab} icon={ImageIcon} label="Assets" />
              <StudioTabButton tab="publish" activeTab={activeTab} onSelect={setActiveTab} icon={Rocket} label="Publish" />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
