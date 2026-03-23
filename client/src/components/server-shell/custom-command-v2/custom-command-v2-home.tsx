import { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Clock3,
  FileCode2,
  History,
  Import,
  Plus,
  Search,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { summarizeCustomCommandV2 } from "@shared/custom-command-v2";
import { useCommandLogs, useServerCommandsV2, type ArchivistCommandV2 } from "@/hooks/use-bot";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { buildArchivistItemPath } from "@/lib/archivist-workspace";
import { CustomCommandV2ImportModal } from "./custom-command-v2-import-modal";

type HomeScreen = "hub" | "import" | "activity";
type HubFilter = "all" | "drafts" | "published" | "slash" | "message" | "button" | "auto" | "failed";
type ActivityFilter = "runs" | "failures" | "imports" | "edited";

function formatDate(value: string | Date | null | undefined) {
  if (!value) return "Recently";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function getTriggerFamily(command: ArchivistCommandV2) {
  switch (command.triggerType) {
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

function getStatusTone(command: ArchivistCommandV2) {
  const issues = command.lastValidation || [];
  if (issues.some((entry) => entry.severity === "error")) return "danger";
  if (!command.enabled) return "draft";
  if (issues.some((entry) => entry.severity === "warning")) return "warning";
  return "live";
}

function getStatusLabel(command: ArchivistCommandV2) {
  const tone = getStatusTone(command);
  if (tone === "danger") return "Failed";
  if (tone === "draft") return "Draft";
  if (tone === "warning") return "Warnings";
  return "Published";
}

function StatChip({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "danger" | "accent";
}) {
  return (
    <div
      className={cn(
        "rounded-[18px] border px-4 py-3",
        tone === "danger"
          ? "border-rose-500/20 bg-rose-500/[0.08]"
          : tone === "accent"
            ? "border-[#b6374b]/35 bg-[#190e13]"
            : "border-white/8 bg-[#111318]",
      )}
    >
      <p className="text-[10px] uppercase tracking-[0.18em] text-white/38">{label}</p>
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
          ? "border-[#c5485d] bg-[#251118] text-white"
          : "border-white/10 bg-[#101216] text-white/58 hover:border-white/18 hover:text-white",
      )}
    >
      {children}
    </button>
  );
}

function CommandStatusBadge({ command }: { command: ArchivistCommandV2 }) {
  const tone = getStatusTone(command);
  return (
    <span
      className={cn(
        "rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em]",
        tone === "danger"
          ? "border-rose-500/20 bg-rose-500/[0.08] text-white"
          : tone === "warning"
            ? "border-amber-500/20 bg-amber-500/[0.08] text-white"
            : tone === "draft"
              ? "border-white/10 bg-white/[0.04] text-white/76"
              : "border-emerald-500/20 bg-emerald-500/[0.08] text-white",
      )}
    >
      {getStatusLabel(command)}
    </span>
  );
}

function CommandCard({
  serverId,
  command,
}: {
  serverId: number;
  command: ArchivistCommandV2;
}) {
  const preview = summarizeCustomCommandV2(command.definition);
  const hasWarning = (command.lastValidation || []).length > 0 || !command.enabled;

  return (
    <Link href={buildArchivistItemPath(serverId, "commands", "create-command", { search: { commandId: command.id } })}>
      <a className="block rounded-[24px] border border-white/8 bg-[#111318] p-4 transition hover:border-[#b64357] hover:bg-[#15181e]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold text-white">{command.name}</p>
              {hasWarning ? (
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-white/70">
                  Needs review
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-white/48">{preview.triggerLabel}</p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-white/26" />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <CommandStatusBadge command={command} />
          <span className="rounded-full border border-white/10 bg-[#0c0f13] px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-white/62">
            {getTriggerFamily(command)}
          </span>
          <span className="rounded-full border border-white/10 bg-[#0c0f13] px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-white/62">
            {command.definition.workflow.steps.length} actions
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 text-xs text-white/38">
          <span>{preview.actionsSummary}</span>
          <span>Edited {formatDate(command.updatedAt)}</span>
        </div>
      </a>
    </Link>
  );
}

function ActivityRow({
  title,
  detail,
  stamp,
  badge,
  tone = "default",
}: {
  title: string;
  detail: string;
  stamp: string;
  badge: string;
  tone?: "default" | "danger" | "warning";
}) {
  return (
    <div
      className={cn(
        "rounded-[20px] border p-4",
        tone === "danger"
          ? "border-rose-500/20 bg-rose-500/[0.08]"
          : tone === "warning"
            ? "border-amber-500/20 bg-amber-500/[0.08]"
            : "border-white/8 bg-[#111318]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="mt-1 text-sm text-white/56">{detail}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-[#0c0f13] px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-white/68">
          {badge}
        </span>
      </div>
      <p className="mt-3 text-xs text-white/38">{stamp}</p>
    </div>
  );
}

export function CustomCommandV2Home({
  serverId,
  screen,
  initialFilter = "all",
}: {
  serverId: number;
  screen: HomeScreen;
  initialFilter?: HubFilter;
}) {
  const commandsQuery = useServerCommandsV2(serverId);
  const logsQuery = useCommandLogs(serverId);
  const [query, setQuery] = useState("");
  const [hubFilter, setHubFilter] = useState<HubFilter>(initialFilter);
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("runs");
  const [importOpen, setImportOpen] = useState(screen === "import");
  const commands = commandsQuery.data || [];
  const logs = logsQuery.data;

  const derived = useMemo(() => {
    const filtered = commands.filter((command) => {
      const haystack = [
        command.name,
        command.slug,
        command.definition.meta.description || "",
        command.definition.meta.category || "",
        ...(command.definition.meta.tags || []),
      ]
        .join(" ")
        .toLowerCase();

      const failed = (command.lastValidation || []).some((entry) => entry.severity === "error");
      const family = getTriggerFamily(command);
      const matchesFilter =
        hubFilter === "all"
        || (hubFilter === "drafts" && !command.enabled)
        || (hubFilter === "published" && command.enabled)
        || (hubFilter === "failed" && failed)
        || (hubFilter === family);

      const matchesQuery = !query.trim() || haystack.includes(query.trim().toLowerCase());
      return matchesFilter && matchesQuery;
    });

    const sortedRecent = [...commands].sort(
      (left, right) => new Date(right.updatedAt || 0).getTime() - new Date(left.updatedAt || 0).getTime(),
    );

    return {
      filtered,
      recentDrafts: sortedRecent.filter((command) => !command.enabled).slice(0, 4),
      recentlyEdited: sortedRecent.slice(0, 6),
      needsAttention: sortedRecent.filter((command) => (command.lastValidation || []).length > 0 || !command.enabled).slice(0, 6),
      imported: sortedRecent.filter((command) => command.importSource?.kind && command.importSource.kind !== "dashboard").slice(0, 6),
      total: commands.length,
      drafts: commands.filter((command) => !command.enabled).length,
      failures: commands.filter((command) => (command.lastValidation || []).some((entry) => entry.severity === "error")).length,
      unpublished: commands.filter((command) => !command.enabled || (command.lastValidation || []).length > 0).length,
    };
  }, [commands, hubFilter, query]);

  const activityRows = useMemo(() => {
    if (activityFilter === "runs") {
      return (logs?.activity || []).slice(0, 8).map((entry) => ({
        id: entry.id,
        title: entry.commandPath,
        detail: entry.summary,
        stamp: `Ran ${formatDate(entry.createdAt)}`,
        badge: entry.status === "success" ? "Run" : "Failure",
        tone: entry.status === "failure" ? "danger" as const : "default" as const,
      }));
    }
    if (activityFilter === "failures") {
      return (logs?.failures || []).slice(0, 8).map((entry) => ({
        id: entry.id,
        title: entry.commandPath,
        detail: entry.message || entry.summary,
        stamp: `Failed ${formatDate(entry.createdAt)}`,
        badge: entry.code || "Failure",
        tone: "danger" as const,
      }));
    }
    if (activityFilter === "imports") {
      return derived.imported.map((command) => ({
        id: `import-${command.id}`,
        title: command.name,
        detail: `Imported from ${command.importSource?.kind || "unknown"} and ready for review.`,
        stamp: `Edited ${formatDate(command.updatedAt)}`,
        badge: "Import",
        tone: "default" as const,
      }));
    }
    if (activityFilter === "edited") {
      return derived.recentlyEdited.map((command) => ({
        id: `edited-${command.id}`,
        title: command.name,
        detail: summarizeCustomCommandV2(command.definition).actionsSummary,
        stamp: `Edited ${formatDate(command.updatedAt)}`,
        badge: "Edited",
        tone: "default" as const,
      }));
    }
    return derived.recentDrafts.map((command) => ({
      id: `draft-${command.id}`,
      title: command.name,
      detail: "Draft command waiting for review or publish.",
      stamp: `Edited ${formatDate(command.updatedAt)}`,
      badge: "Draft",
      tone: "warning" as const,
    }));
  }, [activityFilter, derived, logs]);

  return (
    <div className="space-y-5">
      {screen === "hub" ? (
        <>
          <Card className="archivist-panel overflow-hidden">
            <CardHeader className="border-b border-white/8">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-2">
                  <p className="archivist-eyebrow">Custom Commands</p>
                  <CardTitle className="text-[1.85rem] text-white">Command Hub</CardTitle>
                  <CardDescription>
                    Search the library, start a clean draft, import safe JSON, and surface commands that still need review.
                  </CardDescription>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Link href={buildArchivistItemPath(serverId, "commands", "create-command")}>
                    <Button className="rounded-[18px]">
                      <Plus className="h-4 w-4" />
                      New Command
                    </Button>
                  </Link>
                  <Link href={buildArchivistItemPath(serverId, "commands", "import-export")}>
                    <Button variant="outline" className="rounded-[18px] border-white/10 bg-white/[0.03]">
                      <Import className="h-4 w-4" />
                      Import JSON
                    </Button>
                  </Link>
                  <Link href={buildArchivistItemPath(serverId, "commands", "logs")}>
                    <Button variant="outline" className="rounded-[18px] border-white/10 bg-white/[0.03]">
                      <History className="h-4 w-4" />
                      Activity
                    </Button>
                  </Link>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4 md:p-6">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatChip label="Total Commands" value={String(derived.total)} tone="accent" />
                <StatChip label="Drafts" value={String(derived.drafts)} />
                <StatChip label="Failures" value={String(derived.failures)} tone={derived.failures ? "danger" : "default"} />
                <StatChip label="Unpublished" value={String(derived.unpublished)} />
              </div>

              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search command names, descriptions, or tags"
                    className="h-12 rounded-[18px] border-white/10 bg-[#111318] pl-11"
                  />
                </div>
                <Link href={buildArchivistItemPath(serverId, "commands", "create-command")}>
                  <Button variant="outline" className="h-12 rounded-[18px] border-white/10 bg-white/[0.03]">
                    <WandSparkles className="h-4 w-4" />
                    Generate With AI
                  </Button>
                </Link>
              </div>

              <div className="flex flex-wrap gap-2">
                {([
                  ["all", "All"],
                  ["drafts", "Drafts"],
                  ["published", "Published"],
                  ["slash", "Slash"],
                  ["message", "Message"],
                  ["button", "Button"],
                  ["auto", "Auto"],
                  ["failed", "Failed"],
                ] as const).map(([value, label]) => (
                  <FilterChip key={value} active={hubFilter === value} onClick={() => setHubFilter(value)}>
                    {label}
                  </FilterChip>
                ))}
              </div>

              <div className="grid gap-3">
                {derived.filtered.length ? (
                  derived.filtered.map((command) => <CommandCard key={command.id} serverId={serverId} command={command} />)
                ) : (
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-[#111318] px-4 py-5 text-sm text-white/50">
                    No commands match this library filter yet.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="archivist-panel archivist-panel-muted">
              <CardHeader>
                <CardTitle className="text-white">Recent Drafts</CardTitle>
                <CardDescription>Commands still waiting to be reviewed or published.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {derived.recentDrafts.length ? derived.recentDrafts.map((command) => (
                  <CommandCard key={`draft-${command.id}`} serverId={serverId} command={command} />
                )) : (
                  <div className="rounded-[18px] border border-dashed border-white/10 bg-[#111318] px-4 py-4 text-sm text-white/52">
                    No draft commands right now.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="archivist-panel archivist-panel-muted">
              <CardHeader>
                <CardTitle className="text-white">Recently Edited</CardTitle>
                <CardDescription>The last commands touched in this server workspace.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {derived.recentlyEdited.length ? derived.recentlyEdited.slice(0, 4).map((command) => (
                  <CommandCard key={`recent-${command.id}`} serverId={serverId} command={command} />
                )) : (
                  <div className="rounded-[18px] border border-dashed border-white/10 bg-[#111318] px-4 py-4 text-sm text-white/52">
                    No recent edits yet.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="archivist-panel archivist-panel-muted">
              <CardHeader>
                <CardTitle className="text-white">Needs Attention</CardTitle>
                <CardDescription>Failures, warnings, and commands still carrying draft risk.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {derived.needsAttention.length ? derived.needsAttention.slice(0, 4).map((command) => (
                  <CommandCard key={`issue-${command.id}`} serverId={serverId} command={command} />
                )) : (
                  <div className="rounded-[18px] border border-dashed border-white/10 bg-[#111318] px-4 py-4 text-sm text-white/52">
                    Everything looks clean right now.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}

      {screen === "activity" ? (
        <Card className="archivist-panel overflow-hidden">
          <CardHeader className="border-b border-white/8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <p className="archivist-eyebrow">Custom Commands</p>
                <CardTitle className="text-[1.85rem] text-white">Activity</CardTitle>
                <CardDescription>
                  Check recent runs, failures, imports, and commands edited most recently.
                </CardDescription>
              </div>
              <Link href={buildArchivistItemPath(serverId, "commands", "create-command")}>
                <Button className="rounded-[18px]">
                  <Plus className="h-4 w-4" />
                  New Command
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <Tabs value={activityFilter} onValueChange={(value) => setActivityFilter(value as ActivityFilter)} className="space-y-4">
              <TabsList>
                <TabsTrigger value="runs">Runs</TabsTrigger>
                <TabsTrigger value="failures">Failures</TabsTrigger>
                <TabsTrigger value="imports">Imports</TabsTrigger>
                <TabsTrigger value="edited">Edited</TabsTrigger>
              </TabsList>
              <TabsContent value={activityFilter} className="space-y-3">
                {activityRows.length ? activityRows.map((row) => (
                  <ActivityRow key={row.id} title={row.title} detail={row.detail} stamp={row.stamp} badge={row.badge} tone={row.tone} />
                )) : (
                  <div className="rounded-[20px] border border-dashed border-white/10 bg-[#111318] px-4 py-5 text-sm text-white/52">
                    Nothing in this activity lane right now.
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      ) : null}

      {screen === "import" ? (
        <Card className="archivist-panel overflow-hidden">
          <CardHeader className="border-b border-white/8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <p className="archivist-eyebrow">Custom Commands</p>
                <CardTitle className="text-[1.85rem] text-white">Import / AI Builder</CardTitle>
                <CardDescription>
                  Bring in one safe command object, validate it, preview the workflow, and open it in the builder as a draft.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button className="rounded-[18px]" onClick={() => setImportOpen(true)}>
                  <FileCode2 className="h-4 w-4" />
                  Paste JSON
                </Button>
                <Button variant="outline" className="rounded-[18px] border-white/10 bg-white/[0.03]" onClick={() => setImportOpen(true)}>
                  <Sparkles className="h-4 w-4" />
                  Generate Prompt
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 p-4 md:p-6 xl:grid-cols-3">
            <div className="rounded-[24px] border border-white/8 bg-[#111318] p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-[16px] border border-white/10 bg-[#0b0d10] text-white/78">
                <FileCode2 className="h-4 w-4" />
              </div>
              <p className="mt-4 text-sm font-semibold text-white">1. Input</p>
              <p className="mt-2 text-sm leading-6 text-white/56">
                Paste exactly one Archivist command JSON object or generate a stricter chatbot prompt first.
              </p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-[#111318] p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-[16px] border border-white/10 bg-[#0b0d10] text-white/78">
                <Bot className="h-4 w-4" />
              </div>
              <p className="mt-4 text-sm font-semibold text-white">2. Validate</p>
              <p className="mt-2 text-sm leading-6 text-white/56">
                Archivist strips wrappers, catches parse errors, shows repairs, and blocks unsafe or unsupported structure.
              </p>
            </div>
            <div className="rounded-[24px] border border-white/8 bg-[#111318] p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-[16px] border border-white/10 bg-[#0b0d10] text-white/78">
                <Clock3 className="h-4 w-4" />
              </div>
              <p className="mt-4 text-sm font-semibold text-white">3. Preview & Import</p>
              <p className="mt-2 text-sm leading-6 text-white/56">
                Review the command summary, warnings, and output preview before importing it as a draft and opening the builder.
              </p>
            </div>

            <div className="xl:col-span-3 grid gap-4 md:grid-cols-2">
              <div className="rounded-[24px] border border-white/8 bg-[#111318] p-5">
                <p className="text-sm font-semibold text-white">Paste JSON</p>
                <p className="mt-2 text-sm leading-6 text-white/56">
                  Best when you already have a hand-written or AI-generated Archivist command object and want validation plus repair hints.
                </p>
              </div>
              <div className="rounded-[24px] border border-white/8 bg-[#111318] p-5">
                <p className="text-sm font-semibold text-white">Generate Prompt For AI</p>
                <p className="mt-2 text-sm leading-6 text-white/56">
                  Best when you want Archivist to generate a stricter import-safe prompt so the chatbot returns one valid JSON object with no markdown wrapper.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <CustomCommandV2ImportModal
        serverId={serverId}
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={(command) => {
          window.location.href = buildArchivistItemPath(serverId, "commands", "create-command", { search: { commandId: command.id } });
        }}
      />
    </div>
  );
}
