import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  useWarnings,
  useCreateWarning,
  useDeleteWarning,
  useClearWarnings,
  usePunishments,
  useUpsertPunishment,
  useDeletePunishment,
  useUpdateSettings,
} from "@/hooks/use-bot";
import type { Warning, PunishmentConfigType, ServerSettings } from "@shared/schema";
import {
  AlertTriangle,
  Plus,
  Trash2,
  Search,
  Save,
  Shield,
  ShieldAlert,
  Gavel,
  Hash,
  UserX,
  Clock,
  XCircle,
  ChevronDown,
  ChevronUp,
  Ban,
  MessageSquareWarning,
} from "lucide-react";

interface ModerationTabProps {
  serverId: number;
  settings: ServerSettings | undefined;
}

const ACTION_LABELS: Record<string, string> = {
  mute: "Mute",
  kick: "Kick",
  ban: "Ban",
  timeout: "Timeout",
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  mute: <Clock className="w-3.5 h-3.5" />,
  kick: <UserX className="w-3.5 h-3.5" />,
  ban: <Ban className="w-3.5 h-3.5" />,
  timeout: <Clock className="w-3.5 h-3.5" />,
};

function formatDuration(minutes: number | null | undefined): string {
  if (!minutes) return "Permanent";
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
  return `${Math.floor(minutes / 1440)}d`;
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "Unknown";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ModerationTab({ serverId, settings }: ModerationTabProps) {
  const { toast } = useToast();
  const { data: warningsData, isLoading: warningsLoading } = useWarnings(serverId);
  const { data: punishmentsData, isLoading: punishmentsLoading } = usePunishments(serverId);
  const createWarning = useCreateWarning(serverId);
  const deleteWarning = useDeleteWarning(serverId);
  const clearWarnings = useClearWarnings(serverId);
  const upsertPunishment = useUpsertPunishment(serverId);
  const deletePunishment = useDeletePunishment(serverId);
  const updateSettings = useUpdateSettings(serverId);

  const allWarnings: Warning[] = warningsData || [];
  const punishments: PunishmentConfigType[] = punishmentsData || [];

  const [searchQuery, setSearchQuery] = useState("");
  const [showNewWarningDialog, setShowNewWarningDialog] = useState(false);
  const [showNewEscalationDialog, setShowNewEscalationDialog] = useState(false);

  const [newWarning, setNewWarning] = useState({
    userId: "",
    userName: "",
    moderatorId: "dashboard",
    moderatorName: "Dashboard",
    reason: "",
  });

  const [newEscalation, setNewEscalation] = useState({
    warningThreshold: 3,
    action: "mute",
    duration: 60,
  });

  const [muteRoleId, setMuteRoleId] = useState(settings?.muteRoleId || "");
  const [modLogChannelId, setModLogChannelId] = useState(settings?.modLogChannelId || "");

  const filteredWarnings = useMemo(() => {
    if (!searchQuery.trim()) return allWarnings;
    const q = searchQuery.toLowerCase();
    return allWarnings.filter(
      (w) =>
        w.userId.toLowerCase().includes(q) ||
        (w.userName && w.userName.toLowerCase().includes(q)) ||
        w.reason.toLowerCase().includes(q)
    );
  }, [allWarnings, searchQuery]);

  const warningCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allWarnings.forEach((w) => {
      if (w.active) {
        counts[w.userId] = (counts[w.userId] || 0) + 1;
      }
    });
    return counts;
  }, [allWarnings]);

  const activeWarningsCount = allWarnings.filter((w) => w.active).length;

  const handleCreateWarning = async () => {
    if (!newWarning.userId.trim() || !newWarning.reason.trim()) {
      toast({ title: "Missing fields", description: "User ID and reason are required.", variant: "destructive" });
      return;
    }
    try {
      await createWarning.mutateAsync(newWarning);
      toast({ title: "Warning issued", description: `Warning issued to user ${newWarning.userName || newWarning.userId}.` });
      setNewWarning({ userId: "", userName: "", moderatorId: "dashboard", moderatorName: "Dashboard", reason: "" });
      setShowNewWarningDialog(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteWarning = async (id: number) => {
    try {
      await deleteWarning.mutateAsync(id);
      toast({ title: "Warning removed", description: "The warning has been deleted." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleClearWarnings = async (userId: string) => {
    try {
      await clearWarnings.mutateAsync(userId);
      toast({ title: "Warnings cleared", description: `All warnings for user ${userId} have been cleared.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleUpsertEscalation = async () => {
    if (newEscalation.warningThreshold < 1) {
      toast({ title: "Invalid threshold", description: "Warning threshold must be at least 1.", variant: "destructive" });
      return;
    }
    try {
      await upsertPunishment.mutateAsync(newEscalation);
      toast({ title: "Escalation rule saved", description: `Action at ${newEscalation.warningThreshold} warnings configured.` });
      setNewEscalation({ warningThreshold: 3, action: "mute", duration: 60 });
      setShowNewEscalationDialog(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteEscalation = async (id: number) => {
    try {
      await deletePunishment.mutateAsync(id);
      toast({ title: "Rule removed", description: "The escalation rule has been deleted." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleSaveModSettings = async () => {
    try {
      await updateSettings.mutateAsync({
        muteRoleId: muteRoleId || null,
        modLogChannelId: modLogChannelId || null,
      });
      toast({ title: "Settings saved", description: "Moderation settings have been updated." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const sortedPunishments = [...punishments].sort((a, b) => a.warningThreshold - b.warningThreshold);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-md bg-yellow-500/10 text-yellow-500">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground" data-testid="text-total-warnings-label">Total Warnings</p>
              <p className="text-2xl font-display font-bold" data-testid="text-total-warnings-count">{allWarnings.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-md bg-destructive/10 text-destructive">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground" data-testid="text-active-warnings-label">Active Warnings</p>
              <p className="text-2xl font-display font-bold" data-testid="text-active-warnings-count">{activeWarningsCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 text-primary">
              <Gavel className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground" data-testid="text-escalation-rules-label">Escalation Rules</p>
              <p className="text-2xl font-display font-bold" data-testid="text-escalation-rules-count">{punishments.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <MessageSquareWarning className="w-5 h-5 text-yellow-500" />
              Warning Management
            </CardTitle>
            <CardDescription>Issue, search, and manage user warnings</CardDescription>
          </div>
          <Dialog open={showNewWarningDialog} onOpenChange={setShowNewWarningDialog}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-warning">
                <Plus className="w-4 h-4 mr-2" />
                Issue Warning
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Issue New Warning</DialogTitle>
                <DialogDescription>Create a warning for a user. This will be tracked in the warning system.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">User ID</label>
                  <Input
                    placeholder="Enter Discord user ID"
                    value={newWarning.userId}
                    onChange={(e) => setNewWarning({ ...newWarning, userId: e.target.value })}
                    data-testid="input-warning-user-id"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">User Name</label>
                  <Input
                    placeholder="Display name (optional)"
                    value={newWarning.userName}
                    onChange={(e) => setNewWarning({ ...newWarning, userName: e.target.value })}
                    data-testid="input-warning-user-name"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Reason</label>
                  <Textarea
                    placeholder="Reason for the warning"
                    value={newWarning.reason}
                    onChange={(e) => setNewWarning({ ...newWarning, reason: e.target.value })}
                    className="resize-none"
                    data-testid="input-warning-reason"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowNewWarningDialog(false)} data-testid="button-cancel-warning">
                  Cancel
                </Button>
                <Button onClick={handleCreateWarning} disabled={createWarning.isPending} data-testid="button-submit-warning">
                  {createWarning.isPending ? "Issuing..." : "Issue Warning"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by user ID, name, or reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-warnings-search"
              />
            </div>
          </div>

          {warningsLoading ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-warnings-loading">Loading warnings...</div>
          ) : filteredWarnings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-warnings-empty">
              {searchQuery ? "No warnings match your search." : "No warnings found. The server is clean!"}
            </div>
          ) : (
            <div className="rounded-md border border-white/5 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Moderator</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWarnings.map((warning) => (
                    <TableRow key={warning.id} data-testid={`row-warning-${warning.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium" data-testid={`text-warning-user-${warning.id}`}>
                            {warning.userName || warning.userId}
                          </span>
                          {warningCounts[warning.userId] && warningCounts[warning.userId] > 1 && (
                            <Badge variant="secondary" className="text-xs" data-testid={`badge-warning-count-${warning.id}`}>
                              {warningCounts[warning.userId]} active
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{warning.userId}</p>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <p className="truncate text-sm" data-testid={`text-warning-reason-${warning.id}`}>{warning.reason}</p>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground" data-testid={`text-warning-mod-${warning.id}`}>
                          {warning.moderatorName || warning.moderatorId}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground" data-testid={`text-warning-date-${warning.id}`}>
                          {formatDate(warning.createdAt)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={warning.active ? "default" : "secondary"}
                          data-testid={`badge-warning-status-${warning.id}`}
                        >
                          {warning.active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 flex-wrap">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" data-testid={`button-delete-warning-${warning.id}`}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Warning</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this warning? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel data-testid="button-cancel-delete-warning">Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteWarning(warning.id)}
                                  data-testid="button-confirm-delete-warning"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" data-testid={`button-clear-user-warnings-${warning.id}`}>
                                <XCircle className="w-4 h-4 text-muted-foreground" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Clear All Warnings</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Clear all warnings for user {warning.userName || warning.userId}? This cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel data-testid="button-cancel-clear-warnings">Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleClearWarnings(warning.userId)}
                                  data-testid="button-confirm-clear-warnings"
                                >
                                  Clear All
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <Gavel className="w-5 h-5 text-primary" />
              Punishment Escalation
            </CardTitle>
            <CardDescription>Configure automatic actions based on warning thresholds</CardDescription>
          </div>
          <Dialog open={showNewEscalationDialog} onOpenChange={setShowNewEscalationDialog}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-escalation">
                <Plus className="w-4 h-4 mr-2" />
                Add Rule
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Escalation Rule</DialogTitle>
                <DialogDescription>Define an automatic action when a user reaches a warning threshold.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Warning Threshold</label>
                  <Input
                    type="number"
                    min={1}
                    value={newEscalation.warningThreshold}
                    onChange={(e) => setNewEscalation({ ...newEscalation, warningThreshold: parseInt(e.target.value) || 1 })}
                    data-testid="input-escalation-threshold"
                  />
                  <p className="text-xs text-muted-foreground">Number of active warnings that triggers this action</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Action</label>
                  <Select
                    value={newEscalation.action}
                    onValueChange={(val) => setNewEscalation({ ...newEscalation, action: val })}
                  >
                    <SelectTrigger data-testid="select-escalation-action">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mute">Mute</SelectItem>
                      <SelectItem value="kick">Kick</SelectItem>
                      <SelectItem value="ban">Ban</SelectItem>
                      <SelectItem value="timeout">Timeout</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(newEscalation.action === "mute" || newEscalation.action === "timeout") && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Duration (minutes)</label>
                    <Input
                      type="number"
                      min={1}
                      value={newEscalation.duration}
                      onChange={(e) => setNewEscalation({ ...newEscalation, duration: parseInt(e.target.value) || 1 })}
                      data-testid="input-escalation-duration"
                    />
                    <p className="text-xs text-muted-foreground">Leave empty or 0 for permanent (mute only)</p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowNewEscalationDialog(false)} data-testid="button-cancel-escalation">
                  Cancel
                </Button>
                <Button onClick={handleUpsertEscalation} disabled={upsertPunishment.isPending} data-testid="button-submit-escalation">
                  {upsertPunishment.isPending ? "Saving..." : "Save Rule"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {punishmentsLoading ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-punishments-loading">Loading rules...</div>
          ) : sortedPunishments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-punishments-empty">
              No escalation rules configured. Add a rule to automatically punish users who reach warning thresholds.
            </div>
          ) : (
            <div className="space-y-3">
              {sortedPunishments.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between gap-4 rounded-md border border-white/5 p-3 flex-wrap"
                  data-testid={`row-escalation-${rule.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-9 h-9 rounded-md bg-destructive/10 text-destructive shrink-0">
                      {ACTION_ICONS[rule.action] || <Gavel className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium" data-testid={`text-escalation-threshold-${rule.id}`}>
                          {rule.warningThreshold} warnings
                        </span>
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                        <Badge variant="secondary" data-testid={`badge-escalation-action-${rule.id}`}>
                          {ACTION_LABELS[rule.action] || rule.action}
                        </Badge>
                        {rule.duration && (
                          <Badge variant="outline" data-testid={`badge-escalation-duration-${rule.id}`}>
                            {formatDuration(rule.duration)}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Automatically {rule.action} users who reach {rule.warningThreshold} active warnings
                      </p>
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost" data-testid={`button-delete-escalation-${rule.id}`}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Escalation Rule</AlertDialogTitle>
                        <AlertDialogDescription>
                          Remove the escalation rule for {rule.warningThreshold} warnings? This won't affect existing warnings.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel data-testid="button-cancel-delete-escalation">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteEscalation(rule.id)}
                          data-testid="button-confirm-delete-escalation"
                        >
                          Delete
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

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <Shield className="w-5 h-5 text-accent" />
            Mod Settings
          </CardTitle>
          <CardDescription>Configure moderation roles and log channels</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                Mute Role ID
              </label>
              <Input
                placeholder="Role ID for muted users"
                value={muteRoleId}
                onChange={(e) => setMuteRoleId(e.target.value)}
                data-testid="input-mute-role-id"
              />
              <p className="text-xs text-muted-foreground">The role assigned to muted users</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                Mod Log Channel ID
              </label>
              <Input
                placeholder="Channel ID for mod logs"
                value={modLogChannelId}
                onChange={(e) => setModLogChannelId(e.target.value)}
                data-testid="input-mod-log-channel-id"
              />
              <p className="text-xs text-muted-foreground">Channel where moderation actions are logged</p>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveModSettings} disabled={updateSettings.isPending} data-testid="button-save-mod-settings">
              <Save className="w-4 h-4 mr-2" />
              {updateSettings.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card hover-elevate">
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-md bg-yellow-500/10 text-yellow-500 mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <p className="font-display font-semibold mb-1">Warn User</p>
            <p className="text-xs text-muted-foreground mb-3">Issue a warning to a user</p>
            <Button
              variant="outline"
              onClick={() => setShowNewWarningDialog(true)}
              data-testid="button-quick-warn"
            >
              Warn
            </Button>
          </CardContent>
        </Card>
        <Card className="glass-card hover-elevate">
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-md bg-orange-500/10 text-orange-500 mb-3">
              <Clock className="w-6 h-6" />
            </div>
            <p className="font-display font-semibold mb-1">Mute User</p>
            <p className="text-xs text-muted-foreground mb-3">Temporarily silence a user</p>
            <Button variant="outline" disabled data-testid="button-quick-mute">
              Mute
            </Button>
          </CardContent>
        </Card>
        <Card className="glass-card hover-elevate">
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-md bg-red-500/10 text-red-500 mb-3">
              <UserX className="w-6 h-6" />
            </div>
            <p className="font-display font-semibold mb-1">Kick User</p>
            <p className="text-xs text-muted-foreground mb-3">Remove a user from the server</p>
            <Button variant="outline" disabled data-testid="button-quick-kick">
              Kick
            </Button>
          </CardContent>
        </Card>
        <Card className="glass-card hover-elevate">
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-md bg-destructive/10 text-destructive mb-3">
              <Ban className="w-6 h-6" />
            </div>
            <p className="font-display font-semibold mb-1">Ban User</p>
            <p className="text-xs text-muted-foreground mb-3">Permanently ban a user</p>
            <Button variant="outline" disabled data-testid="button-quick-ban">
              Ban
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
