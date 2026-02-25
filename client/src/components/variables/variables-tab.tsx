import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Database,
  Plus,
  Trash2,
  Search,
  X,
  Edit3,
  Save,
  Info,
  Copy,
  Check,
} from "lucide-react";
import type { ServerVariable } from "@shared/schema";

interface VariablesTabProps {
  serverId: number;
}

export function VariablesTab({ serverId }: VariablesTabProps) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [scopeFilter, setScopeFilter] = useState("all");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [copiedVar, setCopiedVar] = useState<string | null>(null);

  const [newVar, setNewVar] = useState({ scope: "server", userId: "", key: "", value: "" });
  const [showAddForm, setShowAddForm] = useState(false);

  const { data: variables = [], isLoading } = useQuery<ServerVariable[]>({
    queryKey: ["/api/servers", serverId, "variables"],
    queryFn: () => fetch(`/api/servers/${serverId}/variables`).then(r => r.json()),
  });

  const setVariableMutation = useMutation({
    mutationFn: (data: { scope: string; userId?: string; key: string; value: string }) =>
      apiRequest("PUT", `/api/servers/${serverId}/variables`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/servers", serverId, "variables"] });
      toast({ title: "Variable saved", description: "Variable has been updated." });
      setEditingId(null);
      setShowAddForm(false);
      setNewVar({ scope: "server", userId: "", key: "", value: "" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save variable.", variant: "destructive" });
    },
  });

  const deleteVariableMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/servers/${serverId}/variables/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/servers", serverId, "variables"] });
      toast({ title: "Variable deleted", description: "Variable has been removed." });
    },
  });

  const filtered = useMemo(() => {
    let result = [...variables];
    if (scopeFilter !== "all") result = result.filter(v => v.scope === scopeFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(v =>
        v.key.toLowerCase().includes(q) ||
        v.value.toLowerCase().includes(q) ||
        (v.userId && v.userId.toLowerCase().includes(q))
      );
    }
    return result;
  }, [variables, search, scopeFilter]);

  function startEdit(v: ServerVariable) {
    setEditingId(v.id);
    setEditValue(v.value);
  }

  function saveEdit(v: ServerVariable) {
    setVariableMutation.mutate({ scope: v.scope, userId: v.userId || undefined, key: v.key, value: editValue });
  }

  function addVariable() {
    if (!newVar.key.trim() || !newVar.value.trim()) {
      toast({ title: "Error", description: "Key and value are required.", variant: "destructive" });
      return;
    }
    if (newVar.scope === "user" && !newVar.userId.trim()) {
      toast({ title: "Error", description: "User ID is required for user-scoped variables.", variant: "destructive" });
      return;
    }
    setVariableMutation.mutate({
      scope: newVar.scope,
      userId: newVar.scope === "user" ? newVar.userId : undefined,
      key: newVar.key,
      value: newVar.value,
    });
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopiedVar(text);
    setTimeout(() => setCopiedVar(null), 2000);
  }

  function getVariableRef(v: ServerVariable) {
    if (v.scope === "user") return `{var.user.${v.key}}`;
    return `{var.server.${v.key}}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-display font-bold text-glow" data-testid="text-variables-title">
            Variable Storage
          </h2>
          <p className="text-muted-foreground text-sm">
            Persistent key-value store. Use variables in commands and automations.
          </p>
        </div>
        <Button
          className="gap-2"
          onClick={() => setShowAddForm(!showAddForm)}
          data-testid="button-add-variable"
        >
          <Plus className="w-4 h-4" />
          Add Variable
        </Button>
      </div>

      <Card className="glass-card border-primary/20 bg-primary/5">
        <CardContent className="pt-4 pb-4">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm">
              <p className="font-medium text-foreground">How to use variables in commands</p>
              <div className="space-y-1 text-muted-foreground">
                <p>
                  <code className="font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded text-xs">{`{var.server.mykey}`}</code>
                  {" "}— Access a server-scoped variable by key
                </p>
                <p>
                  <code className="font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded text-xs">{`{var.user.mykey}`}</code>
                  {" "}— Access a user-scoped variable (specific to the command invoker)
                </p>
                <p>
                  <code className="font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded text-xs">{`{response.fieldname}`}</code>
                  {" "}— Access a value extracted from an HTTP request response
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {showAddForm && (
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-display">New Variable</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Scope</Label>
                <Select
                  value={newVar.scope}
                  onValueChange={(v) => setNewVar(p => ({ ...p, scope: v }))}
                >
                  <SelectTrigger className="bg-background" data-testid="select-new-variable-scope">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="server">Server</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newVar.scope === "user" && (
                <div className="space-y-2">
                  <Label>User ID</Label>
                  <Input
                    value={newVar.userId}
                    onChange={(e) => setNewVar(p => ({ ...p, userId: e.target.value }))}
                    placeholder="Discord User ID"
                    className="bg-background"
                    data-testid="input-new-variable-userid"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Key</Label>
                <Input
                  value={newVar.key}
                  onChange={(e) => setNewVar(p => ({ ...p, key: e.target.value.replace(/\s/g, "_").toLowerCase() }))}
                  placeholder="my_variable_key"
                  className="bg-background font-mono"
                  data-testid="input-new-variable-key"
                />
              </div>
              <div className="space-y-2">
                <Label>Value</Label>
                <Input
                  value={newVar.value}
                  onChange={(e) => setNewVar(p => ({ ...p, value: e.target.value }))}
                  placeholder="value"
                  className="bg-background"
                  data-testid="input-new-variable-value"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={addVariable}
                disabled={setVariableMutation.isPending}
                className="gap-2"
                data-testid="button-save-new-variable"
              >
                <Save className="w-4 h-4" />
                {setVariableMutation.isPending ? "Saving..." : "Save Variable"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => { setShowAddForm(false); setNewVar({ scope: "server", userId: "", key: "", value: "" }); }}
                data-testid="button-cancel-add-variable"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search variables..."
            className="pl-9 bg-background"
            data-testid="input-search-variables"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
        <Select value={scopeFilter} onValueChange={setScopeFilter}>
          <SelectTrigger className="w-[140px] bg-background" data-testid="select-scope-filter">
            <SelectValue placeholder="All Scopes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Scopes</SelectItem>
            <SelectItem value="server">Server</SelectItem>
            <SelectItem value="user">User</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Card className="glass-card">
          <CardContent className="p-4 space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full bg-white/5" />)}
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <Database className="w-12 h-12 text-muted-foreground/50" />
            <h3 className="text-lg font-display font-bold" data-testid="text-no-variables">
              {search || scopeFilter !== "all" ? "No matching variables" : "No variables yet"}
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              {search || scopeFilter !== "all"
                ? "Try adjusting your filters."
                : "Add your first variable to use persistent storage in commands and automations."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="glass-card overflow-visible">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="table-variables">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="p-3 text-left font-medium text-muted-foreground">Scope</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Key</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Value</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Reference</th>
                  <th className="p-3 text-left font-medium text-muted-foreground">Updated</th>
                  <th className="p-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => (
                  <tr key={v.id} className="border-b border-white/5 group" data-testid={`row-variable-${v.id}`}>
                    <td className="p-3">
                      <Badge
                        variant={v.scope === "server" ? "default" : "secondary"}
                        className="text-xs"
                        data-testid={`badge-scope-${v.id}`}
                      >
                        {v.scope}
                      </Badge>
                      {v.scope === "user" && v.userId && (
                        <p className="text-xs text-muted-foreground mt-1 font-mono">{v.userId}</p>
                      )}
                    </td>
                    <td className="p-3">
                      <code className="font-mono text-primary text-xs" data-testid={`text-variable-key-${v.id}`}>
                        {v.key}
                      </code>
                    </td>
                    <td className="p-3 max-w-[200px]">
                      {editingId === v.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="bg-background text-xs h-8"
                            data-testid={`input-edit-variable-${v.id}`}
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 shrink-0"
                            onClick={() => saveEdit(v)}
                            disabled={setVariableMutation.isPending}
                            data-testid={`button-save-edit-${v.id}`}
                          >
                            <Save className="w-3 h-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 shrink-0"
                            onClick={() => setEditingId(null)}
                            data-testid={`button-cancel-edit-${v.id}`}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <span
                          className="truncate block text-muted-foreground text-xs"
                          data-testid={`text-variable-value-${v.id}`}
                        >
                          {v.value}
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <code
                          className="font-mono text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded text-xs"
                          data-testid={`text-variable-ref-${v.id}`}
                        >
                          {getVariableRef(v)}
                        </code>
                        <button
                          onClick={() => copyToClipboard(getVariableRef(v))}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          data-testid={`button-copy-ref-${v.id}`}
                        >
                          {copiedVar === getVariableRef(v)
                            ? <Check className="w-3 h-3 text-green-500" />
                            : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                      {v.updatedAt ? new Date(v.updatedAt).toLocaleString() : "-"}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => startEdit(v)}
                          data-testid={`button-edit-variable-${v.id}`}
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground invisible group-hover:visible"
                          onClick={() => {
                            if (confirm(`Delete variable "${v.key}"?`)) {
                              deleteVariableMutation.mutate(v.id);
                            }
                          }}
                          disabled={deleteVariableMutation.isPending}
                          data-testid={`button-delete-variable-${v.id}`}
                        >
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
      )}

      {variables.length > 0 && (
        <div className="text-xs text-muted-foreground text-right">
          {filtered.length} of {variables.length} variable{variables.length !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}
