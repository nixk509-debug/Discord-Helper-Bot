import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Trash2, CheckCircle2, XCircle, Search } from "lucide-react";

interface Props {
  serverId: number;
}

type PermissionRule = {
  id: number;
  roleId: string;
  roleName: string | null;
  permission: string;
  effect: string;
  priority: number;
  createdAt: string;
};

export function PermissionsTab({ serverId }: Props) {
  const { toast } = useToast();
  const [roleId, setRoleId] = useState("");
  const [roleName, setRoleName] = useState("");
  const [permission, setPermission] = useState("");
  const [effect, setEffect] = useState("allow");
  const [priority, setPriority] = useState("0");

  const [testRoleIds, setTestRoleIds] = useState("");
  const [testPermission, setTestPermission] = useState("");
  const [testResult, setTestResult] = useState<{ allowed: boolean; reason: string } | null>(null);

  const { data: rules = [], isLoading } = useQuery<PermissionRule[]>({
    queryKey: ["/api/servers", serverId, "permissions"],
    queryFn: () => fetch(`/api/servers/${serverId}/permissions`).then(r => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/servers/${serverId}/permissions`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/servers", serverId, "permissions"] });
      setRoleId(""); setRoleName(""); setPermission(""); setEffect("allow"); setPriority("0");
      toast({ title: "Permission rule added" });
    },
    onError: () => toast({ title: "Failed to add rule", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/servers/${serverId}/permissions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/servers", serverId, "permissions"] });
      toast({ title: "Rule deleted" });
    },
  });

  const checkMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/servers/${serverId}/permissions/check`, data),
    onSuccess: (data: any) => setTestResult(data),
    onError: () => toast({ title: "Check failed", variant: "destructive" }),
  });

  const handleCreate = () => {
    if (!roleId || !permission) return;
    createMutation.mutate({ roleId, roleName: roleName || undefined, permission, effect, priority: parseInt(priority) || 0 });
  };

  const handleTest = () => {
    const ids = testRoleIds.split(",").map(s => s.trim()).filter(Boolean);
    if (!ids.length || !testPermission) return;
    checkMutation.mutate({ roleIds: ids, permission: testPermission });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold gradient-brand" data-testid="text-permissions-heading">Smart Permissions</h2>
        <p className="text-muted-foreground text-sm mt-1">Priority-based role permission rules. Deny always overrides allow.</p>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-display">Add Permission Rule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Role ID</Label>
              <Input value={roleId} onChange={e => setRoleId(e.target.value)} placeholder="Discord Role ID" data-testid="input-rule-role-id" />
            </div>
            <div className="space-y-2">
              <Label>Role Name (display)</Label>
              <Input value={roleName} onChange={e => setRoleName(e.target.value)} placeholder="@Moderator" data-testid="input-rule-role-name" />
            </div>
            <div className="space-y-2">
              <Label>Permission</Label>
              <Input value={permission} onChange={e => setPermission(e.target.value)} placeholder="module.commands.edit" data-testid="input-rule-permission" />
            </div>
            <div className="space-y-2">
              <Label>Effect</Label>
              <Select value={effect} onValueChange={setEffect}>
                <SelectTrigger data-testid="select-rule-effect">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="allow">Allow</SelectItem>
                  <SelectItem value="deny">Deny</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority (higher = checked first)</Label>
              <Input value={priority} onChange={e => setPriority(e.target.value)} type="number" placeholder="0" data-testid="input-rule-priority" />
            </div>
          </div>
          <Button
            onClick={handleCreate}
            disabled={!roleId || !permission || createMutation.isPending}
            className="gap-2 gradient-brand text-white"
            data-testid="button-add-rule"
          >
            <Plus className="w-4 h-4" />
            {createMutation.isPending ? "Adding…" : "Add Rule"}
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-display">Rules ({rules.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-12 rounded-md bg-white/5 animate-pulse" />)}</div>
          ) : rules.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">No rules yet. Add your first rule above.</p>
          ) : (
            <div className="space-y-2">
              {rules.map(rule => (
                <div key={rule.id} className="flex items-center justify-between rounded-lg border border-white/10 p-3" data-testid={`row-rule-${rule.id}`}>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-medium">{rule.roleName || <code className="font-mono text-xs">{rule.roleId}</code>}</span>
                    <Badge variant="outline" className="font-mono text-xs">{rule.permission}</Badge>
                    <Badge className={rule.effect === "allow" ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"} data-testid={`status-effect-${rule.id}`}>
                      {rule.effect === "allow" ? <CheckCircle2 className="w-3 h-3 mr-1 inline" /> : <XCircle className="w-3 h-3 mr-1 inline" />}
                      {rule.effect}
                    </Badge>
                    <span className="text-xs text-muted-foreground">p{rule.priority}</span>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="text-red-400" data-testid={`button-delete-rule-${rule.id}`}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Rule?</AlertDialogTitle>
                        <AlertDialogDescription>Rule for {rule.roleName || rule.roleId} on "{rule.permission}" will be permanently removed.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteMutation.mutate(rule.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
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
          <CardTitle className="font-display flex items-center gap-2"><Search className="w-4 h-4" /> Permission Tester</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Role IDs (comma-separated)</Label>
              <Input value={testRoleIds} onChange={e => setTestRoleIds(e.target.value)} placeholder="Role IDs to test" data-testid="input-test-role-ids" />
            </div>
            <div className="space-y-2">
              <Label>Permission to check</Label>
              <Input value={testPermission} onChange={e => setTestPermission(e.target.value)} placeholder="module.commands.edit" data-testid="input-test-permission" />
            </div>
          </div>
          <Button onClick={handleTest} disabled={checkMutation.isPending} variant="outline" className="gap-2" data-testid="button-test-permission">
            <Search className="w-4 h-4" />
            {checkMutation.isPending ? "Checking…" : "Check Permission"}
          </Button>
          {testResult && (
            <div className={`rounded-lg border p-4 ${testResult.allowed ? "border-green-500/30 bg-green-500/10" : "border-red-500/30 bg-red-500/10"}`} data-testid="text-test-result">
              <div className="flex items-center gap-2 mb-1">
                {testResult.allowed ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <XCircle className="w-5 h-5 text-red-400" />}
                <span className={`font-semibold ${testResult.allowed ? "text-green-400" : "text-red-400"}`}>
                  {testResult.allowed ? "Allowed" : "Denied"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{testResult.reason}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
