import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useServers } from "@/hooks/use-bot";
import { useAuth, usePremiumStatus, getAvatarUrl } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Server, Users, Settings, Shield, Terminal, Activity, TrendingUp, ChevronDown, ChevronUp, ExternalLink, Store, Crown, Coins, Ticket } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion } from "framer-motion";
import { useState } from "react";
import archivistAvatar from "@assets/archivist-avatar.png";

const CHANGELOG = [
  { date: "Feb 25, 2026", text: "Visual Flow Builder — node-based automation editor is now live." },
  { date: "Feb 20, 2026", text: "Server Economy system with role shop, gambling, and daily rewards." },
  { date: "Feb 14, 2026", text: "Member Intelligence CRM — per-member profiles, notes, and timeline." },
];

export default function DashboardOverview() {
  const { data: servers, isLoading } = useServers();
  const { data: user } = useAuth();
  const { data: premiumData } = usePremiumStatus();
  const [changelogOpen, setChangelogOpen] = useState(false);

  const isPremium = premiumData?.isPremium || false;

  const totalMembers = servers?.reduce((s: number, sv: any) => s + (sv.memberCount || 0), 0) || 0;
  const activeModules = servers?.reduce((s: number, sv: any) =>
    s
    + (sv.settings?.automodEnabled ? 1 : 0)
    + ((sv.customCommands?.length || 0) > 0 ? 1 : 0)
    + (sv.settings?.welcomeEnabled ? 1 : 0)
    + (sv.settings?.levelingEnabled ? 1 : 0)
    + (sv.settings?.economyEnabled ? 1 : 0), 0) || 0;
  const totalCommands = servers?.reduce((s: number, sv: any) => s + (sv.customCommands?.length || 0), 0) || 0;

  const statCards = [
    { label: "Total Servers", value: servers?.length || 0, icon: Server },
    { label: "Total Members", value: totalMembers >= 1000 ? `${(totalMembers / 1000).toFixed(1)}k` : totalMembers, icon: Users },
    { label: "Active Modules", value: activeModules, icon: Activity },
    { label: "Custom Commands", value: totalCommands, icon: Terminal },
  ];

  return (
    <DashboardLayout>
      <TooltipProvider>
        {user && (
          <div
            className="glass-card rounded-2xl p-6 mb-6 relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            style={{ borderTop: "2px solid transparent", borderImage: "linear-gradient(90deg, hsl(0,72%,51%), hsl(340,75%,55%)) 1" }}
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: "linear-gradient(90deg, hsl(0 72% 51% / 0.1), transparent 60%)" }}
            />
            <div className="relative z-10 flex items-center gap-4">
              <img
                src={getAvatarUrl(user)}
                alt={user.username}
                className="w-16 h-16 rounded-full ring-2 ring-primary/40 ring-offset-2 ring-offset-background shadow-lg"
              />
              <div>
                <h1 className="text-2xl font-display font-extrabold leading-tight" data-testid="text-dashboard-title">
                  Welcome back, {user.username}
                </h1>
                <p className="text-muted-foreground text-sm mt-0.5">
                  Managing {servers?.length || 0} server{(servers?.length || 0) !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <div className="relative z-10 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="gap-1.5 border-white/10 text-xs" asChild>
                <a href="https://discord.com/api/oauth2/authorize?client_id=YOUR_ID&permissions=8&scope=bot" target="_blank" rel="noopener noreferrer" data-testid="button-add-to-server">
                  <ExternalLink className="w-3.5 h-3.5" /> Add to Server
                </a>
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5 border-white/10 text-xs" asChild>
                <Link href="/marketplace" data-testid="button-go-marketplace">
                  <Store className="w-3.5 h-3.5" /> Marketplace
                </Link>
              </Button>
              {!isPremium && (
                <Button size="sm" className="gap-1.5 text-xs gradient-brand text-white" asChild>
                  <Link href="/premium" data-testid="button-go-premium">
                    <Crown className="w-3.5 h-3.5" /> Go Premium
                  </Link>
                </Button>
              )}
            </div>
          </div>
        )}

        {(!isLoading && servers && servers.length > 0) && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {statCards.map((stat, i) => (
              <div
                key={i}
                className="glass-card rounded-xl p-4 relative overflow-hidden"
                style={{ borderTop: "3px solid transparent", borderImage: "linear-gradient(90deg, hsl(0,72%,51%), hsl(340,75%,55%)) 1" }}
              >
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <div className="w-7 h-7 rounded-lg gradient-brand flex items-center justify-center flex-shrink-0">
                    <stat.icon className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-xs uppercase tracking-wider font-medium">{stat.label}</span>
                </div>
                <p className="text-2xl font-display font-bold" data-testid={`text-stat-${stat.label.toLowerCase().replace(/\s/g, "-")}`}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass-card rounded-2xl p-6 h-[220px] flex flex-col justify-between">
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
              <div className="w-20 h-20 mb-6">
                <img src={archivistAvatar} alt="Archivist" className="w-full h-full object-contain opacity-60" />
              </div>
              <h2 className="text-2xl font-display font-bold mb-2">No Servers Found</h2>
              <p className="text-muted-foreground max-w-md mb-6">You aren't managing any servers yet. Add Archivist to your Discord server to get started.</p>
              <Button className="gradient-brand text-white" asChild>
                <a href="https://discord.com/api/oauth2/authorize?client_id=YOUR_ID&permissions=8&scope=bot" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" /> Add Archivist to Discord
                </a>
              </Button>
            </div>
          ) : (
            servers?.map((server: any, i: number) => {
              const moduleDots = [
                { label: "Automod", active: !!server.settings?.automodEnabled, icon: Shield },
                { label: "Commands", active: (server.customCommands?.length || 0) > 0, icon: Terminal },
                { label: "Welcome", active: !!server.settings?.welcomeEnabled, icon: TrendingUp },
                { label: "Economy", active: !!server.settings?.economyEnabled, icon: Coins },
                { label: "Leveling", active: !!server.settings?.levelingEnabled, icon: Activity },
                { label: "Tickets", active: !!server.settings?.ticketsEnabled, icon: Ticket },
              ];

              const initials = server.name.split(" ").map((w: string) => w[0]).join("").substring(0, 2).toUpperCase();

              return (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  key={server.id}
                  className="glass-card rounded-2xl p-5 flex flex-col justify-between group cursor-pointer hover:border-primary/40 transition-all duration-300 hover:shadow-[0_0_30px_-5px_hsl(0_72%_51%/0.3)] hover:-translate-y-0.5"
                  data-testid={`card-server-${server.id}`}
                >
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      {server.iconUrl ? (
                        <img
                          src={server.iconUrl}
                          alt={server.name}
                          className="w-14 h-14 rounded-2xl shadow-lg shadow-black/30 group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div
                          className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-display font-bold shadow-lg shadow-black/30 group-hover:scale-105 transition-transform duration-300 text-white"
                          style={{ background: "linear-gradient(135deg, hsl(0,72%,51%), hsl(340,75%,55%))" }}
                        >
                          {initials}
                        </div>
                      )}
                      <div className="w-8 h-8 rounded-full bg-secondary group-hover:bg-primary/20 flex items-center justify-center transition-colors duration-300">
                        <Settings className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
                      </div>
                    </div>

                    <h3 className="text-lg font-display font-bold truncate mb-1" data-testid={`text-server-name-${server.id}`}>
                      {server.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
                      <Users className="w-3.5 h-3.5" />
                      <span>{(server.memberCount || 0).toLocaleString()} members</span>
                    </div>

                    <div className="flex items-center gap-1.5 mb-4">
                      {moduleDots.map((mod) => (
                        <Tooltip key={mod.label}>
                          <TooltipTrigger>
                            <div
                              className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${mod.active ? "bg-emerald-400 shadow-[0_0_6px_#34d399]" : "bg-white/15"}`}
                              data-testid={`dot-module-${mod.label.toLowerCase()}-${server.id}`}
                            />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            {mod.label}: {mod.active ? "Enabled" : "Disabled"}
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link href={`/dashboard/servers/${server.id}`} className="flex-1">
                      <Button size="sm" className="w-full gradient-brand text-white text-xs font-semibold" data-testid={`button-configure-${server.id}`}>
                        Configure
                      </Button>
                    </Link>
                    <Link href={`/dashboard/servers/${server.id}/members`}>
                      <Button size="sm" variant="outline" className="border-white/10 text-xs" data-testid={`button-members-${server.id}`}>
                        <Users className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        <div className="mt-8">
          <button
            onClick={() => setChangelogOpen(!changelogOpen)}
            className="w-full glass-card rounded-xl p-4 flex items-center justify-between hover:border-white/15 transition-colors duration-200"
            data-testid="button-toggle-changelog"
          >
            <span className="font-display font-semibold text-sm">What's New in Archivist</span>
            {changelogOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>
          {changelogOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="glass-card rounded-xl mt-1 p-4 space-y-3 overflow-hidden"
            >
              {CHANGELOG.map((entry, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <div>
                    <span className="text-xs text-muted-foreground font-mono">{entry.date}</span>
                    <p className="text-sm mt-0.5">{entry.text}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </div>
      </TooltipProvider>
    </DashboardLayout>
  );
}
