import { useEffect, useMemo, useRef, useState, type ReactNode, type Ref, type RefObject } from "react";
import type {
  EmbedComponentType,
  StudioDiagnostic,
  StudioDocument,
  StudioEmbedDraft,
  StudioNode,
  StudioPublishPlan,
} from "@shared/schema";
import { COMPONENT_TYPES } from "@shared/schema";
import {
  getDiscordEmojiAssetUrl,
  parseDiscordEmojiToken,
  splitTextWithDiscordEmoji,
  type ParsedDiscordEmoji,
} from "@shared/discord-emoji";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import archivistAvatar from "@assets/archivist-avatar.png";
import { StudioInlineInsertMenu } from "@/components/design-studio/studio-inline-insert-menu";
import { cn } from "@/lib/utils";

export type StudioEmbedEditRegion =
  | "embed"
  | "author"
  | "title"
  | "description"
  | "fields"
  | "field_name"
  | "field_value"
  | "color"
  | "footer"
  | "image"
  | "thumbnail";

interface StudioPreviewProps {
  document: StudioDocument;
  viewId: string;
  interactionRows: Array<{ label: string; action: string }>;
  diagnostics: StudioDiagnostic[];
  mode: "desktop" | "mobile" | "compact";
  publishPlan?: StudioPublishPlan | null;
  surface?: "preview" | "editor";
  onEditMessage?: (region?: "body") => void;
  onChangeMessage?: (value: string) => void;
  onEditEmbed?: (embedIndex: number, region?: StudioEmbedEditRegion, fieldIndex?: number) => void;
  onChangeEmbed?: (embedIndex: number, updater: (embed: StudioEmbedDraft) => void) => void;
  onDeleteEmbed?: (embedIndex: number) => void;
  onEditNode?: (nodeId: string) => void;
  onOpenInsertRoot?: () => void;
  onOpenInsertNode?: (parentId: string) => void;
  selectedMessage?: boolean;
  selectedMessageRegion?: "body" | null;
  selectedEmbedIndex?: number | null;
  selectedEmbedRegion?: StudioEmbedEditRegion | null;
  selectedEmbedFieldIndex?: number | null;
  selectedNodeId?: string | null;
  discordEmojis?: Array<{ id: string; name: string; animated?: boolean }>;
}

function getView(document: StudioDocument, viewId: string) {
  return document.views[viewId] || document.views[document.meta.entryViewId];
}

function InlineDiscordEmoji({ emoji, className, size = 18 }: { emoji: ParsedDiscordEmoji; className?: string; size?: number }) {
  const url = getDiscordEmojiAssetUrl(emoji, size * 2);
  if (!url) return <span className={className}>{emoji.raw}</span>;
  return <img src={url} alt={`:${emoji.name}:`} className={cn("inline-block shrink-0 align-[-0.22em]", className)} style={{ width: size, height: size }} />;
}

function DiscordRichText({ text, className, emojiSize = 18 }: { text: string; className?: string; emojiSize?: number }) {
  const segments = splitTextWithDiscordEmoji(text);
  return (
    <span className={className}>
      {segments.map((segment, index) =>
        segment.type === "text" ? (
          <span key={`text-${index}`}>{segment.value}</span>
        ) : (
          <InlineDiscordEmoji key={`emoji-${segment.value.raw}-${index}`} emoji={segment.value} size={emojiSize} className="mx-[0.04em]" />
        ),
      )}
    </span>
  );
}

function formatPublishPathLabel(publishPlan?: StudioPublishPlan | null) {
  if (!publishPlan) return "";
  switch (publishPlan.publishPath) {
    case "v2":
      return "Interactive layout";
    case "legacy":
      return "Standard message";
    case "downgraded":
      return "Simplified";
    case "blocked":
      return "Blocked";
    default:
      return publishPlan.publishPath;
  }
}

function PreviewRegion({
  label,
  onClick,
  selected = false,
  className,
  children,
}: {
  label: string;
  onClick?: (() => void) | null;
  selected?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const classes = cn(
    "rounded-lg transition",
    onClick ? "cursor-pointer touch-manipulation hover:bg-white/[0.05]" : "",
    selected ? "ring-1 ring-[rgba(157,62,79,0.52)] bg-[rgba(48,18,24,0.18)] shadow-[0_0_0_1px_rgba(110,33,46,0.12)]" : "",
    className,
  );

  if (!onClick) return <div className={classes}>{children}</div>;
  return (
    <button type="button" onClick={onClick} className={cn("w-full text-left", classes)} aria-label={label}>
      {children}
    </button>
  );
}

const INLINE_EMBED_LIMITS = {
  title: 256,
  description: 4096,
  author: 256,
  footer: 2048,
  fieldName: 256,
  fieldValue: 1024,
  fields: 25,
} as const;

function normalizeEmbedColor(color?: string) {
  const raw = String(color || "").trim();
  if (/^#[\da-f]{6}$/i.test(raw)) return raw;
  if (/^#[\da-f]{3}$/i.test(raw)) {
    return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`;
  }
  return "#5865F2";
}

function inlineCountTone(current: number, limit: number) {
  if (current > limit) return "text-[#ff7d8d]";
  if (current >= Math.floor(limit * 0.85)) return "text-[#f2c66d]";
  return "text-[#7e838b]";
}

function InlineCount({ current, limit }: { current: number; limit: number }) {
  return <span className={cn("text-[10px] font-medium tracking-[0.12em]", inlineCountTone(current, limit))}>{current}/{limit}</span>;
}

function InlineFieldInput({
  value,
  onChange,
  placeholder,
  className,
  inputRef,
  autoFocus = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
  inputRef?: Ref<HTMLInputElement>;
  autoFocus?: boolean;
}) {
  return (
    <input
      ref={inputRef}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      className={cn(
        "w-full rounded-md border border-transparent bg-transparent px-0 py-0 text-sm outline-none placeholder:text-[#7e838b] focus:border-transparent focus:outline-none focus:ring-0",
        className,
      )}
    />
  );
}

function InlineFieldTextarea({
  value,
  onChange,
  placeholder,
  className,
  inputRef,
  autoFocus = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
  inputRef?: Ref<HTMLTextAreaElement>;
  autoFocus?: boolean;
}) {
  return (
    <textarea
      ref={inputRef}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      className={cn(
        "min-h-0 w-full resize-none rounded-md border border-transparent bg-transparent px-0 py-0 text-sm outline-none placeholder:text-[#7e838b] focus:border-transparent focus:outline-none focus:ring-0",
        className,
      )}
      rows={1}
    />
  );
}

function InlineComposerFooter({
  value,
  onChange,
  targetRef,
  limit,
  discordEmojis,
  recentKey,
  compact = false,
}: {
  value: string;
  onChange: (value: string) => void;
  targetRef: RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  limit: number;
  discordEmojis?: Array<{ id: string; name: string; animated?: boolean }>;
  recentKey: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("mt-2 flex flex-wrap items-center justify-between gap-2", compact ? "pt-1" : "")}>
      <StudioInlineInsertMenu
        value={value}
        onChange={onChange}
        targetRef={targetRef}
        discordEmojis={discordEmojis}
        recentKey={recentKey}
      />
      <InlineCount current={value.length} limit={limit} />
    </div>
  );
}

function InlineEmbedButton({
  children,
  onClick,
  tone = "default",
  className,
}: {
  children: ReactNode;
  onClick: () => void;
  tone?: "default" | "danger";
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-[11px] font-medium transition",
        tone === "danger"
          ? "border-[rgba(132,48,62,0.42)] bg-[rgba(40,17,22,0.94)] text-[rgba(255,198,208,0.96)] hover:border-[rgba(160,61,78,0.52)] hover:text-white"
          : "border-white/10 bg-white/[0.04] text-[#d0d5db] hover:border-white/20 hover:bg-white/[0.08] hover:text-white",
        className,
      )}
    >
      {children}
    </button>
  );
}

function EmbedInspectorJumpButton({
  label,
  active = false,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-[11px] font-medium transition",
        active
          ? "border-[rgba(146,48,61,0.24)] bg-[rgba(28,14,18,0.92)] text-white shadow-[0_12px_22px_rgba(0,0,0,0.22)]"
          : "border-white/10 bg-white/[0.03] text-[#c8ccd2] hover:border-white/20 hover:bg-white/[0.06] hover:text-white",
      )}
    >
      {label}
    </button>
  );
}

function isBlankSpacerField(field: { name?: string; value?: string }) {
  return String(field?.name || "") === "\u200B" && String(field?.value || "") === "\u200B";
}

function dividerText(node: StudioNode) {
  const mode = String(node.props.mode || "line");
  const repeat = Math.max(1, Math.min(12, Number(node.props.repeat || 5)));
  if (mode === "emoji") return Array.from({ length: repeat }, () => String(node.props.emoji || "*")).join(" ");
  if (mode === "symbol") return Array.from({ length: repeat }, () => String(node.props.symbol || "*")).join(" ");
  if (mode === "stacked") return Array.from({ length: Math.min(3, repeat) }, () => String(node.props.text || "----")).join("\n");
  return String(node.props.text || "--------");
}

function getSelectorPreviewLabel(node: StudioNode) {
  if (node.type === "role_select") return "Role Selector";
  if (node.type === "user_select") return "User Selector";
  if (node.type === "channel_select") return "Channel Selector";
  if (node.type === "mentionable_select") return "Mentionable Selector";
  return "Select Menu";
}

function EmbedPreviewCard({
  embed,
  index,
  surface = "preview",
  editable = false,
  selected = false,
  activeRegion = null,
  activeFieldIndex = null,
  onEdit,
  onChange,
  onDelete,
  discordEmojis = [],
}: {
  embed: StudioEmbedDraft;
  index: number;
  surface?: "preview" | "editor";
  editable?: boolean;
  selected?: boolean;
  activeRegion?: StudioEmbedEditRegion | null;
  activeFieldIndex?: number | null;
  onEdit?: (embedIndex: number, region?: StudioEmbedEditRegion, fieldIndex?: number) => void;
  onChange?: (embedIndex: number, updater: (embed: StudioEmbedDraft) => void) => void;
  onDelete?: (embedIndex: number) => void;
  discordEmojis?: Array<{ id: string; name: string; animated?: boolean }>;
}) {
  const fields = Array.isArray(embed.fields) ? embed.fields : [];
  const edit = (region: StudioEmbedEditRegion, fieldIndex?: number) => onEdit?.(index, region, fieldIndex);
  const hasInlineFields = fields.some((field) => field.inline);
  const inspectorDriven = editable && surface === "editor";
  const inlineEditing = editable && selected && Boolean(onChange) && surface !== "editor";
  const [expandedSlots, setExpandedSlots] = useState({
    author: false,
    titleUrl: false,
    image: false,
    thumbnail: false,
    footer: false,
  });
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const descriptionInputRef = useRef<HTMLTextAreaElement | null>(null);
  const authorInputRef = useRef<HTMLInputElement | null>(null);
  const footerInputRef = useRef<HTMLInputElement | null>(null);
  const fieldNameRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const fieldValueRefs = useRef<Record<number, HTMLTextAreaElement | null>>({});

  useEffect(() => {
    if (!selected) return;
    setExpandedSlots((current) => ({
      author: current.author || activeRegion === "author" || Boolean(embed.authorName || embed.authorIconUrl || embed.authorUrl),
      titleUrl: current.titleUrl || activeRegion === "title" || Boolean(embed.url),
      image: current.image || activeRegion === "image" || Boolean(embed.imageUrl),
      thumbnail: current.thumbnail || activeRegion === "thumbnail" || Boolean(embed.thumbnailUrl),
      footer: current.footer || activeRegion === "footer" || Boolean(embed.footerText || embed.footerIconUrl || embed.timestamp),
    }));
  }, [
    activeRegion,
    embed.authorIconUrl,
    embed.authorName,
    embed.authorUrl,
    embed.footerIconUrl,
    embed.footerText,
    embed.imageUrl,
    embed.thumbnailUrl,
    embed.timestamp,
    embed.url,
    selected,
  ]);

  const updateEmbed = (updater: (draft: StudioEmbedDraft) => void) => onChange?.(index, updater);
  const setSlot = (slot: keyof typeof expandedSlots, value: boolean) => setExpandedSlots((current) => ({ ...current, [slot]: value }));
  const addField = (blank = false) => updateEmbed((draft) => {
    draft.fields = Array.isArray(draft.fields) ? [...draft.fields] : [];
    if (draft.fields.length >= INLINE_EMBED_LIMITS.fields) return;
    draft.fields.push(blank ? { name: "\u200B", value: "\u200B", inline: false } : { name: "", value: "", inline: false });
  });
  const moveField = (fieldIndex: number, direction: -1 | 1) => updateEmbed((draft) => {
    draft.fields = Array.isArray(draft.fields) ? [...draft.fields] : [];
    const nextIndex = fieldIndex + direction;
    if (nextIndex < 0 || nextIndex >= draft.fields.length) return;
    [draft.fields[fieldIndex], draft.fields[nextIndex]] = [draft.fields[nextIndex], draft.fields[fieldIndex]];
  });
  const removeField = (fieldIndex: number) => updateEmbed((draft) => {
    draft.fields = Array.isArray(draft.fields) ? draft.fields.filter((_, currentIndex) => currentIndex !== fieldIndex) : [];
  });
  const clearAuthor = () => {
    updateEmbed((draft) => {
      draft.authorName = "";
      draft.authorUrl = "";
      draft.authorIconUrl = "";
    });
    setSlot("author", false);
  };
  const clearImage = () => {
    updateEmbed((draft) => {
      draft.imageUrl = "";
    });
    setSlot("image", false);
  };
  const clearThumbnail = () => {
    updateEmbed((draft) => {
      draft.thumbnailUrl = "";
    });
    setSlot("thumbnail", false);
  };
  const clearFooter = () => {
    updateEmbed((draft) => {
      draft.footerText = "";
      draft.footerIconUrl = "";
      draft.timestamp = false;
    });
    setSlot("footer", false);
  };
  const titleEditing = inlineEditing && activeRegion === "title";
  const authorEditing = inlineEditing && activeRegion === "author";
  const descriptionEditing = inlineEditing && activeRegion === "description";
  const imageEditing = inlineEditing && activeRegion === "image";
  const thumbnailEditing = inlineEditing && activeRegion === "thumbnail";
  const footerEditing = inlineEditing && activeRegion === "footer";
  const authorVisible = expandedSlots.author || Boolean(embed.authorName || embed.authorIconUrl || embed.authorUrl);
  const titleUrlVisible = expandedSlots.titleUrl || Boolean(embed.url);
  const imageVisible = expandedSlots.image || Boolean(embed.imageUrl);
  const thumbnailVisible = expandedSlots.thumbnail || Boolean(embed.thumbnailUrl);
  const footerVisible = expandedSlots.footer || Boolean(embed.footerText || embed.footerIconUrl || embed.timestamp);
  const showThumbnailColumn = thumbnailVisible;
  const titleValue = String(embed.title || "");
  const descriptionValue = String(embed.description || "");
  const authorValue = String(embed.authorName || "");
  const footerValue = String(embed.footerText || "");
  const embedColor = normalizeEmbedColor(embed.color);
  const fieldsSelected = activeRegion === "fields" || activeRegion === "field_name" || activeRegion === "field_value";
  const mediaSelected = activeRegion === "image" || activeRegion === "thumbnail";
  const makeFieldNameTargetRef = (fieldIndex: number) =>
    ({
      get current() {
        return fieldNameRefs.current[fieldIndex] ?? null;
      },
      set current(value: HTMLInputElement | null) {
        fieldNameRefs.current[fieldIndex] = value;
      },
    }) as RefObject<HTMLInputElement | null>;
  const makeFieldValueTargetRef = (fieldIndex: number) =>
    ({
      get current() {
        return fieldValueRefs.current[fieldIndex] ?? null;
      },
      set current(value: HTMLTextAreaElement | null) {
        fieldValueRefs.current[fieldIndex] = value;
      },
    }) as RefObject<HTMLTextAreaElement | null>;
  const appendField = (blank = false) => {
    const nextIndex = fields.length;
    addField(blank);
    if (!blank) {
      requestAnimationFrame(() => edit("field_name", nextIndex));
    }
  };

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-white/10 bg-[#2b2d31] shadow-[0_18px_48px_rgba(0,0,0,0.2)]",
        selected ? "ring-1 ring-[rgba(156,63,79,0.58)] shadow-[0_22px_58px_rgba(88,22,33,0.2)]" : "",
      )}
      style={{ borderLeft: `4px solid ${embedColor}` }}
    >
      <div className={cn("gap-4 p-4", showThumbnailColumn ? "grid grid-cols-1 md:grid-cols-[minmax(0,1fr),110px]" : "block")}>
        <div className="min-w-0 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-2 py-1">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: embedColor }} />
              <span className="text-[11px] uppercase tracking-[0.22em] text-[#949ba4]">Embed {index + 1}</span>
            </div>
            {inlineEditing ? (
              <div className="flex flex-wrap justify-end gap-2">
                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/10 px-2 py-1">
                  <input
                    type="color"
                    value={embedColor}
                    onChange={(event) => updateEmbed((draft) => {
                      draft.color = event.target.value;
                    })}
                    className="h-6 w-6 cursor-pointer rounded-full border border-white/10 bg-transparent"
                    aria-label={`Embed ${index + 1} color`}
                  />
                  <InlineFieldInput
                    value={String(embed.color || "#B11226")}
                    onChange={(value) => updateEmbed((draft) => {
                      draft.color = value;
                    })}
                    placeholder="#B11226"
                    className="w-[92px] text-[11px] uppercase tracking-[0.12em] text-[#d0d5db]"
                  />
                </div>
                {onDelete ? <InlineEmbedButton tone="danger" onClick={() => onDelete(index)}>Remove</InlineEmbedButton> : null}
              </div>
            ) : inspectorDriven && selected ? (
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/10 px-3 py-1.5 text-[11px] text-[#c8ccd2]">
                <span className="h-2 w-2 rounded-full bg-[rgba(208,91,111,0.8)]" />
                Inspector-driven
              </div>
            ) : editable ? <button type="button" className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-[#b5bac1]" onClick={() => edit("embed")}>Edit</button> : null}
          </div>
          {inspectorDriven && selected ? (
            <div className="rounded-xl border border-white/8 bg-black/10 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <EmbedInspectorJumpButton label="Content" active={!activeRegion || activeRegion === "embed" || activeRegion === "title" || activeRegion === "description" || activeRegion === "color"} onClick={() => edit("embed")} />
                <EmbedInspectorJumpButton label="Author" active={activeRegion === "author"} onClick={() => edit("author")} />
                <EmbedInspectorJumpButton label="Media" active={mediaSelected} onClick={() => edit(embed.imageUrl ? "image" : embed.thumbnailUrl ? "thumbnail" : "image")} />
                <EmbedInspectorJumpButton label="Fields" active={fieldsSelected} onClick={() => edit("fields")} />
                <EmbedInspectorJumpButton label="Footer" active={activeRegion === "footer"} onClick={() => edit("footer")} />
              </div>
              <p className="mt-3 text-xs leading-5 text-[#949ba4]">
                Keep the preview visual. Use these inspector sections to add author, media, fields, and footer without switching back into legacy inline controls.
              </p>
            </div>
          ) : null}
          {authorEditing ? (
            <div className="space-y-2 rounded-xl border border-white/10 bg-black/10 p-3">
              <div className="flex items-center gap-2">
                {embed.authorIconUrl ? <img src={embed.authorIconUrl} alt="" className="h-7 w-7 rounded-full object-cover" /> : <div className="h-7 w-7 rounded-full border border-dashed border-white/12 bg-black/10" />}
                <InlineFieldInput
                  inputRef={authorInputRef}
                  autoFocus
                  value={authorValue}
                  onChange={(value) => updateEmbed((draft) => {
                    draft.authorName = value;
                  })}
                  placeholder="Author name"
                  className={cn("text-xs font-semibold", embed.authorUrl ? "text-[#00A8FC]" : "text-white")}
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <InlineFieldInput
                  value={String(embed.authorIconUrl || "")}
                  onChange={(value) => updateEmbed((draft) => {
                    draft.authorIconUrl = value;
                  })}
                  placeholder="Author icon URL"
                  className="text-xs text-[#b5bac1]"
                />
                <InlineFieldInput
                  value={String(embed.authorUrl || "")}
                  onChange={(value) => updateEmbed((draft) => {
                    draft.authorUrl = value;
                  })}
                  placeholder="Author link URL"
                  className="text-xs text-[#b5bac1]"
                />
              </div>
              <InlineComposerFooter
                value={authorValue}
                onChange={(value) => updateEmbed((draft) => {
                  draft.authorName = value;
                })}
                targetRef={authorInputRef}
                limit={INLINE_EMBED_LIMITS.author}
                discordEmojis={discordEmojis}
                recentKey={`archivist.studio.embed.${index}.author`}
                compact
              />
              <div className="flex justify-end">
                <InlineEmbedButton tone="danger" onClick={clearAuthor}>Remove author</InlineEmbedButton>
              </div>
            </div>
          ) : authorVisible ? (
            <PreviewRegion label="Edit author" onClick={editable ? () => edit("author") : null} selected={selected && activeRegion === "author"} className="p-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                {embed.authorIconUrl ? <img src={embed.authorIconUrl} alt="" className="h-6 w-6 rounded-full object-cover" /> : null}
                <DiscordRichText
                  text={String(embed.authorName || "Tap to add an author label or icon.")}
                  className={cn(embed.authorName ? (embed.authorUrl ? "text-[#00A8FC]" : "text-white") : "text-[#949ba4]")}
                  emojiSize={16}
                />
              </div>
            </PreviewRegion>
          ) : inlineEditing ? (
            <InlineEmbedButton onClick={() => edit("author")}>+ Add author</InlineEmbedButton>
          ) : null}
          {titleEditing ? (
            <div className="space-y-2 rounded-xl border border-white/10 bg-black/10 p-3">
              <InlineFieldInput
                inputRef={titleInputRef}
                autoFocus
                value={titleValue}
                onChange={(value) => updateEmbed((draft) => {
                  draft.title = value;
                })}
                placeholder="Add a title"
                className={cn("text-sm font-semibold", embed.url ? "text-[#00A8FC]" : "text-white")}
              />
              {titleUrlVisible ? (
                <div className="space-y-2">
                  <InlineFieldInput
                    value={String(embed.url || "")}
                    onChange={(value) => updateEmbed((draft) => {
                      draft.url = value;
                    })}
                    placeholder="Title link URL"
                    className="text-xs text-[#8dc8ff]"
                  />
                  <div className="flex justify-end">
                    <InlineEmbedButton tone="danger" onClick={() => {
                      updateEmbed((draft) => {
                        draft.url = "";
                      });
                      setSlot("titleUrl", false);
                    }}>
                      Remove link
                    </InlineEmbedButton>
                  </div>
                </div>
              ) : (
                <InlineEmbedButton onClick={() => setSlot("titleUrl", true)}>+ Add title link</InlineEmbedButton>
              )}
              <InlineComposerFooter
                value={titleValue}
                onChange={(value) => updateEmbed((draft) => {
                  draft.title = value;
                })}
                targetRef={titleInputRef}
                limit={INLINE_EMBED_LIMITS.title}
                discordEmojis={discordEmojis}
                recentKey={`archivist.studio.embed.${index}.title`}
                compact
              />
            </div>
          ) : (
            <PreviewRegion label="Edit title" onClick={editable ? () => edit("title") : null} selected={selected && activeRegion === "title"} className={embed.title || editable ? "p-1" : ""}>
              {embed.title ? (
                <p className={cn("text-sm font-semibold", embed.url ? "text-[#00A8FC]" : "text-white")}>
                  <DiscordRichText text={String(embed.title)} emojiSize={18} />
                </p>
              ) : editable ? (
                <p className="text-sm font-semibold text-[#b5bac1]">Tap to add a title</p>
              ) : null}
            </PreviewRegion>
          )}
          {descriptionEditing ? (
            <div className="space-y-2 rounded-xl border border-white/10 bg-black/10 p-3">
              <InlineFieldTextarea
                inputRef={descriptionInputRef}
                autoFocus
                value={descriptionValue}
                onChange={(value) => updateEmbed((draft) => {
                  draft.description = value;
                })}
                placeholder="Write the embed description..."
                className="min-h-[120px] whitespace-pre-wrap text-xs leading-relaxed text-[#dbdee1]"
              />
              <InlineComposerFooter
                value={descriptionValue}
                onChange={(value) => updateEmbed((draft) => {
                  draft.description = value;
                })}
                targetRef={descriptionInputRef}
                limit={INLINE_EMBED_LIMITS.description}
                discordEmojis={discordEmojis}
                recentKey={`archivist.studio.embed.${index}.description`}
              />
            </div>
          ) : (
            <PreviewRegion label="Edit description" onClick={editable ? () => edit("description") : null} selected={selected && activeRegion === "description"} className={embed.description || editable ? "p-1" : ""}>
              {embed.description ? (
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-[#dbdee1]">
                  <DiscordRichText text={String(embed.description)} emojiSize={16} />
                </p>
              ) : editable ? (
                <p className="text-xs text-[#949ba4]">Tap to add a description</p>
              ) : null}
            </PreviewRegion>
          )}
          {fields.length > 0 || editable ? (
            <div className={cn("grid gap-2", hasInlineFields ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1")}>
              {fields.map((field, fieldIndex) => {
                const fieldSelected = selected && activeFieldIndex === fieldIndex;
                const fieldNameEditing = inlineEditing && activeRegion === "field_name" && activeFieldIndex === fieldIndex;
                const fieldValueEditing = inlineEditing && activeRegion === "field_value" && activeFieldIndex === fieldIndex;
                const blankSpacer = isBlankSpacerField(field);

                return (
                  <div
                    key={`field-${fieldIndex}`}
                    className={cn(
                      "space-y-2 rounded-xl border border-white/8 bg-black/10 p-2.5",
                      field.inline ? "" : "sm:col-span-2 lg:col-span-3",
                      fieldSelected ? "ring-1 ring-[rgba(157,62,79,0.62)]" : "",
                    )}
                  >
                    {blankSpacer ? (
                      <>
                        <PreviewRegion label={`Edit field ${fieldIndex + 1}`} onClick={editable ? () => edit("field_name", fieldIndex) : null} selected={fieldSelected} className="rounded-lg p-2">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b5bac1]">Blank spacer field</p>
                            <span className="text-[11px] text-[#949ba4]">{field.inline ? "Inline" : "Full width"}</span>
                          </div>
                          <p className="mt-2 text-xs text-[#949ba4]">Use this to create spacing between sections in the embed.</p>
                        </PreviewRegion>
                        {inlineEditing && fieldSelected ? (
                          <>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#b5bac1]">
                              <label className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5">
                                <input
                                  type="checkbox"
                                  checked={Boolean(field.inline)}
                                  onChange={(event) => updateEmbed((draft) => {
                                    draft.fields = Array.isArray(draft.fields) ? draft.fields : [];
                                    draft.fields[fieldIndex] = { ...(draft.fields[fieldIndex] || {}), inline: event.target.checked };
                                  })}
                                />
                                Inline
                              </label>
                              <InlineEmbedButton onClick={() => updateEmbed((draft) => {
                                draft.fields = Array.isArray(draft.fields) ? draft.fields : [];
                                draft.fields[fieldIndex] = { ...(draft.fields[fieldIndex] || {}), name: "", value: "" };
                              })}>
                                Convert to text field
                              </InlineEmbedButton>
                            </div>
                            <div className="flex flex-wrap justify-end gap-2">
                              <InlineEmbedButton onClick={() => moveField(fieldIndex, -1)} className={fieldIndex === 0 ? "pointer-events-none opacity-50" : ""}>Move Up</InlineEmbedButton>
                              <InlineEmbedButton onClick={() => moveField(fieldIndex, 1)} className={fieldIndex === fields.length - 1 ? "pointer-events-none opacity-50" : ""}>Move Down</InlineEmbedButton>
                              <InlineEmbedButton tone="danger" onClick={() => removeField(fieldIndex)}>Remove</InlineEmbedButton>
                            </div>
                          </>
                        ) : null}
                      </>
                    ) : (
                      <>
                        {fieldNameEditing ? (
                          <div className="space-y-2 rounded-lg bg-black/10 p-2">
                            <InlineFieldInput
                              inputRef={(node) => {
                                fieldNameRefs.current[fieldIndex] = node;
                              }}
                              autoFocus
                              value={String(field.name || "")}
                              onChange={(value) => updateEmbed((draft) => {
                                draft.fields = Array.isArray(draft.fields) ? draft.fields : [];
                                draft.fields[fieldIndex] = { ...(draft.fields[fieldIndex] || {}), name: value };
                              })}
                              placeholder="Field title"
                              className="text-xs font-semibold text-white"
                            />
                            <InlineComposerFooter
                              value={String(field.name || "")}
                              onChange={(value) => updateEmbed((draft) => {
                                draft.fields = Array.isArray(draft.fields) ? draft.fields : [];
                                draft.fields[fieldIndex] = { ...(draft.fields[fieldIndex] || {}), name: value };
                              })}
                              targetRef={makeFieldNameTargetRef(fieldIndex)}
                              limit={INLINE_EMBED_LIMITS.fieldName}
                              discordEmojis={discordEmojis}
                              recentKey={`archivist.studio.embed.${index}.field.${fieldIndex}.name`}
                              compact
                            />
                          </div>
                        ) : (
                          <PreviewRegion label={`Edit field ${fieldIndex + 1} name`} onClick={editable ? () => edit("field_name", fieldIndex) : null} selected={fieldSelected && activeRegion === "field_name"} className="rounded-lg p-2">
                            <p className="text-xs font-semibold text-white">
                              <DiscordRichText text={String(field.name || "Tap to add a field title")} emojiSize={15} className={field.name ? "" : "text-[#949ba4]"} />
                            </p>
                          </PreviewRegion>
                        )}
                        {fieldValueEditing ? (
                          <div className="space-y-2 rounded-lg bg-black/10 p-2">
                            <InlineFieldTextarea
                              inputRef={(node) => {
                                fieldValueRefs.current[fieldIndex] = node;
                              }}
                              autoFocus
                              value={String(field.value || "")}
                              onChange={(value) => updateEmbed((draft) => {
                                draft.fields = Array.isArray(draft.fields) ? draft.fields : [];
                                draft.fields[fieldIndex] = { ...(draft.fields[fieldIndex] || {}), value };
                              })}
                              placeholder="Field value"
                              className="min-h-[88px] whitespace-pre-wrap text-xs text-[#dbdee1]"
                            />
                            <InlineComposerFooter
                              value={String(field.value || "")}
                              onChange={(value) => updateEmbed((draft) => {
                                draft.fields = Array.isArray(draft.fields) ? draft.fields : [];
                                draft.fields[fieldIndex] = { ...(draft.fields[fieldIndex] || {}), value };
                              })}
                              targetRef={makeFieldValueTargetRef(fieldIndex)}
                              limit={INLINE_EMBED_LIMITS.fieldValue}
                              discordEmojis={discordEmojis}
                              recentKey={`archivist.studio.embed.${index}.field.${fieldIndex}.value`}
                            />
                          </div>
                        ) : (
                          <PreviewRegion label={`Edit field ${fieldIndex + 1} value`} onClick={editable ? () => edit("field_value", fieldIndex) : null} selected={fieldSelected && activeRegion === "field_value"} className="rounded-lg p-2">
                            <p className="whitespace-pre-wrap text-xs text-[#dbdee1]">
                              <DiscordRichText text={String(field.value || "Tap to add the field value")} emojiSize={15} className={field.value ? "" : "text-[#949ba4]"} />
                            </p>
                          </PreviewRegion>
                        )}
                        {inlineEditing ? (
                          <>
                            <label className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-[11px] text-[#b5bac1]">
                              <input
                                type="checkbox"
                                checked={Boolean(field.inline)}
                                onChange={(event) => updateEmbed((draft) => {
                                  draft.fields = Array.isArray(draft.fields) ? draft.fields : [];
                                  draft.fields[fieldIndex] = { ...(draft.fields[fieldIndex] || {}), inline: event.target.checked };
                                })}
                              />
                              Show inline
                            </label>
                            <div className="flex flex-wrap justify-end gap-2">
                              <InlineEmbedButton onClick={() => moveField(fieldIndex, -1)} className={fieldIndex === 0 ? "pointer-events-none opacity-50" : ""}>Move Up</InlineEmbedButton>
                              <InlineEmbedButton onClick={() => moveField(fieldIndex, 1)} className={fieldIndex === fields.length - 1 ? "pointer-events-none opacity-50" : ""}>Move Down</InlineEmbedButton>
                              <InlineEmbedButton tone="danger" onClick={() => removeField(fieldIndex)}>Remove</InlineEmbedButton>
                            </div>
                          </>
                        ) : null}
                      </>
                    )}
                  </div>
                );
              })}
              {inlineEditing && fields.length < INLINE_EMBED_LIMITS.fields ? (
                <div className="col-span-full flex flex-wrap gap-2 rounded-xl border border-dashed border-white/10 p-3">
                  <InlineEmbedButton onClick={() => appendField(false)}>+ Add field</InlineEmbedButton>
                  <InlineEmbedButton onClick={() => appendField(true)}>+ Blank field</InlineEmbedButton>
                </div>
              ) : null}
              {fields.length === 0 && editable && !inlineEditing ? (
                <PreviewRegion label="Manage embed fields" onClick={inspectorDriven ? () => edit("fields") : () => edit("embed")} selected={selected && fieldsSelected} className="col-span-full rounded-xl border border-dashed border-white/10 p-3">
                  <p className="text-xs text-[#949ba4]">
                    {inspectorDriven
                      ? "Open Fields in the inspector to add rows, spacer fields, and inline layouts."
                      : "Select the embed, then add fields directly inside it."}
                  </p>
                </PreviewRegion>
              ) : null}
              {inspectorDriven && selected && fields.length > 0 ? (
                <PreviewRegion label="Manage embed fields" onClick={() => edit("fields")} selected={fieldsSelected} className="col-span-full rounded-xl border border-white/8 bg-black/10 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-[#c8ccd2]">Fields are managed from the inspector so the preview can stay focused on structure.</p>
                    <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-[#b5bac1]">{fields.length} field{fields.length === 1 ? "" : "s"}</span>
                  </div>
                </PreviewRegion>
              ) : null}
            </div>
          ) : null}
          {imageEditing ? (
            <div className="space-y-2 rounded-xl border border-white/10 bg-[#1e1f22] p-3">
              {embed.imageUrl ? <img src={embed.imageUrl} alt="" className="max-h-[320px] w-full rounded-md object-cover" /> : <div className="flex min-h-[120px] items-center justify-center rounded-md border border-dashed border-white/10 text-xs text-[#949ba4]">Add an image URL below</div>}
              <InlineFieldInput
                value={String(embed.imageUrl || "")}
                onChange={(value) => updateEmbed((draft) => {
                  draft.imageUrl = value;
                })}
                placeholder="Image URL"
                className="text-xs text-[#d0d5db]"
              />
              <div className="flex justify-end">
                <InlineEmbedButton tone="danger" onClick={clearImage}>Remove image</InlineEmbedButton>
              </div>
            </div>
          ) : imageVisible ? (
            <PreviewRegion label="Edit image" onClick={editable ? () => edit("image") : null} selected={selected && activeRegion === "image"} className="overflow-hidden rounded-lg border border-white/10 bg-[#1e1f22]">
              {embed.imageUrl ? <img src={embed.imageUrl} alt="" className="max-h-[320px] w-full object-cover" /> : <p className="p-3 text-xs text-[#949ba4]">Tap to add an image</p>}
            </PreviewRegion>
          ) : inlineEditing ? (
            <InlineEmbedButton onClick={() => edit("image")}>+ Add image</InlineEmbedButton>
          ) : null}
          {footerEditing ? (
            <div className="space-y-2 rounded-xl border border-white/10 bg-black/10 p-3">
              <div className="flex items-center gap-2 text-[11px] text-[#949ba4]">
                {embed.footerIconUrl ? <img src={embed.footerIconUrl} alt="" className="h-5 w-5 rounded-full object-cover" /> : <div className="h-5 w-5 rounded-full border border-dashed border-white/10" />}
                <InlineFieldInput
                  inputRef={footerInputRef}
                  autoFocus
                  value={footerValue}
                  onChange={(value) => updateEmbed((draft) => {
                    draft.footerText = value;
                  })}
                  placeholder="Footer text"
                  className="text-[11px] text-[#c7ccd3]"
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                <InlineFieldInput
                  value={String(embed.footerIconUrl || "")}
                  onChange={(value) => updateEmbed((draft) => {
                    draft.footerIconUrl = value;
                  })}
                  placeholder="Footer icon URL"
                  className="text-xs text-[#b5bac1]"
                />
                <label className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-[11px] text-[#d0d5db]">
                  <input
                    type="checkbox"
                    checked={Boolean(embed.timestamp)}
                    onChange={(event) => updateEmbed((draft) => {
                      draft.timestamp = event.target.checked;
                    })}
                  />
                  Timestamp
                </label>
              </div>
              <InlineComposerFooter
                value={footerValue}
                onChange={(value) => updateEmbed((draft) => {
                  draft.footerText = value;
                })}
                targetRef={footerInputRef}
                limit={INLINE_EMBED_LIMITS.footer}
                discordEmojis={discordEmojis}
                recentKey={`archivist.studio.embed.${index}.footer`}
                compact
              />
              <div className="flex justify-end">
                <InlineEmbedButton tone="danger" onClick={clearFooter}>Remove footer</InlineEmbedButton>
              </div>
            </div>
          ) : footerVisible ? (
            <PreviewRegion label="Edit footer" onClick={editable ? () => edit("footer") : null} selected={selected && activeRegion === "footer"} className="p-1">
              <div className="flex items-center gap-2 text-[11px] text-[#949ba4]">
                {embed.footerIconUrl ? <img src={embed.footerIconUrl} alt="" className="h-5 w-5 rounded-full object-cover" /> : null}
                <span>
                  {embed.footerText ? <DiscordRichText text={String(embed.footerText)} emojiSize={14} /> : null}
                  {embed.footerText && embed.timestamp ? " - " : ""}
                  {embed.timestamp ? new Date().toLocaleDateString() : ""}
                </span>
              </div>
            </PreviewRegion>
          ) : inlineEditing ? (
            <div className="flex flex-wrap gap-2">
              <InlineEmbedButton onClick={() => edit("footer")}>+ Add footer</InlineEmbedButton>
              {!embed.timestamp ? (
                <InlineEmbedButton onClick={() => {
                  setSlot("footer", true);
                  edit("footer");
                  updateEmbed((draft) => {
                    draft.timestamp = true;
                  });
                }}>
                  + Add timestamp
                </InlineEmbedButton>
              ) : null}
            </div>
          ) : null}
          {inlineEditing && fields.length > 0 && fields.length < INLINE_EMBED_LIMITS.fields ? (
            <div className="flex flex-wrap gap-2 pt-1">
              <InlineEmbedButton onClick={() => appendField(false)}>+ Add field</InlineEmbedButton>
              <InlineEmbedButton onClick={() => appendField(true)}>+ Blank field</InlineEmbedButton>
            </div>
          ) : null}
        </div>
        {showThumbnailColumn ? (
          thumbnailEditing ? (
            <div className="space-y-2">
              <div className="overflow-hidden rounded-lg border border-white/10 bg-[#1e1f22]">
                {embed.thumbnailUrl ? <img src={embed.thumbnailUrl} alt="" className="h-[110px] w-[110px] object-cover" /> : <div className="flex h-[110px] w-[110px] items-center justify-center text-center text-[11px] text-[#949ba4]">Thumbnail preview</div>}
              </div>
              <InlineFieldInput
                value={String(embed.thumbnailUrl || "")}
                onChange={(value) => updateEmbed((draft) => {
                  draft.thumbnailUrl = value;
                })}
                placeholder="Thumbnail URL"
                className="rounded-lg border border-white/10 bg-black/10 px-2 py-2 text-[11px] text-[#d0d5db]"
              />
              <InlineEmbedButton tone="danger" onClick={clearThumbnail} className="w-full justify-center">Remove thumbnail</InlineEmbedButton>
            </div>
          ) : (
            <PreviewRegion label="Edit thumbnail" onClick={editable ? () => edit("thumbnail") : null} selected={selected && activeRegion === "thumbnail"} className={embed.thumbnailUrl ? "overflow-hidden rounded-lg border border-white/10 bg-[#1e1f22]" : "flex min-h-[84px] items-center justify-center rounded-lg border border-dashed border-white/10 px-2 text-center"}>
              {embed.thumbnailUrl ? <img src={embed.thumbnailUrl} alt="" className="h-[84px] w-[84px] object-cover" /> : <p className="text-[11px] text-[#949ba4]">Tap to add a thumbnail</p>}
            </PreviewRegion>
          )
        ) : inlineEditing ? (
          <div className="flex items-start justify-end">
            <InlineEmbedButton onClick={() => edit("thumbnail")}>+ Add thumbnail</InlineEmbedButton>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function NodePreview({
  document,
  nodeId,
  editable = false,
  onEditNode,
  onOpenInsertNode,
  selectedNodeId,
  depth = 0,
}: {
  document: StudioDocument;
  nodeId: string;
  editable?: boolean;
  onEditNode?: (nodeId: string) => void;
  onOpenInsertNode?: (parentId: string) => void;
  selectedNodeId?: string | null;
  depth?: number;
}) {
  const node = document.nodes[nodeId];
  if (!node) return null;
  const edge = depth > 0 ? "border-l border-white/10 pl-3" : "";
  const selected = selectedNodeId === node.id;
  const edit = editable && onEditNode ? () => onEditNode(node.id) : null;

  if (node.type === "container" || node.type === "section") {
    return (
      <div className={cn("space-y-2 rounded-lg border border-white/10 bg-white/[0.03] p-3", edge, selected ? "ring-1 ring-[rgba(157,62,79,0.46)] bg-[rgba(48,18,24,0.16)]" : "")}>
        <PreviewRegion label={`Edit ${node.type}`} onClick={edit} selected={selected} className="p-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#b5bac1]"><DiscordRichText text={String(node.props.heading || (node.type === "section" ? "Add section heading" : "Add layout heading"))} emojiSize={15} /></p>
          {node.props.description ? <p className="mt-2 whitespace-pre-wrap text-sm text-[#dbdee1]"><DiscordRichText text={String(node.props.description)} emojiSize={16} /></p> : editable ? <p className="mt-2 text-xs text-[#949ba4]">Tap to add section copy.</p> : null}
        </PreviewRegion>
        {editable && selected && onOpenInsertNode ? (
          <div className="flex justify-end">
            <InlineEmbedButton onClick={() => onOpenInsertNode(node.id)}>Insert inside</InlineEmbedButton>
          </div>
        ) : null}
        <div className="space-y-2">
          {node.childIds.map((childId) => (
            <NodePreview key={childId} document={document} nodeId={childId} editable={editable} onEditNode={onEditNode} onOpenInsertNode={onOpenInsertNode} selectedNodeId={selectedNodeId} depth={depth + 1} />
          ))}
        </div>
      </div>
    );
  }

  if (node.type === "text_display") {
    const textValue = String(node.props.text || "");
    return <PreviewRegion label="Edit text block" onClick={edit} selected={selected} className={cn("p-2", edge)}><p className={cn("whitespace-pre-wrap text-sm", textValue ? "text-[#dbdee1]" : "text-[#949ba4]")}><DiscordRichText text={textValue || (editable ? "Tap to add text" : "")} emojiSize={16} /></p></PreviewRegion>;
  }
  if (node.type === "divider") {
    return <PreviewRegion label="Edit divider" onClick={edit} selected={selected} className={cn("p-2", edge)}><p className="whitespace-pre-wrap text-xs tracking-[0.15em] text-[#949ba4]"><DiscordRichText text={dividerText(node)} emojiSize={14} /></p></PreviewRegion>;
  }
  if (node.type === "style_block") {
    const accent = String(node.props.accentColor || "#5865F2");
    return <PreviewRegion label="Edit notice panel" onClick={edit} selected={selected} className={edge}><div className="rounded-lg border border-white/10 bg-[#2b2d31] p-3" style={{ borderLeftColor: accent, borderLeftWidth: 4 }}><p className="text-sm font-semibold text-white"><DiscordRichText text={String(node.props.title || "Add notice heading")} emojiSize={16} /></p><p className={cn("whitespace-pre-wrap text-xs", node.props.description ? "text-[#dbdee1]" : "text-[#949ba4]")}><DiscordRichText text={String(node.props.description || (editable ? "Tap to add notice details" : ""))} emojiSize={15} /></p></div></PreviewRegion>;
  }
  if (node.type === "media_gallery") {
    const items = Array.isArray(node.props.items) ? node.props.items : [];
    return <PreviewRegion label="Edit media gallery" onClick={edit} selected={selected} className={cn("space-y-2 p-2", edge)}><p className="text-xs font-medium text-[#b5bac1]"><DiscordRichText text={String(node.props.title || "Add gallery title")} emojiSize={15} /></p><div className="grid grid-cols-2 gap-2">{items.length === 0 ? <div className="rounded border border-dashed border-white/10 p-2 text-xs text-[#949ba4]">Tap to add images</div> : null}{items.slice(0, 4).map((item: any, index: number) => <div key={`media-${index}`} className="relative aspect-[4/3] overflow-hidden rounded-lg border border-white/10 bg-[#1e1f22]">{item?.url ? <img src={String(item.url)} alt={String(item?.description || "")} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-[#949ba4]">Add image</div>}</div>)}</div></PreviewRegion>;
  }
  if (node.type === "file") {
    return <PreviewRegion label="Edit file block" onClick={edit} selected={selected} className={cn("p-2", edge)}><div className="rounded-lg border border-white/10 bg-[#1e1f22] px-3 py-2 text-xs text-[#dbdee1]"><span>Attachment </span><DiscordRichText text={String(node.props.label || "Add attachment label")} emojiSize={14} />{node.props.url ? <span>{` - ${String(node.props.url)}`}</span> : editable ? <span className="text-[#949ba4]"> - add file URL</span> : null}</div></PreviewRegion>;
  }
  if (node.type === "action_row") {
    return (
      <div className={cn("space-y-2", edge, selected ? "rounded-lg ring-1 ring-[rgba(157,62,79,0.46)]" : "")}>
        {editable ? (
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={edit || undefined} className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-[#949ba4]">
              Edit action row
            </button>
            {selected && onOpenInsertNode ? <InlineEmbedButton onClick={() => onOpenInsertNode(node.id)}>Open add flow</InlineEmbedButton> : null}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {node.childIds.length === 0 && editable ? <div className="rounded-md border border-dashed border-white/10 px-3 py-2 text-xs text-[#949ba4]">Action row is empty. Use the add flow to insert a button or menu.</div> : null}
          {node.childIds.map((childId) => (
            <NodePreview key={childId} document={document} nodeId={childId} editable={editable} onEditNode={onEditNode} onOpenInsertNode={onOpenInsertNode} selectedNodeId={selectedNodeId} depth={depth + 1} />
          ))}
        </div>
      </div>
    );
  }
  if (node.type === "button") {
    const style = Number(node.props.style || 1);
    const parsedEmoji = node.props.emoji ? parseDiscordEmojiToken(String(node.props.emoji)) : null;
    const styleClass = style === 1 ? "bg-[#5865F2] text-white" : style === 2 ? "bg-[#4e5058] text-white" : style === 3 ? "bg-[#248046] text-white" : style === 4 ? "bg-[#da373c] text-white" : "bg-[#00a8fc] text-[#101114]";
    return <button type="button" onClick={edit || undefined} className={cn("rounded-md px-3 py-1.5 text-xs font-medium transition", styleClass, edge, selected ? "ring-2 ring-white/28" : "")}>{parsedEmoji ? <InlineDiscordEmoji emoji={parsedEmoji} size={15} className="mr-1" /> : null}<DiscordRichText text={String(node.props.label || (editable ? "Add button label" : "Button"))} emojiSize={15} /></button>;
  }

  return <button type="button" onClick={edit || undefined} className={cn("min-w-[180px] rounded-md border border-white/10 bg-[#1e1f22] px-3 py-2 text-left text-xs text-[#dbdee1] transition hover:border-[rgba(120,42,53,0.28)]", edge, selected ? "ring-1 ring-[rgba(157,62,79,0.46)]" : "")}><DiscordRichText text={String(node.props.placeholder || node.props.label || (editable ? `Add ${getSelectorPreviewLabel(node).toLowerCase()}` : getSelectorPreviewLabel(node)))} emojiSize={15} /></button>;
}

function PlannedComponentPreview({ component, depth = 0 }: { component: EmbedComponentType; depth?: number }) {
  const edge = depth > 0 ? "border-l border-white/10 pl-3" : "";
  if (component.type === COMPONENT_TYPES.CONTAINER || component.type === COMPONENT_TYPES.SECTION) return <div className={cn("space-y-2 rounded-lg border border-white/10 bg-white/[0.03] p-3", edge)}>{(component.components || []).map((child, index) => <PlannedComponentPreview key={`${component.id || component.type}-${child.id || child.type}-${index}`} component={child} depth={depth + 1} />)}{component.accessory ? <PlannedComponentPreview component={component.accessory} depth={depth + 1} /> : null}</div>;
  if (component.type === COMPONENT_TYPES.TEXT_DISPLAY) return <p className={cn("whitespace-pre-wrap text-sm", component.content ? "text-[#dbdee1]" : "text-[#949ba4]", edge)}><DiscordRichText text={String(component.content || "") || "Add text"} emojiSize={16} /></p>;
  if (component.type === COMPONENT_TYPES.SEPARATOR) return <p className={cn("whitespace-pre-wrap text-xs tracking-[0.15em] text-[#949ba4]", edge)}>{component.spacing === "large" ? "------------" : "--------"}</p>;
  if (component.type === COMPONENT_TYPES.MEDIA_GALLERY) return <div className={cn("grid grid-cols-2 gap-2", edge)}>{(component.items || []).slice(0, 4).map((item, index) => <div key={`planned-media-${index}`} className="relative aspect-[4/3] overflow-hidden rounded-lg border border-white/10 bg-[#1e1f22]"><img src={String(item.url)} alt={String(item.description || "")} className="h-full w-full object-cover" /></div>)}</div>;
  if (component.type === COMPONENT_TYPES.FILE) return <div className={cn("rounded-lg border border-white/10 bg-[#1e1f22] px-3 py-2 text-xs text-[#dbdee1]", edge)}><span>Attachment </span><DiscordRichText text={String(component.label || "Add attachment label")} emojiSize={14} /></div>;
  if (component.type === COMPONENT_TYPES.ACTION_ROW) return <div className={cn("flex flex-wrap gap-2", edge)}>{(component.components || []).map((child, index) => <PlannedComponentPreview key={`${component.id || "row"}-${child.id || child.type}-${index}`} component={child} depth={depth + 1} />)}</div>;
  if (component.type === COMPONENT_TYPES.BUTTON) return <button type="button" className={cn("rounded-md bg-[#5865F2] px-3 py-1.5 text-xs font-medium text-white", edge)}><DiscordRichText text={String(component.label || "Add button label")} emojiSize={15} /></button>;
  return <div className={cn("min-w-[180px] rounded-md border border-white/10 bg-[#1e1f22] px-3 py-2 text-xs text-[#dbdee1]", edge)}><DiscordRichText text={String(component.placeholder || component.label || "Add dropdown placeholder")} emojiSize={15} /></div>;
}

export function StudioPreview({
  document,
  viewId,
  interactionRows,
  diagnostics,
  mode,
  publishPlan,
  surface = "preview",
  onEditMessage,
  onChangeMessage,
  onEditEmbed,
  onChangeEmbed,
  onDeleteEmbed,
  onEditNode,
  onOpenInsertRoot,
  onOpenInsertNode,
  selectedMessage = false,
  selectedMessageRegion = null,
  selectedEmbedIndex = null,
  selectedEmbedRegion = null,
  selectedEmbedFieldIndex = null,
  selectedNodeId = null,
  discordEmojis = [],
}: StudioPreviewProps) {
  const view = getView(document, viewId);
  const widthClass =
    mode === "mobile"
      ? "max-w-[390px]"
      : mode === "compact"
        ? "max-w-[560px]"
        : surface === "editor"
          ? "max-w-[860px]"
          : "max-w-full";
  const [previewSurface, setPreviewSurface] = useState<"studio" | "live">("studio");
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (surface === "editor") {
      setPreviewSurface("studio");
      return;
    }
    if (!publishPlan) return setPreviewSurface("studio");
    setPreviewSurface(publishPlan.mode === "exact" ? "studio" : "live");
  }, [publishPlan?.mode, publishPlan?.viewId, surface]);

  const effectiveDiagnostics = publishPlan?.diagnostics || diagnostics;
  const hasErrors = effectiveDiagnostics.some((entry) => entry.level === "error");
  const hasWarnings = effectiveDiagnostics.some((entry) => entry.level === "warning");
  const statusLabel = surface === "editor" ? (hasErrors ? "Blocked" : hasWarnings ? "Warning" : "No issues") : publishPlan?.label || (hasErrors ? "Invalid" : hasWarnings ? "Degraded" : "Publish-safe");
  const statusVariant = hasErrors ? "destructive" : hasWarnings ? "secondary" : "default";
  const liveComponents = publishPlan?.liveMessage.components || [];
  const liveInteractionCount = useMemo(() => liveComponents.filter((component) => component.type === COMPONENT_TYPES.ACTION_ROW || component.type === COMPONENT_TYPES.BUTTON || component.type === COMPONENT_TYPES.SELECT_MENU).length, [liveComponents]);
  const messageValue = String(view?.messageContent || "");
  const messageEditing = surface === "editor" && selectedMessage && selectedMessageRegion === "body" && Boolean(onChangeMessage);

  return (
    <div className={cn("mx-auto w-full space-y-4", widthClass)}>
      <div className="rounded-2xl border border-white/10 bg-[#313338] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
        {surface === "preview" ? (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant={statusVariant}>{statusLabel}</Badge>
            <Badge variant="outline">{mode}</Badge>
            {publishPlan ? <Badge variant="outline">{formatPublishPathLabel(publishPlan)}</Badge> : null}
            {publishPlan?.usesComponentsV2 ? <Badge variant="outline">Interactive layout</Badge> : null}
          </div>
        ) : (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-white/8 bg-black/10 px-3 py-2">
            <Badge variant="outline">{statusLabel}</Badge>
            <span className="text-xs text-[#b5bac1]">
              {selectedNodeId
                ? "Editing the selected block. Tap elsewhere in the message to change focus."
                : "Tap any visible part of the message to edit it directly."}
            </span>
          </div>
        )}
        {publishPlan && surface === "preview" ? (
          <div className="mb-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-xs text-[#b5bac1]">{publishPlan.summary}</p>
            {publishPlan.mode !== "exact" ? (
              <div className={cn("flex flex-wrap gap-2", surface === "preview" ? "mt-3" : "")}>
                <button type="button" className={cn("rounded-full px-3 py-1.5 text-xs font-medium", previewSurface === "studio" ? "bg-white text-black" : "border border-white/10 bg-transparent text-white")} onClick={() => setPreviewSurface("studio")}>Studio view</button>
                <button type="button" className={cn("rounded-full px-3 py-1.5 text-xs font-medium", previewSurface === "live" ? "bg-white text-black" : "border border-white/10 bg-transparent text-white")} onClick={() => setPreviewSurface("live")}>Live publish view</button>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-3">
          <div className="rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,rgba(43,45,49,0.92),rgba(31,33,36,0.96))] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.28)]">
            <div className="flex items-start gap-3">
              <img src={archivistAvatar} alt="Archivist avatar" className="h-10 w-10 shrink-0 rounded-full border border-white/10 object-cover shadow-[0_10px_22px_rgba(0,0,0,0.25)]" />
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[15px] font-semibold text-white">Archivist</span>
                  {surface === "preview" ? <span className="rounded-md bg-[#5865F2] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">APP</span> : null}
                  <span className="text-xs text-[#949ba4]">{surface === "editor" ? "Live draft editor" : previewSurface === "studio" ? "Studio preview" : "Live publish preview"}</span>
                </div>

                {previewSurface === "studio" ? (
                  <>
                    {messageEditing ? (
                      <div className={cn(messageValue ? "rounded-xl border border-white/10 bg-black/10 p-3" : "rounded-xl border border-dashed border-white/10 bg-black/10 p-3")}>
                        <textarea
                          ref={messageInputRef}
                          autoFocus
                          value={messageValue}
                          onChange={(event) => onChangeMessage?.(event.target.value)}
                          placeholder="Write your message."
                          rows={Math.max(3, messageValue.split("\n").length)}
                          className="min-h-[88px] w-full resize-none border-0 bg-transparent text-sm text-[#dbdee1] outline-none placeholder:text-[#949ba4]"
                        />
                        <InlineComposerFooter
                          value={messageValue}
                          onChange={(value) => onChangeMessage?.(value)}
                          targetRef={messageInputRef}
                          limit={2000}
                          discordEmojis={discordEmojis}
                          recentKey="archivist.studio.message.body"
                        />
                      </div>
                    ) : (
                      <PreviewRegion
                        label="Edit message body"
                        onClick={surface === "editor" ? () => onEditMessage?.("body") : null}
                        selected={surface === "editor" ? selectedMessage && selectedMessageRegion === "body" : false}
                        className={messageValue ? "p-2" : surface === "editor" ? "rounded-xl border border-dashed border-white/10 p-3" : ""}
                      >
                        {messageValue ? (
                          <div className="whitespace-pre-wrap text-sm leading-relaxed text-[#dbdee1]">
                            <DiscordRichText text={messageValue} emojiSize={17} />
                          </div>
                        ) : (
                          <div className="text-sm text-[#949ba4]">{surface === "editor" ? "Tap to write your message." : "No message content yet."}</div>
                        )}
                      </PreviewRegion>
                    )}

                    {(view?.embeds || []).map((embed, index) => (
                      <EmbedPreviewCard
                        key={`studio-embed-${index}`}
                        embed={embed}
                        index={index}
                        surface={surface}
                        editable={surface === "editor"}
                        selected={selectedEmbedIndex === index}
                        activeRegion={selectedEmbedIndex === index ? selectedEmbedRegion : null}
                        activeFieldIndex={selectedEmbedIndex === index ? selectedEmbedFieldIndex : null}
                        onEdit={onEditEmbed}
                        onChange={onChangeEmbed}
                        onDelete={onDeleteEmbed}
                        discordEmojis={discordEmojis}
                      />
                    ))}
                    {surface === "editor" && onOpenInsertRoot && (view?.rootNodeIds || []).length === 0 ? (
                      <div className="rounded-xl border border-dashed border-white/10 bg-black/10 p-3">
                        <p className="text-xs text-[#949ba4]">Use the grouped add flow to insert text, embeds, interactions, or layout without switching insertion models.</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <InlineEmbedButton onClick={onOpenInsertRoot}>Open add flow</InlineEmbedButton>
                        </div>
                      </div>
                    ) : null}
                    {(view?.rootNodeIds || []).length > 0 ? (
                      <div className="space-y-2 rounded-xl border border-white/10 bg-[#2b2d31]/80 p-3">
                        {(view?.rootNodeIds || []).map((nodeId) => (
                          <NodePreview key={nodeId} document={document} nodeId={nodeId} editable={surface === "editor"} onEditNode={onEditNode} onOpenInsertNode={onOpenInsertNode} selectedNodeId={selectedNodeId} />
                        ))}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <>
                    {publishPlan?.liveMessage.content ? (
                      <div className="whitespace-pre-wrap text-sm leading-relaxed text-[#dbdee1]">
                        <DiscordRichText text={String(publishPlan.liveMessage.content)} emojiSize={17} />
                      </div>
                    ) : (
                      <div className="text-sm text-[#949ba4]">No live message content.</div>
                    )}
                    {(publishPlan?.liveMessage.embeds || []).map((embed, index) => <EmbedPreviewCard key={`live-embed-${index}`} embed={embed} index={index} surface="preview" />)}
                    {(publishPlan?.liveMessage.components || []).length > 0 ? (
                      <div className="space-y-2 rounded-xl border border-white/10 bg-[#2b2d31]/80 p-3">
                        {(publishPlan?.liveMessage.components || []).map((component, index) => (
                          <PlannedComponentPreview key={`${component.id || component.type}-${index}`} component={component} />
                        ))}
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          </div>

          {surface === "preview" ? (
            <div className="flex flex-wrap gap-2">
              {(publishPlan ? liveInteractionCount : interactionRows.length) === 0 ? (
                <div className="text-xs text-[#949ba4]">{publishPlan?.usesComponentsV2 ? "This page uses content/layout components only. No buttons or select menus are configured yet." : "No buttons or select menus in this page."}</div>
              ) : (
                interactionRows.map((row, index) => <Badge key={`${row.label}-${index}`} variant="outline" className="border-white/10 bg-white/5 text-[#dbdee1]"><DiscordRichText text={row.label} emojiSize={14} /></Badge>)
              )}
            </div>
          ) : null}
        </div>
      </div>

      {surface === "preview" ? (
        <>
          <div className="rounded-2xl border border-white/10 bg-background/40">
            <div className="border-b border-white/10 px-4 py-3"><h4 className="text-sm font-semibold text-white">Actions</h4></div>
            <ScrollArea className="max-h-56">
              <div className="space-y-2 p-4">
                {interactionRows.length === 0 ? <p className="text-xs text-muted-foreground">No mapped interactions yet.</p> : interactionRows.map((row, index) => <div key={`${row.label}-${index}`} className="rounded-xl border border-white/10 bg-background/50 px-3 py-2 text-sm"><span className="font-medium text-white"><DiscordRichText text={row.label} emojiSize={15} /></span><span className="text-muted-foreground">{" -> "}{row.action}</span></div>)}
              </div>
            </ScrollArea>
          </div>
          <div className="rounded-2xl border border-white/10 bg-background/40 p-4">
            <h4 className="mb-3 text-sm font-semibold text-white">Issues</h4>
            <div className="space-y-2">
              {effectiveDiagnostics.length === 0 ? <p className="text-xs text-muted-foreground">No diagnostics. This screen is publish-safe.</p> : null}
              {effectiveDiagnostics.map((diag, index) => <div key={`${diag.code}-${index}`} className="rounded-lg border border-white/10 bg-background/50 px-3 py-2 text-xs text-muted-foreground"><span className="font-medium uppercase text-white/80">{diag.level}</span><span className="ml-2">{diag.message}</span>{diag.path ? <span className="ml-2 text-[10px] opacity-80">({diag.path})</span> : null}</div>)}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
