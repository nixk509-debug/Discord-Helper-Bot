import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useServers } from "@/hooks/use-bot";
import { useAuth, usePremiumStatus, getAvatarUrl } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Server, Users, Settings, Shield, Terminal, Activity, TrendingUp, ChevronDown, ChevronUp, ExternalLink, Store, Crown, Coins, Ticket, Workflow, Layout } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import archivistAvatar from "@assets/archivist-avatar.png";

const CHANGELOG = [
  { date: "Feb 25, 2026", text: "Visual Flow Builder - node-based automation editor is now live." },
  { date: "Feb 20, 2026", text: "Server Economy system with role shop, gambling, and daily rewards." },
  { date: "Feb 14, 2026", text: "Member Intelligence CRM - per-member profiles, notes, and timeline." },
];
const PILLAR_CARDS = [
  {
    id: "automation",
    title: "Visual Automation Engine",
    description: "Build trigger/action flows and operational automations from one canvas.",
    icon: Workflow,
    moduleId: "automations",
    cta: "Open Flow Builder",
  },
  {
    id: "crm",
    title: "Member Intelligence CRM",
    description: "Moderation notes, member timelines, and bulk actions in a single workspace.",
    icon: Users,
    membersRoute: true,
    cta: "Open Member Intelligence",
  },
  {
    id: "studio",
    title: "Command + Embed Studio",
    description: "Create command logic and interactive embeds with send-ready workflows.",
    icon: Layout,
    moduleId: "embeds",
    cta: "Open Embed Studio",
  },
] as const;
function TerminalStat({ label, value, icon: Icon, delay = 0 }: { label: string; value: string | number; icon: any; delay?: number }) {
  const [displayValue, setDisplayValue] = useState("");
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    const valStr = value.toString();
    let current = 0;
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        if (current < valStr.length) {
          setDisplayValue(valStr.slice(0, current + 1));
          current++;
        } else {
          clearInterval(interval);
          setTimeout(() => setIsDone(true), 200);
        }
      }, 30);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timeout);
  }, [value, delay]);

  return (
    <div
      className="feature-card rounded-xl p-4 relative overflow-hidden group"
    >
      <div className="glitch-fragment" />
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        <div className="w-7 h-7 rounded-lg bg-[#FF2D4D]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[#FF2D4D]/20 transition-colors">
          <Icon className="w-3.5 h-3.5 text-primary group-hover:text-accent" />
        </div>
        <span className="section-header">{label}</span>
      </div>
      <p className="text-2xl font-display font-bold stats-monospace relative">
        {displayValue}
        {!isDone && <span className="inline-block w-[0.6em] h-[1em] bg-primary ml-1 animate-pulse">|</span>}
        {isDone && (
          <motion.span 
            initial={{ opacity: 1 }}
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 0.1, times: [0, 0.5, 1] }}
            className="absolute inset-0 pointer-events-none"
          />
        )}
      </p>
    </div>
  );
}

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
  const primaryServerId = (servers || []).find((sv: any) => typeof sv?.id === "number")?.id ?? null;

  const statCards = [
    { label: "Servers Indexed", value: servers?.length || 0, icon: Server },
    { label: "Members Found", value: totalMembers >= 1000 ? `${(totalMembers / 1000).toFixed(1)}k` : totalMembers, icon: Users },
    { label: "Active Modules", value: activeModules, icon: Activity },
    { label: "Commands Loaded", value: totalCommands, icon: Terminal },
  ];

  return (
    <DashboardLayout>
      <TooltipProvider>
        {user && (
          <div
            className="feature-card rounded-2xl p-6 mb-6 relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: "linear-gradient(90deg, rgba(177, 18, 38, 0.1), transparent 60%)" }}
            />
            <div className="relative z-10 flex items-center gap-4">
              <img
                src={getAvatarUrl(user)}
                alt={user.username}
                className="w-16 h-16 rounded-full ring-2 ring-primary/40 ring-offset-2 ring-offset-[#0B0D10] shadow-lg"
              />
              <div>
                <h1 className="text-2xl font-display font-extrabold leading-tight" data-testid="text-dashboard-title">
                  Welcome back, {user.username}
                </h1>
                <p className="section-header mt-1 normal-case text-muted-foreground/80">
                  Managing {servers?.length || 0} server{(servers?.length || 0) !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <div className="relative z-10 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="gap-1.5 border-white/10 text-xs stats-monospace" asChild>
                <a href="/api/invite-url?redirect=1" target="_blank" rel="noopener noreferrer" data-testid="button-add-to-server">
                  <ExternalLink className="w-3.5 h-3.5" /> ADD_TO_SERVER
                </a>
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5 border-white/10 text-xs stats-monospace" asChild>
                <Link href="/marketplace" data-testid="button-go-marketplace">
                  <Store className="w-3.5 h-3.5" /> MARKETPLACE
                </Link>
              </Button>
              {!isPremium && (
                <Button size="sm" className="gap-1.5 text-xs gradient-brand text-white stats-monospace" asChild>
                  <Link href="/premium" data-testid="button-go-premium">
                    <Crown className="w-3.5 h-3.5" /> GO_PREMIUM
                  </Link>
                </Button>
              )}
            </div>
          </div>
        )}

        {(!isLoading && servers && servers.length > 0) && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {statCards.map((stat, i) => (
              <TerminalStat key={i} {...stat} delay={i * 100} />
            ))}
          </div>
        )}

        <div className="feature-card rounded-2xl p-5 mb-6 relative overflow-hidden">
          <div className="glitch-fragment" />
          <div className="mb-4">
            <h2 className="text-lg font-display font-bold">Why Archivist</h2>
            <p className="text-sm text-muted-foreground">Three core systems that keep admins coming back.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {PILLAR_CARDS.map((pillar) => {
              const Icon = pillar.icon;
              const href = !primaryServerId
                ? null
                : pillar.membersRoute
                  ? `/dashboard/servers/${primaryServerId}/members`
                  : `/dashboard/servers/${primaryServerId}?module=${pillar.moduleId}`;

              return (
                <div key={pillar.id} className="rounded-xl border border-white/10 bg-background/30 p-4 flex flex-col gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-display font-bold">{pillar.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{pillar.description}</p>
                  </div>
                  {href ? (
                    <Link href={href} className="mt-auto">
                      <Button size="sm" variant="outline" className="w-full border-white/10 text-xs">
                        {pillar.cta}
                      </Button>
                    </Link>
                  ) : (
                    <Button size="sm" variant="outline" disabled className="w-full border-white/10 text-xs">
                      Add Archivist To A Server
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

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
                <a href="/api/invite-url?redirect=1" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" /> Add Archivist to Discord
                </a>
              </Button>
            </div>
          ) : (
            servers?.map((server: any, i: number) => {
              const serverId = server?.id;
              if (serverId == null) return null;

              const serverName = typeof server?.name === "string" && server.name.trim().length > 0
                ? server.name
                : `Server ${serverId}`;
              const moduleDots = [
                { label: "Automod", active: !!server.settings?.automodEnabled, icon: Shield },
                { label: "Commands", active: (server.customCommands?.length || 0) > 0, icon: Terminal },
                { label: "Welcome", active: !!server.settings?.welcomeEnabled, icon: TrendingUp },
                { label: "Economy", active: !!server.settings?.economyEnabled, icon: Coins },
                { label: "Leveling", active: !!server.settings?.levelingEnabled, icon: Activity },
                { label: "Tickets", active: !!server.settings?.ticketsEnabled, icon: Ticket },
              ];

              const initials = serverName
                .split(" ")
                .map((w: string) => w[0])
                .filter(Boolean)
                .join("")
                .substring(0, 2)
                .toUpperCase();
              const memberCount = Number.isFinite(Number(server?.memberCount)) ? Number(server.memberCount) : 0;

              return (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  key={serverId}
                  className="feature-card rounded-2xl p-5 flex flex-col justify-between group cursor-pointer hover:shadow-[0_0_30px_-5px_rgba(177,18,38,0.3)] hover:-translate-y-0.5"
                  data-testid={`card-server-${serverId}`}
                >
                  <div className="glitch-fragment" />
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      {server.iconUrl ? (
                        <img
                          src={server.iconUrl}
                          alt={serverName}
                          className="w-14 h-14 rounded-2xl shadow-lg shadow-black/30 group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div
                          className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-display font-bold shadow-lg shadow-black/30 group-hover:scale-105 transition-transform duration-300 text-white"
                          style={{ background: "linear-gradient(135deg, #B11226, #FF2D4D)" }}
                        >
                          {initials}
                        </div>
                      )}
                      <div className="w-8 h-8 rounded-full bg-secondary group-hover:bg-primary/20 flex items-center justify-center transition-colors duration-300">
                        <Settings className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
                      </div>
                    </div>

                    <h3 className="text-lg font-display font-bold truncate mb-1" data-testid={`text-server-name-${serverId}`}>
                      {serverName}
                    </h3>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4 stats-monospace">
                      <Users className="w-3.5 h-3.5" />
                      <span>{memberCount.toLocaleString()} MEMBERS</span>
                    </div>

                    <div className="flex items-center gap-1.5 mb-4">
                      {moduleDots.map((mod) => (
                        <Tooltip key={mod.label}>
                          <TooltipTrigger>
                            <div
                              className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${mod.active ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : "bg-white/10"}`}
                              data-testid={`dot-module-${mod.label.toLowerCase()}-${serverId}`}
                            />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-[10px] uppercase font-bold tracking-widest bg-black border-white/10">
                            {mod.label}: {mod.active ? "ACTIVE" : "OFFLINE"}
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link href={`/dashboard/servers/${serverId}`} className="flex-1">
                      <Button size="sm" className="w-full gradient-brand text-white text-[10px] font-bold uppercase tracking-widest" data-testid={`button-configure-${serverId}`}>
                        CONFIGURE
                      </Button>
                    </Link>
                    <Link href={`/dashboard/servers/${serverId}/members`}>
                      <Button size="sm" variant="outline" className="border-white/10 text-xs" data-testid={`button-members-${serverId}`}>
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
            className="w-full feature-card rounded-xl p-4 flex items-center justify-between hover:bg-secondary/20 transition-colors duration-200"
            data-testid="button-toggle-changelog"
          >
            <div className="glitch-fragment" />
            <span className="section-header">What's New in Archivist</span>
            {changelogOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>
          {changelogOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="feature-card rounded-xl mt-1 p-4 space-y-3 overflow-hidden"
            >
              {CHANGELOG.map((entry, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0 shadow-[0_0_8px_#B11226]" />
                  <div>
                    <span className="text-[10px] text-muted-foreground stats-monospace uppercase tracking-widest">{entry.date}</span>
                    <p className="text-sm mt-1 leading-relaxed">{entry.text}</p>
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
