import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useGiveaways, useCreateGiveaway, useUpdateGiveaway, useDeleteGiveaway } from "@/hooks/use-bot";
import { Gift, Plus, Trash2, Edit, Loader2, RotateCcw, Users, Trophy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Giveaway } from "@shared/schema";

interface GiveawaysTabProps {
  serverId: number;
}

function GiveawayFormDialog({
  open,
  onClose,
  onSave,
  initial,
  isSaving,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  initial?: Partial<Giveaway>;
  isSaving: boolean;
}) {
  const [prize, setPrize] = useState(initial?.prize ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [channelId, setChannelId] = useState(initial?.channelId ?? "");
  const [winnersCount, setWinnersCount] = useState(initial?.winnersCount ?? 1);
  const [endsAt, setEndsAt] = useState(
    initial?.endsAt ? new Date(initial.endsAt).toISOString().slice(0, 16) : ""
  );
  const [startsAt, setStartsAt] = useState(
    initial?.startsAt ? new Date(initial.startsAt).toISOString().slice(0, 16) : ""
  );
  const [minLevel, setMinLevel] = useState(initial?.requirements?.minLevel ?? 0);
  const [requiredRoleId, setRequiredRoleId] = useState(initial?.requirements?.requiredRoleId ?? "");
  const [minAccountAgeDays, setMinAccountAgeDays] = useState(initial?.requirements?.minAccountAgeDays ?? 0);
  const [minEconomyBalance, setMinEconomyBalance] = useState(initial?.requirements?.minEconomyBalance ?? 0);

  const handleSave = () => {
    const requirements: any = {};
    if (minLevel > 0) requirements.minLevel = minLevel;
    if (requiredRoleId.trim()) requirements.requiredRoleId = requiredRoleId.trim();
    if (minAccountAgeDays > 0) requirements.minAccountAgeDays = minAccountAgeDays;
    if (minEconomyBalance > 0) requirements.minEconomyBalance = minEconomyBalance;

    onSave({
      prize,
      description: description || null,
      channelId,
      winnersCount,
      requirements,
      endsAt: endsAt ? new Date(endsAt).toISOString() : null,
      startsAt: startsAt ? new Date(startsAt).toISOString() : null,
      isActive: true,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">{initial?.id ? "Edit Giveaway" : "Create Giveaway"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Prize</Label>
            <Input value={prize} onChange={(e) => setPrize(e.target.value)} placeholder="Discord Nitro" data-testid="input-giveaway-prize" />
          </div>

          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the prize..."
              data-testid="input-giveaway-description"
            />
          </div>

          <div className="space-y-2">
            <Label>Channel ID</Label>
            <Input value={channelId} onChange={(e) => setChannelId(e.target.value)} placeholder="Channel to post giveaway" data-testid="input-giveaway-channel" />
          </div>

          <div className="space-y-2">
            <Label>Number of Winners</Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={winnersCount}
              onChange={(e) => setWinnersCount(parseInt(e.target.value) || 1)}
              data-testid="input-giveaway-winners"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Time (optional)</Label>
              <Input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                data-testid="input-giveaway-starts-at"
              />
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                data-testid="input-giveaway-ends-at"
              />
            </div>
          </div>

          <div className="space-y-3 p-3 rounded-md border border-border">
            <p className="font-medium text-sm">Entry Requirements</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Minimum Level</Label>
                <Input
                  type="number"
                  min={0}
                  value={minLevel}
                  onChange={(e) => setMinLevel(parseInt(e.target.value) || 0)}
                  data-testid="input-giveaway-min-level"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Min Account Age (days)</Label>
                <Input
                  type="number"
                  min={0}
                  value={minAccountAgeDays}
                  onChange={(e) => setMinAccountAgeDays(parseInt(e.target.value) || 0)}
                  data-testid="input-giveaway-min-age"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Required Role ID</Label>
                <Input
                  value={requiredRoleId}
                  onChange={(e) => setRequiredRoleId(e.target.value)}
                  placeholder="Role ID"
                  data-testid="input-giveaway-required-role"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Min Economy Balance</Label>
                <Input
                  type="number"
                  min={0}
                  value={minEconomyBalance}
                  onChange={(e) => setMinEconomyBalance(parseInt(e.target.value) || 0)}
                  data-testid="input-giveaway-min-balance"
                />
              </div>
            </div>
          </div>
        </div>
        <DialogFooter className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-giveaway">Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !prize.trim() || !channelId.trim()}
            data-testid="button-save-giveaway"
            className="gap-2"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            {initial?.id ? "Update Giveaway" : "Create Giveaway"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function GiveawaysTab({ serverId }: GiveawaysTabProps) {
  const { toast } = useToast();
  const { data: giveaways = [], isLoading } = useGiveaways(serverId);
  const createGiveaway = useCreateGiveaway(serverId);
  const updateGiveaway = useUpdateGiveaway(serverId);
  const deleteGiveaway = useDeleteGiveaway(serverId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGiveaway, setEditingGiveaway] = useState<Giveaway | null>(null);

  const handleSave = (data: any) => {
    if (editingGiveaway) {
      updateGiveaway.mutate(
        { id: editingGiveaway.id, data },
        {
          onSuccess: () => {
            toast({ title: "Giveaway updated" });
            setDialogOpen(false);
            setEditingGiveaway(null);
          },
          onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
        }
      );
    } else {
      createGiveaway.mutate(data, {
        onSuccess: () => {
          toast({ title: "Giveaway created" });
          setDialogOpen(false);
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      });
    }
  };

  const handleReroll = (ga: Giveaway) => {
    fetch(`/api/servers/${serverId}/giveaways/${ga.id}/reroll`, { method: "POST", credentials: "include" })
      .then(() => toast({ title: "Giveaway re-rolled" }))
      .catch(() => toast({ title: "Error", variant: "destructive" }));
  };

  const handleEnd = (ga: Giveaway) => {
    updateGiveaway.mutate(
      { id: ga.id, data: { isActive: false } },
      {
        onSuccess: () => toast({ title: "Giveaway ended" }),
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  };

  const handleDelete = (id: number) => {
    deleteGiveaway.mutate(id, {
      onSuccess: () => toast({ title: "Giveaway deleted" }),
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
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
                <Gift className="w-5 h-5 text-primary" />
                Giveaways
              </CardTitle>
              <CardDescription>
                Create giveaways with entry requirements, scheduled start times, and automatic winner selection.
              </CardDescription>
            </div>
            <Button
              onClick={() => { setEditingGiveaway(null); setDialogOpen(true); }}
              data-testid="button-new-giveaway"
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              New Giveaway
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {giveaways.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Gift className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No giveaways created yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {giveaways.map((ga: Giveaway) => {
                const isExpired = ga.endsAt && new Date(ga.endsAt) < new Date();
                const isScheduled = ga.startsAt && new Date(ga.startsAt) > new Date();
                const status = !ga.isActive ? "ended" : isExpired ? "expired" : isScheduled ? "scheduled" : "active";
                return (
                  <div key={ga.id} className="p-4 rounded-md border border-border bg-card/50 space-y-3" data-testid={`card-giveaway-${ga.id}`}>
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold" data-testid={`text-giveaway-prize-${ga.id}`}>{ga.prize}</span>
                          <Badge
                            variant={status === "active" ? "default" : "secondary"}
                            data-testid={`badge-giveaway-status-${ga.id}`}
                          >
                            {status === "active" ? "Live" : status === "scheduled" ? "Scheduled" : status === "expired" ? "Expired" : "Ended"}
                          </Badge>
                        </div>
                        {ga.description && (
                          <p className="text-sm text-muted-foreground mt-1 truncate" data-testid={`text-giveaway-desc-${ga.id}`}>{ga.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 flex-wrap">
                          <span className="flex items-center gap-1 text-xs text-muted-foreground" data-testid={`text-giveaway-winners-${ga.id}`}>
                            <Trophy className="w-3 h-3" />
                            {ga.winnersCount} winner{ga.winnersCount !== 1 ? "s" : ""}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground" data-testid={`text-giveaway-entries-${ga.id}`}>
                            <Users className="w-3 h-3" />
                            {ga.entryCount} entries
                          </span>
                          {ga.endsAt && (
                            <span className="text-xs text-muted-foreground" data-testid={`text-giveaway-ends-${ga.id}`}>
                              Ends: {new Date(ga.endsAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        {ga.winnerIds && ga.winnerIds.length > 0 && (
                          <p className="text-xs text-primary mt-1" data-testid={`text-giveaway-winner-ids-${ga.id}`}>
                            Winners: {ga.winnerIds.join(", ")}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {(status === "ended" || status === "expired") && (
                          <Button size="sm" variant="outline" onClick={() => handleReroll(ga)} data-testid={`button-reroll-giveaway-${ga.id}`}>
                            <RotateCcw className="w-3 h-3 mr-1" />
                            Re-roll
                          </Button>
                        )}
                        {status === "active" && (
                          <Button size="sm" variant="outline" onClick={() => handleEnd(ga)} data-testid={`button-end-giveaway-${ga.id}`}>
                            End
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" onClick={() => { setEditingGiveaway(ga); setDialogOpen(true); }} data-testid={`button-edit-giveaway-${ga.id}`}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(ga.id)} data-testid={`button-delete-giveaway-${ga.id}`}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <GiveawayFormDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingGiveaway(null); }}
        onSave={handleSave}
        initial={editingGiveaway ?? undefined}
        isSaving={createGiveaway.isPending || updateGiveaway.isPending}
      />
    </div>
  );
}
