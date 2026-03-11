import { useMemo, type ReactNode } from "react";
import { useLocation } from "wouter";
import {
  AlertTriangle,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  Clock3,
  FileClock,
  FilePlus2,
  LayoutTemplate,
  LoaderCircle,
  MessageSquareText,
  RadioTower,
  Rocket,
  ScrollText,
  Settings2,
  ShieldCheck,
  Sparkles,
  Ticket,
  Workflow,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

function OverviewMetricCard({
  eyebrow,
  value,
  label,
  tone = "neutral",
  icon: Icon,
}: {
  eyebrow: string;
  value: string;
  label: string;
  tone?: "healthy" | "warning" | "danger" | "neutral" | "brand";
  icon: typeof Bot;
}) {
  return (
    <Card className="archivist-panel archivist-panel-muted overflow-hidden">
      <CardContent className="flex items-start justify-between gap-4 p-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/[0.45]">{eyebrow}</p>
          <p className="mt-3 text-2xl font-display font-bold text-white">{value}</p>
          <p className="mt-1 text-sm text-muted-foreground">{label}</p>
        </div>
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl border", statusBadgeClass(tone))}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function OverviewModuleCard({
  title,
  description,
  metric,
  state,
  tone,
  icon: Icon,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  metric: string;
  state: string;
  tone: "healthy" | "warning" | "danger" | "neutral" | "brand";
  icon: typeof Bot;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <Card className="archivist-panel archivist-panel-muted group h-full overflow-hidden">
      <CardContent className="flex h-full flex-col gap-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/[0.86] transition group-hover:border-primary/30 group-hover:bg-primary/[0.12] group-hover:text-white">
            <Icon className="h-5 w-5" />
          </div>
          <SurfaceBadge tone={tone}>{state}</SurfaceBadge>
        </div>
        <div className="space-y-2">
          <div>
            <p className="text-base font-semibold text-white">{title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
          <p className="text-sm font-medium text-white/[0.88]">{metric}</p>
        </div>
        <Button variant="ghost" className="mt-auto justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-white/[0.86] hover:bg-white/[0.06]" onClick={onAction}>
          {actionLabel}
          <ArrowUpRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

function AlertList({
  alerts,
  onAction,
}: {
  alerts: Array<{ title: string; body: string; moduleId?: string; actionLabel?: string; tone: "healthy" | "warning" | "danger" | "brand" }>;
  onAction: (moduleId?: string) => void;
}) {
  return (
    <Card className="archivist-panel archivist-panel-muted">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/[0.45]">Signals</p>
            <CardTitle className="mt-2 text-xl text-white">Actionable alerts</CardTitle>
          </div>
          <SurfaceBadge tone={alerts[0]?.tone || "healthy"}>{alerts.length === 0 ? "Stable" : `${alerts.length} active`}</SurfaceBadge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.length === 0 ? (
          <div className="rounded-[24px] border border-emerald-500/[0.18] bg-emerald-500/10 px-4 py-4 text-sm text-emerald-100">
            Core systems look healthy. The bot is connected, promoted modules are not blocked, and there are no urgent setup warnings.
          </div>
        ) : (
          alerts.map((alert) => (
            <div key={alert.title} className={cn("rounded-[24px] border px-4 py-4", statusBadgeClass(alert.tone))}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{alert.title}</p>
                  <p className="mt-1 text-sm text-white/[0.76]">{alert.body}</p>
                </div>
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              </div>
              {alert.actionLabel ? (
                <Button variant="ghost" className="mt-3 rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-white hover:bg-white/[0.08]" onClick={() => onAction(alert.moduleId)}>
                  {alert.actionLabel}
                </Button>
              ) : null}
            </div>
          ))
        )}
      </CardContent>
    </Card>
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
    { label: "Modules Live", value: formatNumber(activeModules) },
    { label: "Drafts", value: formatNumber(draftCount) },
    { label: "Live Messages", value: formatNumber(publicationCount) },
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
                <SurfaceBadge tone="brand">Archivist Control</SurfaceBadge>
                <SurfaceBadge tone={botReady ? "healthy" : "danger"}>{botReady ? "Bot Live" : "Bot Offline"}</SurfaceBadge>
                <SurfaceBadge tone={pendingPublish ? "warning" : "healthy"}>{pendingPublish ? "Publish Ready" : "Shell Synced"}</SurfaceBadge>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.38em] text-white/[0.42]">Server Command Header</p>
                <h1 className="mt-2 truncate text-3xl font-display font-bold text-white sm:text-[2.35rem]" data-testid="text-server-name">{server.name}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/[0.68]" data-testid="text-server-info">
                  Command access, message publishing, and module control for {formatNumber(server.memberCount)} members. Use Studio for message work, or jump directly into the modules that need attention.
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
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/[0.42]">Live Status</p>
                <p className="mt-2 text-xl font-display font-bold text-white">{pendingPublish ? "Drafts need attention" : "Control center is stable"}</p>
              </div>
              {pendingPublish ? <Rocket className="h-5 w-5 text-primary" /> : <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div className="rounded-[22px] border border-white/[0.08] bg-black/20 px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.28em] text-white/[0.42]">Bot Status</p>
                <p className="mt-2 text-sm font-semibold text-white">{botReady ? "Linked and responsive" : "Reconnection required"}</p>
              </div>
              <div className="rounded-[22px] border border-white/[0.08] bg-black/20 px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.28em] text-white/[0.42]">Publish Queue</p>
                <p className="mt-2 text-sm font-semibold text-white">{pendingPublish ? `${draftCount} drafts need review` : `${publicationCount} live message${publicationCount === 1 ? "" : "s"}`}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button className="min-h-12 rounded-[20px] justify-between px-4" onClick={() => navigate(`/dashboard/servers/${serverId}/studio`)}>
              Open Studio
              <Sparkles className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="min-h-12 rounded-[20px] justify-between px-4 text-white/[0.86]" onClick={() => navigate(`/dashboard/servers/${serverId}/studio`)}>
              Preview Messages
              <LayoutTemplate className="h-4 w-4" />
            </Button>
            <Button variant={pendingPublish ? "default" : "secondary"} className="min-h-12 rounded-[20px] justify-between px-4" onClick={() => navigate(`/dashboard/servers/${serverId}/studio`)}>
              {pendingPublish ? "Publish" : "Review Publish"}
              <Rocket className="h-4 w-4" />
            </Button>
            <Button variant="ghost" className="min-h-12 rounded-[20px] justify-between border border-white/10 bg-white/[0.03] px-4 text-white/[0.86] hover:bg-white/[0.06]" onClick={() => onModuleChange("settings")}>
              Manage Modules
              <Settings2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ServerActionBar({
  serverId,
  pendingPublish,
  publicationCount,
  draftCount,
  onModuleChange,
}: {
  serverId: number;
  pendingPublish: boolean;
  publicationCount: number;
  draftCount: number;
  onModuleChange: (moduleId: string) => void;
}) {
  const [, navigate] = useLocation();

  return (
    <div className="sticky top-3 z-20 mt-4 overflow-x-auto">
      <div className="archivist-panel flex min-w-max items-center gap-3 rounded-[24px] px-3 py-3 backdrop-blur-xl">
        <div className="hidden min-w-[210px] sm:block">
          <p className="text-[10px] uppercase tracking-[0.28em] text-white/[0.40]">Quick Controls</p>
          <p className="mt-1 text-sm text-white/[0.72]">{pendingPublish ? `${draftCount} draft${draftCount === 1 ? "" : "s"} ready for publish review` : publicationCount > 0 ? `${publicationCount} live message${publicationCount === 1 ? "" : "s"} active` : "Jump into Studio or configure modules"}</p>
        </div>
        <Button className="rounded-[18px] px-4" onClick={() => navigate(`/dashboard/servers/${serverId}/studio`)}>
          Open Studio
        </Button>
        <Button variant="outline" className="rounded-[18px] px-4 text-white/[0.86]" onClick={() => navigate(`/dashboard/servers/${serverId}/studio`)}>
          Preview
        </Button>
        <Button variant={pendingPublish ? "default" : "secondary"} className="rounded-[18px] px-4" onClick={() => navigate(`/dashboard/servers/${serverId}/studio`)}>
          {pendingPublish ? "Publish" : "Publish Flow"}
        </Button>
        <Button variant="ghost" className="rounded-[18px] border border-white/10 bg-white/[0.03] px-4 text-white/[0.82] hover:bg-white/[0.06]" onClick={() => onModuleChange("settings")}>
          Settings
        </Button>
      </div>
    </div>
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
  const latestDraft = drafts[0];
  const pendingPublish = unpublishedDraftCount > 0;

  const welcomeReady = Boolean(server.settings?.welcomeEnabled && (server.settings?.welcomeChannelId || server.settings?.welcomeStudioDocumentId || server.settings?.welcomeMessage));
  const verifyReady = Boolean(server.settings?.verifyEnabled && (server.settings?.verifyPublicationId || (server.settings?.verifyChannelId && server.settings?.verifyRoleId)));
  const ticketsEnabled = Boolean(server.ticketConfig?.enabled);
  const ticketPanelsCount = server.ticketPanels?.length ?? 0;
  const ticketsReady = Boolean(ticketsEnabled && ticketPanelsCount > 0);
  const scheduledCount = server.scheduledMessages?.length ?? 0;
  const commandCount = server.customCommands?.length ?? 0;
  const loggingReady = Boolean(server.settings?.logChannelId || server.settings?.modLogChannelId || server.settings?.verifyLogChannelId);

  const alerts = [
    !botReady
      ? {
          title: "Bot connection is down",
          body: "Live commands and interactive messages may not respond until the bot reconnects.",
          moduleId: "server-control",
          actionLabel: "Open control",
          tone: "danger" as const,
        }
      : null,
    pendingPublish
      ? {
          title: "Studio has unpublished work",
          body: `${unpublishedDraftCount} draft${unpublishedDraftCount === 1 ? " is" : "s are"} waiting for publish review.`,
          moduleId: "design-studio",
          actionLabel: "Review drafts",
          tone: "warning" as const,
        }
      : null,
    server.settings?.welcomeEnabled && !welcomeReady
      ? {
          title: "Welcome is enabled but incomplete",
          body: "Finish the welcome destination or attach a Studio surface before going live.",
          moduleId: "welcome",
          actionLabel: "Finish welcome",
          tone: "warning" as const,
        }
      : null,
    server.settings?.verifyEnabled && !verifyReady
      ? {
          title: "Verify is missing a live route",
          body: "Add the role, destination channel, or published entry surface so members can complete verification.",
          moduleId: "verify",
          actionLabel: "Complete verify",
          tone: "warning" as const,
        }
      : null,
    ticketsEnabled && ticketPanelsCount === 0
      ? {
          title: "Tickets are enabled without a panel",
          body: "Create a panel so members have a visible way to open support threads.",
          moduleId: "tickets",
          actionLabel: "Create panel",
          tone: "brand" as const,
        }
      : null,
  ].filter(Boolean) as Array<{ title: string; body: string; moduleId?: string; actionLabel?: string; tone: "healthy" | "warning" | "danger" | "brand" }>;

  const moduleCards = [
    {
      id: "welcome",
      title: "Welcome",
      description: "Entry messaging, onboarding, and first impression control.",
      metric: welcomeReady
        ? server.settings?.welcomeStudioDocumentId
          ? "Studio-linked welcome surface is ready"
          : "Welcome channel and message are configured"
        : server.settings?.welcomeEnabled
          ? "Enabled, but the destination or content still needs work"
          : "No welcome flow is active yet",
      state: welcomeReady ? "Live" : server.settings?.welcomeEnabled ? "Needs setup" : "Idle",
      tone: welcomeReady ? "healthy" : server.settings?.welcomeEnabled ? "warning" : "neutral",
      icon: MessageSquareText,
      actionLabel: welcomeReady ? "Refine welcome" : "Set up welcome",
    },
    {
      id: "verify",
      title: "Verify",
      description: "Member access, role gating, and secure entry routing.",
      metric: verifyReady
        ? server.settings?.verifyPublicationId
          ? "Published verification surface is active"
          : "Verify route is configured with role and channel"
        : server.settings?.verifyEnabled
          ? "Enabled, but the live path is incomplete"
          : "Verification is not active",
      state: verifyReady ? "Live" : server.settings?.verifyEnabled ? "Blocked" : "Idle",
      tone: verifyReady ? "healthy" : server.settings?.verifyEnabled ? "warning" : "neutral",
      icon: ShieldCheck,
      actionLabel: verifyReady ? "Review verify" : "Set up verify",
    },
    {
      id: "tickets",
      title: "Tickets",
      description: "Support intake, panel launches, and private conversations.",
      metric: ticketsReady
        ? `${ticketPanelsCount} ticket panel${ticketPanelsCount === 1 ? "" : "s"} linked`
        : ticketsEnabled
          ? "Ticket routing is enabled, but no panel is published yet"
          : "No ticket intake flow configured",
      state: ticketsReady ? "Live" : ticketsEnabled ? "Needs panel" : "Idle",
      tone: ticketsReady ? "healthy" : ticketsEnabled ? "warning" : "neutral",
      icon: Ticket,
      actionLabel: ticketsReady ? "Manage tickets" : "Set up tickets",
    },
    {
      id: "commands",
      title: "Commands",
      description: "Server-specific shortcuts, helpers, and operator tools.",
      metric: commandCount > 0 ? `${commandCount} custom command${commandCount === 1 ? "" : "s"} loaded` : "No custom commands configured yet",
      state: commandCount > 0 ? "Ready" : "Idle",
      tone: commandCount > 0 ? "brand" : "neutral",
      icon: ScrollText,
      actionLabel: commandCount > 0 ? "Manage commands" : "Create command",
    },
    {
      id: "scheduled",
      title: "Scheduled",
      description: "Recurring announcements, reminders, and timed message drops.",
      metric: scheduledCount > 0 ? `${scheduledCount} scheduled message${scheduledCount === 1 ? "" : "s"} queued` : "No scheduled sends are configured yet",
      state: scheduledCount > 0 ? "Queued" : "Idle",
      tone: scheduledCount > 0 ? "brand" : "neutral",
      icon: Clock3,
      actionLabel: scheduledCount > 0 ? "Review schedule" : "Create schedule",
    },
    {
      id: "audit-logs",
      title: "Health + Logs",
      description: "Audit visibility, issue tracing, and operational awareness.",
      metric: loggingReady ? "A log destination is configured for moderation or verification events" : "No primary logging channel is configured yet",
      state: loggingReady ? "Watching" : "Quiet",
      tone: loggingReady ? "healthy" : "neutral",
      icon: RadioTower,
      actionLabel: loggingReady ? "Review logging" : "Configure logging",
    },
  ] as const;

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
        onSuccess: (created: any) => navigate(`/dashboard/servers/${serverId}/studio?documentId=${created.id}`),
        onError: (error: any) =>
          toast({
            title: "Create failed",
            description: error?.message || "Archivist could not create a new draft.",
            variant: "destructive",
          }),
      },
    );
  };

  const openStudio = (documentId?: number) => {
    const target = new URL(`/dashboard/servers/${serverId}/studio`, window.location.origin);
    if (documentId) target.searchParams.set("documentId", String(documentId));
    navigate(`${target.pathname}${target.search}`);
  };
  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.38fr)_minmax(340px,0.82fr)]">
        <Card className="archivist-panel overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.34em] text-white/[0.45]">Design Studio</p>
                <CardTitle className="mt-2 text-[1.65rem] text-white">Message control, drafts, and publish flow</CardTitle>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/[0.70]">
                  Studio is the premium center of the server dashboard. Start a new surface, reopen a draft, or push a live publish pass without leaving the command shell.
                </p>
              </div>
              <SurfaceBadge tone={pendingPublish ? "warning" : drafts.length > 0 ? "brand" : "neutral"}>{pendingPublish ? "Needs publish" : drafts.length > 0 ? "Drafts ready" : "No drafts"}</SurfaceBadge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
              <div className="rounded-[28px] border border-primary/20 bg-[linear-gradient(180deg,rgba(177,18,38,0.18),rgba(9,10,12,0.96))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-white/[0.48]">Studio Anchor</p>
                    <p className="mt-2 text-xl font-display font-bold text-white">{pendingPublish ? `${unpublishedDraftCount} draft${unpublishedDraftCount === 1 ? "" : "s"} waiting to ship` : drafts.length > 0 ? "Your build space is active" : "Start the next live message"}</p>
                    <p className="mt-2 text-sm text-white/[0.72]">{latestDraft ? `Latest draft: ${latestDraft.name}` : "Open a clean message canvas and start designing immediately."}</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/10 bg-white/[0.05] text-primary shadow-[0_16px_36px_rgba(177,18,38,0.28)]">
                    {createDocumentMutation.isPending ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                  </div>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[20px] border border-white/[0.08] bg-black/20 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-[0.28em] text-white/[0.40]">Drafts</p>
                    <p className="mt-2 text-lg font-display font-bold text-white">{drafts.length}</p>
                  </div>
                  <div className="rounded-[20px] border border-white/[0.08] bg-black/20 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-[0.28em] text-white/[0.40]">Live</p>
                    <p className="mt-2 text-lg font-display font-bold text-white">{activePublications.length}</p>
                  </div>
                  <div className="rounded-[20px] border border-white/[0.08] bg-black/20 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-[0.28em] text-white/[0.40]">Queue</p>
                    <p className="mt-2 text-lg font-display font-bold text-white">{unpublishedDraftCount}</p>
                  </div>
                </div>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <Button className="min-h-11 rounded-[18px] px-4" onClick={createPrimaryDraft} disabled={createDocumentMutation.isPending}>
                    <FilePlus2 className="h-4 w-4" />
                    New Design
                  </Button>
                  <Button variant="outline" className="min-h-11 rounded-[18px] px-4 text-white/[0.86]" onClick={() => openStudio(latestDraft?.id)}>
                    <FileClock className="h-4 w-4" />
                    Continue Design
                  </Button>
                  <Button variant="ghost" className="min-h-11 rounded-[18px] border border-white/10 bg-white/[0.03] px-4 text-white/[0.86] hover:bg-white/[0.06]" onClick={() => openStudio()}>
                    Open Studio
                  </Button>
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">Recent message work</p>
                    <p className="mt-1 text-xs text-muted-foreground">Jump back into the latest draft or review what was published last.</p>
                  </div>
                  <Button variant="ghost" className="rounded-full border border-white/10 bg-white/[0.03] px-3 text-white/[0.80] hover:bg-white/[0.06]" onClick={() => openStudio()}>
                    View all
                  </Button>
                </div>
                <div className="mt-4 space-y-2">
                  {studioDocumentsQuery.isLoading ? (
                    Array.from({ length: 3 }).map((_, index) => (
                      <div key={`studio-draft-skeleton-${index}`} className="rounded-[20px] border border-white/[0.08] bg-white/[0.03] px-4 py-4">
                        <div className="h-4 w-36 rounded bg-white/10" />
                        <div className="mt-2 h-3 w-44 rounded bg-white/5" />
                      </div>
                    ))
                  ) : drafts.length > 0 ? (
                    drafts.slice(0, 3).map((record: any) => (
                      <button
                        key={record.id}
                        type="button"
                        onClick={() => openStudio(record.id)}
                        className="flex w-full items-center justify-between gap-3 rounded-[20px] border border-white/[0.08] bg-white/[0.03] px-4 py-4 text-left transition hover:border-primary/30 hover:bg-white/[0.05]"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">{record.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {publishedDocumentIds.has(record.id) ? "Published draft" : "Unpublished draft"} · Edited {formatRelativeEditTime(record.updatedAt)}
                          </p>
                        </div>
                        <ArrowUpRight className="h-4 w-4 shrink-0 text-white/44" />
                      </button>
                    ))
                  ) : (
                    <div className="rounded-[20px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-5 text-sm text-muted-foreground">
                      No drafts yet. Start a new design and Archivist will keep your most recent work here.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <OverviewMetricCard eyebrow="Server Health" value={botReady ? "Online" : "Attention"} label={botReady ? "Bot connection is healthy" : "Reconnect the bot to restore live actions"} tone={botReady ? "healthy" : "danger"} icon={Bot} />
          <OverviewMetricCard eyebrow="Publish State" value={pendingPublish ? `${unpublishedDraftCount}` : `${activePublications.length}`} label={pendingPublish ? "Drafts waiting for publish review" : "Live Studio publications active"} tone={pendingPublish ? "warning" : "brand"} icon={pendingPublish ? Rocket : LayoutTemplate} />
          <OverviewMetricCard eyebrow="Coverage" value={String(activeModules)} label="Core modules are currently active" tone={activeModules > 0 ? "brand" : "neutral"} icon={Workflow} />
          <OverviewMetricCard eyebrow="Response" value={loggingReady ? "Watching" : "Quiet"} label={loggingReady ? "A log route is capturing server events" : "Set a log destination for better issue tracing"} tone={loggingReady ? "healthy" : "neutral"} icon={RadioTower} />
        </div>
      </div>

      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.12fr)_minmax(360px,0.88fr)]">
        <Card className="archivist-panel archivist-panel-muted">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/[0.45]">Module Snapshot</p>
                <CardTitle className="mt-2 text-xl text-white">Server systems at a glance</CardTitle>
              </div>
              <SurfaceBadge tone="brand">Home base</SurfaceBadge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {moduleCards.map((card) => (
              <OverviewModuleCard key={card.id} {...card} onAction={() => onModuleChange(card.id)} />
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <AlertList alerts={alerts} onAction={(moduleId) => moduleId && onModuleChange(moduleId)} />
          <Card className="archivist-panel archivist-panel-muted">
            <CardHeader className="pb-3">
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/[0.45]">Quick Actions</p>
              <CardTitle className="mt-2 text-xl text-white">Jump straight into work</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Button className="min-h-11 rounded-[20px] justify-between px-4" onClick={() => openStudio()}>
                Open Studio
                <Sparkles className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="min-h-11 rounded-[20px] justify-between px-4 text-white/[0.86]" onClick={() => onModuleChange("welcome")}>
                Welcome
                <ArrowUpRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="min-h-11 rounded-[20px] justify-between px-4 text-white/[0.86]" onClick={() => onModuleChange("verify")}>
                Verify
                <ArrowUpRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="min-h-11 rounded-[20px] justify-between px-4 text-white/[0.86]" onClick={() => onModuleChange("tickets")}>
                Tickets
                <ArrowUpRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="min-h-11 rounded-[20px] justify-between px-4 text-white/[0.86]" onClick={() => onModuleChange("commands")}>
                Commands
                <ArrowUpRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" className="min-h-11 rounded-[20px] justify-between border border-white/10 bg-white/[0.03] px-4 text-white/[0.86] hover:bg-white/[0.06]" onClick={() => onModuleChange("settings")}>
                Server Settings
                <Settings2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


