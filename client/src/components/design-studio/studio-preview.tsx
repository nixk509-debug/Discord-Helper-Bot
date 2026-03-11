import { useEffect, useMemo, useState } from "react";
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

interface StudioPreviewProps {
  document: StudioDocument;
  viewId: string;
  interactionRows: Array<{ label: string; action: string }>;
  diagnostics: StudioDiagnostic[];
  mode: "desktop" | "mobile" | "compact";
  publishPlan?: StudioPublishPlan | null;
}

function getView(document: StudioDocument, viewId: string) {
  return document.views[viewId] || document.views[document.meta.entryViewId];
}

function InlineDiscordEmoji({
  emoji,
  className,
  size = 18,
}: {
  emoji: ParsedDiscordEmoji;
  className?: string;
  size?: number;
}) {
  const url = getDiscordEmojiAssetUrl(emoji, size * 2);
  if (!url) {
    return <span className={className}>{emoji.raw}</span>;
  }

  return (
    <img
      src={url}
      alt={`:${emoji.name}:`}
      className={cn("inline-block shrink-0 align-[-0.22em]", className)}
      style={{ width: size, height: size }}
    />
  );
}

function DiscordRichText({
  text,
  className,
  emojiSize = 18,
}: {
  text: string;
  className?: string;
  emojiSize?: number;
}) {
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

function dividerText(node: StudioNode) {
  const mode = String(node.props.mode || "line");
  const repeat = Math.max(1, Math.min(12, Number(node.props.repeat || 5)));
  if (mode === "emoji") {
    const emoji = String(node.props.emoji || "*");
    return Array.from({ length: repeat }, () => emoji).join(" ");
  }
  if (mode === "symbol") {
    const symbol = String(node.props.symbol || "*");
    return Array.from({ length: repeat }, () => symbol).join(" ");
  }
  if (mode === "stacked") {
    const text = String(node.props.text || "----");
    return Array.from({ length: Math.min(3, repeat) }, () => text).join("\n");
  }
  return String(node.props.text || "--------");
}

function EmbedPreviewCard({ embed }: { embed: StudioEmbedDraft }) {
  const fields = Array.isArray(embed.fields) ? embed.fields : [];
  const hasEmbedContent = Boolean(
    embed.title ||
      embed.description ||
      embed.authorName ||
      embed.footerText ||
      embed.imageUrl ||
      embed.thumbnailUrl ||
      fields.length > 0,
  );

  if (!hasEmbedContent) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 bg-[#2b2d31]/70 p-4 text-xs text-[#949ba4]">
        Empty embed
      </div>
    );
  }

  return (
    <div
      className="overflow-hidden rounded-xl border border-white/10 bg-[#2b2d31]"
      style={{ borderLeft: `4px solid ${embed.color || "#5865F2"}` }}
    >
      <div className={cn("gap-4 p-4", embed.thumbnailUrl ? "grid grid-cols-[minmax(0,1fr),84px]" : "block")}>
        <div className="min-w-0">
          {embed.authorName ? (
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-white">
              {embed.authorIconUrl ? (
                <img
                  src={embed.authorIconUrl}
                  alt=""
                  className="h-6 w-6 rounded-full object-cover"
                  onError={(event) => {
                    (event.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : null}
              <DiscordRichText text={String(embed.authorName)} className={cn(embed.authorUrl ? "text-[#00A8FC]" : "text-white")} emojiSize={16} />
            </div>
          ) : null}

          {embed.title ? (
            <p className={cn("text-sm font-semibold", embed.url ? "text-[#00A8FC]" : "text-white")}>
              <DiscordRichText text={String(embed.title)} emojiSize={18} />
            </p>
          ) : null}

          {embed.description ? (
            <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-[#dbdee1]">
              <DiscordRichText text={String(embed.description)} emojiSize={16} />
            </p>
          ) : null}

          {fields.length > 0 ? (
            <div
              className="mt-3 grid gap-2"
              style={{
                gridTemplateColumns: fields.some((field) => field.inline) ? "repeat(3, minmax(0, 1fr))" : "1fr",
              }}
            >
              {fields.map((field, index) => (
                <div key={`preview-field-${index}`} className={field.inline ? "" : "col-span-full"}>
                  <p className="text-xs font-semibold text-white">
                    <DiscordRichText text={String(field.name || "\u200B")} emojiSize={15} />
                  </p>
                  <p className="whitespace-pre-wrap text-xs text-[#dbdee1]">
                    <DiscordRichText text={String(field.value || "\u200B")} emojiSize={15} />
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          {embed.imageUrl ? (
            <div className="mt-3 overflow-hidden rounded-lg border border-white/10 bg-[#1e1f22]">
              <img
                src={embed.imageUrl}
                alt=""
                className="max-h-[320px] w-full object-cover"
                onError={(event) => {
                  (event.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          ) : null}

          {embed.footerText || embed.timestamp ? (
            <div className="mt-3 flex items-center gap-2 text-[11px] text-[#949ba4]">
              {embed.footerIconUrl ? (
                <img
                  src={embed.footerIconUrl}
                  alt=""
                  className="h-5 w-5 rounded-full object-cover"
                  onError={(event) => {
                    (event.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : null}
              <span>
                {embed.footerText ? <DiscordRichText text={String(embed.footerText)} emojiSize={14} /> : null}
                {embed.footerText && embed.timestamp ? " - " : ""}
                {embed.timestamp ? new Date().toLocaleDateString() : ""}
              </span>
            </div>
          ) : null}
        </div>

        {embed.thumbnailUrl ? (
          <div className="overflow-hidden rounded-lg border border-white/10 bg-[#1e1f22]">
            <img
              src={embed.thumbnailUrl}
              alt=""
              className="h-[84px] w-[84px] object-cover"
              onError={(event) => {
                (event.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function NodePreview({
  document,
  nodeId,
  depth = 0,
}: {
  document: StudioDocument;
  nodeId: string;
  depth?: number;
}) {
  const node = document.nodes[nodeId];
  if (!node) return null;

  const edge = depth > 0 ? "border-l border-white/10 pl-3" : "";

  if (node.type === "container" || node.type === "section") {
    return (
      <div className={cn("space-y-2 rounded-lg border border-white/10 bg-white/[0.03] p-3", edge)}>
        <div className="text-xs font-semibold uppercase tracking-wide text-[#b5bac1]">
          <DiscordRichText text={String(node.props.heading || node.type.replace(/_/g, " "))} emojiSize={15} />
        </div>
        {node.props.description ? (
          <p className="whitespace-pre-wrap text-sm text-[#dbdee1]">
            <DiscordRichText text={String(node.props.description)} emojiSize={16} />
          </p>
        ) : null}
        <div className="space-y-2">
          {node.childIds.map((childId) => (
            <NodePreview key={childId} document={document} nodeId={childId} depth={depth + 1} />
          ))}
        </div>
      </div>
    );
  }

  if (node.type === "text_display") {
    return (
      <p className={cn("whitespace-pre-wrap text-sm text-[#dbdee1]", edge)}>
        <DiscordRichText text={String(node.props.text || "") || "Text block"} emojiSize={16} />
      </p>
    );
  }

  if (node.type === "divider") {
    return (
      <p className={cn("whitespace-pre-wrap text-xs tracking-[0.15em] text-[#949ba4]", edge)}>
        <DiscordRichText text={dividerText(node)} emojiSize={14} />
      </p>
    );
  }

  if (node.type === "style_block") {
    const accent = String(node.props.accentColor || "#5865F2");
    return (
      <div className={cn("rounded-lg border border-white/10 bg-[#2b2d31] p-3", edge)} style={{ borderLeftColor: accent, borderLeftWidth: 4 }}>
        <p className="text-sm font-semibold text-white">
          <DiscordRichText text={String(node.props.title || "Style Block")} emojiSize={16} />
        </p>
        <p className="whitespace-pre-wrap text-xs text-[#dbdee1]">
          <DiscordRichText text={String(node.props.description || "Style block description")} emojiSize={15} />
        </p>
      </div>
    );
  }

  if (node.type === "media_gallery") {
    const items = Array.isArray(node.props.items) ? node.props.items : [];
    return (
      <div className={cn("space-y-2", edge)}>
        <p className="text-xs font-medium text-[#b5bac1]">
          <DiscordRichText text={String(node.props.title || "Media Gallery")} emojiSize={15} />
        </p>
        <div className="grid grid-cols-2 gap-2">
          {items.length === 0 ? <div className="rounded border border-dashed border-white/10 p-2 text-xs text-[#949ba4]">No media items</div> : null}
          {items.slice(0, 4).map((item: any, index: number) => (
            <div key={`media-${index}`} className="relative aspect-[4/3] overflow-hidden rounded-lg border border-white/10 bg-[#1e1f22]">
              {item?.url ? (
                <img
                  src={String(item.url)}
                  alt={String(item?.description || "")}
                  className="h-full w-full object-cover"
                  onError={(event) => {
                    (event.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-[#949ba4]">Missing image</div>
              )}
              {item?.spoiler ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-[10px] font-semibold uppercase tracking-[0.25em] text-white">
                  Spoiler
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (node.type === "file") {
    return (
      <div className={cn("rounded-lg border border-white/10 bg-[#1e1f22] px-3 py-2 text-xs text-[#dbdee1]", edge)}>
        <span>Attachment </span>
        <DiscordRichText text={String(node.props.label || "File")} emojiSize={14} />
        {node.props.url ? <span>{` - ${String(node.props.url)}`}</span> : null}
      </div>
    );
  }

  if (node.type === "action_row") {
    return (
      <div className={cn("flex flex-wrap gap-2", edge)}>
        {node.childIds.map((childId) => (
          <NodePreview key={childId} document={document} nodeId={childId} depth={depth + 1} />
        ))}
      </div>
    );
  }

  if (node.type === "button") {
    const style = Number(node.props.style || 1);
    const parsedEmoji = node.props.emoji ? parseDiscordEmojiToken(String(node.props.emoji)) : null;
    const styleClass =
      style === 1
        ? "bg-[#5865F2] text-white"
        : style === 2
          ? "bg-[#4e5058] text-white"
          : style === 3
            ? "bg-[#248046] text-white"
            : style === 4
              ? "bg-[#da373c] text-white"
              : "bg-[#00a8fc] text-[#101114]";

    return (
      <button type="button" className={cn("rounded-md px-3 py-1.5 text-xs font-medium", styleClass, edge)}>
        {parsedEmoji ? <InlineDiscordEmoji emoji={parsedEmoji} size={15} className="mr-1" /> : null}
        <DiscordRichText text={String(node.props.label || "Button")} emojiSize={15} />
      </button>
    );
  }

  if (["string_select", "role_select", "user_select", "channel_select", "mentionable_select"].includes(node.type)) {
    return (
      <div className={cn("min-w-[180px] rounded-md border border-white/10 bg-[#1e1f22] px-3 py-2 text-xs text-[#dbdee1]", edge)}>
        <DiscordRichText text={String(node.props.placeholder || node.props.label || "Select Menu")} emojiSize={15} />
      </div>
    );
  }

  return (
    <div className={cn("rounded border border-dashed border-white/10 px-2 py-1 text-xs text-[#949ba4]", edge)}>
      {node.type}
    </div>
  );
}

function PlannedComponentPreview({
  component,
  depth = 0,
}: {
  component: EmbedComponentType;
  depth?: number;
}) {
  const edge = depth > 0 ? "border-l border-white/10 pl-3" : "";

  if (component.type === COMPONENT_TYPES.CONTAINER) {
    return (
      <div className={cn("space-y-2 rounded-lg border border-white/10 bg-white/[0.03] p-3", edge)}>
        <div className="space-y-2">
          {(component.components || []).map((child, index) => (
            <PlannedComponentPreview key={`${component.id || "container"}-${child.id || child.type}-${index}`} component={child} depth={depth + 1} />
          ))}
        </div>
      </div>
    );
  }

  if (component.type === COMPONENT_TYPES.SECTION) {
    return (
      <div className={cn("space-y-2 rounded-lg border border-white/10 bg-white/[0.03] p-3", edge)}>
        <div className="space-y-2">
          {(component.components || []).map((child, index) => (
            <PlannedComponentPreview key={`${component.id || "section"}-${child.id || child.type}-${index}`} component={child} depth={depth + 1} />
          ))}
        </div>
        {component.accessory ? (
          <div className="pt-1">
            <PlannedComponentPreview component={component.accessory} depth={depth + 1} />
          </div>
        ) : null}
      </div>
    );
  }

  if (component.type === COMPONENT_TYPES.TEXT_DISPLAY) {
    return (
      <p className={cn("whitespace-pre-wrap text-sm text-[#dbdee1]", edge)}>
        <DiscordRichText text={String(component.content || "") || "Text block"} emojiSize={16} />
      </p>
    );
  }

  if (component.type === COMPONENT_TYPES.SEPARATOR) {
    return (
      <p className={cn("whitespace-pre-wrap text-xs tracking-[0.15em] text-[#949ba4]", edge)}>
        {component.spacing === "large" ? "────────────" : "────────"}
      </p>
    );
  }

  if (component.type === COMPONENT_TYPES.MEDIA_GALLERY) {
    const items = Array.isArray(component.items) ? component.items : [];
    return (
      <div className={cn("space-y-2", edge)}>
        <p className="text-xs font-medium text-[#b5bac1]">Media Gallery</p>
        <div className="grid grid-cols-2 gap-2">
          {items.length === 0 ? <div className="rounded border border-dashed border-white/10 p-2 text-xs text-[#949ba4]">No media items</div> : null}
          {items.slice(0, 4).map((item, index) => (
            <div key={`planned-media-${index}`} className="relative aspect-[4/3] overflow-hidden rounded-lg border border-white/10 bg-[#1e1f22]">
              <img
                src={String(item.url)}
                alt={String(item.description || "")}
                className="h-full w-full object-cover"
                onError={(event) => {
                  (event.target as HTMLImageElement).style.display = "none";
                }}
              />
              {item.spoiler ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-[10px] font-semibold uppercase tracking-[0.25em] text-white">
                  Spoiler
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (component.type === COMPONENT_TYPES.FILE) {
    return (
      <div className={cn("rounded-lg border border-white/10 bg-[#1e1f22] px-3 py-2 text-xs text-[#dbdee1]", edge)}>
        <span>Attachment </span>
        <DiscordRichText text={String(component.label || "File")} emojiSize={14} />
        {component.url ? <span>{` - ${String(component.url)}`}</span> : null}
      </div>
    );
  }

  if (component.type === COMPONENT_TYPES.ACTION_ROW) {
    return (
      <div className={cn("flex flex-wrap gap-2", edge)}>
        {(component.components || []).map((child, index) => (
          <PlannedComponentPreview key={`${component.id || "row"}-${child.id || child.type}-${index}`} component={child} depth={depth + 1} />
        ))}
      </div>
    );
  }

  if (component.type === COMPONENT_TYPES.BUTTON) {
    const style = Number(component.style || 1);
    const parsedEmoji = component.emoji ? parseDiscordEmojiToken(String(component.emoji)) : null;
    const styleClass =
      style === 1
        ? "bg-[#5865F2] text-white"
        : style === 2
          ? "bg-[#4e5058] text-white"
          : style === 3
            ? "bg-[#248046] text-white"
            : style === 4
              ? "bg-[#da373c] text-white"
              : "bg-[#00a8fc] text-[#101114]";

    return (
      <button type="button" className={cn("rounded-md px-3 py-1.5 text-xs font-medium", styleClass, edge)}>
        {parsedEmoji ? <InlineDiscordEmoji emoji={parsedEmoji} size={15} className="mr-1" /> : null}
        <DiscordRichText text={String(component.label || "Button")} emojiSize={15} />
      </button>
    );
  }

  if (component.type === COMPONENT_TYPES.SELECT_MENU) {
    return (
      <div className={cn("min-w-[180px] rounded-md border border-white/10 bg-[#1e1f22] px-3 py-2 text-xs text-[#dbdee1]", edge)}>
        <DiscordRichText text={String(component.placeholder || component.label || "Select Menu")} emojiSize={15} />
      </div>
    );
  }

  return (
    <div className={cn("rounded border border-dashed border-white/10 px-2 py-1 text-xs text-[#949ba4]", edge)}>
      Component {component.type}
    </div>
  );
}

export function StudioPreview({ document, viewId, interactionRows, diagnostics, mode, publishPlan }: StudioPreviewProps) {
  const view = getView(document, viewId);
  const widthClass = mode === "mobile" ? "max-w-[390px]" : mode === "compact" ? "max-w-[560px]" : "max-w-full";
  const [previewSurface, setPreviewSurface] = useState<"studio" | "live">("studio");

  useEffect(() => {
    if (!publishPlan) {
      setPreviewSurface("studio");
      return;
    }
    setPreviewSurface(publishPlan.mode === "exact" ? "studio" : "live");
  }, [publishPlan?.mode, publishPlan?.viewId]);

  const effectiveDiagnostics = publishPlan?.diagnostics || diagnostics;
  const hasErrors = effectiveDiagnostics.some((entry) => entry.level === "error");
  const hasWarnings = effectiveDiagnostics.some((entry) => entry.level === "warning");
  const hasPreviewOnly = effectiveDiagnostics.some((entry) => entry.code.includes("RUNTIME_GATED") || entry.code.includes("PREVIEW_ONLY"));
  const statusLabel = publishPlan?.label || (hasErrors ? "Invalid" : hasWarnings ? "Degraded" : "Publish-safe");
  const statusVariant = hasErrors ? "destructive" : hasWarnings ? "secondary" : "default";
  const liveComponents = publishPlan?.liveMessage.components || [];
  const liveInteractionCount = useMemo(
    () =>
      liveComponents.filter((component) =>
        component.type === COMPONENT_TYPES.ACTION_ROW ||
        component.type === COMPONENT_TYPES.BUTTON ||
        component.type === COMPONENT_TYPES.SELECT_MENU,
      ).length,
    [liveComponents],
  );

  return (
    <div className={cn("mx-auto w-full space-y-4", widthClass)}>
      <div className="rounded-2xl border border-white/10 bg-[#313338] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge variant={statusVariant}>{statusLabel}</Badge>
          {hasPreviewOnly ? <Badge variant="outline">Preview-only parts</Badge> : null}
          <Badge variant="outline">{mode}</Badge>
          {publishPlan ? <Badge variant="outline">{publishPlan.publishPath}</Badge> : null}
        </div>

        {publishPlan ? (
          <div className="mb-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={publishPlan.mode === "blocked" ? "destructive" : publishPlan.mode === "downgraded" ? "secondary" : "default"}>
                {publishPlan.label}
              </Badge>
              <Badge variant="outline">Uses V2: {publishPlan.usesComponentsV2 ? "yes" : "no"}</Badge>
              <Badge variant="outline">Layout: {publishPlan.usesLayoutComponents ? "yes" : "no"}</Badge>
              <Badge variant="outline">Content: {publishPlan.usesContentComponents ? "yes" : "no"}</Badge>
              <Badge variant="outline">Interactive: {publishPlan.usesInteractiveComponents ? "yes" : "no"}</Badge>
            </div>
            <p className="mt-2 text-xs text-[#b5bac1]">{publishPlan.summary}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className={cn("rounded-full px-3 py-1.5 text-xs font-medium", previewSurface === "studio" ? "bg-white text-black" : "border border-white/10 bg-transparent text-white")}
                onClick={() => setPreviewSurface("studio")}
              >
                Studio view
              </button>
              <button
                type="button"
                className={cn("rounded-full px-3 py-1.5 text-xs font-medium", previewSurface === "live" ? "bg-white text-black" : "border border-white/10 bg-transparent text-white")}
                onClick={() => setPreviewSurface("live")}
              >
                Live publish view
              </button>
            </div>
          </div>
        ) : null}

        {publishPlan && publishPlan.mode !== "exact" ? (
          <div className="mb-3 rounded-xl border border-white/10 bg-background/30 p-3 text-xs text-[#dbdee1]">
            <p className="font-medium text-white">
              {publishPlan.mode === "blocked" ? "Publish is blocked." : "This page will publish in a simplified form."}
            </p>
            <div className="mt-2 space-y-1">
              {publishPlan.nodeOutcomes.filter((entry) => entry.status !== "exact").map((entry) => (
                <div key={`${entry.nodeId}-${entry.status}`} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                  <span className="font-medium text-white">{entry.nodeType.replace(/_/g, " ")}</span>
                  <span className="ml-2 text-[#b5bac1]">{entry.reason}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="space-y-3">
          {previewSurface === "studio" ? (
            <>
              {view?.messageContent ? (
                <div className="whitespace-pre-wrap text-sm text-[#dbdee1]">
                  <DiscordRichText text={String(view.messageContent)} emojiSize={17} />
                </div>
              ) : (
                <div className="text-sm text-[#949ba4]">No message content yet.</div>
              )}

              {(view?.embeds || []).map((embed, index) => (
                <EmbedPreviewCard key={`${embed.title || "embed"}-${index}`} embed={embed} />
              ))}

              {(view?.rootNodeIds || []).length > 0 ? (
                <div className="space-y-2 rounded-xl border border-white/10 bg-[#2b2d31]/80 p-3">
                  {(view?.rootNodeIds || []).map((nodeId) => (
                    <NodePreview key={nodeId} document={document} nodeId={nodeId} />
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <>
              {publishPlan?.liveMessage.content ? (
                <div className="whitespace-pre-wrap text-sm text-[#dbdee1]">
                  <DiscordRichText text={String(publishPlan.liveMessage.content)} emojiSize={17} />
                </div>
              ) : (
                <div className="text-sm text-[#949ba4]">No live message content.</div>
              )}

              {(publishPlan?.liveMessage.embeds || []).map((embed, index) => (
                <EmbedPreviewCard key={`${embed.title || "live-embed"}-${index}`} embed={embed} />
              ))}

              {(publishPlan?.liveMessage.components || []).length > 0 ? (
                <div className="space-y-2 rounded-xl border border-white/10 bg-[#2b2d31]/80 p-3">
                  {(publishPlan?.liveMessage.components || []).map((component, index) => (
                    <PlannedComponentPreview key={`${component.id || component.type}-${index}`} component={component} />
                  ))}
                </div>
              ) : null}
            </>
          )}

          <div className="flex flex-wrap gap-2">
            {(publishPlan ? liveInteractionCount : interactionRows.length) === 0 ? (
              <div className="text-xs text-[#949ba4]">
                {publishPlan?.usesComponentsV2
                  ? "This page uses content/layout components only. No buttons or select menus are configured yet."
                  : "No buttons or select menus in this page."}
              </div>
            ) : (
              interactionRows.map((row, index) => (
                <Badge key={`${row.label}-${index}`} variant="outline" className="border-white/10 bg-white/5 text-[#dbdee1]">
                  <DiscordRichText text={row.label} emojiSize={14} />
                </Badge>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-background/40">
        <div className="border-b border-white/10 px-4 py-3">
          <h4 className="text-sm font-semibold text-white">Interaction Map</h4>
        </div>
        <ScrollArea className="max-h-56">
          <div className="space-y-2 p-4">
            {interactionRows.length === 0 ? (
              <p className="text-xs text-muted-foreground">No mapped interactions yet.</p>
            ) : (
              interactionRows.map((row, index) => (
                <div key={`${row.label}-${index}`} className="rounded-xl border border-white/10 bg-background/50 px-3 py-2 text-sm">
                  <span className="font-medium text-white"><DiscordRichText text={row.label} emojiSize={15} /></span>
                  <span className="text-muted-foreground">{" -> "}{row.action}</span>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="rounded-2xl border border-white/10 bg-background/40 p-4">
        <h4 className="mb-3 text-sm font-semibold text-white">Validation Hints</h4>
        <div className="space-y-2">
          {effectiveDiagnostics.length === 0 ? <p className="text-xs text-muted-foreground">No diagnostics. This screen is publish-safe.</p> : null}
          {effectiveDiagnostics.map((diag, index) => (
            <div key={`${diag.code}-${index}`} className="rounded-lg border border-white/10 bg-background/50 px-3 py-2 text-xs text-muted-foreground">
              <span className="font-medium uppercase text-white/80">{diag.level}</span>
              <span className="ml-2">{diag.message}</span>
              {diag.path ? <span className="ml-2 text-[10px] opacity-80">({diag.path})</span> : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
