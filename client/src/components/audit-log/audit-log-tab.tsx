import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ChevronDown, ChevronRight, RotateCcw, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  serverId: number;
}

function DiffRow({ entry }: { entry: any }) {
  const [expanded, setExpanded] = useState(false);
  const before = entry.beforeData ?? {};
  const after = entry.afterData ?? {};
  const changedKeys = (entry.changedKeys as string[]) ?? [];

  return (
    <div className="rounded-lg border border-white/10 p-3 space-y-2" data-testid={`row-audit-${entry.id}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-mono">{entry.moduleId}</Badge>
          <span className="text-xs text-muted-foreground">by <code className="font-mono">{entry.actorId?.slice(0, 8)}…</code></span>
          <span className="text-xs text-muted-foreground">{entry.createdAt ? new Date(entry.createdAt).toLocaleString() : "—"}</span>
        </div>
        <button onClick={() => setExpanded(v => !v)} className="text-muted-foreground hover:text-foreground transition-colors" data-testid={`button-expand-${entry.id}`}>
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>
      <div className="flex flex-wrap gap-1">
        {changedKeys.slice(0, 6).map(k => <Badge key={k} className="text-xs bg-primary/10 text-primary border-primary/20">{k}</Badge>)}
        {changedKeys.length > 6 && <Badge variant="outline" className="text-xs">+{changedKeys.length - 6} more</Badge>}
      </div>
      {expanded && changedKeys.length > 0 && (
        <div className="rounded-md bg-black/30 p-3 text-xs font-mono space-y-1">
          {changedKeys.map(k => (
            <div key={k} className="grid grid-cols-[1fr,1fr,1fr] gap-2">
              <span className="text-muted-foreground">{k}</span>
              <span className="text-red-400 line-through truncate">{JSON.stringify(before[k])}</span>
              <span className="text-green-400 truncate">{JSON.stringify(after[k])}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AuditLogTab({ serverId }: Props) {
  const { toast } = useToast();
  const [moduleFilter, setModuleFilter] = useState("all");
  const [actorSearch, setActorSearch] = useState("");

  const { data: entries = [], isLoading: entriesLoading } = useQuery<any[]>({
    queryKey: ["/api/servers", serverId, "config/audit", moduleFilter, actorSearch],
    queryFn: () => {
      const params = new URLSearchParams({ limit: "50" });
      if (moduleFilter && moduleFilter !== "all") params.set("moduleId", moduleFilter);
      if (actorSearch) params.set("actorId", actorSearch);
      return fetch(`/api/servers/${serverId}/config/audit?${params}`).then(r => r.json());
    },
  });

  const { data: snapshots = [], isLoading: snapshotsLoading } = useQuery<any[]>({
    queryKey: ["/api/servers", serverId, "config/snapshots"],
    queryFn: () => fetch(`/api/servers/${serverId}/config/snapshots`).then(r => r.json()),
  });

  const rollbackMutation = useMutation({
    mutationFn: (snapshotId: number) => apiRequest("POST", `/api/servers/${serverId}/config/rollback/${snapshotId}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/servers", serverId] });
      toast({ title: "Settings rolled back successfully" });
    },
    onError: () => toast({ title: "Rollback failed", variant: "destructive" }),
  });

  const moduleIds = ["all", ...Array.from(new Set(entries.map((e: any) => e.moduleId)))];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold gradient-brand" data-testid="text-audit-heading">Audit History</h2>
        <p className="text-muted-foreground text-sm mt-1">Track all configuration changes and roll back to previous snapshots.</p>
      </div>

      <Tabs defaultValue="changes">
        <TabsList className="glass-card">
          <TabsTrigger value="changes" data-testid="tab-changes">Config Changes</TabsTrigger>
          <TabsTrigger value="snapshots" data-testid="tab-snapshots">Snapshots</TabsTrigger>
        </TabsList>

        <TabsContent value="changes" className="mt-4 space-y-4">
          <Card className="glass-card">
            <CardContent className="pt-4">
              <div className="flex gap-3">
                <div className="space-y-1 flex-1">
                  <Label className="text-xs">Module Filter</Label>
                  <Select value={moduleFilter} onValueChange={setModuleFilter}>
                    <SelectTrigger data-testid="select-module-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {moduleIds.map(m => <SelectItem key={m} value={m}>{m === "all" ? "All Modules" : m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 flex-1">
                  <Label className="text-xs">Actor ID Search</Label>
                  <Input value={actorSearch} onChange={e => setActorSearch(e.target.value)} placeholder="Discord user ID" data-testid="input-actor-search" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-4">
              {entriesLoading ? (
                <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-md bg-white/5 animate-pulse" />)}</div>
              ) : entries.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-muted-foreground">No audit entries yet. Changes you make will appear here.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {entries.map((entry: any) => <DiffRow key={entry.id} entry={entry} />)}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="snapshots" className="mt-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="font-display text-base">Config Snapshots</CardTitle>
            </CardHeader>
            <CardContent>
              {snapshotsLoading ? (
                <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-14 rounded-md bg-white/5 animate-pulse" />)}</div>
              ) : snapshots.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">No snapshots yet. Snapshots are created automatically when settings are saved.</p>
              ) : (
                <div className="space-y-2">
                  {snapshots.map((snap: any) => (
                    <div key={snap.id} className="flex items-center justify-between rounded-lg border border-white/10 p-3" data-testid={`row-snapshot-${snap.id}`}>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="font-mono text-xs">v{snap.version}</Badge>
                        <Badge className="text-xs bg-primary/10 text-primary border-primary/20">{snap.moduleId}</Badge>
                        <span className="text-xs text-muted-foreground">{snap.createdAt ? new Date(snap.createdAt).toLocaleString() : "—"}</span>
                        <span className="text-xs text-muted-foreground">by <code>{snap.actorId?.slice(0, 8)}…</code></span>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline" className="gap-1 text-xs" data-testid={`button-rollback-${snap.id}`}>
                            <RotateCcw className="w-3 h-3" /> Rollback
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Rollback to v{snap.version}?</AlertDialogTitle>
                            <AlertDialogDescription>This will restore your {snap.moduleId} settings to this snapshot from {snap.createdAt ? new Date(snap.createdAt).toLocaleString() : "unknown time"}. Current settings will be overwritten.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => rollbackMutation.mutate(snap.id)} className="bg-primary text-white">
                              Rollback
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
