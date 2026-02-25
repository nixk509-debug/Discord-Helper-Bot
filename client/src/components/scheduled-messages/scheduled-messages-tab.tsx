import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useScheduledMessages, useCreateScheduledMessage, useUpdateScheduledMessage, useDeleteScheduledMessage } from "@/hooks/use-bot";
import { Clock, Plus, Trash2, Save, Loader2, Hash, Calendar, Play, Pause, Pencil } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ScheduledMessagesTabProps {
  serverId: number;
}

const CRON_PRESETS: { label: string; value: string; description: string }[] = [
  { label: "Every Hour", value: "0 * * * *", description: "At minute 0 of every hour" },
  { label: "Every 6 Hours", value: "0 */6 * * *", description: "At 00:00, 06:00, 12:00, 18:00" },
  { label: "Daily (Midnight)", value: "0 0 * * *", description: "At midnight every day" },
  { label: "Daily (Noon)", value: "0 12 * * *", description: "At noon every day" },
  { label: "Weekly (Monday)", value: "0 9 * * 1", description: "Monday at 9:00 AM" },
  { label: "Monthly (1st)", value: "0 9 1 * *", description: "1st of every month at 9:00 AM" },
  { label: "Custom", value: "custom", description: "Enter a custom cron expression" },
];

const TIMEZONES = [
  "UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "Europe/London", "Europe/Paris", "Europe/Berlin", "Asia/Tokyo", "Asia/Shanghai",
  "Australia/Sydney", "Pacific/Auckland",
];

function humanizeCron(cron: string): string {
  const parts = cron.split(" ");
  if (parts.length !== 5) return cron;
  const [min, hour, dom, mon, dow] = parts;
  const preset = CRON_PRESETS.find((p) => p.value === cron);
  if (preset) return preset.description;
  if (min === "0" && hour === "*") return "Every hour";
  if (min === "0" && hour.startsWith("*/")) return `Every ${hour.replace("*/", "")} hours`;
  if (dom === "*" && mon === "*" && dow === "*") return `Daily at ${hour}:${min.padStart(2, "0")}`;
  return cron;
}

export function ScheduledMessagesTab({ serverId }: ScheduledMessagesTabProps) {
  const { toast } = useToast();
  const { data: messages, isLoading } = useScheduledMessages(serverId);
  const createMsg = useCreateScheduledMessage(serverId);
  const updateMsg = useUpdateScheduledMessage(serverId);
  const deleteMsg = useDeleteScheduledMessage(serverId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [channelId, setChannelId] = useState("");
  const [content, setContent] = useState("");
  const [cronExpression, setCronExpression] = useState("0 0 * * *");
  const [cronPreset, setCronPreset] = useState("0 0 * * *");
  const [timezone, setTimezone] = useState("UTC");
  const [msgEnabled, setMsgEnabled] = useState(true);

  const resetForm = () => {
    setEditingId(null);
    setChannelId("");
    setContent("");
    setCronExpression("0 0 * * *");
    setCronPreset("0 0 * * *");
    setTimezone("UTC");
    setMsgEnabled(true);
  };

  const openEdit = (msg: any) => {
    setEditingId(msg.id);
    setChannelId(msg.channelId || "");
    setContent(msg.content || "");
    setCronExpression(msg.cronExpression || "0 0 * * *");
    const matchedPreset = CRON_PRESETS.find((p) => p.value === msg.cronExpression);
    setCronPreset(matchedPreset ? msg.cronExpression : "custom");
    setTimezone(msg.timezone || "UTC");
    setMsgEnabled(msg.enabled ?? true);
    setDialogOpen(true);
  };

  const handlePresetChange = (val: string) => {
    setCronPreset(val);
    if (val !== "custom") {
      setCronExpression(val);
    }
  };

  const handleSave = () => {
    if (!channelId || !cronExpression) {
      toast({ title: "Missing fields", description: "Channel ID and schedule are required.", variant: "destructive" });
      return;
    }
    if (!content) {
      toast({ title: "Missing content", description: "Message content is required.", variant: "destructive" });
      return;
    }

    const data = {
      channelId,
      content: content || null,
      cronExpression,
      timezone,
      enabled: msgEnabled,
    };

    if (editingId) {
      updateMsg.mutate(
        { id: editingId, data },
        {
          onSuccess: () => {
            toast({ title: "Updated", description: "Scheduled message updated." });
            resetForm();
            setDialogOpen(false);
          },
          onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
        }
      );
    } else {
      createMsg.mutate(data, {
        onSuccess: () => {
          toast({ title: "Created", description: "Scheduled message created." });
          resetForm();
          setDialogOpen(false);
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      });
    }
  };

  const handleDelete = (id: number) => {
    deleteMsg.mutate(id, {
      onSuccess: () => toast({ title: "Deleted", description: "Scheduled message removed." }),
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  };

  const handleToggleEnabled = (msg: any) => {
    updateMsg.mutate(
      { id: msg.id, data: { enabled: !msg.enabled } },
      {
        onSuccess: () => toast({ title: msg.enabled ? "Disabled" : "Enabled", description: `Schedule ${msg.enabled ? "paused" : "resumed"}.` }),
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full bg-white/5" />
        <Skeleton className="h-48 w-full bg-white/5 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-display font-bold" data-testid="text-scheduled-title">Scheduled Messages</h2>
          <p className="text-muted-foreground text-sm mt-1">Set up recurring or one-time messages sent automatically.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="button-add-scheduled">
              <Plus className="w-4 h-4" />
              New Schedule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display">{editingId ? "Edit Schedule" : "New Scheduled Message"}</DialogTitle>
              <DialogDescription>Configure when and where this message will be sent.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Channel ID *</label>
                <Input value={channelId} onChange={(e) => setChannelId(e.target.value)} placeholder="123456789012345678" className="bg-background" data-testid="input-sched-channel" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Message Content *</label>
                <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Your scheduled message..." className="bg-background min-h-[100px]" data-testid="input-sched-content" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Schedule Preset</label>
                  <Select value={cronPreset} onValueChange={handlePresetChange}>
                    <SelectTrigger className="bg-background" data-testid="select-sched-preset">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CRON_PRESETS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Timezone</label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger className="bg-background" data-testid="select-sched-timezone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {cronPreset === "custom" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Custom Cron Expression</label>
                  <Input value={cronExpression} onChange={(e) => setCronExpression(e.target.value)} placeholder="0 0 * * *" className="bg-background font-mono" data-testid="input-sched-cron" />
                  <p className="text-xs text-muted-foreground">Format: minute hour day-of-month month day-of-week</p>
                </div>
              )}
              <div className="flex items-center justify-between gap-4 rounded-lg border border-white/5 bg-background/30 p-3">
                <p className="text-sm font-medium">Enabled</p>
                <Switch checked={msgEnabled} onCheckedChange={setMsgEnabled} data-testid="switch-sched-enabled" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }} data-testid="button-sched-cancel">Cancel</Button>
              <Button onClick={handleSave} disabled={createMsg.isPending || updateMsg.isPending} className="gap-2" data-testid="button-sched-save">
                {(createMsg.isPending || updateMsg.isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingId ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {(!messages || messages.length === 0) ? (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <Clock className="w-12 h-12 text-muted-foreground/50" />
            <h3 className="text-lg font-display font-bold" data-testid="text-sched-empty">No Scheduled Messages</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Create your first scheduled message to automate recurring announcements, reminders, or content.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {messages.map((msg: any) => (
            <Card key={msg.id} className="glass-card" data-testid={`card-sched-${msg.id}`}>
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`shrink-0 flex items-center justify-center w-9 h-9 rounded-md ${msg.enabled ? "bg-green-500/10 text-green-500" : "bg-muted text-muted-foreground"}`}>
                    {msg.enabled ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium truncate" data-testid={`text-sched-content-${msg.id}`}>
                        {msg.content ? (msg.content.length > 60 ? msg.content.slice(0, 60) + "..." : msg.content) : "No text content"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Hash className="w-3 h-3" />
                        {msg.channelId}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {humanizeCron(msg.cronExpression)}
                      </span>
                      <Badge variant={msg.enabled ? "default" : "secondary"} className="text-xs">
                        {msg.enabled ? "Active" : "Paused"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{msg.timezone}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="icon" variant="ghost" onClick={() => handleToggleEnabled(msg)} data-testid={`button-toggle-sched-${msg.id}`}>
                    {msg.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => openEdit(msg)} data-testid={`button-edit-sched-${msg.id}`}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(msg.id)} data-testid={`button-delete-sched-${msg.id}`}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
