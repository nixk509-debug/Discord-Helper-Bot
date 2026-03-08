import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useChannelSettings, useUpsertChannelSettings, useDeleteChannelSettings, useDiscordContext } from "@/hooks/use-bot";
import type { ChannelSetting } from "@shared/schema";
import {
  Plus,
  Trash2,
  Save,
  Hash,
  Clock,
  Shield,
  Lock,
  Eye,
  Settings,
  ArrowLeft,
  Timer,
  AlertTriangle,
  FileText,
  Image,
  Paperclip,
  Link,
  Sticker,
  CheckSquare,
  XSquare,
} from "lucide-react";
import { DiscordChannelPicker } from "@/components/discord/channel-picker";
import { inferChannelKind } from "@/lib/discord-channels";

const SLOWMODE_PRESETS = [
  { label: "Off", value: 0 },
  { label: "5s", value: 5 },
  { label: "10s", value: 10 },
  { label: "30s", value: 30 },
  { label: "1m", value: 60 },
  { label: "5m", value: 300 },
  { label: "15m", value: 900 },
  { label: "1h", value: 3600 },
  { label: "6h", value: 21600 },
];

const CONTENT_TYPES = [
  { id: "text", label: "Text", icon: FileText },
  { id: "images", label: "Images", icon: Image },
  { id: "embeds", label: "Embeds", icon: Eye },
  { id: "files", label: "Files", icon: Paperclip },
  { id: "stickers", label: "Stickers", icon: Sticker },
  { id: "links", label: "Links", icon: Link },
];

const ALL_CONTENT_TYPES = CONTENT_TYPES.map((ct) => ct.id);

interface ChannelsTabProps {
  serverId: number;
}

export function ChannelsTab({ serverId }: ChannelsTabProps) {
  const { toast } = useToast();
  const { data: channels, isLoading } = useChannelSettings(serverId);
  const { data: discordContext } = useDiscordContext(serverId);
  const upsertChannel = useUpsertChannelSettings(serverId);
  const deleteChannel = useDeleteChannelSettings(serverId);

  const [selectedChannelId, setSelectedChannelId] = useState<number | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [newChannelId, setNewChannelId] = useState("");
  const [newChannelName, setNewChannelName] = useState("");
  const [search, setSearch] = useState("");

  const [bulkSelectedIds, setBulkSelectedIds] = useState<number[]>([]);
  const [bulkSettings, setBulkSettings] = useState({
    slowmode: 0,
    autoDeleteAfter: 0,
    lockedDown: false,
    nsfw: false,
  });

  const channelList: ChannelSetting[] = channels || [];
  const discordChannelsById = useMemo(() => {
    const entries = (discordContext?.channels || []).map((channel) => [channel.id, channel] as const);
    return Object.fromEntries(entries);
  }, [discordContext?.channels]);
  const selectedChannel = channelList.find((c) => c.id === selectedChannelId) || null;
  const filteredChannels = channelList.filter((channel) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return channel.channelName.toLowerCase().includes(term) || channel.channelId.includes(term);
  });

  const handleAddChannel = () => {
    if (!newChannelId.trim()) {
      toast({ title: "Error", description: "Channel ID is required", variant: "destructive" });
      return;
    }
    const selectedDiscordChannel = discordChannelsById[newChannelId.trim()];
    const resolvedName = selectedDiscordChannel?.name || newChannelName.trim();
    if (!resolvedName) {
      toast({ title: "Error", description: "Select a channel or enter a display name", variant: "destructive" });
      return;
    }

    const inferredKind = selectedDiscordChannel ? inferChannelKind(selectedDiscordChannel) : undefined;
    upsertChannel.mutate(
      {
        channelId: newChannelId.trim(),
        channelName: resolvedName,
        channelType: selectedDiscordChannel?.typeName || inferredKind || null,
        parentChannelId: selectedDiscordChannel?.parentId || null,
        channelMeta: selectedDiscordChannel ? {
          name: selectedDiscordChannel.name,
          type: selectedDiscordChannel.type,
          typeName: selectedDiscordChannel.typeName || inferredKind,
          parentId: selectedDiscordChannel.parentId || null,
          lastSyncedAt: new Date().toISOString(),
        } : null,
        slowmode: 0,
        autoDeleteAfter: 0,
        automodOverride: null,
        lockedDown: false,
        allowedContentTypes: ALL_CONTENT_TYPES,
        nsfw: false,
        topic: "",
      },
      {
        onSuccess: () => {
          toast({ title: "Channel Added", description: `#${resolvedName} has been configured` });
          setNewChannelId("");
          setNewChannelName("");
          setAddDialogOpen(false);
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  const handleDeleteChannel = (id: number) => {
    deleteChannel.mutate(id, {
      onSuccess: () => {
        toast({ title: "Channel Removed", description: "Channel settings have been removed" });
        if (selectedChannelId === id) setSelectedChannelId(null);
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      },
    });
  };

  const handleBulkApply = () => {
    const selected = channelList.filter((c) => bulkSelectedIds.includes(c.id));
    let completed = 0;
    selected.forEach((ch) => {
      upsertChannel.mutate(
        {
          channelId: ch.channelId,
          channelName: ch.channelName,
          slowmode: bulkSettings.slowmode,
          autoDeleteAfter: bulkSettings.autoDeleteAfter,
          lockedDown: bulkSettings.lockedDown,
          nsfw: bulkSettings.nsfw,
          allowedContentTypes: ch.allowedContentTypes,
          automodOverride: ch.automodOverride,
          topic: ch.topic,
        },
        {
          onSuccess: () => {
            completed++;
            if (completed === selected.length) {
              toast({ title: "Bulk Update", description: `Updated ${completed} channels` });
              setBulkDialogOpen(false);
              setBulkSelectedIds([]);
            }
          },
        }
      );
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full bg-white/5 rounded-xl" />
        <Skeleton className="h-64 w-full bg-white/5 rounded-xl" />
      </div>
    );
  }

  if (selectedChannel) {
    return (
      <ChannelSettingsPanel
        channel={selectedChannel}
        serverId={serverId}
        onBack={() => setSelectedChannelId(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold" data-testid="text-channels-title">Channel Customization</h2>
          <p className="text-sm text-muted-foreground">Configure per-channel settings and restrictions</p>
        </div>
        <div className="w-full md:w-auto md:min-w-[280px]">
          <Input
            placeholder="Search configured channels..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            data-testid="input-channel-search"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" disabled={channelList.length === 0} data-testid="button-bulk-operations">
                <CheckSquare className="w-4 h-4 mr-2" />
                Bulk Operations
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Bulk Channel Operations</DialogTitle>
                <DialogDescription>Apply settings to multiple channels at once</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Select Channels</Label>
                  <div className="max-h-40 overflow-y-auto space-y-2 border border-border rounded-md p-2">
                    {channelList.map((ch) => (
                      <label key={ch.id} className="flex items-center gap-2 cursor-pointer" data-testid={`checkbox-bulk-channel-${ch.id}`}>
                        <Checkbox
                          checked={bulkSelectedIds.includes(ch.id)}
                          onCheckedChange={(checked) => {
                            setBulkSelectedIds(
                              checked
                                ? [...bulkSelectedIds, ch.id]
                                : bulkSelectedIds.filter((id) => id !== ch.id)
                            );
                          }}
                        />
                        <Hash className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm">{ch.channelName}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Slowmode (seconds)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={bulkSettings.slowmode}
                    onChange={(e) => setBulkSettings({ ...bulkSettings, slowmode: parseInt(e.target.value) || 0 })}
                    data-testid="input-bulk-slowmode"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Auto-delete after (seconds, 0 = off)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={bulkSettings.autoDeleteAfter}
                    onChange={(e) => setBulkSettings({ ...bulkSettings, autoDeleteAfter: parseInt(e.target.value) || 0 })}
                    data-testid="input-bulk-auto-delete"
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <Label>Lockdown</Label>
                  <Switch
                    checked={bulkSettings.lockedDown}
                    onCheckedChange={(val) => setBulkSettings({ ...bulkSettings, lockedDown: val })}
                    data-testid="switch-bulk-lockdown"
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <Label>NSFW</Label>
                  <Switch
                    checked={bulkSettings.nsfw}
                    onCheckedChange={(val) => setBulkSettings({ ...bulkSettings, nsfw: val })}
                    data-testid="switch-bulk-nsfw"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setBulkDialogOpen(false)} data-testid="button-bulk-cancel">Cancel</Button>
                <Button
                  onClick={handleBulkApply}
                  disabled={bulkSelectedIds.length === 0 || upsertChannel.isPending}
                  data-testid="button-bulk-apply"
                >
                  Apply to {bulkSelectedIds.length} channel{bulkSelectedIds.length !== 1 ? "s" : ""}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-channel">
                <Plus className="w-4 h-4 mr-2" />
                Add Channel
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Channel</DialogTitle>
                <DialogDescription>Select an existing guild channel (recommended) or enter an ID manually.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <DiscordChannelPicker
                  serverId={serverId}
                  label="Channel"
                  value={newChannelId}
                  onChange={(value) => {
                    setNewChannelId(value);
                    const selected = discordChannelsById[value];
                    if (selected?.name) {
                      setNewChannelName(selected.name);
                    }
                  }}
                  allowedKinds={["text", "announcement", "forum", "voice", "stage", "category"]}
                  placeholder="Select channel..."
                  manualPlaceholder="Channel ID"
                  testIdPrefix="add-channel-picker"
                />
                <div className="space-y-2">
                  <Label htmlFor="channel-name">Display Name</Label>
                  <Input
                    id="channel-name"
                    placeholder="e.g. general"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    data-testid="input-new-channel-name"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddDialogOpen(false)} data-testid="button-add-channel-cancel">Cancel</Button>
                <Button onClick={handleAddChannel} disabled={upsertChannel.isPending} data-testid="button-add-channel-confirm">
                  Add Channel
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {filteredChannels.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Hash className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2" data-testid="text-no-channels">
              {channelList.length === 0 ? "No Channels Configured" : "No Channels Match Your Search"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4 text-center">
              {channelList.length === 0
                ? "Add a channel to start customizing per-channel settings"
                : "Try a different search term or clear the filter."}
            </p>
            {channelList.length === 0 && (
              <Button onClick={() => setAddDialogOpen(true)} data-testid="button-add-channel-empty">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Channel
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredChannels.map((ch) => (
            <ChannelCard
              key={ch.id}
              channel={ch}
              onSelect={() => setSelectedChannelId(ch.id)}
              onDelete={() => handleDeleteChannel(ch.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ChannelCard({
  channel,
  onSelect,
  onDelete,
}: {
  channel: ChannelSetting;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const activeBadges: { label: string; variant: "default" | "secondary" | "destructive" | "outline" }[] = [];

  if (channel.lockedDown) activeBadges.push({ label: "Locked", variant: "destructive" });
  if (channel.nsfw) activeBadges.push({ label: "NSFW", variant: "destructive" });
  if (channel.slowmode && channel.slowmode > 0) activeBadges.push({ label: `Slowmode: ${formatDuration(channel.slowmode)}`, variant: "secondary" });
  if (channel.autoDeleteAfter && channel.autoDeleteAfter > 0) activeBadges.push({ label: `Auto-delete: ${formatDuration(channel.autoDeleteAfter)}`, variant: "secondary" });
  if (channel.automodOverride === true) activeBadges.push({ label: "Automod ON", variant: "default" });
  if (channel.automodOverride === false) activeBadges.push({ label: "Automod OFF", variant: "outline" });

  const allContentTypes = channel.allowedContentTypes || ALL_CONTENT_TYPES;
  const restrictedCount = ALL_CONTENT_TYPES.length - allContentTypes.length;
  if (restrictedCount > 0) activeBadges.push({ label: `${restrictedCount} restricted`, variant: "outline" });

  return (
    <Card className="glass-card hover-elevate cursor-pointer group" data-testid={`card-channel-${channel.id}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <div className="flex items-center gap-2 min-w-0 cursor-pointer" onClick={onSelect}>
          <Hash className="w-5 h-5 text-primary shrink-0" />
          <div className="min-w-0">
            <CardTitle className="text-base truncate" data-testid={`text-channel-name-${channel.id}`}>
              {channel.channelName}
            </CardTitle>
            <CardDescription className="text-xs font-mono truncate flex items-center gap-2" data-testid={`text-channel-id-${channel.id}`}>
              <span>{channel.channelId}</span>
              {channel.channelType && (
                <Badge variant="outline" className="text-[10px] uppercase">{channel.channelType}</Badge>
              )}
            </CardDescription>
          </div>
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          data-testid={`button-delete-channel-${channel.id}`}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="pt-0 cursor-pointer" onClick={onSelect}>
        {channel.topic && (
          <p className="text-xs text-muted-foreground mb-2 line-clamp-2" data-testid={`text-channel-topic-${channel.id}`}>
            {channel.topic}
          </p>
        )}
        {activeBadges.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {activeBadges.map((b, i) => (
              <Badge key={i} variant={b.variant} className="text-xs">
                {b.label}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No special settings</p>
        )}
      </CardContent>
    </Card>
  );
}

function ChannelSettingsPanel({
  channel,
  serverId,
  onBack,
}: {
  channel: ChannelSetting;
  serverId: number;
  onBack: () => void;
}) {
  const { toast } = useToast();
  const upsertChannel = useUpsertChannelSettings(serverId);

  const [slowmode, setSlowmode] = useState(channel.slowmode || 0);
  const [autoDeleteAfter, setAutoDeleteAfter] = useState(channel.autoDeleteAfter || 0);
  const [automodOverride, setAutomodOverride] = useState<boolean | null>(channel.automodOverride);
  const [lockedDown, setLockedDown] = useState(channel.lockedDown || false);
  const [nsfw, setNsfw] = useState(channel.nsfw || false);
  const [topic, setTopic] = useState(channel.topic || "");
  const [channelName, setChannelName] = useState(channel.channelName);
  const [allowedContentTypes, setAllowedContentTypes] = useState<string[]>(
    channel.allowedContentTypes || ALL_CONTENT_TYPES
  );

  const toggleContentType = (typeId: string) => {
    setAllowedContentTypes((prev) =>
      prev.includes(typeId) ? prev.filter((t) => t !== typeId) : [...prev, typeId]
    );
  };

  const handleSave = () => {
    upsertChannel.mutate(
      {
        channelId: channel.channelId,
        channelName,
        slowmode,
        autoDeleteAfter,
        automodOverride,
        lockedDown,
        allowedContentTypes,
        nsfw,
        topic: topic || null,
      },
      {
        onSuccess: () => {
          toast({ title: "Saved", description: `Settings for #${channelName} have been saved` });
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-back-to-channels">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-2 min-w-0">
          <Hash className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold truncate" data-testid="text-channel-settings-title">
            {channelName}
          </h2>
        </div>
        <div className="ml-auto">
          <Button onClick={handleSave} disabled={upsertChannel.isPending} data-testid="button-save-channel">
            <Save className="w-4 h-4 mr-2" />
            {upsertChannel.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Basic Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Channel ID</Label>
              <Input value={channel.channelId} disabled className="font-mono text-sm" data-testid="input-channel-id" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="display-name">Display Name</Label>
              <Input
                id="display-name"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                data-testid="input-channel-display-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="channel-topic">Channel Topic</Label>
              <Textarea
                id="channel-topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Set a topic for this channel..."
                className="resize-none"
                data-testid="input-channel-topic"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Slowmode
            </CardTitle>
            <CardDescription>Limit how often users can send messages</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {SLOWMODE_PRESETS.map((preset) => (
                <Button
                  key={preset.value}
                  variant={slowmode === preset.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSlowmode(preset.value)}
                  className="toggle-elevate"
                  data-testid={`button-slowmode-${preset.value}`}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <div className="space-y-2">
              <Label>Custom (seconds)</Label>
              <Input
                type="number"
                min={0}
                value={slowmode}
                onChange={(e) => setSlowmode(parseInt(e.target.value) || 0)}
                data-testid="input-slowmode-custom"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Timer className="w-4 h-4" />
              Auto-Delete Messages
            </CardTitle>
            <CardDescription>Automatically delete messages after a duration (0 = off)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Delete after (seconds)</Label>
              <Input
                type="number"
                min={0}
                value={autoDeleteAfter}
                onChange={(e) => setAutoDeleteAfter(parseInt(e.target.value) || 0)}
                data-testid="input-auto-delete"
              />
            </div>
            {autoDeleteAfter > 0 && (
              <p className="text-xs text-muted-foreground" data-testid="text-auto-delete-preview">
                Messages will be deleted after {formatDuration(autoDeleteAfter)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Automod Override
            </CardTitle>
            <CardDescription>Override global automod settings for this channel</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-3 cursor-pointer" data-testid="radio-automod-inherit">
                <input
                  type="radio"
                  name="automod-override"
                  checked={automodOverride === null}
                  onChange={() => setAutomodOverride(null)}
                  className="accent-primary"
                />
                <span className="text-sm">Inherit global settings</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer" data-testid="radio-automod-enabled">
                <input
                  type="radio"
                  name="automod-override"
                  checked={automodOverride === true}
                  onChange={() => setAutomodOverride(true)}
                  className="accent-primary"
                />
                <span className="text-sm">Force enable automod</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer" data-testid="radio-automod-disabled">
                <input
                  type="radio"
                  name="automod-override"
                  checked={automodOverride === false}
                  onChange={() => setAutomodOverride(false)}
                  className="accent-primary"
                />
                <span className="text-sm">Force disable automod</span>
              </label>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Content Type Restrictions
            </CardTitle>
            <CardDescription>Control which types of content are allowed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {CONTENT_TYPES.map((ct) => {
                const Icon = ct.icon;
                const isAllowed = allowedContentTypes.includes(ct.id);
                return (
                  <label
                    key={ct.id}
                    className="flex items-center gap-2 cursor-pointer"
                    data-testid={`checkbox-content-${ct.id}`}
                  >
                    <Checkbox
                      checked={isAllowed}
                      onCheckedChange={() => toggleContentType(ct.id)}
                    />
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{ct.label}</span>
                  </label>
                );
              })}
            </div>
            <div className="flex gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAllowedContentTypes([...ALL_CONTENT_TYPES])}
                data-testid="button-allow-all-content"
              >
                <CheckSquare className="w-3 h-3 mr-1" />
                Allow All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAllowedContentTypes([])}
                data-testid="button-block-all-content"
              >
                <XSquare className="w-3 h-3 mr-1" />
                Block All
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Channel Flags
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label className="text-sm">Lockdown</Label>
                <p className="text-xs text-muted-foreground">Prevent all messages temporarily</p>
              </div>
              <Switch
                checked={lockedDown}
                onCheckedChange={setLockedDown}
                data-testid="switch-lockdown"
              />
            </div>
            {lockedDown && (
              <div className="flex items-center gap-2 text-xs text-destructive">
                <AlertTriangle className="w-3 h-3" />
                Channel is currently locked down
              </div>
            )}
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label className="text-sm">NSFW</Label>
                <p className="text-xs text-muted-foreground">Mark channel as age-restricted</p>
              </div>
              <Switch
                checked={nsfw}
                onCheckedChange={setNsfw}
                data-testid="switch-nsfw"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}
