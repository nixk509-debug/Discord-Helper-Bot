import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useWebhooks, useCreateWebhook, useUpdateWebhook, useDeleteWebhook } from "@/hooks/use-bot";
import { Webhook, Plus, Trash2, Edit, Loader2, ExternalLink, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { ServerWebhook } from "@shared/schema";

interface WebhooksTabProps {
  serverId: number;
}

const DISCORD_EVENTS = [
  "message.create", "message.delete", "message.update",
  "member.join", "member.leave", "member.update",
  "role.create", "role.delete", "role.update",
  "channel.create", "channel.delete",
  "ban.add", "ban.remove",
  "voice.join", "voice.leave",
];

function WebhookFormDialog({
  open,
  onClose,
  onSave,
  initial,
  isSaving,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  initial?: Partial<ServerWebhook>;
  isSaving: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState(initial?.type ?? "incoming");
  const [channelId, setChannelId] = useState(initial?.channelId ?? "");
  const [webhookUrl, setWebhookUrl] = useState(initial?.webhookUrl ?? "");
  const [targetUrl, setTargetUrl] = useState(initial?.targetUrl ?? "");
  const [events, setEvents] = useState<string[]>(initial?.events ?? []);
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  const toggleEvent = (ev: string) => {
    setEvents((prev) => prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev]);
  };

  const handleSave = () => {
    onSave({ name, type, channelId: channelId || null, webhookUrl: webhookUrl || null, targetUrl: targetUrl || null, events, isActive });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">{initial?.id ? "Edit Webhook" : "New Webhook"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Webhook" data-testid="input-webhook-name" />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger data-testid="select-webhook-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="incoming">Incoming (External → Discord)</SelectItem>
                <SelectItem value="outgoing">Outgoing (Discord → External)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type === "incoming" && (
            <div className="space-y-2">
              <Label>Discord Channel ID</Label>
              <Input value={channelId} onChange={(e) => setChannelId(e.target.value)} placeholder="Channel to post to" data-testid="input-webhook-channel" />
            </div>
          )}

          {type === "outgoing" && (
            <>
              <div className="space-y-2">
                <Label>Target URL</Label>
                <Input value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} placeholder="https://your-endpoint.com/hook" data-testid="input-webhook-target-url" />
              </div>
              <div className="space-y-2">
                <Label>Trigger Events</Label>
                <div className="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto p-2 border border-border rounded-md">
                  {DISCORD_EVENTS.map((ev) => (
                    <label key={ev} className="flex items-center gap-2 text-sm cursor-pointer py-1">
                      <input
                        type="checkbox"
                        checked={events.includes(ev)}
                        onChange={() => toggleEvent(ev)}
                        data-testid={`checkbox-event-${ev}`}
                      />
                      <span className="font-mono text-xs">{ev}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="flex items-center justify-between">
            <Label>Active</Label>
            <Switch checked={isActive} onCheckedChange={setIsActive} data-testid="switch-webhook-active" />
          </div>
        </div>
        <DialogFooter className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-webhook">Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving || !name} data-testid="button-save-webhook" className="gap-2">
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Webhook
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function WebhooksTab({ serverId }: WebhooksTabProps) {
  const { toast } = useToast();
  const { data: webhooks = [], isLoading } = useWebhooks(serverId);
  const createWebhook = useCreateWebhook(serverId);
  const updateWebhook = useUpdateWebhook(serverId);
  const deleteWebhook = useDeleteWebhook(serverId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<ServerWebhook | null>(null);

  const handleSave = (data: any) => {
    if (editingWebhook) {
      updateWebhook.mutate(
        { id: editingWebhook.id, data },
        {
          onSuccess: () => {
            toast({ title: "Webhook updated" });
            setDialogOpen(false);
            setEditingWebhook(null);
          },
          onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
        }
      );
    } else {
      createWebhook.mutate(data, {
        onSuccess: () => {
          toast({ title: "Webhook created" });
          setDialogOpen(false);
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      });
    }
  };

  const handleDelete = (id: number) => {
    deleteWebhook.mutate(id, {
      onSuccess: () => toast({ title: "Webhook deleted" }),
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
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
                <Webhook className="w-5 h-5 text-primary" />
                Webhooks
              </CardTitle>
              <CardDescription>
                Incoming webhooks relay external payloads to Discord channels. Outgoing webhooks fire on Discord events to external URLs.
              </CardDescription>
            </div>
            <Button
              onClick={() => { setEditingWebhook(null); setDialogOpen(true); }}
              data-testid="button-new-webhook"
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              New Webhook
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {webhooks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Webhook className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No webhooks configured. Create one to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {webhooks.map((wh: ServerWebhook) => (
                <div
                  key={wh.id}
                  className="flex items-center gap-3 p-4 rounded-md border border-border bg-card/50"
                  data-testid={`card-webhook-${wh.id}`}
                >
                  <div className="shrink-0 text-muted-foreground">
                    {wh.type === "incoming" ? <ArrowDownToLine className="w-4 h-4" /> : <ArrowUpFromLine className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm" data-testid={`text-webhook-name-${wh.id}`}>{wh.name}</span>
                      <Badge variant={wh.isActive ? "default" : "secondary"} data-testid={`badge-webhook-status-${wh.id}`}>
                        {wh.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Badge variant="outline" data-testid={`badge-webhook-type-${wh.id}`}>{wh.type}</Badge>
                    </div>
                    {wh.events && wh.events.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1 truncate" data-testid={`text-webhook-events-${wh.id}`}>
                        Events: {wh.events.slice(0, 3).join(", ")}{wh.events.length > 3 ? ` +${wh.events.length - 3}` : ""}
                      </p>
                    )}
                    {wh.triggerCount !== null && wh.triggerCount > 0 && (
                      <p className="text-xs text-muted-foreground" data-testid={`text-webhook-count-${wh.id}`}>
                        Triggered {wh.triggerCount} times
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {wh.targetUrl && (
                      <Button size="icon" variant="ghost" asChild data-testid={`button-webhook-link-${wh.id}`}>
                        <a href={wh.targetUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => { setEditingWebhook(wh); setDialogOpen(true); }}
                      data-testid={`button-edit-webhook-${wh.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(wh.id)}
                      data-testid={`button-delete-webhook-${wh.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <WebhookFormDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingWebhook(null); }}
        onSave={handleSave}
        initial={editingWebhook ?? undefined}
        isSaving={createWebhook.isPending || updateWebhook.isPending}
      />
    </div>
  );
}
