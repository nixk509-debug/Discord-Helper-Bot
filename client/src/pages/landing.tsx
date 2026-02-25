import { motion } from "framer-motion";
import { Link } from "wouter";
import { 
  Bot, 
  Shield, 
  Zap, 
  BarChart, 
  ArrowRight,
  Terminal,
  MessageSquare,
  UserPlus,
  TrendingUp,
  Star,
  Ticket,
  Clock,
  Layout,
  Hash,
  Crown,
  Workflow,
  Coins,
  Users,
  Activity,
  Globe
} from "lucide-react";
import { SiDiscord } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { useStats } from "@/hooks/use-bot";
import { useAuth, getAvatarUrl } from "@/hooks/use-auth";
import { useState, useEffect } from "react";

function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const duration = 1800;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [target]);

  if (target >= 1000000) {
    return <span>{(count / 1000000).toFixed(1)}M{suffix}</span>;
  }
  if (target >= 1000) {
    return <span>{(count / 1000).toFixed(1)}k{suffix}</span>;
  }
  return <span>{count}{suffix}</span>;
}

export default function Landing() {
  const { data: stats } = useStats();
  const { data: user } = useAuth();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } }
  };

  const features = [
    { icon: Workflow, title: "Visual Automation Builder", desc: "Node-based flow editor — drag, connect, and automate. Like Zapier for Discord, but built into your dashboard.", highlight: true },
    { icon: Coins, title: "Full Server Economy", desc: "Complete virtual economy with role shop, gambling, daily rewards, and leaderboards. What only economy bots had — now built in.", highlight: true },
    { icon: Users, title: "Member Intelligence CRM", desc: "Per-member profiles, mod notes, activity timeline, and bulk operations. Real member management for serious servers.", highlight: true },
    { icon: Shield, title: "Advanced Automod", desc: "Six configurable filters, raid protection, whitelists, and automatic action escalation to keep your server safe." },
    { icon: Terminal, title: "Custom Commands", desc: "Create powerful commands with variables, HTTP requests, embed responses, cooldowns, role restrictions, and a live preview." },
    { icon: BarChart, title: "Activity Heatmap", desc: "7×24 hour grid showing your server's peak activity times. Plus command analytics, growth charts, and engagement scores." },
    { icon: Layout, title: "Interactive Embed Builder", desc: "Full Discord Components v2 builder with buttons, select menus, JSON sync, and template library. Post live interactive embeds." },
    { icon: UserPlus, title: "Welcome & Leave", desc: "Greet new members and say goodbye with customizable messages, embeds, DMs, and auto-role assignment." },
    { icon: TrendingUp, title: "Leveling & XP", desc: "Engage your community with an XP system, role rewards, multipliers, leaderboards, and level-up notifications." },
    { icon: Star, title: "Starboard", desc: "Highlight the best messages in a dedicated channel when they receive enough star reactions." },
    { icon: Ticket, title: "Ticket System", desc: "Support tickets with custom panels, categories, transcripts, and configurable naming schemes." },
    { icon: Globe, title: "HTTP Request Actions", desc: "Make real API calls from custom commands — weather, crypto, Minecraft status, any REST endpoint. No other bot does this." },
    { icon: Clock, title: "Scheduled Messages", desc: "Automate recurring announcements with cron scheduling, timezone support, and embed integration." },
    { icon: Hash, title: "Channel Settings", desc: "Per-channel configuration for slowmode, content restrictions, automod overrides, and lockdown." },
    { icon: MessageSquare, title: "Warnings System", desc: "Track warnings per user with automatic punishment escalation — mute, kick, or ban at configurable thresholds." },
    { icon: Activity, title: "Persistent Variables", desc: "Store server and user variables across commands. Build stateful bots that remember context between interactions." },
  ];

  const statItems = [
    { label: "Active Servers", value: stats?.totalServers || 12400, suffix: "+" },
    { label: "Total Members", value: stats?.totalMembers || 2100000, suffix: "+" },
    { label: "Commands Executed", value: stats?.commandsExecuted || 45000000, suffix: "+" },
    { label: "Uptime", value: 9999, suffix: "%" },
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      <nav className="relative z-20 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center box-glow">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <span className="font-display font-bold text-2xl tracking-tight text-glow">Archivist</span>
        </div>
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" className="hidden md:flex">
            <Link href="/premium">
              <Crown className="w-4 h-4 mr-1" /> Premium
            </Link>
          </Button>
          {user ? (
            <Button asChild className="rounded-full px-6 font-semibold box-glow" style={{ background: "linear-gradient(135deg, hsl(0,72%,51%), hsl(340,75%,55%))" }}>
              <Link href="/dashboard">
                <img src={getAvatarUrl(user)} alt="" className="w-5 h-5 rounded-full mr-2" />
                Dashboard
              </Link>
            </Button>
          ) : (
            <Button asChild className="rounded-full px-6 font-semibold bg-[#5865F2] hover:bg-[#4752C4] text-white" data-testid="button-landing-login">
              <a href="/auth/discord">
                <SiDiscord className="w-4 h-4 mr-2" /> Login with Discord
              </a>
            </Button>
          )}
        </div>
      </nav>

      <section className="relative z-10 gradient-hero py-28 px-4 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full blur-[200px]" style={{ background: "hsl(0 72% 51% / 0.12)" }} />
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full blur-[150px]" style={{ background: "hsl(340 75% 55% / 0.10)" }} />
        </div>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="max-w-6xl mx-auto flex flex-col items-center text-center"
        >
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8">
            <Zap className="w-4 h-4" />
            <span>The bot dashboard NO one else has built</span>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-6xl md:text-8xl lg:text-9xl font-display font-extrabold tracking-tighter leading-tight mb-6"
          >
            <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(135deg, hsl(0,72%,51%), hsl(340,75%,55%))" }}>
              Archivist
            </span>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-xl md:text-2xl text-muted-foreground max-w-3xl mb-6 leading-relaxed"
          >
            The last Discord bot you'll ever need — built around <span className="text-foreground font-semibold">YOUR server's logic</span>
          </motion.p>

          <motion.p
            variants={itemVariants}
            className="text-base text-muted-foreground max-w-2xl mb-12"
          >
            Visual automation flows, a complete server economy, member CRM with individual profiles, activity heatmaps, interactive embed components, HTTP request actions, and 15+ deeply configurable modules.
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 mb-20">
            <Button
              size="lg"
              className="rounded-full px-10 h-14 text-lg font-semibold text-white box-glow gap-2"
              style={{ background: "linear-gradient(135deg, hsl(0,72%,51%), hsl(340,75%,55%))" }}
            >
              Add to Discord <ArrowRight className="w-5 h-5" />
            </Button>
            <Button size="lg" variant="outline" asChild className="rounded-full px-10 h-14 text-lg font-semibold border-white/10 glass-card">
              <Link href="/dashboard">Open Dashboard</Link>
            </Button>
          </motion.div>

          <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-12 w-full border-y border-white/5 py-10">
            {statItems.map((stat, i) => (
              <div key={i} className="flex flex-col items-center justify-center">
                <span className="text-3xl md:text-4xl font-display font-bold text-foreground mb-1 text-glow" data-testid={`text-stat-${stat.label.toLowerCase().replace(/\s/g, "-")}`}>
                  <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                </span>
                <span className="text-sm text-muted-foreground font-medium uppercase tracking-wider">{stat.label}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      <main className="flex-1 flex flex-col items-center px-4 py-24 relative z-10 max-w-7xl mx-auto w-full">
        <div className="w-full">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">
              Features No One Else Has
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              15+ modules to manage, moderate, and engage your community — all configurable from one dashboard.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 text-left">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
                className={`glass-card p-5 rounded-2xl transition-colors duration-300 group relative overflow-hidden ${feature.highlight ? "border-primary/20" : ""}`}
              >
                {feature.highlight && (
                  <div className="absolute top-0 left-0 w-1 h-full rounded-l-2xl" style={{ background: "linear-gradient(180deg, hsl(0,72%,51%), hsl(340,75%,55%))" }} />
                )}
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-colors duration-300 ${feature.highlight ? "bg-primary/15 text-primary" : "bg-secondary group-hover:bg-primary/15 group-hover:text-primary"}`}>
                  <feature.icon className={`w-5 h-5 ${feature.highlight ? "text-primary" : "text-muted-foreground group-hover:text-primary"}`} />
                </div>
                <h3 className="font-display font-bold text-base mb-1.5">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                {feature.highlight && (
                  <span className="mt-3 inline-block text-xs font-semibold uppercase tracking-wider text-primary">Exclusive</span>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        <div className="w-full mt-32 text-center">
          <div className="relative rounded-3xl overflow-hidden p-12 md:p-20" style={{ background: "linear-gradient(135deg, hsl(0,20%,10%), hsl(340,20%,12%))" }}>
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-0 w-full h-full opacity-30" style={{ background: "linear-gradient(135deg, hsl(0,72%,51%,0.15), transparent 50%, hsl(340,75%,55%,0.15))" }} />
            </div>
            <div className="relative z-10">
              <h2 className="text-4xl md:text-6xl font-display font-extrabold mb-6 text-glow">
                Ready to take control?
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
                Join thousands of server admins who have switched to Archivist. Setup takes under 60 seconds.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  className="rounded-full px-10 h-14 text-lg font-semibold text-white box-glow gap-2"
                  style={{ background: "linear-gradient(135deg, hsl(0,72%,51%), hsl(340,75%,55%))" }}
                >
                  <SiDiscord className="w-5 h-5" />
                  Add Archivist to Discord
                </Button>
                {!user && (
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="rounded-full px-10 h-14 text-lg font-semibold border-white/10 glass-card"
                    data-testid="button-landing-login-bottom"
                  >
                    <a href="/auth/discord">
                      <SiDiscord className="w-4 h-4 mr-2" /> Login with Discord
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/5 py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            <span className="font-display font-bold text-lg">Archivist</span>
          </div>
          <p className="text-sm text-muted-foreground">Built for serious Discord communities.</p>
        </div>
      </footer>
    </div>
  );
}
