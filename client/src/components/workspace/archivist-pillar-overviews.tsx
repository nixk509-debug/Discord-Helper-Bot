import {
  ArrowUpRight,
  BadgePlus,
  Braces,
  FileClock,
  FileStack,
  Gamepad2,
  Layers3,
  Logs,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { buildArchivistItemPath } from "@/lib/archivist-workspace";
import { cn } from "@/lib/utils";

function formatRelative(value: unknown) {
  const parsed = value ? new Date(value as string | number | Date) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return "Updated recently";

  const diffMinutes = Math.round((parsed.getTime() - Date.now()) / 60000);
  const absMinutes = Math.abs(diffMinutes);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (absMinutes < 60) return formatter.format(diffMinutes, "minute");

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return formatter.format(diffHours, "hour");

  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 7) return formatter.format(diffDays, "day");

  return parsed.toLocaleDateString([], { month: "short", day: "numeric" });
}

function OverviewMetric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "brand";
}) {
  return (
    <div
      className={cn(
        "rounded-[22px] border px-4 py-4",
        tone === "brand"
          ? "border-[rgba(224,0,26,0.32)] bg-[linear-gradient(180deg,rgba(22,6,9,0.96),rgba(15,8,10,0.98))]"
          : "border-[var(--border-subtle)] bg-[linear-gradient(180deg,rgba(16,16,18,0.96),rgba(9,9,10,0.98))]",
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--text-faint)]">{label}</p>
      <p className="mt-3 text-xl font-bold text-white">{value}</p>
    </div>
  );
}

function LaneButton({
  title,
  description,
  icon: Icon,
  onClick,
  tone = "default",
}: {
  title: string;
  description: string;
  icon: typeof Braces;
  onClick: () => void;
  tone?: "default" | "brand";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-[108px] flex-col items-start justify-between rounded-[24px] border px-4 py-4 text-left transition",
        tone === "brand"
          ? "border-[rgba(224,0,26,0.32)] bg-[linear-gradient(180deg,rgba(22,7,10,0.98),rgba(18,9,11,1))] hover:border-[rgba(224,0,26,0.4)]"
          : "border-[var(--border-subtle)] bg-[linear-gradient(180deg,rgba(16,16,18,0.96),rgba(8,8,9,0.99))] hover:border-[var(--border-brand)]",
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-[16px] border border-white/10 bg-white/[0.03] text-[#ff6070]">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">{description}</p>
      </div>
    </button>
  );
}

function QueueRow({
  title,
  description,
  onClick,
}: {
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 rounded-[20px] border border-[var(--border-subtle)] bg-[linear-gradient(180deg,rgba(14,14,16,0.96),rgba(8,8,9,0.99))] px-4 py-4 text-left transition hover:border-[var(--border-brand)]"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">{title}</p>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{description}</p>
      </div>
      <ArrowUpRight className="h-4 w-4 shrink-0 text-[var(--text-faint)]" />
    </button>
  );
}

export function CommandsOverview({
  serverId,
  commands,
  overview,
  navigate,
}: {
  serverId: number;
  commands: any[];
  overview: any;
  navigate: (href: string) => void;
}) {
  const enabledCount = commands.filter((command) => command?.enabled).length;
  const recentCommands = commands.slice(0, 4);
  const triggerCounts = {
    slash: commands.filter((command) => command?.triggerType === "slash").length,
    keyword: commands.filter((command) => command?.triggerType === "keyword").length,
    auto: commands.filter((command) => !["slash", "keyword"].includes(command?.triggerType)).length,
  };

  return (
    <div className="space-y-4">
      <Card className="archivist-panel overflow-hidden border-[rgba(224,0,26,0.22)] bg-[linear-gradient(180deg,rgba(16,7,9,0.96),rgba(9,7,8,0.99))]">
        <CardContent className="space-y-5 p-5">
          <div className="space-y-3">
            <p className="archivist-kicker">Command Automation</p>
            <h1 className="text-[1.9rem] font-bold leading-tight text-white sm:text-[2.4rem]">Command logic should feel like a workspace, not a settings page.</h1>
            <p className="max-w-2xl text-sm leading-7 text-[var(--text-muted)]">
              Start fresh, resume a command draft, or jump into a trigger lane without losing the automation context.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <LaneButton
              title="Create Command"
              description="Open the focused forge and start a new automation immediately."
              icon={BadgePlus}
              tone="brand"
              onClick={() => navigate(buildArchivistItemPath(serverId, "commands", "create-command"))}
            />
            <LaneButton
              title="Open Command Library"
              description="Review the current stack, drafts, and health before you edit."
              icon={Braces}
              onClick={() => navigate(buildArchivistItemPath(serverId, "commands", "commands"))}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <OverviewMetric label="Commands" value={String(commands.length)} tone="brand" />
        <OverviewMetric label="Live" value={String(enabledCount)} />
        <OverviewMetric label="Runs" value={String(overview?.metrics?.recentCommands || 0)} />
        <OverviewMetric label="Failures" value={String(overview?.metrics?.recentFailures || 0)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_minmax(0,0.85fr)]">
        <Card className="archivist-panel">
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">Recent command lanes</p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">Re-enter the commands that were touched most recently.</p>
              </div>
              <Button variant="outline" className="rounded-[16px]" onClick={() => navigate(buildArchivistItemPath(serverId, "commands", "commands"))}>
                All Commands
              </Button>
            </div>
            <div className="space-y-2">
              {recentCommands.length ? recentCommands.map((command) => (
                <QueueRow
                  key={command.id}
                  title={command.name}
                  description={`${command.triggerType || "automation"} trigger${command.enabled ? " · live" : " · draft"}`}
                  onClick={() => navigate(buildArchivistItemPath(serverId, "commands", "create-command", { search: { commandId: command.id } }))}
                />
              )) : (
                <div className="rounded-[20px] border border-dashed border-[var(--border-subtle)] px-4 py-5 text-sm text-[var(--text-muted)]">
                  No commands yet. The forge is ready when you are.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="archivist-panel">
          <CardContent className="space-y-3 p-4">
            <div>
              <p className="text-sm font-semibold text-white">Trigger mix</p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">Quick sense of how command behavior is distributed right now.</p>
            </div>
            <OverviewMetric label="Slash" value={String(triggerCounts.slash)} />
            <OverviewMetric label="Keyword" value={String(triggerCounts.keyword)} />
            <OverviewMetric label="Auto / Other" value={String(triggerCounts.auto)} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function StudioOverview({
  serverId,
  drafts,
  templates,
  publications,
  publishedDocumentIds,
  navigate,
}: {
  serverId: number;
  drafts: any[];
  templates: any[];
  publications: any[];
  publishedDocumentIds: Set<number>;
  navigate: (href: string) => void;
}) {
  const latestDraft = drafts[0];
  const unpublishedDrafts = drafts.filter((draft) => !publishedDocumentIds.has(draft.id));

  return (
    <div className="space-y-4">
      <Card className="archivist-panel overflow-hidden border-[rgba(224,0,26,0.26)] bg-[linear-gradient(180deg,rgba(16,7,9,0.98),rgba(8,7,8,1))]">
        <CardContent className="space-y-5 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <p className="archivist-kicker">Flagship Builder</p>
              <h1 className="text-[2rem] font-bold leading-tight text-white sm:text-[2.8rem]">Design Studio is the place where Archivist should feel unmistakably premium.</h1>
              <p className="text-sm leading-7 text-[var(--text-muted)]">
                Continue the last surface, create a new message, and keep draft versus publish truth visible at all times.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button className="min-h-12 rounded-[18px] px-5" onClick={() => navigate(buildArchivistItemPath(serverId, "studio", "create-new"))}>
                <BadgePlus className="h-4 w-4" />
                New Message
              </Button>
              <Button
                variant="outline"
                className="min-h-12 rounded-[18px] border-white/10 bg-white/[0.03] px-5"
                onClick={() => navigate(buildArchivistItemPath(serverId, "studio", latestDraft ? "create-new" : "ui-projects", latestDraft ? { search: { documentId: latestDraft.id } } as any : undefined))}
              >
                <FileClock className="h-4 w-4" />
                {latestDraft ? "Continue Editing" : "Open Drafts"}
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <OverviewMetric label="Drafts" value={String(drafts.length)} tone="brand" />
            <OverviewMetric label="Need Publish" value={String(unpublishedDrafts.length)} />
            <OverviewMetric label="Published" value={String(publications.length)} />
            <OverviewMetric label="Templates" value={String(templates.length)} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_minmax(0,0.9fr)]">
        <Card className="archivist-panel">
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">Continue building</p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">Recent message assets and active drafts ready to reopen.</p>
              </div>
              <Button variant="outline" className="rounded-[16px]" onClick={() => navigate(buildArchivistItemPath(serverId, "studio", "ui-projects"))}>
                All Drafts
              </Button>
            </div>
            <div className="space-y-2">
              {drafts.slice(0, 4).length ? drafts.slice(0, 4).map((draft) => (
                <QueueRow
                  key={draft.id}
                  title={draft.name}
                  description={`${publishedDocumentIds.has(draft.id) ? "Published" : "Draft"} · ${formatRelative(draft.updatedAt)}`}
                  onClick={() => navigate(buildArchivistItemPath(serverId, "studio", "create-new", { search: { documentId: draft.id } }))}
                />
              )) : (
                <div className="rounded-[20px] border border-dashed border-[var(--border-subtle)] px-4 py-5 text-sm text-[var(--text-muted)]">
                  No recent Studio drafts yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="archivist-panel">
          <CardContent className="space-y-3 p-4">
            <div>
              <p className="text-sm font-semibold text-white">Fast Studio lanes</p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">The most common message-building entry points stay one tap away.</p>
            </div>
            <div className="grid gap-3">
              <LaneButton
                title="Embeds"
                description="Compose rich embed-driven message surfaces."
                icon={Layers3}
                onClick={() => navigate(buildArchivistItemPath(serverId, "studio", "embeds"))}
              />
              <LaneButton
                title="Components V2"
                description="Build interaction-heavy Discord layouts."
                icon={Sparkles}
                onClick={() => navigate(buildArchivistItemPath(serverId, "studio", "components-v2"))}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function FunOverview({
  serverId,
  server,
  moduleEnabled,
  overview,
  navigate,
}: {
  serverId: number;
  server: any;
  moduleEnabled: Record<string, boolean>;
  overview: any;
  navigate: (href: string) => void;
}) {
  const enabledModules = Object.entries(moduleEnabled).filter(([, enabled]) => enabled).map(([id]) => id);

  return (
    <div className="space-y-4">
      <Card className="archivist-panel overflow-hidden">
        <CardContent className="space-y-5 p-5">
          <div className="space-y-3">
            <p className="archivist-kicker">Community Layer</p>
            <h1 className="text-[1.9rem] font-bold leading-tight text-white sm:text-[2.5rem]">Fun and creative tools should feel like a real suite, not filler modules.</h1>
            <p className="max-w-2xl text-sm leading-7 text-[var(--text-muted)]">
              Keep the active systems visible, show the community pulse, and make it obvious where the next creative layer belongs.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <OverviewMetric label="Server" value={server?.memberCount ? `${server.memberCount} members` : "Connected"} tone="brand" />
            <OverviewMetric label="Enabled" value={String(enabledModules.length)} />
            <OverviewMetric label="Recent Runs" value={String(overview?.metrics?.recentCommands || 0)} />
            <OverviewMetric label="Failures" value={String(overview?.metrics?.recentFailures || 0)} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_minmax(0,0.9fr)]">
        <Card className="archivist-panel">
          <CardContent className="space-y-3 p-4">
            <div>
              <p className="text-sm font-semibold text-white">Enabled systems</p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">The modules currently switched on in this server.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {enabledModules.length ? enabledModules.map((moduleId) => (
                <LaneButton
                  key={moduleId}
                  title={moduleId.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())}
                  description="Active in the current community stack."
                  icon={Gamepad2}
                  onClick={() => navigate(buildArchivistItemPath(serverId, "fun", "games"))}
                />
              )) : (
                <div className="rounded-[20px] border border-dashed border-[var(--border-subtle)] px-4 py-5 text-sm text-[var(--text-muted)]">
                  No creative systems are active yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="archivist-panel">
          <CardContent className="space-y-3 p-4">
            <div>
              <p className="text-sm font-semibold text-white">Popular creative lanes</p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">The quickest paths into high-value community systems.</p>
            </div>
            <div className="grid gap-3">
              <LaneButton
                title="Leveling"
                description="Progression, profile identity, and visible status."
                icon={Users}
                onClick={() => navigate(buildArchivistItemPath(serverId, "fun", "profile"))}
              />
              <LaneButton
                title="Giveaways"
                description="Live moments, event energy, and reward loops."
                icon={Sparkles}
                onClick={() => navigate(buildArchivistItemPath(serverId, "fun", "creative-tools"))}
              />
              <LaneButton
                title="Leaderboards"
                description="Visible competition and community ranking."
                icon={Logs}
                onClick={() => navigate(buildArchivistItemPath(serverId, "fun", "leaderboards"))}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function SystemOverview({
  serverId,
  botStatus,
  context,
  documents,
  logs,
  navigate,
}: {
  serverId: number;
  botStatus: any;
  context: any;
  documents: any[];
  logs: any;
  navigate: (href: string) => void;
}) {
  const hasVerificationSurface = documents.some((document) => document?.moduleBinding === "verify");
  const hasTicketSurface = documents.some((document) => String(document?.moduleBinding || "").includes("ticket"));
  const recentFailures = logs?.failures?.length || 0;
  const statusCards = [
    { label: "Moderation Health", value: botStatus?.ready ? "Monitoring" : "Offline" },
    { label: "Verification", value: hasVerificationSurface ? "Configured" : "Needs setup" },
    { label: "Logs", value: recentFailures > 0 ? "Review" : "Stable" },
    { label: "Tickets", value: hasTicketSurface ? "Live" : "Dormant" },
    { label: "Permission State", value: context?.roles?.length ? `${context.roles.length} roles` : "No roles" },
    { label: "Backup Posture", value: context?.channels?.length ? "Review ready" : "Needs sync" },
  ];

  return (
    <div className="space-y-4">
      <Card className="archivist-panel overflow-hidden">
        <CardContent className="space-y-5 p-5">
          <div className="space-y-3">
            <p className="archivist-kicker">System Truth</p>
            <h1 className="text-[1.9rem] font-bold leading-tight text-white sm:text-[2.5rem]">System settings should stay premium and structured, not collapse into a junk drawer.</h1>
            <p className="max-w-2xl text-sm leading-7 text-[var(--text-muted)]">
              Moderation, verification, logging, tickets, and recovery posture should all read clearly from one calm operational overview.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {statusCards.map((card, index) => (
              <OverviewMetric key={card.label} label={card.label} value={card.value} tone={index === 0 ? "brand" : "default"} />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="archivist-panel">
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
          <LaneButton
            title="Permissions"
            description="Open the role and access logic that protects the server."
            icon={ShieldCheck}
            onClick={() => navigate(buildArchivistItemPath(serverId, "server", "permissions"))}
          />
          <LaneButton
            title="Channels"
            description="Review live structure, channel posture, and route control."
            icon={Logs}
            onClick={() => navigate(buildArchivistItemPath(serverId, "server", "channels"))}
          />
          <LaneButton
            title="Backups / Sync"
            description="Stage recovery, migration, and export-minded work."
            icon={FileStack}
            onClick={() => navigate(buildArchivistItemPath(serverId, "server", "backups-sync"))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
