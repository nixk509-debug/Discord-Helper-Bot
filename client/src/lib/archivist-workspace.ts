export type ArchivistCanonicalSection = "commands" | "studio" | "fun" | "server";
export type ArchivistSection = ArchivistCanonicalSection | "creative" | "settings";

export interface ArchivistNavItem {
  id: string;
  section: ArchivistCanonicalSection;
  slug: string;
  label: string;
  description: string;
  icon:
    | "commands"
    | "studio"
    | "games"
    | "settings"
    | "overview"
    | "plus"
    | "logs"
    | "drafts"
    | "templates"
    | "roles"
    | "channels"
    | "permissions"
    | "backup";
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
  isBuilder?: boolean;
  hiddenFromNav?: boolean;
}

export interface ArchivistNavSection {
  id: ArchivistCanonicalSection;
  label: string;
  description: string;
  icon: ArchivistNavItem["icon"];
  items: ArchivistNavItem[];
}

const SECTION_ALIAS_MAP: Record<string, ArchivistCanonicalSection> = {
  creative: "fun",
  fun: "fun",
  settings: "server",
  server: "server",
  commands: "commands",
  studio: "studio",
};

const SLUG_ALIAS_MAP: Partial<Record<ArchivistCanonicalSection, Record<string, { section?: ArchivistCanonicalSection; slug: string }>>> = {
  commands: {
    "all-commands": { slug: "commands" },
    "import-export": { slug: "imports" },
    cooldowns: { slug: "testing" },
  },
  studio: {
    drafts: { slug: "ui-projects" },
    components: { slug: "components-v2" },
  },
  fun: {
    modules: { slug: "games" },
    economy: { slug: "shop" },
    leveling: { slug: "profile" },
    "daily-rewards": { slug: "achievements" },
    giveaways: { slug: "creative-tools" },
    trivia: { slug: "games" },
    leaderboards: { slug: "leaderboards" },
  },
  server: {
    overview: { slug: "overview" },
    general: { slug: "overview" },
    "server-config": { slug: "overview" },
    advanced: { slug: "overview" },
    roles: { slug: "roles" },
    channels: { slug: "channels" },
    permissions: { slug: "permissions" },
    logging: { slug: "logging" },
    notifications: { slug: "logging" },
    "signals-logging": { slug: "logging" },
    backups: { slug: "backups-sync" },
    "safety-recovery": { slug: "backups-sync" },
    "member-flow": { slug: "onboarding" },
    "channel-control": { slug: "channels" },
    "role-power": { slug: "roles" },
    "bot-engine": { slug: "overview" },
    "command-logic": { section: "commands", slug: "commands" },
  },
};

function normalizeSection(section?: string | null): ArchivistCanonicalSection {
  return SECTION_ALIAS_MAP[section || ""] ?? "commands";
}

function normalizeRoute(section?: string | null, slug?: string | null): {
  section: ArchivistCanonicalSection;
  slug: string | null;
} {
  let normalizedSection = normalizeSection(section);
  if (!slug) {
    return { section: normalizedSection, slug: null };
  }

  const alias = SLUG_ALIAS_MAP[normalizedSection]?.[slug];
  if (alias?.section) {
    normalizedSection = alias.section;
  }

  return {
    section: normalizedSection,
    slug: alias?.slug ?? slug,
  };
}

export const ARCHIVIST_NAVIGATION: ArchivistNavSection[] = [
  {
    id: "commands",
    label: "Custom Commands",
    description: "Command logic, variables, testing, logs, analytics, and import flows.",
    icon: "commands",
    items: [
      { id: "commands-overview", section: "commands", slug: "overview", label: "Overview", description: "Choose the next command workspace lane.", icon: "overview" },
      { id: "commands-all", section: "commands", slug: "commands", label: "Commands", description: "Open the command list, builder entry, and saved workflows.", icon: "commands" },
      { id: "commands-variables", section: "commands", slug: "variables", label: "Variables", description: "Keep reusable variable language and command inputs visible.", icon: "overview" },
      { id: "commands-cooldowns", section: "commands", slug: "testing", label: "Testing", description: "Review command readiness, cooldowns, and validation posture.", icon: "overview" },
      { id: "commands-logs", section: "commands", slug: "logs", label: "Logs", description: "Inspect runs, failures, and recent command activity.", icon: "logs" },
      { id: "commands-analytics", section: "commands", slug: "analytics", label: "Analytics", description: "See volume, pressure, and top command usage at a glance.", icon: "logs" },
      { id: "commands-import-export", section: "commands", slug: "imports", label: "Imports / Exports", description: "Validate, import, and migrate command workflows safely.", icon: "backup" },
      { id: "commands-create", section: "commands", slug: "create-command", label: "Create", description: "Focused workflow builder.", icon: "plus", primaryActionLabel: "Save Draft", isBuilder: true, hiddenFromNav: true },
      { id: "commands-slash", section: "commands", slug: "slash-commands", label: "Slash Commands", description: "Slash command subset.", icon: "commands", hiddenFromNav: true },
      { id: "commands-message", section: "commands", slug: "message-commands", label: "Message Commands", description: "Message command subset.", icon: "commands", hiddenFromNav: true },
      { id: "commands-auto", section: "commands", slug: "auto-responses", label: "Auto Responses", description: "Automated command subset.", icon: "commands", hiddenFromNav: true },
    ],
  },
  {
    id: "studio",
    label: "Design Studio",
    description: "Embeds, Components V2, UI projects, templates, brand, and assets.",
    icon: "studio",
    items: [
      { id: "studio-overview", section: "studio", slug: "overview", label: "Overview", description: "Choose the next visual system lane.", icon: "overview" },
      { id: "studio-embeds", section: "studio", slug: "embeds", label: "Embeds", description: "Design embed-driven message surfaces.", icon: "studio" },
      { id: "studio-components", section: "studio", slug: "components-v2", label: "Components V2", description: "Build interactive component-driven Discord interfaces.", icon: "studio" },
      { id: "studio-drafts", section: "studio", slug: "ui-projects", label: "UI Projects", description: "Open saved projects, drafts, and active visual systems.", icon: "drafts" },
      { id: "studio-templates", section: "studio", slug: "templates", label: "Templates", description: "Reuse saved design systems and deployment-ready templates.", icon: "templates" },
      { id: "studio-brand-kit", section: "studio", slug: "brand-kit", label: "Brand Kit", description: "Keep style direction, reusable patterns, and module identity aligned.", icon: "studio" },
      { id: "studio-assets", section: "studio", slug: "assets", label: "Assets", description: "Track documents with attached assets and media-backed surfaces.", icon: "backup" },
      { id: "studio-create", section: "studio", slug: "create-new", label: "Create New", description: "Focused editor for building new studio assets.", icon: "plus", primaryActionLabel: "Save Draft", isBuilder: true, hiddenFromNav: true },
      { id: "studio-welcome", section: "studio", slug: "welcome", label: "Welcome", description: "Welcome surfaces and onboarding assets.", icon: "studio", hiddenFromNav: true },
      { id: "studio-verify", section: "studio", slug: "verify", label: "Verify", description: "Verification panels and trust prompts.", icon: "studio", hiddenFromNav: true },
      { id: "studio-tickets", section: "studio", slug: "tickets", label: "Tickets", description: "Ticket panels and support launch surfaces.", icon: "studio", hiddenFromNav: true },
    ],
  },
  {
    id: "fun",
    label: "Fun And Creative",
    description: "Games, creative tools, progression, economy, and community identity.",
    icon: "games",
    items: [
      { id: "creative-overview", section: "fun", slug: "overview", label: "Overview", description: "Choose the next engagement lane without opening the whole system at once.", icon: "overview" },
      { id: "creative-modules", section: "fun", slug: "games", label: "Games", description: "Open the main engagement switchboard and active game systems.", icon: "games" },
      { id: "creative-giveaways", section: "fun", slug: "creative-tools", label: "Creative Tools", description: "Run events, surfaces, and engagement moments that feel more live.", icon: "games" },
      { id: "creative-economy", section: "fun", slug: "shop", label: "Shop", description: "Tune economy, rewards, currency, and redemption loops.", icon: "games" },
      { id: "creative-leveling", section: "fun", slug: "profile", label: "Profile", description: "Shape member identity, progression, and visible status.", icon: "games" },
      { id: "creative-daily", section: "fun", slug: "achievements", label: "Achievements", description: "Handle streaks, milestones, and repeatable reward loops.", icon: "games" },
      { id: "creative-leaderboards", section: "fun", slug: "leaderboards", label: "Leaderboards", description: "See rankings, visible winners, and module competition.", icon: "games" },
      { id: "creative-trivia", section: "fun", slug: "trivia", label: "Trivia", description: "Trivia pacing, categories, and scores.", icon: "games", hiddenFromNav: true },
    ],
  },
  {
    id: "server",
    label: "Server Management",
    description: "Roles, channels, permissions, onboarding, logging, and backup operations.",
    icon: "settings",
    items: [
      { id: "settings-overview", section: "server", slug: "overview", label: "Overview", description: "Choose the next operational server control lane.", icon: "overview" },
      { id: "settings-roles", section: "server", slug: "roles", label: "Roles", description: "Manage role groups, authority, and reward structure.", icon: "roles" },
      { id: "settings-channels", section: "server", slug: "channels", label: "Channels", description: "Control routes, channel posture, and live server destinations.", icon: "channels" },
      { id: "settings-permissions", section: "server", slug: "permissions", label: "Permissions", description: "Set access rules, moderation posture, and protected behavior.", icon: "permissions" },
      { id: "settings-member-flow", section: "server", slug: "onboarding", label: "Onboarding", description: "Handle welcome, verification, and member entry flows.", icon: "settings" },
      { id: "settings-signals-logging", section: "server", slug: "logging", label: "Logging", description: "Review operational signals, failures, and event routing.", icon: "logs" },
      { id: "settings-safety-recovery", section: "server", slug: "backups-sync", label: "Backups / Sync", description: "Safeguard exports, rollback posture, and server recovery.", icon: "backup" },
      { id: "settings-bot-engine", section: "server", slug: "bot-engine", label: "Bot Engine", description: "Legacy engine compatibility route.", icon: "settings", hiddenFromNav: true },
      { id: "settings-channel-control", section: "server", slug: "channel-control", label: "Channel Control", description: "Legacy channel control compatibility route.", icon: "channels", hiddenFromNav: true },
      { id: "settings-role-power", section: "server", slug: "role-power", label: "Role Power", description: "Legacy role power compatibility route.", icon: "roles", hiddenFromNav: true },
      { id: "settings-command-logic", section: "server", slug: "command-logic", label: "Command Logic", description: "Legacy command logic compatibility route.", icon: "commands", hiddenFromNav: true },
    ],
  },
];

export const ARCHIVIST_SECTIONS = ARCHIVIST_NAVIGATION.map(({ id, label, description }) => ({
  id,
  label,
  description,
}));

export function getArchivistSection(section: ArchivistSection) {
  const normalizedSection = normalizeSection(section);
  return ARCHIVIST_NAVIGATION.find((entry) => entry.id === normalizedSection) ?? ARCHIVIST_NAVIGATION[0];
}

export function getDefaultArchivistItem(section: ArchivistSection) {
  return getArchivistSection(section).items[0];
}

export function getArchivistItem(section: ArchivistSection, slug?: string | null) {
  const normalizedRoute = normalizeRoute(section, slug);
  const sectionConfig = getArchivistSection(normalizedRoute.section);
  return sectionConfig.items.find((item) => item.slug === normalizedRoute.slug) ?? getDefaultArchivistItem(normalizedRoute.section);
}

export function getServerIdFromLocation(location: string): number | null {
  const match = location.match(/\/dashboard\/servers\/(\d+)/);
  if (!match) return null;
  const value = Number.parseInt(match[1] || "", 10);
  return Number.isFinite(value) ? value : null;
}

export function getArchivistSectionFromLocation(location: string): ArchivistCanonicalSection {
  return parseArchivistLocation(location).section;
}

export function getArchivistItemFromLocation(location: string) {
  return parseArchivistLocation(location).item;
}

export function buildArchivistItemPath(
  serverId: number | string,
  section: ArchivistSection,
  slug?: string | null,
  options?: { search?: Record<string, string | number | null | undefined> },
) {
  const normalizedId = String(serverId);
  const item = getArchivistItem(section, slug);
  const url = new URL(
    `/dashboard/servers/${normalizedId}/${item.section}/${item.slug}`,
    typeof window === "undefined" ? "https://archivist.local" : window.location.origin,
  );

  for (const [key, value] of Object.entries(options?.search || {})) {
    if (value === null || value === undefined || value === "") continue;
    url.searchParams.set(key, String(value));
  }

  return `${url.pathname}${url.search}`;
}

export function buildArchivistSectionPath(serverId: number | string, section: ArchivistSection) {
  const normalizedSection = normalizeSection(section);
  return buildArchivistItemPath(serverId, normalizedSection, getDefaultArchivistItem(normalizedSection).slug);
}

export function parseArchivistLocation(location: string): {
  serverId: number | null;
  section: ArchivistCanonicalSection;
  item: ArchivistNavItem;
  sectionConfig: ArchivistNavSection;
} {
  const match = location.match(/\/dashboard\/servers\/(\d+)(?:\/([^/?#]+))?(?:\/([^/?#]+))?/);
  const serverId = match ? Number.parseInt(match[1] || "", 10) : null;
  const sectionSegment = match?.[2] || null;
  const slugSegment = match?.[3] || null;
  const normalizedRoute = normalizeRoute(sectionSegment, slugSegment);
  const sectionConfig = getArchivistSection(normalizedRoute.section);
  const item = getArchivistItem(normalizedRoute.section, normalizedRoute.slug);

  return {
    serverId: Number.isFinite(serverId) ? serverId : null,
    section: normalizedRoute.section,
    item,
    sectionConfig,
  };
}
