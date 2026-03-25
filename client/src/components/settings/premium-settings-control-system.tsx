import type { ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  ChevronRight,
  CopyPlus,
  ExternalLink,
  Hash,
  LifeBuoy,
  MessageSquareText,
  Radar,
  ScrollText,
  ShieldCheck,
  Siren,
  UserRoundPlus,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buildArchivistItemPath } from "@/lib/archivist-workspace";
import { useAuth } from "@/hooks/use-auth";

type SettingsTone = "neutral" | "healthy" | "warning" | "danger" | "brand";

type CategoryMeta = {
  id: string;
  slug: string;
  title: string;
  eyebrow: string;
  description: string;
  homeDescription: string;
  icon: LucideIcon;
};

type SettingsRow = {
  title: string;
  description: string;
  primaryChip: string;
  secondaryChip: string;
  tone?: SettingsTone;
};

type SettingsDiagnostic = {
  title: string;
  description: string;
  tone: SettingsTone;
};

type SettingsQuickAction = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

type SettingsPageModel = {
  heroMetricLabel: string;
  heroMetricValue: string;
  primaryActionLabel: string;
  primaryActionHref: string;
  status: { label: string; tone: SettingsTone };
  meta: { label: string; tone: SettingsTone };
  core: SettingsRow[];
  advanced: SettingsRow[];
  intensify: SettingsRow[];
  diagnostics: SettingsDiagnostic[];
  quickActions: SettingsQuickAction[];
};

const CATEGORY_META: CategoryMeta[] = [
  {
    id: "settings-bot-engine",
    slug: "bot-engine",
    title: "Bot Engine",
    eyebrow: "Bot Brain",
    description: "Tune bot behavior, routing posture, response defaults, and server-level control intensity.",
    homeDescription: "Tune bot behavior, routing, response defaults, and module intensity.",
    icon: Bot,
  },
  {
    id: "settings-channel-control",
    slug: "channel-control",
    title: "Channel Control",
    eyebrow: "Routing Surface",
    description: "Route outputs, define channel behavior, and unlock channel-specific automation without turning settings into a giant channel dump.",
    homeDescription: "Route outputs, define channel behavior, and unlock channel-specific automation.",
    icon: Hash,
  },
  {
    id: "settings-role-power",
    slug: "role-power",
    title: "Role Power",
    eyebrow: "Authority Graph",
    description: "Manage role logic, hierarchy, gated access, and automation-ready role behavior from one strict control layer.",
    homeDescription: "Manage role logic, hierarchy, gated access, and role-driven automation.",
    icon: Users,
  },
  {
    id: "settings-command-logic",
    slug: "command-logic",
    title: "Command Logic",
    eyebrow: "Execution System",
    description: "Treat command behavior like a logic system with access, conditions, routing, and recovery controls.",
    homeDescription: "Shape access, execution conditions, cooldowns, and command routing as one logic layer.",
    icon: ScrollText,
  },
  {
    id: "settings-member-flow",
    slug: "member-flow",
    title: "Member Flow",
    eyebrow: "Journey Control",
    description: "Turn welcome, verification, join behavior, and trust progression into one ordered journey system.",
    homeDescription: "Handle welcome, verification, onboarding, and trust progression like one journey system.",
    icon: UserRoundPlus,
  },
  {
    id: "settings-signals-logging",
    slug: "signals-logging",
    title: "Signals & Logging",
    eyebrow: "Mission Control",
    description: "Use alerts, event families, routing, and diagnostics like one operational signal system instead of boring logs.",
    homeDescription: "Control alert routing, event families, logging depth, and operational diagnostics.",
    icon: Siren,
  },
  {
    id: "settings-safety-recovery",
    slug: "safety-recovery",
    title: "Safety & Recovery",
    eyebrow: "Recovery Layer",
    description: "Use backups, exports, restore posture, and guarded actions like a premium safety system instead of a dead-end backup page.",
    homeDescription: "Handle backups, exports, rollback posture, and guarded recovery as one safety system.",
    icon: LifeBuoy,
  },
];

const formatter = new Intl.NumberFormat("en-US", { notation: "compact" });

function formatNumber(value: number | null | undefined) {
  return formatter.format(value || 0);
}

function toneLabel(tone: SettingsTone) {
  switch (tone) {
    case "danger":
      return "Needs attention";
    case "warning":
      return "Watch closely";
    case "brand":
      return "Intensified";
    case "healthy":
      return "Healthy";
    default:
      return "Structured";
  }
}

function getServerInitials(name: string) {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function guessLikelyChannels(channels: any[], pattern: RegExp) {
  return channels.filter((channel) => pattern.test(channel.name || ""));
}

function guessLikelyRoles(roles: any[], pattern: RegExp) {
  return roles.filter((role) => pattern.test(role.name || ""));
}

function SettingsStatusChip({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: SettingsTone;
}) {
  const toneClasses =
    tone === "danger"
      ? "border-[rgba(220,84,103,0.24)] bg-[rgba(220,84,103,0.12)] text-[rgba(255,221,227,0.95)]"
      : tone === "warning"
        ? "border-[rgba(213,155,54,0.22)] bg-[rgba(213,155,54,0.12)] text-[rgba(248,233,198,0.96)]"
        : tone === "healthy"
          ? "border-[rgba(62,167,123,0.24)] bg-[rgba(62,167,123,0.12)] text-[rgba(222,245,234,0.94)]"
          : tone === "brand"
            ? "border-[var(--border-brand)] bg-[rgba(163,33,57,0.16)] text-[var(--text-primary)]"
            : "border-[var(--border-subtle)] bg-[rgba(155,180,201,0.08)] text-[rgba(222,231,240,0.92)]";

  return (
    <span className={cn("rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em]", toneClasses)}>
      {children}
    </span>
  );
}

function DiagnosticIcon({ tone }: { tone: SettingsTone }) {
  if (tone === "danger") {
    return (
      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(220,84,103,0.28)] bg-[rgba(220,84,103,0.12)] text-[rgba(255,221,227,0.95)]">
        <AlertTriangle className="h-4 w-4" />
      </div>
    );
  }

  if (tone === "warning") {
    return (
      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(213,155,54,0.24)] bg-[rgba(213,155,54,0.12)] text-[rgba(248,233,198,0.96)]">
        <Activity className="h-4 w-4" />
      </div>
    );
  }

  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(62,167,123,0.24)] bg-[rgba(62,167,123,0.12)] text-[rgba(222,245,234,0.94)]">
      <CheckCircle2 className="h-4 w-4" />
    </div>
  );
}

function CompactActionButton({
  label,
  icon: Icon,
  onClick,
  disabled,
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button variant="outline" className="min-h-11 justify-between rounded-[18px] px-4" onClick={onClick} disabled={disabled}>
      <span>{label}</span>
      <Icon className="h-4 w-4" />
    </Button>
  );
}

function SettingsControlRow({ row, featured = false }: { row: SettingsRow; featured?: boolean }) {
  return (
    <div className={cn("px-[18px] py-4", featured ? "bg-[rgba(163,33,57,0.04)]" : "")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)]">{row.title}</p>
          <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{row.description}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <SettingsStatusChip tone={row.tone || "neutral"}>{row.primaryChip}</SettingsStatusChip>
          <SettingsStatusChip tone="neutral">{row.secondaryChip}</SettingsStatusChip>
        </div>
      </div>
    </div>
  );
}

function SettingsSectionBlock({
  label,
  title,
  description,
  rows,
}: {
  label: string;
  title: string;
  description: string;
  rows: SettingsRow[];
}) {
  return (
    <section className="rounded-[24px] border border-[var(--border-subtle)] bg-[linear-gradient(180deg,rgba(17,21,28,0.98),rgba(10,13,18,1))] shadow-[0_18px_44px_rgba(0,0,0,0.18)]">
      <div className="border-b border-[var(--border-subtle)] px-[18px] py-4">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-faint)]">{label}</p>
        <p className="mt-2 text-base font-semibold text-[var(--text-primary)]">{title}</p>
        <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
      </div>
      <div className="divide-y divide-[var(--border-subtle)]">
        {rows.map((row) => (
          <SettingsControlRow key={`${label}-${row.title}`} row={row} />
        ))}
      </div>
    </section>
  );
}

function SettingsIntensifyBlock({ rows }: { rows: SettingsRow[] }) {
  return (
    <section className="rounded-[24px] border border-[rgba(163,33,57,0.22)] bg-[linear-gradient(180deg,rgba(26,16,21,0.98),rgba(14,11,15,1))] shadow-[0_24px_52px_rgba(58,12,23,0.22)]">
      <div className="border-b border-[rgba(163,33,57,0.16)] px-[18px] py-4">
        <SettingsStatusChip tone="brand">Intensify</SettingsStatusChip>
        <p className="mt-3 text-base font-semibold text-[var(--text-primary)]">Push this system past default bot behavior</p>
        <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
          This is where normal server configuration becomes high-control, precision-tuned Archivist behavior.
        </p>
      </div>
      <div className="divide-y divide-[rgba(163,33,57,0.14)]">
        {rows.map((row) => (
          <SettingsControlRow key={`intensify-${row.title}`} row={row} featured />
        ))}
      </div>
    </section>
  );
}

function SettingsDiagnosticsBlock({ diagnostics }: { diagnostics: SettingsDiagnostic[] }) {
  return (
    <section className="rounded-[24px] border border-[var(--border-subtle)] bg-[linear-gradient(180deg,rgba(17,21,28,0.98),rgba(10,13,18,1))] shadow-[0_18px_44px_rgba(0,0,0,0.18)]">
      <div className="border-b border-[var(--border-subtle)] px-[18px] py-4">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-faint)]">Diagnostics</p>
        <p className="mt-2 text-base font-semibold text-[var(--text-primary)]">Conflicts, warnings, and system recommendations</p>
        <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
          Keep the operational story legible so the settings layer feels trustworthy under pressure.
        </p>
      </div>
      <div className="space-y-3 px-[18px] py-4">
        {diagnostics.map((diagnostic) => (
          <div
            key={diagnostic.title}
            className="rounded-[20px] border border-[var(--border-subtle)] bg-[linear-gradient(180deg,rgba(20,24,31,0.94),rgba(12,15,20,0.98))] px-4 py-4"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                <DiagnosticIcon tone={diagnostic.tone} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{diagnostic.title}</p>
                <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{diagnostic.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SettingsQuickActionsBlock({
  actions,
  onNavigate,
}: {
  actions: SettingsQuickAction[];
  onNavigate: (path: string) => void;
}) {
  return (
    <section className="rounded-[24px] border border-[var(--border-subtle)] bg-[linear-gradient(180deg,rgba(17,21,28,0.98),rgba(10,13,18,1))] shadow-[0_18px_44px_rgba(0,0,0,0.18)]">
      <div className="border-b border-[var(--border-subtle)] px-[18px] py-4">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-faint)]">Presets / Quick Actions</p>
        <p className="mt-2 text-base font-semibold text-[var(--text-primary)]">Fast moves and companion routes</p>
        <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
          Keep the strongest next actions close without dumping the whole product structure onto one screen.
        </p>
      </div>
      <div className="space-y-3 px-[18px] py-4">
        {actions.map((action) => (
          <button
            key={action.title}
            type="button"
            onClick={() => onNavigate(action.href)}
            className="group flex w-full items-center gap-4 rounded-[20px] border border-[var(--border-subtle)] bg-[linear-gradient(180deg,rgba(20,24,31,0.94),rgba(12,15,20,0.98))] px-4 py-4 text-left transition hover:border-[var(--border-strong)] hover:bg-[linear-gradient(180deg,rgba(24,29,38,0.98),rgba(13,16,21,1))]"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] border border-[var(--border-subtle)] bg-[rgba(155,180,201,0.08)] text-[var(--text-secondary)]">
              <action.icon className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[var(--text-primary)]">{action.title}</p>
              <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{action.description}</p>
            </div>
            <ChevronRight className="h-4.5 w-4.5 shrink-0 text-[var(--text-faint)] transition group-hover:text-[var(--text-primary)]" />
          </button>
        ))}
      </div>
    </section>
  );
}

function SettingsCategoryCard({
  icon: Icon,
  title,
  description,
  status,
  meta,
  onOpen,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  status: { label: string; tone: SettingsTone };
  meta: { label: string; tone: SettingsTone };
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full items-center gap-4 rounded-[24px] border border-[var(--border-subtle)] bg-[linear-gradient(180deg,rgba(20,24,31,0.97),rgba(11,14,19,1))] px-[18px] py-[18px] text-left shadow-[0_18px_38px_rgba(0,0,0,0.18)] transition hover:border-[var(--border-strong)] hover:bg-[linear-gradient(180deg,rgba(24,29,38,0.98),rgba(13,16,21,1))]"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(155,180,201,0.08)] text-[var(--text-secondary)]">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-base font-semibold text-[var(--text-primary)]">{title}</p>
        <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <SettingsStatusChip tone={status.tone}>{status.label}</SettingsStatusChip>
          <SettingsStatusChip tone={meta.tone}>{meta.label}</SettingsStatusChip>
        </div>
      </div>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[rgba(155,180,201,0.04)] text-[var(--text-faint)] transition group-hover:border-[var(--border-strong)] group-hover:text-[var(--text-primary)]">
        <ChevronRight className="h-4.5 w-4.5" />
      </div>
    </button>
  );
}

function SettingsSectionHero({
  icon: Icon,
  eyebrow,
  title,
  description,
  status,
  metaLabel,
  metaValue,
  primaryActionLabel,
  onPrimaryAction,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  status: { label: string; tone: SettingsTone };
  metaLabel: string;
  metaValue: string;
  primaryActionLabel: string;
  onPrimaryAction: () => void;
}) {
  return (
    <section className="rounded-[26px] border border-[var(--border-strong)] bg-[radial-gradient(circle_at_top_left,rgba(214,227,238,0.12),transparent_30%),linear-gradient(180deg,rgba(19,23,30,0.98),rgba(9,12,17,1))] p-4 shadow-[0_30px_64px_rgba(0,0,0,0.32)]">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border border-[var(--border-strong)] bg-[linear-gradient(180deg,rgba(155,180,201,0.18),rgba(13,16,21,1))] text-[var(--text-primary)] shadow-[0_16px_36px_rgba(0,0,0,0.22)]">
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-faint)]">{eyebrow}</p>
          <h2 className="mt-2 text-[1.55rem] font-semibold tracking-[-0.03em] text-[var(--text-primary)]">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <SettingsStatusChip tone={status.tone}>{status.label}</SettingsStatusChip>
        <SettingsStatusChip tone="neutral">
          {metaLabel}: {metaValue}
        </SettingsStatusChip>
      </div>
      <Button className="mt-4 min-h-11 w-full justify-between rounded-[18px] px-4" onClick={onPrimaryAction}>
        <span>{primaryActionLabel}</span>
        <ArrowUpRight className="h-4 w-4" />
      </Button>
    </section>
  );
}

function SettingsServerStatusCard({
  server,
  botReady,
  syncLabel,
  warningCount,
  ownerAccess,
  onDiagnostics,
  onSync,
  onBackup,
  onSiteEditor,
}: {
  server: any;
  botReady: boolean;
  syncLabel: string;
  warningCount: number;
  ownerAccess: boolean;
  onDiagnostics: () => void;
  onSync: () => void;
  onBackup: () => void;
  onSiteEditor: () => void;
}) {
  return (
    <section className="rounded-[26px] border border-[var(--border-strong)] bg-[radial-gradient(circle_at_top_left,rgba(214,227,238,0.12),transparent_34%),linear-gradient(180deg,rgba(21,25,32,0.98),rgba(10,13,18,1))] p-4 shadow-[0_28px_60px_rgba(0,0,0,0.34)]">
      <div className="flex items-start gap-4">
        {server.iconUrl ? (
          <img src={server.iconUrl} alt={server.name} className="h-16 w-16 rounded-[20px] border border-[var(--border-strong)] object-cover shadow-[0_18px_36px_rgba(0,0,0,0.24)]" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-[20px] border border-[var(--border-strong)] bg-[linear-gradient(180deg,rgba(155,180,201,0.22),rgba(16,19,25,1))] text-base font-semibold text-[var(--text-primary)]">
            {getServerInitials(server.name)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-faint)]">Settings Control Hub</p>
          <h1 className="mt-2 truncate text-[1.55rem] font-semibold tracking-[-0.03em] text-[var(--text-primary)]">{server.name}</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            One strict control surface for bot engine, channel routing, role power, command logic, member flow, signals, and recovery.
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <SettingsStatusChip tone={botReady ? "healthy" : "danger"}>{botReady ? "Bot live" : "Bot offline"}</SettingsStatusChip>
        <SettingsStatusChip tone={syncLabel === "Synced" ? "healthy" : "warning"}>{syncLabel}</SettingsStatusChip>
        <SettingsStatusChip tone={warningCount ? "warning" : "healthy"}>
          {warningCount ? `${warningCount} warnings` : "No warnings"}
        </SettingsStatusChip>
        <SettingsStatusChip tone={ownerAccess ? "brand" : "neutral"}>{ownerAccess ? "Admin access" : "Operator access"}</SettingsStatusChip>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <CompactActionButton label="Diagnostics" icon={Radar} onClick={onDiagnostics} />
        <CompactActionButton label="Sync" icon={Workflow} onClick={onSync} />
        <CompactActionButton label="Backup" icon={CopyPlus} onClick={onBackup} />
        <CompactActionButton label="Site Editor" icon={ExternalLink} onClick={onSiteEditor} disabled={!ownerAccess} />
      </div>
    </section>
  );
}

function buildPageModel({
  slug,
  serverId,
  channels,
  roles,
  commands,
  logs,
  permissionRules,
  channelSettings,
  likelyStaffChannels,
  likelyVerifyChannels,
  likelyAnnouncementChannels,
  likelyVerifyRoles,
  likelyStaffRoles,
  likelyRewardRoles,
  botReady,
  recentFailures,
  serverMemberCount,
}: {
  slug: string;
  serverId: number;
  channels: any[];
  roles: any[];
  commands: any[];
  logs: any;
  permissionRules: any[];
  channelSettings: any[];
  likelyStaffChannels: any[];
  likelyVerifyChannels: any[];
  likelyAnnouncementChannels: any[];
  likelyVerifyRoles: any[];
  likelyStaffRoles: any[];
  likelyRewardRoles: any[];
  botReady: boolean;
  recentFailures: number;
  serverMemberCount: number;
}): SettingsPageModel {
  const commandCount = commands.length;
  const routeCount = channelSettings.length + likelyStaffChannels.length + likelyAnnouncementChannels.length;
  const roleRuleCount = permissionRules.length || likelyStaffRoles.length + likelyRewardRoles.length;
  const onboardingRouteCount = likelyVerifyChannels.length + likelyVerifyRoles.length + Number(commandCount > 0);
  const signalRouteCount = likelyStaffChannels.length + Number((logs?.activity?.length || 0) > 0) + Number(recentFailures > 0);
  const recoveryAnchors = Number(commandCount > 0) + Number(channels.length > 0) + Number(roles.length > 0) + Number(permissionRules.length > 0);

  if (slug === "channel-control") {
    const tone: SettingsTone = !likelyStaffChannels.length || !likelyAnnouncementChannels.length ? "warning" : "healthy";
    return {
      heroMetricLabel: "Linked routes",
      heroMetricValue: `${formatNumber(routeCount)} configured`,
      primaryActionLabel: "Inspect Signals",
      primaryActionHref: buildArchivistItemPath(serverId, "settings", "signals-logging"),
      status: { label: toneLabel(tone), tone },
      meta: { label: `${formatNumber(routeCount)} linked routes`, tone: "neutral" },
      core: [
        { title: "Staff destinations", description: likelyStaffChannels.length ? "Operational routes are visible for diagnostics and alerting." : "No obvious staff or log destinations are visible yet.", primaryChip: likelyStaffChannels.length ? "Mapped" : "Needs route", secondaryChip: `${formatNumber(likelyStaffChannels.length)} ops lanes`, tone },
        { title: "Welcome and verify surfaces", description: likelyVerifyChannels.length ? "Onboarding channels are visible enough to route member flow correctly." : "Verification and welcome lanes still need clearer destinations.", primaryChip: likelyVerifyChannels.length ? "Visible" : "Missing", secondaryChip: `${formatNumber(likelyVerifyChannels.length)} intake lanes`, tone: likelyVerifyChannels.length ? "healthy" : "warning" },
        { title: "Managed channel overrides", description: channelSettings.length ? "Archivist already has saved per-channel behavior overrides." : "No managed overrides are staged yet.", primaryChip: channelSettings.length ? "Managed" : "Unstaged", secondaryChip: `${formatNumber(channelSettings.length)} overrides`, tone: channelSettings.length ? "healthy" : "neutral" },
      ],
      advanced: [
        { title: "Posting defaults", description: "Shape embeds, output rhythm, and interaction posture per destination instead of relying on one global default.", primaryChip: "Output tuned", secondaryChip: `${formatNumber(channels.length)} surfaces` },
        { title: "Per-channel restrictions", description: "Let destinations vary by permissions and purpose without becoming messy.", primaryChip: "Scoped", secondaryChip: `${formatNumber(permissionRules.length)} support rules` },
        { title: "Interaction permissions", description: "Keep channel behavior aligned with moderation posture and Discord capability.", primaryChip: "Controlled", secondaryChip: `${formatNumber(roles.length)} role inputs` },
      ],
      intensify: [
        { title: "Purpose profiles", description: "Promote channels into intake, support, announcement, or quiet staff profiles.", primaryChip: "Profiled", secondaryChip: `${formatNumber(likelyAnnouncementChannels.length)} public lanes`, tone: "brand" },
        { title: "Conditional posting behavior", description: "Use fallback routes and quieter backups when the ideal channel is missing or too noisy.", primaryChip: "Fallback ready", secondaryChip: `${formatNumber(routeCount)} route inputs`, tone: "brand" },
        { title: "Per-channel module tuning", description: "Push module behavior into channel-aware control instead of one server-wide assumption.", primaryChip: "Localized", secondaryChip: `${formatNumber(channelSettings.length)} tuned lanes`, tone: "brand" },
      ],
      diagnostics: [
        { title: likelyStaffChannels.length ? "Operations routes detected" : "Operations routes are thin", description: likelyStaffChannels.length ? "Staff and operational channels are visible enough to support diagnostics." : "Map at least one clear ops or log destination so diagnostics feel trustworthy.", tone: likelyStaffChannels.length ? "healthy" : "warning" },
        { title: channelSettings.length ? "Managed overrides exist" : "No managed overrides saved", description: channelSettings.length ? "Archivist already has channel-specific behavior to work from." : "Channel behavior still depends too much on implicit defaults.", tone: channelSettings.length ? "healthy" : "neutral" },
      ],
      quickActions: [
        { title: "Open Member Flow", description: "Tie onboarding and verification to the channels members actually see first.", href: buildArchivistItemPath(serverId, "settings", "member-flow"), icon: UserRoundPlus },
        { title: "Open Studio", description: "Build the visible message surfaces that these routes eventually publish into.", href: buildArchivistItemPath(serverId, "studio", "overview"), icon: MessageSquareText },
      ],
    };
  }

  if (slug === "role-power") {
    const tone: SettingsTone = !likelyStaffRoles.length || permissionRules.length === 0 ? "warning" : "healthy";
    return {
      heroMetricLabel: "Role rules",
      heroMetricValue: `${formatNumber(roleRuleCount)} tracked`,
      primaryActionLabel: "Open Command Logic",
      primaryActionHref: buildArchivistItemPath(serverId, "settings", "command-logic"),
      status: { label: toneLabel(tone), tone },
      meta: { label: `${formatNumber(roleRuleCount)} role rules`, tone: "neutral" },
      core: [
        { title: "Staff authority roles", description: likelyStaffRoles.length ? "Staff and moderator roles are visible enough to support guarded control." : "No clear staff authority roles are visible yet.", primaryChip: likelyStaffRoles.length ? "Mapped" : "Unmapped", secondaryChip: `${formatNumber(likelyStaffRoles.length)} authority roles`, tone },
        { title: "Verification and trust roles", description: likelyVerifyRoles.length ? "Member flow can attach state changes to visible trust roles." : "Verification or trusted-member roles are not obvious yet.", primaryChip: likelyVerifyRoles.length ? "Ready" : "Needs roles", secondaryChip: `${formatNumber(likelyVerifyRoles.length)} trust roles`, tone: likelyVerifyRoles.length ? "healthy" : "warning" },
        { title: "Permission graph", description: permissionRules.length ? "Archivist has explicit rules to shape role-based access behavior." : "No explicit permission rules are stored yet.", primaryChip: permissionRules.length ? "Stored" : "Empty", secondaryChip: `${formatNumber(permissionRules.length)} policy rules`, tone: permissionRules.length ? "healthy" : "neutral" },
      ],
      advanced: [
        { title: "Grouped access behavior", description: "Treat role bundles and grouped access as one system instead of stacking one-off rows forever.", primaryChip: "Bundled", secondaryChip: `${formatNumber(roles.length)} visible roles` },
        { title: "Hierarchy tools", description: "Preserve privilege direction, moderation order, and role-driven module access more cleanly.", primaryChip: "Ordered", secondaryChip: `${formatNumber(likelyRewardRoles.length)} progression roles` },
        { title: "Role-based module access", description: "Use roles to shape which users can reach commands and sensitive bot surfaces.", primaryChip: "Scoped access", secondaryChip: `${formatNumber(commandCount)} command inputs` },
      ],
      intensify: [
        { title: "Role-driven automation", description: "Push roles beyond assignment and into behavior triggers, progression, and protected access.", primaryChip: "Automated", secondaryChip: `${formatNumber(roleRuleCount)} logic hooks`, tone: "brand" },
        { title: "Protected roles and cleanup", description: "Catch role conflicts and privilege drift before they become destructive.", primaryChip: "Protected", secondaryChip: `${formatNumber(permissionRules.length)} cleanup supports`, tone: "brand" },
        { title: "Conditional gates", description: "Shape access around eligibility, expiration, and layered reveal paths.", primaryChip: "Gated", secondaryChip: `${formatNumber(likelyVerifyRoles.length)} trust anchors`, tone: "brand" },
      ],
      diagnostics: [
        { title: likelyStaffRoles.length ? "Staff role map exists" : "Staff authority needs structure", description: likelyStaffRoles.length ? "Archivist can already infer a staff authority layer from visible roles." : "Add or standardize moderator and admin roles so control rules do not feel ambiguous.", tone: likelyStaffRoles.length ? "healthy" : "warning" },
        { title: permissionRules.length ? "Policy rules are present" : "Permission rule layer is thin", description: permissionRules.length ? "Role-based access has explicit rule support in Archivist." : "Without stored rules, role power still depends too much on implicit Discord behavior.", tone: permissionRules.length ? "healthy" : "neutral" },
      ],
      quickActions: [
        { title: "Open Member Flow", description: "Use role gates and trust progression inside onboarding instead of handling them separately.", href: buildArchivistItemPath(serverId, "settings", "member-flow"), icon: UserRoundPlus },
        { title: "Open Bot Engine", description: "Refine how role power influences module visibility and fallback behavior.", href: buildArchivistItemPath(serverId, "settings", "bot-engine"), icon: Bot },
      ],
    };
  }

  if (slug === "command-logic") {
    const tone: SettingsTone = commandCount === 0 ? "warning" : recentFailures > 0 ? "warning" : "healthy";
    return {
      heroMetricLabel: "Tracked commands",
      heroMetricValue: `${formatNumber(commandCount)} loaded`,
      primaryActionLabel: "Open Commands",
      primaryActionHref: buildArchivistItemPath(serverId, "commands", "overview"),
      status: { label: toneLabel(tone), tone },
      meta: { label: `${formatNumber(commandCount)} tracked commands`, tone: "neutral" },
      core: [
        { title: "Enablement and visibility", description: commandCount ? "Archivist already has command surfaces to tune instead of starting blank." : "No tracked commands are available yet for deeper logic work.", primaryChip: commandCount ? "Live graph" : "Empty graph", secondaryChip: `${formatNumber(commandCount)} commands`, tone },
        { title: "Access rules", description: permissionRules.length ? "Stored permission rules can drive access posture and operator-only behavior." : "Access rules still need explicit power instead of implicit assumptions.", primaryChip: permissionRules.length ? "Controlled" : "Thin rules", secondaryChip: `${formatNumber(permissionRules.length)} access rules`, tone: permissionRules.length ? "healthy" : "warning" },
        { title: "Cooldown and protection posture", description: "Cooldowns, visibility, and rate limits should live together so command abuse never feels like an afterthought.", primaryChip: "Guarded", secondaryChip: `${formatNumber(recentFailures)} recent failures` },
      ],
      advanced: [
        { title: "Context restrictions", description: "Tie command availability to channel, role, and member state instead of letting everything run everywhere.", primaryChip: "Context aware", secondaryChip: `${formatNumber(channels.length)} channel inputs` },
        { title: "Grouped logic", description: "Treat related commands as one system with shared defaults and behavior stacking.", primaryChip: "Grouped", secondaryChip: `${formatNumber(logs?.activity?.length || 0)} recent executions` },
        { title: "Custom responses and rate overrides", description: "Keep command voice and pressure aligned with the rest of the server control model.", primaryChip: "Override ready", secondaryChip: `${formatNumber(roleRuleCount)} role inputs` },
      ],
      intensify: [
        { title: "Execution conditions", description: "Push command behavior into staged conditions, fallback paths, and silent or loud execution modes.", primaryChip: "Conditional", secondaryChip: `${formatNumber(permissionRules.length)} decision points`, tone: "brand" },
        { title: "Failure recovery", description: "Treat failures as recoverable logic paths with softer fallbacks, not dead-end error moments.", primaryChip: recentFailures ? "Recovery needed" : "Recovery ready", secondaryChip: `${formatNumber(recentFailures)} failure signals`, tone: recentFailures ? "warning" : "brand" },
        { title: "Staged replies and routing", description: "Coordinate replies, followups, and command logging as one execution flow instead of one-off outputs.", primaryChip: "Staged", secondaryChip: `${formatNumber(signalRouteCount)} signal routes`, tone: "brand" },
      ],
      diagnostics: [
        { title: commandCount ? "Command graph is populated" : "Command graph is empty", description: commandCount ? "The server has a real logic surface to refine." : "Start by building or importing commands so logic controls have something meaningful to shape.", tone: commandCount ? "healthy" : "warning" },
        { title: recentFailures ? "Recent execution failures exist" : "Recent executions are stable", description: recentFailures ? "Use failures and logging together to tighten fallback behavior and access rules." : "The recent command lane is not surfacing obvious execution instability right now.", tone: recentFailures ? "warning" : "healthy" },
      ],
      quickActions: [
        { title: "Open Bot Engine", description: "Tune command behavior as part of overall bot response posture.", href: buildArchivistItemPath(serverId, "settings", "bot-engine"), icon: Bot },
        { title: "Inspect Signals", description: "Use logging depth and alerts to verify what command logic is actually doing live.", href: buildArchivistItemPath(serverId, "settings", "signals-logging"), icon: Siren },
      ],
    };
  }

  if (slug === "member-flow") {
    const tone: SettingsTone = !likelyVerifyChannels.length || !likelyVerifyRoles.length ? "warning" : "healthy";
    return {
      heroMetricLabel: "Onboarding routes",
      heroMetricValue: `${formatNumber(onboardingRouteCount)} visible`,
      primaryActionLabel: "Open Studio Welcome",
      primaryActionHref: buildArchivistItemPath(serverId, "studio", "welcome"),
      status: { label: toneLabel(tone), tone },
      meta: { label: `${formatNumber(onboardingRouteCount)} onboarding routes`, tone: "neutral" },
      core: [
        { title: "Welcome and verification surfaces", description: likelyVerifyChannels.length ? "Archivist can already see the channels most likely to drive onboarding and verification." : "Onboarding and verification lanes still need clearer destinations.", primaryChip: likelyVerifyChannels.length ? "Visible" : "Missing", secondaryChip: `${formatNumber(likelyVerifyChannels.length)} intake lanes`, tone },
        { title: "Trust roles", description: likelyVerifyRoles.length ? "Member flow can attach state changes to visible trust and member roles." : "Trust progression roles are not obvious yet.", primaryChip: likelyVerifyRoles.length ? "Mapped" : "Needs roles", secondaryChip: `${formatNumber(likelyVerifyRoles.length)} trust roles`, tone },
        { title: "Default join posture", description: "Keep join behavior, role assignment, and verification routing aligned so first impressions feel controlled.", primaryChip: "Staged", secondaryChip: `${formatNumber(serverMemberCount)} members` },
      ],
      advanced: [
        { title: "Staged verification", description: "Shape verification like a sequence instead of one all-or-nothing gate.", primaryChip: "Sequenced", secondaryChip: `${formatNumber(likelyVerifyChannels.length + likelyVerifyRoles.length)} gate inputs` },
        { title: "Fallback paths", description: "Preserve safe member routing when verification or onboarding surfaces are missing.", primaryChip: "Fallback ready", secondaryChip: `${formatNumber(Number(!likelyVerifyChannels.length) + Number(!likelyVerifyRoles.length))} journey risks` },
        { title: "Routing by outcome", description: "Let outcomes redirect members and staff to the right next lane automatically.", primaryChip: "Outcome driven", secondaryChip: `${formatNumber(likelyAnnouncementChannels.length)} public routes` },
      ],
      intensify: [
        { title: "Trust progression", description: "Move from a single verify switch into escalating access and staff-aware trust states.", primaryChip: "Progressive", secondaryChip: `${formatNumber(likelyVerifyRoles.length)} trust anchors`, tone: "brand" },
        { title: "Suspicious join handling", description: "Quietly branch risky members into safer flow paths without making the whole join experience hostile.", primaryChip: "Guarded", secondaryChip: `${formatNumber(likelyStaffChannels.length)} staff routes`, tone: "brand" },
        { title: "Re-entry and retry flow", description: "Handle failed onboarding and return visits with explicit retry logic instead of ad hoc fixes.", primaryChip: "Retry ready", secondaryChip: `${formatNumber(onboardingRouteCount)} journey anchors`, tone: "brand" },
      ],
      diagnostics: [
        { title: likelyVerifyChannels.length ? "Onboarding lanes are visible" : "Onboarding lanes need clearer routing", description: likelyVerifyChannels.length ? "Archivist can already anchor member flow to visible intake surfaces." : "Add or map welcome and verification surfaces so Member Flow has a stable first step.", tone: likelyVerifyChannels.length ? "healthy" : "warning" },
        { title: likelyVerifyRoles.length ? "Trust roles are available" : "Trust roles need definition", description: likelyVerifyRoles.length ? "Role Power can already reinforce onboarding and member-state changes." : "Member Flow will stay shallow until trust and verification roles are explicitly visible.", tone: likelyVerifyRoles.length ? "healthy" : "warning" },
      ],
      quickActions: [
        { title: "Open Role Power", description: "Tie onboarding and trust progression to protected roles and access gates.", href: buildArchivistItemPath(serverId, "settings", "role-power"), icon: Users },
        { title: "Open Channel Control", description: "Route onboarding outcomes to the right public, quiet, or staff-only destinations.", href: buildArchivistItemPath(serverId, "settings", "channel-control"), icon: Hash },
      ],
    };
  }

  if (slug === "signals-logging") {
    const tone: SettingsTone = !likelyStaffChannels.length ? "warning" : recentFailures > 0 ? "warning" : "healthy";
    return {
      heroMetricLabel: "Signal routes",
      heroMetricValue: `${formatNumber(signalRouteCount)} visible`,
      primaryActionLabel: "Review Engine Health",
      primaryActionHref: buildArchivistItemPath(serverId, "settings", "bot-engine"),
      status: { label: toneLabel(tone), tone },
      meta: { label: `${formatNumber(signalRouteCount)} signal routes`, tone: "neutral" },
      core: [
        { title: "Event families", description: "Keep operational noise grouped into understandable families so the dashboard feels controllable under pressure.", primaryChip: "Grouped", secondaryChip: `${formatNumber(logs?.activity?.length || 0)} recent signals`, tone: logs?.activity?.length ? "healthy" : "neutral" },
        { title: "Alert destinations", description: likelyStaffChannels.length ? "Staff and log channels are visible enough to anchor warnings and notable events." : "Archivist cannot see a strong operational alert route yet.", primaryChip: likelyStaffChannels.length ? "Routed" : "Needs route", secondaryChip: `${formatNumber(likelyStaffChannels.length)} ops channels`, tone },
        { title: "Failure visibility", description: recentFailures ? "Failures are surfacing and can be treated as actionable operational signals." : "The dashboard is not currently surfacing obvious failure pressure.", primaryChip: recentFailures ? "Live warnings" : "Quiet lane", secondaryChip: `${formatNumber(recentFailures)} recent failures`, tone: recentFailures ? "warning" : "healthy" },
      ],
      advanced: [
        { title: "Severity filtering", description: "Separate loud incidents from quiet telemetry so staff does not burn out on useless noise.", primaryChip: "Filtered", secondaryChip: `${formatNumber(signalRouteCount)} route options` },
        { title: "Grouped routing", description: "Drive grouped alerts and event families through intentional destinations instead of one dump channel.", primaryChip: "Clustered", secondaryChip: `${formatNumber(likelyAnnouncementChannels.length)} public routes` },
        { title: "Silent vs loud posture", description: "Control which events whisper, which events escalate, and which events stay forensic-only.", primaryChip: "Escalation ready", secondaryChip: `${formatNumber(recentFailures)} trigger inputs` },
      ],
      intensify: [
        { title: "Forensic mode", description: "Move from basic logs into event snapshots, grouped anomalies, and more meaningful operational memory.", primaryChip: "Forensic ready", secondaryChip: `${formatNumber(logs?.failures?.length || 0)} failure traces`, tone: "brand" },
        { title: "Anomaly detection", description: "Treat suspicious behavior clusters and silent failures as patterns, not isolated one-off events.", primaryChip: recentFailures ? "Signal pressure" : "Low anomaly load", secondaryChip: `${formatNumber(recentFailures)} anomaly hints`, tone: recentFailures ? "warning" : "brand" },
        { title: "Escalation behavior", description: "Promote serious issues across the right staff surfaces without flooding the workspace.", primaryChip: "Escalation tuned", secondaryChip: `${formatNumber(likelyStaffChannels.length)} escalation lanes`, tone: "brand" },
      ],
      diagnostics: [
        { title: logs?.activity?.length ? "Recent activity is visible" : "Recent activity lane is quiet", description: logs?.activity?.length ? "Signals are reaching the dashboard and can support diagnostics right now." : "A quiet signal lane may mean the system is calm or routing still needs clearer destinations.", tone: logs?.activity?.length ? "healthy" : "neutral" },
        { title: likelyStaffChannels.length ? "Operational channels are available" : "Operational channels are weak", description: likelyStaffChannels.length ? "Staff logging and alert routes are visible enough to support mission-control feedback." : "Map more obvious ops channels before deep diagnostics can feel trustworthy.", tone: likelyStaffChannels.length ? "healthy" : "warning" },
      ],
      quickActions: [
        { title: "Open Channel Control", description: "Tighten the actual routes that alerts and logs can publish into.", href: buildArchivistItemPath(serverId, "settings", "channel-control"), icon: Hash },
        { title: "Open Safety & Recovery", description: "Treat important signals as input to backups, rollback posture, and safer admin actions.", href: buildArchivistItemPath(serverId, "settings", "safety-recovery"), icon: LifeBuoy },
      ],
    };
  }

  if (slug === "safety-recovery") {
    const tone: SettingsTone = recoveryAnchors < 3 ? "warning" : "healthy";
    return {
      heroMetricLabel: "Recovery anchors",
      heroMetricValue: `${formatNumber(recoveryAnchors)} visible`,
      primaryActionLabel: "Open Import Tools",
      primaryActionHref: buildArchivistItemPath(serverId, "commands", "import-export"),
      status: { label: toneLabel(tone), tone },
      meta: { label: `${formatNumber(recoveryAnchors)} recovery anchors`, tone: "neutral" },
      core: [
        { title: "Backup readiness", description: recoveryAnchors ? "Archivist has enough live context to support real backup and restore planning." : "The server does not yet expose enough live shape for meaningful recovery posture.", primaryChip: recoveryAnchors ? "Ready" : "Thin context", secondaryChip: `${formatNumber(recoveryAnchors)} anchors`, tone },
        { title: "Restore posture", description: "Treat restore work as a deliberate path with checks, not a panic button hidden at the end of Settings.", primaryChip: "Guarded", secondaryChip: `${formatNumber(commands.length)} command assets` },
        { title: "Admin safety prompts", description: "High-impact changes should always feel protected, reviewable, and recoverable.", primaryChip: "Protected", secondaryChip: `${formatNumber(permissionRules.length)} policy supports` },
      ],
      advanced: [
        { title: "Restore points and naming", description: "Give backups a clear identity and keep restore posture legible during complex changes.", primaryChip: "Named snapshots", secondaryChip: `${formatNumber(channels.length)} structure inputs` },
        { title: "Rollback checks", description: "Pre-flight destructive changes before they hit the live server surface.", primaryChip: "Preflight ready", secondaryChip: `${formatNumber(recentFailures)} recent risk hints` },
        { title: "Change guardrails", description: "Keep recovery recommendations and admin audit behavior close to every dangerous operation.", primaryChip: "Guardrails", secondaryChip: `${formatNumber(permissionRules.length)} access supports` },
      ],
      intensify: [
        { title: "Auto snapshots before dangerous edits", description: "Promote recovery from a manual task into part of the default editing posture.", primaryChip: "Auto-protect", secondaryChip: `${formatNumber(recoveryAnchors)} protected anchors`, tone: "brand" },
        { title: "Diff and partial restore", description: "Make rollback feel precise and calm instead of all-or-nothing.", primaryChip: "Precision restore", secondaryChip: `${formatNumber(commands.length + channelSettings.length)} change surfaces`, tone: "brand" },
        { title: "Critical system locking", description: "Protect the most sensitive server surfaces with stronger review and admin-action visibility.", primaryChip: "Locked", secondaryChip: `${formatNumber(permissionRules.length)} guardrail rules`, tone: "brand" },
      ],
      diagnostics: [
        { title: recoveryAnchors ? "Recovery anchors are present" : "Recovery posture is shallow", description: recoveryAnchors ? "Archivist can already infer enough command, channel, role, and policy context to support guarded recovery work." : "Add more live configuration depth before Safety & Recovery can feel truly trustworthy.", tone: recoveryAnchors ? "healthy" : "warning" },
        { title: permissionRules.length ? "Admin rule support exists" : "Admin guardrails are thin", description: permissionRules.length ? "Policy rules can already reinforce destructive-action safety." : "Without explicit rules, recovery work still leans too much on assumptions.", tone: permissionRules.length ? "healthy" : "neutral" },
      ],
      quickActions: [
        { title: "Open Import / Export", description: "Use command migration and import tooling as part of a safer recovery workflow.", href: buildArchivistItemPath(serverId, "commands", "import-export"), icon: CopyPlus },
        { title: "Review Signals", description: "Use warnings and event history to decide when restore posture should intensify.", href: buildArchivistItemPath(serverId, "settings", "signals-logging"), icon: Radar },
      ],
    };
  }

  const tone: SettingsTone = !botReady || recentFailures > 0 ? "warning" : "healthy";
  return {
    heroMetricLabel: "Active systems",
    heroMetricValue: `${formatNumber(5 - Math.min(Number(!botReady) + Number(recentFailures > 0), 4))}/5 stable`,
    primaryActionLabel: "Run Engine Check",
    primaryActionHref: buildArchivistItemPath(serverId, "settings", "signals-logging"),
    status: { label: toneLabel(tone), tone },
    meta: { label: `${formatNumber(commands.length || 1)} active systems`, tone: "neutral" },
    core: [
      { title: "Bot live state", description: botReady ? "Archivist is connected and responding inside the server." : "The runtime needs attention before deeper tuning matters.", primaryChip: botReady ? "Connected" : "Offline", secondaryChip: recentFailures ? `${formatNumber(recentFailures)} failures` : "Runtime stable", tone },
      { title: "Command sync posture", description: commands.length ? "Commands are present and the server has a usable interaction layer." : "No tracked commands are available yet for this server.", primaryChip: commands.length ? "Synced surface" : "Needs sync", secondaryChip: `${formatNumber(commands.length)} commands`, tone: commands.length ? "healthy" : "warning" },
      { title: "Server link state", description: `Archivist can read ${formatNumber(channels.length)} channels and ${formatNumber(roles.length)} roles for this server.`, primaryChip: "Linked", secondaryChip: `${formatNumber(channels.length)} lanes`, tone: "healthy" },
    ],
    advanced: [
      { title: "Response posture", description: "Treat replies, cooldown defaults, and fallback voice as one coordinated behavior layer.", primaryChip: "Scoped defaults", secondaryChip: `${formatNumber(permissionRules.length)} rule inputs` },
      { title: "Routing priorities", description: "Keep module visibility, response routing, and overlap handling in one predictable order.", primaryChip: "Priority stack", secondaryChip: `${formatNumber(channelSettings.length)} override inputs` },
      { title: "Feature visibility", description: "Server-facing module exposure should feel deliberate, not like every feature is equally loud.", primaryChip: "Per-server", secondaryChip: `${formatNumber(logs?.activity?.length || 0)} recent runs` },
    ],
    intensify: [
      { title: "Context-aware response style", description: "Push responses from static defaults into channel, member, and workflow-aware behavior.", primaryChip: "Adaptive", secondaryChip: "Interaction tuned", tone: "brand" },
      { title: "Conflict auto-detection", description: "Surface overlap between command logic, permission rules, and runtime posture before it causes noisy failures.", primaryChip: recentFailures ? "Conflicts found" : "Stable graph", secondaryChip: `${formatNumber(recentFailures)} failure signals`, tone: recentFailures ? "warning" : "brand" },
      { title: "Priority resolution", description: "Resolve overlapping systems with server-specific override order instead of letting behavior feel inconsistent.", primaryChip: "Override ready", secondaryChip: `${formatNumber(permissionRules.length)} authority inputs`, tone: "brand" },
    ],
    diagnostics: [
      { title: botReady ? "Bot runtime is healthy" : "Bot runtime is offline", description: botReady ? "Gateway and server link are currently stable." : "Reconnect and runtime health should be the first move before changing engine behavior.", tone: botReady ? "healthy" : "danger" },
      { title: recentFailures ? "Recent failures detected" : "No recent command failures", description: recentFailures ? `${formatNumber(recentFailures)} recent failures suggest behavior conflicts or missing runtime support.` : "The recent activity lane is not surfacing engine-level failures right now.", tone: recentFailures ? "warning" : "healthy" },
    ],
    quickActions: [
      { title: "Open Command Logic", description: "Move directly into access rules, execution conditions, and fallback behavior.", href: buildArchivistItemPath(serverId, "settings", "command-logic"), icon: Workflow },
      { title: "Inspect Signals", description: "Use the logging lane when the engine feels slow, noisy, or inconsistent.", href: buildArchivistItemPath(serverId, "settings", "signals-logging"), icon: Radar },
    ],
  };
}

export function PremiumSettingsControlSystem({
  item,
  serverId,
  server,
  botStatus,
  overview,
  context,
  commands,
  logs,
  permissionRules,
  channelSettings,
  navigate,
}: {
  item: { id: string; slug: string };
  serverId: number;
  server: any;
  botStatus: any;
  overview: any;
  context: any;
  commands: any[];
  logs: any;
  permissionRules: any[];
  channelSettings: any[];
  navigate: (path: string) => void;
}) {
  const authQuery = useAuth();
  const ownerAccess = Boolean(authQuery.data?.ownerAccess);
  const channels = context?.channels || [];
  const roles = context?.roles || [];
  const textChannels = channels.filter((channel: any) => channel.isTextBased || channel.isForum || channel.isAnnouncement);
  const likelyStaffChannels = guessLikelyChannels(textChannels, /(staff|mod|admin|ops|alert|log|audit)/i);
  const likelyVerifyChannels = guessLikelyChannels(textChannels, /(verify|welcome|onboard|gate|rules)/i);
  const likelyAnnouncementChannels = guessLikelyChannels(textChannels, /(general|announce|news|updates|welcome|community)/i);
  const likelyVerifyRoles = guessLikelyRoles(roles, /(verify|member|human|trusted|approved)/i);
  const likelyStaffRoles = guessLikelyRoles(roles, /(staff|mod|admin|ops|support)/i);
  const likelyRewardRoles = guessLikelyRoles(roles, /(level|xp|reward|vip|elite|member)/i);
  const recentFailures = overview?.metrics?.recentFailures || logs?.failures?.length || 0;
  const syncLabel = commands.length ? "Synced" : "Awaiting sync";
  const warnings = Number(!botStatus?.ready) + Number(recentFailures > 0) + Number(channels.length === 0) + Number(permissionRules.length === 0);
  const category = CATEGORY_META.find((entry) => entry.id === item.id) || CATEGORY_META[0];
  const model = buildPageModel({
    slug: category.slug,
    serverId,
    channels,
    roles,
    commands,
    logs,
    permissionRules,
    channelSettings,
    likelyStaffChannels,
    likelyVerifyChannels,
    likelyAnnouncementChannels,
    likelyVerifyRoles,
    likelyStaffRoles,
    likelyRewardRoles,
    botReady: Boolean(botStatus?.ready),
    recentFailures,
    serverMemberCount: server.memberCount || 0,
  });

  if (item.id === "settings-overview") {
    return (
      <div className="space-y-4">
        <SettingsServerStatusCard
          server={server}
          botReady={Boolean(botStatus?.ready)}
          syncLabel={syncLabel}
          warningCount={warnings}
          ownerAccess={ownerAccess}
          onDiagnostics={() => navigate(buildArchivistItemPath(serverId, "settings", "bot-engine"))}
          onSync={() => navigate(buildArchivistItemPath(serverId, "settings", "command-logic"))}
          onBackup={() => navigate(buildArchivistItemPath(serverId, "settings", "safety-recovery"))}
          onSiteEditor={() => navigate("/dashboard/site-editor")}
        />
        <div className="space-y-3">
          {CATEGORY_META.map((entry) => {
            const summary = buildPageModel({
              slug: entry.slug,
              serverId,
              channels,
              roles,
              commands,
              logs,
              permissionRules,
              channelSettings,
              likelyStaffChannels,
              likelyVerifyChannels,
              likelyAnnouncementChannels,
              likelyVerifyRoles,
              likelyStaffRoles,
              likelyRewardRoles,
              botReady: Boolean(botStatus?.ready),
              recentFailures,
              serverMemberCount: server.memberCount || 0,
            });
            return (
              <SettingsCategoryCard
                key={entry.id}
                icon={entry.icon}
                title={entry.title}
                description={entry.homeDescription}
                status={summary.status}
                meta={summary.meta}
                onOpen={() => navigate(buildArchivistItemPath(serverId, "settings", entry.slug))}
              />
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SettingsSectionHero
        icon={category.icon}
        eyebrow={category.eyebrow}
        title={category.title}
        description={category.description}
        status={model.status}
        metaLabel={model.heroMetricLabel}
        metaValue={model.heroMetricValue}
        primaryActionLabel={model.primaryActionLabel}
        onPrimaryAction={() => navigate(model.primaryActionHref)}
      />
      <SettingsSectionBlock label="Core" title="Essential control posture" description="These are the controls that should always feel obvious, stable, and trustworthy first." rows={model.core} />
      <SettingsSectionBlock label="Advanced" title="Precision controls" description="This layer adds tighter control without turning the screen into a giant list of boring settings rows." rows={model.advanced} />
      <SettingsIntensifyBlock rows={model.intensify} />
      <SettingsDiagnosticsBlock diagnostics={model.diagnostics} />
      <SettingsQuickActionsBlock actions={model.quickActions} onNavigate={navigate} />
    </div>
  );
}
