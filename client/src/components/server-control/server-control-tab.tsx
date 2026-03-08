import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Shield, Zap, Lock, ShieldAlert, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDiscordContext } from "@/hooks/use-bot";
import { DiscordEntityListPicker, DiscordEntityPicker } from "@/components/discord/entity-pickers";

interface Props {
  serverId: number;
  settings: any;
}

const MODES = [
  {
    id: "relaxed",
    label: "Relaxed",
    icon: Radio,
    desc: "Minimal restrictions. Low thresholds, raid protection off. Great for small, trusted communities.",
    color: "border-green-500/40 text-green-400",
    glow: "shadow-green-500/20",
  },
  {
    id: "normal",
    label: "Normal",
    icon: Shield,
    desc: "Balanced defaults. Standard automod rules and raid protection settings.",
    color: "border-primary/40 text-primary",
    glow: "shadow-primary/20",
  },
  {
    id: "shield",
    label: "Shield",
    icon: ShieldAlert,
    desc: "Maximum protection. Strict anti-spam, anti-link, mass-mention filtering. Minimum account age enforced.",
    color: "border-red-500/40 text-red-400",
    glow: "shadow-red-500/20",
  },
];

export function ServerControlTab({ serverId, settings }: Props) {
  const { toast } = useToast();
  const { data: discordContext } = useDiscordContext(serverId);

  const [mode, setMode] = useState(settings?.serverControlMode ?? "normal");
  const [quarantineRoleId, setQuarantineRoleId] = useState(settings?.quarantineRoleId ?? "");
  const [lockdownEnabled, setLockdownEnabled] = useState(settings?.lockdownEnabled ?? false);
  const [lockdownBypassRoleIds, setLockdownBypassRoleIds] = useState<string[]>(settings?.lockdownBypassRoleIds ?? []);
  const [lockdownNotifyChannelId, setLockdownNotifyChannelId] = useState(settings?.lockdownNotifyChannelId ?? "");
  const [modLogChannelId, setModLogChannelId] = useState(settings?.modLogChannelId ?? "");
  const [raidLogChannelId, setRaidLogChannelId] = useState(settings?.raidLogChannelId ?? "");
  const [configLogChannelId, setConfigLogChannelId] = useState(settings?.configLogChannelId ?? "");
  const [autoLogChannelId, setAutoLogChannelId] = useState(settings?.autoLogChannelId ?? "");

  useEffect(() => {
    setMode(settings?.serverControlMode ?? "normal");
    setQuarantineRoleId(settings?.quarantineRoleId ?? "");
    setLockdownEnabled(settings?.lockdownEnabled ?? false);
    setLockdownBypassRoleIds(settings?.lockdownBypassRoleIds ?? []);
    setLockdownNotifyChannelId(settings?.lockdownNotifyChannelId ?? "");
    setModLogChannelId(settings?.modLogChannelId ?? "");
    setRaidLogChannelId(settings?.raidLogChannelId ?? "");
    setConfigLogChannelId(settings?.configLogChannelId ?? "");
    setAutoLogChannelId(settings?.autoLogChannelId ?? "");
  }, [settings]);

  const roleOptions = (discordContext?.roles || []).map((role) => ({
    id: role.id,
    label: role.name,
    description: role.id,
  }));

  const textChannelOptions = (discordContext?.channels || [])
    .filter((channel) => channel.isTextBased && !channel.isCategory && !channel.isThread)
    .map((channel) => ({
      id: channel.id,
      label: `#${channel.name}`,
      description: channel.id,
    }));

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/servers/${serverId}/settings`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/servers", serverId] });
      toast({ title: "Server control settings saved" });
    },
    onError: () => toast({ title: "Failed to save", variant: "destructive" }),
  });

  const handleSave = () => {
    updateMutation.mutate({
      serverControlMode: mode,
      quarantineRoleId: quarantineRoleId || null,
      lockdownEnabled,
      lockdownBypassRoleIds,
      lockdownNotifyChannelId: lockdownNotifyChannelId || null,
      modLogChannelId: modLogChannelId || null,
      raidLogChannelId: raidLogChannelId || null,
      configLogChannelId: configLogChannelId || null,
      autoLogChannelId: autoLogChannelId || null,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold gradient-brand" data-testid="text-servercontrol-heading">Server Control</h2>
        <p className="text-muted-foreground text-sm mt-1">Configure server protection mode, lockdown, and per-type logging channels.</p>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-display">Protection Mode</CardTitle>
          <CardDescription>Choose how aggressively Archivist protects your server.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {MODES.map((m) => {
              const Icon = m.icon;
              const isActive = mode === m.id;
              return (
                <button
                  key={m.id}
                  data-testid={`button-mode-${m.id}`}
                  onClick={() => setMode(m.id)}
                  className={cn(
                    "rounded-xl border p-4 text-left transition-all",
                    isActive
                      ? `${m.color} bg-white/5 shadow-lg ${m.glow}`
                      : "border-white/10 text-muted-foreground hover:border-white/20"
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-5 h-5" />
                    <span className="font-semibold font-display">{m.label}</span>
                    {isActive && <Badge className="ml-auto text-xs bg-primary/20 text-primary border-primary/30">Active</Badge>}
                  </div>
                  <p className="text-xs leading-relaxed opacity-80">{m.desc}</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2"><Lock className="w-4 h-4" /> Server Lockdown</CardTitle>
          <CardDescription>Instantly lock all channels for @everyone. Bypass roles can still post.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-white/10 p-4">
            <div>
              <p className="font-medium">Lockdown Active</p>
              <p className="text-sm text-muted-foreground">When enabled, @everyone cannot send messages in any channel.</p>
            </div>
            <Switch
              checked={lockdownEnabled}
              onCheckedChange={setLockdownEnabled}
              data-testid="switch-lockdown-enabled"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DiscordEntityListPicker
              label="Bypass Roles"
              values={lockdownBypassRoleIds}
              onChange={setLockdownBypassRoleIds}
              options={roleOptions}
              placeholder="Add bypass role..."
              manualPlaceholder="Role ID"
              testIdPrefix="input-lockdown-bypass-roles"
            />
            <DiscordEntityPicker
              label="Notify Channel"
              value={lockdownNotifyChannelId}
              onChange={setLockdownNotifyChannelId}
              options={textChannelOptions}
              placeholder="Select notify channel..."
              manualPlaceholder="Channel ID"
              testIdPrefix="input-lockdown-notify-channel"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2"><Zap className="w-4 h-4" /> Anti-Raid</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <DiscordEntityPicker
            label="Quarantine Role"
            value={quarantineRoleId}
            onChange={setQuarantineRoleId}
            options={roleOptions}
            placeholder="Select quarantine role..."
            manualPlaceholder="Role ID"
            testIdPrefix="input-quarantine-role-id"
          />
          <p className="text-xs text-muted-foreground">If set, raid joiners will be assigned this role instead of being kicked.</p>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-display">Log Channels</CardTitle>
          <CardDescription>Set dedicated channels for each type of log event.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DiscordEntityPicker
              label="Mod Log Channel"
              value={modLogChannelId}
              onChange={setModLogChannelId}
              options={textChannelOptions}
              placeholder="Select mod log channel..."
              manualPlaceholder="Channel ID"
              testIdPrefix="input-mod-log-channel"
            />
            <DiscordEntityPicker
              label="Raid Log Channel"
              value={raidLogChannelId}
              onChange={setRaidLogChannelId}
              options={textChannelOptions}
              placeholder="Select raid log channel..."
              manualPlaceholder="Channel ID"
              testIdPrefix="input-raid-log-channel"
            />
            <DiscordEntityPicker
              label="Config Log Channel"
              value={configLogChannelId}
              onChange={setConfigLogChannelId}
              options={textChannelOptions}
              placeholder="Select config log channel..."
              manualPlaceholder="Channel ID"
              testIdPrefix="input-config-log-channel"
            />
            <DiscordEntityPicker
              label="Auto-Mod Log Channel"
              value={autoLogChannelId}
              onChange={setAutoLogChannelId}
              options={textChannelOptions}
              placeholder="Select auto-mod log channel..."
              manualPlaceholder="Channel ID"
              testIdPrefix="input-auto-log-channel"
            />
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={handleSave}
        disabled={updateMutation.isPending}
        className="gradient-brand text-white"
        data-testid="button-save-server-control"
      >
        {updateMutation.isPending ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  );
}
