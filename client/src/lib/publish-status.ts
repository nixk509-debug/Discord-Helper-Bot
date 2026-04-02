import type { StudioDocumentRecord, StudioPublication } from "@shared/schema";

export type PublishState = "draft" | "needs-publish" | "live" | "failed" | "unknown";
export type PublishTone = "neutral" | "accent" | "danger";

export interface PublishStatusResult {
  state: PublishState;
  label: string;
  tone: PublishTone;
}

export function getPublishStatus(
  doc: StudioDocumentRecord,
  publications: StudioPublication[],
): PublishStatusResult {
  const docPubs = publications.filter((p) => p.documentId === doc.id);
  const hasFailure = docPubs.some((p) => p.status === "failed" || p.status === "degraded");
  const hasLive = docPubs.some((p) => p.status === "published");

  if (hasFailure) {
    return { state: "failed", label: "Failed", tone: "danger" };
  }
  if (hasLive) {
    return { state: "live", label: "Live", tone: "accent" };
  }
  if (docPubs.length === 0) {
    return { state: "draft", label: "Draft", tone: "neutral" };
  }
  return { state: "unknown", label: "Archived", tone: "neutral" };
}
