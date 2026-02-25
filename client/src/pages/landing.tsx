import { motion } from "framer-motion";
import { Link } from "wouter";
import { 
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
  Globe,
  Check,
  X,
  ChevronRight
} from "lucide-react";
import { SiDiscord } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { useStats } from "@/hooks/use-bot";
import { useAuth, getAvatarUrl } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import archivistAvatar from "@assets/archivist-avatar.png";
import dashboardArt from "@assets/dashboard-art.png";

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

  if (target >= 1000000) return <span>{(count / 1000000).toFixed(1)}M{suffix}</span>;
  if (target >= 1000) return <span>{(count / 1000).toFixed(1)}k{suffix}</span>;
  return <span>{count}{suffix}</span>;
}

const COMPARE_FEATURES = [
  "Visual Flow Builder",
  "HTTP Request Actions",
  "Economy System",
  "Member CRM",
  "Activity Heatmap",
  "Interactive Embeds",
  "Persistent Variables",
];

const HOW_IT_WORKS = [
  { step: "01", icon: UserPlus, title: "Add the Bot", desc: "Invite Archivist to your Discord server with one click. No complicated setup." },
  { step: "02", icon: Layout, title: "Configure Modules", desc: "Use the dashboard to enable and configure 15+ modules. Each one is deeply customizable." },
  { step: "03", icon: TrendingUp, title: "Watch It Thrive", desc: "Your server runs on automation. Focus on your community — let Archivist handle the rest." },
];

export default function Landing() {
  const { data: stats } = useStats();
  const { data: user } = useAuth();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } }
  };

  const features = [
    { icon: Workflow, title: "Visual Automation Builder", desc: "Node-based flow editor — drag, connect, and automate. Like Zapier for Discord, built into your dashboard.", highlight: true },
    { icon: Coins, title: "Full Server Economy", desc: "Complete virtual economy with role shop, gambling, daily rewards, and leaderboards. What only economy bots had — now built in.", highlight: true },
    { icon: Users, title: "Member Intelligence CRM", desc: "Per-member profiles, mod notes, activity timeline, and bulk operations. Real member management for serious servers.", highlight: true },
    { icon: Globe, title: "HTTP Request Actions", desc: "Make real API calls from custom commands — weather, crypto, Minecraft status, any REST endpoint. No other bot does this.", highlight: true },
    { icon: Shield, title: "Advanced Automod", desc: "Six configurable filters, raid protection, whitelists, and automatic action escalation to keep your server safe." },
    { icon: Terminal, title: "Custom Commands", desc: "Create powerful commands with 100+ variables, symbols board, HTTP requests, embed responses, and a live preview." },
    { icon: BarChart, title: "Activity Heatmap", desc: "7×24 hour grid showing your server's peak activity times. Plus command analytics, growth charts, and engagement scores." },
    { icon: Layout, title: "Interactive Embed Builder", desc: "Full Discord Components v2 builder with buttons, select menus, JSON sync, and template library." },
    { icon: UserPlus, title: "Welcome & Leave", desc: "Greet new members and say goodbye with customizable messages, embeds, DMs, and auto-role assignment." },
    { icon: TrendingUp, title: "Leveling & XP", desc: "Engage your community with an XP system, role rewards, multipliers, leaderboards, and level-up notifications." },
    { icon: Star, title: "Starboard", desc: "Highlight the best messages in a dedicated channel when they receive enough star reactions." },
    { icon: Ticket, title: "Ticket System", desc: "Support tickets with custom panels, categories, transcripts, and configurable naming schemes." },
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

      <nav className="relative z-20 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl overflow-hidden box-glow flex-shrink-0">
            <img src={archivistAvatar} alt="Archivist" className="w-full h-full object-cover" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight text-glow">Archivist</span>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" className="hidden md:flex text-muted-foreground hover:text-foreground">
            <Link href="/premium">
              <Crown className="w-4 h-4 mr-1.5 text-yellow-400" /> Premium
            </Link>
          </Button>
          {user ? (
            <Button asChild className="rounded-full px-5 font-semibold box-glow text-sm" style={{ background: "linear-gradient(135deg, hsl(0,72%,51%), hsl(340,75%,55%))" }}>
              <Link href="/dashboard">
                <img src={getAvatarUrl(user)} alt="" className="w-5 h-5 rounded-full mr-2" />
                Dashboard
              </Link>
            </Button>
          ) : (
            <Button asChild className="rounded-full px-5 font-semibold bg-[#5865F2] hover:bg-[#4752C4] text-white text-sm" data-testid="button-landing-login">
              <a href="/auth/discord">
                <SiDiscord className="w-4 h-4 mr-2" /> Login with Discord
              </a>
            </Button>
          )}
        </div>
      </nav>

      <section className="relative z-10 gradient-hero py-24 px-4 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/3 w-[800px] h-[800px] rounded-full blur-[200px]" style={{ background: "hsl(0 72% 51% / 0.12)" }} />
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full blur-[150px]" style={{ background: "hsl(340 75% 55% / 0.10)" }} />
        </div>

        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="flex-1 flex flex-col items-start text-left"
          >
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
              <Zap className="w-3.5 h-3.5" />
              <span>The bot dashboard NO one else has built</span>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="text-6xl md:text-7xl lg:text-8xl font-display font-extrabold tracking-tighter leading-tight mb-5"
            >
              <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(135deg, hsl(0,72%,51%), hsl(340,75%,55%))" }}>
                Archivist
              </span>
              <span className="block text-foreground text-4xl md:text-5xl lg:text-6xl mt-1">for Discord</span>
            </motion.h1>

            <motion.p variants={itemVariants} className="text-lg md:text-xl text-muted-foreground max-w-xl mb-4 leading-relaxed">
              The last Discord bot you'll ever need — built around <span className="text-foreground font-semibold">YOUR server's logic</span>
            </motion.p>

            <motion.div variants={itemVariants} className="flex flex-wrap gap-2 mb-8">
              {["✗ MEE6 — no flow builder", "✗ Carl-bot — no HTTP actions", "✗ Dyno — no economy"].map((pill) => (
                <span key={pill} className="inline-flex items-center px-2.5 py-1 rounded-full bg-destructive/10 border border-destructive/20 text-xs text-destructive/90 font-medium line-through decoration-destructive/50">
                  {pill}
                </span>
              ))}
            </motion.div>

            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-3 mb-10">
              <Button
                size="lg"
                className="rounded-full px-8 h-12 text-base font-semibold text-white box-glow gap-2"
                style={{ background: "linear-gradient(135deg, hsl(0,72%,51%), hsl(340,75%,55%))" }}
              >
                Add to Discord <ArrowRight className="w-4 h-4" />
              </Button>
              <Button size="lg" variant="outline" asChild className="rounded-full px-8 h-12 text-base font-semibold border-white/10 glass-card">
                <Link href="/dashboard">Open Dashboard <ChevronRight className="w-4 h-4 ml-1" /></Link>
              </Button>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="grid grid-cols-2 gap-3 sm:grid-cols-4 w-full glass-card rounded-2xl px-6 py-4 border-t-2"
              style={{ borderImage: "linear-gradient(90deg, hsl(0,72%,51%), hsl(340,75%,55%)) 1" }}
            >
              {statItems.map((stat, i) => (
                <div key={i} className="flex flex-col items-center justify-center text-center py-2">
                  <span className="text-2xl md:text-3xl font-display font-bold text-foreground text-glow" data-testid={`text-stat-${stat.label.toLowerCase().replace(/\s/g, "-")}`}>
                    <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                  </span>
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-0.5">{stat.label}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40, rotate: 3 }}
            animate={{ opacity: 1, x: 0, rotate: 4 }}
            transition={{ type: "spring", stiffness: 80, delay: 0.4 }}
            className="hidden lg:block flex-shrink-0 w-[420px]"
            style={{ animation: "float 6s ease-in-out infinite" }}
          >
            <div
              className="rounded-2xl overflow-hidden"
              style={{ boxShadow: "0 0 60px -10px hsl(0 72% 51% / 0.5), 0 0 30px -5px hsl(340 75% 55% / 0.3)" }}
            >
              <img src={dashboardArt} alt="Archivist Dashboard" className="w-full" />
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-20 px-4 max-w-7xl mx-auto w-full">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-3">How It Works</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">Up and running in under 60 seconds. No coding required.</p>
        </div>
        <div className="relative flex flex-col md:flex-row gap-6 md:gap-0 items-start">
          <div className="hidden md:block absolute top-10 left-[calc(16.67%+20px)] right-[calc(16.67%+20px)] h-px border-t-2 border-dashed border-primary/30" />
          {HOW_IT_WORKS.map(({ step, icon: Icon, title, desc }) => (
            <div key={step} className="flex-1 flex flex-col items-center text-center relative px-6">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 relative z-10 text-white font-display font-bold text-xl box-glow"
                style={{ background: "linear-gradient(135deg, hsl(0,72%,51%), hsl(340,75%,55%))" }}
              >
                {step}
              </div>
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center mb-3">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-display font-bold text-lg mb-2">{title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <main className="flex-1 flex flex-col items-center px-4 pb-24 relative z-10 max-w-7xl mx-auto w-full">
        <div className="w-full mb-24">
          <div className="text-center mb-12">
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
                className={`glass-card p-5 rounded-2xl transition-colors duration-300 group relative overflow-hidden ${feature.highlight ? "border-primary/25 bg-primary/3" : ""}`}
              >
                {feature.highlight && (
                  <>
                    <div className="absolute top-0 left-0 w-1 h-full rounded-l-2xl" style={{ background: "linear-gradient(180deg, hsl(0,72%,51%), hsl(340,75%,55%))" }} />
                    <div className="absolute top-2 right-2">
                      <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full text-primary border border-primary/30 bg-primary/10">Exclusive</span>
                    </div>
                  </>
                )}
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 transition-colors duration-300 ${feature.highlight ? "bg-primary/15 text-primary" : "bg-secondary group-hover:bg-primary/15"}`}>
                  <feature.icon className={`w-4.5 h-4.5 ${feature.highlight ? "text-primary" : "text-muted-foreground group-hover:text-primary"}`} />
                </div>
                <h3 className="font-display font-bold text-sm mb-1.5">{feature.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="w-full mb-24">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-3">How We Stack Up</h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm">Features that exist exclusively in Archivist — not available in any mainstream Discord bot.</p>
          </div>
          <div className="glass-card rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left p-4 font-semibold text-muted-foreground">Feature</th>
                  {["Archivist", "MEE6", "Carl-bot", "Dyno"].map((bot) => (
                    <th key={bot} className={`p-4 text-center font-semibold ${bot === "Archivist" ? "text-primary" : "text-muted-foreground"}`}>
                      {bot}
                      {bot === "Archivist" && <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 border border-primary/30">Us</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARE_FEATURES.map((feature, i) => (
                  <tr key={feature} className={`border-b border-white/5 ${i % 2 === 0 ? "bg-white/[0.01]" : ""}`}>
                    <td className="p-4 font-medium">{feature}</td>
                    <td className="p-4 text-center">
                      <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                    </td>
                    {["MEE6", "Carl-bot", "Dyno"].map((bot) => (
                      <td key={bot} className="p-4 text-center">
                        <X className="w-4 h-4 text-destructive/60 mx-auto" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="w-full text-center">
          <div className="relative rounded-3xl overflow-hidden p-12 md:p-20" style={{ background: "linear-gradient(135deg, hsl(0,20%,10%), hsl(340,20%,12%))" }}>
            <div className="absolute inset-0 pointer-events-none opacity-30" style={{ background: "linear-gradient(135deg, hsl(0,72%,51%,0.2), transparent 50%, hsl(340,75%,55%,0.2))" }} />
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl overflow-hidden mx-auto mb-6 box-glow">
                <img src={archivistAvatar} alt="Archivist" className="w-full h-full object-cover" />
              </div>
              <h2 className="text-4xl md:text-5xl font-display font-extrabold mb-4 text-glow">
                Ready to take control?
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                Join thousands of server admins who have switched to Archivist. Setup takes under 60 seconds.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  className="rounded-full px-10 h-12 text-base font-semibold text-white box-glow gap-2"
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
                    className="rounded-full px-10 h-12 text-base font-semibold border-white/10 glass-card"
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
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg overflow-hidden">
              <img src={archivistAvatar} alt="Archivist" className="w-full h-full object-cover" />
            </div>
            <span className="font-display font-bold text-base">Archivist</span>
          </div>
          <p className="text-sm text-muted-foreground">Built for serious Discord communities.</p>
        </div>
      </footer>

      <style>{`
        @keyframes float {
          0%, 100% { transform: rotate(4deg) translateY(0); }
          50% { transform: rotate(4deg) translateY(-14px); }
        }
      `}</style>
    </div>
  );
}
