import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ServerSettingsLayout } from "@/components/layout/server-settings-layout";
import { useServer, useUpdateSettings } from "@/hooks/use-bot";
import { useRoute } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useState } from "react";
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

const generalSchema = z.object({
  prefix: z.string().min(1, "Prefix is required").max(5, "Prefix too long"),
  botNickname: z.string().optional(),
});

export default function ServerSettings() {
  const [, params] = useRoute("/dashboard/servers/:id");
  const serverId = parseInt(params?.id || "0");
  const { toast } = useToast();
  const [activeModule, setActiveModule] = useState("general");
  useWebSocket(serverId);

  const { data: server, isLoading } = useServer(serverId);
  const updateSettings = useUpdateSettings(serverId);

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
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            Connected &middot; {server.memberCount} Members
          </p>
        </div>
      </div>

      <ServerSettingsLayout
        activeModule={activeModule}
        onModuleChange={setActiveModule}
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
  const form = useForm({
    resolver: zodResolver(generalSchema),
    defaultValues: {
      prefix: settings?.prefix || "!",
      botNickname: settings?.botNickname || "",
    },
  });

  const onSubmit = (data: any) => {
    updateSettings.mutate(data, {
      onSuccess: () => toast({ title: "Settings updated", description: "General settings saved successfully." }),
    });
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Server className="w-5 h-5 text-primary" />
            Server Information
          </CardTitle>
          <CardDescription>Overview of your server and bot status.</CardDescription>
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
          <CardDescription>Core settings for how the bot operates in your server.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="prefix"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Command Prefix</FormLabel>
                      <FormControl>
                        <Input {...field} className="bg-background max-w-[200px]" data-testid="input-prefix" />
                      </FormControl>
                      <FormDescription>The character used to trigger bot commands.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="botNickname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bot Nickname</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Archivist" className="bg-background max-w-[300px]" data-testid="input-bot-nickname" />
                      </FormControl>
                      <FormDescription>Custom nickname for the bot in this server.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" disabled={updateSettings.isPending} data-testid="button-save-general" className="gap-2 mt-4">
                <Save className="w-4 h-4" />
                {updateSettings.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
