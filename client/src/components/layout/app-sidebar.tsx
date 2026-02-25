import { 
  LayoutDashboard, 
  Store,
  Crown
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
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useServers } from "@/hooks/use-bot";
import { useAuth, getAvatarUrl, usePremiumStatus } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import archivistAvatar from "@assets/archivist-avatar.png";

export function AppSidebar() {
  const [location] = useLocation();
  const { data: servers, isLoading } = useServers();
  const { data: user } = useAuth();
  const { data: premiumData } = usePremiumStatus();
  const isPremium = premiumData?.isPremium || false;

  return (
    <Sidebar variant="inset" className="border-r-white/10 glass-panel">
      <SidebarHeader className="p-4 flex flex-row items-center gap-3 border-b border-white/5">
        <div className="w-9 h-9 rounded-xl overflow-hidden box-glow flex-shrink-0">
          <img src={archivistAvatar} alt="Archivist" className="w-full h-full object-cover" />
        </div>
        <div>
          <h2 className="font-display font-bold text-lg leading-tight text-glow">Archivist</h2>
          <p className="text-xs text-muted-foreground font-medium">Dashboard</p>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="p-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/60 px-2 pb-1">Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={location === "/dashboard"}
                  className="data-[active=true]:bg-primary/15 data-[active=true]:text-primary data-[active=true]:border-l-2 data-[active=true]:border-primary transition-all duration-200 rounded-lg"
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
                  className="data-[active=true]:bg-primary/15 data-[active=true]:text-primary data-[active=true]:border-l-2 data-[active=true]:border-primary transition-all duration-200 rounded-lg"
                >
                  <Link href="/marketplace" className="flex items-center gap-3" data-testid="link-marketplace">
                    <Store className="w-4 h-4" />
                    <span className="font-medium">Marketplace</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {!isPremium && (
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild
                    isActive={location === "/premium"}
                    className="data-[active=true]:bg-primary/15 data-[active=true]:text-primary transition-all duration-200 rounded-lg"
                  >
                    <Link href="/premium" className="flex items-center gap-3 text-yellow-400/80 hover:text-yellow-400" data-testid="link-premium">
                      <Crown className="w-4 h-4" />
                      <span className="font-medium">Go Premium</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mx-2 h-px bg-white/5 my-2" />

        <SidebarGroup className="mt-1">
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/60 px-2 pb-1">Your Servers</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <SidebarMenuItem key={i} className="mb-1">
                    <div className="flex items-center gap-3 p-2">
                      <Skeleton className="w-6 h-6 rounded-full bg-white/5" />
                      <Skeleton className="h-4 w-24 bg-white/5" />
                    </div>
                  </SidebarMenuItem>
                ))
              ) : servers?.map((server: any) => {
                const isActive = location.startsWith(`/dashboard/servers/${server.id}`);
                const initials = server.name.split(" ").map((w: string) => w[0]).join("").substring(0, 2).toUpperCase();
                return (
                  <SidebarMenuItem key={server.id}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      className="data-[active=true]:bg-primary/15 data-[active=true]:text-primary data-[active=true]:border-l-2 data-[active=true]:border-primary transition-all duration-200 rounded-lg"
                    >
                      <Link href={`/dashboard/servers/${server.id}`} className="flex items-center gap-3">
                        {server.iconUrl ? (
                          <img src={server.iconUrl} alt={server.name} className="w-6 h-6 rounded-full flex-shrink-0" />
                        ) : (
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                            style={{ background: "linear-gradient(135deg, hsl(0,72%,51%), hsl(340,75%,55%))" }}
                          >
                            {initials}
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

      {user && (
        <SidebarFooter className="p-3 border-t border-white/5">
          <Link href="/dashboard" className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
            <img src={getAvatarUrl(user)} alt={user.username} className="w-7 h-7 rounded-full" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.username}</p>
              <p className="text-xs text-muted-foreground truncate">{isPremium ? "Premium" : "Free plan"}</p>
            </div>
            {isPremium && <Crown className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />}
          </Link>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
