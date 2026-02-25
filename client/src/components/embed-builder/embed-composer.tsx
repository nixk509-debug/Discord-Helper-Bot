import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Upload, Code, Eye, Expand, Plus, Trash2, ChevronDown } from "lucide-react";
import { EmbedPreview, type EmbedField, type EmbedComponent } from "./embed-preview";

export interface EmbedData {
  title?: string;
  description?: string;
  color?: string;
  url?: string;
  timestamp?: boolean;
  authorName?: string;
  authorUrl?: string;
  authorIconUrl?: string;
  footerText?: string;
  footerIconUrl?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  fields?: EmbedField[];
  components?: EmbedComponent[];
}

const EMPTY_EMBED: EmbedData = {
  title: "",
  description: "",
  color: "#5865F2",
  url: "",
  timestamp: false,
  authorName: "",
  authorUrl: "",
  authorIconUrl: "",
  footerText: "",
  footerIconUrl: "",
  imageUrl: "",
  thumbnailUrl: "",
  fields: [],
  components: [],
};

interface EmbedComposerProps {
  value?: EmbedData;
  onChange?: (embed: EmbedData) => void;
  label?: string;
  className?: string;
}

function embedToJson(embed: EmbedData): object {
  return {
    title: embed.title || undefined,
    description: embed.description || undefined,
    url: embed.url || undefined,
    color: embed.color ? parseInt(embed.color.replace('#', ''), 16) : undefined,
    timestamp: embed.timestamp ? new Date().toISOString() : undefined,
    footer: embed.footerText ? { text: embed.footerText, icon_url: embed.footerIconUrl || undefined } : undefined,
    image: embed.imageUrl ? { url: embed.imageUrl } : undefined,
    thumbnail: embed.thumbnailUrl ? { url: embed.thumbnailUrl } : undefined,
    author: embed.authorName ? { name: embed.authorName, url: embed.authorUrl || undefined, icon_url: embed.authorIconUrl || undefined } : undefined,
    fields: (embed.fields || []).length > 0 ? embed.fields : undefined,
    components: (embed.components || []).length > 0 ? embed.components : undefined,
  };
}

function jsonToEmbed(data: any): EmbedData {
  return {
    title: data.title || "",
    description: data.description || "",
    url: data.url || "",
    color: data.color ? (typeof data.color === 'number' ? `#${data.color.toString(16).padStart(6, '0')}` : data.color) : "#5865F2",
    timestamp: !!data.timestamp,
    footerText: data.footer?.text || "",
    footerIconUrl: data.footer?.icon_url || "",
    imageUrl: data.image?.url || "",
    thumbnailUrl: data.thumbnail?.url || "",
    authorName: data.author?.name || "",
    authorUrl: data.author?.url || "",
    authorIconUrl: data.author?.icon_url || "",
    fields: data.fields || [],
    components: data.components || [],
  };
}

function FullEmbedDialog({
  open,
  onOpenChange,
  embed,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  embed: EmbedData;
  onSave: (embed: EmbedData) => void;
}) {
  const [form, setForm] = useState<EmbedData>({ ...EMPTY_EMBED, ...embed });
  const [jsonText, setJsonText] = useState(() => JSON.stringify(embedToJson({ ...EMPTY_EMBED, ...embed }), null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"visual" | "json">("visual");

  useEffect(() => {
    if (open) {
      setForm({ ...EMPTY_EMBED, ...embed });
      setJsonText(JSON.stringify(embedToJson({ ...EMPTY_EMBED, ...embed }), null, 2));
      setJsonError(null);
    }
  }, [open]);

  const updateForm = (updates: Partial<EmbedData>) => {
    const next = { ...form, ...updates };
    setForm(next);
    setJsonText(JSON.stringify(embedToJson(next), null, 2));
  };

  const handleJsonChange = (text: string) => {
    setJsonText(text);
    try {
      const parsed = JSON.parse(text);
      setForm(jsonToEmbed(parsed));
      setJsonError(null);
    } catch {
      setJsonError("Invalid JSON");
    }
  };

  const addField = () => {
    updateForm({ fields: [...(form.fields || []), { name: "", value: "", inline: false }] });
  };

  const updateField = (i: number, key: keyof EmbedField, val: any) => {
    const fields = [...(form.fields || [])];
    fields[i] = { ...fields[i], [key]: val };
    updateForm({ fields });
  };

  const removeField = (i: number) => {
    updateForm({ fields: (form.fields || []).filter((_, idx) => idx !== i) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 py-4 border-b border-white/5 shrink-0">
          <DialogTitle className="font-display">Embed Composer</DialogTitle>
        </DialogHeader>
        <div className="flex flex-1 overflow-hidden">
          <div className="w-1/2 flex flex-col border-r border-white/5 overflow-hidden">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex flex-col flex-1 overflow-hidden">
              <TabsList className="mx-4 mt-3 mb-0 shrink-0 self-start">
                <TabsTrigger value="visual" className="gap-1 text-xs">
                  <Eye className="w-3 h-3" /> Visual
                </TabsTrigger>
                <TabsTrigger value="json" className="gap-1 text-xs">
                  <Code className="w-3 h-3" /> JSON
                </TabsTrigger>
              </TabsList>
              <TabsContent value="visual" className="flex-1 overflow-y-auto mt-0 px-4 pb-4 space-y-3">
                <div className="space-y-2 pt-3">
                  <Label className="text-xs">Title</Label>
                  <Input value={form.title || ""} onChange={(e) => updateForm({ title: e.target.value })} placeholder="Embed title" className="bg-background/50 border-white/10 h-8 text-sm" data-testid="composer-title" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Description</Label>
                  <Textarea value={form.description || ""} onChange={(e) => updateForm({ description: e.target.value })} placeholder="Embed description (markdown)" className="bg-background/50 border-white/10 text-sm min-h-[80px]" data-testid="composer-description" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Color</Label>
                    <div className="flex gap-2 items-center">
                      <input type="color" value={form.color || "#5865F2"} onChange={(e) => updateForm({ color: e.target.value })} className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" data-testid="composer-color" />
                      <Input value={form.color || "#5865F2"} onChange={(e) => updateForm({ color: e.target.value })} className="bg-background/50 border-white/10 h-8 w-24 font-mono text-xs" data-testid="composer-color-hex" />
                    </div>
                  </div>
                  <div className="space-y-1 flex-1">
                    <Label className="text-xs">URL</Label>
                    <Input value={form.url || ""} onChange={(e) => updateForm({ url: e.target.value })} placeholder="https://..." className="bg-background/50 border-white/10 h-8 text-xs" data-testid="composer-url" />
                  </div>
                  <div className="flex items-center gap-2 pt-5">
                    <Switch checked={form.timestamp || false} onCheckedChange={(v) => updateForm({ timestamp: v })} className="scale-75" data-testid="composer-timestamp" />
                    <Label className="text-xs">Timestamp</Label>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Author Name</Label>
                  <Input value={form.authorName || ""} onChange={(e) => updateForm({ authorName: e.target.value })} placeholder="Author" className="bg-background/50 border-white/10 h-8 text-xs" data-testid="composer-author" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Image URL</Label>
                    <Input value={form.imageUrl || ""} onChange={(e) => updateForm({ imageUrl: e.target.value })} placeholder="https://..." className="bg-background/50 border-white/10 h-8 text-xs" data-testid="composer-image" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Thumbnail URL</Label>
                    <Input value={form.thumbnailUrl || ""} onChange={(e) => updateForm({ thumbnailUrl: e.target.value })} placeholder="https://..." className="bg-background/50 border-white/10 h-8 text-xs" data-testid="composer-thumbnail" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Footer Text</Label>
                    <Input value={form.footerText || ""} onChange={(e) => updateForm({ footerText: e.target.value })} placeholder="Footer..." className="bg-background/50 border-white/10 h-8 text-xs" data-testid="composer-footer" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Footer Icon URL</Label>
                    <Input value={form.footerIconUrl || ""} onChange={(e) => updateForm({ footerIconUrl: e.target.value })} placeholder="https://..." className="bg-background/50 border-white/10 h-8 text-xs" data-testid="composer-footer-icon" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Fields ({(form.fields || []).length})</Label>
                  {(form.fields || []).map((f, i) => (
                    <div key={i} className="rounded-lg border border-white/5 bg-background/20 p-2 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">Field {i + 1}</span>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <Switch checked={f.inline} onCheckedChange={(v) => updateField(i, "inline", v)} className="scale-[0.65]" />
                            <Label className="text-[10px] text-muted-foreground">Inline</Label>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => removeField(i)} className="h-5 w-5 text-destructive" data-testid={`composer-remove-field-${i}`}>
                            <Trash2 className="w-2.5 h-2.5" />
                          </Button>
                        </div>
                      </div>
                      <Input value={f.name} onChange={(e) => updateField(i, "name", e.target.value)} placeholder="Name" className="bg-background/50 border-white/10 h-7 text-xs" data-testid={`composer-field-name-${i}`} />
                      <Textarea value={f.value} onChange={(e) => updateField(i, "value", e.target.value)} placeholder="Value" className="bg-background/50 border-white/10 min-h-[40px] text-xs" data-testid={`composer-field-value-${i}`} />
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addField} className="w-full border-dashed border-white/10 text-muted-foreground text-xs h-7 gap-1" data-testid="composer-add-field">
                    <Plus className="w-3 h-3" /> Add Field
                  </Button>
                </div>
              </TabsContent>
              <TabsContent value="json" className="flex-1 overflow-hidden mt-0 px-4 pb-4 flex flex-col gap-2 pt-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Discord Embed JSON</Label>
                  {jsonError && <span className="text-xs text-destructive">{jsonError}</span>}
                </div>
                <Textarea
                  value={jsonText}
                  onChange={(e) => handleJsonChange(e.target.value)}
                  className={`flex-1 bg-background/50 font-mono text-xs resize-none min-h-[300px] ${jsonError ? 'border-destructive/50' : 'border-white/10'}`}
                  data-testid="composer-json"
                />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => { navigator.clipboard.writeText(jsonText); }} data-testid="composer-copy-json">
                    <Download className="w-3 h-3" /> Copy JSON
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      handleJsonChange(text);
                    } catch {}
                  }} data-testid="composer-paste-json">
                    <Upload className="w-3 h-3" /> Paste JSON
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
          <div className="w-1/2 flex flex-col overflow-hidden">
            <div className="px-4 pt-4 pb-2 shrink-0">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Preview</Label>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-4 bg-[#36393f]/50 rounded-lg mx-4 mb-4">
              <EmbedPreview embed={{
                title: form.title || undefined,
                description: form.description || undefined,
                color: form.color,
                url: form.url || undefined,
                timestamp: form.timestamp,
                footerText: form.footerText || undefined,
                footerIconUrl: form.footerIconUrl || undefined,
                imageUrl: form.imageUrl || undefined,
                thumbnailUrl: form.thumbnailUrl || undefined,
                authorName: form.authorName || undefined,
                authorUrl: form.authorUrl || undefined,
                authorIconUrl: form.authorIconUrl || undefined,
                fields: form.fields as any,
                components: form.components as any,
              }} />
            </div>
          </div>
        </div>
        <DialogFooter className="px-6 py-4 border-t border-white/5 shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="composer-cancel">Cancel</Button>
          <Button onClick={() => { onSave(form); onOpenChange(false); }} className="gap-2" data-testid="composer-save">
            Apply Embed
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EmbedComposer({ value, onChange, label = "Embed", className = "" }: EmbedComposerProps) {
  const [open, setOpen] = useState(false);
  const current = { ...EMPTY_EMBED, ...value };
  const hasContent = !!(current.title || current.description || current.fields?.length);

  return (
    <div className={`space-y-2 ${className}`}>
      {label && <Label className="text-sm font-medium">{label}</Label>}
      <div className="rounded-lg border border-white/5 bg-background/30 p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {hasContent ? (
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: current.color || "#5865F2" }} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate" data-testid="composer-preview-title">
                  {current.title || current.description?.slice(0, 50) || "Embed"}
                </p>
                {current.description && (
                  <p className="text-xs text-muted-foreground truncate" data-testid="composer-preview-desc">
                    {current.description.slice(0, 80)}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground" data-testid="composer-empty">No embed configured</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {hasContent && (
            <Badge variant="outline" className="text-[10px]">
              {[
                current.title && "title",
                current.description && "desc",
                (current.fields?.length || 0) > 0 && `${current.fields!.length} fields`,
              ].filter(Boolean).join(", ")}
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1 text-xs" data-testid="composer-open">
            <Expand className="w-3 h-3" />
            {hasContent ? "Edit" : "Build"}
          </Button>
          {hasContent && onChange && (
            <Button variant="ghost" size="icon" onClick={() => onChange(EMPTY_EMBED)} className="h-8 text-muted-foreground" data-testid="composer-clear">
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>

      <FullEmbedDialog
        open={open}
        onOpenChange={setOpen}
        embed={current}
        onSave={(embed) => {
          onChange?.(embed);
          setOpen(false);
        }}
      />
    </div>
  );
}
