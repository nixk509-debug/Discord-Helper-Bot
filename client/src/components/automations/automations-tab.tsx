import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { FlowBuilder } from "./flow-builder";
import {
  Plus, Zap, Play, Trash2, Edit, ChevronRight,
  Clock, TrendingUp, GitBranch, ToggleLeft, ToggleRight
} from "lucide-react";
import type { Automation, AutomationFlow } from "@shared/schema";

const TRIGGER_LABELS: Record<string, string> = {
  "trigger.message": "Message Matches",
  "trigger.memberJoin": "Member Joins",
  "trigger.memberLeave": "Member Leaves",
  "trigger.reactionAdd": "Reaction Added",
  "trigger.roleAssigned": "Role Assigned",
  "trigger.levelUp": "Level Up",
  "trigger.timeScheduled": "Scheduled",
  "trigger.commandUsed": "Command Used",
};

interface AutomationsTabProps {
  serverId: number;
}

export function AutomationsTab({ serverId }: AutomationsTabProps) {
  const { toast } = useToast();
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newTriggerType, setNewTriggerType] = useState("trigger.memberJoin");

  const { data: automations = [], isLoading } = useQuery<Automation[]>({
    queryKey: ["/api/servers", serverId, "automations"],
    queryFn: () => fetch(`/api/servers/${serverId}/automations`).then((r) => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description: string; triggerType: string }) =>
      apiRequest("POST", `/api/servers/${serverId}/automations`, {
        ...data,
        isEnabled: true,
        flow: { nodes: [], edges: [] },
        runCount: 0,
      }),
    onSuccess: async (res) => {
      const created: Automation = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/servers", serverId, "automations"] });
      setCreatingNew(false);
      setNewName("");
      setNewDescription("");
      setEditingAutomation(created);
      toast({ title: "Automation created", description: "Open the flow builder to design your automation." });
    },
    onError: () => toast({ title: "Error", description: "Failed to create automation.", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Automation> }) =>
      apiRequest("PUT", `/api/servers/${serverId}/automations/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/servers", serverId, "automations"] });
      toast({ title: "Automation saved" });
    },
    onError: () => toast({ title: "Error", description: "Failed to save automation.", variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isEnabled }: { id: number; isEnabled: boolean }) =>
      apiRequest("PATCH", `/api/servers/${serverId}/automations/${id}/toggle`, { isEnabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/servers", serverId, "automations"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/servers/${serverId}/automations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/servers", serverId, "automations"] });
      toast({ title: "Automation deleted" });
    },
  });

  const handleSaveFlow = (flow: AutomationFlow) => {
    if (!editingAutomation) return;
    updateMutation.mutate(
      {
        id: editingAutomation.id,
        data: {
          ...editingAutomation,
          flow,
          updatedAt: new Date(),
        },
      },
      {
        onSuccess: async (res) => {
          const updated: Automation = await res.json();
          setEditingAutomation(updated);
        },
      }
    );
  };

  if (editingAutomation) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap gap-y-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditingAutomation(null)}
            data-testid="button-back-to-list"
            className="gap-1.5"
          >
            <ChevronRight className="w-3.5 h-3.5 rotate-180" />
            Back to List
          </Button>
          <div>
            <h3 className="font-display font-bold text-lg" data-testid="text-automation-name">{editingAutomation.name}</h3>
            {editingAutomation.description && (
              <p className="text-sm text-muted-foreground">{editingAutomation.description}</p>
            )}
          </div>
          <Badge
            variant="outline"
            className="ml-auto"
            data-testid="status-automation-enabled"
          >
            {editingAutomation.isEnabled ? "Enabled" : "Disabled"}
          </Badge>
        </div>
        <div style={{ height: "calc(100vh - 16rem)" }}>
          <FlowBuilder
            flow={(editingAutomation.flow as AutomationFlow) ?? { nodes: [], edges: [] }}
            onChange={(flow) => setEditingAutomation({ ...editingAutomation, flow: flow as any })}
            onSave={() => handleSaveFlow((editingAutomation.flow as AutomationFlow) ?? { nodes: [], edges: [] })}
            isSaving={updateMutation.isPending}
            isEnabled={editingAutomation.isEnabled ?? true}
            onToggle={() =>
              toggleMutation.mutate(
                { id: editingAutomation.id, isEnabled: !editingAutomation.isEnabled },
                {
                  onSuccess: async (res) => {
                    const updated: Automation = await res.json();
                    setEditingAutomation(updated);
                  },
                }
              )
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-display font-bold" data-testid="text-automations-heading">Automation Flows</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Build visual node-based automations for your Discord server
          </p>
        </div>
        <Button onClick={() => setCreatingNew(true)} data-testid="button-create-automation" className="gap-2">
          <Plus className="w-4 h-4" />
          New Automation
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl bg-white/5" />
          ))}
        </div>
      ) : automations.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <GitBranch className="w-12 h-12 text-muted-foreground/30" />
            <div className="text-center">
              <h3 className="font-display font-bold" data-testid="text-no-automations">No automations yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Create your first automation flow. Connect trigger, condition, and action nodes visually.
              </p>
            </div>
            <Button onClick={() => setCreatingNew(true)} data-testid="button-create-first-automation" className="gap-2 gradient-brand border-none">
              <Plus className="w-4 h-4" />
              Create your first automation
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {automations.map((auto) => {
            const flow = (auto.flow as AutomationFlow) ?? { nodes: [], edges: [] };
            const triggerNode = flow.nodes.find((n) => n.type.startsWith("trigger."));
            const nodeCount = flow.nodes.length;
            const edgeCount = flow.edges.length;

            return (
              <Card
                key={auto.id}
                className="glass-card hover-elevate cursor-pointer"
                onClick={() => setEditingAutomation(auto)}
                data-testid={`card-automation-${auto.id}`}
              >
                <CardContent className="flex items-center gap-4 p-4 flex-wrap gap-y-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <Zap className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-display font-bold truncate" data-testid={`text-automation-name-${auto.id}`}>{auto.name}</h4>
                      <Badge
                        variant="outline"
                        className={auto.isEnabled ? "border-green-500/40 text-green-400" : "border-muted"}
                        data-testid={`status-auto-enabled-${auto.id}`}
                      >
                        {auto.isEnabled ? "Active" : "Inactive"}
                      </Badge>
                      {triggerNode && (
                        <Badge variant="outline" className="border-blue-500/40 text-blue-400 text-xs" data-testid={`badge-trigger-${auto.id}`}>
                          {TRIGGER_LABELS[triggerNode.type] ?? triggerNode.type}
                        </Badge>
                      )}
                    </div>
                    {auto.description && (
                      <p className="text-sm text-muted-foreground mt-0.5 truncate" data-testid={`text-auto-desc-${auto.id}`}>{auto.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap gap-y-1">
                      <span className="flex items-center gap-1" data-testid={`text-node-count-${auto.id}`}>
                        <GitBranch className="w-3 h-3" />
                        {nodeCount} nodes, {edgeCount} connections
                      </span>
                      <span className="flex items-center gap-1" data-testid={`text-run-count-${auto.id}`}>
                        <TrendingUp className="w-3 h-3" />
                        {auto.runCount ?? 0} runs
                      </span>
                      {auto.lastRunAt && (
                        <span className="flex items-center gap-1" data-testid={`text-last-run-${auto.id}`}>
                          <Clock className="w-3 h-3" />
                          Last run {new Date(auto.lastRunAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMutation.mutate({ id: auto.id, isEnabled: !auto.isEnabled });
                      }}
                      data-testid={`button-toggle-auto-${auto.id}`}
                    >
                      {auto.isEnabled ? (
                        <ToggleRight className="w-4 h-4 text-green-400" />
                      ) : (
                        <ToggleLeft className="w-4 h-4 text-muted-foreground" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingAutomation(auto);
                      }}
                      data-testid={`button-edit-auto-${auto.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMutation.mutate(auto.id);
                      }}
                      data-testid={`button-delete-auto-${auto.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={creatingNew} onOpenChange={setCreatingNew}>
        <DialogContent className="glass-panel">
          <DialogHeader>
            <DialogTitle className="font-display">Create New Automation</DialogTitle>
            <DialogDescription>
              Give your automation a name and choose a trigger to start building.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Automation Name</Label>
              <Input
                placeholder="e.g. Welcome DM on Join"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                data-testid="input-new-automation-name"
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                placeholder="What does this automation do?"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                data-testid="input-new-automation-desc"
                className="bg-background resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label>Trigger Type</Label>
              <Select value={newTriggerType} onValueChange={setNewTriggerType}>
                <SelectTrigger className="bg-background" data-testid="select-trigger-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TRIGGER_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setCreatingNew(false)}
                data-testid="button-cancel-create"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => createMutation.mutate({ name: newName, description: newDescription, triggerType: newTriggerType })}
                disabled={!newName.trim() || createMutation.isPending}
                data-testid="button-confirm-create"
                className="flex-1 gradient-brand border-none"
              >
                {createMutation.isPending ? "Creating..." : "Create & Edit"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
