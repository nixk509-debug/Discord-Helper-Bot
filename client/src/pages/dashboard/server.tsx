import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { CustomCommandWorkspace } from "@/components/server-shell/custom-command-workspace";
import {
  useCommandLogs,
  useDiscordContext,
  useServer,
  useServerCommands,
  useStudioDocuments,
  useWorkspaceOverview,
} from "@/hooks/use-bot";
import { Skeleton } from "@/components/ui/skeleton";

export default function ServerCommandsPage() {
  const [, params] = useRoute("/dashboard/servers/:id");
  const [location] = useLocation();
  const serverId = Number.parseInt(params?.id || "0", 10);

  const { data: server, isLoading } = useServer(serverId);
  const overviewQuery = useWorkspaceOverview(serverId, { enabled: !!serverId });
  const logsQuery = useCommandLogs(serverId, { enabled: !!serverId });
  const commandsQuery = useServerCommands(serverId, { enabled: !!serverId });
  const discordContextQuery = useDiscordContext(serverId, { enabled: !!serverId });
  const studioDocumentsQuery = useStudioDocuments(serverId, { enabled: !!serverId });
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncSearch = () => setSearchQuery(new URLSearchParams(window.location.search).get("q") || "");
    syncSearch();
    window.addEventListener("archivist-search", syncSearch);
    window.addEventListener("popstate", syncSearch);
    return () => {
      window.removeEventListener("archivist-search", syncSearch);
      window.removeEventListener("popstate", syncSearch);
    };
  }, [location]);

  if (
    isLoading ||
    !server ||
    overviewQuery.isLoading ||
    commandsQuery.isLoading ||
    discordContextQuery.isLoading
  ) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Skeleton className="h-[160px] rounded-[28px] bg-[rgba(155,180,201,0.08)]" />
          <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)_320px]">
            <Skeleton className="h-[720px] rounded-[28px] bg-[rgba(155,180,201,0.08)]" />
            <Skeleton className="h-[720px] rounded-[28px] bg-[rgba(155,180,201,0.08)]" />
            <Skeleton className="h-[720px] rounded-[28px] bg-[rgba(155,180,201,0.08)]" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <CustomCommandWorkspace
        serverId={serverId}
        overview={overviewQuery.data}
        logs={logsQuery.data}
        commands={commandsQuery.data || []}
        discordContext={discordContextQuery.data}
        studioDocuments={studioDocumentsQuery.data}
        searchQuery={searchQuery}
      />
    </DashboardLayout>
  );
}
