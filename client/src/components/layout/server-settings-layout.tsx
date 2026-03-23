import { ReactNode, useMemo, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Hash, LayoutDashboard, Menu, ScrollText, Settings2, Shield } from "lucide-react";
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
    label: "Workspace",
    modules: [
      { id: "overview", label: "Overview", icon: LayoutDashboard, description: "Status and command activity" },
      { id: "channels", label: "Channel System", icon: Hash, description: "Channel command surface" },
      { id: "roles", label: "Role System", icon: Shield, description: "Role command surface" },
      { id: "logs", label: "Logs", icon: ScrollText, description: "Recent executions and failures" },
      { id: "settings", label: "Settings", icon: Settings2, description: "Core bot configuration shell" },
    ],
  },
];

const MODULE_LOOKUP = new Map(MODULE_CATEGORIES.flatMap((category) => category.modules).map((module) => [module.id, module]));
const PRIMARY_MODULE_IDS = ["overview", "channels", "roles", "logs", "settings"] as const;

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
                const Icon = mod.icon;
                const isEnabled = moduleStatuses?.[mod.id] ?? mod.enabled ?? true;

                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => {
                      onModuleChange(mod.id);
                      onItemClick?.();
                    }}
                    className={cn(
                      "group relative flex w-full items-center gap-3 overflow-hidden rounded-[20px] border px-3 py-3 text-left transition",
                      isActive
                        ? "border-primary/30 bg-[linear-gradient(135deg,rgba(177,18,38,0.22),rgba(15,16,18,0.96))] text-white shadow-[0_14px_38px_rgba(177,18,38,0.12)]"
                        : "border-white/[0.08] bg-white/[0.025] text-white/[0.72] hover:border-white/[0.14] hover:bg-white/[0.05]",
                    )}
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
                      {isEnabled ? "Live" : "Soon"}
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
}

export function ServerSettingsLayout({
  activeModule,
  onModuleChange,
  moduleStatuses,
  children,
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
              <Button size="icon" variant="outline" className="rounded-[18px]">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[22rem] border-white/10 bg-[#090b0f] p-0 text-white">
              <SheetHeader className="border-b border-white/[0.08] px-4 py-4 text-left">
                <SheetTitle className="font-display text-lg text-white">Archivist Workspace</SheetTitle>
              </SheetHeader>
              <SidebarNavContent
                activeModule={activeModule}
                onModuleChange={onModuleChange}
                moduleStatuses={moduleStatuses}
                onItemClick={() => setSheetOpen(false)}
              />
            </SheetContent>
          </Sheet>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.28em] text-white/[0.38]">Current Section</p>
            <h2 className="truncate text-lg font-display font-bold text-white">{activeItem?.label || "Workspace"}</h2>
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
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/[0.38]">Archivist</p>
            <h3 className="mt-2 text-lg font-display font-bold text-white">Command workspace</h3>
          </div>
          <SidebarNavContent activeModule={activeModule} onModuleChange={onModuleChange} moduleStatuses={moduleStatuses} />
        </div>
      </aside>
      <div className="min-w-0 space-y-4">
        {mobileRail}
        <div className="archivist-stage min-w-0">{children}</div>
      </div>
    </div>
  );
}
