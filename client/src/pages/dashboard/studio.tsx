import { useRoute, useLocation } from "wouter";
import { ChevronLeft, Sparkles } from "lucide-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { DesignStudioTab } from "@/components/design-studio/design-studio-tab";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useServer } from "@/hooks/use-bot";
import { useIsMobile } from "@/hooks/use-mobile";

export default function StudioPage() {
  const [, params] = useRoute("/dashboard/servers/:id/studio");
  const [, navigate] = useLocation();
  const serverId = parseInt(params?.id || "0", 10);
  const { data: server, isLoading } = useServer(serverId);
  const isMobile = useIsMobile();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {!isMobile ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-3">
              <Button
                variant="ghost"
                className="h-auto px-0 text-muted-foreground hover:bg-transparent hover:text-white"
                onClick={() => navigate(`/dashboard/servers/${serverId}?module=design-studio`)}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back to server settings
              </Button>
              {isLoading || !server ? (
                <div className="space-y-2">
                  <Skeleton className="h-7 w-56 bg-white/5" />
                  <Skeleton className="h-4 w-72 bg-white/5" />
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="gap-1">
                      <Sparkles className="h-3.5 w-3.5" />
                      Design Studio
                    </Badge>
                    <Badge variant="outline">Panels + Messages</Badge>
                  </div>
                  <div>
                    <h1 className="text-3xl font-display font-bold">{server.name}</h1>
                    <p className="text-sm text-muted-foreground">
                      Build messages, panels, actions, and publish flows in a dedicated editor.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : null}

        <DesignStudioTab
          serverId={serverId}
          onOpenServerSettings={() => navigate(`/dashboard/servers/${serverId}?module=design-studio`)}
        />
      </div>
    </DashboardLayout>
  );
}
