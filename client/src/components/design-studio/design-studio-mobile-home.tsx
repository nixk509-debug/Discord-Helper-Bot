import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  FilePlus2,
  Library,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Workflow,
} from "lucide-react";
import archivistAvatar from "@assets/archivist-avatar.png";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  inferStudioPrimarySurfaceType,
  type StudioPrimarySurfaceType,
} from "@/components/design-studio/studio-defaults";
import type { StudioDocumentRecord, StudioModuleBinding, StudioPublication } from "@shared/schema";

type ChooserStep = "type" | "action" | "existing" | "templates";

interface DesignStudioMobileHomeProps {
  documents: StudioDocumentRecord[];
  publications: StudioPublication[];
  isLoading: boolean;
  isCreating: boolean;
  onBack: () => void;
  onOpenSettings?: () => void;
  onOpenDocument: (documentId: number) => void;
  onCreatePrimary: (primaryType: StudioPrimarySurfaceType) => void;
  onCreateTemplate: () => void;
  onCreateModuleTemplate: (binding: StudioModuleBinding) => void;
}

const PRIMARY_TYPE_COPY: Record<StudioPrimarySurfaceType, { title: string; subtitle: string; eyebrow: string }> = {
  message: {
    title: "Plain Message",
    subtitle: "Build anything from scratch",
    eyebrow: "Message surface",
  },
  embed: {
    title: "Embed",
    subtitle: "Rich message with fields, images, and color",
    eyebrow: "Visual payload",
  },
  components: {
    title: "Interactive Message",
    subtitle: "Interactive layouts, buttons, and menus",
    eyebrow: "Interaction layer",
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

function isSecondaryTemplate(record: StudioDocumentRecord) {
  return record.kind === "template" || Boolean(record.moduleBinding);
}

function formatDraftMeta(status: string, relativeEdit: string | null) {
  return [status, relativeEdit ? `Edited ${relativeEdit}` : null].filter(Boolean).join(" - ");
}

function ActionCard({
  title,
  subtitle,
  onClick,
  disabled = false,
}: {
  title: string;
  subtitle: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center justify-between gap-3 rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4 text-left transition hover:border-primary/40 hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-60"
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}

export function DesignStudioMobileHome({
  documents,
  publications,
  isLoading,
  isCreating,
  onBack,
  onOpenSettings,
  onOpenDocument,
  onCreatePrimary,
  onCreateTemplate,
  onCreateModuleTemplate,
}: DesignStudioMobileHomeProps) {
  const [chooserOpen, setChooserOpen] = useState(false);
  const [chooserStep, setChooserStep] = useState<ChooserStep>("type");
  const [selectedPrimaryType, setSelectedPrimaryType] = useState<StudioPrimarySurfaceType | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [focusSearchOnOpen, setFocusSearchOnOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const publishedDocumentIds = useMemo(() => new Set(publications.map((entry) => entry.documentId)), [publications]);

  const primaryRecords = useMemo(() => {
    return [...documents]
      .filter((record) => !isSecondaryTemplate(record))
      .sort((a, b) => (parseDate(b.updatedAt)?.getTime() || 0) - (parseDate(a.updatedAt)?.getTime() || 0));
  }, [documents]);

  const templateRecords = useMemo(() => {
    return [...documents]
      .filter(isSecondaryTemplate)
      .sort((a, b) => (parseDate(b.updatedAt)?.getTime() || 0) - (parseDate(a.updatedAt)?.getTime() || 0));
  }, [documents]);

  const recentDrafts = primaryRecords.slice(0, 3);

  const existingDrafts = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return primaryRecords.filter((record) => {
      if (selectedPrimaryType && inferStudioPrimarySurfaceType(record.document) !== selectedPrimaryType) {
        return false;
      }

      if (!normalizedSearch) return true;

      const haystack = [
        record.name,
        record.moduleBinding || "",
        inferStudioPrimarySurfaceType(record.document),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [primaryRecords, searchQuery, selectedPrimaryType]);

  useEffect(() => {
    if (!chooserOpen || chooserStep !== "existing" || !focusSearchOnOpen) return;
    const handle = window.requestAnimationFrame(() => searchInputRef.current?.focus());
    return () => window.cancelAnimationFrame(handle);
  }, [chooserOpen, chooserStep, focusSearchOnOpen]);

  const openPrimaryChooser = (primaryType: StudioPrimarySurfaceType) => {
    setSelectedPrimaryType(primaryType);
    setSearchQuery("");
    setFocusSearchOnOpen(false);
    setChooserStep("action");
    setChooserOpen(true);
  };

  const openGlobalChooser = () => {
    setSelectedPrimaryType(null);
    setSearchQuery("");
    setFocusSearchOnOpen(false);
    setChooserStep("type");
    setChooserOpen(true);
  };

  const openExistingChooser = (focusSearch = false) => {
    setSelectedPrimaryType(null);
    setSearchQuery("");
    setFocusSearchOnOpen(focusSearch);
    setChooserStep("existing");
    setChooserOpen(true);
  };

  const selectedCopy = selectedPrimaryType ? PRIMARY_TYPE_COPY[selectedPrimaryType] : null;

  return (
    <>
      <div className="-mx-4 min-h-[calc(100vh-5rem)] px-4 pb-28 pt-2">
        <div className="relative overflow-hidden rounded-[34px] border border-white/8 bg-[#060709] shadow-[0_36px_120px_rgba(0,0,0,0.55)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,45,77,0.16),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(177,18,38,0.2),transparent_36%)]" />
          <div className="absolute inset-x-0 top-0 h-40 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),transparent)]" />
          <div className="absolute -right-10 top-20 h-48 w-48 rounded-full bg-[#ff3654]/12 blur-3xl" />
          <div className="absolute -left-10 bottom-16 h-40 w-40 rounded-full bg-[#7a0f1f]/30 blur-3xl" />

          <div className="relative space-y-5 px-4 pb-8 pt-4">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
                onClick={onBack}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-[0.35em] text-white/45">Archivist</p>
                <h2 className="truncate font-display text-[1.35rem] font-bold text-white">Design Studio</h2>
              </div>
              <div className="flex items-center gap-1">
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-full border border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/[0.08]" onClick={() => openExistingChooser(true)}>
                  <Search className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-full border border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/[0.08]" onClick={() => openExistingChooser(false)}>
                  <Library className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-full border border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/[0.08]" onClick={onOpenSettings || onBack}>
                  <Settings2 className="h-4 w-4" />
                </Button>
              </div>
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
                  <p className="text-sm font-semibold text-white">What do you want to build?</p>
                  <p className="text-xs text-muted-foreground">
                    Start fresh, reopen a draft, or branch into templates when you need a preset flow.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {([
                { type: "message", icon: FilePlus2 },
                { type: "embed", icon: Sparkles },
                { type: "components", icon: Workflow },
              ] as const).map(({ type, icon: Icon }) => {
                const copy = PRIMARY_TYPE_COPY[type];

                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => openPrimaryChooser(type)}
                    className={cn(
                      "group relative w-full overflow-hidden rounded-[28px] border px-4 py-4 text-left transition",
                      "border-white/10 bg-[linear-gradient(180deg,rgba(21,24,29,0.94),rgba(10,11,13,0.98))]",
                      "shadow-[0_18px_40px_rgba(0,0,0,0.28)] hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-[0_24px_50px_rgba(0,0,0,0.42)]",
                    )}
                  >
                    <div className="absolute inset-y-0 right-0 w-28 bg-[radial-gradient(circle_at_center,rgba(255,45,77,0.14),transparent_72%)] opacity-80 transition group-hover:opacity-100" />
                    <div className="relative flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-[20px] border border-white/10 bg-white/[0.04] text-primary shadow-[0_12px_24px_rgba(177,18,38,0.18)]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] uppercase tracking-[0.32em] text-white/40">{copy.eyebrow}</p>
                        <p className="mt-1 text-base font-semibold text-white">{copy.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{copy.subtitle}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-white/35 transition group-hover:text-white/70" />
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">Recent Drafts</p>
                  <p className="text-xs text-muted-foreground">Jump back into what you were shaping last.</p>
                </div>
                <Button type="button" variant="ghost" size="sm" className="rounded-full border border-white/10 bg-white/[0.03] px-3 text-white/75 hover:bg-white/[0.06]" onClick={() => openExistingChooser(false)}>
                  View all
                </Button>
              </div>

              <div className="space-y-2">
                {isLoading ? Array.from({ length: 3 }).map((_, index) => (
                  <div key={`studio-mobile-skeleton-${index}`} className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                    <div className="h-4 w-32 rounded bg-white/8" />
                    <div className="mt-2 h-3 w-40 rounded bg-white/5" />
                  </div>
                )) : null}

                {!isLoading && recentDrafts.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-5 text-sm text-muted-foreground">
                    No drafts yet. Start with a message, embed, or interactive message.
                  </div>
                ) : null}

                {!isLoading ? recentDrafts.map((record) => {
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
                }) : null}
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={openGlobalChooser}
          className="fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full border border-primary/40 bg-[linear-gradient(180deg,#ff3654,#b11226)] text-white shadow-[0_20px_40px_rgba(177,18,38,0.42)] transition hover:scale-[1.03]"
          aria-label="Create or open from Design Studio"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      <Drawer
        open={chooserOpen}
        onOpenChange={(open) => {
          setChooserOpen(open);
          if (!open) {
            setSearchQuery("");
            setFocusSearchOnOpen(false);
            if (!selectedPrimaryType) setChooserStep("type");
          }
        }}
      >
        <DrawerContent className="max-h-[88vh] border-white/10 bg-[#090a0d]/95 px-4 pb-6">
          <DrawerHeader className="px-0">
            <div className="flex items-center gap-3">
              {chooserStep !== "type" ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
                  onClick={() => {
                    if (chooserStep === "existing" && selectedPrimaryType) {
                      setChooserStep("action");
                      return;
                    }
                    setChooserStep("type");
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              ) : null}
              <div>
                <DrawerTitle className="font-display text-xl text-white">
                  {chooserStep === "type"
                    ? "Choose a build type"
                    : chooserStep === "action"
                      ? selectedCopy?.title || "Create in Studio"
                      : chooserStep === "existing"
                        ? "Open an existing draft"
                        : "Templates"}
                </DrawerTitle>
                <DrawerDescription className="text-sm text-muted-foreground">
                  {chooserStep === "type"
                    ? "Start a new build path before deciding whether to create or reopen."
                    : chooserStep === "action"
                      ? "Choose whether to start fresh or reopen an existing draft for this build type."
                      : chooserStep === "existing"
                        ? "Resume a saved draft without leaving the Studio landing flow."
                        : "Templates keep presets and module-specific starters out of the main landing screen."}
                </DrawerDescription>
              </div>
            </div>
          </DrawerHeader>

          <div className="space-y-4 pb-2">
            {chooserStep === "type" ? (
              <>
                {(["message", "embed", "components"] as StudioPrimarySurfaceType[]).map((type) => (
                  <ActionCard
                    key={`chooser-type-${type}`}
                    title={PRIMARY_TYPE_COPY[type].title}
                    subtitle={PRIMARY_TYPE_COPY[type].subtitle}
                    onClick={() => {
                      setSelectedPrimaryType(type);
                      setChooserStep("action");
                    }}
                  />
                ))}
                <ActionCard
                  title="Templates"
                  subtitle="Welcome, ticket, verification, and saved reusable layouts"
                  onClick={() => setChooserStep("templates")}
                />
              </>
            ) : null}

            {chooserStep === "action" && selectedPrimaryType ? (
              <>
                <div className="rounded-[24px] border border-primary/20 bg-primary/10 px-4 py-4">
                  <p className="text-[10px] uppercase tracking-[0.32em] text-white/45">Selected type</p>
                  <p className="mt-2 text-base font-semibold text-white">{selectedCopy?.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{selectedCopy?.subtitle}</p>
                </div>
                <ActionCard
                  title={isCreating ? "Creating..." : "Create new"}
                  subtitle="Open a fresh builder for this type"
                  onClick={() => onCreatePrimary(selectedPrimaryType)}
                  disabled={isCreating}
                />
                <ActionCard
                  title="Open existing"
                  subtitle="Filter drafts to this type and continue editing"
                  onClick={() => {
                    setSearchQuery("");
                    setFocusSearchOnOpen(false);
                    setChooserStep("existing");
                  }}
                />
                <ActionCard
                  title="Templates"
                  subtitle="Browse secondary starters and reusable layouts"
                  onClick={() => setChooserStep("templates")}
                />
              </>
            ) : null}

            {chooserStep === "existing" ? (
              <>
                <div className="space-y-3">
                  <Input
                    ref={searchInputRef}
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search drafts"
                    className="border-white/10 bg-white/[0.04] text-white placeholder:text-white/35"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant={selectedPrimaryType === null ? "default" : "outline"} size="sm" onClick={() => setSelectedPrimaryType(null)}>
                      All
                    </Button>
                    {(["message", "embed", "components"] as StudioPrimarySurfaceType[]).map((type) => (
                      <Button
                        key={`existing-filter-${type}`}
                        type="button"
                        variant={selectedPrimaryType === type ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedPrimaryType(type)}
                      >
                        {PRIMARY_TYPE_COPY[type].title}
                      </Button>
                    ))}
                  </div>
                </div>

                {existingDrafts.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-muted-foreground">
                    No drafts match this selection yet.
                  </div>
                ) : null}

                <div className="space-y-2">
                  {existingDrafts.map((record) => {
                    const statusLabel = publishedDocumentIds.has(record.id) ? "Published" : "Draft";
                    const relativeEdit = formatRelativeEditTime(record.updatedAt);
                    const primaryType = inferStudioPrimarySurfaceType(record.document);

                    return (
                      <button
                        key={`existing-record-${record.id}`}
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
                  })}
                </div>

                {selectedPrimaryType ? (
                  <Button type="button" className="w-full" onClick={() => onCreatePrimary(selectedPrimaryType)} disabled={isCreating}>
                    {isCreating ? "Creating..." : `Create new ${PRIMARY_TYPE_COPY[selectedPrimaryType].title}`}
                  </Button>
                ) : null}
              </>
            ) : null}

            {chooserStep === "templates" ? (
              <>
                <div className="grid gap-2">
                  <ActionCard
                    title="Ticket Panel"
                    subtitle="Launcher, modal intake, and ticket routing starter"
                    onClick={() => onCreateModuleTemplate("ticket_panel")}
                  />
                  <ActionCard
                    title="Welcome Message"
                    subtitle="Onboarding message starter for new members"
                    onClick={() => onCreateModuleTemplate("welcome")}
                  />
                  <ActionCard
                    title="Verification Panel"
                    subtitle="Verification starter with a confirmation action"
                    onClick={() => onCreateModuleTemplate("verify")}
                  />
                  <ActionCard
                    title="Blank Template"
                    subtitle="Create a reusable template surface"
                    onClick={onCreateTemplate}
                  />
                </div>

                <div className="space-y-2 pt-2">
                  <p className="text-xs uppercase tracking-[0.28em] text-white/35">Saved Templates</p>
                  {templateRecords.length === 0 ? (
                    <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-muted-foreground">
                      No saved templates yet.
                    </div>
                  ) : null}
                  {templateRecords.map((record) => (
                    <button
                      key={`template-record-${record.id}`}
                      type="button"
                      onClick={() => onOpenDocument(record.id)}
                      className="flex w-full items-center justify-between gap-3 rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4 text-left transition hover:border-primary/35 hover:bg-white/[0.05]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{record.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {record.moduleBinding ? `${record.moduleBinding.replace(/_/g, " ")} starter` : "Template"}
                        </p>
                      </div>
                      <Badge variant="outline" className="border-white/10 bg-white/[0.03] text-white/70">
                        Template
                      </Badge>
                    </button>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
