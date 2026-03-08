import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { MODULE_CATEGORIES, ServerSettingsLayout } from "@/components/layout/server-settings-layout";
import { useServer, useUpdateSettings, useBotStatus } from "@/hooks/use-bot";
import { useRoute } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Save, Construction, Server, Users, Calendar, Copy, Check } from "lucide-react";
import { EmbedBuilderTab } from "@/components/embed-builder/embed-builder-tab";
import { CommandsTab } from "@/components/commands/commands-tab";
import { AutomodTab } from "@/components/automod/automod-tab";
import { ReactionRolesTab } from "@/components/reaction-roles/reaction-roles-tab";
import { StarboardTab } from "@/components/starboard/starboard-tab";
import { TicketsTab } from "@/components/tickets/tickets-tab";
import { ScheduledMessagesTab } from "@/components/scheduled-messages/scheduled-messages-tab";
import { WelcomeTab } from "@/components/welcome/welcome-tab";
import { ChannelsTab } from "@/components/channels/channels-tab";
import { ModerationTab } from "@/components/moderation/moderation-tab";
import { LevelingTab } from "@/components/leveling/leveling-tab";
import LoggingTab from "@/components/logging/logging-tab";
import { EconomyTab } from "@/components/economy/economy-tab";
import { AutomationsTab } from "@/components/automations/automations-tab";
import { VariablesTab } from "@/components/variables/variables-tab";
import { InsightsTab } from "@/components/insights/insights-tab";
import { VerifyTab } from "@/components/verify/verify-tab";
import { NsfwTab } from "@/components/nsfw/nsfw-tab";
import { WebhooksTab } from "@/components/webhooks/webhooks-tab";
import { PollsTab } from "@/components/polls/polls-tab";
import { GiveawaysTab } from "@/components/giveaways/giveaways-tab";
import { ServerControlTab } from "@/components/server-control/server-control-tab";
import { CodesTab } from "@/components/codes/codes-tab";
import { AuditLogTab } from "@/components/audit-log/audit-log-tab";
import { SyncTab } from "@/components/sync/sync-tab";
import { PermissionsTab } from "@/components/permissions/permissions-tab";
import { useWebSocket } from "@/hooks/use-websocket";
import { useDiscordContext } from "@/hooks/use-bot";
import { DiscordEntityListPicker, DiscordEntityPicker } from "@/components/discord/entity-pickers";
import { DiscordChannelListPicker, DiscordChannelPicker } from "@/components/discord/channel-picker";
import { DesignStudioLaunchCard } from "@/components/design-studio/design-studio-launch-card";

export default function ServerSettings() {
  const [, params] = useRoute("/dashboard/servers/:id");
  const serverId = parseInt(params?.id || "0");
  const { toast } = useToast();
  const [activeModule, setActiveModule] = useState("general");
  const validModules = useMemo(
    () => new Set(MODULE_CATEGORIES.flatMap((category) => category.modules.map((module) => module.id))),
    []
  );
  useWebSocket(serverId);

  const { data: server, isLoading } = useServer(serverId);
  const updateSettings = useUpdateSettings(serverId);
  const { data: botStatus } = useBotStatus();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const requestedModule = new URLSearchParams(window.location.search).get("module");
    if (requestedModule && validModules.has(requestedModule) && requestedModule !== activeModule) {
      setActiveModule(requestedModule);
    }
  }, [activeModule, serverId, validModules]);

  const handleModuleChange = (moduleId: string) => {
    setActiveModule(moduleId);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (moduleId === "general") {
      url.searchParams.delete("module");
    } else {
      url.searchParams.set("module", moduleId);
    }
    const query = url.searchParams.toString();
    window.history.replaceState({}, "", `${url.pathname}${query ? `?${query}` : ""}`);
  };

  if (isLoading || !server) {
    return (
      <DashboardLayout>
        <div className="flex items-center gap-6 mb-8">
          <Skeleton className="w-20 h-20 rounded-2xl bg-white/5" />
          <div className="space-y-3">
            <Skeleton className="h-8 w-64 bg-white/5" />
            <Skeleton className="h-4 w-32 bg-white/5" />
          </div>
        </div>
        <Skeleton className="h-12 w-full bg-white/5 rounded-xl mb-6" />
        <Skeleton className="h-[400px] w-full bg-white/5 rounded-2xl" />
      </DashboardLayout>
    );
  }

  const moduleStatuses: Record<string, boolean> = {
    general: true,
    "design-studio": true,
    channels: false,
    permissions: false,
    automod: server.settings?.automodEnabled ?? false,
    warnings: false,
    "raid-protection": server.settings?.raidProtectionEnabled ?? false,
    welcome: server.settings?.welcomeEnabled ?? false,
    leveling: false,
    "reaction-roles": false,
    starboard: false,
    commands: (server.customCommands?.length ?? 0) > 0,
    embeds: (server.embeds?.length ?? 0) > 0,
    scheduled: false,
    tickets: false,
    "audit-logs": !!(server.settings?.logChannelId),
    "economy": server.settings?.economyEnabled ?? false,
  };

  const currentServer = server!;

  function renderActiveModule() {
    switch (activeModule) {
      case "general":
        return <GeneralSettingsTab serverId={serverId} server={currentServer} settings={currentServer.settings} updateSettings={updateSettings} toast={toast} />;
      case "design-studio":
        return <DesignStudioLaunchCard serverId={serverId} />;
      case "channels":
        return <ChannelsTab serverId={serverId} />;
      case "automod":
        return <AutomodTab serverId={serverId} settings={currentServer.settings} />;
      case "commands":
        return <CommandsTab serverId={serverId} commands={currentServer.customCommands || []} toast={toast} key="commands" />;
      case "embeds":
        return <EmbedBuilderTab serverId={serverId} embeds={currentServer.embeds || []} toast={toast} />;
      case "welcome":
        return <WelcomeTab serverId={serverId} settings={currentServer.settings} />;
      case "reaction-roles":
        return <ReactionRolesTab serverId={serverId} />;
      case "starboard":
        return <StarboardTab serverId={serverId} />;
      case "tickets":
        return <TicketsTab serverId={serverId} />;
      case "scheduled":
        return <ScheduledMessagesTab serverId={serverId} />;
      case "warnings":
        return <ModerationTab serverId={serverId} settings={currentServer.settings} />;
      case "leveling":
        return <LevelingTab serverId={serverId} />;
      case "economy":
        return <EconomyTab serverId={serverId} settings={currentServer.settings} />;
      case "audit-logs":
        return <LoggingTab serverId={serverId} />;
      case "automations":
        return <AutomationsTab serverId={serverId} />;
      case "insights":
        return <InsightsTab serverId={serverId} />;
      case "variables":
        return <VariablesTab serverId={serverId} />;
      case "verify":
        return <VerifyTab serverId={serverId} settings={currentServer.settings} />;
      case "nsfw":
        return <NsfwTab serverId={serverId} settings={currentServer.settings} />;
      case "webhooks":
        return <WebhooksTab serverId={serverId} />;
      case "polls":
        return <PollsTab serverId={serverId} />;
      case "giveaways":
        return <GiveawaysTab serverId={serverId} />;
      case "server-control":
        return <ServerControlTab serverId={serverId} settings={currentServer.settings} />;
      case "codes":
        return <CodesTab serverId={serverId} />;
      case "audit-log-viewer":
        return <AuditLogTab serverId={serverId} />;
      case "channel-sync":
        return <SyncTab serverId={serverId} />;
      case "smart-permissions":
        return <PermissionsTab serverId={serverId} />;
      default:
        return <PlaceholderModule moduleId={activeModule} />;
    }
  }

  return (
    <DashboardLayout>
      <div className="flex items-center gap-6 mb-8">
        {server.iconUrl ? (
          <img src={server.iconUrl} alt={server.name} className="w-20 h-20 rounded-2xl shadow-lg shadow-primary/20" data-testid="img-server-icon" />
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center text-2xl font-display font-bold shadow-lg" data-testid="img-server-icon-fallback">
            {server.name.substring(0, 2).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-3xl font-display font-bold" data-testid="text-server-name">{server.name}</h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1" data-testid="text-server-info">
            <span className={`w-2 h-2 rounded-full ${botStatus?.ready ? "bg-green-500" : "bg-red-500"}`}></span>
            {botStatus?.ready ? "Connected" : "Bot Offline"} &middot; {server.memberCount} Members
          </p>
        </div>
      </div>

      <ServerSettingsLayout
        activeModule={activeModule}
        onModuleChange={handleModuleChange}
        moduleStatuses={moduleStatuses}
        serverId={serverId}
      >
        {renderActiveModule()}
      </ServerSettingsLayout>
    </DashboardLayout>
  );
}

function PlaceholderModule({ moduleId }: { moduleId: string }) {
  return (
    <Card className="glass-card">
      <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
        <Construction className="w-12 h-12 text-muted-foreground/50" />
        <h3 className="text-lg font-display font-bold" data-testid={`text-placeholder-${moduleId}`}>
          Coming Soon
        </h3>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          This module is under development and will be available in a future update.
        </p>
      </CardContent>
    </Card>
  );
}

function GeneralSettingsTab({ serverId, server, settings, updateSettings, toast }: any) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { data: discordContext } = useDiscordContext(serverId);

  const roleOptions = (discordContext?.roles || []).map((role) => ({
    id: role.id,
    label: role.name,
    description: role.id,
  }));

  const MODULE_TOGGLE_KEYS = [
    "automod",
    "welcome",
    "commands",
    "embeds",
    "tickets",
    "logging",
    "economy",
    "verification",
  ] as const;

  const currentBotConfig = settings?.botConfig || {};
  const currentBehaviorConfig = settings?.behaviorConfig || {};

  const [prefix, setPrefix] = useState(settings?.prefix || "!");
  const [botNickname, setBotNickname] = useState(settings?.botNickname || "");
  const [locale, setLocale] = useState(settings?.locale || "en");
  const [timezone, setTimezone] = useState(currentBotConfig.timezone || "UTC");
  const [defaultEmbedColor, setDefaultEmbedColor] = useState(currentBotConfig.defaultEmbedColor || "#5865F2");
  const [defaultFooterText, setDefaultFooterText] = useState(currentBotConfig.defaultFooterText || "");
  const [defaultFooterIconUrl, setDefaultFooterIconUrl] = useState(currentBotConfig.defaultFooterIconUrl || "");
  const [loggingEnabled, setLoggingEnabled] = useState(currentBotConfig.loggingEnabled ?? false);
  const [dashboardAccessRoleIds, setDashboardAccessRoleIds] = useState<string[]>(currentBotConfig.dashboardAccessRoleIds || []);
  const [defaultModerationRoleId, setDefaultModerationRoleId] = useState(currentBotConfig.defaultModerationRoleId || "");
  const [defaultStaffRoleId, setDefaultStaffRoleId] = useState(currentBotConfig.defaultStaffRoleId || "");
  const [activityText, setActivityText] = useState(currentBotConfig.activityText || "");
  const [activityType, setActivityType] = useState(currentBotConfig.activityType || "playing");
  const [welcomeDefaultEnabled, setWelcomeDefaultEnabled] = useState(currentBotConfig.welcomeDefaults?.enabled ?? false);
  const [welcomeDefaultChannelId, setWelcomeDefaultChannelId] = useState(currentBotConfig.welcomeDefaults?.channelId || "");
  const [welcomeDefaultMessage, setWelcomeDefaultMessage] = useState(currentBotConfig.welcomeDefaults?.messageTemplate || "");
  const [autoResponseEnabled, setAutoResponseEnabled] = useState(currentBotConfig.autoResponseDefaults?.enabled ?? false);
  const [autoResponseMode, setAutoResponseMode] = useState(currentBotConfig.autoResponseDefaults?.mode || "keyword");
  const [autoResponseText, setAutoResponseText] = useState(currentBotConfig.autoResponseDefaults?.response || "");
  const [errorMessageStyle, setErrorMessageStyle] = useState(currentBotConfig.errorMessageStyle || "friendly");
  const [ephemeralRepliesByDefault, setEphemeralRepliesByDefault] = useState(currentBotConfig.ephemeralRepliesByDefault ?? false);
  const [commandCooldownSeconds, setCommandCooldownSeconds] = useState(currentBehaviorConfig.commandCooldownSeconds ?? 3);
  const [permissionsFallback, setPermissionsFallback] = useState(currentBehaviorConfig.permissionsFallback || "deny");
  const [nsfwRestrictions, setNsfwRestrictions] = useState(currentBehaviorConfig.nsfwRestrictions || "allow_marked_only");
  const [dmUsageEnabled, setDmUsageEnabled] = useState(currentBehaviorConfig.dmUsageEnabled ?? true);
  const [moduleToggles, setModuleToggles] = useState<Record<string, boolean>>(currentBehaviorConfig.moduleToggles || {});
  const [auditLogChannelId, setAuditLogChannelId] = useState(currentBehaviorConfig.auditLogChannelId || "");
  const [systemLogChannelId, setSystemLogChannelId] = useState(currentBehaviorConfig.systemLogChannelId || "");
  const [notificationChannelIds, setNotificationChannelIds] = useState<string[]>(currentBehaviorConfig.notificationChannelIds || []);
  const [notificationModeration, setNotificationModeration] = useState(currentBehaviorConfig.notificationPreferences?.moderation ?? true);
  const [notificationAutomations, setNotificationAutomations] = useState(currentBehaviorConfig.notificationPreferences?.automations ?? true);
  const [notificationCommandErrors, setNotificationCommandErrors] = useState(currentBehaviorConfig.notificationPreferences?.commandErrors ?? true);
  const [notificationMemberEvents, setNotificationMemberEvents] = useState(currentBehaviorConfig.notificationPreferences?.memberEvents ?? false);

  useEffect(() => {
    if (!settings) return;
    const botConfig = settings.botConfig || {};
    const behaviorConfig = settings.behaviorConfig || {};
    setPrefix(settings.prefix || "!");
    setBotNickname(settings.botNickname || "");
    setLocale(settings.locale || "en");
    setTimezone(botConfig.timezone || "UTC");
    setDefaultEmbedColor(botConfig.defaultEmbedColor || "#5865F2");
    setDefaultFooterText(botConfig.defaultFooterText || "");
    setDefaultFooterIconUrl(botConfig.defaultFooterIconUrl || "");
    setLoggingEnabled(botConfig.loggingEnabled ?? false);
    setDashboardAccessRoleIds(botConfig.dashboardAccessRoleIds || []);
    setDefaultModerationRoleId(botConfig.defaultModerationRoleId || "");
    setDefaultStaffRoleId(botConfig.defaultStaffRoleId || "");
    setActivityText(botConfig.activityText || "");
    setActivityType(botConfig.activityType || "playing");
    setWelcomeDefaultEnabled(botConfig.welcomeDefaults?.enabled ?? false);
    setWelcomeDefaultChannelId(botConfig.welcomeDefaults?.channelId || "");
    setWelcomeDefaultMessage(botConfig.welcomeDefaults?.messageTemplate || "");
    setAutoResponseEnabled(botConfig.autoResponseDefaults?.enabled ?? false);
    setAutoResponseMode(botConfig.autoResponseDefaults?.mode || "keyword");
    setAutoResponseText(botConfig.autoResponseDefaults?.response || "");
    setErrorMessageStyle(botConfig.errorMessageStyle || "friendly");
    setEphemeralRepliesByDefault(botConfig.ephemeralRepliesByDefault ?? false);
    setCommandCooldownSeconds(behaviorConfig.commandCooldownSeconds ?? 3);
    setPermissionsFallback(behaviorConfig.permissionsFallback || "deny");
    setNsfwRestrictions(behaviorConfig.nsfwRestrictions || "allow_marked_only");
    setDmUsageEnabled(behaviorConfig.dmUsageEnabled ?? true);
    setModuleToggles(behaviorConfig.moduleToggles || {});
    setAuditLogChannelId(behaviorConfig.auditLogChannelId || "");
    setSystemLogChannelId(behaviorConfig.systemLogChannelId || "");
    setNotificationChannelIds(behaviorConfig.notificationChannelIds || []);
    setNotificationModeration(behaviorConfig.notificationPreferences?.moderation ?? true);
    setNotificationAutomations(behaviorConfig.notificationPreferences?.automations ?? true);
    setNotificationCommandErrors(behaviorConfig.notificationPreferences?.commandErrors ?? true);
    setNotificationMemberEvents(behaviorConfig.notificationPreferences?.memberEvents ?? false);
  }, [settings]);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSave = () => {
    if (!prefix.trim() || prefix.trim().length > 5) {
      toast({ title: "Invalid prefix", description: "Prefix must be between 1 and 5 characters.", variant: "destructive" });
      return;
    }

    updateSettings.mutate(
      {
        prefix: prefix.trim(),
        botNickname: botNickname.trim() || null,
        locale,
        botConfig: {
          ...currentBotConfig,
          defaultEmbedColor: defaultEmbedColor.trim() || "#5865F2",
          defaultFooterText: defaultFooterText.trim(),
          defaultFooterIconUrl: defaultFooterIconUrl.trim(),
          timezone: timezone.trim() || "UTC",
          loggingEnabled,
          dashboardAccessRoleIds,
          defaultModerationRoleId: defaultModerationRoleId || null,
          defaultStaffRoleId: defaultStaffRoleId || null,
          activityText: activityText.trim(),
          activityType,
          welcomeDefaults: {
            enabled: welcomeDefaultEnabled,
            channelId: welcomeDefaultChannelId || null,
            messageTemplate: welcomeDefaultMessage.trim(),
          },
          autoResponseDefaults: {
            enabled: autoResponseEnabled,
            mode: autoResponseMode,
            response: autoResponseText.trim(),
          },
          errorMessageStyle,
          ephemeralRepliesByDefault,
        },
        behaviorConfig: {
          ...currentBehaviorConfig,
          commandCooldownSeconds: Math.max(0, Number(commandCooldownSeconds) || 0),
          permissionsFallback,
          nsfwRestrictions,
          dmUsageEnabled,
          moduleToggles,
          auditLogChannelId: auditLogChannelId || null,
          systemLogChannelId: systemLogChannelId || null,
          notificationChannelIds,
          notificationPreferences: {
            moderation: notificationModeration,
            automations: notificationAutomations,
            commandErrors: notificationCommandErrors,
            memberEvents: notificationMemberEvents,
          },
        },
      },
      {
        onSuccess: () => toast({ title: "Settings updated", description: "General settings saved successfully." }),
        onError: (err: any) => toast({ title: "Update failed", description: err?.message || "Unable to save settings.", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Server className="w-5 h-5 text-primary" />
            Server Information
          </CardTitle>
          <CardDescription>Overview of your server and current operational profile.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-white/5 bg-background/30 p-4 space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Server ID</p>
              <div className="flex items-center gap-2">
                <p className="text-sm font-mono font-medium truncate" data-testid="text-server-id">{server.discordId}</p>
                <button
                  onClick={() => copyToClipboard(server.discordId, "serverId")}
                  className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="button-copy-server-id"
                >
                  {copiedField === "serverId" ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <div className="rounded-xl border border-white/5 bg-background/30 p-4 space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Users className="w-3 h-3" /> Members</p>
              <p className="text-sm font-medium" data-testid="text-member-count">{server.memberCount?.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-white/5 bg-background/30 p-4 space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Calendar className="w-3 h-3" /> Joined</p>
              <p className="text-sm font-medium" data-testid="text-joined-at">{server.joinedAt ? new Date(server.joinedAt).toLocaleDateString() : "Unknown"}</p>
            </div>
            <div className="rounded-xl border border-white/5 bg-background/30 p-4 space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Active Modules</p>
              <p className="text-sm font-medium" data-testid="text-active-modules">
                {Object.values(server.settings || {}).filter(Boolean).length} configured
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-display">Bot Configuration</CardTitle>
          <CardDescription>
            Operational defaults for command behavior, embeds, moderation policy, and channel routing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label className="text-sm">Command Prefix</Label>
                <Input value={prefix} onChange={(event) => setPrefix(event.target.value)} maxLength={5} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">Bot Nickname</Label>
                <Input value={botNickname} onChange={(event) => setBotNickname(event.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">Locale</Label>
                <Input value={locale} onChange={(event) => setLocale(event.target.value)} placeholder="en" className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">Timezone</Label>
                <Input value={timezone} onChange={(event) => setTimezone(event.target.value)} placeholder="UTC" className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">Default Embed Color</Label>
                <Input value={defaultEmbedColor} onChange={(event) => setDefaultEmbedColor(event.target.value)} placeholder="#5865F2" className="mt-1" />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-sm">Footer Text</Label>
                <Input value={defaultFooterText} onChange={(event) => setDefaultFooterText(event.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">Footer Icon URL</Label>
                <Input value={defaultFooterIconUrl} onChange={(event) => setDefaultFooterIconUrl(event.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">Activity Text</Label>
                <Input value={activityText} onChange={(event) => setActivityText(event.target.value)} placeholder="Managing your server" className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">Activity Type</Label>
                <Select value={activityType} onValueChange={setActivityType}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="playing">Playing</SelectItem>
                    <SelectItem value="watching">Watching</SelectItem>
                    <SelectItem value="listening">Listening</SelectItem>
                    <SelectItem value="competing">Competing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Error Message Style</Label>
                <Select value={errorMessageStyle} onValueChange={setErrorMessageStyle}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minimal">Minimal</SelectItem>
                    <SelectItem value="detailed">Detailed</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-background/30 px-4 py-3">
              <div>
                <p className="text-sm font-medium">Logging Enabled</p>
                <p className="text-xs text-muted-foreground">Enable logging defaults for operational modules.</p>
              </div>
              <Switch checked={loggingEnabled} onCheckedChange={setLoggingEnabled} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-background/30 px-4 py-3">
              <div>
                <p className="text-sm font-medium">Ephemeral Replies by Default</p>
                <p className="text-xs text-muted-foreground">Use private response mode where supported.</p>
              </div>
              <Switch checked={ephemeralRepliesByDefault} onCheckedChange={setEphemeralRepliesByDefault} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DiscordEntityListPicker
              values={dashboardAccessRoleIds}
              onChange={setDashboardAccessRoleIds}
              options={roleOptions}
              label="Dashboard Access Roles"
              placeholder="Add role..."
              testIdPrefix="dashboard-access-roles"
            />
            <div className="space-y-4">
              <DiscordEntityPicker
                value={defaultModerationRoleId}
                onChange={setDefaultModerationRoleId}
                options={roleOptions}
                label="Default Moderation Role"
                placeholder="Select role..."
                testIdPrefix="default-moderation-role"
              />
              <DiscordEntityPicker
                value={defaultStaffRoleId}
                onChange={setDefaultStaffRoleId}
                options={roleOptions}
                label="Default Staff Role"
                placeholder="Select role..."
                testIdPrefix="default-staff-role"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <DiscordChannelPicker
                serverId={serverId}
                value={welcomeDefaultChannelId}
                onChange={setWelcomeDefaultChannelId}
                label="Welcome Default Channel"
                allowedKinds={["text", "announcement", "forum"]}
                placeholder="Select welcome channel..."
                testIdPrefix="welcome-default-channel"
              />
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-background/30 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Welcome Defaults Enabled</p>
                  <p className="text-xs text-muted-foreground">Enable module defaults for welcome messages.</p>
                </div>
                <Switch checked={welcomeDefaultEnabled} onCheckedChange={setWelcomeDefaultEnabled} />
              </div>
              <div>
                <Label className="text-sm">Welcome Default Message</Label>
                <Textarea value={welcomeDefaultMessage} onChange={(event) => setWelcomeDefaultMessage(event.target.value)} className="mt-1" />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-background/30 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Auto-Response Defaults Enabled</p>
                  <p className="text-xs text-muted-foreground">Enable baseline auto-response behavior.</p>
                </div>
                <Switch checked={autoResponseEnabled} onCheckedChange={setAutoResponseEnabled} />
              </div>
              <div>
                <Label className="text-sm">Auto-Response Mode</Label>
                <Select value={autoResponseMode} onValueChange={setAutoResponseMode}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="keyword">Keyword</SelectItem>
                    <SelectItem value="contains">Contains</SelectItem>
                    <SelectItem value="regex">Regex</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Auto-Response Text</Label>
                <Textarea value={autoResponseText} onChange={(event) => setAutoResponseText(event.target.value)} className="mt-1" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label className="text-sm">Command Cooldown (seconds)</Label>
                <Input type="number" min={0} value={commandCooldownSeconds} onChange={(event) => setCommandCooldownSeconds(Number(event.target.value) || 0)} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">Permissions Fallback</Label>
                <Select value={permissionsFallback} onValueChange={setPermissionsFallback}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="deny">Deny</SelectItem>
                    <SelectItem value="allow">Allow</SelectItem>
                    <SelectItem value="staff_only">Staff Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">NSFW Restrictions</Label>
                <Select value={nsfwRestrictions} onValueChange={setNsfwRestrictions}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="block">Block</SelectItem>
                    <SelectItem value="allow_marked_only">Allow Marked Channels Only</SelectItem>
                    <SelectItem value="allow_all">Allow All</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-background/30 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">DM Usage Enabled</p>
                  <p className="text-xs text-muted-foreground">Allow commands from direct messages.</p>
                </div>
                <Switch checked={dmUsageEnabled} onCheckedChange={setDmUsageEnabled} />
              </div>
            </div>

            <div className="space-y-4">
              <DiscordChannelPicker
                serverId={serverId}
                value={auditLogChannelId}
                onChange={setAuditLogChannelId}
                label="Audit Log Channel"
                allowedKinds={["text", "announcement", "forum"]}
                placeholder="Select audit log channel..."
                testIdPrefix="general-audit-log-channel"
              />
              <DiscordChannelPicker
                serverId={serverId}
                value={systemLogChannelId}
                onChange={setSystemLogChannelId}
                label="System Log Channel"
                allowedKinds={["text", "announcement", "forum"]}
                placeholder="Select system log channel..."
                testIdPrefix="general-system-log-channel"
              />
              <DiscordChannelListPicker
                serverId={serverId}
                values={notificationChannelIds}
                onChange={setNotificationChannelIds}
                label="Notification Channels"
                allowedKinds={["text", "announcement", "forum"]}
                placeholder="Add notification channel..."
                testIdPrefix="general-notification-channels"
              />
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Module Toggles</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {MODULE_TOGGLE_KEYS.map((moduleKey) => (
                <div key={moduleKey} className="flex items-center justify-between rounded-lg border border-white/10 bg-background/30 px-3 py-2">
                  <Label className="text-sm capitalize">{moduleKey.replace(/-/g, " ")}</Label>
                  <Switch
                    checked={Boolean(moduleToggles[moduleKey])}
                    onCheckedChange={(value) => setModuleToggles((prev) => ({ ...prev, [moduleKey]: value }))}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Notification Preferences</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-background/30 px-3 py-2"><Label className="text-sm">Moderation</Label><Switch checked={notificationModeration} onCheckedChange={setNotificationModeration} /></div>
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-background/30 px-3 py-2"><Label className="text-sm">Automations</Label><Switch checked={notificationAutomations} onCheckedChange={setNotificationAutomations} /></div>
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-background/30 px-3 py-2"><Label className="text-sm">Command Errors</Label><Switch checked={notificationCommandErrors} onCheckedChange={setNotificationCommandErrors} /></div>
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-background/30 px-3 py-2"><Label className="text-sm">Member Events</Label><Switch checked={notificationMemberEvents} onCheckedChange={setNotificationMemberEvents} /></div>
            </div>
          </div>

          <Button onClick={handleSave} disabled={updateSettings.isPending} data-testid="button-save-general" className="gap-2">
            <Save className="w-4 h-4" />
            {updateSettings.isPending ? "Saving..." : "Save Configuration"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
