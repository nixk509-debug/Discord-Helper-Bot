/**
 * Embed Inspector — premium redesign
 * Replaces the flat inline editor with collapsible section cards,
 * Discord colour swatches, char-count indicators, a variable picker,
 * embed templates, JSON copy, multi-embed switcher, and premium field cards.
 */

import { useState, useRef } from "react";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Copy,
  Code2,
  Braces,
  Sparkles,
  Image,
  AlignLeft,
  User,
  LayoutGrid,
  MessageSquare,
  CheckCheck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { StudioEmbedDraft, EmbedFieldType } from "@shared/schema";
import { EMBED_TEMPLATES } from "./studio-embed-templates";

// ─── Discord colour swatches ─────────────────────────────────────────────────

const SWATCHES = [
  { hex: "#5865F2", label: "Blurple" },
  { hex: "#EB459E", label: "Fuchsia" },
  { hex: "#57F287", label: "Green" },
  { hex: "#FEE75C", label: "Yellow" },
  { hex: "#ED4245", label: "Red" },
  { hex: "#E67E22", label: "Orange" },
  { hex: "#9B59B6", label: "Purple" },
  { hex: "#1ABC9C", label: "Teal" },
  { hex: "#3498DB", label: "Blue" },
  { hex: "#2C2F33", label: "Dark" },
  { hex: "#E0001A", label: "Archivist" },
  { hex: "#FF6B6B", label: "Coral" },
  { hex: "#FFFFFF", label: "White" },
  { hex: "#99AAB5", label: "Grey" },
  { hex: "#2ECC71", label: "Emerald" },
  { hex: "#C0392B", label: "Crimson" },
  { hex: "#F1C40F", label: "Gold" },
  { hex: "#27AE60", label: "Forest" },
];

// ─── Variable groups ──────────────────────────────────────────────────────────

const VARIABLE_GROUPS = [
  {
    label: "User",
    vars: ["{user.name}", "{user.mention}", "{user.id}", "{user.tag}"],
  },
  {
    label: "Server",
    vars: ["{server.name}", "{server.memberCount}", "{server.id}"],
  },
  {
    label: "Channel",
    vars: ["{channel.name}", "{channel.id}"],
  },
  {
    label: "Time",
    vars: ["{timestamp}", "{date}", "{time}"],
  },
];

// ─── Char limit helpers ───────────────────────────────────────────────────────

const LIMITS: Record<string, number> = {
  title: 256,
  description: 4096,
  fieldName: 256,
  fieldValue: 1024,
  footer: 2048,
  authorName: 256,
};

function CharCount({ value, field }: { value: string; field: keyof typeof LIMITS }) {
  const limit = LIMITS[field];
  const len = (value || "").length;
  const pct = len / limit;
  return (
    <span
      className={cn(
        "ml-auto text-xs tabular-nums",
        pct >= 1 ? "text-red-400" : pct >= 0.9 ? "text-amber-400" : "text-white/32",
      )}
    >
      {len}/{limit}
    </span>
  );
}

// ─── Variable picker popover ──────────────────────────────────────────────────

interface VarPickerProps {
  onInsert: (variable: string) => void;
  onClose: () => void;
}

function VarPicker({ onInsert, onClose }: VarPickerProps) {
  return (
    <div className="absolute right-0 top-full z-50 mt-1 w-64 rounded-[16px] border border-white/12 bg-[#0d0e11] p-3 shadow-2xl">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-white/40">Variables</span>
        <button type="button" onClick={onClose} className="text-white/40 hover:text-white/70">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {VARIABLE_GROUPS.map((group) => (
        <div key={group.label} className="mb-2">
          <p className="mb-1 text-[10px] uppercase tracking-widest text-white/30">{group.label}</p>
          <div className="flex flex-wrap gap-1">
            {group.vars.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => { onInsert(v); onClose(); }}
                className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-xs text-white/72 hover:border-[rgba(224,0,26,0.3)] hover:text-white transition"
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Smart text input with var picker ────────────────────────────────────────

interface SmartInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  field: keyof typeof LIMITS;
  label: string;
  multiline?: boolean;
  minHeight?: string;
}

function SmartInput({ value, onChange, placeholder, field, label, multiline, minHeight = "min-h-[110px]" }: SmartInputProps) {
  const [showVars, setShowVars] = useState(false);
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  const insertVariable = (variable: string) => {
    const el = ref.current;
    if (!el) { onChange((value || "") + variable); return; }
    const start = el.selectionStart ?? (value || "").length;
    const end = el.selectionEnd ?? start;
    const next = (value || "").slice(0, start) + variable + (value || "").slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + variable.length, start + variable.length);
    });
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1">
        <Label>{label}</Label>
        <CharCount value={value} field={field} />
      </div>
      <div className="relative">
        {multiline ? (
          <Textarea
            ref={ref as React.RefObject<HTMLTextAreaElement>}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={cn(minHeight, "pr-10")}
          />
        ) : (
          <Input
            ref={ref as React.RefObject<HTMLInputElement>}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="pr-10"
          />
        )}
        <button
          type="button"
          onClick={() => setShowVars((v) => !v)}
          className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-md border border-white/12 bg-white/[0.04] text-white/38 hover:border-[rgba(224,0,26,0.3)] hover:text-[#ff6070] transition"
          title="Insert variable"
        >
          <Braces className="h-3 w-3" />
        </button>
        {showVars && (
          <VarPicker onInsert={insertVariable} onClose={() => setShowVars(false)} />
        )}
      </div>
    </div>
  );
}

// ─── Collapsible section card ─────────────────────────────────────────────────

interface SectionCardProps {
  title: string;
  summary?: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}

function SectionCard({ title, summary, icon, defaultOpen = false, danger = false, children }: SectionCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      className={cn(
        "rounded-[18px] border transition-colors",
        danger
          ? "border-[rgba(224,0,26,0.2)] bg-[rgba(20,10,12,0.98)]"
          : "border-white/8 bg-[linear-gradient(180deg,rgba(12,13,16,0.99),rgba(8,9,11,1))]",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
      >
        {icon && (
          <div className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] border",
            danger
              ? "border-[rgba(224,0,26,0.24)] bg-[rgba(32,13,16,0.9)] text-[#ff6070]"
              : "border-white/10 bg-white/[0.04] text-white/52",
          )}>
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className={cn("text-sm font-semibold", danger ? "text-[#ff6070]" : "text-white")}>{title}</p>
          {summary && !open && (
            <p className="mt-0.5 truncate text-xs text-white/38">{summary}</p>
          )}
        </div>
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-white/38" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white/28" />
        )}
      </button>
      {open && (
        <div className="border-t border-white/6 px-4 pb-4 pt-4">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Colour swatch picker ─────────────────────────────────────────────────────

interface ColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
}

function ColorPicker({ value, onChange }: ColorPickerProps) {
  const current = value || "#E0001A";
  // Normalise to uppercase for comparison
  const currentUp = current.toUpperCase();

  return (
    <div className="space-y-3">
      {/* Live preview strip */}
      <div className="flex items-center gap-3 rounded-[14px] border border-white/8 bg-[#0b0d10] px-3 py-2.5">
        <div
          className="h-8 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: current }}
        />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-white/70">Accent preview</p>
          <p className="text-xs text-white/38">{current}</p>
        </div>
      </div>

      {/* Swatch grid */}
      <div className="grid grid-cols-9 gap-1.5">
        {SWATCHES.map((s) => {
          const selected = s.hex.toUpperCase() === currentUp;
          return (
            <button
              key={s.hex}
              type="button"
              title={s.label}
              onClick={() => onChange(s.hex)}
              className={cn(
                "h-6 w-6 rounded-md border transition-transform hover:scale-110",
                selected
                  ? "border-[#ff6070] ring-1 ring-[#ff6070] ring-offset-1 ring-offset-[#0a0b0d]"
                  : "border-white/10 hover:border-white/28",
              )}
              style={{ backgroundColor: s.hex }}
            />
          );
        })}
      </div>

      {/* Hex input */}
      <div className="flex items-center gap-2">
        <div
          className="h-8 w-8 shrink-0 rounded-[8px] border border-white/12"
          style={{ backgroundColor: current }}
        />
        <Input
          value={current}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#E0001A"
          className="font-mono text-sm"
        />
      </div>
    </div>
  );
}

// ─── Templates overlay ────────────────────────────────────────────────────────

interface TemplatesOverlayProps {
  onApply: (partial: Partial<StudioEmbedDraft>) => void;
  onClose: () => void;
}

function TemplatesOverlay({ onApply, onClose }: TemplatesOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-[22px] border border-white/10 bg-[#0c0d10] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-white/38">Quick-fill</p>
            <h3 className="mt-1 text-lg font-semibold text-white">Embed Templates</h3>
          </div>
          <button type="button" onClick={onClose} className="text-white/38 hover:text-white/70">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {EMBED_TEMPLATES.map((tmpl) => (
            <button
              key={tmpl.id}
              type="button"
              onClick={() => { onApply(tmpl.apply()); onClose(); }}
              className="flex items-start gap-3 rounded-[14px] border border-white/8 bg-white/[0.02] p-3 text-left transition hover:border-[rgba(224,0,26,0.24)] hover:bg-[rgba(20,12,14,0.96)]"
            >
              <span className="text-2xl leading-none">{tmpl.emoji}</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">{tmpl.label}</p>
                <p className="mt-0.5 text-xs text-white/44">{tmpl.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Field card ───────────────────────────────────────────────────────────────

interface FieldCardProps {
  field: EmbedFieldType;
  index: number;
  total: number;
  onChangeName: (val: string) => void;
  onChangeValue: (val: string) => void;
  onChangeInline: (val: boolean) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  active?: boolean;
}

function FieldCard({
  field, index, total,
  onChangeName, onChangeValue, onChangeInline,
  onMoveUp, onMoveDown, onDelete,
  active,
}: FieldCardProps) {
  const isSpacer = field.name === "\u200B" && field.value === "\u200B";

  return (
    <div
      className={cn(
        "rounded-[18px] border transition-colors",
        active
          ? "border-[rgba(224,0,26,0.22)] bg-[linear-gradient(180deg,rgba(20,13,15,0.98),rgba(10,10,11,1))]"
          : "border-white/8 bg-[#0b0d10]",
      )}
    >
      {/* Card header */}
      <div className="flex items-center gap-2 px-4 py-2.5">
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border border-white/10 bg-white/[0.04]">
          <LayoutGrid className="h-3 w-3 text-white/38" />
        </div>
        <p className="flex-1 text-xs font-semibold text-white/60">
          {isSpacer ? "Spacer" : `Field ${index + 1}`}
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            className="flex h-6 w-6 items-center justify-center rounded-md text-white/30 hover:text-white/70 disabled:opacity-30 transition"
            title="Move up"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="flex h-6 w-6 items-center justify-center rounded-md text-white/30 hover:text-white/70 disabled:opacity-30 transition"
            title="Move down"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="flex h-6 w-6 items-center justify-center rounded-md text-white/28 hover:text-red-400 transition"
            title="Remove field"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {!isSpacer && (
        <div className="space-y-3 border-t border-white/6 px-4 pb-4 pt-3">
          <SmartInput
            value={field.name}
            onChange={onChangeName}
            placeholder="Field title"
            field="fieldName"
            label="Name"
          />
          <SmartInput
            value={field.value}
            onChange={onChangeValue}
            placeholder="Field value"
            field="fieldValue"
            label="Value"
            multiline
          />
          {/* Inline toggle */}
          <div className="flex items-center justify-between rounded-[14px] border border-white/8 bg-[#090a0d] px-3 py-2.5">
            <p className="text-xs font-medium text-white/70">Inline</p>
            <Switch
              checked={Boolean(field.inline)}
              onCheckedChange={onChangeInline}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main EmbedInspector ──────────────────────────────────────────────────────

export interface EmbedInspectorProps {
  /** All embeds in the current view — for multi-embed switcher */
  embeds: StudioEmbedDraft[];
  /** Which embed is currently active */
  embedIndex: number;
  /** Called when user switches tabs */
  onSwitchEmbed: (index: number) => void;
  /** Called when user adds a new embed */
  onAddEmbed: () => void;
  /** Full updater for the active embed */
  onChange: (updater: (e: StudioEmbedDraft) => void) => void;
  /** Delete the active embed */
  onDelete: () => void;
  /** Which region was clicked in the preview (for auto-open section) */
  activeRegion?: string | null;
}

export function EmbedInspector({
  embeds,
  embedIndex,
  onSwitchEmbed,
  onAddEmbed,
  onChange,
  onDelete,
  activeRegion,
}: EmbedInspectorProps) {
  const { toast } = useToast();
  const [showTemplates, setShowTemplates] = useState(false);
  const embed = embeds[embedIndex] || ({} as StudioEmbedDraft);
  const fields: EmbedFieldType[] = Array.isArray(embed.fields) ? embed.fields : [];
  const fieldCount = fields.length;

  // ── Helpers ──────────────────────────────────────────────────────────────

  const set = <K extends keyof StudioEmbedDraft>(key: K, value: StudioEmbedDraft[K]) =>
    onChange((e) => { e[key] = value; });

  const setField = (i: number, patch: Partial<EmbedFieldType>) =>
    onChange((e) => {
      e.fields = Array.isArray(e.fields) ? [...e.fields] : [];
      e.fields[i] = { ...(e.fields[i] ?? { inline: false }), ...patch } as EmbedFieldType;
    });

  const moveField = (i: number, dir: -1 | 1) =>
    onChange((e) => {
      e.fields = Array.isArray(e.fields) ? [...e.fields] : [];
      const j = i + dir;
      if (j < 0 || j >= e.fields.length) return;
      [e.fields[i], e.fields[j]] = [e.fields[j], e.fields[i]];
    });

  const deleteField = (i: number) =>
    onChange((e) => {
      e.fields = Array.isArray(e.fields) ? e.fields.filter((_, idx) => idx !== i) : [];
    });

  const addField = (spacer = false) =>
    onChange((e) => {
      e.fields = Array.isArray(e.fields) ? [...e.fields] : [];
      if (e.fields.length >= 25) return;
      e.fields.push(spacer
        ? { name: "\u200B", value: "\u200B", inline: false }
        : { name: "", value: "", inline: false });
    });

  const applyTemplate = (partial: Partial<StudioEmbedDraft>) =>
    onChange((e) => Object.assign(e, partial));

  // ── JSON copy ─────────────────────────────────────────────────────────────

  const copyJson = () => {
    const hexToInt = (hex: string) => {
      const cleaned = hex.replace(/^#/, "");
      return parseInt(cleaned, 16) || 0;
    };
    const json = JSON.stringify(
      {
        title: embed.title || undefined,
        url: embed.url || undefined,
        description: embed.description || undefined,
        color: embed.color ? hexToInt(embed.color) : undefined,
        author: embed.authorName
          ? { name: embed.authorName, url: embed.authorUrl || undefined, icon_url: embed.authorIconUrl || undefined }
          : undefined,
        image: embed.imageUrl ? { url: embed.imageUrl } : undefined,
        thumbnail: embed.thumbnailUrl ? { url: embed.thumbnailUrl } : undefined,
        footer: embed.footerText
          ? { text: embed.footerText, icon_url: embed.footerIconUrl || undefined }
          : undefined,
        timestamp: embed.timestamp ? new Date().toISOString() : undefined,
        fields: fields.length > 0
          ? fields.map((f) => ({ name: f.name, value: f.value, inline: f.inline }))
          : undefined,
      },
      null,
      2,
    );
    navigator.clipboard.writeText(json).then(() => {
      toast({ title: "Copied!", description: "Discord embed JSON is on your clipboard." });
    });
  };

  // ── Section open defaults based on active region ──────────────────────────

  const isRegion = (...regions: string[]) =>
    !!activeRegion && regions.includes(activeRegion);

  // ── Summaries ─────────────────────────────────────────────────────────────

  const contentSummary = [
    embed.title && `"${embed.title.slice(0, 22)}${embed.title.length > 22 ? "…" : ""}"`,
    embed.description && `${(embed.description || "").split("\n")[0].slice(0, 28)}…`,
  ].filter(Boolean).join(" · ") || "No content yet";

  const authorSummary = embed.authorName || "No author";
  const mediaSummary = [embed.imageUrl && "Image", embed.thumbnailUrl && "Thumbnail"].filter(Boolean).join(" + ") || "No media";
  const fieldsSummary = fieldCount === 0 ? "No fields" : `${fieldCount} field${fieldCount !== 1 ? "s" : ""}`;
  const footerSummary = embed.footerText || (embed.timestamp ? "Timestamp only" : "No footer");

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-0">
      {/* ── Toolbar row ─────────────────────────────────────────────────── */}
      <div className="mb-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowTemplates(true)}
          className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-white/62 transition hover:border-[rgba(224,0,26,0.24)] hover:text-white"
        >
          <Sparkles className="h-3 w-3" />
          Templates
        </button>
        <button
          type="button"
          onClick={copyJson}
          className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-white/62 transition hover:border-[rgba(224,0,26,0.24)] hover:text-white"
          title="Copy as Discord JSON"
        >
          <Code2 className="h-3 w-3" />
          Copy JSON
        </button>
      </div>

      {/* ── Multi-embed switcher ─────────────────────────────────────────── */}
      {embeds.length > 1 && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {embeds.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSwitchEmbed(i)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition",
                i === embedIndex
                  ? "border-[rgba(224,0,26,0.36)] bg-[rgba(30,13,16,0.95)] text-white"
                  : "border-white/10 bg-white/[0.03] text-white/52 hover:border-white/20 hover:text-white/80",
              )}
            >
              Embed {i + 1}
            </button>
          ))}
          {embeds.length < 10 && (
            <button
              type="button"
              onClick={onAddEmbed}
              className="flex items-center gap-1 rounded-full border border-dashed border-white/12 px-2.5 py-1 text-xs text-white/36 transition hover:border-white/24 hover:text-white/60"
            >
              <Plus className="h-3 w-3" />
              Add
            </button>
          )}
        </div>
      )}

      {/* ── Section cards ────────────────────────────────────────────────── */}
      <div className="space-y-2">
        {/* Content */}
        <SectionCard
          title="Content"
          summary={contentSummary}
          icon={<AlignLeft className="h-3.5 w-3.5" />}
          defaultOpen={!isRegion("author", "image", "thumbnail", "footer", "fields", "field_name", "field_value") || isRegion("content")}
        >
          <div className="space-y-4">
            <SmartInput
              value={embed.title || ""}
              onChange={(v) => set("title", v)}
              placeholder="Embed headline"
              field="title"
              label="Title"
            />
            <div className="space-y-1.5">
              <Label>Title URL</Label>
              <Input
                value={embed.url || ""}
                onChange={(e) => set("url", e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Accent color</Label>
              <ColorPicker value={embed.color || "#E0001A"} onChange={(v) => set("color", v)} />
            </div>
            <SmartInput
              value={embed.description || ""}
              onChange={(v) => set("description", v)}
              placeholder="Describe the embed…"
              field="description"
              label="Description"
              multiline
              minHeight="min-h-[160px]"
            />
          </div>
        </SectionCard>

        {/* Author */}
        <SectionCard
          title="Author"
          summary={authorSummary}
          icon={<User className="h-3.5 w-3.5" />}
          defaultOpen={isRegion("author")}
        >
          <div className="space-y-3">
            <SmartInput
              value={embed.authorName || ""}
              onChange={(v) => set("authorName", v)}
              placeholder="Archivist Team"
              field="authorName"
              label="Author name"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Author URL</Label>
                <Input value={embed.authorUrl || ""} onChange={(e) => set("authorUrl", e.target.value)} placeholder="https://..." />
              </div>
              <div className="space-y-1.5">
                <Label>Author icon URL</Label>
                <Input value={embed.authorIconUrl || ""} onChange={(e) => set("authorIconUrl", e.target.value)} placeholder="https://..." />
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Fields */}
        <SectionCard
          title="Fields"
          summary={fieldsSummary}
          icon={<LayoutGrid className="h-3.5 w-3.5" />}
          defaultOpen={isRegion("fields", "field_name", "field_value")}
        >
          <div className="space-y-3">
            {/* Add buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full border-white/10 bg-white/[0.03]"
                onClick={() => addField(false)}
                disabled={fieldCount >= 25}
                title={fieldCount >= 25 ? "Max 25 fields" : undefined}
              >
                <Plus className="h-3.5 w-3.5" />
                Add field {fieldCount >= 25 && <span className="ml-1 text-white/40">(max)</span>}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full border-white/10 bg-white/[0.03]"
                onClick={() => addField(true)}
                disabled={fieldCount >= 25}
              >
                <Plus className="h-3.5 w-3.5" />
                Spacer
              </Button>
              {fieldCount > 0 && (
                <span className="ml-auto text-xs text-white/32">{fieldCount}/25</span>
              )}
            </div>

            {fieldCount === 0 ? (
              <div className="rounded-[14px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-4 text-sm text-white/44">
                No fields yet. Add structured facts, stats, or grouped details.
              </div>
            ) : (
              fields.map((field, i) => (
                <FieldCard
                  key={i}
                  field={field}
                  index={i}
                  total={fieldCount}
                  onChangeName={(v) => setField(i, { name: v })}
                  onChangeValue={(v) => setField(i, { value: v })}
                  onChangeInline={(v) => setField(i, { inline: v })}
                  onMoveUp={() => moveField(i, -1)}
                  onMoveDown={() => moveField(i, 1)}
                  onDelete={() => deleteField(i)}
                />
              ))
            )}
          </div>
        </SectionCard>

        {/* Media */}
        <SectionCard
          title="Media"
          summary={mediaSummary}
          icon={<Image className="h-3.5 w-3.5" />}
          defaultOpen={isRegion("image", "thumbnail")}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Image URL</Label>
              <Input value={embed.imageUrl || ""} onChange={(e) => set("imageUrl", e.target.value)} placeholder="https://..." />
              <p className="text-xs text-white/36">Full-width below description</p>
            </div>
            <div className="space-y-1.5">
              <Label>Thumbnail URL</Label>
              <Input value={embed.thumbnailUrl || ""} onChange={(e) => set("thumbnailUrl", e.target.value)} placeholder="https://..." />
              <p className="text-xs text-white/36">Small icon top-right</p>
            </div>
          </div>
        </SectionCard>

        {/* Footer */}
        <SectionCard
          title="Footer"
          summary={footerSummary}
          icon={<MessageSquare className="h-3.5 w-3.5" />}
          defaultOpen={isRegion("footer")}
        >
          <div className="space-y-3">
            <SmartInput
              value={embed.footerText || ""}
              onChange={(v) => set("footerText", v)}
              placeholder="Footer text"
              field="footer"
              label="Footer text"
            />
            <div className="space-y-1.5">
              <Label>Footer icon URL</Label>
              <Input value={embed.footerIconUrl || ""} onChange={(e) => set("footerIconUrl", e.target.value)} placeholder="https://..." />
            </div>
            <div className="flex items-center justify-between rounded-[14px] border border-white/8 bg-[#090a0d] px-3 py-2.5">
              <div>
                <p className="text-sm font-medium text-white">Timestamp</p>
                <p className="text-xs text-white/44">Show current date + time</p>
              </div>
              <Switch checked={Boolean(embed.timestamp)} onCheckedChange={(v) => set("timestamp", v)} />
            </div>
          </div>
        </SectionCard>

        {/* Danger */}
        <SectionCard
          title="Danger zone"
          summary="Remove this embed"
          icon={<Trash2 className="h-3.5 w-3.5" />}
          danger
        >
          <div className="space-y-3">
            <p className="text-sm text-white/52">Remove the embed if the message should collapse back to a lighter composition.</p>
            <Button
              variant="outline"
              onClick={onDelete}
              className="border-[rgba(224,0,26,0.28)] text-red-400 hover:bg-[rgba(224,0,26,0.08)]"
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Remove Embed
            </Button>
          </div>
        </SectionCard>
      </div>

      {/* Templates modal */}
      {showTemplates && (
        <TemplatesOverlay
          onApply={applyTemplate}
          onClose={() => setShowTemplates(false)}
        />
      )}
    </div>
  );
}
