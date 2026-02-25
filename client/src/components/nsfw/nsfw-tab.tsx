import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useUpdateSettings } from "@/hooks/use-bot";
import { EyeOff, Save, Loader2, X, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface NsfwTabProps {
  serverId: number;
  settings: any;
}

export function NsfwTab({ serverId, settings }: NsfwTabProps) {
  const { toast } = useToast();
  const updateSettings = useUpdateSettings(serverId);

  const [enabled, setEnabled] = useState(false);
  const [ageVerificationEnabled, setAgeVerificationEnabled] = useState(false);
  const [verificationRoleId, setVerificationRoleId] = useState("");
  const [nsfwChannels, setNsfwChannels] = useState<string[]>([]);
  const [restrictedRoles, setRestrictedRoles] = useState<string[]>([]);
  const [logChannelId, setLogChannelId] = useState("");
  const [autoDetect, setAutoDetect] = useState(false);
  const [warnOnAccess, setWarnOnAccess] = useState(true);

  const [channelInput, setChannelInput] = useState("");
  const [roleInput, setRoleInput] = useState("");

  useEffect(() => {
    if (settings) {
      setEnabled(settings.nsfwEnabled ?? false);
      setAgeVerificationEnabled(settings.nsfwAgeVerificationEnabled ?? false);
      setVerificationRoleId(settings.nsfwVerificationRoleId ?? "");
      setNsfwChannels(settings.nsfwChannels ?? []);
      setRestrictedRoles(settings.nsfwRestrictedRoles ?? []);
      setLogChannelId(settings.nsfwLogChannelId ?? "");
      setAutoDetect(settings.nsfwAutoDetect ?? false);
      setWarnOnAccess(settings.nsfwWarnOnAccess ?? true);
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate(
      {
        nsfwEnabled: enabled,
        nsfwAgeVerificationEnabled: ageVerificationEnabled,
        nsfwVerificationRoleId: verificationRoleId || null,
        nsfwChannels,
        nsfwRestrictedRoles: restrictedRoles,
        nsfwLogChannelId: logChannelId || null,
        nsfwAutoDetect: autoDetect,
        nsfwWarnOnAccess: warnOnAccess,
      },
      {
        onSuccess: () => toast({ title: "NSFW module updated", description: "Settings saved successfully." }),
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  };

  const addChannel = () => {
    const trimmed = channelInput.trim();
    if (trimmed && !nsfwChannels.includes(trimmed)) {
      setNsfwChannels([...nsfwChannels, trimmed]);
      setChannelInput("");
    }
  };

  const addRole = () => {
    const trimmed = roleInput.trim();
    if (trimmed && !restrictedRoles.includes(trimmed)) {
      setRestrictedRoles([...restrictedRoles, trimmed]);
      setRoleInput("");
    }
  };

  if (!settings) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="font-display flex items-center gap-2">
                <EyeOff className="w-5 h-5 text-primary" />
                NSFW Content Control
              </CardTitle>
              <CardDescription>Manage age-restricted content channels and access rules.</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              {enabled && <Badge variant="default" data-testid="badge-nsfw-enabled">Active</Badge>}
              <Switch
                checked={enabled}
                onCheckedChange={setEnabled}
                data-testid="switch-nsfw-enabled"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center justify-between p-4 rounded-md border border-border">
              <div>
                <p className="font-medium text-sm">Age Verification Required</p>
                <p className="text-xs text-muted-foreground">Members must have the verification role to access NSFW channels.</p>
              </div>
              <Switch
                checked={ageVerificationEnabled}
                onCheckedChange={setAgeVerificationEnabled}
                data-testid="switch-nsfw-age-verification"
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-md border border-border">
              <div>
                <p className="font-medium text-sm">Auto-detect NSFW Content</p>
                <p className="text-xs text-muted-foreground">Automatically flag potential NSFW content in non-NSFW channels.</p>
              </div>
              <Switch
                checked={autoDetect}
                onCheckedChange={setAutoDetect}
                data-testid="switch-nsfw-auto-detect"
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-md border border-border">
              <div>
                <p className="font-medium text-sm">Warn on First Access</p>
                <p className="text-xs text-muted-foreground">Show a warning message when a member first accesses an NSFW channel.</p>
              </div>
              <Switch
                checked={warnOnAccess}
                onCheckedChange={setWarnOnAccess}
                data-testid="switch-nsfw-warn-access"
              />
            </div>

            <div className="space-y-2">
              <Label>Age-Verified Role ID</Label>
              <Input
                value={verificationRoleId}
                onChange={(e) => setVerificationRoleId(e.target.value)}
                placeholder="Role ID for age-verified members"
                data-testid="input-nsfw-verification-role"
              />
            </div>

            <div className="space-y-2">
              <Label>Log Channel ID</Label>
              <Input
                value={logChannelId}
                onChange={(e) => setLogChannelId(e.target.value)}
                placeholder="Channel ID for NSFW access logs"
                data-testid="input-nsfw-log-channel"
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label>Designated NSFW Channels</Label>
            <div className="flex gap-2">
              <Input
                value={channelInput}
                onChange={(e) => setChannelInput(e.target.value)}
                placeholder="Channel ID"
                onKeyDown={(e) => e.key === "Enter" && addChannel()}
                data-testid="input-nsfw-channel"
              />
              <Button variant="outline" size="icon" onClick={addChannel} data-testid="button-add-nsfw-channel">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {nsfwChannels.map((ch) => (
                <Badge key={ch} variant="secondary" className="gap-1" data-testid={`badge-nsfw-channel-${ch}`}>
                  {ch}
                  <button onClick={() => setNsfwChannels(nsfwChannels.filter((c) => c !== ch))}>
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
              {nsfwChannels.length === 0 && <p className="text-xs text-muted-foreground">No NSFW channels designated.</p>}
            </div>
          </div>

          <div className="space-y-3">
            <Label>Restricted Roles</Label>
            <p className="text-xs text-muted-foreground">Roles that are blocked from accessing NSFW channels regardless of verification.</p>
            <div className="flex gap-2">
              <Input
                value={roleInput}
                onChange={(e) => setRoleInput(e.target.value)}
                placeholder="Role ID"
                onKeyDown={(e) => e.key === "Enter" && addRole()}
                data-testid="input-nsfw-restricted-role"
              />
              <Button variant="outline" size="icon" onClick={addRole} data-testid="button-add-nsfw-role">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {restrictedRoles.map((r) => (
                <Badge key={r} variant="secondary" className="gap-1" data-testid={`badge-restricted-role-${r}`}>
                  {r}
                  <button onClick={() => setRestrictedRoles(restrictedRoles.filter((x) => x !== r))}>
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
              {restrictedRoles.length === 0 && <p className="text-xs text-muted-foreground">No restricted roles.</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updateSettings.isPending} data-testid="button-save-nsfw" className="gap-2">
          {updateSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {updateSettings.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
