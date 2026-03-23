import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowRight,
  BadgePlus,
  Braces,
  ChevronRight,
  CopyPlus,
  FileStack,
  Gamepad2,
  LayoutTemplate,
  Logs,
  MessageSquareText,
  Plus,
  Save,
  ScrollText,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { inferStudioPrimarySurfaceType } from "@/components/design-studio/studio-defaults";
import { DesignStudioTab } from "@/components/design-studio/design-studio-tab";
import { CustomCommandV2Forge } from "@/components/server-shell/custom-command-v2/custom-command-v2-forge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  ARCHIVIST_NAVIGATION,
  buildArchivistItemPath,
  buildArchivistSectionPath,
  getDefaultArchivistItem,
  parseArchivistLocation,
  type ArchivistNavItem,
} from "@/lib/archivist-workspace";
import {
  useBotStatus,
  useApplyChannelLiveChanges,
  useChannelSettings,
  useCommandLogs,
  useCreateLiveChannel,
  useDiscordContext,
  useDeleteChannelSettings,
  usePermissionRules,
  useServer,
  useServers,
  useServerCommands,
  useStudioDocuments,
  useStudioPublications,
  useUpsertChannelSettings,
  useWorkspaceOverview,
} from "@/hooks/use-bot";
import { isApiResponseError } from "@/hooks/use-bot";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

const COMMAND_FILTERS = [
  { label: "All", value: "all" },
  { label: "Slash", value: "slash" },
  { label: "Message", value: "message" },
  { label: "Auto", value: "auto" },
  { label: "Disabled", value: "disabled" },
] as const;

const MODULE_CARDS = [
  { id: "leveling", title: "Leveling", description: "Progression, XP pacing, and milestone rewards." },
  { id: "economy", title: "Economy", description: "Server currency, rewards, and redemption loops." },
  { id: "trivia", title: "Trivia", description: "Timed prompts, categories, and answer handling." },
  { id: "giveaways", title: "Giveaways", description: "Entry flows, duration, and winner selection." },
  { id: "daily", title: "Daily Rewards", description: "Recurring claim loops and streak boosts." },
] as const;

const DEFAULT_MODULE_ENABLED: Record<string, boolean> = {
  leveling: true,
  economy: false,
  trivia: true,
  giveaways: true,
  daily: false,
};

const MODULE_BLUEPRINTS: Record<string, {
  focus: string;
  starterChecklist: string[];
  commandRoute: string;
  studioRoute: string;
  settingsRoute: string;
  helperLabel: string;
}> = {
  leveling: {
    focus: "Make member progress visible, rewarding, and hard to exploit.",
    starterChecklist: [
      "Choose the channels where XP should count.",
      "Define the first reward role or milestone.",
      "Create one command or panel that shows progress clearly.",
    ],
    commandRoute: "all-commands",
    studioRoute: "welcome",
    settingsRoute: "roles",
    helperLabel: "Best when members can see progress in one obvious place.",
  },
  economy: {
    focus: "Keep earning loops simple, sinks clear, and rewards worth claiming.",
    starterChecklist: [
      "Decide how members earn currency first.",
      "Reserve one reward or shop flow members can understand immediately.",
      "Wire one command lane for balances, claims, or redemption.",
    ],
    commandRoute: "all-commands",
    studioRoute: "components-v2",
    settingsRoute: "channels",
    helperLabel: "Economy works best with one earning loop and one spending loop first.",
  },
  trivia: {
    focus: "Keep rounds fast, categories clear, and scoring easy to follow.",
    starterChecklist: [
      "Pick the main trivia channel or thread surface.",
      "Decide whether answers are solo or group-paced.",
      "Show current wins somewhere members can keep coming back to.",
    ],
    commandRoute: "slash-commands",
    studioRoute: "components-v2",
    settingsRoute: "notifications",
    helperLabel: "Trivia stays healthy when the pace is fast and the recap is visible.",
  },
  giveaways: {
    focus: "Make entry simple, winner selection trusted, and reminders automatic.",
    starterChecklist: [
      "Pick the giveaway channel or announcement surface.",
      "Lock down who can host or reroll a giveaway.",
      "Create one clean panel or post format to reuse every time.",
    ],
    commandRoute: "slash-commands",
    studioRoute: "tickets",
    settingsRoute: "permissions",
    helperLabel: "Reuse one clean giveaway layout instead of reinventing each post.",
  },
  daily: {
    focus: "Make claims habitual, streaks understandable, and missed days painless.",
    starterChecklist: [
      "Choose the claim surface members should use every day.",
      "Set the streak expectation before adding bonuses.",
      "Add one reminder or recap message that keeps the loop visible.",
    ],
    commandRoute: "auto-responses",
    studioRoute: "components-v2",
    settingsRoute: "logging",
    helperLabel: "Daily rewards feel sticky when claims are fast and streak rules are obvious.",
  },
};

const SETTINGS_HELPERS = [
  {
    id: "ops",
    title: "Operations lane",
    description: "Channels, permissions, and logs for keeping the server under control.",
    routes: [
      { label: "Channels", section: "settings" as const, slug: "channels" },
      { label: "Permissions", section: "settings" as const, slug: "permissions" },
      { label: "Logging", section: "settings" as const, slug: "logging" },
    ],
  },
  {
    id: "identity",
    title: "Identity lane",
    description: "General server details, roles, and visible surfaces members interact with first.",
    routes: [
      { label: "General", section: "settings" as const, slug: "general" },
      { label: "Roles", section: "settings" as const, slug: "roles" },
      { label: "Studio", section: "studio" as const, slug: "overview" },
    ],
  },
  {
    id: "safety",
    title: "Safety lane",
    description: "Notifications, advanced diagnostics, and backup-minded routes for recovery.",
    routes: [
      { label: "Notifications", section: "settings" as const, slug: "notifications" },
      { label: "Advanced", section: "settings" as const, slug: "advanced" },
      { label: "Backups", section: "settings" as const, slug: "backups" },
    ],
  },
] as const;

const SETTINGS_BLUEPRINTS: Record<string, {
  focus: string;
  starterChecklist: string[];
  quickLinks: Array<{
    label: string;
    description: string;
    section: "commands" | "studio" | "creative" | "settings";
    slug: string;
    icon: typeof Plus;
  }>;
}> = {
  general: {
    focus: "Keep the core server identity clear so every other module starts from the right assumptions.",
    starterChecklist: [
      "Check member count and owner identity against the live guild.",
      "Open the welcome surface if new members need a clearer first impression.",
      "Review roles and channels before changing engagement modules.",
    ],
    quickLinks: [
      { label: "Roles", description: "Audit the role shape members and staff actually use.", section: "settings", slug: "roles", icon: Users },
      { label: "Channels", description: "Review the visible surfaces members land in first.", section: "settings", slug: "channels", icon: MessageSquareText },
      { label: "Welcome", description: "Tighten the member-first surface in Studio.", section: "studio", slug: "welcome", icon: LayoutTemplate },
    ],
  },
  "server-config": {
    focus: "Treat runtime health like an operator dashboard, not a dead info dump.",
    starterChecklist: [
      "Confirm the bot is connected and heartbeat data is current.",
      "Open logs if commands or automation feel delayed.",
      "Use advanced diagnostics before assuming Discord is the problem.",
    ],
    quickLinks: [
      { label: "Logging", description: "Inspect recent activity and failures.", section: "settings", slug: "logging", icon: Logs },
      { label: "Advanced", description: "Open IDs, gateway, and runtime diagnostics.", section: "settings", slug: "advanced", icon: Braces },
      { label: "Commands", description: "Review the command surfaces affected by runtime state.", section: "commands", slug: "all-commands", icon: ScrollText },
    ],
  },
  notifications: {
    focus: "Make alert delivery obvious so the bot always has a trusted place to speak.",
    starterChecklist: [
      "Pick the main staff alert surface first.",
      "Separate noisy operational alerts from member-facing announcements.",
      "Keep one backup notification channel in mind before scaling automations.",
    ],
    quickLinks: [
      { label: "Channels", description: "Choose the right text channels for delivery.", section: "settings", slug: "channels", icon: MessageSquareText },
      { label: "Logging", description: "Pair notifications with visible operational history.", section: "settings", slug: "logging", icon: Logs },
      { label: "Studio", description: "Build richer announcement surfaces when plain messages are not enough.", section: "studio", slug: "components-v2", icon: LayoutTemplate },
    ],
  },
  advanced: {
    focus: "Put debugging tools and hard identifiers in one dependable operator lane.",
    starterChecklist: [
      "Grab the internal and Discord IDs before any deeper support work.",
      "Compare gateway health with recent failures to spot timing issues.",
      "Use permissions and logs together when something only breaks for certain roles.",
    ],
    quickLinks: [
      { label: "Permissions", description: "Check whether access rules are causing hidden failures.", section: "settings", slug: "permissions", icon: ShieldCheck },
      { label: "Logging", description: "Inspect command and runtime failure history.", section: "settings", slug: "logging", icon: Logs },
      { label: "Backups", description: "Stage export-minded recovery work from a safer place.", section: "settings", slug: "backups", icon: CopyPlus },
    ],
  },
  backups: {
    focus: "Give backup and restore work a clear launchpad even before full export tooling grows up.",
    starterChecklist: [
      "Review commands, roles, and channels so the current server shape is known.",
      "Open command import/export for the logic layer first.",
      "Capture advanced IDs before any migration or restore work.",
    ],
    quickLinks: [
      { label: "Command Builder", description: "Use import/export on the command layer today.", section: "commands", slug: "import-export", icon: CopyPlus },
      { label: "Advanced", description: "Keep IDs and runtime details close during backup work.", section: "settings", slug: "advanced", icon: Braces },
      { label: "Channels", description: "Review the live structure before copying or rebuilding it.", section: "settings", slug: "channels", icon: MessageSquareText },
    ],
  },
};

const VARIABLE_CARDS = [
  { label: "{user}", description: "Resolve the member running the command." },
  { label: "{channel}", description: "Reference the current channel or target channel." },
  { label: "{server}", description: "Insert the current server name or metadata." },
  { label: "{role}", description: "Point at the chosen role in role-based flows." },
  { label: "{cooldown}", description: "Show remaining cooldown time in replies." },
  { label: "{count}", description: "Use counters in leaderboards or streak messages." },
] as const;

const CHANNEL_FILTERS = [
  { id: "all", label: "All" },
  { id: "managed", label: "Managed" },
  { id: "text", label: "Text" },
  { id: "voice", label: "Voice" },
  { id: "forum", label: "Forum" },
  { id: "threads", label: "Threads" },
] as const;

const CHANNEL_CONTENT_TYPES = [
  "text",
  "images",
  "embeds",
  "files",
  "stickers",
  "links",
] as const;

const CHANNEL_BULK_ACTIONS = [
  { id: "lock", label: "Lock", description: "Close selected channels for @everyone." },
  { id: "unlock", label: "Unlock", description: "Reopen selected channels." },
  { id: "move-category", label: "Move", description: "Move selected channels into one category." },
  { id: "group-top", label: "To Top", description: "Keep the picked channels together and send them to the top of each current group." },
  { id: "group-bottom", label: "To Bottom", description: "Keep the picked channels together and send them to the bottom of each current group." },
  { id: "rename-prefix", label: "Prefix", description: "Add one prefix across the picked channels." },
  { id: "rename-suffix", label: "Suffix", description: "Add one suffix across the picked channels." },
  { id: "rename-replace", label: "Replace", description: "Find and replace text across picked channel names." },
  { id: "slowmode-5", label: "5s Slowmode", description: "Set a light slowmode across selected text surfaces." },
  { id: "slowmode-off", label: "Slowmode Off", description: "Clear slowmode on selected text surfaces." },
  { id: "nsfw-on", label: "NSFW On", description: "Enable NSFW where Discord supports it." },
  { id: "nsfw-off", label: "NSFW Off", description: "Disable NSFW where Discord supports it." },
] as const;

type ChannelBulkActionId = (typeof CHANNEL_BULK_ACTIONS)[number]["id"];

const CHANNEL_CREATE_TYPES = [
  { id: "text", label: "Text" },
  { id: "voice", label: "Voice" },
  { id: "announcement", label: "News" },
  { id: "forum", label: "Forum" },
  { id: "stage", label: "Stage" },
  { id: "category", label: "Category" },
] as const;

type ChannelCreateTypeId = (typeof CHANNEL_CREATE_TYPES)[number]["id"];

type ChannelBulkActionOptions = {
  categoryId?: string | null;
  categoryName?: string;
  currentCategoryName?: string;
  currentOrderLabel?: string;
  nextOrderLabel?: string;
  renamePrefix?: string;
  renameSuffix?: string;
  renameSearch?: string;
  renameReplace?: string;
};

function getCategoryLabel(parentId: string | null | undefined, categories: any[]) {
  if (!parentId) return "Uncategorized";
  return categories.find((category: any) => category.id === parentId)?.name || "Uncategorized";
}

function buildBulkRenameValue(channel: any, prefix: string) {
  return `${prefix}${channel?.name || ""}`.trim();
}

function buildBulkRenameSuffixValue(channel: any, suffix: string) {
  return `${channel?.name || ""}${suffix}`.trim();
}

function buildBulkRenameReplaceValue(channel: any, search: string, replace: string) {
  if (!search) return channel?.name || "";
  return String(channel?.name || "").split(search).join(replace);
}

function supportsChannelBulkAction(channel: any, actionId: ChannelBulkActionId) {
  switch (actionId) {
    case "lock":
    case "unlock":
      return !channel?.isThread;
    case "move-category":
      return !channel?.isThread && !channel?.isCategory;
    case "group-top":
    case "group-bottom":
      return !channel?.isThread && !channel?.isCategory;
    case "rename-prefix":
    case "rename-suffix":
    case "rename-replace":
      return Boolean(channel && !channel.isCategory);
    case "slowmode-5":
    case "slowmode-off":
      return Boolean(channel?.isTextBased || channel?.isForum || channel?.isThread);
    case "nsfw-on":
    case "nsfw-off":
      return Boolean(channel?.isTextBased || channel?.isForum) && !channel?.isThread;
    default:
      return false;
  }
}

function getChannelBulkActionPreview(channel: any, actionId: ChannelBulkActionId, options: ChannelBulkActionOptions = {}) {
  switch (actionId) {
    case "lock":
      return { field: "Lock state", current: channel?.lockedForEveryone ? "Locked" : "Open", next: "Locked" };
    case "unlock":
      return { field: "Lock state", current: channel?.lockedForEveryone ? "Locked" : "Open", next: "Open" };
    case "move-category":
      return {
        field: "Category",
        current: options.currentCategoryName || "Uncategorized",
        next: options.categoryName || "Choose a category",
      };
    case "group-top":
      return {
        field: "Order",
        current: options.currentOrderLabel || "Current slot",
        next: options.nextOrderLabel || "Top of group",
      };
    case "group-bottom":
      return {
        field: "Order",
        current: options.currentOrderLabel || "Current slot",
        next: options.nextOrderLabel || "Bottom of group",
      };
    case "rename-prefix":
      return {
        field: "Name",
        current: channel?.name || "Unnamed",
        next: options.renamePrefix ? buildBulkRenameValue(channel, options.renamePrefix) : "Add a prefix",
      };
    case "rename-suffix":
      return {
        field: "Name",
        current: channel?.name || "Unnamed",
        next: options.renameSuffix ? buildBulkRenameSuffixValue(channel, options.renameSuffix) : "Add a suffix",
      };
    case "rename-replace":
      return {
        field: "Name",
        current: channel?.name || "Unnamed",
        next: options.renameSearch
          ? buildBulkRenameReplaceValue(channel, options.renameSearch, options.renameReplace || "")
          : "Find text to replace",
      };
    case "slowmode-5":
      return {
        field: "Slowmode",
        current: channel?.slowmodeSeconds ? `${channel.slowmodeSeconds}s` : "Off",
        next: "5s",
      };
    case "slowmode-off":
      return {
        field: "Slowmode",
        current: channel?.slowmodeSeconds ? `${channel.slowmodeSeconds}s` : "Off",
        next: "Off",
      };
    case "nsfw-on":
      return { field: "NSFW", current: channel?.nsfw ? "Enabled" : "Disabled", next: "Enabled" };
    case "nsfw-off":
      return { field: "NSFW", current: channel?.nsfw ? "Enabled" : "Disabled", next: "Disabled" };
    default:
      return { field: "Change", current: "Current", next: "Next" };
  }
}

function getChannelBulkActionPayload(actionId: ChannelBulkActionId, options: ChannelBulkActionOptions = {}) {
  switch (actionId) {
    case "lock":
      return { lockedDown: true };
    case "unlock":
      return { lockedDown: false };
    case "move-category":
      return { parentId: options.categoryId ?? null };
    case "group-top":
      return { positionMove: "top" as const };
    case "group-bottom":
      return { positionMove: "bottom" as const };
    case "rename-prefix":
    case "rename-suffix":
    case "rename-replace":
      return {};
    case "slowmode-5":
      return { slowmode: 5 };
    case "slowmode-off":
      return { slowmode: 0 };
    case "nsfw-on":
      return { nsfw: true };
    case "nsfw-off":
      return { nsfw: false };
    default:
      return {};
  }
}

function getTimestamp(value: Date | string | null | undefined) {
  if (!value) return 0;
  return new Date(value).getTime();
}

function buildBulkReorderQueue(channels: any[], actionId: ChannelBulkActionId) {
  if (actionId !== "group-top" && actionId !== "group-bottom") {
    return channels;
  }

  const grouped = new Map<string, any[]>();

  for (const channel of channels) {
    const key = String(channel?.parentId ?? "__root__");
    const current = grouped.get(key) || [];
    current.push(channel);
    grouped.set(key, current);
  }

  const queue: any[] = [];
  const groupEntries = Array.from(grouped.entries()).sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));

  for (const [, groupChannels] of groupEntries) {
    const ordered = [...groupChannels].sort(
      (left, right) =>
        (left?.position || 0) - (right?.position || 0) ||
        String(left?.name || left?.id || "").localeCompare(String(right?.name || right?.id || "")),
    );
    if (actionId === "group-top") {
      ordered.reverse();
    }
    queue.push(...ordered);
  }

  return queue;
}

export default function WorkspacePage() {
  const [location, navigate] = useLocation();
  const parsed = parseArchivistLocation(location);
  const { section, item, serverId } = parsed;
  const [moduleEnabled, setModuleEnabled] = useState<Record<string, boolean>>(DEFAULT_MODULE_ENABLED);
  const [commandFilter, setCommandFilter] = useState<string>("all");
  const [activeSettingsGroupId, setActiveSettingsGroupId] = useState<string | null>(null);
  const redirectGuardRef = useRef<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!serverId) return;
    const isCanonical = location.startsWith(`/dashboard/servers/${serverId}/${section}/${item.slug}`);
    if (!isCanonical) {
      navigate(buildArchivistItemPath(serverId, section, item.slug), { replace: true });
    }
  }, [item.slug, location, navigate, section, serverId]);

  useEffect(() => {
    if (!serverId || typeof window === "undefined") return;
    try {
      const rawValue = window.localStorage.getItem(`archivist:modules:${serverId}`);
      if (!rawValue) {
        setModuleEnabled(DEFAULT_MODULE_ENABLED);
        return;
      }
      const parsedValue = JSON.parse(rawValue);
      if (!parsedValue || typeof parsedValue !== "object") {
        setModuleEnabled(DEFAULT_MODULE_ENABLED);
        return;
      }
      setModuleEnabled({
        ...DEFAULT_MODULE_ENABLED,
        ...Object.fromEntries(
          Object.entries(parsedValue).map(([key, value]) => [key, Boolean(value)]),
        ),
      });
    } catch {
      setModuleEnabled(DEFAULT_MODULE_ENABLED);
    }
  }, [serverId]);

  useEffect(() => {
    if (!serverId || typeof window === "undefined") return;
    window.localStorage.setItem(`archivist:modules:${serverId}`, JSON.stringify(moduleEnabled));
  }, [moduleEnabled, serverId]);

  const { data: server, isLoading: serverLoading } = useServer(serverId || 0);
  const serversQuery = useServers({ enabled: true });
  const overviewQuery = useWorkspaceOverview(serverId || 0, { enabled: !!serverId });
  const commandsQuery = useServerCommands(serverId || 0, { enabled: !!serverId });
  const logsQuery = useCommandLogs(serverId || 0, { enabled: !!serverId });
  const studioDocumentsQuery = useStudioDocuments(serverId || 0, { enabled: !!serverId });
  const studioPublicationsQuery = useStudioPublications(serverId || 0, { enabled: !!serverId });
  const discordContextQuery = useDiscordContext(serverId || 0, { enabled: !!serverId });
  const channelSettingsQuery = useChannelSettings(serverId || 0, { enabled: !!serverId });
  const permissionRulesQuery = usePermissionRules(serverId || 0, { enabled: !!serverId });
  const { data: botStatus } = useBotStatus();

  const commands = commandsQuery.data || [];
  const logs = logsQuery.data;
  const overview = overviewQuery.data;
  const documents = studioDocumentsQuery.data || [];
  const publications = studioPublicationsQuery.data || [];
  const context = discordContextQuery.data;
  const channelSettings = channelSettingsQuery.data || [];
  const permissionRules = permissionRulesQuery.data || [];
  const visibleServers = serversQuery.data || [];
  const workspaceAccessError = [
    overviewQuery.error,
    commandsQuery.error,
    logsQuery.error,
    studioDocumentsQuery.error,
    studioPublicationsQuery.error,
    discordContextQuery.error,
    channelSettingsQuery.error,
    permissionRulesQuery.error,
  ].find((error) => isApiResponseError(error) && (error.status === 403 || error.status === 404));

  useEffect(() => {
    if (!serverId || serverLoading || serversQuery.isLoading) return;
    if (server) return;

    if (visibleServers.length > 0) {
      navigate(buildArchivistSectionPath(visibleServers[0].id, section), { replace: true });
    }
  }, [navigate, section, server, serverId, serverLoading, serversQuery.isLoading, visibleServers]);

  useEffect(() => {
    if (!serverId || !workspaceAccessError || serversQuery.isLoading) return;

    const redirectKey = `${serverId}:${section}`;
    if (redirectGuardRef.current === redirectKey) return;
    redirectGuardRef.current = redirectKey;

    const fallbackServer = visibleServers.find((entry: any) => entry.id !== serverId) || visibleServers[0];
    toast({
      title: "Workspace moved",
      description: workspaceAccessError.message || "That server is no longer available in this session, so Archivist moved you to a safe page.",
      variant: "destructive",
    });

    if (fallbackServer?.id) {
      navigate(buildArchivistSectionPath(fallbackServer.id, section), { replace: true });
      return;
    }

    navigate("/dashboard", { replace: true });
  }, [navigate, section, serverId, serversQuery.isLoading, toast, visibleServers, workspaceAccessError]);

  const publishedDocumentIds = useMemo(
    () => new Set(publications.filter((entry) => entry?.active !== false).map((entry) => entry.documentId)),
    [publications],
  );
  const drafts = useMemo(
    () =>
      [...documents]
        .filter((document) => document.kind !== "template" && !document.isArchived)
        .sort((a, b) => getTimestamp(b.updatedAt) - getTimestamp(a.updatedAt)),
    [documents],
  );
  const templates = useMemo(
    () =>
      [...documents]
        .filter((document) => document.kind === "template" || Boolean(document.moduleBinding))
        .sort((a, b) => getTimestamp(b.updatedAt) - getTimestamp(a.updatedAt)),
    [documents],
  );
  const filteredCommands = useMemo(() => {
    return commands.filter((command) => {
      if (commandFilter === "all") return true;
      if (commandFilter === "disabled") return !command.enabled;
      const triggerType = command.triggerType || "";
      if (commandFilter === "auto") return !["slash", "message"].includes(triggerType);
      return triggerType === commandFilter;
    });
  }, [commandFilter, commands]);

  const invalidServerRoute = location.startsWith("/dashboard/servers/") && !serverId;

  if (invalidServerRoute) {
    return (
      <DashboardLayout mode="overview">
        <Card className="archivist-panel">
          <CardHeader>
            <CardTitle className="text-white">Invalid server route</CardTitle>
            <CardDescription>
              That workspace URL does not point at a valid server ID. Pick a connected server from the dashboard and try again.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button className="min-h-11 rounded-[18px]" onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </Button>
            {visibleServers[0] ? (
              <Button
                variant="outline"
                className="min-h-11 rounded-[18px] border-white/10 bg-white/[0.03]"
                onClick={() => navigate(buildArchivistSectionPath(visibleServers[0].id, "commands"))}
              >
                Open First Workspace
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  if (!serverId || serverLoading || (serversQuery.isLoading && !visibleServers.length)) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Skeleton className="h-28 rounded-[26px] bg-white/5" />
          <Skeleton className="h-[480px] rounded-[26px] bg-white/5" />
        </div>
      </DashboardLayout>
    );
  }

  if (workspaceAccessError) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Skeleton className="h-28 rounded-[26px] bg-white/5" />
          <Skeleton className="h-[480px] rounded-[26px] bg-white/5" />
        </div>
      </DashboardLayout>
    );
  }

  if (!server) {
    return (
      <DashboardLayout>
        <Card className="archivist-panel">
          <CardHeader>
            <CardTitle className="text-white">No connected servers</CardTitle>
            <CardDescription>
              Archivist only shows servers that are both live in Discord and still connected to the bot.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild className="min-h-11 rounded-[18px]">
              <a href="/api/invite-url?redirect=1" target="_blank" rel="noopener noreferrer">
                Invite Archivist
              </a>
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  if (item.id === "commands-create") {
    const searchParams = typeof window === "undefined" ? new URLSearchParams() : new URLSearchParams(window.location.search);
    const commandId = Number(searchParams.get("commandId") || 0);
    const selection = Number.isFinite(commandId) && commandId > 0 ? commandId : "new";

    return (
      <DashboardLayout>
        <div className="space-y-4">
          <PageHeader
            item={item}
            title="Create Command"
            description="Build command flows in the maintained Archivist workflow builder without bouncing between legacy editors."
            secondaryAction={
              <Button
                variant="outline"
                className="min-h-11 rounded-[18px] border-white/10 bg-white/[0.03]"
                onClick={() => navigate(buildArchivistItemPath(serverId, "commands", "overview"))}
              >
                Back to Library
              </Button>
            }
          />
          <CustomCommandV2Forge serverId={serverId} screen="create" initialSelection={selection} />
        </div>
      </DashboardLayout>
    );
  }

  if (item.id === "studio-create") {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <PageHeader
            item={item}
            title="Design Studio Editor"
            description="Use the focused builder when you are actively creating or revising assets."
            secondaryAction={
              <Button
                variant="outline"
                className="min-h-11 rounded-[18px] border-white/10 bg-white/[0.03]"
                onClick={() => navigate(buildArchivistItemPath(serverId, "studio", "overview"))}
              >
                Back to Studio Overview
              </Button>
            }
          />
          <Card className="archivist-panel overflow-hidden">
            <div className="border-b border-white/6 px-4 py-4">
              <p className="text-sm font-semibold text-white">Focused editor</p>
              <p className="mt-1 text-sm text-white/46">Drafts, preview, and publishing stay inside the editor page.</p>
            </div>
            <DesignStudioTab serverId={serverId} />
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <PageHeader
          item={item}
          title={item.label}
          description={item.description}
          primaryAction={getPrimaryAction(item, serverId, navigate)}
          secondaryAction={getSecondaryAction(item, serverId, navigate)}
          tabs={item.id === "commands-all" ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {COMMAND_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setCommandFilter(filter.value)}
                  className={cn(
                    "whitespace-nowrap rounded-full border px-3 py-2 text-sm transition",
                    commandFilter === filter.value
                      ? "border-[#8e2635] bg-[#1b1115] text-white shadow-[0_0_18px_rgba(177,18,38,0.16)]"
                      : "border-white/8 bg-[#0b0d10] text-white/55",
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          ) : null}
        />

        {renderPageContent({
          item,
          server,
          serverId,
          commands,
          filteredCommands,
          logs,
          overview,
          documents,
          drafts,
          templates,
          publications,
          publishedDocumentIds,
          botStatus,
          context,
          channelSettings,
          permissionRules,
          moduleEnabled,
          setModuleEnabled,
          activeSettingsGroupId,
          setActiveSettingsGroupId,
          navigate,
        })}
      </div>
    </DashboardLayout>
  );
}

function renderPageContent({
  item,
  server,
  serverId,
  commands,
  filteredCommands,
  logs,
  overview,
  documents,
  drafts,
  templates,
  publications,
  publishedDocumentIds,
  botStatus,
  context,
  channelSettings,
  permissionRules,
  moduleEnabled,
  setModuleEnabled,
  activeSettingsGroupId,
  setActiveSettingsGroupId,
  navigate,
}: any) {
  const enabledModuleCards = MODULE_CARDS.filter((module) => moduleEnabled[module.id]);
  const disabledModuleCards = MODULE_CARDS.filter((module) => !moduleEnabled[module.id]);
  const textChannels = (context?.channels || []).filter((channel: any) => channel.isTextBased && !channel.isThread);

  if (item.id === "commands-overview") {
    return <CustomCommandV2Forge serverId={serverId} screen="hub" />;
  }

  if (item.id === "commands-all") {
    return (
      <Card className="archivist-panel">
        <CardContent className="space-y-2 p-3">
          {filteredCommands.map((command: any) => (
            <button
              key={command.id}
              type="button"
              onClick={() => navigate(buildArchivistItemPath(serverId, "commands", "create-command", { search: { commandId: command.id } }))}
              className="flex w-full items-center gap-3 rounded-[22px] border border-white/8 bg-[#0a0c0f] px-4 py-4 text-left transition hover:border-[#8e2635] hover:bg-[#121418]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-[15px] border border-white/8 bg-[#111317] text-[#ff6276]">
                <Braces className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-white">{command.name}</p>
                  <CommandBadge>{command.triggerType}</CommandBadge>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-white/46">
                  <span>Cooldown {command.cooldown || 0}s</span>
                  <span>{command.enabled ? "Live" : "Disabled"}</span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-white/30" />
            </button>
          ))}
          {!filteredCommands.length ? <EmptyState label="No commands match this filter yet." /> : null}
        </CardContent>
      </Card>
    );
  }

  if (item.id === "commands-logs") {
    return <CustomCommandV2Forge serverId={serverId} screen="activity" />;
  }

  if (item.id === "commands-slash" || item.id === "commands-message" || item.id === "commands-auto") {
    const subset = commands.filter((command: any) => {
      if (item.id === "commands-auto") return !["slash", "message"].includes(command.triggerType || "");
      return command.triggerType === (item.id === "commands-slash" ? "slash" : "message");
    });
    const title = item.id === "commands-slash" ? "Slash command lanes" : item.id === "commands-message" ? "Message command lanes" : "Automated responses";
    const body = item.id === "commands-auto"
      ? "Automation flows that respond without a manual slash or message trigger."
      : "Review the command subset tied to this trigger type and jump straight into editing.";

    return (
      <Card className="archivist-panel">
        <CardHeader>
          <CardTitle className="text-white">{title}</CardTitle>
          <CardDescription>{body}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {subset.map((command: any) => (
            <button
              key={command.id}
              type="button"
              onClick={() => navigate(buildArchivistItemPath(serverId, "commands", "create-command", { search: { commandId: command.id } }))}
              className="flex w-full items-center justify-between gap-3 rounded-[20px] border border-white/8 bg-[#0a0c0f] px-4 py-4 text-left transition hover:border-[#8e2635] hover:bg-[#121418]"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{command.name}</p>
                <p className="mt-1 text-xs text-white/42">Cooldown {command.cooldown || 0}s · {command.enabled ? "Live" : "Disabled"}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-white/30" />
            </button>
          ))}
          {!subset.length ? <EmptyState label="No commands are in this lane yet." /> : null}
        </CardContent>
      </Card>
    );
  }

  if (item.id === "commands-variables") {
    return (
      <div className="space-y-4">
        <MetricGrid
          items={[
            { label: "Variables", value: String(VARIABLE_CARDS.length) },
            { label: "Commands", value: String(commands.length) },
            { label: "Channels", value: String(context?.channels.length || 0) },
          ]}
        />
        <Card className="archivist-panel">
          <CardHeader>
            <CardTitle className="text-white">Reusable variables</CardTitle>
            <CardDescription>Keep the common variable language visible so command builders do not feel blank or dead.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {VARIABLE_CARDS.map((variable) => (
              <div key={variable.label} className="rounded-[20px] border border-white/8 bg-[#0a0c0f] p-4">
                <p className="text-sm font-semibold text-white">{variable.label}</p>
                <p className="mt-2 text-sm text-white/46">{variable.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (item.id === "commands-cooldowns") {
    const sorted = [...commands].sort((a: any, b: any) => (b.cooldown || 0) - (a.cooldown || 0));
    return (
      <Card className="archivist-panel">
        <CardHeader>
          <CardTitle className="text-white">Cooldown map</CardTitle>
          <CardDescription>See which commands are rate-limited hardest before you tune them.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {sorted.map((command: any) => (
            <div key={command.id} className="flex items-center justify-between gap-3 rounded-[20px] border border-white/8 bg-[#0a0c0f] px-4 py-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{command.name}</p>
                <p className="mt-1 text-xs text-white/42">{command.triggerType || "command"} · {command.enabled ? "Live" : "Disabled"}</p>
              </div>
              <CommandBadge>{command.cooldown || 0}s</CommandBadge>
            </div>
          ))}
          {!sorted.length ? <EmptyState label="No commands with cooldowns yet." /> : null}
        </CardContent>
      </Card>
    );
  }

  if (item.id === "studio-overview") {
    return (
      <div className="space-y-4">
        <Card className="archivist-panel">
          <CardContent className="space-y-5 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">Start in Studio</p>
                <p className="mt-1 text-sm text-white/48">Open a fresh surface or jump back into the work you already started.</p>
              </div>
              <div className="hidden items-center gap-2 sm:flex">
                <StudioCountBadge label="Drafts" value={String(drafts.length)} />
                <StudioCountBadge label="Templates" value={String(templates.length)} />
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-[1.1fr_minmax(0,0.9fr)]">
              <QuickLaunchCard
                title="Create New Surface"
                subtitle="Start a blank Studio message and move straight into the builder."
                icon={BadgePlus}
                href={buildArchivistItemPath(serverId, "studio", "create-new")}
                tone="primary"
              />
              <QuickLaunchCard
                title="Open Drafts"
                subtitle="Resume the surfaces you were shaping without scanning a giant launcher."
                icon={FileStack}
                href={buildArchivistItemPath(serverId, "studio", "drafts")}
              />
            </div>

            <div className="rounded-[22px] border border-white/8 bg-[#0a0c0f] p-4">
              <div className="flex flex-wrap items-center gap-2">
                <MiniRouteLink label="Embeds" href={buildArchivistItemPath(serverId, "studio", "embeds")} />
                <MiniRouteLink label="Components" href={buildArchivistItemPath(serverId, "studio", "components-v2")} />
                <MiniRouteLink label="Welcome" href={buildArchivistItemPath(serverId, "studio", "welcome")} />
                <MiniRouteLink label="Verify" href={buildArchivistItemPath(serverId, "studio", "verify")} />
                <MiniRouteLink label="Tickets" href={buildArchivistItemPath(serverId, "studio", "tickets")} />
                <MiniRouteLink label="Templates" href={buildArchivistItemPath(serverId, "studio", "templates")} />
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="grid gap-4 xl:grid-cols-[1.1fr_minmax(0,0.9fr)]">
          <Card className="archivist-panel">
            <CardHeader>
              <CardTitle className="text-white">Recent drafts</CardTitle>
              <CardDescription>Return to the surfaces you touched last without reopening the full Studio shell first.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {drafts.slice(0, 4).map((draft: any) => (
                <button
                  key={draft.id}
                  type="button"
                  onClick={() => navigate(buildArchivistItemPath(serverId, "studio", "create-new", { search: { documentId: draft.id } }))}
                  className="flex w-full items-center justify-between rounded-[20px] border border-white/8 bg-[#0a0c0f] px-4 py-4 text-left transition hover:border-[#8e2635] hover:bg-[#121418]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{draft.name}</p>
                    <p className="mt-1 text-xs text-white/46">
                      {publishedDocumentIds.has(draft.id) ? "Published" : "Draft"} · {new Date(draft.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-white/30" />
                </button>
              ))}
              {!drafts.length ? <EmptyState label="No drafts yet. Start with a fresh surface." /> : null}
            </CardContent>
          </Card>
          <Card className="archivist-panel">
            <CardHeader>
              <CardTitle className="text-white">Templates</CardTitle>
              <CardDescription>Reusable welcome, verify, and support surfaces that are worth keeping visible but not oversized.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {templates.slice(0, 4).map((template: any) => (
                <QuickActionRow
                  key={template.id}
                  icon={CopyPlus}
                  title={template.name}
                  description={template.moduleBinding ? template.moduleBinding.replace(/_/g, " ") : "Reusable template"}
                  href={buildArchivistItemPath(serverId, "studio", "create-new", { search: { documentId: template.id } })}
                />
              ))}
              {!templates.length ? <EmptyState label="No templates saved yet." /> : null}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (item.id === "studio-drafts") {
    return (
      <Card className="archivist-panel">
        <CardContent className="space-y-2 p-3">
          {drafts.map((draft: any) => (
            <button
              key={draft.id}
              type="button"
              onClick={() => navigate(buildArchivistItemPath(serverId, "studio", "create-new", { search: { documentId: draft.id } }))}
              className="flex w-full items-center justify-between rounded-[20px] border border-white/8 bg-[#0a0c0f] px-4 py-4 text-left"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{draft.name}</p>
                <p className="mt-1 text-xs text-white/46">{new Date(draft.updatedAt).toLocaleDateString()}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-white/30" />
            </button>
          ))}
          {!drafts.length ? <EmptyState label="No drafts available." /> : null}
        </CardContent>
      </Card>
    );
  }

  if (item.id === "studio-templates") {
    return (
      <Card className="archivist-panel">
        <CardContent className="space-y-2 p-3">
          {templates.map((template: any) => (
            <QuickActionRow
              key={template.id}
              icon={LayoutTemplate}
              title={template.name}
              description={template.moduleBinding ? template.moduleBinding.replace(/_/g, " ") : "Template"}
              href={buildArchivistItemPath(serverId, "studio", "create-new", { search: { documentId: template.id } })}
            />
          ))}
          {!templates.length ? <EmptyState label="No templates have been created yet." /> : null}
        </CardContent>
      </Card>
    );
  }

  if (["studio-embeds", "studio-components", "studio-welcome", "studio-verify", "studio-tickets"].includes(item.id)) {
    const subset = documents.filter((document: any) => {
      if (item.id === "studio-embeds") return inferStudioPrimarySurfaceType(document.document) === "embed";
      if (item.id === "studio-components") return inferStudioPrimarySurfaceType(document.document) === "components";
      if (item.id === "studio-welcome") return document.moduleBinding === "welcome" || document.moduleBinding === "welcome_dm";
      if (item.id === "studio-verify") return document.moduleBinding === "verify";
      if (item.id === "studio-tickets") return document.moduleBinding === "ticket_panel" || document.moduleBinding === "tickets";
      return false;
    });

    return (
      <div className="space-y-4">
        <MetricGrid
          items={[
            { label: "Assets", value: String(subset.length) },
            { label: "Drafts", value: String(drafts.length) },
            { label: "Published", value: String(publications.length) },
          ]}
        />
        <Card className="archivist-panel">
          <CardHeader>
            <CardTitle className="text-white">{item.label}</CardTitle>
            <CardDescription>{item.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {subset.map((document: any) => (
              <button
                key={document.id}
                type="button"
                onClick={() => navigate(buildArchivistItemPath(serverId, "studio", "create-new", { search: { documentId: document.id } }))}
                className="flex w-full items-center justify-between gap-3 rounded-[20px] border border-white/8 bg-[#0a0c0f] px-4 py-4 text-left transition hover:border-[#8e2635] hover:bg-[#121418]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{document.name}</p>
                  <p className="mt-1 text-xs text-white/42">{document.moduleBinding || inferStudioPrimarySurfaceType(document.document)}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-white/30" />
              </button>
            ))}
            {!subset.length ? <EmptyState label="No matching Studio assets yet. This route is live and ready for the next assets you build." /> : null}
            <div className="grid gap-3 pt-2 sm:grid-cols-2">
              <QuickActionRow
                icon={BadgePlus}
                title="Open Builder"
                description="Create or edit a matching Studio asset."
                href={buildArchivistItemPath(serverId, "studio", "create-new")}
              />
              <QuickActionRow
                icon={FileStack}
                title="Open Drafts"
                description="Review the recent draft list for this server."
                href={buildArchivistItemPath(serverId, "studio", "drafts")}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (item.id === "creative-overview") {
    return (
      <div className="space-y-4">
        <MetricGrid
          items={[
            { label: "Modules", value: String(MODULE_CARDS.length) },
            { label: "Tracked", value: String(enabledModuleCards.length) },
            { label: "Recent Runs", value: String(overview?.metrics.recentCommands || 0) },
          ]}
        />
        <div className="grid gap-4 xl:grid-cols-[1.15fr_minmax(0,0.85fr)]">
          <Card className="archivist-panel">
            <CardHeader>
              <CardTitle className="text-white">Module control center</CardTitle>
              <CardDescription>See what is live, what still needs setup, and jump straight into the next useful lane.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <QuickActionRow icon={Gamepad2} title="Modules" description="Enable and configure the engagement systems quickly." href={buildArchivistItemPath(serverId, "creative", "modules")} />
                <QuickActionRow icon={Users} title="Leaderboards" description="Review visible rankings and recurring engagement outputs." href={buildArchivistItemPath(serverId, "creative", "leaderboards")} />
              </div>
              <div className="grid gap-3">
                {MODULE_CARDS.map((module) => {
                  const blueprint = MODULE_BLUEPRINTS[module.id];
                  return (
                    <div key={module.id} className="rounded-[22px] border border-white/8 bg-[#0a0c0f] p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-white">{module.title}</p>
                            <CommandBadge>{moduleEnabled[module.id] ? "enabled" : "staged"}</CommandBadge>
                          </div>
                          <p className="mt-2 text-sm text-white/52">{blueprint.focus}</p>
                          <p className="mt-2 text-xs text-white/38">{blueprint.helperLabel}</p>
                        </div>
                        <Button
                          variant="outline"
                          className="min-h-10 rounded-[16px] border-white/10 bg-white/[0.03]"
                          onClick={() => navigate(buildArchivistItemPath(serverId, "creative", module.id === "daily" ? "daily-rewards" : module.id))}
                        >
                          Open {module.title}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="archivist-panel">
              <CardHeader>
                <CardTitle className="text-white">Ready next</CardTitle>
                <CardDescription>Fast wins so the creative side never feels like a dead branch of the dashboard.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {enabledModuleCards.length ? (
                  enabledModuleCards.slice(0, 3).map((module) => (
                    <QuickActionRow
                      key={module.id}
                      icon={Sparkles}
                      title={`${module.title} setup`}
                      description={MODULE_BLUEPRINTS[module.id].starterChecklist[0]}
                      href={buildArchivistItemPath(serverId, "creative", module.id === "daily" ? "daily-rewards" : module.id)}
                    />
                  ))
                ) : (
                  <EmptyState label="No creative modules are enabled yet. Open Modules and flip on the ones you want to grow first." />
                )}
              </CardContent>
            </Card>

            <Card className="archivist-panel">
              <CardHeader>
                <CardTitle className="text-white">Needs first pass</CardTitle>
                <CardDescription>Disabled lanes are still one click away from a usable setup path.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {disabledModuleCards.length ? disabledModuleCards.map((module) => (
                  <div key={module.id} className="rounded-[18px] border border-white/8 bg-[#0a0c0f] px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white">{module.title}</p>
                        <p className="mt-1 text-sm text-white/46">{MODULE_BLUEPRINTS[module.id].starterChecklist[0]}</p>
                      </div>
                      <CommandBadge>disabled</CommandBadge>
                    </div>
                  </div>
                )) : (
                  <EmptyState label="Everything in Fun & Games is already enabled, so this lane becomes a quick status board instead." />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (item.id === "creative-modules") {
    return (
      <div className="space-y-4">
        <MetricGrid
          items={[
            { label: "Tracked", value: String(enabledModuleCards.length) },
            { label: "Staged", value: String(disabledModuleCards.length) },
            { label: "Members", value: String(context?.memberCount || overview?.server.memberCount || 0) },
          ]}
        />
        <Card className="archivist-panel">
          <CardHeader>
            <CardTitle className="text-white">Module switchboard</CardTitle>
            <CardDescription>These switches are saved per server in the dashboard so you can keep track of which lanes you are actively building out.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
        {MODULE_CARDS.map((module) => (
          <Card key={module.id} className="archivist-panel">
            <CardContent className="flex flex-col items-start gap-4 p-4 sm:flex-row sm:items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-[16px] border border-white/8 bg-[#120d11] text-[#ff6276]">
                <Gamepad2 className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-white">{module.title}</p>
                  <CommandBadge>{moduleEnabled[module.id] ? "active" : "staged"}</CommandBadge>
                </div>
                <p className="mt-1 text-sm text-white/46">{module.description}</p>
                <p className="mt-2 text-xs text-white/38">{MODULE_BLUEPRINTS[module.id].focus}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <MiniRouteLink
                    label="Commands"
                    href={buildArchivistItemPath(serverId, "commands", MODULE_BLUEPRINTS[module.id].commandRoute)}
                  />
                  <MiniRouteLink
                    label="Studio"
                    href={buildArchivistItemPath(serverId, "studio", MODULE_BLUEPRINTS[module.id].studioRoute)}
                  />
                  <MiniRouteLink
                    label="Settings"
                    href={buildArchivistItemPath(serverId, "settings", MODULE_BLUEPRINTS[module.id].settingsRoute)}
                  />
                </div>
              </div>
              <div className="w-full space-y-3 sm:w-auto">
                <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-start">
                  <Switch
                    checked={moduleEnabled[module.id]}
                    onCheckedChange={(checked) => setModuleEnabled((current: Record<string, boolean>) => ({ ...current, [module.id]: checked }))}
                  />
                  <Button
                    variant="outline"
                    className="min-h-10 rounded-[16px] border-white/10 bg-white/[0.03]"
                    onClick={() => navigate(buildArchivistItemPath(serverId, "creative", module.id === "daily" ? "daily-rewards" : module.id))}
                  >
                    Configure
                  </Button>
                </div>
                <div className="rounded-[18px] border border-white/8 bg-[#0a0c0f] px-3 py-3 text-xs text-white/50 sm:max-w-[280px]">
                  Next up: {MODULE_BLUEPRINTS[module.id].starterChecklist[0]}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (["creative-leveling", "creative-economy", "creative-trivia", "creative-giveaways", "creative-daily", "creative-leaderboards"].includes(item.id)) {
    const moduleId = item.id === "creative-daily" ? "daily" : item.id.replace("creative-", "");
    const moduleCard = MODULE_CARDS.find((module) => module.id === moduleId);

    if (item.id === "creative-leaderboards") {
      return (
        <Card className="archivist-panel">
          <CardHeader>
            <CardTitle className="text-white">Leaderboards</CardTitle>
            <CardDescription>Visible rankings and the most active command or module lanes right now.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(overview?.commandUsage || []).slice(0, 6).map((entry: any) => (
              <div key={entry.command} className="flex items-center justify-between gap-3 rounded-[20px] border border-white/8 bg-[#0a0c0f] px-4 py-4">
                <p className="text-sm font-medium text-white">{entry.command}</p>
                <CommandBadge>{entry.count}</CommandBadge>
              </div>
            ))}
            {!(overview?.commandUsage || []).length ? <EmptyState label="No leaderboard activity has been recorded yet." /> : null}
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        <MetricGrid
          items={[
            { label: "Module", value: moduleCard?.title || item.label },
            { label: "Workspace", value: moduleEnabled[moduleId] ? "Tracked" : "Staged" },
            { label: "Members", value: String(context?.memberCount || overview?.server.memberCount || 0) },
          ]}
        />
        <div className="grid gap-4 xl:grid-cols-[1.15fr_minmax(0,0.85fr)]">
          <Card className="archivist-panel">
            <CardHeader>
              <CardTitle className="text-white">{moduleCard?.title || item.label}</CardTitle>
              <CardDescription>{moduleCard?.description || item.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-[22px] border border-white/8 bg-[#0a0c0f] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">Control state</p>
                    <p className="mt-2 text-sm text-white/52">
                      {moduleEnabled[moduleId]
                        ? "This module is active in the dashboard and ready for deeper tuning."
                        : "This module is staged for later. The setup path is still fully mapped so you can build it without guesswork."}
                    </p>
                    <p className="mt-2 text-xs text-white/38">{MODULE_BLUEPRINTS[moduleId]?.helperLabel}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs uppercase tracking-[0.18em] text-white/34">Track here</span>
                    <Switch
                      checked={moduleEnabled[moduleId]}
                      onCheckedChange={(checked) => setModuleEnabled((current: Record<string, boolean>) => ({ ...current, [moduleId]: checked }))}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-[22px] border border-white/8 bg-[#0a0c0f] p-4">
                <p className="text-sm font-semibold text-white">Starter checklist</p>
                <div className="mt-3 space-y-2">
                  {MODULE_BLUEPRINTS[moduleId]?.starterChecklist.map((step) => (
                    <div key={step} className="flex items-start gap-3 rounded-[18px] border border-white/8 bg-[#101216] px-3 py-3">
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#7d2432]/60 bg-[#160f12] text-[11px] font-semibold text-[#ff8695]">
                        +
                      </div>
                      <p className="text-sm text-white/68">{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <QuickActionRow
                  icon={ScrollText}
                  title="Command lane"
                  description="Open the matching command surface for this module."
                  href={buildArchivistItemPath(serverId, "commands", MODULE_BLUEPRINTS[moduleId].commandRoute)}
                />
                <QuickActionRow
                  icon={LayoutTemplate}
                  title="Studio lane"
                  description="Build the visible messages or panels tied to this module."
                  href={buildArchivistItemPath(serverId, "studio", MODULE_BLUEPRINTS[moduleId].studioRoute)}
                />
                <QuickActionRow
                  icon={Settings2}
                  title="Settings lane"
                  description="Open the supporting settings route that normally matters next."
                  href={buildArchivistItemPath(serverId, "settings", MODULE_BLUEPRINTS[moduleId].settingsRoute)}
                />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="archivist-panel">
              <CardHeader>
                <CardTitle className="text-white">Best next actions</CardTitle>
                <CardDescription>Jump directly to the supporting surfaces instead of backing out and hunting through the sidebar.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <QuickActionRow
                  icon={Gamepad2}
                  title="Back to Modules"
                  description="Return to the switchboard and compare every engagement lane."
                  href={buildArchivistItemPath(serverId, "creative", "modules")}
                />
                <QuickActionRow
                  icon={Users}
                  title="Open Leaderboards"
                  description="Review the visible rankings and competitive output around this module."
                  href={buildArchivistItemPath(serverId, "creative", "leaderboards")}
                />
              </CardContent>
            </Card>

            <Card className="archivist-panel">
              <CardHeader>
                <CardTitle className="text-white">Module focus</CardTitle>
                <CardDescription>Keep the design goal visible while you wire commands, panels, and settings together.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="rounded-[20px] border border-white/8 bg-[#0a0c0f] px-4 py-4 text-sm text-white/68">
                  {MODULE_BLUEPRINTS[moduleId]?.focus}
                </div>
                <div className="rounded-[20px] border border-dashed border-white/10 bg-[#0a0c0f] px-4 py-4 text-sm text-white/46">
                  Saved here: module tracking is stored per server in this dashboard so your “working on now” state survives refreshes.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (item.id === "settings-overview") {
    return (
      <div className="space-y-4">
        <MetricGrid
          items={[
            { label: "Roles", value: String(context?.roles.length || 0) },
            { label: "Channels", value: String(context?.channels.length || 0) },
            { label: "Gateway", value: typeof botStatus?.gatewayPingMs === "number" ? `${Math.round(botStatus.gatewayPingMs)}ms` : "Pending" },
          ]}
        />
        <div className="grid gap-4 xl:grid-cols-[1.1fr_minmax(0,0.9fr)]">
          <Card className="archivist-panel">
            <CardHeader>
              <CardTitle className="text-white">Settings groups</CardTitle>
              <CardDescription>Open smaller control lanes instead of one long settings wall.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {SETTINGS_HELPERS.map((group) => (
                <div key={group.id} className="rounded-[22px] border border-white/8 bg-[#0a0c0f] p-4">
                  <p className="text-sm font-semibold text-white">{group.title}</p>
                  <p className="mt-1 text-sm text-white/46">{group.description}</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    {group.routes.map((route) => (
                      <QuickActionRow
                        key={route.slug}
                        icon={route.section === "studio" ? LayoutTemplate : route.section === "settings" ? Settings2 : ScrollText}
                        title={route.label}
                        description={`Open ${route.label.toLowerCase()} without backing out of the workspace.`}
                        href={buildArchivistItemPath(serverId, route.section, route.slug)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="archivist-panel">
            <CardHeader>
              <CardTitle className="text-white">Operator shortcuts</CardTitle>
              <CardDescription>Quick jumps for the settings routes you are most likely to need first.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <QuickLaunchCard title="General" icon={Settings2} href={buildArchivistItemPath(serverId, "settings", "general")} />
              <QuickLaunchCard title="Server Config" icon={Braces} href={buildArchivistItemPath(serverId, "settings", "server-config")} />
              <QuickLaunchCard title="Notifications" icon={MessageSquareText} href={buildArchivistItemPath(serverId, "settings", "notifications")} />
              <QuickLaunchCard title="Backups" icon={CopyPlus} href={buildArchivistItemPath(serverId, "settings", "backups")} />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (item.id === "settings-roles") {
    const roleGroups = [
      {
        id: "verification",
        title: "Verification Roles",
        description: "Roles used when members pass identity or onboarding checks.",
        values: context?.roles.slice(0, 2).map((role: any) => role.name) || [],
      },
      {
        id: "rewards",
        title: "Reward Roles",
        description: "Progression and engagement rewards mapped to higher participation.",
        values: context?.roles.slice(2, 4).map((role: any) => role.name) || [],
      },
      {
        id: "admin",
        title: "Admin Roles",
        description: "Privileged roles allowed to configure or override bot behavior.",
        values: context?.roles.slice(0, 1).map((role: any) => role.name) || [],
      },
      {
        id: "restricted",
        title: "Restricted Roles",
        description: "Roles excluded from certain workflows, modules, or command lanes.",
        values: context?.roles.slice(4, 6).map((role: any) => role.name) || [],
      },
    ] as const;

    return (
      <div className="space-y-4">
        <div className="rounded-[22px] border border-white/8 bg-[#0a0c0f] px-4 py-4 text-sm text-white/62">
          These role groups are a live planning view built from the current server role list, so you can sort out intent before deeper role-mapping tools expand.
        </div>
        <div className="grid gap-3">
        {roleGroups.map((group) => (
          <SettingsGroupCard
            key={group.id}
            title={group.title}
            description={group.description}
            values={group.values.length ? group.values : ["Not set"]}
            isExpanded={activeSettingsGroupId === group.id}
            onToggle={() => setActiveSettingsGroupId((current: string | null) => current === group.id ? null : group.id)}
            onOpenPermissions={() => navigate(buildArchivistItemPath(serverId, "settings", "permissions"))}
            onOpenChannels={() => navigate(buildArchivistItemPath(serverId, "settings", "channels"))}
            availableValues={(context?.roles || []).slice(0, 8).map((role: any) => role.name)}
          />
        ))}
        </div>
      </div>
    );
  }

  if (item.id === "settings-channels") {
    return <SettingsChannelsPage serverId={serverId} context={context} channelSettings={channelSettings} />;
  }

  if (item.id === "settings-permissions") {
    const roleNames = new Map((context?.roles || []).map((role: any) => [role.id, role.name]));
    const groupedRules = permissionRules.reduce((acc: Record<string, any[]>, rule: any) => {
      const key = rule.permission || "unknown";
      acc[key] = acc[key] || [];
      acc[key].push(rule);
      return acc;
    }, {});
    const groupedRuleEntries = Object.entries(groupedRules) as Array<[string, any[]]>;

    return (
      <div className="space-y-4">
        <MetricGrid
          items={[
            { label: "Rules", value: String(permissionRules.length) },
            { label: "Roles", value: String(context?.roles.length || 0) },
            { label: "Channels", value: String(context?.channels.length || 0) },
          ]}
        />
        <Card className="archivist-panel">
          <CardHeader>
            <CardTitle className="text-white">Permission rules</CardTitle>
            <CardDescription>Current server permission gates stored in Archivist, grouped by the permission they affect.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {groupedRuleEntries.length ? groupedRuleEntries.map(([permission, rules]) => (
              <div key={permission} className="rounded-[22px] border border-white/8 bg-[#0a0c0f] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{permission}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/34">{rules.length} rule{rules.length === 1 ? "" : "s"}</p>
                  </div>
                  <CommandBadge>{permission}</CommandBadge>
                </div>
                <div className="mt-3 space-y-2">
                  {rules.map((rule: any) => (
                    <div key={rule.id} className="flex items-center justify-between gap-3 rounded-[18px] border border-white/8 bg-[#101216] px-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">{rule.roleName || roleNames.get(rule.roleId) || rule.roleId}</p>
                        <p className="mt-1 text-xs text-white/42">Effect: {rule.effect} · Priority: {rule.priority || 0}</p>
                      </div>
                      <CommandBadge>{rule.effect}</CommandBadge>
                    </div>
                  ))}
                </div>
              </div>
            )) : (
              <EmptyState label="No stored permission rules yet. This page is now real and ready for the rule builder pass next." />
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <QuickActionRow
                icon={Users}
                title="Open Roles"
                description="Review role groups that drive permission rules."
                href={buildArchivistItemPath(serverId, "settings", "roles")}
              />
              <QuickActionRow
                icon={MessageSquareText}
                title="Open Channels"
                description="Inspect the channels that these permission rules affect."
                href={buildArchivistItemPath(serverId, "settings", "channels")}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (item.id === "settings-general") {
    const generalBlueprint = SETTINGS_BLUEPRINTS.general;
    return (
      <div className="space-y-4">
        <MetricGrid
          items={[
            { label: "Server", value: server.name },
            { label: "Members", value: String(server.memberCount || 0) },
            { label: "Owner", value: server.ownerId || "Unknown" },
          ]}
        />
        <div className="grid gap-4 xl:grid-cols-[1.15fr_minmax(0,0.85fr)]">
          <Card className="archivist-panel">
            <CardHeader>
              <CardTitle className="text-white">General server state</CardTitle>
              <CardDescription>Live identity details plus the next lanes that usually matter after basic server context.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <InfoRow label="Server name" value={server.name} />
                <InfoRow label="Discord server ID" value={server.discordId} />
                <InfoRow label="Member count" value={String(server.memberCount || 0)} />
                <InfoRow label="Owner ID" value={server.ownerId || "Unknown"} />
              </div>
              <div className="rounded-[22px] border border-white/8 bg-[#0a0c0f] p-4">
                <p className="text-sm font-semibold text-white">Why this page matters</p>
                <p className="mt-2 text-sm text-white/52">{generalBlueprint.focus}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {generalBlueprint.quickLinks.map((link) => (
                  <QuickActionRow
                    key={link.slug}
                    icon={link.icon}
                    title={link.label}
                    description={link.description}
                    href={buildArchivistItemPath(serverId, link.section, link.slug)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          <ChecklistPanel
            title="Identity checklist"
            description="Use this as the quick sanity pass before you tune commands, Studio, or permissions."
            items={generalBlueprint.starterChecklist}
          />
        </div>
      </div>
    );
  }

  if (item.id === "settings-server-config") {
    const configBlueprint = SETTINGS_BLUEPRINTS["server-config"];
    return (
      <div className="space-y-4">
        <MetricGrid
          items={[
            { label: "Gateway", value: typeof botStatus?.gatewayPingMs === "number" ? `${Math.round(botStatus.gatewayPingMs)}ms` : "Pending" },
            { label: "Channels", value: String(context?.channels.length || 0) },
            { label: "Roles", value: String(context?.roles.length || 0) },
          ]}
        />
        <div className="grid gap-4 xl:grid-cols-[1.15fr_minmax(0,0.85fr)]">
          <Card className="archivist-panel">
            <CardHeader>
              <CardTitle className="text-white">Runtime configuration</CardTitle>
              <CardDescription>Turn the server config page into an operator lane instead of a static runtime dump.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <InfoRow label="Bot status" value={botStatus?.ready ? "Connected" : "Offline"} />
                <InfoRow label="Gateway state" value={botStatus?.wsStatus || "Pending"} />
                <InfoRow label="Guild count" value={String(botStatus?.guildCount || 0)} />
                <InfoRow label="Last heartbeat" value={botStatus?.lastHeartbeatAt || "Not available"} />
              </div>
              <div className="rounded-[22px] border border-white/8 bg-[#0a0c0f] p-4">
                <p className="text-sm font-semibold text-white">Operator note</p>
                <p className="mt-2 text-sm text-white/52">{configBlueprint.focus}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {configBlueprint.quickLinks.map((link) => (
                  <QuickActionRow
                    key={link.slug}
                    icon={link.icon}
                    title={link.label}
                    description={link.description}
                    href={buildArchivistItemPath(serverId, link.section, link.slug)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          <ChecklistPanel
            title="Runtime checklist"
            description="Keep the basic diagnostics visible before you dig deeper into commands or Discord-side issues."
            items={configBlueprint.starterChecklist}
          />
        </div>
      </div>
    );
  }

  if (item.id === "settings-logging") {
    return (
      <div className="space-y-4">
        <MetricGrid
          items={[
            { label: "Recent activity", value: String(logs?.activity?.length || 0) },
            { label: "Failures", value: String(logs?.failures?.length || 0) },
            { label: "Commands", value: String(commands.length) },
          ]}
        />
        <Card className="archivist-panel">
          <CardHeader>
            <CardTitle className="text-white">Recent logging activity</CardTitle>
            <CardDescription>Live command history and failures without leaving Settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {logs?.activity?.slice(0, 5).map((entry: any) => (
              <ActivityRow key={entry.id} title={`/${entry.commandPath}`} subtitle={entry.summary} status={entry.status} />
            ))}
            {!logs?.activity?.length ? <EmptyState label="No recent activity is available right now." /> : null}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (item.id === "settings-notifications") {
    const notificationBlueprint = SETTINGS_BLUEPRINTS.notifications;
    const likelyStaffTargets = textChannels.filter((channel: any) => /(staff|mod|admin|ops|log|alert)/i.test(channel.name || ""));
    const likelyMemberTargets = textChannels.filter((channel: any) => /(general|welcome|news|announce|updates|community)/i.test(channel.name || ""));
    return (
      <div className="space-y-4">
        <MetricGrid
          items={[
            { label: "Text channels", value: String(textChannels.length) },
            { label: "Bot", value: botStatus?.ready ? "Connected" : "Offline" },
            { label: "Alerts", value: String(logs?.failures?.length || 0) },
          ]}
        />
        <div className="grid gap-4 xl:grid-cols-[1.15fr_minmax(0,0.85fr)]">
          <Card className="archivist-panel">
            <CardHeader>
              <CardTitle className="text-white">Notification targets</CardTitle>
              <CardDescription>Give alerts, notices, and announcements a cleaner home without guessing which channels are best.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <ChannelSuggestionCard
                  title="Likely staff targets"
                  badge="ops"
                  channels={likelyStaffTargets.slice(0, 4)}
                  emptyLabel="Archivist could not spot an obvious staff or operations channel yet."
                />
                <ChannelSuggestionCard
                  title="Likely member targets"
                  badge="members"
                  channels={likelyMemberTargets.slice(0, 4)}
                  emptyLabel="Archivist could not spot an obvious member-facing announcement lane yet."
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {notificationBlueprint.quickLinks.map((link) => (
                  <QuickActionRow
                    key={link.slug}
                    icon={link.icon}
                    title={link.label}
                    description={link.description}
                    href={buildArchivistItemPath(serverId, link.section, link.slug)}
                  />
                ))}
              </div>
              <div className="space-y-2">
                {textChannels.slice(0, 8).map((channel: any) => (
                  <div key={channel.id} className="flex items-center justify-between gap-3 rounded-[20px] border border-white/8 bg-[#0a0c0f] px-4 py-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">#{channel.name}</p>
                      <p className="mt-1 text-xs text-white/42">{channel.typeName || channel.type}</p>
                    </div>
                    <CommandBadge>target</CommandBadge>
                  </div>
                ))}
                {!textChannels.length ? <EmptyState label="No text channels are available for notification routing yet." /> : null}
              </div>
            </CardContent>
          </Card>

          <ChecklistPanel
            title="Delivery checklist"
            description="Keep one clean notification plan for staff, one for members, and one fallback path."
            items={notificationBlueprint.starterChecklist}
          />
        </div>
      </div>
    );
  }

  if (item.id === "settings-advanced") {
    const advancedBlueprint = SETTINGS_BLUEPRINTS.advanced;
    return (
      <div className="space-y-4">
        <MetricGrid
          items={[
            { label: "Server ID", value: String(server.id) },
            { label: "Discord ID", value: server.discordId },
            { label: "WS", value: botStatus?.wsStatus || "Pending" },
          ]}
        />
        <div className="grid gap-4 xl:grid-cols-[1.15fr_minmax(0,0.85fr)]">
          <Card className="archivist-panel">
            <CardHeader>
              <CardTitle className="text-white">Advanced identifiers</CardTitle>
              <CardDescription>Put the deep-debug details next to the routes you usually need with them.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <InfoRow label="Internal server ID" value={String(server.id)} />
                <InfoRow label="Discord guild ID" value={server.discordId} />
                <InfoRow label="Gateway ping" value={typeof botStatus?.gatewayPingMs === "number" ? `${Math.round(botStatus.gatewayPingMs)}ms` : "Pending"} />
                <InfoRow label="Started at" value={botStatus?.startedAt || "Unknown"} />
              </div>
              <div className="rounded-[22px] border border-white/8 bg-[#0a0c0f] p-4">
                <p className="text-sm font-semibold text-white">Diagnostics lens</p>
                <p className="mt-2 text-sm text-white/52">{advancedBlueprint.focus}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {advancedBlueprint.quickLinks.map((link) => (
                  <QuickActionRow
                    key={link.slug}
                    icon={link.icon}
                    title={link.label}
                    description={link.description}
                    href={buildArchivistItemPath(serverId, link.section, link.slug)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          <ChecklistPanel
            title="Deep-debug checklist"
            description="Use this when the problem is messy, inconsistent, or role-specific."
            items={advancedBlueprint.starterChecklist}
          />
        </div>
      </div>
    );
  }

  if (item.id === "settings-backups") {
    const backupBlueprint = SETTINGS_BLUEPRINTS.backups;
    return (
      <div className="space-y-4">
        <MetricGrid
          items={[
            { label: "Commands", value: String(commands.length) },
            { label: "Roles", value: String(context?.roles.length || 0) },
            { label: "Channels", value: String(context?.channels.length || 0) },
          ]}
        />
        <div className="grid gap-4 xl:grid-cols-[1.15fr_minmax(0,0.85fr)]">
          <Card className="archivist-panel">
            <CardHeader>
              <CardTitle className="text-white">Backup staging</CardTitle>
              <CardDescription>Stage safer export and restore work from one place instead of bouncing around the dashboard.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-[22px] border border-white/8 bg-[#0a0c0f] p-4">
                <p className="text-sm font-semibold text-white">Backup readiness</p>
                <p className="mt-2 text-sm text-white/52">{backupBlueprint.focus}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-[18px] border border-white/8 bg-[#101216] px-3 py-3 text-sm text-white/68">Commands tracked: {commands.length}</div>
                  <div className="rounded-[18px] border border-white/8 bg-[#101216] px-3 py-3 text-sm text-white/68">Roles visible: {context?.roles.length || 0}</div>
                  <div className="rounded-[18px] border border-white/8 bg-[#101216] px-3 py-3 text-sm text-white/68">Channels visible: {context?.channels.length || 0}</div>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {backupBlueprint.quickLinks.map((link) => (
                  <QuickActionRow
                    key={link.slug}
                    icon={link.icon}
                    title={link.label}
                    description={link.description}
                    href={buildArchivistItemPath(serverId, link.section, link.slug)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          <ChecklistPanel
            title="Backup checklist"
            description="Make the current state legible before you try to export, migrate, or rebuild anything."
            items={backupBlueprint.starterChecklist}
          />
        </div>
      </div>
    );
  }

  if (item.id === "commands-import-export") {
    return <CustomCommandV2Forge serverId={serverId} screen="import" />;
  }

  return <ScaffoldPage item={item} serverId={serverId} />;
}

function getPrimaryAction(item: ArchivistNavItem, serverId: number, navigate: (path: string) => void) {
  if (item.id === "commands-overview" || item.id === "commands-all") {
    return (
      <Button className="min-h-11 rounded-[18px] px-4" onClick={() => navigate(buildArchivistItemPath(serverId, "commands", "create-command"))}>
        <Plus className="h-4 w-4" />
        Create Command
      </Button>
    );
  }

  if (item.id === "studio-overview" || item.id === "studio-drafts") {
    return (
      <Button className="min-h-11 rounded-[18px] px-4" onClick={() => navigate(buildArchivistItemPath(serverId, "studio", "create-new"))}>
        <BadgePlus className="h-4 w-4" />
        Create New
      </Button>
    );
  }

  return null;
}

function getSecondaryAction(item: ArchivistNavItem, serverId: number, navigate: (path: string) => void) {
  if (item.id === "commands-all") {
    return (
      <Button
        variant="outline"
        className="min-h-11 rounded-[18px] border-white/10 bg-white/[0.03]"
        onClick={() => navigate(buildArchivistItemPath(serverId, "commands", "import-export"))}
      >
        Archivist Builder
      </Button>
    );
  }

  if (item.id === "creative-modules") {
    return (
      <Button variant="outline" className="min-h-11 rounded-[18px] border-white/10 bg-white/[0.03]" onClick={() => navigate(buildArchivistItemPath(serverId, "creative", "overview"))}>
        Back to Overview
      </Button>
    );
  }

  return null;
}

function PageHeader({
  item,
  title,
  description,
  primaryAction,
  secondaryAction,
  tabs,
}: {
  item: ArchivistNavItem;
  title: string;
  description: string;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  tabs?: ReactNode;
}) {
  return (
    <Card className="archivist-panel overflow-hidden">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-[16px] border border-[#8e2635]/50 bg-[#140d11] text-[#ff6276] shadow-[0_0_20px_rgba(177,18,38,0.14)]">
            <ItemIcon icon={item.icon} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.32em] text-white/34">{ARCHIVIST_NAVIGATION.find((entry) => entry.id === item.section)?.label}</p>
            <h1 className="mt-2 text-xl font-bold text-white sm:text-2xl">{title}</h1>
            <p className="mt-2 text-sm leading-6 text-white/52">{description}</p>
          </div>
        </div>
        {(primaryAction || secondaryAction) ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap [&>*]:w-full sm:[&>*]:w-auto">
            {primaryAction}
            {secondaryAction}
          </div>
        ) : null}
        {tabs}
      </CardContent>
    </Card>
  );
}

function MetricGrid({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <Card key={item.label} className="archivist-panel">
          <CardContent className="p-4">
            <p className="text-[10px] uppercase tracking-[0.24em] text-white/34">{item.label}</p>
            <p className="mt-2 text-lg font-semibold text-white">{item.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function QuickActionRow({
  icon: Icon,
  title,
  description,
  href,
}: {
  icon: typeof Plus;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link href={href}>
      <a className="flex min-h-[76px] items-center gap-3 rounded-[20px] border border-white/8 bg-[#0a0c0f] px-4 py-4 transition hover:border-[#8e2635] hover:bg-[#121418]">
        <div className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-white/8 bg-[#111317] text-[#ff6276]">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="mt-1 text-sm text-white/46">{description}</p>
        </div>
        <ArrowRight className="h-4 w-4 text-white/26" />
      </a>
    </Link>
  );
}

function QuickLaunchCard({
  title,
  subtitle,
  icon: Icon,
  href,
  tone = "default",
  compact = false,
}: {
  title: string;
  subtitle?: string;
  icon: typeof Sparkles;
  href: string;
  tone?: "default" | "primary";
  compact?: boolean;
}) {
  return (
    <Link href={href}>
      <a
        className={cn(
          "rounded-[22px] border p-4 transition",
          tone === "primary"
            ? "border-[#8e2635]/55 bg-[linear-gradient(180deg,rgba(30,13,18,0.98),rgba(13,10,12,0.98))] hover:border-[#b3384b] hover:bg-[linear-gradient(180deg,rgba(36,14,20,0.98),rgba(15,11,13,0.98))]"
            : "border-white/8 bg-[#0a0c0f] hover:border-[#8e2635] hover:bg-[#121418]",
          compact ? "min-h-[108px]" : "min-h-[144px]",
        )}
      >
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-[15px] border text-[#ff6276]",
            tone === "primary" ? "border-[#8e2635]/45 bg-[#170d11]" : "border-white/8 bg-[#111317]",
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <p className="mt-3 text-sm font-semibold text-white">{title}</p>
        {subtitle ? <p className="mt-1 text-sm leading-6 text-white/48">{subtitle}</p> : null}
      </a>
    </Link>
  );
}

function StudioCountBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-right">
      <p className="text-[10px] uppercase tracking-[0.18em] text-white/34">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function MiniRouteLink({ label, href }: { label: string; href: string }) {
  return (
    <Link href={href}>
      <a className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-white/68 transition hover:border-[#8e2635] hover:text-white">
        {label}
      </a>
    </Link>
  );
}

function ChecklistPanel({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: string[];
}) {
  return (
    <Card className="archivist-panel">
      <CardHeader>
        <CardTitle className="text-white">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((entry, index) => (
          <div key={entry} className="flex items-start gap-3 rounded-[20px] border border-white/8 bg-[#0a0c0f] px-4 py-4">
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#7d2432]/60 bg-[#160f12] text-[11px] font-semibold text-[#ff8695]">
              {index + 1}
            </div>
            <p className="text-sm text-white/68">{entry}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ChannelSuggestionCard({
  title,
  badge,
  channels,
  emptyLabel,
}: {
  title: string;
  badge: string;
  channels: any[];
  emptyLabel: string;
}) {
  return (
    <div className="rounded-[22px] border border-white/8 bg-[#0a0c0f] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-white">{title}</p>
        <CommandBadge>{badge}</CommandBadge>
      </div>
      <div className="mt-3 space-y-2">
        {channels.length ? channels.map((channel: any) => (
          <div key={channel.id} className="rounded-[18px] border border-white/8 bg-[#101216] px-3 py-3 text-sm text-white/68">
            #{channel.name}
          </div>
        )) : <EmptyState label={emptyLabel} />}
      </div>
    </div>
  );
}

function ActivityRow({
  title,
  subtitle,
  status,
}: {
  title: string;
  subtitle: string;
  status: "success" | "failure";
}) {
  return (
    <div className={cn("rounded-[20px] border px-4 py-4", status === "failure" ? "border-[#6d202c] bg-[#160f12]" : "border-white/8 bg-[#0a0c0f]")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{title}</p>
          <p className="mt-1 text-sm text-white/54">{subtitle}</p>
        </div>
        <CommandBadge>{status}</CommandBadge>
      </div>
    </div>
  );
}

function SettingsGroupCard({
  title,
  description,
  values,
  availableValues,
  isExpanded,
  onToggle,
  onOpenPermissions,
  onOpenChannels,
}: {
  title: string;
  description: string;
  values: string[];
  availableValues: string[];
  isExpanded: boolean;
  onToggle: () => void;
  onOpenPermissions: () => void;
  onOpenChannels: () => void;
}) {
  return (
    <Card className="archivist-panel">
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-white">{title}</p>
            <p className="mt-1 text-sm text-white/46">{description}</p>
          </div>
          <Button
            variant="outline"
            className="min-h-10 w-full rounded-[16px] border-white/10 bg-white/[0.03] sm:w-auto"
            onClick={onToggle}
          >
            {isExpanded ? "Hide Details" : "View Details"}
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {values.map((value) => (
            <CommandBadge key={`${title}-${value}`}>{value}</CommandBadge>
          ))}
        </div>
        {isExpanded ? (
          <div className="mt-4 space-y-4 rounded-[20px] border border-white/8 bg-[#0a0c0f] p-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-white/34">Available roles</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {availableValues.length ? availableValues.map((value) => (
                  <CommandBadge key={`${title}-available-${value}`}>{value}</CommandBadge>
                )) : <span className="text-sm text-white/46">No live roles are available for this server yet.</span>}
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" className="min-h-10 flex-1 rounded-[16px] border-white/10 bg-white/[0.03]" onClick={onOpenPermissions}>
                Open Permissions
              </Button>
              <Button variant="outline" className="min-h-10 flex-1 rounded-[16px] border-white/10 bg-white/[0.03]" onClick={onOpenChannels}>
                Open Channels
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SettingsChannelsPage({
  serverId,
  context,
  channelSettings,
}: {
  serverId: number;
  context: any;
  channelSettings: any[];
}) {
  const authQuery = useAuth();
  const { toast } = useToast();
  const upsertChannelSettings = useUpsertChannelSettings(serverId);
  const deleteChannelSettings = useDeleteChannelSettings(serverId);
  const createLiveChannel = useCreateLiveChannel(serverId);
  const applyChannelLiveChanges = useApplyChannelLiveChanges(serverId);
  const [filterId, setFilterId] = useState<(typeof CHANNEL_FILTERS)[number]["id"]>("all");
  const [searchValue, setSearchValue] = useState("");
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [editorDismissed, setEditorDismissed] = useState(false);
  const [lastLiveApplySummary, setLastLiveApplySummary] = useState<string | null>(null);
  const [lastCreateSummary, setLastCreateSummary] = useState<string | null>(null);
  const [bulkSelectedIds, setBulkSelectedIds] = useState<string[]>([]);
  const [bulkActionId, setBulkActionId] = useState<ChannelBulkActionId | null>(null);
  const [lastBulkApplySummary, setLastBulkApplySummary] = useState<string | null>(null);
  const [bulkTargetCategoryId, setBulkTargetCategoryId] = useState("");
  const [bulkRenamePrefix, setBulkRenamePrefix] = useState("");
  const [bulkRenameSuffix, setBulkRenameSuffix] = useState("");
  const [bulkRenameSearch, setBulkRenameSearch] = useState("");
  const [bulkRenameReplace, setBulkRenameReplace] = useState("");
  const [singleReorderAction, setSingleReorderAction] = useState<"up" | "down" | "top" | "bottom" | null>(null);
  const [createKind, setCreateKind] = useState<ChannelCreateTypeId>("text");
  const [createName, setCreateName] = useState("");
  const [createParentId, setCreateParentId] = useState("");
  const [createTopic, setCreateTopic] = useState("");

  const allChannels = useMemo(() => (context?.channels || []).slice().sort((a: any, b: any) => {
    if (Boolean(a.isCategory) !== Boolean(b.isCategory)) return a.isCategory ? -1 : 1;
    return (a.position || 0) - (b.position || 0);
  }), [context?.channels]);
  const overridesByChannelId = useMemo(() => new Map<string, any>((channelSettings || []).map((entry: any) => [entry.channelId, entry])), [channelSettings]);

  const filteredChannels = useMemo(() => {
    return allChannels.filter((channel: any) => {
      const term = searchValue.trim().toLowerCase();
      const matchesSearch = !term || channel.name?.toLowerCase().includes(term) || channel.typeName?.toLowerCase().includes(term);
      if (!matchesSearch) return false;

      if (filterId === "managed") return overridesByChannelId.has(channel.id);
      if (filterId === "text") return Boolean(channel.isTextBased) && !channel.isThread;
      if (filterId === "voice") return Boolean(channel.isVoiceBased);
      if (filterId === "forum") return Boolean(channel.isForum);
      if (filterId === "threads") return Boolean(channel.isThread);
      return true;
    });
  }, [allChannels, filterId, overridesByChannelId, searchValue]);

  const allCategories = allChannels
    .filter((channel: any) => channel.isCategory)
    .sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
  const categories = filteredChannels
    .filter((channel: any) => channel.isCategory)
    .sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
  const childChannels = filteredChannels.filter((channel: any) => !channel.isCategory && !channel.isThread);
  const threads = filteredChannels.filter((channel: any) => channel.isThread);
  const uncategorized = childChannels.filter((channel: any) => !channel.parentId);
  const flatSelectableChannels = [...childChannels, ...threads];
  const allSelectableChannels = allChannels.filter((channel: any) => !channel.isCategory);

  useEffect(() => {
    if (!selectedChannelId && flatSelectableChannels.length && !editorDismissed) {
      setSelectedChannelId(flatSelectableChannels[0].id);
      return;
    }

    if (selectedChannelId && !flatSelectableChannels.some((channel: any) => channel.id === selectedChannelId)) {
      setEditorDismissed(false);
      setSelectedChannelId(flatSelectableChannels[0]?.id ?? null);
    }
  }, [editorDismissed, flatSelectableChannels, selectedChannelId]);

  const selectedChannel = flatSelectableChannels.find((channel: any) => channel.id === selectedChannelId) || null;
  const selectedOverride = selectedChannel ? overridesByChannelId.get(selectedChannel.id) : null;
  const supportsMessageControls = Boolean(selectedChannel?.isTextBased || selectedChannel?.isForum || selectedChannel?.isThread);
  const qaReadonly = Boolean(authQuery.data?.qaBypass);

  const [draft, setDraft] = useState<any | null>(null);

  useEffect(() => {
    if (!selectedChannel) {
      setDraft(null);
      return;
    }

    setDraft({
      channelId: selectedChannel.id,
      channelName: selectedChannel.name,
      channelType: selectedChannel.typeName || selectedChannel.type || "unknown",
      parentChannelId: selectedChannel.parentId || null,
      channelMeta: selectedOverride?.channelMeta || {},
      slowmode: selectedOverride?.slowmode ?? selectedChannel.slowmodeSeconds ?? 0,
      autoDeleteAfter: selectedOverride?.autoDeleteAfter ?? 0,
      automodOverride: selectedOverride?.automodOverride ?? false,
      lockedDown: selectedOverride?.lockedDown ?? selectedChannel.lockedForEveryone ?? false,
      allowedContentTypes: selectedOverride?.allowedContentTypes?.length ? selectedOverride.allowedContentTypes : [...CHANNEL_CONTENT_TYPES],
      nsfw: selectedOverride?.nsfw ?? Boolean(selectedChannel.nsfw),
      topic: selectedOverride?.topic ?? selectedChannel.topic ?? "",
      customPermissions: selectedOverride?.customPermissions ?? null,
      adaptiveSlowmodeEnabled: selectedOverride?.adaptiveSlowmodeEnabled ?? false,
      adaptiveSlowmodeThreshold: selectedOverride?.adaptiveSlowmodeThreshold ?? 10,
      adaptiveSlowmodeMax: selectedOverride?.adaptiveSlowmodeMax ?? 30,
      channelAntiLinkEnabled: selectedOverride?.channelAntiLinkEnabled ?? false,
      channelAntiLinkWhitelistText: (selectedOverride?.channelAntiLinkWhitelist || []).join(", "),
      autoPurgeEnabled: selectedOverride?.autoPurgeEnabled ?? false,
      autoPurgeAfterMinutes: selectedOverride?.autoPurgeAfterMinutes ?? 60,
    });
  }, [selectedChannel, selectedOverride]);

  useEffect(() => {
    setLastLiveApplySummary(null);
    setSingleReorderAction(null);
  }, [selectedChannelId]);

  useEffect(() => {
    const validIds = new Set(allSelectableChannels.map((channel: any) => channel.id));
    setBulkSelectedIds((current) => {
      const next = current.filter((channelId) => validIds.has(channelId));
      return next.length === current.length ? current : next;
    });
  }, [allSelectableChannels]);

  useEffect(() => {
    if (!bulkSelectedIds.length) {
      setBulkActionId(null);
    }
  }, [bulkSelectedIds]);

  useEffect(() => {
    setLastBulkApplySummary(null);
  }, [bulkActionId, bulkSelectedIds]);

  useEffect(() => {
    if (createKind === "category") {
      setCreateParentId("");
    }
    if (!["text", "announcement", "forum"].includes(createKind)) {
      setCreateTopic("");
    }
  }, [createKind]);

  const updateDraft = (patch: Record<string, any>) => {
    setDraft((current: any) => current ? { ...current, ...patch } : current);
  };

  const bulkSelectedChannelMap = useMemo(
    () => new Map<string, any>(allSelectableChannels.map((channel: any) => [channel.id, channel])),
    [allSelectableChannels],
  );

  const bulkSelectedChannels = useMemo(
    () => bulkSelectedIds.map((channelId) => bulkSelectedChannelMap.get(channelId)).filter(Boolean),
    [bulkSelectedChannelMap, bulkSelectedIds],
  );

  const bulkHiddenSelectedCount = useMemo(() => {
    const visibleIds = new Set(flatSelectableChannels.map((channel: any) => channel.id));
    return bulkSelectedChannels.filter((channel: any) => !visibleIds.has(channel.id)).length;
  }, [bulkSelectedChannels, flatSelectableChannels]);

  const activeBulkAction = useMemo(
    () => CHANNEL_BULK_ACTIONS.find((action) => action.id === bulkActionId) ?? null,
    [bulkActionId],
  );

  const bulkApplicableChannels = useMemo(() => {
    if (!bulkActionId) return [];
    return bulkSelectedChannels.filter((channel: any) => supportsChannelBulkAction(channel, bulkActionId));
  }, [bulkActionId, bulkSelectedChannels]);

  const bulkSkippedChannels = useMemo(() => {
    if (!bulkActionId) return [];
    return bulkSelectedChannels.filter((channel: any) => !supportsChannelBulkAction(channel, bulkActionId));
  }, [bulkActionId, bulkSelectedChannels]);

  const bulkActionReady = useMemo(() => {
    if (!bulkActionId) return false;
    if (bulkActionId === "rename-prefix") return Boolean(bulkRenamePrefix.trim());
    if (bulkActionId === "rename-suffix") return Boolean(bulkRenameSuffix.trim());
    if (bulkActionId === "rename-replace") return Boolean(bulkRenameSearch);
    return true;
  }, [bulkActionId, bulkRenamePrefix, bulkRenameSearch, bulkRenameSuffix]);

  const bulkPreviewItems = useMemo(() => {
    if (!bulkActionId) return [];
    return bulkApplicableChannels.map((channel: any) => {
      const siblingChannels =
        bulkActionId === "group-top" || bulkActionId === "group-bottom"
          ? childChannels
              .filter((candidate: any) => (candidate.parentId ?? null) === (channel.parentId ?? null))
              .sort((left: any, right: any) => (left.position || 0) - (right.position || 0))
          : [];
      const siblingIndex = siblingChannels.findIndex((candidate: any) => candidate.id === channel.id);
      const categoryLabel = getCategoryLabel(channel.parentId, allCategories);

      return {
        channelId: channel.id,
        channelName: channel.name,
        ...getChannelBulkActionPreview(channel, bulkActionId, {
          categoryId: bulkTargetCategoryId || null,
          categoryName: getCategoryLabel(bulkTargetCategoryId || null, allCategories),
          currentCategoryName: categoryLabel,
          currentOrderLabel:
            siblingChannels.length && siblingIndex !== -1
              ? `${siblingIndex + 1} of ${siblingChannels.length} in ${categoryLabel}`
              : `Inside ${categoryLabel}`,
          nextOrderLabel:
            bulkActionId === "group-top"
              ? `Top of ${categoryLabel}`
              : bulkActionId === "group-bottom"
                ? `Bottom of ${categoryLabel}`
                : undefined,
          renamePrefix: bulkRenamePrefix,
          renameSuffix: bulkRenameSuffix,
          renameSearch: bulkRenameSearch,
          renameReplace: bulkRenameReplace,
        }),
      };
    });
  }, [allCategories, bulkActionId, bulkApplicableChannels, bulkRenamePrefix, bulkRenameReplace, bulkRenameSearch, bulkRenameSuffix, bulkTargetCategoryId, childChannels]);

  const toggleContentType = (contentType: (typeof CHANNEL_CONTENT_TYPES)[number]) => {
    setDraft((current: any) => {
      if (!current) return current;
      const next = current.allowedContentTypes.includes(contentType)
        ? current.allowedContentTypes.filter((value: string) => value !== contentType)
        : [...current.allowedContentTypes, contentType];
      return { ...current, allowedContentTypes: next };
    });
  };

  const toggleBulkSelection = (channelId: string) => {
    setBulkSelectedIds((current) =>
      current.includes(channelId)
        ? current.filter((value) => value !== channelId)
        : [...current, channelId],
    );
  };

  const addBulkSelections = (channelIds: string[]) => {
    setBulkSelectedIds((current) => Array.from(new Set([...current, ...channelIds])));
  };

  const liveReviewItems = useMemo(() => {
    if (!draft || !selectedChannel) return [];

    const items: Array<{
      field: "name" | "parentId" | "positionMove" | "topic" | "nsfw" | "slowmode" | "lockedDown";
      label: string;
      current: string;
      next: string;
    }> = [];
    const liveName = String(selectedChannel.name ?? "").trim();
    const draftName = String(draft.channelName ?? "").trim();
    const liveCategory = getCategoryLabel(selectedChannel.parentId ?? null, allCategories);
    const draftCategory = getCategoryLabel(draft.parentChannelId ?? null, allCategories);
    const liveTopic = String(selectedChannel.topic ?? "").trim();
    const draftTopic = String(draft.topic ?? "").trim();
    const liveSlowmode = Number(selectedChannel.slowmodeSeconds ?? 0);
    const draftSlowmode = Number(draft.slowmode ?? 0);
    const liveLocked = Boolean(selectedChannel.lockedForEveryone);
    const draftLocked = Boolean(draft.lockedDown);
    const liveNsfw = Boolean(selectedChannel.nsfw);
    const draftNsfw = Boolean(draft.nsfw);
    const supportsLiveTopic = Boolean(selectedChannel.isTextBased || selectedChannel.isForum || selectedChannel.isThread);
    const supportsLiveNsfw = Boolean(selectedChannel.isTextBased || selectedChannel.isForum);
    const supportsLiveMove = Boolean(!selectedChannel.isThread && !selectedChannel.isCategory);
    const reorderSiblings = supportsLiveMove
      ? childChannels
          .filter((channel: any) => (channel.parentId ?? null) === (selectedChannel.parentId ?? null))
          .sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
      : [];
    const reorderIndex = reorderSiblings.findIndex((channel: any) => channel.id === selectedChannel.id);

    if (draftName && draftName !== liveName) {
      items.push({
        field: "name",
        label: "Channel name",
        current: liveName || "Unnamed",
        next: draftName,
      });
    }

    if (supportsLiveMove && (draft.parentChannelId ?? null) !== (selectedChannel.parentId ?? null)) {
      items.push({
        field: "parentId",
        label: "Category",
        current: liveCategory,
        next: draftCategory,
      });
    }

    if (supportsLiveMove && singleReorderAction && reorderIndex !== -1 && reorderSiblings.length > 1) {
      const reorderLabel =
        singleReorderAction === "up"
          ? "Move up one slot"
          : singleReorderAction === "down"
            ? "Move down one slot"
            : singleReorderAction === "top"
              ? "Move to top"
              : "Move to bottom";
      items.push({
        field: "positionMove",
        label: "Order",
        current: `${reorderIndex + 1} of ${reorderSiblings.length}`,
        next: reorderLabel,
      });
    }

    if (supportsLiveTopic && draftTopic !== liveTopic) {
      items.push({
        field: "topic",
        label: "Topic",
        current: liveTopic || "Empty",
        next: draftTopic || "Clear topic",
      });
    }

    if (supportsMessageControls && draftSlowmode !== liveSlowmode) {
      items.push({
        field: "slowmode",
        label: "Slowmode",
        current: liveSlowmode ? `${liveSlowmode}s` : "Off",
        next: draftSlowmode ? `${draftSlowmode}s` : "Off",
      });
    }

    if (supportsLiveNsfw && draftNsfw !== liveNsfw) {
      items.push({
        field: "nsfw",
        label: "NSFW",
        current: liveNsfw ? "Enabled" : "Disabled",
        next: draftNsfw ? "Enabled" : "Disabled",
      });
    }

    if (draftLocked !== liveLocked) {
      items.push({
        field: "lockedDown",
        label: "Lock state",
        current: liveLocked ? "Locked" : "Open",
        next: draftLocked ? "Locked" : "Open",
      });
    }

    return items;
  }, [allCategories, childChannels, draft, selectedChannel, singleReorderAction, supportsMessageControls]);

  const saveOverride = async () => {
    if (!draft || !selectedChannel) return;
    try {
      await upsertChannelSettings.mutateAsync({
        channelId: draft.channelId,
        channelName: draft.channelName,
        channelType: draft.channelType,
        parentChannelId: draft.parentChannelId,
        channelMeta: draft.channelMeta,
        slowmode: Number(draft.slowmode || 0),
        autoDeleteAfter: Number(draft.autoDeleteAfter || 0),
        automodOverride: Boolean(draft.automodOverride),
        lockedDown: Boolean(draft.lockedDown),
        allowedContentTypes: draft.allowedContentTypes,
        nsfw: Boolean(draft.nsfw),
        topic: draft.topic?.trim() || null,
        customPermissions: draft.customPermissions,
        adaptiveSlowmodeEnabled: Boolean(draft.adaptiveSlowmodeEnabled),
        adaptiveSlowmodeThreshold: Number(draft.adaptiveSlowmodeThreshold || 10),
        adaptiveSlowmodeMax: Number(draft.adaptiveSlowmodeMax || 30),
        channelAntiLinkEnabled: Boolean(draft.channelAntiLinkEnabled),
        channelAntiLinkWhitelist: String(draft.channelAntiLinkWhitelistText || "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        autoPurgeEnabled: Boolean(draft.autoPurgeEnabled),
        autoPurgeAfterMinutes: Number(draft.autoPurgeAfterMinutes || 60),
      });

      toast({
        title: "Channel override saved",
        description: `${selectedChannel.name} now has an Archivist override profile.`,
      });
    } catch (error: any) {
      toast({
        title: "Save failed",
        description: error?.message || "Archivist could not save the channel override.",
        variant: "destructive",
      });
    }
  };

  const clearOverride = async () => {
    if (!selectedOverride?.id || !selectedChannel) return;
    try {
      await deleteChannelSettings.mutateAsync(selectedOverride.id);
      toast({
        title: "Override removed",
        description: `${selectedChannel.name} is back to its live Discord defaults.`,
      });
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error?.message || "Archivist could not remove the channel override.",
        variant: "destructive",
      });
    }
  };

  const applyLiveChanges = async () => {
    if (!draft || !selectedChannel) return;
    if (!liveReviewItems.length) {
      toast({
        title: "No live changes queued",
        description: "Adjust a live Discord field first, then apply it from the review card.",
      });
      return;
    }

    const payload: {
      name?: string;
      parentId?: string | null;
      positionMove?: "up" | "down" | "top" | "bottom";
      topic?: string | null;
      nsfw?: boolean;
      slowmode?: number;
      lockedDown?: boolean;
    } = {};

    for (const item of liveReviewItems) {
      if (item.field === "name") payload.name = String(draft.channelName ?? "").trim();
      if (item.field === "parentId") payload.parentId = draft.parentChannelId ?? null;
      if (item.field === "positionMove" && singleReorderAction) payload.positionMove = singleReorderAction;
      if (item.field === "topic") payload.topic = String(draft.topic ?? "").trim() || null;
      if (item.field === "nsfw") payload.nsfw = Boolean(draft.nsfw);
      if (item.field === "slowmode") payload.slowmode = Number(draft.slowmode ?? 0);
      if (item.field === "lockedDown") payload.lockedDown = Boolean(draft.lockedDown);
    }

    try {
      const result = await applyChannelLiveChanges.mutateAsync({
        channelId: selectedChannel.id,
        data: payload,
      });
      const summaryParts = [
        ...result.applied.map((entry) => `${entry.field}: ${entry.value}`),
        ...result.ignored.map((field) => `${field}: skipped`),
      ];
      setLastLiveApplySummary(summaryParts.join(" - "));
      setSingleReorderAction(null);

      toast({
        title: "Live Discord updated",
        description: result.applied.length
          ? `${result.channelName}: ${result.applied.map((entry) => entry.value).join(", ")}`
          : `${result.channelName} is already aligned with the requested live settings.`,
      });
    } catch (error: any) {
      toast({
        title: "Live apply failed",
        description: error?.message || "Archivist could not apply the live Discord changes.",
        variant: "destructive",
      });
    }
  };

  const applyBulkChanges = async () => {
    if (!bulkActionId || !bulkApplicableChannels.length || !bulkActionReady) {
      toast({
        title: "No bulk changes staged",
        description: "Pick channels and choose a bulk action before applying.",
      });
      return;
    }

    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        `Apply ${activeBulkAction?.label || "this action"} to ${bulkApplicableChannels.length} channel${bulkApplicableChannels.length === 1 ? "" : "s"}?`,
      );
      if (!confirmed) {
        return;
      }
    }

    let appliedCount = 0;
    const failures: string[] = [];
    const applyQueue = buildBulkReorderQueue(bulkApplicableChannels, bulkActionId);

    for (const channel of applyQueue) {
      const payload =
        bulkActionId === "rename-prefix"
          ? { name: buildBulkRenameValue(channel, bulkRenamePrefix) }
          : bulkActionId === "rename-suffix"
            ? { name: buildBulkRenameSuffixValue(channel, bulkRenameSuffix) }
            : bulkActionId === "rename-replace"
              ? { name: buildBulkRenameReplaceValue(channel, bulkRenameSearch, bulkRenameReplace) }
              : getChannelBulkActionPayload(bulkActionId, {
                  categoryId: bulkTargetCategoryId || null,
                  renamePrefix: bulkRenamePrefix,
                  renameSuffix: bulkRenameSuffix,
                  renameSearch: bulkRenameSearch,
                  renameReplace: bulkRenameReplace,
                });
      try {
        await applyChannelLiveChanges.mutateAsync({
          channelId: channel.id,
          data: payload,
        });
        appliedCount += 1;
      } catch (error: any) {
        failures.push(`${channel.name}: ${error?.message || "Failed"}`);
      }
    }

    const summaryParts = [
      `${appliedCount}/${bulkApplicableChannels.length} applied`,
      bulkSkippedChannels.length ? `${bulkSkippedChannels.length} skipped` : null,
      failures.length ? `${failures.length} failed` : null,
    ].filter(Boolean);
    setLastBulkApplySummary(summaryParts.join(" - "));

    toast({
      title: failures.length ? "Bulk apply finished with issues" : "Bulk changes applied",
      description: summaryParts.join(", "),
      variant: failures.length ? "destructive" : "default",
    });

    if (!failures.length) {
      setBulkSelectedIds([]);
      setBulkActionId(null);
      setBulkRenamePrefix("");
      setBulkRenameSuffix("");
      setBulkRenameSearch("");
      setBulkRenameReplace("");
    }
  };

  const createChannel = async () => {
    const trimmedName = createName.trim();
    if (!trimmedName) {
      toast({
        title: "Channel name needed",
        description: "Give the new lane a name before Archivist creates it in Discord.",
      });
      return;
    }

    try {
      const result = await createLiveChannel.mutateAsync({
        name: trimmedName,
        kind: createKind,
        parentId: createKind === "category" ? null : (createParentId || null),
        topic: ["text", "announcement", "forum"].includes(createKind) ? (createTopic.trim() || null) : null,
      });
      setLastCreateSummary(`${result.channelName} (${result.typeName}) created`);
      setCreateName("");
      setCreateTopic("");
      setEditorDismissed(false);
      setFilterId("all");

      toast({
        title: "Live channel created",
        description: `${result.channelName} is now live in Discord.`,
      });
    } catch (error: any) {
      toast({
        title: "Create failed",
        description: error?.message || "Archivist could not create the live channel.",
        variant: "destructive",
      });
    }
  };

  const selectedSiblingChannels = useMemo(() => {
    if (!selectedChannel || selectedChannel.isThread || selectedChannel.isCategory) return [];
    return childChannels
      .filter((channel: any) => (channel.parentId ?? null) === (selectedChannel.parentId ?? null))
      .sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
  }, [childChannels, selectedChannel]);

  const selectedSiblingIndex = useMemo(
    () => selectedSiblingChannels.findIndex((channel: any) => channel.id === selectedChannel?.id),
    [selectedChannel?.id, selectedSiblingChannels],
  );

  const canReorderSelectedChannel = selectedSiblingChannels.length > 1 && selectedSiblingIndex !== -1;

  return (
    <div className="space-y-4">
      <MetricGrid
        items={[
          { label: "Categories", value: String(categories.length) },
          { label: "Managed", value: String(channelSettings.length) },
          { label: "Visible", value: String(flatSelectableChannels.length) },
          { label: "Picked", value: String(bulkSelectedChannels.length) },
        ]}
      />

      <Card className="archivist-panel">
        <CardHeader>
          <CardTitle className="text-white">Quick create</CardTitle>
          <CardDescription>Spin up new Discord structure without leaving the dashboard. Archivist will refresh the channel tree after each create.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {CHANNEL_CREATE_TYPES.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setCreateKind(option.id)}
                className={cn(
                  "whitespace-nowrap rounded-full border px-3 py-2 text-sm transition",
                  createKind === option.id
                    ? "border-[#8e2635] bg-[#1b1115] text-white shadow-[0_0_18px_rgba(177,18,38,0.16)]"
                    : "border-white/8 bg-[#0b0d10] text-white/55",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.18em] text-white/34">Name</span>
              <Input
                value={createName}
                onChange={(event) => setCreateName(event.target.value)}
                placeholder={createKind === "category" ? "community" : "welcome"}
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.18em] text-white/34">Parent category</span>
              <select
                value={createParentId}
                onChange={(event) => setCreateParentId(event.target.value)}
                disabled={createKind === "category"}
                className="flex h-11 w-full rounded-[16px] border border-white/10 bg-[#0b0d10] px-3 text-sm text-white outline-none transition focus:border-[#8e2635] disabled:opacity-60"
              >
                <option value="">Uncategorized</option>
                {allCategories.map((category: any) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {["text", "announcement", "forum"].includes(createKind) ? (
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.18em] text-white/34">Topic</span>
              <Input
                value={createTopic}
                onChange={(event) => setCreateTopic(event.target.value)}
                placeholder="Optional live topic or channel description"
              />
            </label>
          ) : null}

          {lastCreateSummary ? (
            <div className="rounded-[16px] border border-[#7d2432]/50 bg-[#161014] px-3 py-3 text-sm text-white/70">
              Last create: {lastCreateSummary}
            </div>
          ) : null}

          {qaReadonly ? (
            <div className="rounded-[16px] border border-[#6d202c]/50 bg-[#161014] px-3 py-3 text-sm text-white/68">
              QA bypass stays read-only here too, so quick create is disabled in the test session.
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              className="min-h-11 rounded-[18px]"
              onClick={createChannel}
              disabled={qaReadonly || createLiveChannel.isPending}
            >
              <Plus className="h-4 w-4" />
              {createLiveChannel.isPending ? "Creating..." : "Create Live Channel"}
            </Button>
            <Button
              variant="outline"
              className="min-h-11 rounded-[18px] border-white/10 bg-white/[0.03]"
              onClick={() => {
                setCreateName("");
                setCreateTopic("");
                setCreateParentId("");
              }}
              disabled={!createName && !createTopic && !createParentId}
            >
              Clear Form
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="archivist-panel">
        <CardHeader>
          <CardTitle className="text-white">Channel control</CardTitle>
          <CardDescription>Filter the live channel tree, open one lane at a time, and save Archivist-specific overrides without leaving mobile.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
              <Input
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Search channels, forums, threads"
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {CHANNEL_FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setFilterId(filter.id)}
                  className={cn(
                    "whitespace-nowrap rounded-full border px-3 py-2 text-sm transition",
                    filterId === filter.id
                      ? "border-[#8e2635] bg-[#1b1115] text-white shadow-[0_0_18px_rgba(177,18,38,0.16)]"
                      : "border-white/8 bg-[#0b0d10] text-white/55",
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[22px] border border-white/8 bg-[#0a0c0f] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.22em] text-white/34">Bulk actions</p>
                <p className="mt-2 text-sm text-white/54">
                  Pick multiple channels from the list, stage one operation, then apply it with a review.
                </p>
              </div>
              <CommandBadge>{bulkSelectedChannels.length} picked</CommandBadge>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="min-h-10 rounded-[16px] border-white/10 bg-white/[0.03]"
                onClick={() => addBulkSelections(flatSelectableChannels.map((channel: any) => channel.id))}
                disabled={!flatSelectableChannels.length}
              >
                Pick Visible
              </Button>
              <Button
                variant="outline"
                className="min-h-10 rounded-[16px] border-white/10 bg-white/[0.03]"
                onClick={() => addBulkSelections(channelSettings.map((entry: any) => entry.channelId))}
                disabled={!channelSettings.length}
              >
                Pick Managed
              </Button>
              <Button
                variant="outline"
                className="min-h-10 rounded-[16px] border-white/10 bg-white/[0.03]"
                onClick={() => setBulkSelectedIds([])}
                disabled={!bulkSelectedChannels.length}
              >
                Clear Picks
              </Button>
            </div>

            {bulkHiddenSelectedCount ? (
              <div className="mt-4 rounded-[16px] border border-white/8 bg-[#0b0d10] px-3 py-3 text-sm text-white/62">
                {bulkHiddenSelectedCount} picked channel{bulkHiddenSelectedCount === 1 ? "" : "s"} are hidden by the current filter or search, but Archivist is keeping them staged until you clear picks.
              </div>
            ) : null}

            {bulkSelectedChannels.length ? (
              <>
                <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                  {CHANNEL_BULK_ACTIONS.map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => setBulkActionId(action.id)}
                      className={cn(
                        "whitespace-nowrap rounded-full border px-3 py-2 text-sm transition",
                        bulkActionId === action.id
                          ? "border-[#8e2635] bg-[#1b1115] text-white shadow-[0_0_18px_rgba(177,18,38,0.16)]"
                          : "border-white/8 bg-[#0b0d10] text-white/55",
                      )}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>

                {activeBulkAction ? (
                  <div className="mt-4 rounded-[20px] border border-white/8 bg-[#111317] p-4">
                    <p className="text-sm font-semibold text-white">{activeBulkAction.label}</p>
                    <p className="mt-1 text-sm text-white/46">{activeBulkAction.description}</p>

                    {bulkActionId === "move-category" ? (
                      <label className="mt-4 block space-y-2">
                        <span className="text-xs uppercase tracking-[0.18em] text-white/34">Target category</span>
                        <select
                          value={bulkTargetCategoryId}
                          onChange={(event) => setBulkTargetCategoryId(event.target.value)}
                          className="flex h-11 w-full rounded-[16px] border border-white/10 bg-[#0b0d10] px-3 text-sm text-white outline-none transition focus:border-[#8e2635]"
                        >
                          <option value="">Uncategorized</option>
                          {allCategories.map((category: any) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}

                    {bulkActionId === "rename-prefix" ? (
                      <label className="mt-4 block space-y-2">
                        <span className="text-xs uppercase tracking-[0.18em] text-white/34">Prefix</span>
                        <Input
                          value={bulkRenamePrefix}
                          onChange={(event) => setBulkRenamePrefix(event.target.value)}
                          placeholder="archive-"
                        />
                      </label>
                    ) : null}

                    {bulkActionId === "rename-suffix" ? (
                      <label className="mt-4 block space-y-2">
                        <span className="text-xs uppercase tracking-[0.18em] text-white/34">Suffix</span>
                        <Input
                          value={bulkRenameSuffix}
                          onChange={(event) => setBulkRenameSuffix(event.target.value)}
                          placeholder="-archive"
                        />
                      </label>
                    ) : null}

                    {bulkActionId === "rename-replace" ? (
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <label className="space-y-2">
                          <span className="text-xs uppercase tracking-[0.18em] text-white/34">Find</span>
                          <Input
                            value={bulkRenameSearch}
                            onChange={(event) => setBulkRenameSearch(event.target.value)}
                            placeholder="old"
                          />
                        </label>
                        <label className="space-y-2">
                          <span className="text-xs uppercase tracking-[0.18em] text-white/34">Replace With</span>
                          <Input
                            value={bulkRenameReplace}
                            onChange={(event) => setBulkRenameReplace(event.target.value)}
                            placeholder="new"
                          />
                        </label>
                      </div>
                    ) : null}

                    {bulkPreviewItems.length ? (
                      <div className="mt-4 space-y-2">
                        {bulkPreviewItems.slice(0, 6).map((item) => (
                          <div
                            key={`${item.channelId}-${item.field}`}
                            className="rounded-[16px] border border-white/8 bg-[#0b0d10] px-3 py-3"
                          >
                            <p className="text-sm font-semibold text-white">{item.channelName}</p>
                            <p className="mt-1 text-sm text-white/46">
                              {item.field}: {item.current} - {item.next}
                            </p>
                          </div>
                        ))}
                        {bulkPreviewItems.length > 6 ? (
                      <div className="text-sm text-white/50">
                            {bulkPreviewItems.length - 6} more channels are staged in this review.
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="mt-4 rounded-[16px] border border-dashed border-white/10 bg-[#0b0d10] px-3 py-3 text-sm text-white/52">
                        None of the picked channels can accept this action.
                      </div>
                    )}

                    {bulkSkippedChannels.length ? (
                      <div className="mt-4 rounded-[16px] border border-[#6d202c]/50 bg-[#161014] px-3 py-3 text-sm text-white/68">
                        {bulkSkippedChannels.length} picked channel{bulkSkippedChannels.length === 1 ? "" : "s"} will be skipped because Discord does not support this action for that type.
                      </div>
                    ) : null}

                    {bulkActionId === "group-top" || bulkActionId === "group-bottom" ? (
                      <div className="mt-4 rounded-[16px] border border-white/8 bg-[#0b0d10] px-3 py-3 text-sm text-white/62">
                        Archivist will keep the picked channels in the same relative order inside each category while moving them as a block.
                      </div>
                    ) : null}

                    {lastBulkApplySummary ? (
                      <div className="mt-4 rounded-[16px] border border-[#7d2432]/50 bg-[#161014] px-3 py-3 text-sm text-white/70">
                        Last bulk run: {lastBulkApplySummary}
                      </div>
                    ) : null}

                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <Button
                        className="min-h-11 rounded-[18px]"
                        onClick={applyBulkChanges}
                        disabled={qaReadonly || !bulkApplicableChannels.length || !bulkActionReady || applyChannelLiveChanges.isPending}
                      >
                        {applyChannelLiveChanges.isPending ? "Applying batch..." : "Apply to Picked"}
                      </Button>
                      <Button
                        variant="outline"
                        className="min-h-11 rounded-[18px] border-white/10 bg-white/[0.03]"
                        onClick={() => setBulkActionId(null)}
                      >
                        Clear Action
                      </Button>
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>

          {qaReadonly ? (
            <div className="rounded-[20px] border border-[#6d202c] bg-[#140d11] px-4 py-4 text-sm text-white/70">
              QA bypass is read-only. You can still inspect the full editor flow here, but live applies plus override saves and deletes are blocked in the test session.
            </div>
          ) : null}

          {selectedChannel && draft ? (
            <div className="rounded-[24px] border border-[#7d2432]/60 bg-[linear-gradient(180deg,#120d11,#0b0d10)] p-4 shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.24em] text-white/34">Editing channel</p>
                    <h3 className="mt-2 truncate text-lg font-semibold text-white">#{selectedChannel.name}</h3>
                    <p className="mt-1 text-sm text-white/48">
                      {selectedChannel.typeName || selectedChannel.type}
                      {selectedChannel.parentId ? " - nested channel" : " - top level"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditorDismissed(true);
                      setSelectedChannelId(null);
                    }}
                    className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-white/10 bg-[#101215] text-white/56 transition hover:border-[#7d2432] hover:text-white"
                  >
                    <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.18em] text-white/34">Channel name</span>
                    <Input
                      value={draft.channelName}
                      onChange={(event) => updateDraft({ channelName: event.target.value })}
                      placeholder="channel-name"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.18em] text-white/34">Category</span>
                    <select
                      value={draft.parentChannelId ?? ""}
                      onChange={(event) => updateDraft({ parentChannelId: event.target.value || null })}
                      disabled={Boolean(selectedChannel.isThread || selectedChannel.isCategory)}
                      className="flex h-11 w-full rounded-[16px] border border-white/10 bg-[#0b0d10] px-3 text-sm text-white outline-none transition focus:border-[#8e2635] disabled:opacity-60"
                    >
                      <option value="">Uncategorized</option>
                      {allCategories.map((category: any) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="rounded-[18px] border border-white/8 bg-[#0a0c0f] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.18em] text-white/34">Reorder lane</p>
                      <p className="mt-2 text-sm text-white/46">
                        Nudge the selected channel inside its current category without leaving the editor.
                      </p>
                    </div>
                    <CommandBadge>
                      {canReorderSelectedChannel ? `${selectedSiblingIndex + 1}/${selectedSiblingChannels.length}` : "Static"}
                    </CommandBadge>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button
                      variant={singleReorderAction === "up" ? "default" : "outline"}
                      className="min-h-10 rounded-[16px] border-white/10 bg-white/[0.03]"
                      onClick={() => setSingleReorderAction((current) => current === "up" ? null : "up")}
                      disabled={!canReorderSelectedChannel || selectedSiblingIndex <= 0}
                    >
                      Move Up
                    </Button>
                    <Button
                      variant={singleReorderAction === "down" ? "default" : "outline"}
                      className="min-h-10 rounded-[16px] border-white/10 bg-white/[0.03]"
                      onClick={() => setSingleReorderAction((current) => current === "down" ? null : "down")}
                      disabled={!canReorderSelectedChannel || selectedSiblingIndex === selectedSiblingChannels.length - 1}
                    >
                      Move Down
                    </Button>
                    <Button
                      variant={singleReorderAction === "top" ? "default" : "outline"}
                      className="min-h-10 rounded-[16px] border-white/10 bg-white/[0.03]"
                      onClick={() => setSingleReorderAction((current) => current === "top" ? null : "top")}
                      disabled={!canReorderSelectedChannel || selectedSiblingIndex <= 0}
                    >
                      To Top
                    </Button>
                    <Button
                      variant={singleReorderAction === "bottom" ? "default" : "outline"}
                      className="min-h-10 rounded-[16px] border-white/10 bg-white/[0.03]"
                      onClick={() => setSingleReorderAction((current) => current === "bottom" ? null : "bottom")}
                      disabled={!canReorderSelectedChannel || selectedSiblingIndex === selectedSiblingChannels.length - 1}
                    >
                      To Bottom
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.18em] text-white/34">Topic</span>
                    <Textarea
                      value={draft.topic}
                      onChange={(event) => updateDraft({ topic: event.target.value })}
                      placeholder={supportsMessageControls ? "Channel topic or internal notes" : "Not available for this channel type"}
                      disabled={!supportsMessageControls}
                      className="min-h-[96px]"
                    />
                  </label>
                  <div className="grid gap-3">
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-[0.18em] text-white/34">Slowmode (seconds)</span>
                      <Input
                        type="number"
                        min={0}
                        value={draft.slowmode}
                        onChange={(event) => updateDraft({ slowmode: Number(event.target.value || 0) })}
                        disabled={!supportsMessageControls}
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-[0.18em] text-white/34">Auto delete after (minutes)</span>
                      <Input
                        type="number"
                        min={0}
                        value={draft.autoDeleteAfter}
                        onChange={(event) => updateDraft({ autoDeleteAfter: Number(event.target.value || 0) })}
                      />
                    </label>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <ToggleField
                    label="Lock channel"
                    description="Treat this lane as temporarily locked inside Archivist."
                    checked={draft.lockedDown}
                    onCheckedChange={(checked) => updateDraft({ lockedDown: checked })}
                  />
                  <ToggleField
                    label="NSFW override"
                    description="Store an Archivist NSFW preference for this lane."
                    checked={draft.nsfw}
                    onCheckedChange={(checked) => updateDraft({ nsfw: checked })}
                    disabled={!supportsMessageControls}
                  />
                  <ToggleField
                    label="Automod override"
                    description="Allow per-channel moderation tuning."
                    checked={draft.automodOverride}
                    onCheckedChange={(checked) => updateDraft({ automodOverride: checked })}
                  />
                  <ToggleField
                    label="Adaptive slowmode"
                    description="Raise slowmode when message volume spikes."
                    checked={draft.adaptiveSlowmodeEnabled}
                    onCheckedChange={(checked) => updateDraft({ adaptiveSlowmodeEnabled: checked })}
                  />
                  <ToggleField
                    label="Anti-link override"
                    description="Keep a per-channel whitelist for link-heavy spaces."
                    checked={draft.channelAntiLinkEnabled}
                    onCheckedChange={(checked) => updateDraft({ channelAntiLinkEnabled: checked })}
                  />
                  <ToggleField
                    label="Auto-purge"
                    description="Expire content in temporary or cleanup-heavy channels."
                    checked={draft.autoPurgeEnabled}
                    onCheckedChange={(checked) => updateDraft({ autoPurgeEnabled: checked })}
                  />
                </div>

                {draft.adaptiveSlowmodeEnabled ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-[0.18em] text-white/34">Adaptive threshold</span>
                      <Input
                        type="number"
                        min={1}
                        value={draft.adaptiveSlowmodeThreshold}
                        onChange={(event) => updateDraft({ adaptiveSlowmodeThreshold: Number(event.target.value || 1) })}
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-[0.18em] text-white/34">Adaptive max slowmode</span>
                      <Input
                        type="number"
                        min={1}
                        value={draft.adaptiveSlowmodeMax}
                        onChange={(event) => updateDraft({ adaptiveSlowmodeMax: Number(event.target.value || 1) })}
                      />
                    </label>
                  </div>
                ) : null}

                {draft.channelAntiLinkEnabled ? (
                  <label className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.18em] text-white/34">Anti-link whitelist</span>
                    <Input
                      value={draft.channelAntiLinkWhitelistText}
                      onChange={(event) => updateDraft({ channelAntiLinkWhitelistText: event.target.value })}
                      placeholder="discord.com, yoursite.com"
                    />
                  </label>
                ) : null}

                {draft.autoPurgeEnabled ? (
                  <label className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.18em] text-white/34">Auto-purge after (minutes)</span>
                    <Input
                      type="number"
                      min={1}
                      value={draft.autoPurgeAfterMinutes}
                      onChange={(event) => updateDraft({ autoPurgeAfterMinutes: Number(event.target.value || 1) })}
                    />
                  </label>
                ) : null}

                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/34">Allowed content types</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {CHANNEL_CONTENT_TYPES.map((contentType) => {
                      const active = draft.allowedContentTypes.includes(contentType);
                      return (
                        <button
                          key={contentType}
                          type="button"
                          onClick={() => toggleContentType(contentType)}
                          className={cn(
                            "rounded-full border px-3 py-2 text-sm capitalize transition",
                            active ? "border-[#8e2635] bg-[#1b1115] text-white" : "border-white/8 bg-[#0b0d10] text-white/55",
                          )}
                        >
                          {contentType}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-[20px] border border-white/8 bg-[#0a0c0f] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.22em] text-white/34">Live Discord review</p>
                      <p className="mt-2 text-sm text-white/54">
                        Apply only the fields below to Discord. Archivist-only overrides still save separately.
                      </p>
                    </div>
                    <CommandBadge>{liveReviewItems.length} pending</CommandBadge>
                  </div>

                  {liveReviewItems.length ? (
                    <div className="mt-4 space-y-2">
                      {liveReviewItems.map((reviewItem) => (
                        <div
                          key={`${selectedChannel.id}-${reviewItem.field}`}
                          className="rounded-[16px] border border-white/8 bg-[#111317] px-3 py-3"
                        >
                          <p className="text-sm font-semibold text-white">{reviewItem.label}</p>
                          <p className="mt-1 text-sm text-white/46">
                            {reviewItem.current} - {reviewItem.next}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-[16px] border border-dashed border-white/10 bg-[#111317] px-3 py-3 text-sm text-white/52">
                      No live Discord changes are queued yet. Change topic, slowmode, NSFW, or lock state to stage an apply.
                    </div>
                  )}

                  {lastLiveApplySummary ? (
                    <div className="mt-4 rounded-[16px] border border-[#7d2432]/50 bg-[#161014] px-3 py-3 text-sm text-white/70">
                      Last apply: {lastLiveApplySummary}
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[18px] border border-white/8 bg-[#0a0c0f] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/34">Discord live action</p>
                    <p className="mt-2 text-sm text-white/54">
                      Sends the staged review fields to Discord right now. This does not save Archivist-only behavior.
                    </p>
                    <Button
                      className="mt-4 min-h-11 w-full rounded-[18px]"
                      onClick={applyLiveChanges}
                      disabled={qaReadonly || !liveReviewItems.length || applyChannelLiveChanges.isPending}
                    >
                      {applyChannelLiveChanges.isPending ? "Applying to Discord..." : "Apply to Discord"}
                    </Button>
                  </div>

                  <div className="rounded-[18px] border border-white/8 bg-[#0a0c0f] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/34">Archivist override profile</p>
                    <p className="mt-2 text-sm text-white/54">
                      Saves the dashboard-specific override layer for this channel, separate from the live Discord apply lane.
                    </p>
                    <div className="mt-4 grid gap-2">
                      <Button
                        variant="outline"
                        className="min-h-11 rounded-[18px] border-white/10 bg-white/[0.03]"
                        onClick={saveOverride}
                        disabled={qaReadonly || upsertChannelSettings.isPending}
                      >
                        <Save className="h-4 w-4" />
                        {selectedOverride ? "Update Archivist Override" : "Save Archivist Override"}
                      </Button>
                      <Button
                        variant="outline"
                        className="min-h-11 rounded-[18px] border-white/10 bg-white/[0.03]"
                        onClick={clearOverride}
                        disabled={qaReadonly || !selectedOverride?.id || deleteChannelSettings.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove Archivist Override
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState label={flatSelectableChannels.length ? "Select a channel row below to open its mobile editor." : "No live channels are available yet. Connect the bot to a server with visible channels or create overrides once channel data is synced."} />
          )}

          <div className="space-y-4">
            {categories.map((category: any) => {
              const children = childChannels
                .filter((channel: any) => channel.parentId === category.id)
                .sort((a: any, b: any) => (a.position || 0) - (b.position || 0));

              if (!children.length) return null;

              return (
                <div key={category.id} className="rounded-[22px] border border-white/8 bg-[#0a0c0f] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{category.name}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/34">Category · {children.length} channels</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => addBulkSelections(children.map((channel: any) => channel.id))}
                        className="rounded-full border border-white/10 bg-[#0b0d10] px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-white/62 transition hover:border-[#7d2432] hover:text-white"
                      >
                        Pick Group
                      </button>
                      <CommandBadge>{children.length} linked</CommandBadge>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    {children.map((channel: any) => {
                      const override = overridesByChannelId.get(channel.id);
                      const active = selectedChannelId === channel.id;
                      const picked = bulkSelectedIds.includes(channel.id);
                      const effectiveSlowmode = override?.slowmode ?? channel.slowmodeSeconds;
                      const effectiveLocked = override?.lockedDown ?? channel.lockedForEveryone;
                      const effectiveNsfw = override?.nsfw ?? channel.nsfw;
                      return (
                        <ChannelListRow
                          key={channel.id}
                          active={active}
                          picked={picked}
                          title={`#${channel.name}`}
                          subtitle={
                            <>
                              {channel.typeName || channel.type}
                              {effectiveNsfw ? " · NSFW" : ""}
                              {effectiveLocked ? " · Locked" : ""}
                              {effectiveSlowmode ? ` · ${effectiveSlowmode}s slowmode` : ""}
                            </>
                          }
                          badges={
                            <>
                              {override ? <CommandBadge>Managed</CommandBadge> : <CommandBadge>Discord</CommandBadge>}
                              {channel.isForum ? <CommandBadge>Forum</CommandBadge> : null}
                            </>
                          }
                          onOpen={() => {
                            setEditorDismissed(false);
                            setSelectedChannelId(channel.id);
                          }}
                          onTogglePick={() => toggleBulkSelection(channel.id)}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {uncategorized.length ? (
              <div className="rounded-[22px] border border-white/8 bg-[#0a0c0f] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">Uncategorized</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/34">Top-level channels</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => addBulkSelections(uncategorized.map((channel: any) => channel.id))}
                      className="rounded-full border border-white/10 bg-[#0b0d10] px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-white/62 transition hover:border-[#7d2432] hover:text-white"
                    >
                      Pick Group
                    </button>
                    <CommandBadge>{uncategorized.length}</CommandBadge>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  {uncategorized.map((channel: any) => {
                    const override = overridesByChannelId.get(channel.id);
                    const active = selectedChannelId === channel.id;
                    const picked = bulkSelectedIds.includes(channel.id);
                    const effectiveSlowmode = override?.slowmode ?? channel.slowmodeSeconds;
                    const effectiveLocked = override?.lockedDown ?? channel.lockedForEveryone;
                    const effectiveNsfw = override?.nsfw ?? channel.nsfw;
                    return (
                      <ChannelListRow
                        key={channel.id}
                        active={active}
                        picked={picked}
                        title={`#${channel.name}`}
                        subtitle={
                          <>
                            {channel.typeName || channel.type}
                            {effectiveNsfw ? " · NSFW" : ""}
                            {effectiveLocked ? " · Locked" : ""}
                            {effectiveSlowmode ? ` · ${effectiveSlowmode}s slowmode` : ""}
                          </>
                        }
                        badges={<CommandBadge>{override ? "Managed" : "Discord"}</CommandBadge>}
                        onOpen={() => {
                          setEditorDismissed(false);
                          setSelectedChannelId(channel.id);
                        }}
                        onTogglePick={() => toggleBulkSelection(channel.id)}
                      />
                    );
                  })}
                </div>
              </div>
            ) : null}

            {threads.length ? (
              <div className="rounded-[22px] border border-white/8 bg-[#0a0c0f] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">Threads</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/34">Live thread surfaces already in Discord</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => addBulkSelections(threads.map((thread: any) => thread.id))}
                      className="rounded-full border border-white/10 bg-[#0b0d10] px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-white/62 transition hover:border-[#7d2432] hover:text-white"
                    >
                      Pick Group
                    </button>
                    <CommandBadge>{threads.length}</CommandBadge>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  {threads.map((thread: any) => {
                    const override = overridesByChannelId.get(thread.id);
                    const active = selectedChannelId === thread.id;
                    const picked = bulkSelectedIds.includes(thread.id);
                    const effectiveSlowmode = override?.slowmode ?? thread.slowmodeSeconds;
                    const effectiveLocked = override?.lockedDown ?? thread.lockedForEveryone;
                    return (
                      <ChannelListRow
                        key={thread.id}
                        active={active}
                        picked={picked}
                        title={thread.name}
                        subtitle={
                          <>
                            {thread.typeName || thread.type}
                            {effectiveLocked ? " · Locked" : ""}
                            {effectiveSlowmode ? ` · ${effectiveSlowmode}s slowmode` : ""}
                          </>
                        }
                        badges={
                          <>
                            {override ? <CommandBadge>Managed</CommandBadge> : null}
                            <CommandBadge>Thread</CommandBadge>
                          </>
                        }
                        onOpen={() => {
                          setEditorDismissed(false);
                          setSelectedChannelId(thread.id);
                        }}
                        onTogglePick={() => toggleBulkSelection(thread.id)}
                      />
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ToggleField({
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className={cn("rounded-[18px] border border-white/8 bg-[#0a0c0f] p-4", disabled ? "opacity-60" : "")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">{label}</p>
          <p className="mt-1 text-sm text-white/48">{description}</p>
        </div>
        <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
      </div>
    </div>
  );
}

function ScaffoldPage({ item, serverId }: { item: ArchivistNavItem; serverId: number }) {
  return (
    <Card className="archivist-panel">
      <CardHeader>
        <CardTitle className="text-white">{item.label}</CardTitle>
        <CardDescription>{item.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-[22px] border border-dashed border-white/10 bg-[#0a0c0f] px-4 py-5 text-sm text-white/52">
          This route is wired into the new mobile control center and intentionally scaffolded for the first redesign pass.
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <QuickActionRow
            icon={Search}
            title="Back to Section Overview"
            description="Return to the section landing page."
            href={buildArchivistItemPath(serverId, item.section, getDefaultArchivistItem(item.section).slug)}
          />
          {item.section === "commands" ? (
            <QuickActionRow
              icon={Plus}
              title="Open Builder"
              description="Jump into the focused editor page."
              href={buildArchivistItemPath(serverId, "commands", "create-command")}
            />
          ) : (
            <QuickActionRow
              icon={Sparkles}
              title="Open Primary Workflow"
              description="Jump into the main build or overview flow."
              href={buildArchivistItemPath(serverId, item.section, item.section === "studio" ? "create-new" : getDefaultArchivistItem(item.section).slug)}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ItemIcon({ icon }: { icon: ArchivistNavItem["icon"] }) {
  switch (icon) {
    case "commands":
      return <Braces className="h-5 w-5" />;
    case "studio":
      return <Sparkles className="h-5 w-5" />;
    case "games":
      return <Gamepad2 className="h-5 w-5" />;
    case "settings":
      return <Settings2 className="h-5 w-5" />;
    case "drafts":
      return <FileStack className="h-5 w-5" />;
    case "templates":
      return <LayoutTemplate className="h-5 w-5" />;
    case "logs":
      return <Logs className="h-5 w-5" />;
    case "roles":
      return <Users className="h-5 w-5" />;
    case "channels":
      return <MessageSquareText className="h-5 w-5" />;
    case "permissions":
      return <ShieldCheck className="h-5 w-5" />;
    case "backup":
      return <CopyPlus className="h-5 w-5" />;
    case "plus":
      return <Plus className="h-5 w-5" />;
    case "overview":
    default:
      return <ScrollText className="h-5 w-5" />;
  }
}

function CommandBadge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-[#6d202c] bg-[#170f13] px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-white/72">
      {children}
    </span>
  );
}

function ChannelListRow({
  title,
  subtitle,
  badges,
  active,
  picked,
  onOpen,
  onTogglePick,
}: {
  title: string;
  subtitle: ReactNode;
  badges?: ReactNode;
  active: boolean;
  picked: boolean;
  onOpen: () => void;
  onTogglePick: () => void;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-[18px] border px-3 py-3 transition",
        active
          ? "border-[#8e2635] bg-[#171014]"
          : picked
            ? "border-[#6d202c] bg-[#151015]"
            : "border-white/8 bg-[#101216] hover:border-[#7d2432] hover:bg-[#15181d]",
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 flex-1 basis-[13rem] text-left"
      >
        <p className="truncate text-sm font-medium text-white">{title}</p>
        <p className="mt-1 text-xs text-white/42">{subtitle}</p>
      </button>
      <div className="flex shrink-0 items-center gap-2">
        {badges ? <div className="hidden flex-wrap justify-end gap-2 sm:flex">{badges}</div> : null}
        <button
          type="button"
          onClick={onTogglePick}
          className={cn(
            "rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition",
            picked
              ? "border-[#8e2635] bg-[#1b1115] text-white"
              : "border-white/10 bg-[#0b0d10] text-white/58 hover:border-[#7d2432] hover:text-white",
          )}
      >
        {picked ? "Picked" : "Pick"}
      </button>
      </div>
      {badges ? <div className="flex w-full flex-wrap gap-2 sm:hidden">{badges}</div> : null}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return <div className="rounded-[20px] border border-dashed border-white/10 bg-[#0a0c0f] px-4 py-5 text-sm text-white/46">{label}</div>;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[18px] border border-white/8 bg-[#0a0c0f] px-4 py-4">
      <p className="text-sm text-white/54">{label}</p>
      <p className="max-w-[60%] truncate text-sm font-medium text-white">{value}</p>
    </div>
  );
}
