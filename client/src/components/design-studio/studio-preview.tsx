import type { StudioDocument } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface StudioPreviewProps {
  document: StudioDocument;
  viewId: string;
  interactionRows: Array<{ label: string; action: string }>;
  diagnostics: Array<{ level: string; message: string }>;
  mode: "desktop" | "mobile" | "compact";
}

export function StudioPreview({ document, viewId, interactionRows, diagnostics, mode }: StudioPreviewProps) {
  const view = document.views[viewId] || document.views[document.meta.entryViewId];
  const widthClass = mode === "mobile" ? "max-w-[390px]" : mode === "compact" ? "max-w-[560px]" : "max-w-full";

  return (
    <div className={`mx-auto w-full ${widthClass} space-y-4`}>
      <div className="rounded-2xl border border-white/10 bg-[#313338] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
        <div className="space-y-3">
          {view?.messageContent ? (
            <div className="whitespace-pre-wrap text-sm text-[#dbdee1]">{view.messageContent}</div>
          ) : (
            <div className="text-sm text-[#949ba4]">No message content yet.</div>
          )}
          {(view?.embeds || []).map((embed, index) => (
            <div
              key={`${embed.title || "embed"}-${index}`}
              className="rounded-xl border border-white/10 bg-[#2b2d31] p-4"
              style={{ borderLeft: `4px solid ${embed.color || "#5865F2"}` }}
            >
              <div className="space-y-2">
                <p className="text-sm font-semibold text-white">{embed.title || "Untitled embed"}</p>
                <p className="whitespace-pre-wrap text-xs text-[#dbdee1]">{embed.description || "No description"}</p>
              </div>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            {interactionRows.length === 0 ? (
              <div className="text-xs text-[#949ba4]">No interactive components in this view.</div>
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
                  <span className="text-muted-foreground"> -&gt; {row.action}</span>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {diagnostics.length > 0 ? (
        <div className="rounded-2xl border border-white/10 bg-background/40 p-4">
          <h4 className="mb-3 text-sm font-semibold text-white">Diagnostics</h4>
          <div className="space-y-2">
            {diagnostics.map((diag, index) => (
              <div key={`${diag.level}-${index}`} className="rounded-lg border border-white/10 bg-background/50 px-3 py-2 text-xs text-muted-foreground">
                <span className="font-medium uppercase text-white/80">{diag.level}</span>
                <span className="ml-2">{diag.message}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
