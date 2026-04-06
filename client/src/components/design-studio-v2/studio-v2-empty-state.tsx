import { AlertTriangle, ArrowUpRight, Box, Clock, FileText, Layers3, Sparkles, Zap } from "lucide-react";
import type { StudioDocumentRecord, StudioPublication } from "@shared/schema";
import { cn } from "@/lib/utils";
import { formatRelativeEditTime } from "@/components/design-studio-v2/studio-v2-utils";
import archivistLogo from "@assets/FDEBE754-F9DF-41D4-A19B-B2933432B230_1772114960531.png";

interface StudioV2EmptyStateProps {
  latestDraft?: StudioDocumentRecord;
  draftsNeedingAttention: StudioDocumentRecord[];
  recentPublishFailures: StudioPublication[];
  isLoading?: boolean;
  isWorking?: boolean;
  statusBanner?: {
    tone: "working" | "error";
    title: string;
    description: string;
  } | null;
  onCreateMessage: () => void;
  onCreateEmbed: () => void;
  onCreateComponents: () => void;
  onOpenDraft: (documentId: number) => void;
  entryIntent?: StudioEntryIntent;
}

export type StudioCreateKind = "message" | "embed" | "components";

export interface StudioEntryIntent {
  eyebrow?: string;
  title?: string;
  description?: string;
}

const CREATE_CARDS = [
  {
    id: "message" as const,
    label: "Message",
    sub: "Plain text + rows",
    icon: FileText,
    color: "rgba(255,255,255,0.03)",
    border: "rgba(255,255,255,0.07)",
    iconColor: "rgba(255,255,255,0.55)",
  },
  {
    id: "embed" as const,
    label: "Embed",
    sub: "Rich card + media",
    icon: Sparkles,
    color: "rgba(224,0,26,0.08)",
    border: "rgba(224,0,26,0.2)",
    iconColor: "#ff5060",
  },
  {
    id: "components" as const,
    label: "Interactive",
    sub: "Blocks + buttons",
    icon: Layers3,
    color: "rgba(255,255,255,0.025)",
    border: "rgba(255,255,255,0.06)",
    iconColor: "rgba(255,255,255,0.45)",
  },
] as const;

export function StudioV2EmptyState({
  latestDraft,
  draftsNeedingAttention,
  recentPublishFailures,
  isLoading,
  isWorking,
  statusBanner,
  onCreateMessage,
  onCreateEmbed,
  onCreateComponents,
  onOpenDraft,
  entryIntent,
}: StudioV2EmptyStateProps) {
  const heroEyebrow = entryIntent?.eyebrow || "Studio";
  const heroTitle = entryIntent?.title || "Choose a surface";
  const heroDescription = entryIntent?.description?.trim() || "";

  const onCreate = (id: StudioCreateKind) => {
    if (id === "message") onCreateMessage();
    else if (id === "embed") onCreateEmbed();
    else onCreateComponents();
  };

  // Combine drafts needing attention + latest into a deduplicated recent list
  const recentDrafts: StudioDocumentRecord[] = [];
  const seen = new Set<number>();
  if (latestDraft && !seen.has(latestDraft.id)) {
    recentDrafts.push(latestDraft);
    seen.add(latestDraft.id);
  }
  for (const d of draftsNeedingAttention) {
    if (!seen.has(d.id)) {
      recentDrafts.push(d);
      seen.add(d.id);
    }
  }

  return (
    <div className="space-y-6 pb-[calc(env(safe-area-inset-bottom)+5.5rem)]">

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-[24px] border border-[rgba(224,0,26,0.12)] bg-[linear-gradient(145deg,rgba(14,10,12,0.99),rgba(8,9,11,1))] p-6 md:p-8 shadow-[0_0_0_1px_rgba(224,0,26,0.05),0_24px_60px_rgba(0,0,0,0.4)]">
        {/* ambient glow */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_10%_0%,rgba(224,0,26,0.09),transparent)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_40%_30%_at_90%_100%,rgba(120,0,20,0.04),transparent)]" />

        <div className="relative">
          {/* eyebrow + icon */}
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-[rgba(224,0,26,0.28)] bg-[rgba(12,8,10,0.95)] shadow-[0_8px_20px_rgba(0,0,0,0.4)]">
              <img src={archivistLogo} alt="Archivist" className="h-6 w-6 object-contain" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[rgba(224,0,26,0.6)]">{heroEyebrow}</p>
          </div>

          {/* headline */}
          <h1 className={cn("text-[1.7rem] font-bold leading-tight tracking-tight text-white md:text-[2.1rem]", heroDescription ? "mb-2" : "mb-7")}>{heroTitle}</h1>
          {heroDescription ? <p className="mb-7 max-w-xl text-[14px] leading-6 text-white/50">{heroDescription}</p> : null}

          {/* create cards */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 max-w-lg">
            {CREATE_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => onCreate(card.id)}
                  disabled={isWorking}
                  className="group relative flex flex-col gap-2 rounded-[16px] border p-3 text-left transition hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                  style={{ borderColor: card.border, background: card.color }}
                >
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-[10px]"
                    style={{ background: "rgba(0,0,0,0.25)", color: card.iconColor }}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-white">{card.label}</p>
                    <p className="text-[11px] text-white/42 leading-tight">{card.sub}</p>
                  </div>
                  <ArrowUpRight className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-white/20 transition group-hover:text-white/50" />
                </button>
              );
            })}
          </div>

          {/* status banner */}
          {statusBanner ? (
            <div className={cn(
              "mt-5 rounded-[14px] border px-4 py-3",
              statusBanner.tone === "error"
                ? "border-[rgba(224,0,26,0.28)] bg-[rgba(22,10,13,0.95)]"
                : "border-[rgba(224,0,26,0.16)] bg-[rgba(14,12,13,0.95)]",
            )}>
              <p className="text-[13px] font-semibold text-white">{statusBanner.title}</p>
              <p className="mt-0.5 text-[12px] text-white/50">{statusBanner.description}</p>
            </div>
          ) : null}
        </div>
      </div>

      {/* ── Recent drafts ─────────────────────────────────────────────── */}
      {recentDrafts.length > 0 ? (
        <div>
          <p className="mb-3 px-1 text-[10px] font-bold uppercase tracking-[0.28em] text-white/25">Recent drafts</p>
          <div className="space-y-1.5">
            {recentDrafts.map((draft, i) => {
              const isLatest = draft.id === latestDraft?.id;
              const needsAttention = draftsNeedingAttention.some((d) => d.id === draft.id);
              return (
                <button
                  key={draft.id}
                  type="button"
                  onClick={() => onOpenDraft(draft.id)}
                  disabled={isLoading}
                  className="group flex w-full items-center gap-3 rounded-[16px] border border-white/[0.06] bg-[rgba(12,13,16,0.7)] px-4 py-3 text-left transition hover:border-white/[0.1] hover:bg-[rgba(14,15,18,0.85)] disabled:opacity-50"
                >
                  {/* icon */}
                  <div className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] border",
                    needsAttention
                      ? "border-[rgba(224,0,26,0.2)] bg-[rgba(22,10,13,0.9)] text-[#ff6070]"
                      : "border-white/[0.07] bg-white/[0.04] text-white/50",
                  )}>
                    {needsAttention ? <AlertTriangle className="h-4 w-4" /> : <Box className="h-4 w-4" />}
                  </div>

                  {/* info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-white">{draft.name}</p>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <Clock className="h-3 w-3 text-white/25" />
                      <p className="text-[11px] text-white/35">{formatRelativeEditTime(draft.updatedAt)}</p>
                    </div>
                  </div>

                  {/* badges */}
                  <div className="flex shrink-0 items-center gap-1.5">
                    {isLatest && (
                      <span className="rounded-full border border-[rgba(224,0,26,0.18)] bg-[rgba(224,0,26,0.07)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[rgba(255,100,120,0.7)]">
                        Latest
                      </span>
                    )}
                    {needsAttention && (
                      <span className="rounded-full border border-white/[0.1] bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                        Review
                      </span>
                    )}
                    <ArrowUpRight className="h-4 w-4 text-white/20 transition group-hover:text-white/50" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : !isLoading ? (
        <div className="rounded-[16px] border border-dashed border-white/[0.07] bg-white/[0.015] px-4 py-6 text-center">
          <p className="text-[13px] text-white/30">No drafts yet.</p>
        </div>
      ) : null}

      {/* ── Publish failures (only when they exist) ───────────────────── */}
      {recentPublishFailures.length > 0 ? (
        <div>
          <p className="mb-3 px-1 text-[10px] font-bold uppercase tracking-[0.28em] text-white/25">Publish failures</p>
          <div className="space-y-1.5">
            {recentPublishFailures.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => onOpenDraft(entry.documentId)}
                className="group flex w-full items-center gap-3 rounded-[16px] border border-[rgba(224,0,26,0.12)] bg-[rgba(16,8,10,0.7)] px-4 py-3 text-left transition hover:border-[rgba(224,0,26,0.2)] hover:bg-[rgba(18,9,11,0.85)]"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] border border-[rgba(224,0,26,0.2)] bg-[rgba(22,10,13,0.9)] text-[#ff6070]">
                  <Zap className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-white">Draft #{entry.documentId}</p>
                  <p className="mt-0.5 truncate text-[11px] text-white/35">{entry.lastFailureSummary || "Publish failure recorded"}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span className="rounded-full border border-[rgba(224,0,26,0.18)] bg-[rgba(224,0,26,0.07)] px-2 py-0.5 text-[10px] font-semibold text-[rgba(255,100,120,0.7)]">Failed</span>
                  <ArrowUpRight className="h-4 w-4 text-white/20 transition group-hover:text-white/50" />
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : null}

    </div>
  );
}
