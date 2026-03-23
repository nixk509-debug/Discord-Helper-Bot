import { Link } from "wouter";
import {
  ExternalLink,
  Layers3,
  MessageSquareText,
  MoveRight,
  Settings2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { MetricStrip, StatusPill, SurfaceHeader, SurfacePanel } from "@/components/layout/archivist-surfaces";
import { SiteEditorLaunchCard } from "@/components/site-editor/site-editor-launch-card";
import { useBotStatus, useServers } from "@/hooks/use-bot";
import { useAuth } from "@/hooks/use-auth";
import { isApiResponseError } from "@/hooks/use-bot";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { buildArchivistSectionPath } from "@/lib/archivist-workspace";
import { cn } from "@/lib/utils";

function ServerAccent({ server }: { server: any }) {
  if (server?.iconUrl) {
    return (
      <div className="relative h-14 w-14 overflow-hidden rounded-[18px] border border-white/10 bg-[#111317] shadow-[0_16px_40px_rgba(0,0,0,0.28)]">
        <img src={server.iconUrl} alt={server.name} className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-white/10 bg-[linear-gradient(180deg,#1f1115,#0f1013)] text-sm font-semibold text-white shadow-[0_16px_40px_rgba(0,0,0,0.28)]">
      {String(server?.name || "AR").slice(0, 2).toUpperCase()}
    </div>
  );
}

function LeadLaneCard({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: typeof MessageSquareText;
  title: string;
  description: string;
}) {
  return (
    <Link href={href}>
      <a className="group rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(10,11,14,0.96))] p-4 transition hover:border-white/18 hover:bg-[linear-gradient(180deg,rgba(177,18,38,0.14),rgba(10,11,14,0.98))]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[16px] border border-white/10 bg-[#121419] text-white/82">
            <Icon className="h-4.5 w-4.5" />
          </div>
          <MoveRight className="h-4 w-4 text-white/30 transition group-hover:text-white/72" />
        </div>
        <p className="mt-4 text-sm font-semibold text-white">{title}</p>
        <p className="mt-1 text-xs leading-5 text-white/48">{description}</p>
      </a>
    </Link>
  );
}

function ServerWorkspaceCard({ server }: { server: any }) {
  return (
    <div className="overflow-hidden rounded-[26px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(177,18,38,0.18),transparent_52%),linear-gradient(180deg,rgba(18,20,24,0.98),rgba(8,9,12,0.98))]">
      <div className="flex items-start gap-3 border-b border-white/8 px-4 py-4">
        <ServerAccent server={server} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-white">{server.name}</p>
            <StatusPill>
              <ShieldCheck className="mr-1.5 inline h-3.5 w-3.5" />
              Connected
            </StatusPill>
          </div>
          <p className="mt-2 text-xs leading-5 text-white/50">
            {`${Number(server.memberCount || 0).toLocaleString()} members`} · jump straight into the lane you actually need.
          </p>
        </div>
      </div>

      <div className="grid gap-2 p-3 sm:grid-cols-3">
        <LeadLaneCard
          href={buildArchivistSectionPath(server.id, "commands")}
          icon={MessageSquareText}
          title="Commands"
          description="Open workflows, triggers, and command builders."
        />
        <LeadLaneCard
          href={buildArchivistSectionPath(server.id, "studio")}
          icon={Layers3}
          title="Studio"
          description="Build embeds, selectors, buttons, and published surfaces."
        />
        <LeadLaneCard
          href={buildArchivistSectionPath(server.id, "settings")}
          icon={Settings2}
          title="Settings"
          description="Handle IDs, channels, roles, and operator controls."
        />
      </div>
    </div>
  );
}

export default function DashboardOverview() {
  const { data: servers, isLoading, error } = useServers();
  const { data: botStatus } = useBotStatus();
  const { data: user } = useAuth();
  const leadServer = servers?.[0] ?? null;

  return (
    <DashboardLayout mode="overview">
      <div className="space-y-5">
        <SurfacePanel className="overflow-hidden">
          <SurfaceHeader
            eyebrow="Archivist"
            title="Open the server, hit the lane, and keep moving."
            description="The overview should feel like a launchpad on mobile: commands, Studio, and settings are one tap away, and the lead workspace stays front and center instead of hiding inside a flat list."
            aside={
              <div className="grid gap-2 sm:grid-cols-3">
                <MetricStrip label="Bot" value={botStatus?.ready ? "Connected" : "Offline"} tone={botStatus?.ready ? "accent" : "danger"} />
                <MetricStrip label="Servers" value={String(servers?.length || 0)} />
                <MetricStrip label="Gateway" value={typeof botStatus?.gatewayPingMs === "number" ? `${Math.round(botStatus.gatewayPingMs)}ms` : "Pending"} />
              </div>
            }
            actions={
              <>
                <StatusPill tone="accent">Mobile launchpad</StatusPill>
                <StatusPill>{botStatus?.wsStatus || "Ready"}</StatusPill>
              </>
            }
          />

          {leadServer ? (
            <div className="grid gap-0 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
              <div className="relative overflow-hidden border-b border-white/6 px-4 py-5 md:px-6 lg:border-b-0 lg:border-r">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(177,18,38,0.20),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.06),transparent_28%)]" />
                <div className="relative space-y-4">
                  <div className="flex items-start gap-4">
                    <ServerAccent server={leadServer} />
                    <div className="min-w-0 flex-1">
                      <p className="archivist-kicker">Lead workspace</p>
                      <h2 className="mt-1 truncate text-[1.7rem] font-semibold tracking-[-0.03em] text-white">{leadServer.name}</h2>
                      <p className="mt-2 max-w-2xl text-sm leading-7 text-white/62">
                        Use this as the fast lane when you just need to open the server and work. The quick cards below keep Commands, Studio, and Settings visible without burying you in dashboard chrome.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <LeadLaneCard
                      href={buildArchivistSectionPath(leadServer.id, "commands")}
                      icon={MessageSquareText}
                      title="Commands"
                      description="Behavior, triggers, and command routes."
                    />
                    <LeadLaneCard
                      href={buildArchivistSectionPath(leadServer.id, "studio")}
                      icon={Layers3}
                      title="Studio"
                      description="Embeds, components, selectors, and publish flow."
                    />
                    <LeadLaneCard
                      href={buildArchivistSectionPath(leadServer.id, "settings")}
                      icon={Settings2}
                      title="Settings"
                      description="IDs, channels, roles, runtime, and server context."
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link href={buildArchivistSectionPath(leadServer.id, "commands")}>
                      <Button className="min-h-11 rounded-[18px] px-4">
                        Open workspace
                        <MoveRight className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button asChild variant="outline" className="min-h-11 rounded-[18px] border-white/10 bg-white/[0.03]">
                      <a href="/api/invite-url?redirect=1" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                        Invite Archivist
                      </a>
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-3 px-4 py-5 md:px-6">
                <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(177,18,38,0.12),rgba(11,12,16,0.96))] p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-[16px] border border-white/10 bg-[#111317] text-white/78">
                      <Sparkles className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">What to do first</p>
                      <p className="mt-1 text-xs leading-5 text-white/48">Keep the sequence tight instead of bouncing around modules.</p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    {[
                      "Use Commands when you are shaping behavior, triggers, and workflows.",
                      "Use Studio when the message itself needs embeds, buttons, menus, or publish control.",
                      "Use Settings when you need IDs, channels, permissions, logs, or operator context.",
                    ].map((item) => (
                      <div key={item} className="rounded-[18px] border border-white/8 bg-[#0d1014] px-3 py-3 text-sm text-white/70">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[22px] border border-white/10 bg-[#0d1014] p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-white/38">Primary move</p>
                    <p className="mt-2 text-lg font-semibold text-white">Stay in one lane</p>
                    <p className="mt-2 text-sm leading-6 text-white/52">Build behavior in Commands, build surface in Studio, then harden it in Settings.</p>
                  </div>
                  <div className="rounded-[22px] border border-white/10 bg-[#0d1014] p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-white/38">Quick truth</p>
                    <p className="mt-2 text-lg font-semibold text-white">{botStatus?.ready ? "Bot is live" : "Bot needs attention"}</p>
                    <p className="mt-2 text-sm leading-6 text-white/52">
                      {botStatus?.ready ? "Gateway and command registration are connected right now." : "Fix the runtime first before chasing layout problems."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </SurfacePanel>

        <SurfacePanel className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/6 px-4 py-4 md:px-6">
            <div>
              <p className="text-sm font-semibold text-white">Managed servers</p>
              <p className="mt-1 text-sm text-white/56">Every server gets direct lane cards instead of a cramped metadata row.</p>
            </div>
            <StatusPill>Tap once, work fast</StatusPill>
          </div>

          {isLoading ? (
            <div className="grid gap-3 p-4 md:p-6">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-14 w-14 rounded-[18px] bg-white/6" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-40 bg-white/6" />
                      <Skeleton className="h-4 w-24 bg-white/6" />
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    {Array.from({ length: 3 }).map((__, cardIndex) => (
                      <Skeleton key={cardIndex} className="h-24 rounded-[18px] bg-white/6" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : servers?.length ? (
            <div className="grid gap-3 p-4 md:p-6">
              {servers.map((server: any, index: number) => (
                <div key={server.id} className={cn(index === 0 ? "md:hidden" : "")}>
                  <ServerWorkspaceCard server={server} />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="px-4 py-12 text-center text-sm text-white/58 md:px-6">
              {isApiResponseError(error)
                ? error.message
                : "Archivist could not load your managed servers right now. Refresh and try again."}
            </div>
          ) : (
            <div className="px-4 py-12 text-center text-sm text-white/46 md:px-6">
              No managed servers are connected yet. Invite Archivist, then refresh this workspace.
            </div>
          )}
        </SurfacePanel>

        {user?.ownerAccess ? <SiteEditorLaunchCard /> : null}
      </div>
    </DashboardLayout>
  );
}
