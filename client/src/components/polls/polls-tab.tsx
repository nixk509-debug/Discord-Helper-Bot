import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { usePolls, useCreatePoll, useUpdatePoll, useDeletePoll } from "@/hooks/use-bot";
import { BarChart3, Plus, Trash2, Edit, Loader2, X, CheckCircle, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Poll, PollOption } from "@shared/schema";

interface PollsTabProps {
  serverId: number;
}

function PollFormDialog({
  open,
  onClose,
  onSave,
  initial,
  isSaving,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  initial?: Partial<Poll>;
  isSaving: boolean;
}) {
  const [question, setQuestion] = useState(initial?.question ?? "");
  const [channelId, setChannelId] = useState(initial?.channelId ?? "");
  const [allowMultiple, setAllowMultiple] = useState(initial?.allowMultiple ?? false);
  const [anonymous, setAnonymous] = useState(initial?.anonymous ?? false);
  const [options, setOptions] = useState<string[]>(
    initial?.options?.map((o: PollOption) => o.text) ?? ["", ""]
  );
  const [endsAt, setEndsAt] = useState(
    initial?.endsAt ? new Date(initial.endsAt).toISOString().slice(0, 16) : ""
  );

  const addOption = () => {
    if (options.length < 10) setOptions([...options, ""]);
  };

  const removeOption = (i: number) => {
    if (options.length > 2) setOptions(options.filter((_, idx) => idx !== i));
  };

  const updateOption = (i: number, val: string) => {
    const next = [...options];
    next[i] = val;
    setOptions(next);
  };

  const handleSave = () => {
    const pollOptions: PollOption[] = options
      .filter((o) => o.trim())
      .map((o) => ({ text: o.trim(), voteCount: 0 }));
    onSave({
      question,
      channelId,
      allowMultiple,
      anonymous,
      options: pollOptions,
      endsAt: endsAt ? new Date(endsAt).toISOString() : null,
      isActive: true,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">{initial?.id ? "Edit Poll" : "Create Poll"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Question</Label>
            <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="What's your favorite color?" data-testid="input-poll-question" />
          </div>

          <div className="space-y-2">
            <Label>Channel ID</Label>
            <Input value={channelId} onChange={(e) => setChannelId(e.target.value)} placeholder="Channel to post poll" data-testid="input-poll-channel" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Options ({options.length}/10)</Label>
              <Button variant="outline" size="sm" onClick={addOption} disabled={options.length >= 10} data-testid="button-add-poll-option">
                <Plus className="w-3 h-3 mr-1" />
                Add Option
              </Button>
            </div>
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={opt}
                    onChange={(e) => updateOption(i, e.target.value)}
                    placeholder={`Option ${i + 1}`}
                    data-testid={`input-poll-option-${i}`}
                  />
                  {options.length > 2 && (
                    <Button size="icon" variant="ghost" onClick={() => removeOption(i)} data-testid={`button-remove-option-${i}`}>
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>End Time (optional)</Label>
            <Input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              data-testid="input-poll-ends-at"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Allow Multiple Votes</p>
              <p className="text-xs text-muted-foreground">Members can vote for more than one option.</p>
            </div>
            <Switch checked={allowMultiple} onCheckedChange={setAllowMultiple} data-testid="switch-poll-multiple" />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Anonymous Voting</p>
              <p className="text-xs text-muted-foreground">Don't reveal who voted for what.</p>
            </div>
            <Switch checked={anonymous} onCheckedChange={setAnonymous} data-testid="switch-poll-anonymous" />
          </div>
        </div>
        <DialogFooter className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-poll">Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !question.trim() || !channelId.trim() || options.filter((o) => o.trim()).length < 2}
            data-testid="button-save-poll"
            className="gap-2"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            {initial?.id ? "Update Poll" : "Create Poll"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PollsTab({ serverId }: PollsTabProps) {
  const { toast } = useToast();
  const { data: polls = [], isLoading } = usePolls(serverId);
  const createPoll = useCreatePoll(serverId);
  const updatePoll = useUpdatePoll(serverId);
  const deletePoll = useDeletePoll(serverId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPoll, setEditingPoll] = useState<Poll | null>(null);

  const handleSave = (data: any) => {
    if (editingPoll) {
      updatePoll.mutate(
        { id: editingPoll.id, data },
        {
          onSuccess: () => {
            toast({ title: "Poll updated" });
            setDialogOpen(false);
            setEditingPoll(null);
          },
          onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
        }
      );
    } else {
      createPoll.mutate(data, {
        onSuccess: () => {
          toast({ title: "Poll created" });
          setDialogOpen(false);
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      });
    }
  };

  const handleClose = (poll: Poll) => {
    updatePoll.mutate(
      { id: poll.id, data: { isActive: false } },
      {
        onSuccess: () => toast({ title: "Poll closed" }),
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  };

  const handleDelete = (id: number) => {
    deletePoll.mutate(id, {
      onSuccess: () => toast({ title: "Poll deleted" }),
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
                <BarChart3 className="w-5 h-5 text-primary" />
                Polls
              </CardTitle>
              <CardDescription>Create and manage interactive polls in your server.</CardDescription>
            </div>
            <Button
              onClick={() => { setEditingPoll(null); setDialogOpen(true); }}
              data-testid="button-new-poll"
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              New Poll
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {polls.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No polls created yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {polls.map((poll: Poll) => {
                const totalVotes = poll.options?.reduce((sum: number, o: PollOption) => sum + (o.voteCount || 0), 0) || 0;
                const isExpired = poll.endsAt && new Date(poll.endsAt) < new Date();
                return (
                  <div key={poll.id} className="p-4 rounded-md border border-border bg-card/50 space-y-3" data-testid={`card-poll-${poll.id}`}>
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium" data-testid={`text-poll-question-${poll.id}`}>{poll.question}</span>
                          <Badge variant={poll.isActive && !isExpired ? "default" : "secondary"} data-testid={`badge-poll-status-${poll.id}`}>
                            {!poll.isActive ? "Closed" : isExpired ? "Expired" : "Active"}
                          </Badge>
                          {poll.anonymous && <Badge variant="outline">Anonymous</Badge>}
                          {poll.allowMultiple && <Badge variant="outline">Multi-vote</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1" data-testid={`text-poll-votes-${poll.id}`}>
                          {totalVotes} total votes
                          {poll.endsAt && <span className="ml-2"><Clock className="w-3 h-3 inline mr-1" />{new Date(poll.endsAt).toLocaleDateString()}</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {poll.isActive && !isExpired && (
                          <Button size="sm" variant="outline" onClick={() => handleClose(poll)} data-testid={`button-close-poll-${poll.id}`}>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Close
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" onClick={() => { setEditingPoll(poll); setDialogOpen(true); }} data-testid={`button-edit-poll-${poll.id}`}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(poll.id)} data-testid={`button-delete-poll-${poll.id}`}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    {poll.options && poll.options.length > 0 && (
                      <div className="space-y-2">
                        {poll.options.map((opt: PollOption, i: number) => {
                          const pct = totalVotes > 0 ? Math.round((opt.voteCount / totalVotes) * 100) : 0;
                          return (
                            <div key={i} className="space-y-1" data-testid={`poll-option-${poll.id}-${i}`}>
                              <div className="flex justify-between text-sm">
                                <span>{opt.text}</span>
                                <span className="text-muted-foreground">{pct}% ({opt.voteCount})</span>
                              </div>
                              <Progress value={pct} className="h-2" />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <PollFormDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingPoll(null); }}
        onSave={handleSave}
        initial={editingPoll ?? undefined}
        isSaving={createPoll.isPending || updatePoll.isPending}
      />
    </div>
  );
}
