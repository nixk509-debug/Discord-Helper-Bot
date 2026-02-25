import { useState, useMemo } from "react";
import { useCommands, useCreateCommand, useUpdateCommand, useDeleteCommand } from "@/hooks/use-bot";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus, Trash2, Save, Terminal, Search, X, Copy, Eye,
  ChevronDown, ChevronUp, LayoutGrid, List, Settings,
  Shield, Hash, Clock, MessageSquare, Zap, Variable,
  Edit3, ToggleLeft, ToggleRight, CheckSquare, Power,
  Globe, Play, Check, AlertCircle, Share2, Download, Store
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { CustomCommand } from "@shared/schema";
import { EmbedComposer, type EmbedData } from "@/components/embed-builder/embed-composer";

interface HttpHeader {
  key: string;
  value: string;
}

interface ResponseMapping {
  jsonPath: string;
  saveAs: string;
}

interface HttpActionConfig {
  enabled: boolean;
  url: string;
  method: string;
  headers: HttpHeader[];
  body: string;
  responseMapping: ResponseMapping[];
  timeout: number;
}

interface CommandFormState {
  name: string;
  description: string;
  response: string;
  responseType: string;
  aliases: string[];
  cooldown: number;
  enabled: boolean;
  requiredRoles: string[];
  blockedRoles: string[];
  allowedChannels: string[];
  blockedChannels: string[];
  embedResponse: any;
  deleteInvocation: boolean;
  dmResponse: boolean;
  httpAction: HttpActionConfig;
}

const DEFAULT_HTTP_ACTION: HttpActionConfig = {
  enabled: false,
  url: "",
  method: "GET",
  headers: [],
  body: "",
  responseMapping: [],
  timeout: 5000,
};

const DEFAULT_FORM: CommandFormState = {
  name: "",
  description: "",
  response: "",
  responseType: "text",
  aliases: [],
  cooldown: 0,
  enabled: true,
  requiredRoles: [],
  blockedRoles: [],
  allowedChannels: [],
  blockedChannels: [],
  embedResponse: null,
  deleteInvocation: false,
  dmResponse: false,
  httpAction: { ...DEFAULT_HTTP_ACTION },
};

const VARIABLES = [
  { category: "User", items: [
    { var: "{user}", desc: "Username" },
    { var: "{user.name}", desc: "Display name" },
    { var: "{user.id}", desc: "User ID" },
    { var: "{user.mention}", desc: "User mention" },
    { var: "{user.avatar}", desc: "Avatar URL" },
  ]},
  { category: "Server", items: [
    { var: "{server}", desc: "Server name" },
    { var: "{server.name}", desc: "Server name" },
    { var: "{server.id}", desc: "Server ID" },
    { var: "{server.membercount}", desc: "Member count" },
  ]},
  { category: "Channel", items: [
    { var: "{channel}", desc: "Channel name" },
    { var: "{channel.name}", desc: "Channel name" },
    { var: "{channel.id}", desc: "Channel ID" },
    { var: "{channel.mention}", desc: "Channel mention" },
  ]},
  { category: "Arguments", items: [
    { var: "{args}", desc: "All arguments" },
    { var: "{args.0}", desc: "First argument" },
    { var: "{args.1}", desc: "Second argument" },
    { var: "{args.2}", desc: "Third argument" },
  ]},
  { category: "Misc", items: [
    { var: "{random:a,b,c}", desc: "Random choice" },
    { var: "{time}", desc: "Current time" },
    { var: "{date}", desc: "Current date" },
  ]},
];

type SortKey = "name" | "createdAt" | "enabled";

interface CommandsTabProps {
  serverId: number;
  commands: CustomCommand[];
  toast: any;
}

export function CommandsTab({ serverId, commands, toast }: CommandsTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [selectedCommands, setSelectedCommands] = useState<number[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCommand, setEditingCommand] = useState<CustomCommand | null>(null);
  const [sharingCommand, setSharingCommand] = useState<CustomCommand | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);

  const createCommand = useCreateCommand(serverId);
  const updateCommand = useUpdateCommand(serverId);
  const deleteCommand = useDeleteCommand(serverId);

  const filteredCommands = useMemo(() => {
    let result = [...commands];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(cmd =>
        cmd.name.toLowerCase().includes(q) ||
        (cmd.description && cmd.description.toLowerCase().includes(q)) ||
        cmd.response.toLowerCase().includes(q) ||
        (cmd.aliases as string[] || []).some((a: string) => a.toLowerCase().includes(q))
      );
    }
    result.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "name") cmp = a.name.localeCompare(b.name);
      else if (sortBy === "createdAt") cmp = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      else if (sortBy === "enabled") cmp = (a.enabled === b.enabled ? 0 : a.enabled ? -1 : 1);
      return sortAsc ? cmp : -cmp;
    });
    return result;
  }, [commands, searchQuery, sortBy, sortAsc]);

  function handleBulkAction(action: "enable" | "disable" | "delete") {
    if (action === "delete") {
      if (!confirm(`Delete ${selectedCommands.length} commands?`)) return;
      selectedCommands.forEach(id => deleteCommand.mutate(id));
      setSelectedCommands([]);
      toast({ title: "Commands deleted", description: `${selectedCommands.length} commands removed.` });
    } else {
      selectedCommands.forEach(id => {
        updateCommand.mutate({ id, data: { enabled: action === "enable" } });
      });
      setSelectedCommands([]);
      toast({ title: "Commands updated", description: `${selectedCommands.length} commands ${action}d.` });
    }
  }

  function toggleSelect(id: number) {
    setSelectedCommands(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  function toggleSelectAll() {
    if (selectedCommands.length === filteredCommands.length) {
      setSelectedCommands([]);
    } else {
      setSelectedCommands(filteredCommands.map(c => c.id));
    }
  }

  function handleToggleEnabled(cmd: CustomCommand) {
    updateCommand.mutate({ id: cmd.id, data: { enabled: !cmd.enabled } }, {
      onSuccess: () => toast({
        title: cmd.enabled ? "Command disabled" : "Command enabled",
        description: `!${cmd.name} has been ${cmd.enabled ? "disabled" : "enabled"}.`
      }),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-display font-bold text-glow" data-testid="text-commands-title">Custom Commands</h2>
          <p className="text-muted-foreground text-sm">Create automated responses with variables, permissions, and rich embeds.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" className="gap-2" onClick={() => setIsImportOpen(true)} data-testid="button-import-from-marketplace">
            <Download className="w-4 h-4" /> Import by Code
          </Button>
          <Button className="gap-2" onClick={() => setIsCreateOpen(true)} data-testid="button-new-command">
            <Plus className="w-4 h-4" /> New Command
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search commands..."
            className="pl-9 bg-background"
            data-testid="input-search-commands"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>

        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
          <SelectTrigger className="w-[160px] bg-background" data-testid="select-sort-commands">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="createdAt">Created</SelectItem>
            <SelectItem value="enabled">Status</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="ghost" size="icon" onClick={() => setSortAsc(!sortAsc)} data-testid="button-toggle-sort">
          {sortAsc ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>

        <div className="flex border border-border rounded-md">
          <Button
            variant={viewMode === "card" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setViewMode("card")}
            data-testid="button-view-card"
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === "table" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setViewMode("table")}
            data-testid="button-view-table"
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {selectedCommands.length > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 flex-wrap">
          <span className="text-sm text-muted-foreground">{selectedCommands.length} selected</span>
          <Button variant="outline" size="sm" onClick={() => handleBulkAction("enable")} data-testid="button-bulk-enable">
            <Power className="w-3 h-3 mr-1" /> Enable All
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleBulkAction("disable")} data-testid="button-bulk-disable">
            <Power className="w-3 h-3 mr-1" /> Disable All
          </Button>
          <Button variant="destructive" size="sm" onClick={() => handleBulkAction("delete")} data-testid="button-bulk-delete">
            <Trash2 className="w-3 h-3 mr-1" /> Delete
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedCommands([])} data-testid="button-clear-selection">
            Clear
          </Button>
        </div>
      )}

      {filteredCommands.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <Terminal className="w-12 h-12 text-muted-foreground/50" />
            <h3 className="text-lg font-display font-bold" data-testid="text-no-commands">
              {searchQuery ? "No matching commands" : "No commands yet"}
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              {searchQuery ? "Try a different search term." : "Create your first custom command to get started."}
            </p>
          </CardContent>
        </Card>
      ) : viewMode === "card" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCommands.map((cmd) => (
            <CommandCard
              key={cmd.id}
              command={cmd}
              selected={selectedCommands.includes(cmd.id)}
              onToggleSelect={() => toggleSelect(cmd.id)}
              onToggleEnabled={() => handleToggleEnabled(cmd)}
              onEdit={() => setEditingCommand(cmd)}
              onShare={() => setSharingCommand(cmd)}
              onDelete={() => {
                if (confirm(`Delete !${cmd.name}?`)) {
                  deleteCommand.mutate(cmd.id, {
                    onSuccess: () => toast({ title: "Deleted", description: `Command !${cmd.name} removed.` })
                  });
                }
              }}
              isPending={deleteCommand.isPending}
            />
          ))}
        </div>
      ) : (
        <CommandTable
          commands={filteredCommands}
          selectedCommands={selectedCommands}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
          onToggleEnabled={handleToggleEnabled}
          onEdit={setEditingCommand}
          onDelete={(cmd) => {
            if (confirm(`Delete !${cmd.name}?`)) {
              deleteCommand.mutate(cmd.id, {
                onSuccess: () => toast({ title: "Deleted", description: `Command !${cmd.name} removed.` })
              });
            }
          }}
        />
      )}

      <CommandFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        serverId={serverId}
        toast={toast}
        mode="create"
      />

      {editingCommand && (
        <CommandFormDialog
          open={!!editingCommand}
          onOpenChange={(open) => { if (!open) setEditingCommand(null); }}
          serverId={serverId}
          toast={toast}
          mode="edit"
          command={editingCommand}
        />
      )}

      {sharingCommand && (
        <ShareCommandDialog
          command={sharingCommand}
          serverId={serverId}
          open={!!sharingCommand}
          onOpenChange={(open) => { if (!open) setSharingCommand(null); }}
          toast={toast}
        />
      )}

      <ImportCommandDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        serverId={serverId}
        toast={toast}
      />
    </div>
  );
}

function CommandCard({
  command, selected, onToggleSelect, onToggleEnabled, onEdit, onShare, onDelete, isPending
}: {
  command: CustomCommand;
  selected: boolean;
  onToggleSelect: () => void;
  onToggleEnabled: () => void;
  onEdit: () => void;
  onShare: () => void;
  onDelete: () => void;
  isPending: boolean;
}) {
  const aliases = (command.aliases as string[]) || [];
  return (
    <Card
      className={`glass-card group transition-colors ${selected ? "ring-1 ring-primary" : ""} ${!command.enabled ? "opacity-60" : ""}`}
      data-testid={`card-command-${command.id}`}
    >
      <CardHeader className="pb-3 flex flex-row items-start justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            className="rounded border-border"
            data-testid={`checkbox-select-command-${command.id}`}
          />
          <span className="font-mono text-primary bg-primary/10 px-2 py-1 rounded text-sm truncate" data-testid={`text-command-name-${command.id}`}>
            !{command.name}
          </span>
          {!command.enabled && <Badge variant="secondary" className="text-xs">Disabled</Badge>}
        </div>
        <div className="flex items-center gap-1">
          <Switch
            checked={command.enabled ?? true}
            onCheckedChange={onToggleEnabled}
            className="data-[state=checked]:bg-green-600 scale-75"
            data-testid={`switch-toggle-command-${command.id}`}
          />
          <Button variant="ghost" size="icon" onClick={onEdit} data-testid={`button-edit-command-${command.id}`}>
            <Edit3 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground invisible group-hover:visible"
            onClick={onShare}
            data-testid={`button-share-command-${command.id}`}
          >
            <Share2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground invisible group-hover:visible"
            onClick={onDelete}
            disabled={isPending}
            data-testid={`button-delete-command-${command.id}`}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {command.description && (
          <p className="text-xs text-muted-foreground" data-testid={`text-command-desc-${command.id}`}>{command.description}</p>
        )}
        <p className="text-sm text-muted-foreground truncate" data-testid={`text-command-response-${command.id}`}>{command.response}</p>
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <Badge variant="outline" className="text-xs">
            {command.responseType || "text"}
          </Badge>
          {(command.cooldown ?? 0) > 0 && (
            <Badge variant="outline" className="text-xs gap-1">
              <Clock className="w-3 h-3" /> {command.cooldown}s
            </Badge>
          )}
          {aliases.length > 0 && (
            <Badge variant="outline" className="text-xs">
              +{aliases.length} alias{aliases.length > 1 ? "es" : ""}
            </Badge>
          )}
          {command.dmResponse && (
            <Badge variant="outline" className="text-xs">DM</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CommandTable({
  commands, selectedCommands, onToggleSelect, onToggleSelectAll, onToggleEnabled, onEdit, onDelete
}: {
  commands: CustomCommand[];
  selectedCommands: number[];
  onToggleSelect: (id: number) => void;
  onToggleSelectAll: () => void;
  onToggleEnabled: (cmd: CustomCommand) => void;
  onEdit: (cmd: CustomCommand) => void;
  onDelete: (cmd: CustomCommand) => void;
}) {
  return (
    <Card className="glass-card overflow-visible">
      <div className="overflow-x-auto">
        <table className="w-full text-sm" data-testid="table-commands">
          <thead>
            <tr className="border-b border-white/5">
              <th className="p-3 text-left w-8">
                <input
                  type="checkbox"
                  checked={selectedCommands.length === commands.length && commands.length > 0}
                  onChange={onToggleSelectAll}
                  className="rounded border-border"
                  data-testid="checkbox-select-all"
                />
              </th>
              <th className="p-3 text-left font-medium text-muted-foreground">Command</th>
              <th className="p-3 text-left font-medium text-muted-foreground">Response</th>
              <th className="p-3 text-left font-medium text-muted-foreground">Type</th>
              <th className="p-3 text-left font-medium text-muted-foreground">Cooldown</th>
              <th className="p-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="p-3 text-right font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {commands.map((cmd) => (
              <tr key={cmd.id} className={`border-b border-white/5 ${!cmd.enabled ? "opacity-60" : ""}`} data-testid={`row-command-${cmd.id}`}>
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={selectedCommands.includes(cmd.id)}
                    onChange={() => onToggleSelect(cmd.id)}
                    className="rounded border-border"
                    data-testid={`checkbox-select-command-table-${cmd.id}`}
                  />
                </td>
                <td className="p-3">
                  <span className="font-mono text-primary" data-testid={`text-command-name-table-${cmd.id}`}>!{cmd.name}</span>
                </td>
                <td className="p-3 max-w-[200px]">
                  <span className="truncate block text-muted-foreground">{cmd.response}</span>
                </td>
                <td className="p-3">
                  <Badge variant="outline" className="text-xs">{cmd.responseType || "text"}</Badge>
                </td>
                <td className="p-3 text-muted-foreground">{(cmd.cooldown ?? 0) > 0 ? `${cmd.cooldown}s` : "-"}</td>
                <td className="p-3">
                  <Switch
                    checked={cmd.enabled ?? true}
                    onCheckedChange={() => onToggleEnabled(cmd)}
                    className="data-[state=checked]:bg-green-600 scale-75"
                    data-testid={`switch-toggle-table-${cmd.id}`}
                  />
                </td>
                <td className="p-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(cmd)} data-testid={`button-edit-table-${cmd.id}`}>
                      <Edit3 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(cmd)} data-testid={`button-delete-table-${cmd.id}`}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function ShareCommandDialog({
  command, serverId, open, onOpenChange, toast
}: {
  command: CustomCommand;
  serverId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  toast: any;
}) {
  const [title, setTitle] = useState(command.name);
  const [description, setDescription] = useState(command.description || "");
  const [category, setCategory] = useState("utility");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  const shareMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/servers/${serverId}/commands/${command.id}/share`, {
        title, description, category, tags, isPublic
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      setShareCode(data.shareCode);
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace"] });
      toast({ title: "Command shared!", description: `Share code: ${data.shareCode}` });
    },
    onError: (err: any) => {
      toast({ title: "Share failed", description: err.message, variant: "destructive" });
    },
  });

  function addTag() {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  }

  function copyCode() {
    if (shareCode) {
      navigator.clipboard.writeText(shareCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-white/10">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            Share Command
          </DialogTitle>
          <DialogDescription>
            Share <code className="font-mono text-primary">!{command.name}</code> to the marketplace.
          </DialogDescription>
        </DialogHeader>

        {shareCode ? (
          <div className="space-y-4 py-2">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6 text-green-500" />
              </div>
              <h3 className="font-semibold">Command Shared!</h3>
              <p className="text-sm text-muted-foreground">Share this code with others to import your command.</p>
            </div>
            <div className="flex items-center gap-2">
              <code className="font-mono text-primary bg-primary/10 px-4 py-3 rounded text-lg flex-1 text-center tracking-widest">
                {shareCode}
              </code>
              <Button variant="outline" size="icon" onClick={copyCode} data-testid="button-copy-share-code">
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-background" data-testid="input-share-title" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="bg-background resize-none" rows={2} data-testid="input-share-description" />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-background" data-testid="select-share-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["moderation", "fun", "utility", "info", "economy", "automation"].map(c => (
                    <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                  placeholder="Add tag..."
                  className="bg-background flex-1"
                  data-testid="input-share-tag"
                />
                <Button variant="outline" size="sm" onClick={addTag}>Add</Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="gap-1 text-xs">
                      {tag}
                      <button onClick={() => setTags(tags.filter(t => t !== tag))}><X className="w-3 h-3" /></button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isPublic} onCheckedChange={setIsPublic} data-testid="switch-share-public" />
              <Label>Public (visible in marketplace)</Label>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {shareCode ? "Close" : "Cancel"}
          </Button>
          {!shareCode && (
            <Button
              onClick={() => shareMutation.mutate()}
              disabled={!title.trim() || shareMutation.isPending}
              className="gap-2"
              data-testid="button-confirm-share"
            >
              <Share2 className="w-4 h-4" />
              {shareMutation.isPending ? "Sharing..." : "Share to Marketplace"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImportCommandDialog({
  open, onOpenChange, serverId, toast
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serverId: number;
  toast: any;
}) {
  const [code, setCode] = useState("");
  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/marketplace/${code.trim().toUpperCase()}/import`, { serverId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/servers", serverId, "commands"] });
      toast({ title: "Command imported!", description: "The command has been added to this server." });
      setCode("");
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm bg-card border-white/10">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            Import by Code
          </DialogTitle>
          <DialogDescription>
            Enter a share code to import a command from the marketplace.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Share Code</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. AB3X9KQY"
              className="font-mono bg-background text-center text-lg tracking-widest"
              maxLength={8}
              data-testid="input-import-code"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            You can also browse the <a href="/marketplace" className="text-primary underline">marketplace</a> to find commands.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => importMutation.mutate()}
            disabled={code.trim().length !== 8 || importMutation.isPending}
            className="gap-2"
            data-testid="button-confirm-import-code"
          >
            <Download className="w-4 h-4" />
            {importMutation.isPending ? "Importing..." : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CommandFormDialog({
  open, onOpenChange, serverId, toast, mode, command
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serverId: number;
  toast: any;
  mode: "create" | "edit";
  command?: CustomCommand;
}) {
  const createCommand = useCreateCommand(serverId);
  const updateCommand = useUpdateCommand(serverId);

  const initialForm: CommandFormState = command ? {
    name: command.name,
    description: command.description || "",
    response: command.response,
    responseType: command.responseType || "text",
    aliases: (command.aliases as string[]) || [],
    cooldown: command.cooldown ?? 0,
    enabled: command.enabled ?? true,
    requiredRoles: (command.requiredRoles as string[]) || [],
    blockedRoles: (command.blockedRoles as string[]) || [],
    allowedChannels: (command.allowedChannels as string[]) || [],
    blockedChannels: (command.blockedChannels as string[]) || [],
    embedResponse: command.embedResponse || null,
    deleteInvocation: command.deleteInvocation ?? false,
    dmResponse: command.dmResponse ?? false,
    httpAction: (command as any).httpAction || { ...DEFAULT_HTTP_ACTION },
  } : { ...DEFAULT_FORM };

  const [form, setForm] = useState<CommandFormState>(initialForm);
  const [aliasInput, setAliasInput] = useState("");
  const [roleInput, setRoleInput] = useState("");
  const [channelInput, setChannelInput] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  function updateField<K extends keyof CommandFormState>(key: K, value: CommandFormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function addAlias() {
    const trimmed = aliasInput.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (trimmed && !form.aliases.includes(trimmed)) {
      updateField("aliases", [...form.aliases, trimmed]);
    }
    setAliasInput("");
  }

  function removeAlias(alias: string) {
    updateField("aliases", form.aliases.filter(a => a !== alias));
  }

  function addToList(field: "requiredRoles" | "blockedRoles" | "allowedChannels" | "blockedChannels", value: string) {
    const trimmed = value.trim();
    if (trimmed && !form[field].includes(trimmed)) {
      updateField(field, [...form[field], trimmed]);
    }
  }

  function removeFromList(field: "requiredRoles" | "blockedRoles" | "allowedChannels" | "blockedChannels", value: string) {
    updateField(field, form[field].filter(v => v !== value));
  }

  function handleSubmit() {
    if (!form.name.trim()) {
      toast({ title: "Error", description: "Command name is required.", variant: "destructive" });
      return;
    }
    if (!form.response.trim() && form.responseType !== "embed") {
      toast({ title: "Error", description: "Command response is required.", variant: "destructive" });
      return;
    }

    const payload = {
      name: form.name.toLowerCase().replace(/[^a-z0-9]/g, ""),
      description: form.description || undefined,
      response: form.response,
      responseType: form.responseType,
      aliases: form.aliases,
      cooldown: form.cooldown,
      enabled: form.enabled,
      requiredRoles: form.requiredRoles,
      blockedRoles: form.blockedRoles,
      allowedChannels: form.allowedChannels,
      blockedChannels: form.blockedChannels,
      embedResponse: form.embedResponse,
      deleteInvocation: form.deleteInvocation,
      dmResponse: form.dmResponse,
      httpAction: form.httpAction,
    };

    if (mode === "edit" && command) {
      updateCommand.mutate({ id: command.id, data: payload }, {
        onSuccess: () => {
          toast({ title: "Command updated", description: `!${payload.name} saved.` });
          onOpenChange(false);
        },
      });
    } else {
      createCommand.mutate(payload, {
        onSuccess: () => {
          toast({ title: "Command created", description: `!${payload.name} added.` });
          onOpenChange(false);
        },
      });
    }
  }

  function resolvePreview(text: string) {
    return text
      .replace(/\{user\}/g, "TestUser")
      .replace(/\{user\.name\}/g, "TestUser")
      .replace(/\{user\.id\}/g, "123456789012345678")
      .replace(/\{user\.mention\}/g, "@TestUser")
      .replace(/\{user\.avatar\}/g, "https://cdn.discordapp.com/embed/avatars/0.png")
      .replace(/\{server\}/g, "My Server")
      .replace(/\{server\.name\}/g, "My Server")
      .replace(/\{server\.id\}/g, "987654321098765432")
      .replace(/\{server\.membercount\}/g, "1,234")
      .replace(/\{channel\}/g, "general")
      .replace(/\{channel\.name\}/g, "general")
      .replace(/\{channel\.id\}/g, "111222333444555666")
      .replace(/\{channel\.mention\}/g, "#general")
      .replace(/\{args\}/g, "hello world")
      .replace(/\{args\.0\}/g, "hello")
      .replace(/\{args\.1\}/g, "world")
      .replace(/\{args\.2\}/g, "")
      .replace(/\{time\}/g, new Date().toLocaleTimeString())
      .replace(/\{date\}/g, new Date().toLocaleDateString())
      .replace(/\{random:([^}]+)\}/g, (_, choices) => {
        const opts = choices.split(",");
        return opts[Math.floor(Math.random() * opts.length)] || "";
      });
  }

  const isPending = createCommand.isPending || updateCommand.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel border border-white/10 max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">
            {mode === "edit" ? `Edit Command: !${command?.name}` : "Create Command"}
          </DialogTitle>
          <DialogDescription>
            {mode === "edit" ? "Modify your custom command settings." : "Build a new custom command with variables and permissions."}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="w-full grid grid-cols-5">
            <TabsTrigger value="basic" data-testid="tab-basic">
              <Terminal className="w-4 h-4 mr-1" /> Basic
            </TabsTrigger>
            <TabsTrigger value="response" data-testid="tab-response">
              <MessageSquare className="w-4 h-4 mr-1" /> Response
            </TabsTrigger>
            <TabsTrigger value="http" data-testid="tab-http">
              <Globe className="w-4 h-4 mr-1" /> HTTP
            </TabsTrigger>
            <TabsTrigger value="permissions" data-testid="tab-permissions">
              <Shield className="w-4 h-4 mr-1" /> Permissions
            </TabsTrigger>
            <TabsTrigger value="preview" data-testid="tab-preview">
              <Eye className="w-4 h-4 mr-1" /> Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Command Name</Label>
                <div className="flex items-center">
                  <span className="bg-secondary px-3 py-2 rounded-l-md border border-r-0 border-white/10 text-muted-foreground">!</span>
                  <Input
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))}
                    placeholder="ping"
                    className="rounded-l-none bg-background"
                    data-testid="input-command-name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Cooldown (seconds)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.cooldown}
                  onChange={(e) => updateField("cooldown", parseInt(e.target.value) || 0)}
                  className="bg-background"
                  data-testid="input-command-cooldown"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="A brief description of what this command does"
                className="bg-background"
                data-testid="input-command-description"
              />
            </div>

            <div className="space-y-2">
              <Label>Aliases</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={aliasInput}
                  onChange={(e) => setAliasInput(e.target.value)}
                  placeholder="Add alias..."
                  className="bg-background flex-1"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAlias(); } }}
                  data-testid="input-command-alias"
                />
                <Button variant="outline" size="sm" onClick={addAlias} data-testid="button-add-alias">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {form.aliases.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {form.aliases.map(alias => (
                    <Badge key={alias} variant="secondary" className="gap-1">
                      !{alias}
                      <button onClick={() => removeAlias(alias)}>
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border border-white/5 bg-background/50 p-4">
              <div className="space-y-0.5">
                <Label>Enabled</Label>
                <p className="text-xs text-muted-foreground">Whether this command is active</p>
              </div>
              <Switch
                checked={form.enabled}
                onCheckedChange={(v) => updateField("enabled", v)}
                className="data-[state=checked]:bg-green-600"
                data-testid="switch-command-enabled"
              />
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between gap-4 rounded-lg border border-white/5 bg-background/50 p-4">
                <div className="space-y-0.5">
                  <Label>Delete Invocation</Label>
                  <p className="text-xs text-muted-foreground">Delete the trigger message</p>
                </div>
                <Switch
                  checked={form.deleteInvocation}
                  onCheckedChange={(v) => updateField("deleteInvocation", v)}
                  data-testid="switch-delete-invocation"
                />
              </div>

              <div className="flex items-center justify-between gap-4 rounded-lg border border-white/5 bg-background/50 p-4">
                <div className="space-y-0.5">
                  <Label>DM Response</Label>
                  <p className="text-xs text-muted-foreground">Send response as a DM</p>
                </div>
                <Switch
                  checked={form.dmResponse}
                  onCheckedChange={(v) => updateField("dmResponse", v)}
                  data-testid="switch-dm-response"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="response" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Response Type</Label>
              <Select value={form.responseType} onValueChange={(v) => updateField("responseType", v)}>
                <SelectTrigger className="bg-background w-[200px]" data-testid="select-response-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text Only</SelectItem>
                  <SelectItem value="embed">Embed Only</SelectItem>
                  <SelectItem value="both">Text + Embed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(form.responseType === "text" || form.responseType === "both") && (
              <div className="space-y-2">
                <Label>Text Response</Label>
                <Textarea
                  value={form.response}
                  onChange={(e) => updateField("response", e.target.value)}
                  placeholder="Pong! Latency: {time}"
                  className="bg-background min-h-[120px] font-mono text-sm"
                  data-testid="input-command-response"
                />
              </div>
            )}

            {(form.responseType === "embed" || form.responseType === "both") && (
              <EmbedComposer
                label="Embed Response"
                value={form.embedResponse as EmbedData | undefined}
                onChange={(data) => updateField("embedResponse", data)}
              />
            )}

            <VariableReference />
          </TabsContent>

          <TabsContent value="http" className="space-y-4 pt-4">
            <HttpActionEditor
              config={form.httpAction}
              onChange={(cfg) => updateField("httpAction", cfg)}
            />
          </TabsContent>

          <TabsContent value="permissions" className="space-y-4 pt-4">
            <PermissionListEditor
              label="Required Roles"
              description="Only users with these roles can use this command (leave empty for everyone)"
              items={form.requiredRoles}
              onAdd={(v) => addToList("requiredRoles", v)}
              onRemove={(v) => removeFromList("requiredRoles", v)}
              placeholder="Role ID"
              icon={<Shield className="w-4 h-4" />}
              testIdPrefix="required-roles"
            />
            <PermissionListEditor
              label="Blocked Roles"
              description="Users with these roles cannot use this command"
              items={form.blockedRoles}
              onAdd={(v) => addToList("blockedRoles", v)}
              onRemove={(v) => removeFromList("blockedRoles", v)}
              placeholder="Role ID"
              icon={<Shield className="w-4 h-4" />}
              testIdPrefix="blocked-roles"
            />
            <PermissionListEditor
              label="Allowed Channels"
              description="Command only works in these channels (leave empty for all)"
              items={form.allowedChannels}
              onAdd={(v) => addToList("allowedChannels", v)}
              onRemove={(v) => removeFromList("allowedChannels", v)}
              placeholder="Channel ID"
              icon={<Hash className="w-4 h-4" />}
              testIdPrefix="allowed-channels"
            />
            <PermissionListEditor
              label="Blocked Channels"
              description="Command won't work in these channels"
              items={form.blockedChannels}
              onAdd={(v) => addToList("blockedChannels", v)}
              onRemove={(v) => removeFromList("blockedChannels", v)}
              placeholder="Channel ID"
              icon={<Hash className="w-4 h-4" />}
              testIdPrefix="blocked-channels"
            />
          </TabsContent>

          <TabsContent value="preview" className="space-y-4 pt-4">
            <Card className="bg-[#313338] border-0 rounded-lg overflow-visible">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#5865F2] flex items-center justify-center text-white font-bold text-sm shrink-0">
                    NB
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-semibold text-sm">Archivist</span>
                      <Badge variant="secondary" className="text-[10px] bg-[#5865F2] text-white no-default-active-elevate">BOT</Badge>
                      <span className="text-[#949BA4] text-xs">Today at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {(form.responseType === "text" || form.responseType === "both") && (
                      <p className="text-[#DBDEE1] text-sm whitespace-pre-wrap" data-testid="text-preview-response">
                        {resolvePreview(form.response || "No response set")}
                      </p>
                    )}
                    {(form.responseType === "embed" || form.responseType === "both") && form.embedResponse && (
                      <div
                        className="mt-1 rounded-md overflow-visible max-w-[400px]"
                        style={{ borderLeft: `4px solid ${form.embedResponse.color || "#5865F2"}` }}
                      >
                        <div className="bg-[#2B2D31] p-3 space-y-1">
                          {form.embedResponse.title && (
                            <p className="text-white font-semibold text-sm" data-testid="text-preview-embed-title">
                              {resolvePreview(form.embedResponse.title)}
                            </p>
                          )}
                          {form.embedResponse.description && (
                            <p className="text-[#DBDEE1] text-sm" data-testid="text-preview-embed-desc">
                              {resolvePreview(form.embedResponse.description)}
                            </p>
                          )}
                          {form.embedResponse.footer && (
                            <p className="text-[#949BA4] text-xs pt-1" data-testid="text-preview-embed-footer">
                              {resolvePreview(form.embedResponse.footer)}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="rounded-lg border border-white/5 bg-background/50 p-4 space-y-2">
              <h4 className="text-sm font-medium">Command Info</h4>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <span>Name: <span className="text-foreground font-mono">!{form.name || "unnamed"}</span></span>
                <span>Type: <span className="text-foreground">{form.responseType}</span></span>
                <span>Cooldown: <span className="text-foreground">{form.cooldown}s</span></span>
                <span>Enabled: <span className="text-foreground">{form.enabled ? "Yes" : "No"}</span></span>
                <span>Aliases: <span className="text-foreground">{form.aliases.length > 0 ? form.aliases.join(", ") : "None"}</span></span>
                <span>DM: <span className="text-foreground">{form.dmResponse ? "Yes" : "No"}</span></span>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="pt-4 gap-2 flex-wrap">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-command">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending} className="gap-2" data-testid="button-save-command">
            <Save className="w-4 h-4" />
            {isPending ? "Saving..." : mode === "edit" ? "Save Changes" : "Create Command"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VariableReference() {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="border border-white/5 bg-background/30">
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Variable className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm">Variable Reference</CardTitle>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
        <CardDescription className="text-xs">Click to {expanded ? "collapse" : "expand"} available variables</CardDescription>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {VARIABLES.map((group) => (
              <div key={group.category} className="space-y-1">
                <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{group.category}</h5>
                {group.items.map((item) => (
                  <div key={item.var} className="flex items-center justify-between gap-2 text-xs py-0.5">
                    <code className="font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">{item.var}</code>
                    <span className="text-muted-foreground text-right">{item.desc}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function HttpActionEditor({
  config,
  onChange,
}: {
  config: HttpActionConfig;
  onChange: (cfg: HttpActionConfig) => void;
}) {
  const [testResult, setTestResult] = useState<{ status: number; body: string } | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);

  function updateConfig(partial: Partial<HttpActionConfig>) {
    onChange({ ...config, ...partial });
  }

  function addHeader() {
    onChange({ ...config, headers: [...config.headers, { key: "", value: "" }] });
  }

  function updateHeader(index: number, field: keyof HttpHeader, value: string) {
    const headers = [...config.headers];
    headers[index] = { ...headers[index], [field]: value };
    updateConfig({ headers });
  }

  function removeHeader(index: number) {
    updateConfig({ headers: config.headers.filter((_, i) => i !== index) });
  }

  function addResponseMapping() {
    onChange({ ...config, responseMapping: [...config.responseMapping, { jsonPath: "", saveAs: "" }] });
  }

  function updateResponseMapping(index: number, field: keyof ResponseMapping, value: string) {
    const mappings = [...config.responseMapping];
    mappings[index] = { ...mappings[index], [field]: value };
    updateConfig({ responseMapping: mappings });
  }

  function removeResponseMapping(index: number) {
    updateConfig({ responseMapping: config.responseMapping.filter((_, i) => i !== index) });
  }

  async function testRequest() {
    if (!config.url) {
      setTestError("URL is required");
      return;
    }
    setTestLoading(true);
    setTestResult(null);
    setTestError(null);
    try {
      const headersObj: Record<string, string> = {};
      config.headers.forEach(h => { if (h.key) headersObj[h.key] = h.value; });

      const opts: RequestInit = {
        method: config.method,
        headers: headersObj,
      };
      if (config.method !== "GET" && config.method !== "DELETE" && config.body) {
        opts.body = config.body;
        headersObj["Content-Type"] = headersObj["Content-Type"] || "application/json";
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), config.timeout || 5000);
      const resp = await fetch(config.url, { ...opts, signal: controller.signal });
      clearTimeout(timer);
      const text = await resp.text();
      let body = text;
      try { body = JSON.stringify(JSON.parse(text), null, 2); } catch (_) {}
      setTestResult({ status: resp.status, body });
    } catch (err: any) {
      setTestError(err.name === "AbortError" ? "Request timed out" : err.message || "Request failed");
    } finally {
      setTestLoading(false);
    }
  }

  const HTTP_EXAMPLES = [
    { label: "Weather API", hint: "https://wttr.in/London?format=j1" },
    { label: "Crypto Price", hint: "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd" },
    { label: "Random Quote", hint: "https://api.quotable.io/random" },
    { label: "Minecraft Status", hint: "https://api.mcsrvstat.us/2/{args.0}" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 rounded-lg border border-white/5 bg-background/50 p-4">
        <div className="space-y-0.5">
          <Label>Enable HTTP Request Action</Label>
          <p className="text-xs text-muted-foreground">
            Fire an HTTP request when this command is invoked. Use response values in the reply.
          </p>
        </div>
        <Switch
          checked={config.enabled}
          onCheckedChange={(v) => updateConfig({ enabled: v })}
          data-testid="switch-http-enabled"
        />
      </div>

      {!config.enabled && (
        <div className="rounded-lg border border-white/5 bg-background/30 p-4 space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Example use cases:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {HTTP_EXAMPLES.map(ex => (
              <button
                key={ex.label}
                onClick={() => { updateConfig({ enabled: true, url: ex.hint, method: "GET" }); }}
                className="text-left rounded-md border border-white/5 bg-background/50 p-3 hover-elevate transition-colors"
                data-testid={`button-http-example-${ex.label.toLowerCase().replace(/\s/g, "-")}`}
              >
                <p className="text-xs font-medium text-foreground">{ex.label}</p>
                <p className="text-xs text-muted-foreground font-mono truncate mt-0.5">{ex.hint}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {config.enabled && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-1 space-y-2">
              <Label>Method</Label>
              <Select value={config.method} onValueChange={(v) => updateConfig({ method: v })}>
                <SelectTrigger className="bg-background" data-testid="select-http-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="PATCH">PATCH</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-3 space-y-2">
              <Label>URL</Label>
              <Input
                value={config.url}
                onChange={(e) => updateConfig({ url: e.target.value })}
                placeholder="https://api.example.com/endpoint?key={var.server.api_key}"
                className="bg-background font-mono text-sm"
                data-testid="input-http-url"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Timeout (ms)</Label>
            <Input
              type="number"
              min={500}
              max={30000}
              value={config.timeout}
              onChange={(e) => updateConfig({ timeout: parseInt(e.target.value) || 5000 })}
              className="bg-background w-40"
              data-testid="input-http-timeout"
            />
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Label>Request Headers</Label>
              <Button variant="outline" size="sm" onClick={addHeader} data-testid="button-add-header">
                <Plus className="w-3 h-3 mr-1" /> Add Header
              </Button>
            </div>
            {config.headers.length === 0 ? (
              <p className="text-xs text-muted-foreground">No custom headers. Common ones: Authorization, Content-Type.</p>
            ) : (
              <div className="space-y-2">
                {config.headers.map((header, i) => (
                  <div key={i} className="flex items-center gap-2" data-testid={`row-header-${i}`}>
                    <Input
                      value={header.key}
                      onChange={(e) => updateHeader(i, "key", e.target.value)}
                      placeholder="Header-Name"
                      className="bg-background font-mono text-xs flex-1"
                      data-testid={`input-header-key-${i}`}
                    />
                    <Input
                      value={header.value}
                      onChange={(e) => updateHeader(i, "value", e.target.value)}
                      placeholder="value or {var.server.token}"
                      className="bg-background font-mono text-xs flex-1"
                      data-testid={`input-header-value-${i}`}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeHeader(i)}
                      data-testid={`button-remove-header-${i}`}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {(config.method === "POST" || config.method === "PUT" || config.method === "PATCH") && (
            <div className="space-y-2">
              <Label>Request Body (JSON)</Label>
              <Textarea
                value={config.body}
                onChange={(e) => updateConfig({ body: e.target.value })}
                placeholder={'{"key": "{args.0}", "user": "{user.id}"}'}
                className="bg-background font-mono text-xs min-h-[100px]"
                data-testid="input-http-body"
              />
              <p className="text-xs text-muted-foreground">You can use variables like {"{user}"}, {"{args.0}"}, {"{var.server.key}"} in the body.</p>
            </div>
          )}

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <Label>Response Mapping</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Extract values from the JSON response. Use {"{response.fieldname}"} in the command reply.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={addResponseMapping} data-testid="button-add-mapping">
                <Plus className="w-3 h-3 mr-1" /> Add Mapping
              </Button>
            </div>
            {config.responseMapping.length === 0 ? (
              <p className="text-xs text-muted-foreground">No mappings configured. Add one to extract fields from the response.</p>
            ) : (
              <div className="space-y-2">
                {config.responseMapping.map((mapping, i) => (
                  <div key={i} className="flex items-center gap-2" data-testid={`row-mapping-${i}`}>
                    <div className="flex-1 space-y-1">
                      <Input
                        value={mapping.jsonPath}
                        onChange={(e) => updateResponseMapping(i, "jsonPath", e.target.value)}
                        placeholder="data.price (dot-notation JSON path)"
                        className="bg-background font-mono text-xs"
                        data-testid={`input-mapping-path-${i}`}
                      />
                    </div>
                    <span className="text-muted-foreground text-xs shrink-0">→</span>
                    <div className="flex-1 space-y-1">
                      <Input
                        value={mapping.saveAs}
                        onChange={(e) => updateResponseMapping(i, "saveAs", e.target.value)}
                        placeholder="price (use as {response.price})"
                        className="bg-background font-mono text-xs"
                        data-testid={`input-mapping-name-${i}`}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeResponseMapping(i)}
                      data-testid={`button-remove-mapping-${i}`}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Label>Test Request</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={testRequest}
                disabled={testLoading || !config.url}
                className="gap-2"
                data-testid="button-test-request"
              >
                <Play className="w-3 h-3" />
                {testLoading ? "Sending..." : "Send Test Request"}
              </Button>
            </div>

            {testError && (
              <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/20 p-3 text-xs" data-testid="text-test-error">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <span className="text-destructive">{testError}</span>
              </div>
            )}

            {testResult && (
              <div className="space-y-2" data-testid="div-test-result">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={testResult.status >= 200 && testResult.status < 300 ? "default" : "destructive"}
                    className="text-xs"
                  >
                    {testResult.status >= 200 && testResult.status < 300
                      ? <Check className="w-3 h-3 mr-1" />
                      : <AlertCircle className="w-3 h-3 mr-1" />}
                    HTTP {testResult.status}
                  </Badge>
                </div>
                <pre
                  className="rounded-md bg-background border border-white/5 p-3 text-xs font-mono overflow-auto max-h-[200px] text-muted-foreground"
                  data-testid="pre-test-response"
                >
                  {testResult.body}
                </pre>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function PermissionListEditor({
  label, description, items, onAdd, onRemove, placeholder, icon, testIdPrefix
}: {
  label: string;
  description: string;
  items: string[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
  placeholder: string;
  icon: JSX.Element;
  testIdPrefix: string;
}) {
  const [input, setInput] = useState("");

  function handleAdd() {
    if (input.trim()) {
      onAdd(input.trim());
      setInput("");
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-white/5 bg-background/50 p-4">
      <div className="flex items-center gap-2">
        {icon}
        <div>
          <Label className="text-sm">{label}</Label>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          className="bg-background flex-1"
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
          data-testid={`input-${testIdPrefix}`}
        />
        <Button variant="outline" size="sm" onClick={handleAdd} data-testid={`button-add-${testIdPrefix}`}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {items.map(item => (
            <Badge key={item} variant="secondary" className="gap-1">
              {item}
              <button onClick={() => onRemove(item)}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
