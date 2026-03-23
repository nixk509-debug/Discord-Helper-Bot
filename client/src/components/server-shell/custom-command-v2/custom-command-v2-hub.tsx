import { useMemo, useState } from "react";
import { AlertTriangle, ArrowUpRight, Clock3, Plus, Search, Sparkles, WandSparkles } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { buildArchivistItemPath } from "@/lib/archivist-workspace";
import { useServerCommandsV2, type ArchivistCommandV2 } from "@/hooks/use-bot";

type HubFilter = "all" | "drafts" | "published" | "slash" | "message" | "button" | "auto" | "failed";

const HUB_FILTERS: Array<{ value: HubFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "drafts", label: "Drafts" },
  { value: "published", label: "Published" },
  { value: "slash", label: "Slash" },
  { value: "message", label: "Message" },
  { value: "button", label: "Button" },
  { value: "auto", label: "Auto" },
  { value: "failed", label: "Failed" },
];

function getCommandFamily(command: ArchivistCommandV2) {
  switch (command.definition.trigger.type) {
    case "slash":
      return "slash";
    case "keyword":
      return "message";
    case "button":
    case "select":
    case "modal_submit":
      return "button";
    default:
      return "auto";
  }
}

function getIssueCounts(command: ArchivistCommandV2) {
  const issues = command.lastValidation || [];
  return {
    errors: issues.filter((entry) => entry.severity === "error").length,
    warnings: issues.filter((entry) => entry.severity === "warning").length,
  };
}

function formatRelativeDate(value: string | Date | null | undefined) {
  if (!value) return "Recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function getStatusLabel(command: ArchivistCommandV2) {
  if (command.definition.behavior.enabled === false) return "Draft";
  return "Published";
}

function matchesFilter(command: ArchivistCommandV2, filter: HubFilter) {
  const issues = getIssueCounts(command);
  const family = getCommandFamily(command);
  switch (filter) {
    case "drafts":
      return command.definition.behavior.enabled === false;
    case "published":
      return command.definition.behavior.enabled !== false;
    case "slash":
      return family === "slash";
    case "message":
      return family === "message";
    case "button":
      return family === "button";
    case "auto":
      return family === "auto";
    case "failed":
      return issues.errors > 0;
    case "all":
    default:
      return true;
  }
}

function matchesQuery(command: ArchivistCommandV2, query: string) {
  if (!query) return true;
  const haystack = [
    command.name,
    command.definition.meta.description,
    command.definition.meta.category,
    ...(command.definition.meta.tags || []),
    command.definition.trigger.type,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

function CommandStatChip({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "danger";
}) {
  return (
    <div className={cn(
      "rounded-[20px] border px-4 py-3",
      tone === "danger" ? "border-rose-500/20 bg-rose-500/[0.08]" : "border-white/8 bg-[#111318]",
    )}>
      <p className="text-[11px] uppercase tracking-[0.18em] text-white/38">{label}</p>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

function FilterChip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-2 text-xs font-medium uppercase tracking-[0.14em] transition",
        active
          ? "border-[#9f3144] bg-[#211217] text-white"
          : "border-white/10 bg-[#111318] text-white/56 hover:border-white/16 hover:text-white",
      )}
    >
      {children}
    </button>
  );
}

function CommandCard({
  command,
  serverId,
}: {
  command: ArchivistCommandV2;
  serverId: number;
}) {
  const [, navigate] = useLocation();
  const issues = getIssueCounts(command);
  const family = getCommandFamily(command);

  return (
    <button
      type="button"
      onClick={() => navigate(buildArchivistItemPath(serverId, "commands", "create-command", { search: { commandId: command.id } }))}
      className="w-full rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(10,11,14,0.96))] p-4 text-left transition hover:border-[#933244] hover:bg-[linear-gradient(180deg,rgba(177,18,38,0.12),rgba(10,11,14,0.98))]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold text-white">{command.name}</p>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/64">{family}</span>
            <span className={cn(
              "rounded-full border px-2.5 py-1 text-[11px]",
              command.definition.behavior.enabled === false
                ? "border-amber-500/20 bg-amber-500/[0.10] text-amber-100"
                : "border-emerald-500/20 bg-emerald-500/[0.10] text-emerald-100",
            )}>
              {getStatusLabel(command)}
            </span>
            {issues.errors > 0 ? (
              <span className="rounded-full border border-rose-500/20 bg-rose-500/[0.10] px-2.5 py-1 text-[11px] text-rose-100">
                {issues.errors} issue{issues.errors === 1 ? "" : "s"}
              </span>
            ) : null}
            {issues.warnings > 0 ? (
              <span className="rounded-full border border-amber-500/20 bg-amber-500/[0.10] px-2.5 py-1 text-[11px] text-amber-100">
                {issues.warnings} warning{issues.warnings === 1 ? "" : "s"}
              </span>
            ) : null}
          </div>
          <p className="text-sm leading-6 text-white/54">
            {command.definition.meta.description || "No internal description yet."}
          </p>
        </div>
        <ArrowUpRight className="h-4 w-4 text-white/36" />
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <div className="rounded-[18px] border border-white/8 bg-[#111318] px-3 py-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-white/34">Actions</p>
          <p className="mt-2 text-sm font-medium text-white">{command.definition.workflow.steps.length}</p>
        </div>
        <div className="rounded-[18px] border border-white/8 bg-[#111318] px-3 py-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-white/34">Last edited</p>
          <p className="mt-2 text-sm font-medium text-white">{formatRelativeDate(command.updatedAt)}</p>
        </div>
        <div className="rounded-[18px] border border-white/8 bg-[#111318] px-3 py-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-white/34">Trigger</p>
          <p className="mt-2 text-sm font-medium text-white">{command.definition.trigger.type.replace(/_/g, " ")}</p>
        </div>
      </div>
    </button>
  );
}

function CommandLane({
  title,
  description,
  commands,
  serverId,
  emptyLabel,
}: {
  title: string;
  description: string;
  commands: ArchivistCommandV2[];
  serverId: number;
  emptyLabel: string;
}) {
  return (
    <Card className="archivist-panel">
      <CardHeader>
        <CardTitle className="text-white">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {commands.length ? commands.map((command) => (
          <CommandCard key={command.id} command={command} serverId={serverId} />
        )) : (
          <div className="rounded-[20px] border border-dashed border-white/10 bg-[#0a0c0f] px-4 py-5 text-sm text-white/46">
            {emptyLabel}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function CustomCommandV2Hub({
  serverId,
  initialFilter = "all",
}: {
  serverId: number;
  initialFilter?: HubFilter;
}) {
  const [, navigate] = useLocation();
  const commandsQuery = useServerCommandsV2(serverId);
  const commands = commandsQuery.data || [];
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<HubFilter>(initialFilter);

  const filteredCommands = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return commands
      .filter((command) => matchesFilter(command, filter))
      .filter((command) => matchesQuery(command, normalizedQuery))
      .sort((left, right) => {
        const leftTime = new Date(left.updatedAt || left.createdAt || 0).getTime();
        const rightTime = new Date(right.updatedAt || right.createdAt || 0).getTime();
        return rightTime - leftTime;
      });
  }, [commands, filter, query]);

  const drafts = commands.filter((command) => command.definition.behavior.enabled === false);
  const failed = commands.filter((command) => getIssueCounts(command).errors > 0);
  const unpublished = commands.filter((command) => command.definition.behavior.enabled === false || getIssueCounts(command).warnings > 0);
  const recentlyEdited = [...commands].sort((left, right) => {
    const leftTime = new Date(left.updatedAt || left.createdAt || 0).getTime();
    const rightTime = new Date(right.updatedAt || right.createdAt || 0).getTime();
    return rightTime - leftTime;
  }).slice(0, 3);

  return (
    <div className="space-y-4">
      <Card className="archivist-panel overflow-hidden">
        <CardHeader className="border-b border-white/8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="archivist-kicker">Custom Commands</p>
              <CardTitle className="text-[1.8rem] text-white sm:text-[2.2rem]">Command Hub</CardTitle>
              <CardDescription className="max-w-2xl">
                Search the library, surface broken drafts fast, and jump straight into the next command job without fake overview filler.
              </CardDescription>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <Button className="min-h-11 rounded-[18px]" onClick={() => navigate(buildArchivistItemPath(serverId, "commands", "create-command"))}>
                <Plus className="h-4 w-4" />
                New Command
              </Button>
              <Button variant="outline" className="min-h-11 rounded-[18px] border-white/10 bg-white/[0.03]" onClick={() => navigate(buildArchivistItemPath(serverId, "commands", "import-export"))}>
                <WandSparkles className="h-4 w-4" />
                Import JSON
              </Button>
              <Button variant="outline" className="min-h-11 rounded-[18px] border-white/10 bg-white/[0.03]" onClick={() => navigate(buildArchivistItemPath(serverId, "commands", "logs"))}>
                <Clock3 className="h-4 w-4" />
                Activity
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <CommandStatChip label="Total Commands" value={String(commands.length)} />
            <CommandStatChip label="Drafts" value={String(drafts.length)} />
            <CommandStatChip label="Failures" value={String(failed.length)} tone={failed.length ? "danger" : "default"} />
            <CommandStatChip label="Unpublished" value={String(unpublished.length)} />
          </div>

          <div className="rounded-[24px] border border-white/8 bg-[#0c0f13] p-4">
            <div className="flex items-center gap-3 rounded-[18px] border border-white/8 bg-[#111318] px-4 py-3">
              <Search className="h-4 w-4 text-white/40" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search commands, tags, triggers, or notes"
                className="border-0 bg-transparent px-0 py-0 shadow-none focus-visible:ring-0"
              />
            </div>

            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {HUB_FILTERS.map((entry) => (
                <FilterChip key={entry.value} active={filter === entry.value} onClick={() => setFilter(entry.value)}>
                  {entry.label}
                </FilterChip>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <CommandLane
        title="Command Library"
        description="Your main command inventory, filtered down to the work that matters right now."
        commands={filteredCommands}
        serverId={serverId}
        emptyLabel="No commands match the current search and filters."
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <CommandLane
          title="Recent Drafts"
          description="Disabled or in-progress commands you can finish quickly."
          commands={drafts.slice(0, 3)}
          serverId={serverId}
          emptyLabel="No draft commands are waiting right now."
        />
        <CommandLane
          title="Recently Edited"
          description="Jump back into the last commands you touched."
          commands={recentlyEdited}
          serverId={serverId}
          emptyLabel="No recent edits have landed yet."
        />
        <CommandLane
          title="Needs Attention"
          description="Validation errors and warnings that need a deliberate fix."
          commands={commands.filter((command) => {
            const issues = getIssueCounts(command);
            return issues.errors > 0 || issues.warnings > 0;
          }).slice(0, 3)}
          serverId={serverId}
          emptyLabel="Nothing is currently flagged for repair."
        />
      </div>
    </div>
  );
}
