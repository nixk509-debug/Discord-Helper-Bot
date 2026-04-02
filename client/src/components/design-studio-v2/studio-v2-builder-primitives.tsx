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
  description: string;
  emptyLabel?: string;
  items: StudioCompositionItem[];
}

export interface StudioCompositionOutlineProps {
  title: string;
  description: string;
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
  description: string;
  options: StudioInsertOption[];
}

export interface StudioInsertCatalogProps {
  title: string;
  description: string;
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

  return <Icon className="h-4 w-4" />;
}

function publishToneClasses(publishPath?: string | null) {
  if (publishPath === "blocked") {
    return {
      pill: "border-[rgba(191,63,85,0.26)] bg-[rgba(70,17,28,0.34)] text-[rgba(255,225,231,0.96)]",
      glow: "shadow-[0_0_0_1px_rgba(96,24,36,0.16),0_24px_48px_rgba(0,0,0,0.34)]",
    };
  }
  if (publishPath === "downgraded") {
    return {
      pill: "border-[rgba(166,120,44,0.22)] bg-[rgba(79,53,19,0.28)] text-[rgba(255,236,200,0.94)]",
      glow: "shadow-[0_0_0_1px_rgba(92,60,19,0.12),0_24px_48px_rgba(0,0,0,0.32)]",
    };
  }
  return {
    pill: "border-[rgba(118,49,62,0.18)] bg-[rgba(26,11,14,0.24)] text-[rgba(255,232,236,0.92)]",
    glow: "shadow-[0_0_0_1px_rgba(76,26,35,0.1),0_24px_48px_rgba(0,0,0,0.32)]",
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
    <section
      className={cn(
        "rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(12,13,16,0.98),rgba(7,8,9,1))] p-4 md:p-5",
        tone.glow,
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/44">
              Studio Canvas
            </span>
            <span className={cn("rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em]", tone.pill)}>
              {publishLabel}
            </span>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-white">Build the message as a composition, not a settings page.</p>
            <p className="text-sm leading-6 text-white/54">
              {modeLabel} active. Editing <span className="text-white/86">{selectedLabel}</span>. Publish truth stays live while you work.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:hidden">
            <div className="rounded-full border border-white/8 bg-[#0b0c0f] px-3 py-1.5 text-[11px] font-medium text-white/74">
              Blocked <span className="ml-1 text-white">{errorCount}</span>
            </div>
            <div className="rounded-full border border-white/8 bg-[#0b0c0f] px-3 py-1.5 text-[11px] font-medium text-white/74">
              Review <span className="ml-1 text-white">{warningCount}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:min-w-[290px]">
          <div className="hidden grid-cols-2 gap-2 sm:grid">
            <div className="rounded-[18px] border border-white/8 bg-[#0c0d10] px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/34">Blocked</p>
              <p className="mt-2 text-lg font-semibold text-white">{errorCount}</p>
            </div>
            <div className="rounded-[18px] border border-white/8 bg-[#0c0d10] px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/34">Review</p>
              <p className="mt-2 text-lg font-semibold text-white">{warningCount}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="min-h-10 flex-1 rounded-[18px] border-white/10 bg-white/[0.03] text-white/82" onClick={onOpenIssues}>
              Review Issues
            </Button>
            <Button className="min-h-10 flex-1 rounded-[18px] border border-[rgba(118,42,55,0.18)] bg-[linear-gradient(180deg,rgba(24,14,17,0.98),rgba(12,10,11,1))] text-white shadow-[0_16px_30px_rgba(0,0,0,0.22)] hover:bg-[linear-gradient(180deg,rgba(29,16,19,1),rgba(14,11,12,1))]" onClick={onOpenPublish}>
              Open Publish
            </Button>
          </div>
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
    <section className="rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(10,11,13,0.98),rgba(6,7,8,1))] shadow-[0_24px_56px_rgba(0,0,0,0.32)]">
      <div className="border-b border-white/6 px-4 py-4 md:px-5">
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/34">Composition</p>
            <h2 className="mt-2 text-xl font-semibold text-white">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-white/54">{description}</p>
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      </div>

      <div className="space-y-5 px-4 py-4 md:px-5">
        {groups.map((group) => (
          <div key={group.id} className="space-y-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/30">{group.title}</p>
              <p className="mt-1 text-xs leading-5 text-white/42">{group.description}</p>
            </div>

            {group.items.length > 0 ? (
              <div className="space-y-2">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={item.onSelect}
                    className={cn(
                      "flex w-full items-start justify-between gap-3 rounded-[20px] border px-3 py-3 text-left transition",
                      item.selected
                        ? "border-[rgba(146,43,59,0.28)] bg-[linear-gradient(180deg,rgba(20,13,15,0.98),rgba(10,9,10,1))] shadow-[0_0_0_1px_rgba(103,28,39,0.12),0_16px_30px_rgba(0,0,0,0.24)]"
                        : "border-white/8 bg-[linear-gradient(180deg,rgba(16,17,20,0.96),rgba(10,11,13,1))] hover:border-[rgba(92,40,50,0.18)] hover:bg-[linear-gradient(180deg,rgba(18,15,16,0.98),rgba(11,9,10,1))]",
                    )}
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border",
                          item.selected
                            ? "border-[rgba(148,45,61,0.22)] bg-[rgba(41,14,19,0.64)] text-[#f4a0ad]"
                            : "border-white/8 bg-white/[0.03] text-white/70",
                        )}
                      >
                        <StudioPrimitiveIconGlyph icon={item.icon} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/34">{item.eyebrow}</span>
                          {item.meta ? <Badge variant="outline" className="border-white/10 bg-white/[0.03] text-white/62">{item.meta}</Badge> : null}
                        </div>
                        <p className="mt-2 text-sm font-semibold text-white">{item.title}</p>
                        <p className="mt-1 text-sm leading-6 text-white/46">{item.description}</p>
                      </div>
                    </div>
                    <ArrowUpRight className={cn("mt-1 h-4 w-4 shrink-0", item.selected ? "text-[#f0a0ae]" : "text-white/26")} />
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-[18px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-4 text-sm text-white/42">
                {group.emptyLabel || "Nothing is in this group yet."}
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
    <section className="space-y-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/34">Add flow</p>
        <h3 className="mt-2 text-lg font-semibold text-white">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-white/54">{description}</p>
      </div>

      <div className="space-y-4">
        {groups.map((group) => (
          <div key={group.id} className="space-y-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/30">{group.title}</p>
              <p className="mt-1 text-xs leading-5 text-white/42">{group.description}</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {group.options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={option.onSelect}
                  disabled={option.disabled}
                  className={cn(
                    "flex min-h-[114px] flex-col items-start justify-between rounded-[22px] border px-4 py-4 text-left transition",
                    option.disabled
                      ? "cursor-not-allowed border-white/8 bg-white/[0.02] text-white/24"
                      : "border-white/8 bg-[linear-gradient(180deg,rgba(14,15,18,0.96),rgba(8,9,10,1))] hover:border-[rgba(92,40,50,0.18)] hover:bg-[linear-gradient(180deg,rgba(17,14,15,0.98),rgba(9,8,9,1))]",
                  )}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-white/8 bg-white/[0.03] text-white/72">
                    <StudioPrimitiveIconGlyph icon={option.icon} />
                  </div>
                  <div className="min-w-0">
                    {option.eyebrow ? <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/28">{option.eyebrow}</p> : null}
                    <p className="mt-2 text-sm font-semibold text-white">{option.label}</p>
                    <p className="mt-1 text-sm leading-6 text-white/46">{option.description}</p>
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
