import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useServers } from "@/hooks/use-bot";
import { Link } from "wouter";
import { Server, Users, Settings, Shield, Terminal, Activity, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

export default function DashboardOverview() {
  const { data: servers, isLoading } = useServers();

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold mb-2" data-testid="text-dashboard-title">Dashboard</h1>
        <p className="text-muted-foreground">Select a server to configure its settings and modules.</p>
      </div>

      {!isLoading && servers && servers.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Servers", value: servers.length, icon: Server },
            { label: "Total Members", value: servers.reduce((s: number, sv: any) => s + (sv.memberCount || 0), 0).toLocaleString(), icon: Users },
            { label: "Active Modules", value: servers.reduce((s: number, sv: any) => s + (sv.settings?.automodEnabled ? 1 : 0) + (sv.customCommands?.length > 0 ? 1 : 0) + (sv.settings?.welcomeEnabled ? 1 : 0), 0), icon: Activity },
            { label: "Custom Commands", value: servers.reduce((s: number, sv: any) => s + (sv.customCommands?.length || 0), 0), icon: Terminal },
          ].map((stat, i) => (
            <div key={i} className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <stat.icon className="w-4 h-4" />
                <span className="text-xs uppercase tracking-wider font-medium">{stat.label}</span>
              </div>
              <p className="text-2xl font-display font-bold" data-testid={`text-stat-${stat.label.toLowerCase().replace(/\s/g, "-")}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card rounded-2xl p-6 h-[200px] flex flex-col justify-between">
              <div className="flex items-center gap-4">
                <Skeleton className="w-14 h-14 rounded-full bg-white/5" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-2/3 bg-white/5" />
                  <Skeleton className="h-4 w-1/3 bg-white/5" />
                </div>
              </div>
              <Skeleton className="h-10 w-full bg-white/5 rounded-xl mt-4" />
            </div>
          ))
        ) : servers?.length === 0 ? (
          <div className="col-span-full glass-card p-12 rounded-3xl flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <Server className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-display font-bold mb-2">No Servers Found</h2>
            <p className="text-muted-foreground max-w-md">You aren't managing any servers yet. Invite Archivist to your Discord server to get started.</p>
          </div>
        ) : (
          servers?.map((server: any, i: number) => {
            const moduleIndicators = [
              { label: "Automod", active: server.settings?.automodEnabled, icon: Shield },
              { label: "Commands", active: (server.customCommands?.length || 0) > 0, icon: Terminal },
              { label: "Welcome", active: server.settings?.welcomeEnabled, icon: TrendingUp },
            ];

            return (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                key={server.id}
              >
                <Link href={`/dashboard/servers/${server.id}`}>
                  <div className="glass-card rounded-2xl p-6 cursor-pointer group hover:border-primary/50 hover:shadow-[0_0_30px_-5px_rgba(139,92,246,0.2)] transition-all duration-300 h-full flex flex-col justify-between" data-testid={`card-server-${server.id}`}>
                    <div>
                      <div className="flex items-start justify-between mb-4">
                        {server.iconUrl ? (
                          <img src={server.iconUrl} alt={server.name} className="w-14 h-14 rounded-2xl shadow-lg shadow-black/20 group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center text-lg font-display font-bold shadow-lg shadow-black/20 group-hover:scale-105 transition-transform duration-300">
                            {server.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="w-8 h-8 rounded-full bg-secondary group-hover:bg-primary group-hover:text-primary-foreground flex items-center justify-center transition-colors duration-300">
                          <Settings className="w-4 h-4" />
                        </div>
                      </div>
                      
                      <h3 className="text-xl font-display font-bold truncate mb-1" data-testid={`text-server-name-${server.id}`}>{server.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                        <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> {server.memberCount?.toLocaleString()} Members</span>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {moduleIndicators.map((mod) => (
                          <Badge
                            key={mod.label}
                            variant={mod.active ? "default" : "secondary"}
                            className={`text-xs ${mod.active ? "bg-primary/20 text-primary border-primary/30" : "bg-white/5 text-muted-foreground border-white/10"}`}
                            data-testid={`badge-module-${mod.label.toLowerCase()}-${server.id}`}
                          >
                            <mod.icon className="w-3 h-3 mr-1" />
                            {mod.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })
        )}
      </div>
    </DashboardLayout>
  );
}
