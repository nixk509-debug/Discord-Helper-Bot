import { useState, useRef, useCallback } from "react";
import { Plus, Trash2, ArrowUp, ArrowDown, Code2, Sparkles, Smile, ChevronDown, ChevronRight, Braces } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { StudioEmbedDraft, EmbedFieldType } from "@shared/schema";
import { EMBED_TEMPLATES } from "./studio-embed-templates";

const SWATCHES = [
  "#E0001A", "#FF3448", "#FF4D5E", "#C81D31",
  "#991324", "#6F0D19", "#F4EDEF", "#C4B8BE",
  "#8E8188", "#5F555B", "#FFFFFF", "#D94A58",
  "#B51226", "#7A0F1C", "#43282D", "#191418",
];

const EMOJI_GROUPS = [
  { label: "Common", emojis: ["✅","❌","⚠️","📢","🔔","🎉","🏆","⭐","🔥","💎","🛡️","⚔️","📋","📌","💬","👋","🎮","🎯","💡","🔧","🚀","❓","💰","🎁","🔑"] },
  { label: "Arrows", emojis: ["→","←","↑","↓","➡️","⬅️","⬆️","⬇️","↩️","↪️","🔄","▶️","◀️","⏩","⏪"] },
  { label: "Symbols", emojis: ["•","▪","▸","◆","○","●","★","☆","✦","✧","♦","♠","♥","♣","⦿"] },
];

const VARIABLE_GROUPS = [
  {
    label: "User",
    vars: [
      { label: "Username",     value: "{user.name}" },
      { label: "Display Name", value: "{user.displayName}" },
      { label: "Mention",      value: "{user.mention}" },
      { label: "User ID",      value: "{user.id}" },
      { label: "Avatar URL",   value: "{user.avatarUrl}" },
    ],
  },
  {
    label: "Server",
    vars: [
      { label: "Server Name",  value: "{server.name}" },
      { label: "Server ID",    value: "{server.id}" },
      { label: "Members",      value: "{server.memberCount}" },
      { label: "Server Icon",  value: "{server.iconUrl}" },
      { label: "Channel",      value: "{channel.name}" },
    ],
  },
  {
    label: "Time",
    vars: [
      { label: "Date",      value: "{time.date}" },
      { label: "Time",      value: "{time.time}" },
      { label: "DateTime",  value: "{time.dateTime}" },
      { label: "Timestamp", value: "{time.timestamp}" },
    ],
  },
];

type ActiveField = {
  el: HTMLInputElement | HTMLTextAreaElement;
  onChange: (v: string) => void;
};
let _activeField: ActiveField | null = null;

function insertIntoActiveField(text: string) {
  const f = _activeField;
  if (!f) return false;
  const el = f.el;
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  const newVal = el.value.slice(0, start) + text + el.value.slice(end);
  f.onChange(newVal);
  requestAnimationFrame(() => {
    el.focus();
    el.setSelectionRange(start + text.length, start + text.length);
  });
  return true;
}

function CharCount({ value, max }: { value: string; max: number }) {
  const len = (value || "").length;
  const pct = len / max;
  return (
    <span className={cn("text-[10px] tabular-nums", pct >= 0.9 ? "text-[#E0001A]" : "text-white/20")}>
      {len}/{max}
    </span>
  );
}

function VarsPopover({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const insert = (value: string) => {
    const inserted = insertIntoActiveField(value);
    if (!inserted) {
      navigator.clipboard.writeText(value).catch(() => {});
      toast({ title: "Copied", description: "No field focused — copied to clipboard" });
    }
    onClose();
  };
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-full z-50 mt-1.5 w-52 rounded-[16px] border border-white/[0.1] bg-[#0a0a0f] p-2 shadow-[0_16px_40px_rgba(0,0,0,0.6)]">
        {VARIABLE_GROUPS.map(group => (
          <div key={group.label} className="mb-2 last:mb-0">
            <p className="mb-1 px-2 text-[9px] font-bold uppercase tracking-[0.22em] text-white/25">{group.label}</p>
            {group.vars.map(v => (
              <button
                key={v.value}
                type="button"
                onClick={() => insert(v.value)}
                className="flex w-full items-center justify-between gap-2 rounded-[10px] px-2 py-1.5 text-left transition hover:bg-white/[0.06] active:bg-white/[0.1]"
              >
                <span className="text-[12px] text-white/65">{v.label}</span>
                <span className="font-mono text-[10px] text-white/25 truncate">{v.value}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

function TemplatesSheet({ onApply, onClose }: { onApply: (p: Partial<StudioEmbedDraft>) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-t-[24px] border-t border-white/[0.1] bg-[#080810] p-5 pb-10" onClick={e => e.stopPropagation()}>
        <div className="mx-auto mb-5 h-1 w-8 rounded-full bg-white/[0.15]" />
        <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.25em] text-white/30">Templates</p>
        <div className="grid grid-cols-2 gap-2">
          {EMBED_TEMPLATES.map(t => (
            <button key={t.id} type="button" onClick={() => { onApply(t.apply()); onClose(); }}
              className="flex items-center gap-3 rounded-[16px] border border-white/[0.07] bg-white/[0.03] px-4 py-3.5 text-left transition hover:border-white/[0.12] hover:bg-white/[0.05] active:bg-white/[0.08]">
              <span className="text-xl">{t.emoji}</span>
              <span className="text-[13px] font-medium text-white/75">{t.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function EmojiSheet({
  onClose,
  serverEmojis = [],
}: {
  onClose: () => void;
  serverEmojis?: Array<{ id: string; name: string; animated: boolean }>;
}) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [justInserted, setJustInserted] = useState<string | null>(null);

  const insert = (text: string, key: string) => {
    const inserted = insertIntoActiveField(text);
    setJustInserted(key);
    if (!inserted) {
      navigator.clipboard.writeText(text).catch(() => {});
      toast({ title: "Copied" });
    }
    setTimeout(onClose, 260);
  };

  const filteredServerEmojis = serverEmojis.filter(e =>
    search.trim() === "" || e.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg overflow-y-auto max-h-[80vh] rounded-t-[24px] border-t border-white/[0.1] bg-[#080810] p-5 pb-10"
        onClick={e => e.stopPropagation()}
      >
        <div className="mx-auto mb-5 h-1 w-8 rounded-full bg-white/[0.15]" />

        {serverEmojis.length > 0 && (
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search server emojis…"
            style={{ fontSize: 16 }}
            className="mb-4 w-full rounded-[14px] border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-white placeholder-white/20 outline-none focus:border-white/[0.14] focus:bg-white/[0.06] transition"
          />
        )}

        {serverEmojis.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.22em] text-white/25">Server</p>
            <div className="flex flex-wrap gap-1.5">
              {filteredServerEmojis.map(e => {
                const text = e.animated ? `<a:${e.name}:${e.id}>` : `<:${e.name}:${e.id}>`;
                return (
                  <button key={e.id} type="button" onClick={() => insert(text, e.id)}
                    title={`:${e.name}:`}
                    className={cn("flex h-10 w-10 items-center justify-center rounded-[10px] border transition",
                      justInserted === e.id ? "border-white/[0.2] bg-white/[0.12]" : "border-white/[0.07] bg-white/[0.03] active:bg-white/[0.1]")}>
                    <img src={`https://cdn.discordapp.com/emojis/${e.id}.${e.animated ? "gif" : "webp"}?size=48`}
                      alt={e.name} style={{ width: 26, height: 26 }} className="rounded object-contain" />
                  </button>
                );
              })}
              {filteredServerEmojis.length === 0 && (
                <p className="text-[13px] text-white/25">No emojis match</p>
              )}
            </div>
          </div>
        )}

        {EMOJI_GROUPS.map(g => (
          <div key={g.label} className="mb-4">
            <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.22em] text-white/25">{g.label}</p>
            <div className="flex flex-wrap gap-1.5">
              {g.emojis.map(e => (
                <button key={e} type="button" onClick={() => insert(e, e)}
                  className={cn("flex h-10 w-10 items-center justify-center rounded-[10px] border text-lg transition",
                    justInserted === e ? "border-white/[0.2] bg-white/[0.12]" : "border-white/[0.07] bg-white/[0.03] active:bg-white/[0.1]")}>
                  {e}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Shared input styling ───────────────────────────────────────────────────────

const inputCls = "mobile-entry-safe w-full rounded-[12px] border border-white/[0.08] bg-[rgba(255,255,255,0.035)] px-3 py-2.5 text-[14px] text-white placeholder-white/20 outline-none transition focus:border-white/[0.16] focus:bg-white/[0.05]";
const textareaCls = "mobile-entry-safe w-full resize-none rounded-[12px] border border-white/[0.08] bg-[rgba(255,255,255,0.035)] px-3 py-2.5 text-[14px] text-white placeholder-white/20 outline-none transition focus:border-white/[0.16] focus:bg-white/[0.05]";

// ── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/30">{children}</p>
  );
}

// ── Collapsible section ───────────────────────────────────────────────────────

function CollapsibleSection({
  label,
  summary,
  defaultOpen = false,
  children,
}: {
  label: string;
  summary?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center gap-2 py-1"
      >
        <div className="h-3 w-[2px] rounded-full shrink-0" style={{ background: "linear-gradient(180deg,#E0001A,rgba(224,0,26,0.3))" }} />
        <span className="flex-1 text-left text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
          {label}
        </span>
        {!open && summary && (
          <span className="rounded-full border border-white/[0.08] px-2 py-0.5 text-[10px] text-white/35 truncate max-w-[100px]">
            {summary}
          </span>
        )}
        <span className="text-white/20 transition-colors">
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </span>
      </button>
      {open && <div className="mt-3 space-y-3">{children}</div>}
    </div>
  );
}

// ── Field ─────────────────────────────────────────────────────────────────────

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  minH,
  maxLen,
  showVars,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  minH?: string;
  maxLen?: number;
  showVars?: boolean;
}) {
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const [varsOpen, setVarsOpen] = useState(false);

  const handleFocus = () => {
    if (ref.current) _activeField = { el: ref.current, onChange };
  };

  const handleChange = useCallback((v: string) => {
    if (ref.current) _activeField = { el: ref.current, onChange };
    onChange(v);
  }, [onChange]);

  const shared = {
    ref,
    value: value || "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => handleChange(e.target.value),
    onFocus: handleFocus,
    placeholder,
    style: { fontSize: 16 } as React.CSSProperties,
  };

  return (
    <div>
      {(label || maxLen !== undefined || showVars) && (
        <div className="mb-1.5 flex items-center justify-between">
          {label ? <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">{label}</p> : <span />}
          <div className="flex items-center gap-1.5">
            {showVars && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => { ref.current?.focus(); setVarsOpen(o => !o); }}
                  className="flex items-center gap-0.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-1.5 py-0.5 text-[10px] text-white/35 transition hover:bg-white/[0.07] hover:text-white/55"
                >
                  <Braces className="h-2.5 w-2.5" />
                  <span>{"{x}"}</span>
                </button>
                {varsOpen && <VarsPopover onClose={() => setVarsOpen(false)} />}
              </div>
            )}
            {maxLen !== undefined && <CharCount value={value} max={maxLen} />}
          </div>
        </div>
      )}
      {multiline ? (
        <textarea {...shared} className={cn(textareaCls, minH ?? "min-h-[96px]")} />
      ) : (
        <input type="text" {...shared} className={inputCls} />
      )}
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-white/[0.05]" />;
}

// ── Main EmbedInspector ───────────────────────────────────────────────────────

export interface EmbedInspectorProps {
  embeds: StudioEmbedDraft[];
  embedIndex: number;
  onSwitchEmbed: (i: number) => void;
  onAddEmbed: () => void;
  onChange: (updater: (e: StudioEmbedDraft) => void) => void;
  onDelete: () => void;
  activeRegion?: string | null;
  serverEmojis?: Array<{ id: string; name: string; animated: boolean }>;
}

export function EmbedInspector({ embeds, embedIndex, onSwitchEmbed, onAddEmbed, onChange, onDelete, serverEmojis = [] }: EmbedInspectorProps) {
  const { toast } = useToast();
  const [showTemplates, setShowTemplates] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const embed = embeds[embedIndex] || ({} as StudioEmbedDraft);
  const fields: EmbedFieldType[] = Array.isArray(embed.fields) ? embed.fields : [];

  const set = <K extends keyof StudioEmbedDraft>(key: K, val: StudioEmbedDraft[K]) =>
    onChange(e => { e[key] = val; });

  const setField = (i: number, patch: Partial<EmbedFieldType>) =>
    onChange(e => {
      e.fields = Array.isArray(e.fields) ? [...e.fields] : [];
      e.fields[i] = { ...(e.fields[i] ?? { inline: false }), ...patch } as EmbedFieldType;
    });

  const moveField = (i: number, dir: -1 | 1) =>
    onChange(e => {
      e.fields = Array.isArray(e.fields) ? [...e.fields] : [];
      const j = i + dir;
      if (j < 0 || j >= e.fields.length) return;
      [e.fields[i], e.fields[j]] = [e.fields[j], e.fields[i]];
    });

  const deleteField = (i: number) =>
    onChange(e => { e.fields = Array.isArray(e.fields) ? e.fields.filter((_, idx) => idx !== i) : []; });

  const addField = (spacer = false) =>
    onChange(e => {
      e.fields = Array.isArray(e.fields) ? [...e.fields] : [];
      if (e.fields.length >= 25) return;
      e.fields.push(spacer ? { name: "\u200B", value: "\u200B", inline: false } : { name: "", value: "", inline: false });
    });

  const copyJson = () => {
    const hexToInt = (hex: string) => parseInt(hex.replace(/^#/, ""), 16) || 0;
    const json = JSON.stringify({
      title: embed.title || undefined,
      url: embed.url || undefined,
      description: embed.description || undefined,
      color: embed.color ? hexToInt(embed.color) : undefined,
      author: embed.authorName ? { name: embed.authorName, url: embed.authorUrl || undefined, icon_url: embed.authorIconUrl || undefined } : undefined,
      image: embed.imageUrl ? { url: embed.imageUrl } : undefined,
      thumbnail: embed.thumbnailUrl ? { url: embed.thumbnailUrl } : undefined,
      footer: embed.footerText ? { text: embed.footerText, icon_url: embed.footerIconUrl || undefined } : undefined,
      timestamp: embed.timestamp ? new Date().toISOString() : undefined,
      fields: fields.length > 0 ? fields.map(f => ({ name: f.name, value: f.value, inline: f.inline })) : undefined,
    }, null, 2);
    navigator.clipboard.writeText(json).catch(() => {});
    toast({ title: "Copied", description: "Discord embed JSON on clipboard" });
  };

  const currentColor = embed.color || "#E0001A";

  const fieldInputProps = (val: string, onChg: (v: string) => void) => ({
    value: val || "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChg(e.target.value),
    onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      _activeField = { el: e.currentTarget, onChange: onChg };
    },
    style: { fontSize: 16 } as React.CSSProperties,
  });

  return (
    <div className="space-y-4 pb-6">

      {/* ── Toolbar ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Tool buttons */}
        {[
          { label: "Templates", icon: <Sparkles className="h-3 w-3" />, onClick: () => setShowTemplates(true) },
          { label: "JSON", icon: <Code2 className="h-3 w-3" />, onClick: copyJson },
          { label: "Emoji", icon: <Smile className="h-3 w-3" />, onClick: () => setShowEmoji(true) },
        ].map(btn => (
          <button key={btn.label} type="button" onClick={btn.onClick}
            className="flex items-center gap-1.5 rounded-[10px] border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-[11px] font-medium text-white/45 transition hover:border-white/[0.14] hover:bg-white/[0.06] hover:text-white/70 active:bg-white/[0.09]">
            {btn.icon} {btn.label}
          </button>
        ))}

        {/* Embed switcher */}
        {embeds.length > 1 ? (
          <div className="ml-auto flex items-center gap-1">
            <span className="text-[10px] text-white/25 tabular-nums mr-0.5">{embedIndex + 1}/{embeds.length}</span>
            {embeds.map((_, i) => (
              <button key={i} type="button" onClick={() => onSwitchEmbed(i)}
                className={cn("h-6 w-6 rounded-full text-[10px] font-bold transition",
                  i === embedIndex
                    ? "bg-[#E0001A] text-white shadow-[0_0_10px_rgba(224,0,26,0.45)]"
                    : "border border-white/[0.1] bg-white/[0.03] text-white/35 hover:bg-white/[0.07]")}>
                {i + 1}
              </button>
            ))}
            {embeds.length < 10 && (
              <button type="button" onClick={onAddEmbed}
                className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-white/[0.12] text-white/20 transition hover:border-white/[0.22] hover:text-white/35">
                <Plus className="h-2.5 w-2.5" />
              </button>
            )}
          </div>
        ) : embeds.length < 10 ? (
          <button type="button" onClick={onAddEmbed}
            className="ml-auto flex items-center gap-1.5 rounded-[10px] border border-[rgba(224,0,26,0.18)] bg-[rgba(224,0,26,0.05)] px-2.5 py-1.5 text-[11px] font-medium text-[rgba(255,80,96,0.65)] transition hover:bg-[rgba(224,0,26,0.09)] hover:text-[rgba(255,80,96,0.85)]">
            <Plus className="h-3 w-3" /> Add Embed
          </button>
        ) : null}
      </div>

      <Divider />

      {/* ── Accent Color ─────────────────────────────────────────── */}
      <div>
        <SectionLabel>Color</SectionLabel>
        <div className="mt-2 rounded-[14px] border border-white/[0.08] bg-white/[0.025] overflow-hidden"
          style={{ boxShadow: `inset 3px 0 0 ${currentColor}` }}>
          <div className="flex flex-wrap gap-1.5 px-3 py-3">
            {SWATCHES.map(hex => (
              <button key={hex} type="button" onClick={() => set("color", hex)} title={hex}
                className={cn("h-6 w-6 rounded-[7px] transition-transform hover:scale-110 active:scale-95",
                  hex.toUpperCase() === currentColor.toUpperCase() && "ring-2 ring-white/70 ring-offset-1 ring-offset-[#080810] scale-110")}
                style={{ backgroundColor: hex }} />
            ))}
          </div>
          <div className="flex items-center gap-2 border-t border-white/[0.06] px-3 py-2">
            <div className="h-5 w-5 rounded-[6px] shrink-0 border border-white/[0.1]" style={{ backgroundColor: currentColor }} />
            <input
              type="text"
              value={currentColor}
              onChange={e => set("color", e.target.value)}
              style={{ fontSize: 16 }}
              className="mobile-entry-safe flex-1 rounded-[8px] border-0 bg-transparent px-1 py-0.5 font-mono text-[13px] text-white/55 outline-none focus:text-white/80 transition"
            />
          </div>
        </div>
      </div>

      <Divider />

      {/* ── Core content ─────────────────────────────────────────── */}
      <Field label="Title" value={embed.title || ""} onChange={v => set("title", v)} placeholder="Embed title" maxLen={256} showVars />
      <Field label="URL" value={embed.url || ""} onChange={v => set("url", v)} placeholder="https://…" />
      <Field label="Description" value={embed.description || ""} onChange={v => set("description", v)}
        placeholder="Write your message…" multiline minH="min-h-[110px]" maxLen={4096} showVars />

      <Divider />

      {/* ── Author ───────────────────────────────────────────────── */}
      <CollapsibleSection label="Author" summary={embed.authorName || undefined} defaultOpen={Boolean(embed.authorName)}>
        <Field label="Name" value={embed.authorName || ""} onChange={v => set("authorName", v)} placeholder="Author name" maxLen={256} showVars />
        <Field value={embed.authorUrl || ""} onChange={v => set("authorUrl", v)} placeholder="Author URL" />
        <Field value={embed.authorIconUrl || ""} onChange={v => set("authorIconUrl", v)} placeholder="Author icon URL" />
      </CollapsibleSection>

      <Divider />

      {/* ── Media ────────────────────────────────────────────────── */}
      <CollapsibleSection label="Media"
        summary={embed.imageUrl ? "Image" : embed.thumbnailUrl ? "Thumbnail" : undefined}
        defaultOpen={Boolean(embed.imageUrl || embed.thumbnailUrl)}>
        <Field label="Image URL" value={embed.imageUrl || ""} onChange={v => set("imageUrl", v)} placeholder="https://… (full-width)" />
        <Field label="Thumbnail URL" value={embed.thumbnailUrl || ""} onChange={v => set("thumbnailUrl", v)} placeholder="https://… (top-right)" />
      </CollapsibleSection>

      <Divider />

      {/* ── Fields ───────────────────────────────────────────────── */}
      <div>
        <div className="mb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-3 w-[2px] rounded-full shrink-0" style={{ background: "linear-gradient(180deg,#E0001A,rgba(224,0,26,0.3))" }} />
            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
              Fields {fields.length > 0 && <span className="font-normal text-white/20 normal-case tracking-normal">({fields.length}/25)</span>}
            </span>
          </div>
          <div className="flex gap-1.5">
            <button type="button" onClick={() => addField(false)} disabled={fields.length >= 25}
              className="flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11px] text-white/40 transition hover:bg-white/[0.06] disabled:opacity-25">
              <Plus className="h-3 w-3" /> Field
            </button>
            <button type="button" onClick={() => addField(true)} disabled={fields.length >= 25}
              className="flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11px] text-white/40 transition hover:bg-white/[0.06] disabled:opacity-25">
              <Plus className="h-3 w-3" /> Spacer
            </button>
          </div>
        </div>

        {fields.length === 0 && (
          <div className="rounded-[12px] border border-dashed border-white/[0.07] py-4 text-center">
            <p className="text-[12px] text-white/20">No fields</p>
          </div>
        )}

        <div className="space-y-2">
          {fields.map((field, i) => {
            const isSpacer = field.name === "\u200B" && field.value === "\u200B";
            return (
              <div key={i} className="rounded-[13px] border border-white/[0.07] bg-white/[0.02] overflow-hidden"
                style={{ boxShadow: "inset 2px 0 0 rgba(224,0,26,0.2)" }}>
                {/* Header */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.05]">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
                    {isSpacer ? "Spacer" : `Field ${i + 1}`}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <button type="button" onClick={() => moveField(i, -1)} disabled={i === 0}
                      className="flex h-7 w-7 items-center justify-center rounded-[8px] text-white/25 transition hover:bg-white/[0.06] hover:text-white/50 disabled:opacity-20">
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => moveField(i, 1)} disabled={i === fields.length - 1}
                      className="flex h-7 w-7 items-center justify-center rounded-[8px] text-white/25 transition hover:bg-white/[0.06] hover:text-white/50 disabled:opacity-20">
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => deleteField(i)}
                      className="flex h-7 w-7 items-center justify-center rounded-[8px] text-white/20 transition hover:bg-[rgba(224,0,26,0.08)] hover:text-[#ff4d5e]">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {!isSpacer && (
                  <div className="space-y-2 px-3 py-3">
                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/22">Name</span>
                        <CharCount value={field.name} max={256} />
                      </div>
                      <input type="text"
                        {...fieldInputProps(field.name, v => setField(i, { name: v }))}
                        placeholder="Field name"
                        className="mobile-entry-safe w-full rounded-[10px] border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-[14px] text-white placeholder-white/20 outline-none focus:border-white/[0.14] focus:bg-white/[0.05] transition" />
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/22">Value</span>
                        <CharCount value={field.value} max={1024} />
                      </div>
                      <textarea
                        {...fieldInputProps(field.value, v => setField(i, { value: v }))}
                        placeholder="Field value"
                        className="mobile-entry-safe min-h-[60px] w-full resize-none rounded-[10px] border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-[14px] text-white placeholder-white/20 outline-none focus:border-white/[0.14] focus:bg-white/[0.05] transition" />
                    </div>
                    <div className="flex items-center justify-between pt-0.5">
                      <span className="text-[12px] text-white/35">Inline</span>
                      <Switch checked={Boolean(field.inline)} onCheckedChange={v => setField(i, { inline: v })} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Divider />

      {/* ── Footer ───────────────────────────────────────────────── */}
      <CollapsibleSection label="Footer" summary={embed.footerText || undefined}
        defaultOpen={Boolean(embed.footerText || embed.timestamp)}>
        <Field label="Footer Text" value={embed.footerText || ""} onChange={v => set("footerText", v)}
          placeholder="Footer text" maxLen={2048} showVars />
        <Field value={embed.footerIconUrl || ""} onChange={v => set("footerIconUrl", v)} placeholder="Footer icon URL" />
        <div className="flex items-center justify-between rounded-[12px] border border-white/[0.07] bg-white/[0.025] px-4 py-3">
          <span className="text-[13px] text-white/55">Timestamp</span>
          <Switch checked={Boolean(embed.timestamp)} onCheckedChange={v => set("timestamp", v)} />
        </div>
      </CollapsibleSection>

      <Divider />

      {/* ── Delete ───────────────────────────────────────────────── */}
      <button type="button" onClick={onDelete}
        className="flex w-full items-center justify-center gap-2 rounded-[14px] border border-[rgba(224,0,26,0.12)] bg-[rgba(224,0,26,0.04)] py-3 text-[13px] font-medium text-[rgba(255,80,96,0.55)] transition hover:border-[rgba(224,0,26,0.2)] hover:bg-[rgba(224,0,26,0.07)] hover:text-[rgba(255,80,96,0.8)]">
        <Trash2 className="h-4 w-4" /> Remove Embed
      </button>

      {showTemplates && <TemplatesSheet onApply={p => onChange(e => Object.assign(e, p))} onClose={() => setShowTemplates(false)} />}
      {showEmoji && <EmojiSheet serverEmojis={serverEmojis} onClose={() => setShowEmoji(false)} />}
    </div>
  );
}
