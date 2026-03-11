import { useEffect, useMemo, useState, type ReactNode } from "react";
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
import { cn } from "@/lib/utils";

export type StudioEmbedEditRegion =
  | "embed"
  | "author"
  | "title"
  | "description"
  | "field"
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
  onEditMessage?: () => void;
  onEditEmbed?: (embedIndex: number, region?: StudioEmbedEditRegion, fieldIndex?: number) => void;
  onEditNode?: (nodeId: string) => void;
  selectedMessage?: boolean;
  selectedEmbedIndex?: number | null;
  selectedNodeId?: string | null;
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
      return "Components V2";
    case "legacy":
      return "Legacy message";
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
    onClick ? "cursor-pointer hover:bg-white/[0.05]" : "",
    selected ? "ring-1 ring-primary/70 bg-primary/10 shadow-[0_0_0_1px_rgba(177,18,38,0.18)]" : "",
    className,
  );

  if (!onClick) return <div className={classes}>{children}</div>;
  return (
    <button type="button" onClick={onClick} className={cn("w-full text-left", classes)} aria-label={label}>
      {children}
    </button>
  );
}

function dividerText(node: StudioNode) {
  const mode = String(node.props.mode || "line");
  const repeat = Math.max(1, Math.min(12, Number(node.props.repeat || 5)));
  if (mode === "emoji") return Array.from({ length: repeat }, () => String(node.props.emoji || "*")).join(" ");
  if (mode === "symbol") return Array.from({ length: repeat }, () => String(node.props.symbol || "*")).join(" ");
  if (mode === "stacked") return Array.from({ length: Math.min(3, repeat) }, () => String(node.props.text || "----")).join("\n");
  return String(node.props.text || "--------");
}

function EmbedPreviewCard({
  embed,
  index,
  editable = false,
  selected = false,
  onEdit,
}: {
  embed: StudioEmbedDraft;
  index: number;
  editable?: boolean;
  selected?: boolean;
  onEdit?: (embedIndex: number, region?: StudioEmbedEditRegion, fieldIndex?: number) => void;
}) {
  const fields = Array.isArray(embed.fields) ? embed.fields : [];
  const edit = (region: StudioEmbedEditRegion, fieldIndex?: number) => onEdit?.(index, region, fieldIndex);

  return (
    <div className={cn("overflow-hidden rounded-xl border border-white/10 bg-[#2b2d31]", selected ? "ring-1 ring-primary/65" : "")} style={{ borderLeft: `4px solid ${embed.color || "#5865F2"}` }}>
      <div className={cn("gap-4 p-4", embed.thumbnailUrl ? "grid grid-cols-[minmax(0,1fr),84px]" : "block")}>
        <div className="min-w-0 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <PreviewRegion label="Edit embed color" onClick={editable ? () => edit("color") : null} className="inline-flex items-center gap-2 px-2 py-1">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: embed.color || "#5865F2" }} />
              <span className="text-[11px] uppercase tracking-[0.22em] text-[#949ba4]">Embed</span>
            </PreviewRegion>
            {editable ? <button type="button" className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-[#b5bac1]" onClick={() => edit("embed")}>Edit</button> : null}
          </div>
          <PreviewRegion label="Edit author" onClick={editable ? () => edit("author") : null} className={embed.authorName || editable ? "p-1" : ""}>
            {embed.authorName ? (
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                {embed.authorIconUrl ? <img src={embed.authorIconUrl} alt="" className="h-6 w-6 rounded-full object-cover" /> : null}
                <DiscordRichText text={String(embed.authorName)} className={cn(embed.authorUrl ? "text-[#00A8FC]" : "text-white")} emojiSize={16} />
              </div>
            ) : editable ? (
              <p className="text-xs text-[#949ba4]">Tap to add an author label or icon.</p>
            ) : null}
          </PreviewRegion>
          <PreviewRegion label="Edit title" onClick={editable ? () => edit("title") : null} selected={selected} className={embed.title || editable ? "p-1" : ""}>
            {embed.title ? (
              <p className={cn("text-sm font-semibold", embed.url ? "text-[#00A8FC]" : "text-white")}>
                <DiscordRichText text={String(embed.title)} emojiSize={18} />
              </p>
            ) : editable ? (
              <p className="text-sm font-semibold text-[#b5bac1]">Tap to add a title</p>
            ) : null}
          </PreviewRegion>
          <PreviewRegion label="Edit description" onClick={editable ? () => edit("description") : null} className={embed.description || editable ? "p-1" : ""}>
            {embed.description ? (
              <p className="whitespace-pre-wrap text-xs leading-relaxed text-[#dbdee1]">
                <DiscordRichText text={String(embed.description)} emojiSize={16} />
              </p>
            ) : editable ? (
              <p className="text-xs text-[#949ba4]">Tap to add a description</p>
            ) : null}
          </PreviewRegion>
          {fields.length > 0 || editable ? (
            <div className="grid gap-2" style={{ gridTemplateColumns: fields.some((field) => field.inline) ? "repeat(3, minmax(0, 1fr))" : "1fr" }}>
              {fields.length === 0 && editable ? (
                <PreviewRegion label="Add field" onClick={() => edit("field", 0)} className="col-span-full border border-dashed border-white/10 p-3">
                  <p className="text-xs text-[#949ba4]">Tap to add fields</p>
                </PreviewRegion>
              ) : null}
              {fields.map((field, fieldIndex) => (
                <PreviewRegion key={`field-${fieldIndex}`} label={`Edit field ${fieldIndex + 1}`} onClick={editable ? () => edit("field", fieldIndex) : null} className={cn(field.inline ? "p-2" : "col-span-full p-2")}>
                  <p className="text-xs font-semibold text-white"><DiscordRichText text={String(field.name || "\u200B")} emojiSize={15} /></p>
                  <p className="whitespace-pre-wrap text-xs text-[#dbdee1]"><DiscordRichText text={String(field.value || "\u200B")} emojiSize={15} /></p>
                </PreviewRegion>
              ))}
            </div>
          ) : null}
          <PreviewRegion label="Edit image" onClick={editable ? () => edit("image") : null} className={embed.imageUrl ? "overflow-hidden rounded-lg border border-white/10 bg-[#1e1f22]" : editable ? "rounded-lg border border-dashed border-white/10 p-3" : ""}>
            {embed.imageUrl ? <img src={embed.imageUrl} alt="" className="max-h-[320px] w-full object-cover" /> : editable ? <p className="text-xs text-[#949ba4]">Tap to add an image</p> : null}
          </PreviewRegion>
          <PreviewRegion label="Edit footer" onClick={editable ? () => edit("footer") : null} className={embed.footerText || embed.timestamp || editable ? "p-1" : ""}>
            {embed.footerText || embed.timestamp ? (
              <div className="flex items-center gap-2 text-[11px] text-[#949ba4]">
                {embed.footerIconUrl ? <img src={embed.footerIconUrl} alt="" className="h-5 w-5 rounded-full object-cover" /> : null}
                <span>
                  {embed.footerText ? <DiscordRichText text={String(embed.footerText)} emojiSize={14} /> : null}
                  {embed.footerText && embed.timestamp ? " - " : ""}
                  {embed.timestamp ? new Date().toLocaleDateString() : ""}
                </span>
              </div>
            ) : editable ? (
              <p className="text-xs text-[#949ba4]">Tap to add a footer or timestamp</p>
            ) : null}
          </PreviewRegion>
        </div>
        <PreviewRegion label="Edit thumbnail" onClick={editable ? () => edit("thumbnail") : null} className={embed.thumbnailUrl ? "overflow-hidden rounded-lg border border-white/10 bg-[#1e1f22]" : editable ? "flex min-h-[84px] items-center justify-center rounded-lg border border-dashed border-white/10 px-2 text-center" : ""}>
          {embed.thumbnailUrl ? <img src={embed.thumbnailUrl} alt="" className="h-[84px] w-[84px] object-cover" /> : editable ? <p className="text-[11px] text-[#949ba4]">Tap to add a thumbnail</p> : null}
        </PreviewRegion>
      </div>
    </div>
  );
}

function NodePreview({
  document,
  nodeId,
  editable = false,
  onEditNode,
  selectedNodeId,
  depth = 0,
}: {
  document: StudioDocument;
  nodeId: string;
  editable?: boolean;
  onEditNode?: (nodeId: string) => void;
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
      <div className={cn("space-y-2 rounded-lg border border-white/10 bg-white/[0.03] p-3", edge, selected ? "ring-1 ring-primary/60 bg-primary/10" : "")}>
        <PreviewRegion label={`Edit ${node.type}`} onClick={edit} selected={selected} className="p-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#b5bac1]"><DiscordRichText text={String(node.props.heading || node.type.replace(/_/g, " "))} emojiSize={15} /></p>
          {node.props.description ? <p className="mt-2 whitespace-pre-wrap text-sm text-[#dbdee1]"><DiscordRichText text={String(node.props.description)} emojiSize={16} /></p> : editable ? <p className="mt-2 text-xs text-[#949ba4]">Tap to add section copy.</p> : null}
        </PreviewRegion>
        <div className="space-y-2">
          {node.childIds.map((childId) => (
            <NodePreview key={childId} document={document} nodeId={childId} editable={editable} onEditNode={onEditNode} selectedNodeId={selectedNodeId} depth={depth + 1} />
          ))}
        </div>
      </div>
    );
  }

  if (node.type === "text_display") {
    return <PreviewRegion label="Edit text block" onClick={edit} selected={selected} className={cn("p-2", edge)}><p className="whitespace-pre-wrap text-sm text-[#dbdee1]"><DiscordRichText text={String(node.props.text || "") || "Text block"} emojiSize={16} /></p></PreviewRegion>;
  }
  if (node.type === "divider") {
    return <PreviewRegion label="Edit divider" onClick={edit} selected={selected} className={cn("p-2", edge)}><p className="whitespace-pre-wrap text-xs tracking-[0.15em] text-[#949ba4]"><DiscordRichText text={dividerText(node)} emojiSize={14} /></p></PreviewRegion>;
  }
  if (node.type === "style_block") {
    const accent = String(node.props.accentColor || "#5865F2");
    return <PreviewRegion label="Edit notice panel" onClick={edit} selected={selected} className={edge}><div className="rounded-lg border border-white/10 bg-[#2b2d31] p-3" style={{ borderLeftColor: accent, borderLeftWidth: 4 }}><p className="text-sm font-semibold text-white"><DiscordRichText text={String(node.props.title || "Notice")} emojiSize={16} /></p><p className="whitespace-pre-wrap text-xs text-[#dbdee1]"><DiscordRichText text={String(node.props.description || "")} emojiSize={15} /></p></div></PreviewRegion>;
  }
  if (node.type === "media_gallery") {
    const items = Array.isArray(node.props.items) ? node.props.items : [];
    return <PreviewRegion label="Edit media gallery" onClick={edit} selected={selected} className={cn("space-y-2 p-2", edge)}><p className="text-xs font-medium text-[#b5bac1]"><DiscordRichText text={String(node.props.title || "Media Gallery")} emojiSize={15} /></p><div className="grid grid-cols-2 gap-2">{items.length === 0 ? <div className="rounded border border-dashed border-white/10 p-2 text-xs text-[#949ba4]">No media items</div> : null}{items.slice(0, 4).map((item: any, index: number) => <div key={`media-${index}`} className="relative aspect-[4/3] overflow-hidden rounded-lg border border-white/10 bg-[#1e1f22]">{item?.url ? <img src={String(item.url)} alt={String(item?.description || "")} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-[#949ba4]">Missing image</div>}</div>)}</div></PreviewRegion>;
  }
  if (node.type === "file") {
    return <PreviewRegion label="Edit file block" onClick={edit} selected={selected} className={cn("p-2", edge)}><div className="rounded-lg border border-white/10 bg-[#1e1f22] px-3 py-2 text-xs text-[#dbdee1]"><span>Attachment </span><DiscordRichText text={String(node.props.label || "File")} emojiSize={14} />{node.props.url ? <span>{` - ${String(node.props.url)}`}</span> : null}</div></PreviewRegion>;
  }
  if (node.type === "action_row") {
    return <div className={cn("space-y-2", edge, selected ? "rounded-lg ring-1 ring-primary/60" : "")}>{editable ? <button type="button" onClick={edit || undefined} className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-[#949ba4]">Edit button row</button> : null}<div className="flex flex-wrap gap-2">{node.childIds.map((childId) => <NodePreview key={childId} document={document} nodeId={childId} editable={editable} onEditNode={onEditNode} selectedNodeId={selectedNodeId} depth={depth + 1} />)}</div></div>;
  }
  if (node.type === "button") {
    const style = Number(node.props.style || 1);
    const parsedEmoji = node.props.emoji ? parseDiscordEmojiToken(String(node.props.emoji)) : null;
    const styleClass = style === 1 ? "bg-[#5865F2] text-white" : style === 2 ? "bg-[#4e5058] text-white" : style === 3 ? "bg-[#248046] text-white" : style === 4 ? "bg-[#da373c] text-white" : "bg-[#00a8fc] text-[#101114]";
    return <button type="button" onClick={edit || undefined} className={cn("rounded-md px-3 py-1.5 text-xs font-medium transition", styleClass, edge, selected ? "ring-2 ring-white/40" : "")}>{parsedEmoji ? <InlineDiscordEmoji emoji={parsedEmoji} size={15} className="mr-1" /> : null}<DiscordRichText text={String(node.props.label || "Button")} emojiSize={15} /></button>;
  }

  return <button type="button" onClick={edit || undefined} className={cn("min-w-[180px] rounded-md border border-white/10 bg-[#1e1f22] px-3 py-2 text-left text-xs text-[#dbdee1] transition hover:border-primary/35", edge, selected ? "ring-2 ring-primary/45" : "")}><DiscordRichText text={String(node.props.placeholder || node.props.label || "Select Menu")} emojiSize={15} /></button>;
}

function PlannedComponentPreview({ component, depth = 0 }: { component: EmbedComponentType; depth?: number }) {
  const edge = depth > 0 ? "border-l border-white/10 pl-3" : "";
  if (component.type === COMPONENT_TYPES.CONTAINER || component.type === COMPONENT_TYPES.SECTION) return <div className={cn("space-y-2 rounded-lg border border-white/10 bg-white/[0.03] p-3", edge)}>{(component.components || []).map((child, index) => <PlannedComponentPreview key={`${component.id || component.type}-${child.id || child.type}-${index}`} component={child} depth={depth + 1} />)}{component.accessory ? <PlannedComponentPreview component={component.accessory} depth={depth + 1} /> : null}</div>;
  if (component.type === COMPONENT_TYPES.TEXT_DISPLAY) return <p className={cn("whitespace-pre-wrap text-sm text-[#dbdee1]", edge)}><DiscordRichText text={String(component.content || "") || "Text block"} emojiSize={16} /></p>;
  if (component.type === COMPONENT_TYPES.SEPARATOR) return <p className={cn("whitespace-pre-wrap text-xs tracking-[0.15em] text-[#949ba4]", edge)}>{component.spacing === "large" ? "------------" : "--------"}</p>;
  if (component.type === COMPONENT_TYPES.MEDIA_GALLERY) return <div className={cn("grid grid-cols-2 gap-2", edge)}>{(component.items || []).slice(0, 4).map((item, index) => <div key={`planned-media-${index}`} className="relative aspect-[4/3] overflow-hidden rounded-lg border border-white/10 bg-[#1e1f22]"><img src={String(item.url)} alt={String(item.description || "")} className="h-full w-full object-cover" /></div>)}</div>;
  if (component.type === COMPONENT_TYPES.FILE) return <div className={cn("rounded-lg border border-white/10 bg-[#1e1f22] px-3 py-2 text-xs text-[#dbdee1]", edge)}><span>Attachment </span><DiscordRichText text={String(component.label || "File")} emojiSize={14} /></div>;
  if (component.type === COMPONENT_TYPES.ACTION_ROW) return <div className={cn("flex flex-wrap gap-2", edge)}>{(component.components || []).map((child, index) => <PlannedComponentPreview key={`${component.id || "row"}-${child.id || child.type}-${index}`} component={child} depth={depth + 1} />)}</div>;
  if (component.type === COMPONENT_TYPES.BUTTON) return <button type="button" className={cn("rounded-md bg-[#5865F2] px-3 py-1.5 text-xs font-medium text-white", edge)}><DiscordRichText text={String(component.label || "Button")} emojiSize={15} /></button>;
  return <div className={cn("min-w-[180px] rounded-md border border-white/10 bg-[#1e1f22] px-3 py-2 text-xs text-[#dbdee1]", edge)}><DiscordRichText text={String(component.placeholder || component.label || "Select Menu")} emojiSize={15} /></div>;
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
  onEditEmbed,
  onEditNode,
  selectedMessage = false,
  selectedEmbedIndex = null,
  selectedNodeId = null,
}: StudioPreviewProps) {
  const view = getView(document, viewId);
  const widthClass = mode === "mobile" ? "max-w-[390px]" : mode === "compact" ? "max-w-[560px]" : "max-w-full";
  const [previewSurface, setPreviewSurface] = useState<"studio" | "live">("studio");

  useEffect(() => {
    if (!publishPlan) return setPreviewSurface("studio");
    setPreviewSurface(publishPlan.mode === "exact" ? "studio" : "live");
  }, [publishPlan?.mode, publishPlan?.viewId]);

  const effectiveDiagnostics = publishPlan?.diagnostics || diagnostics;
  const hasErrors = effectiveDiagnostics.some((entry) => entry.level === "error");
  const hasWarnings = effectiveDiagnostics.some((entry) => entry.level === "warning");
  const statusLabel = surface === "editor" ? (hasErrors ? "Blocked" : hasWarnings ? "Warning" : "No issues") : publishPlan?.label || (hasErrors ? "Invalid" : hasWarnings ? "Degraded" : "Publish-safe");
  const statusVariant = hasErrors ? "destructive" : hasWarnings ? "secondary" : "default";
  const liveComponents = publishPlan?.liveMessage.components || [];
  const liveInteractionCount = useMemo(() => liveComponents.filter((component) => component.type === COMPONENT_TYPES.ACTION_ROW || component.type === COMPONENT_TYPES.BUTTON || component.type === COMPONENT_TYPES.SELECT_MENU).length, [liveComponents]);

  return (
    <div className={cn("mx-auto w-full space-y-4", widthClass)}>
      <div className="rounded-2xl border border-white/10 bg-[#313338] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge variant={statusVariant}>{statusLabel}</Badge>
          {surface === "preview" ? <Badge variant="outline">{mode}</Badge> : null}
          {publishPlan ? <Badge variant="outline">{formatPublishPathLabel(publishPlan)}</Badge> : null}
          {publishPlan?.usesComponentsV2 ? <Badge variant="outline">V2</Badge> : null}
        </div>
        {publishPlan ? (
          <div className="mb-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
            {surface === "preview" ? <p className="text-xs text-[#b5bac1]">{publishPlan.summary}</p> : null}
            {publishPlan.mode !== "exact" || surface === "preview" ? (
              <div className={cn("flex flex-wrap gap-2", surface === "preview" ? "mt-3" : "")}>
                <button type="button" className={cn("rounded-full px-3 py-1.5 text-xs font-medium", previewSurface === "studio" ? "bg-white text-black" : "border border-white/10 bg-transparent text-white")} onClick={() => setPreviewSurface("studio")}>Studio view</button>
                <button type="button" className={cn("rounded-full px-3 py-1.5 text-xs font-medium", previewSurface === "live" ? "bg-white text-black" : "border border-white/10 bg-transparent text-white")} onClick={() => setPreviewSurface("live")}>Live publish view</button>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-3">
          {previewSurface === "studio" ? (
            <>
              <PreviewRegion label="Edit message body" onClick={surface === "editor" ? onEditMessage : null} selected={surface === "editor" ? selectedMessage : false} className={view?.messageContent ? "p-2" : surface === "editor" ? "rounded-xl border border-dashed border-white/10 p-3" : ""}>
                {view?.messageContent ? <div className="whitespace-pre-wrap text-sm text-[#dbdee1]"><DiscordRichText text={String(view.messageContent)} emojiSize={17} /></div> : <div className="text-sm text-[#949ba4]">{surface === "editor" ? "Tap to write your message." : "No message content yet."}</div>}
              </PreviewRegion>
              {(view?.embeds || []).map((embed, index) => <EmbedPreviewCard key={`${embed.title || "embed"}-${index}`} embed={embed} index={index} editable={surface === "editor"} selected={selectedEmbedIndex === index} onEdit={onEditEmbed} />)}
              {(view?.rootNodeIds || []).length > 0 ? <div className="space-y-2 rounded-xl border border-white/10 bg-[#2b2d31]/80 p-3">{(view?.rootNodeIds || []).map((nodeId) => <NodePreview key={nodeId} document={document} nodeId={nodeId} editable={surface === "editor"} onEditNode={onEditNode} selectedNodeId={selectedNodeId} />)}</div> : null}
            </>
          ) : (
            <>
              {publishPlan?.liveMessage.content ? <div className="whitespace-pre-wrap text-sm text-[#dbdee1]"><DiscordRichText text={String(publishPlan.liveMessage.content)} emojiSize={17} /></div> : <div className="text-sm text-[#949ba4]">No live message content.</div>}
              {(publishPlan?.liveMessage.embeds || []).map((embed, index) => <EmbedPreviewCard key={`${embed.title || "live-embed"}-${index}`} embed={embed} index={index} />)}
              {(publishPlan?.liveMessage.components || []).length > 0 ? <div className="space-y-2 rounded-xl border border-white/10 bg-[#2b2d31]/80 p-3">{(publishPlan?.liveMessage.components || []).map((component, index) => <PlannedComponentPreview key={`${component.id || component.type}-${index}`} component={component} />)}</div> : null}
            </>
          )}

          <div className="flex flex-wrap gap-2">
            {(publishPlan ? liveInteractionCount : interactionRows.length) === 0 ? (
              <div className="text-xs text-[#949ba4]">{publishPlan?.usesComponentsV2 ? "This page uses content/layout components only. No buttons or select menus are configured yet." : "No buttons or select menus in this page."}</div>
            ) : (
              interactionRows.map((row, index) => <Badge key={`${row.label}-${index}`} variant="outline" className="border-white/10 bg-white/5 text-[#dbdee1]"><DiscordRichText text={row.label} emojiSize={14} /></Badge>)
            )}
          </div>
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
