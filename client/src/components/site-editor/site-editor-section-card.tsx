import { ChevronDown, ChevronUp, Edit3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { SiteEditorSectionDefinition } from "@/lib/site-editor";

export function SiteEditorSectionCard({
  section,
  isFirst,
  isLast,
  onEdit,
  onMove,
  onToggleVisible,
}: {
  section: SiteEditorSectionDefinition;
  isFirst: boolean;
  isLast: boolean;
  onEdit: () => void;
  onMove: (direction: "up" | "down") => void;
  onToggleVisible: () => void;
}) {
  return (
    <div
      className={cn(
        "rounded-[22px] border p-4 transition",
        section.visible ? "border-white/10 bg-[#111318]" : "border-white/8 bg-[#101216] opacity-80",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-white">{section.label}</p>
            <Badge variant={section.visible ? "default" : "secondary"} className="rounded-full">
              {section.visible ? "Visible" : "Hidden"}
            </Badge>
          </div>
          <p className="mt-2 text-sm leading-6 text-white/56">
            {section.description || "Edit the copy and visibility for this section."}
          </p>
        </div>
        <Switch checked={section.visible} onCheckedChange={onToggleVisible} aria-label={`Toggle ${section.label} visibility`} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" className="rounded-[14px] border-white/10 bg-white/[0.03]" onClick={onEdit}>
          <Edit3 className="h-4 w-4" />
          Edit section
        </Button>
        <Button size="sm" variant="ghost" className="rounded-[14px]" disabled={isFirst} onClick={() => onMove("up")}>
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" className="rounded-[14px]" disabled={isLast} onClick={() => onMove("down")}>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <MiniStat label="Type" value={section.type} />
        <MiniStat label="Fields" value={String(section.fields.length)} />
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] border border-white/8 bg-[#171a20] px-3 py-2">
      <p className="text-[11px] font-medium tracking-[0.08em] text-white/48">{label}</p>
      <p className="mt-1 text-sm font-medium text-white">{value}</p>
    </div>
  );
}
