import { useLocation } from "wouter";
import { ArrowUpRight, Layers3, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function DesignStudioLaunchCard({ serverId }: { serverId: number }) {
  const [, navigate] = useLocation();

  const openStudio = () => {
    const target = new URL(`/dashboard/servers/${serverId}/studio`, window.location.origin);
    target.searchParams.set("intent", "blank");
    navigate(`${target.pathname}${target.search}`);
  };

  return (
    <div className="space-y-6">
      <Card className="glass-card border-white/10 bg-background/40">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  Panels + Messages
                </Badge>
                <Badge variant="outline">Standalone editor</Badge>
              </div>
              <CardTitle className="font-display text-2xl">Design Studio</CardTitle>
              <CardDescription className="max-w-2xl">
                Design Studio now opens in its own editor so the page scrolls better, loads cleaner, and stays easier to use on mobile.
              </CardDescription>
            </div>
            <Button onClick={openStudio} className="gap-2">
              <ArrowUpRight className="h-4 w-4" />
              Open Studio
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-background/30 p-4">
            <div className="mb-2 flex items-center gap-2 text-white">
              <Layers3 className="h-4 w-4 text-primary" />
              <span className="font-medium">Cleaner editing</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Build panels and messages in one focused page instead of inside the full server settings shell.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-background/30 p-4">
            <div className="mb-2 flex items-center gap-2 text-white">
              <Layers3 className="h-4 w-4 text-primary" />
              <span className="font-medium">Mobile first</span>
            </div>
            <p className="text-sm text-muted-foreground">
              The new editor uses stacked sections, a preview sheet, and clearer labels for phone use first.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-background/30 p-4">
            <div className="mb-2 flex items-center gap-2 text-white">
              <Layers3 className="h-4 w-4 text-primary" />
              <span className="font-medium">Same runtime</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Verification, welcome, and ticket panels still use the same Studio documents and publish flow.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
