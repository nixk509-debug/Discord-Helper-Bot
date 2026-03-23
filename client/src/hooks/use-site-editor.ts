import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import {
  buildDefaultSiteEditorDocument,
  type SiteEditorSurfaceKey,
  type SiteEditorSurfaceState,
} from "@shared/site-editor";
import { buildApiUrl } from "@/lib/http";
import {
  SITE_EDITOR_SURFACE_ORDER,
  duplicateSiteEditorSurfaceDocument,
  moveSiteEditorSection,
  type SiteEditorMode,
  type SiteEditorSurfaceDocument,
  type SiteEditorWorkspaceState,
} from "@/lib/site-editor";

function createFallbackWorkspace(): SiteEditorWorkspaceState {
  const now = new Date().toISOString();
  return {
    activeSurface: "landing",
    activeMode: "draft",
    surfaces: SITE_EDITOR_SURFACE_ORDER.reduce((accumulator, surface) => {
      const document = buildDefaultSiteEditorDocument(surface);
      accumulator[surface] = {
        surface,
        draft: duplicateSiteEditorSurfaceDocument(document),
        published: duplicateSiteEditorSurfaceDocument(document),
        lastSavedAt: now,
        lastPublishedAt: null,
        dirty: false,
      };
      return accumulator;
    }, {} as SiteEditorWorkspaceState["surfaces"]),
  };
}

function mapSurfaceStateToRecord(state: SiteEditorSurfaceState) {
  return {
    surface: state.surfaceKey,
    draft: duplicateSiteEditorSurfaceDocument(state.draftContent),
    published: duplicateSiteEditorSurfaceDocument(state.publishedContent),
    lastSavedAt: state.updatedAt ?? new Date().toISOString(),
    lastPublishedAt: state.publishedAt ?? null,
    dirty: state.hasUnpublishedChanges,
  };
}

function mapSurfaceListToWorkspace(
  surfaces: SiteEditorSurfaceState[],
  current: SiteEditorWorkspaceState,
): SiteEditorWorkspaceState {
  const nextSurfaces = { ...current.surfaces };
  for (const state of surfaces) {
    nextSurfaces[state.surfaceKey] = mapSurfaceStateToRecord(state);
  }
  return {
    ...current,
    surfaces: nextSurfaces,
  };
}

export function useSiteEditorWorkspace() {
  const qc = useQueryClient();
  const [workspace, setWorkspace] = useState<SiteEditorWorkspaceState>(() => createFallbackWorkspace());
  const [hydrated, setHydrated] = useState(false);

  const surfacesQuery = useQuery<SiteEditorSurfaceState[]>({
    queryKey: [api.siteEditor.admin.list.path],
    queryFn: async () => {
      const res = await fetch(buildApiUrl(api.siteEditor.admin.list.path), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch site editor surfaces");
      return await res.json();
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!surfacesQuery.data) return;
    setWorkspace((current) => mapSurfaceListToWorkspace(surfacesQuery.data, current));
    setHydrated(true);
  }, [surfacesQuery.data]);

  useEffect(() => {
    if (surfacesQuery.isError && !hydrated) {
      setHydrated(true);
    }
  }, [hydrated, surfacesQuery.isError]);

  const saveDraftMutation = useMutation({
    mutationFn: async ({
      surface,
      draftContent,
    }: {
      surface: SiteEditorSurfaceKey;
      draftContent: SiteEditorSurfaceDocument;
    }) => {
      const url = buildUrl(api.siteEditor.admin.saveDraft.path, { surface });
      const res = await fetch(buildApiUrl(url), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftContent }),
        credentials: "include",
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.message || "Failed to save site editor draft");
      }
      return await res.json() as SiteEditorSurfaceState;
    },
    onSuccess: (state) => {
      qc.setQueryData<SiteEditorSurfaceState[] | undefined>([api.siteEditor.admin.list.path], (current) => {
        const existing = Array.isArray(current) ? current.filter((entry) => entry.surfaceKey !== state.surfaceKey) : [];
        return [...existing, state];
      });
      setWorkspace((current) => ({
        ...current,
        surfaces: {
          ...current.surfaces,
          [state.surfaceKey]: mapSurfaceStateToRecord(state),
        },
      }));
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (surface: SiteEditorSurfaceKey) => {
      const url = buildUrl(api.siteEditor.admin.publish.path, { surface });
      const res = await fetch(buildApiUrl(url), {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.message || "Failed to publish surface");
      }
      return await res.json() as SiteEditorSurfaceState;
    },
    onSuccess: (state) => {
      qc.setQueryData<SiteEditorSurfaceState[] | undefined>([api.siteEditor.admin.list.path], (current) => {
        const existing = Array.isArray(current) ? current.filter((entry) => entry.surfaceKey !== state.surfaceKey) : [];
        return [...existing, state];
      });
      setWorkspace((current) => ({
        ...current,
        surfaces: {
          ...current.surfaces,
          [state.surfaceKey]: mapSurfaceStateToRecord(state),
        },
      }));
      qc.invalidateQueries({ queryKey: [api.siteEditor.published.get.path, state.surfaceKey] });
    },
  });

  const resetMutation = useMutation({
    mutationFn: async (surface: SiteEditorSurfaceKey) => {
      const url = buildUrl(api.siteEditor.admin.resetDraft.path, { surface });
      const res = await fetch(buildApiUrl(url), {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.message || "Failed to reset surface draft");
      }
      return await res.json() as SiteEditorSurfaceState;
    },
    onSuccess: (state) => {
      qc.setQueryData<SiteEditorSurfaceState[] | undefined>([api.siteEditor.admin.list.path], (current) => {
        const existing = Array.isArray(current) ? current.filter((entry) => entry.surfaceKey !== state.surfaceKey) : [];
        return [...existing, state];
      });
      setWorkspace((current) => ({
        ...current,
        surfaces: {
          ...current.surfaces,
          [state.surfaceKey]: mapSurfaceStateToRecord(state),
        },
      }));
    },
  });

  function updateSurfaceDraft(
    surface: SiteEditorSurfaceKey,
    updater: (draft: SiteEditorSurfaceDocument) => SiteEditorSurfaceDocument,
  ) {
    setWorkspace((current) => {
      const nextRecord = current.surfaces[surface];
      const nextDraft = updater(nextRecord.draft);
      return {
        ...current,
        surfaces: {
          ...current.surfaces,
          [surface]: {
            ...nextRecord,
            draft: nextDraft,
            dirty: true,
            lastSavedAt: new Date().toISOString(),
          },
        },
      };
    });
  }

  function setActiveSurface(activeSurface: SiteEditorSurfaceKey) {
    setWorkspace((current) => ({ ...current, activeSurface }));
  }

  function setActiveMode(activeMode: SiteEditorMode) {
    setWorkspace((current) => ({ ...current, activeMode }));
  }

  async function saveDraft(surface: SiteEditorSurfaceKey = workspace.activeSurface) {
    const draftContent = workspace.surfaces[surface].draft;
    return await saveDraftMutation.mutateAsync({ surface, draftContent });
  }

  async function publishSurface(surface: SiteEditorSurfaceKey = workspace.activeSurface) {
    return await publishMutation.mutateAsync(surface);
  }

  async function resetDraft(surface: SiteEditorSurfaceKey = workspace.activeSurface) {
    return await resetMutation.mutateAsync(surface);
  }

  function moveSection(surface: SiteEditorSurfaceKey, sectionId: string, direction: "up" | "down") {
    updateSurfaceDraft(surface, (draft) => ({
      ...draft,
      sections: moveSiteEditorSection(draft.sections, sectionId, direction),
    }));
  }

  return {
    workspace,
    hydrated,
    activeSurface: workspace.activeSurface,
    activeMode: workspace.activeMode,
    currentRecord: workspace.surfaces[workspace.activeSurface],
    isLoading: surfacesQuery.isLoading && !hydrated,
    error: surfacesQuery.error,
    setActiveSurface,
    setActiveMode,
    updateSurfaceDraft,
    saveDraft,
    publishSurface,
    resetDraft,
    moveSection,
  };
}
