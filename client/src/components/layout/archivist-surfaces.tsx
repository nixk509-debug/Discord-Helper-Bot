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
        // Top edge: left side red fade → center white shimmer → right fade
        "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-[linear-gradient(90deg,rgba(224,0,26,0.35),rgba(255,255,255,0.08)_40%,rgba(255,255,255,0.04)_60%,transparent)]",
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
    <div className={cn("flex flex-col gap-4 border-b border-[var(--border-subtle)] px-4 py-5 md:px-6 md:py-6", className)}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0 space-y-2">
          <p className="archivist-eyebrow">{eyebrow}</p>
          <h1 className="max-w-4xl text-[1.7rem] font-bold tracking-[-0.03em] text-[var(--text-primary)] md:text-[2.35rem]">{title}</h1>
          {description ? (
            <p className="max-w-3xl text-[15px] leading-7 text-[var(--text-muted)] md:text-base">{description}</p>
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
    <div className={cn("flex flex-col gap-3 border-b border-[var(--border-subtle)] px-4 py-4 last:border-b-0 md:flex-row md:items-center md:justify-between md:px-6", className)}>
      <div className="flex min-w-0 items-start gap-3">
        {accent ? <div className="mt-0.5">{accent}</div> : null}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{title}</p>
          {description ? <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">{description}</p> : null}
        </div>
      </div>
      {meta ? <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)] md:justify-end">{meta}</div> : null}
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
      ? "border-[rgba(220,84,103,0.24)] bg-[rgba(220,84,103,0.12)] text-[rgba(255,221,227,0.95)]"
      : tone === "accent"
        ? "border-[var(--border-brand)] bg-[rgba(84,20,33,0.2)] text-[var(--text-primary)]"
        : "border-[var(--border-subtle)] bg-white/[0.03] text-[rgba(232,226,228,0.9)]";

  return <span className={cn("rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em]", toneClasses)}>{children}</span>;
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
      ? "border-[rgba(220,84,103,0.24)] bg-[linear-gradient(180deg,rgba(63,19,28,0.96),rgba(24,11,15,0.98))]"
      : tone === "accent"
        ? "border-[var(--border-strong)] bg-[linear-gradient(180deg,rgba(24,15,18,0.98),rgba(11,10,12,1))]"
        : "border-[var(--border-default)] bg-[linear-gradient(180deg,rgba(18,19,22,0.96),rgba(10,11,13,0.98))]";

  return (
    <div className={cn("rounded-[18px] border px-3 py-3.5", toneClasses)}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-faint)]">{label}</p>
      <p className="mt-2 text-base font-semibold text-[var(--text-primary)] md:text-lg">{value}</p>
    </div>
  );
}
