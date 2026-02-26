import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Copy, Gift, RefreshCw, XCircle, CheckCircle, Clock, Key } from "lucide-react";

interface Props {
  serverId: number;
}

type Code = {
  id: number;
  code: string;
  format: string;
  usesCount: number;
  maxUses: number | null;
  expiresAt: string | null;
  tags: string[];
  grantRoles: string[];
  revoked: boolean;
  createdAt: string;
};

function getCodeStatus(code: Code): { label: string; color: string } {
  if (code.revoked) return { label: "Revoked", color: "bg-red-500/20 text-red-400 border-red-500/30" };
  if (code.expiresAt && new Date() > new Date(code.expiresAt)) return { label: "Expired", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" };
  return { label: "Active", color: "bg-green-500/20 text-green-400 border-green-500/30" };
}

export function CodesTab({ serverId }: Props) {
  const { toast } = useToast();
  const [format, setFormat] = useState("plain");
  const [maxUses, setMaxUses] = useState("");
  const [expiresHours, setExpiresHours] = useState("");
  const [grantRoles, setGrantRoles] = useState("");
  const [tags, setTags] = useState("");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  const { data: codes = [], isLoading } = useQuery<Code[]>({
    queryKey: ["/api/servers", serverId, "codes"],
    queryFn: () => fetch(`/api/servers/${serverId}/codes`).then(r => r.json()),
  });

  const generateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/servers/${serverId}/codes/generate`, data),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/servers", serverId, "codes"] });
      setGeneratedCode(data.code);
      toast({ title: "Code generated!", description: `Code: ${data.code}` });
    },
    onError: () => toast({ title: "Failed to generate code", variant: "destructive" }),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/servers/${serverId}/codes/${id}/revoke`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/servers", serverId, "codes"] });
      toast({ title: "Code revoked" });
    },
  });

  const handleGenerate = () => {
    generateMutation.mutate({
      format,
      maxUses: maxUses ? parseInt(maxUses) : undefined,
      expiresHours: expiresHours ? parseInt(expiresHours) : undefined,
      grantRoles: grantRoles.split(",").map(s => s.trim()).filter(Boolean),
      tags: tags.split(",").map(s => s.trim()).filter(Boolean),
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard!" });
  };

  const activeCodes = codes.filter(c => !c.revoked && (!c.expiresAt || new Date() <= new Date(c.expiresAt)));
  const redeemedCodes = codes.filter(c => (c.usesCount ?? 0) > 0);
  const expiredCodes = codes.filter(c => c.expiresAt && new Date() > new Date(c.expiresAt));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold gradient-brand" data-testid="text-codes-heading">Code Vault</h2>
        <p className="text-muted-foreground text-sm mt-1">Generate invite codes that grant roles when redeemed. Use /code redeem in Discord.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Key, label: "Total", value: codes.length, color: "text-primary" },
          { icon: CheckCircle, label: "Active", value: activeCodes.length, color: "text-green-400" },
          { icon: Gift, label: "Redeemed", value: redeemedCodes.length, color: "text-blue-400" },
          { icon: Clock, label: "Expired", value: expiredCodes.length, color: "text-yellow-400" },
        ].map(({ icon: Icon, label, value, color }) => (
          <Card key={label} className="glass-card" data-testid={`card-stat-${label.toLowerCase()}`}>
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className={`w-8 h-8 ${color} shrink-0`} />
              <div>
                <p className="text-2xl font-display font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-display">Generate Code</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Format</Label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger data-testid="select-code-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="plain">Plain (ABCD1234)</SelectItem>
                  <SelectItem value="grouped">Grouped (ABCD-1234-EFGH)</SelectItem>
                  <SelectItem value="prefixed">Prefixed (AX-XXXXXX)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Max Uses (blank = unlimited)</Label>
              <Input value={maxUses} onChange={e => setMaxUses(e.target.value)} type="number" min="1" placeholder="Unlimited" data-testid="input-max-uses" />
            </div>
            <div className="space-y-2">
              <Label>Expires After (hours)</Label>
              <Input value={expiresHours} onChange={e => setExpiresHours(e.target.value)} type="number" min="1" placeholder="Never" data-testid="input-expires-hours" />
            </div>
            <div className="space-y-2">
              <Label>Grant Role IDs (comma-sep)</Label>
              <Input value={grantRoles} onChange={e => setGrantRoles(e.target.value)} placeholder="Role IDs to grant" data-testid="input-grant-roles" />
            </div>
            <div className="space-y-2">
              <Label>Tags (comma-sep)</Label>
              <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="event, giveaway" data-testid="input-tags" />
            </div>
          </div>

          {generatedCode && (
            <div className="flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/10 p-3">
              <code className="font-mono text-lg text-green-400 font-bold tracking-wider" data-testid="text-generated-code">{generatedCode}</code>
              <Button size="sm" variant="ghost" onClick={() => copyToClipboard(generatedCode)} data-testid="button-copy-code">
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          )}

          <Button onClick={handleGenerate} disabled={generateMutation.isPending} className="gradient-brand text-white" data-testid="button-generate-code">
            {generateMutation.isPending ? "Generating…" : "Generate Code"}
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-display">All Codes ({codes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-12 rounded-md bg-white/5 animate-pulse" />)}</div>
          ) : codes.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">No codes yet. Generate your first code above.</p>
          ) : (
            <div className="space-y-2">
              {codes.map(code => {
                const status = getCodeStatus(code);
                return (
                  <div key={code.id} className="flex items-center justify-between rounded-lg border border-white/10 p-3" data-testid={`row-code-${code.id}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <code className="font-mono text-sm font-bold text-primary shrink-0">{code.code}</code>
                      <Badge className={`text-xs ${status.color}`} data-testid={`status-code-${code.id}`}>{status.label}</Badge>
                      <span className="text-xs text-muted-foreground shrink-0">{code.usesCount}/{code.maxUses ?? "∞"}</span>
                      {(code.tags as string[]).length > 0 && (
                        <div className="flex gap-1">
                          {(code.tags as string[]).map(tag => <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>)}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => copyToClipboard(code.code)} data-testid={`button-copy-code-${code.id}`}>
                        <Copy className="w-3 h-3" />
                      </Button>
                      {!code.revoked && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300" data-testid={`button-revoke-${code.id}`}>
                              <XCircle className="w-3 h-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Revoke Code?</AlertDialogTitle>
                              <AlertDialogDescription>Code <code className="font-mono">{code.code}</code> will be permanently revoked and cannot be redeemed.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => revokeMutation.mutate(code.id)} className="bg-destructive text-destructive-foreground">Revoke</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
