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
  Edit3, ToggleLeft, ToggleRight, CheckSquare, Power
} from "lucide-react";
import type { CustomCommand } from "@shared/schema";

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
}

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
        <Button className="gap-2" onClick={() => setIsCreateOpen(true)} data-testid="button-new-command">
          <Plus className="w-4 h-4" /> New Command
        </Button>
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
    </div>
  );
}

function CommandCard({
  command, selected, onToggleSelect, onToggleEnabled, onEdit, onDelete, isPending
}: {
  command: CustomCommand;
  selected: boolean;
  onToggleSelect: () => void;
  onToggleEnabled: () => void;
  onEdit: () => void;
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
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="basic" data-testid="tab-basic">
              <Terminal className="w-4 h-4 mr-1" /> Basic
            </TabsTrigger>
            <TabsTrigger value="response" data-testid="tab-response">
              <MessageSquare className="w-4 h-4 mr-1" /> Response
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
              <Card className="border border-white/5 bg-background/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Embed Response</CardTitle>
                  <CardDescription className="text-xs">Configure the embed fields for this command's response.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Embed Title</Label>
                      <Input
                        value={form.embedResponse?.title || ""}
                        onChange={(e) => updateField("embedResponse", { ...form.embedResponse, title: e.target.value })}
                        placeholder="Embed title"
                        className="bg-background"
                        data-testid="input-embed-title"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Color</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={form.embedResponse?.color || "#5865F2"}
                          onChange={(e) => updateField("embedResponse", { ...form.embedResponse, color: e.target.value })}
                          className="w-9 h-9 rounded border-0 bg-transparent cursor-pointer"
                          data-testid="input-embed-color"
                        />
                        <Input
                          value={form.embedResponse?.color || "#5865F2"}
                          onChange={(e) => updateField("embedResponse", { ...form.embedResponse, color: e.target.value })}
                          className="bg-background flex-1"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Embed Description</Label>
                    <Textarea
                      value={form.embedResponse?.description || ""}
                      onChange={(e) => updateField("embedResponse", { ...form.embedResponse, description: e.target.value })}
                      placeholder="Embed description with {user} variables"
                      className="bg-background min-h-[80px] font-mono text-sm"
                      data-testid="input-embed-description"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Footer Text</Label>
                      <Input
                        value={form.embedResponse?.footer || ""}
                        onChange={(e) => updateField("embedResponse", { ...form.embedResponse, footer: e.target.value })}
                        placeholder="Footer text"
                        className="bg-background"
                        data-testid="input-embed-footer"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Thumbnail URL</Label>
                      <Input
                        value={form.embedResponse?.thumbnail || ""}
                        onChange={(e) => updateField("embedResponse", { ...form.embedResponse, thumbnail: e.target.value })}
                        placeholder="https://..."
                        className="bg-background"
                        data-testid="input-embed-thumbnail"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <VariableReference />
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
                      <span className="text-white font-semibold text-sm">NexBot</span>
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
