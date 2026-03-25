import { useRoute } from "wouter";
import { ArrowUpRight, Gamepad2, MessageCircleHeart, Music4, Sparkles } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { MetricStrip, SurfaceHeader, SurfacePanel, SurfaceRow, StatusPill } from "@/components/layout/archivist-surfaces";
import { useCommandLogs, useServer, useWorkspaceOverview } from "@/hooks/use-bot";
import { Skeleton } from "@/components/ui/skeleton";

const CREATIVE_ROWS = [
  {
    title: "Games and quick interactions",
    description: "Small repeatable moments that give the server personality without dragging the whole product off course.",
    icon: Gamepad2,
  },
  {
    title: "Prompt and engagement loops",
    description: "Community prompts, lightweight social starters, and recurring interaction hooks.",
    icon: MessageCircleHeart,
  },
  {
    title: "Event energy",
    description: "Seasonal or event-based command packs that can sit beside the main command system cleanly.",
    icon: Music4,
  },
] as const;

export default function CreativePage() {
  const [, params] = useRoute("/dashboard/servers/:id/creative");
  const serverId = Number.parseInt(params?.id || "0", 10);
  const { data: server, isLoading } = useServer(serverId);
  const overviewQuery = useWorkspaceOverview(serverId, { enabled: !!serverId });
  const logsQuery = useCommandLogs(serverId, { enabled: !!serverId });

  if (isLoading || !server || overviewQuery.isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Skeleton className="h-[180px] rounded-[24px] bg-[rgba(155,180,201,0.08)]" />
          <Skeleton className="h-[520px] rounded-[24px] bg-[rgba(155,180,201,0.08)]" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="archivist-category-creative space-y-5">
        <SurfacePanel>
          <SurfaceHeader
            eyebrow="Fun & Creative"
            title="Secondary tools, kept tidy."
            description="Creative features should stay easy to browse and easy to ignore. This page is a clean module list with a quick look at recent runtime activity."
            aside={
              <div className="grid gap-2 sm:grid-cols-2">
                <MetricStrip label="Recent runs" value={String(overviewQuery.data?.metrics.recentCommands || 0)} />
                <MetricStrip label="Failures" value={String(overviewQuery.data?.metrics.recentFailures || 0)} tone={(overviewQuery.data?.metrics.recentFailures || 0) > 0 ? "danger" : "accent"} />
              </div>
            }
          />
          <div className="divide-y divide-[var(--border-subtle)]">
            {CREATIVE_ROWS.map((row) => {
              const Icon = row.icon;
              return (
                <SurfaceRow
                  key={row.title}
                  title={row.title}
                  description={row.description}
                  accent={
                    <div className="flex h-10 w-10 items-center justify-center rounded-[13px] border border-[rgba(213,155,54,0.16)] bg-[linear-gradient(180deg,rgba(213,155,54,0.1),rgba(155,180,201,0.04))] text-[var(--category-accent)]">
                      <Icon className="h-4 w-4" />
                    </div>
                  }
                  meta={
                    <>
                      <StatusPill>Planning</StatusPill>
                      <ArrowUpRight className="h-4 w-4 text-[var(--text-faint)]" />
                    </>
                  }
                />
              );
            })}
          </div>
        </SurfacePanel>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <SurfacePanel>
            <div className="border-b border-[var(--border-subtle)] px-4 py-4 md:px-6">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Signals from the live runtime</p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">Recent command activity and failure posture, without a heavy analytics shell.</p>
            </div>
            <div className="divide-y divide-[var(--border-subtle)]">
              {logsQuery.data?.activity?.slice(0, 6).length ? (
                logsQuery.data?.activity?.slice(0, 6).map((entry) => (
                  <SurfaceRow
                    key={entry.id}
                    title={`/${entry.commandPath}`}
                    description={entry.summary}
                    meta={
                      <>
                        <StatusPill>{new Date(entry.createdAt).toLocaleDateString()}</StatusPill>
                        <StatusPill tone={entry.status === "failure" ? "danger" : "accent"}>{entry.status}</StatusPill>
                      </>
                    }
                    accent={
                      <div className="flex h-10 w-10 items-center justify-center rounded-[13px] border border-[rgba(213,155,54,0.16)] bg-[linear-gradient(180deg,rgba(213,155,54,0.08),rgba(155,180,201,0.03))] text-[var(--category-accent)]">
                        <Sparkles className="h-4 w-4" />
                      </div>
                    }
                  />
                ))
              ) : (
                <div className="px-4 py-10 text-sm text-[var(--text-muted)] md:px-6">
                  No recent creative runtime activity has been recorded for this server yet.
                </div>
              )}
            </div>
          </SurfacePanel>

          <SurfacePanel>
            <div className="border-b border-[var(--border-subtle)] px-4 py-4 md:px-6">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Current context</p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">A quick snapshot of the current server and recent behavior.</p>
            </div>
            <div className="space-y-2 px-4 py-4 md:px-6">
              <ContextRow label="Guild" value={server.name} />
              <ContextRow label="Members" value={Number(server.memberCount || 0).toLocaleString()} />
              <ContextRow label="Recent failures" value={String(overviewQuery.data?.metrics.recentFailures || 0)} />
              <ContextRow label="Creative posture" value="Secondary" />
            </div>
          </SurfacePanel>
        </div>
      </div>
    </DashboardLayout>
  );
}

function ContextRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-[18px] border border-[var(--border-default)] bg-[linear-gradient(180deg,rgba(21,25,32,0.96),rgba(11,14,19,0.98))] px-3 py-3">
      <span className="text-sm text-[var(--text-muted)]">{label}</span>
      <span className="text-sm font-semibold text-[var(--text-primary)]">{value}</span>
    </div>
  );
}
