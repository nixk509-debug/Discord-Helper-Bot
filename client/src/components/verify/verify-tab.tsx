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
import { ShieldCheck, Save, Loader2, Info, AlertTriangle, CheckCircle2, Send, Sparkles } from "lucide-react";
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
  const readyChecks = {
    channel: Boolean(channelId),
    verifiedRole: Boolean(roleId),
    panel: Boolean(settings?.verifyStudioDocumentId),
    liveMessage: Boolean(verifyPublication),
  };
  const readinessCount = Object.values(readyChecks).filter(Boolean).length;
  const setupIssues = [
    !channelId ? "Choose a verification channel." : null,
    !roleId ? "Choose the role members receive after verification." : null,
    !settings?.verifyStudioDocumentId ? "Create the verification panel in Studio." : null,
    settings?.verifyStudioDocumentId && !verifyPublication ? "Publish the verification panel when the content is ready." : null,
  ].filter((value): value is string => Boolean(value));

  const openStudio = (documentId: number) => {
    navigate(`/dashboard/servers/${serverId}/studio?intent=verify&documentId=${documentId}`);
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
      <Card className="glass-card border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(177,18,38,0.18),transparent_34%),linear-gradient(180deg,rgba(22,24,28,0.94),rgba(10,11,13,0.98))]">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="font-display flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                Verify Control
              </CardTitle>
              <CardDescription>Gate access cleanly, publish the live verification surface, and see readiness at a glance.</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={enabled ? "default" : "outline"} data-testid="badge-verify-enabled">{enabled ? "Live" : "Off"}</Badge>
              <Switch
                checked={enabled}
                onCheckedChange={setEnabled}
                data-testid="switch-verify-enabled"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-white/40">Readiness</p>
              <p className="mt-2 text-2xl font-display font-semibold text-white">{readinessCount}/4</p>
              <p className="mt-1 text-sm text-muted-foreground">Key steps configured</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-white/40">Method</p>
              <p className="mt-2 text-base font-semibold text-white">
                {verifyType === "button" ? "Button gate" : verifyType === "reaction" ? "Reaction gate" : verifyType === "codeword" ? "Code word" : "Rules scroll"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{enabled ? "Verification is enabled." : "Verification is currently off."}</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-white/40">Panel</p>
              <p className="mt-2 text-base font-semibold text-white">{settings?.verifyStudioDocumentId ? "Bound to Studio" : "Needs panel"}</p>
              <p className="mt-1 text-sm text-muted-foreground">{verifyPublication ? "A live panel is published." : "No live panel published yet."}</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-white/40">Outcome</p>
              <p className="mt-2 text-base font-semibold text-white">{roleId ? "Role ready" : "Role missing"}</p>
              <p className="mt-1 text-sm text-muted-foreground">{channelId ? "Target channel selected." : "Choose where members verify."}</p>
            </div>
          </div>

          {setupIssues.length > 0 ? (
            <div className="rounded-[24px] border border-amber-500/20 bg-amber-500/10 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-white">Verification still needs attention</p>
                  <div className="space-y-1 text-sm text-white/75">
                    {setupIssues.map((issue) => (
                      <p key={issue}>{issue}</p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-[24px] border border-emerald-500/20 bg-emerald-500/10 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                <div>
                  <p className="text-sm font-semibold text-white">Verification is ready to run</p>
                  <p className="text-sm text-white/75">Policy, panel binding, role routing, and publish state are all configured.</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="space-y-6">
          <Card className="glass-card border-white/10 bg-background/40">
            <CardHeader>
              <CardTitle className="font-display text-base">Requirements</CardTitle>
              <CardDescription>Define the gate members must pass before they can access the server.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Verification Method</Label>
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
              </div>

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

              {verifyType === "codeword" ? (
                <div className="space-y-2">
                  <Label>Secret Code Word</Label>
                  <Input
                    value={codeWord}
                    onChange={(e) => setCodeWord(e.target.value)}
                    placeholder="Enter the secret code word"
                    data-testid="input-verify-codeword"
                  />
                  <p className="text-xs text-muted-foreground">Members must type this exact word or phrase to verify.</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="glass-card border-white/10 bg-background/40">
            <CardHeader>
              <CardTitle className="font-display text-base">Verification Message</CardTitle>
              <CardDescription>Keep the panel content polished and the call to action obvious.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
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

              <div className="space-y-2">
                <Label>Topline Message</Label>
                <Input
                  value={verifyMessage}
                  onChange={(e) => setVerifyMessage(e.target.value)}
                  placeholder="Welcome. Verify to unlock the rest of the server."
                  data-testid="input-verify-message"
                />
              </div>

              <StudioSurfaceCard
                title="Verification Panel"
                description="Design Studio owns the live verification panel. Keep message design and publishing in one surface."
                documentId={settings?.verifyStudioDocumentId}
                publication={verifyPublication}
                onCreate={handleCreateSurface}
                onOpen={() => settings?.verifyStudioDocumentId && openStudio(settings.verifyStudioDocumentId)}
                onPublish={handlePublishSurface}
                actionLabel="Create Panel"
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="glass-card border-white/10 bg-background/40">
            <CardHeader>
              <CardTitle className="font-display text-base">Result Role</CardTitle>
              <CardDescription>Route verified and unverified members clearly so there is no ambiguity after the check.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>

          <Card className="glass-card border-white/10 bg-background/40">
            <CardHeader>
              <CardTitle className="font-display text-base">Test and Publish</CardTitle>
              <CardDescription>Save policy changes, open the panel in Studio, and publish only when the gate is ready.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-[22px] border border-white/10 bg-background/30 p-4">
                <div className="flex items-start gap-3">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p className="text-sm text-muted-foreground">
                    Save the verification policy here, then publish the bound verification panel below. The old manual `/post-verify` flow is no longer the primary path.
                  </p>
                </div>
              </div>

              <div className="grid gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="justify-between rounded-2xl"
                  onClick={() => settings?.verifyStudioDocumentId ? openStudio(settings.verifyStudioDocumentId) : handleCreateSurface()}
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    {settings?.verifyStudioDocumentId ? "Open verification panel in Studio" : "Create the verification panel"}
                  </span>
                  <span className="text-xs text-white/45">{settings?.verifyStudioDocumentId ? "Design" : "Start"}</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="justify-between rounded-2xl"
                  onClick={handlePublishSurface}
                  disabled={!settings?.verifyStudioDocumentId || publishStudio.isPending}
                >
                  <span className="flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    {publishStudio.isPending ? "Publishing verification panel..." : "Publish verification panel"}
                  </span>
                  <span className="text-xs text-white/45">{verifyPublication ? "Update live" : "Go live"}</span>
                </Button>
              </div>

              <Button onClick={handleSave} disabled={updateSettings.isPending} data-testid="button-save-verify" className="w-full gap-2">
                {updateSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {updateSettings.isPending ? "Saving verification..." : "Save Verification Policy"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

