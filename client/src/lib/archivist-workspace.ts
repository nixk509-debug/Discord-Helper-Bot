export type ArchivistCanonicalSection = "commands" | "studio" | "community" | "operations";
export type ArchivistSection = ArchivistCanonicalSection | "creative" | "fun" | "settings" | "server";

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

export interface ArchivistToolEntry {
  id: string;
  section: ArchivistCanonicalSection;
  slug: string;
  label: string;
  description: string;
  icon: ArchivistNavItem["icon"];
  search?: Record<string, string | number | null | undefined>;
  featured?: boolean;
}

const LAST_ACTIVE_ARCHIVIST_SERVER_KEY = "archivist:last-server-id";

const SECTION_ALIAS_MAP: Record<string, ArchivistCanonicalSection> = {
  creative: "community",
  fun: "community",
  community: "community",
  settings: "operations",
  server: "operations",
  operations: "operations",
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
  community: {
    modules: { slug: "games" },
    economy: { slug: "shop" },
    leveling: { slug: "profile" },
    "daily-rewards": { slug: "achievements" },
    giveaways: { slug: "creative-tools" },
    trivia: { slug: "games" },
    leaderboards: { slug: "leaderboards" },
  },
  operations: {
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
    description: "Automation logic, trigger lanes, builder drafts, and runtime health.",
    icon: "commands",
    items: [
      { id: "commands-overview", section: "commands", slug: "overview", label: "Overview", description: "Recent automations, health, and fast command entry points.", icon: "overview" },
      { id: "commands-all", section: "commands", slug: "commands", label: "Commands", description: "Open the command library, drafts, and focused builder lanes.", icon: "commands" },
      { id: "commands-variables", section: "commands", slug: "variables", label: "Variables", description: "Keep reusable variable language and command inputs visible.", icon: "overview" },
      { id: "commands-cooldowns", section: "commands", slug: "testing", label: "Testing", description: "Review command readiness, cooldowns, and validation posture.", icon: "overview" },
      { id: "commands-logs", section: "commands", slug: "logs", label: "Logs", description: "Inspect runs, failures, and recent command activity.", icon: "logs" },
      { id: "commands-analytics", section: "commands", slug: "analytics", label: "Analytics", description: "See volume, pressure, and top command usage at a glance.", icon: "logs" },
      { id: "commands-import-export", section: "commands", slug: "imports", label: "Imports / Exports", description: "Validate, import, and migrate command workflows safely.", icon: "backup" },
      { id: "commands-create", section: "commands", slug: "create-command", label: "Create", description: "Focused workflow builder.", icon: "plus", primaryActionLabel: "Save Draft", isBuilder: true, hiddenFromNav: true },
      { id: "commands-slash", section: "commands", slug: "slash-commands", label: "Slash Commands", description: "Slash command subset.", icon: "commands", hiddenFromNav: true },
      { id: "commands-message", section: "commands", slug: "message-commands", label: "Message Commands", description: "Message command subset.", icon: "commands", hiddenFromNav: true },
      { id: "commands-auto", section: "commands", slug: "auto-responses", label: "Auto Responses", description: "Automated command subset.", icon: "commands", hiddenFromNav: true },
      { id: "commands-buttons", section: "commands", slug: "button-triggers", label: "Buttons", description: "Button-driven interaction flows.", icon: "commands", hiddenFromNav: true },
      { id: "commands-selects", section: "commands", slug: "select-menu-triggers", label: "Select Menus", description: "Select-driven interaction flows.", icon: "commands", hiddenFromNav: true },
      { id: "commands-modals", section: "commands", slug: "modal-triggers", label: "Modals", description: "Modal submit and follow-up flows.", icon: "commands", hiddenFromNav: true },
      { id: "commands-scheduled", section: "commands", slug: "scheduled-triggers", label: "Scheduled Triggers", description: "Time-based automation routes.", icon: "commands", hiddenFromNav: true },
      { id: "commands-member-join", section: "commands", slug: "member-join-triggers", label: "Member Join", description: "Join-time automation and onboarding triggers.", icon: "commands", hiddenFromNav: true },
      { id: "commands-role-change", section: "commands", slug: "role-change-triggers", label: "Role Change", description: "Role-based automation routes.", icon: "commands", hiddenFromNav: true },
      { id: "commands-reaction", section: "commands", slug: "reaction-triggers", label: "Reaction Triggers", description: "Reaction-based automation routes.", icon: "commands", hiddenFromNav: true },
      { id: "commands-internal", section: "commands", slug: "internal-triggers", label: "Manual / Internal", description: "Manual or internal automation triggers.", icon: "commands", hiddenFromNav: true },
    ],
  },
  {
    id: "studio",
    label: "Design Studio",
    description: "Message building, embeds, components, assets, and publish truth.",
    icon: "studio",
    items: [
      { id: "studio-overview", section: "studio", slug: "overview", label: "Overview", description: "Continue recent work, create fast, and keep publish state visible.", icon: "overview" },
      { id: "studio-embeds", section: "studio", slug: "embeds", label: "Embeds", description: "Design embed-driven message surfaces.", icon: "studio", hiddenFromNav: true },
      { id: "studio-components", section: "studio", slug: "components-v2", label: "Components V2", description: "Build interactive component-driven Discord interfaces.", icon: "studio", hiddenFromNav: true },
      { id: "studio-drafts", section: "studio", slug: "ui-projects", label: "UI Projects", description: "Open saved projects, drafts, and active visual systems.", icon: "drafts" },
      { id: "studio-templates", section: "studio", slug: "templates", label: "Templates", description: "Reuse saved design systems and deployment-ready templates.", icon: "templates" },
      { id: "studio-brand-kit", section: "studio", slug: "brand-kit", label: "Brand Kit", description: "Keep style direction, reusable patterns, and module identity aligned.", icon: "studio" },
      { id: "studio-assets", section: "studio", slug: "assets", label: "Assets", description: "Track documents with attached assets and media-backed surfaces.", icon: "backup" },
      { id: "studio-create", section: "studio", slug: "create-new", label: "Create New", description: "Focused editor for building new studio assets.", icon: "plus", primaryActionLabel: "Save Draft", isBuilder: true, hiddenFromNav: true },
      { id: "studio-welcome", section: "studio", slug: "welcome", label: "Welcome", description: "Welcome surfaces and onboarding assets.", icon: "studio", hiddenFromNav: true },
      { id: "studio-verify", section: "studio", slug: "verify", label: "Verify", description: "Verification panels and trust prompts.", icon: "studio", hiddenFromNav: true },
      { id: "studio-tickets", section: "studio", slug: "tickets", label: "Tickets", description: "Ticket panels and support launch surfaces.", icon: "studio", hiddenFromNav: true },
      { id: "studio-announcements", section: "studio", slug: "announcement-builder", label: "Announcement Builder", description: "Announcement-ready message surfaces.", icon: "studio", hiddenFromNav: true },
    ],
  },
  {
    id: "community",
    label: "Community",
    description: "Community systems, creative loops, events, and playful engagement tools.",
    icon: "games",
    items: [
      { id: "creative-overview", section: "community", slug: "overview", label: "Overview", description: "See active community systems, quick wins, and the next creative lane.", icon: "overview" },
      { id: "creative-modules", section: "community", slug: "games", label: "Games", description: "Open the main engagement switchboard and active game systems.", icon: "games" },
      { id: "creative-giveaways", section: "community", slug: "creative-tools", label: "Creative Tools", description: "Run events, surfaces, and engagement moments that feel more live.", icon: "games" },
      { id: "creative-economy", section: "community", slug: "shop", label: "Shop", description: "Tune economy, rewards, currency, and redemption loops.", icon: "games" },
      { id: "creative-leveling", section: "community", slug: "profile", label: "Profile", description: "Shape member identity, progression, and visible status.", icon: "games" },
      { id: "creative-daily", section: "community", slug: "achievements", label: "Achievements", description: "Handle streaks, milestones, and repeatable reward loops.", icon: "games" },
      { id: "creative-leaderboards", section: "community", slug: "leaderboards", label: "Leaderboards", description: "See rankings, visible winners, and module competition.", icon: "games" },
      { id: "creative-trivia", section: "community", slug: "trivia", label: "Trivia", description: "Trivia pacing, categories, and scores.", icon: "games", hiddenFromNav: true },
      { id: "creative-starboard", section: "community", slug: "starboard", label: "Starboard", description: "Starboard highlights and featured posts.", icon: "games", hiddenFromNav: true },
      { id: "creative-reaction-roles", section: "community", slug: "reaction-roles", label: "Reaction Roles", description: "Role pickup and community opt-in flows.", icon: "games", hiddenFromNav: true },
      { id: "creative-counting", section: "community", slug: "counting", label: "Counting", description: "Counting channels and cooperative game loops.", icon: "games" },
      { id: "creative-role-rewards", section: "community", slug: "role-rewards", label: "Role Rewards", description: "XP level-up role rewards and progression unlocks.", icon: "games" },
      { id: "creative-auto-role", section: "community", slug: "auto-role", label: "Auto-Role", description: "Assign roles automatically when members join.", icon: "games" },
      { id: "creative-boost-perks", section: "community", slug: "boost-perks", label: "Boost Perks", description: "Server booster rewards, XP multipliers, and announcements.", icon: "games" },
      { id: "creative-birthday", section: "community", slug: "birthdays", label: "Birthdays", description: "Birthday tracking, channel announcements, and temp roles.", icon: "games" },
      { id: "creative-media", section: "community", slug: "media-greeting-effects", label: "Media / Greeting Effects", description: "Greeting media and lightweight presentation helpers.", icon: "games", hiddenFromNav: true },
      { id: "creative-events", section: "community", slug: "community-events", label: "Community Events", description: "Recurring events and community energy tools.", icon: "games", hiddenFromNav: true },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    description: "Server safety, moderation posture, verification, channels, roles, and recovery tools.",
    icon: "settings",
    items: [
      { id: "settings-overview", section: "operations", slug: "overview", label: "Overview", description: "Review moderation health, setup warnings, and the next system lane.", icon: "overview" },
      { id: "settings-roles", section: "operations", slug: "roles", label: "Roles", description: "Manage role groups, authority, and reward structure.", icon: "roles" },
      { id: "settings-channels", section: "operations", slug: "channels", label: "Channels", description: "Control routes, channel posture, and live server destinations.", icon: "channels" },
      { id: "settings-permissions", section: "operations", slug: "permissions", label: "Permissions", description: "Set access rules, moderation posture, and protected behavior.", icon: "permissions" },
      { id: "settings-member-flow", section: "operations", slug: "onboarding", label: "Onboarding", description: "Handle welcome, verification, and member entry flows.", icon: "settings" },
      { id: "settings-signals-logging", section: "operations", slug: "logging", label: "Logging", description: "Review operational signals, failures, and event routing.", icon: "logs" },
      { id: "settings-safety-recovery", section: "operations", slug: "backups-sync", label: "Backups / Sync", description: "Safeguard exports, rollback posture, and server recovery.", icon: "backup" },
      { id: "settings-moderation", section: "operations", slug: "moderation", label: "AutoMod", description: "Filter spam, links, caps, mentions, and banned words. Set actions and whitelists.", icon: "permissions" },
      { id: "settings-verification", section: "operations", slug: "verification", label: "Verification", description: "Verification gate, role assignment, and access control on join.", icon: "permissions" },
      { id: "settings-tickets", section: "operations", slug: "tickets", label: "Tickets", description: "Support surfaces and ticket system configuration.", icon: "settings", hiddenFromNav: true },
      { id: "settings-security", section: "operations", slug: "security-tools", label: "Raid Defense", description: "Raid protection, mass-join thresholds, and account age gates.", icon: "permissions" },
      { id: "settings-bot-engine", section: "operations", slug: "bot-engine", label: "Bot Engine", description: "Legacy engine compatibility route.", icon: "settings", hiddenFromNav: true },
      { id: "settings-channel-control", section: "operations", slug: "channel-control", label: "Channel Control", description: "Legacy channel control compatibility route.", icon: "channels", hiddenFromNav: true },
      { id: "settings-role-power", section: "operations", slug: "role-power", label: "Role Power", description: "Legacy role power compatibility route.", icon: "roles", hiddenFromNav: true },
      { id: "settings-command-logic", section: "operations", slug: "command-logic", label: "Command Logic", description: "Legacy command logic compatibility route.", icon: "commands", hiddenFromNav: true },
    ],
  },
];

export const ARCHIVIST_TOOL_DRAWERS: Record<ArchivistCanonicalSection, ArchivistToolEntry[]> = {
  commands: [
    { id: "tool-slash", section: "commands", slug: "slash-commands", label: "Slash Commands", description: "Slash-first automations and command lanes.", icon: "commands", featured: true },
    { id: "tool-keyword", section: "commands", slug: "message-commands", label: "Keyword Triggers", description: "Message and keyword-driven responses.", icon: "commands", featured: true },
    { id: "tool-auto", section: "commands", slug: "auto-responses", label: "Auto Responses", description: "Automations that fire without a manual prompt.", icon: "commands", featured: true },
    { id: "tool-buttons", section: "commands", slug: "button-triggers", label: "Buttons", description: "Button-triggered interaction flows.", icon: "commands" },
    { id: "tool-selects", section: "commands", slug: "select-menu-triggers", label: "Select Menus", description: "Select-driven action flows.", icon: "commands" },
    { id: "tool-modals", section: "commands", slug: "modal-triggers", label: "Modals", description: "Modal submit and follow-up flows.", icon: "commands" },
    { id: "tool-scheduled", section: "commands", slug: "scheduled-triggers", label: "Scheduled Triggers", description: "Time-based automations and queued runs.", icon: "commands" },
    { id: "tool-member-join", section: "commands", slug: "member-join-triggers", label: "Member Join", description: "Join-triggered automations and setup logic.", icon: "commands" },
    { id: "tool-role-change", section: "commands", slug: "role-change-triggers", label: "Role Change", description: "Role-based automations and role gates.", icon: "commands" },
    { id: "tool-reaction", section: "commands", slug: "reaction-triggers", label: "Reaction Triggers", description: "Reaction-driven automations.", icon: "commands" },
    { id: "tool-internal", section: "commands", slug: "internal-triggers", label: "Manual / Internal", description: "Internal triggers and staff-run routines.", icon: "commands" },
  ],
  studio: [
    { id: "tool-message", section: "studio", slug: "create-new", label: "New Message", description: "Start a new message surface in the flagship builder.", icon: "plus", featured: true },
    { id: "tool-embeds", section: "studio", slug: "embeds", label: "Embed Builder", description: "Compose rich embed-first message layouts.", icon: "studio", featured: true },
    { id: "tool-components", section: "studio", slug: "components-v2", label: "Components V2", description: "Build interactive buttons, selects, and layouts.", icon: "studio", featured: true },
    { id: "tool-welcome", section: "studio", slug: "welcome", label: "Welcome Builder", description: "Shape onboarding and first-impression surfaces.", icon: "studio" },
    { id: "tool-tickets", section: "studio", slug: "tickets", label: "Ticket Panels", description: "Build support and ticket launch panels.", icon: "studio" },
    { id: "tool-verify", section: "studio", slug: "verify", label: "Verification Panels", description: "Verification prompts and trust surfaces.", icon: "studio" },
    { id: "tool-announcements", section: "studio", slug: "announcement-builder", label: "Announcement Builder", description: "Announcement-ready message surfaces.", icon: "studio" },
    { id: "tool-assets", section: "studio", slug: "assets", label: "Lab / Assets", description: "Saved media, assets, and reusable Studio material.", icon: "backup" },
  ],
  community: [
    { id: "tool-leveling", section: "community", slug: "profile", label: "Leveling", description: "Progression, XP visibility, and profile growth.", icon: "games", featured: true },
    { id: "tool-starboard", section: "community", slug: "starboard", label: "Starboard", description: "Featured post and reaction spotlight flows.", icon: "games" },
    { id: "tool-reaction-roles", section: "community", slug: "reaction-roles", label: "Reaction Roles", description: "Role pickup and member choice flows.", icon: "games" },
    { id: "tool-counting", section: "community", slug: "counting", label: "Counting", description: "Counting channels and cooperative loops.", icon: "games" },
    { id: "tool-giveaways", section: "community", slug: "creative-tools", label: "Giveaways", description: "Giveaways, events, and live moments.", icon: "games", featured: true },
    { id: "tool-leaderboards", section: "community", slug: "leaderboards", label: "Leaderboards", description: "Rankings, wins, and visible competition.", icon: "games" },
    { id: "tool-media", section: "community", slug: "media-greeting-effects", label: "Media / Greeting Effects", description: "Greeting effects and presentation helpers.", icon: "games" },
    { id: "tool-events", section: "community", slug: "community-events", label: "Community Event Tools", description: "Recurring events and community energy tools.", icon: "games" },
  ],
  operations: [
    { id: "tool-moderation", section: "operations", slug: "moderation", label: "Moderation", description: "Moderation health and staff control surfaces.", icon: "permissions", featured: true },
    { id: "tool-verification", section: "operations", slug: "verification", label: "Verification", description: "Verification posture and entry gating.", icon: "permissions", featured: true },
    { id: "tool-logs", section: "operations", slug: "logging", label: "Logs", description: "Operational signals and failure history.", icon: "logs" },
    { id: "tool-tickets", section: "operations", slug: "tickets", label: "Tickets", description: "Support flow configuration and handoff surfaces.", icon: "settings" },
    { id: "tool-permissions", section: "operations", slug: "permissions", label: "Permissions", description: "Role and access logic for protected systems.", icon: "permissions" },
    { id: "tool-channels", section: "operations", slug: "channels", label: "Channels", description: "Live channel structure and routing posture.", icon: "channels" },
    { id: "tool-roles", section: "operations", slug: "roles", label: "Roles", description: "Role groups, hierarchy, and setup integrity.", icon: "roles" },
    { id: "tool-backups", section: "operations", slug: "backups-sync", label: "Backup / Templates", description: "Recovery posture and migration staging.", icon: "backup" },
    { id: "tool-security", section: "operations", slug: "security-tools", label: "Security Tools", description: "Access safety and protected operations.", icon: "permissions" },
  ],
};

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

export function getArchivistToolEntries(section: ArchivistSection) {
  const normalizedSection = normalizeSection(section);
  return ARCHIVIST_TOOL_DRAWERS[normalizedSection];
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

export function buildArchivistToolPath(serverId: number | string, tool: ArchivistToolEntry) {
  return buildArchivistItemPath(serverId, tool.section, tool.slug, { search: tool.search });
}

export function readLastArchivistServerId() {
  if (typeof window === "undefined") return null;
  const rawValue = window.localStorage.getItem(LAST_ACTIVE_ARCHIVIST_SERVER_KEY);
  const parsed = Number.parseInt(rawValue || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function writeLastArchivistServerId(serverId: number | null | undefined) {
  if (typeof window === "undefined" || !serverId) return;
  window.localStorage.setItem(LAST_ACTIVE_ARCHIVIST_SERVER_KEY, String(serverId));
}

export function getPreferredArchivistServer<T extends { id: number }>(
  servers: T[] | null | undefined,
  options?: { excludeId?: number | null },
) {
  if (!servers?.length) return null;

  const excludeId = options?.excludeId ?? null;
  const preferredId = readLastArchivistServerId();
  if (preferredId) {
    const preferredServer = servers.find((server) => server.id === preferredId && server.id !== excludeId);
    if (preferredServer) return preferredServer;
  }

  return servers.find((server) => server.id !== excludeId) ?? servers[0] ?? null;
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
