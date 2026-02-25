import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useServers } from "@/hooks/use-bot";
import { apiRequest } from "@/lib/queryClient";
import {
  Store, Search, Download, Eye, Terminal, Zap, Shield, Gamepad2,
  Info, Star, TrendingUp, Clock, Copy, Check, X, ChevronRight
} from "lucide-react";

const CATEGORIES = ["All", "Moderation", "Fun", "Utility", "Info", "Economy", "Automation"];

const CATEGORY_ICONS: Record<string, any> = {
  All: Store,
  Moderation: Shield,
  Fun: Gamepad2,
  Utility: Zap,
  Info: Info,
  Economy: Star,
  Automation: Terminal,
};

function ShareCardSkeleton() {
  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-32 bg-white/5" />
        <Skeleton className="h-3 w-48 mt-2 bg-white/5" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-3 w-full bg-white/5" />
        <Skeleton className="h-3 w-3/4 bg-white/5" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16 bg-white/5" />
          <Skeleton className="h-5 w-20 bg-white/5" />
        </div>
      </CardContent>
    </Card>
  );
}

function ImportDialog({
  share,
  open,
  onOpenChange,
}: {
  share: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const { data: servers } = useServers();
  const [selectedServerId, setSelectedServerId] = useState<string>("");
  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/marketplace/${share.shareCode}/import`, {
        serverId: parseInt(selectedServerId),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Command imported!", description: `"${share.title}" has been added to your server.` });
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace"] });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-white/10">
        <DialogHeader>
          <DialogTitle className="font-display">Import Command</DialogTitle>
          <DialogDescription>
            Select a server to import <strong>{share?.title}</strong> into.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-lg border border-white/10 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <code className="font-mono text-primary bg-primary/10 px-2 py-1 rounded text-sm">
                !{share?.title?.toLowerCase().replace(/\s+/g, "")}
              </code>
              <Badge variant="outline" className="text-xs">{share?.category}</Badge>
            </div>
            {share?.description && (
              <p className="text-sm text-muted-foreground">{share.description}</p>
            )}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Download className="w-3 h-3" /> {share?.importCount || 0} imports
              </span>
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" /> {share?.viewCount || 0} views
              </span>
            </div>
          </div>
          <Select value={selectedServerId} onValueChange={setSelectedServerId}>
            <SelectTrigger className="bg-background" data-testid="select-import-server">
              <SelectValue placeholder="Select a server" />
            </SelectTrigger>
            <SelectContent>
              {servers?.map((s: any) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => importMutation.mutate()}
            disabled={!selectedServerId || importMutation.isPending}
            className="gap-2"
            data-testid="button-confirm-import"
          >
            <Download className="w-4 h-4" />
            {importMutation.isPending ? "Importing..." : "Import Command"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PreviewDialog({
  share,
  open,
  onOpenChange,
  onImport,
}: {
  share: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: () => void;
}) {
  const [copied, setCopied] = useState(false);

  function copyCode() {
    if (share?.shareCode) {
      navigator.clipboard.writeText(share.shareCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card border-white/10">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Terminal className="w-5 h-5 text-primary" />
            {share?.title}
          </DialogTitle>
          <DialogDescription>{share?.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{share?.category}</Badge>
            {(share?.tags || []).map((tag: string) => (
              <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
            ))}
          </div>

          <div className="rounded-lg border border-white/10 bg-background/50 p-4 space-y-3">
            <h4 className="text-sm font-semibold">Share Code</h4>
            <div className="flex items-center gap-2">
              <code className="font-mono text-primary bg-primary/10 px-3 py-1.5 rounded flex-1 text-sm">
                {share?.shareCode}
              </code>
              <Button variant="outline" size="icon" onClick={copyCode} data-testid="button-copy-code">
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg border border-white/10 p-3">
              <div className="text-lg font-bold text-primary">{share?.importCount || 0}</div>
              <div className="text-xs text-muted-foreground">Imports</div>
            </div>
            <div className="rounded-lg border border-white/10 p-3">
              <div className="text-lg font-bold text-primary">{share?.viewCount || 0}</div>
              <div className="text-xs text-muted-foreground">Views</div>
            </div>
            <div className="rounded-lg border border-white/10 p-3">
              <div className="text-lg font-bold text-primary">
                {share?.createdAt ? new Date(share.createdAt).toLocaleDateString("en", { month: "short", day: "numeric" }) : "-"}
              </div>
              <div className="text-xs text-muted-foreground">Posted</div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={onImport} className="gap-2" data-testid="button-preview-import">
            <Download className="w-4 h-4" /> Import to Server
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ShareCard({ share, onPreview, onImport }: { share: any; onPreview: () => void; onImport: () => void }) {
  const Icon = CATEGORY_ICONS[share.category] || Terminal;

  return (
    <Card
      className="glass-card hover-elevate cursor-pointer group"
      data-testid={`card-share-${share.id}`}
      onClick={onPreview}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center flex-shrink-0">
              <Icon className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm font-semibold truncate" data-testid={`text-share-title-${share.id}`}>
                {share.title}
              </CardTitle>
              <code className="font-mono text-primary text-xs">
                !{share.title?.toLowerCase().replace(/\s+/g, "")}
              </code>
            </div>
          </div>
          <Badge variant="outline" className="text-xs flex-shrink-0">{share.category}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {share.description && (
          <p className="text-xs text-muted-foreground line-clamp-2" data-testid={`text-share-desc-${share.id}`}>
            {share.description}
          </p>
        )}
        {share.tags && share.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {share.tags.slice(0, 3).map((tag: string) => (
              <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
            ))}
            {share.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">+{share.tags.length - 3}</Badge>
            )}
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Download className="w-3 h-3" /> {share.importCount || 0}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" /> {share.viewCount || 0}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onImport(); }}
            className="gap-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            data-testid={`button-import-${share.id}`}
          >
            <Download className="w-3 h-3" /> Import
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ImportByCodePanel() {
  const [code, setCode] = useState("");
  const [importing, setImporting] = useState(false);
  const { toast } = useToast();
  const { data: servers } = useServers();
  const [selectedServerId, setSelectedServerId] = useState<string>("");
  const queryClient = useQueryClient();

  async function handleImport() {
    if (!code.trim() || !selectedServerId) return;
    setImporting(true);
    try {
      const res = await apiRequest("POST", `/api/marketplace/${code.trim().toUpperCase()}/import`, {
        serverId: parseInt(selectedServerId),
      });
      await res.json();
      toast({ title: "Command imported!", description: "The command has been added to your server." });
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace"] });
      setCode("");
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <ChevronRight className="w-4 h-4 text-primary" />
          Import by Share Code
        </CardTitle>
        <CardDescription className="text-xs">
          Have a code? Paste it here to import directly.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. AB3X9KQY"
            className="font-mono bg-background flex-1"
            maxLength={8}
            data-testid="input-share-code"
          />
          <Select value={selectedServerId} onValueChange={setSelectedServerId}>
            <SelectTrigger className="w-[160px] bg-background" data-testid="select-code-import-server">
              <SelectValue placeholder="Server" />
            </SelectTrigger>
            <SelectContent>
              {servers?.map((s: any) => (
                <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleImport}
            disabled={!code.trim() || !selectedServerId || importing}
            className="gap-2"
            data-testid="button-import-by-code"
          >
            <Download className="w-4 h-4" />
            {importing ? "Importing..." : "Import"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MarketplacePage() {
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("most-imported");
  const [previewShare, setPreviewShare] = useState<any>(null);
  const [importShare, setImportShare] = useState<any>(null);

  const params = new URLSearchParams();
  if (category !== "All") params.set("category", category.toLowerCase());
  if (search) params.set("search", search);
  params.set("limit", "50");

  const { data: shares, isLoading } = useQuery<any[]>({
    queryKey: ["/api/marketplace", category, search],
    queryFn: async () => {
      const res = await fetch(`/api/marketplace?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch marketplace");
      return res.json();
    },
  });

  const sortedShares = [...(shares || [])].sort((a, b) => {
    if (sort === "most-imported") return (b.importCount || 0) - (a.importCount || 0);
    if (sort === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sort === "most-viewed") return (b.viewCount || 0) - (a.viewCount || 0);
    return 0;
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm font-medium">
            <Store className="w-4 h-4" />
            Command Marketplace
          </div>
          <h1 className="text-4xl font-display font-bold text-glow" data-testid="text-marketplace-title">
            Discover Commands
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Browse, share, and import custom commands created by the Archivist community. One click to add to your server.
          </p>
        </div>

        <ImportByCodePanel />

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search commands..."
                className="pl-9 bg-background"
                data-testid="input-marketplace-search"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-[180px] bg-background" data-testid="select-sort-marketplace">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="most-imported">
                  <span className="flex items-center gap-2"><TrendingUp className="w-3 h-3" /> Most Imported</span>
                </SelectItem>
                <SelectItem value="newest">
                  <span className="flex items-center gap-2"><Clock className="w-3 h-3" /> Newest</span>
                </SelectItem>
                <SelectItem value="most-viewed">
                  <span className="flex items-center gap-2"><Eye className="w-3 h-3" /> Most Viewed</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Tabs value={category} onValueChange={setCategory}>
            <TabsList className="flex flex-wrap h-auto gap-1 bg-card border border-white/10 p-1" data-testid="tabs-categories">
              {CATEGORIES.map((cat) => {
                const Icon = CATEGORY_ICONS[cat] || Terminal;
                return (
                  <TabsTrigger key={cat} value={cat} className="gap-1.5 text-xs" data-testid={`tab-category-${cat.toLowerCase()}`}>
                    <Icon className="w-3 h-3" />
                    {cat}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <ShareCardSkeleton key={i} />)}
          </div>
        ) : sortedShares.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
              <Store className="w-12 h-12 text-muted-foreground/50" />
              <h3 className="text-lg font-display font-bold" data-testid="text-no-shares">
                {search || category !== "All" ? "No matching commands" : "Marketplace is empty"}
              </h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                {search || category !== "All"
                  ? "Try adjusting your filters or search term."
                  : "Be the first to share a command! Go to your server settings and share a custom command."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="text-sm text-muted-foreground" data-testid="text-share-count">
              {sortedShares.length} command{sortedShares.length !== 1 ? "s" : ""} found
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {sortedShares.map((share) => (
                <ShareCard
                  key={share.id}
                  share={share}
                  onPreview={() => setPreviewShare(share)}
                  onImport={() => { setImportShare(share); }}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {previewShare && (
        <PreviewDialog
          share={previewShare}
          open={!!previewShare}
          onOpenChange={(open) => { if (!open) setPreviewShare(null); }}
          onImport={() => {
            setImportShare(previewShare);
            setPreviewShare(null);
          }}
        />
      )}

      {importShare && (
        <ImportDialog
          share={importShare}
          open={!!importShare}
          onOpenChange={(open) => { if (!open) setImportShare(null); }}
        />
      )}
    </div>
  );
}
