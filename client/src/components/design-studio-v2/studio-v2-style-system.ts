import type { StudioDocument, StudioThemePack } from "@shared/schema";

export interface StudioStylePresetDefinition {
  id: string;
  label: string;
  description: string;
  accentColor: string;
  borderStyle: NonNullable<StudioThemePack["borderStyle"]>;
  emojiStyle: NonNullable<StudioThemePack["emojiStyle"]>;
  spacingFeel: NonNullable<StudioThemePack["spacingFeel"]>;
}

export const STUDIO_STYLE_PRESETS: StudioStylePresetDefinition[] = [
  {
    id: "signal",
    label: "Signal",
    description: "The default Archivist look. Sharp chrome, balanced spacing, and a confident red line.",
    accentColor: "#E0001A",
    borderStyle: "soft",
    emojiStyle: "native",
    spacingFeel: "balanced",
  },
  {
    id: "operator",
    label: "Operator",
    description: "Denser control surfaces for system panels, verification gates, and operator-first flows.",
    accentColor: "#B51226",
    borderStyle: "strong",
    emojiStyle: "custom_first",
    spacingFeel: "compact",
  },
  {
    id: "broadcast",
    label: "Broadcast",
    description: "A more editorial preset for launches, announcements, and campaign-style hierarchy.",
    accentColor: "#FF4D5E",
    borderStyle: "soft",
    emojiStyle: "native",
    spacingFeel: "airy",
  },
  {
    id: "alert",
    label: "Alert",
    description: "High-contrast urgency for warnings, maintenance notices, and red-path messaging.",
    accentColor: "#FF3448",
    borderStyle: "strong",
    emojiStyle: "custom_first",
    spacingFeel: "compact",
  },
  {
    id: "clean_system",
    label: "Clean System",
    description: "Quiet chrome and colder spacing for calmer reusable layouts that still feel premium.",
    accentColor: "#D94A58",
    borderStyle: "minimal",
    emojiStyle: "native",
    spacingFeel: "balanced",
  },
];

const FALLBACK_PRESET_ID = "signal";

function ensureThemePackCollections(document: StudioDocument) {
  if (!document.design) {
    document.design = {};
  }
  if (!document.design.themePacks) {
    document.design.themePacks = [];
  }
  if (!document.libraries) {
    document.libraries = {
      dividerPresetIds: [],
      styleBlockIds: [],
      themePackIds: [],
    };
  }
  if (!Array.isArray(document.libraries.themePackIds)) {
    document.libraries.themePackIds = [];
  }
}

export function getStudioStylePresetDefinition(id?: string | null) {
  return STUDIO_STYLE_PRESETS.find((preset) => preset.id === id) || STUDIO_STYLE_PRESETS[0];
}

export function ensureActiveStudioThemePack(document: StudioDocument) {
  ensureThemePackCollections(document);
  const activeId = document.meta.themePackId || FALLBACK_PRESET_ID;
  let pack = document.design?.themePacks?.find((entry) => entry.id === activeId) || null;

  if (!pack) {
    const preset = getStudioStylePresetDefinition(activeId);
    pack = {
      id: preset.id,
      name: preset.label,
      accentColor: preset.accentColor,
      borderStyle: preset.borderStyle,
      emojiStyle: preset.emojiStyle,
      spacingFeel: preset.spacingFeel,
    };
    document.design!.themePacks!.push(pack);
  }

  if (!document.meta.themePackId) {
    document.meta.themePackId = pack.id;
  }

  if (!document.libraries.themePackIds.includes(pack.id)) {
    document.libraries.themePackIds.push(pack.id);
  }

  return pack;
}

export function getActiveStudioThemePack(document: StudioDocument) {
  const activeId = document.meta.themePackId || FALLBACK_PRESET_ID;
  return document.design?.themePacks?.find((entry) => entry.id === activeId) || null;
}

export function updateActiveStudioThemePack(document: StudioDocument, updater: (pack: StudioThemePack) => void) {
  const pack = ensureActiveStudioThemePack(document);
  updater(pack);

  if (!pack.name?.trim()) {
    const preset = getStudioStylePresetDefinition(pack.id);
    pack.name = preset.label;
  }
}

export function applyStudioStylePreset(document: StudioDocument, presetId: string) {
  const preset = getStudioStylePresetDefinition(presetId);
  ensureThemePackCollections(document);

  document.meta.themePackId = preset.id;

  const existingIndex = document.design!.themePacks!.findIndex((entry) => entry.id === preset.id);
  const nextPack: StudioThemePack = {
    id: preset.id,
    name: preset.label,
    accentColor: preset.accentColor,
    borderStyle: preset.borderStyle,
    emojiStyle: preset.emojiStyle,
    spacingFeel: preset.spacingFeel,
  };

  if (existingIndex === -1) {
    document.design!.themePacks!.push(nextPack);
  } else {
    document.design!.themePacks![existingIndex] = {
      ...document.design!.themePacks![existingIndex],
      ...nextPack,
    };
  }

  if (!document.libraries.themePackIds.includes(preset.id)) {
    document.libraries.themePackIds.push(preset.id);
  }
}

export function syncStudioThemeToDocument(document: StudioDocument, { onlyUnstyled = false }: { onlyUnstyled?: boolean } = {}) {
  const pack = ensureActiveStudioThemePack(document);
  const accentColor = String(pack.accentColor || "#E0001A");

  Object.values(document.views).forEach((view) => {
    view.embeds.forEach((embed) => {
      if (!onlyUnstyled || !embed.color) {
        embed.color = accentColor;
      }
    });
  });

  Object.values(document.nodes).forEach((node) => {
    if (node.type === "style_block") {
      const current = String(node.props.accentColor || "");
      if (!onlyUnstyled || !current) {
        node.props.accentColor = accentColor;
      }
    }
  });
}
