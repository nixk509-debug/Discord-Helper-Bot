import {
  SITE_EDITOR_SURFACE_LABELS,
  type SiteEditorField,
  type SiteEditorSection,
  type SiteEditorSurfaceDocument,
  type SiteEditorSurfaceKey,
} from "@shared/site-editor";

export type { SiteEditorSurfaceDocument, SiteEditorSurfaceKey };

export type SiteEditorMode = "draft" | "preview" | "publish";
export type SiteEditorFieldDefinition = SiteEditorField;
export type SiteEditorSectionDefinition = SiteEditorSection;

export interface SiteEditorSurfaceRecord {
  surface: SiteEditorSurfaceKey;
  draft: SiteEditorSurfaceDocument;
  published: SiteEditorSurfaceDocument;
  lastSavedAt: string;
  lastPublishedAt: string | null;
  dirty: boolean;
}

export interface SiteEditorWorkspaceState {
  activeSurface: SiteEditorSurfaceKey;
  activeMode: SiteEditorMode;
  surfaces: Record<SiteEditorSurfaceKey, SiteEditorSurfaceRecord>;
}

export const SITE_EDITOR_SURFACE_ORDER: SiteEditorSurfaceKey[] = ["landing", "login", "dashboard_shell"];

const SITE_EDITOR_SURFACE_DESCRIPTIONS: Record<SiteEditorSurfaceKey, string> = {
  landing: "Homepage copy, trust sections, and calls to action.",
  login: "Sign-in copy, trust notes, and owner access messaging.",
  dashboard_shell: "Shared shell text, invite actions, and footer guidance.",
};

export function getSiteEditorSurfaceLabel(surface: SiteEditorSurfaceKey) {
  return SITE_EDITOR_SURFACE_LABELS[surface];
}

export function getSiteEditorSurfaceDescription(surface: SiteEditorSurfaceKey) {
  return SITE_EDITOR_SURFACE_DESCRIPTIONS[surface];
}

export function duplicateSiteEditorSurfaceDocument(document: SiteEditorSurfaceDocument): SiteEditorSurfaceDocument {
  return JSON.parse(JSON.stringify(document)) as SiteEditorSurfaceDocument;
}

export function moveSiteEditorSection(
  sections: SiteEditorSectionDefinition[],
  sectionId: string,
  direction: "up" | "down",
) {
  const currentIndex = sections.findIndex((section) => section.id === sectionId);
  if (currentIndex === -1) return sections;

  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= sections.length) return sections;

  const next = sections.map((section) => ({ ...section, fields: [...section.fields] }));
  const [moved] = next.splice(currentIndex, 1);
  next.splice(targetIndex, 0, moved);

  return next.map((section, index) => ({
    ...section,
    order: index,
  }));
}

export function getSiteEditorFieldValue(section: SiteEditorSectionDefinition | null | undefined, fieldKey: string) {
  if (!section) return "";
  return section.fields.find((field) => field.key === fieldKey)?.value ?? "";
}
