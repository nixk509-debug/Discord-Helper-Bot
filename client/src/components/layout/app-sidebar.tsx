import { 
  LayoutDashboard, 
  BookOpen,
  Store
} from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { useServers } from "@/hooks/use-bot";
import { Skeleton } from "@/components/ui/skeleton";

function ArchivistLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 4C4 2.89543 4.89543 2 6 2H18C19.1046 2 20 2.89543 20 4V6C20 7.10457 19.1046 8 18 8H6C4.89543 8 4 7.10457 4 6V4Z" fill="currentColor" opacity="0.9"/>
      <path d="M4 10C4 8.89543 4.89543 8 6 8H18C19.1046 8 20 8.89543 20 10V12C20 13.1046 19.1046 14 18 14H6C4.89543 14 4 13.1046 4 12V10Z" fill="currentColor" opacity="0.7"/>
      <path d="M4 16C4 14.8954 4.89543 14 6 14H18C19.1046 14 20 14.8954 20 16V18C20 19.1046 19.1046 20 18 20H6C4.89543 20 4 19.1046 4 18V16Z" fill="currentColor" opacity="0.5"/>
      <path d="M7 22H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

export function AppSidebar() {
  const [location] = useLocation();
  const { data: servers, isLoading } = useServers();

  return (
    <Sidebar variant="inset" className="border-r-white/10 glass-panel">
      <SidebarHeader className="p-4 flex flex-row items-center gap-3 border-b border-white/5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white box-glow" style={{ background: "linear-gradient(135deg, hsl(0,72%,51%), hsl(340,75%,55%))" }}>
          <ArchivistLogo />
        </div>
        <div>
          <h2 className="font-display font-bold text-lg leading-tight text-glow">Archivist</h2>
          <p className="text-xs text-muted-foreground font-medium">Dashboard</p>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="p-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/70">Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={location === "/dashboard"}
                  className="data-[active=true]:bg-primary/10 data-[active=true]:text-primary transition-all duration-200"
                >
                  <Link href="/dashboard" className="flex items-center gap-3" data-testid="link-dashboard-overview">
                    <LayoutDashboard className="w-4 h-4" />
                    <span className="font-medium">Overview</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={location === "/marketplace"}
                  className="data-[active=true]:bg-primary/10 data-[active=true]:text-primary transition-all duration-200"
                >
                  <Link href="/marketplace" className="flex items-center gap-3" data-testid="link-marketplace">
                    <Store className="w-4 h-4" />
                    <span className="font-medium">Marketplace</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/70">Your Servers</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <SidebarMenuItem key={i} className="mb-2">
                    <div className="flex items-center gap-3 p-2">
                      <Skeleton className="w-6 h-6 rounded-full bg-white/5" />
                      <Skeleton className="h-4 w-24 bg-white/5" />
                    </div>
                  </SidebarMenuItem>
                ))
              ) : servers?.map((server) => {
                const isActive = location.startsWith(`/dashboard/servers/${server.id}`);
                return (
                  <SidebarMenuItem key={server.id}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      className="data-[active=true]:bg-primary/10 data-[active=true]:text-primary transition-all duration-200"
                    >
                      <Link href={`/dashboard/servers/${server.id}`} className="flex items-center gap-3">
                        {server.iconUrl ? (
                          <img src={server.iconUrl} alt={server.name} className="w-6 h-6 rounded-full" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                            {server.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className="font-medium truncate">{server.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
