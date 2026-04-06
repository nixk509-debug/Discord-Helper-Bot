import {
  ArrowUpRight,
  BadgePlus,
  Braces,
  FileStack,
  Layers3,
  Logs,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { buildArchivistItemPath } from "@/lib/archivist-workspace";
import { cn } from "@/lib/utils";

function formatRelative(value: unknown) {
  const parsed = value ? new Date(value as string | number | Date) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return "recently";
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

function Stats({ items }: { items: { label: string; value: string; accent?: boolean }[] }) {
  return (
    <div className="flex gap-5">
      {items.map(({ label, value, accent }) => (
        <div key={label}>
          <p className={cn("text-[22px] font-bold leading-none", accent ? "text-[#E0001A]" : "text-white")}>{value}</p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-white/35">{label}</p>
        </div>
      ))}
    </div>
  );
}

function PrimaryBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="flex items-center gap-1.5 rounded-full bg-[#E0001A] px-4 py-2 text-[13px] font-semibold text-white active:opacity-80">
      <BadgePlus className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

function GhostBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="rounded-full bg-white/[0.06] px-3 py-1.5 text-[12px] font-medium text-white/60 active:bg-white/10">
      {label}
    </button>
  );
}

function Row({ title, sub, onClick }: { title: string; sub?: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="flex w-full items-center justify-between gap-3 border-b border-white/[0.05] py-3 text-left last:border-0 active:opacity-70">
      <div className="min-w-0">
        <p className="truncate text-[14px] font-medium text-white">{title}</p>
        {sub && <p className="mt-0.5 text-[12px] text-white/35">{sub}</p>}
      </div>
      <ArrowUpRight className="h-4 w-4 shrink-0 text-white/20" />
    </button>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return <div className="rounded-[20px] bg-white/[0.03] px-4 py-4">{children}</div>;
}

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-white/35">{title}</p>
      {action}
    </div>
  );
}

function Tile({ icon: Icon, label, onClick }: { icon: React.ElementType; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="flex items-center gap-3 rounded-[16px] bg-white/[0.04] px-4 py-3 text-left active:bg-white/[0.07]">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-white/[0.06] text-white/50">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <p className="text-[13px] font-semibold text-white/80">{label}</p>
    </button>
  );
}

export function CommandsOverview({
  serverId, commands, overview, navigate,
}: {
  serverId: number; commands: any[]; overview: any; navigate: (href: string) => void;
}) {
  const enabledCount = commands.filter((c) => c?.enabled).length;
  const failureCount = overview?.metrics?.recentFailures || 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Stats items={[
          { label: "Total", value: String(commands.length), accent: true },
          { label: "Live", value: String(enabledCount) },
          { label: "Runs", value: String(overview?.metrics?.recentCommands || 0) },
          { label: "Errors", value: String(failureCount), accent: failureCount > 0 },
        ]} />
        <PrimaryBtn label="New" onClick={() => navigate(buildArchivistItemPath(serverId, "commands", "create-command"))} />
      </div>

      <Section>
        <SectionHeader title="Recent"
          action={<GhostBtn label="All" onClick={() => navigate(buildArchivistItemPath(serverId, "commands", "commands"))} />} />
        {commands.slice(0, 5).length ? commands.slice(0, 5).map((cmd) => (
          <Row key={cmd.id} title={cmd.name}
            sub={`${cmd.triggerType || "auto"} · ${cmd.enabled ? "live" : "draft"}`}
            onClick={() => navigate(buildArchivistItemPath(serverId, "commands", "create-command", { search: { commandId: cmd.id } }))} />
        )) : <p className="py-4 text-center text-[13px] text-white/25">No commands yet</p>}
      </Section>

      <Section>
        <SectionHeader title="Lanes" />
        <div className="grid grid-cols-2 gap-2">
          <Tile icon={Braces} label="Slash" onClick={() => navigate(buildArchivistItemPath(serverId, "commands", "slash-commands"))} />
          <Tile icon={Logs} label="Keyword" onClick={() => navigate(buildArchivistItemPath(serverId, "commands", "message-commands"))} />
          <Tile icon={Sparkles} label="Scheduled" onClick={() => navigate(buildArchivistItemPath(serverId, "commands", "scheduled-triggers"))} />
          <Tile icon={Users} label="On Join" onClick={() => navigate(buildArchivistItemPath(serverId, "commands", "member-join-triggers"))} />
        </div>
      </Section>
    </div>
  );
}

export function StudioOverview({
  serverId, drafts, templates, publications, publishedDocumentIds, navigate,
}: {
  serverId: number; drafts: any[]; templates: any[]; publications: any[];
  publishedDocumentIds: Set<number>; navigate: (href: string) => void;
}) {
  const unpublished = drafts.filter((d) => !publishedDocumentIds.has(d.id)).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Stats items={[
          { label: "Drafts", value: String(drafts.length), accent: true },
          { label: "Unpublished", value: String(unpublished) },
          { label: "Published", value: String(publications.length) },
        ]} />
        <PrimaryBtn label="New" onClick={() => navigate(buildArchivistItemPath(serverId, "studio", "create-new"))} />
      </div>

      <Section>
        <SectionHeader title="Drafts"
          action={<GhostBtn label="All" onClick={() => navigate(buildArchivistItemPath(serverId, "studio", "ui-projects"))} />} />
        {drafts.slice(0, 5).length ? drafts.slice(0, 5).map((draft) => (
          <Row key={draft.id} title={draft.name}
            sub={`${publishedDocumentIds.has(draft.id) ? "Published" : "Draft"} · ${formatRelative(draft.updatedAt)}`}
            onClick={() => navigate(buildArchivistItemPath(serverId, "studio", "create-new", { search: { documentId: draft.id } }))} />
        )) : <p className="py-4 text-center text-[13px] text-white/25">No drafts yet</p>}
      </Section>

      <Section>
        <SectionHeader title="Start with" />
        <div className="grid grid-cols-2 gap-2">
          <Tile icon={Layers3} label="Embeds" onClick={() => navigate(buildArchivistItemPath(serverId, "studio", "embeds"))} />
          <Tile icon={Sparkles} label="Components" onClick={() => navigate(buildArchivistItemPath(serverId, "studio", "components-v2"))} />
        </div>
      </Section>
    </div>
  );
}

const COMMUNITY_MODULES = [
  { id: "leveling", label: "Leveling", description: "XP, ranks, milestone rewards", icon: Users, route: "profile" },
  { id: "giveaways", label: "Giveaways", description: "Entry flows, winner selection", icon: Sparkles, route: "creative-tools" },
  { id: "trivia", label: "Trivia", description: "Fast rounds, categories, scoring", icon: Braces, route: "leaderboards" },
  { id: "economy", label: "Economy", description: "Currency, shop, redemptions", icon: ShieldCheck, route: "shop" },
  { id: "daily", label: "Daily Rewards", description: "Recurring claims, streak boosts", icon: Logs, route: "leaderboards" },
] as const;

export function FunOverview({
  serverId, server, moduleEnabled, overview, navigate,
}: {
  serverId: number; server: any; moduleEnabled: Record<string, boolean>;
  overview: any; navigate: (href: string) => void;
}) {
  const failureCount = overview?.metrics?.recentFailures || 0;
  const activeCount = COMMUNITY_MODULES.filter((m) => moduleEnabled[m.id]).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Stats items={[
          { label: "Members", value: server?.memberCount ? String(server.memberCount) : "—", accent: true },
          { label: "Active", value: String(activeCount) },
          { label: "Runs", value: String(overview?.metrics?.recentCommands || 0) },
          { label: "Errors", value: String(failureCount), accent: failureCount > 0 },
        ]} />
        <PrimaryBtn label="Explore" onClick={() => navigate(buildArchivistItemPath(serverId, "community", "creative-overview"))} />
      </div>

      <Section>
        <SectionHeader title="Modules" />
        <div className="space-y-1">
          {COMMUNITY_MODULES.map(({ id, label, description, icon: Icon, route }) => {
            const active = !!moduleEnabled[id];
            return (
              <button key={id} type="button"
                onClick={() => navigate(buildArchivistItemPath(serverId, "community", route))}
                className="flex w-full items-center gap-3 rounded-[16px] px-3 py-3 text-left active:bg-white/[0.04]">
                <div className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]",
                  active ? "bg-[#E0001A]/20 text-[#E0001A]" : "bg-white/[0.05] text-white/30"
                )}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-white/80">{label}</p>
                  <p className="text-[11px] text-white/30">{description}</p>
                </div>
                <span className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest",
                  active ? "bg-[#E0001A]/15 text-[#E0001A]/80" : "bg-white/[0.05] text-white/20"
                )}>
                  {active ? "On" : "Off"}
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section>
        <SectionHeader title="Quick Access" />
        <div className="grid grid-cols-2 gap-2">
          <Tile icon={Layers3} label="Starboard" onClick={() => navigate(buildArchivistItemPath(serverId, "community", "starboard"))} />
          <Tile icon={Braces} label="Reaction Roles" onClick={() => navigate(buildArchivistItemPath(serverId, "community", "reaction-roles"))} />
          <Tile icon={Logs} label="Leaderboards" onClick={() => navigate(buildArchivistItemPath(serverId, "community", "leaderboards"))} />
          <Tile icon={ShieldCheck} label="Shop" onClick={() => navigate(buildArchivistItemPath(serverId, "community", "shop"))} />
        </div>
      </Section>
    </div>
  );
}

export function SystemOverview({
  serverId, botStatus, context, documents, logs, navigate,
}: {
  serverId: number; botStatus: any; context: any; documents: any[];
  logs: any; navigate: (href: string) => void;
}) {
  const recentFailures = logs?.failures?.length || 0;
  const hasVerify = documents.some((d) => d?.moduleBinding === "verify");
  const hasTickets = documents.some((d) => String(d?.moduleBinding || "").includes("ticket"));

  return (
    <div className="space-y-3">
      <Stats items={[
        { label: "Status", value: botStatus?.ready ? "Online" : "Offline", accent: botStatus?.ready },
        { label: "Roles", value: String(context?.roles?.length || 0) },
        { label: "Channels", value: String(context?.channels?.length || 0) },
        { label: "Errors", value: String(recentFailures), accent: recentFailures > 0 },
      ]} />

      <Section>
        <SectionHeader title="Status" />
        <Row title="Bot" sub={botStatus?.ready ? "Online and responding" : "Offline"} onClick={() => {}} />
        <Row title="Verification" sub={hasVerify ? "Configured" : "Not set up"}
          onClick={() => navigate(buildArchivistItemPath(serverId, "studio", "verify"))} />
        <Row title="Tickets" sub={hasTickets ? "Panel live" : "No panel"}
          onClick={() => navigate(buildArchivistItemPath(serverId, "studio", "tickets"))} />
      </Section>

      <Section>
        <SectionHeader title="Manage" />
        <div className="grid grid-cols-2 gap-2">
          <Tile icon={ShieldCheck} label="Permissions" onClick={() => navigate(buildArchivistItemPath(serverId, "server", "permissions"))} />
          <Tile icon={Logs} label="Channels" onClick={() => navigate(buildArchivistItemPath(serverId, "server", "channels"))} />
          <Tile icon={FileStack} label="Backups" onClick={() => navigate(buildArchivistItemPath(serverId, "server", "backups-sync"))} />
        </div>
      </Section>
    </div>
  );
}
