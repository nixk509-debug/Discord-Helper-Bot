import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  FileText,
  Hash,
  ImageIcon,
  Layers3,
  MessageSquareText,
  Minus,
  Paperclip,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StudioPrimitiveIcon =
  | "message"
  | "embed"
  | "layout"
  | "text"
  | "divider"
  | "notice"
  | "button"
  | "menu"
  | "role"
  | "channel"
  | "mention"
  | "asset"
  | "file";

export interface StudioBuilderStatusStripProps {
  modeLabel: string;
  selectedLabel: string;
  publishLabel: string;
  publishPath?: "v2" | "legacy" | "downgraded" | "blocked" | string | null;
  errorCount: number;
  warningCount: number;
  onOpenIssues: () => void;
  onOpenPublish: () => void;
}

export interface StudioCompositionItem {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  meta?: string;
  icon: StudioPrimitiveIcon;
  selected?: boolean;
  onSelect: () => void;
}

export interface StudioCompositionGroup {
  id: string;
  title: string;
  description?: string;
  emptyLabel?: string;
  items: StudioCompositionItem[];
}

export interface StudioCompositionOutlineProps {
  title: string;
  description?: string;
  groups: StudioCompositionGroup[];
  actions?: ReactNode;
}

export interface StudioInsertOption {
  id: string;
  label: string;
  description: string;
  eyebrow?: string;
  icon: StudioPrimitiveIcon;
  onSelect: () => void;
  disabled?: boolean;
}

export interface StudioInsertGroup {
  id: string;
  title: string;
  description?: string;
  options: StudioInsertOption[];
}

export interface StudioInsertCatalogProps {
  title: string;
  description?: string;
  groups: StudioInsertGroup[];
}

function StudioPrimitiveIconGlyph({ icon }: { icon: StudioPrimitiveIcon }) {
  const Icon =
    icon === "embed"
      ? Sparkles
      : icon === "layout"
        ? Layers3
        : icon === "text"
          ? MessageSquareText
          : icon === "divider"
            ? Minus
            : icon === "notice"
              ? AlertTriangle
              : icon === "menu"
                ? Layers3
                : icon === "role"
                  ? Users
                  : icon === "channel"
                    ? Hash
                    : icon === "mention"
                      ? Users
                      : icon === "asset"
                        ? ImageIcon
                        : icon === "file"
                          ? Paperclip
                          : FileText;

  return <Icon className="h-3.5 w-3.5" />;
}

function publishToneClasses(publishPath?: string | null) {
  if (publishPath === "blocked") {
    return {
      pill: "border-[rgba(191,63,85,0.26)] bg-[rgba(70,17,28,0.34)] text-[rgba(255,225,231,0.96)]",
      bar: "bg-[rgba(191,63,85,0.4)]",
    };
  }
  if (publishPath === "downgraded") {
    return {
      pill: "border-[rgba(171,74,91,0.2)] bg-[rgba(48,18,24,0.28)] text-[rgba(255,227,232,0.92)]",
      bar: "bg-[rgba(171,74,91,0.35)]",
    };
  }
  return {
    pill: "border-[rgba(118,49,62,0.18)] bg-[rgba(26,11,14,0.24)] text-[rgba(255,232,236,0.92)]",
    bar: "bg-[rgba(224,0,26,0.35)]",
  };
}

export function StudioBuilderStatusStrip({
  modeLabel,
  selectedLabel,
  publishLabel,
  publishPath,
  errorCount,
  warningCount,
  onOpenIssues,
  onOpenPublish,
}: StudioBuilderStatusStripProps) {
  const tone = publishToneClasses(publishPath);

  return (
    <section className="overflow-hidden rounded-[18px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(10,10,16,0.99),rgba(5,5,9,1))] shadow-[0_12px_30px_rgba(0,0,0,0.32)]">
      {/* thin accent bar at top */}
      <div className={cn("h-[1.5px] w-full", tone.bar)} />
      <div className="flex items-center justify-between gap-4 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="hidden rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35 sm:inline">
            {modeLabel}
          </span>
          <span className={cn("rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em]", tone.pill)}>
            {publishLabel}
          </span>
          <span className="hidden text-[11px] text-white/35 sm:block truncate max-w-[200px]">
            {selectedLabel}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {(errorCount > 0 || warningCount > 0) ? (
            <button
              type="button"
              onClick={onOpenIssues}
              className="flex items-center gap-1.5 rounded-full border border-[rgba(224,0,26,0.22)] bg-[rgba(224,0,26,0.07)] px-2.5 py-1 text-[11px] font-medium text-[rgba(255,100,110,0.75)] transition hover:bg-[rgba(224,0,26,0.12)]"
            >
              <AlertTriangle className="h-3 w-3" />
              {errorCount > 0 ? `${errorCount} error${errorCount === 1 ? "" : "s"}` : `${warningCount} warning${warningCount === 1 ? "" : "s"}`}
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenIssues}
              className="hidden items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.02] px-2.5 py-1 text-[11px] font-medium text-white/30 transition hover:bg-white/[0.05] sm:flex"
            >
              Issues
            </button>
          )}
          <Button
            className="h-7 rounded-full border border-[rgba(224,0,26,0.2)] bg-[linear-gradient(180deg,rgba(22,12,15,0.98),rgba(11,8,10,1))] px-3 text-[11px] font-semibold text-white/90 shadow-[0_0_12px_rgba(224,0,26,0.1)]"
            onClick={onOpenPublish}
          >
            Publish
          </Button>
        </div>
      </div>
    </section>
  );
}

export function StudioCompositionOutline({
  title,
  description,
  groups,
  actions,
}: StudioCompositionOutlineProps) {
  return (
    <section className="overflow-hidden rounded-[18px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(10,10,16,0.99),rgba(5,5,9,1))] shadow-[0_16px_40px_rgba(0,0,0,0.36)]">
      {/* header */}
      <div className="flex items-start justify-between gap-3 border-b border-white/[0.05] px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="h-3 w-[2px] rounded-full" style={{ background: "linear-gradient(180deg,#E0001A,rgba(224,0,26,0.3))", boxShadow: "0 0 5px rgba(224,0,26,0.4)" }} />
            <h2 className="text-[12px] font-semibold text-white/80">{title}</h2>
          </div>
          {description ? <p className="mt-1.5 max-w-[28rem] text-[11px] leading-5 text-white/36">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-1.5">{actions}</div> : null}
      </div>

      <div className="space-y-3 px-3 py-3">
        {groups.map((group) => (
          <div key={group.id}>
            <p className="mb-1 px-1 text-[9px] font-bold uppercase tracking-[0.28em] text-white/25">{group.title}</p>
            {group.description ? <p className="mb-2 px-1 text-[11px] leading-5 text-white/30">{group.description}</p> : null}

            {group.items.length > 0 ? (
              <div className="space-y-1.5">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={item.onSelect}
                    className={cn(
                      "group relative flex w-full items-center gap-3 rounded-[14px] border px-3 py-3 text-left transition",
                      item.selected
                        ? "border-[rgba(146,43,59,0.22)] bg-[linear-gradient(180deg,rgba(20,12,15,0.98),rgba(10,9,10,1))] shadow-[0_0_0_1px_rgba(103,28,39,0.1)]"
                        : "border-transparent bg-white/[0.025] hover:border-white/[0.06] hover:bg-white/[0.04]",
                    )}
                  >
                    <div className={cn("absolute inset-y-3 left-0 w-[2px] rounded-full transition", item.selected ? "bg-[rgba(224,0,26,0.8)] shadow-[0_0_10px_rgba(224,0,26,0.35)]" : "bg-transparent group-hover:bg-white/[0.08]")} />
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border",
                        item.selected
                          ? "border-[rgba(148,45,61,0.2)] bg-[rgba(35,12,18,0.7)] text-[#f4a0ad]"
                          : "border-white/[0.07] bg-white/[0.03] text-white/50",
                      )}
                    >
                      <div className="scale-110">
                        <StudioPrimitiveIconGlyph icon={item.icon} />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className={cn("truncate text-[12px] font-semibold", item.selected ? "text-white" : "text-white/75")}>{item.title}</p>
                        {item.meta ? (
                          <span className="shrink-0 rounded-full border border-white/[0.08] px-1.5 py-0.5 text-[9px] text-white/35">{item.meta}</span>
                        ) : null}
                      </div>
                      <p className="text-[10px] text-white/28">{item.eyebrow}</p>
                      <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-white/36">{item.description}</p>
                    </div>
                    {item.selected ? <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-[#f0a0ae]" /> : null}
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-[10px] border border-dashed border-white/[0.07] px-3 py-2.5 text-[11px] text-white/25">
                {group.emptyLabel || "Nothing here yet."}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export function StudioInsertCatalog({
  title,
  description,
  groups,
}: StudioInsertCatalogProps) {
  return (
    <section className="space-y-3">
      <div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-[2px] rounded-full" style={{ background: "linear-gradient(180deg,#E0001A,rgba(224,0,26,0.3))", boxShadow: "0 0 5px rgba(224,0,26,0.4)" }} />
          <h3 className="text-[12px] font-semibold text-white/80">{title}</h3>
        </div>
        {description ? <p className="mt-1 text-[11px] leading-5 text-white/34">{description}</p> : null}
      </div>

      <div className="space-y-3">
        {groups.map((group) => (
          <div key={group.id}>
            <p className="mb-1 px-0.5 text-[9px] font-bold uppercase tracking-[0.28em] text-white/25">{group.title}</p>
            {group.description ? <p className="mb-2 px-0.5 text-[11px] leading-5 text-white/30">{group.description}</p> : null}
            <div className="grid gap-2 md:grid-cols-2">
              {group.options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={option.onSelect}
                  disabled={option.disabled}
                  className={cn(
                    "group flex min-h-[84px] items-start gap-3 rounded-[16px] border px-3.5 py-3 text-left transition",
                    option.disabled
                      ? "cursor-not-allowed border-white/[0.05] bg-white/[0.015] opacity-40"
                      : "border-white/[0.06] bg-[rgba(13,14,17,0.7)] hover:border-[rgba(160,30,50,0.22)] hover:bg-[rgba(17,11,13,0.9)] hover:shadow-[0_0_16px_rgba(224,0,26,0.06)]",
                  )}
                >
                  <div className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border transition",
                    option.disabled
                      ? "border-white/[0.06] bg-white/[0.02] text-white/20"
                      : "border-white/[0.07] bg-white/[0.03] text-white/60 group-hover:border-[rgba(160,30,50,0.18)] group-hover:bg-[rgba(35,10,15,0.6)] group-hover:text-[#f4848e]",
                  )}>
                    <div className="scale-110">
                      <StudioPrimitiveIconGlyph icon={option.icon} />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    {option.eyebrow ? (
                      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/25">{option.eyebrow}</p>
                    ) : null}
                    <p className="text-[12px] font-semibold text-white/85">{option.label}</p>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-white/34">{option.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
