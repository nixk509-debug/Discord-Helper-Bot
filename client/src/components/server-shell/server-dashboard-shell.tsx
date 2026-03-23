import { useMemo, type ReactNode } from "react";
import { useLocation } from "wouter";
import {
  AlertTriangle,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  FileClock,
  FilePlus2,
  RadioTower,
  Rocket,
  Settings2,
  Sparkles,
  Workflow,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  useCreateStudioDocument,
  useStudioDocuments,
  useStudioPublications,
} from "@/hooks/use-bot";
import { useToast } from "@/hooks/use-toast";
import { createStudioPrimaryDocument } from "@/components/design-studio/studio-defaults";

function formatNumber(value: number | undefined | null) {
  return new Intl.NumberFormat("en-US", { notation: value && value >= 1000 ? "compact" : "standard" }).format(value || 0);
}

function formatRelativeEditTime(value: unknown) {
  const parsed = value instanceof Date ? value : new Date(value as string | number);
  if (Number.isNaN(parsed.getTime())) return "Updated recently";

  const diffMs = parsed.getTime() - Date.now();
  const absMinutes = Math.round(Math.abs(diffMs) / 60000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (absMinutes < 60) return formatter.format(Math.round(diffMs / 60000), "minute");

  const absHours = Math.round(absMinutes / 60);
  if (absHours < 24) return formatter.format(Math.round(diffMs / 3600000), "hour");

  const absDays = Math.round(absHours / 24);
  if (absDays < 7) return formatter.format(Math.round(diffMs / 86400000), "day");

  return parsed.toLocaleDateString([], { month: "short", day: "numeric" });
}

function getServerInitials(name: string) {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function statusBadgeClass(tone: "healthy" | "warning" | "danger" | "neutral" | "brand") {
  switch (tone) {
    case "healthy":
      return "border-emerald-500/20 bg-emerald-500/[0.12] text-emerald-100";
    case "warning":
      return "border-amber-500/20 bg-amber-500/[0.12] text-amber-100";
    case "danger":
      return "border-rose-500/20 bg-rose-500/[0.12] text-rose-100";
    case "brand":
      return "border-primary/20 bg-primary/[0.14] text-white";
    default:
      return "border-white/10 bg-white/[0.04] text-white/[0.72]";
  }
}

function SurfaceBadge({ tone, children }: { tone: "healthy" | "warning" | "danger" | "neutral" | "brand"; children: ReactNode }) {
  return (
    <Badge variant="outline" className={cn("rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[0.12em] uppercase", statusBadgeClass(tone))}>
      {children}
    </Badge>
  );
}

export function ServerDashboardHero({
  server,
  serverId,
  activeModules,
  draftCount,
  publicationCount,
  pendingPublish,
  botReady,
  onModuleChange,
}: {
  server: any;
  serverId: number;
  activeModules: number;
  draftCount: number;
  publicationCount: number;
  pendingPublish: boolean;
  botReady: boolean;
  onModuleChange: (moduleId: string) => void;
}) {
  const [, navigate] = useLocation();

  const stats = [
    { label: "Members", value: formatNumber(server.memberCount) },
    { label: "Surfaces Live", value: formatNumber(activeModules) },
    { label: "Drafts", value: formatNumber(draftCount) },
    { label: "Published", value: formatNumber(publicationCount) },
  ];

  return (
    <section className="archivist-hero-shell relative overflow-hidden rounded-[32px] border border-white/10 bg-[#050608] shadow-[0_36px_120px_rgba(0,0,0,0.58)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,45,77,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(127,12,28,0.34),transparent_38%)]" />
      <div className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),transparent)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,45,77,0.9),transparent)]" />

      <div className="relative grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.9fr)] lg:p-6">
        <div className="space-y-5">
          <div className="flex items-start gap-4">
            {server.iconUrl ? (
              <img src={server.iconUrl} alt={server.name} className="h-20 w-20 rounded-[24px] border border-white/10 object-cover shadow-[0_20px_50px_rgba(177,18,38,0.22)] sm:h-24 sm:w-24" data-testid="img-server-icon" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-[24px] border border-white/10 bg-[linear-gradient(135deg,rgba(177,18,38,0.88),rgba(23,24,28,0.98))] text-2xl font-display font-bold text-white shadow-[0_20px_50px_rgba(177,18,38,0.22)] sm:h-24 sm:w-24" data-testid="img-server-icon-fallback">
                {getServerInitials(server.name)}
              </div>
            )}
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <SurfaceBadge tone="brand">Archivist Rebuild</SurfaceBadge>
                <SurfaceBadge tone={botReady ? "healthy" : "danger"}>{botReady ? "Bot Live" : "Bot Offline"}</SurfaceBadge>
                <SurfaceBadge tone={pendingPublish ? "warning" : "healthy"}>{pendingPublish ? "Drafts Need Review" : "Studio Stable"}</SurfaceBadge>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.38em] text-white/[0.42]">Reboot Shell</p>
                <h1 className="mt-2 truncate text-3xl font-display font-bold text-white sm:text-[2.35rem]" data-testid="text-server-name">{server.name}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/[0.68]" data-testid="text-server-info">
                  Archivist now uses a cleaner server workspace: Studio, commands, settings, and module controls stay connected so you can move through setup without losing your place.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-[22px] border border-white/[0.08] bg-white/[0.03] px-4 py-4 backdrop-blur-sm">
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/[0.40]">{stat.label}</p>
                <p className="mt-3 text-xl font-display font-bold text-white">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="archivist-panel rounded-[28px] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/[0.42]">Current Focus</p>
                <p className="mt-2 text-xl font-display font-bold text-white">{pendingPublish ? "Finish the Studio publish pass" : "Workspace is live"}</p>
              </div>
              {pendingPublish ? <Rocket className="h-5 w-5 text-primary" /> : <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div className="rounded-[22px] border border-white/[0.08] bg-black/20 px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.28em] text-white/[0.42]">Bot Status</p>
                <p className="mt-2 text-sm font-semibold text-white">{botReady ? "Connected" : "Needs reconnect"}</p>
              </div>
              <div className="rounded-[22px] border border-white/[0.08] bg-black/20 px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.28em] text-white/[0.42]">Legacy Modules</p>
                <p className="mt-2 text-sm font-semibold text-white">Routed into the new workspace</p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button className="min-h-12 rounded-[20px] justify-between px-4" onClick={() => navigate(`/dashboard/servers/${serverId}/studio`)}>
              Open Studio
              <Sparkles className="h-4 w-4" />
            </Button>
            <Button variant="ghost" className="min-h-12 rounded-[20px] justify-between border border-white/10 bg-white/[0.03] px-4 text-white/[0.86] hover:bg-white/[0.06]" onClick={() => onModuleChange("settings")}>
              Rebuild Settings
              <Settings2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ServerOverviewTab({
  serverId,
  server,
  botReady,
  activeModules,
  onModuleChange,
}: {
  serverId: number;
  server: any;
  botReady: boolean;
  activeModules: number;
  onModuleChange: (moduleId: string) => void;
}) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const studioDocumentsQuery = useStudioDocuments(serverId);
  const studioPublicationsQuery = useStudioPublications(serverId);
  const createDocumentMutation = useCreateStudioDocument(serverId);

  const drafts = useMemo(() => {
    const records = Array.isArray(studioDocumentsQuery.data) ? studioDocumentsQuery.data : [];
    return [...records]
      .filter((record: any) => record?.kind !== "template" && !record?.isArchived)
      .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [studioDocumentsQuery.data]);

  const activePublications = useMemo(() => {
    const publications = Array.isArray(studioPublicationsQuery.data) ? studioPublicationsQuery.data : [];
    return publications.filter((entry: any) => entry?.active !== false);
  }, [studioPublicationsQuery.data]);

  const publishedDocumentIds = useMemo(() => new Set(activePublications.map((entry: any) => entry.documentId)), [activePublications]);
  const unpublishedDraftCount = drafts.filter((record: any) => !publishedDocumentIds.has(record.id)).length;
  const draftsNeedingAttention = useMemo(
    () => drafts.filter((record: any) => !publishedDocumentIds.has(record.id)).slice(0, 4),
    [drafts, publishedDocumentIds],
  );
  const recentPublishFailures = useMemo(() => {
    const publications = Array.isArray(studioPublicationsQuery.data) ? studioPublicationsQuery.data : [];
    return [...publications]
      .filter((entry: any) => entry?.lastFailureSummary)
      .sort((a: any, b: any) => new Date(b.lastFailureAt || b.updatedAt || 0).getTime() - new Date(a.lastFailureAt || a.updatedAt || 0).getTime())
      .slice(0, 3);
  }, [studioPublicationsQuery.data]);
  const latestDraft = drafts[0];
  const pendingPublish = unpublishedDraftCount > 0;

  const openStudio = (documentId?: number) => {
    const target = new URL(`/dashboard/servers/${serverId}/studio`, window.location.origin);
    if (documentId) target.searchParams.set("documentId", String(documentId));
    navigate(`${target.pathname}${target.search}`);
  };

  const createPrimaryDraft = () => {
    const document = createStudioPrimaryDocument("message");
    createDocumentMutation.mutate(
      {
        scope: "server",
        kind: "surface",
        name: document.meta.name,
        document,
      },
      {
        onSuccess: (created: any) => openStudio(created.id),
        onError: (error: any) => toast({ title: "Create failed", description: error.message, variant: "destructive" }),
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)]">
        <Card className="archivist-panel archivist-panel-muted">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/[0.45]">Rebuild Status</p>
                <CardTitle className="mt-2 text-xl text-white">Current foundation</CardTitle>
              </div>
              <SurfaceBadge tone="brand">Shell only</SurfaceBadge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[20px] border border-white/[0.08] bg-black/20 px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.28em] text-white/[0.40]">Bot</p>
                <p className="mt-2 text-sm font-semibold text-white">{botReady ? "Connected" : "Offline"}</p>
              </div>
              <div className="rounded-[20px] border border-white/[0.08] bg-black/20 px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.28em] text-white/[0.40]">Dashboard</p>
                <p className="mt-2 text-sm font-semibold text-white">{activeModules} minimal surfaces</p>
              </div>
              <div className="rounded-[20px] border border-white/[0.08] bg-black/20 px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.28em] text-white/[0.40]">Legacy Commands</p>
                <p className="mt-2 text-sm font-semibold text-white">Disabled</p>
              </div>
            </div>

            <div className="rounded-[24px] border border-primary/20 bg-[linear-gradient(180deg,rgba(177,18,38,0.18),rgba(9,10,12,0.96))] p-5">
              <p className="text-sm font-semibold text-white">{pendingPublish ? `${unpublishedDraftCount} draft${unpublishedDraftCount === 1 ? "" : "s"} still need review` : "Studio is the main rebuild lane now"}</p>
              <p className="mt-2 text-sm text-white/[0.72]">{latestDraft ? `Resume: ${latestDraft.name}` : "Start a fresh message draft and rebuild from the Studio outward."}</p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <Button className="min-h-11 rounded-[18px] px-4" onClick={createPrimaryDraft} disabled={createDocumentMutation.isPending}>
                  <FilePlus2 className="h-4 w-4" />
                  New Draft
                </Button>
                <Button variant="outline" className="min-h-11 rounded-[18px] px-4 text-white/[0.86]" onClick={() => openStudio(latestDraft?.id)}>
                  <FileClock className="h-4 w-4" />
                  {latestDraft ? "Resume Last Draft" : "Open Studio"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="archivist-panel archivist-panel-muted">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl text-white">Recent Publish Failures</CardTitle>
            <CardDescription>Failures still surface here so Studio remains debuggable during the rebuild.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentPublishFailures.length > 0 ? recentPublishFailures.map((publication: any) => (
              <button
                key={`publish-failure-${publication.id}`}
                type="button"
                onClick={() => openStudio(publication.documentId)}
                className="flex w-full items-start justify-between gap-3 rounded-[20px] border border-white/[0.08] bg-white/[0.03] px-4 py-4 text-left transition hover:border-primary/30 hover:bg-white/[0.05]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{publication.lastFailureSummary}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Publication #{publication.id} · {publication.channelId || "Unknown channel"} · {formatRelativeEditTime(publication.lastFailureAt || publication.updatedAt)}
                  </p>
                </div>
                <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-white/44" />
              </button>
            )) : (
              <div className="rounded-[20px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-5 text-sm text-muted-foreground">
                No recent publish failures.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="archivist-panel archivist-panel-muted">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl text-white">Drafts Needing Attention</CardTitle>
          <CardDescription>Only the real Studio work queue remains in the reboot shell.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {draftsNeedingAttention.length > 0 ? draftsNeedingAttention.map((record: any) => (
            <button
              key={record.id}
              type="button"
              onClick={() => openStudio(record.id)}
              className="flex w-full items-center justify-between gap-3 rounded-[20px] border border-white/[0.08] bg-white/[0.03] px-4 py-4 text-left transition hover:border-primary/30 hover:bg-white/[0.05]"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{record.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">Needs publish review · Edited {formatRelativeEditTime(record.updatedAt)}</p>
              </div>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-white/44" />
            </button>
          )) : (
            <div className="rounded-[20px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-5 text-sm text-muted-foreground">
              No drafts are waiting on review right now.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
