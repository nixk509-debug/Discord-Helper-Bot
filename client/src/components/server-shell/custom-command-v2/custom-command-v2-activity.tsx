import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, FileWarning, History, PencilLine } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { buildArchivistItemPath } from "@/lib/archivist-workspace";
import { useLocation } from "wouter";
import { useCommandLogs, useServerCommandsV2, type ArchivistCommandV2 } from "@/hooks/use-bot";
import { cn } from "@/lib/utils";

type ActivityTab = "runs" | "failures" | "imports" | "drafts";

function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "Recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function ActivityRow({
  title,
  subtitle,
  status,
  time,
  onOpen,
}: {
  title: string;
  subtitle: string;
  status: string;
  time: string;
  onOpen?: () => void;
}) {
  return (
    <div className="rounded-[20px] border border-white/8 bg-[#101216] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="mt-1 text-sm leading-6 text-white/50">{subtitle}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/68">
          {status}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.16em] text-white/34">{time}</p>
        {onOpen ? (
          <Button variant="ghost" size="sm" className="rounded-full text-white/68 hover:bg-white/[0.04] hover:text-white" onClick={onOpen}>
            Open
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-[20px] border border-dashed border-white/10 bg-[#0a0c0f] px-4 py-5 text-sm text-white/46">
      {label}
    </div>
  );
}

function issueSummary(command: ArchivistCommandV2) {
  const issues = command.lastValidation || [];
  const errors = issues.filter((entry) => entry.severity === "error").length;
  const warnings = issues.filter((entry) => entry.severity === "warning").length;
  return { errors, warnings };
}

export function CustomCommandV2Activity({ serverId }: { serverId: number }) {
  const [, navigate] = useLocation();
  const logsQuery = useCommandLogs(serverId, { enabled: !!serverId });
  const commandsQuery = useServerCommandsV2(serverId, { enabled: !!serverId });
  const [tab, setTab] = useState<ActivityTab>("runs");
  const commands = commandsQuery.data || [];
  const logs = logsQuery.data;

  const importRows = useMemo(
    () =>
      [...commands]
        .filter((command) => command.importSource)
        .sort((left, right) => new Date(right.updatedAt || right.createdAt || 0).getTime() - new Date(left.updatedAt || left.createdAt || 0).getTime())
        .slice(0, 12),
    [commands],
  );

  const draftRows = useMemo(
    () =>
      [...commands]
        .filter((command) => command.definition.behavior.enabled === false || issueSummary(command).warnings > 0)
        .sort((left, right) => new Date(right.updatedAt || right.createdAt || 0).getTime() - new Date(left.updatedAt || left.createdAt || 0).getTime())
        .slice(0, 12),
    [commands],
  );

  const failureRows = useMemo(
    () =>
      [...commands]
        .filter((command) => issueSummary(command).errors > 0)
        .sort((left, right) => new Date(right.updatedAt || right.createdAt || 0).getTime() - new Date(left.updatedAt || left.createdAt || 0).getTime())
        .slice(0, 12),
    [commands],
  );

  return (
    <Card className="archivist-panel overflow-hidden">
      <CardHeader className="border-b border-white/8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="archivist-kicker">Custom Commands</p>
            <CardTitle className="text-[1.8rem] text-white sm:text-[2.2rem]">Activity</CardTitle>
            <CardDescription>
              Recent runs, failures, imports, and unpublished draft work for the command forge.
            </CardDescription>
          </div>
          <div className="grid gap-2 sm:grid-cols-4">
            <div className="rounded-[18px] border border-white/8 bg-[#111318] px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-white/38">Runs</p>
              <p className="mt-2 text-lg font-semibold text-white">{logs?.activity?.length || 0}</p>
            </div>
            <div className="rounded-[18px] border border-white/8 bg-[#111318] px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-white/38">Failures</p>
              <p className="mt-2 text-lg font-semibold text-white">{failureRows.length}</p>
            </div>
            <div className="rounded-[18px] border border-white/8 bg-[#111318] px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-white/38">Imports</p>
              <p className="mt-2 text-lg font-semibold text-white">{importRows.length}</p>
            </div>
            <div className="rounded-[18px] border border-white/8 bg-[#111318] px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-white/38">Drafts</p>
              <p className="mt-2 text-lg font-semibold text-white">{draftRows.length}</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <Tabs value={tab} onValueChange={(value) => setTab(value as ActivityTab)}>
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="runs"><History className="mr-2 h-4 w-4" />Runs</TabsTrigger>
            <TabsTrigger value="failures"><AlertTriangle className="mr-2 h-4 w-4" />Failures</TabsTrigger>
            <TabsTrigger value="imports"><CheckCircle2 className="mr-2 h-4 w-4" />Imports</TabsTrigger>
            <TabsTrigger value="drafts"><PencilLine className="mr-2 h-4 w-4" />Draft Changes</TabsTrigger>
          </TabsList>

          <TabsContent value="runs" className="space-y-3">
            {logs?.activity?.length ? logs.activity.map((entry) => (
              <ActivityRow
                key={entry.id}
                title={`/${entry.commandPath}`}
                subtitle={entry.summary}
                status={entry.status}
                time={formatDateTime(entry.createdAt)}
              />
            )) : (
              <EmptyState label="No recent command runs are recorded yet." />
            )}
          </TabsContent>

          <TabsContent value="failures" className="space-y-3">
            {failureRows.length ? failureRows.map((command) => {
              const issues = issueSummary(command);
              return (
                <ActivityRow
                  key={command.id}
                  title={command.name}
                  subtitle={`${issues.errors} validation error${issues.errors === 1 ? "" : "s"} still need attention.`}
                  status="Failed"
                  time={formatDateTime(command.updatedAt)}
                  onOpen={() => navigate(buildArchivistItemPath(serverId, "commands", "create-command", { search: { commandId: command.id } }))}
                />
              );
            }) : (
              <EmptyState label="No failing commands are flagged right now." />
            )}
          </TabsContent>

          <TabsContent value="imports" className="space-y-3">
            {importRows.length ? importRows.map((command) => (
              <ActivityRow
                key={command.id}
                title={command.name}
                subtitle={`Imported from ${command.importSource?.kind || "manual"} and ready for review.`}
                status="Imported"
                time={formatDateTime(command.updatedAt)}
                onOpen={() => navigate(buildArchivistItemPath(serverId, "commands", "create-command", { search: { commandId: command.id } }))}
              />
            )) : (
              <EmptyState label="No imported workflows have landed yet." />
            )}
          </TabsContent>

          <TabsContent value="drafts" className="space-y-3">
            {draftRows.length ? draftRows.map((command) => {
              const issues = issueSummary(command);
              const status = command.definition.behavior.enabled === false ? "Draft" : issues.warnings > 0 ? "Warnings" : "Changed";
              return (
                <ActivityRow
                  key={command.id}
                  title={command.name}
                  subtitle={command.definition.behavior.enabled === false
                    ? "This command is saved as a draft and not yet published."
                    : `${issues.warnings} validation warning${issues.warnings === 1 ? "" : "s"} should be reviewed before publish.`}
                  status={status}
                  time={formatDateTime(command.updatedAt)}
                  onOpen={() => navigate(buildArchivistItemPath(serverId, "commands", "create-command", { search: { commandId: command.id } }))}
                />
              );
            }) : (
              <EmptyState label="No unpublished draft work is waiting right now." />
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
