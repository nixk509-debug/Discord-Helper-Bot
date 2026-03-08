import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useUpdateSettings, useDiscordContext, useCreateStudioDocument, usePublishStudio, useStudioPublications } from "@/hooks/use-bot";
import { ShieldCheck, Save, Loader2, Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { StudioSurfaceCard } from "@/components/design-studio/studio-surface-card";
import { createStudioDocument as createStudioDocumentDraft } from "@/components/design-studio/studio-defaults";

interface VerifyTabProps {
  serverId: number;
  settings: any;
}

export function VerifyTab({ serverId, settings }: VerifyTabProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const updateSettings = useUpdateSettings(serverId);
  const createStudioDocument = useCreateStudioDocument(serverId);
  const publishStudio = usePublishStudio(serverId);
  const { data: studioPublications = [] } = useStudioPublications(serverId);
  const { data: discordContext, isLoading: discordContextLoading } = useDiscordContext(serverId);
  const channelOptions = (discordContext?.channels || []).map((channel: any) => ({ id: channel.id, name: channel.name }));
  const roleOptions = (discordContext?.roles || []).map((role: any) => ({ id: role.id, name: role.name }));
  const verifyPublication = (studioPublications as any[]).find((entry) => entry.id === settings?.verifyPublicationId) || null;

  const openStudio = (documentId: number) => {
    navigate(`/dashboard/servers/${serverId}/studio?documentId=${documentId}`);
  };

  const handleCreateSurface = () => {
    createStudioDocument.mutate(
      {
        scope: "server",
        kind: "surface",
        name: "Verification Panel",
        moduleBinding: "verify",
        document: createStudioDocumentDraft("verify", "Verification Panel"),
      },
      {
        onSuccess: (created: any) => {
          updateSettings.mutate(
            {
              verifyStudioDocumentId: created.id,
              verifyEntryViewId: created.document?.meta?.entryViewId || "entry",
            },
            {
              onSuccess: () => openStudio(created.id),
            },
          );
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  };

  const handlePublishSurface = () => {
    if (!settings?.verifyStudioDocumentId) {
      toast({ title: "No panel bound", description: "Create or bind a verification panel first.", variant: "destructive" });
      return;
    }
    if (!channelId) {
      toast({ title: "No channel selected", description: "Choose a verification channel before publishing.", variant: "destructive" });
      return;
    }
    publishStudio.mutate(
      {
        documentId: settings.verifyStudioDocumentId,
        target: {
          channelId,
          viewId: settings?.verifyEntryViewId || "entry",
        },
      },
      {
        onSuccess: (result: any) => {
          updateSettings.mutate({ verifyPublicationId: result.publicationId });
          toast({ title: "Panel published", description: `Verification panel sent to ${channelId}.` });
        },
        onError: (err: any) => toast({ title: "Publish failed", description: err.message, variant: "destructive" }),
      }
    );
  };

  const [enabled, setEnabled] = useState(false);
  const [verifyType, setVerifyType] = useState("button");
  const [channelId, setChannelId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [unverifiedRoleId, setUnverifiedRoleId] = useState("");
  const [logChannelId, setLogChannelId] = useState("");
  const [buttonLabel, setButtonLabel] = useState("Verify Me");
  const [verifyMessage, setVerifyMessage] = useState("");
  const [minAccountAge, setMinAccountAge] = useState(0);
  const [codeWord, setCodeWord] = useState("");

  useEffect(() => {
    if (settings) {
      setEnabled(settings.verifyEnabled ?? false);
      setVerifyType(settings.verifyType ?? "button");
      setChannelId(settings.verifyChannelId ?? "");
      setRoleId(settings.verifyRoleId ?? "");
      setUnverifiedRoleId(settings.unverifiedRoleId ?? "");
      setLogChannelId(settings.verifyLogChannelId ?? "");
      setButtonLabel(settings.verifyButtonLabel ?? "Verify Me");
      setVerifyMessage(settings.verifyMessage ?? "");
      setMinAccountAge(settings.verifyMinAccountAge ?? 0);
      setCodeWord(settings.verifyCodeWord ?? "");
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate(
      {
        verifyEnabled: enabled,
        verifyType,
        verifyChannelId: channelId || null,
        verifyRoleId: roleId || null,
        unverifiedRoleId: unverifiedRoleId || null,
        verifyLogChannelId: logChannelId || null,
        verifyButtonLabel: buttonLabel,
        verifyMessage: verifyMessage || null,
        verifyMinAccountAge: minAccountAge,
        verifyCodeWord: codeWord || null,
      },
      {
        onSuccess: () => toast({ title: "Verify module updated", description: "Settings saved successfully." }),
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
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
                <ShieldCheck className="w-5 h-5 text-primary" />
                Verification System
              </CardTitle>
              <CardDescription>Require members to verify before accessing your server.</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              {enabled && <Badge variant="default" data-testid="badge-verify-enabled">Active</Badge>}
              <Switch
                checked={enabled}
                onCheckedChange={setEnabled}
                data-testid="switch-verify-enabled"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Verification Type</Label>
              <Select value={verifyType} onValueChange={setVerifyType}>
                <SelectTrigger data-testid="select-verify-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="button">Button Click</SelectItem>
                  <SelectItem value="reaction">Reaction</SelectItem>
                  <SelectItem value="codeword">Code Word</SelectItem>
                  <SelectItem value="rules">Rules Scroll</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {verifyType === "button" && "Members click a button in the verification channel."}
                {verifyType === "reaction" && "Members react to a message to verify."}
                {verifyType === "codeword" && "Members type a secret code word to verify."}
                {verifyType === "rules" && "Members must scroll to the bottom of the rules embed."}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Button Label</Label>
              <Input
                value={buttonLabel}
                onChange={(e) => setButtonLabel(e.target.value)}
                placeholder="Verify Me"
                data-testid="input-verify-button-label"
              />
            </div>

            <div className="space-y-2">
              <Label>Verification Channel</Label>
              <Select value={channelId || "__none__"} onValueChange={(value) => setChannelId(value === "__none__" ? "" : value)}>
                <SelectTrigger data-testid="select-verify-channel">
                  <SelectValue placeholder={discordContextLoading ? "Loading channels..." : "Select channel"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Not Set</SelectItem>
                  {channelOptions.map((channel) => (
                    <SelectItem key={channel.id} value={channel.id}>
                      # {channel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Verified Role</Label>
              <Select value={roleId || "__none__"} onValueChange={(value) => setRoleId(value === "__none__" ? "" : value)}>
                <SelectTrigger data-testid="select-verify-role">
                  <SelectValue placeholder={discordContextLoading ? "Loading roles..." : "Select role"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Not Set</SelectItem>
                  {roleOptions.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Unverified Role</Label>
              <Select value={unverifiedRoleId || "__none__"} onValueChange={(value) => setUnverifiedRoleId(value === "__none__" ? "" : value)}>
                <SelectTrigger data-testid="select-unverified-role">
                  <SelectValue placeholder={discordContextLoading ? "Loading roles..." : "Select role"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Not Set</SelectItem>
                  {roleOptions.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Log Channel</Label>
              <Select value={logChannelId || "__none__"} onValueChange={(value) => setLogChannelId(value === "__none__" ? "" : value)}>
                <SelectTrigger data-testid="select-verify-log-channel">
                  <SelectValue placeholder={discordContextLoading ? "Loading channels..." : "Select channel"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Not Set</SelectItem>
                  {channelOptions.map((channel) => (
                    <SelectItem key={channel.id} value={channel.id}>
                      # {channel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {verifyType === "codeword" && (
            <div className="space-y-2">
              <Label>Secret Code Word</Label>
              <Input
                value={codeWord}
                onChange={(e) => setCodeWord(e.target.value)}
                placeholder="Enter the secret code word"
                data-testid="input-verify-codeword"
              />
              <p className="text-xs text-muted-foreground">Members must type this exact word/phrase to verify.</p>
            </div>
          )}

          <div className="space-y-3">
            <Label>Minimum Account Age Gate: <span className="text-primary font-semibold">{minAccountAge} days</span></Label>
            <Slider
              min={0}
              max={365}
              step={1}
              value={[minAccountAge]}
              onValueChange={([val]) => setMinAccountAge(val)}
              data-testid="slider-verify-min-age"
            />
            <p className="text-xs text-muted-foreground">Accounts younger than this will be denied verification. Set to 0 to disable.</p>
          </div>

          <div className="space-y-2">
            <Label>Verification Message</Label>
            <Input
              value={verifyMessage}
              onChange={(e) => setVerifyMessage(e.target.value)}
              placeholder="Welcome! Click the button below to verify..."
              data-testid="input-verify-message"
            />
          </div>

          <div className="flex items-start gap-3 p-3 rounded-md bg-primary/5 border border-primary/20">
            <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">
              Save the verification policy here, then publish the bound verification panel below. The old manual `/post-verify` flow is no longer the primary path.
            </p>
          </div>
        </CardContent>
      </Card>

      <StudioSurfaceCard
        title="Verification Panel"
        description="Design Studio now owns the verification panel. Publish the panel instead of relying on a hardcoded mini-builder."
        documentId={settings?.verifyStudioDocumentId}
        publication={verifyPublication}
        onCreate={handleCreateSurface}
        onOpen={() => settings?.verifyStudioDocumentId && openStudio(settings.verifyStudioDocumentId)}
        onPublish={handlePublishSurface}
        actionLabel="Create Panel"
      />

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updateSettings.isPending} data-testid="button-save-verify" className="gap-2">
          {updateSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {updateSettings.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

