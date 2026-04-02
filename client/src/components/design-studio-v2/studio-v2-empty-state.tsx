import { AlertTriangle, ArrowUpRight, Box, FileText, Layers3, Sparkles } from "lucide-react";
import type { StudioDocumentRecord, StudioPublication } from "@shared/schema";
import { MetricStrip, SurfacePanel, SurfaceRow, StatusPill } from "@/components/layout/archivist-surfaces";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatRelativeEditTime } from "@/components/design-studio-v2/studio-v2-utils";
import archivistLogo from "@assets/FDEBE754-F9DF-41D4-A19B-B2933432B230_1772114960531.png";
import heroArt from "@assets/hero-art.png";
import dashboardArt from "@assets/dashboard-art.png";

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
  badges?: string[];
  recommendedFlowLabel?: string;
  recommendedFlowTitle?: string;
  recommendedFlowDescription?: string;
  preferredKinds?: StudioCreateKind[];
}

const CREATE_ROWS = [
  {
    id: "message" as const,
    title: "Message draft",
    description: "Start with body text and rows that publish cleanly.",
    icon: FileText,
  },
  {
    id: "embed" as const,
    title: "Embed draft",
    description: "Build a richer message with image, color, and structure.",
    icon: Sparkles,
  },
  {
    id: "components" as const,
    title: "Interactive layout",
    description: "Start with structure when the message needs blocks, rows, and richer interaction.",
    icon: Layers3,
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
  const preferredKinds = entryIntent?.preferredKinds?.length ? entryIntent.preferredKinds : CREATE_ROWS.map((row) => row.id);
  const orderedRows = [
    ...preferredKinds
      .map((kind) => CREATE_ROWS.find((row) => row.id === kind))
      .filter((row): row is (typeof CREATE_ROWS)[number] => Boolean(row)),
    ...CREATE_ROWS.filter((row) => !preferredKinds.includes(row.id)),
  ];
  const heroEyebrow = entryIntent?.eyebrow || "Design Studio";
  const heroTitle = entryIntent?.title || "Build Discord designs live.";
  const heroDescription = entryIntent?.description || "Draft the message, see the real preview, catch publish issues, and keep every design reusable inside Custom Commands.";
  const heroBadges = entryIntent?.badges?.length ? entryIntent.badges : ["Build", "Preview", "Issues", "Publish"];
  const recommendedFlowLabel = entryIntent?.recommendedFlowLabel || "Recommended flow";
  const recommendedFlowTitle = entryIntent?.recommendedFlowTitle || "Start the draft. Tap the part. Edit it live.";
  const recommendedFlowDescription = entryIntent?.recommendedFlowDescription || "Keep the live Discord message at the center so editing and publishing stay aligned.";

  return (
    <div className="space-y-4 pb-[calc(env(safe-area-inset-bottom)+5.5rem)]">
      <SurfacePanel className="overflow-hidden">
        <div className="grid gap-0 xl:grid-cols-[minmax(0,1.08fr)_360px]">
          <div className="relative px-4 py-5 md:px-6 md:py-6">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(104,28,40,0.1),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent)]" />
            <div className="relative space-y-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-[14px] border border-[rgba(101,33,43,0.34)] bg-[rgba(10,11,13,0.92)] shadow-[0_18px_34px_rgba(0,0,0,0.34)]">
                  <img src={archivistLogo} alt="Archivist" className="h-8 w-8 object-contain" />
                </div>
                <div className="min-w-0">
                  <p className="archivist-eyebrow">{heroEyebrow}</p>
                  <h1 className="truncate text-2xl font-bold tracking-tight text-white md:text-[2rem]">{heroTitle}</h1>
                </div>
              </div>

              <div className="max-w-2xl space-y-2">
                <p className="text-sm leading-7 text-white/62 md:text-[15px]">{heroDescription}</p>
                <div className="flex flex-wrap gap-2">
                  {heroBadges.map((badge, index) => (
                    <span
                      key={badge}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em]",
                        index === 0
                          ? "border-[rgba(116,40,51,0.24)] bg-[rgba(31,13,17,0.44)] text-[rgba(255,232,236,0.9)]"
                          : "border-white/10 bg-white/[0.03] text-white/64",
                      )}
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <MetricStrip label="Drafts" value={String((latestDraft ? 1 : 0) + draftsNeedingAttention.length)} tone="accent" />
                <MetricStrip label="Attention" value={String(draftsNeedingAttention.length)} tone={draftsNeedingAttention.length > 0 ? "danger" : "neutral"} />
                <MetricStrip label="Failures" value={String(recentPublishFailures.length)} tone={recentPublishFailures.length > 0 ? "danger" : "neutral"} />
              </div>

              <div className="grid gap-2">
                {orderedRows.map((row, index) => {
                  const Icon = row.icon;
                  const onCreate =
                    row.id === "message"
                      ? onCreateMessage
                      : row.id === "embed"
                        ? onCreateEmbed
                        : onCreateComponents;

                  return (
                    <button
                      key={row.id}
                      type="button"
                      onClick={onCreate}
                      disabled={isWorking}
                      className={cn(
                        "group flex w-full items-center justify-between rounded-[18px] border px-4 py-3 text-left transition",
                        index === 0
                          ? "border-[rgba(122,43,55,0.26)] bg-[linear-gradient(180deg,rgba(17,12,14,0.98),rgba(9,9,10,1))] shadow-[0_16px_30px_rgba(0,0,0,0.26)] hover:border-[rgba(144,53,66,0.34)]"
                          : "border-white/8 bg-[linear-gradient(180deg,rgba(12,13,15,0.98),rgba(8,9,10,1))] hover:border-[rgba(102,40,51,0.22)] hover:bg-[linear-gradient(180deg,rgba(15,13,14,0.98),rgba(9,8,9,1))]",
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-[12px] border text-[#f09aa7]",
                          index === 0 ? "border-[rgba(123,42,53,0.32)] bg-[rgba(24,13,16,0.94)]" : "border-[rgba(88,31,40,0.24)] bg-[rgba(16,12,14,0.94)]",
                        )}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">{row.title}</p>
                          <p className="mt-1 text-sm text-white/46">{row.description}</p>
                        </div>
                      </div>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-white/28 transition group-hover:text-[#f2a5b1]" />
                    </button>
                  );
                })}
              </div>

              {statusBanner ? (
                <div
                  className={cn(
                    "rounded-[18px] border px-4 py-4",
                    statusBanner.tone === "error"
                      ? "border-[rgba(113,34,47,0.44)] bg-[rgba(22,12,15,0.96)]"
                      : "border-[rgba(95,26,36,0.34)] bg-[rgba(15,12,13,0.96)]",
                  )}
                >
                  <p className="text-sm font-semibold text-white">{statusBanner.title}</p>
                  <p className="mt-1 text-sm text-white/58">{statusBanner.description}</p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="relative min-h-[280px] border-t border-white/6 bg-[#060709] xl:border-l xl:border-t-0">
            <img src={heroArt} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,6,8,0.18),rgba(5,6,8,0.84))]" />
            <div className="relative flex h-full flex-col justify-end gap-3 px-4 py-4 md:px-5 md:py-5">
              <div className="rounded-[20px] border border-white/10 bg-[#090b0e]/88 p-3 backdrop-blur-sm">
                <img src={dashboardArt} alt="Studio preview" className="w-full rounded-[14px] border border-white/10 object-cover" />
              </div>
              <div className="rounded-[18px] border border-[rgba(110,38,49,0.2)] bg-[rgba(9,11,14,0.9)] px-4 py-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.22em] text-white/38">{recommendedFlowLabel}</p>
                <p className="mt-2 text-sm font-semibold text-white">{recommendedFlowTitle}</p>
                <p className="mt-1 text-sm leading-6 text-white/50">{recommendedFlowDescription}</p>
              </div>
            </div>
          </div>
        </div>
      </SurfacePanel>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.84fr)]">
        <SurfacePanel>
          <div className="border-b border-white/6 px-4 py-4 md:px-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="archivist-eyebrow">Continue working</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Drafts that still matter</h2>
              </div>
              {latestDraft ? (
                <Button variant="outline" onClick={() => onOpenDraft(latestDraft.id)} disabled={isLoading}>
                  Resume Latest
                </Button>
              ) : null}
            </div>
          </div>
          <div className="divide-y divide-white/6">
            {latestDraft ? (
              <SurfaceRow
                title={latestDraft.name}
                description={`Last updated ${formatRelativeEditTime(latestDraft.updatedAt)}`}
                meta={<StatusPill tone="accent">Latest</StatusPill>}
                accent={<DraftAccent />}
              >
                <div className="px-4 pb-4 md:px-6">
                  <Button onClick={() => onOpenDraft(latestDraft.id)} className="w-full sm:w-auto">
                    Open Draft
                  </Button>
                </div>
              </SurfaceRow>
            ) : (
              <div className="px-4 py-10 text-sm text-white/46 md:px-6">
                No drafts yet. Start with a message, an embed, or an interactive layout.
              </div>
            )}

            {draftsNeedingAttention.map((draft) => (
              <button
                key={draft.id}
                type="button"
                onClick={() => onOpenDraft(draft.id)}
                className="w-full text-left transition hover:bg-white/[0.02]"
              >
                <SurfaceRow
                  title={draft.name}
                  description={`Needs review. Updated ${formatRelativeEditTime(draft.updatedAt)}`}
                  meta={<StatusPill tone="danger">Attention</StatusPill>}
                  accent={<DraftAccent tone="danger" />}
                />
              </button>
            ))}
          </div>
        </SurfacePanel>

        <SurfacePanel>
          <div className="border-b border-white/6 px-4 py-4 md:px-6">
            <p className="archivist-eyebrow">Publish watch</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Recent failures</h2>
          </div>
          <div className="divide-y divide-white/6">
            {recentPublishFailures.length > 0 ? (
              recentPublishFailures.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => onOpenDraft(entry.documentId)}
                  className="w-full text-left transition hover:bg-white/[0.02]"
                >
                    <SurfaceRow
                      title={`Document #${entry.documentId}`}
                    description={entry.lastFailureSummary || "Publish failure recorded."}
                    meta={
                      <>
                        <StatusPill tone="danger">Failed</StatusPill>
                        <StatusPill>{formatRelativeEditTime(entry.lastFailureAt || entry.updatedAt)}</StatusPill>
                      </>
                    }
                    accent={<FailureAccent />}
                  />
                </button>
              ))
            ) : (
              <div className="px-4 py-10 text-sm text-white/46 md:px-6">
                No recent publish failures. Studio is clear right now.
              </div>
            )}
          </div>
        </SurfacePanel>
      </div>
    </div>
  );
}

function DraftAccent({ tone = "accent" }: { tone?: "accent" | "danger" }) {
  return (
    <div
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-[12px] border",
        tone === "danger"
          ? "border-[rgba(112,38,49,0.34)] bg-[rgba(25,13,16,0.92)] text-[#f5b3be]"
          : "border-[rgba(92,32,42,0.28)] bg-[rgba(17,12,14,0.9)] text-[#f09aa7]",
      )}
    >
      <Box className="h-4 w-4" />
    </div>
  );
}

function FailureAccent() {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-[rgba(112,38,49,0.34)] bg-[rgba(25,13,16,0.92)] text-[#f5b3be]">
      <AlertTriangle className="h-4 w-4" />
    </div>
  );
}
