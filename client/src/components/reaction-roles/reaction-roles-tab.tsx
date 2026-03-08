import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useReactionRoles, useCreateReactionRole, useDeleteReactionRole, useDiscordContext } from "@/hooks/use-bot";
import { Smile, Plus, Trash2, Hash, Eye, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { DiscordEntityPicker } from "@/components/discord/entity-pickers";

interface ReactionRolesTabProps {
  serverId: number;
}

const MODE_LABELS: Record<string, string> = {
  toggle: "Toggle",
  add_only: "Add Only",
  remove_only: "Remove Only",
  unique: "Unique (one per group)",
};

export function ReactionRolesTab({ serverId }: ReactionRolesTabProps) {
  const { toast } = useToast();
  const { data: reactionRoles, isLoading } = useReactionRoles(serverId);
  const createRole = useCreateReactionRole(serverId);
  const deleteRole = useDeleteReactionRole(serverId);
  const { data: discordContext } = useDiscordContext(serverId);

  const textChannelOptions = (discordContext?.channels || [])
    .filter((channel) => channel.isTextBased && !channel.isThread && !channel.isCategory)
    .map((channel) => ({ id: channel.id, label: `#${channel.name}`, description: channel.id }));

  const roleOptions = (discordContext?.roles || []).map((role) => ({
    id: role.id,
    label: role.name,
    description: role.id,
  }));

  const channelLabelById = new Map(textChannelOptions.map((option) => [option.id, option.label]));

  const [dialogOpen, setDialogOpen] = useState(false);
  const [channelId, setChannelId] = useState("");
  const [messageId, setMessageId] = useState("");
  const [emoji, setEmoji] = useState("");
  const [roleId, setRoleId] = useState("");
  const [roleName, setRoleName] = useState("");
  const [mode, setMode] = useState("toggle");
  const [groupId, setGroupId] = useState("");

  const resetForm = () => {
    setChannelId("");
    setMessageId("");
    setEmoji("");
    setRoleId("");
    setRoleName("");
    setMode("toggle");
    setGroupId("");
  };

  const handleCreate = () => {
    if (!channelId || !emoji || !roleId || !roleName) {
      toast({ title: "Missing fields", description: "Channel, emoji, role, and role name are required.", variant: "destructive" });
      return;
    }
    createRole.mutate(
      { channelId, messageId: messageId || null, emoji, roleId, roleName, mode, groupId: groupId || null },
      {
        onSuccess: () => {
          toast({ title: "Reaction role created", description: `${emoji} -> ${roleName}` });
          resetForm();
          setDialogOpen(false);
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  };

  const handleDelete = (id: number) => {
    deleteRole.mutate(id, {
      onSuccess: () => toast({ title: "Deleted", description: "Reaction role removed." }),
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  };

  const grouped: Record<string, any[]> = (reactionRoles || []).reduce((acc: Record<string, any[]>, rr: any) => {
    const key = rr.channelId + (rr.messageId ? `-${rr.messageId}` : "");
    if (!acc[key]) acc[key] = [];
    acc[key].push(rr);
    return acc;
  }, {} as Record<string, any[]>);

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
          <h2 className="text-2xl font-display font-bold" data-testid="text-reaction-roles-title">Reaction Roles</h2>
          <p className="text-muted-foreground text-sm mt-1">Create emoji-to-role mappings so users can self-assign roles by reacting.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="button-add-reaction-role">
              <Plus className="w-4 h-4" />
              Add Reaction Role
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display">New Reaction Role</DialogTitle>
              <DialogDescription>Map an emoji reaction to a role assignment.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <DiscordEntityPicker
                  label="Channel *"
                  value={channelId}
                  onChange={setChannelId}
                  options={textChannelOptions}
                  placeholder="Select channel..."
                  manualPlaceholder="Channel ID"
                  testIdPrefix="input-rr-channel-id"
                />
                <div className="space-y-2">
                  <label className="text-sm font-medium">Message ID</label>
                  <Input value={messageId} onChange={(e) => setMessageId(e.target.value)} placeholder="Optional" className="bg-background" data-testid="input-rr-message-id" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Emoji *</label>
                  <Input value={emoji} onChange={(e) => setEmoji(e.target.value)} placeholder="e.g. :star: or <:name:id>" className="bg-background" data-testid="input-rr-emoji" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Mode</label>
                  <Select value={mode} onValueChange={setMode}>
                    <SelectTrigger className="bg-background" data-testid="select-rr-mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="toggle">Toggle</SelectItem>
                      <SelectItem value="add_only">Add Only</SelectItem>
                      <SelectItem value="remove_only">Remove Only</SelectItem>
                      <SelectItem value="unique">Unique (one per group)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <DiscordEntityPicker
                  label="Role *"
                  value={roleId}
                  onChange={(value) => {
                    setRoleId(value);
                    const selectedRole = (discordContext?.roles || []).find((role) => role.id === value);
                    if (selectedRole) setRoleName(selectedRole.name);
                  }}
                  options={roleOptions}
                  placeholder="Select role..."
                  manualPlaceholder="Role ID"
                  testIdPrefix="input-rr-role-id"
                />
                <div className="space-y-2">
                  <label className="text-sm font-medium">Role Name *</label>
                  <Input value={roleName} onChange={(e) => setRoleName(e.target.value)} placeholder="e.g. Member" className="bg-background" data-testid="input-rr-role-name" />
                </div>
              </div>
              {mode === "unique" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Group ID</label>
                  <Input value={groupId} onChange={(e) => setGroupId(e.target.value)} placeholder="e.g. color-roles" className="bg-background" data-testid="input-rr-group-id" />
                  <p className="text-xs text-muted-foreground">Users can only have one role from this group at a time.</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-rr-cancel">Cancel</Button>
              <Button onClick={handleCreate} disabled={createRole.isPending} className="gap-2" data-testid="button-rr-save">
                {createRole.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <Smile className="w-12 h-12 text-muted-foreground/50" />
            <h3 className="text-lg font-display font-bold" data-testid="text-rr-empty">No Reaction Roles</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Create your first reaction role mapping so members can self-assign roles by reacting to messages.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([key, roles]) => {
            const first = roles[0];
            return (
              <Card key={key} className="glass-card" data-testid={`card-rr-group-${key}`}>
                <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-3">
                  <div className="shrink-0 flex items-center justify-center w-9 h-9 rounded-md bg-primary/10 text-primary">
                    <Hash className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-base font-display">Channel: {channelLabelById.get(first.channelId) || first.channelId}</CardTitle>
                    {first.messageId && (
                      <CardDescription className="text-xs">Message: {first.messageId}</CardDescription>
                    )}
                  </div>
                  <Badge variant="secondary" className="ml-auto shrink-0">{roles.length} mapping{roles.length !== 1 ? "s" : ""}</Badge>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {roles.map((rr: any) => (
                      <div key={rr.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-background/30 p-3" data-testid={`row-rr-${rr.id}`}>
                        <div className="flex items-center gap-3 min-w-0 flex-wrap">
                          <span className="text-lg shrink-0" data-testid={`text-rr-emoji-${rr.id}`}>{rr.emoji}</span>
                          <span className="text-sm font-medium" data-testid={`text-rr-role-${rr.id}`}>{rr.roleName}</span>
                          <Badge variant="outline" className="text-xs">{MODE_LABELS[rr.mode] || rr.mode}</Badge>
                          {rr.groupId && <Badge variant="secondary" className="text-xs">Group: {rr.groupId}</Badge>}
                        </div>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(rr.id)} data-testid={`button-delete-rr-${rr.id}`}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base font-display flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" />
            Preview
          </CardTitle>
          <CardDescription>How a reaction role message might look in Discord</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-[#36393f] p-4 space-y-3 text-white/90" data-testid="preview-rr">
            <p className="text-sm font-medium">React to get a role!</p>
            <div className="flex flex-wrap gap-2">
              {(reactionRoles || []).slice(0, 10).map((rr: any) => (
                <div key={rr.id} className="flex items-center gap-1 bg-white/10 rounded-md px-2 py-1 text-xs">
                  <span>{rr.emoji}</span>
                  <span className="text-white/60">{rr.roleName}</span>
                </div>
              ))}
              {(!reactionRoles || reactionRoles.length === 0) && (
                <p className="text-white/40 text-xs">No reaction roles configured yet.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
