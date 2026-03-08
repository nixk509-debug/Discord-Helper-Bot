import { ReactNode, useState } from "react";
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
  Settings,
  Hash,
  Lock,
  Shield,
  AlertTriangle,
  ShieldAlert,
  UserPlus,
  TrendingUp,
  Smile,
  Star,
  Terminal,
  Layout,
  Clock,
  Ticket,
  Activity,
  BarChart2,
  Users,
  Menu,
  Database,
  GitBranch,
  Coins,
  ShieldCheck,
  EyeOff,
  Webhook,
  BarChart3,
  Gift,
  Sparkles,
  Key,
  RefreshCw,
  FileText,
  type LucideIcon,
} from "lucide-react";

export interface ModuleItem {
  id: string;
  label: string;
  icon: LucideIcon;
  enabled?: boolean;
}

export interface ModuleCategory {
  label: string;
  modules: ModuleItem[];
}

export const MODULE_CATEGORIES: ModuleCategory[] = [
  {
    label: "Core",
    modules: [
      { id: "general", label: "General", icon: Settings, enabled: true },
      { id: "design-studio", label: "Design Studio", icon: Sparkles, enabled: true },
      { id: "channels", label: "Channels", icon: Hash, enabled: false },
      { id: "server-control", label: "Server Control", icon: Shield, enabled: false },
      { id: "smart-permissions", label: "Permissions", icon: Key, enabled: false },
      { id: "members", label: "Members", icon: Users, enabled: false },
    ],
  },
  {
    label: "Moderation",
    modules: [
      { id: "automod", label: "Automod", icon: Shield, enabled: false },
      { id: "warnings", label: "Warnings & Punishments", icon: AlertTriangle, enabled: false },
      { id: "raid-protection", label: "Raid Protection", icon: ShieldAlert, enabled: false },
      { id: "verify", label: "Verification", icon: ShieldCheck, enabled: false },
      { id: "nsfw", label: "NSFW Control", icon: EyeOff, enabled: false },
    ],
  },
  {
    label: "Engagement",
    modules: [
      { id: "welcome", label: "Welcome/Leave", icon: UserPlus, enabled: false },
      { id: "leveling", label: "Leveling & XP", icon: TrendingUp, enabled: false },
      { id: "economy", label: "Economy", icon: Coins, enabled: false },
      { id: "reaction-roles", label: "Reaction Roles", icon: Smile, enabled: false },
      { id: "starboard", label: "Starboard", icon: Star, enabled: false },
      { id: "polls", label: "Polls", icon: BarChart3, enabled: false },
      { id: "giveaways", label: "Giveaways", icon: Gift, enabled: false },
    ],
  },
  {
    label: "Automations",
    modules: [
      { id: "automations", label: "Flow Builder", icon: GitBranch, enabled: false },
      { id: "commands", label: "Custom Commands", icon: Terminal, enabled: false },
      { id: "variables", label: "Variable Storage", icon: Database, enabled: false },
      { id: "scheduled", label: "Scheduled Messages", icon: Clock, enabled: false },
      { id: "embeds", label: "Embed Builder", icon: Layout, enabled: false },
      { id: "tickets", label: "Ticket System", icon: Ticket, enabled: false },
      { id: "webhooks", label: "Webhooks", icon: Webhook, enabled: false },
      { id: "codes", label: "Code Vault", icon: Gift, enabled: false },
      { id: "channel-sync", label: "Channel Sync", icon: RefreshCw, enabled: false },
    ],
  },
  {
    label: "Logging",
    modules: [
      { id: "audit-logs", label: "Audit Logs", icon: Activity, enabled: false },
      { id: "audit-log-viewer", label: "Audit History", icon: FileText, enabled: false },
    ],
  },
  {
    label: "Analytics",
    modules: [
      { id: "insights", label: "Server Insights", icon: BarChart2, enabled: false },
    ],
  },
];

interface ServerSettingsLayoutProps {
  activeModule: string;
  onModuleChange: (moduleId: string) => void;
  moduleStatuses?: Record<string, boolean>;
  children: ReactNode;
  serverId?: number;
}

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
      <div className="space-y-6 p-4 pb-6">
        {MODULE_CATEGORIES.map((category) => (
          <div key={category.label}>
            <p
              className="text-xs uppercase tracking-wider text-muted-foreground/70 font-medium mb-2 px-3"
              data-testid={`text-category-${category.label.toLowerCase()}`}
            >
              {category.label}
            </p>
            <div className="space-y-1">
              {category.modules.map((mod) => {
                const isActive = activeModule === mod.id;
                const isEnabled = moduleStatuses?.[mod.id] ?? mod.enabled ?? false;
                const Icon = mod.icon;
                const isNavLink = mod.id === "members" && serverId;
                return (
                  <button
                    key={mod.id}
                    onClick={() => {
                      if (isNavLink) {
                        navigate(`/dashboard/servers/${serverId}/members`);
                      } else {
                        onModuleChange(mod.id);
                      }
                      onItemClick?.();
                    }}
                    data-testid={`button-module-${mod.id}`}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover-elevate"
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{mod.label}</span>
                    <span
                      className={cn(
                        "ml-auto w-2 h-2 rounded-full shrink-0",
                        isEnabled ? "bg-green-500" : "bg-muted-foreground/30"
                      )}
                      data-testid={`status-module-${mod.id}`}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
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

  const activeLabel =
    MODULE_CATEGORIES.flatMap((c) => c.modules).find(
      (m) => m.id === activeModule
    )?.label ?? "Settings";

  if (isMobile) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button size="icon" variant="outline" data-testid="button-module-menu">
                <Menu className="w-4 h-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 glass-panel">
              <SheetHeader className="p-4 border-b border-white/5">
                <SheetTitle className="font-display text-lg">Modules</SheetTitle>
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
          <h2 className="text-lg font-display font-bold" data-testid="text-active-module">
            {activeLabel}
          </h2>
        </div>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    );
  }

  return (
    <div className="flex gap-6 min-h-0 items-start">
      <div className="w-64 shrink-0">
        <div className="glass-card rounded-xl sticky top-4 overflow-hidden flex h-[calc(100vh-7rem)] min-h-[24rem] flex-col">
          <div className="px-4 py-3 border-b border-white/5">
            <h3 className="text-sm font-display font-bold text-muted-foreground uppercase tracking-wider" data-testid="text-modules-heading">
              Modules
            </h3>
          </div>
          <div className="min-h-0 flex-1">
            <SidebarNavContent
              activeModule={activeModule}
              onModuleChange={onModuleChange}
              moduleStatuses={moduleStatuses}
              serverId={serverId}
            />
          </div>
        </div>
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
