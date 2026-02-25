import { useState } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  Search,
  Users,
  FileText,
  Clock,
  Coins,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Shield,
  User,
  Lock,
  Download,
  Filter,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Member {
  userId: string;
  username: string;
  warningCount: number;
  noteCount: number;
  economyBalance: number | null;
}

interface MemberProfile {
  userId: string;
  username: string;
  warnings: Array<{
    id: number;
    reason: string;
    moderatorName: string;
    createdAt: string;
    active: boolean;
  }>;
  notes: Array<{
    id: number;
    note: string;
    authorUsername: string;
    isPrivate: boolean;
    createdAt: string;
  }>;
  economy: { balance: number; totalEarned: number; totalSpent: number } | null;
  transactions: Array<{
    id: number;
    type: string;
    amount: number;
    description: string;
    createdAt: string;
  }>;
}

function MemberProfileSheet({
  serverId,
  member,
  open,
  onClose,
}: {
  serverId: number;
  member: Member | null;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [newNote, setNewNote] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);

  const { data: profile, isLoading } = useQuery<MemberProfile>({
    queryKey: ["/api/servers", serverId, "members", member?.userId],
    enabled: open && !!member,
  });

  const addNote = useMutation({
    mutationFn: async (data: { note: string; isPrivate: boolean }) =>
      apiRequest("POST", `/api/servers/${serverId}/members/${member?.userId}/notes`, {
        ...data,
        authorId: "dashboard",
        authorUsername: "Dashboard",
        targetUsername: member?.username,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/servers", serverId, "members", member?.userId] });
      setNewNote("");
      toast({ title: "Note added" });
    },
  });

  const deleteNote = useMutation({
    mutationFn: async (noteId: number) =>
      apiRequest("DELETE", `/api/servers/${serverId}/members/${member?.userId}/notes/${noteId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/servers", serverId, "members", member?.userId] });
      toast({ title: "Note deleted" });
    },
  });

  if (!member) return null;

  const initials = member.username.slice(0, 2).toUpperCase();

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:w-[520px] p-0 glass-panel flex flex-col" data-testid="sheet-member-profile">
        <SheetHeader className="p-6 border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-lg font-display font-bold text-primary" data-testid="text-member-initials">
              {initials}
            </div>
            <div>
              <SheetTitle className="text-xl font-display" data-testid="text-profile-username">{member.username}</SheetTitle>
              <p className="text-sm text-muted-foreground font-mono" data-testid="text-profile-userid">{member.userId}</p>
            </div>
          </div>
        </SheetHeader>

        {isLoading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="mx-6 mt-4 w-auto self-start">
              <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
              <TabsTrigger value="notes" data-testid="tab-notes">Notes {profile && profile.notes.length > 0 && `(${profile.notes.length})`}</TabsTrigger>
              <TabsTrigger value="timeline" data-testid="tab-timeline">Timeline</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto">
              <TabsContent value="overview" className="p-6 space-y-4 mt-0">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-white/5 bg-background/30 p-3 space-y-1" data-testid="stat-warnings">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Warnings
                    </p>
                    <p className="text-xl font-display font-bold text-primary">{member.warningCount}</p>
                  </div>
                  <div className="rounded-lg border border-white/5 bg-background/30 p-3 space-y-1" data-testid="stat-balance">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Coins className="w-3 h-3" /> Balance
                    </p>
                    <p className="text-xl font-display font-bold">
                      {profile?.economy ? profile.economy.balance.toLocaleString() : "—"}
                    </p>
                  </div>
                </div>

                {profile?.warnings && profile.warnings.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 text-muted-foreground uppercase tracking-wider">Recent Warnings</h4>
                    <div className="space-y-2">
                      {profile.warnings.slice(0, 3).map((w) => (
                        <div key={w.id} className="rounded-lg border border-white/5 bg-background/20 p-3" data-testid={`warning-item-${w.id}`}>
                          <p className="text-sm">{w.reason}</p>
                          <p className="text-xs text-muted-foreground mt-1">by {w.moderatorName} &middot; {new Date(w.createdAt).toLocaleDateString()}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {profile?.economy && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 text-muted-foreground uppercase tracking-wider">Economy</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg border border-white/5 bg-background/20 p-3">
                        <p className="text-xs text-muted-foreground">Total Earned</p>
                        <p className="font-medium">{profile.economy.totalEarned.toLocaleString()}</p>
                      </div>
                      <div className="rounded-lg border border-white/5 bg-background/20 p-3">
                        <p className="text-xs text-muted-foreground">Total Spent</p>
                        <p className="font-medium">{profile.economy.totalSpent.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="notes" className="p-6 space-y-4 mt-0">
                <div className="space-y-2">
                  <Label>Add Note</Label>
                  <Textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Write a mod note about this member..."
                    className="bg-background min-h-[80px]"
                    data-testid="textarea-new-note"
                  />
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="private-toggle"
                        checked={isPrivate}
                        onCheckedChange={setIsPrivate}
                        data-testid="switch-private-note"
                      />
                      <Label htmlFor="private-toggle" className="text-sm">
                        <Lock className="w-3 h-3 inline mr-1" />
                        Private
                      </Label>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => newNote.trim() && addNote.mutate({ note: newNote.trim(), isPrivate })}
                      disabled={addNote.isPending || !newNote.trim()}
                      data-testid="button-add-note"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add Note
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  {profile?.notes && profile.notes.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-6" data-testid="text-no-notes">No notes yet.</p>
                  )}
                  {profile?.notes.map((note) => (
                    <div key={note.id} className="rounded-lg border border-white/5 bg-background/20 p-3 group" data-testid={`note-item-${note.id}`}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm flex-1">{note.note}</p>
                        <button
                          onClick={() => deleteNote.mutate(note.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
                          data-testid={`button-delete-note-${note.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-muted-foreground">by {note.authorUsername} &middot; {new Date(note.createdAt).toLocaleDateString()}</p>
                        {note.isPrivate && <Badge variant="secondary" className="text-xs px-1 py-0"><Lock className="w-2.5 h-2.5 mr-0.5" />Private</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="timeline" className="p-6 mt-0">
                <div className="space-y-3">
                  {profile?.warnings.map((w) => (
                    <div key={`warn-${w.id}`} className="flex gap-3 items-start" data-testid={`timeline-warning-${w.id}`}>
                      <div className="w-7 h-7 rounded-full bg-destructive/20 flex items-center justify-center shrink-0 mt-0.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Warning issued</p>
                        <p className="text-xs text-muted-foreground">{w.reason}</p>
                        <p className="text-xs text-muted-foreground">{new Date(w.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                  {profile?.transactions.map((t) => (
                    <div key={`tx-${t.id}`} className="flex gap-3 items-start" data-testid={`timeline-transaction-${t.id}`}>
                      <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                        <Coins className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{t.type} — {t.amount > 0 ? "+" : ""}{t.amount.toLocaleString()} coins</p>
                        {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                        <p className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                  {(!profile?.warnings.length && !profile?.transactions.length) && (
                    <p className="text-sm text-muted-foreground text-center py-6" data-testid="text-no-timeline">No timeline events yet.</p>
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default function MembersPage() {
  const [, params] = useRoute("/dashboard/servers/:id/members");
  const serverId = parseInt(params?.id || "0");
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState("");
  const [bulkReason, setBulkReason] = useState("");
  const [filterWarnings, setFilterWarnings] = useState(false);

  const limit = 50;

  const { data, isLoading } = useQuery<{ members: Member[]; total: number }>({
    queryKey: ["/api/servers", serverId, "members", page, search],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set("search", search);
      return fetch(`/api/servers/${serverId}/members?${params}`).then(r => r.json());
    },
  });

  const bulkMutation = useMutation({
    mutationFn: async () =>
      apiRequest("POST", `/api/servers/${serverId}/members/bulk`, {
        action: bulkAction,
        userIds: Array.from(selectedIds),
        reason: bulkReason,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/servers", serverId, "members"] });
      setSelectedIds(new Set());
      setBulkAction("");
      setBulkReason("");
      toast({ title: "Bulk action completed", description: `Action applied to ${selectedIds.size} members.` });
    },
  });

  const members = data?.members ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const filtered = filterWarnings ? members.filter(m => m.warningCount > 0) : members;

  function toggleSelect(userId: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  function selectAll() {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map(m => m.userId)));
  }

  function exportCsv() {
    const selected = filtered.filter(m => selectedIds.size === 0 || selectedIds.has(m.userId));
    const csv = ["User ID,Username,Warnings,Notes,Balance", ...selected.map(m =>
      `${m.userId},${m.username},${m.warningCount},${m.noteCount},${m.economyBalance ?? ""}`
    )].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `members-${serverId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold" data-testid="text-members-heading">Member Intelligence</h1>
            <p className="text-muted-foreground mt-1">CRM-style member profiles, mod notes, and bulk operations.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={exportCsv} data-testid="button-export-csv">
              <Download className="w-4 h-4 mr-1" />
              Export CSV
            </Button>
          </div>
        </div>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
            <CardTitle className="font-display flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Members
              {total > 0 && <Badge variant="secondary" data-testid="badge-member-count">{total}</Badge>}
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search username or ID..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="pl-9 bg-background w-64"
                  data-testid="input-member-search"
                />
              </div>
              <Button
                variant={filterWarnings ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterWarnings(!filterWarnings)}
                data-testid="button-filter-warnings"
              >
                <Filter className="w-4 h-4 mr-1" />
                Has Warnings
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {selectedIds.size > 0 && (
              <div className="px-6 py-3 bg-primary/10 border-b border-white/5 flex flex-wrap items-center gap-3" data-testid="bulk-actions-bar">
                <span className="text-sm font-medium text-primary">{selectedIds.size} selected</span>
                <Select value={bulkAction} onValueChange={setBulkAction}>
                  <SelectTrigger className="w-44 bg-background" data-testid="select-bulk-action">
                    <SelectValue placeholder="Choose action..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="addWarning">Add Warning</SelectItem>
                    <SelectItem value="dmAll">DM All</SelectItem>
                  </SelectContent>
                </Select>
                {bulkAction === "addWarning" && (
                  <Input
                    placeholder="Reason..."
                    value={bulkReason}
                    onChange={(e) => setBulkReason(e.target.value)}
                    className="bg-background w-48"
                    data-testid="input-bulk-reason"
                  />
                )}
                <Button size="sm" onClick={() => bulkMutation.mutate()} disabled={!bulkAction || bulkMutation.isPending} data-testid="button-apply-bulk">
                  Apply
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())} data-testid="button-clear-selection">
                  Clear
                </Button>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="w-10 px-4 py-3">
                      <Checkbox
                        checked={filtered.length > 0 && selectedIds.size === filtered.length}
                        onCheckedChange={selectAll}
                        data-testid="checkbox-select-all"
                      />
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Member</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Warnings</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Notes</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Balance</th>
                    <th className="w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading
                    ? Array.from({ length: 8 }).map((_, i) => (
                        <tr key={i} className="border-b border-white/5">
                          <td className="px-4 py-3"><Skeleton className="w-4 h-4" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-10" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-10" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                          <td className="px-4 py-3"></td>
                        </tr>
                      ))
                    : filtered.length === 0
                    ? (
                        <tr>
                          <td colSpan={6} className="text-center py-12 text-muted-foreground" data-testid="text-no-members">
                            <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            No members found.
                          </td>
                        </tr>
                      )
                    : filtered.map((member) => (
                        <tr
                          key={member.userId}
                          className={cn(
                            "border-b border-white/5 hover-elevate cursor-pointer transition-colors",
                            selectedIds.has(member.userId) && "bg-primary/5"
                          )}
                          data-testid={`row-member-${member.userId}`}
                        >
                          <td className="px-4 py-3" onClick={(e) => { e.stopPropagation(); toggleSelect(member.userId); }}>
                            <Checkbox
                              checked={selectedIds.has(member.userId)}
                              onCheckedChange={() => toggleSelect(member.userId)}
                              data-testid={`checkbox-member-${member.userId}`}
                            />
                          </td>
                          <td
                            className="px-4 py-3"
                            onClick={() => { setSelectedMember(member); setSheetOpen(true); }}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-display font-bold text-primary shrink-0">
                                {member.username.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-medium" data-testid={`text-member-username-${member.userId}`}>{member.username}</p>
                                <p className="text-xs text-muted-foreground font-mono">{member.userId}</p>
                              </div>
                            </div>
                          </td>
                          <td
                            className="px-4 py-3"
                            onClick={() => { setSelectedMember(member); setSheetOpen(true); }}
                          >
                            {member.warningCount > 0 ? (
                              <Badge variant="destructive" data-testid={`badge-warnings-${member.userId}`}>
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                {member.warningCount}
                              </Badge>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </td>
                          <td
                            className="px-4 py-3"
                            onClick={() => { setSelectedMember(member); setSheetOpen(true); }}
                          >
                            {member.noteCount > 0 ? (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground" data-testid={`text-notes-${member.userId}`}>
                                <FileText className="w-3.5 h-3.5" />
                                {member.noteCount}
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </td>
                          <td
                            className="px-4 py-3"
                            onClick={() => { setSelectedMember(member); setSheetOpen(true); }}
                          >
                            {member.economyBalance !== null ? (
                              <div className="flex items-center gap-1 text-sm" data-testid={`text-balance-${member.userId}`}>
                                <Coins className="w-3.5 h-3.5 text-muted-foreground" />
                                {member.economyBalance.toLocaleString()}
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => { setSelectedMember(member); setSheetOpen(true); }}
                              data-testid={`button-view-member-${member.userId}`}
                            >
                              <User className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-white/5">
                <p className="text-sm text-muted-foreground" data-testid="text-pagination-info">
                  Page {page} of {totalPages} &middot; {total} total
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    data-testid="button-prev-page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    data-testid="button-next-page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <MemberProfileSheet
        serverId={serverId}
        member={selectedMember}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </DashboardLayout>
  );
}
