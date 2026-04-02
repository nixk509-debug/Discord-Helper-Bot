import { Link } from "wouter";
import {
  Braces,
  ChevronRight,
  Gamepad2,
  Layers3,
  MoveRight,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useBotStatus, useServers, useStudioDocuments, useWorkspaceOverview } from "@/hooks/use-bot";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { buildArchivistSectionPath, getPreferredArchivistServer } from "@/lib/archivist-workspace";
import { formatDistanceToNow } from "date-fns";

function ServerBadge({ server, size = "md" }: { server: any; size?: "sm" | "md" | "lg" }) {
  const dimensions = size === "lg" ? "h-16 w-16" : size === "md" ? "h-12 w-12" : "h-10 w-10";
  const radius = size === "lg" ? "rounded-[20px]" : "rounded-[16px]";
  
  if (server?.iconUrl) {
    return (
      <div className={`${dimensions} ${radius} overflow-hidden border border-[var(--border-strong)] bg-[var(--bg-panel-raised)]`}>
        <img src={server.iconUrl} alt={server.name} className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div className={`flex ${dimensions} ${radius} items-center justify-center border border-[var(--border-strong)] bg-gradient-to-b from-[var(--accent-primary)]/10 to-[var(--bg-panel-raised)] text-sm font-bold text-[var(--text-primary)]`}>
      {String(server?.name || "AR").slice(0, 2).toUpperCase()}
    </div>
  );
}

function PillarCard({
  href,
  icon: Icon,
  title,
  subtitle,
  status,
}: {
  href: string;
  icon: any;
  title: string;
  subtitle: string;
  status?: string;
}) {
  return (
    <Link href={href}>
      <a className="group flex items-center justify-between rounded-[20px] border border-[var(--border-default)] bg-[var(--bg-panel)] p-4 transition-all hover:border-[var(--border-strong)] hover:bg-[var(--bg-panel-raised)]">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-[var(--border-subtle)] bg-[var(--bg-panel-inset)] text-[var(--accent-primary)] transition-colors group-hover:bg-[var(--accent-primary)]/10">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-[var(--text-primary)]">{title}</p>
            <p className="text-[11px] text-[var(--text-secondary)]">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {status && (
            <span className="hidden text-[10px] font-bold uppercase tracking-wider text-[var(--success)] sm:inline">
              {status}
            </span>
          )}
          <ChevronRight className="h-4 w-4 text-[var(--text-faint)] transition-transform group-hover:translate-x-0.5" />
        </div>
      </a>
    </Link>
  );
}

export default function DashboardOverview() {
  const { data: servers, isLoading } = useServers();
  const { data: botStatus } = useBotStatus();
  const { data: user } = useAuth();

  const leadServer = getPreferredArchivistServer(servers);
  const leadServerId = leadServer?.id ?? 0;
  
  const leadOverviewQuery = useWorkspaceOverview(leadServerId, { enabled: !!leadServerId });
  const leadDocumentsQuery = useStudioDocuments(leadServerId, { enabled: !!leadServerId });

  const recentDraft = [...(leadDocumentsQuery.data || [])]
    .filter((record: any) => !record?.isArchived)
    .sort((a: any) => new Date(a.updatedAt).getTime())[0];

  return (
    <DashboardLayout mode="overview">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Server Status Block */}
        <div className="archivist-panel p-5 md:p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <ServerBadge server={leadServer} size="lg" />
              <div className="min-w-0">
                <p className="archivist-kicker">Current Server</p>
                <h1 className="truncate text-xl font-bold text-[var(--text-primary)] md:text-2xl">
                  {leadServer?.name || "No server connected"}
                </h1>
                <div className="mt-1 flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${botStatus?.ready ? 'bg-[var(--success)] shadow-[0_0_8px_var(--success)]' : 'bg-[var(--danger)]'}`} />
                  <span className="text-xs font-medium text-[var(--text-secondary)]">
                    Bot {botStatus?.ready ? "Live" : "Offline"}
                  </span>
                  <span className="text-[var(--border-default)]">•</span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {leadServer?.memberCount?.toLocaleString() || 0} members
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm" className="h-10 rounded-xl">
                <a href="/api/invite-url?redirect=1" target="_blank" rel="noopener noreferrer">
                  Invite Bot
                </a>
              </Button>
              <Button asChild size="sm" className="h-10 rounded-xl px-5">
                <Link href={leadServer ? buildArchivistSectionPath(leadServerId, "commands") : "/dashboard"}>
                  Enter Workspace
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Continue Lane */}
        {(recentDraft || leadServer) && (
          <div className="rounded-[20px] border border-[var(--border-strong)] bg-gradient-to-r from-[var(--accent-primary)]/5 to-transparent p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
                  <Zap className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[var(--text-primary)]">
                    {recentDraft ? `Resume ${recentDraft.name}` : `Continue in ${leadServer?.name}`}
                  </p>
                  <p className="truncate text-xs text-[var(--text-secondary)]">
                    {recentDraft 
                      ? `Draft updated ${recentDraft.updatedAt ? formatDistanceToNow(new Date(recentDraft.updatedAt)) : "recently"} ago`
                      : "Open your commands and design tools"}
                  </p>
                </div>
              </div>
              <Button asChild variant="ghost" size="sm" className="text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10">
                <Link href={recentDraft ? buildArchivistSectionPath(leadServerId, "studio") : buildArchivistSectionPath(leadServerId, "commands")}>
                  Continue
                  <MoveRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* Pillar Navigation */}
        <div className="grid gap-3 sm:grid-cols-2">
          <PillarCard 
            href={leadServer ? buildArchivistSectionPath(leadServerId, "commands") : "/dashboard"} 
            icon={Braces} 
            title="Custom Commands" 
            subtitle="Automation, logic, and testing"
            status="Active"
          />
          <PillarCard 
            href={leadServer ? buildArchivistSectionPath(leadServerId, "studio") : "/dashboard"} 
            icon={Layers3} 
            title="Design Studio" 
            subtitle="Visual message components"
          />
          <PillarCard 
            href={leadServer ? buildArchivistSectionPath(leadServerId, "fun") : "/dashboard"} 
            icon={Gamepad2} 
            title="Fun And Creative" 
            subtitle="Community games and profile"
          />
          <PillarCard 
            href={leadServer ? buildArchivistSectionPath(leadServerId, "server") : "/dashboard"} 
            icon={ShieldCheck} 
            title="Server Management" 
            subtitle="Roles, logs, and onboarding"
          />
        </div>

        {/* Managed Servers List (Simplified) */}
        <div className="archivist-panel overflow-hidden">
          <div className="border-b border-[var(--border-subtle)] px-5 py-4">
            <h2 className="text-sm font-bold text-[var(--text-primary)]">Managed Servers</h2>
          </div>
          
          <div className="divide-y divide-[var(--border-subtle)]">
            {isLoading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-[14px]" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              ))
            ) : servers?.map((server: any) => (
              <div key={server.id} className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-white/[0.02]">
                <div className="flex items-center gap-4">
                  <ServerBadge server={server} size="sm" />
                  <div>
                    <p className="text-sm font-bold text-[var(--text-primary)]">{server.name}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">{server.memberCount?.toLocaleString()} members</p>
                  </div>
                </div>
                <Button asChild variant="secondary" size="sm" className="rounded-lg">
                  <Link href={buildArchivistSectionPath(server.id, "commands")}>
                    Open
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
