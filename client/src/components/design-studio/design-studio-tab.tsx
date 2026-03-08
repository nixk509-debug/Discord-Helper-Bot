import { useEffect, useMemo, useState } from "react";
import { useEmbeds } from "@/hooks/use-bot";
import { buildApiUrl } from "@/lib/http";
import { EmbedBuilderTab } from "@/components/embed-builder/embed-builder-tab";
import { EmbedPreview } from "@/components/embed-builder/embed-preview";
import type { EmbedComponentType } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowDown, ArrowUp, Layers3, MessageSquare, Paintbrush, Plus, Save, Send, Sparkles, Trash2 } from "lucide-react";

type DraftOption = { id: string; label: string; value: string };
type DraftComponent = {
  id: string;
  kind: "button" | "select";
  row: number;
  label: string;
  style: 1 | 2 | 3 | 4 | 5;
  customId: string;
  url: string;
  placeholder: string;
  disabled: boolean;
  options: DraftOption[];
};

type StudioTemplate = {
  id: number;
  name: string;
  type: string;
  data: any;
};

const CATEGORIES = ["welcome", "rules", "verification", "announcements", "punishments", "ticket panels", "giveaways"] as const;

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createButton(): DraftComponent {
  return {
    id: uid(),
    kind: "button",
    row: 0,
    label: "Button",
    style: 1,
    customId: "",
    url: "",
    placeholder: "",
    disabled: false,
    options: [],
  };
}

function createSelect(): DraftComponent {
  return {
    id: uid(),
    kind: "select",
    row: 0,
    label: "",
    style: 1,
    customId: "",
    url: "",
    placeholder: "Select an option",
    disabled: false,
    options: [{ id: uid(), label: "Option 1", value: "option_1" }],
  };
}

function toEmbedComponent(component: DraftComponent): EmbedComponentType {
  if (component.kind === "button") {
    return {
      type: 2,
      row: component.row,
      label: component.label,
      style: component.style,
      customId: component.style === 5 ? undefined : component.customId || undefined,
      url: component.style === 5 ? component.url : undefined,
      disabled: component.disabled,
    };
  }

  return {
    type: 3,
    row: component.row,
    customId: component.customId || undefined,
    placeholder: component.placeholder,
    disabled: component.disabled,
    options: component.options.map((option) => ({ label: option.label, value: option.value })),
  };
}

function fromEmbedComponent(component: any): DraftComponent | null {
  if (component?.type === 2) {
    return {
      id: uid(),
      kind: "button",
      row: Number.isFinite(component.row) ? component.row : 0,
      label: component.label || "Button",
      style: (component.style || 1) as 1 | 2 | 3 | 4 | 5,
      customId: component.customId || "",
      url: component.url || "",
      placeholder: "",
      disabled: Boolean(component.disabled),
      options: [],
    };
  }

  if (component?.type === 3) {
    return {
      id: uid(),
      kind: "select",
      row: Number.isFinite(component.row) ? component.row : 0,
      label: "",
      style: 1,
      customId: component.customId || "",
      url: "",
      placeholder: component.placeholder || "Select an option",
      disabled: Boolean(component.disabled),
      options: (Array.isArray(component.options) ? component.options : []).map((option: any) => ({
        id: uid(),
        label: option.label || "Option",
        value: option.value || "",
      })),
    };
  }

  return null;
}

function validateComponents(components: DraftComponent[]) {
  const issues: string[] = [];
  const rowMap = new Map<number, DraftComponent[]>();

  for (const component of components) {
    if (component.row < 0 || component.row > 4) issues.push("Row index must be between 0 and 4.");
    if (!rowMap.has(component.row)) rowMap.set(component.row, []);
    rowMap.get(component.row)!.push(component);

    if (component.kind === "button") {
      if (!component.label.trim()) issues.push("Button label is required.");
      if (component.style === 5 && !/^https?:\/\//i.test(component.url.trim())) issues.push("Link button must have a valid URL.");
      if (component.style !== 5 && !component.customId.trim()) issues.push("Non-link button must have a custom ID.");
    } else {
      if (!component.customId.trim()) issues.push("Select menu must have a custom ID.");
      if (component.options.length < 1) issues.push("Select menu must have at least one option.");
      if (component.options.length > 25) issues.push("Select menu supports at most 25 options.");
      if (component.options.some((option) => !option.label.trim() || !option.value.trim())) issues.push("Select options require label and value.");
    }
  }

  if (rowMap.size > 5) issues.push("Discord supports only 5 rows.");
  for (const rowItems of rowMap.values()) {
    const buttons = rowItems.filter((item) => item.kind === "button").length;
    const selects = rowItems.filter((item) => item.kind === "select").length;
    if (buttons > 5) issues.push("A row can contain at most 5 buttons.");
    if (selects > 1) issues.push("A row can contain at most 1 select menu.");
    if (buttons > 0 && selects > 0) issues.push("Buttons and select menus cannot share the same row.");
  }

  return [...new Set(issues)];
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

export function DesignStudioTab({ serverId, toast }: { serverId: number; toast: any }) {
  const { data: embeds = [] } = useEmbeds(serverId);
  const [tab, setTab] = useState("embed-builder");
  const [components, setComponents] = useState<DraftComponent[]>([]);
  const [templates, setTemplates] = useState<StudioTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  const [templateId, setTemplateId] = useState<number | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateCategory, setTemplateCategory] = useState<(typeof CATEGORIES)[number]>("welcome");
  const [templateJson, setTemplateJson] = useState("{}");

  const previewComponents = useMemo(() => components.map(toEmbedComponent), [components]);
  const issues = useMemo(() => validateComponents(components), [components]);

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const result = await requestJson(`/api/templates?serverId=${serverId}`);
      setTemplates(Array.isArray(result) ? result : []);
    } catch (err: any) {
      toast({ title: "Failed to load templates", description: err?.message || "Request failed", variant: "destructive" });
    } finally {
      setLoadingTemplates(false);
    }
  };

  useEffect(() => {
    void loadTemplates();
  }, [serverId]);

  const updateComponent = (id: string, updater: (value: DraftComponent) => DraftComponent) => {
    setComponents((prev) => prev.map((component) => (component.id === id ? updater(component) : component)));
  };

  const moveComponent = (id: string, direction: "up" | "down") => {
    setComponents((prev) => {
      const index = prev.findIndex((item) => item.id === id);
      const target = direction === "up" ? index - 1 : index + 1;
      if (index < 0 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const [picked] = next.splice(index, 1);
      next.splice(target, 0, picked);
      return next;
    });
  };

  const selectTemplate = (template: StudioTemplate) => {
    setTemplateId(template.id);
    setTemplateName(template.name || "");
    setTemplateCategory((template.data?.category as (typeof CATEGORIES)[number]) || "welcome");
    setTemplateJson(JSON.stringify(template.data?.payload || {}, null, 2));
  };

  const resetTemplateEditor = () => {
    setTemplateId(null);
    setTemplateName("");
    setTemplateCategory("welcome");
    setTemplateJson("{}");
  };

  const saveTemplate = async () => {
    let payload: any;
    try {
      payload = JSON.parse(templateJson || "{}");
    } catch {
      toast({ title: "Invalid JSON", description: "Template payload must be valid JSON.", variant: "destructive" });
      return;
    }

    if (!templateName.trim()) {
      toast({ title: "Template name required", description: "Provide a name before saving.", variant: "destructive" });
      return;
    }

    try {
      if (templateId) {
        await requestJson(`/api/templates/${templateId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: templateName.trim(), data: { category: templateCategory, payload } }),
        });
      } else {
        await requestJson("/api/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ serverId, name: templateName.trim(), type: "design_studio", data: { category: templateCategory, payload } }),
        });
      }
      await loadTemplates();
      toast({ title: templateId ? "Template updated" : "Template created", description: "Template Manager saved your changes." });
      if (!templateId) resetTemplateEditor();
    } catch (err: any) {
      toast({ title: "Save failed", description: err?.message || "Request failed", variant: "destructive" });
    }
  };

  const duplicateTemplate = async (template: StudioTemplate) => {
    try {
      await requestJson("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serverId, name: `${template.name} (Copy)`, type: template.type, data: template.data }),
      });
      await loadTemplates();
      toast({ title: "Template duplicated", description: `Created ${template.name} (Copy).` });
    } catch (err: any) {
      toast({ title: "Duplicate failed", description: err?.message || "Request failed", variant: "destructive" });
    }
  };

  const deleteTemplate = async (template: StudioTemplate) => {
    try {
      await requestJson(`/api/templates/${template.id}`, { method: "DELETE" });
      if (templateId === template.id) resetTemplateEditor();
      await loadTemplates();
      toast({ title: "Template deleted", description: `Removed ${template.name}.` });
    } catch (err: any) {
      toast({ title: "Delete failed", description: err?.message || "Request failed", variant: "destructive" });
    }
  };

  const applyTemplateToBuilder = (template: StudioTemplate) => {
    const raw = template?.data?.payload?.components;
    if (!Array.isArray(raw)) {
      toast({ title: "Unsupported template", description: "This template has no component payload.", variant: "destructive" });
      return;
    }
    const mapped = raw.map(fromEmbedComponent).filter(Boolean) as DraftComponent[];
    setComponents(mapped);
    setTab("component-builder");
    toast({ title: "Template applied", description: `Loaded ${mapped.length} components into the builder.` });
  };

  return (
    <div className="space-y-6">
      <Card className="glass-card border-primary/30 bg-gradient-to-br from-primary/10 via-background/40 to-background">
        <CardHeader>
          <CardTitle className="font-display text-xl flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Design Studio
          </CardTitle>
          <CardDescription>Build and manage embeds, components, and reusable templates.</CardDescription>
        </CardHeader>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
          <TabsTrigger value="embed-builder">Embed Builder</TabsTrigger>
          <TabsTrigger value="component-builder">Component Builder</TabsTrigger>
          <TabsTrigger value="template-manager">Template Manager</TabsTrigger>
          <TabsTrigger value="message-builder">Message Builder</TabsTrigger>
          <TabsTrigger value="presets">Design Presets</TabsTrigger>
          <TabsTrigger value="publishing">Publishing</TabsTrigger>
        </TabsList>

        <TabsContent value="embed-builder" className="space-y-4">
          <EmbedBuilderTab serverId={serverId} embeds={embeds} toast={toast} />
        </TabsContent>

        <TabsContent value="component-builder" className="space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h3 className="text-lg font-display font-semibold">Component Builder</h3>
              <p className="text-sm text-muted-foreground">Build rows of buttons/select menus with limit validation.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setComponents((prev) => [...prev, createButton()])}><Plus className="w-4 h-4 mr-1" />Button</Button>
              <Button variant="outline" onClick={() => setComponents((prev) => [...prev, createSelect()])}><Plus className="w-4 h-4 mr-1" />Select</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-base">Components</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {components.length === 0 && <p className="text-sm text-muted-foreground">No components yet.</p>}
                {components.map((component, index) => (
                  <Card key={component.id} className="border-white/10 bg-background/30">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">{component.kind === "button" ? "Button" : "Select"} #{index + 1}</CardTitle>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveComponent(component.id, "up")}><ArrowUp className="w-3.5 h-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveComponent(component.id, "down")}><ArrowDown className="w-3.5 h-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setComponents((prev) => prev.filter((entry) => entry.id !== component.id))}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Row</Label>
                          <Input type="number" min={0} max={4} value={component.row} onChange={(event) => updateComponent(component.id, (current) => ({ ...current, row: Math.max(0, Math.min(4, Number(event.target.value) || 0)) }))} />
                        </div>
                        <div className="flex items-center justify-between rounded-md border border-white/10 px-3 py-2 mt-5">
                          <Label className="text-xs">Disabled</Label>
                          <Switch checked={component.disabled} onCheckedChange={(value) => updateComponent(component.id, (current) => ({ ...current, disabled: value }))} />
                        </div>
                      </div>

                      {component.kind === "button" ? (
                        <>
                          <div>
                            <Label className="text-xs">Label</Label>
                            <Input value={component.label} onChange={(event) => updateComponent(component.id, (current) => ({ ...current, label: event.target.value }))} />
                          </div>
                          <div>
                            <Label className="text-xs">Style</Label>
                            <Select value={String(component.style)} onValueChange={(value) => updateComponent(component.id, (current) => ({ ...current, style: Number(value) as 1 | 2 | 3 | 4 | 5 }))}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">Primary</SelectItem>
                                <SelectItem value="2">Secondary</SelectItem>
                                <SelectItem value="3">Success</SelectItem>
                                <SelectItem value="4">Danger</SelectItem>
                                <SelectItem value="5">Link</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">{component.style === 5 ? "URL" : "Custom ID"}</Label>
                            <Input value={component.style === 5 ? component.url : component.customId} onChange={(event) => updateComponent(component.id, (current) => current.style === 5 ? { ...current, url: event.target.value } : { ...current, customId: event.target.value })} />
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <Label className="text-xs">Custom ID</Label>
                            <Input value={component.customId} onChange={(event) => updateComponent(component.id, (current) => ({ ...current, customId: event.target.value }))} />
                          </div>
                          <div>
                            <Label className="text-xs">Placeholder</Label>
                            <Input value={component.placeholder} onChange={(event) => updateComponent(component.id, (current) => ({ ...current, placeholder: event.target.value }))} />
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs">Options</Label>
                              <Button size="sm" variant="outline" onClick={() => updateComponent(component.id, (current) => ({ ...current, options: [...current.options, { id: uid(), label: "Option", value: "option" }] }))}>
                                <Plus className="w-3 h-3 mr-1" />Add
                              </Button>
                            </div>
                            {component.options.map((option) => (
                              <div key={option.id} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <Input value={option.label} placeholder="Label" onChange={(event) => updateComponent(component.id, (current) => ({ ...current, options: current.options.map((entry) => entry.id === option.id ? { ...entry, label: event.target.value } : entry) }))} />
                                <Input value={option.value} placeholder="Value" onChange={(event) => updateComponent(component.id, (current) => ({ ...current, options: current.options.map((entry) => entry.id === option.id ? { ...entry, value: event.target.value } : entry) }))} />
                                <Button variant="outline" size="sm" onClick={() => updateComponent(component.id, (current) => ({ ...current, options: current.options.filter((entry) => entry.id !== option.id) }))}>Remove</Button>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-base">Live Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-[#313338] rounded-lg p-4 min-h-[220px]">
                    <EmbedPreview embed={{ components: previewComponents as any }} />
                  </div>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2"><Layers3 className="w-4 h-4 text-primary" />Validation</CardTitle>
                </CardHeader>
                <CardContent>
                  {issues.length === 0 ? (
                    <p className="text-sm text-emerald-400">No component limit violations detected.</p>
                  ) : (
                    issues.map((issue) => <p key={issue} className="text-sm text-amber-300">• {issue}</p>)
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="template-manager" className="space-y-4">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-base">Template Editor</CardTitle>
                <CardDescription>Create, duplicate, edit, and delete reusable templates.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Name</Label>
                  <Input value={templateName} onChange={(event) => setTemplateName(event.target.value)} />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={templateCategory} onValueChange={(value) => setTemplateCategory(value as (typeof CATEGORIES)[number])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Payload JSON</Label>
                  <Textarea value={templateJson} onChange={(event) => setTemplateJson(event.target.value)} className="font-mono min-h-[220px]" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => setTemplateJson(JSON.stringify({ components: previewComponents, source: "component-builder" }, null, 2))}>Use Current Components</Button>
                  <Button onClick={() => void saveTemplate()}><Save className="w-4 h-4 mr-2" />{templateId ? "Update" : "Save"}</Button>
                  {templateId && <Button variant="outline" onClick={resetTemplateEditor}>New</Button>}
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-base">Template Library</CardTitle>
                <CardDescription>{loadingTemplates ? "Loading..." : `${templates.length} templates found.`}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {templates.map((template) => (
                  <div key={template.id} className="rounded-lg border border-white/10 bg-background/30 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{template.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px] uppercase">{template.type}</Badge>
                          {template.data?.category && <Badge variant="secondary" className="text-[10px] uppercase">{template.data.category}</Badge>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" onClick={() => selectTemplate(template)}>Edit</Button>
                        <Button size="sm" variant="ghost" onClick={() => void duplicateTemplate(template)}>Duplicate</Button>
                        <Button size="sm" variant="ghost" onClick={() => applyTemplateToBuilder(template)}>Use</Button>
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => void deleteTemplate(template)}>Delete</Button>
                      </div>
                    </div>
                  </div>
                ))}
                {!loadingTemplates && templates.length === 0 && <p className="text-sm text-muted-foreground">No templates saved yet.</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="message-builder">
          <Card className="glass-card"><CardHeader><CardTitle className="text-base flex items-center gap-2"><MessageSquare className="w-4 h-4 text-primary" />Message Builder (Scaffold)</CardTitle><CardDescription>Next: compose plain text + embeds + components into a single outbound payload.</CardDescription></CardHeader></Card>
        </TabsContent>
        <TabsContent value="presets">
          <Card className="glass-card"><CardHeader><CardTitle className="text-base flex items-center gap-2"><Paintbrush className="w-4 h-4 text-primary" />Design Presets (Scaffold)</CardTitle><CardDescription>Reusable theme colors, footers, and button style sets will be managed here.</CardDescription></CardHeader></Card>
        </TabsContent>
        <TabsContent value="publishing">
          <Card className="glass-card"><CardHeader><CardTitle className="text-base flex items-center gap-2"><Send className="w-4 h-4 text-primary" />Publishing (Scaffold)</CardTitle><CardDescription>Channel targeting, pre-send checks, and module template injection will be wired here.</CardDescription></CardHeader></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
