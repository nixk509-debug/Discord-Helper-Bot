import { Activity, ArrowUpRight, BookOpen, Braces, CircleCheck, CircleDot, Plus, Sparkles, TriangleAlert, Zap } from "lucide-react";
import { SurfacePanel, SurfaceRow, StatusPill, MetricStrip } from "@/components/layout/archivist-surfaces";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buildArchivistItemPath } from "@/lib/archivist-workspace";
import { formatRelativeEditTime } from "@/components/design-studio-v2/studio-v2-utils";
import archivistLogo from "@assets/FDEBE754-F9DF-41D4-A19B-B2933432B230_1772114960531.png";

interface ControlCenterHomeProps {
  serverId: number;
  server: any;
  botStatus: any;
  commands: any[];
  overview: any;
  documents: any[];
  publications: any[];
  navigate: (path: string) => void;
}

export function ControlCenterHome({
  serverId,
  server,
  botStatus,
  commands,
  overview,
  documents,
  publications,
  navigate,
}: ControlCenterHomeProps) {
  const isOnline = botStatus?.ready === true;
  const recentFailures = overview?.metrics?.recentFailures || 0;
  const recentCommands = overview?.metrics?.recentCommands || 0;

  const draftsNeedingAttention = documents.filter(
    (doc: any) => doc.publishState === "needs-publish" || doc.publishState === "error",
  );
  const recentPublishFailures = publications.filter(
    (pub: any) => pub.state === "failed",
  ).slice(0, 5);
  const latestDraft = documents
    .filter((doc: any) => doc.publishState === "draft")
    .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];

  const liveCommands = commands.filter((cmd: any) => cmd.enabled).length;
  const draftCommands = commands.filter((cmd: any) => !cmd.enabled).length;

  const QUICK_ACTIONS = [
    {
      label: "New Command",
      description: "Open the command forge",
      icon: Braces,
      href: buildArchivistItemPath(serverId, "commands", "create-command"),
    },
    {
      label: "New Draft",
      description: "Start a Studio design",
      icon: Sparkles,
      href: buildArchivistItemPath(serverId, "studio", "create-new"),
    },
    {
      label: "View Commands",
      description: "Browse your library",
      icon: BookOpen,
      href: buildArchivistItemPath(serverId, "commands", "commands"),
    },
    {
      label: "Studio Overview",
      description: "Manage your designs",
      icon: Activity,
      href: buildArchivistItemPath(serverId, "studio", "overview"),
    },
  ];

  return (
    <div className="space-y-4 pb-[calc(env(safe-area-inset-bottom)+5.5rem)]">
      {/* Hero / Health Banner */}
      <SurfacePanel className="overflow-hidden">
        <div className="relative px-4 py-5 md:px-6 md:py-6">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(224,0,26,0.08),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.01),transparent)]" />
          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-[14px] border border-[rgba(224,0,26,0.3)] bg-[rgba(10,11,13,0.92)] shadow-[0_18px_34px_rgba(0,0,0,0.3)]">
                <img src={archivistLogo} alt="Archivist" className="h-8 w-8 object-contain" />
              </div>
              <div className="min-w-0">
                <p className="archivist-eyebrow">Control Center</p>
                <h1 className="truncate text-2xl font-bold tracking-tight text-white md:text-[1.9rem]">
                  {server?.name || "Your Server"}
                </h1>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-3 py-1.5",
                    isOnline
                      ? "border-[rgba(34,197,94,0.22)] bg-[rgba(16,34,20,0.9)] text-[rgba(134,239,172,0.9)]"
                      : "border-[rgba(224,0,26,0.22)] bg-[rgba(25,10,12,0.9)] text-[#ff6070]",
                  )}
                >
                  <CircleDot className="h-3 w-3" />
                  <span className="text-xs font-semibold">{isOnline ? "Online" : "Offline"}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-4">
              <MetricStrip label="Commands" value={String(commands.length)} tone="accent" />
              <MetricStrip label="Live" value={String(liveCommands)} tone={liveCommands > 0 ? "accent" : "neutral"} />
              <MetricStrip label="Recent Runs" value={String(recentCommands)} tone="neutral" />
              <MetricStrip label="Failures" value={String(recentFailures)} tone={recentFailures > 0 ? "danger" : "neutral"} />
            </div>
          </div>
        </div>
      </SurfacePanel>

      {/* Quick Actions */}
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              type="button"
              onClick={() => navigate(action.href)}
              className="group flex items-center gap-3 rounded-[18px] border border-white/8 bg-[linear-gradient(180deg,rgba(12,13,15,0.98),rgba(8,9,10,1))] px-4 py-3 text-left transition hover:border-[rgba(224,0,26,0.2)] hover:bg-[linear-gradient(180deg,rgba(15,13,14,0.98),rgba(9,8,9,1))]"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-[rgba(224,0,26,0.16)] bg-[rgba(16,12,14,0.94)] text-[#ff6070]">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{action.label}</p>
                <p className="truncate text-xs text-white/44">{action.description}</p>
              </div>
              <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-white/24 transition group-hover:text-[#ff6070]" />
            </button>
          );
        })}
      </div>

      {/* Studio Drafts + Command Activity */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.84fr)]">
        {/* Drafts Panel */}
        <SurfacePanel>
          <div className="border-b border-white/6 px-4 py-4 md:px-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="archivist-eyebrow">Design Studio</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Active drafts</h2>
              </div>
              <Button
                variant="outline"
                onClick={() => navigate(buildArchivistItemPath(serverId, "studio", "overview"))}
              >
                Open Studio
              </Button>
            </div>
          </div>
          <div className="divide-y divide-white/6">
            {latestDraft ? (
              <SurfaceRow
                title={latestDraft.name}
                description={`Last updated ${formatRelativeEditTime(latestDraft.updatedAt)}`}
                meta={<StatusPill tone="accent">Latest</StatusPill>}
                accent={
                  <div className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-[rgba(224,0,26,0.18)] bg-[rgba(17,12,14,0.9)] text-[#ff6070]">
                    <Sparkles className="h-4 w-4" />
                  </div>
                }
              >
                <div className="px-4 pb-4 md:px-6">
                  <Button
                    onClick={() =>
                      navigate(buildArchivistItemPath(serverId, "studio", "create-new", { search: { documentId: latestDraft.id } }))
                    }
                    className="w-full sm:w-auto"
                  >
                    Open Draft
                  </Button>
                </div>
              </SurfaceRow>
            ) : null}

            {draftsNeedingAttention.slice(0, 3).map((draft: any) => (
              <SurfaceRow
                key={draft.id}
                title={draft.name}
                description={`Needs attention · ${formatRelativeEditTime(draft.updatedAt)}`}
                meta={<StatusPill tone="danger">Attention</StatusPill>}
                accent={
                  <div className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-[rgba(224,0,26,0.22)] bg-[rgba(25,13,16,0.92)] text-[#ff6070]">
                    <TriangleAlert className="h-4 w-4" />
                  </div>
                }
              />
            ))}

            {!latestDraft && draftsNeedingAttention.length === 0 ? (
              <div className="px-4 py-10 text-sm text-white/46 md:px-6">
                No active drafts. Start with a message, embed, or interactive layout.
              </div>
            ) : null}
          </div>
        </SurfacePanel>

        {/* Command Activity Panel */}
        <SurfacePanel>
          <div className="border-b border-white/6 px-4 py-4 md:px-6">
            <p className="archivist-eyebrow">Automation</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Command health</h2>
          </div>
          <div className="divide-y divide-white/6">
            {commands.slice(0, 5).map((command: any) => {
              const isLive = command.enabled;
              const hasErrors = Array.isArray(command.lastValidation) &&
                command.lastValidation.some((v: any) => v?.severity === "error");
              return (
                <button
                  key={command.id}
                  type="button"
                  onClick={() => navigate(buildArchivistItemPath(serverId, "commands", "create-command", { search: { commandId: command.id } }))}
                  className="w-full text-left transition hover:bg-white/[0.02]"
                >
                  <SurfaceRow
                    title={command.name}
                    description={`/${command.name} · ${command.triggerType || "trigger"}`}
                    meta={
                      hasErrors ? (
                        <StatusPill tone="danger">Fix</StatusPill>
                      ) : isLive ? (
                        <StatusPill tone="accent">Live</StatusPill>
                      ) : (
                        <StatusPill>Draft</StatusPill>
                      )
                    }
                    accent={
                      <div className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-[12px] border",
                        isLive
                          ? "border-[rgba(224,0,26,0.18)] bg-[rgba(17,12,14,0.9)] text-[#ff6070]"
                          : "border-white/8 bg-[rgba(14,14,17,0.9)] text-white/36",
                      )}>
                        <Braces className="h-4 w-4" />
                      </div>
                    }
                  />
                </button>
              );
            })}

            {commands.length === 0 ? (
              <div className="px-4 py-10 text-sm text-white/46 md:px-6">
                No commands yet. Build your first automation in the forge.
              </div>
            ) : null}

            {commands.length > 0 ? (
              <div className="px-4 py-3 md:px-6">
                <button
                  type="button"
                  onClick={() => navigate(buildArchivistItemPath(serverId, "commands", "commands"))}
                  className="flex items-center gap-2 text-sm text-white/44 transition hover:text-[#ff6070]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  View all {commands.length} commands
                </button>
              </div>
            ) : null}
          </div>
        </SurfacePanel>
      </div>

      {/* Recent Publish Failures */}
      {recentPublishFailures.length > 0 ? (
        <SurfacePanel>
          <div className="border-b border-white/6 px-4 py-4 md:px-6">
            <p className="archivist-eyebrow">Publish Watch</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Recent failures</h2>
          </div>
          <div className="divide-y divide-white/6">
            {recentPublishFailures.map((pub: any) => (
              <button
                key={pub.id}
                type="button"
                onClick={() => navigate(buildArchivistItemPath(serverId, "studio", "overview"))}
                className="w-full text-left transition hover:bg-white/[0.02]"
              >
                <SurfaceRow
                  title={`Document #${pub.documentId}`}
                  description={pub.lastFailureSummary || "Publish failure recorded."}
                  meta={
                    <>
                      <StatusPill tone="danger">Failed</StatusPill>
                      <StatusPill>{formatRelativeEditTime(pub.lastFailureAt || pub.updatedAt)}</StatusPill>
                    </>
                  }
                  accent={
                    <div className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-[rgba(224,0,26,0.22)] bg-[rgba(25,13,16,0.92)] text-[#ff6070]">
                      <TriangleAlert className="h-4 w-4" />
                    </div>
                  }
                />
              </button>
            ))}
          </div>
        </SurfacePanel>
      ) : null}

      {/* Pillar Nav Tiles */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            section: "commands" as const,
            label: "Commands",
            description: "Automation library, forge, logs.",
            icon: Braces,
            slug: "overview",
          },
          {
            section: "studio" as const,
            label: "Design Studio",
            description: "Message drafts, embeds, publish.",
            icon: Sparkles,
            slug: "overview",
          },
          {
            section: "community" as const,
            label: "Community",
            description: "Games, levels, events, giveaways.",
            icon: Zap,
            slug: "overview",
          },
          {
            section: "operations" as const,
            label: "Operations",
            description: "Roles, channels, moderation, backups.",
            icon: CircleCheck,
            slug: "overview",
          },
        ].map((pillar, index) => {
          const Icon = pillar.icon;
          return (
            <button
              key={pillar.section}
              type="button"
              onClick={() => navigate(buildArchivistItemPath(serverId, pillar.section, pillar.slug))}
              className={cn(
                "group flex items-center gap-3 rounded-[18px] border px-4 py-4 text-left transition",
                index === 0
                  ? "border-[rgba(224,0,26,0.2)] bg-[linear-gradient(180deg,rgba(17,12,14,0.98),rgba(9,9,10,1))] hover:border-[rgba(224,0,26,0.28)]"
                  : "border-white/8 bg-[linear-gradient(180deg,rgba(12,13,15,0.98),rgba(8,9,10,1))] hover:border-[rgba(224,0,26,0.16)]",
              )}
            >
              <div className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border text-[#ff6070]",
                index === 0 ? "border-[rgba(224,0,26,0.2)] bg-[rgba(24,13,16,0.94)]" : "border-[rgba(224,0,26,0.14)] bg-[rgba(16,12,14,0.94)]",
              )}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{pillar.label}</p>
                <p className="mt-0.5 truncate text-xs text-white/42">{pillar.description}</p>
              </div>
              <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-white/24 transition group-hover:text-[#ff6070]" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
