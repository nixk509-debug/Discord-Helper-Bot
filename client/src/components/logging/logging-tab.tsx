import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuditLogConfig, useUpsertAuditLogConfig } from "@/hooks/use-bot";
import {
  ScrollText,
  Save,
  MessageSquare,
  Users,
  Shield,
  Settings,
  Mic,
  Hash,
  X,
  Plus,
  Globe,
  CheckSquare,
  Link2,
} from "lucide-react";

interface LoggingTabProps {
  serverId: number;
  settings?: any;
}

const EVENT_CATEGORIES = {
  messages: {
    label: "Message Events",
    icon: MessageSquare,
    channelKey: "messageLogChannel" as const,
    events: [
      { id: "message_delete", label: "Message Delete" },
      { id: "message_edit", label: "Message Edit" },
      { id: "message_bulk_delete", label: "Bulk Delete" },
      { id: "message_pin", label: "Message Pin/Unpin" },
    ],
  },
  members: {
    label: "Member Events",
    icon: Users,
    channelKey: "memberLogChannel" as const,
    events: [
      { id: "member_join", label: "Member Join" },
      { id: "member_leave", label: "Member Leave" },
      { id: "member_role_change", label: "Role Change" },
      { id: "member_nickname_change", label: "Nickname Change" },
      { id: "member_ban", label: "Member Ban" },
      { id: "member_unban", label: "Member Unban" },
    ],
  },
  moderation: {
    label: "Mod Actions",
    icon: Shield,
    channelKey: "modLogChannel" as const,
    events: [
      { id: "channel_create", label: "Channel Create" },
      { id: "channel_delete", label: "Channel Delete" },
      { id: "channel_update", label: "Channel Update" },
      { id: "channel_permissions", label: "Permission Changes" },
      { id: "role_create", label: "Role Create" },
      { id: "role_delete", label: "Role Delete" },
      { id: "role_update", label: "Role Update" },
    ],
  },
  server: {
    label: "Server Changes",
    icon: Settings,
    channelKey: "serverLogChannel" as const,
    events: [
      { id: "server_settings_change", label: "Settings Change" },
      { id: "server_emoji_change", label: "Emoji Change" },
    ],
  },
  voice: {
    label: "Voice Events",
    icon: Mic,
    channelKey: "voiceLogChannel" as const,
    events: [
      { id: "voice_join", label: "Voice Join" },
      { id: "voice_leave", label: "Voice Leave" },
      { id: "voice_move", label: "Voice Move" },
      { id: "voice_mute", label: "Server Mute" },
      { id: "voice_deafen", label: "Server Deafen" },
    ],
  },
};

type ChannelKey = "messageLogChannel" | "memberLogChannel" | "modLogChannel" | "serverLogChannel" | "voiceLogChannel";

export default function LoggingTab({ serverId }: LoggingTabProps) {
  const { toast } = useToast();
  const { data: config, isLoading } = useAuditLogConfig(serverId);
  const upsertMutation = useUpsertAuditLogConfig(serverId);

  const [enabled, setEnabled] = useState(false);
  const [channels, setChannels] = useState<Record<ChannelKey, string>>({
    messageLogChannel: "",
    memberLogChannel: "",
    modLogChannel: "",
    serverLogChannel: "",
    voiceLogChannel: "",
  });
  const [enabledEvents, setEnabledEvents] = useState<string[]>([]);
  const [format, setFormat] = useState("detailed");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [ignoredChannels, setIgnoredChannels] = useState<string[]>([]);
  const [ignoredRoles, setIgnoredRoles] = useState<string[]>([]);
  const [newIgnoredChannel, setNewIgnoredChannel] = useState("");
  const [newIgnoredRole, setNewIgnoredRole] = useState("");

  useEffect(() => {
    if (config) {
      setEnabled(config.enabled ?? false);
      setChannels({
        messageLogChannel: config.messageLogChannel ?? "",
        memberLogChannel: config.memberLogChannel ?? "",
        modLogChannel: config.modLogChannel ?? "",
        serverLogChannel: config.serverLogChannel ?? "",
        voiceLogChannel: config.voiceLogChannel ?? "",
      });
      setEnabledEvents(config.enabledEvents ?? []);
      setFormat(config.format ?? "detailed");
      setWebhookUrl(config.webhookUrl ?? "");
      setIgnoredChannels(config.ignoredChannels ?? []);
      setIgnoredRoles(config.ignoredRoles ?? []);
    }
  }, [config]);

  const toggleEvent = (eventId: string) => {
    setEnabledEvents((prev) =>
      prev.includes(eventId) ? prev.filter((e) => e !== eventId) : [...prev, eventId]
    );
  };

  const toggleCategoryAll = (categoryKey: string) => {
    const category = EVENT_CATEGORIES[categoryKey as keyof typeof EVENT_CATEGORIES];
    const categoryEventIds = category.events.map((e) => e.id);
    const allSelected = categoryEventIds.every((id) => enabledEvents.includes(id));

    if (allSelected) {
      setEnabledEvents((prev) => prev.filter((e) => !categoryEventIds.includes(e)));
    } else {
      setEnabledEvents((prev) => Array.from(new Set([...prev, ...categoryEventIds])));
    }
  };

  const addIgnoredChannel = () => {
    const trimmed = newIgnoredChannel.trim();
    if (trimmed && !ignoredChannels.includes(trimmed)) {
      setIgnoredChannels((prev) => [...prev, trimmed]);
      setNewIgnoredChannel("");
    }
  };

  const removeIgnoredChannel = (ch: string) => {
    setIgnoredChannels((prev) => prev.filter((c) => c !== ch));
  };

  const addIgnoredRole = () => {
    const trimmed = newIgnoredRole.trim();
    if (trimmed && !ignoredRoles.includes(trimmed)) {
      setIgnoredRoles((prev) => [...prev, trimmed]);
      setNewIgnoredRole("");
    }
  };

  const removeIgnoredRole = (r: string) => {
    setIgnoredRoles((prev) => prev.filter((role) => role !== r));
  };

  const handleSave = () => {
    upsertMutation.mutate(
      {
        enabled,
        messageLogChannel: channels.messageLogChannel || null,
        memberLogChannel: channels.memberLogChannel || null,
        modLogChannel: channels.modLogChannel || null,
        serverLogChannel: channels.serverLogChannel || null,
        voiceLogChannel: channels.voiceLogChannel || null,
        enabledEvents,
        format,
        webhookUrl: webhookUrl || null,
        ignoredChannels,
        ignoredRoles,
      },
      {
        onSuccess: () => {
          toast({ title: "Audit log settings saved", description: "Your logging configuration has been updated." });
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err.message || "Failed to save settings", variant: "destructive" });
        },
      }
    );
  };

  const allEvents = Object.values(EVENT_CATEGORIES).flatMap((c) => c.events.map((e) => e.id));
  const enabledCount = enabledEvents.length;
  const totalCount = allEvents.length;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="glass-card animate-pulse">
            <CardHeader>
              <div className="h-5 w-40 bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-full bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-row items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-display font-bold flex items-center gap-2">
            <ScrollText className="w-6 h-6 text-primary" />
            Audit Logging
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configure multi-channel logging for server events
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant="secondary" data-testid="badge-events-count">
            {enabledCount}/{totalCount} events
          </Badge>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Logging</span>
            <Switch
              checked={enabled}
              onCheckedChange={setEnabled}
              data-testid="switch-logging-enabled"
            />
          </div>
          <Button onClick={handleSave} disabled={upsertMutation.isPending} data-testid="button-save-logging">
            <Save className="w-4 h-4 mr-2" />
            {upsertMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {Object.entries(EVENT_CATEGORIES).map(([key, category]) => {
        const Icon = category.icon;
        const categoryEventIds = category.events.map((e) => e.id);
        const allSelected = categoryEventIds.every((id) => enabledEvents.includes(id));
        const someSelected = categoryEventIds.some((id) => enabledEvents.includes(id));
        const selectedCount = categoryEventIds.filter((id) => enabledEvents.includes(id)).length;

        return (
          <Card key={key} className="glass-card" data-testid={`card-category-${key}`}>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="shrink-0 flex items-center justify-center w-9 h-9 rounded-md bg-primary/10 text-primary">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-base font-display">{category.label}</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {selectedCount}/{categoryEventIds.length} events enabled
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleCategoryAll(key)}
                data-testid={`button-toggle-all-${key}`}
              >
                <CheckSquare className="w-4 h-4 mr-1" />
                {allSelected ? "Deselect All" : "Select All"}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 border-t border-white/5 pt-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  <Hash className="w-3 h-3 inline mr-1" />
                  Log Channel ID
                </label>
                <Input
                  placeholder="Enter channel ID for these events"
                  value={channels[category.channelKey]}
                  onChange={(e) => setChannels((prev) => ({ ...prev, [category.channelKey]: e.target.value }))}
                  data-testid={`input-channel-${key}`}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Events</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {category.events.map((event) => {
                    const isChecked = enabledEvents.includes(event.id);
                    return (
                      <label
                        key={event.id}
                        className="flex items-center gap-2 p-2 rounded-md cursor-pointer hover-elevate"
                        data-testid={`label-event-${event.id}`}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleEvent(event.id)}
                          data-testid={`checkbox-event-${event.id}`}
                        />
                        <span className="text-sm">{event.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <Card className="glass-card" data-testid="card-log-format">
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0 flex items-center justify-center w-9 h-9 rounded-md bg-primary/10 text-primary">
              <Settings className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base font-display">Log Format</CardTitle>
              <CardDescription className="text-xs mt-0.5">Choose how log entries are displayed</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 border-t border-white/5 pt-4">
          <Select value={format} onValueChange={setFormat}>
            <SelectTrigger data-testid="select-log-format">
              <SelectValue placeholder="Select format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="compact">Compact</SelectItem>
              <SelectItem value="detailed">Detailed</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {format === "compact"
              ? "Single-line log entries with essential info only."
              : "Multi-line entries with full context, before/after values, and timestamps."}
          </p>
        </CardContent>
      </Card>

      <Card className="glass-card" data-testid="card-webhook">
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0 flex items-center justify-center w-9 h-9 rounded-md bg-primary/10 text-primary">
              <Link2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base font-display">External Webhook</CardTitle>
              <CardDescription className="text-xs mt-0.5">Send log events to an external webhook URL</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="border-t border-white/5 pt-4">
          <Input
            placeholder="https://discord.com/api/webhooks/..."
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            data-testid="input-webhook-url"
          />
        </CardContent>
      </Card>

      <Card className="glass-card" data-testid="card-ignore-lists">
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0 flex items-center justify-center w-9 h-9 rounded-md bg-primary/10 text-primary">
              <Globe className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base font-display">Ignore Lists</CardTitle>
              <CardDescription className="text-xs mt-0.5">Channels and roles excluded from logging</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 border-t border-white/5 pt-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              <Hash className="w-3 h-3 inline mr-1" />
              Ignored Channels
            </label>
            <div className="flex gap-2 mb-2">
              <Input
                placeholder="Channel ID"
                value={newIgnoredChannel}
                onChange={(e) => setNewIgnoredChannel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addIgnoredChannel()}
                data-testid="input-ignored-channel"
              />
              <Button size="sm" variant="secondary" onClick={addIgnoredChannel} data-testid="button-add-ignored-channel">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {ignoredChannels.map((ch) => (
                <Badge key={ch} variant="secondary" data-testid={`badge-ignored-channel-${ch}`}>
                  #{ch}
                  <button className="ml-1 hover:text-destructive" onClick={() => removeIgnoredChannel(ch)} data-testid={`button-remove-ignored-channel-${ch}`}>
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
              {ignoredChannels.length === 0 && (
                <span className="text-xs text-muted-foreground">No ignored channels</span>
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              <Users className="w-3 h-3 inline mr-1" />
              Ignored Roles
            </label>
            <div className="flex gap-2 mb-2">
              <Input
                placeholder="Role ID"
                value={newIgnoredRole}
                onChange={(e) => setNewIgnoredRole(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addIgnoredRole()}
                data-testid="input-ignored-role"
              />
              <Button size="sm" variant="secondary" onClick={addIgnoredRole} data-testid="button-add-ignored-role">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {ignoredRoles.map((r) => (
                <Badge key={r} variant="secondary" data-testid={`badge-ignored-role-${r}`}>
                  @{r}
                  <button className="ml-1 hover:text-destructive" onClick={() => removeIgnoredRole(r)} data-testid={`button-remove-ignored-role-${r}`}>
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
              {ignoredRoles.length === 0 && (
                <span className="text-xs text-muted-foreground">No ignored roles</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
