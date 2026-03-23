import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SurfacePanel({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "archivist-panel relative overflow-hidden",
        "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.09),transparent)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function SurfaceHeader({
  eyebrow,
  title,
  description,
  actions,
  aside,
  className,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4 border-b border-white/6 px-4 py-5 md:px-6", className)}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0 space-y-2">
          <p className="archivist-eyebrow">{eyebrow}</p>
          <h1 className="max-w-4xl text-[1.7rem] font-bold tracking-[-0.02em] text-white md:text-[2.25rem]">{title}</h1>
          {description ? (
            <p className="max-w-3xl text-[15px] leading-7 text-white/62 md:text-base">{description}</p>
          ) : null}
        </div>
        {aside ? <div className="min-w-0 xl:max-w-[420px] xl:self-start">{aside}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2.5">{actions}</div> : null}
    </div>
  );
}

export function SurfaceRow({
  title,
  description,
  meta,
  accent,
  children,
  className,
}: {
  title: string;
  description?: string;
  meta?: ReactNode;
  accent?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 border-b border-white/6 px-4 py-4 last:border-b-0 md:flex-row md:items-center md:justify-between md:px-6", className)}>
      <div className="flex min-w-0 items-start gap-3">
        {accent ? <div className="mt-0.5">{accent}</div> : null}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{title}</p>
          {description ? <p className="mt-1 text-sm leading-6 text-white/58">{description}</p> : null}
        </div>
      </div>
      {meta ? <div className="flex flex-wrap items-center gap-2 text-xs text-white/54 md:justify-end">{meta}</div> : null}
      {children}
    </div>
  );
}

export function StatusPill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "danger" | "accent";
}) {
  const toneClasses =
    tone === "danger"
      ? "border-[#6d202c] bg-[#190f12] text-[#ffd1d7]"
      : tone === "accent"
        ? "border-[#6b1d2a] bg-[#181014] text-white"
        : "border-white/8 bg-[#101216] text-white/68";

  return <span className={cn("rounded-full border px-3 py-1.5 text-[11px] font-medium tracking-[0.08em]", toneClasses)}>{children}</span>;
}

export function MetricStrip({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "danger" | "accent";
}) {
  const toneClasses =
    tone === "danger"
      ? "border-[#6d202c] bg-[#160f12]"
      : tone === "accent"
        ? "border-[#6b1d2a] bg-[#140d10]"
        : "border-white/8 bg-[#101216]";

  return (
    <div className={cn("rounded-[18px] border px-3 py-3.5", toneClasses)}>
      <p className="text-[11px] font-medium tracking-[0.08em] text-white/48">{label}</p>
      <p className="mt-2 text-base font-semibold text-white md:text-lg">{value}</p>
    </div>
  );
}
