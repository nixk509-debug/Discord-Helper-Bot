import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  ArrowRight,
  Braces,
  ChevronLeft,
  Clock3,
  Filter,
  MessageSquareText,
  Plus,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  Workflow,
} from "lucide-react";
import type { CommandAction, CommandCondition, StudioDocumentRecord } from "@shared/schema";
import {
  createDefaultTriggerConfig,
  getTriggerConfigErrors,
  normalizeTriggerConfig,
  type ButtonTriggerConfig,
  type CommandTriggerConfig,
  type KeywordTriggerConfig,
  type ReactionTriggerConfig,
  type RoleAddTriggerConfig,
  type ScheduleTriggerConfig,
  type SelectTriggerConfig,
} from "@shared/command-triggers";
import type {
  ArchivistCommand,
  DiscordContextResponse,
  WorkspaceLogResponse,
  WorkspaceOverviewResponse,
} from "@/hooks/use-bot";
import { useCreateCommand, useDeleteCommand, useUpdateCommand } from "@/hooks/use-bot";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  ACTION_OPTIONS,
  COMMAND_PRESETS,
  CONDITION_OPTIONS,
  TRIGGER_OPTIONS,
  actionLabel,
  cleanStringList,
  commandToDraft,
  conditionLabel,
  createDefaultAction,
  createDefaultCommandDraft,
  createDefaultCondition,
  ensureTriggerConfig,
  formatRelativeCommandTime,
  triggerLabel,
  type CommandDraft,
} from "./custom-command-model";
import archivistAvatar from "@assets/archivist-avatar.png";

type SelectedCommandState = number | "new" | null;
type BuilderTab = "trigger" | "conditions" | "actions" | "settings";

function createPayload(draft: CommandDraft) {
  const normalizedActions = (draft.actions || []).filter((action) => {
    if (action.type === "wait") return true;
    if (action.type === "sendStudio") return Number.isFinite(action.studioDocumentId) && Number(action.studioDocumentId) > 0;
    if (action.type === "addRole" || action.type === "removeRole") return Boolean(action.roleId || action.value);
    if (action.type === "createChannel") return Boolean(action.value?.trim());
    return Boolean(action.value?.trim());
  });

  return {
    name: draft.name.trim(),
    description: draft.description.trim(),
    response: draft.response.trim(),
    responseType: draft.responseType || "text",
    responseVariations: draft.responseVariations || [],
    embedResponse: draft.embedResponse ?? null,
    aliases: Array.isArray(draft.aliases) ? draft.aliases.filter(Boolean) : [],
    category: draft.category || "custom-commands",
    cooldown: Number.isFinite(Number(draft.cooldown)) ? Number(draft.cooldown) : 0,
    cooldownScope: draft.cooldownScope || "user",
    requiredRoles: draft.requiredRoles || [],
    blockedRoles: draft.blockedRoles || [],
    allowedChannels: draft.allowedChannels || [],
    blockedChannels: draft.blockedChannels || [],
    enabled: draft.enabled !== false,
    deleteInvocation: Boolean(draft.deleteInvocation),
    dmResponse: Boolean(draft.dmResponse),
    triggerType: draft.triggerType || "slash",
    triggerConfig: ensureTriggerConfig(draft.triggerType || "slash", draft.triggerConfig),
    conditions: (draft.conditions || []).filter((condition) => {
      if (condition.type === "randomChance") return typeof condition.chance === "number";
      if (condition.type === "accountAge") return typeof condition.days === "number";
      return Boolean(condition.value?.trim()) || condition.type === "isOwner";
    }),
    actions: normalizedActions,
    premiumOnly: Boolean(draft.premiumOnly),
  };
}

function duplicateAction(action: CommandAction): CommandAction {
  return JSON.parse(JSON.stringify(action));
}

function duplicateCondition(condition: CommandCondition): CommandCondition {
  return JSON.parse(JSON.stringify(condition));
}

export function CustomCommandWorkspace({
  serverId,
  overview,
  logs,
  commands,
  discordContext,
  studioDocuments,
  searchQuery,
  initialSelection,
  standaloneBuilder,
  onBackToList,
}: {
  serverId: number;
  overview: WorkspaceOverviewResponse | null | undefined;
  logs: WorkspaceLogResponse | null | undefined;
  commands: ArchivistCommand[];
  discordContext: DiscordContextResponse | undefined;
  studioDocuments: StudioDocumentRecord[] | undefined;
  searchQuery: string;
  initialSelection?: SelectedCommandState;
  standaloneBuilder?: boolean;
  onBackToList?: () => void;
}) {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const createCommand = useCreateCommand(serverId);
  const updateCommand = useUpdateCommand(serverId);
  const deleteCommand = useDeleteCommand(serverId);

  const [triggerFilter, setTriggerFilter] = useState<string>("all");
  const [selectedCommandId, setSelectedCommandId] = useState<SelectedCommandState>(initialSelection ?? null);
  const [draft, setDraft] = useState<CommandDraft>(() => createDefaultCommandDraft());
  const [builderTab, setBuilderTab] = useState<BuilderTab>("trigger");
  const [mobileView, setMobileView] = useState<"list" | "builder">("list");

  const filteredCommands = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return commands
      .filter((command) => triggerFilter === "all" || command.triggerType === triggerFilter)
      .filter((command) => {
        if (!normalizedQuery) return true;
        return [command.name, command.description, command.triggerType, ...(Array.isArray(command.aliases) ? command.aliases : [])]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQuery));
      })
      .sort((left, right) => {
        const leftTime = new Date(left.lastUsedAt || left.createdAt || 0).getTime();
        const rightTime = new Date(right.lastUsedAt || right.createdAt || 0).getTime();
        return rightTime - leftTime;
      });
  }, [commands, searchQuery, triggerFilter]);

  const selectedCommand = useMemo(
    () => (typeof selectedCommandId === "number" ? commands.find((command) => command.id === selectedCommandId) || null : null),
    [commands, selectedCommandId],
  );

  useEffect(() => {
    if (initialSelection === undefined) return;
    setSelectedCommandId(initialSelection);
    if (initialSelection === "new") {
      setDraft(createDefaultCommandDraft());
      setBuilderTab("trigger");
    }
    if (standaloneBuilder) {
      setMobileView("builder");
    }
  }, [initialSelection, standaloneBuilder]);

  useEffect(() => {
    if (selectedCommandId === "new") return;
    if (selectedCommand) {
      setDraft(commandToDraft(selectedCommand));
      return;
    }

    if (filteredCommands.length > 0) {
      setSelectedCommandId(filteredCommands[0].id);
      return;
    }

    setSelectedCommandId("new");
    setDraft(createDefaultCommandDraft());
  }, [filteredCommands, selectedCommand, selectedCommandId]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const openNewDraft = () => {
      setSelectedCommandId("new");
      setDraft(createDefaultCommandDraft());
      setBuilderTab("trigger");
      setMobileView("builder");
    };

    window.addEventListener("archivist-create-command", openNewDraft);
    return () => window.removeEventListener("archivist-create-command", openNewDraft);
  }, []);

  const totalActions = draft.actions?.length || 0;
  const totalConditions = draft.conditions?.length || 0;
  const leadReply =
    draft.response ||
    (draft.actions || []).find((action) => action.type === "reply")?.value ||
    (draft.actions || []).find((action) => action.type === "sendDM")?.value ||
    "";
  const selectedStudioDocuments = useMemo(
    () => new Map((studioDocuments || []).map((document) => [document.id, document.name])),
    [studioDocuments],
  );

  async function handleSave() {
    const payload = createPayload(draft);
    const triggerErrors = getTriggerConfigErrors(payload.triggerType, payload.triggerConfig);

    if (!payload.name) {
      toast({ title: "Command name required", description: "Give this command a name before saving it.", variant: "destructive" });
      return;
    }

    if (triggerErrors.length > 0) {
      toast({
        title: "Finish the trigger setup",
        description: triggerErrors[0],
        variant: "destructive",
      });
      return;
    }

    if (!payload.response && payload.actions.length === 0) {
      toast({ title: "Add an action first", description: "Every command needs at least one action or response.", variant: "destructive" });
      return;
    }

    try {
      let savedCommand: { id: number; syncWarning?: string | null } | null = null;
      if (draft.id) {
        const updated = await updateCommand.mutateAsync({ id: draft.id, data: payload });
        setSelectedCommandId(updated.id);
        setDraft(commandToDraft(updated as any));
        savedCommand = updated;
      } else {
        const created = await createCommand.mutateAsync(payload as any);
        setSelectedCommandId(created.id);
        setDraft(commandToDraft(created as any));
        savedCommand = created;
      }

      if (savedCommand?.syncWarning) {
        toast({
          title: "Command saved, but slash sync failed",
          description: savedCommand.syncWarning,
          variant: "destructive",
        });
      } else {
        toast({ title: "Command saved", description: "Archivist stored the latest trigger, conditions, and actions." });
      }
    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Archivist could not save this command.",
        variant: "destructive",
      });
    }
  }

  async function handleDelete() {
    if (!draft.id) {
      setDraft(createDefaultCommandDraft());
      return;
    }

    if (!window.confirm(`Delete ${draft.name || "this command"}? This cannot be undone.`)) return;

    try {
      await deleteCommand.mutateAsync(draft.id);
      setSelectedCommandId(null);
      setDraft(createDefaultCommandDraft());
      toast({ title: "Command deleted", description: "The command was removed from this server." });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Archivist could not delete this command.",
        variant: "destructive",
      });
    }
  }

  useEffect(() => {
    if (!isMobile) {
      setMobileView("list");
      return;
    }

    if (selectedCommandId === "new" || typeof selectedCommandId === "number") {
      setMobileView("builder");
    }
  }, [isMobile, selectedCommandId]);

  return (
    <div className="space-y-4 pb-[calc(env(safe-area-inset-bottom)+6rem)]">
      <section className="archivist-panel">
        <div className="border-b border-white/6 px-4 py-4 md:px-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="archivist-eyebrow">Custom Commands</p>
              <h1 className="font-display text-xl font-bold tracking-tight text-white sm:text-2xl md:text-3xl">
                Build server behavior as trigger, conditions, and actions.
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-white/58">
                Keep the flow simple at the start, then expand it only when the command needs more logic.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <MetricPanel label="Commands" value={String(commands.length)} icon={Braces} />
              <MetricPanel label="Runs (recent)" value={String(overview?.metrics.recentCommands || 0)} icon={Activity} />
              <MetricPanel label="Failures" value={String(overview?.metrics.recentFailures || 0)} icon={ShieldCheck} danger={(overview?.metrics.recentFailures || 0) > 0} />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-5">
          <div className="flex min-w-0 flex-1 flex-wrap gap-2">
            <FilterChip active={triggerFilter === "all"} onClick={() => setTriggerFilter("all")}>All triggers</FilterChip>
            {TRIGGER_OPTIONS.map((option) => (
              <FilterChip key={option.value} active={triggerFilter === option.value} onClick={() => setTriggerFilter(option.value)}>
                {option.label}
              </FilterChip>
            ))}
          </div>

          <Button
            onClick={() => {
              setSelectedCommandId("new");
              setDraft(createDefaultCommandDraft());
              setBuilderTab("trigger");
              if (isMobile) setMobileView("builder");
            }}
            className="w-full rounded-2xl bg-[#8B1F2F] text-white hover:bg-[#A3293B] sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create command
          </Button>
        </div>

        <div className="border-t border-white/6 px-4 py-4 md:px-5">
          <div className="flex items-center gap-2">
            <p className="text-[10px] uppercase tracking-[0.24em] text-white/34">Quick starts</p>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {COMMAND_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setSelectedCommandId("new");
                  setDraft(preset.build());
                  setBuilderTab("trigger");
                  if (isMobile) setMobileView("builder");
                }}
                className="rounded-[16px] border border-white/8 bg-[#0b0d10] px-4 py-4 text-left transition hover:border-[#7d2432] hover:bg-[#141114]"
              >
                <p className="text-sm font-medium text-white">{preset.label}</p>
                <p className="mt-1 text-sm leading-6 text-white/50">{preset.description}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className={`grid gap-4 ${standaloneBuilder ? "xl:grid-cols-[minmax(0,1fr)_320px]" : "xl:grid-cols-[320px_minmax(0,1fr)_320px]"}`}>
        <section className={`archivist-panel min-w-0 overflow-hidden ${(standaloneBuilder || (isMobile && mobileView === "builder")) ? "hidden" : ""}`}>
          <div className="border-b border-white/6 px-4 py-4">
            <p className="text-sm font-semibold text-white">Command list</p>
            <p className="mt-1 text-sm text-white/46">
              {searchQuery.trim() ? `Filtered by "${searchQuery.trim()}"` : "Select a command row to edit it inline."}
            </p>
          </div>

          <div id="archivist-command-list" className="max-h-[70vh] overflow-y-auto">
            {filteredCommands.length > 0 ? (
              filteredCommands.map((command) => (
                <button
                  key={command.id}
                  type="button"
                  onClick={() => {
                    setSelectedCommandId(command.id);
                    if (isMobile) setMobileView("builder");
                  }}
                  className={`flex w-full items-start gap-3 border-b border-white/6 px-4 py-4 text-left transition hover:bg-white/[0.03] ${
                    selectedCommandId === command.id ? "bg-[#141114]" : ""
                  }`}
                >
                  <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-[12px] border border-white/8 bg-[#0d0f12] text-white/70">
                    <Workflow className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{command.name}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/34">{triggerLabel(command.triggerType || "slash")}</p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.18em] ${command.enabled ? "bg-[#1A1416] text-white/60" : "bg-[#141414] text-white/32"}`}>
                        {command.enabled ? "Live" : "Paused"}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/46">
                      <span>{command.actions?.length || 0} actions</span>
                      <span>{command.conditions?.length || 0} conditions</span>
                      <span>{formatRelativeCommandTime(command.lastUsedAt || command.createdAt)}</span>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="px-4 py-8 text-sm text-white/46">No commands match the current search and trigger filters.</div>
            )}
          </div>
        </section>

        <section className={`archivist-panel min-w-0 overflow-hidden ${isMobile && mobileView === "list" && !standaloneBuilder ? "hidden" : ""}`}>
          <div className="border-b border-white/6 px-4 py-4 md:px-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                {isMobile ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (standaloneBuilder && onBackToList) {
                        onBackToList();
                        return;
                      }
                      setMobileView("list");
                    }}
                    className="mb-3 rounded-[16px]"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    {standaloneBuilder ? "Back" : "Command List"}
                  </Button>
                ) : null}
                <p className="archivist-eyebrow">{draft.id ? "Command builder" : "New command"}</p>
                <h2 className="mt-1 text-xl font-semibold text-white">{draft.name || "Untitled command"}</h2>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button
                  onClick={handleSave}
                  disabled={createCommand.isPending || updateCommand.isPending}
                  className="w-full rounded-2xl bg-[#8B1F2F] text-white hover:bg-[#A3293B] sm:w-auto"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDelete}
                  disabled={deleteCommand.isPending}
                  className="w-full rounded-2xl border-white/10 bg-transparent text-white/74 hover:bg-white/[0.03] sm:w-auto"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {draft.id ? "Delete" : "Reset"}
                </Button>
              </div>
            </div>
          </div>

          <div className="border-b border-white/6 px-3 py-3 md:px-5">
            <div className="flex gap-2 overflow-x-auto pb-1">
              <BuilderTabButton active={builderTab === "trigger"} onClick={() => setBuilderTab("trigger")} label="Trigger" icon={Braces} />
              <BuilderTabButton active={builderTab === "conditions"} onClick={() => setBuilderTab("conditions")} label="Conditions" icon={Filter} />
              <BuilderTabButton active={builderTab === "actions"} onClick={() => setBuilderTab("actions")} label="Actions" icon={Sparkles} />
              <BuilderTabButton active={builderTab === "settings"} onClick={() => setBuilderTab("settings")} label="Settings" icon={ShieldCheck} />
            </div>
          </div>

          <div className="space-y-5 px-4 py-4 md:px-5 md:py-5">
            {!isMobile || builderTab === "trigger" ? (
            <BuilderSection title="Trigger" caption="Define how this command begins." icon={Braces}>
              <div className="grid gap-3 md:grid-cols-2">
                <InlineField label="Command name">
                  <input
                    value={draft.name}
                    onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                    className="archivist-field"
                    placeholder="announce"
                  />
                </InlineField>

                <InlineField label="Trigger type">
                  <select
                    value={draft.triggerType}
                    onChange={(event) => {
                      const nextTriggerType = event.target.value;
                      setDraft((current) => ({
                        ...current,
                        triggerType: nextTriggerType,
                        triggerConfig: createDefaultTriggerConfig(nextTriggerType),
                      }));
                    }}
                    className="archivist-field"
                  >
                    {TRIGGER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </InlineField>

                <InlineField label="Description">
                  <input
                    value={draft.description}
                    onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                    className="archivist-field"
                    placeholder="Explain what this command does"
                  />
                </InlineField>

                <InlineField label="Aliases">
                  <input
                    value={(draft.aliases || []).join(", ")}
                    onChange={(event) => setDraft((current) => ({ ...current, aliases: cleanStringList(event.target.value) }))}
                    className="archivist-field"
                    placeholder="announce, alert"
                  />
                </InlineField>
              </div>

              <TriggerSpecificPanel
                triggerType={draft.triggerType}
                triggerConfig={draft.triggerConfig}
                aliases={draft.aliases || []}
                response={draft.response}
                roles={discordContext?.roles || []}
                channels={discordContext?.channels || []}
                onChange={(triggerConfig) => setDraft((current) => ({ ...current, triggerConfig }))}
              />

            </BuilderSection>
            ) : null}

            {!isMobile || builderTab === "conditions" ? (
            <BuilderSection
              title="Conditions"
              caption="Keep simple checks visible and advanced checks additive."
              icon={Filter}
              action={(
                <Button
                  variant="outline"
                  onClick={() => setDraft((current) => ({ ...current, conditions: [...(current.conditions || []), createDefaultCondition()] }))}
                  className="rounded-2xl border-white/10 bg-transparent text-white/74 hover:bg-white/[0.03]"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add condition
                </Button>
              )}
            >
              <div className="space-y-3">
                {(draft.conditions || []).length > 0 ? (
                  draft.conditions.map((condition, index) => (
                    <ConditionEditorRow
                      key={`${condition.type}-${index}`}
                      condition={condition}
                      roles={discordContext?.roles || []}
                      channels={discordContext?.channels || []}
                      onChange={(nextCondition) => setDraft((current) => ({ ...current, conditions: (current.conditions || []).map((entry, entryIndex) => entryIndex === index ? duplicateCondition(nextCondition) : entry) }))}
                      onRemove={() => setDraft((current) => ({ ...current, conditions: (current.conditions || []).filter((_, entryIndex) => entryIndex !== index) }))}
                    />
                  ))
                ) : (
                  <EmptyBuilderRow label="No extra conditions yet. Keep it quick, or add one when the flow needs a gate." />
                )}
              </div>

              <details className="rounded-[22px] border border-white/8 bg-[#0A0C0D]">
                <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-white/74">Advanced logic</summary>
                <div className="border-t border-white/6 px-4 py-4 text-sm leading-6 text-white/54">
                  Sequential branches, grouped checks, and deeper runtime logic will stay collapsed until the command needs them.
                </div>
              </details>
            </BuilderSection>
            ) : null}

            {!isMobile || builderTab === "actions" ? (
            <BuilderSection
              title="Actions"
              caption="Stack replies, roles, Studio sends, and logging in execution order."
              icon={Sparkles}
              action={(
                <Button
                  variant="outline"
                  onClick={() => setDraft((current) => ({ ...current, actions: [...(current.actions || []), createDefaultAction()] }))}
                  className="rounded-2xl border-white/10 bg-transparent text-white/74 hover:bg-white/[0.03]"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add action
                </Button>
              )}
            >
              <InlineField label="Primary response">
                <Textarea
                  value={draft.response}
                  onChange={(event) => {
                    const value = event.target.value;
                    setDraft((current) => {
                      const actions = [...(current.actions || [])];
                      const firstReplyIndex = actions.findIndex((action) => action.type === "reply");
                      if (firstReplyIndex >= 0) actions[firstReplyIndex] = { ...actions[firstReplyIndex], value };
                      return { ...current, response: value, actions };
                    });
                  }}
                  className="min-h-[120px] rounded-[20px] border-white/10 bg-[#0A0C0D] text-white placeholder:text-white/28"
                  placeholder="What should Archivist send when this command runs?"
                />
              </InlineField>

              <div className="space-y-3">
                {(draft.actions || []).map((action, index) => (
                  <ActionEditorRow
                    key={`${action.type}-${index}`}
                    action={action}
                    roles={discordContext?.roles || []}
                    channels={discordContext?.channels || []}
                    studioDocuments={studioDocuments || []}
                    onChange={(nextAction) => {
                      setDraft((current) => {
                        const actions = (current.actions || []).map((entry, entryIndex) => entryIndex === index ? duplicateAction(nextAction) : entry);
                        return { ...current, actions, response: nextAction.type === "reply" && index === 0 ? nextAction.value || "" : current.response };
                      });
                    }}
                    onRemove={() => setDraft((current) => ({ ...current, actions: (current.actions || []).filter((_, entryIndex) => entryIndex !== index) }))}
                  />
                ))}
              </div>
            </BuilderSection>
            ) : null}

            {!isMobile || builderTab === "settings" ? (
            <BuilderSection title="Settings" caption="Overrides, cooldowns, and deploy behavior." icon={ShieldCheck}>
              <div className="grid gap-3 md:grid-cols-2">
                <InlineField label="Cooldown (seconds)">
                  <input
                    type="number"
                    min={0}
                    value={draft.cooldown}
                    onChange={(event) => setDraft((current) => ({ ...current, cooldown: Number(event.target.value || 0) }))}
                    className="archivist-field"
                  />
                </InlineField>
                <InlineField label="Cooldown scope">
                  <select
                    value={draft.cooldownScope || "user"}
                    onChange={(event) => setDraft((current) => ({ ...current, cooldownScope: event.target.value as CommandDraft["cooldownScope"] }))}
                    className="archivist-field"
                  >
                    <option value="user">Per user</option>
                    <option value="channel">Per channel</option>
                    <option value="server">Global</option>
                  </select>
                </InlineField>
                <InlineField label="Required roles">
                  <RoleMultiValueInput roles={discordContext?.roles || []} values={draft.requiredRoles || []} onChange={(values) => setDraft((current) => ({ ...current, requiredRoles: values }))} />
                </InlineField>
                <InlineField label="Allowed channels">
                  <ChannelMultiValueInput channels={discordContext?.channels || []} values={draft.allowedChannels || []} onChange={(values) => setDraft((current) => ({ ...current, allowedChannels: values }))} />
                </InlineField>
                <InlineField label="Blocked roles">
                  <RoleMultiValueInput roles={discordContext?.roles || []} values={draft.blockedRoles || []} onChange={(values) => setDraft((current) => ({ ...current, blockedRoles: values }))} />
                </InlineField>
                <InlineField label="Blocked channels">
                  <ChannelMultiValueInput channels={discordContext?.channels || []} values={draft.blockedChannels || []} onChange={(values) => setDraft((current) => ({ ...current, blockedChannels: values }))} />
                </InlineField>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <ToggleField label="Enabled" value={Boolean(draft.enabled)} onChange={(checked) => setDraft((current) => ({ ...current, enabled: checked }))} />
                <ToggleField label="DM response" value={Boolean(draft.dmResponse)} onChange={(checked) => setDraft((current) => ({ ...current, dmResponse: checked }))} />
                <ToggleField label="Delete invocation" value={Boolean(draft.deleteInvocation)} onChange={(checked) => setDraft((current) => ({ ...current, deleteInvocation: checked }))} />
                <ToggleField label="Premium only" value={Boolean(draft.premiumOnly)} onChange={(checked) => setDraft((current) => ({ ...current, premiumOnly: checked }))} />
              </div>
            </BuilderSection>
            ) : null}
          </div>
        </section>

        <aside className={`space-y-4 ${(standaloneBuilder && !isMobile) || (isMobile && mobileView === "list" && !standaloneBuilder) ? "hidden" : ""}`}>
          <div className="archivist-panel overflow-hidden">
            <div className="border-b border-white/6 px-4 py-4">
              <p className="text-sm font-semibold text-white">Command flow</p>
              <p className="mt-1 text-sm text-white/46">What this command will do when it runs.</p>
            </div>
            <div className="space-y-3 px-4 py-4">
              <SummaryRow icon={Braces} label="Trigger" value={triggerLabel(draft.triggerType)} />
              <SummaryRow icon={Filter} label="Conditions" value={`${totalConditions} configured`} />
              <SummaryRow icon={Sparkles} label="Actions" value={`${totalActions} configured`} />
              <SummaryRow icon={Clock3} label="Cooldown" value={draft.cooldown > 0 ? `${draft.cooldown}s` : "None"} />
            </div>
          </div>

          <div className="archivist-panel overflow-hidden">
            <div className="border-b border-white/6 px-4 py-4">
              <p className="text-sm font-semibold text-white">Live preview</p>
            </div>
            <div className="px-4 py-4">
              <CommandPreviewCard
                draft={draft}
                previewText={leadReply}
                selectedStudioDocuments={selectedStudioDocuments}
                compact
              />
            </div>
          </div>

          <div className="archivist-panel overflow-hidden">
            <div className="border-b border-white/6 px-4 py-4">
              <p className="text-sm font-semibold text-white">Recent failures</p>
            </div>
            <div className="space-y-3 px-4 py-4">
              {logs?.failures?.slice(0, 4).length ? (
                logs.failures.slice(0, 4).map((entry) => (
                  <div key={entry.id} className="rounded-[20px] border border-[#6A1F2A] bg-[#160F12] px-3 py-3">
                    <p className="text-sm font-medium text-white">/{entry.commandPath}</p>
                    <p className="mt-1 text-sm text-white/60">{entry.message}</p>
                    <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-white/30">{formatRelativeCommandTime(entry.createdAt)}</p>
                  </div>
                ))
              ) : (
                <EmptyBuilderRow label="No recent command failures." compact />
              )}
            </div>
          </div>

          <div className="archivist-panel overflow-hidden">
            <div className="border-b border-white/6 px-4 py-4">
              <p className="text-sm font-semibold text-white">Design Studio drafts</p>
            </div>
            <div className="space-y-2 px-4 py-4">
              {studioDocuments?.slice(0, 5).length ? (
                studioDocuments.slice(0, 5).map((document) => (
                  <div key={document.id} className="flex items-center justify-between rounded-[18px] border border-white/8 bg-[#0A0C0D] px-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{document.name}</p>
                      <p className="text-xs uppercase tracking-[0.18em] text-white/34">{document.kind}</p>
                    </div>
                    <MessageSquareText className="h-4 w-4 text-white/34" />
                  </div>
                ))
              ) : (
                <EmptyBuilderRow label="No Studio drafts yet." compact />
              )}
            </div>
          </div>
        </aside>
      </div>

      {isMobile && mobileView === "builder" ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/8 bg-[#090a0d]/96 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1600px] gap-2">
            {standaloneBuilder ? (
              <Button variant="outline" className="min-h-11 flex-1" onClick={() => onBackToList?.()}>
                Back
              </Button>
            ) : (
              <Button variant="outline" className="min-h-11 flex-1" onClick={() => setMobileView("list")}>
                Command List
              </Button>
            )}
            <Button className="min-h-11 flex-[1.35]" onClick={handleSave} disabled={createCommand.isPending || updateCommand.isPending}>
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BuilderSection({
  title,
  caption,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  caption: string;
  icon: typeof Braces;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[18px] border border-white/8 bg-[#0b0d10]">
      <div className="flex flex-col gap-3 border-b border-white/6 px-4 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-white/8 bg-[#120d11] text-[#ff6479]">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-base font-semibold text-white">{title}</p>
            <p className="text-sm text-white/46">{caption}</p>
          </div>
        </div>
        {action ? <div className="w-full md:w-auto [&>*]:w-full md:[&>*]:w-auto">{action}</div> : null}
      </div>
      <div className="space-y-4 px-4 py-4">{children}</div>
    </section>
  );
}

function TriggerSpecificPanel({
  triggerType,
  triggerConfig,
  aliases,
  response,
  roles,
  channels,
  onChange,
}: {
  triggerType: string;
  triggerConfig: CommandTriggerConfig;
  aliases: string[];
  response: string;
  roles: DiscordContextResponse["roles"];
  channels: DiscordContextResponse["channels"];
  onChange: (triggerConfig: CommandTriggerConfig) => void;
}) {
  const normalizedTriggerConfig = normalizeTriggerConfig(triggerType, triggerConfig);
  const errors = getTriggerConfigErrors(triggerType, normalizedTriggerConfig);
  const hint =
    triggerType === "keyword"
      ? `Archivist will watch for ${aliases.length > 0 ? aliases.join(", ") : "the command name"} inside message text.`
      : triggerType === "join"
        ? "Archivist will run this flow whenever a new member joins the server."
        : triggerType === "role_add"
          ? "Archivist will run this flow when a matching role is added to a member."
          : triggerType === "slash"
            ? "Archivist will register this as a live slash command in Discord."
            : triggerType === "button"
              ? "Archivist will run this command when a matching button custom ID is clicked."
              : triggerType === "select"
                ? "Archivist will run this command when a matching select menu choice is submitted."
                : triggerType === "schedule"
                  ? "Archivist will run this command on a cron schedule using the configured timezone."
                  : "Archivist will run this command when a matching reaction is added.";

  return (
    <div className="rounded-[16px] border border-white/8 bg-[#0d0f12] px-4 py-4">
      <p className="text-xs uppercase tracking-[0.18em] text-white/34">Trigger behavior</p>
      <p className="mt-2 text-sm leading-6 text-white/58">{hint}</p>
      {triggerType === "keyword" ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <InlineField label="Match mode">
            <select
              value={(normalizedTriggerConfig as KeywordTriggerConfig).matchMode}
              onChange={(event) =>
                onChange({
                  ...(normalizedTriggerConfig as KeywordTriggerConfig),
                  matchMode: event.target.value as KeywordTriggerConfig["matchMode"],
                })
              }
              className="archivist-field"
            >
              <option value="contains">Contains</option>
              <option value="starts_with">Starts with</option>
              <option value="exact">Exact match</option>
            </select>
          </InlineField>
          <ToggleField
            label="Case sensitive"
            value={Boolean((normalizedTriggerConfig as KeywordTriggerConfig).caseSensitive)}
            onChange={(checked) =>
              onChange({
                ...(normalizedTriggerConfig as KeywordTriggerConfig),
                caseSensitive: checked,
              })
            }
          />
        </div>
      ) : null}
      {triggerType === "button" ? (
        <div className="mt-4 space-y-3">
          <InlineField label="Button custom ID">
            <input
              value={(normalizedTriggerConfig as ButtonTriggerConfig).customId}
              onChange={(event) => onChange({ ...(normalizedTriggerConfig as ButtonTriggerConfig), customId: event.target.value })}
              className="archivist-field"
              placeholder="verify_me"
            />
          </InlineField>
          <ToggleField
            label="Allow any message"
            value={Boolean((normalizedTriggerConfig as ButtonTriggerConfig).allowAnyMessage)}
            onChange={(checked) =>
              onChange({
                ...(normalizedTriggerConfig as ButtonTriggerConfig),
                allowAnyMessage: checked,
                channelId: checked ? undefined : (normalizedTriggerConfig as ButtonTriggerConfig).channelId,
                messageId: checked ? undefined : (normalizedTriggerConfig as ButtonTriggerConfig).messageId,
              })
            }
          />
          {(normalizedTriggerConfig as ButtonTriggerConfig).allowAnyMessage ? null : (
            <div className="grid gap-3 md:grid-cols-2">
              <InlineField label="Channel scope">
                <select
                  value={(normalizedTriggerConfig as ButtonTriggerConfig).channelId || ""}
                  onChange={(event) => onChange({ ...(normalizedTriggerConfig as ButtonTriggerConfig), channelId: event.target.value || undefined })}
                  className="archivist-field"
                >
                  <option value="">Any channel</option>
                  {channels.map((channel) => (
                    <option key={channel.id} value={channel.id}>#{channel.name}</option>
                  ))}
                </select>
              </InlineField>
              <InlineField label="Specific message ID">
                <input
                  value={(normalizedTriggerConfig as ButtonTriggerConfig).messageId || ""}
                  onChange={(event) => onChange({ ...(normalizedTriggerConfig as ButtonTriggerConfig), messageId: event.target.value || undefined })}
                  className="archivist-field"
                  placeholder="123456789012345678"
                />
              </InlineField>
            </div>
          )}
        </div>
      ) : null}
      {triggerType === "select" ? (
        <div className="mt-4 space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <InlineField label="Select custom ID">
              <input
                value={(normalizedTriggerConfig as SelectTriggerConfig).customId}
                onChange={(event) => onChange({ ...(normalizedTriggerConfig as SelectTriggerConfig), customId: event.target.value })}
                className="archivist-field"
                placeholder="ticket_department"
              />
            </InlineField>
            <InlineField label="Allowed values">
              <input
                value={(normalizedTriggerConfig as SelectTriggerConfig).allowedValues.join(", ")}
                onChange={(event) =>
                  onChange({
                    ...(normalizedTriggerConfig as SelectTriggerConfig),
                    allowedValues: cleanStringList(event.target.value),
                  })
                }
                className="archivist-field"
                placeholder="billing, support"
              />
            </InlineField>
          </div>
          <ToggleField
            label="Allow any message"
            value={Boolean((normalizedTriggerConfig as SelectTriggerConfig).allowAnyMessage)}
            onChange={(checked) =>
              onChange({
                ...(normalizedTriggerConfig as SelectTriggerConfig),
                allowAnyMessage: checked,
                channelId: checked ? undefined : (normalizedTriggerConfig as SelectTriggerConfig).channelId,
                messageId: checked ? undefined : (normalizedTriggerConfig as SelectTriggerConfig).messageId,
              })
            }
          />
          {(normalizedTriggerConfig as SelectTriggerConfig).allowAnyMessage ? null : (
            <div className="grid gap-3 md:grid-cols-2">
              <InlineField label="Channel scope">
                <select
                  value={(normalizedTriggerConfig as SelectTriggerConfig).channelId || ""}
                  onChange={(event) => onChange({ ...(normalizedTriggerConfig as SelectTriggerConfig), channelId: event.target.value || undefined })}
                  className="archivist-field"
                >
                  <option value="">Any channel</option>
                  {channels.map((channel) => (
                    <option key={channel.id} value={channel.id}>#{channel.name}</option>
                  ))}
                </select>
              </InlineField>
              <InlineField label="Specific message ID">
                <input
                  value={(normalizedTriggerConfig as SelectTriggerConfig).messageId || ""}
                  onChange={(event) => onChange({ ...(normalizedTriggerConfig as SelectTriggerConfig), messageId: event.target.value || undefined })}
                  className="archivist-field"
                  placeholder="123456789012345678"
                />
              </InlineField>
            </div>
          )}
        </div>
      ) : null}
      {triggerType === "schedule" ? (
        <div className="mt-4 space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <InlineField label="Cron expression">
              <input
                value={(normalizedTriggerConfig as ScheduleTriggerConfig).cronExpression}
                onChange={(event) => onChange({ ...(normalizedTriggerConfig as ScheduleTriggerConfig), cronExpression: event.target.value })}
                className="archivist-field"
                placeholder="0 9 * * *"
              />
            </InlineField>
            <InlineField label="Timezone">
              <input
                value={(normalizedTriggerConfig as ScheduleTriggerConfig).timezone}
                onChange={(event) => onChange({ ...(normalizedTriggerConfig as ScheduleTriggerConfig), timezone: event.target.value })}
                className="archivist-field"
                placeholder="America/New_York"
              />
            </InlineField>
          </div>
          <InlineField label="Target channel">
            <select
              value={(normalizedTriggerConfig as ScheduleTriggerConfig).channelId || ""}
              onChange={(event) => onChange({ ...(normalizedTriggerConfig as ScheduleTriggerConfig), channelId: event.target.value || undefined })}
              className="archivist-field"
            >
              <option value="">Use command/default channel</option>
              {channels.map((channel) => (
                <option key={channel.id} value={channel.id}>#{channel.name}</option>
              ))}
            </select>
          </InlineField>
          <ToggleField
            label="Run missed invocation after boot"
            value={Boolean((normalizedTriggerConfig as ScheduleTriggerConfig).runMissedOnBoot)}
            onChange={(checked) =>
              onChange({
                ...(normalizedTriggerConfig as ScheduleTriggerConfig),
                runMissedOnBoot: checked,
              })
            }
          />
        </div>
      ) : null}
      {triggerType === "role_add" ? (
        <div className="mt-4 space-y-2">
          <span className="text-xs uppercase tracking-[0.18em] text-white/38">Watched roles</span>
          <select
            multiple
            value={(normalizedTriggerConfig as RoleAddTriggerConfig).watchedRoleIds}
            onChange={(event) =>
              onChange({
                ...(normalizedTriggerConfig as RoleAddTriggerConfig),
                watchedRoleIds: Array.from(event.currentTarget.selectedOptions).map((option) => option.value),
              })
            }
            className="archivist-field min-h-[148px]"
          >
            {roles.map((role) => (
              <option key={role.id} value={role.id}>{role.name}</option>
            ))}
          </select>
          <p className="text-xs leading-5 text-white/42">Leave this empty to react to any role being added.</p>
        </div>
      ) : null}
      {triggerType === "reaction" ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <InlineField label="Emoji">
            <input
              value={(normalizedTriggerConfig as ReactionTriggerConfig).emoji}
              onChange={(event) => onChange({ ...(normalizedTriggerConfig as ReactionTriggerConfig), emoji: event.target.value })}
              className="archivist-field"
              placeholder="✅"
            />
          </InlineField>
          <InlineField label="Channel scope">
            <select
              value={(normalizedTriggerConfig as ReactionTriggerConfig).channelId || ""}
              onChange={(event) => onChange({ ...(normalizedTriggerConfig as ReactionTriggerConfig), channelId: event.target.value || undefined })}
              className="archivist-field"
            >
              <option value="">Any channel</option>
              {channels.map((channel) => (
                <option key={channel.id} value={channel.id}>#{channel.name}</option>
              ))}
            </select>
          </InlineField>
          <InlineField label="Specific message ID">
            <input
              value={(normalizedTriggerConfig as ReactionTriggerConfig).messageId || ""}
              onChange={(event) => onChange({ ...(normalizedTriggerConfig as ReactionTriggerConfig), messageId: event.target.value || undefined })}
              className="archivist-field"
              placeholder="123456789012345678"
            />
          </InlineField>
        </div>
      ) : null}
      {errors.length > 0 ? (
        <div className="mt-4 rounded-[14px] border border-[#6A1F2A] bg-[#160F12] px-3 py-3 text-sm text-white/78">
          {errors[0]}
        </div>
      ) : null}
      {response ? (
        <p className="mt-3 rounded-[14px] border border-white/8 bg-[#0b0d10] px-3 py-3 text-sm text-white/68">
          Preview: {response.slice(0, 160)}
        </p>
      ) : null}
    </div>
  );
}

function InlineField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-2">
      <span className="text-xs uppercase tracking-[0.18em] text-white/38">{label}</span>
      {children}
    </label>
  );
}

function ToggleField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`flex items-center justify-between rounded-[16px] border px-4 py-3 transition ${
        value ? "border-[#7d2432] bg-[#151013] text-white" : "border-white/8 bg-[#0b0d10] text-white/62"
      }`}
    >
      <span className="text-sm font-medium">{label}</span>
      <span className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.18em] ${value ? "bg-[#8B1F2F]/30 text-white" : "bg-black/20 text-white/42"}`}>
        {value ? "On" : "Off"}
      </span>
    </button>
  );
}

function ConditionEditorRow({
  condition,
  roles,
  channels,
  onChange,
  onRemove,
}: {
  condition: CommandCondition;
  roles: DiscordContextResponse["roles"];
  channels: DiscordContextResponse["channels"];
  onChange: (condition: CommandCondition) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-[16px] border border-white/8 bg-[#0d0f12] p-3">
      <div className="grid gap-3 md:grid-cols-[180px_minmax(0,1fr)_96px]">
        <select
          value={condition.type}
          onChange={(event) => onChange({ ...condition, type: event.target.value as CommandCondition["type"] })}
          className="archivist-field"
        >
          {CONDITION_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>

        {condition.type === "hasRole" ? (
          <select value={condition.value || ""} onChange={(event) => onChange({ ...condition, value: event.target.value })} className="archivist-field">
            <option value="">Select role</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>{role.name}</option>
            ))}
          </select>
        ) : condition.type === "inChannel" ? (
          <select value={condition.value || ""} onChange={(event) => onChange({ ...condition, value: event.target.value })} className="archivist-field">
            <option value="">Select channel</option>
            {channels.map((channel) => (
              <option key={channel.id} value={channel.id}>#{channel.name}</option>
            ))}
          </select>
        ) : condition.type === "randomChance" ? (
          <input type="number" min={1} max={100} value={condition.chance || 50} onChange={(event) => onChange({ ...condition, chance: Number(event.target.value || 0) })} className="archivist-field" placeholder="Chance %" />
        ) : condition.type === "accountAge" ? (
          <input type="number" min={0} value={condition.days || 0} onChange={(event) => onChange({ ...condition, days: Number(event.target.value || 0) })} className="archivist-field" placeholder="Minimum days" />
        ) : (
          <input value={condition.value || ""} onChange={(event) => onChange({ ...condition, value: event.target.value })} className="archivist-field" placeholder={conditionLabel(condition.type)} />
        )}

        <Button variant="outline" onClick={onRemove} className="rounded-2xl border-white/10 bg-transparent text-white/62 hover:bg-white/[0.03]">
          Remove
        </Button>
      </div>
    </div>
  );
}

function ActionEditorRow({
  action,
  roles,
  channels,
  studioDocuments,
  onChange,
  onRemove,
}: {
  action: CommandAction;
  roles: DiscordContextResponse["roles"];
  channels: DiscordContextResponse["channels"];
  studioDocuments: StudioDocumentRecord[];
  onChange: (action: CommandAction) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-[16px] border border-white/8 bg-[#0d0f12] p-3">
      <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)_160px_96px]">
        <select value={action.type} onChange={(event) => onChange({ ...action, type: event.target.value as CommandAction["type"] })} className="archivist-field">
          {ACTION_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>

        {action.type === "wait" ? (
          <input type="number" min={0} value={action.duration || 0} onChange={(event) => onChange({ ...action, duration: Number(event.target.value || 0) })} className="archivist-field" placeholder="Delay in seconds" />
        ) : action.type === "sendStudio" ? (
          <select value={String(action.studioDocumentId || "")} onChange={(event) => onChange({ ...action, studioDocumentId: event.target.value ? Number(event.target.value) : undefined })} className="archivist-field">
            <option value="">Select Studio draft</option>
            {studioDocuments.map((document) => (
              <option key={document.id} value={document.id}>{document.name}</option>
            ))}
          </select>
        ) : action.type === "addRole" || action.type === "removeRole" ? (
          <select value={action.roleId || action.value || ""} onChange={(event) => onChange({ ...action, roleId: event.target.value, value: event.target.value })} className="archivist-field">
            <option value="">Select role</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>{role.name}</option>
            ))}
          </select>
        ) : action.type === "createChannel" ? (
          <input value={action.value || ""} onChange={(event) => onChange({ ...action, value: event.target.value })} className="archivist-field" placeholder="new-channel-name" />
        ) : action.type === "reply" || action.type === "sendDM" ? (
          <Textarea value={action.value || ""} onChange={(event) => onChange({ ...action, value: event.target.value })} className="min-h-[92px] rounded-[14px] border-white/10 bg-[#0b0d10] text-white placeholder:text-white/28" placeholder={actionLabel(action.type)} />
        ) : (
          <input value={action.value || ""} onChange={(event) => onChange({ ...action, value: event.target.value })} className="archivist-field" placeholder={actionLabel(action.type)} />
        )}

        <select
          value={action.channelId || ""}
          onChange={(event) => onChange({ ...action, channelId: event.target.value || undefined })}
          className="archivist-field"
        >
          <option value="">{action.type === "createChannel" ? "No category" : "Current channel"}</option>
          {channels.map((channel) => (
            <option key={channel.id} value={channel.id}>
              {channel.isCategory ? channel.name : `#${channel.name}`}
            </option>
          ))}
        </select>

        <Button variant="outline" onClick={onRemove} className="rounded-2xl border-white/10 bg-transparent text-white/62 hover:bg-white/[0.03]">
          Remove
        </Button>
      </div>
    </div>
  );
}

function RoleMultiValueInput({
  roles,
  values,
  onChange,
}: {
  roles: DiscordContextResponse["roles"];
  values: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <select value={values[0] || ""} onChange={(event) => onChange(event.target.value ? [event.target.value] : [])} className="archivist-field">
      <option value="">Any role</option>
      {roles.map((role) => (
        <option key={role.id} value={role.id}>{role.name}</option>
      ))}
    </select>
  );
}

function ChannelMultiValueInput({
  channels,
  values,
  onChange,
}: {
  channels: DiscordContextResponse["channels"];
  values: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <select value={values[0] || ""} onChange={(event) => onChange(event.target.value ? [event.target.value] : [])} className="archivist-field">
      <option value="">Any channel</option>
      {channels.map((channel) => (
        <option key={channel.id} value={channel.id}>#{channel.name}</option>
      ))}
    </select>
  );
}

function MetricPanel({
  label,
  value,
  icon: Icon,
  danger,
}: {
  label: string;
  value: string;
  icon: typeof Activity;
  danger?: boolean;
}) {
  return (
    <div className={`rounded-[16px] border px-4 py-3 ${danger ? "border-[#6A1F2A] bg-[#160F12]" : "border-white/8 bg-[#0b0d10]"}`}>
      <div className="flex items-center gap-2 text-white/68">
        <Icon className="h-4 w-4" />
        <span className="text-[10px] uppercase tracking-[0.22em]">{label}</span>
      </div>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function SummaryRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[16px] border border-white/8 bg-[#0b0d10] px-3 py-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-[12px] border border-white/8 bg-[#120d11] text-[#ff6479]">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-[0.18em] text-white/34">{label}</p>
        <p className="text-sm font-medium text-white">{value}</p>
      </div>
    </div>
  );
}

function BuilderTabButton({
  active,
  onClick,
  label,
  icon: Icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: typeof Braces;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-w-[108px] shrink-0 items-center justify-center gap-2 rounded-[16px] border px-3 py-2.5 text-[11px] uppercase tracking-[0.16em] transition sm:min-w-0 sm:flex-1 sm:text-xs ${
        active
          ? "border-[#7d2432] bg-[linear-gradient(180deg,rgba(177,18,38,0.26),rgba(23,12,15,0.96))] text-white"
          : "border-white/8 bg-[#0b0d10] text-white/48 hover:text-white/76"
      }`}
    >
      <Icon className="h-4 w-4" />
      <span className="truncate">{label}</span>
    </button>
  );
}

function CommandPreviewCard({
  draft,
  previewText,
  selectedStudioDocuments,
  compact,
}: {
  draft: CommandDraft;
  previewText: string;
  selectedStudioDocuments: Map<number, string>;
  compact?: boolean;
}) {
  const previewActions = (draft.actions || []).slice(0, 3);

  return (
    <div className={`overflow-hidden rounded-[22px] border border-[#6A1F2A] bg-[radial-gradient(circle_at_bottom,rgba(177,18,38,0.12),transparent_45%),#0d0f12] ${compact ? "" : ""}`}>
      <div className="border-b border-white/6 px-4 py-3">
        <p className="text-[11px] uppercase tracking-[0.2em] text-white/34">Live Preview</p>
      </div>
      <div className="space-y-4 px-4 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-[#7d2432] bg-[#120d11] shadow-[0_0_20px_rgba(177,18,38,0.2)]">
            <img src={archivistAvatar} alt="Archivist" className="h-8 w-8 object-contain" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-white">Archivist <span className="text-white/34">Bot</span></p>
            <p className="text-xs text-white/34">Preview of the current command response.</p>
          </div>
        </div>

        <div className="rounded-[18px] border border-white/8 bg-[#0b0d10] px-4 py-4">
          <p className="text-base font-medium text-white sm:text-lg">{previewText || "No response text yet. Add a reply or Studio action."}</p>
          {previewActions.length > 0 ? (
            <div className="mt-4 space-y-2">
              {previewActions.map((action, index) => (
                <div key={`${action.type}-${index}`} className="flex flex-col gap-1 rounded-[14px] border border-white/8 bg-[#090a0d] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm text-white/72">{actionLabel(action.type)}</span>
                  <span className="text-xs uppercase tracking-[0.16em] text-white/34 sm:max-w-[55%] sm:truncate sm:text-right">
                    {action.type === "sendStudio"
                      ? selectedStudioDocuments.get(action.studioDocumentId || 0) || "Select draft"
                      : action.type === "wait"
                        ? `${action.duration || 0}s`
                        : action.type === "createChannel"
                          ? action.value || "new-channel"
                          : action.value || "Configured"}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function EmptyBuilderRow({ label, compact }: { label: string; compact?: boolean }) {
  return (
    <div className={`rounded-[16px] border border-dashed border-white/10 bg-[#0b0d10] text-sm text-white/42 ${compact ? "px-3 py-4" : "px-4 py-5"}`}>
      {label}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-2 text-sm transition ${active ? "border-[#7d2432] bg-[#151013] text-white" : "border-white/8 bg-[#0b0d10] text-white/52 hover:text-white"}`}
    >
      {children}
    </button>
  );
}
