import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { ReactNode } from "react";
import { useAuth, useLogout, getAvatarUrl } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LogOut, Crown } from "lucide-react";
import { Link } from "wouter";

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { data: user } = useAuth();
  const logout = useLogout();

  const style = {
    "--sidebar-width": "18rem",
    "--sidebar-width-icon": "4rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={style}>
      <div className="flex min-h-screen w-full bg-background relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[150px] pointer-events-none" />
        
        <AppSidebar />
        
        <div className="flex flex-col flex-1 relative z-10 w-full overflow-hidden">
          <header className="flex h-16 shrink-0 items-center gap-4 border-b border-white/5 bg-background/50 backdrop-blur-md px-6">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" />
            <div className="flex-1" />
            <div className="flex items-center gap-3">
              <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-yellow-400">
                <Link href="/premium">
                  <Crown className="w-4 h-4 mr-1" /> Premium
                </Link>
              </Button>
              {user && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <img
                      src={getAvatarUrl(user)}
                      alt={user.username}
                      className="w-8 h-8 rounded-full border border-white/10 shadow-sm"
                      data-testid="img-user-avatar"
                    />
                    <span className="text-sm font-medium hidden md:block" data-testid="text-username">
                      {user.username}
                    </span>
                    {user.isPremium && (
                      <Crown className="w-3.5 h-3.5 text-yellow-400" />
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => logout.mutate()}
                    disabled={logout.isPending}
                    data-testid="button-logout"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </header>
          
          <main className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
