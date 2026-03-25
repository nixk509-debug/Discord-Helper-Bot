import { Link, useLocation } from "wouter";
import { Braces, Gamepad2, LayoutDashboard, ShieldCheck, Sparkles } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import archivistLogo from "@assets/FDEBE754-F9DF-41D4-A19B-B2933432B230_1772114960531.png";
import {
  ARCHIVIST_NAVIGATION,
  buildArchivistItemPath,
  buildArchivistSectionPath,
  getArchivistSectionFromLocation,
  getServerIdFromLocation,
} from "@/lib/archivist-workspace";
import { useServers } from "@/hooks/use-bot";
import { cn } from "@/lib/utils";

type AppSidebarMode = "workspace" | "overview" | "site-editor";

const PILLAR_ICONS = {
  commands: Braces,
  studio: Sparkles,
  fun: Gamepad2,
  server: ShieldCheck,
};

export function AppSidebar({ mode = "workspace" }: { mode?: AppSidebarMode }) {
  const [location] = useLocation();
  const { data: servers } = useServers();
  const { isMobile, setOpenMobile } = useSidebar();
  
  const isWorkspaceMode = mode === "workspace";
  const activeSection = getArchivistSectionFromLocation(location);
  const activeServerId = getServerIdFromLocation(location);
  
  const currentNavigation = ARCHIVIST_NAVIGATION.find(n => n.id === activeSection) || ARCHIVIST_NAVIGATION[0];

  return (
    <Sidebar className="border-r border-[var(--border-subtle)] bg-[var(--bg-shell)]">
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center gap-3 px-2">
          <div className="h-8 w-8 overflow-hidden rounded-lg border border-[var(--border-default)]">
            <img src={archivistLogo} alt="Archivist" className="h-full w-full object-cover" />
          </div>
          <p className="font-display text-base font-bold tracking-tight">Archivist</p>
        </Link>
        
        <div className="mt-6 space-y-1 px-2">
          <p className="archivist-kicker mb-3 px-2">Product Pillars</p>
          <Link href="/dashboard">
            <a className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
              mode === "overview" ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]" : "text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)]"
            )}>
              <LayoutDashboard className="h-4 w-4" />
              Overview
            </a>
          </Link>
          
          {ARCHIVIST_NAVIGATION.map((section) => {
            const Icon = PILLAR_ICONS[section.id as keyof typeof PILLAR_ICONS];
            const isActive = isWorkspaceMode && activeSection === section.id;
            const href = activeServerId ? buildArchivistSectionPath(activeServerId, section.id) : "/dashboard";

            return (
              <Link key={section.id} href={href}>
                <a className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                  isActive ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]" : "text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)]"
                )}>
                  <Icon className="h-4 w-4" />
                  {section.label}
                </a>
              </Link>
            );
          })}
        </div>
      </SidebarHeader>

      <SidebarContent className="mt-4 px-4 pb-4">
        {isWorkspaceMode && activeServerId && (
          <div className="space-y-1 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-panel-inset)] p-2">
            <p className="archivist-kicker mb-2 px-2 pt-1">{currentNavigation.label} Tools</p>
            {currentNavigation.items.filter(i => !i.hiddenFromNav).map((item) => {
              const href = buildArchivistItemPath(activeServerId, currentNavigation.id, item.slug);
              const isActive = location.startsWith(href);
              
              return (
                <Link key={item.id} href={href}>
                  <a 
                    onClick={() => isMobile && setOpenMobile(false)}
                    className={cn(
                      "block rounded-xl px-3 py-2 text-[13px] font-medium transition-colors",
                      isActive ? "bg-[var(--bg-panel-raised)] text-[var(--text-primary)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    {item.label}
                  </a>
                </Link>
              );
            })}
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
