import type { StudioDiagnostic, StudioDocument, StudioEmbedDraft, StudioNode } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface StudioPreviewProps {
  document: StudioDocument;
  viewId: string;
  interactionRows: Array<{ label: string; action: string }>;
  diagnostics: StudioDiagnostic[];
  mode: "desktop" | "mobile" | "compact";
}

function getView(document: StudioDocument, viewId: string) {
  return document.views[viewId] || document.views[document.meta.entryViewId];
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
              <span className={cn(embed.authorUrl ? "text-[#00A8FC]" : "text-white")}>{embed.authorName}</span>
            </div>
          ) : null}

          {embed.title ? (
            <p className={cn("text-sm font-semibold", embed.url ? "text-[#00A8FC]" : "text-white")}>{embed.title}</p>
          ) : null}

          {embed.description ? (
            <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-[#dbdee1]">{embed.description}</p>
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
                  <p className="text-xs font-semibold text-white">{field.name || "\u200B"}</p>
                  <p className="whitespace-pre-wrap text-xs text-[#dbdee1]">{field.value || "\u200B"}</p>
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
                {embed.footerText || ""}
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
          {String(node.props.heading || node.type.replace(/_/g, " "))}
        </div>
        {node.props.description ? (
          <p className="whitespace-pre-wrap text-sm text-[#dbdee1]">{String(node.props.description)}</p>
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
    return <p className={cn("whitespace-pre-wrap text-sm text-[#dbdee1]", edge)}>{String(node.props.text || "") || "Text block"}</p>;
  }

  if (node.type === "divider") {
    return <p className={cn("whitespace-pre-wrap text-xs tracking-[0.15em] text-[#949ba4]", edge)}>{dividerText(node)}</p>;
  }

  if (node.type === "style_block") {
    const accent = String(node.props.accentColor || "#5865F2");
    return (
      <div className={cn("rounded-lg border border-white/10 bg-[#2b2d31] p-3", edge)} style={{ borderLeftColor: accent, borderLeftWidth: 4 }}>
        <p className="text-sm font-semibold text-white">{String(node.props.title || "Style Block")}</p>
        <p className="whitespace-pre-wrap text-xs text-[#dbdee1]">{String(node.props.description || "Style block description")}</p>
      </div>
    );
  }

  if (node.type === "media_gallery") {
    const items = Array.isArray(node.props.items) ? node.props.items : [];
    return (
      <div className={cn("space-y-2", edge)}>
        <p className="text-xs font-medium text-[#b5bac1]">{String(node.props.title || "Media Gallery")}</p>
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
        Attachment {String(node.props.label || "File")}
        {node.props.url ? ` - ${String(node.props.url)}` : ""}
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
        {node.props.emoji ? `${String(node.props.emoji)} ` : ""}
        {String(node.props.label || "Button")}
      </button>
    );
  }

  if (["string_select", "role_select", "user_select", "channel_select", "mentionable_select"].includes(node.type)) {
    return (
      <div className={cn("min-w-[180px] rounded-md border border-white/10 bg-[#1e1f22] px-3 py-2 text-xs text-[#dbdee1]", edge)}>
        {String(node.props.placeholder || node.props.label || "Select Menu")}
      </div>
    );
  }

  return (
    <div className={cn("rounded border border-dashed border-white/10 px-2 py-1 text-xs text-[#949ba4]", edge)}>
      {node.type}
    </div>
  );
}

export function StudioPreview({ document, viewId, interactionRows, diagnostics, mode }: StudioPreviewProps) {
  const view = getView(document, viewId);
  const widthClass = mode === "mobile" ? "max-w-[390px]" : mode === "compact" ? "max-w-[560px]" : "max-w-full";

  const hasErrors = diagnostics.some((entry) => entry.level === "error");
  const hasWarnings = diagnostics.some((entry) => entry.level === "warning");
  const hasPreviewOnly = diagnostics.some((entry) => entry.code.includes("RUNTIME_GATED") || entry.code.includes("PREVIEW_ONLY"));

  const statusLabel = hasErrors ? "Invalid" : hasWarnings ? "Degraded" : "Publish-safe";
  const statusVariant = hasErrors ? "destructive" : hasWarnings ? "secondary" : "default";

  return (
    <div className={cn("mx-auto w-full space-y-4", widthClass)}>
      <div className="rounded-2xl border border-white/10 bg-[#313338] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge variant={statusVariant}>{statusLabel}</Badge>
          {hasPreviewOnly ? <Badge variant="outline">Preview-only parts</Badge> : null}
          <Badge variant="outline">{mode}</Badge>
        </div>

        <div className="space-y-3">
          {view?.messageContent ? (
            <div className="whitespace-pre-wrap text-sm text-[#dbdee1]">{view.messageContent}</div>
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

          <div className="flex flex-wrap gap-2">
            {interactionRows.length === 0 ? (
              <div className="text-xs text-[#949ba4]">No interactive components in this screen.</div>
            ) : (
              interactionRows.map((row, index) => (
                <Badge key={`${row.label}-${index}`} variant="outline" className="border-white/10 bg-white/5 text-[#dbdee1]">
                  {row.label}
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
                  <span className="font-medium text-white">{row.label}</span>
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
          {diagnostics.length === 0 ? <p className="text-xs text-muted-foreground">No diagnostics. This screen is publish-safe.</p> : null}
          {diagnostics.map((diag, index) => (
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
