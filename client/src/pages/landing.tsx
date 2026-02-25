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
  Smile,
  Layout,
  Hash
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStats } from "@/hooks/use-bot";

export default function Landing() {
  const { data: stats } = useStats();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 100 }
    }
  };

  const features = [
    { icon: Shield, title: "Advanced Automod", desc: "Six configurable filters, raid protection, whitelists, and automatic action escalation to keep your server safe." },
    { icon: Terminal, title: "Custom Commands", desc: "Create powerful commands with variables, embed responses, cooldowns, role restrictions, and a live preview." },
    { icon: BarChart, title: "Audit Logging", desc: "Multi-channel logging with separate feeds for messages, members, moderation, server changes, and voice events." },
    { icon: UserPlus, title: "Welcome & Leave", desc: "Greet new members and say goodbye with customizable messages, embeds, DMs, and auto-role assignment." },
    { icon: TrendingUp, title: "Leveling & XP", desc: "Engage your community with an XP system, role rewards, multipliers, leaderboards, and level-up notifications." },
    { icon: Smile, title: "Reaction Roles", desc: "Let members self-assign roles by reacting to messages. Supports toggle, add-only, and exclusive group modes." },
    { icon: Star, title: "Starboard", desc: "Highlight the best messages in a dedicated channel when they receive enough star reactions." },
    { icon: Ticket, title: "Ticket System", desc: "Support tickets with custom panels, categories, transcripts, and configurable naming schemes." },
    { icon: Layout, title: "Embed Builder", desc: "Full Discord Components v2 builder with sections, separators, media galleries, containers, and live preview." },
    { icon: Clock, title: "Scheduled Messages", desc: "Automate recurring announcements with cron scheduling, timezone support, and embed integration." },
    { icon: Hash, title: "Channel Settings", desc: "Per-channel configuration for slowmode, content restrictions, automod overrides, and lockdown." },
    { icon: MessageSquare, title: "Warnings System", desc: "Track warnings per user with automatic punishment escalation — mute, kick, or ban at configurable thresholds." },
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 rounded-full blur-[150px] pointer-events-none opacity-50" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-accent/20 rounded-full blur-[120px] pointer-events-none opacity-40" />

      <nav className="relative z-10 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center box-glow">
            <Bot className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-2xl tracking-tight text-glow">NexBot</span>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" className="hidden md:flex hover:text-primary hover:bg-primary/10">
            Features
          </Button>
          <Button variant="ghost" className="hidden md:flex hover:text-primary hover:bg-primary/10">
            Commands
          </Button>
          <Button asChild className="rounded-full px-6 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground box-glow hover:scale-105 transition-all duration-300">
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 relative z-10 max-w-7xl mx-auto w-full pt-12 pb-24">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="flex flex-col items-center w-full"
        >
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8">
            <Zap className="w-4 h-4" />
            <span>v2.0 — Full Components v2 Support</span>
          </motion.div>

          <motion.h1 
            variants={itemVariants}
            className="text-5xl md:text-7xl lg:text-8xl font-display font-extrabold tracking-tighter leading-tight mb-6"
          >
            The Ultimate <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-primary text-glow">Discord Bot</span>
          </motion.h1>

          <motion.p 
            variants={itemVariants}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10"
          >
            Power up your community with 12+ configurable modules — automoderation, leveling, tickets, reaction roles, and a stunning web dashboard.
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 mb-20">
            <Button size="lg" className="rounded-full px-8 h-14 text-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground box-glow hover:scale-105 transition-all duration-300 gap-2">
              Add to Discord <ArrowRight className="w-5 h-5" />
            </Button>
            <Button size="lg" variant="outline" asChild className="rounded-full px-8 h-14 text-lg font-semibold border-white/10 hover:bg-white/5 hover:text-white transition-all duration-300 glass-card">
              <Link href="/dashboard">Open Dashboard</Link>
            </Button>
          </motion.div>

          <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 w-full border-y border-white/5 py-8 bg-background/30 backdrop-blur-sm">
            {[
              { label: "Active Servers", value: stats?.totalServers ? `${(stats.totalServers / 1000).toFixed(1)}k+` : "12.4k+" },
              { label: "Total Members", value: stats?.totalMembers ? `${(stats.totalMembers / 1000000).toFixed(1)}M+` : "2.1M+" },
              { label: "Commands Executed", value: stats?.commandsExecuted ? `${(stats.commandsExecuted / 1000000).toFixed(1)}M+` : "45M+" },
              { label: "Uptime", value: stats?.uptime || "99.99%" },
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center justify-center">
                <span className="text-3xl md:text-4xl font-display font-bold text-foreground mb-1 text-glow" data-testid={`text-stat-${stat.label.toLowerCase().replace(/\s/g, "-")}`}>{stat.value}</span>
                <span className="text-sm text-muted-foreground font-medium uppercase tracking-wider">{stat.label}</span>
              </div>
            ))}
          </motion.div>

          <motion.div variants={itemVariants} className="mt-24 w-full">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Everything You Need</h2>
            <p className="text-muted-foreground mb-12 max-w-xl mx-auto">12+ modules to manage, moderate, and engage your community — all configurable from one dashboard.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 text-left">
              {features.map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-card p-5 rounded-2xl hover:border-primary/50 transition-colors duration-300 group"
                >
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center mb-3 group-hover:bg-primary/20 group-hover:text-primary transition-colors duration-300">
                    <feature.icon className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                  </div>
                  <h3 className="font-display font-bold text-base mb-1.5">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

        </motion.div>
      </main>
    </div>
  );
}
