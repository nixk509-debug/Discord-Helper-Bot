import { Braces, Sparkles, Zap, ShieldCheck, ArrowRight, AlertTriangle, Clock } from "lucide-react";
import { buildArchivistItemPath } from "@/lib/archivist-workspace";
import { formatRelativeEditTime } from "@/components/design-studio-v2/studio-v2-utils";
import { cn } from "@/lib/utils";
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

const PILLARS = [
  { section: "commands" as const, label: "Commands", icon: Braces, slug: "commands" },
  { section: "studio" as const, label: "Studio", icon: Sparkles, slug: "overview" },
  { section: "community" as const, label: "Community", icon: Zap, slug: "overview" },
  { section: "operations" as const, label: "Operations", icon: ShieldCheck, slug: "overview" },
];

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
  const liveCommands = commands.filter((c: any) => c.enabled).length;

  const recentDocs = documents
    .slice()
    .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 3);

  const recentFailedPubs = publications.filter((p: any) => p.status === "failed").slice(0, 3);

  return (
    <div className="space-y-6 pb-6">

      {/* Server identity — no border, no box */}
      <div className="flex items-center gap-3 pt-1">
        <div className="relative">
          {server?.iconUrl ? (
            <img src={server.iconUrl} alt={server.name} className="h-12 w-12 rounded-[14px] object-cover" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-white/[0.05]">
              <img src={archivistLogo} alt="Archivist" className="h-7 w-7 object-contain opacity-60" />
            </div>
          )}
          <span
            className={cn(
              "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#070709]",
              isOnline ? "bg-[#3ba55d]" : "bg-white/20",
            )}
          />
        </div>
        <div>
          <h1 className="text-[18px] font-bold text-white leading-tight">{server?.name ?? "Your Server"}</h1>
          <p className="text-[12px] text-white/40">{isOnline ? "Online" : "Offline"}</p>
        </div>
      </div>

      {/* Stats row — minimal numbers, no labels explaining what they are */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { value: commands.length, label: "Commands" },
          { value: liveCommands, label: "Live" },
          { value: recentCommands, label: "Runs" },
          { value: recentFailures, label: "Errors", danger: recentFailures > 0 },
        ].map((stat) => (
          <div key={stat.label} className="flex flex-col items-center rounded-[16px] bg-white/[0.04] py-3">
            <span className={cn("text-[20px] font-bold leading-none", stat.danger ? "text-[#ff6070]" : "text-white")}>
              {stat.value}
            </span>
            <span className="mt-1 text-[10px] text-white/35">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Quick nav — 4 section tiles, flat */}
      <div className="grid grid-cols-2 gap-2">
        {PILLARS.map(({ section, label, icon: Icon, slug }) => (
          <button
            key={section}
            type="button"
            onClick={() => navigate(buildArchivistItemPath(serverId, section, slug))}
            className="flex items-center gap-3 rounded-[18px] bg-white/[0.04] px-4 py-4 text-left transition active:bg-white/[0.07]"
          >
            <Icon className="h-5 w-5 shrink-0 text-white/50" strokeWidth={1.8} />
            <span className="text-[13px] font-semibold text-white/80">{label}</span>
            <ArrowRight className="ml-auto h-3.5 w-3.5 text-white/20" />
          </button>
        ))}
      </div>

      {/* Recent commands — just a plain list */}
      {commands.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-white/30">Commands</p>
          <div className="rounded-[18px] bg-white/[0.04] overflow-hidden">
            {commands.slice(0, 5).map((cmd: any, i: number) => (
              <button
                key={cmd.id}
                type="button"
                onClick={() => navigate(buildArchivistItemPath(serverId, "commands", "create-command", { search: { commandId: cmd.id } }))}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-3 text-left transition active:bg-white/[0.04]",
                  i < Math.min(commands.length, 5) - 1 && "border-b border-white/[0.05]",
                )}
              >
                <div className={cn(
                  "h-1.5 w-1.5 rounded-full shrink-0",
                  cmd.enabled ? "bg-[#3ba55d]" : "bg-white/20",
                )} />
                <span className="flex-1 truncate text-[13px] font-medium text-white/75">/{cmd.name}</span>
                {Array.isArray(cmd.lastValidation) && cmd.lastValidation.some((v: any) => v?.severity === "error") && (
                  <AlertTriangle className="h-3.5 w-3.5 text-[#ff6070]" />
                )}
                <ChevronRight />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent studio drafts */}
      {recentDocs.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-white/30">Studio</p>
          <div className="rounded-[18px] bg-white/[0.04] overflow-hidden">
            {recentDocs.map((doc: any, i: number) => (
              <button
                key={doc.id}
                type="button"
                onClick={() => navigate(buildArchivistItemPath(serverId, "studio", "create-new", { search: { documentId: doc.id } }))}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-3 text-left transition active:bg-white/[0.04]",
                  i < recentDocs.length - 1 && "border-b border-white/[0.05]",
                )}
              >
                <Sparkles className="h-4 w-4 shrink-0 text-white/30" strokeWidth={1.6} />
                <span className="flex-1 truncate text-[13px] font-medium text-white/75">{doc.name}</span>
                <span className="text-[11px] text-white/25 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatRelativeEditTime(doc.updatedAt)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Failed publications */}
      {recentFailedPubs.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[#ff6070]/60">Publish Failures</p>
          <div className="rounded-[18px] bg-white/[0.04] overflow-hidden">
            {recentFailedPubs.map((pub: any, i: number) => (
              <button
                key={pub.id}
                type="button"
                onClick={() => navigate(buildArchivistItemPath(serverId, "studio", "overview"))}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-3 text-left transition active:bg-white/[0.04]",
                  i < recentFailedPubs.length - 1 && "border-b border-white/[0.05]",
                )}
              >
                <AlertTriangle className="h-4 w-4 shrink-0 text-[#ff6070]" />
                <span className="flex-1 truncate text-[13px] font-medium text-white/75">
                  {pub.lastFailureSummary || `Document #${pub.documentId}`}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

// tiny inline helper so import doesn't break
function ChevronRight() {
  return (
    <svg className="h-3.5 w-3.5 text-white/20" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
    </svg>
  );
}
