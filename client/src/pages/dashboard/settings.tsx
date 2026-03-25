import { useRoute } from "wouter";
import { ExternalLink, Radar, Server, Shield, UserRound } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { MetricStrip, SurfaceHeader, SurfacePanel, SurfaceRow, StatusPill } from "@/components/layout/archivist-surfaces";
import { useBotStatus, useServer, useWorkspaceOverview } from "@/hooks/use-bot";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const [, params] = useRoute("/dashboard/servers/:id/settings");
  const serverId = Number.parseInt(params?.id || "0", 10);
  const { data: server, isLoading } = useServer(serverId);
  const { data: botStatus } = useBotStatus();
  const overviewQuery = useWorkspaceOverview(serverId, { enabled: !!serverId });

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
      <div className="archivist-category-settings space-y-5">
        <SurfacePanel>
          <SurfaceHeader
            eyebrow="Server Settings"
            title="Server reference, runtime health, and the IDs you need."
            description="This page should stay compact. It is here for server context, live runtime status, and quick reference when something breaks or needs checking."
            aside={
              <div className="grid gap-2 sm:grid-cols-2">
                <MetricStrip label="Bot" value={botStatus?.ready ? "Connected" : "Offline"} tone={botStatus?.ready ? "accent" : "danger"} />
                <MetricStrip label="Guild count" value={String(botStatus?.guildCount || 0)} />
              </div>
            }
          />
          <div className="flex flex-wrap gap-2 px-4 py-4 md:px-6">
            <StatusPill>{server.name}</StatusPill>
            <StatusPill tone="accent">{botStatus?.wsStatus || "ready"}</StatusPill>
            <StatusPill>{server.discordId}</StatusPill>
          </div>
        </SurfacePanel>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <SurfacePanel>
            <div className="border-b border-[var(--border-subtle)] px-4 py-4 md:px-6">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Server profile</p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">Core identity and scale of the current server.</p>
            </div>
            <div className="divide-y divide-[var(--border-subtle)]">
              <SurfaceRow
                title="Server name"
                description={server.name}
                accent={<SettingsIcon icon={Server} />}
              />
              <SurfaceRow
                title="Owner ID"
                description={server.ownerId || "Unknown"}
                accent={<SettingsIcon icon={UserRound} />}
              />
              <SurfaceRow
                title="Channels"
                description={String(overviewQuery.data?.metrics.totalChannels || 0)}
                accent={<SettingsIcon icon={Shield} />}
              />
              <SurfaceRow
                title="Roles"
                description={String(overviewQuery.data?.metrics.totalRoles || 0)}
                accent={<SettingsIcon icon={Shield} />}
              />
              <SurfaceRow
                title="Members"
                description={Number(server.memberCount || 0).toLocaleString()}
                accent={<SettingsIcon icon={UserRound} />}
              />
            </div>
          </SurfacePanel>

          <SurfacePanel>
            <div className="border-b border-[var(--border-subtle)] px-4 py-4 md:px-6">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Runtime</p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">Live health and recent status signals from Archivist.</p>
            </div>
            <div className="space-y-2 px-4 py-4 md:px-6">
              <ContextRow label="Gateway ping" value={typeof botStatus?.gatewayPingMs === "number" ? `${Math.round(botStatus.gatewayPingMs)}ms` : "Unavailable"} />
              <ContextRow label="Gateway state" value={botStatus?.wsStatus || "offline"} />
              <ContextRow label="Started" value={botStatus?.startedAt ? new Date(botStatus.startedAt).toLocaleString() : "Unavailable"} />
              <ContextRow label="Recent failures" value={String(overviewQuery.data?.metrics.recentFailures || 0)} />
            </div>
          </SurfacePanel>
        </div>

        <SurfacePanel>
          <div className="flex flex-col gap-4 border-b border-[var(--border-subtle)] px-4 py-4 md:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Connection actions</p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">One action area for invites and persistent identifiers.</p>
            </div>
            <Button asChild variant="outline">
              <a href="/api/invite-url?redirect=1" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                Open bot invite
              </a>
            </Button>
          </div>
          <div className="divide-y divide-[var(--border-subtle)]">
            <SurfaceRow
              title="Server Discord ID"
              description={server.discordId}
              accent={<SettingsIcon icon={Radar} />}
            />
            <SurfaceRow
              title="Workspace posture"
              description="Command-first, Studio-linked, runtime-aware"
              accent={<SettingsIcon icon={Shield} />}
            />
          </div>
        </SurfacePanel>
      </div>
    </DashboardLayout>
  );
}

function SettingsIcon({ icon: Icon }: { icon: typeof Server }) {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-[13px] border border-[var(--border-cold)] bg-[rgba(155,180,201,0.08)] text-[var(--category-accent)]">
      <Icon className="h-4 w-4" />
    </div>
  );
}

function ContextRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[18px] border border-[var(--border-default)] bg-[linear-gradient(180deg,rgba(21,25,32,0.96),rgba(11,14,19,0.98))] px-3 py-3">
      <span className="text-sm text-[var(--text-muted)]">{label}</span>
      <span className="text-right text-sm font-semibold text-[var(--text-primary)]">{value}</span>
    </div>
  );
}
