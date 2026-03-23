import { useRoute } from "wouter";
import { CopyPlus, Layers3, LayoutPanelTop, MessageSquareText } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { MetricStrip, SurfaceHeader, SurfacePanel, SurfaceRow } from "@/components/layout/archivist-surfaces";
import { DesignStudioTab } from "@/components/design-studio/design-studio-tab";
import { Skeleton } from "@/components/ui/skeleton";
import { useServer, useStudioDocuments, useStudioPublications } from "@/hooks/use-bot";

export default function StudioPage() {
  const [, params] = useRoute("/dashboard/servers/:id/studio");
  const serverId = Number.parseInt(params?.id || "0", 10);
  const { data: server, isLoading } = useServer(serverId);
  const documentsQuery = useStudioDocuments(serverId, { enabled: !!serverId });
  const publicationsQuery = useStudioPublications(serverId, { enabled: !!serverId });

  if (isLoading || !server) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Skeleton className="h-[180px] rounded-[24px] bg-white/5" />
          <Skeleton className="h-[720px] rounded-[24px] bg-white/5" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <SurfacePanel>
          <SurfaceHeader
            eyebrow="Design Studio"
            title="Build Discord messages in one focused flow."
            description="Studio should stay message-first. The shell here only frames the work, keeps draft counts visible, and gets out of the way once you enter the editor."
            aside={
              <div className="grid gap-2 sm:grid-cols-2">
                <MetricStrip label="Drafts" value={String(documentsQuery.data?.length || 0)} tone="accent" />
                <MetricStrip label="Published" value={String(publicationsQuery.data?.length || 0)} />
              </div>
            }
          />
          <div className="divide-y divide-white/6">
            <SurfaceRow
              title="Embeds and message bodies"
              description="Compose copy, visuals, and structure without losing the live message context."
              accent={<StudioIcon icon={LayoutPanelTop} />}
            />
            <SurfaceRow
              title="Components and interactions"
              description="Buttons, selects, and interactions stay attached to the message they belong to."
              accent={<StudioIcon icon={Layers3} />}
            />
            <SurfaceRow
              title="Drafts and duplication"
              description="Keep reusable designs ready for commands, publish flows, and future templates."
              accent={<StudioIcon icon={CopyPlus} />}
            />
          </div>
        </SurfacePanel>

        <SurfacePanel className="overflow-hidden">
          <div className="border-b border-white/6 px-4 py-4 md:px-6">
            <div className="flex items-center gap-3">
              <StudioIcon icon={MessageSquareText} />
              <div>
                <p className="text-sm font-semibold text-white">Studio workspace</p>
                <p className="mt-1 text-sm text-white/56">Live draft editing for {server.name}</p>
              </div>
            </div>
          </div>
          <div className="px-0 py-0">
            <DesignStudioTab serverId={serverId} />
          </div>
        </SurfacePanel>
      </div>
    </DashboardLayout>
  );
}

function StudioIcon({ icon: Icon }: { icon: typeof LayoutPanelTop }) {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-white/8 bg-[#171a20] text-[#ff6479]">
      <Icon className="h-4 w-4" />
    </div>
  );
}
