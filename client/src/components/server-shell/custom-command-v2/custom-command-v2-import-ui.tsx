import { AlertTriangle, CheckCircle2, Info, Wrench, XCircle } from "lucide-react";
import type {
  CustomCommandV2ImportDiagnostics,
  CustomCommandV2ImportNotice,
  CustomCommandV2Issue,
  CustomCommandV2Preview,
} from "@shared/custom-command-v2";
import { cn } from "@/lib/utils";

export function ImportStepChip({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-full border px-3 py-2 text-xs font-medium uppercase tracking-[0.14em]",
        active ? "border-[#9f3144] bg-[#211217] text-white" : "border-white/10 bg-[#111318] text-white/54",
      )}
    >
      {children}
    </div>
  );
}

export function ImportIssueCard({ issue }: { issue: CustomCommandV2Issue }) {
  return (
    <div
      className={cn(
        "rounded-[18px] border p-4",
        issue.severity === "error" ? "border-rose-500/20 bg-rose-500/[0.08]" : "border-amber-500/20 bg-amber-500/[0.08]",
      )}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-white/82" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">{issue.message}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-white/40">{issue.path}</p>
          {issue.suggestedFix ? <p className="mt-2 text-sm text-white/60">{issue.suggestedFix}</p> : null}
        </div>
      </div>
    </div>
  );
}

export function ImportNoticeCard({ notice }: { notice: CustomCommandV2ImportNotice }) {
  return (
    <div
      className={cn(
        "rounded-[18px] border p-4",
        notice.severity === "warning" ? "border-amber-500/20 bg-amber-500/[0.08]" : "border-white/10 bg-white/[0.03]",
      )}
    >
      <div className="flex items-start gap-3">
        <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-white/72" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">{notice.title}</p>
          <p className="mt-2 text-sm text-white/60">{notice.detail}</p>
        </div>
      </div>
    </div>
  );
}

export function ImportReadinessCard({
  previewCurrent,
  importReady,
  draftReady,
  warningCount,
  repairCount,
}: {
  previewCurrent: boolean;
  importReady: boolean;
  draftReady: boolean;
  warningCount: number;
  repairCount: number;
}) {
  const tone = !previewCurrent
    ? "border-amber-500/20 bg-amber-500/[0.08]"
    : importReady
      ? "border-emerald-500/20 bg-emerald-500/[0.08]"
      : draftReady
        ? "border-amber-500/20 bg-amber-500/[0.08]"
        : "border-rose-500/20 bg-rose-500/[0.08]";

  const icon = !previewCurrent
    ? <Info className="mt-0.5 h-4 w-4 shrink-0 text-white/72" />
    : importReady
      ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-white/82" />
      : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-white/82" />;

  const title = !previewCurrent
    ? "Preview the current payload"
    : importReady
      ? "Import ready"
      : draftReady
        ? "Draft import is possible"
        : "Import blocked";

  const description = !previewCurrent
    ? "The paste changed after the last validation. Run preview again before importing."
    : importReady
      ? "Archivist can import this command now. Review the summary, then send it into the builder."
      : draftReady
        ? "This payload still has live-mode blockers, but it can be opened as a draft for repair."
        : "Archivist rejected this payload for now. Fix the highlighted issues before trying the import again.";

  return (
    <div className={cn("rounded-[18px] border p-4", tone)}>
      <div className="flex items-start gap-3">
        {icon}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="mt-2 text-sm text-white/68">{description}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/58">
            <span>{warningCount} warning{warningCount === 1 ? "" : "s"}</span>
            <span>{repairCount} repair{repairCount === 1 ? "" : "s"} applied</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ImportPreviewSummary({
  preview,
  importReady,
  repairCount,
  warningCount,
}: {
  preview: CustomCommandV2Preview;
  importReady: boolean;
  repairCount: number;
  warningCount: number;
}) {
  return (
    <div className="rounded-[20px] border border-white/8 bg-[#101216] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-base font-semibold text-white">{preview.name}</p>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/64">
          {preview.triggerType}
        </span>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/64">
          {preview.actionCount} action{preview.actionCount === 1 ? "" : "s"}
        </span>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/64">
          {preview.conditionCount} condition{preview.conditionCount === 1 ? "" : "s"}
        </span>
        <span
          className={cn(
            "rounded-full border px-2.5 py-1 text-[11px]",
            importReady ? "border-emerald-500/30 bg-emerald-500/[0.12] text-white/82" : "border-rose-500/20 bg-rose-500/[0.08] text-white/78",
          )}
        >
          {importReady ? "Import ready" : "Blocked"}
        </span>
      </div>
      <p className="mt-2 text-sm text-white/56">{preview.description || "No internal description yet."}</p>
      <div className="mt-4 grid gap-2 text-sm text-white/64 sm:grid-cols-2">
        <p>{preview.whatTriggers}</p>
        <p>{preview.whatSends}</p>
        <p>{preview.workflowSummary}</p>
        <p>{preview.interactionsSummary}</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/58">
        <span>{warningCount} warning{warningCount === 1 ? "" : "s"}</span>
        <span>{repairCount} repair{repairCount === 1 ? "" : "s"} applied</span>
        <span>{preview.enabled ? "Enabled" : "Draft default"}</span>
      </div>
    </div>
  );
}

export function ImportOutputPreview({ preview }: { preview: CustomCommandV2Preview }) {
  const output = preview.outputPreview;

  return (
    <div className="rounded-[24px] border border-white/8 bg-[#0b0d11] p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-[#a91d31] text-sm font-semibold text-white">
          A
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-white">Archivist</p>
            <span className="rounded-full bg-[#5865F2] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
              Bot
            </span>
          </div>
          {output.message ? (
            <div className="rounded-[18px] border border-white/8 bg-white/[0.03] p-3 text-sm leading-6 text-white/84">
              {output.message}
            </div>
          ) : null}
          {output.embedTitle || output.embedDescription ? (
            <div className="overflow-hidden rounded-[18px] border border-white/8 bg-[#111318] p-4">
              <p className="text-sm font-semibold text-white">{output.embedTitle || "Embed"}</p>
              <p className="mt-2 text-sm leading-6 text-white/72">{output.embedDescription || "No embed description yet."}</p>
            </div>
          ) : null}
          {output.buttonLabels.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {output.buttonLabels.map((label, index) => (
                <span
                  key={`${label}-${index}`}
                  className="rounded-[14px] border border-white/10 bg-[#1d2027] px-3 py-2 text-xs font-medium text-white/80"
                >
                  {label}
                </span>
              ))}
            </div>
          ) : null}
          {output.selectOptions.length > 0 ? (
            <div className="rounded-[16px] border border-white/10 bg-[#111318] p-3 text-sm text-white/68">
              <p className="text-xs uppercase tracking-[0.16em] text-white/42">Select menu</p>
              <p className="mt-2">{output.selectOptions.join(", ")}</p>
            </div>
          ) : null}
          {!output.message && !output.embedTitle && !output.embedDescription && output.buttonLabels.length === 0 && output.selectOptions.length === 0 ? (
            <div className="rounded-[18px] border border-dashed border-white/10 bg-white/[0.02] p-3 text-sm text-white/50">
              {output.note || "No message-producing action is configured yet."}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ImportDebugDetails({ diagnostics }: { diagnostics: CustomCommandV2ImportDiagnostics | null | undefined }) {
  if (!diagnostics) return null;

  const hasDebug = Boolean(diagnostics.parseLocation || diagnostics.extractedText || diagnostics.normalizedText);
  if (!hasDebug) return null;

  return (
    <details className="rounded-[18px] border border-white/10 bg-[#0a0c0f] p-4 text-sm text-white/64">
      <summary className="cursor-pointer list-none font-semibold text-white">Raw diagnostics</summary>
      <div className="mt-4 space-y-4">
        {diagnostics.parseLocation ? (
          <div className="rounded-[16px] border border-white/10 bg-white/[0.03] p-3">
            <p className="text-sm font-semibold text-white">
              Parse location: line {diagnostics.parseLocation.line}, column {diagnostics.parseLocation.column}
            </p>
            {diagnostics.parseLocation.likelyReason ? (
              <p className="mt-2 text-sm text-white/64">{diagnostics.parseLocation.likelyReason}</p>
            ) : null}
            {diagnostics.parseLocation.nextSuggestion ? (
              <p className="mt-2 text-sm text-white/56">{diagnostics.parseLocation.nextSuggestion}</p>
            ) : null}
            {diagnostics.parseLocation.snippet ? (
              <pre className="mt-3 overflow-x-auto rounded-[12px] border border-white/10 bg-[#05070a] p-3 text-xs text-white/72">
                {diagnostics.parseLocation.snippet}
              </pre>
            ) : null}
            {diagnostics.parseLocation.technicalMessage ? (
              <p className="mt-3 text-xs text-white/42">{diagnostics.parseLocation.technicalMessage}</p>
            ) : null}
          </div>
        ) : null}

        {diagnostics.extractedText ? (
          <div className="rounded-[16px] border border-white/10 bg-white/[0.03] p-3">
            <p className="text-xs uppercase tracking-[0.16em] text-white/42">Extracted JSON</p>
            <pre className="mt-3 max-h-52 overflow-auto rounded-[12px] border border-white/10 bg-[#05070a] p-3 text-xs text-white/72">
              {diagnostics.extractedText}
            </pre>
          </div>
        ) : null}

        <div className="rounded-[16px] border border-white/10 bg-white/[0.03] p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-white/42">Normalized input</p>
          <pre className="mt-3 max-h-52 overflow-auto rounded-[12px] border border-white/10 bg-[#05070a] p-3 text-xs text-white/72">
            {diagnostics.normalizedText || "(empty)"}
          </pre>
        </div>
      </div>
    </details>
  );
}
