import { useState, useCallback, useEffect, useRef } from "react";
import { useCreateEmbed, useUpdateEmbed, useDeleteEmbed } from "@/hooks/use-bot";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, Trash2, Save, Layout, Eye, Edit3, Copy, ChevronDown, ChevronUp,
  MousePointer, Type, Minus, Image, FileText, Box, Heading, Columns,
  ArrowUp, ArrowDown, Code, Upload, Download, BookTemplate, X, Zap
} from "lucide-react";
import { EmbedPreview, type EmbedField, type EmbedComponent } from "./embed-preview";
import { COMPONENT_TYPES } from "@shared/schema";
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

const COMPONENT_PICKER_ITEMS = [
  { type: COMPONENT_TYPES.TEXT_DISPLAY, label: "Text Display", desc: "Standalone text block with markdown", icon: Type },
  { type: COMPONENT_TYPES.SECTION, label: "Section", desc: "Text with optional thumbnail or button accessory", icon: Columns },
  { type: COMPONENT_TYPES.SEPARATOR, label: "Separator", desc: "Horizontal divider line", icon: Minus },
  { type: COMPONENT_TYPES.MEDIA_GALLERY, label: "Media Gallery", desc: "Grid of images and media", icon: Image },
  { type: COMPONENT_TYPES.FILE, label: "File", desc: "File attachment", icon: FileText },
  { type: COMPONENT_TYPES.CONTAINER, label: "Container", desc: "Colored container wrapping other components", icon: Box },
  { type: 1, label: "Header", desc: "Large bold text header", icon: Heading },
  { type: COMPONENT_TYPES.BUTTON, label: "Button", desc: "Interactive button", icon: MousePointer },
  { type: COMPONENT_TYPES.SELECT_MENU, label: "Select Menu", desc: "Dropdown select menu", icon: ChevronDown },
];

const TEMPLATES: Record<string, { name: string; form: Partial<EmbedFormState> }> = {
  welcome: {
    name: "Welcome Message",
    form: {
      name: "Welcome Message",
      title: "Welcome to the Server!",
      description: "Hey there! We're glad to have you here. Make sure to read the rules and have fun!",
      color: "#57F287",
      footerText: "Enjoy your stay",
      timestamp: true,
      components: [
        { type: COMPONENT_TYPES.SEPARATOR, divider: true, spacing: "small" },
        { type: COMPONENT_TYPES.TEXT_DISPLAY, content: "**Quick Links:**\nRead the rules in #rules\nIntroduce yourself in #introductions\nGet roles in #roles" },
        { type: COMPONENT_TYPES.SEPARATOR, divider: true, spacing: "small" },
        { type: COMPONENT_TYPES.BUTTON, label: "Rules", style: 1, customId: "btn_rules" },
        { type: COMPONENT_TYPES.BUTTON, label: "Get Roles", style: 3, customId: "btn_roles" },
      ],
    },
  },
  rules: {
    name: "Server Rules",
    form: {
      name: "Server Rules",
      title: "Server Rules",
      description: "Please follow these rules to keep our community friendly and welcoming.",
      color: "#5865F2",
      components: [
        { type: 1, content: "Community Guidelines" },
        { type: COMPONENT_TYPES.TEXT_DISPLAY, content: "**1.** Be respectful to all members\n**2.** No spam or self-promotion\n**3.** No NSFW content\n**4.** Follow Discord ToS\n**5.** Listen to moderators" },
        { type: COMPONENT_TYPES.SEPARATOR, divider: true, spacing: "large" },
        { type: COMPONENT_TYPES.TEXT_DISPLAY, content: "*Breaking rules may result in warnings, mutes, or bans.*" },
      ],
    },
  },
  announcement: {
    name: "Announcement",
    form: {
      name: "Announcement",
      title: "Important Announcement",
      description: "We have some exciting news to share with the community!",
      color: "#FEE75C",
      timestamp: true,
      authorName: "Server Staff",
      components: [
        { type: COMPONENT_TYPES.SEPARATOR, divider: true, spacing: "small" },
        { type: COMPONENT_TYPES.TEXT_DISPLAY, content: "Details about the announcement go here. You can use **bold**, *italic*, and other markdown." },
        { type: COMPONENT_TYPES.SEPARATOR, divider: true, spacing: "large" },
        { type: COMPONENT_TYPES.BUTTON, label: "Learn More", style: 5, url: "https://example.com" },
      ],
    },
  },
  faq: {
    name: "FAQ",
    form: {
      name: "FAQ",
      title: "Frequently Asked Questions",
      color: "#1ABC9C",
      fields: [
        { name: "How do I get roles?", value: "Head to #roles and react to the messages there!", inline: false },
        { name: "How do I report someone?", value: "Use the /report command or DM a moderator.", inline: false },
        { name: "Can I suggest features?", value: "Yes! Use the #suggestions channel.", inline: false },
      ],
      components: [],
    },
  },
  changelog: {
    name: "Changelog",
    form: {
      name: "Changelog",
      title: "Changelog v2.0",
      color: "#9B59B6",
      timestamp: true,
      components: [
        { type: 1, content: "What's New" },
        {
          type: COMPONENT_TYPES.CONTAINER,
          accentColor: "#57F287",
          components: [
            { type: COMPONENT_TYPES.TEXT_DISPLAY, content: "**Added:**\n- New leveling system\n- Reaction roles\n- Custom commands" },
          ],
        },
        {
          type: COMPONENT_TYPES.CONTAINER,
          accentColor: "#FEE75C",
          components: [
            { type: COMPONENT_TYPES.TEXT_DISPLAY, content: "**Changed:**\n- Improved automod filters\n- Updated welcome messages" },
          ],
        },
        {
          type: COMPONENT_TYPES.CONTAINER,
          accentColor: "#ED4245",
          components: [
            { type: COMPONENT_TYPES.TEXT_DISPLAY, content: "**Fixed:**\n- Logging reliability\n- Permission checks" },
          ],
        },
      ],
    },
  },
  ticketPanel: {
    name: "Ticket Panel",
    form: {
      name: "Ticket Panel",
      title: "Support Center",
      description: "Need help? Click the button below to open a support ticket. Our team will respond as soon as possible.\n\n**Before opening a ticket:**\n- Check #faq for common questions\n- Search the support channels\n- Be ready to describe your issue clearly",
      color: "#5865F2",
      footerText: "Average response time: under 24 hours",
      components: [
        { type: COMPONENT_TYPES.SEPARATOR, divider: true, spacing: "small" },
        { type: COMPONENT_TYPES.BUTTON, label: "Open Ticket", style: 1, customId: "btn_open_ticket", emoji: "ticket" },
        { type: COMPONENT_TYPES.BUTTON, label: "View FAQ", style: 2, customId: "btn_faq" },
      ],
    },
  },
  roleSelector: {
    name: "Role Selector",
    form: {
      name: "Role Selector",
      title: "Choose Your Roles",
      description: "Select the roles that best describe you! These help us tailor your server experience and notify you about relevant content.",
      color: "#EB459E",
      components: [
        { type: 1, content: "Notification Roles" },
        { type: COMPONENT_TYPES.BUTTON, label: "Announcements", style: 1, customId: "role_announcements" },
        { type: COMPONENT_TYPES.BUTTON, label: "Events", style: 3, customId: "role_events" },
        { type: COMPONENT_TYPES.BUTTON, label: "Updates", style: 2, customId: "role_updates" },
        { type: COMPONENT_TYPES.SEPARATOR, divider: true, spacing: "small" },
        { type: 1, content: "Interest Roles" },
        {
          type: COMPONENT_TYPES.SELECT_MENU,
          label: "Pick your interests...",
          customId: "select_interests",
          options: [
            { label: "Gaming", value: "gaming" },
            { label: "Art & Design", value: "art" },
            { label: "Music", value: "music" },
            { label: "Tech & Coding", value: "tech" },
            { label: "Movies & TV", value: "movies" },
          ],
        },
      ],
    },
  },
  giveaway: {
    name: "Giveaway Announcement",
    form: {
      name: "Giveaway Announcement",
      title: "GIVEAWAY",
      description: "We're hosting a giveaway! Read the details below and enter for your chance to win.",
      color: "#FEE75C",
      timestamp: true,
      authorName: "Giveaways",
      footerText: "Good luck to all participants!",
      fields: [
        { name: "Prize", value: "Discord Nitro (1 Month)", inline: true },
        { name: "Winners", value: "1 winner", inline: true },
        { name: "Ends", value: "In 48 hours", inline: true },
        { name: "Requirements", value: "Must be a server member for at least 7 days", inline: false },
        { name: "How to Enter", value: "React with the button below!", inline: false },
      ],
      components: [
        { type: COMPONENT_TYPES.BUTTON, label: "Enter Giveaway", style: 3, customId: "btn_giveaway_enter" },
        { type: COMPONENT_TYPES.BUTTON, label: "View Rules", style: 2, customId: "btn_giveaway_rules" },
      ],
    },
  },
};

function createDefaultComponent(type: number): EmbedComponent {
  switch (type) {
    case 1:
      return { type: 1, content: "Header Text" };
    case COMPONENT_TYPES.BUTTON:
      return { type: 2, label: "Button", style: 1, customId: `btn_${Date.now()}` };
    case COMPONENT_TYPES.SELECT_MENU:
      return { type: 3, label: "Select an option", customId: `select_${Date.now()}`, options: [{ label: "Option 1", value: "opt1" }] };
    case COMPONENT_TYPES.THUMBNAIL:
      return { type: 7, url: "", description: "" };
    case COMPONENT_TYPES.SECTION:
      return { type: 9, components: [{ type: 10, content: "Section text" }], accessory: undefined };
    case COMPONENT_TYPES.TEXT_DISPLAY:
      return { type: 10, content: "Text content here. Supports **markdown**." };
    case COMPONENT_TYPES.FILE:
      return { type: 11, url: "", description: "" };
    case COMPONENT_TYPES.MEDIA_GALLERY:
      return { type: 12, items: [{ url: "", description: "", spoiler: false }] };
    case COMPONENT_TYPES.SEPARATOR:
      return { type: 14, divider: true, spacing: "small" };
    case COMPONENT_TYPES.CONTAINER:
      return { type: 17, accentColor: "#5865F2", components: [{ type: 10, content: "Container content" }], spoiler: false };
    default:
      return { type: 10, content: "" };
  }
}

function getComponentLabel(type: number): string {
  switch (type) {
    case 1: return "Header";
    case 2: return "Button";
    case 3: return "Select Menu";
    case 7: return "Thumbnail";
    case 9: return "Section";
    case 10: return "Text Display";
    case 11: return "File";
    case 12: return "Media Gallery";
    case 14: return "Separator";
    case 17: return "Container";
    default: return "Unknown";
  }
}

function getComponentIcon(type: number) {
  switch (type) {
    case 1: return Heading;
    case 2: return MousePointer;
    case 3: return ChevronDown;
    case 7: return Image;
    case 9: return Columns;
    case 10: return Type;
    case 11: return FileText;
    case 12: return Image;
    case 14: return Minus;
    case 17: return Box;
    default: return Type;
  }
}

function formToJson(form: EmbedFormState): object {
  return {
    title: form.title || undefined,
    description: form.description || undefined,
    url: form.url || undefined,
    color: form.color ? parseInt(form.color.replace('#', ''), 16) : undefined,
    timestamp: form.timestamp ? new Date().toISOString() : undefined,
    footer: form.footerText ? { text: form.footerText, icon_url: form.footerIconUrl || undefined } : undefined,
    image: form.imageUrl ? { url: form.imageUrl } : undefined,
    thumbnail: form.thumbnailUrl ? { url: form.thumbnailUrl } : undefined,
    author: form.authorName ? { name: form.authorName, url: form.authorUrl || undefined, icon_url: form.authorIconUrl || undefined } : undefined,
    fields: form.fields.length > 0 ? form.fields : undefined,
    components: form.components.length > 0 ? form.components : undefined,
  };
}

function jsonToForm(data: any, currentName?: string): Partial<EmbedFormState> {
  return {
    name: data.name || currentName || "",
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

export function EmbedBuilderTab({ serverId, embeds, toast }: { serverId: number; embeds: Embed[]; toast: any }) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<EmbedFormState>({ ...DEFAULT_FORM });
  const [showBuilder, setShowBuilder] = useState(false);
  const [showComponentPicker, setShowComponentPicker] = useState(false);
  const [showJsonDialog, setShowJsonDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [jsonImportValue, setJsonImportValue] = useState("");
  const [jsonMode, setJsonMode] = useState<"import" | "export">("export");
  const [selectedComponentIndex, setSelectedComponentIndex] = useState<number | null>(null);
  const [editorTab, setEditorTab] = useState<"visual" | "json" | "preview">("visual");
  const [liveJson, setLiveJson] = useState(() => JSON.stringify(formToJson(DEFAULT_FORM), null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const jsonUpdatingFromForm = useRef(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    basic: true,
    author: false,
    fields: false,
    images: false,
    footer: false,
    components: true,
  });

  const createEmbed = useCreateEmbed(serverId);
  const updateEmbed = useUpdateEmbed(serverId);
  const deleteEmbed = useDeleteEmbed(serverId);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const updateForm = (key: keyof EmbedFormState, value: any) => {
    setForm(prev => {
      const next = { ...prev, [key]: value };
      jsonUpdatingFromForm.current = true;
      setLiveJson(JSON.stringify(formToJson(next), null, 2));
      setJsonError(null);
      return next;
    });
  };

  const handleLiveJsonChange = (text: string) => {
    setLiveJson(text);
    try {
      const parsed = JSON.parse(text);
      const converted = jsonToForm(parsed, form.name);
      setForm(prev => ({ ...prev, ...converted }));
      setJsonError(null);
    } catch {
      setJsonError("Invalid JSON");
    }
  };

  const openNewEmbed = () => {
    const fresh = { ...DEFAULT_FORM };
    setForm(fresh);
    setLiveJson(JSON.stringify(formToJson(fresh), null, 2));
    setJsonError(null);
    setEditingId(null);
    setShowBuilder(true);
    setSelectedComponentIndex(null);
  };

  const openEditEmbed = (embed: Embed) => {
    const loaded: EmbedFormState = {
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
    };
    setForm(loaded);
    setLiveJson(JSON.stringify(formToJson(loaded), null, 2));
    setJsonError(null);
    setEditingId(embed.id);
    setShowBuilder(true);
    setSelectedComponentIndex(null);
  };

  const duplicateEmbed = (embed: Embed) => {
    const dup: EmbedFormState = {
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
    };
    setForm(dup);
    setLiveJson(JSON.stringify(formToJson(dup), null, 2));
    setJsonError(null);
    setEditingId(null);
    setShowBuilder(true);
    setSelectedComponentIndex(null);
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
    const newComp = createDefaultComponent(type);
    updateForm("components", [...form.components, newComp]);
    setSelectedComponentIndex(form.components.length);
    setShowComponentPicker(false);
  };

  const updateComponent = (index: number, updates: Partial<EmbedComponent>) => {
    const newComps = [...form.components];
    newComps[index] = { ...newComps[index], ...updates };
    updateForm("components", newComps);
  };

  const removeComponent = (index: number) => {
    updateForm("components", form.components.filter((_, i) => i !== index));
    if (selectedComponentIndex === index) setSelectedComponentIndex(null);
    else if (selectedComponentIndex !== null && selectedComponentIndex > index) {
      setSelectedComponentIndex(selectedComponentIndex - 1);
    }
  };

  const moveComponent = (index: number, direction: "up" | "down") => {
    const newComps = [...form.components];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newComps.length) return;
    [newComps[index], newComps[targetIndex]] = [newComps[targetIndex], newComps[index]];
    updateForm("components", newComps);
    if (selectedComponentIndex === index) setSelectedComponentIndex(targetIndex);
    else if (selectedComponentIndex === targetIndex) setSelectedComponentIndex(index);
  };

  const addChildComponent = (parentIndex: number, type: number) => {
    const parent = form.components[parentIndex];
    const children = parent.components || [];
    updateComponent(parentIndex, { components: [...children, createDefaultComponent(type)] });
  };

  const updateChildComponent = (parentIndex: number, childIndex: number, updates: Partial<EmbedComponent>) => {
    const parent = form.components[parentIndex];
    const children = [...(parent.components || [])];
    children[childIndex] = { ...children[childIndex], ...updates };
    updateComponent(parentIndex, { components: children });
  };

  const removeChildComponent = (parentIndex: number, childIndex: number) => {
    const parent = form.components[parentIndex];
    const children = (parent.components || []).filter((_, i) => i !== childIndex);
    updateComponent(parentIndex, { components: children });
  };

  const addMediaItem = (compIndex: number) => {
    const comp = form.components[compIndex];
    const items = comp.items || [];
    updateComponent(compIndex, { items: [...items, { url: "", description: "", spoiler: false }] });
  };

  const updateMediaItem = (compIndex: number, itemIndex: number, updates: Partial<{ url: string; description: string; spoiler: boolean }>) => {
    const comp = form.components[compIndex];
    const items = [...(comp.items || [])];
    items[itemIndex] = { ...items[itemIndex], ...updates };
    updateComponent(compIndex, { items });
  };

  const removeMediaItem = (compIndex: number, itemIndex: number) => {
    const comp = form.components[compIndex];
    const items = (comp.items || []).filter((_, i) => i !== itemIndex);
    updateComponent(compIndex, { items });
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

  const handleJsonExport = () => {
    const jsonData = {
      name: form.name,
      title: form.title || undefined,
      description: form.description || undefined,
      url: form.url || undefined,
      color: form.color ? parseInt(form.color.replace('#', ''), 16) : undefined,
      timestamp: form.timestamp ? new Date().toISOString() : undefined,
      footer: form.footerText ? { text: form.footerText, icon_url: form.footerIconUrl || undefined } : undefined,
      image: form.imageUrl ? { url: form.imageUrl } : undefined,
      thumbnail: form.thumbnailUrl ? { url: form.thumbnailUrl } : undefined,
      author: form.authorName ? { name: form.authorName, url: form.authorUrl || undefined, icon_url: form.authorIconUrl || undefined } : undefined,
      fields: form.fields.length > 0 ? form.fields : undefined,
      components: form.components.length > 0 ? form.components : undefined,
    };
    setJsonImportValue(JSON.stringify(jsonData, null, 2));
    setJsonMode("export");
    setShowJsonDialog(true);
  };

  const handleJsonImport = () => {
    setJsonImportValue("");
    setJsonMode("import");
    setShowJsonDialog(true);
  };

  const applyJsonImport = () => {
    try {
      const data = JSON.parse(jsonImportValue);
      const converted = jsonToForm(data, form.name);
      setForm(prev => ({ ...prev, ...converted }));
      setLiveJson(JSON.stringify(formToJson({ ...form, ...converted }), null, 2));
      setJsonError(null);
      setShowJsonDialog(false);
      toast({ title: "Imported", description: "JSON data applied to the builder." });
    } catch {
      toast({ title: "Invalid JSON", description: "Could not parse the JSON data.", variant: "destructive" });
    }
  };

  const loadTemplate = (key: string) => {
    const template = TEMPLATES[key];
    if (!template) return;
    const loaded = { ...DEFAULT_FORM, ...template.form } as EmbedFormState;
    setForm(loaded);
    setLiveJson(JSON.stringify(formToJson(loaded), null, 2));
    setJsonError(null);
    setEditingId(null);
    setShowTemplateDialog(false);
    setShowBuilder(true);
    setSelectedComponentIndex(null);
  };

  const renderComponentEditor = (comp: EmbedComponent, index: number, isChild?: boolean, parentIndex?: number) => {
    const Icon = getComponentIcon(comp.type);
    const label = getComponentLabel(comp.type);

    const onUpdate = isChild && parentIndex !== undefined
      ? (updates: Partial<EmbedComponent>) => updateChildComponent(parentIndex, index, updates)
      : (updates: Partial<EmbedComponent>) => updateComponent(index, updates);

    const onRemove = isChild && parentIndex !== undefined
      ? () => removeChildComponent(parentIndex, index)
      : () => removeComponent(index);

    return (
      <div key={index} className={`rounded-lg border border-white/5 bg-background/30 p-3 space-y-2 ${!isChild && selectedComponentIndex === index ? 'ring-1 ring-primary/50' : ''}`}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium flex items-center gap-1.5">
            <Icon className="w-3 h-3 text-primary" />
            {label}
          </span>
          <div className="flex items-center gap-1">
            {!isChild && (
              <>
                <Button variant="ghost" size="icon" onClick={() => moveComponent(index, "up")} disabled={index === 0} className="h-6 w-6" data-testid={`move-up-${index}`}>
                  <ArrowUp className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => moveComponent(index, "down")} disabled={index === form.components.length - 1} className="h-6 w-6" data-testid={`move-down-${index}`}>
                  <ArrowDown className="w-3 h-3" />
                </Button>
              </>
            )}
            <Button variant="ghost" size="icon" onClick={onRemove} className="h-6 w-6 text-destructive hover:text-destructive" data-testid={`remove-component-${index}`}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {comp.type === 1 && (
          <div>
            <Label className="text-xs">Header Text</Label>
            <Input value={comp.content || ""} onChange={(e) => onUpdate({ content: e.target.value })} placeholder="Header text" className="bg-background/50 border-white/10 h-8 text-xs mt-1" data-testid={`header-content-${index}`} />
          </div>
        )}

        {comp.type === 10 && (
          <div>
            <Label className="text-xs">Content (Markdown supported)</Label>
            <Textarea value={comp.content || ""} onChange={(e) => onUpdate({ content: e.target.value })} placeholder="Text content with **markdown**" className="bg-background/50 border-white/10 min-h-[60px] text-xs mt-1" data-testid={`text-content-${index}`} />
          </div>
        )}

        {comp.type === 14 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Switch checked={comp.divider !== false} onCheckedChange={(v) => onUpdate({ divider: v })} className="scale-75" data-testid={`separator-divider-${index}`} />
              <Label className="text-xs text-muted-foreground">Show divider line</Label>
            </div>
            <div>
              <Label className="text-xs">Spacing</Label>
              <Select value={comp.spacing || "small"} onValueChange={(v) => onUpdate({ spacing: v as "small" | "large" })}>
                <SelectTrigger className="bg-background/50 border-white/10 h-8 text-xs mt-1" data-testid={`separator-spacing-${index}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {comp.type === 11 && (
          <div className="space-y-2">
            <div>
              <Label className="text-xs">File URL</Label>
              <Input value={comp.url || ""} onChange={(e) => onUpdate({ url: e.target.value })} placeholder="https://example.com/file.pdf" className="bg-background/50 border-white/10 h-8 text-xs mt-1" data-testid={`file-url-${index}`} />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Input value={comp.description || ""} onChange={(e) => onUpdate({ description: e.target.value })} placeholder="File description" className="bg-background/50 border-white/10 h-8 text-xs mt-1" data-testid={`file-desc-${index}`} />
            </div>
          </div>
        )}

        {comp.type === 7 && (
          <div className="space-y-2">
            <div>
              <Label className="text-xs">Thumbnail URL</Label>
              <Input value={comp.url || ""} onChange={(e) => onUpdate({ url: e.target.value })} placeholder="https://example.com/image.png" className="bg-background/50 border-white/10 h-8 text-xs mt-1" data-testid={`thumbnail-url-${index}`} />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Input value={comp.description || ""} onChange={(e) => onUpdate({ description: e.target.value })} placeholder="Alt text" className="bg-background/50 border-white/10 h-8 text-xs mt-1" data-testid={`thumbnail-desc-${index}`} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={comp.spoiler || false} onCheckedChange={(v) => onUpdate({ spoiler: v })} className="scale-75" data-testid={`thumbnail-spoiler-${index}`} />
              <Label className="text-xs text-muted-foreground">Spoiler</Label>
            </div>
          </div>
        )}

        {comp.type === 12 && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Media Items</Label>
            {(comp.items || []).map((item, mi) => (
              <div key={mi} className="rounded border border-white/5 bg-background/20 p-2 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">Item {mi + 1}</span>
                  <Button variant="ghost" size="icon" onClick={() => removeMediaItem(index, mi)} className="h-5 w-5 text-destructive" data-testid={`remove-media-${index}-${mi}`}>
                    <Trash2 className="w-2.5 h-2.5" />
                  </Button>
                </div>
                <Input value={item.url} onChange={(e) => updateMediaItem(index, mi, { url: e.target.value })} placeholder="Image URL" className="bg-background/50 border-white/10 h-7 text-xs" data-testid={`media-url-${index}-${mi}`} />
                <Input value={item.description || ""} onChange={(e) => updateMediaItem(index, mi, { description: e.target.value })} placeholder="Description (alt text)" className="bg-background/50 border-white/10 h-7 text-xs" data-testid={`media-desc-${index}-${mi}`} />
                <div className="flex items-center gap-2">
                  <Switch checked={item.spoiler || false} onCheckedChange={(v) => updateMediaItem(index, mi, { spoiler: v })} className="scale-75" data-testid={`media-spoiler-${index}-${mi}`} />
                  <Label className="text-[10px] text-muted-foreground">Spoiler</Label>
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => addMediaItem(index)} className="w-full border-dashed border-white/10 text-muted-foreground text-xs h-7 gap-1" data-testid={`add-media-item-${index}`}>
              <Plus className="w-3 h-3" /> Add Media Item
            </Button>
          </div>
        )}

        {comp.type === 9 && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Section Content</Label>
            {(comp.components || []).map((child, ci) => (
              <div key={ci} className="pl-3 border-l-2 border-primary/30">
                {renderComponentEditor(child, ci, true, index)}
              </div>
            ))}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => addChildComponent(index, COMPONENT_TYPES.TEXT_DISPLAY)} className="flex-1 border-dashed border-white/10 text-muted-foreground text-xs h-7 gap-1" data-testid={`add-section-text-${index}`}>
                <Type className="w-3 h-3" /> Add Text
              </Button>
            </div>

            <div className="mt-2 pt-2 border-t border-white/5">
              <Label className="text-xs text-muted-foreground">Accessory (optional)</Label>
              {comp.accessory ? (
                <div className="mt-1 rounded border border-white/5 bg-background/20 p-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">{comp.accessory.type === 7 ? "Thumbnail" : "Button"}</span>
                    <Button variant="ghost" size="icon" onClick={() => onUpdate({ accessory: undefined })} className="h-5 w-5 text-destructive" data-testid={`remove-accessory-${index}`}>
                      <X className="w-2.5 h-2.5" />
                    </Button>
                  </div>
                  {comp.accessory.type === 7 && (
                    <>
                      <Input value={comp.accessory.url || ""} onChange={(e) => onUpdate({ accessory: { ...comp.accessory!, url: e.target.value } })} placeholder="Thumbnail URL" className="bg-background/50 border-white/10 h-7 text-xs" data-testid={`accessory-thumb-url-${index}`} />
                      <Input value={comp.accessory.description || ""} onChange={(e) => onUpdate({ accessory: { ...comp.accessory!, description: e.target.value } })} placeholder="Description" className="bg-background/50 border-white/10 h-7 text-xs" data-testid={`accessory-thumb-desc-${index}`} />
                    </>
                  )}
                  {comp.accessory.type === 2 && (
                    <>
                      <Input value={comp.accessory.label || ""} onChange={(e) => onUpdate({ accessory: { ...comp.accessory!, label: e.target.value } })} placeholder="Button label" className="bg-background/50 border-white/10 h-7 text-xs" data-testid={`accessory-btn-label-${index}`} />
                      <Select value={String(comp.accessory.style || 1)} onValueChange={(v) => onUpdate({ accessory: { ...comp.accessory!, style: parseInt(v) } })}>
                        <SelectTrigger className="bg-background/50 border-white/10 h-7 text-xs" data-testid={`accessory-btn-style-${index}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Primary</SelectItem>
                          <SelectItem value="2">Secondary</SelectItem>
                          <SelectItem value="3">Success</SelectItem>
                          <SelectItem value="4">Danger</SelectItem>
                        </SelectContent>
                      </Select>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex gap-2 mt-1">
                  <Button variant="outline" size="sm" onClick={() => onUpdate({ accessory: { type: 7, url: "", description: "" } })} className="flex-1 border-dashed border-white/10 text-muted-foreground text-xs h-7 gap-1" data-testid={`add-thumbnail-accessory-${index}`}>
                    <Image className="w-3 h-3" /> Thumbnail
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onUpdate({ accessory: { type: 2, label: "Button", style: 1, customId: `btn_${Date.now()}` } })} className="flex-1 border-dashed border-white/10 text-muted-foreground text-xs h-7 gap-1" data-testid={`add-button-accessory-${index}`}>
                    <MousePointer className="w-3 h-3" /> Button
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {comp.type === 17 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-xs">Accent Color</Label>
              <input type="color" value={comp.accentColor || "#5865F2"} onChange={(e) => onUpdate({ accentColor: e.target.value })} className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent" data-testid={`container-color-${index}`} />
              <Input value={comp.accentColor || "#5865F2"} onChange={(e) => onUpdate({ accentColor: e.target.value })} className="bg-background/50 border-white/10 h-7 w-24 font-mono text-xs" data-testid={`container-color-hex-${index}`} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={comp.spoiler || false} onCheckedChange={(v) => onUpdate({ spoiler: v })} className="scale-75" data-testid={`container-spoiler-${index}`} />
              <Label className="text-xs text-muted-foreground">Spoiler</Label>
            </div>
            <Label className="text-xs text-muted-foreground">Child Components</Label>
            {(comp.components || []).map((child, ci) => (
              <div key={ci} className="pl-3 border-l-2 border-primary/30">
                {renderComponentEditor(child, ci, true, index)}
              </div>
            ))}
            <div className="flex gap-1 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => addChildComponent(index, COMPONENT_TYPES.TEXT_DISPLAY)} className="border-dashed border-white/10 text-muted-foreground text-xs h-7 gap-1" data-testid={`add-container-text-${index}`}>
                <Type className="w-3 h-3" /> Text
              </Button>
              <Button variant="outline" size="sm" onClick={() => addChildComponent(index, COMPONENT_TYPES.SEPARATOR)} className="border-dashed border-white/10 text-muted-foreground text-xs h-7 gap-1" data-testid={`add-container-sep-${index}`}>
                <Minus className="w-3 h-3" /> Separator
              </Button>
              <Button variant="outline" size="sm" onClick={() => addChildComponent(index, COMPONENT_TYPES.MEDIA_GALLERY)} className="border-dashed border-white/10 text-muted-foreground text-xs h-7 gap-1" data-testid={`add-container-media-${index}`}>
                <Image className="w-3 h-3" /> Media
              </Button>
            </div>
          </div>
        )}

        {comp.type === 2 && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Label</Label>
                <Input value={comp.label || ""} onChange={(e) => onUpdate({ label: e.target.value })} placeholder="Click me" className="bg-background/50 border-white/10 h-8 text-xs mt-1" data-testid={`button-label-${index}`} />
              </div>
              <div>
                <Label className="text-xs">Style</Label>
                <Select value={String(comp.style || 1)} onValueChange={(v) => onUpdate({ style: parseInt(v) })}>
                  <SelectTrigger className="bg-background/50 border-white/10 h-8 text-xs mt-1" data-testid={`button-style-${index}`}>
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
                  onChange={(e) => comp.style === 5 ? onUpdate({ url: e.target.value }) : onUpdate({ customId: e.target.value })}
                  placeholder={comp.style === 5 ? "https://..." : "custom_id"}
                  className="bg-background/50 border-white/10 h-8 text-xs mt-1"
                  data-testid={`button-id-${index}`}
                />
              </div>
              <div>
                <Label className="text-xs">Emoji</Label>
                <Input value={comp.emoji || ""} onChange={(e) => onUpdate({ emoji: e.target.value })} placeholder="icon" className="bg-background/50 border-white/10 h-8 text-xs mt-1" data-testid={`button-emoji-${index}`} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={comp.disabled || false} onCheckedChange={(v) => onUpdate({ disabled: v })} className="scale-75" data-testid={`button-disabled-${index}`} />
              <Label className="text-xs text-muted-foreground">Disabled</Label>
            </div>
          </>
        )}

        {comp.type === 3 && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Placeholder</Label>
                <Input value={comp.label || ""} onChange={(e) => onUpdate({ label: e.target.value })} placeholder="Select an option..." className="bg-background/50 border-white/10 h-8 text-xs mt-1" data-testid={`select-placeholder-${index}`} />
              </div>
              <div>
                <Label className="text-xs">Custom ID</Label>
                <Input value={comp.customId || ""} onChange={(e) => onUpdate({ customId: e.target.value })} placeholder="select_id" className="bg-background/50 border-white/10 h-8 text-xs mt-1" data-testid={`select-id-${index}`} />
              </div>
            </div>
            <div className="space-y-2 mt-2">
              <Label className="text-xs text-muted-foreground">Options</Label>
              {(comp.options || []).map((opt, oi) => (
                <div key={oi} className="flex gap-2 items-start">
                  <div className="flex-1 grid grid-cols-3 gap-1">
                    <Input value={opt.label} onChange={(e) => updateSelectOption(index, oi, "label", e.target.value)} placeholder="Label" className="bg-background/50 border-white/10 h-7 text-xs" data-testid={`select-opt-label-${index}-${oi}`} />
                    <Input value={opt.value} onChange={(e) => updateSelectOption(index, oi, "value", e.target.value)} placeholder="Value" className="bg-background/50 border-white/10 h-7 text-xs" data-testid={`select-opt-value-${index}-${oi}`} />
                    <Input value={opt.description || ""} onChange={(e) => updateSelectOption(index, oi, "description", e.target.value)} placeholder="Description" className="bg-background/50 border-white/10 h-7 text-xs" data-testid={`select-opt-desc-${index}-${oi}`} />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeSelectOption(index, oi)} className="h-7 w-7 text-destructive shrink-0" data-testid={`remove-select-opt-${index}-${oi}`}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => addSelectOption(index)} className="w-full border-dashed border-white/10 text-muted-foreground text-xs h-7 gap-1" data-testid={`add-select-opt-${index}`}>
                <Plus className="w-3 h-3" /> Add Option
              </Button>
            </div>
          </>
        )}
      </div>
    );
  };

  if (showBuilder) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Button variant="ghost" onClick={() => setShowBuilder(false)} className="gap-2 text-muted-foreground hover:text-foreground" data-testid="back-to-embeds">
            <ChevronDown className="w-4 h-4 rotate-90" /> Back to Embeds
          </Button>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleJsonImport} className="gap-1" data-testid="button-json-import">
              <Upload className="w-3 h-3" /> Import JSON
            </Button>
            <Button variant="outline" size="sm" onClick={handleJsonExport} className="gap-1" data-testid="button-json-export">
              <Download className="w-3 h-3" /> Export JSON
            </Button>
            <Button onClick={saveEmbed} disabled={createEmbed.isPending || updateEmbed.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground box-glow gap-2" data-testid="save-embed">
              <Save className="w-4 h-4" />
              {createEmbed.isPending || updateEmbed.isPending ? "Saving..." : editingId ? "Update Embed" : "Save Embed"}
            </Button>
          </div>
        </div>

        <div className="mb-4">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Template Name</Label>
          <Input
            value={form.name}
            onChange={(e) => updateForm("name", e.target.value)}
            placeholder="e.g. Welcome Message, Rules, Announcement"
            className="bg-background/50 border-white/10 mt-1 max-w-lg"
            data-testid="input-embed-name"
          />
        </div>

        <Tabs value={editorTab} onValueChange={(v) => setEditorTab(v as any)}>
          <TabsList className="mb-4">
            <TabsTrigger value="visual" className="gap-1.5 text-xs">
              <Edit3 className="w-3 h-3" /> Visual Editor
            </TabsTrigger>
            <TabsTrigger value="json" className="gap-1.5 text-xs">
              <Code className="w-3 h-3" /> JSON
              {jsonError && <span className="w-2 h-2 rounded-full bg-destructive" />}
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-1.5 text-xs">
              <Eye className="w-3 h-3" /> Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="visual" className="mt-0">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="space-y-3 max-h-[calc(100vh-260px)] overflow-y-auto pr-2">
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
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
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
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-muted-foreground font-medium">Field {i + 1}</span>
                          <Button variant="ghost" size="icon" onClick={() => removeField(i)} className="h-6 w-6 text-destructive hover:text-destructive" data-testid={`remove-field-${i}`}>
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

                <CollapsibleSection title={`Components v2 (${form.components.length})`} expanded={expandedSections.components} onToggle={() => toggleSection("components")}>
                  <div className="space-y-3">
                    {form.components.map((comp, i) => renderComponentEditor(comp, i))}

                    <Button variant="outline" size="sm" onClick={() => setShowComponentPicker(true)} className="w-full border-dashed border-white/10 text-muted-foreground hover:text-foreground gap-2" data-testid="add-component-picker">
                      <Plus className="w-3 h-3" /> Add Component
                    </Button>
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
          </TabsContent>

          <TabsContent value="json" className="mt-0">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <Label className="text-sm font-medium">Discord Embed JSON</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Edit either side — both sync in real time</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => { navigator.clipboard.writeText(liveJson); toast({ title: "Copied", description: "JSON copied to clipboard." }); }} data-testid="button-copy-live-json">
                      <Copy className="w-3 h-3" /> Copy
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        handleLiveJsonChange(text);
                      } catch {}
                    }} data-testid="button-paste-json">
                      <Upload className="w-3 h-3" /> Paste
                    </Button>
                  </div>
                </div>
                {jsonError && (
                  <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-xs text-destructive" data-testid="json-error">
                    {jsonError}
                  </div>
                )}
                <Textarea
                  value={liveJson}
                  onChange={(e) => handleLiveJsonChange(e.target.value)}
                  className={`bg-background/50 font-mono text-xs min-h-[500px] resize-none ${jsonError ? 'border-destructive/50' : 'border-white/10'}`}
                  spellCheck={false}
                  data-testid="json-live-editor"
                />
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
          </TabsContent>

          <TabsContent value="preview" className="mt-0">
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-display flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary" /> Full Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-[#313338] rounded-lg p-6 min-h-[300px]">
                  <EmbedPreview embed={form as any} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={showComponentPicker} onOpenChange={setShowComponentPicker}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display">Add Component</DialogTitle>
              <DialogDescription>Select a Discord Components v2 type to add to your embed.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto">
              {COMPONENT_PICKER_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.type + "-" + item.label}
                    onClick={() => addComponent(item.type)}
                    className="flex items-center gap-3 p-3 rounded-lg border border-white/5 bg-background/30 hover:bg-primary/10 hover:border-primary/30 transition-colors text-left"
                    data-testid={`picker-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{item.label}</div>
                      <div className="text-xs text-muted-foreground">{item.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showJsonDialog} onOpenChange={setShowJsonDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="font-display">{jsonMode === "export" ? "Export JSON" : "Import JSON"}</DialogTitle>
              <DialogDescription>
                {jsonMode === "export" ? "Copy the JSON below to use in your Discord bot or share with others." : "Paste Discord embed JSON to import into the builder."}
              </DialogDescription>
            </DialogHeader>
            <Textarea
              value={jsonImportValue}
              onChange={(e) => setJsonImportValue(e.target.value)}
              className="bg-background/50 border-white/10 min-h-[300px] font-mono text-xs"
              readOnly={jsonMode === "export"}
              data-testid="json-textarea"
            />
            <DialogFooter className="gap-2">
              {jsonMode === "export" ? (
                <Button onClick={() => { navigator.clipboard.writeText(jsonImportValue); toast({ title: "Copied", description: "JSON copied to clipboard." }); }} className="gap-1" data-testid="button-copy-json">
                  <Copy className="w-3 h-3" /> Copy to Clipboard
                </Button>
              ) : (
                <Button onClick={applyJsonImport} className="gap-1" data-testid="button-apply-json">
                  <Upload className="w-3 h-3" /> Apply Import
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-xl font-display font-bold text-glow" data-testid="text-embed-title">Embed Builder</h2>
          <p className="text-muted-foreground text-sm">Create rich message templates with Components v2 support.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setShowTemplateDialog(true)} className="gap-2" data-testid="button-templates">
            <BookTemplate className="w-4 h-4" /> Templates
          </Button>
          <Button onClick={openNewEmbed} className="bg-primary hover:bg-primary/90 text-primary-foreground box-glow gap-2" data-testid="button-new-embed">
            <Plus className="w-4 h-4" /> New Embed
          </Button>
        </div>
      </div>

      {embeds.length === 0 ? (
        <div className="py-12 text-center glass-card rounded-xl border border-dashed border-white/10" data-testid="empty-embeds">
          <Layout className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
          <h3 className="text-lg font-medium">No embeds yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Create your first embed template or start from a template.</p>
          <div className="flex items-center justify-center gap-2">
            <Button onClick={openNewEmbed} variant="outline" className="gap-2" data-testid="button-create-first-embed">
              <Plus className="w-4 h-4" /> Create Embed
            </Button>
            <Button onClick={() => setShowTemplateDialog(true)} variant="outline" className="gap-2" data-testid="button-use-template">
              <BookTemplate className="w-4 h-4" /> Use Template
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {embeds.map((embed) => (
            <Card key={embed.id} className="glass-card hover:border-primary/30 transition-colors group" data-testid={`card-embed-${embed.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: embed.color || "#5865F2" }} />
                    <CardTitle className="text-sm truncate">{embed.name}</CardTitle>
                  </div>
                  <div className="flex gap-1 invisible group-hover:visible">
                    <Button variant="ghost" size="icon" onClick={() => duplicateEmbed(embed)} className="h-7 w-7" data-testid={`duplicate-embed-${embed.id}`}>
                      <Copy className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEditEmbed(embed)} className="h-7 w-7" data-testid={`edit-embed-${embed.id}`}>
                      <Edit3 className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        deleteEmbed.mutate(embed.id, {
                          onSuccess: () => toast({ title: "Embed deleted", description: `"${embed.name}" removed.` }),
                        });
                      }}
                      className="h-7 w-7 text-destructive hover:text-destructive"
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
                      <Badge variant="secondary" className="text-[10px]">{((embed.fields as any[]) || []).length} fields</Badge>
                    )}
                    {((embed.components as any[]) || []).length > 0 && (
                      <Badge variant="secondary" className="text-[10px]">{((embed.components as any[]) || []).length} components</Badge>
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

      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Template Library</DialogTitle>
            <DialogDescription>Start with a pre-built template and customize it to your needs.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto">
            {Object.entries(TEMPLATES).map(([key, template]) => (
              <button
                key={key}
                onClick={() => loadTemplate(key)}
                className="flex items-center gap-3 p-3 rounded-lg border border-white/5 bg-background/30 hover:bg-primary/10 hover:border-primary/30 transition-colors text-left"
                data-testid={`template-${key}`}
              >
                <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                  <BookTemplate className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium">{template.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {template.form.title || template.form.description || "Pre-built template"}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CollapsibleSection({ title, expanded, onToggle, children }: { title: string; expanded: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/5 bg-secondary/20 overflow-hidden">
      <button onClick={onToggle} className="w-full px-4 py-3 flex items-center justify-between gap-2 text-sm font-medium hover:bg-white/5 transition-colors" data-testid={`section-${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}>
        {title}
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {expanded && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
