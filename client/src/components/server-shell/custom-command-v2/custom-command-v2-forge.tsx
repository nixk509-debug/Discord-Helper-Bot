import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Copy,
  Eye,
  FileCode2,
  LayoutTemplate,
  MessageSquareText,
  Plus,
  Rocket,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  WandSparkles,
} from "lucide-react";
import type {
  CustomCommandV2Compiled,
  CustomCommandV2Condition,
  CustomCommandV2Definition,
  CustomCommandV2Issue,
  CustomCommandV2Trigger,
  CustomCommandV2TriggerType,
  CustomCommandV2WorkflowStep,
} from "@shared/custom-command-v2";
import { summarizeCustomCommandV2 } from "@shared/custom-command-v2";
import { serializeStudioDocumentView } from "@shared/studio-document";
import {
  isApiIssuesError,
  useCreateCommandV2,
  useDeleteCommandV2,
  useDiscordContext,
  useDryRunCommandV2,
  useServerCommandsV2,
  useStudioDocuments,
  useUpdateCommandV2,
  type ArchivistCommandV2,
} from "@/hooks/use-bot";
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { buildArchivistItemPath } from "@/lib/archivist-workspace";
import { cn } from "@/lib/utils";
import {
  buildWorkflowSavePayload,
  cloneWorkflowDefinition,
  createBlankWorkflowDraft,
  createWorkflowStarterTemplate,
  createWorkflowStepTemplate,
  createWorkflowTriggerTemplate,
  getWorkflowTriggerLabel,
  summarizeIssues,
  TRIGGER_OPTIONS,
  WORKFLOW_STARTER_TEMPLATES,
} from "./custom-command-v2-model";
import { CustomCommandV2Home } from "./custom-command-v2-home";

type ForgeScreen = "hub" | "create" | "import" | "activity";
type SelectionState = number | "new";
type PreviewMode = "build" | "preview";
type StarterMode = "root" | "template" | "duplicate";
type ForgeActionOption = CustomCommandV2WorkflowStep["type"] | "studio_asset";

export interface CommandForgeEntryIntent {
  triggerType?: CustomCommandV2TriggerType;
  draftName?: string;
  draftDescription?: string;
  showStarterOnNewDraft?: boolean;
  routeSlug?: string;
}

const ACTION_GROUPS: Array<{
  title: string;
  actions: Array<{ id: ForgeActionOption; label: string; description: string }>;
}> = [
  {
    title: "Messaging",
    actions: [
      { id: "send_message", label: "Send Text", description: "Send a normal Discord message." },
      { id: "send_embed", label: "Send Simple Embed", description: "Send one clean embed response." },
      { id: "reply_ephemeral", label: "Reply Ephemeral", description: "Reply privately during interactions." },
      { id: "fallback_response", label: "Fallback Reply", description: "Handle denials or failures gracefully." },
    ],
  },
  {
    title: "Studio References",
    actions: [
      { id: "studio_asset", label: "Send Studio Surface", description: "Pull message or embed content from Design Studio." },
    ],
  },
  {
    title: "Interaction",
    actions: [
      { id: "add_button_row", label: "Buttons", description: "Attach one row of buttons." },
      { id: "add_select_menu", label: "Select Menu", description: "Attach a dropdown menu." },
      { id: "open_modal", label: "Open Modal", description: "Collect a short form from the user." },
    ],
  },
  {
    title: "Roles & Logic",
    actions: [
      { id: "add_role", label: "Add Role", description: "Grant a role to the actor or target." },
      { id: "remove_role", label: "Remove Role", description: "Remove a role from the actor or target." },
      { id: "set_variable", label: "Set Variable", description: "Store, increment, or update data." },
      { id: "check_permission", label: "Check Permission", description: "Gate the workflow behind Discord permissions." },
      { id: "check_cooldown", label: "Check Cooldown", description: "Only continue when the cooldown is ready." },
      { id: "branch_if", label: "Branch", description: "Split the workflow with readable logic." },
      { id: "log_action", label: "Log Action", description: "Write a trace line for staff or debugging." },
      { id: "call_webhook", label: "Call Webhook", description: "Make a controlled outbound request." },
    ],
  },
];

const TRIGGER_CARDS: Array<{
  value: CustomCommandV2TriggerType;
  title: string;
  description: string;
}> = [
  { value: "slash", title: "Slash Command", description: "Manual trigger with a visible slash name and options." },
  { value: "keyword", title: "Message Command", description: "Run when a message matches a word or phrase." },
  { value: "button", title: "Button Press", description: "Continue when a saved button custom ID is pressed." },
  { value: "select", title: "Select Menu", description: "Continue when a dropdown value is chosen." },
  { value: "modal_submit", title: "Modal Submit", description: "Continue when a modal is submitted." },
  { value: "schedule", title: "Scheduled Time", description: "Run at a defined recurring time." },
  { value: "join", title: "Member Join", description: "Automatic trigger when a member joins the server." },
  { value: "role_add", title: "Role Change", description: "Run when a selected role is added." },
  { value: "reaction", title: "Reaction Event", description: "Run when a specific reaction is used." },
];

function formatDate(value: string | Date | null | undefined) {
  if (!value) return "Recently";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function parseList(value: string) {
  return value.split(",").map((entry) => entry.trim()).filter(Boolean);
}

function slugifyId(value: string, fallback: string) {
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9:_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return cleaned || fallback;
}

function getStatusTone(command: CustomCommandV2Definition, issues: CustomCommandV2Issue[]) {
  if (issues.some((entry) => entry.severity === "error")) return "danger";
  if (!command.behavior.enabled) return "draft";
  if (issues.some((entry) => entry.severity === "warning")) return "warning";
  return "live";
}

function getStatusLabel(command: CustomCommandV2Definition, issues: CustomCommandV2Issue[]) {
  const tone = getStatusTone(command, issues);
  if (tone === "danger") return "Failed";
  if (tone === "warning") return "Warnings";
  if (tone === "draft") return "Draft";
  return "Published";
}

function getActionMeta(step: CustomCommandV2WorkflowStep) {
  switch (step.type) {
    case "send_message":
      return { title: "Send Text", icon: MessageSquareText, tint: "text-[#ff7085]" };
    case "send_embed":
      return { title: "Send Embed", icon: LayoutTemplate, tint: "text-[#ff7085]" };
    case "reply_ephemeral":
      return { title: "Reply Ephemeral", icon: Sparkles, tint: "text-[#f4c56a]" };
    case "add_role":
    case "remove_role":
    case "check_permission":
      return { title: "Role / Permission", icon: ShieldCheck, tint: "text-[#7ee2b2]" };
    case "branch_if":
      return { title: "Branch", icon: WandSparkles, tint: "text-[#f4c56a]" };
    default:
      return { title: "Action", icon: FileCode2, tint: "text-[#9bc2ff]" };
  }
}

function summarizeCondition(condition: CustomCommandV2Condition) {
  const left = condition.left.source === "literal"
    ? JSON.stringify(condition.left.value)
    : condition.left.source === "variable"
      ? `variable:${condition.left.key}`
      : `context:${condition.left.key}`;
  const right = condition.right
    ? condition.right.source === "literal"
      ? JSON.stringify(condition.right.value)
      : condition.right.source === "variable"
        ? `variable:${condition.right.key}`
        : `context:${condition.right.key}`
    : "";
  if (condition.operator === "truthy") return `${left} is truthy`;
  if (condition.operator === "falsy") return `${left} is falsy`;
  return `${left} ${condition.operator} ${right}`.trim();
}

function summarizeStep(step: CustomCommandV2WorkflowStep) {
  switch (step.type) {
    case "send_message":
      return step.content.trim() || "No message text yet.";
    case "send_embed":
      return step.embed.title || step.embed.description || "No embed content yet.";
    case "reply_ephemeral":
      return step.content.trim() || "Private interaction reply.";
    case "add_button_row":
      return `${step.buttons.length} button${step.buttons.length === 1 ? "" : "s"} attached.`;
    case "add_select_menu":
      return `${step.options.length} option${step.options.length === 1 ? "" : "s"} in the menu.`;
    case "open_modal":
      return `${step.title} with ${step.fields.length} field${step.fields.length === 1 ? "" : "s"}.`;
    case "set_variable":
      return `${step.operation} ${step.variableKey}.`;
    case "add_role":
      return `Adds role ${step.roleId || "role"} to the ${step.target}.`;
    case "remove_role":
      return `Removes role ${step.roleId || "role"} from the ${step.target}.`;
    case "check_permission":
      return `Checks ${step.permissions.join(", ") || "permissions"}.`;
    case "check_cooldown":
      return `${step.scope || "user"} cooldown for ${step.seconds || 0}s.`;
    case "branch_if":
      return summarizeCondition(step.condition);
    case "log_action":
      return `${step.level.toUpperCase()}: ${step.message}`;
    case "call_webhook":
      return `${step.method} ${step.url || "webhook URL"}.`;
    case "fallback_response":
      return step.content.trim() || "Fallback response for a blocked or failed path.";
    default:
      return "Workflow action";
  }
}

function statusClasses(tone: ReturnType<typeof getStatusTone>) {
  if (tone === "danger") return "border-rose-500/20 bg-rose-500/[0.10] text-white";
  if (tone === "warning") return "border-amber-500/20 bg-amber-500/[0.10] text-white";
  if (tone === "draft") return "border-white/10 bg-white/[0.04] text-white/76";
  return "border-emerald-500/20 bg-emerald-500/[0.10] text-white";
}

function SectionCard({
  title,
  summary,
  children,
}: {
  title: string;
  description?: string;
  summary?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[20px] bg-white/[0.03]">
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.05] px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-white/35">{title}</p>
        {summary ? (
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-white/50">
            {summary}
          </span>
        ) : null}
      </div>
      <div className="space-y-4 p-4">{children}</div>
    </div>
  );
}

function DraftBadge({
  draft,
  issues,
}: {
  draft: CustomCommandV2Definition;
  issues: CustomCommandV2Issue[];
}) {
  const tone = getStatusTone(draft, issues);
  return (
    <span className={cn("rounded-full border px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em]", statusClasses(tone))}>
      {getStatusLabel(draft, issues)}
    </span>
  );
}

export function CustomCommandV2Forge({
  serverId,
  screen,
  initialSelection = "new",
  entryIntent,
}: {
  serverId: number;
  screen: ForgeScreen;
  initialSelection?: SelectionState;
  entryIntent?: CommandForgeEntryIntent;
}) {
  if (screen === "hub" || screen === "import" || screen === "activity") {
    return <CustomCommandV2Home serverId={serverId} screen={screen} />;
  }
  return <CustomCommandV2ForgeBuilder serverId={serverId} initialSelection={initialSelection} entryIntent={entryIntent} />;
}

function PreviewPanel({
  draft,
  issueSummary,
}: {
  draft: CustomCommandV2Definition;
  issueSummary: ReturnType<typeof summarizeIssues>;
}) {
  const messages = draft.workflow.steps.filter((step) => step.type === "send_message" || step.type === "reply_ephemeral");
  const embeds = draft.workflow.steps.filter((step) => step.type === "send_embed");

  return (
    <div className="rounded-[20px] bg-white/[0.03] overflow-hidden">
      <div className="border-b border-white/[0.05] px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-white/35">Discord Preview</p>
      </div>
      <div className="space-y-4 p-4">
        <div className="rounded-[28px] border border-white/8 bg-[#0b0d11] p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-full bg-[#a91d31] text-sm font-semibold text-white">
              A
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-white">Archivist</p>
                <span className="rounded-full bg-[#5865F2] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
                  Bot
                </span>
              </div>
              {messages.length ? messages.map((step) => (
                <div key={step.id} className="rounded-[18px] border border-white/8 bg-white/[0.03] p-3 text-sm leading-6 text-white/84">
                  {"content" in step ? step.content || "No message text yet." : "No message text yet."}
                </div>
              )) : (
                <div className="rounded-[18px] border border-dashed border-white/10 bg-white/[0.02] p-3 text-sm text-white/50">
                  No message-producing action yet.
                </div>
              )}
              {embeds.map((step) => (
                <div key={step.id} className="overflow-hidden rounded-[18px] border border-white/8 bg-[#111318] p-4">
                  <p className="text-sm font-semibold text-white">{step.embed.title || "Embed"}</p>
                  <p className="mt-2 text-sm leading-6 text-white/72">{step.embed.description || "No embed description yet."}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="rounded-[18px] border border-white/8 bg-[#111318] p-4 text-sm leading-6 text-white/66">
          {issueSummary.errors
            ? `${issueSummary.errors} blocking issue${issueSummary.errors === 1 ? "" : "s"} to fix before publishing.`
            : issueSummary.warnings
              ? `${issueSummary.warnings} warning${issueSummary.warnings === 1 ? "" : "s"} to review before publishing.`
              : "No current validation warnings."}
        </div>
      </div>
    </div>
  );
}

function CustomCommandV2ForgeBuilder({
  serverId,
  initialSelection,
  entryIntent,
}: {
  serverId: number;
  initialSelection: SelectionState;
  entryIntent?: CommandForgeEntryIntent;
}) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const commandsQuery = useServerCommandsV2(serverId);
  const studioDocumentsQuery = useStudioDocuments(serverId, { enabled: true });
  const contextQuery = useDiscordContext(serverId, { enabled: true });
  const createMutation = useCreateCommandV2(serverId);
  const updateMutation = useUpdateCommandV2(serverId);
  const deleteMutation = useDeleteCommandV2(serverId);
  const dryRunMutation = useDryRunCommandV2(serverId);

  const commands = commandsQuery.data || [];
  const studioDocuments = studioDocumentsQuery.data || [];
  const roles = contextQuery.data?.roles || [];
  const channels = contextQuery.data?.channels?.filter((channel) => channel.isTextBased && !channel.isThread) || [];

  const [selection, setSelection] = useState<SelectionState>(initialSelection);
  const [loadedSelection, setLoadedSelection] = useState<SelectionState | null>(null);
  const [draft, setDraft] = useState<CustomCommandV2Definition>(createBlankWorkflowDraft());
  const [loadedFingerprint, setLoadedFingerprint] = useState<string | null>(null);
  const [lastValidatedFingerprint, setLastValidatedFingerprint] = useState<string | null>(null);
  const [lastCompiled, setLastCompiled] = useState<CustomCommandV2Compiled | null>(null);
  const [lastIssues, setLastIssues] = useState<CustomCommandV2Issue[]>([]);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("build");
  const [starterOpen, setStarterOpen] = useState(initialSelection === "new" && (entryIntent?.showStarterOnNewDraft ?? true));
  const [starterMode, setStarterMode] = useState<StarterMode>("root");
  const [duplicateSourceId, setDuplicateSourceId] = useState<string>("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const [studioSheetOpen, setStudioSheetOpen] = useState(false);
  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const [testInputJson, setTestInputJson] = useState("{}");

  const selectedCommand = useMemo(
    () => commands.find((command) => command.id === selection) || null,
    [commands, selection],
  );

  const routeSlug = entryIntent?.routeSlug || "create-command";
  const showStarterOnNewDraft = entryIntent?.showStarterOnNewDraft ?? true;
  const createEntryDraft = useMemo(() => {
    return () => {
      const blank = createBlankWorkflowDraft();
      const draftName = entryIntent?.draftName?.trim() || "";
      const draftDescription = entryIntent?.draftDescription?.trim() || "";

      if (draftName) {
        blank.meta.name = draftName;
      }
      if (draftDescription) {
        blank.meta.description = draftDescription;
      }
      if (entryIntent?.triggerType) {
        blank.trigger = createWorkflowTriggerTemplate(entryIntent.triggerType, {
          name: draftName || "Archivist Command",
          description: draftDescription || "Run this Archivist command",
        });
      }

      return blank;
    };
  }, [entryIntent?.draftDescription, entryIntent?.draftName, entryIntent?.triggerType]);

  useEffect(() => {
    setSelection(initialSelection);
  }, [initialSelection]);

  useEffect(() => {
    if (selection === "new") {
      const blank = createEntryDraft();
      const blankFingerprint = JSON.stringify(blank);
      if (loadedSelection === "new" && loadedFingerprint === blankFingerprint) return;
      setDraft(blank);
      setLoadedFingerprint(blankFingerprint);
      setLastValidatedFingerprint(null);
      setLastCompiled(null);
      setLastIssues([]);
      setEditingActionId(null);
      setLoadedSelection("new");
      if (initialSelection === "new") {
        setStarterOpen(showStarterOnNewDraft);
      }
      return;
    }

    if (loadedSelection === selection) return;
    const command = commands.find((entry) => entry.id === selection);
    if (!command) return;
    const nextDraft = cloneWorkflowDefinition(command.definition);
    setDraft(nextDraft);
    setLoadedFingerprint(JSON.stringify(nextDraft));
    setLastValidatedFingerprint(JSON.stringify(nextDraft));
    setLastCompiled(command.compiled);
    setLastIssues(command.lastValidation || []);
    setEditingActionId(null);
    setLoadedSelection(command.id);
    setStarterOpen(false);
  }, [commands, createEntryDraft, initialSelection, loadedFingerprint, loadedSelection, selection, showStarterOnNewDraft]);

  const draftFingerprint = JSON.stringify(draft);
  const draftDirty = loadedFingerprint !== null && loadedFingerprint !== draftFingerprint;
  const preview = useMemo(() => summarizeCustomCommandV2(draft), [draft]);
  const issueSummary = useMemo(() => summarizeIssues(lastIssues), [lastIssues]);
  const hasFreshValidation = lastValidatedFingerprint === draftFingerprint;
  const editingAction = useMemo(
    () => draft.workflow.steps.find((step) => step.id === editingActionId) || null,
    [draft.workflow.steps, editingActionId],
  );

  const updateDraft = (updater: (current: CustomCommandV2Definition) => CustomCommandV2Definition) => {
    setDraft((current) => updater(cloneWorkflowDefinition(current)));
  };

  const openSelection = (nextSelection: SelectionState) => {
    setSelection(nextSelection);
    if (nextSelection === "new") {
      navigate(buildArchivistItemPath(serverId, "commands", routeSlug));
      return;
    }
    navigate(buildArchivistItemPath(serverId, "commands", routeSlug, { search: { commandId: nextSelection } }));
  };

  const resetForNewDraft = (nextDraft: CustomCommandV2Definition) => {
    setSelection("new");
    setDraft(nextDraft);
    setLoadedFingerprint(JSON.stringify(nextDraft));
    setLastValidatedFingerprint(null);
    setLastCompiled(null);
    setLastIssues([]);
    setEditingActionId(null);
    navigate(buildArchivistItemPath(serverId, "commands", routeSlug));
  };

  const beginBlankDraft = () => {
    resetForNewDraft(createEntryDraft());
    setStarterOpen(false);
    setStarterMode("root");
  };

  const beginTemplateDraft = (templateId: typeof WORKFLOW_STARTER_TEMPLATES[number]["id"]) => {
    resetForNewDraft(createWorkflowStarterTemplate(templateId));
    setStarterOpen(false);
    setStarterMode("root");
  };

  const beginDuplicateDraft = () => {
    const source = commands.find((command) => String(command.id) === duplicateSourceId);
    if (!source) {
      toast({
        title: "Pick a command to duplicate",
        description: "Archivist needs a saved command to clone into a new draft.",
        variant: "destructive",
      });
      return;
    }
    const nextDraft = cloneWorkflowDefinition(source.definition);
    nextDraft.behavior.enabled = false;
    nextDraft.meta.name = `${source.definition.meta.name || source.name} Copy`;
    resetForNewDraft(nextDraft);
    setStarterOpen(false);
    setStarterMode("root");
  };

  const handleOpenNewDraft = () => {
    if (draftDirty && !window.confirm("Discard this draft and start a new command?")) return;
    if (!showStarterOnNewDraft) {
      beginBlankDraft();
      return;
    }
    setStarterOpen(true);
    setStarterMode("root");
  };

  const updateTrigger = (type: CustomCommandV2TriggerType) => {
    updateDraft((current) => {
      current.trigger = createWorkflowTriggerTemplate(type, {
        name: current.meta.name || selectedCommand?.name || "Archivist Command",
        description: current.meta.description || "Run this Archivist command",
      });
      return current;
    });
  };

  const addAction = (actionType: ForgeActionOption) => {
    if (actionType === "studio_asset") {
      setStudioSheetOpen(true);
      return;
    }
    const nextStep = createWorkflowStepTemplate(actionType, draft.workflow.steps.length);
    updateDraft((current) => {
      current.workflow.steps.push(nextStep);
      if (!current.workflow.entryStepId) {
        current.workflow.entryStepId = nextStep.id;
      }
      return current;
    });
    setEditingActionId(nextStep.id);
    setActionSheetOpen(false);
  };

  const updateAction = (stepId: string, updater: (step: CustomCommandV2WorkflowStep) => CustomCommandV2WorkflowStep) => {
    updateDraft((current) => {
      current.workflow.steps = current.workflow.steps.map((step) => (step.id === stepId ? updater(step) : step));
      return current;
    });
  };

  const duplicateAction = (stepId: string) => {
    const source = draft.workflow.steps.find((step) => step.id === stepId);
    if (!source) return;
    const clonedStep = JSON.parse(JSON.stringify(source)) as CustomCommandV2WorkflowStep;
    clonedStep.id = slugifyId(`${source.id}-copy`, `${source.id}-copy`);
    clonedStep.label = source.label ? `${source.label} Copy` : source.label;
    updateDraft((current) => {
      const index = current.workflow.steps.findIndex((step) => step.id === stepId);
      current.workflow.steps.splice(index + 1, 0, clonedStep);
      return current;
    });
  };

  const removeAction = (stepId: string) => {
    updateDraft((current) => {
      current.workflow.steps = current.workflow.steps.filter((step) => step.id !== stepId);
      if (current.workflow.entryStepId === stepId) {
        current.workflow.entryStepId = current.workflow.steps[0]?.id || "";
      }
      return current;
    });
    if (editingActionId === stepId) setEditingActionId(null);
  };

  const moveAction = (stepId: string, direction: "up" | "down") => {
    updateDraft((current) => {
      const index = current.workflow.steps.findIndex((step) => step.id === stepId);
      if (index < 0) return current;
      const swapIndex = direction === "up" ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= current.workflow.steps.length) return current;
      const [step] = current.workflow.steps.splice(index, 1);
      current.workflow.steps.splice(swapIndex, 0, step);
      return current;
    });
  };

  const applyStudioDocument = (documentId: string) => {
    const document = studioDocuments.find((entry) => String(entry.id) === documentId);
    if (!document) return;
    const serialized = serializeStudioDocumentView(document.document);
    const createdSteps: CustomCommandV2WorkflowStep[] = [];
    const baseIndex = draft.workflow.steps.length;

    if (serialized.content.trim()) {
      createdSteps.push({
        ...(createWorkflowStepTemplate("send_message", baseIndex) as Extract<CustomCommandV2WorkflowStep, { type: "send_message" }>),
        id: slugifyId(`studio-${document.id}-message`, `studio-message-${baseIndex + 1}`),
        label: `Studio Message · ${document.name}`,
        content: serialized.content,
      });
    }

    serialized.embeds.forEach((embed, index) => {
      createdSteps.push({
        ...(createWorkflowStepTemplate("send_embed", baseIndex + createdSteps.length + index) as Extract<CustomCommandV2WorkflowStep, { type: "send_embed" }>),
        id: slugifyId(`studio-${document.id}-embed-${index + 1}`, `studio-embed-${baseIndex + index + 1}`),
        label: `Studio Embed · ${document.name}`,
        embed: {
          ...embed,
          fields: (embed.fields || []).map((field) => ({
            ...field,
            inline: Boolean(field.inline),
          })),
        },
      });
    });

    if (!createdSteps.length) {
      toast({
        title: "Nothing importable in that Studio surface",
        description: "Archivist could not find message text or embeds to pull into this command.",
        variant: "destructive",
      });
      return;
    }

    updateDraft((current) => {
      current.workflow.steps.push(...createdSteps);
      if (!current.workflow.entryStepId) {
        current.workflow.entryStepId = createdSteps[0].id;
      }
      return current;
    });
    setStudioSheetOpen(false);
    setActionSheetOpen(false);
    toast({
      title: "Studio surface added",
      description: "Archivist pulled the Studio message content into standard workflow actions.",
    });
  };

  const validateCurrentDraft = async (options: { quiet?: boolean; openReview?: boolean } = {}) => {
    try {
      const parsedInput = JSON.parse(testInputJson || "{}");
      const result = await dryRunMutation.mutateAsync({
        definition: draft,
        actor: {
          permissions: [],
          roleIds: [],
          isPremium: false,
          isOwner: false,
        },
        channel: {
          id: channels[0]?.id || "preview-channel",
          name: channels[0]?.name || "Preview Channel",
        },
        input: parsedInput,
      });
      setLastCompiled(result.compiled);
      setLastIssues(result.issues || []);
      setLastValidatedFingerprint(draftFingerprint);
      if (!options.quiet) {
        toast({
          title: result.issues?.some((entry: CustomCommandV2Issue) => entry.severity === "error") ? "Review found blocking issues" : "Command reviewed",
          description: result.issues?.[0]?.message || "Archivist refreshed the current validation and preview summary.",
          variant: result.issues?.some((entry: CustomCommandV2Issue) => entry.severity === "error") ? "destructive" : "default",
        });
      }
      if (options.openReview) {
        setReviewOpen(true);
      }
      return result;
    } catch (error) {
      if (isApiIssuesError(error)) {
        setLastIssues(error.issues);
        setLastValidatedFingerprint(draftFingerprint);
      }
      if (!options.quiet) {
        toast({
          title: "Review failed",
          description: error instanceof Error ? error.message : "Archivist could not validate that command.",
          variant: "destructive",
        });
      }
      if (options.openReview) {
        setReviewOpen(true);
      }
      return null;
    }
  };

  const saveDraft = async (publish: boolean) => {
    const nextDefinition = cloneWorkflowDefinition(draft);
    nextDefinition.behavior.enabled = publish;
    const result = await validateCurrentDraft({ quiet: true, openReview: true });
    if (!result?.compiled) {
      toast({
        title: "Save blocked",
        description: "Archivist could not compile this command yet. Review the warnings and missing fields first.",
        variant: "destructive",
      });
      return;
    }
    if ((result.issues || []).some((entry: CustomCommandV2Issue) => entry.severity === "error")) {
      toast({
        title: publish ? "Publish blocked" : "Save blocked",
        description: result.issues.find((entry: CustomCommandV2Issue) => entry.severity === "error")?.message || "Archivist found blocking issues to fix first.",
        variant: "destructive",
      });
      return;
    }

    const payload = buildWorkflowSavePayload({
      definition: nextDefinition,
      compiled: result.compiled,
      issues: result.issues,
    });

    try {
      let saved: ArchivistCommandV2;
      if (selectedCommand) {
        saved = await updateMutation.mutateAsync({ id: selectedCommand.id, data: payload });
      } else {
        saved = await createMutation.mutateAsync(payload as any);
      }
      openSelection(saved.id);
      const nextDraft = cloneWorkflowDefinition(saved.definition);
      setDraft(nextDraft);
      setLoadedFingerprint(JSON.stringify(nextDraft));
      setLastValidatedFingerprint(JSON.stringify(nextDraft));
      setLastCompiled(saved.compiled);
      setLastIssues(saved.lastValidation || []);
      setReviewOpen(false);
      toast({
        title: publish ? "Command published" : "Draft saved",
        description: publish ? "Archivist can run this command live now." : "The command was saved as a draft.",
      });
    } catch (error) {
      if (isApiIssuesError(error)) {
        setLastIssues(error.issues);
        setLastValidatedFingerprint(draftFingerprint);
      }
      toast({
        title: publish ? "Publish failed" : "Save failed",
        description: error instanceof Error ? error.message : "Archivist could not save that command.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedCommand) return;
    if (!window.confirm(`Delete ${selectedCommand.name}? This cannot be undone.`)) return;
    try {
      await deleteMutation.mutateAsync(selectedCommand.id);
      beginBlankDraft();
      toast({ title: "Command deleted", description: "The workflow command was removed from this server." });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Archivist could not delete that command.",
        variant: "destructive",
      });
    }
  };

  const conditionSummary = [
    draft.access.ownerOnly ? "Owner only" : null,
    draft.access.requiredPermissions.length ? `${draft.access.requiredPermissions.length} permission gate${draft.access.requiredPermissions.length === 1 ? "" : "s"}` : null,
    draft.access.allowedRoleIds.length ? `${draft.access.allowedRoleIds.length} allowed role${draft.access.allowedRoleIds.length === 1 ? "" : "s"}` : null,
    draft.behavior.cooldownSeconds ? `${draft.behavior.cooldownSeconds}s cooldown` : null,
  ].filter(Boolean).join(" · ") || "No access rules yet";

  const reviewWarnings = lastIssues;

  return (
    <>
      <div className="space-y-4">
        <div className="rounded-[20px] bg-white/[0.03]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.05] px-4 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[17px] font-bold text-white">{draft.meta.name?.trim() || "Untitled Command"}</p>
              <DraftBadge draft={draft} issues={lastIssues} />
              {draftDirty ? (
                <span className="rounded-full border border-[#c5485d]/30 bg-[#261219] px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white/80">
                  Unsaved
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="rounded-[18px] border-white/10 bg-white/[0.03]" onClick={handleOpenNewDraft}>
                <Plus className="h-4 w-4" />
                New
              </Button>
              {selectedCommand ? (
                <Button variant="outline" className="rounded-[18px] border-white/10 bg-white/[0.03]" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              ) : null}
              <Button variant="outline" className="rounded-[18px] border-white/10 bg-white/[0.03]" onClick={() => validateCurrentDraft({ openReview: true })}>
                <Eye className="h-4 w-4" />
                Review
              </Button>
            </div>
          </div>
          <div className="space-y-4 p-4 md:p-6">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
              <div className="rounded-[24px] border border-white/8 bg-[#111318] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-white/42">Trigger</p>
                    <p className="text-sm font-semibold text-white">{getWorkflowTriggerLabel(draft)}</p>
                    <p className="text-sm text-white/56">{preview.whatTriggers}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/10 bg-[#0c0f13] px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white/68">
                      {TRIGGER_OPTIONS.find((option) => option.value === draft.trigger.type)?.label || draft.trigger.type}
                    </span>
                    <span className="rounded-full border border-white/10 bg-[#0c0f13] px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white/68">
                      {draft.workflow.steps.length} actions
                    </span>
                  </div>
                </div>
              </div>
              <Tabs value={previewMode} onValueChange={(value) => setPreviewMode(value as PreviewMode)} className="w-full md:w-auto">
                <TabsList className="grid w-full grid-cols-2 md:w-[220px]">
                  <TabsTrigger value="build">Build</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_360px]">
              <div className={cn("space-y-4", previewMode === "preview" && "hidden xl:block")}>
                <SectionCard title="Command Info" description="Name the command, add an internal note, and keep its identity clear.">
                  <div className="grid gap-4">
                    <label className="space-y-2">
                      <p className="text-sm font-semibold text-white">Command Name</p>
                      <Input
                        value={draft.meta.name}
                        onChange={(event) => updateDraft((current) => {
                          current.meta.name = event.target.value;
                          if (current.trigger.type === "slash" && !selectedCommand) {
                            current.trigger = {
                              ...current.trigger,
                              name: event.target.value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32),
                            } as CustomCommandV2Trigger;
                          }
                          return current;
                        })}
                        placeholder="Example: Welcome Forge"
                        className="h-12 rounded-[18px] border-white/10 bg-[#0b0d11]"
                      />
                    </label>
                    <label className="space-y-2">
                      <p className="text-sm font-semibold text-white">Internal Note</p>
                      <Textarea
                        value={draft.meta.description || ""}
                        onChange={(event) => updateDraft((current) => {
                          current.meta.description = event.target.value;
                          return current;
                        })}
                        placeholder="Describe what this command is responsible for."
                        className="min-h-[110px] rounded-[18px] border-white/10 bg-[#0b0d11]"
                      />
                    </label>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="space-y-2">
                        <p className="text-sm font-semibold text-white">Category</p>
                        <Input
                          value={draft.meta.category || ""}
                          onChange={(event) => updateDraft((current) => {
                            current.meta.category = event.target.value;
                            return current;
                          })}
                          placeholder="support"
                          className="h-12 rounded-[18px] border-white/10 bg-[#0b0d11]"
                        />
                      </label>
                      <label className="space-y-2">
                        <p className="text-sm font-semibold text-white">Tags</p>
                        <Input
                          value={(draft.meta.tags || []).join(", ")}
                          onChange={(event) => updateDraft((current) => {
                            current.meta.tags = parseList(event.target.value);
                            return current;
                          })}
                          placeholder="faq, onboarding, staff"
                          className="h-12 rounded-[18px] border-white/10 bg-[#0b0d11]"
                        />
                      </label>
                    </div>
                  </div>
                </SectionCard>

                <SectionCard title="Trigger" description="Make it obvious what starts the command and what kind of input it expects.">
                  <div className="grid gap-3 md:grid-cols-2">
                    {TRIGGER_CARDS.map((card) => (
                      <button
                        key={card.value}
                        type="button"
                        onClick={() => updateTrigger(card.value)}
                        className={cn(
                          "rounded-[22px] border p-4 text-left transition",
                          draft.trigger.type === card.value ? "border-[#c5485d]/40 bg-[#1b0f15]" : "border-white/8 bg-[#111318] hover:border-white/14 hover:bg-[#15181e]",
                        )}
                      >
                        <p className="text-sm font-semibold text-white">{card.title}</p>
                        <p className="mt-2 text-sm leading-6 text-white/56">{card.description}</p>
                      </button>
                    ))}
                  </div>
                </SectionCard>

                <SectionCard title="Conditions" description="Keep pre-run gating readable: permissions, channels, roles, and cooldown behavior." summary={conditionSummary}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-2">
                      <p className="text-sm font-semibold text-white">Allowed Roles</p>
                      <Input
                        value={draft.access.allowedRoleIds.join(", ")}
                        onChange={(event) => updateDraft((current) => {
                          current.access.allowedRoleIds = parseList(event.target.value);
                          return current;
                        })}
                        placeholder={roles[0]?.id || "role IDs, comma separated"}
                        className="h-12 rounded-[18px] border-white/10 bg-[#0b0d11]"
                      />
                    </label>
                    <label className="space-y-2">
                      <p className="text-sm font-semibold text-white">Required Permissions</p>
                      <Input
                        value={draft.access.requiredPermissions.join(", ")}
                        onChange={(event) => updateDraft((current) => {
                          current.access.requiredPermissions = parseList(event.target.value);
                          return current;
                        })}
                        placeholder="manage_messages, manage_roles"
                        className="h-12 rounded-[18px] border-white/10 bg-[#0b0d11]"
                      />
                    </label>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-[20px] border border-white/8 bg-[#0b0d11] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">Owner Only</p>
                          <p className="mt-1 text-sm text-white/54">Lock this command to the Archivist owner.</p>
                        </div>
                        <Switch
                          checked={draft.access.ownerOnly}
                          onCheckedChange={(checked) => updateDraft((current) => {
                            current.access.ownerOnly = checked;
                            return current;
                          })}
                        />
                      </div>
                    </div>
                    <label className="space-y-2">
                      <p className="text-sm font-semibold text-white">Cooldown Seconds</p>
                      <Input
                        value={String(draft.behavior.cooldownSeconds || 0)}
                        onChange={(event) => updateDraft((current) => {
                          current.behavior.cooldownSeconds = Number(event.target.value || 0);
                          return current;
                        })}
                        type="number"
                        min="0"
                        className="h-12 rounded-[18px] border-white/10 bg-[#0b0d11]"
                      />
                    </label>
                  </div>
                </SectionCard>

                <SectionCard title="Actions" description="Stack readable blocks, reorder them, and open a focused sheet for details." summary={draft.workflow.steps.length ? `${draft.workflow.steps.length} action blocks` : "No actions yet"}>
                  <div className="flex flex-wrap gap-2">
                    <Button className="rounded-[18px]" onClick={() => setActionSheetOpen(true)}>
                      <Plus className="h-4 w-4" />
                      Add Action
                    </Button>
                    <Button variant="outline" className="rounded-[18px] border-white/10 bg-white/[0.03]" onClick={() => setStudioSheetOpen(true)}>
                      <LayoutTemplate className="h-4 w-4" />
                      Pull From Studio
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {draft.workflow.steps.length ? draft.workflow.steps.map((step, index) => {
                      const meta = getActionMeta(step);
                      const Icon = meta.icon;
                      return (
                        <div key={step.id} className="rounded-[22px] border border-white/8 bg-[#111318] p-4">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-[16px] border border-white/8 bg-[#0b0d11]">
                              <Icon className={cn("h-4 w-4", meta.tint)} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-white">{step.label || meta.title}</p>
                                {draft.workflow.entryStepId === step.id ? (
                                  <span className="rounded-full border border-[#c5485d]/30 bg-[#261219] px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-white/80">
                                    Entry
                                  </span>
                                ) : null}
                              </div>
                              <p className="mt-2 text-sm leading-6 text-white/60">{summarizeStep(step)}</p>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap items-center gap-2">
                            <Button variant="outline" size="sm" className="rounded-[14px] border-white/10 bg-white/[0.03]" onClick={() => setEditingActionId(step.id)}>
                              Edit
                            </Button>
                            <Button variant="outline" size="sm" className="rounded-[14px] border-white/10 bg-white/[0.03]" onClick={() => duplicateAction(step.id)}>
                              <Copy className="h-3.5 w-3.5" />
                              Duplicate
                            </Button>
                            <Button variant="outline" size="sm" className="rounded-[14px] border-white/10 bg-white/[0.03]" onClick={() => moveAction(step.id, "up")} disabled={index === 0}>
                              <ArrowUp className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="outline" size="sm" className="rounded-[14px] border-white/10 bg-white/[0.03]" onClick={() => moveAction(step.id, "down")} disabled={index === draft.workflow.steps.length - 1}>
                              <ArrowDown className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="outline" size="sm" className="rounded-[14px] border-white/10 bg-white/[0.03] text-rose-100" onClick={() => removeAction(step.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      );
                    }) : (
                      <div className="rounded-[24px] border border-dashed border-white/10 bg-[#111318] p-5 text-sm leading-6 text-white/54">
                        This draft is actually blank right now. Add the first action when you are ready, or pull in a saved Studio surface for the visual output.
                      </div>
                    )}
                  </div>
                </SectionCard>

                <SectionCard title="Advanced">
                  <Accordion type="multiple" defaultValue={["behavior"]} className="space-y-3">
                    <AccordionItem value="behavior" className="rounded-[20px] border border-white/8 bg-[#0b0d11] px-4">
                      <AccordionTrigger className="text-white hover:no-underline">Behavior</AccordionTrigger>
                      <AccordionContent className="space-y-4 pt-2">
                        <div className="rounded-[18px] border border-white/8 bg-white/[0.03] p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-white">Log Runs</p>
                              <p className="mt-1 text-sm text-white/54">Keep command activity visible in the activity lane.</p>
                            </div>
                            <Switch
                              checked={draft.behavior.logRuns}
                              onCheckedChange={(checked) => updateDraft((current) => {
                                current.behavior.logRuns = checked;
                                return current;
                              })}
                            />
                          </div>
                        </div>
                        <label className="space-y-2">
                          <p className="text-sm font-semibold text-white">Runtime Error Message</p>
                          <Textarea
                            value={draft.fallbacks.runtimeErrorMessage || ""}
                            onChange={(event) => updateDraft((current) => {
                              current.fallbacks.runtimeErrorMessage = event.target.value;
                              return current;
                            })}
                            placeholder="Something went wrong. Try again in a moment."
                            className="min-h-[90px] rounded-[18px] border-white/10 bg-[#05070a]"
                          />
                        </label>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </SectionCard>
              </div>

              <div className={cn("space-y-4", previewMode === "build" && "hidden xl:block")}>
                <PreviewPanel draft={draft} issueSummary={issueSummary} />
                <div className="rounded-[20px] bg-white/[0.03]">
                  <div className="border-b border-white/[0.05] px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-white/35">Review Readiness</p>
                  </div>
                  <div className="space-y-3 p-4">
                    {!hasFreshValidation ? (
                      <div className="rounded-[18px] border border-amber-500/20 bg-amber-500/[0.08] p-4 text-sm text-white/78">
                        You changed this draft after the last review. Refresh validation so the preview and issues stay honest.
                      </div>
                    ) : null}
                    <div className="rounded-[18px] border border-white/8 bg-[#111318] p-4 text-sm leading-6 text-white/66">
                      <p>{preview.whatTriggers}</p>
                      <p className="mt-2">{preview.whatSends}</p>
                      <p className="mt-2">{preview.interactionsSummary}</p>
                    </div>
                    <Button className="w-full rounded-[18px]" onClick={() => validateCurrentDraft({ openReview: true })} disabled={dryRunMutation.isPending}>
                      <Rocket className="h-4 w-4" />
                      Review & Publish
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-[max(4.5rem,calc(4rem+env(safe-area-inset-bottom)))] z-30 border-t border-white/10 bg-[#090b0f]/95 px-4 pb-3 pt-3 backdrop-blur md:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row">
          <Button variant="outline" className="rounded-[18px] border-white/10 bg-white/[0.03] sm:flex-1" onClick={handleOpenNewDraft}>
            New Draft
          </Button>
          <Button variant="outline" className="rounded-[18px] border-white/10 bg-white/[0.03] sm:flex-1" onClick={() => validateCurrentDraft({ openReview: true })} disabled={dryRunMutation.isPending}>
            <Eye className="h-4 w-4" />
            Review
          </Button>
          <Button variant="outline" className="rounded-[18px] border-white/10 bg-white/[0.03] sm:flex-1" onClick={() => saveDraft(false)} disabled={createMutation.isPending || updateMutation.isPending || dryRunMutation.isPending}>
            <Save className="h-4 w-4" />
            Save Draft
          </Button>
          <Button className="rounded-[18px] sm:flex-1" onClick={() => saveDraft(true)} disabled={createMutation.isPending || updateMutation.isPending || dryRunMutation.isPending}>
            <Rocket className="h-4 w-4" />
            Publish
          </Button>
        </div>
      </div>

      <div className="h-28" />

      <Drawer open={starterOpen} onOpenChange={setStarterOpen}>
        <DrawerContent className="h-[92dvh] border-white/10 bg-[#090b0f] text-white">
          <DrawerHeader className="border-b border-white/8 px-4 pt-5">
            <DrawerTitle className="text-white">New Command Starter</DrawerTitle>
            <DrawerDescription>Start truly blank, begin from a template, duplicate an existing command, or jump into the import / AI flow.</DrawerDescription>
          </DrawerHeader>
          <div className="space-y-4 px-4 py-5">
            {starterMode === "root" ? (
              <>
                <button type="button" onClick={beginBlankDraft} className="block w-full rounded-[24px] border border-[#c5485d]/35 bg-[#1b0f15] p-5 text-left">
                  <p className="text-sm font-semibold text-white">Blank Command</p>
                  <p className="mt-2 text-sm leading-6 text-white/64">No fake name, no default action, and no fake sample data.</p>
                </button>
                <div className="grid gap-3">
                  <button type="button" onClick={() => setStarterMode("template")} className="rounded-[22px] border border-white/8 bg-[#111318] p-4 text-left transition hover:border-white/14 hover:bg-[#15181e]">
                    <p className="text-sm font-semibold text-white">From Template</p>
                    <p className="mt-2 text-sm leading-6 text-white/56">Choose a starter that already matches a common Discord workflow.</p>
                  </button>
                  <button type="button" onClick={() => setStarterMode("duplicate")} className="rounded-[22px] border border-white/8 bg-[#111318] p-4 text-left transition hover:border-white/14 hover:bg-[#15181e]">
                    <p className="text-sm font-semibold text-white">Duplicate Existing</p>
                    <p className="mt-2 text-sm leading-6 text-white/56">Clone a saved command into a new draft so you can branch it safely.</p>
                  </button>
                  <button type="button" onClick={() => navigate(buildArchivistItemPath(serverId, "commands", "import-export"))} className="rounded-[22px] border border-white/8 bg-[#111318] p-4 text-left transition hover:border-white/14 hover:bg-[#15181e]">
                    <p className="text-sm font-semibold text-white">Generate With AI / Import JSON</p>
                    <p className="mt-2 text-sm leading-6 text-white/56">Use the stricter AI prompt builder and import-safe validator.</p>
                  </button>
                </div>
              </>
            ) : null}

            {starterMode === "template" ? (
              <div className="space-y-3">
                <Button variant="outline" className="rounded-[18px] border-white/10 bg-white/[0.03]" onClick={() => setStarterMode("root")}>Back</Button>
                {WORKFLOW_STARTER_TEMPLATES.map((template) => (
                  <button key={template.id} type="button" onClick={() => beginTemplateDraft(template.id)} className="block w-full rounded-[22px] border border-white/8 bg-[#111318] p-4 text-left transition hover:border-white/14 hover:bg-[#15181e]">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-white">{template.label}</p>
                      <span className="rounded-full border border-white/10 bg-[#0c0f13] px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-white/68">
                        {template.complexity}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-white/56">{template.description}</p>
                  </button>
                ))}
              </div>
            ) : null}

            {starterMode === "duplicate" ? (
              <div className="space-y-4">
                <Button variant="outline" className="rounded-[18px] border-white/10 bg-white/[0.03]" onClick={() => setStarterMode("root")}>Back</Button>
                <Select value={duplicateSourceId} onValueChange={setDuplicateSourceId}>
                  <SelectTrigger className="h-12 rounded-[18px] border-white/10 bg-[#0b0d11]">
                    <SelectValue placeholder="Choose a saved command" />
                  </SelectTrigger>
                  <SelectContent>
                    {commands.map((command) => (
                      <SelectItem key={command.id} value={String(command.id)}>{command.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button className="w-full rounded-[18px]" onClick={beginDuplicateDraft}>Duplicate Into New Draft</Button>
              </div>
            ) : null}
          </div>
          <DrawerFooter className="border-t border-white/8 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <Button variant="outline" className="rounded-[18px] border-white/10 bg-white/[0.03]" onClick={() => setStarterOpen(false)}>Close</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Drawer open={actionSheetOpen} onOpenChange={setActionSheetOpen}>
        <DrawerContent className="h-[92dvh] border-white/10 bg-[#090b0f] text-white">
          <DrawerHeader className="border-b border-white/8 px-4 pt-5">
            <DrawerTitle className="text-white">Add Action</DrawerTitle>
            <DrawerDescription>Choose the next behavior block for this workflow.</DrawerDescription>
          </DrawerHeader>
          <div className="space-y-5 px-4 py-5">
            {ACTION_GROUPS.map((group) => (
              <div key={group.title} className="space-y-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/42">{group.title}</p>
                <div className="grid gap-3">
                  {group.actions.map((action) => (
                    <button key={action.id} type="button" onClick={() => addAction(action.id)} className="rounded-[22px] border border-white/8 bg-[#111318] p-4 text-left transition hover:border-white/14 hover:bg-[#15181e]">
                      <p className="text-sm font-semibold text-white">{action.label}</p>
                      <p className="mt-2 text-sm leading-6 text-white/56">{action.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer open={studioSheetOpen} onOpenChange={setStudioSheetOpen}>
        <DrawerContent className="h-[92dvh] border-white/10 bg-[#090b0f] text-white">
          <DrawerHeader className="border-b border-white/8 px-4 pt-5">
            <DrawerTitle className="text-white">Studio Asset Selector</DrawerTitle>
            <DrawerDescription>Pull a saved Studio message or embed into this workflow without embedding the Studio editor here.</DrawerDescription>
          </DrawerHeader>
          <div className="space-y-3 px-4 py-5">
            {studioDocuments.length ? studioDocuments.map((document) => (
              <button key={document.id} type="button" onClick={() => applyStudioDocument(String(document.id))} className="block w-full rounded-[22px] border border-white/8 bg-[#111318] p-4 text-left transition hover:border-white/14 hover:bg-[#15181e]">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">{document.name}</p>
                  <span className="rounded-full border border-white/10 bg-[#0c0f13] px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-white/68">
                    {document.kind}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-white/56">Updated {formatDate(document.updatedAt)}.</p>
              </button>
            )) : (
              <div className="rounded-[24px] border border-dashed border-white/10 bg-[#111318] p-5 text-sm leading-6 text-white/54">
                No Studio documents are saved for this server yet.
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer open={Boolean(editingAction)} onOpenChange={(open) => !open && setEditingActionId(null)}>
        <DrawerContent className="h-[92dvh] border-white/10 bg-[#090b0f] text-white">
          <DrawerHeader className="border-b border-white/8 px-4 pt-5">
            <DrawerTitle className="text-white">{editingAction ? getActionMeta(editingAction).title : "Edit Action"}</DrawerTitle>
            <DrawerDescription>Keep each action readable at a glance, then open this sheet for the detailed fields.</DrawerDescription>
          </DrawerHeader>
          {editingAction ? (
            <div className="space-y-4 px-4 py-5">
              <label className="space-y-2">
                <p className="text-sm font-semibold text-white">Action Label</p>
                <Input
                  value={editingAction.label || ""}
                  onChange={(event) => updateAction(editingAction.id, (step) => ({ ...step, label: event.target.value }))}
                  className="h-12 rounded-[18px] border-white/10 bg-[#0b0d11]"
                />
              </label>
              {"content" in editingAction ? (
                <label className="space-y-2">
                  <p className="text-sm font-semibold text-white">Content</p>
                  <Textarea
                    value={editingAction.content || ""}
                    onChange={(event) => updateAction(editingAction.id, (step) => ({ ...step, content: event.target.value } as CustomCommandV2WorkflowStep))}
                    className="min-h-[150px] rounded-[18px] border-white/10 bg-[#0b0d11]"
                  />
                </label>
              ) : null}
              {editingAction.type === "send_embed" ? (
                <>
                  <Input
                    value={editingAction.embed.title || ""}
                    onChange={(event) => updateAction(editingAction.id, (step) => {
                      const current = step as Extract<CustomCommandV2WorkflowStep, { type: "send_embed" }>;
                      return { ...current, embed: { ...current.embed, title: event.target.value } };
                    })}
                    placeholder="Embed title"
                    className="h-12 rounded-[18px] border-white/10 bg-[#0b0d11]"
                  />
                  <Textarea
                    value={editingAction.embed.description || ""}
                    onChange={(event) => updateAction(editingAction.id, (step) => {
                      const current = step as Extract<CustomCommandV2WorkflowStep, { type: "send_embed" }>;
                      return { ...current, embed: { ...current.embed, description: event.target.value } };
                    })}
                    placeholder="Embed description"
                    className="min-h-[130px] rounded-[18px] border-white/10 bg-[#0b0d11]"
                  />
                </>
              ) : null}
              {(editingAction.type === "add_role" || editingAction.type === "remove_role") ? (
                <Input
                  value={editingAction.roleId}
                  onChange={(event) => updateAction(editingAction.id, (step) => ({ ...step, roleId: event.target.value }))}
                  placeholder={roles[0]?.id || "role-id"}
                  className="h-12 rounded-[18px] border-white/10 bg-[#0b0d11]"
                />
              ) : null}
              {editingAction.type === "check_permission" ? (
                <Input
                  value={editingAction.permissions.join(", ")}
                  onChange={(event) => updateAction(editingAction.id, (step) => ({ ...step, permissions: parseList(event.target.value) }))}
                  placeholder="manage_messages, manage_roles"
                  className="h-12 rounded-[18px] border-white/10 bg-[#0b0d11]"
                />
              ) : null}
              {editingAction.type === "branch_if" ? (
                <>
                  <Input
                    value={editingAction.condition.left.source === "context" ? editingAction.condition.left.key : ""}
                    onChange={(event) => updateAction(editingAction.id, (step) => {
                      const current = step as Extract<CustomCommandV2WorkflowStep, { type: "branch_if" }>;
                      return {
                        ...current,
                        condition: { ...current.condition, left: { source: "context", key: event.target.value } },
                      };
                    })}
                    placeholder="context key"
                    className="h-12 rounded-[18px] border-white/10 bg-[#0b0d11]"
                  />
                  <Input
                    value={editingAction.condition.right?.source === "literal" ? String(editingAction.condition.right.value ?? "") : ""}
                    onChange={(event) => updateAction(editingAction.id, (step) => {
                      const current = step as Extract<CustomCommandV2WorkflowStep, { type: "branch_if" }>;
                      return {
                        ...current,
                        condition: { ...current.condition, right: { source: "literal", value: event.target.value } },
                      };
                    })}
                    placeholder="literal match value"
                    className="h-12 rounded-[18px] border-white/10 bg-[#0b0d11]"
                  />
                </>
              ) : null}
            </div>
          ) : null}
        </DrawerContent>
      </Drawer>

      <Drawer open={reviewOpen} onOpenChange={setReviewOpen}>
        <DrawerContent className="h-[92dvh] border-white/10 bg-[#090b0f] text-white">
          <DrawerHeader className="border-b border-white/8 px-4 pt-5">
            <DrawerTitle className="text-white">Review / Publish</DrawerTitle>
            <DrawerDescription>Confirm the trigger, action summary, preview, and validation before this goes live.</DrawerDescription>
          </DrawerHeader>
          <div className="space-y-4 px-4 py-5">
            <div className="rounded-[24px] border border-white/8 bg-[#111318] p-4">
              <div className="flex flex-wrap items-center gap-2">
                <DraftBadge draft={draft} issues={lastIssues} />
                {hasFreshValidation ? (
                  <span className="rounded-full border border-emerald-500/20 bg-emerald-500/[0.08] px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white">
                    Fresh Validation
                  </span>
                ) : (
                  <span className="rounded-full border border-amber-500/20 bg-amber-500/[0.08] px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white">
                    Needs Review
                  </span>
                )}
              </div>
              <p className="mt-4 text-sm font-semibold text-white">{draft.meta.name || "Untitled Command"}</p>
              <p className="mt-2 text-sm leading-6 text-white/62">{preview.whatTriggers}</p>
              <p className="mt-2 text-sm leading-6 text-white/62">{preview.whatSends}</p>
            </div>

            <PreviewPanel draft={draft} issueSummary={issueSummary} />

            {reviewWarnings.length ? (
              <div className="space-y-3">
                {reviewWarnings.map((issue, index) => (
                  <div key={`${issue.path}-${index}`} className={cn("rounded-[18px] border p-4", issue.severity === "error" ? "border-rose-500/20 bg-rose-500/[0.08]" : "border-amber-500/20 bg-amber-500/[0.08]")}>
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-white/80" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white">{issue.message}</p>
                        <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-white/42">{issue.path}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[18px] border border-emerald-500/20 bg-emerald-500/[0.08] p-4 text-sm text-white">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>No current validation warnings. This draft looks ready for save or publish.</p>
                </div>
              </div>
            )}

            <div className="rounded-[20px] border border-white/8 bg-[#111318] p-4">
              <p className="text-sm font-semibold text-white">Sample Test Input</p>
              <Textarea
                value={testInputJson}
                onChange={(event) => setTestInputJson(event.target.value)}
                className="mt-3 min-h-[120px] rounded-[18px] border-white/10 bg-[#0b0d11] font-mono text-sm"
              />
            </div>
          </div>
          <DrawerFooter className="border-t border-white/8 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div className="grid gap-2 sm:grid-cols-3">
              <Button variant="outline" className="rounded-[18px] border-white/10 bg-white/[0.03]" onClick={() => validateCurrentDraft()} disabled={dryRunMutation.isPending}>
                Refresh Review
              </Button>
              <Button variant="outline" className="rounded-[18px] border-white/10 bg-white/[0.03]" onClick={() => saveDraft(false)} disabled={createMutation.isPending || updateMutation.isPending || dryRunMutation.isPending}>
                Save Draft
              </Button>
              <Button className="rounded-[18px]" onClick={() => saveDraft(true)} disabled={createMutation.isPending || updateMutation.isPending || dryRunMutation.isPending}>
                Publish
              </Button>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
