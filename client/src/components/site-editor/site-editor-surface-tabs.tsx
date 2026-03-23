import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  getSiteEditorSurfaceDescription,
  getSiteEditorSurfaceLabel,
  SITE_EDITOR_SURFACE_ORDER,
  type SiteEditorSurfaceKey,
} from "@/lib/site-editor";

export function SiteEditorSurfaceTabs({
  value,
  onChange,
}: {
  value: SiteEditorSurfaceKey;
  onChange: (surface: SiteEditorSurfaceKey) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {SITE_EDITOR_SURFACE_ORDER.map((surface) => {
        const active = surface === value;
        return (
          <button
            key={surface}
            type="button"
            onClick={() => onChange(surface)}
            className={cn(
              "min-w-[170px] flex-1 rounded-[18px] border px-4 py-3 text-left transition",
              active
                ? "border-white/12 bg-[#171a20] text-white"
                : "border-white/8 bg-[#111318] text-white/68 hover:border-white/12 hover:text-white",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{getSiteEditorSurfaceLabel(surface)}</p>
                <p className="mt-1 text-xs leading-5 text-white/50">{getSiteEditorSurfaceDescription(surface)}</p>
              </div>
              <Badge variant={active ? "default" : "secondary"} className="rounded-full">
                {active ? "Active" : "Edit"}
              </Badge>
            </div>
          </button>
        );
      })}
    </div>
  );
}
