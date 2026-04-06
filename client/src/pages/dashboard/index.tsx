import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useServers } from "@/hooks/use-bot";
import { useAuth, usePremiumStatus, getAvatarUrl } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Users, ExternalLink, ChevronRight, Zap, Layers, Gamepad2, Code2, Shield } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import archivistAvatar from "@assets/archivist-avatar.png";

const MODULES = [
  {
    icon: Code2,
    title: "Custom Commands",
    desc: "Automation, logic, and testing",
    tab: "commands",
  },
  {
    icon: Layers,
    title: "Design Studio",
    desc: "Visual message components",
    tab: "embeds",
  },
  {
    icon: Gamepad2,
    title: "Fun And Creative",
    desc: "Community games and profile",
    tab: "fun",
  },
  {
    icon: Shield,
    title: "Server Management",
    desc: "Roles, logs, and onboarding",
    tab: "automod",
  },
];

export default function DashboardOverview() {
  const { data: servers, isLoading } = useServers();
  const { data: user } = useAuth();
  const { data: premiumData } = usePremiumStatus();

  const featured = servers?.[0];

  const initials = (name: string) =>
    name.split(" ").map((w: string) => w[0]).join("").substring(0, 2).toUpperCase();

  return (
    <DashboardLayout>
      {/* ── Current Server card ── */}
      {isLoading ? (
        <div className="feature-card rounded-2xl p-6 mb-4">
          <Skeleton className="h-5 w-24 bg-white/5 mb-4" />
          <div className="flex items-center gap-4">
            <Skeleton className="w-14 h-14 rounded-2xl bg-white/5 flex-shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-6 w-40 bg-white/5" />
              <Skeleton className="h-4 w-24 bg-white/5" />
            </div>
          </div>
        </div>
      ) : featured ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="feature-card rounded-2xl p-5 mb-4 relative overflow-hidden"
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "linear-gradient(120deg, rgba(177,18,38,0.08), transparent 60%)" }}
          />
          <div className="glitch-fragment" />
          <p className="section-header mb-3">Current Server</p>
          <div className="flex items-center gap-4 mb-4">
            {featured.iconUrl ? (
              <img
                src={featured.iconUrl}
                alt={featured.name}
                className="w-14 h-14 rounded-2xl shadow-lg shadow-black/30 flex-shrink-0"
              />
            ) : (
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-display font-bold shadow-lg flex-shrink-0 text-white"
                style={{ background: "linear-gradient(135deg, #B11226, #FF2D4D)" }}
              >
                {initials(featured.name)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-display font-bold truncate">{featured.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399] flex-shrink-0" />
                <span className="text-xs text-muted-foreground stats-monospace">
                  Bot Live &middot; {(featured.memberCount || 0).toLocaleString()} members
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="border-white/10 text-xs gap-1.5" asChild>
              <a href="/api/invite-url" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3.5 h-3.5" /> Invite Bot
              </a>
            </Button>
            <Button
              size="sm"
              className="text-xs font-semibold text-white gap-1.5"
              style={{ background: "linear-gradient(135deg, #B11226, #FF2D4D)" }}
              asChild
            >
              <Link href={`/dashboard/servers/${featured.id}`}>
                Enter Workspace <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </div>
        </motion.div>
      ) : (
        <div className="feature-card rounded-2xl p-8 mb-4 flex flex-col items-center text-center">
          <div className="w-16 h-16 mb-4">
            <img src={archivistAvatar} alt="Archivist" className="w-full h-full object-contain opacity-50" />
          </div>
          <h2 className="text-lg font-display font-bold mb-1">No Server Added Yet</h2>
          <p className="text-sm text-muted-foreground mb-4">Add Archivist to a server to get started.</p>
          <Button size="sm" className="text-white gap-1.5" style={{ background: "linear-gradient(135deg, #B11226, #FF2D4D)" }} asChild>
            <a href="/api/invite-url" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3.5 h-3.5" /> Add to Discord
            </a>
          </Button>
        </div>
      )}

      {/* ── Resume draft card ── */}
      {featured && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="feature-card rounded-2xl p-4 mb-6 flex items-center gap-4"
        >
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">Resume Untitled Components</p>
            <p className="text-xs text-muted-foreground">Draft updated about 2 hours ago</p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="text-primary hover:text-accent text-xs gap-1 flex-shrink-0"
            asChild
          >
            <Link href={`/dashboard/servers/${featured?.id}?tab=embeds`}>
              Continue <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </motion.div>
      )}

      {/* ── Module rows ── */}
      <div className="space-y-2 mb-8">
        <p className="section-header mb-3">Workspace</p>
        {MODULES.map((mod, i) => (
          <motion.div
            key={mod.tab}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 + 0.1 }}
          >
            <Link href={featured ? `/dashboard/servers/${featured.id}?tab=${mod.tab}` : "/dashboard"}>
              <div className="feature-card rounded-xl p-4 flex items-center gap-4 cursor-pointer group hover:-translate-y-0.5">
                <div className="glitch-fragment" />
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors duration-200"
                  style={{ background: "rgba(177,18,38,0.12)" }}
                >
                  <mod.icon className="w-5 h-5 text-primary group-hover:text-accent transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{mod.title}</p>
                  <p className="text-xs text-muted-foreground">{mod.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* ── Managed servers list ── */}
      {servers && servers.length > 0 && (
        <div>
          <p className="section-header mb-3">Managed Servers</p>
          <div className="space-y-2">
            {servers.map((server: any, i: number) => (
              <motion.div
                key={server.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 + 0.2 }}
                className="feature-card rounded-xl p-3 flex items-center gap-3"
              >
                {server.iconUrl ? (
                  <img src={server.iconUrl} alt={server.name} className="w-9 h-9 rounded-xl flex-shrink-0" />
                ) : (
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-display font-bold flex-shrink-0 text-white"
                    style={{ background: "linear-gradient(135deg, #B11226, #FF2D4D)" }}
                  >
                    {initials(server.name)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{server.name}</p>
                  <p className="text-xs text-muted-foreground stats-monospace">
                    {(server.memberCount || 0).toLocaleString()} members
                  </p>
                </div>
                <Button size="sm" variant="outline" className="border-white/10 text-xs flex-shrink-0" asChild>
                  <Link href={`/dashboard/servers/${server.id}`}>Open</Link>
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
