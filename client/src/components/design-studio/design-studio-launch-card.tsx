import { useMemo } from "react";
import { useLocation } from "wouter";
import { AlertTriangle, ArrowUpRight, FileClock, FilePlus2, Rocket, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useCreateStudioDocument,
  useStudioDocuments,
  useStudioPublications,
} from "@/hooks/use-bot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createStudioPrimaryDocument } from "@/components/design-studio/studio-defaults";
import type { StudioDocumentRecord } from "@shared/schema";

function parseDate(value: unknown) {
  const parsed = value instanceof Date ? value : new Date(value as string | number);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatRelativeEditTime(value: unknown) {
  const parsed = parseDate(value);
  if (!parsed) return "Updated recently";

  const diffMs = parsed.getTime() - Date.now();
  const absMinutes = Math.round(Math.abs(diffMs) / 60000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (absMinutes < 60) return formatter.format(Math.round(diffMs / 60000), "minute");

  const absHours = Math.round(absMinutes / 60);
  if (absHours < 24) return formatter.format(Math.round(diffMs / 3600000), "hour");

  const absDays = Math.round(absHours / 24);
  if (absDays < 7) return formatter.format(Math.round(diffMs / 86400000), "day");

  return parsed.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function DesignStudioLaunchCard({ serverId }: { serverId: number }) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const studioDocumentsQuery = useStudioDocuments(serverId);
  const studioPublicationsQuery = useStudioPublications(serverId);
  const createDocumentMutation = useCreateStudioDocument(serverId);

  const documents = (studioDocumentsQuery.data || []) as StudioDocumentRecord[];
  const publications = (studioPublicationsQuery.data || []) as any[];

  const drafts = useMemo(
    () =>
      [...documents]
        .filter((record) => record.kind !== "template" && !record.isArchived)
        .sort((a, b) => (parseDate(b.updatedAt)?.getTime() || 0) - (parseDate(a.updatedAt)?.getTime() || 0)),
    [documents],
  );
  const publishedDocumentIds = useMemo(() => new Set(publications.filter((entry) => entry?.active !== false).map((entry) => entry.documentId)), [publications]);
  const draftsNeedingAttention = useMemo(() => drafts.filter((record) => !publishedDocumentIds.has(record.id)).slice(0, 4), [drafts, publishedDocumentIds]);
  const recentPublishFailures = useMemo(
    () =>
      [...publications]
        .filter((entry) => entry?.lastFailureSummary)
        .sort((a, b) => (parseDate(b.lastFailureAt || b.updatedAt)?.getTime() || 0) - (parseDate(a.lastFailureAt || a.updatedAt)?.getTime() || 0))
        .slice(0, 3),
    [publications],
  );
  const latestDraft = drafts[0];

  const openStudioDocument = (documentId?: number) => {
    const target = new URL(`/dashboard/servers/${serverId}/studio`, window.location.origin);
    if (documentId) target.searchParams.set("documentId", String(documentId));
    navigate(`${target.pathname}${target.search}`);
  };

  const createPrimaryDraft = () => {
    const document = createStudioPrimaryDocument("message");
    createDocumentMutation.mutate(
      {
        scope: "server",
        kind: "surface",
        name: document.meta.name,
        document,
      },
      {
        onSuccess: (created: StudioDocumentRecord) => openStudioDocument(created.id),
        onError: (error: any) => toast({ title: "Create failed", description: error.message, variant: "destructive" }),
      },
    );
  };

  return (
    <div className="space-y-4">
      <Card className="archivist-panel overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="gap-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  Design Studio
                </Badge>
                <Badge variant="outline">Simple flow</Badge>
              </div>
              <CardTitle className="mt-3 text-[1.6rem] text-white">Build the message, fix issues, then publish</CardTitle>
              <CardDescription className="mt-2 max-w-2xl text-sm text-white/70">
                Open one draft, work directly on the live message, and trust the same validation that publish uses.
              </CardDescription>
            </div>
            <Badge variant={draftsNeedingAttention.length > 0 ? "secondary" : "outline"}>
              {draftsNeedingAttention.length > 0 ? `${draftsNeedingAttention.length} need review` : "No blocked drafts"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4">
              <p className="text-[10px] uppercase tracking-[0.25em] text-white/45">Resume</p>
              <p className="mt-2 text-sm font-semibold text-white">{latestDraft ? latestDraft.name : "No draft yet"}</p>
              <p className="mt-1 text-xs text-muted-foreground">{latestDraft ? `Edited ${formatRelativeEditTime(latestDraft.updatedAt)}` : "Start fresh with one new draft."}</p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4">
              <p className="text-[10px] uppercase tracking-[0.25em] text-white/45">Attention</p>
              <p className="mt-2 text-sm font-semibold text-white">{draftsNeedingAttention.length} draft{draftsNeedingAttention.length === 1 ? "" : "s"}</p>
              <p className="mt-1 text-xs text-muted-foreground">Unpublished drafts stay visible until they clear the real preflight checks.</p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4">
              <p className="text-[10px] uppercase tracking-[0.25em] text-white/45">Failures</p>
              <p className="mt-2 text-sm font-semibold text-white">{recentPublishFailures.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">{recentPublishFailures.length > 0 ? "Recent publish failures need cleanup." : "No recent publish failures."}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button className="min-h-11 rounded-[18px] px-4" onClick={createPrimaryDraft} disabled={createDocumentMutation.isPending}>
              <FilePlus2 className="h-4 w-4" />
              New Draft
            </Button>
            <Button variant="outline" className="min-h-11 rounded-[18px] px-4 text-white/[0.86]" onClick={() => openStudioDocument(latestDraft?.id)}>
              <FileClock className="h-4 w-4" />
              {latestDraft ? "Resume Last Draft" : "Open Studio"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="archivist-panel archivist-panel-muted">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl text-white">Drafts Needing Attention</CardTitle>
            <CardDescription>These are the drafts that still need review before they should go live.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {studioDocumentsQuery.isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div key={`draft-skeleton-${index}`} className="rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-4" />
              ))
            ) : draftsNeedingAttention.length > 0 ? (
              draftsNeedingAttention.map((record) => (
                <button
                  key={record.id}
                  type="button"
                  onClick={() => openStudioDocument(record.id)}
                  className="flex w-full items-center justify-between gap-3 rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-4 text-left transition hover:border-primary/35 hover:bg-white/[0.05]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{record.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Edited {formatRelativeEditTime(record.updatedAt)}</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-white/45" />
                </button>
              ))
            ) : (
              <div className="rounded-[18px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-5 text-sm text-muted-foreground">
                Nothing is waiting on publish review right now.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="archivist-panel archivist-panel-muted">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl text-white">Recent Publish Failures</CardTitle>
            <CardDescription>If a publish breaks, reopen the affected draft from here instead of hunting through the dashboard.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentPublishFailures.length > 0 ? (
              recentPublishFailures.map((publication) => (
                <button
                  key={`failure-${publication.id}`}
                  type="button"
                  onClick={() => openStudioDocument(publication.documentId)}
                  className="flex w-full items-start justify-between gap-3 rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-4 text-left transition hover:border-primary/35 hover:bg-white/[0.05]"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-300" />
                      <p className="truncate text-sm font-semibold text-white">{publication.lastFailureSummary}</p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Publication #{publication.id} · {publication.channelId || "Unknown channel"} · {formatRelativeEditTime(publication.lastFailureAt || publication.updatedAt)}
                    </p>
                  </div>
                  <Rocket className="mt-1 h-4 w-4 shrink-0 text-white/45" />
                </button>
              ))
            ) : (
              <div className="rounded-[18px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-5 text-sm text-muted-foreground">
                No recent publish failures.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
