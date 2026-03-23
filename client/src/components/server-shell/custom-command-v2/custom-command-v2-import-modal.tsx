import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownToLine,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import type {
  CustomCommandV2ImportNotice,
  CustomCommandV2Issue,
} from "@shared/custom-command-v2";
import {
  isApiIssuesError,
  useImportCommandV2,
  usePreviewCommandImportV2,
  type ArchivistCommandV2,
} from "@/hooks/use-bot";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  buildArchivistCustomCommandChatbotPrompt,
  DEFAULT_ARCHIVIST_AI_PROMPT_CONFIG,
  type ArchivistAiPromptConfig,
} from "./custom-command-v2-ai-prompt";

function IssueCard({ issue }: { issue: CustomCommandV2Issue }) {
  return (
    <div
      className={cn(
        "rounded-[18px] border p-3",
        issue.severity === "error"
          ? "border-rose-500/20 bg-rose-500/[0.08]"
          : "border-amber-500/20 bg-amber-500/[0.08]",
      )}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-white/72" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">{issue.message}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/42">{issue.path}</p>
          {issue.suggestedFix ? <p className="mt-2 text-sm text-white/60">{issue.suggestedFix}</p> : null}
        </div>
      </div>
    </div>
  );
}

function RepairCard({ notice }: { notice: CustomCommandV2ImportNotice }) {
  return (
    <div
      className={cn(
        "rounded-[18px] border p-3",
        notice.severity === "warning"
          ? "border-amber-500/20 bg-amber-500/[0.08]"
          : "border-white/10 bg-white/[0.03]",
      )}
    >
      <p className="text-sm font-semibold text-white">{notice.title}</p>
      <p className="mt-2 text-sm text-white/60">{notice.detail}</p>
    </div>
  );
}

function buildFixGuidance(issues: CustomCommandV2Issue[], notices: CustomCommandV2ImportNotice[]) {
  const lines = [
    "Archivist import fix guidance",
    "",
  ];

  if (notices.length > 0) {
    lines.push("Repairs already applied:");
    notices.forEach((notice) => lines.push(`- ${notice.title}: ${notice.detail}`));
    lines.push("");
  }

  if (issues.length > 0) {
    lines.push("Remaining issues:");
    issues.forEach((issue) => lines.push(`- ${issue.message}${issue.suggestedFix ? ` Fix: ${issue.suggestedFix}` : ""}`));
  } else {
    lines.push("No remaining validation issues were found.");
  }

  return lines.join("\n");
}

export function CustomCommandV2ImportModal({
  serverId,
  open,
  onOpenChange,
  onImported,
}: {
  serverId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: (command: ArchivistCommandV2) => void;
}) {
  const { toast } = useToast();
  const previewMutation = usePreviewCommandImportV2(serverId);
  const importMutation = useImportCommandV2(serverId);
  const [raw, setRaw] = useState("");
  const [mobilePane, setMobilePane] = useState<"paste" | "preview">("paste");
  const [promptCopied, setPromptCopied] = useState(false);
  const [requestIssues, setRequestIssues] = useState<CustomCommandV2Issue[]>([]);
  const [previewedRaw, setPreviewedRaw] = useState("");
  const [promptConfig, setPromptConfig] = useState<ArchivistAiPromptConfig>(DEFAULT_ARCHIVIST_AI_PROMPT_CONFIG);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  useEffect(() => {
    if (!open) {
      setRaw("");
      setMobilePane("paste");
      setPromptCopied(false);
      setRequestIssues([]);
      setPreviewedRaw("");
      setPromptConfig(DEFAULT_ARCHIVIST_AI_PROMPT_CONFIG);
      setShowDiagnostics(false);
      previewMutation.reset();
    }
  }, [open, previewMutation]);

  const preview = previewMutation.data;
  const previewData = preview?.preview;
  const diagnostics = preview?.diagnostics;
  const notices = diagnostics?.notices || [];
  const activeIssues = requestIssues.length ? requestIssues : (preview?.issues || []);
  const trimmedRaw = raw.trim();
  const previewIsCurrent = Boolean(trimmedRaw) && previewedRaw === trimmedRaw;
  const blockingErrors = useMemo(
    () => activeIssues.filter((entry) => entry.severity === "error"),
    [activeIssues],
  );
  const warningCount = activeIssues.filter((entry) => entry.severity === "warning").length;
  const generatedPrompt = useMemo(
    () => buildArchivistCustomCommandChatbotPrompt(promptConfig),
    [promptConfig],
  );
  const importReady = Boolean(previewIsCurrent && preview?.importReady);
  const draftReady = Boolean(previewIsCurrent && preview?.draftReady);

  const handleRawChange = (value: string) => {
    setRaw(value);
    setRequestIssues([]);
    if (previewedRaw && value.trim() !== previewedRaw) {
      setPreviewedRaw("");
      previewMutation.reset();
    }
  };

  const handlePreview = async () => {
    try {
      setRequestIssues([]);
      await previewMutation.mutateAsync({ raw, sourceKind: "paste-json" });
      setPreviewedRaw(trimmedRaw);
      if (window.matchMedia("(max-width: 767px)").matches) {
        setMobilePane("preview");
      }
    } catch (error) {
      setPreviewedRaw("");
      if (isApiIssuesError(error)) {
        setRequestIssues(error.issues);
        if (window.matchMedia("(max-width: 767px)").matches) {
          setMobilePane("preview");
        }
        return;
      }
      toast({
        title: "Preview failed",
        description: error instanceof Error ? error.message : "Archivist could not preview that import.",
        variant: "destructive",
      });
    }
  };

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      setPromptCopied(true);
      toast({
        title: "Archivist prompt copied",
        description: "Paste it into ChatGPT or another chatbot, then bring the returned JSON back here.",
      });
      window.setTimeout(() => setPromptCopied(false), 1800);
    } catch (error) {
      toast({
        title: "Copy failed",
        description: error instanceof Error ? error.message : "Archivist could not copy the chatbot prompt.",
        variant: "destructive",
      });
    }
  };

  const handleImport = async (saveAsDraft: boolean) => {
    try {
      setRequestIssues([]);
      const result = await importMutation.mutateAsync({
        raw,
        sourceKind: "paste-json",
        saveAsDraft,
      });
      toast({
        title: saveAsDraft ? "Draft imported" : "Command imported",
        description: saveAsDraft
          ? "Archivist saved the command as a draft and opened it in the builder."
          : "Archivist validated the command and opened it in the builder.",
      });
      onImported(result.command);
      onOpenChange(false);
    } catch (error) {
      if (isApiIssuesError(error)) {
        setRequestIssues(error.issues);
        if (window.matchMedia("(max-width: 767px)").matches) {
          setMobilePane("preview");
        }
        return;
      }
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Archivist could not import that workflow.",
        variant: "destructive",
      });
    }
  };

  const handleRejectWithFixGuidance = async () => {
    const guidance = buildFixGuidance(activeIssues, notices);
    try {
      await navigator.clipboard.writeText(guidance);
      toast({
        title: "Fix guidance copied",
        description: "Archivist copied the remaining repair guidance so you can fix the payload and try again.",
      });
    } catch {
      toast({
        title: "Import blocked",
        description: "Archivist kept the repair guidance on screen. Fix the payload, then preview again.",
      });
    }
    if (window.matchMedia("(max-width: 767px)").matches) {
      setMobilePane("preview");
    }
  };

  const updatePromptConfig = <K extends keyof ArchivistAiPromptConfig>(key: K, value: ArchivistAiPromptConfig[K]) => {
    setPromptConfig((current) => ({ ...current, [key]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-hidden border-white/10 bg-[#090b0f] p-0 text-white sm:max-w-5xl">
        <DialogHeader className="border-b border-white/8 px-4 py-5 sm:px-6">
          <DialogTitle className="text-xl">Import Archivist Custom Command</DialogTitle>
          <DialogDescription>
            Paste one command object, let Archivist repair the safe parts, preview the workflow, and only then import it.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="json" className="flex h-[82dvh] min-h-0 flex-col md:h-[74vh]">
          <div className="border-b border-white/8 px-4 pt-4 sm:px-6">
            <TabsList className="bg-white/[0.04]">
              <TabsTrigger value="json">Paste JSON</TabsTrigger>
              <TabsTrigger value="template">AI Prompt</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="json" className="min-h-0 flex-1 data-[state=inactive]:hidden">
            <div className="border-b border-white/8 px-6 py-4 md:hidden">
              <div className="grid grid-cols-2 gap-2 rounded-[22px] border border-white/10 bg-[#05070a] p-1">
                <button
                  type="button"
                  onClick={() => setMobilePane("paste")}
                  className={cn(
                    "rounded-[16px] px-3 py-2 text-sm font-medium transition",
                    mobilePane === "paste" ? "bg-white text-[#090b0f]" : "text-white/58 hover:bg-white/[0.06] hover:text-white",
                  )}
                >
                  Paste
                </button>
                <button
                  type="button"
                  onClick={() => setMobilePane("preview")}
                  className={cn(
                    "rounded-[16px] px-3 py-2 text-sm font-medium transition",
                    mobilePane === "preview" ? "bg-white text-[#090b0f]" : "text-white/58 hover:bg-white/[0.06] hover:text-white",
                  )}
                >
                  Preview
                </button>
              </div>
            </div>

            <div className="grid h-full min-h-0 gap-0 md:grid-cols-[minmax(0,1.1fr)_400px]">
              <div
                className={cn(
                  "min-h-0 flex-col border-b border-white/8 md:border-b-0 md:border-r",
                  mobilePane === "paste" ? "flex" : "hidden md:flex",
                )}
              >
                <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6">
                  <div>
                    <p className="text-sm font-semibold text-white">Paste one JSON object</p>
                    <p className="mt-1 text-sm text-white/48">
                      Smart quotes, code fences, hidden characters, and wrapper prose are okay. Archivist will try safe repairs first.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="border-white/10 bg-white/[0.03]"
                    onClick={handlePreview}
                    disabled={!trimmedRaw || previewMutation.isPending}
                  >
                    <Sparkles className="h-4 w-4" />
                    Validate
                  </Button>
                </div>
                <div className="min-h-0 flex-1 px-4 pb-6 sm:px-6">
                  <Textarea
                    value={raw}
                    onChange={(event) => handleRawChange(event.target.value)}
                    placeholder='{\n  "schemaVersion": 1,\n  "kind": "archivist-command",\n  "command": { ... }\n}'
                    className="h-full min-h-[320px] resize-none rounded-[24px] border-white/10 bg-[#05070a] font-mono text-sm text-white"
                  />
                </div>
              </div>

              <div className={cn("min-h-0 flex-col", mobilePane === "preview" ? "flex" : "hidden md:flex")}>
                <div className="border-b border-white/8 px-4 py-4 sm:px-6">
                  <p className="text-sm font-semibold text-white">Validation, repair, and preview</p>
                  <p className="mt-1 text-sm text-white/48">Human guidance first, technical detail second.</p>
                </div>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
                  <div
                    className={cn(
                      "rounded-[22px] border p-4",
                      importReady
                        ? "border-emerald-500/20 bg-emerald-500/[0.08]"
                        : draftReady
                          ? "border-amber-500/20 bg-amber-500/[0.08]"
                          : "border-rose-500/20 bg-rose-500/[0.08]",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {importReady ? "Import ready" : draftReady ? "Draft import ready" : "Import blocked"}
                        </p>
                        <p className="mt-1 text-sm text-white/68">
                          {importReady
                            ? "This payload is structurally safe and can open directly in the builder."
                            : draftReady
                              ? "Archivist can bring this in as a draft, but it still needs fixes before live publish."
                              : "Archivist still needs a cleaner payload before it can import this command."}
                        </p>
                      </div>
                      {importReady ? <CheckCircle2 className="h-5 w-5 shrink-0 text-white/84" /> : <AlertTriangle className="h-5 w-5 shrink-0 text-white/84" />}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/68">
                      <span>{blockingErrors.length} blocking</span>
                      <span>{warningCount} warnings</span>
                      <span>{notices.length} repairs applied</span>
                    </div>
                  </div>

                  {previewData ? (
                    <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-white">{previewData.name}</p>
                        <span className="rounded-full border border-white/10 bg-[#0c0f13] px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-white/62">
                          {previewData.triggerType}
                        </span>
                        <span className="rounded-full border border-white/10 bg-[#0c0f13] px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-white/62">
                          {previewData.actionCount} actions
                        </span>
                        <span className="rounded-full border border-white/10 bg-[#0c0f13] px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-white/62">
                          {previewData.conditionCount} conditions
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-white/58">{previewData.description || "No internal description yet."}</p>
                      <div className="mt-4 space-y-2 text-sm text-white/66">
                        <p>{previewData.whatTriggers}</p>
                        <p>{previewData.workflowSummary}</p>
                        <p>{previewData.whatSends}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-[22px] border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-white/46">
                      Preview details show up here after validation.
                    </div>
                  )}

                  {previewData ? (
                    <div className="rounded-[22px] border border-white/10 bg-[#101216] p-4">
                      <p className="text-sm font-semibold text-white">Discord output preview</p>
                      {previewData.outputPreview.mode === "none" ? (
                        <p className="mt-3 text-sm text-white/58">{previewData.outputPreview.note || "No message output yet."}</p>
                      ) : (
                        <div className="mt-3 rounded-[18px] border border-white/10 bg-[#0a0d11] p-4">
                          {previewData.outputPreview.message ? (
                            <div className="rounded-[16px] bg-[#12161d] px-4 py-3 text-sm text-white/78">
                              {previewData.outputPreview.message}
                            </div>
                          ) : null}
                          {previewData.outputPreview.embedTitle || previewData.outputPreview.embedDescription ? (
                            <div className="mt-3 rounded-[16px] border border-[#c5475c]/25 bg-[#111217] p-4">
                              {previewData.outputPreview.embedTitle ? <p className="text-sm font-semibold text-white">{previewData.outputPreview.embedTitle}</p> : null}
                              {previewData.outputPreview.embedDescription ? <p className="mt-2 text-sm text-white/62">{previewData.outputPreview.embedDescription}</p> : null}
                            </div>
                          ) : null}
                          {previewData.outputPreview.buttonLabels.length ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {previewData.outputPreview.buttonLabels.map((label) => (
                                <span key={label} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/72">
                                  {label}
                                </span>
                              ))}
                            </div>
                          ) : null}
                          {previewData.outputPreview.selectOptions.length ? (
                            <div className="mt-3 rounded-[16px] border border-white/10 bg-white/[0.03] p-3 text-xs text-white/62">
                              Options: {previewData.outputPreview.selectOptions.join(", ")}
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  ) : null}

                  {trimmedRaw && !previewIsCurrent ? (
                    <div className="rounded-[18px] border border-amber-500/20 bg-amber-500/[0.08] p-4 text-sm text-white/76">
                      The pasted payload changed after the last preview. Validate it again before importing.
                    </div>
                  ) : null}

                  {notices.length ? (
                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/42">Repairs Applied</p>
                      {notices.map((notice) => <RepairCard key={notice.code} notice={notice} />)}
                    </div>
                  ) : null}

                  {activeIssues.length ? (
                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/42">Remaining Issues</p>
                      {activeIssues.map((entry, index) => (
                        <IssueCard key={`${entry.path}-${index}`} issue={entry} />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4 text-sm text-white/54">
                      {previewIsCurrent ? "No validation issues remain for the current payload." : "Validate the current payload to see repairs, issues, and a preview summary."}
                    </div>
                  )}

                  <Collapsible open={showDiagnostics} onOpenChange={setShowDiagnostics}>
                    <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4">
                      <CollapsibleTrigger className="flex w-full items-center justify-between text-left">
                        <div>
                          <p className="text-sm font-semibold text-white">Technical diagnostics</p>
                          <p className="mt-1 text-sm text-white/48">Exact parse position, extracted object count, and raw parser detail.</p>
                        </div>
                        <ChevronRight className={cn("h-4 w-4 text-white/54 transition", showDiagnostics && "rotate-90")} />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-4">
                        <div className="space-y-3 text-sm text-white/60">
                          <p>Extracted objects: {diagnostics?.extractedCandidateCount ?? 0}</p>
                          {diagnostics?.parseLocation ? (
                            <>
                              <p>
                                Parse position: line {diagnostics.parseLocation.line}, column {diagnostics.parseLocation.column}
                              </p>
                              {diagnostics.parseLocation.likelyReason ? <p>Likely reason: {diagnostics.parseLocation.likelyReason}</p> : null}
                              {diagnostics.parseLocation.nextSuggestion ? <p>Next suggestion: {diagnostics.parseLocation.nextSuggestion}</p> : null}
                              {diagnostics.parseLocation.snippet ? <p>Context: {diagnostics.parseLocation.snippet}</p> : null}
                              {diagnostics.parseLocation.technicalMessage ? <p>Parser detail: {diagnostics.parseLocation.technicalMessage}</p> : null}
                            </>
                          ) : (
                            <p>No parser failure details for the current payload.</p>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                </div>

                <div className="border-t border-white/8 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pb-4">
                  <div className="grid gap-2">
                    <Button onClick={() => handleImport(false)} disabled={!importReady || importMutation.isPending}>
                      <ArrowDownToLine className="h-4 w-4" />
                      Import and Open in Builder
                    </Button>
                    <Button
                      variant="outline"
                      className="border-white/10 bg-white/[0.03]"
                      onClick={() => handleImport(true)}
                      disabled={!draftReady || importMutation.isPending}
                    >
                      <WandSparkles className="h-4 w-4" />
                      Import as Draft
                    </Button>
                    <Button
                      variant="outline"
                      className="border-white/10 bg-white/[0.03]"
                      onClick={handleRejectWithFixGuidance}
                      disabled={!previewIsCurrent && activeIssues.length === 0 && notices.length === 0}
                    >
                      <AlertTriangle className="h-4 w-4" />
                      Reject With Fix Guidance
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="template" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6 data-[state=inactive]:hidden">
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-sm font-semibold text-white">Command Goal</p>
                  <Input
                    value={promptConfig.commandGoal}
                    onChange={(event) => updatePromptConfig("commandGoal", event.target.value)}
                    placeholder="Example: welcome new members and send a role prompt"
                    className="mt-3 h-12 rounded-[18px] border-white/10 bg-[#05070a]"
                  />
                </div>
                <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-sm font-semibold text-white">Preferred Trigger</p>
                  <Select value={promptConfig.triggerType} onValueChange={(value) => updatePromptConfig("triggerType", value as ArchivistAiPromptConfig["triggerType"])}>
                    <SelectTrigger className="mt-3 h-12 rounded-[18px] border-white/10 bg-[#05070a]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="slash">Slash command</SelectItem>
                      <SelectItem value="keyword">Message / keyword</SelectItem>
                      <SelectItem value="button">Button press</SelectItem>
                      <SelectItem value="select">Select menu</SelectItem>
                      <SelectItem value="modal_submit">Modal submit</SelectItem>
                      <SelectItem value="schedule">Scheduled time</SelectItem>
                      <SelectItem value="join">Member join</SelectItem>
                      <SelectItem value="role_add">Role change</SelectItem>
                      <SelectItem value="reaction">Reaction event</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex items-center justify-between rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/78">
                  Beginner-safe workflow
                  <Switch checked={promptConfig.skillLevel === "beginner"} onCheckedChange={(checked) => updatePromptConfig("skillLevel", checked ? "beginner" : "advanced")} />
                </label>
                <label className="flex items-center justify-between rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/78">
                  Use roles
                  <Switch checked={promptConfig.useRoles} onCheckedChange={(checked) => updatePromptConfig("useRoles", checked)} />
                </label>
                <label className="flex items-center justify-between rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/78">
                  Use embeds
                  <Switch checked={promptConfig.useEmbeds} onCheckedChange={(checked) => updatePromptConfig("useEmbeds", checked)} />
                </label>
                <label className="flex items-center justify-between rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/78">
                  Use buttons
                  <Switch checked={promptConfig.useButtons} onCheckedChange={(checked) => updatePromptConfig("useButtons", checked)} />
                </label>
                <label className="flex items-center justify-between rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/78">
                  Use variables
                  <Switch checked={promptConfig.useVariables} onCheckedChange={(checked) => updatePromptConfig("useVariables", checked)} />
                </label>
                <label className="flex items-center justify-between rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/78">
                  Use Studio references
                  <Switch checked={promptConfig.useStudioReferences} onCheckedChange={(checked) => updatePromptConfig("useStudioReferences", checked)} />
                </label>
              </div>

              <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">Copy this into a chatbot</p>
                    <p className="mt-2 text-sm text-white/54">
                      This prompt is strict on purpose: one object only, no markdown, no wrapper text, no smart quotes, no extra commentary.
                    </p>
                  </div>
                  <Button variant="outline" className="border-white/10 bg-white/[0.03]" onClick={handleCopyPrompt}>
                    {promptCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {promptCopied ? "Copied" : "Copy Prompt"}
                  </Button>
                </div>
                <Textarea
                  readOnly
                  value={generatedPrompt}
                  className="mt-4 min-h-[320px] resize-none rounded-[24px] border-white/10 bg-[#05070a] font-mono text-sm text-white md:min-h-[400px]"
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
