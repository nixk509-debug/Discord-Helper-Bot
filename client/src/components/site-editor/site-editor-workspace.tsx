import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, RotateCcw, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SurfacePanel } from "@/components/layout/archivist-surfaces";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { useSiteEditorWorkspace } from "@/hooks/use-site-editor";
import { getSiteEditorSurfaceDescription, getSiteEditorSurfaceLabel } from "@/lib/site-editor";
import { SiteEditorPreview } from "./site-editor-preview";
import { SiteEditorSectionCard } from "./site-editor-section-card";
import { SiteEditorSectionSheet } from "./site-editor-section-sheet";
import { SiteEditorSurfaceTabs } from "./site-editor-surface-tabs";

export function SiteEditorWorkspace() {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const {
    hydrated,
    activeSurface,
    activeMode,
    currentRecord,
    setActiveSurface,
    setActiveMode,
    updateSurfaceDraft,
    saveDraft,
    publishSurface,
    resetDraft,
    moveSection,
  } = useSiteEditorWorkspace();
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);

  const surfaceDocument = currentRecord.draft;
  const publishedDocument = currentRecord.published;
  const editingSection = useMemo(
    () => surfaceDocument.sections.find((section) => section.id === editingSectionId) || null,
    [editingSectionId, surfaceDocument.sections],
  );

  useEffect(() => {
    if (!editingSectionId) return;
    if (surfaceDocument.sections.some((section) => section.id === editingSectionId)) return;
    setEditingSectionId(surfaceDocument.sections[0]?.id ?? null);
  }, [editingSectionId, surfaceDocument.sections]);

  const dirtySections = surfaceDocument.sections.filter((section) => section.visible).length;
  const hiddenSections = surfaceDocument.sections.filter((section) => !section.visible).length;
  const changed = currentRecord.dirty || JSON.stringify(surfaceDocument) !== JSON.stringify(publishedDocument);
  const selectedSurfaceLabel = getSiteEditorSurfaceLabel(activeSurface);

  function updateField(sectionId: string, fieldKey: string, value: string) {
    updateSurfaceDraft(activeSurface, (draft) => ({
      ...draft,
      sections: draft.sections.map((section) => {
        if (section.id !== sectionId) return section;
        return {
          ...section,
          fields: section.fields.map((field) => (field.key === fieldKey ? { ...field, value } : field)),
        };
      }),
    }));
  }

  function toggleSectionVisible(sectionId: string) {
    updateSurfaceDraft(activeSurface, (draft) => ({
      ...draft,
      sections: draft.sections.map((section) => (section.id === sectionId ? { ...section, visible: !section.visible } : section)),
    }));
  }

  function moveActiveSection(sectionId: string, direction: "up" | "down") {
    moveSection(activeSurface, sectionId, direction);
  }

  async function handleSaveDraft() {
    try {
      await saveDraft(activeSurface);
      toast({ title: "Draft saved", description: `${selectedSurfaceLabel} changes are stored as a draft.` });
    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Could not save the draft.",
        variant: "destructive",
      });
    }
  }

  async function handlePublish() {
    try {
      await publishSurface(activeSurface);
      toast({ title: "Published", description: `${selectedSurfaceLabel} was published successfully.` });
    } catch (error) {
      toast({
        title: "Publish failed",
        description: error instanceof Error ? error.message : "Could not publish the surface.",
        variant: "destructive",
      });
    }
  }

  async function handleReset() {
    try {
      await resetDraft(activeSurface);
      toast({ title: "Draft reset", description: `${selectedSurfaceLabel} draft restored from the published snapshot.` });
    } catch (error) {
      toast({
        title: "Reset failed",
        description: error instanceof Error ? error.message : "Could not reset the draft.",
        variant: "destructive",
      });
    }
  }

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <SurfacePanel>
          <div className="px-4 py-5 md:px-6">
            <p className="archivist-eyebrow">Archivist Site Editor</p>
            <h1 className="mt-2 text-2xl font-semibold text-white">Loading surfaces...</h1>
          </div>
        </SurfacePanel>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-[calc(env(safe-area-inset-bottom)+6rem)]">
      <SurfacePanel>
        <div className="border-b border-white/6 px-4 py-4 md:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2.5">
              <div className="flex flex-wrap gap-2">
                <Badge variant="default">Owner only</Badge>
                <Badge variant="secondary">Drafts before publish</Badge>
              </div>
              <div>
                <p className="archivist-eyebrow">Archivist Site Editor</p>
                <h1 className="mt-1.5 text-xl font-semibold text-white md:text-3xl">
                  Edit live surfaces from one calmer mobile workspace.
                </h1>
                <p className="mt-1.5 max-w-3xl text-sm leading-6 text-white/60">
                  Landing, login, and dashboard shell content stay structured, previewable, and saved as drafts until you explicitly publish.
                </p>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <MiniStat label="Draft" value={changed ? "Awaiting publish" : "Synced"} tone={changed ? "warning" : "healthy"} />
              <MiniStat label="Visible sections" value={String(dirtySections)} />
              <MiniStat label="Hidden sections" value={String(hiddenSections)} />
            </div>
          </div>
        </div>

        <div className="space-y-4 px-4 py-4 md:px-6">
          <SiteEditorSurfaceTabs value={activeSurface} onChange={setActiveSurface} />

          <Tabs value={activeMode} onValueChange={(next) => setActiveMode(next as typeof activeMode)}>
            <TabsList className="archivist-segment h-auto w-full grid-cols-3">
              <TabsTrigger value="draft" className="archivist-segment-button rounded-[14px] data-[state=active]:bg-white data-[state=active]:text-[#0d1014]">
                Draft
              </TabsTrigger>
              <TabsTrigger value="preview" className="archivist-segment-button rounded-[14px] data-[state=active]:bg-white data-[state=active]:text-[#0d1014]">
                Preview
              </TabsTrigger>
              <TabsTrigger value="publish" className="archivist-segment-button rounded-[14px] data-[state=active]:bg-white data-[state=active]:text-[#0d1014]">
                Publish
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="hidden md:flex md:flex-wrap md:items-center md:gap-2">
            <div className="archivist-action-rail">
              <Button variant="outline" onClick={handleSaveDraft}>
                <Save className="h-4 w-4" />
                Save draft
              </Button>
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
              <Button onClick={handlePublish}>
                <CheckCircle2 className="h-4 w-4" />
                Publish
              </Button>
            </div>
          </div>
        </div>
      </SurfacePanel>

      {activeMode === "draft" ? (
        <SurfacePanel>
          <div className="border-b border-white/6 px-4 py-4 md:px-6">
            <p className="text-sm font-semibold text-white">Draft sections</p>
            <p className="mt-1 text-sm leading-6 text-white/56">
              Tap a section to edit its fields. Move sections up or down to change the page order.
            </p>
          </div>
          <div className="space-y-3 px-4 py-4 md:px-6">
            {surfaceDocument.sections.map((section, index) => (
              <SiteEditorSectionCard
                key={section.id}
                section={section}
                isFirst={index === 0}
                isLast={index === surfaceDocument.sections.length - 1}
                onEdit={() => setEditingSectionId(section.id)}
                onMove={(direction) => moveActiveSection(section.id, direction)}
                onToggleVisible={() => toggleSectionVisible(section.id)}
              />
            ))}
          </div>
        </SurfacePanel>
      ) : null}

      {activeMode === "preview" ? (
        <SurfacePanel>
          <div className="border-b border-white/6 px-4 py-4 md:px-6">
            <p className="text-sm font-semibold text-white">Surface preview</p>
            <p className="mt-1 text-sm leading-6 text-white/56">
              This is the current draft version of the {selectedSurfaceLabel.toLowerCase()} surface.
            </p>
          </div>
          <div className="px-4 py-4 md:px-6">
            <SiteEditorPreview surface={activeSurface} document={surfaceDocument} />
          </div>
        </SurfacePanel>
      ) : null}

      {activeMode === "publish" ? (
        <SurfacePanel>
          <div className="border-b border-white/6 px-4 py-4 md:px-6">
            <p className="text-sm font-semibold text-white">Publish summary</p>
            <p className="mt-1 text-sm leading-6 text-white/56">
              Review the draft, then publish it to make it live on the site.
            </p>
          </div>
          <div className="space-y-4 px-4 py-4 md:px-6">
            <Card className="border-white/8 bg-[#111318]">
              <CardContent className="space-y-3 p-4">
                <ChangeRow label="Surface" value={selectedSurfaceLabel} />
                <ChangeRow label="Summary" value={getSiteEditorSurfaceDescription(activeSurface)} />
                <ChangeRow label="Visible sections" value={String(surfaceDocument.sections.filter((section) => section.visible).length)} />
                <ChangeRow
                  label="Published"
                  value={currentRecord.lastPublishedAt ? new Date(currentRecord.lastPublishedAt).toLocaleString() : "Not yet published"}
                />
              </CardContent>
            </Card>

            <div className="rounded-[22px] border border-white/8 bg-[#111318] p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-[#ff7b8d]" />
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-white">Publish makes the draft live</p>
                  <p className="text-sm leading-6 text-white/62">
                    The published snapshot becomes the site source for landing, login, and the dashboard shell.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </SurfacePanel>
      ) : null}

      <SiteEditorSectionSheet
        open={Boolean(editingSection)}
        onOpenChange={(open) => {
          if (!open) setEditingSectionId(null);
        }}
        section={editingSection}
        isMobile={isMobile}
        onFieldChange={(fieldKey, value) => {
          if (!editingSection) return;
          updateField(editingSection.id, fieldKey, value);
        }}
        onToggleVisible={() => {
          if (!editingSection) return;
          toggleSectionVisible(editingSection.id);
        }}
        onMove={(direction) => {
          if (!editingSection) return;
          moveActiveSection(editingSection.id, direction);
        }}
      />

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/8 bg-[#090a0d]/95 px-3 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl md:hidden">
        <div className="mx-auto flex max-w-7xl gap-2">
          <Button className="flex-1 rounded-[16px]" onClick={handleSaveDraft}>
            Save draft
          </Button>
          <Button variant="outline" className="flex-1 rounded-[16px] border-white/10 bg-white/[0.03] text-white" onClick={handlePublish}>
            Publish
          </Button>
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "warning" | "healthy";
}) {
  const toneClass =
    tone === "warning"
      ? "border-amber-500/20 bg-amber-500/[0.08]"
      : tone === "healthy"
        ? "border-emerald-500/20 bg-emerald-500/[0.08]"
        : "border-white/8 bg-[#111318]";

  return (
    <div className={`rounded-[18px] border px-3 py-3 ${toneClass}`}>
      <p className="text-[11px] font-medium tracking-[0.08em] text-white/48">{label}</p>
      <p className="mt-1 text-sm font-medium text-white">{value}</p>
    </div>
  );
}

function ChangeRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-[18px] border border-white/8 bg-[#15181e] px-4 py-3">
      <p className="text-sm text-white/58">{label}</p>
      <p className="max-w-[65%] text-right text-sm font-medium text-white">{value}</p>
    </div>
  );
}
