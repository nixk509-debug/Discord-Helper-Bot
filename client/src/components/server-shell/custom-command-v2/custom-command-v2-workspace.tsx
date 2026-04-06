import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  Copy,
  Plus,
  Rocket,
  Save,
  TestTube2,
  Trash2,
  WandSparkles,
} from "lucide-react";
import type {
  CustomCommandV2Compiled,
  CustomCommandV2Definition,
  CustomCommandV2Issue,
  CustomCommandV2JsonValue,
  CustomCommandV2VariableDeclaration,
  CustomCommandV2WorkflowStep,
} from "@shared/custom-command-v2";
import { summarizeCustomCommandV2 } from "@shared/custom-command-v2";
import {
  isApiIssuesError,
  useCreateCommandV2,
  useDeleteCommandV2,
  useDryRunCommandV2,
  useServerCommandsV2,
  useUpdateCommandV2,
  type ArchivistCommandV2,
} from "@/hooks/use-bot";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { CustomCommandV2ImportModal } from "./custom-command-v2-import-modal";
import {
  TRIGGER_OPTIONS,
  WORKFLOW_BUILDER_STAGES,
  WORKFLOW_STEP_OPTIONS,
  WORKFLOW_STARTER_TEMPLATES,
  buildWorkflowSavePayload,
  cloneWorkflowDefinition,
  createWorkflowDraft,
  createWorkflowStarterTemplate,
  createWorkflowStepTemplate,
  createWorkflowTriggerTemplate,
  getWorkflowTriggerLabel,
  summarizeIssues,
  type WorkflowBuilderStage,
} from "./custom-command-v2-model";

type SelectionState = number | "new" | null;
type MobileWorkspacePanel = "library" | "build" | "review";
type LibraryStatusFilter = "all" | "live" | "draft" | "issues";
type LibrarySortMode = "recent" | "name" | "trigger" | "steps";
type ButtonRowStep = Extract<CustomCommandV2WorkflowStep, { type: "add_button_row" }>;
type ButtonRowItem = ButtonRowStep["buttons"][number];
type SelectMenuStep = Extract<CustomCommandV2WorkflowStep, { type: "add_select_menu" }>;
type SelectMenuOption = SelectMenuStep["options"][number];
type ModalStep = Extract<CustomCommandV2WorkflowStep, { type: "open_modal" }>;
type ModalField = ModalStep["fields"][number];

function formatDate(value: string | Date | null | undefined) {
  if (!value) return "Recently";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function parseJsonRecord(value: string, fallback: Record<string, CustomCommandV2JsonValue> = {}) {
  if (!value.trim()) {
    return {
      value: fallback,
      error: null,
    };
  }
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return {
        value: parsed as Record<string, CustomCommandV2JsonValue>,
        error: null,
      };
    }
    return {
      value: fallback,
      error: "Archivist needs one JSON object here, not an array or plain value.",
    };
  } catch (error) {
    return {
      value: fallback,
      error: error instanceof Error ? error.message : "Archivist could not parse that JSON object.",
    };
  }
}

function parseStringRecord(value: string, fallback: Record<string, string> = {}) {
  if (!value.trim()) {
    return {
      value: fallback,
      error: null,
    };
  }
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const normalized = Object.entries(parsed).reduce<Record<string, string>>((next, [key, entry]) => {
        if (typeof entry === "string") {
          next[key] = entry;
        }
        return next;
      }, {});
      if (Object.keys(normalized).length === Object.keys(parsed as Record<string, unknown>).length) {
        return {
          value: normalized,
          error: null,
        };
      }
    }
    return {
      value: fallback,
      error: "Archivist needs one JSON object with string values here.",
    };
  } catch (error) {
    return {
      value: fallback,
      error: error instanceof Error ? error.message : "Archivist could not parse that headers object.",
    };
  }
}

function parseJsonValueInput(value: string): CustomCommandV2JsonValue | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  try {
    return JSON.parse(trimmed) as CustomCommandV2JsonValue;
  } catch {
    return value;
  }
}

function formatJsonValueInput(value: CustomCommandV2JsonValue | undefined) {
  if (typeof value === "undefined") return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

function getWorkflowStepSummary(step: CustomCommandV2WorkflowStep) {
  switch (step.type) {
    case "send_message":
      return step.content.trim() || "Sends a channel message.";
    case "send_embed":
      return step.embed.title || step.embed.description || "Sends a Discord-style embed.";
    case "reply_ephemeral":
      return step.content.trim() || "Replies privately when supported.";
    case "add_button_row":
      return `${step.buttons.length} button${step.buttons.length === 1 ? "" : "s"} in ${step.responseMode} mode.`;
    case "on_button_click":
      return `${step.customIds.length} button trigger${step.customIds.length === 1 ? "" : "s"} waiting for input.`;
    case "add_select_menu":
      return `${step.options.length} select option${step.options.length === 1 ? "" : "s"} on ${step.customId}.`;
    case "on_select":
      return `Waits on ${step.customId}${step.acceptedValues.length ? ` for ${step.acceptedValues.join(", ")}` : ""}.`;
    case "open_modal":
      return `${step.title} with ${step.fields.length} field${step.fields.length === 1 ? "" : "s"}.`;
    case "save_input":
      return `Saves ${step.inputKey} into ${step.variableKey}.`;
    case "set_variable":
      return `${step.operation} ${step.variableKey}.`;
    case "add_role":
      return `Adds role ${step.roleId} to the ${step.target}.`;
    case "remove_role":
      return `Removes role ${step.roleId} from the ${step.target}.`;
    case "check_permission":
      return `Checks ${step.permissions.join(", ")} (${step.mode}).`;
    case "check_cooldown":
      return `Checks ${step.scope || "user"} cooldown for ${step.seconds || 0}s.`;
    case "branch_if":
      return `Branches when ${step.condition.operator} matches.`;
    case "call_webhook":
      return `${step.method} ${step.url}`;
    case "log_action":
      return `${step.level.toUpperCase()}: ${step.message}`;
    case "fallback_response":
      return step.content.trim() || "Sends a graceful fallback response.";
    default:
      return "Workflow step";
  }
}

function FlowField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="space-y-2">
      <div>
        <p className="text-sm font-semibold text-white">{label}</p>
        {hint ? <p className="mt-1 text-xs leading-5 text-white/54">{hint}</p> : null}
      </div>
      {children}
    </label>
  );
}

function SmallBadge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium tracking-[0.08em] text-white/70">
      {children}
    </span>
  );
}

function BuilderHelperStrip({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[18px] border border-dashed border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="text-xs leading-5 text-white/48">{description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {children}
        </div>
      </div>
    </div>
  );
}

function BuilderItemCard({
  title,
  subtitle,
  onRemove,
  removeDisabled = false,
  children,
}: {
  title: string;
  subtitle?: string;
  onRemove: () => void;
  removeDisabled?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-4 rounded-[18px] border border-white/10 bg-[#151920] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-white">{title}</p>
          {subtitle ? <p className="text-xs text-white/42">{subtitle}</p> : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 rounded-full px-3 text-rose-200 hover:bg-rose-500/10 hover:text-rose-100"
          onClick={onRemove}
          disabled={removeDisabled}
        >
          Remove
        </Button>
      </div>
      {children}
    </div>
  );
}

function StepEditorSurface({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="border-white/10 bg-[#0f1217] shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-xl text-white">{title}</CardTitle>
            <CardDescription className="max-w-2xl">{description}</CardDescription>
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function StepItemCard({
  title,
  meta,
  onRemove,
  children,
}: {
  title: string;
  meta: string;
  onRemove: () => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-[#151920] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.14)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="text-xs leading-5 text-white/50">{meta}</p>
        </div>
        <Button type="button" variant="ghost" size="sm" className="rounded-full text-white/65 hover:bg-white/5 hover:text-white" onClick={onRemove}>
          Remove
        </Button>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">{children}</div>
    </div>
  );
}

function QuickActionButton({
  label,
  description,
  onClick,
}: {
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className="h-auto justify-start rounded-[16px] border-white/10 bg-white/[0.03] px-4 py-3 text-left"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <Plus className="mt-0.5 h-4 w-4 shrink-0" />
        <span className="space-y-1 text-left">
          <span className="block text-sm font-semibold text-white">{label}</span>
          <span className="block text-xs leading-5 text-white/54">{description}</span>
        </span>
      </div>
    </Button>
  );
}

function buildButtonPreset(step: ButtonRowStep, kind: "primary" | "secondary" | "success" | "danger" | "link"): ButtonRowItem {
  const index = step.buttons.length + 1;
  const base = {
    id: `button-${index}`,
    customId: `archivist:button:${kind}:${index}`,
    nextStepId: `after-${kind}-${index}`,
  };

  switch (kind) {
    case "secondary":
      return { ...base, label: "More info", style: "secondary" };
    case "success":
      return { ...base, label: "Confirm", style: "success" };
    case "danger":
      return { ...base, label: "Cancel", style: "danger" };
    case "link":
      return { ...base, label: "Open link", style: "link", url: "https://example.com" };
    case "primary":
    default:
      return { ...base, label: "Continue", style: "primary" };
  }
}

function buildButtonStarterRow(step: ButtonRowStep) {
  const start = step.buttons.length;
  return [
    {
      id: `button-${start + 1}`,
      label: "Confirm",
      customId: `archivist:button:confirm:${start + 1}`,
      style: "success",
      nextStepId: `confirm-${start + 1}`,
    },
    {
      id: `button-${start + 2}`,
      label: "More info",
      customId: `archivist:button:info:${start + 2}`,
      style: "secondary",
      nextStepId: `info-${start + 2}`,
    },
    {
      id: `button-${start + 3}`,
      label: "Cancel",
      customId: `archivist:button:cancel:${start + 3}`,
      style: "danger",
      nextStepId: `cancel-${start + 3}`,
    },
  ] satisfies ButtonRowItem[];
}

function buildSelectOptionPreset(step: SelectMenuStep, kind: "yes_no" | "triage" | "roles"): SelectMenuOption[] {
  const start = step.options.length;
  if (kind === "roles") {
    return [
      {
        label: "Support",
        value: `support-${start + 1}`,
        description: "Get help from staff",
        nextStepId: `support-${start + 1}`,
      },
      {
        label: "Announcements",
        value: `announcements-${start + 2}`,
        description: "Stay in the loop",
        nextStepId: `announcements-${start + 2}`,
      },
      {
        label: "Updates",
        value: `updates-${start + 3}`,
        description: "Product and server updates",
        nextStepId: `updates-${start + 3}`,
      },
    ];
  }

  if (kind === "triage") {
    return [
      {
        label: "Report a bug",
        value: `bug-${start + 1}`,
        description: "Something is broken",
        nextStepId: `bug-${start + 1}`,
      },
      {
        label: "Ask a question",
        value: `question-${start + 2}`,
        description: "Need a quick answer",
        nextStepId: `question-${start + 2}`,
      },
      {
        label: "General feedback",
        value: `feedback-${start + 3}`,
        description: "Send a suggestion",
        nextStepId: `feedback-${start + 3}`,
      },
    ];
  }

  return [
    {
      label: "Yes",
      value: `yes-${start + 1}`,
      description: "Choose yes",
      nextStepId: `yes-${start + 1}`,
    },
    {
      label: "No",
      value: `no-${start + 2}`,
      description: "Choose no",
      nextStepId: `no-${start + 2}`,
    },
  ];
}

function buildModalPreset(step: ModalStep, kind: "application" | "support" | "feedback") {
  if (kind === "support") {
    return {
      customId: step.customId || "support-modal",
      title: "Support Request",
      fields: [
        { id: "topic", label: "Topic", style: "short", required: true },
        { id: "details", label: "Details", style: "paragraph", required: true, maxLength: 2000 },
      ] satisfies ModalField[],
      nextStepId: step.nextStepId || "after-support",
      onCancelStepId: step.onCancelStepId || "support-cancel",
    };
  }

  if (kind === "feedback") {
    return {
      customId: step.customId || "feedback-modal",
      title: "Feedback",
      fields: [
        { id: "summary", label: "Summary", style: "short", required: true },
        { id: "details", label: "Details", style: "paragraph", required: false, maxLength: 2000 },
      ] satisfies ModalField[],
      nextStepId: step.nextStepId || "after-feedback",
      onCancelStepId: step.onCancelStepId || "feedback-cancel",
    };
  }

  return {
    customId: step.customId || "application-modal",
    title: "Application",
    fields: [
      { id: "name", label: "Name", style: "short", required: true },
      { id: "experience", label: "Experience", style: "paragraph", required: true, maxLength: 2000 },
      { id: "goals", label: "Goals", style: "paragraph", required: false, maxLength: 2000 },
    ] satisfies ModalField[],
    nextStepId: step.nextStepId || "after-application",
    onCancelStepId: step.onCancelStepId || "application-cancel",
  };
}

function updateDefinition(definition: CustomCommandV2Definition, updater: (next: CustomCommandV2Definition) => void) {
  const next = cloneWorkflowDefinition(definition);
  updater(next);
  return next;
}

function cloneWorkflowStep(step: CustomCommandV2WorkflowStep) {
  return JSON.parse(JSON.stringify(step)) as CustomCommandV2WorkflowStep;
}

function buildUniqueStepId(steps: CustomCommandV2WorkflowStep[], baseId: string) {
  const normalizedBase = (baseId || "step")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9:_-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "step";
  const existingIds = new Set(steps.map((step) => step.id));
  if (!existingIds.has(normalizedBase)) return normalizedBase;

  let counter = 2;
  while (existingIds.has(`${normalizedBase}-${counter}`)) {
    counter += 1;
  }
  return `${normalizedBase}-${counter}`;
}

function createSuggestedTestInput(definition: CustomCommandV2Definition): Record<string, CustomCommandV2JsonValue> {
  switch (definition.trigger.type) {
    case "keyword":
      return {
        message: definition.trigger.pattern,
      };
    case "button":
      return {
        customId: definition.trigger.customId,
      };
    case "select":
      return {
        customId: definition.trigger.customId,
        value: definition.trigger.acceptedValues[0] || "option-a",
      };
    case "modal_submit":
      return {
        customId: definition.trigger.customId,
      };
    case "schedule":
      return {
        scheduledAt: new Date().toISOString(),
      };
    case "join":
      return {
        memberId: "USER_ID",
      };
    case "role_add":
      return {
        addedRoleIds: definition.trigger.roleIds.length ? definition.trigger.roleIds : ["ROLE_ID"],
      };
    case "reaction":
      return {
        emoji: definition.trigger.emoji,
      };
    case "slash":
    default:
      return {};
  }
}

function formatSuggestedTestInput(definition: CustomCommandV2Definition) {
  return JSON.stringify(createSuggestedTestInput(definition), null, 2);
}

function getStepSetupHint(step: CustomCommandV2WorkflowStep) {
  switch (step.type) {
    case "send_message":
      return step.content.trim() ? null : "Add the message content.";
    case "reply_ephemeral":
      return step.content.trim() || step.embed ? null : "Add a private reply or embed.";
    case "add_role":
    case "remove_role":
      return step.roleId.trim() ? null : "Add the role ID this step should use.";
    case "on_button_click":
      return step.nextStepId.trim() ? null : "Choose which step runs after the button click.";
    case "on_select":
      return step.nextStepId.trim() ? null : "Choose which step runs after the select menu.";
    case "branch_if":
      return step.trueStepId.trim() ? null : "Point the true branch to a real next step.";
    case "call_webhook":
      return step.url.trim() ? null : "Add the webhook URL before this can run.";
    default:
      return null;
  }
}

export function CustomCommandV2Workspace({
  serverId,
  initialSelection,
}: {
  serverId: number;
  initialSelection?: SelectionState;
}) {
  const { toast } = useToast();
  const commandsQuery = useServerCommandsV2(serverId);
  const createMutation = useCreateCommandV2(serverId);
  const updateMutation = useUpdateCommandV2(serverId);
  const deleteMutation = useDeleteCommandV2(serverId);
  const dryRunMutation = useDryRunCommandV2(serverId);

  const [selection, setSelection] = useState<SelectionState>(initialSelection ?? "new");
  const [mobilePanel, setMobilePanel] = useState<MobileWorkspacePanel>("build");
  const [builderStage, setBuilderStage] = useState<WorkflowBuilderStage>("setup");
  const [draft, setDraft] = useState<CustomCommandV2Definition>(() => createWorkflowDraft());
  const [importOpen, setImportOpen] = useState(false);
  const [testInputJson, setTestInputJson] = useState("{}");
  const [testInputError, setTestInputError] = useState<string | null>(null);
  const [testPermissions, setTestPermissions] = useState("");
  const [testRoles, setTestRoles] = useState("");
  const [testOwner, setTestOwner] = useState(false);
  const [testPremium, setTestPremium] = useState(false);
  const [lastCompiled, setLastCompiled] = useState<CustomCommandV2Compiled | null>(null);
  const [lastIssues, setLastIssues] = useState<CustomCommandV2Issue[]>([]);
  const [lastDryRun, setLastDryRun] = useState<any>(null);
  const [lastValidatedFingerprint, setLastValidatedFingerprint] = useState<string | null>(null);
  const [loadedDraftFingerprint, setLoadedDraftFingerprint] = useState<string | null>(null);
  const [loadedSelectionKey, setLoadedSelectionKey] = useState<string | null>("new");
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);
  const [lastBuildStage, setLastBuildStage] = useState<WorkflowBuilderStage>("setup");
  const [mobileKeyboardOpen, setMobileKeyboardOpen] = useState(false);
  const [libraryQuery, setLibraryQuery] = useState("");
  const [libraryTriggerFilter, setLibraryTriggerFilter] = useState<CustomCommandV2Definition["trigger"]["type"] | "all">("all");
  const [libraryStatusFilter, setLibraryStatusFilter] = useState<LibraryStatusFilter>("all");
  const [librarySortMode, setLibrarySortMode] = useState<LibrarySortMode>("recent");

  const commands = commandsQuery.data || [];
  const selectedCommand = useMemo(
    () => (typeof selection === "number" ? commands.find((command) => command.id === selection) || null : null),
    [commands, selection],
  );
  const filteredCommands = useMemo(() => {
    const query = libraryQuery.trim().toLowerCase();
    const next = commands.filter((command) => {
      if (libraryTriggerFilter !== "all" && command.triggerType !== libraryTriggerFilter) return false;

      const commandIssues = summarizeIssues(command.lastValidation || []);
      if (libraryStatusFilter === "live" && !command.enabled) return false;
      if (libraryStatusFilter === "draft" && command.enabled) return false;
      if (libraryStatusFilter === "issues" && commandIssues.errors + commandIssues.warnings === 0) return false;

      if (!query) return true;
      const haystack = [
        command.name,
        command.slug,
        command.triggerType,
        command.definition.meta.description || "",
        command.definition.meta.category || "",
        ...(command.definition.meta.tags || []),
      ].join(" ").toLowerCase();
      return haystack.includes(query);
    });

    next.sort((left, right) => {
      if (librarySortMode === "name") return left.name.localeCompare(right.name);
      if (librarySortMode === "trigger") return left.triggerType.localeCompare(right.triggerType);
      if (librarySortMode === "steps") return right.definition.workflow.steps.length - left.definition.workflow.steps.length;
      return new Date(right.updatedAt || 0).getTime() - new Date(left.updatedAt || 0).getTime();
    });

    return next;
  }, [commands, libraryQuery, libraryTriggerFilter, libraryStatusFilter, librarySortMode]);
  const draftFingerprint = useMemo(() => JSON.stringify(draft), [draft]);
  const loadedSelectionIdentity = useMemo(() => {
    if (selection === "new") return "new";
    if (selectedCommand) {
      return `command:${selectedCommand.id}:${selectedCommand.updatedAt || selectedCommand.createdAt || ""}`;
    }
    return selection ? `missing:${selection}` : null;
  }, [selectedCommand, selection]);
  const draftDirty = loadedDraftFingerprint !== null && loadedDraftFingerprint !== draftFingerprint;
  const issueSummary = summarizeIssues(lastIssues);
  const draftPreview = useMemo(() => summarizeCustomCommandV2(draft), [draft]);
  const hasFreshValidation = lastValidatedFingerprint === draftFingerprint;
  const currentStage = WORKFLOW_BUILDER_STAGES.find((stage) => stage.value === builderStage) || WORKFLOW_BUILDER_STAGES[0];
  const currentStageIndex = WORKFLOW_BUILDER_STAGES.findIndex((stage) => stage.value === builderStage);
  const mobileActionBarVisible = mobilePanel !== "library" && !mobileKeyboardOpen;

  const loadFreshDraft = () => {
    const nextDefinition = createWorkflowDraft();
    setDraft(nextDefinition);
    setSelection("new");
    setLastCompiled(null);
    setLastIssues([]);
    setLastDryRun(null);
    setLastValidatedFingerprint(null);
    setLoadedDraftFingerprint(JSON.stringify(nextDefinition));
    setLoadedSelectionKey("new");
    setBuilderStage("setup");
    setLastBuildStage("setup");
    setExpandedStepId(nextDefinition.workflow.steps[0]?.id || null);
    setTestInputJson(formatSuggestedTestInput(nextDefinition));
    setTestInputError(null);
    setMobilePanel("build");
  };

  useEffect(() => {
    if (typeof initialSelection === "undefined") return;
    setSelection(initialSelection);
    setMobilePanel("build");
    setBuilderStage("setup");
    setLastBuildStage("setup");
  }, [initialSelection]);

  useEffect(() => {
    if (loadedSelectionIdentity && loadedSelectionIdentity === loadedSelectionKey) {
      if (!selection && commands.length > 0) {
        setSelection(commands[0].id);
      }
      return;
    }

    if (selectedCommand) {
      const nextDefinition = cloneWorkflowDefinition(selectedCommand.definition);
      setDraft(nextDefinition);
      setLastCompiled(selectedCommand.compiled);
      setLastIssues(selectedCommand.lastValidation || []);
      setLastDryRun(null);
      setLastValidatedFingerprint(JSON.stringify(nextDefinition));
      setLoadedDraftFingerprint(JSON.stringify(nextDefinition));
      setLoadedSelectionKey(loadedSelectionIdentity);
      setBuilderStage("setup");
      setLastBuildStage("setup");
      setExpandedStepId(nextDefinition.workflow.steps[0]?.id || null);
      setTestInputJson(formatSuggestedTestInput(nextDefinition));
      setTestInputError(null);
      return;
    }

    if (selection === "new") {
      loadFreshDraft();
      return;
    }

    if (!selection && commands.length > 0) {
      setSelection(commands[0].id);
    }
  }, [commands, loadedSelectionIdentity, loadedSelectionKey, selectedCommand, selection]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const isEditableElement = (element: Element | null) =>
      element instanceof HTMLElement
      && (element.matches("input, textarea, [contenteditable='true']") || element.getAttribute("role") === "textbox");

    const refreshKeyboardState = () => {
      const active = document.activeElement;
      setMobileKeyboardOpen(isEditableElement(active));
    };

    const handleFocusIn = () => refreshKeyboardState();
    const handleFocusOut = () => window.setTimeout(refreshKeyboardState, 40);

    window.addEventListener("focusin", handleFocusIn);
    window.addEventListener("focusout", handleFocusOut);

    refreshKeyboardState();

    return () => {
      window.removeEventListener("focusin", handleFocusIn);
      window.removeEventListener("focusout", handleFocusOut);
    };
  }, []);

  const openSelection = (nextSelection: SelectionState) => {
    if (nextSelection !== selection && draftDirty) {
      const shouldDiscard = window.confirm("Discard your unsaved Archivist command edits?");
      if (!shouldDiscard) return;
    }
    if (nextSelection === "new" && selection === "new") {
      if (draftDirty) {
        const shouldDiscard = window.confirm("Discard your unsaved Archivist command edits and start a fresh command?");
        if (!shouldDiscard) return;
      }
      loadFreshDraft();
      return;
    }
    setSelection(nextSelection);
    setMobilePanel("build");
    setBuilderStage("setup");
    setLastBuildStage("setup");
  };

  const goToStage = (stage: WorkflowBuilderStage) => {
    if (stage !== "review") {
      setLastBuildStage(stage);
    }
    setBuilderStage(stage);
    if (stage === "review") {
      setMobilePanel("review");
      return;
    }
    setMobilePanel("build");
  };

  const moveBackward = () => {
    if (builderStage === "review" || mobilePanel === "review") {
      goToStage(lastBuildStage === "review" ? "rules" : lastBuildStage);
      return;
    }
    if (currentStageIndex <= 0) {
      setMobilePanel("library");
      return;
    }
    goToStage(WORKFLOW_BUILDER_STAGES[currentStageIndex - 1].value);
  };

  const moveForward = () => {
    if (builderStage === "rules") {
      goToStage("review");
      return;
    }
    if (currentStageIndex < 0 || currentStageIndex >= WORKFLOW_BUILDER_STAGES.length - 1) return;
    goToStage(WORKFLOW_BUILDER_STAGES[currentStageIndex + 1].value);
  };

  const commitReviewResult = (
    result: { compiled: CustomCommandV2Compiled; issues?: CustomCommandV2Issue[] },
    options: { keepTrace: boolean },
  ) => {
    setLastCompiled(result.compiled);
    setLastIssues(result.issues || []);
    setLastValidatedFingerprint(draftFingerprint);
    if (!options.keepTrace) {
      setLastDryRun(null);
    }
  };

  const validateCurrentDraft = async (options: { quiet?: boolean; focusReview?: boolean } = {}) => {
    try {
      const result = await dryRunMutation.mutateAsync({
        definition: draft,
        actor: {
          permissions: [],
          roleIds: [],
          isOwner: false,
          isPremium: false,
        },
        channel: {},
        input: {},
      });
      commitReviewResult(result, { keepTrace: false });
      if (!options.quiet) {
        if (result.issues?.some((entry: any) => entry.severity === "error")) {
          toast({
            title: "Review found blocking issues",
            description: result.issues[0]?.message || "Archivist found issues to fix before this should go live.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Command reviewed",
            description: "Archivist refreshed the current validation and preview summary.",
          });
        }
      }
      if (options.focusReview !== false) {
        goToStage("review");
      }
      return result;
    } catch (error) {
      if (isApiIssuesError(error)) {
        setLastIssues(error.issues);
        setLastValidatedFingerprint(draftFingerprint);
      }
      toast({
        title: "Review failed",
        description: error instanceof Error ? error.message : "Archivist could not validate that command.",
        variant: "destructive",
      });
      if (options.focusReview !== false) {
        goToStage("review");
      }
      return null;
    }
  };

  const runDryRun = async () => {
    const parsedInput = parseJsonRecord(testInputJson);
    if (parsedInput.error) {
      setTestInputError(parsedInput.error);
      toast({
        title: "Fix the test input first",
        description: parsedInput.error,
        variant: "destructive",
      });
      return null;
    }

    setTestInputError(null);
    try {
      const result = await dryRunMutation.mutateAsync({
        definition: draft,
        actor: {
          permissions: testPermissions.split(",").map((value) => value.trim()).filter(Boolean),
          roleIds: testRoles.split(",").map((value) => value.trim()).filter(Boolean),
          isOwner: testOwner,
          isPremium: testPremium,
        },
        channel: {},
        input: parsedInput.value,
      });
      commitReviewResult(result, { keepTrace: true });
      setLastDryRun(result);
      if (result.issues?.some((entry: any) => entry.severity === "error")) {
        toast({ title: "Dry-run found blocking issues", description: result.issues[0]?.message, variant: "destructive" });
      } else {
        toast({ title: "Dry-run complete", description: "Archivist simulated the command and refreshed the preview." });
      }
      goToStage("review");
      return result;
    } catch (error) {
      if (isApiIssuesError(error)) {
        setLastIssues(error.issues);
        setLastValidatedFingerprint(draftFingerprint);
      }
      toast({
        title: "Dry-run failed",
        description: error instanceof Error ? error.message : "Archivist could not test this command.",
        variant: "destructive",
      });
      return null;
    }
  };

  const handleSave = async () => {
    const result = await validateCurrentDraft({ quiet: true, focusReview: false });
    if (!result?.compiled) {
      toast({
        title: "Save blocked",
        description: "Archivist could not compile this command yet. Review the issues and test flow first.",
        variant: "destructive",
      });
      goToStage("review");
      return;
    }
    if ((result.issues || []).some((entry: any) => entry.severity === "error")) {
      toast({
        title: "Save blocked by validation",
        description: result.issues?.find((entry: any) => entry.severity === "error")?.message || "Archivist found blocking issues to fix before saving.",
        variant: "destructive",
      });
      goToStage("review");
      return;
    }

    const payload = buildWorkflowSavePayload({
      definition: draft,
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
      setDraft(cloneWorkflowDefinition(saved.definition));
      setLastCompiled(saved.compiled);
      setLastIssues(saved.lastValidation || []);
      setLastValidatedFingerprint(JSON.stringify(saved.definition));
      setLoadedDraftFingerprint(JSON.stringify(saved.definition));
      toast({ title: "Archivist command saved", description: "The command now lives in the built-in Archivist workflow engine." });
    } catch (error) {
      if (isApiIssuesError(error)) {
        setLastIssues(error.issues);
        setLastValidatedFingerprint(draftFingerprint);
      }
      toast({
        title: "Save failed",
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
      openSelection("new");
      toast({ title: "Archivist command deleted", description: "The workflow command was removed." });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Archivist could not delete that command.",
        variant: "destructive",
      });
    }
  };

  const handleToggleSelectedEnabled = async () => {
    if (!selectedCommand) return;
    const nextDefinition = cloneWorkflowDefinition(selectedCommand.definition);
    nextDefinition.behavior.enabled = !selectedCommand.enabled;

    try {
      const updated = await updateMutation.mutateAsync({
        id: selectedCommand.id,
        data: buildWorkflowSavePayload({
          definition: nextDefinition,
          compiled: selectedCommand.compiled,
          issues: selectedCommand.lastValidation || [],
        }),
      });
      setSelection(updated.id);
      toast({
        title: updated.enabled ? "Command enabled" : "Command disabled",
        description: updated.enabled ? "Archivist can run this command live again." : "Archivist will keep this command as a draft until you re-enable it.",
      });
    } catch (error) {
      toast({
        title: "Status update failed",
        description: error instanceof Error ? error.message : "Archivist could not update that command status.",
        variant: "destructive",
      });
    }
  };

  const handleDuplicateSelected = async () => {
    if (!selectedCommand) return;
    const nextDefinition = cloneWorkflowDefinition(selectedCommand.definition);
    nextDefinition.meta.name = `${selectedCommand.name} Copy`;
    nextDefinition.behavior.enabled = false;

    try {
      const created = await createMutation.mutateAsync(buildWorkflowSavePayload({
        definition: nextDefinition,
        compiled: selectedCommand.compiled,
        issues: selectedCommand.lastValidation || [],
      }));
      openSelection(created.id);
      toast({
        title: "Command duplicated",
        description: "Archivist created a disabled copy so you can edit it safely.",
      });
    } catch (error) {
      toast({
        title: "Duplicate failed",
        description: error instanceof Error ? error.message : "Archivist could not duplicate that command.",
        variant: "destructive",
      });
    }
  };

  const updateDraft = (updater: (next: CustomCommandV2Definition) => void) => {
    setLastDryRun(null);
    setDraft((current) => updateDefinition(current, updater));
  };

  const updateStep = (stepIndex: number, updater: (step: CustomCommandV2WorkflowStep) => CustomCommandV2WorkflowStep) => {
    updateDraft((next) => {
      next.workflow.steps[stepIndex] = updater(next.workflow.steps[stepIndex]);
    });
  };

  const addStep = (type: CustomCommandV2WorkflowStep["type"]) => {
    let nextExpanded: string | null = null;
    updateDraft((next) => {
      const newStep = createWorkflowStepTemplate(type, next.workflow.steps.length);
      next.workflow.steps.push(newStep);
      if (!next.workflow.entryStepId) {
        next.workflow.entryStepId = next.workflow.steps[0]?.id || "";
      }
      nextExpanded = newStep.id;
    });
    setExpandedStepId(nextExpanded);
  };

  const duplicateStep = (stepIndex: number) => {
    let nextExpanded: string | null = null;
    updateDraft((next) => {
      const current = next.workflow.steps[stepIndex];
      const duplicated = cloneWorkflowStep(current);
      duplicated.id = buildUniqueStepId(next.workflow.steps, `${current.id}-copy`);
      duplicated.label = `${current.label || current.type} Copy`;
      next.workflow.steps.splice(stepIndex + 1, 0, duplicated);
      nextExpanded = duplicated.id;
    });
    setExpandedStepId(nextExpanded);
  };

  const removeStep = (stepIndex: number) => {
    let fallbackExpanded: string | null = null;
    updateDraft((next) => {
      const [removed] = next.workflow.steps.splice(stepIndex, 1);
      if (next.workflow.entryStepId === removed?.id) {
        next.workflow.entryStepId = next.workflow.steps[0]?.id || "";
      }
      fallbackExpanded = next.workflow.steps[Math.max(0, stepIndex - 1)]?.id || next.workflow.steps[0]?.id || null;
    });
    setExpandedStepId(fallbackExpanded);
  };

  const resetBlankDraft = () => {
    const nextDefinition = createWorkflowDraft();
    setSelection("new");
    setDraft(nextDefinition);
    setLastCompiled(null);
    setLastIssues([]);
    setLastDryRun(null);
    setLastValidatedFingerprint(null);
    setLoadedDraftFingerprint(JSON.stringify(nextDefinition));
    setLoadedSelectionKey("new");
    setBuilderStage("setup");
    setLastBuildStage("setup");
    setExpandedStepId(nextDefinition.workflow.steps[0]?.id || null);
    setTestInputJson(formatSuggestedTestInput(nextDefinition));
    setMobilePanel("build");
  };

  const applyStarterTemplate = (templateId: (typeof WORKFLOW_STARTER_TEMPLATES)[number]["id"]) => {
    const nextDefinition = createWorkflowStarterTemplate(templateId);
    setSelection("new");
    setDraft(nextDefinition);
    setLastCompiled(null);
    setLastIssues([]);
    setLastDryRun(null);
    setLastValidatedFingerprint(null);
    setLoadedDraftFingerprint(JSON.stringify(nextDefinition));
    setLoadedSelectionKey("new");
    setExpandedStepId(nextDefinition.workflow.steps[0]?.id || null);
    setTestInputJson(formatSuggestedTestInput(nextDefinition));
    setBuilderStage("flow");
    setLastBuildStage("flow");
    setMobilePanel("build");
    toast({
      title: "Starter applied",
      description: "Archivist loaded a stronger starting point for this command.",
    });
  };

  const setTriggerType = (value: string) => {
    updateDraft((next) => {
      next.trigger = createWorkflowTriggerTemplate(value as any, {
        name: next.meta.name,
        description: next.meta.description,
      });
    });
  };

  const addVariable = () => {
    updateDraft((next) => {
      const index = next.variables.length + 1;
      next.variables.push({
        key: `value${index}`,
        label: `Value ${index}`,
        scope: "execution",
        dataType: "string",
      });
    });
  };

  const updateVariable = (
    variableIndex: number,
    updater: (variable: CustomCommandV2VariableDeclaration) => CustomCommandV2VariableDeclaration,
  ) => {
    updateDraft((next) => {
      next.variables[variableIndex] = updater(next.variables[variableIndex]);
    });
  };

  const removeVariable = (variableIndex: number) => {
    updateDraft((next) => {
      next.variables.splice(variableIndex, 1);
    });
  };

  const mobileHeading =
    mobilePanel === "library"
      ? "Command Library"
      : mobilePanel === "review"
        ? "Review & Test"
        : currentStage.label;

  const mobileDescription =
    mobilePanel === "library"
      ? "Pick a command, import one, or start from a safer template."
      : mobilePanel === "review"
        ? "Refresh validation, test the flow, and save with confidence."
        : currentStage.description;

  return (
    <div className={cn("space-y-5", mobileActionBarVisible ? "pb-[calc(env(safe-area-inset-bottom)+6rem)]" : "pb-3")}>
      <Card className="archivist-panel overflow-hidden">
        <div className="border-b border-white/8 px-4 py-4 lg:hidden">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="archivist-eyebrow">Archivist Custom Commands</p>
              <h2 className="mt-2 text-lg font-bold text-white">{mobileHeading}</h2>
              <p className="mt-1 text-sm leading-6 text-white/58">{mobileDescription}</p>
            </div>
            <SmallBadge>{commands.length}</SmallBadge>
          </div>
          <div className="archivist-segment mt-4 grid grid-cols-3">
            {([
              { value: "library", label: "Library" },
              { value: "build", label: "Build" },
              { value: "review", label: "Review" },
            ] as const).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  if (option.value === "review") {
                    goToStage("review");
                    return;
                  }
                  if (option.value === "build" && builderStage === "review") {
                    goToStage(lastBuildStage === "review" ? "rules" : lastBuildStage);
                    return;
                  }
                  setMobilePanel(option.value);
                }}
                className="archivist-segment-button"
                data-active={mobilePanel === option.value}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-0 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className={cn("border-b border-white/8 lg:border-b-0 lg:border-r", mobilePanel !== "library" && "hidden lg:block")}>
            <div className="border-b border-white/8 px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="archivist-eyebrow">Archivist Custom Commands</p>
                  <h2 className="mt-2 text-lg font-bold text-white">Command Library</h2>
                  <p className="mt-1 text-sm leading-6 text-white/58">Import, build, and manage Archivist workflows without touching raw code.</p>
                </div>
                <SmallBadge>{commands.length}</SmallBadge>
              </div>
              <div className="mt-4 flex flex-col gap-2">
                <Button className="justify-between rounded-[18px]" onClick={() => openSelection("new")}>
                  New Command
                  <Plus className="h-4 w-4" />
                </Button>
                <Button variant="outline" className="justify-between rounded-[18px] border-white/10 bg-white/[0.03]" onClick={() => setImportOpen(true)}>
                  Import JSON
                  <WandSparkles className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-4 space-y-3">
                <Input
                  value={libraryQuery}
                  onChange={(event) => setLibraryQuery(event.target.value)}
                  placeholder="Search commands, tags, or trigger type"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Select value={libraryTriggerFilter} onValueChange={(value) => setLibraryTriggerFilter(value as typeof libraryTriggerFilter)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All triggers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All triggers</SelectItem>
                      {TRIGGER_OPTIONS.map((option) => (
                        <SelectItem key={`library-trigger-${option.value}`} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={libraryStatusFilter} onValueChange={(value) => setLibraryStatusFilter(value as LibraryStatusFilter)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="live">Live</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="issues">Needs review</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Select value={librarySortMode} onValueChange={(value) => setLibrarySortMode(value as LibrarySortMode)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Most recent</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="trigger">Trigger type</SelectItem>
                    <SelectItem value="steps">Most steps</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="p-3 lg:max-h-[70vh] lg:overflow-y-auto">
              {commandsQuery.isPending ? (
                <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-white/56">
                  Archivist is loading the command library.
                </div>
              ) : commandsQuery.isError ? (
                <div className="space-y-3 rounded-[20px] border border-rose-500/20 bg-rose-500/[0.08] p-4 text-sm leading-6 text-white/76">
                  <p>Archivist could not load the command library right now.</p>
                  <Button variant="outline" className="rounded-[16px] border-white/10 bg-white/[0.03]" onClick={() => commandsQuery.refetch()}>
                    Try Again
                  </Button>
                </div>
              ) : filteredCommands.length ? filteredCommands.map((command) => {
                const active = selection === command.id;
                const commandIssues = summarizeIssues(command.lastValidation || []);
                return (
                  <button
                    key={command.id}
                    type="button"
                    onClick={() => openSelection(command.id)}
                    className={cn(
                      "mb-2 w-full rounded-[18px] border px-4 py-4 text-left transition",
                      active
                        ? "border-white/14 bg-[#171a20]"
                        : "border-white/8 bg-[#111318] hover:border-white/16 hover:bg-[#171a20]",
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-semibold text-white">{command.name}</p>
                      <ArrowUpRight className="h-4 w-4 text-white/34" />
                    </div>
                    <p className="mt-2 truncate text-sm text-white/56">{getWorkflowTriggerLabel(command.definition)}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-white/52">
                      <SmallBadge>{command.triggerType}</SmallBadge>
                      <SmallBadge>{command.enabled ? "Live" : "Draft"}</SmallBadge>
                      <SmallBadge>{command.definition.workflow.steps.length} steps</SmallBadge>
                      {commandIssues.errors ? <SmallBadge>{commandIssues.errors} errors</SmallBadge> : null}
                      {!commandIssues.errors && commandIssues.warnings ? <SmallBadge>{commandIssues.warnings} warnings</SmallBadge> : null}
                    </div>
                    <p className="mt-3 text-xs text-white/34">Updated {formatDate(command.updatedAt)}</p>
                  </button>
                );
              }) : (
                <div className="rounded-[20px] border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm leading-6 text-white/52">
                  {commands.length
                    ? "No commands match this search yet. Clear a filter or change the search text."
                    : "No Archivist commands yet. Start fresh or paste one AI-generated JSON command."}
                </div>
              )}
            </div>
          </aside>

          <section className={cn("min-w-0", mobilePanel === "library" && "hidden lg:block")}>
            <div className="border-b border-white/8 px-4 py-4 sm:px-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="archivist-eyebrow">Editor</p>
                  <h2 className="mt-2 text-xl font-bold text-white">{selectedCommand ? selectedCommand.name : "New Archivist Command"}</h2>
                  <p className="mt-1 max-w-3xl text-sm leading-6 text-white/58">
                    Guided on mobile, safe at runtime, and still flexible enough for real multi-step workflows.
                  </p>
                </div>
                <div className="hidden flex-wrap gap-2 lg:flex">
                  {selectedCommand ? (
                    <>
                      <Button variant="outline" className="rounded-[18px] border-white/10 bg-white/[0.03]" onClick={handleDuplicateSelected} disabled={createMutation.isPending}>
                        <Copy className="h-4 w-4" />
                        Duplicate
                      </Button>
                      <Button variant="outline" className="rounded-[18px] border-white/10 bg-white/[0.03]" onClick={handleToggleSelectedEnabled} disabled={updateMutation.isPending}>
                        {selectedCommand.enabled ? "Disable" : "Enable"}
                      </Button>
                    </>
                  ) : null}
                  <Button variant="outline" className="rounded-[18px] border-white/10 bg-white/[0.03]" onClick={() => validateCurrentDraft()} disabled={dryRunMutation.isPending}>
                    <Rocket className="h-4 w-4" />
                    Review Command
                  </Button>
                  <Button variant="outline" className="rounded-[18px] border-white/10 bg-white/[0.03]" onClick={runDryRun} disabled={dryRunMutation.isPending}>
                    <TestTube2 className="h-4 w-4" />
                    Test Flow
                  </Button>
                  <Button className="rounded-[18px]" onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending || dryRunMutation.isPending}>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </Button>
                  {selectedCommand ? (
                    <Button variant="outline" className="rounded-[18px] border-rose-500/20 bg-rose-500/[0.08] text-white" onClick={handleDelete} disabled={deleteMutation.isPending}>
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  ) : null}
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">
                    {builderStage === "review" ? "Review & Save" : currentStage.label}
                  </p>
                  <p className="mt-1 text-sm text-white/52">
                    {builderStage === "review"
                      ? "Refresh validation for the current draft, then dry-run and save when it feels right."
                      : currentStage.description}
                  </p>
                </div>
                <div className="archivist-segment grid grid-cols-4">
                  {WORKFLOW_BUILDER_STAGES.map((stage) => (
                    <button
                      key={stage.value}
                      type="button"
                      onClick={() => goToStage(stage.value)}
                      className="archivist-segment-button"
                      data-active={builderStage === stage.value || (stage.value === "review" && mobilePanel === "review")}
                    >
                      {stage.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-4 p-4 sm:p-6 xl:grid-cols-[minmax(0,1.1fr)_360px]">
              <div className={cn("space-y-4", mobilePanel === "review" && "hidden lg:block")}>
                {builderStage === "setup" ? (
                  <>
                    {selection === "new" ? (
                      <Card className="archivist-panel archivist-panel-muted">
                        <CardHeader>
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <CardTitle className="text-white">Start with a stronger base</CardTitle>
                              <CardDescription>Use a proven Archivist template first, then adjust the trigger, wording, and workflow.</CardDescription>
                            </div>
                            <Button variant="outline" className="rounded-[18px] border-white/10 bg-white/[0.03]" onClick={resetBlankDraft}>
                              <Plus className="h-4 w-4" />
                              Blank Draft
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="grid gap-3 md:grid-cols-2">
                          {WORKFLOW_STARTER_TEMPLATES.map((template) => (
                            <button
                              key={template.id}
                              type="button"
                              onClick={() => applyStarterTemplate(template.id)}
                              className="rounded-[22px] border border-white/10 bg-[#111318] p-4 text-left transition hover:border-white/18 hover:bg-white/[0.05]"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-semibold text-white">{template.label}</p>
                                <SmallBadge>{template.complexity}</SmallBadge>
                              </div>
                              <p className="mt-2 text-sm leading-6 text-white/60">{template.description}</p>
                              <p className="mt-3 text-xs uppercase tracking-[0.14em] text-white/38">{template.triggerHint}</p>
                            </button>
                          ))}
                        </CardContent>
                      </Card>
                    ) : null}

                    <Card className="archivist-panel archivist-panel-muted">
                  <CardHeader>
                    <CardTitle className="text-white">Basic Info</CardTitle>
                    <CardDescription>Clear naming and good descriptions keep commands understandable for non-technical admins.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <FlowField label="Command Name">
                      <Input value={draft.meta.name} onChange={(event) => updateDraft((next) => { next.meta.name = event.target.value; })} />
                    </FlowField>
                    <FlowField label="Category">
                      <Input value={draft.meta.category || ""} onChange={(event) => updateDraft((next) => { next.meta.category = event.target.value; })} />
                    </FlowField>
                    <FlowField label="Description" hint="Explain what this command does in plain language.">
                      <Textarea value={draft.meta.description || ""} onChange={(event) => updateDraft((next) => { next.meta.description = event.target.value; })} className="min-h-24" />
                    </FlowField>
                    <FlowField label="Tags" hint="Comma-separated labels for future organization and templates.">
                      <Input
                        value={draft.meta.tags.join(", ")}
                        onChange={(event) => updateDraft((next) => {
                          next.meta.tags = event.target.value.split(",").map((value) => value.trim()).filter(Boolean);
                        })}
                      />
                    </FlowField>
                    <div className="md:col-span-2">
                      <label className="flex items-center justify-between rounded-[20px] border border-white/10 bg-[#111318] px-4 py-4">
                        <div>
                          <p className="text-sm font-semibold text-white">Enabled</p>
                          <p className="mt-1 text-sm text-white/56">Turn this off to keep it as a draft until you are ready to make it live.</p>
                        </div>
                        <Switch checked={draft.behavior.enabled} onCheckedChange={(checked) => updateDraft((next) => { next.behavior.enabled = checked; })} />
                      </label>
                    </div>
                  </CardContent>
                </Card>

                    <Card className="archivist-panel archivist-panel-muted">
                  <CardHeader>
                    <CardTitle className="text-white">Trigger</CardTitle>
                    <CardDescription>Tell Archivist what starts this command and keep the setup simple.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <FlowField label="Trigger Type">
                      <Select
                        value={draft.trigger.type}
                        onValueChange={setTriggerType}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TRIGGER_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FlowField>
                    <div className="rounded-[20px] border border-white/10 bg-[#111318] px-4 py-4 text-sm leading-6 text-white/62">
                      <p className="text-sm font-semibold text-white">Current trigger</p>
                      <p className="mt-2">{getWorkflowTriggerLabel(draft)}</p>
                    </div>
                    {renderTriggerFields(draft, updateDraft)}
                  </CardContent>
                  </Card>
                  </>
                ) : null}

                {builderStage === "flow" ? (
                <Card className="archivist-panel archivist-panel-muted">
                  <CardHeader>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <CardTitle className="text-white">Command Flow</CardTitle>
                        <CardDescription>Build the response, interactions, permissions, and follow-up behavior in one place.</CardDescription>
                      </div>
                      <Select onValueChange={(value) => addStep(value as CustomCommandV2WorkflowStep["type"])}>
                        <SelectTrigger className="w-full sm:w-[220px]">
                          <SelectValue placeholder="Add a step" />
                        </SelectTrigger>
                        <SelectContent>
                          {WORKFLOW_STEP_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FlowField label="Entry Step ID" hint="Archivist starts here, then follows next-step links through the workflow.">
                      <Input value={draft.workflow.entryStepId} onChange={(event) => updateDraft((next) => { next.workflow.entryStepId = event.target.value; })} />
                    </FlowField>

                    {draft.workflow.steps.map((step, stepIndex) => (
                      <div key={`${step.id}-${stepIndex}`} className="rounded-[22px] border border-white/8 bg-[#111318] p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <button
                            type="button"
                            className="min-w-0 flex-1 text-left"
                            onClick={() => setExpandedStepId((current) => current === step.id ? null : step.id)}
                          >
                            <p className="text-sm font-semibold text-white">{step.label || WORKFLOW_STEP_OPTIONS.find((entry) => entry.value === step.type)?.label || step.type}</p>
                            <p className="mt-1 text-xs text-white/46">{step.type}</p>
                            <p className="mt-2 text-sm leading-6 text-white/62">{getWorkflowStepSummary(step)}</p>
                            {getStepSetupHint(step) ? (
                              <p className="mt-2 text-xs leading-5 text-amber-200/72">{getStepSetupHint(step)}</p>
                            ) : null}
                            <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.16em] text-white/36 lg:hidden">
                              {expandedStepId === step.id ? "Tap to collapse" : "Tap to edit"}
                            </p>
                          </button>
                          <div className="flex items-center gap-2 self-start">
                            <SmallBadge>{stepIndex + 1}</SmallBadge>
                            <SmallBadge>{step.id}</SmallBadge>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" className="rounded-[16px] border-white/10 bg-white/[0.03]" onClick={() => duplicateStep(stepIndex)}>
                              Duplicate
                            </Button>
                            <Button variant="outline" className="rounded-[16px] border-rose-500/20 bg-rose-500/[0.08]" onClick={() => removeStep(stepIndex)}>
                              Remove
                            </Button>
                          </div>
                        </div>

                        <div className={cn("mt-4", expandedStepId === step.id ? "block" : "hidden lg:block")}>
                          <div className="grid gap-4 md:grid-cols-2">
                          <FlowField label="Step ID">
                            <Input value={step.id} onChange={(event) => updateStep(stepIndex, (current) => ({ ...current, id: event.target.value } as CustomCommandV2WorkflowStep))} />
                          </FlowField>
                          <FlowField label="Label">
                            <Input value={step.label || ""} onChange={(event) => updateStep(stepIndex, (current) => ({ ...current, label: event.target.value } as CustomCommandV2WorkflowStep))} />
                          </FlowField>
                          <FlowField label="Step Type">
                            <Select
                              value={step.type}
                              onValueChange={(value) => updateStep(stepIndex, () => createWorkflowStepTemplate(value as CustomCommandV2WorkflowStep["type"], stepIndex))}
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {WORKFLOW_STEP_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </FlowField>
                          <div className="md:col-span-2">
                            <StepEditor step={step} onChange={(nextStep) => updateStep(stepIndex, () => nextStep)} />
                          </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                  </Card>
                ) : null}

                {builderStage === "rules" ? (
                  <>
                <Accordion type="multiple" className="space-y-4">
                  <AccordionItem value="permissions" className="rounded-[22px] border border-white/8 bg-[#111318] px-5">
                    <AccordionTrigger className="text-white hover:no-underline">Permissions</AccordionTrigger>
                    <AccordionContent>
                      <div className="grid gap-4 md:grid-cols-2">
                        <FlowField label="Mode">
                          <Select value={draft.access.mode} onValueChange={(value) => updateDraft((next) => { next.access.mode = value as any; })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="allow_all">Allow all</SelectItem>
                              <SelectItem value="restricted">Restricted</SelectItem>
                            </SelectContent>
                          </Select>
                        </FlowField>
                        <FlowField label="Required Permissions">
                          <Input value={draft.access.requiredPermissions.join(", ")} onChange={(event) => updateDraft((next) => {
                            next.access.requiredPermissions = event.target.value.split(",").map((value) => value.trim()).filter(Boolean);
                          })} />
                        </FlowField>
                        <FlowField label="Allowed Roles">
                          <Input value={draft.access.allowedRoleIds.join(", ")} onChange={(event) => updateDraft((next) => {
                            next.access.allowedRoleIds = event.target.value.split(",").map((value) => value.trim()).filter(Boolean);
                          })} />
                        </FlowField>
                        <FlowField label="Allowed Channels">
                          <Input value={draft.access.allowedChannelIds.join(", ")} onChange={(event) => updateDraft((next) => {
                            next.access.allowedChannelIds = event.target.value.split(",").map((value) => value.trim()).filter(Boolean);
                          })} />
                        </FlowField>
                        <FlowField label="Blocked Roles">
                          <Input value={draft.access.blockedRoleIds.join(", ")} onChange={(event) => updateDraft((next) => {
                            next.access.blockedRoleIds = event.target.value.split(",").map((value) => value.trim()).filter(Boolean);
                          })} />
                        </FlowField>
                        <FlowField label="Blocked Channels">
                          <Input value={draft.access.blockedChannelIds.join(", ")} onChange={(event) => updateDraft((next) => {
                            next.access.blockedChannelIds = event.target.value.split(",").map((value) => value.trim()).filter(Boolean);
                          })} />
                        </FlowField>
                        <label className="flex items-center justify-between rounded-[18px] border border-white/10 bg-[#0f1115] px-4 py-3 text-sm text-white/72">
                          <span>Owner only</span>
                          <Switch checked={draft.access.ownerOnly} onCheckedChange={(checked) => updateDraft((next) => { next.access.ownerOnly = checked; })} />
                        </label>
                        <label className="flex items-center justify-between rounded-[18px] border border-white/10 bg-[#0f1115] px-4 py-3 text-sm text-white/72">
                          <span>Premium only</span>
                          <Switch checked={draft.access.premiumOnly} onCheckedChange={(checked) => updateDraft((next) => { next.access.premiumOnly = checked; })} />
                        </label>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="cooldowns" className="rounded-[22px] border border-white/8 bg-[#111318] px-5">
                    <AccordionTrigger className="text-white hover:no-underline">Cooldowns</AccordionTrigger>
                    <AccordionContent>
                      <div className="grid gap-4 md:grid-cols-2">
                        <FlowField label="Cooldown Seconds">
                          <Input type="number" value={draft.behavior.cooldownSeconds} onChange={(event) => updateDraft((next) => { next.behavior.cooldownSeconds = Number(event.target.value || 0); })} />
                        </FlowField>
                        <FlowField label="Cooldown Scope">
                          <Select value={draft.behavior.cooldownScope} onValueChange={(value) => updateDraft((next) => { next.behavior.cooldownScope = value as any; })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">Per user</SelectItem>
                              <SelectItem value="channel">Per channel</SelectItem>
                              <SelectItem value="server">Per server</SelectItem>
                              <SelectItem value="global">Global</SelectItem>
                            </SelectContent>
                          </Select>
                        </FlowField>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="advanced" className="rounded-[22px] border border-white/8 bg-[#111318] px-5">
                    <AccordionTrigger className="text-white hover:no-underline">Advanced Settings</AccordionTrigger>
                    <AccordionContent>
                      <div className="grid gap-4">
                        <label className="flex items-center justify-between rounded-[18px] border border-white/10 bg-[#0f1115] px-4 py-3 text-sm text-white/72">
                          <span>Default to ephemeral replies</span>
                          <Switch checked={draft.behavior.defaultEphemeral} onCheckedChange={(checked) => updateDraft((next) => { next.behavior.defaultEphemeral = checked; })} />
                        </label>
                        <label className="flex items-center justify-between rounded-[18px] border border-white/10 bg-[#0f1115] px-4 py-3 text-sm text-white/72">
                          <span>Delete keyword trigger message</span>
                          <Switch checked={draft.behavior.deleteInvocation} onCheckedChange={(checked) => updateDraft((next) => { next.behavior.deleteInvocation = checked; })} />
                        </label>
                        <label className="flex items-center justify-between rounded-[18px] border border-white/10 bg-[#0f1115] px-4 py-3 text-sm text-white/72">
                          <span>Log successful runs</span>
                          <Switch checked={draft.behavior.logRuns} onCheckedChange={(checked) => updateDraft((next) => { next.behavior.logRuns = checked; })} />
                        </label>
                        <FlowField label="Permission Denied Message">
                          <Textarea value={draft.fallbacks.permissionDeniedMessage || ""} onChange={(event) => updateDraft((next) => { next.fallbacks.permissionDeniedMessage = event.target.value; })} className="min-h-20" />
                        </FlowField>
                        <FlowField label="Cooldown Message">
                          <Textarea value={draft.fallbacks.cooldownMessage || ""} onChange={(event) => updateDraft((next) => { next.fallbacks.cooldownMessage = event.target.value; })} className="min-h-20" />
                        </FlowField>
                        <FlowField label="Runtime Error Message">
                          <Textarea value={draft.fallbacks.runtimeErrorMessage || ""} onChange={(event) => updateDraft((next) => { next.fallbacks.runtimeErrorMessage = event.target.value; })} className="min-h-20" />
                        </FlowField>
                        <FlowField label="Empty State Message">
                          <Textarea value={draft.fallbacks.emptyStateMessage || ""} onChange={(event) => updateDraft((next) => { next.fallbacks.emptyStateMessage = event.target.value; })} className="min-h-20" />
                        </FlowField>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                    <Card className="archivist-panel archivist-panel-muted">
                      <CardHeader>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <CardTitle className="text-white">Workflow Variables</CardTitle>
                            <CardDescription>Only add variables you actually need for saved input or reusable values.</CardDescription>
                          </div>
                          <Button variant="outline" className="rounded-[18px] border-white/10 bg-white/[0.03]" onClick={addVariable}>
                            <Plus className="h-4 w-4" />
                            Add Variable
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {draft.variables.length ? draft.variables.map((variable, variableIndex) => (
                          <div key={`${variable.key}-${variableIndex}`} className="rounded-[20px] border border-white/10 bg-[#111318] p-4">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-semibold text-white">{variable.label}</p>
                              <Button variant="outline" className="rounded-[16px] border-rose-500/20 bg-rose-500/[0.08]" onClick={() => removeVariable(variableIndex)}>
                                Remove
                              </Button>
                            </div>
                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                              <FlowField label="Key">
                                <Input value={variable.key} onChange={(event) => updateVariable(variableIndex, (current) => ({ ...current, key: event.target.value }))} />
                              </FlowField>
                              <FlowField label="Label">
                                <Input value={variable.label} onChange={(event) => updateVariable(variableIndex, (current) => ({ ...current, label: event.target.value }))} />
                              </FlowField>
                              <FlowField label="Description">
                                <Input value={variable.description || ""} onChange={(event) => updateVariable(variableIndex, (current) => ({ ...current, description: event.target.value || undefined }))} />
                              </FlowField>
                              <FlowField label="Scope">
                                <Select value={variable.scope} onValueChange={(value) => updateVariable(variableIndex, (current) => ({ ...current, scope: value as CustomCommandV2VariableDeclaration["scope"] }))}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="execution">Execution</SelectItem>
                                    <SelectItem value="session">Session</SelectItem>
                                    <SelectItem value="user">User</SelectItem>
                                    <SelectItem value="server">Server</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FlowField>
                              <FlowField label="Data Type">
                                <Select value={variable.dataType} onValueChange={(value) => updateVariable(variableIndex, (current) => ({ ...current, dataType: value as CustomCommandV2VariableDeclaration["dataType"] }))}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="string">String</SelectItem>
                                    <SelectItem value="number">Number</SelectItem>
                                    <SelectItem value="boolean">Boolean</SelectItem>
                                    <SelectItem value="json">JSON</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FlowField>
                              <FlowField label="Initial Value" hint="Use JSON for objects, arrays, true/false, numbers, or quoted text.">
                                <Input
                                  value={typeof variable.initialValue === "undefined" ? "" : JSON.stringify(variable.initialValue)}
                                  onChange={(event) => updateVariable(variableIndex, (current) => {
                                    const raw = event.target.value.trim();
                                    if (!raw) {
                                      return { ...current, initialValue: undefined };
                                    }
                                    try {
                                      return { ...current, initialValue: JSON.parse(raw) as CustomCommandV2JsonValue };
                                    } catch {
                                      return { ...current, initialValue: raw };
                                    }
                                  })}
                                />
                              </FlowField>
                            </div>
                          </div>
                        )) : (
                          <div className="rounded-[20px] border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm leading-6 text-white/52">
                            No variables yet. Add one only if a step needs saved user input or reusable values later in the workflow.
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </>
                ) : null}

                {builderStage === "review" ? (
                  <Card className="archivist-panel archivist-panel-muted">
                    <CardHeader>
                      <CardTitle className="text-white">Review & Save</CardTitle>
                      <CardDescription>Refresh validation after your latest edits, then dry-run and save when the summary feels right.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className={cn(
                        "rounded-[20px] border p-4 text-sm leading-6",
                        hasFreshValidation ? "border-emerald-500/20 bg-emerald-500/[0.08] text-white/76" : "border-amber-500/20 bg-amber-500/[0.08] text-white/76",
                      )}>
                        {hasFreshValidation
                          ? "Validation is fresh for this draft. You can test or save right away."
                          : "You changed the draft after the last review. Refresh validation so the preview and issues stay honest."}
                      </div>
                      <div className="rounded-[20px] border border-white/10 bg-[#111318] p-4 text-sm leading-6 text-white/64">
                        <p>{draftPreview.whatTriggers}</p>
                        <p className="mt-2">{draftPreview.whatSends}</p>
                        <p className="mt-2">{draftPreview.interactionsSummary}</p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Button variant="outline" className="rounded-[18px] border-white/10 bg-white/[0.03]" onClick={() => validateCurrentDraft()} disabled={dryRunMutation.isPending}>
                          <Rocket className="h-4 w-4" />
                          Review Command
                        </Button>
                        <Button variant="outline" className="rounded-[18px] border-white/10 bg-white/[0.03]" onClick={runDryRun} disabled={dryRunMutation.isPending}>
                          <TestTube2 className="h-4 w-4" />
                          Run Test Flow
                        </Button>
                        <Button className="rounded-[18px] sm:col-span-2" onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending || dryRunMutation.isPending}>
                          <Save className="h-4 w-4" />
                          Save Changes
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : null}
              </div>

              <div className={cn("space-y-4", mobilePanel !== "review" && "hidden lg:block")}>
                <Card className="archivist-panel archivist-panel-muted">
                  <CardHeader>
                    <CardTitle className="text-white">Archivist Preview</CardTitle>
                    <CardDescription>Understand the command without reading JSON.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="rounded-[20px] border border-white/10 bg-[#0a0c0f] p-4">
                      <p className="text-sm font-semibold text-white">{draftPreview.name}</p>
                      <p className="mt-2 text-sm leading-6 text-white/60">{draftPreview.triggerLabel}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <SmallBadge>{draftPreview.triggerType}</SmallBadge>
                        <SmallBadge>{draftPreview.stepCount} steps</SmallBadge>
                        <SmallBadge>{draftPreview.enabled ? "Enabled" : "Draft"}</SmallBadge>
                      </div>
                    </div>
                    {!hasFreshValidation ? (
                      <div className="rounded-[18px] border border-amber-500/20 bg-amber-500/[0.08] p-4 text-sm leading-6 text-white/76">
                        Review this draft again to refresh validation and preview details after your latest edits.
                      </div>
                    ) : null}
                    <div className="rounded-[18px] border border-white/10 bg-[#111318] p-4 text-sm leading-6 text-white/66">
                      <p>{draftPreview.whatTriggers}</p>
                      <p className="mt-2">{draftPreview.whatSends}</p>
                      <p className="mt-2">{draftPreview.interactionsSummary}</p>
                      <p className="mt-2">{draftPreview.roleSummary}</p>
                      <p className="mt-2">{draftPreview.failureSummary}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-[18px] border border-white/10 bg-[#111318] p-4">
                        <p className="text-[11px] font-medium tracking-[0.08em] text-white/48">Errors</p>
                        <p className="mt-2 text-2xl font-bold text-white">{issueSummary.errors}</p>
                      </div>
                      <div className="rounded-[18px] border border-white/10 bg-[#111318] p-4">
                        <p className="text-[11px] font-medium tracking-[0.08em] text-white/48">Warnings</p>
                        <p className="mt-2 text-2xl font-bold text-white">{issueSummary.warnings}</p>
                      </div>
                    </div>
                    {lastIssues.length ? (
                      <div className="space-y-2">
                        {lastIssues.slice(0, 5).map((entry: any, index: number) => (
                          <div key={`${entry.path}-${index}`} className={cn(
                            "rounded-[16px] border p-3 text-sm",
                            entry.severity === "error" ? "border-rose-500/20 bg-rose-500/[0.08]" : "border-amber-500/20 bg-amber-500/[0.08]",
                          )}>
                            <p className="font-semibold text-white">{entry.message}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/42">{entry.path}</p>
                          </div>
                        ))}
                      </div>
                    ) : hasFreshValidation ? (
                      <div className="rounded-[18px] border border-emerald-500/20 bg-emerald-500/[0.08] p-4 text-sm text-white/76">
                        No validation issues right now.
                      </div>
                    ) : (
                      <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4 text-sm text-white/58">
                        Review this draft to generate a fresh validation summary.
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="archivist-panel archivist-panel-muted">
                  <CardHeader>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <CardTitle className="text-white">Archivist Test Flow</CardTitle>
                        <CardDescription>Mock the actor, permissions, and input data before you make this live.</CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        className="rounded-[18px] border-white/10 bg-white/[0.03]"
                        onClick={() => {
                          setTestInputJson(formatSuggestedTestInput(draft));
                          setTestInputError(null);
                        }}
                      >
                        Load Sample
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FlowField label="Permissions">
                      <Input value={testPermissions} onChange={(event) => setTestPermissions(event.target.value)} placeholder="manage_messages, moderate_members" />
                    </FlowField>
                    <FlowField label="Role IDs">
                      <Input value={testRoles} onChange={(event) => setTestRoles(event.target.value)} placeholder="123, 456" />
                    </FlowField>
                    <label className="flex items-center justify-between rounded-[18px] border border-white/10 bg-[#111318] px-4 py-3 text-sm text-white/72">
                      <span>Run as owner</span>
                      <Switch checked={testOwner} onCheckedChange={setTestOwner} />
                    </label>
                    <label className="flex items-center justify-between rounded-[18px] border border-white/10 bg-[#111318] px-4 py-3 text-sm text-white/72">
                      <span>Run with premium access</span>
                      <Switch checked={testPremium} onCheckedChange={setTestPremium} />
                    </label>
                    <Accordion type="single" collapsible className="rounded-[18px] border border-white/10 bg-[#111318] px-4">
                      <AccordionItem value="input-json" className="border-none">
                        <AccordionTrigger className="text-sm text-white hover:no-underline">Advanced input JSON</AccordionTrigger>
                        <AccordionContent className="space-y-2 pb-4">
                          <Textarea
                            value={testInputJson}
                            onChange={(event) => {
                              setTestInputJson(event.target.value);
                              if (testInputError) setTestInputError(null);
                            }}
                            className="min-h-24 font-mono text-xs"
                          />
                          {testInputError ? <p className="text-xs text-rose-300">{testInputError}</p> : null}
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                    <Button className="w-full" onClick={runDryRun} disabled={dryRunMutation.isPending}>
                      <Rocket className="h-4 w-4" />
                      Run Test
                    </Button>
                  </CardContent>
                </Card>

                <Card className="archivist-panel archivist-panel-muted">
                  <CardHeader>
                    <CardTitle className="text-white">Test Trace</CardTitle>
                    <CardDescription>See what Archivist would do, in order, with the current definition.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {lastDryRun?.trace?.length ? lastDryRun.trace.map((entry: any) => (
                      <div key={`${entry.stepId}-${entry.stepType}`} className="rounded-[18px] border border-white/10 bg-[#111318] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-white">{entry.stepId}</p>
                          <SmallBadge>{entry.status}</SmallBadge>
                        </div>
                        <p className="mt-1 text-xs text-white/46">{entry.stepType}</p>
                        <p className="mt-3 text-sm leading-6 text-white/62">{entry.summary}</p>
                      </div>
                    )) : (
                      <div className="rounded-[18px] border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-white/46">
                        Run a test to inspect the command trace and outgoing outputs.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>
        </div>
      </Card>

      {mobileActionBarVisible ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/8 bg-[#0d0f13]/95 px-3 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl lg:hidden">
          <div className="mx-auto max-w-7xl space-y-2">
            <div className="flex items-center justify-between px-1 text-[11px] uppercase tracking-[0.16em] text-white/42">
              <span>{mobilePanel === "review" ? "Review & Save" : currentStage.label}</span>
              <span>{mobilePanel === "review" ? (hasFreshValidation ? "Fresh" : "Needs review") : `${Math.max(currentStageIndex + 1, 1)} / ${WORKFLOW_BUILDER_STAGES.length}`}</span>
            </div>
            {mobilePanel === "review" ? (
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={moveBackward}>
                  Back
                </Button>
                <Button variant="outline" className="flex-1" onClick={runDryRun} disabled={dryRunMutation.isPending}>
                  <TestTube2 className="h-4 w-4" />
                  Test
                </Button>
                <Button className="flex-1" onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending || dryRunMutation.isPending}>
                  <Save className="h-4 w-4" />
                  Save
                </Button>
                {selectedCommand ? (
                  <Button variant="outline" size="icon" className="shrink-0 border-rose-500/20 bg-rose-500/[0.08] text-white" onClick={handleDelete} disabled={deleteMutation.isPending} aria-label="Delete command">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={moveBackward}>
                  {currentStageIndex <= 0 ? "Library" : "Back"}
                </Button>
                <Button className="flex-1" onClick={moveForward}>
                  {builderStage === "rules" ? "Review" : "Continue"}
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : null}

      <CustomCommandV2ImportModal
        serverId={serverId}
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={(command) => openSelection(command.id)}
      />
    </div>
  );
}

function StepEditor({
  step,
  onChange,
}: {
  step: CustomCommandV2WorkflowStep;
  onChange: (step: CustomCommandV2WorkflowStep) => void;
}) {
  const set = (patch: Partial<CustomCommandV2WorkflowStep>) => onChange({ ...step, ...patch } as CustomCommandV2WorkflowStep);
  const webhookBodySnapshot = step.type === "call_webhook" ? JSON.stringify(step.body, null, 2) : "";
  const webhookHeadersSnapshot = step.type === "call_webhook" ? JSON.stringify(step.headers, null, 2) : "";
  const [webhookBodyJson, setWebhookBodyJson] = useState(webhookBodySnapshot);
  const [webhookBodyError, setWebhookBodyError] = useState<string | null>(null);
  const [webhookHeadersJson, setWebhookHeadersJson] = useState(webhookHeadersSnapshot);
  const [webhookHeadersError, setWebhookHeadersError] = useState<string | null>(null);

  const addButtonPreset = (preset: "reply" | "link") => {
    if (step.type !== "add_button_row") return;
    const nextIndex = step.buttons.length + 1;
    const baseButton = {
      id: `button-${nextIndex}`,
      label: preset === "link" ? `Link ${nextIndex}` : `Button ${nextIndex}`,
      customId: `archivist:button:${nextIndex}`,
      style: preset === "link" ? "link" : "primary",
      url: preset === "link" ? "https://example.com" : undefined,
      nextStepId: preset === "reply" ? step.nextStepId : undefined,
    };
    set({ buttons: [...step.buttons, baseButton] } as any);
  };

  const addSelectOptionPreset = (count = 1) => {
    if (step.type !== "add_select_menu") return;
    const nextOptions = [...step.options];
    for (let index = 0; index < count; index += 1) {
      const nextNumber = nextOptions.length + 1;
      nextOptions.push({
        label: `Option ${nextNumber}`,
        value: `option-${nextNumber}`,
        description: count > 1 ? `Choice ${nextNumber}` : undefined,
      });
    }
    set({ options: nextOptions } as any);
  };

  const addModalFieldPreset = (style: "short" | "paragraph") => {
    if (step.type !== "open_modal") return;
    const nextNumber = step.fields.length + 1;
    set({
      fields: [
        ...step.fields,
        {
          id: `field_${nextNumber}`,
          label: style === "paragraph" ? `Paragraph ${nextNumber}` : `Field ${nextNumber}`,
          style,
          required: true,
          placeholder: style === "paragraph" ? "Tell us more..." : undefined,
        },
      ],
    } as any);
  };

  useEffect(() => {
    if (step.type === "call_webhook") {
      setWebhookBodyJson(JSON.stringify(step.body, null, 2));
      setWebhookBodyError(null);
      setWebhookHeadersJson(JSON.stringify(step.headers, null, 2));
      setWebhookHeadersError(null);
    }
  }, [step.id, step.type, webhookBodySnapshot, webhookHeadersSnapshot]);

  if (step.type === "send_message") {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <FlowField label="What Archivist Sends" hint="Supports {user}, {channel}, and workflow variables.">
            <Textarea value={step.content} onChange={(event) => set({ content: event.target.value })} className="min-h-24" />
          </FlowField>
        </div>
        <FlowField label="Channel Target">
          <Select value={step.channelTarget} onValueChange={(value) => set({ channelTarget: value as any })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Current channel</SelectItem>
              <SelectItem value="dm">Direct message</SelectItem>
              <SelectItem value="configured">Specific channel</SelectItem>
            </SelectContent>
          </Select>
        </FlowField>
        <FlowField label="Configured Channel ID">
          <Input value={step.channelId || ""} onChange={(event) => set({ channelId: event.target.value || undefined })} />
        </FlowField>
        <label className="flex items-center justify-between rounded-[18px] border border-white/10 bg-[#101318] px-4 py-3 text-sm text-white/72">
          <span>Mention the actor</span>
          <Switch checked={step.mentionUser} onCheckedChange={(checked) => set({ mentionUser: checked })} />
        </label>
        <FlowField label="Next Step ID">
          <Input value={step.nextStepId || ""} onChange={(event) => set({ nextStepId: event.target.value || undefined })} />
        </FlowField>
        <FlowField label="Failure Step ID">
          <Input value={step.onFailureStepId || ""} onChange={(event) => set({ onFailureStepId: event.target.value || undefined })} />
        </FlowField>
      </div>
    );
  }

  if (step.type === "send_embed") {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <FlowField label="Embed Title">
          <Input value={step.embed.title || ""} onChange={(event) => set({ embed: { ...step.embed, title: event.target.value } })} />
        </FlowField>
        <FlowField label="Color">
          <Input value={step.embed.color || ""} onChange={(event) => set({ embed: { ...step.embed, color: event.target.value } })} placeholder="#B11226" />
        </FlowField>
        <div className="md:col-span-2">
          <FlowField label="Embed Description">
            <Textarea value={step.embed.description || ""} onChange={(event) => set({ embed: { ...step.embed, description: event.target.value } })} className="min-h-24" />
          </FlowField>
        </div>
        <FlowField label="Channel Target">
          <Select value={step.channelTarget} onValueChange={(value) => set({ channelTarget: value as any })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Current channel</SelectItem>
              <SelectItem value="dm">Direct message</SelectItem>
              <SelectItem value="configured">Specific channel</SelectItem>
            </SelectContent>
          </Select>
        </FlowField>
        <FlowField label="Configured Channel ID">
          <Input value={step.channelId || ""} onChange={(event) => set({ channelId: event.target.value || undefined })} />
        </FlowField>
        <FlowField label="Next Step ID">
          <Input value={step.nextStepId || ""} onChange={(event) => set({ nextStepId: event.target.value || undefined })} />
        </FlowField>
        <FlowField label="Failure Step ID">
          <Input value={step.onFailureStepId || ""} onChange={(event) => set({ onFailureStepId: event.target.value || undefined })} />
        </FlowField>
      </div>
    );
  }

  if (step.type === "reply_ephemeral" || step.type === "fallback_response") {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <FlowField label={step.type === "reply_ephemeral" ? "Ephemeral Reply" : "Fallback Message"}>
            <Textarea value={step.content} onChange={(event) => set({ content: event.target.value })} className="min-h-24" />
          </FlowField>
        </div>
        {step.type === "fallback_response" ? (
          <>
            <label className="flex items-center justify-between rounded-[18px] border border-white/10 bg-[#101318] px-4 py-3 text-sm text-white/72">
              <span>Send as ephemeral</span>
              <Switch checked={step.ephemeral} onCheckedChange={(checked) => set({ ephemeral: checked } as any)} />
            </label>
            <label className="flex items-center justify-between rounded-[18px] border border-white/10 bg-[#101318] px-4 py-3 text-sm text-white/72">
              <span>Stop after fallback</span>
              <Switch checked={step.stopAfter} onCheckedChange={(checked) => set({ stopAfter: checked } as any)} />
            </label>
          </>
        ) : (
          <FlowField label="Next Step ID">
            <Input value={step.nextStepId || ""} onChange={(event) => set({ nextStepId: event.target.value || undefined })} />
          </FlowField>
        )}
        {step.type === "fallback_response" ? (
          <FlowField label="Next Step ID">
            <Input value={step.nextStepId || ""} onChange={(event) => set({ nextStepId: event.target.value || undefined } as any)} />
          </FlowField>
        ) : null}
      </div>
    );
  }

  if (step.type === "add_button_row") {
    return (
      <StepEditorSurface
        title="Button row"
        description="Build a button row with quicker starter presets, clearer button cards, and the same workflow wiring."
        action={
          <Button
            type="button"
            className="rounded-[16px]"
            onClick={() => set({
              buttons: [
                ...step.buttons,
                {
                  id: `button-${step.buttons.length + 1}`,
                  label: `Button ${step.buttons.length + 1}`,
                  customId: `archivist:button:${step.buttons.length + 1}`,
                  style: "primary",
                },
              ],
            } as any)}
          >
            <Plus className="h-4 w-4" />
            Add Button
          </Button>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FlowField label="Response Mode" hint="Choose how this row is sent back into Discord.">
            <Select value={step.responseMode} onValueChange={(value) => set({ responseMode: value as any } as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="reply">Reply</SelectItem>
                <SelectItem value="followup">Follow-up</SelectItem>
                <SelectItem value="edit">Edit message</SelectItem>
              </SelectContent>
            </Select>
          </FlowField>
          <FlowField label="Next Step ID" hint="Optional handoff after the row finishes.">
            <Input value={step.nextStepId || ""} onChange={(event) => set({ nextStepId: event.target.value || undefined } as any)} />
          </FlowField>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">Quick add</p>
              <p className="text-xs text-white/54">Drop in a starter button or the full preset row.</p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="rounded-[16px] border-white/10 bg-white/[0.03]"
              onClick={() => set({ buttons: [...step.buttons, ...buildButtonStarterRow(step)] } as any)}
            >
              <Plus className="h-4 w-4" />
              Starter row
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {(["primary", "secondary", "success", "danger", "link"] as const).map((kind) => (
              <QuickActionButton
                key={kind}
                label={kind === "primary" ? "Primary button" : kind === "secondary" ? "Secondary button" : kind === "success" ? "Success button" : kind === "danger" ? "Danger button" : "Link button"}
                description={kind === "primary" ? "Continue to the next step." : kind === "secondary" ? "Give users a softer option." : kind === "success" ? "Confirm the action." : kind === "danger" ? "Offer a cancel path." : "Open an external URL."}
                onClick={() => set({ buttons: [...step.buttons, buildButtonPreset(step, kind)] } as any)}
              />
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-white">Buttons</p>
            <p className="text-xs text-white/54">Each button keeps its own ID, style, URL, and follow-up step.</p>
          </div>
          {step.buttons.length ? (
            <div className="space-y-4">
              {step.buttons.map((button, index) => (
                <StepItemCard
                  key={button.id}
                  title={button.label || `Button ${index + 1}`}
                  meta={`${button.style}${button.url ? " - link" : " - custom id"}${button.nextStepId ? ` - next ${button.nextStepId}` : ""}`}
                  onRemove={() => set({ buttons: step.buttons.filter((_, buttonIndex) => buttonIndex !== index) } as any)}
                >
                  <FlowField label="Button label">
                    <Input value={button.label} onChange={(event) => {
                      const nextButtons = [...step.buttons];
                      nextButtons[index] = { ...button, label: event.target.value };
                      set({ buttons: nextButtons } as any);
                    }} />
                  </FlowField>
                  <FlowField label="Custom ID">
                    <Input value={button.customId} onChange={(event) => {
                      const nextButtons = [...step.buttons];
                      nextButtons[index] = { ...button, customId: event.target.value };
                      set({ buttons: nextButtons } as any);
                    }} />
                  </FlowField>
                  <FlowField label="Style">
                    <Select value={button.style} onValueChange={(value) => {
                      const nextButtons = [...step.buttons];
                      nextButtons[index] = { ...button, style: value as any };
                      set({ buttons: nextButtons } as any);
                    }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["primary", "secondary", "success", "danger", "link"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FlowField>
                  <FlowField label="URL" hint="Only used for link buttons.">
                    <Input value={button.url || ""} onChange={(event) => {
                      const nextButtons = [...step.buttons];
                      nextButtons[index] = { ...button, url: event.target.value || undefined };
                      set({ buttons: nextButtons } as any);
                    }} />
                  </FlowField>
                  <FlowField label="Next step ID" hint="Optional workflow continuation after click.">
                    <Input value={button.nextStepId || ""} onChange={(event) => {
                      const nextButtons = [...step.buttons];
                      nextButtons[index] = { ...button, nextStepId: event.target.value || undefined };
                      set({ buttons: nextButtons } as any);
                    }} />
                  </FlowField>
                </StepItemCard>
              ))}
            </div>
          ) : (
            <div className="rounded-[18px] border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-white/54">
              No buttons yet. Use a preset above or add one from the header.
            </div>
          )}
        </div>
      </StepEditorSurface>
    );
  }

  if (step.type === "add_select_menu") {
    return (
      <StepEditorSurface
        title="Select menu"
        description="Make select menus easier to assemble with one-click option sets, clearer option cards, and preserved workflow wiring."
        action={
          <Button
            type="button"
            className="rounded-[16px]"
            onClick={() => set({
              options: [
                ...step.options,
                {
                  label: `Option ${step.options.length + 1}`,
                  value: `option-${step.options.length + 1}`,
                },
              ],
            } as any)}
          >
            <Plus className="h-4 w-4" />
            Add Option
          </Button>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FlowField label="Custom ID" hint="Used by the on-select step to listen for this menu.">
            <Input value={step.customId} onChange={(event) => set({ customId: event.target.value } as any)} />
          </FlowField>
          <FlowField label="Placeholder" hint="Shown before a user picks an option.">
            <Input value={step.placeholder || ""} onChange={(event) => set({ placeholder: event.target.value } as any)} />
          </FlowField>
          <FlowField label="Minimum Values">
            <Input type="number" min={1} max={25} value={step.minValues} onChange={(event) => set({ minValues: Number(event.target.value || 1) } as any)} />
          </FlowField>
          <FlowField label="Maximum Values">
            <Input type="number" min={1} max={25} value={step.maxValues} onChange={(event) => set({ maxValues: Number(event.target.value || 1) } as any)} />
          </FlowField>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-white">Quick add</p>
            <p className="text-xs text-white/54">Start from common select patterns instead of building every option by hand.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <QuickActionButton
              label="Yes / No"
              description="A simple binary chooser with a clear fallback path."
              onClick={() => set({ options: [...step.options, ...buildSelectOptionPreset(step, "yes_no")] } as any)}
            />
            <QuickActionButton
              label="Triage menu"
              description="Useful for routing users into help, reports, or support."
              onClick={() => set({ options: [...step.options, ...buildSelectOptionPreset(step, "triage")] } as any)}
            />
            <QuickActionButton
              label="Role menu"
              description="A starter menu for role picks and segmented flows."
              onClick={() => set({ options: [...step.options, ...buildSelectOptionPreset(step, "roles")] } as any)}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-white">Options</p>
            <p className="text-xs text-white/54">Each option can carry an emoji, description, and next step.</p>
          </div>
          {step.options.length ? (
            <div className="space-y-4">
              {step.options.map((option, index) => (
                <StepItemCard
                  key={`${option.value}-${index}`}
                  title={option.label || `Option ${index + 1}`}
                  meta={`${option.value}${option.nextStepId ? ` - next ${option.nextStepId}` : ""}`}
                  onRemove={() => set({ options: step.options.filter((_, optionIndex) => optionIndex !== index) } as any)}
                >
                  <FlowField label="Option label">
                    <Input value={option.label} onChange={(event) => {
                      const nextOptions = [...step.options];
                      nextOptions[index] = { ...option, label: event.target.value };
                      set({ options: nextOptions } as any);
                    }} />
                  </FlowField>
                  <FlowField label="Option value">
                    <Input value={option.value} onChange={(event) => {
                      const nextOptions = [...step.options];
                      nextOptions[index] = { ...option, value: event.target.value };
                      set({ options: nextOptions } as any);
                    }} />
                  </FlowField>
                  <FlowField label="Description">
                    <Input value={option.description || ""} onChange={(event) => {
                      const nextOptions = [...step.options];
                      nextOptions[index] = { ...option, description: event.target.value || undefined };
                      set({ options: nextOptions } as any);
                    }} />
                  </FlowField>
                  <FlowField label="Emoji">
                    <Input value={option.emoji || ""} onChange={(event) => {
                      const nextOptions = [...step.options];
                      nextOptions[index] = { ...option, emoji: event.target.value || undefined };
                      set({ options: nextOptions } as any);
                    }} />
                  </FlowField>
                  <FlowField label="Next step ID" hint="Optional jump after the user chooses this option.">
                    <Input value={option.nextStepId || ""} onChange={(event) => {
                      const nextOptions = [...step.options];
                      nextOptions[index] = { ...option, nextStepId: event.target.value || undefined };
                      set({ options: nextOptions } as any);
                    }} />
                  </FlowField>
                </StepItemCard>
              ))}
            </div>
          ) : (
            <div className="rounded-[18px] border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-white/54">
              No options yet. Use a preset above or add an option from the header.
            </div>
          )}
        </div>

        <FlowField label="Next Step ID" hint="Optional handoff after the select menu interaction.">
          <Input value={step.nextStepId || ""} onChange={(event) => set({ nextStepId: event.target.value || undefined } as any)} />
        </FlowField>
      </StepEditorSurface>
    );
  }

  if (step.type === "open_modal") {
    return (
      <StepEditorSurface
        title="Modal editor"
        description="Create fully editable modal flows with starter templates, clearer field cards, and the same step structure."
        action={
          <Button
            type="button"
            className="rounded-[16px]"
            onClick={() => set({
              fields: [
                ...step.fields,
                {
                  id: `field_${step.fields.length + 1}`,
                  label: `Field ${step.fields.length + 1}`,
                  style: "short",
                  required: true,
                },
              ],
            } as any)}
          >
            <Plus className="h-4 w-4" />
            Add Field
          </Button>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FlowField label="Custom ID" hint="Used to open this modal from a button or action step.">
            <Input value={step.customId} onChange={(event) => set({ customId: event.target.value } as any)} />
          </FlowField>
          <FlowField label="Modal Title" hint="Keep it short and clear for users.">
            <Input value={step.title} onChange={(event) => set({ title: event.target.value } as any)} />
          </FlowField>
          <FlowField label="Next Step ID" hint="Optional next hop after submit.">
            <Input value={step.nextStepId || ""} onChange={(event) => set({ nextStepId: event.target.value || undefined } as any)} />
          </FlowField>
          <FlowField label="Cancel Step ID" hint="Optional branch for dismissed modals.">
            <Input value={step.onCancelStepId || ""} onChange={(event) => set({ onCancelStepId: event.target.value || undefined } as any)} />
          </FlowField>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-white">Quick add</p>
            <p className="text-xs text-white/54">Load a complete starter modal, then tune the fields.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <QuickActionButton
              label="Application"
              description="A polished intake form with room for profile details."
              onClick={() => set({ ...buildModalPreset(step, "application") } as any)}
            />
            <QuickActionButton
              label="Support"
              description="Collect issue details with a concise support layout."
              onClick={() => set({ ...buildModalPreset(step, "support") } as any)}
            />
            <QuickActionButton
              label="Feedback"
              description="A lightweight feedback modal for suggestions and notes."
              onClick={() => set({ ...buildModalPreset(step, "feedback") } as any)}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-white">Fields</p>
            <p className="text-xs text-white/54">Each field can stay short or expand into a paragraph input.</p>
          </div>
          {step.fields.length ? (
            <div className="space-y-4">
              {step.fields.map((field, index) => (
                <StepItemCard
                  key={`${field.id}-${index}`}
                  title={field.label || `Field ${index + 1}`}
                  meta={`${field.id} - ${field.style}${field.required ? " - required" : ""}${field.placeholder ? " - has placeholder" : ""}`}
                  onRemove={() => set({ fields: step.fields.filter((_, fieldIndex) => fieldIndex !== index) } as any)}
                >
                  <FlowField label="Field ID">
                    <Input value={field.id} onChange={(event) => {
                      const nextFields = [...step.fields];
                      nextFields[index] = { ...field, id: event.target.value };
                      set({ fields: nextFields } as any);
                    }} />
                  </FlowField>
                  <FlowField label="Label">
                    <Input value={field.label} onChange={(event) => {
                      const nextFields = [...step.fields];
                      nextFields[index] = { ...field, label: event.target.value };
                      set({ fields: nextFields } as any);
                    }} />
                  </FlowField>
                  <FlowField label="Style">
                    <Select value={field.style} onValueChange={(value) => {
                      const nextFields = [...step.fields];
                      nextFields[index] = { ...field, style: value as any };
                      set({ fields: nextFields } as any);
                    }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="short">Short</SelectItem>
                        <SelectItem value="paragraph">Paragraph</SelectItem>
                      </SelectContent>
                    </Select>
                  </FlowField>
                  <FlowField label="Placeholder">
                    <Input value={field.placeholder || ""} onChange={(event) => {
                      const nextFields = [...step.fields];
                      nextFields[index] = { ...field, placeholder: event.target.value || undefined };
                      set({ fields: nextFields } as any);
                    }} />
                  </FlowField>
                  <label className="flex items-center justify-between rounded-[18px] border border-white/10 bg-[#101318] px-4 py-3 text-sm text-white/72">
                    <span>Required</span>
                    <Switch checked={field.required} onCheckedChange={(checked) => {
                      const nextFields = [...step.fields];
                      nextFields[index] = { ...field, required: checked };
                      set({ fields: nextFields } as any);
                    }} />
                  </label>
                  <FlowField label="Min Length">
                    <Input type="number" min={0} max={4000} value={field.minLength || ""} onChange={(event) => {
                      const nextFields = [...step.fields];
                      nextFields[index] = { ...field, minLength: event.target.value ? Number(event.target.value) : undefined };
                      set({ fields: nextFields } as any);
                    }} />
                  </FlowField>
                  <FlowField label="Max Length">
                    <Input type="number" min={1} max={4000} value={field.maxLength || ""} onChange={(event) => {
                      const nextFields = [...step.fields];
                      nextFields[index] = { ...field, maxLength: event.target.value ? Number(event.target.value) : undefined };
                      set({ fields: nextFields } as any);
                    }} />
                  </FlowField>
                </StepItemCard>
              ))}
            </div>
          ) : (
            <div className="rounded-[18px] border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-white/54">
              No fields yet. Use a preset above or add one from the header.
            </div>
          )}
        </div>
      </StepEditorSurface>
    );
  }

  if (step.type === "save_input") {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <FlowField label="Source">
          <Select value={step.source} onValueChange={(value) => set({ source: value as any } as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["modal", "select", "button", "slash", "keyword", "context"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
            </SelectContent>
          </Select>
        </FlowField>
        <FlowField label="Input Key">
          <Input value={step.inputKey} onChange={(event) => set({ inputKey: event.target.value } as any)} />
        </FlowField>
        <FlowField label="Variable Key">
          <Input value={step.variableKey} onChange={(event) => set({ variableKey: event.target.value } as any)} />
        </FlowField>
        <FlowField label="Default Value">
          <Input value={formatJsonValueInput(step.defaultValue)} onChange={(event) => set({ defaultValue: parseJsonValueInput(event.target.value) } as any)} />
        </FlowField>
        <FlowField label="Next Step ID">
          <Input value={step.nextStepId || ""} onChange={(event) => set({ nextStepId: event.target.value || undefined } as any)} />
        </FlowField>
      </div>
    );
  }

  if (step.type === "on_button_click" || step.type === "on_select") {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {"customIds" in step ? (
          <FlowField label="Button IDs">
            <Input value={step.customIds.join(", ")} onChange={(event) => set({ customIds: event.target.value.split(",").map((value) => value.trim()).filter(Boolean) } as any)} />
          </FlowField>
        ) : (
          <>
            <FlowField label="Select Menu ID">
              <Input value={step.customId} onChange={(event) => set({ customId: event.target.value } as any)} />
            </FlowField>
            <FlowField label="Accepted Values">
              <Input
                placeholder="Leave blank to accept any value"
                value={step.acceptedValues.join(", ")}
                onChange={(event) => set({ acceptedValues: event.target.value.split(",").map((value) => value.trim()).filter(Boolean) } as any)}
              />
            </FlowField>
          </>
        )}
        <FlowField label="Timeout (seconds)">
          <Input
            type="number"
            min={5}
            max={86400}
            value={step.timeoutSeconds}
            onChange={(event) => set({ timeoutSeconds: Number(event.target.value || 0) } as any)}
          />
        </FlowField>
        <FlowField label="Next Step ID">
          <Input value={step.nextStepId} onChange={(event) => set({ nextStepId: event.target.value } as any)} />
        </FlowField>
        <FlowField label="Timeout Step ID">
          <Input value={step.onTimeoutStepId || ""} onChange={(event) => set({ onTimeoutStepId: event.target.value || undefined } as any)} />
        </FlowField>
      </div>
    );
  }

  if (step.type === "add_role" || step.type === "remove_role") {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <FlowField label="Role ID">
          <Input value={step.roleId} onChange={(event) => set({ roleId: event.target.value } as any)} />
        </FlowField>
        <FlowField label="Target">
          <Select value={step.target} onValueChange={(value) => set({ target: value as any } as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="actor">Actor</SelectItem>
              <SelectItem value="target">Target</SelectItem>
            </SelectContent>
          </Select>
        </FlowField>
        <FlowField label="Next Step ID">
          <Input value={step.nextStepId || ""} onChange={(event) => set({ nextStepId: event.target.value || undefined } as any)} />
        </FlowField>
        <FlowField label="Failure Step ID">
          <Input value={step.onFailureStepId || ""} onChange={(event) => set({ onFailureStepId: event.target.value || undefined } as any)} />
        </FlowField>
      </div>
    );
  }

  if (step.type === "check_permission") {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <FlowField label="Permissions">
          <Input value={step.permissions.join(", ")} onChange={(event) => set({ permissions: event.target.value.split(",").map((value) => value.trim()).filter(Boolean) } as any)} />
        </FlowField>
        <FlowField label="Mode">
          <Select value={step.mode} onValueChange={(value) => set({ mode: value as any } as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Require all</SelectItem>
              <SelectItem value="any">Require any</SelectItem>
            </SelectContent>
          </Select>
        </FlowField>
        <FlowField label="Next Step ID">
          <Input value={step.nextStepId || ""} onChange={(event) => set({ nextStepId: event.target.value || undefined } as any)} />
        </FlowField>
        <FlowField label="Denied Step ID">
          <Input value={step.onDeniedStepId || ""} onChange={(event) => set({ onDeniedStepId: event.target.value || undefined } as any)} />
        </FlowField>
        <div className="md:col-span-2">
          <FlowField label="Denied Message">
            <Textarea value={step.denialMessage || ""} onChange={(event) => set({ denialMessage: event.target.value || undefined } as any)} className="min-h-20" />
          </FlowField>
        </div>
      </div>
    );
  }

  if (step.type === "check_cooldown") {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <FlowField label="Seconds">
          <Input type="number" value={step.seconds || 0} onChange={(event) => set({ seconds: Number(event.target.value || 0) } as any)} />
        </FlowField>
        <FlowField label="Scope">
          <Select value={step.scope || "user"} onValueChange={(value) => set({ scope: value as any } as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="channel">Channel</SelectItem>
              <SelectItem value="server">Server</SelectItem>
              <SelectItem value="global">Global</SelectItem>
            </SelectContent>
          </Select>
        </FlowField>
        <FlowField label="Next Step ID">
          <Input value={step.nextStepId || ""} onChange={(event) => set({ nextStepId: event.target.value || undefined } as any)} />
        </FlowField>
        <FlowField label="Denied Step ID">
          <Input value={step.onDeniedStepId || ""} onChange={(event) => set({ onDeniedStepId: event.target.value || undefined } as any)} />
        </FlowField>
        <div className="md:col-span-2">
          <FlowField label="Denied Message">
            <Textarea value={step.denialMessage || ""} onChange={(event) => set({ denialMessage: event.target.value || undefined } as any)} className="min-h-20" />
          </FlowField>
        </div>
      </div>
    );
  }

  if (step.type === "set_variable") {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <FlowField label="Variable Key">
          <Input value={step.variableKey} onChange={(event) => set({ variableKey: event.target.value } as any)} />
        </FlowField>
        <FlowField label="Operation">
          <Select value={step.operation} onValueChange={(value) => set({ operation: value as any } as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="set">Set</SelectItem>
              <SelectItem value="append">Append</SelectItem>
              <SelectItem value="increment">Increment</SelectItem>
              <SelectItem value="decrement">Decrement</SelectItem>
            </SelectContent>
          </Select>
        </FlowField>
        <FlowField label="Value Source">
          <Select value={step.value.source} onValueChange={(value) => set({
            value: value === "literal"
              ? { source: "literal", value: "" }
              : { source: "context", key: "" },
          } as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="literal">Literal value</SelectItem>
              <SelectItem value="context">Context or variable</SelectItem>
            </SelectContent>
          </Select>
        </FlowField>
        <FlowField label={step.value.source === "literal" ? "Literal Value" : "Context Key"}>
          <Input
            value={step.value.source === "literal" ? formatJsonValueInput(step.value.value) : step.value.key}
            onChange={(event) => set({
              value: step.value.source === "literal"
                ? { source: "literal", value: parseJsonValueInput(event.target.value) ?? "" }
                : { source: "context", key: event.target.value },
            } as any)}
          />
        </FlowField>
        <FlowField label="Next Step ID">
          <Input value={step.nextStepId || ""} onChange={(event) => set({ nextStepId: event.target.value || undefined } as any)} />
        </FlowField>
      </div>
    );
  }

  if (step.type === "branch_if") {
    const rightOperand = step.condition.right ?? { source: "literal", value: "" };
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <FlowField label="Left Side Source">
          <Select value={step.condition.left.source} onValueChange={(value) => set({
            condition: {
              ...step.condition,
              left: value === "literal" ? { source: "literal", value: "" } : { source: "context", key: "" },
            },
          } as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="context">Context or variable</SelectItem>
              <SelectItem value="literal">Literal value</SelectItem>
            </SelectContent>
          </Select>
        </FlowField>
        <FlowField label="Left Side Value">
          <Input value={"key" in step.condition.left ? step.condition.left.key : formatJsonValueInput(step.condition.left.value)} onChange={(event) => set({
            condition: {
              ...step.condition,
              left: "key" in step.condition.left
                ? { source: "context", key: event.target.value }
                : { source: "literal", value: parseJsonValueInput(event.target.value) ?? "" },
            },
          } as any)} />
        </FlowField>
        <FlowField label="Operator">
          <Select value={step.condition.operator} onValueChange={(value) => set({ condition: { ...step.condition, operator: value as any } } as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["eq", "neq", "contains", "gt", "gte", "lt", "lte", "truthy", "falsy"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
            </SelectContent>
          </Select>
        </FlowField>
        <FlowField label="Right Side Source">
          <Select value={rightOperand.source} onValueChange={(value) => set({
            condition: {
              ...step.condition,
              right: value === "literal" ? { source: "literal", value: "" } : { source: "context", key: "" },
            },
          } as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="literal">Literal value</SelectItem>
              <SelectItem value="context">Context or variable</SelectItem>
            </SelectContent>
          </Select>
        </FlowField>
        <FlowField label="Right Side Value">
          <Input value={"key" in rightOperand ? rightOperand.key : formatJsonValueInput(rightOperand.value)} onChange={(event) => set({
            condition: {
              ...step.condition,
              right: "key" in rightOperand
                ? { source: "context", key: event.target.value }
                : { source: "literal", value: parseJsonValueInput(event.target.value) ?? "" },
            },
          } as any)} />
        </FlowField>
        <FlowField label="True Step ID">
          <Input value={step.trueStepId} onChange={(event) => set({ trueStepId: event.target.value } as any)} />
        </FlowField>
        <FlowField label="False Step ID">
          <Input value={step.falseStepId || ""} onChange={(event) => set({ falseStepId: event.target.value || undefined } as any)} />
        </FlowField>
      </div>
    );
  }

  if (step.type === "call_webhook") {
    return (
      <div className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <FlowField label="Method">
            <Select value={step.method} onValueChange={(value) => set({ method: value as any } as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["GET", "POST", "PUT", "PATCH", "DELETE"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
              </SelectContent>
            </Select>
          </FlowField>
          <FlowField label="Timeout (ms)">
            <Input type="number" value={step.timeoutMs} onChange={(event) => set({ timeoutMs: Number(event.target.value || 3500) } as any)} />
          </FlowField>
        </div>
        <FlowField label="URL">
          <Input value={step.url} onChange={(event) => set({ url: event.target.value } as any)} />
        </FlowField>
        <FlowField label="Headers JSON">
          <div className="space-y-2">
            <Textarea
              value={webhookHeadersJson}
              onChange={(event) => {
                const nextValue = event.target.value;
                setWebhookHeadersJson(nextValue);
                const parsed = parseStringRecord(nextValue, step.headers);
                if (parsed.error) {
                  setWebhookHeadersError(parsed.error);
                  return;
                }
                setWebhookHeadersError(null);
                set({ headers: parsed.value } as any);
              }}
              className="min-h-20 font-mono text-xs"
            />
            {webhookHeadersError ? <p className="text-xs text-rose-300">{webhookHeadersError}</p> : null}
          </div>
        </FlowField>
        <FlowField label="Body JSON">
          <div className="space-y-2">
            <Textarea
              value={webhookBodyJson}
              onChange={(event) => {
                const nextValue = event.target.value;
                setWebhookBodyJson(nextValue);
                const parsed = parseJsonRecord(nextValue, step.body);
                if (parsed.error) {
                  setWebhookBodyError(parsed.error);
                  return;
                }
                setWebhookBodyError(null);
                set({ body: parsed.value } as any);
              }}
              className="min-h-24 font-mono text-xs"
            />
            {webhookBodyError ? <p className="text-xs text-rose-300">{webhookBodyError}</p> : null}
          </div>
        </FlowField>
        <div className="grid gap-4 md:grid-cols-2">
          <FlowField label="Next Step ID">
            <Input value={step.nextStepId || ""} onChange={(event) => set({ nextStepId: event.target.value || undefined } as any)} />
          </FlowField>
          <FlowField label="Failure Step ID">
            <Input value={step.onFailureStepId || ""} onChange={(event) => set({ onFailureStepId: event.target.value || undefined } as any)} />
          </FlowField>
        </div>
      </div>
    );
  }

  if (step.type === "log_action") {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <FlowField label="Level">
          <Select value={step.level} onValueChange={(value) => set({ level: value as any } as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warn">Warn</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
        </FlowField>
        <div className="md:col-span-2">
          <FlowField label="Message">
            <Textarea value={step.message} onChange={(event) => set({ message: event.target.value } as any)} className="min-h-20" />
          </FlowField>
        </div>
        <FlowField label="Next Step ID">
          <Input value={step.nextStepId || ""} onChange={(event) => set({ nextStepId: event.target.value || undefined } as any)} />
        </FlowField>
      </div>
    );
  }

  return (
    <div className="rounded-[18px] border border-white/10 bg-[#101318] p-4 text-sm text-white/56">
      This step type is supported by the Archivist runtime, but the friendly editor for it is still expanding. You can keep it as-is and continue saving/testing the command.
    </div>
  );
}

function renderTriggerFields(
  draft: CustomCommandV2Definition,
  updateDraft: (updater: (next: CustomCommandV2Definition) => void) => void,
) {
  if (draft.trigger.type === "slash") {
    return (
      <>
        <FlowField label="Slash Name">
          <Input value={draft.trigger.name} onChange={(event) => updateDraft((next) => {
            if (next.trigger.type === "slash") next.trigger.name = event.target.value;
          })} />
        </FlowField>
        <FlowField label="Slash Description">
          <Input value={draft.trigger.description || ""} onChange={(event) => updateDraft((next) => {
            if (next.trigger.type === "slash") next.trigger.description = event.target.value;
          })} />
        </FlowField>
      </>
    );
  }

  if (draft.trigger.type === "keyword") {
    return (
      <>
        <FlowField label="Keyword Pattern">
          <Input value={draft.trigger.pattern} onChange={(event) => updateDraft((next) => {
            if (next.trigger.type === "keyword") next.trigger.pattern = event.target.value;
          })} />
        </FlowField>
        <FlowField label="Aliases">
          <Input value={draft.trigger.aliases.join(", ")} onChange={(event) => updateDraft((next) => {
            if (next.trigger.type === "keyword") {
              next.trigger.aliases = event.target.value.split(",").map((value) => value.trim()).filter(Boolean);
            }
          })} />
        </FlowField>
        <FlowField label="Match Mode">
          <Select value={draft.trigger.matchMode} onValueChange={(value) => updateDraft((next) => {
            if (next.trigger.type === "keyword") next.trigger.matchMode = value as typeof next.trigger.matchMode;
          })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="exact">Exact match</SelectItem>
              <SelectItem value="starts_with">Starts with</SelectItem>
              <SelectItem value="contains">Contains</SelectItem>
            </SelectContent>
          </Select>
        </FlowField>
        <label className="flex items-center justify-between rounded-[18px] border border-white/10 bg-[#0f1115] px-4 py-3 text-sm text-white/72">
          <span>Case sensitive</span>
          <Switch checked={draft.trigger.caseSensitive} onCheckedChange={(checked) => updateDraft((next) => {
            if (next.trigger.type === "keyword") next.trigger.caseSensitive = checked;
          })} />
        </label>
      </>
    );
  }

  if (draft.trigger.type === "button" || draft.trigger.type === "select" || draft.trigger.type === "modal_submit") {
    return (
      <>
        <FlowField label="Custom ID">
          <Input value={draft.trigger.customId} onChange={(event) => updateDraft((next) => {
            if (next.trigger.type === "button" || next.trigger.type === "select" || next.trigger.type === "modal_submit") {
              next.trigger.customId = event.target.value;
            }
          })} />
        </FlowField>
        {draft.trigger.type === "select" ? (
          <FlowField label="Accepted Values">
            <Input value={draft.trigger.acceptedValues.join(", ")} onChange={(event) => updateDraft((next) => {
              if (next.trigger.type === "select") {
                next.trigger.acceptedValues = event.target.value.split(",").map((value) => value.trim()).filter(Boolean);
              }
            })} />
          </FlowField>
        ) : null}
        {"channelId" in draft.trigger ? (
          <>
            <FlowField label="Channel ID">
              <Input value={draft.trigger.channelId || ""} onChange={(event) => updateDraft((next) => {
                if (next.trigger.type === "button" || next.trigger.type === "select") {
                  next.trigger.channelId = event.target.value || undefined;
                }
              })} />
            </FlowField>
            <FlowField label="Message ID">
              <Input value={draft.trigger.messageId || ""} onChange={(event) => updateDraft((next) => {
                if (next.trigger.type === "button" || next.trigger.type === "select") {
                  next.trigger.messageId = event.target.value || undefined;
                }
              })} />
            </FlowField>
          </>
        ) : null}
      </>
    );
  }

  if (draft.trigger.type === "schedule") {
    return (
      <>
        <FlowField label="Cron">
          <Input value={draft.trigger.cron} onChange={(event) => updateDraft((next) => {
            if (next.trigger.type === "schedule") next.trigger.cron = event.target.value;
          })} />
        </FlowField>
        <FlowField label="Timezone">
          <Input value={draft.trigger.timezone} onChange={(event) => updateDraft((next) => {
            if (next.trigger.type === "schedule") next.trigger.timezone = event.target.value;
          })} />
        </FlowField>
      </>
    );
  }

  if (draft.trigger.type === "role_add") {
    return (
      <FlowField label="Role IDs">
        <Input value={draft.trigger.roleIds.join(", ")} onChange={(event) => updateDraft((next) => {
          if (next.trigger.type === "role_add") {
            next.trigger.roleIds = event.target.value.split(",").map((value) => value.trim()).filter(Boolean);
          }
        })} />
      </FlowField>
    );
  }

  if (draft.trigger.type === "reaction") {
    return (
      <>
        <FlowField label="Emoji">
          <Input value={draft.trigger.emoji} onChange={(event) => updateDraft((next) => {
            if (next.trigger.type === "reaction") next.trigger.emoji = event.target.value;
          })} />
        </FlowField>
        <FlowField label="Channel ID">
          <Input value={draft.trigger.channelId || ""} onChange={(event) => updateDraft((next) => {
            if (next.trigger.type === "reaction") next.trigger.channelId = event.target.value || undefined;
          })} />
        </FlowField>
        <FlowField label="Message ID">
          <Input value={draft.trigger.messageId || ""} onChange={(event) => updateDraft((next) => {
            if (next.trigger.type === "reaction") next.trigger.messageId = event.target.value || undefined;
          })} />
        </FlowField>
      </>
    );
  }

  return null;
}
