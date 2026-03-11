import { ReactNode, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Activity,
  BarChart2,
  Clock3,
  Compass,
  Database,
  Gift,
  Grid2X2,
  Hash,
  Key,
  LayoutTemplate,
  Menu,
  MessageSquareText,
  Radio,
  Settings2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  Terminal,
  Ticket,
  TrendingUp,
  Users,
  Webhook,
  Workflow,
  EyeOff,
  Coins,
  RefreshCw,
  FileText,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface ModuleItem {
  id: string;
  label: string;
  icon: LucideIcon;
  description?: string;
  enabled?: boolean;
}

export interface ModuleCategory {
  label: string;
  modules: ModuleItem[];
}

export const MODULE_CATEGORIES: ModuleCategory[] = [
  {
    label: "Command Center",
    modules: [
      { id: "general", label: "Overview", icon: Compass, description: "Home base" },
      { id: "design-studio", label: "Studio", icon: Sparkles, description: "Message design" },
      { id: "welcome", label: "Welcome", icon: MessageSquareText, description: "First impressions" },
      { id: "verify", label: "Verify", icon: ShieldCheck, description: "Access control" },
      { id: "tickets", label: "Tickets", icon: Ticket, description: "Support intake" },
      { id: "commands", label: "Commands", icon: Terminal, description: "Custom actions" },
      { id: "scheduled", label: "Scheduled", icon: Clock3, description: "Timed messages" },
      { id: "automations", label: "Automations", icon: Workflow, description: "Flow builder" },
      { id: "embeds", label: "Media", icon: LayoutTemplate, description: "Embeds and assets" },
      { id: "settings", label: "Settings", icon: Settings2, description: "Server config" },
    ],
  },
  {
    label: "Operations",
    modules: [
      { id: "channels", label: "Channels", icon: Hash, description: "Channel routing" },
      { id: "smart-permissions", label: "Permissions", icon: Key, description: "Role access" },
      { id: "members", label: "Members", icon: Users, description: "Member intelligence" },
      { id: "server-control", label: "Control", icon: Shield, description: "Guardrails" },
      { id: "variables", label: "Variables", icon: Database, description: "Reusable values" },
      { id: "webhooks", label: "Webhooks", icon: Webhook, description: "External events" },
      { id: "channel-sync", label: "Sync", icon: RefreshCw, description: "Cross-channel sync" },
    ],
  },
  {
    label: "Protection",
    modules: [
      { id: "automod", label: "Automod", icon: Shield, description: "Message defense" },
      { id: "warnings", label: "Moderation", icon: ShieldAlert, description: "Warnings and actions" },
      { id: "raid-protection", label: "Raid", icon: ShieldAlert, description: "Join spikes" },
      { id: "nsfw", label: "NSFW", icon: EyeOff, description: "Sensitive access" },
      { id: "audit-logs", label: "Logs", icon: Radio, description: "Event capture" },
      { id: "audit-log-viewer", label: "History", icon: FileText, description: "Audit review" },
    ],
  },
  {
    label: "Growth",
    modules: [
      { id: "leveling", label: "Leveling", icon: TrendingUp, description: "XP and rank" },
      { id: "economy", label: "Economy", icon: Coins, description: "Currency and rewards" },
      { id: "reaction-roles", label: "Roles", icon: Grid2X2, description: "Reaction assignment" },
      { id: "starboard", label: "Starboard", icon: Star, description: "Highlight posts" },
      { id: "polls", label: "Polls", icon: BarChart2, description: "Server voting" },
      { id: "giveaways", label: "Giveaways", icon: Gift, description: "Prize drops" },
      { id: "insights", label: "Insights", icon: Activity, description: "Server trends" },
    ],
  },
];

const PRIMARY_MODULE_IDS = ["general", "design-studio", "welcome", "verify", "tickets", "commands", "scheduled", "automations", "embeds", "settings"] as const;
const MODULE_LOOKUP = new Map(MODULE_CATEGORIES.flatMap((category) => category.modules).map((module) => [module.id, module]));

function SidebarNavContent({
  activeModule,
  onModuleChange,
  moduleStatuses,
  onItemClick,
  serverId,
}: {
  activeModule: string;
  onModuleChange: (moduleId: string) => void;
  moduleStatuses?: Record<string, boolean>;
  onItemClick?: () => void;
  serverId?: number;
}) {
  const [, navigate] = useLocation();

  return (
    <div className="h-full overflow-y-auto overscroll-contain pr-1">
      <div className="space-y-6 p-3 pb-5">
        {MODULE_CATEGORIES.map((category) => (
          <section key={category.label} className="space-y-2">
            <div className="px-2">
              <p className="text-[10px] uppercase tracking-[0.32em] text-white/[0.35]">{category.label}</p>
            </div>
            <div className="space-y-1.5">
              {category.modules.map((mod) => {
                const isActive = activeModule === mod.id;
                const isEnabled = moduleStatuses?.[mod.id] ?? mod.enabled ?? false;
                const Icon = mod.icon;
                const isMembersRoute = mod.id === "members" && serverId;

                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => {
                      if (isMembersRoute) {
                        navigate(`/dashboard/servers/${serverId}/members`);
                      } else {
                        onModuleChange(mod.id);
                      }
                      onItemClick?.();
                    }}
                    className={cn(
                      "group relative flex w-full items-center gap-3 overflow-hidden rounded-[20px] border px-3 py-3 text-left transition",
                      isActive
                        ? "border-primary/30 bg-[linear-gradient(135deg,rgba(177,18,38,0.22),rgba(15,16,18,0.96))] text-white shadow-[0_14px_38px_rgba(177,18,38,0.12)]"
                        : "border-white/[0.08] bg-white/[0.025] text-white/[0.72] hover:border-white/[0.14] hover:bg-white/[0.05]",
                    )}
                    data-testid={`button-module-${mod.id}`}
                  >
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-2xl border transition",
                      isActive ? "border-primary/25 bg-primary/[0.12] text-white" : "border-white/10 bg-black/20 text-white/[0.72] group-hover:border-white/[0.14] group-hover:text-white",
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold">{mod.label}</span>
                        {isActive ? <span className="h-1.5 w-1.5 rounded-full bg-primary" /> : null}
                      </div>
                      <p className="truncate text-xs text-white/[0.48]">{mod.description || "Module"}</p>
                    </div>
                    <span className={cn("shrink-0 rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.2em]", isEnabled ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-100" : "border-white/10 bg-white/[0.03] text-white/[0.45]")}>
                      {isEnabled ? "Live" : "Idle"}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

interface ServerSettingsLayoutProps {
  activeModule: string;
  onModuleChange: (moduleId: string) => void;
  moduleStatuses?: Record<string, boolean>;
  children: ReactNode;
  serverId?: number;
}

export function ServerSettingsLayout({
  activeModule,
  onModuleChange,
  moduleStatuses,
  children,
  serverId,
}: ServerSettingsLayoutProps) {
  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false);
  const activeItem = useMemo(() => MODULE_LOOKUP.get(activeModule), [activeModule]);

  const mobileRail = (
    <div className="-mx-1 overflow-x-auto pb-1">
      <div className="flex min-w-max gap-2 px-1">
        {PRIMARY_MODULE_IDS.map((moduleId) => {
          const item = MODULE_LOOKUP.get(moduleId);
          if (!item) return null;
          const isActive = activeModule === moduleId;
          return (
            <button
              key={moduleId}
              type="button"
              onClick={() => onModuleChange(moduleId)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-semibold transition",
                isActive
                  ? "border-primary/30 bg-primary/[0.16] text-white shadow-[0_10px_28px_rgba(177,18,38,0.16)]"
                  : "border-white/10 bg-white/[0.03] text-white/[0.68] hover:bg-white/[0.05]",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button size="icon" variant="outline" className="rounded-[18px]" data-testid="button-module-menu">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[22rem] border-white/10 bg-[#090b0f] p-0 text-white">
              <SheetHeader className="border-b border-white/[0.08] px-4 py-4 text-left">
                <SheetTitle className="font-display text-lg text-white">Modules</SheetTitle>
              </SheetHeader>
              <SidebarNavContent
                activeModule={activeModule}
                onModuleChange={onModuleChange}
                moduleStatuses={moduleStatuses}
                onItemClick={() => setSheetOpen(false)}
                serverId={serverId}
              />
            </SheetContent>
          </Sheet>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.28em] text-white/[0.38]">Current Surface</p>
            <h2 className="truncate text-lg font-display font-bold text-white">{activeItem?.label || "Module"}</h2>
          </div>
        </div>
        {mobileRail}
        <div className="archivist-stage min-w-0">{children}</div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="xl:sticky xl:top-4 xl:self-start">
        <div className="archivist-panel archivist-panel-muted overflow-hidden">
          <div className="border-b border-white/[0.08] px-4 py-4">
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/[0.38]">Module Navigation</p>
            <h3 className="mt-2 text-lg font-display font-bold text-white">Sharper, faster access</h3>
          </div>
          <SidebarNavContent activeModule={activeModule} onModuleChange={onModuleChange} moduleStatuses={moduleStatuses} serverId={serverId} />
        </div>
      </aside>
      <div className="min-w-0 space-y-4">
        {mobileRail}
        <div className="archivist-stage min-w-0">{children}</div>
      </div>
    </div>
  );
}

