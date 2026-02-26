import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Shield, Zap, Lock, ShieldAlert, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [mode, setMode] = useState(settings?.serverControlMode ?? "normal");
  const [quarantineRoleId, setQuarantineRoleId] = useState(settings?.quarantineRoleId ?? "");
  const [lockdownEnabled, setLockdownEnabled] = useState(settings?.lockdownEnabled ?? false);
  const [lockdownBypassRoles, setLockdownBypassRoles] = useState((settings?.lockdownBypassRoleIds ?? []).join(", "));
  const [lockdownNotifyChannelId, setLockdownNotifyChannelId] = useState(settings?.lockdownNotifyChannelId ?? "");
  const [modLogChannelId, setModLogChannelId] = useState(settings?.modLogChannelId ?? "");
  const [raidLogChannelId, setRaidLogChannelId] = useState(settings?.raidLogChannelId ?? "");
  const [configLogChannelId, setConfigLogChannelId] = useState(settings?.configLogChannelId ?? "");
  const [autoLogChannelId, setAutoLogChannelId] = useState(settings?.autoLogChannelId ?? "");

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
      lockdownBypassRoleIds: lockdownBypassRoles.split(",").map(s => s.trim()).filter(Boolean),
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
            {MODES.map(m => {
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
            <div className="space-y-2">
              <Label>Bypass Role IDs (comma-separated)</Label>
              <Input
                value={lockdownBypassRoles}
                onChange={e => setLockdownBypassRoles(e.target.value)}
                placeholder="123456789, 987654321"
                data-testid="input-lockdown-bypass-roles"
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label>Notify Channel ID</Label>
              <Input
                value={lockdownNotifyChannelId}
                onChange={e => setLockdownNotifyChannelId(e.target.value)}
                placeholder="Channel ID for lockdown notification"
                data-testid="input-lockdown-notify-channel"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2"><Zap className="w-4 h-4" /> Anti-Raid</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="space-y-2">
            <Label>Quarantine Role ID</Label>
            <Input
              value={quarantineRoleId}
              onChange={e => setQuarantineRoleId(e.target.value)}
              placeholder="Role ID to assign to raid joiners"
              data-testid="input-quarantine-role-id"
            />
            <p className="text-xs text-muted-foreground">If set, raid joiners will be assigned this role instead of being kicked.</p>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-display">Log Channels</CardTitle>
          <CardDescription>Set dedicated channels for each type of log event.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: "Mod Log Channel ID", value: modLogChannelId, setter: setModLogChannelId, testId: "input-mod-log-channel" },
              { label: "Raid Log Channel ID", value: raidLogChannelId, setter: setRaidLogChannelId, testId: "input-raid-log-channel" },
              { label: "Config Log Channel ID", value: configLogChannelId, setter: setConfigLogChannelId, testId: "input-config-log-channel" },
              { label: "Auto-Mod Log Channel ID", value: autoLogChannelId, setter: setAutoLogChannelId, testId: "input-auto-log-channel" },
            ].map(({ label, value, setter, testId }) => (
              <div key={testId} className="space-y-2">
                <Label>{label}</Label>
                <Input value={value} onChange={e => setter(e.target.value)} placeholder="Channel ID" data-testid={testId} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={handleSave}
        disabled={updateMutation.isPending}
        className="gradient-brand text-white"
        data-testid="button-save-server-control"
      >
        {updateMutation.isPending ? "Saving…" : "Save Changes"}
      </Button>
    </div>
  );
}
