import { ReactNode, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Menu,
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
      { id: "channels", label: "Channels", icon: Hash, enabled: false },
      { id: "permissions", label: "Permissions", icon: Lock, enabled: false },
    ],
  },
  {
    label: "Moderation",
    modules: [
      { id: "automod", label: "Automod", icon: Shield, enabled: false },
      { id: "warnings", label: "Warnings & Punishments", icon: AlertTriangle, enabled: false },
      { id: "raid-protection", label: "Raid Protection", icon: ShieldAlert, enabled: false },
    ],
  },
  {
    label: "Engagement",
    modules: [
      { id: "welcome", label: "Welcome/Leave", icon: UserPlus, enabled: false },
      { id: "leveling", label: "Leveling & XP", icon: TrendingUp, enabled: false },
      { id: "reaction-roles", label: "Reaction Roles", icon: Smile, enabled: false },
      { id: "starboard", label: "Starboard", icon: Star, enabled: false },
    ],
  },
  {
    label: "Utilities",
    modules: [
      { id: "commands", label: "Custom Commands", icon: Terminal, enabled: false },
      { id: "embeds", label: "Embed Builder", icon: Layout, enabled: false },
      { id: "scheduled", label: "Scheduled Messages", icon: Clock, enabled: false },
      { id: "tickets", label: "Ticket System", icon: Ticket, enabled: false },
    ],
  },
  {
    label: "Logging",
    modules: [
      { id: "audit-logs", label: "Audit Logs", icon: Activity, enabled: false },
    ],
  },
];

interface ServerSettingsLayoutProps {
  activeModule: string;
  onModuleChange: (moduleId: string) => void;
  moduleStatuses?: Record<string, boolean>;
  children: ReactNode;
}

function SidebarNavContent({
  activeModule,
  onModuleChange,
  moduleStatuses,
  onItemClick,
}: {
  activeModule: string;
  onModuleChange: (moduleId: string) => void;
  moduleStatuses?: Record<string, boolean>;
  onItemClick?: () => void;
}) {
  return (
    <ScrollArea className="h-full">
      <div className="space-y-6 p-4">
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
                return (
                  <button
                    key={mod.id}
                    onClick={() => {
                      onModuleChange(mod.id);
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
    </ScrollArea>
  );
}

export function ServerSettingsLayout({
  activeModule,
  onModuleChange,
  moduleStatuses,
  children,
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
    <div className="flex gap-6">
      <div className="w-64 shrink-0">
        <div className="glass-card rounded-xl sticky top-0 overflow-hidden" style={{ maxHeight: "calc(100vh - 10rem)" }}>
          <div className="px-4 py-3 border-b border-white/5">
            <h3 className="text-sm font-display font-bold text-muted-foreground uppercase tracking-wider" data-testid="text-modules-heading">
              Modules
            </h3>
          </div>
          <SidebarNavContent
            activeModule={activeModule}
            onModuleChange={onModuleChange}
            moduleStatuses={moduleStatuses}
          />
        </div>
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
