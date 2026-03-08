import { useEffect, useMemo, useState } from "react";
import { buildApiUrl } from "@/lib/http";
import { useDiscordContext } from "@/hooks/use-bot";
import { DiscordChannelPicker } from "@/components/discord/channel-picker";
import type { EmbedComponentType } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDown, ArrowUp, Copy, Layers3, Plus, Save, Send, Sparkles, Trash2 } from "lucide-react";

const CATEGORIES = ["welcome", "rules", "verification", "announcements", "ticket-panels", "giveaways"] as const;
type StudioCategory = (typeof CATEGORIES)[number];
type StudioTemplate = { id: number; name: string; type: string; data: any };
type EmbedDraft = { id: string; title: string; description: string; color: string };
type Asset = { id: string; name: string; type: "image" | "file" | "banner"; url: string };
type BlockType = "container" | "section" | "text_display" | "media_gallery" | "file" | "action_row" | "button" | "select_menu";
type Block = {
  id: string;
  type: BlockType;
  label: string;
  content: string;
  url: string;
  row: number;
  style: 1 | 2 | 3 | 4 | 5;
  customId: string;
  placeholder: string;
  options: Array<{ id: string; label: string; value: string }>;
};

function uid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function requestJson(path: string, init?: RequestInit) {
  const response = await fetch(buildApiUrl(path), { credentials: "include", ...init });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || "Request failed");
  }
  if (response.status === 204) return null;
  return response.json();
}

function createBlock(type: BlockType): Block {
  if (type === "button") return { id: uid(), type, label: "Button", content: "", url: "", row: 0, style: 1, customId: "button_action", placeholder: "", options: [] };
  if (type === "select_menu") return { id: uid(), type, label: "Select", content: "", url: "", row: 0, style: 1, customId: "select_action", placeholder: "Pick an option", options: [{ id: uid(), label: "Option", value: "option" }] };
  return { id: uid(), type, label: type.replace("_", " "), content: "", url: "", row: 0, style: 1, customId: "", placeholder: "", options: [] };
}

function toInteractiveComponents(blocks: Block[]): EmbedComponentType[] {
  return blocks.flatMap((block) => {
    if (block.type === "button") {
      return [{
        type: 2,
        row: Math.max(0, Math.min(4, block.row || 0)),
        label: block.label || "Button",
        style: block.style,
        customId: block.style === 5 ? undefined : block.customId || undefined,
        url: block.style === 5 ? block.url || undefined : undefined,
      } as any];
    }
    if (block.type === "select_menu") {
      return [{
        type: 3,
        row: Math.max(0, Math.min(4, block.row || 0)),
        customId: block.customId || undefined,
        placeholder: block.placeholder || "Pick an option",
        options: block.options.map((option) => ({ label: option.label, value: option.value })),
      } as any];
    }
    return [];
  });
}

function validateBlocks(blocks: Block[]) {
  const issues: string[] = [];
  const rows = new Map<number, { buttons: number; selects: number }>();

  for (const block of blocks) {
    if (block.type !== "button" && block.type !== "select_menu") continue;
    const row = Math.max(0, Math.min(4, block.row || 0));
    const state = rows.get(row) || { buttons: 0, selects: 0 };
    if (block.type === "button") {
      state.buttons += 1;
      if (!block.label.trim()) issues.push("Buttons need labels.");
      if (block.style === 5 && !/^https?:\/\//i.test(block.url)) issues.push("Link buttons need valid URLs.");
      if (block.style !== 5 && !block.customId.trim()) issues.push("Non-link buttons need custom IDs.");
    }
    if (block.type === "select_menu") {
      state.selects += 1;
      if (!block.customId.trim()) issues.push("Select menus need custom IDs.");
      if (block.options.length < 1 || block.options.length > 25) issues.push("Select menus must have 1-25 options.");
      if (block.options.some((o) => !o.label.trim() || !o.value.trim())) issues.push("Select options need label + value.");
    }
    rows.set(row, state);
  }

  if (rows.size > 5) issues.push("Discord supports at most 5 action rows.");
  for (const state of rows.values()) {
    if (state.buttons > 5) issues.push("A row can have at most 5 buttons.");
    if (state.selects > 1) issues.push("A row can have at most 1 select menu.");
    if (state.buttons > 0 && state.selects > 0) issues.push("Buttons and select menus cannot share one row.");
  }

  return [...new Set(issues)];
}

export function DesignStudioTab({ serverId, toast }: { serverId: number; toast: any }) {
  const [leftTab, setLeftTab] = useState("layers");
  const [centerTab, setCenterTab] = useState("message");
  const [name, setName] = useState("Untitled Design");
  const [category, setCategory] = useState<StudioCategory>("welcome");
  const [message, setMessage] = useState("");
  const [embeds, setEmbeds] = useState<EmbedDraft[]>([{ id: uid(), title: "", description: "", color: "#5865F2" }]);
  const [selectedEmbedId, setSelectedEmbedId] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetName, setAssetName] = useState("");
  const [assetType, setAssetType] = useState<Asset["type"]>("image");
  const [assetUrl, setAssetUrl] = useState("");
  const [templates, setTemplates] = useState<StudioTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [channelId, setChannelId] = useState("");
  const [messageId, setMessageId] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [publishDiagnostics, setPublishDiagnostics] = useState<any[]>([]);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile" | "compact">("desktop");

  const { data: discordContext } = useDiscordContext(serverId);
  const selectedEmbed = useMemo(() => embeds.find((embed) => embed.id === selectedEmbedId) || embeds[0], [embeds, selectedEmbedId]);
  const selectedBlock = useMemo(() => blocks.find((block) => block.id === selectedBlockId) || null, [blocks, selectedBlockId]);
  const componentIssues = useMemo(() => validateBlocks(blocks), [blocks]);

  useEffect(() => {
    if (!selectedEmbedId && embeds[0]) setSelectedEmbedId(embeds[0].id);
  }, [embeds, selectedEmbedId]);

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const result = await requestJson(`/api/templates?serverId=${serverId}`);
      setTemplates((Array.isArray(result) ? result : []).filter((template: any) => template.type === "design_studio"));
    } catch (err: any) {
      toast({ title: "Failed to load templates", description: err?.message || "Request failed", variant: "destructive" });
    } finally {
      setLoadingTemplates(false);
    }
  };

  useEffect(() => { void loadTemplates(); }, [serverId]);

  const draftPayload = () => ({ version: 1, name, category, message, embeds, blocks, assets });

  const updateSelectedEmbed = (updates: Partial<EmbedDraft>) => {
    if (!selectedEmbed) return;
    setEmbeds((prev) => prev.map((embed) => embed.id === selectedEmbed.id ? { ...embed, ...updates } : embed));
  };
  const saveTemplate = async () => {
    try {
      const payload = { name, data: { category, payload: draftPayload() } };
      if (templateId) {
        await requestJson(`/api/templates/${templateId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      } else {
        await requestJson("/api/templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ serverId, type: "design_studio", ...payload }) });
      }
      await loadTemplates();
      toast({ title: "Template saved", description: templateId ? "Template updated." : "Template created." });
    } catch (err: any) {
      toast({ title: "Save failed", description: err?.message || "Request failed", variant: "destructive" });
    }
  };

  const applyTemplate = (template: StudioTemplate) => {
    const payload = template.data?.payload || template.data;
    setName(payload?.name || template.name);
    setCategory(payload?.category || "welcome");
    setMessage(payload?.message || "");
    setEmbeds(Array.isArray(payload?.embeds) && payload.embeds.length > 0 ? payload.embeds : [{ id: uid(), title: "", description: "", color: "#5865F2" }]);
    setBlocks(Array.isArray(payload?.blocks) ? payload.blocks : []);
    setAssets(Array.isArray(payload?.assets) ? payload.assets : []);
    setTemplateId(template.id);
    toast({ title: "Template loaded", description: template.name });
  };

  const duplicateTemplate = async (template: StudioTemplate) => {
    await requestJson("/api/templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ serverId, name: `${template.name} (Copy)`, type: "design_studio", data: template.data }) });
    await loadTemplates();
  };

  const publish = async (mode: "create" | "update") => {
    if (!channelId.trim()) return toast({ title: "Channel required", description: "Select a destination channel.", variant: "destructive" });
    if (componentIssues.length > 0) return toast({ title: "Fix validation issues", description: "Component rules are violated.", variant: "destructive" });
    if (mode === "update" && !messageId.trim()) return toast({ title: "Message ID required", description: "Provide a message ID to update.", variant: "destructive" });

    setPublishing(true);
    try {
      const result = await requestJson(`/api/servers/${serverId}/design-studio/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId,
          messageId: mode === "update" ? messageId : undefined,
          content: message || undefined,
          embeds: embeds.filter((embed) => embed.title || embed.description).map((embed) => ({ title: embed.title || undefined, description: embed.description || undefined, color: embed.color || undefined })),
          blocks,
          interactiveComponents: toInteractiveComponents(blocks),
        }),
      });
      if (result?.messageId) setMessageId(result.messageId);
      setPublishDiagnostics(Array.isArray(result?.diagnostics) ? result.diagnostics : []);
      toast({ title: mode === "update" ? "Message updated" : "Published", description: `Channel ${result?.channelId || channelId}` });
    } catch (err: any) {
      toast({ title: "Publish failed", description: err?.message || "Request failed", variant: "destructive" });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-5">
      <Card className="glass-card border-primary/25 bg-gradient-to-br from-primary/10 via-background/70 to-background/90">
        <CardHeader>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="font-display text-xl flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Design Studio</CardTitle>
              <CardDescription>Visual message + embed + component workspace with template reuse and direct publishing.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => navigator.clipboard.writeText(JSON.stringify(draftPayload(), null, 2))} className="gap-2"><Copy className="w-4 h-4" />Copy JSON</Button>
              <Button onClick={() => void saveTemplate()} className="gap-2"><Save className="w-4 h-4" />Save Template</Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)_380px] gap-5">
        <Card className="glass-card h-[calc(100vh-14rem)] min-h-[34rem] overflow-hidden"><CardContent className="p-3 h-full overflow-y-auto">
          <Tabs value={leftTab} onValueChange={setLeftTab}><TabsList className="grid grid-cols-3"><TabsTrigger value="layers">Layers</TabsTrigger><TabsTrigger value="templates">Templates</TabsTrigger><TabsTrigger value="assets">Assets</TabsTrigger></TabsList>
            <TabsContent value="layers" className="space-y-3 mt-3">
              <div className="grid grid-cols-2 gap-2">
                {(["container", "section", "text_display", "media_gallery", "file", "action_row", "button", "select_menu"] as BlockType[]).map((type) => (
                  <Button key={type} size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setBlocks((prev) => [...prev, createBlock(type)])}><Plus className="w-3 h-3 mr-1" />{type.replace("_", " ")}</Button>
                ))}
              </div>
              {blocks.map((block, index) => (
                <div key={block.id} className={`rounded border p-2 ${selectedBlockId === block.id ? "border-primary/40 bg-primary/10" : "border-white/10 bg-background/40"}`}>
                  <div className="flex items-center gap-1">
                    <button className="text-xs text-left flex-1 truncate" onClick={() => setSelectedBlockId(block.id)}>{block.label || block.type}</button>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setBlocks((prev) => { const next=[...prev]; if(index<=0) return prev; const [x]=next.splice(index,1); next.splice(index-1,0,x); return next; })}><ArrowUp className="w-3 h-3" /></Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setBlocks((prev) => { const next=[...prev]; if(index>=next.length-1) return prev; const [x]=next.splice(index,1); next.splice(index+1,0,x); return next; })}><ArrowDown className="w-3 h-3" /></Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => setBlocks((prev) => prev.filter((entry) => entry.id !== block.id))}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </div>
              ))}
            </TabsContent>
            <TabsContent value="templates" className="space-y-3 mt-3">
              <p className="text-xs text-muted-foreground">{loadingTemplates ? "Loading..." : `${templates.length} saved templates`}</p>
              {templates.map((template) => (
                <div key={template.id} className="rounded border border-white/10 bg-background/40 p-2 space-y-2"><div className="text-xs font-medium truncate">{template.name}</div><div className="flex gap-1"><Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => applyTemplate(template)}>Load</Button><Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => void duplicateTemplate(template)}>Duplicate</Button></div></div>
              ))}
            </TabsContent>
            <TabsContent value="assets" className="space-y-3 mt-3">
              <Input value={assetName} onChange={(e) => setAssetName(e.target.value)} placeholder="Asset name" className="h-8" />
              <Select value={assetType} onValueChange={(v) => setAssetType(v as Asset["type"])}><SelectTrigger className="h-8"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="image">Image</SelectItem><SelectItem value="file">File</SelectItem><SelectItem value="banner">Banner</SelectItem></SelectContent></Select>
              <Input value={assetUrl} onChange={(e) => setAssetUrl(e.target.value)} placeholder="https://..." className="h-8" />
              <Button size="sm" variant="outline" className="h-8 w-full" onClick={() => { if (!assetName || !assetUrl) return; setAssets((prev) => [...prev, { id: uid(), name: assetName, type: assetType, url: assetUrl }]); setAssetName(""); setAssetUrl(""); }}>Add Asset</Button>
              {assets.map((asset) => <div key={asset.id} className="rounded border border-white/10 bg-background/40 p-2 text-xs"><div className="font-medium truncate">{asset.name}</div><div className="text-muted-foreground truncate">{asset.url}</div></div>)}
            </TabsContent>
          </Tabs>
        </CardContent></Card>

        <Card className="glass-card h-[calc(100vh-14rem)] min-h-[34rem] overflow-hidden"><CardContent className="p-3 h-full overflow-y-auto">
          <Tabs value={centerTab} onValueChange={setCenterTab}><TabsList className="grid grid-cols-4"><TabsTrigger value="message">Message</TabsTrigger><TabsTrigger value="embeds">Embeds</TabsTrigger><TabsTrigger value="components">Components</TabsTrigger><TabsTrigger value="publish">Publish</TabsTrigger></TabsList>
            <TabsContent value="message" className="space-y-3 mt-3"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Design name" className="h-8" /><Select value={category} onValueChange={(v) => setCategory(v as StudioCategory)}><SelectTrigger className="h-8"><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select><Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message content" className="min-h-[180px]" /><p className={`text-xs ${message.length > 2000 ? "text-destructive" : "text-muted-foreground"}`}>{message.length}/2000</p></TabsContent>
            <TabsContent value="embeds" className="space-y-3 mt-3"><div className="flex items-center justify-between"><p className="text-xs text-muted-foreground">{embeds.length} embeds</p><Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEmbeds((prev) => [...prev, { id: uid(), title: "", description: "", color: "#5865F2" }])}><Plus className="w-3 h-3 mr-1" />Add Embed</Button></div>{embeds.map((embed) => <button key={embed.id} className={`w-full text-left rounded border p-2 ${selectedEmbed?.id === embed.id ? "border-primary/40 bg-primary/10" : "border-white/10 bg-background/40"}`} onClick={() => setSelectedEmbedId(embed.id)}>{embed.title || "Untitled embed"}</button>)}{selectedEmbed ? <div className="space-y-2 rounded border border-white/10 bg-background/40 p-2"><Input value={selectedEmbed.title} onChange={(e) => updateSelectedEmbed({ title: e.target.value })} placeholder="Embed title" className="h-8" /><Textarea value={selectedEmbed.description} onChange={(e) => updateSelectedEmbed({ description: e.target.value })} placeholder="Embed description" className="min-h-[120px]" /><Input value={selectedEmbed.color} onChange={(e) => updateSelectedEmbed({ color: e.target.value })} placeholder="#5865F2" className="h-8" /></div> : null}</TabsContent>
            <TabsContent value="components" className="space-y-3 mt-3">{selectedBlock ? <div className="space-y-2 rounded border border-white/10 bg-background/40 p-2"><p className="text-xs font-medium uppercase">{selectedBlock.type.replace("_", " ")}</p><Input value={selectedBlock.label} onChange={(e) => setBlocks((prev) => prev.map((b) => b.id === selectedBlock.id ? { ...b, label: e.target.value } : b))} className="h-8" placeholder="Label" />{(selectedBlock.type === "button" || selectedBlock.type === "select_menu") ? <><Input type="number" min={0} max={4} value={selectedBlock.row} onChange={(e) => setBlocks((prev) => prev.map((b) => b.id === selectedBlock.id ? { ...b, row: Number(e.target.value) || 0 } : b))} className="h-8" placeholder="Row 0-4" />{selectedBlock.type === "button" ? <><Select value={String(selectedBlock.style)} onValueChange={(v) => setBlocks((prev) => prev.map((b) => b.id === selectedBlock.id ? { ...b, style: Number(v) as 1|2|3|4|5 } : b))}><SelectTrigger className="h-8"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">Primary</SelectItem><SelectItem value="2">Secondary</SelectItem><SelectItem value="3">Success</SelectItem><SelectItem value="4">Danger</SelectItem><SelectItem value="5">Link</SelectItem></SelectContent></Select><Input value={selectedBlock.style === 5 ? selectedBlock.url : selectedBlock.customId} onChange={(e) => setBlocks((prev) => prev.map((b) => b.id === selectedBlock.id ? (selectedBlock.style === 5 ? { ...b, url: e.target.value } : { ...b, customId: e.target.value }) : b))} className="h-8" placeholder={selectedBlock.style === 5 ? "https://..." : "custom_id"} /></> : <><Input value={selectedBlock.customId} onChange={(e) => setBlocks((prev) => prev.map((b) => b.id === selectedBlock.id ? { ...b, customId: e.target.value } : b))} className="h-8" placeholder="custom_id" /><Input value={selectedBlock.placeholder} onChange={(e) => setBlocks((prev) => prev.map((b) => b.id === selectedBlock.id ? { ...b, placeholder: e.target.value } : b))} className="h-8" placeholder="Placeholder" /></>}</> : <><Textarea value={selectedBlock.content} onChange={(e) => setBlocks((prev) => prev.map((b) => b.id === selectedBlock.id ? { ...b, content: e.target.value } : b))} className="min-h-[90px]" placeholder="Content" /><Input value={selectedBlock.url} onChange={(e) => setBlocks((prev) => prev.map((b) => b.id === selectedBlock.id ? { ...b, url: e.target.value } : b))} className="h-8" placeholder="Optional URL" /></>}</div> : <p className="text-xs text-muted-foreground">Select a block from Layers to edit.</p>}{componentIssues.length === 0 ? <p className="text-xs text-emerald-400">No component violations.</p> : componentIssues.map((issue) => <p key={issue} className="text-xs text-amber-300">• {issue}</p>)}</TabsContent>
            <TabsContent value="publish" className="space-y-3 mt-3"><DiscordChannelPicker serverId={serverId} value={channelId} onChange={setChannelId} label="Channel" allowedKinds={["text", "announcement", "forum"]} testIdPrefix="studio-publish-channel" /><Input value={messageId} onChange={(e) => setMessageId(e.target.value)} placeholder="Existing message ID (optional)" className="h-8" /><div className="flex gap-2"><Button size="sm" onClick={() => void publish("create")} disabled={publishing}><Send className="w-3 h-3 mr-1" />Publish New</Button><Button size="sm" variant="outline" onClick={() => void publish("update")} disabled={publishing}>Update Existing</Button></div>{publishDiagnostics.map((diag, idx) => <p key={`${diag.code || "diag"}-${idx}`} className="text-xs text-amber-300">• {diag.message || diag.code}</p>)}</TabsContent>
          </Tabs>
        </CardContent></Card>

        <Card className="glass-card h-[calc(100vh-14rem)] min-h-[34rem] overflow-hidden"><CardContent className="p-3 h-full overflow-y-auto">
          <div className="mb-3 flex items-center justify-between gap-2">
            <CardTitle className="text-base font-display flex items-center gap-2"><Layers3 className="w-4 h-4 text-primary" />Live Preview</CardTitle>
            <div className="flex gap-1">
              <Button size="sm" variant={previewMode === "desktop" ? "default" : "outline"} className="h-7 text-[11px]" onClick={() => setPreviewMode("desktop")}>Desktop</Button>
              <Button size="sm" variant={previewMode === "mobile" ? "default" : "outline"} className="h-7 text-[11px]" onClick={() => setPreviewMode("mobile")}>Mobile</Button>
              <Button size="sm" variant={previewMode === "compact" ? "default" : "outline"} className="h-7 text-[11px]" onClick={() => setPreviewMode("compact")}>Compact</Button>
            </div>
          </div>
          <div className={`rounded-lg bg-[#313338] p-3 space-y-3 mx-auto ${previewMode === "mobile" ? "max-w-[390px]" : previewMode === "compact" ? "max-w-[560px]" : "max-w-full"}`}>
            <div className="text-xs text-[#DBDEE1] whitespace-pre-wrap">{message || "No message content"}</div>
            {embeds.filter((e) => e.title || e.description).map((embed) => (
              <div key={embed.id} className="rounded border border-white/10 bg-[#2B2D31] p-3" style={{ borderLeft: `4px solid ${embed.color || "#5865F2"}` }}>
                <p className="text-sm text-white font-semibold">{embed.title || "Untitled"}</p>
                <p className="text-xs text-[#DBDEE1] whitespace-pre-wrap mt-1">{embed.description || "No description"}</p>
              </div>
            ))}
            {blocks.map((block) => <div key={block.id} className="rounded border border-white/10 bg-background/40 p-2"><p className="text-xs font-medium">{block.type.replace("_", " ")}</p><p className="text-[11px] text-muted-foreground truncate">{block.label || block.content || block.customId || block.url || "Configured"}</p></div>)}
          </div>
          <div className="mt-3 rounded border border-white/10 bg-background/40 p-2 text-xs text-muted-foreground">
            <p>Channels synced: {discordContext?.channels?.length || 0}</p>
            <p>Roles synced: {discordContext?.roles?.length || 0}</p>
            <p>Interactive components: {toInteractiveComponents(blocks).length}</p>
          </div>
        </CardContent></Card>
      </div>
    </div>
  );
}

