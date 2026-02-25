import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useTicketConfig, useUpsertTicketConfig, useTicketPanels, useCreateTicketPanel, useDeleteTicketPanel } from "@/hooks/use-bot";
import { Ticket, Save, Plus, Trash2, Settings, Layout, Loader2, Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface TicketsTabProps {
  serverId: number;
}

const BUTTON_STYLES: Record<number, { label: string; color: string }> = {
  1: { label: "Primary (Blue)", color: "bg-[#5865F2]" },
  2: { label: "Secondary (Gray)", color: "bg-[#4f545c]" },
  3: { label: "Success (Green)", color: "bg-[#57F287]" },
  4: { label: "Danger (Red)", color: "bg-[#ED4245]" },
};

export function TicketsTab({ serverId }: TicketsTabProps) {
  const { toast } = useToast();
  const { data: config, isLoading: configLoading } = useTicketConfig(serverId);
  const upsertConfig = useUpsertTicketConfig(serverId);
  const { data: panels, isLoading: panelsLoading } = useTicketPanels(serverId);
  const createPanel = useCreateTicketPanel(serverId);
  const deletePanel = useDeleteTicketPanel(serverId);

  const [enabled, setEnabled] = useState(false);
  const [categoryChannelId, setCategoryChannelId] = useState("");
  const [supportRoleId, setSupportRoleId] = useState("");
  const [supportRoleName, setSupportRoleName] = useState("");
  const [maxTicketsPerUser, setMaxTicketsPerUser] = useState(3);
  const [namingScheme, setNamingScheme] = useState("ticket-{number}");
  const [transcriptChannelId, setTranscriptChannelId] = useState("");
  const [dmOnClose, setDmOnClose] = useState(true);

  const [panelDialogOpen, setPanelDialogOpen] = useState(false);
  const [panelChannelId, setPanelChannelId] = useState("");
  const [panelTitle, setPanelTitle] = useState("Support Ticket");
  const [panelDescription, setPanelDescription] = useState("");
  const [panelButtonLabel, setPanelButtonLabel] = useState("Create Ticket");
  const [panelButtonEmoji, setPanelButtonEmoji] = useState("ticket");
  const [panelButtonStyle, setPanelButtonStyle] = useState(1);
  const [panelEmbedColor, setPanelEmbedColor] = useState("#5865F2");

  useEffect(() => {
    if (config) {
      setEnabled(config.enabled ?? false);
      setCategoryChannelId(config.categoryChannelId ?? "");
      setSupportRoleId(config.supportRoleId ?? "");
      setSupportRoleName(config.supportRoleName ?? "");
      setMaxTicketsPerUser(config.maxTicketsPerUser ?? 3);
      setNamingScheme(config.namingScheme ?? "ticket-{number}");
      setTranscriptChannelId(config.transcriptChannelId ?? "");
      setDmOnClose(config.dmOnClose ?? true);
    }
  }, [config]);

  const handleSaveConfig = () => {
    upsertConfig.mutate(
      {
        enabled,
        categoryChannelId: categoryChannelId || null,
        supportRoleId: supportRoleId || null,
        supportRoleName: supportRoleName || null,
        maxTicketsPerUser,
        namingScheme,
        transcriptChannelId: transcriptChannelId || null,
        dmOnClose,
      },
      {
        onSuccess: () => toast({ title: "Ticket config saved", description: "Settings updated successfully." }),
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  };

  const resetPanelForm = () => {
    setPanelChannelId("");
    setPanelTitle("Support Ticket");
    setPanelDescription("");
    setPanelButtonLabel("Create Ticket");
    setPanelButtonEmoji("ticket");
    setPanelButtonStyle(1);
    setPanelEmbedColor("#5865F2");
  };

  const handleCreatePanel = () => {
    if (!panelChannelId || !panelTitle) {
      toast({ title: "Missing fields", description: "Channel ID and title are required.", variant: "destructive" });
      return;
    }
    createPanel.mutate(
      {
        channelId: panelChannelId,
        title: panelTitle,
        description: panelDescription || null,
        buttonLabel: panelButtonLabel,
        buttonEmoji: panelButtonEmoji,
        buttonStyle: panelButtonStyle,
        embedColor: panelEmbedColor,
      },
      {
        onSuccess: () => {
          toast({ title: "Panel created", description: "Ticket panel added." });
          resetPanelForm();
          setPanelDialogOpen(false);
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  };

  const handleDeletePanel = (id: number) => {
    deletePanel.mutate(id, {
      onSuccess: () => toast({ title: "Panel deleted", description: "Ticket panel removed." }),
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  };

  if (configLoading || panelsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full bg-white/5" />
        <Skeleton className="h-64 w-full bg-white/5 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold" data-testid="text-tickets-title">Ticket System</h2>
        <p className="text-muted-foreground text-sm mt-1">Let users create private support tickets via button panels.</p>
      </div>

      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <div className="flex items-center gap-3">
            <div className="shrink-0 flex items-center justify-center w-9 h-9 rounded-md bg-primary/10 text-primary">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base font-display">Enable Ticket System</CardTitle>
              <CardDescription className="text-xs">Master toggle for ticket creation</CardDescription>
            </div>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} data-testid="switch-tickets-enabled" />
        </CardHeader>
      </Card>

      <div className={`space-y-4 transition-opacity duration-300 ${!enabled ? "opacity-50 pointer-events-none" : ""}`}>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base font-display flex items-center gap-2">
              <Settings className="w-4 h-4 text-primary" />
              Ticket Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Category Channel ID</label>
                <Input value={categoryChannelId} onChange={(e) => setCategoryChannelId(e.target.value)} placeholder="123456789012345678" className="bg-background" data-testid="input-ticket-category" />
                <p className="text-xs text-muted-foreground">Category where new tickets are created.</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Transcript Channel ID</label>
                <Input value={transcriptChannelId} onChange={(e) => setTranscriptChannelId(e.target.value)} placeholder="123456789012345678" className="bg-background" data-testid="input-ticket-transcript" />
                <p className="text-xs text-muted-foreground">Channel where transcripts are saved.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Support Role ID</label>
                <Input value={supportRoleId} onChange={(e) => setSupportRoleId(e.target.value)} placeholder="123456789012345678" className="bg-background" data-testid="input-ticket-support-role-id" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Support Role Name</label>
                <Input value={supportRoleName} onChange={(e) => setSupportRoleName(e.target.value)} placeholder="e.g. Support Team" className="bg-background" data-testid="input-ticket-support-role-name" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Max Tickets Per User</label>
                <Input type="number" min={1} max={25} value={maxTicketsPerUser} onChange={(e) => setMaxTicketsPerUser(parseInt(e.target.value) || 1)} className="bg-background" data-testid="input-ticket-max" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Naming Scheme</label>
                <Input value={namingScheme} onChange={(e) => setNamingScheme(e.target.value)} placeholder="ticket-{number}" className="bg-background" data-testid="input-ticket-naming" />
                <p className="text-xs text-muted-foreground">Use {"{number}"} and {"{user}"} as placeholders.</p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border border-white/5 bg-background/30 p-4">
              <div>
                <p className="text-sm font-medium">DM on Close</p>
                <p className="text-xs text-muted-foreground">Send the user a DM when their ticket is closed</p>
              </div>
              <Switch checked={dmOnClose} onCheckedChange={setDmOnClose} data-testid="switch-ticket-dm-close" />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h3 className="text-lg font-display font-bold">Ticket Panels</h3>
          <Dialog open={panelDialogOpen} onOpenChange={setPanelDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2" data-testid="button-add-panel">
                <Plus className="w-4 h-4" />
                Add Panel
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-display">Create Ticket Panel</DialogTitle>
                <DialogDescription>Design an embed panel that spawns tickets when users click the button.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Channel ID *</label>
                  <Input value={panelChannelId} onChange={(e) => setPanelChannelId(e.target.value)} placeholder="123456789" className="bg-background" data-testid="input-panel-channel" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Title *</label>
                    <Input value={panelTitle} onChange={(e) => setPanelTitle(e.target.value)} className="bg-background" data-testid="input-panel-title" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Embed Color</label>
                    <div className="flex gap-2">
                      <Input type="color" value={panelEmbedColor} onChange={(e) => setPanelEmbedColor(e.target.value)} className="bg-background w-12 p-1" data-testid="input-panel-color" />
                      <Input value={panelEmbedColor} onChange={(e) => setPanelEmbedColor(e.target.value)} className="bg-background flex-1" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea value={panelDescription} onChange={(e) => setPanelDescription(e.target.value)} placeholder="Click the button below to create a support ticket..." className="bg-background" data-testid="input-panel-description" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Button Label</label>
                    <Input value={panelButtonLabel} onChange={(e) => setPanelButtonLabel(e.target.value)} className="bg-background" data-testid="input-panel-button-label" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Button Emoji</label>
                    <Input value={panelButtonEmoji} onChange={(e) => setPanelButtonEmoji(e.target.value)} className="bg-background" data-testid="input-panel-button-emoji" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Button Style</label>
                    <Select value={String(panelButtonStyle)} onValueChange={(v) => setPanelButtonStyle(parseInt(v))}>
                      <SelectTrigger className="bg-background" data-testid="select-panel-button-style">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Primary</SelectItem>
                        <SelectItem value="2">Secondary</SelectItem>
                        <SelectItem value="3">Success</SelectItem>
                        <SelectItem value="4">Danger</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPanelDialogOpen(false)} data-testid="button-panel-cancel">Cancel</Button>
                <Button onClick={handleCreatePanel} disabled={createPanel.isPending} className="gap-2" data-testid="button-panel-save">
                  {createPanel.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Panel
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {(!panels || panels.length === 0) ? (
          <Card className="glass-card">
            <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
              <Layout className="w-10 h-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground" data-testid="text-panels-empty">No ticket panels yet. Create one to let users open tickets.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {panels.map((panel: any) => (
              <Card key={panel.id} className="glass-card" data-testid={`card-panel-${panel.id}`}>
                <CardContent className="flex items-center justify-between gap-4 py-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-1 h-10 rounded-full" style={{ backgroundColor: panel.embedColor || "#5865F2" }} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" data-testid={`text-panel-title-${panel.id}`}>{panel.title}</p>
                      <p className="text-xs text-muted-foreground truncate">Channel: {panel.channelId}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-xs">
                      {panel.buttonLabel || "Create Ticket"}
                    </Badge>
                    <Button size="icon" variant="ghost" onClick={() => handleDeletePanel(panel.id)} data-testid={`button-delete-panel-${panel.id}`}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base font-display flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              Panel Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-[#36393f] p-4 space-y-3" data-testid="preview-ticket-panel">
              <div className="rounded-md p-3 border-l-2" style={{ borderColor: panelEmbedColor, backgroundColor: "rgba(0,0,0,0.2)" }}>
                <p className="text-white font-medium text-sm">{panelTitle || "Support Ticket"}</p>
                {panelDescription && <p className="text-white/60 text-xs mt-1">{panelDescription}</p>}
              </div>
              <div
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-white text-xs font-medium ${BUTTON_STYLES[panelButtonStyle]?.color || "bg-[#5865F2]"}`}
              >
                {panelButtonEmoji && <span>{panelButtonEmoji}</span>}
                {panelButtonLabel || "Create Ticket"}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Button onClick={handleSaveConfig} disabled={upsertConfig.isPending} className="gap-2" data-testid="button-save-tickets">
        {upsertConfig.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {upsertConfig.isPending ? "Saving..." : "Save Configuration"}
      </Button>
    </div>
  );
}
