import type { StudioDocument, StudioDraftMode, StudioNode, StudioNodeType } from "../schema";

const LAYOUT_V2_NODE_TYPES: StudioNodeType[] = [
  "container",
  "section",
  "text_display",
  "media_gallery",
  "file",
  "divider",
  "style_block",
];

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function collectNodeTypes(document: StudioDocument) {
  return Object.values(document.nodes || {}).map((node) => node.type);
}

function hasMessageBody(document: StudioDocument) {
  return Object.values(document.views || {}).some((view) =>
    Boolean(String(view.messageContent || "").trim()) || (Array.isArray(view.embeds) && view.embeds.length > 0),
  );
}

export function inferStudioDraftMode(document: StudioDocument): StudioDraftMode {
  if (document.meta?.mode) return document.meta.mode;
  if (hasMessageBody(document)) return "standard";
  const nodeTypes = collectNodeTypes(document);
  if (nodeTypes.some((type) => LAYOUT_V2_NODE_TYPES.includes(type))) {
    return "layout_v2";
  }
  return "standard";
}

export function isUploadedStudioAssetUrl(value: unknown) {
  const raw = String(value || "").trim();
  return raw.startsWith("/uploads/studio/") || raw.includes("/uploads/studio/");
}

export function createMigratedStudioDocument(document: StudioDocument) {
  const draft = cloneValue(document);
  const previousMode = draft.meta?.mode;
  const nextMode = inferStudioDraftMode(draft);
  const notes: string[] = [];
  let changed = false;

  if (!draft.meta.mode) {
    notes.push(`Draft mode inferred as ${nextMode}.`);
    draft.meta.mode = nextMode;
    changed = true;
  }

  if (!draft.meta.migration) {
    draft.meta.migration = {
      source: previousMode ? "mode_preserved" : "mode_inferred",
      normalizedAt: new Date().toISOString(),
      notes,
    };
    changed = true;
  } else {
    draft.meta.migration.source ||= previousMode ? "mode_preserved" : "mode_inferred";
    draft.meta.migration.normalizedAt ||= new Date().toISOString();
    draft.meta.migration.notes = [...(draft.meta.migration.notes || []), ...notes];
  }

  if (changed && !draft.meta.migration.backupDocument) {
    draft.meta.migration.backupDocument = cloneValue(document);
  }

  return {
    document: draft,
    changed,
    notes: draft.meta.migration.notes || [],
  };
}

export function getStudioNodePath(node: StudioNode) {
  return `nodes.${node.id}`;
}
