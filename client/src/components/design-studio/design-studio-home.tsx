import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  FileClock,
  FilePlus2,
  Library,
  Plus,
  Settings2,
  Sparkles,
  UsersRound,
  Workflow,
} from "lucide-react";
import archivistAvatar from "@assets/archivist-avatar.png";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  STUDIO_COMMUNITY_STARTERS,
  inferStudioPrimarySurfaceType,
  type StudioPrimarySurfaceType,
} from "@/components/design-studio/studio-defaults";
import type { StudioDocumentRecord, StudioPublication } from "@shared/schema";

type StudioHomeSection = "home" | "new" | "recents" | "community";

interface DesignStudioHomeProps {
  documents: StudioDocumentRecord[];
  publications: StudioPublication[];
  isLoading: boolean;
  isWorking?: boolean;
  onBack?: () => void;
  onOpenSettings?: () => void;
  onOpenDocument: (documentId: number) => void;
  onCreatePrimary: (primaryType: StudioPrimarySurfaceType) => void;
  onImportCommunityStarter: (starterId: string) => void;
  initialSection?: StudioHomeSection;
  embedded?: boolean;
}

const PRIMARY_TYPE_COPY: Record<StudioPrimarySurfaceType, { title: string; subtitle: string; eyebrow: string }> = {
  message: {
    title: "Plain Message",
    subtitle: "Write a clean Discord message from top to bottom.",
    eyebrow: "Compose",
  },
  embed: {
    title: "Embed Message",
    subtitle: "Build a rich embed with fields, media, and color.",
    eyebrow: "Embed",
  },
  components: {
    title: "Interactive Message",
    subtitle: "Add layouts, buttons, menus, and follow-up behavior when you need it.",
    eyebrow: "Interactive",
  },
};

function parseDate(value: unknown) {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

function formatRelativeEditTime(value: unknown) {
  const date = parseDate(value);
  if (!date) return null;

  const diffMs = date.getTime() - Date.now();
  const absMinutes = Math.round(Math.abs(diffMs) / (1000 * 60));
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (absMinutes < 60) return formatter.format(Math.round(diffMs / (1000 * 60)), "minute");

  const absHours = Math.round(absMinutes / 60);
  if (absHours < 24) return formatter.format(Math.round(diffMs / (1000 * 60 * 60)), "hour");

  const absDays = Math.round(absHours / 24);
  if (absDays < 7) return formatter.format(Math.round(diffMs / (1000 * 60 * 60 * 24)), "day");

  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatDraftMeta(status: string, relativeEdit: string | null) {
  return [status, relativeEdit ? `Edited ${relativeEdit}` : null].filter(Boolean).join(" - ");
}

function StudioEntryCard({
  title,
  subtitle,
  active,
  icon: Icon,
  onClick,
}: {
  title: string;
  subtitle: string;
  active: boolean;
  icon: typeof FilePlus2;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-[26px] border px-4 py-4 text-left transition",
        active
          ? "border-primary/45 bg-[linear-gradient(180deg,rgba(177,18,38,0.22),rgba(15,16,18,0.96))]"
          : "border-white/10 bg-[linear-gradient(180deg,rgba(21,24,29,0.94),rgba(10,11,13,0.98))] hover:border-primary/35",
      )}
    >
      <div className="absolute inset-y-0 right-0 w-24 bg-[radial-gradient(circle_at_center,rgba(255,45,77,0.16),transparent_72%)] opacity-80 transition group-hover:opacity-100" />
      <div className="relative flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/10 bg-white/[0.04] text-primary shadow-[0_12px_24px_rgba(177,18,38,0.18)]">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <ChevronRight className="h-4 w-4 text-white/40 transition group-hover:text-white/80" />
      </div>
    </button>
  );
}

export function DesignStudioHome({
  documents,
  publications,
  isLoading,
  isWorking = false,
  onBack,
  onOpenSettings,
  onOpenDocument,
  onCreatePrimary,
  onImportCommunityStarter,
  initialSection = "home",
  embedded = false,
}: DesignStudioHomeProps) {
  const [activeSection, setActiveSection] = useState<StudioHomeSection>(initialSection);

  const publishedDocumentIds = useMemo(() => new Set(publications.map((entry) => entry.documentId)), [publications]);
  const drafts = useMemo(
    () =>
      [...documents]
        .filter((record) => record.kind !== "template")
        .sort((a, b) => (parseDate(b.updatedAt)?.getTime() || 0) - (parseDate(a.updatedAt)?.getTime() || 0)),
    [documents],
  );
  const recentDrafts = drafts.slice(0, activeSection === "home" ? 3 : 12);

  const showRecents = activeSection === "home" || activeSection === "recents";
  const showCommunity = activeSection === "community";
  const showNew = activeSection === "new";

  return (
    <div className={cn(embedded ? "space-y-6" : "-mx-4 min-h-[calc(100vh-5rem)] px-4 pb-16 pt-2")}>
      <div className="relative overflow-hidden rounded-[34px] border border-white/8 bg-[#060709] shadow-[0_36px_120px_rgba(0,0,0,0.55)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,45,77,0.16),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(177,18,38,0.2),transparent_36%)]" />
        <div className="absolute inset-x-0 top-0 h-40 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),transparent)]" />
        <div className="absolute -right-10 top-20 h-48 w-48 rounded-full bg-[#ff3654]/12 blur-3xl" />
        <div className="absolute -left-10 bottom-16 h-40 w-40 rounded-full bg-[#7a0f1f]/30 blur-3xl" />

        <div className="relative space-y-6 px-4 pb-8 pt-4 md:px-6 md:pb-10 md:pt-5">
          <div className="flex items-center gap-3">
            {onBack ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
                onClick={onBack}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-[0.35em] text-white/45">Archivist</p>
              <h2 className="truncate font-display text-[1.35rem] font-bold text-white md:text-[1.55rem]">Design Studio</h2>
            </div>
            {onOpenSettings ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full border border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/[0.08]"
                onClick={onOpenSettings}
              >
                <Settings2 className="h-4 w-4" />
              </Button>
            ) : null}
          </div>

          <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,20,24,0.92),rgba(9,10,12,0.96))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="absolute inset-y-0 right-0 w-24 bg-[radial-gradient(circle_at_center,rgba(255,50,76,0.18),transparent_70%)]" />
            <div className="relative flex items-center gap-3">
              <div className="relative shrink-0">
                <div className="absolute inset-0 rounded-[22px] bg-[#ff3554]/30 blur-xl" />
                <img
                  src={archivistAvatar}
                  alt="Archivist"
                  className="relative h-14 w-14 rounded-[18px] border border-white/10 object-cover shadow-[0_14px_30px_rgba(177,18,38,0.35)]"
                />
              </div>
              <div className="min-w-0 flex-1">
                <Badge className="mb-2 border-none bg-primary/20 text-primary-foreground shadow-[0_0_24px_rgba(255,45,77,0.18)]">
                  Archivist Build Space
                </Badge>
                <p className="text-sm font-semibold text-white">Start simple, then scale up only if you need more.</p>
                <p className="text-xs text-muted-foreground">
                  Pick a fresh build, reopen a draft, or pull in a shared starter without walking through structure first.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <StudioEntryCard
              title="New"
              subtitle="Start a fresh message flow"
              active={activeSection === "new"}
              icon={Plus}
              onClick={() => setActiveSection("new")}
            />
            <StudioEntryCard
              title="Recents"
              subtitle="Reopen recent drafts fast"
              active={activeSection === "recents"}
              icon={FileClock}
              onClick={() => setActiveSection("recents")}
            />
            <StudioEntryCard
              title="Community Shared"
              subtitle="Import a polished starter"
              active={activeSection === "community"}
              icon={UsersRound}
              onClick={() => setActiveSection("community")}
            />
          </div>

          {showNew ? (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-white">Choose what to create</p>
                <p className="text-xs text-muted-foreground">Jump directly into the editor built for that message type.</p>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {(Object.entries(PRIMARY_TYPE_COPY) as Array<[StudioPrimarySurfaceType, (typeof PRIMARY_TYPE_COPY)[StudioPrimarySurfaceType]]>).map(
                  ([type, copy]) => {
                    const Icon = type === "message" ? FilePlus2 : type === "embed" ? Sparkles : Workflow;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => onCreatePrimary(type)}
                        disabled={isWorking}
                        className="group relative overflow-hidden rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(21,24,29,0.94),rgba(10,11,13,0.98))] px-4 py-4 text-left transition hover:-translate-y-0.5 hover:border-primary/45 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <div className="absolute inset-y-0 right-0 w-20 bg-[radial-gradient(circle_at_center,rgba(255,45,77,0.14),transparent_72%)] opacity-75 transition group-hover:opacity-100" />
                        <div className="relative space-y-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/10 bg-white/[0.04] text-primary shadow-[0_12px_24px_rgba(177,18,38,0.18)]">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.32em] text-white/40">{copy.eyebrow}</p>
                            <p className="mt-1 text-base font-semibold text-white">{copy.title}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{copy.subtitle}</p>
                          </div>
                        </div>
                      </button>
                    );
                  },
                )}
              </div>
            </div>
          ) : null}

          {showRecents ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">Recent Drafts</p>
                  <p className="text-xs text-muted-foreground">Open the draft you were just working on.</p>
                </div>
                {activeSection !== "recents" ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rounded-full border border-white/10 bg-white/[0.03] px-3 text-white/75 hover:bg-white/[0.06]"
                    onClick={() => setActiveSection("recents")}
                  >
                    View all
                  </Button>
                ) : null}
              </div>

              <div className="grid gap-2">
                {isLoading
                  ? Array.from({ length: activeSection === "recents" ? 6 : 3 }).map((_, index) => (
                      <div key={`studio-home-skeleton-${index}`} className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                        <div className="h-4 w-32 rounded bg-white/8" />
                        <div className="mt-2 h-3 w-44 rounded bg-white/5" />
                      </div>
                    ))
                  : null}

                {!isLoading && recentDrafts.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-5 text-sm text-muted-foreground">
                    No drafts yet. Start with a plain message, embed, or interactive message.
                  </div>
                ) : null}

                {!isLoading
                  ? recentDrafts.map((record) => {
                      const statusLabel = publishedDocumentIds.has(record.id) ? "Published" : "Draft";
                      const relativeEdit = formatRelativeEditTime(record.updatedAt);
                      const primaryType = inferStudioPrimarySurfaceType(record.document);

                      return (
                        <button
                          key={`recent-draft-${record.id}`}
                          type="button"
                          onClick={() => onOpenDocument(record.id)}
                          className="flex w-full items-center justify-between gap-3 rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4 text-left transition hover:border-primary/35 hover:bg-white/[0.05]"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">{record.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{formatDraftMeta(statusLabel, relativeEdit)}</p>
                          </div>
                          <Badge variant="outline" className="border-white/10 bg-white/[0.03] text-white/70">
                            {PRIMARY_TYPE_COPY[primaryType].title}
                          </Badge>
                        </button>
                      );
                    })
                  : null}
              </div>
            </div>
          ) : null}

          {showCommunity ? (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-white">Community Shared</p>
                <p className="text-xs text-muted-foreground">Import a curated starter and customize it in your own Studio draft.</p>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {STUDIO_COMMUNITY_STARTERS.map((starter) => (
                  <Card key={starter.id} className="overflow-hidden rounded-[26px] border-white/10 bg-[linear-gradient(180deg,rgba(21,24,29,0.94),rgba(10,11,13,0.98))] shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
                    <CardContent className="space-y-4 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <Badge variant="outline" className="border-white/10 bg-white/[0.03] text-white/70">
                          {starter.eyebrow}
                        </Badge>
                        <Badge className="border-none bg-primary/15 text-white">
                          {PRIMARY_TYPE_COPY[starter.primaryType].title}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-base font-semibold text-white">{starter.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{starter.description}</p>
                      </div>
                      <Button className="w-full gap-2" onClick={() => onImportCommunityStarter(starter.id)} disabled={isWorking}>
                        <Library className="h-4 w-4" />
                        Use This Starter
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
