import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, ChevronRight, Hash, ScrollText, Settings2, Shield, Signal, TriangleAlert } from "lucide-react";
import type { WorkspaceOverviewResponse } from "@/hooks/use-bot";

export function CommandWorkspaceHero({
  overview,
}: {
  overview: WorkspaceOverviewResponse;
}) {
  const server = overview.server;
  const initials = server.name
    .split(" ")
    .map((word) => word[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <section className="overflow-hidden rounded-[36px] border border-[#8F1425]/40 bg-[radial-gradient(circle_at_top_left,rgba(177,18,38,0.3),transparent_40%),linear-gradient(180deg,#0D0A0B_0%,#090909_100%)] p-6 shadow-[0_28px_120px_rgba(0,0,0,0.45)] md:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-4">
          <Badge className="w-fit rounded-full border border-[#E11D48]/30 bg-[#781020]/40 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-white/86">
            Archivist Runtime
          </Badge>
          <div className="flex items-center gap-4">
            {server.iconUrl ? (
              <img src={server.iconUrl} alt={server.name} className="h-14 w-14 rounded-[20px] object-cover shadow-[0_20px_60px_rgba(0,0,0,0.35)]" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-gradient-to-br from-[#5A0B16] via-[#9E1025] to-[#E21D3E] text-sm font-semibold text-white">
                {initials}
              </div>
            )}
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight text-white md:text-5xl">
                {server.name}
              </h1>
              <p className="mt-1 text-sm leading-6 text-white/72 md:text-base">
                Command-first control surface for Archivist. Channel and role systems come first, with live runtime status and recent execution history in one place.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-white/72">
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
              {overview.bot.ready ? "Bot connected" : "Bot reconnecting"}
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
              {server.memberCount.toLocaleString()} members
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
              {overview.metrics.totalChannels} channels
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
              {overview.metrics.totalRoles} roles
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <MetricCard icon={Bot} label="Bot" value={overview.bot.ready ? "Ready" : "Offline"} tone={overview.bot.ready ? "success" : "warning"} />
          <MetricCard icon={Signal} label="Activity" value={`${overview.metrics.recentCommands} recent commands`} tone="neutral" />
        </div>
      </div>
    </section>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Bot;
  label: string;
  value: string;
  tone: "success" | "warning" | "neutral";
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
      : tone === "warning"
        ? "border-amber-400/20 bg-amber-500/10 text-amber-100"
        : "border-white/10 bg-white/[0.03] text-white";

  return (
    <div className={`rounded-[24px] border p-4 ${toneClass}`}>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-[0.22em]">{label}</span>
      </div>
      <p className="mt-3 text-sm text-white/82">{value}</p>
    </div>
  );
}

export function WorkspaceOverviewPanel({
  overview,
  onSectionChange,
}: {
  overview: WorkspaceOverviewResponse;
  onSectionChange: (section: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Channels" value={overview.metrics.totalChannels} sublabel="Live guild channels" />
        <StatCard label="Roles" value={overview.metrics.totalRoles} sublabel="Manageable role surface" />
        <StatCard label="Recent Commands" value={overview.metrics.recentCommands} sublabel="Last active execution window" />
        <StatCard label="Recent Failures" value={overview.metrics.recentFailures} sublabel="Actionable command errors" danger={overview.metrics.recentFailures > 0} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <Card className="archivist-panel archivist-panel-muted">
            <CardHeader>
              <CardTitle className="text-white">Recent Command Activity</CardTitle>
              <CardDescription>Latest channel and role operations executed through the live bot runtime.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {overview.recentActivity.length > 0 ? overview.recentActivity.map((entry) => (
                <div key={entry.id} className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">/{entry.commandPath}</p>
                      <p className="mt-1 text-sm text-white/62">{entry.summary}</p>
                    </div>
                    <Badge variant="outline" className={entry.status === "success" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-100" : "border-amber-500/20 bg-amber-500/10 text-amber-100"}>
                      {entry.status}
                    </Badge>
                  </div>
                  <p className="mt-3 text-xs uppercase tracking-[0.22em] text-white/38">
                    {entry.actorTag} • {new Date(entry.createdAt).toLocaleString()}
                  </p>
                </div>
              )) : (
                <EmptyPanel label="No recent command activity yet." />
              )}
            </CardContent>
          </Card>

          <Card className="archivist-panel archivist-panel-muted">
            <CardHeader>
              <CardTitle className="text-white">Recent Failures</CardTitle>
              <CardDescription>Real command failures from the same execution pipeline users hit in Discord.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {overview.recentFailures.length > 0 ? overview.recentFailures.map((entry) => (
                <div key={entry.id} className="rounded-[22px] border border-red-500/20 bg-red-500/[0.08] px-4 py-4">
                  <div className="flex items-start gap-3">
                    <TriangleAlert className="mt-0.5 h-4 w-4 text-red-300" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white">/{entry.commandPath}</p>
                      <p className="mt-1 text-sm text-white/72">{entry.message}</p>
                      <p className="mt-3 text-xs uppercase tracking-[0.22em] text-white/38">
                        {entry.code} • {entry.actorTag}
                      </p>
                    </div>
                  </div>
                </div>
              )) : (
                <EmptyPanel label="No recent failures for this server." />
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4">
          <ShortcutCard
            icon={Hash}
            title="Channel System"
            description="Create, clone, lock, sync, move, and manage overwrites with the new `/channel` command set."
            actionLabel="Open Channel System"
            onClick={() => onSectionChange("channels")}
          />
          <ShortcutCard
            icon={Shield}
            title="Role System"
            description="Create, edit, position, assign, remove, and manage role permissions with the new `/role` command set."
            actionLabel="Open Role System"
            onClick={() => onSectionChange("roles")}
          />
          <ShortcutCard
            icon={ScrollText}
            title="Logs"
            description="See recent executions and failures coming from the actual command runtime."
            actionLabel="Open Logs"
            onClick={() => onSectionChange("logs")}
          />
          <ShortcutCard
            icon={Settings2}
            title="Settings"
            description="Reserve the shell for future runtime configuration without bloating this first rebuild."
            actionLabel="Open Settings"
            onClick={() => onSectionChange("settings")}
          />
        </aside>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sublabel,
  danger,
}: {
  label: string;
  value: number;
  sublabel: string;
  danger?: boolean;
}) {
  return (
    <div className={`rounded-[24px] border p-5 ${danger ? "border-red-500/20 bg-red-500/[0.08]" : "border-white/10 bg-black/20"}`}>
      <p className="text-xs uppercase tracking-[0.22em] text-white/42">{label}</p>
      <p className="mt-3 text-3xl font-display font-bold text-white">{value}</p>
      <p className="mt-2 text-sm text-white/62">{sublabel}</p>
    </div>
  );
}

function ShortcutCard({
  icon: Icon,
  title,
  description,
  actionLabel,
  onClick,
}: {
  icon: typeof Bot;
  title: string;
  description: string;
  actionLabel: string;
  onClick: () => void;
}) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-[18px] border border-primary/20 bg-primary/[0.12] text-white">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-base font-semibold text-white">{title}</p>
          <p className="text-sm text-white/58">{description}</p>
        </div>
      </div>
      <Button onClick={onClick} className="mt-4 w-full justify-between rounded-[18px] bg-gradient-to-r from-[#7F0F1E] via-[#B11226] to-[#E11D48] text-white hover:opacity-95">
        {actionLabel}
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

function EmptyPanel({ label }: { label: string }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-white/58">
      {label}
    </div>
  );
}

export function ModuleScaffoldCard({
  title,
  description,
  bullets,
}: {
  title: string;
  description: string;
  bullets: string[];
}) {
  return (
    <Card className="archivist-panel archivist-panel-muted">
      <CardHeader>
        <CardTitle className="text-white">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {bullets.map((bullet) => (
          <div key={bullet} className="rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-white/74">
            {bullet}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
