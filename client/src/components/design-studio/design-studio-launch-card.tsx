import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  useCreateStudioDocument,
  useStudioDocuments,
  useStudioPublications,
} from "@/hooks/use-bot";
import { DesignStudioHome } from "@/components/design-studio/design-studio-home";
import {
  STUDIO_COMMUNITY_STARTERS,
  createStudioPrimaryDocument,
} from "@/components/design-studio/studio-defaults";
import type { StudioDocumentRecord } from "@shared/schema";

export function DesignStudioLaunchCard({ serverId }: { serverId: number }) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const studioDocumentsQuery = useStudioDocuments(serverId);
  const studioPublicationsQuery = useStudioPublications(serverId);
  const createDocumentMutation = useCreateStudioDocument(serverId);

  const documents = (studioDocumentsQuery.data || []) as StudioDocumentRecord[];
  const publications = (studioPublicationsQuery.data || []) as any[];

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

  const importCommunityStarter = (starterId: string) => {
    const starter = STUDIO_COMMUNITY_STARTERS.find((entry) => entry.id === starterId);
    if (!starter) {
      toast({ title: "Starter missing", description: "That community starter is no longer available.", variant: "destructive" });
      return;
    }

    const document = starter.createDocument();
    createDocumentMutation.mutate(
      {
        scope: "server",
        kind: "surface",
        name: document.meta.name,
        document,
      },
      {
        onSuccess: (created: StudioDocumentRecord) => openStudioDocument(created.id),
        onError: (error: any) => toast({ title: "Import failed", description: error.message, variant: "destructive" }),
      },
    );
  };

  return (
    <DesignStudioHome
      documents={documents}
      publications={publications}
      isLoading={studioDocumentsQuery.isLoading}
      isWorking={createDocumentMutation.isPending}
      onOpenDocument={(documentId) => openStudioDocument(documentId)}
      onCreateNewDesign={createPrimaryDraft}
      onImportCommunityStarter={importCommunityStarter}
      embedded
    />
  );
}

