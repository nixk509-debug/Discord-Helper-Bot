import { 
  Bot, 
  LayoutDashboard, 
  Settings, 
  MessageSquare, 
  Shield, 
  Activity,
  Server
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

export function AppSidebar() {
  const [location] = useLocation();
  const { data: servers, isLoading } = useServers();

  return (
    <Sidebar variant="inset" className="border-r-white/10 glass-panel">
      <SidebarHeader className="p-4 flex flex-row items-center gap-3 border-b border-white/5">
        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30 text-primary">
          <Bot className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-display font-bold text-lg leading-tight text-glow">NexBot</h2>
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
                  <Link href="/dashboard" className="flex items-center gap-3">
                    <LayoutDashboard className="w-4 h-4" />
                    <span className="font-medium">Overview</span>
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
