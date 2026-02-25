import { useState } from "react";
import { useCreateEmbed, useUpdateEmbed, useDeleteEmbed } from "@/hooks/use-bot";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Save, Layout, Eye, Edit3, Copy, GripVertical, ChevronDown, ChevronUp, ExternalLink, MousePointer } from "lucide-react";
import { EmbedPreview, type EmbedField, type EmbedComponent } from "./embed-preview";
import type { Embed } from "@shared/schema";

interface EmbedFormState {
  name: string;
  title: string;
  description: string;
  url: string;
  color: string;
  timestamp: boolean;
  footerText: string;
  footerIconUrl: string;
  imageUrl: string;
  thumbnailUrl: string;
  authorName: string;
  authorUrl: string;
  authorIconUrl: string;
  fields: EmbedField[];
  components: EmbedComponent[];
}

const DEFAULT_FORM: EmbedFormState = {
  name: "",
  title: "",
  description: "",
  url: "",
  color: "#5865F2",
  timestamp: false,
  footerText: "",
  footerIconUrl: "",
  imageUrl: "",
  thumbnailUrl: "",
  authorName: "",
  authorUrl: "",
  authorIconUrl: "",
  fields: [],
  components: [],
};

const PRESET_COLORS = [
  "#5865F2", "#57F287", "#FEE75C", "#EB459E", "#ED4245",
  "#FF8C00", "#9B59B6", "#1ABC9C", "#E91E63", "#2196F3",
];

export function EmbedBuilderTab({ serverId, embeds, toast }: { serverId: number; embeds: Embed[]; toast: any }) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<EmbedFormState>({ ...DEFAULT_FORM });
  const [showBuilder, setShowBuilder] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    basic: true,
    author: false,
    fields: false,
    images: false,
    footer: false,
    components: false,
  });

  const createEmbed = useCreateEmbed(serverId);
  const updateEmbed = useUpdateEmbed(serverId);
  const deleteEmbed = useDeleteEmbed(serverId);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const updateForm = (key: keyof EmbedFormState, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const openNewEmbed = () => {
    setForm({ ...DEFAULT_FORM });
    setEditingId(null);
    setShowBuilder(true);
  };

  const openEditEmbed = (embed: Embed) => {
    setForm({
      name: embed.name || "",
      title: embed.title || "",
      description: embed.description || "",
      url: embed.url || "",
      color: embed.color || "#5865F2",
      timestamp: embed.timestamp || false,
      footerText: embed.footerText || "",
      footerIconUrl: embed.footerIconUrl || "",
      imageUrl: embed.imageUrl || "",
      thumbnailUrl: embed.thumbnailUrl || "",
      authorName: embed.authorName || "",
      authorUrl: embed.authorUrl || "",
      authorIconUrl: embed.authorIconUrl || "",
      fields: (embed.fields as EmbedField[]) || [],
      components: (embed.components as EmbedComponent[]) || [],
    });
    setEditingId(embed.id);
    setShowBuilder(true);
  };

  const duplicateEmbed = (embed: Embed) => {
    setForm({
      name: `${embed.name} (Copy)`,
      title: embed.title || "",
      description: embed.description || "",
      url: embed.url || "",
      color: embed.color || "#5865F2",
      timestamp: embed.timestamp || false,
      footerText: embed.footerText || "",
      footerIconUrl: embed.footerIconUrl || "",
      imageUrl: embed.imageUrl || "",
      thumbnailUrl: embed.thumbnailUrl || "",
      authorName: embed.authorName || "",
      authorUrl: embed.authorUrl || "",
      authorIconUrl: embed.authorIconUrl || "",
      fields: (embed.fields as EmbedField[]) || [],
      components: (embed.components as EmbedComponent[]) || [],
    });
    setEditingId(null);
    setShowBuilder(true);
  };

  const saveEmbed = () => {
    if (!form.name.trim()) {
      toast({ title: "Name required", description: "Give your embed a name to save it.", variant: "destructive" });
      return;
    }

    const payload = {
      name: form.name,
      title: form.title || null,
      description: form.description || null,
      url: form.url || null,
      color: form.color || null,
      timestamp: form.timestamp,
      footerText: form.footerText || null,
      footerIconUrl: form.footerIconUrl || null,
      imageUrl: form.imageUrl || null,
      thumbnailUrl: form.thumbnailUrl || null,
      authorName: form.authorName || null,
      authorUrl: form.authorUrl || null,
      authorIconUrl: form.authorIconUrl || null,
      fields: form.fields,
      components: form.components,
    };

    if (editingId) {
      updateEmbed.mutate({ id: editingId, data: payload }, {
        onSuccess: () => {
          toast({ title: "Embed updated", description: `"${form.name}" saved successfully.` });
          setShowBuilder(false);
        },
      });
    } else {
      createEmbed.mutate(payload as any, {
        onSuccess: () => {
          toast({ title: "Embed created", description: `"${form.name}" created successfully.` });
          setShowBuilder(false);
        },
      });
    }
  };

  const addField = () => {
    updateForm("fields", [...form.fields, { name: "", value: "", inline: false }]);
  };

  const updateField = (index: number, key: keyof EmbedField, value: any) => {
    const newFields = [...form.fields];
    newFields[index] = { ...newFields[index], [key]: value };
    updateForm("fields", newFields);
  };

  const removeField = (index: number) => {
    updateForm("fields", form.fields.filter((_, i) => i !== index));
  };

  const addComponent = (type: number) => {
    const newComp: EmbedComponent = type === 2
      ? { type: 2, label: "Button", style: 1, customId: `btn_${Date.now()}` }
      : { type: 3, label: "Select Menu", customId: `select_${Date.now()}`, options: [{ label: "Option 1", value: "opt1" }] };
    updateForm("components", [...form.components, newComp]);
  };

  const updateComponent = (index: number, updates: Partial<EmbedComponent>) => {
    const newComps = [...form.components];
    newComps[index] = { ...newComps[index], ...updates };
    updateForm("components", newComps);
  };

  const removeComponent = (index: number) => {
    updateForm("components", form.components.filter((_, i) => i !== index));
  };

  const addSelectOption = (compIndex: number) => {
    const comp = form.components[compIndex];
    const opts = comp.options || [];
    updateComponent(compIndex, {
      options: [...opts, { label: `Option ${opts.length + 1}`, value: `opt${opts.length + 1}` }],
    });
  };

  const updateSelectOption = (compIndex: number, optIndex: number, key: string, value: string) => {
    const comp = form.components[compIndex];
    const opts = [...(comp.options || [])];
    opts[optIndex] = { ...opts[optIndex], [key]: value };
    updateComponent(compIndex, { options: opts });
  };

  const removeSelectOption = (compIndex: number, optIndex: number) => {
    const comp = form.components[compIndex];
    const opts = (comp.options || []).filter((_, i) => i !== optIndex);
    updateComponent(compIndex, { options: opts });
  };

  if (showBuilder) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setShowBuilder(false)} className="gap-2 text-muted-foreground hover:text-foreground" data-testid="back-to-embeds">
            <ChevronDown className="w-4 h-4 rotate-90" /> Back to Embeds
          </Button>
          <Button onClick={saveEmbed} disabled={createEmbed.isPending || updateEmbed.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground box-glow gap-2" data-testid="save-embed">
            <Save className="w-4 h-4" />
            {createEmbed.isPending || updateEmbed.isPending ? "Saving..." : editingId ? "Update Embed" : "Save Embed"}
          </Button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
            <div className="mb-4">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Template Name</Label>
              <Input
                value={form.name}
                onChange={(e) => updateForm("name", e.target.value)}
                placeholder="e.g. Welcome Message, Rules, Announcement"
                className="bg-background/50 border-white/10 mt-1"
                data-testid="input-embed-name"
              />
            </div>

            <CollapsibleSection title="Content" expanded={expandedSections.basic} onToggle={() => toggleSection("basic")}>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Title</Label>
                  <Input value={form.title} onChange={(e) => updateForm("title", e.target.value)} placeholder="Embed title" className="bg-background/50 border-white/10 mt-1" data-testid="input-embed-title" />
                </div>
                <div>
                  <Label className="text-xs">URL</Label>
                  <Input value={form.url} onChange={(e) => updateForm("url", e.target.value)} placeholder="https://..." className="bg-background/50 border-white/10 mt-1" data-testid="input-embed-url" />
                </div>
                <div>
                  <Label className="text-xs">Description</Label>
                  <Textarea value={form.description} onChange={(e) => updateForm("description", e.target.value)} placeholder="Embed description. Supports markdown." className="bg-background/50 border-white/10 mt-1 min-h-[100px]" data-testid="input-embed-description" />
                </div>
                <div>
                  <Label className="text-xs">Color</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input type="color" value={form.color} onChange={(e) => updateForm("color", e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent" data-testid="input-embed-color" />
                    <Input value={form.color} onChange={(e) => updateForm("color", e.target.value)} className="bg-background/50 border-white/10 w-28 font-mono text-xs" data-testid="input-embed-color-hex" />
                    <div className="flex gap-1 flex-wrap">
                      {PRESET_COLORS.map(c => (
                        <button key={c} onClick={() => updateForm("color", c)} className="w-6 h-6 rounded-full border-2 border-transparent hover:border-white/50 transition-colors" style={{ backgroundColor: c }} data-testid={`color-preset-${c}`} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Author" expanded={expandedSections.author} onToggle={() => toggleSection("author")}>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Author Name</Label>
                  <Input value={form.authorName} onChange={(e) => updateForm("authorName", e.target.value)} placeholder="Author name" className="bg-background/50 border-white/10 mt-1" data-testid="input-author-name" />
                </div>
                <div>
                  <Label className="text-xs">Author URL</Label>
                  <Input value={form.authorUrl} onChange={(e) => updateForm("authorUrl", e.target.value)} placeholder="https://..." className="bg-background/50 border-white/10 mt-1" data-testid="input-author-url" />
                </div>
                <div>
                  <Label className="text-xs">Author Icon URL</Label>
                  <Input value={form.authorIconUrl} onChange={(e) => updateForm("authorIconUrl", e.target.value)} placeholder="https://..." className="bg-background/50 border-white/10 mt-1" data-testid="input-author-icon" />
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title={`Fields (${form.fields.length})`} expanded={expandedSections.fields} onToggle={() => toggleSection("fields")}>
              <div className="space-y-3">
                {form.fields.map((field, i) => (
                  <div key={i} className="rounded-lg border border-white/5 bg-background/30 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-medium">Field {i + 1}</span>
                      <Button variant="ghost" size="sm" onClick={() => removeField(i)} className="h-6 w-6 p-0 text-destructive hover:text-destructive" data-testid={`remove-field-${i}`}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    <Input value={field.name} onChange={(e) => updateField(i, "name", e.target.value)} placeholder="Field name" className="bg-background/50 border-white/10 h-8 text-xs" data-testid={`field-name-${i}`} />
                    <Textarea value={field.value} onChange={(e) => updateField(i, "value", e.target.value)} placeholder="Field value" className="bg-background/50 border-white/10 min-h-[60px] text-xs" data-testid={`field-value-${i}`} />
                    <div className="flex items-center gap-2">
                      <Switch checked={field.inline} onCheckedChange={(v) => updateField(i, "inline", v)} className="scale-75" data-testid={`field-inline-${i}`} />
                      <Label className="text-xs text-muted-foreground">Inline</Label>
                    </div>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addField} className="w-full border-dashed border-white/10 text-muted-foreground hover:text-foreground gap-2" data-testid="add-field">
                  <Plus className="w-3 h-3" /> Add Field
                </Button>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Images" expanded={expandedSections.images} onToggle={() => toggleSection("images")}>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Image URL</Label>
                  <Input value={form.imageUrl} onChange={(e) => updateForm("imageUrl", e.target.value)} placeholder="https://..." className="bg-background/50 border-white/10 mt-1" data-testid="input-image-url" />
                </div>
                <div>
                  <Label className="text-xs">Thumbnail URL</Label>
                  <Input value={form.thumbnailUrl} onChange={(e) => updateForm("thumbnailUrl", e.target.value)} placeholder="https://..." className="bg-background/50 border-white/10 mt-1" data-testid="input-thumbnail-url" />
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Footer" expanded={expandedSections.footer} onToggle={() => toggleSection("footer")}>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Footer Text</Label>
                  <Input value={form.footerText} onChange={(e) => updateForm("footerText", e.target.value)} placeholder="Footer text" className="bg-background/50 border-white/10 mt-1" data-testid="input-footer-text" />
                </div>
                <div>
                  <Label className="text-xs">Footer Icon URL</Label>
                  <Input value={form.footerIconUrl} onChange={(e) => updateForm("footerIconUrl", e.target.value)} placeholder="https://..." className="bg-background/50 border-white/10 mt-1" data-testid="input-footer-icon" />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.timestamp} onCheckedChange={(v) => updateForm("timestamp", v)} data-testid="toggle-timestamp" />
                  <Label className="text-xs">Show Timestamp</Label>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title={`Components (${form.components.length})`} expanded={expandedSections.components} onToggle={() => toggleSection("components")}>
              <div className="space-y-3">
                {form.components.map((comp, i) => (
                  <div key={i} className="rounded-lg border border-white/5 bg-background/30 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium flex items-center gap-1.5">
                        {comp.type === 2 ? <MousePointer className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        {comp.type === 2 ? "Button" : "Select Menu"}
                      </span>
                      <Button variant="ghost" size="sm" onClick={() => removeComponent(i)} className="h-6 w-6 p-0 text-destructive hover:text-destructive" data-testid={`remove-component-${i}`}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>

                    {comp.type === 2 && (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Label</Label>
                            <Input value={comp.label || ""} onChange={(e) => updateComponent(i, { label: e.target.value })} placeholder="Click me" className="bg-background/50 border-white/10 h-8 text-xs mt-1" data-testid={`button-label-${i}`} />
                          </div>
                          <div>
                            <Label className="text-xs">Style</Label>
                            <Select value={String(comp.style || 1)} onValueChange={(v) => updateComponent(i, { style: parseInt(v) })}>
                              <SelectTrigger className="bg-background/50 border-white/10 h-8 text-xs mt-1" data-testid={`button-style-${i}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">Primary</SelectItem>
                                <SelectItem value="2">Secondary</SelectItem>
                                <SelectItem value="3">Success</SelectItem>
                                <SelectItem value="4">Danger</SelectItem>
                                <SelectItem value="5">Link</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">{comp.style === 5 ? "URL" : "Custom ID"}</Label>
                            <Input
                              value={comp.style === 5 ? comp.url || "" : comp.customId || ""}
                              onChange={(e) => comp.style === 5 ? updateComponent(i, { url: e.target.value }) : updateComponent(i, { customId: e.target.value })}
                              placeholder={comp.style === 5 ? "https://..." : "custom_id"}
                              className="bg-background/50 border-white/10 h-8 text-xs mt-1"
                              data-testid={`button-id-${i}`}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Emoji</Label>
                            <Input value={comp.emoji || ""} onChange={(e) => updateComponent(i, { emoji: e.target.value })} placeholder="🎮" className="bg-background/50 border-white/10 h-8 text-xs mt-1" data-testid={`button-emoji-${i}`} />
                          </div>
                        </div>
                      </>
                    )}

                    {comp.type === 3 && (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Placeholder</Label>
                            <Input value={comp.label || ""} onChange={(e) => updateComponent(i, { label: e.target.value })} placeholder="Select an option..." className="bg-background/50 border-white/10 h-8 text-xs mt-1" data-testid={`select-placeholder-${i}`} />
                          </div>
                          <div>
                            <Label className="text-xs">Custom ID</Label>
                            <Input value={comp.customId || ""} onChange={(e) => updateComponent(i, { customId: e.target.value })} placeholder="select_id" className="bg-background/50 border-white/10 h-8 text-xs mt-1" data-testid={`select-id-${i}`} />
                          </div>
                        </div>
                        <div className="space-y-2 mt-2">
                          <Label className="text-xs text-muted-foreground">Options</Label>
                          {(comp.options || []).map((opt, oi) => (
                            <div key={oi} className="flex gap-2 items-start">
                              <div className="flex-1 grid grid-cols-3 gap-1">
                                <Input value={opt.label} onChange={(e) => updateSelectOption(i, oi, "label", e.target.value)} placeholder="Label" className="bg-background/50 border-white/10 h-7 text-xs" data-testid={`select-opt-label-${i}-${oi}`} />
                                <Input value={opt.value} onChange={(e) => updateSelectOption(i, oi, "value", e.target.value)} placeholder="Value" className="bg-background/50 border-white/10 h-7 text-xs" data-testid={`select-opt-value-${i}-${oi}`} />
                                <Input value={opt.description || ""} onChange={(e) => updateSelectOption(i, oi, "description", e.target.value)} placeholder="Description" className="bg-background/50 border-white/10 h-7 text-xs" data-testid={`select-opt-desc-${i}-${oi}`} />
                              </div>
                              <Button variant="ghost" size="sm" onClick={() => removeSelectOption(i, oi)} className="h-7 w-7 p-0 text-destructive shrink-0" data-testid={`remove-select-opt-${i}-${oi}`}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                          <Button variant="outline" size="sm" onClick={() => addSelectOption(i)} className="w-full border-dashed border-white/10 text-muted-foreground text-xs h-7 gap-1" data-testid={`add-select-opt-${i}`}>
                            <Plus className="w-3 h-3" /> Add Option
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => addComponent(2)} className="flex-1 border-dashed border-white/10 text-muted-foreground hover:text-foreground gap-2" data-testid="add-button-component">
                    <MousePointer className="w-3 h-3" /> Add Button
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => addComponent(3)} className="flex-1 border-dashed border-white/10 text-muted-foreground hover:text-foreground gap-2" data-testid="add-select-component">
                    <ChevronDown className="w-3 h-3" /> Add Select Menu
                  </Button>
                </div>
              </div>
            </CollapsibleSection>
          </div>

          <div className="xl:sticky xl:top-4 xl:self-start">
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-display flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary" /> Live Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-[#313338] rounded-lg p-4 min-h-[200px]">
                  <EmbedPreview embed={form as any} />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold text-glow" data-testid="text-embed-title">Embed Builder</h2>
          <p className="text-muted-foreground text-sm">Create rich message templates with buttons and select menus.</p>
        </div>
        <Button onClick={openNewEmbed} className="bg-primary hover:bg-primary/90 text-primary-foreground box-glow gap-2" data-testid="button-new-embed">
          <Plus className="w-4 h-4" /> New Embed
        </Button>
      </div>

      {embeds.length === 0 ? (
        <div className="py-12 text-center glass-card rounded-xl border border-dashed border-white/10" data-testid="empty-embeds">
          <Layout className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
          <h3 className="text-lg font-medium">No embeds yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Create your first embed template to get started.</p>
          <Button onClick={openNewEmbed} variant="outline" className="gap-2">
            <Plus className="w-4 h-4" /> Create Embed
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {embeds.map((embed) => (
            <Card key={embed.id} className="glass-card hover:border-primary/30 transition-colors group" data-testid={`card-embed-${embed.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: embed.color || "#5865F2" }} />
                    <CardTitle className="text-sm truncate">{embed.name}</CardTitle>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" onClick={() => duplicateEmbed(embed)} className="h-7 w-7 p-0" data-testid={`duplicate-embed-${embed.id}`}>
                      <Copy className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEditEmbed(embed)} className="h-7 w-7 p-0" data-testid={`edit-embed-${embed.id}`}>
                      <Edit3 className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        deleteEmbed.mutate(embed.id, {
                          onSuccess: () => toast({ title: "Embed deleted", description: `"${embed.name}" removed.` }),
                        });
                      }}
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      data-testid={`delete-embed-${embed.id}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xs text-muted-foreground space-y-1">
                  {embed.title && <p className="truncate">Title: {embed.title}</p>}
                  {embed.description && <p className="truncate">Desc: {embed.description}</p>}
                  <div className="flex gap-2 flex-wrap mt-2">
                    {((embed.fields as any[]) || []).length > 0 && (
                      <span className="bg-secondary/50 px-2 py-0.5 rounded text-[10px]">{((embed.fields as any[]) || []).length} fields</span>
                    )}
                    {((embed.components as any[]) || []).length > 0 && (
                      <span className="bg-secondary/50 px-2 py-0.5 rounded text-[10px]">{((embed.components as any[]) || []).length} components</span>
                    )}
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => openEditEmbed(embed)} className="w-full mt-3 text-xs gap-1 border-white/10 hover:bg-primary/10" data-testid={`open-embed-${embed.id}`}>
                  <Edit3 className="w-3 h-3" /> Edit Embed
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CollapsibleSection({ title, expanded, onToggle, children }: { title: string; expanded: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/5 bg-secondary/20 overflow-hidden">
      <button onClick={onToggle} className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium hover:bg-white/5 transition-colors" data-testid={`section-${title.toLowerCase().replace(/[^a-z]/g, '-')}`}>
        {title}
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {expanded && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
