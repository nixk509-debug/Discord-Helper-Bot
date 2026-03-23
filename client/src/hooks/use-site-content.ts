import { useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { SiteEditorSurfaceDocument, SiteEditorSurfaceKey } from "@shared/site-editor";
import { buildApiUrl } from "@/lib/http";

export function usePublishedSiteSurface(
  surface: SiteEditorSurfaceKey,
  options?: { enabled?: boolean; staleTime?: number },
) {
  return useQuery<SiteEditorSurfaceDocument>({
    queryKey: [api.siteEditor.published.get.path, surface],
    queryFn: async () => {
      const url = buildUrl(api.siteEditor.published.get.path, { surface });
      const res = await fetch(buildApiUrl(url), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch published surface content");
      return await res.json();
    },
    enabled: options?.enabled ?? true,
    staleTime: options?.staleTime ?? 60_000,
  });
}
