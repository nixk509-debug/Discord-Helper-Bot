import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { RefreshCw, Trash2, Eye, Play } from "lucide-react";

interface Props {
  serverId: number;
}

type Template = {
  id: number;
  name: string;
  description: string | null;
  settings: any;
  createdAt: string;
};

type DiffEntry = {
  channelId: string;
  channelName: string;
  changes: { key: string; from: any; to: any }[];
};

export function SyncTab({ serverId }: Props) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sourceChannelId, setSourceChannelId] = useState("");
  const [applyModal, setApplyModal] = useState<{ template: Template } | null>(null);
  const [applyScope, setApplyScope] = useState("all");
  const [applyChannelIds, setApplyChannelIds] = useState("");
  const [previewEnabled, setPreviewEnabled] = useState(true);
  const [diff, setDiff] = useState<DiffEntry[] | null>(null);

  const { data: templates = [], isLoading } = useQuery<Template[]>({
    queryKey: ["/api/servers", serverId, "sync/templates"],
    queryFn: () => fetch(`/api/servers/${serverId}/sync/templates`).then(r => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/servers/${serverId}/sync/templates`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/servers", serverId, "sync/templates"] });
      setName(""); setDescription(""); setSourceChannelId("");
      toast({ title: "Template saved" });
    },
    onError: () => toast({ title: "Failed to save template", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/servers/${serverId}/sync/templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/servers", serverId, "sync/templates"] });
      toast({ title: "Template deleted" });
    },
  });

  const applyMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/servers/${serverId}/sync/apply`, data),
    onSuccess: (result: any) => {
      if (result.diff) {
        setDiff(result.diff);
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/servers", serverId] });
        toast({ title: `Template applied to ${result.channels} channels` });
        setApplyModal(null);
        setDiff(null);
      }
    },
    onError: () => toast({ title: "Apply failed", variant: "destructive" }),
  });

  const handleApply = (preview: boolean) => {
    if (!applyModal) return;
    const channelIds = applyScope === "channels" ? applyChannelIds.split(",").map(s => s.trim()).filter(Boolean) : undefined;
    applyMutation.mutate({
      templateId: applyModal.template.id,
      scope: applyScope,
      channelIds,
      preview,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold gradient-brand" data-testid="text-sync-heading">Channel Sync</h2>
        <p className="text-muted-foreground text-sm mt-1">Save channel settings as templates and apply them in bulk across your server.</p>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-display">Create Template</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Staff Channels" data-testid="input-template-name" />
            </div>
            <div className="space-y-2">
              <Label>Source Channel ID</Label>
              <Input value={sourceChannelId} onChange={e => setSourceChannelId(e.target.value)} placeholder="Copy settings from this channel" data-testid="input-source-channel" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What this template is for…" data-testid="input-template-description" />
          </div>
          <Button
            onClick={() => createMutation.mutate({ name, description: description || undefined, settings: { sourceChannelId } })}
            disabled={!name || createMutation.isPending}
            className="gradient-brand text-white"
            data-testid="button-save-template"
          >
            {createMutation.isPending ? "Saving…" : "Save Template"}
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-display">Templates ({templates.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-14 rounded-md bg-white/5 animate-pulse" />)}</div>
          ) : templates.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">No templates yet. Create one above.</p>
          ) : (
            <div className="space-y-2">
              {templates.map(t => (
                <div key={t.id} className="flex items-center justify-between rounded-lg border border-white/10 p-3" data-testid={`row-template-${t.id}`}>
                  <div>
                    <p className="font-medium text-sm">{t.name}</p>
                    {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "—"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => { setApplyModal({ template: t }); setDiff(null); }} data-testid={`button-apply-${t.id}`}>
                      <Play className="w-3 h-3" /> Apply
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="text-red-400" data-testid={`button-delete-template-${t.id}`}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Template?</AlertDialogTitle>
                          <AlertDialogDescription>Template "{t.name}" will be permanently deleted.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMutation.mutate(t.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!applyModal} onOpenChange={v => { if (!v) { setApplyModal(null); setDiff(null); } }}>
        <DialogContent className="glass-panel max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Apply Template: {applyModal?.template.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Scope</Label>
              <Select value={applyScope} onValueChange={setApplyScope}>
                <SelectTrigger data-testid="select-apply-scope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Channels</SelectItem>
                  <SelectItem value="channels">Specific Channels</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {applyScope === "channels" && (
              <div className="space-y-2">
                <Label>Channel IDs (comma-separated)</Label>
                <Input value={applyChannelIds} onChange={e => setApplyChannelIds(e.target.value)} placeholder="Channel IDs" data-testid="input-apply-channel-ids" />
              </div>
            )}

            {diff && (
              <div className="rounded-lg border border-white/10 p-3 space-y-2 max-h-64 overflow-y-auto">
                <p className="text-sm font-medium">{diff.length === 0 ? "No changes needed — channels already match." : `${diff.length} channel(s) will be updated:`}</p>
                {diff.map(d => (
                  <div key={d.channelId} className="rounded-md bg-black/20 p-2 text-xs space-y-1" data-testid={`diff-channel-${d.channelId}`}>
                    <p className="font-medium">{d.channelName}</p>
                    {d.changes.map(c => (
                      <div key={c.key} className="flex gap-2">
                        <span className="text-muted-foreground">{c.key}:</span>
                        <span className="text-red-400 line-through">{JSON.stringify(c.from)}</span>
                        <span className="text-green-400">{JSON.stringify(c.to)}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => handleApply(true)} disabled={applyMutation.isPending} data-testid="button-preview-apply">
              <Eye className="w-4 h-4 mr-1" /> Preview
            </Button>
            {diff !== null && diff.length > 0 && (
              <Button onClick={() => handleApply(false)} disabled={applyMutation.isPending} className="gradient-brand text-white" data-testid="button-confirm-apply">
                <RefreshCw className="w-4 h-4 mr-1" /> Confirm Apply ({diff.length} channels)
              </Button>
            )}
            {diff !== null && diff.length === 0 && (
              <Button variant="outline" disabled>No changes needed</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
