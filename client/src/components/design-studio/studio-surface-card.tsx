import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link2, Rocket, Sparkles } from "lucide-react";

interface StudioSurfaceCardProps {
  title: string;
  description: string;
  documentId?: number | null;
  publication?: any;
  onCreate: () => void;
  onOpen: () => void;
  onPublish?: () => void;
  actionLabel?: string;
}

export function StudioSurfaceCard({
  title,
  description,
  documentId,
  publication,
  onCreate,
  onOpen,
  onPublish,
  actionLabel = "Create Surface",
}: StudioSurfaceCardProps) {
  const isBound = Boolean(documentId);
  const publicationStatus = publication?.status || (publication?.active ? "published" : "draft");

  return (
    <Card className="glass-card border-white/10 bg-background/40">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 font-display text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Badge variant={isBound ? "default" : "outline"}>{isBound ? "Bound" : "Unbound"}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span>Document: {documentId || "None"}</span>
          <span>-</span>
          <span>Status: {publicationStatus}</span>
          {publication?.lastPublishedAt ? (
            <>
              <span>-</span>
              <span>Last publish: {new Date(publication.lastPublishedAt).toLocaleString()}</span>
            </>
          ) : null}
        </div>
        {publication?.lastFailureSummary ? (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
            {publication.lastFailureSummary}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button variant={isBound ? "outline" : "default"} onClick={isBound ? onOpen : onCreate} className="gap-2">
            <Link2 className="h-4 w-4" />
            {isBound ? "Open in Studio" : actionLabel}
          </Button>
          {isBound && onPublish ? (
            <Button variant="outline" onClick={onPublish} className="gap-2">
              <Rocket className="h-4 w-4" />
              Publish
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
