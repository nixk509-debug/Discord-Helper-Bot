export type ArchivistSection = "commands" | "studio" | "creative" | "settings";

export interface ArchivistNavItem {
  id: string;
  section: ArchivistSection;
  slug: string;
  label: string;
  description: string;
  icon: "commands" | "studio" | "games" | "settings" | "overview" | "plus" | "logs" | "drafts" | "templates" | "roles" | "channels" | "permissions" | "backup";
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
  isBuilder?: boolean;
}

export interface ArchivistNavSection {
  id: ArchivistSection;
  label: string;
  description: string;
  icon: ArchivistNavItem["icon"];
  items: ArchivistNavItem[];
}

export const ARCHIVIST_NAVIGATION: ArchivistNavSection[] = [
  {
    id: "commands",
    label: "Archivist Custom Commands",
    description: "Mobile-first command library, creation flow, import tools, and activity history.",
    icon: "commands",
    items: [
      { id: "commands-overview", section: "commands", slug: "overview", label: "Library", description: "Search, filter, and manage the command inventory.", icon: "overview", primaryActionLabel: "New Command" },
      { id: "commands-create", section: "commands", slug: "create-command", label: "Create", description: "Start a command, build the workflow, review, and publish.", icon: "plus", primaryActionLabel: "Save Draft", isBuilder: true },
      { id: "commands-import-export", section: "commands", slug: "import-export", label: "Import", description: "Paste JSON, generate AI prompts, validate, and import safely.", icon: "backup" },
      { id: "commands-logs", section: "commands", slug: "logs", label: "Activity", description: "Runs, failures, imports, and unpublished command work.", icon: "logs" },
    ],
  },
  {
    id: "studio",
    label: "Design Studio",
    description: "Message assets, drafts, templates, and publishing flows.",
    icon: "studio",
    items: [
      { id: "studio-overview", section: "studio", slug: "overview", label: "Overview", description: "Launchpad for assets, drafts, and templates.", icon: "overview", primaryActionLabel: "Create New" },
      { id: "studio-create", section: "studio", slug: "create-new", label: "Create New", description: "Focused editor for building new studio assets.", icon: "plus", primaryActionLabel: "Save Draft", isBuilder: true },
      { id: "studio-drafts", section: "studio", slug: "drafts", label: "Drafts", description: "Resume saved drafts and recent work.", icon: "drafts", primaryActionLabel: "Open Drafts" },
      { id: "studio-templates", section: "studio", slug: "templates", label: "Templates", description: "Reusable layouts and saved presets.", icon: "templates" },
      { id: "studio-embeds", section: "studio", slug: "embeds", label: "Embeds", description: "Embed-focused design flows and assets.", icon: "studio" },
      { id: "studio-components", section: "studio", slug: "components-v2", label: "Components v2", description: "Interactive component-driven message surfaces.", icon: "studio" },
      { id: "studio-welcome", section: "studio", slug: "welcome", label: "Welcome", description: "Welcome surfaces and onboarding assets.", icon: "studio" },
      { id: "studio-verify", section: "studio", slug: "verify", label: "Verify", description: "Verification panels and trust prompts.", icon: "studio" },
      { id: "studio-tickets", section: "studio", slug: "tickets", label: "Tickets", description: "Ticket panels and support launch surfaces.", icon: "studio" },
    ],
  },
  {
    id: "creative",
    label: "Fun & Games",
    description: "Engagement systems, modules, and lighter community tools.",
    icon: "games",
    items: [
      { id: "creative-overview", section: "creative", slug: "overview", label: "Overview", description: "Engagement modules and feature launch state.", icon: "overview" },
      { id: "creative-modules", section: "creative", slug: "modules", label: "Modules", description: "Toggle and configure game systems.", icon: "games" },
      { id: "creative-leveling", section: "creative", slug: "leveling", label: "Leveling", description: "Member progression and rewards.", icon: "games" },
      { id: "creative-economy", section: "creative", slug: "economy", label: "Economy", description: "Economy setup and reward balance.", icon: "games" },
      { id: "creative-trivia", section: "creative", slug: "trivia", label: "Trivia", description: "Trivia pacing, categories, and scores.", icon: "games" },
      { id: "creative-giveaways", section: "creative", slug: "giveaways", label: "Giveaways", description: "Giveaway cadence and winner flows.", icon: "games" },
      { id: "creative-daily", section: "creative", slug: "daily-rewards", label: "Daily Rewards", description: "Recurring rewards and streak loops.", icon: "games" },
      { id: "creative-leaderboards", section: "creative", slug: "leaderboards", label: "Leaderboards", description: "Visible rankings and module competition.", icon: "games" },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    description: "Server config, permissions, channels, logging, and backups.",
    icon: "settings",
    items: [
      { id: "settings-overview", section: "settings", slug: "overview", label: "Overview", description: "Server configuration summary and quick links.", icon: "overview" },
      { id: "settings-general", section: "settings", slug: "general", label: "General", description: "Core server and workspace preferences.", icon: "settings" },
      { id: "settings-server-config", section: "settings", slug: "server-config", label: "Server Config", description: "Guild-level runtime and environment controls.", icon: "settings" },
      { id: "settings-roles", section: "settings", slug: "roles", label: "Roles", description: "Role groups, assignments, and access targets.", icon: "roles" },
      { id: "settings-channels", section: "settings", slug: "channels", label: "Channels", description: "Channel-specific targets and scopes.", icon: "channels" },
      { id: "settings-permissions", section: "settings", slug: "permissions", label: "Permissions", description: "Permission gates and privileged access.", icon: "permissions" },
      { id: "settings-logging", section: "settings", slug: "logging", label: "Logging", description: "Activity logging and runtime trace targets.", icon: "logs" },
      { id: "settings-notifications", section: "settings", slug: "notifications", label: "Notifications", description: "Notifications, alerts, and delivery targets.", icon: "settings" },
      { id: "settings-advanced", section: "settings", slug: "advanced", label: "Advanced", description: "Runtime detail, IDs, and advanced configuration.", icon: "settings" },
      { id: "settings-backups", section: "settings", slug: "backups", label: "Backups", description: "Export, backup, and restore controls.", icon: "backup" },
    ],
  },
];

export const ARCHIVIST_SECTIONS = ARCHIVIST_NAVIGATION.map(({ id, label, description }) => ({
  id,
  label,
  description,
}));

export function getArchivistSection(section: ArchivistSection) {
  return ARCHIVIST_NAVIGATION.find((entry) => entry.id === section) ?? ARCHIVIST_NAVIGATION[0];
}

export function getDefaultArchivistItem(section: ArchivistSection) {
  return getArchivistSection(section).items[0];
}

export function getArchivistItem(section: ArchivistSection, slug?: string | null) {
  const sectionConfig = getArchivistSection(section);
  return sectionConfig.items.find((item) => item.slug === slug) ?? getDefaultArchivistItem(section);
}

export function getServerIdFromLocation(location: string): number | null {
  const match = location.match(/\/dashboard\/servers\/(\d+)/);
  if (!match) return null;
  const value = Number.parseInt(match[1] || "", 10);
  return Number.isFinite(value) ? value : null;
}

export function getArchivistSectionFromLocation(location: string): ArchivistSection {
  const parsed = parseArchivistLocation(location);
  return parsed.section;
}

export function getArchivistItemFromLocation(location: string) {
  const parsed = parseArchivistLocation(location);
  return parsed.item;
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
    `/dashboard/servers/${normalizedId}/${section}/${item.slug}`,
    typeof window === "undefined" ? "https://archivist.local" : window.location.origin,
  );

  for (const [key, value] of Object.entries(options?.search || {})) {
    if (value === null || value === undefined || value === "") continue;
    url.searchParams.set(key, String(value));
  }

  return `${url.pathname}${url.search}`;
}

export function buildArchivistSectionPath(serverId: number | string, section: ArchivistSection) {
  return buildArchivistItemPath(serverId, section, getDefaultArchivistItem(section).slug);
}

export function parseArchivistLocation(location: string): {
  serverId: number | null;
  section: ArchivistSection;
  item: ArchivistNavItem;
  sectionConfig: ArchivistNavSection;
} {
  const match = location.match(/\/dashboard\/servers\/(\d+)(?:\/([^/?#]+))?(?:\/([^/?#]+))?/);
  const serverId = match ? Number.parseInt(match[1] || "", 10) : null;
  const sectionSegment = match?.[2] || null;
  const slugSegment = match?.[3] || null;

  const section = ARCHIVIST_NAVIGATION.find((entry) => entry.id === sectionSegment)?.id ?? "commands";
  const sectionConfig = getArchivistSection(section);
  const item = getArchivistItem(section, slugSegment);

  return {
    serverId: Number.isFinite(serverId) ? serverId : null,
    section,
    item,
    sectionConfig,
  };
}
