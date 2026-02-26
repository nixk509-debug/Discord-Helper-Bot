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
  ChevronRight,
  Menu,
  ExternalLink
} from "lucide-react";
import { SiDiscord } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useStats } from "@/hooks/use-bot";
import { useAuth, getAvatarUrl } from "@/hooks/use-auth";
import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import archivistAvatar from "@assets/archivist-avatar.png";
import dashboardArt from "@assets/dashboard-art.png";
import archivistLogo from "@assets/FDEBE754-F9DF-41D4-A19B-B2933432B230_1772114960531.png";

function TypingCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState("");
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    let current = 0;
    const targetStr = target.toString();
    const interval = setInterval(() => {
      if (current < targetStr.length) {
        setDisplayValue(targetStr.slice(0, current + 1));
        current++;
      } else {
        clearInterval(interval);
        setTimeout(() => setIsDone(true), 200);
      }
    }, 30);
    return () => clearInterval(interval);
  }, [target]);

  const formatted = target >= 1000000 
    ? (target / 1000000).toFixed(1) + "M"
    : target >= 1000 
      ? (target / 1000).toFixed(1) + "k"
      : displayValue;

  return (
    <span className={`stats-monospace relative ${isDone ? 'animate-pulse' : ''}`}>
      {formatted}{suffix}
      {!isDone && <span className="inline-block w-[0.6em] h-[1em] bg-primary ml-1 animate-pulse">▮</span>}
    </span>
  );
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

const FEATURES = [
  {
    icon: Workflow,
    title: "Visual Automation Builder",
    desc: "Node-based flow editor — drag, connect, and automate. Like Zapier for Discord, built into your dashboard.",
    highlight: true,
    details: "Build complex automation flows without writing a single line of code. Chain triggers like message reactions, member joins, or time schedules to actions like sending embeds, assigning roles, calling webhooks, or updating persistent variables.",
    examples: ["Auto-assign roles when a member reaches level 10", "Send a DM when someone joins a specific channel", "Post a webhook notification to your external service on keyword match"],
  },
  {
    icon: Coins,
    title: "Full Server Economy",
    desc: "Complete virtual economy with role shop, gambling, daily rewards, and leaderboards. What only economy bots had — now built in.",
    highlight: true,
    details: "Run a full virtual currency system inside your server. Members earn currency through activity, daily claims, and admin grants — then spend it in the role shop or try their luck with built-in gambling commands.",
    examples: ["Role shop: unlock exclusive roles for earned currency", "Daily rewards: members claim a daily currency bonus", "Leaderboard: see who's richest in your server"],
  },
  {
    icon: Users,
    title: "Member Intelligence CRM",
    desc: "Per-member profiles, mod notes, activity timeline, and bulk operations. Real member management for serious servers.",
    highlight: true,
    details: "Every member gets a profile page with their join date, warning history, mod notes, activity score, and role history. Filter and bulk-operate on members — perfect for large community servers.",
    examples: ["Add private mod notes visible only to moderators", "View a member's full activity timeline", "Bulk-assign or remove roles based on activity filters"],
  },
  {
    icon: Globe,
    title: "HTTP Request Actions",
    desc: "Make real API calls from custom commands — weather, crypto, Minecraft status, any REST endpoint. No other bot does this.",
    highlight: true,
    details: "Custom commands can make live HTTP GET requests and inject the response into the bot's reply. Connect to any public API — no coding required. Just paste the URL and pick the data field you want.",
    examples: ["!weather London — fetches live weather from an open API", "!mcstatus play.myserver.com — shows Minecraft server status", "!price ETH — pulls live crypto price from CoinGecko"],
  },
  {
    icon: Shield,
    title: "Advanced Automod",
    desc: "Six configurable filters, raid protection, whitelists, and automatic action escalation to keep your server safe.",
    highlight: false,
    details: "Six independent automod filters — spam, links, caps, emoji spam, mass mentions, and Discord invite links. Configure per-channel overrides, time-based rules, and automatic escalation from warn → mute → kick → ban.",
    examples: ["Raid protection: lock the server when join rate spikes", "Auto-mute members who hit 3 spam violations", "Whitelist specific roles from automod checks"],
  },
  {
    icon: Terminal,
    title: "Custom Commands",
    desc: "Create powerful commands with 100+ variables, symbols board, HTTP requests, embed responses, and a live preview.",
    highlight: false,
    details: "A full command editor with 6 tabs: response builder, variable reference (100+), symbols board, HTTP integration, permissions, and live preview. Commands can have conditions, cooldowns, role requirements, and random response variations.",
    examples: ["Variable-rich responses: {user.mention} welcome to {server.name}!", "Condition-based replies depending on user roles", "Up to 5 random response variations per command"],
  },
  {
    icon: BarChart,
    title: "Activity Heatmap",
    desc: "7×24 hour grid showing your server's peak activity times. Plus command analytics, growth charts, and engagement scores.",
    highlight: false,
    details: "Understand when your community is most active. The activity heatmap shows message density across all 7 days and 24 hours. Combine with the growth chart and command analytics to make data-driven decisions.",
    examples: ["Plan announcements during peak activity windows", "Track member growth over time", "See which custom commands get used most"],
  },
  {
    icon: Layout,
    title: "Interactive Embed Builder",
    desc: "Full Discord Components v2 builder with buttons, select menus, JSON sync, and template library.",
    highlight: false,
    details: "Build rich Discord embeds visually — add buttons, select menus, and full styling with the Components v2 editor. Import/export raw JSON, save reusable templates, and preview exactly how it looks before sending.",
    examples: ["Create a verification panel with a button click", "Build a role selection menu with dropdown", "Save embed templates to reuse across servers"],
  },
  {
    icon: UserPlus,
    title: "Welcome & Leave",
    desc: "Greet new members and say goodbye with customizable messages, embeds, DMs, and auto-role assignment.",
    highlight: false,
    details: "Welcome and leave messages support rich embeds, variable substitution, onboarding DM sequences, and optional auto-role assignment. Every new member gets a professional, custom greeting.",
    examples: ["Send a welcome DM with server rules on join", "Post a goodbye message in a log channel", "Auto-assign a @Member role on arrival"],
  },
  {
    icon: TrendingUp,
    title: "Leveling & XP",
    desc: "Engage your community with an XP system, role rewards, multipliers, leaderboards, and level-up notifications.",
    highlight: false,
    details: "A full XP leveling system with configurable gain rates, channel multipliers, role rewards at specific levels, and a live leaderboard. Members get notified when they level up with a custom message.",
    examples: ["Grant @VIP role at level 25", "2x XP in the #active-chat channel", "Custom level-up message with {user.mention}"],
  },
  {
    icon: Star,
    title: "Starboard",
    desc: "Highlight the best messages in a dedicated channel when they receive enough star reactions.",
    highlight: false,
    details: "Set a star reaction threshold and target channel. Messages that get enough ⭐ reactions are automatically reposted in your starboard channel with full formatting and a link back to the original.",
    examples: ["Highlight great memes in #best-of", "Set different thresholds for different channels", "Ignore specific channels from starboard tracking"],
  },
  {
    icon: Ticket,
    title: "Ticket System",
    desc: "Support tickets with custom panels, categories, transcripts, and configurable naming schemes.",
    highlight: false,
    details: "A full support ticket system with interactive button panels, department routing, custom naming, and HTML transcripts. Staff get ping alerts, and closed tickets are saved for review.",
    examples: ["Multi-department routing (Support, Sales, Appeals)", "HTML transcript sent to a log channel on close", "Custom button panels with multiple ticket types"],
  },
  {
    icon: Clock,
    title: "Scheduled Messages",
    desc: "Automate recurring announcements with cron scheduling, timezone support, and embed integration.",
    highlight: false,
    details: "Schedule any message or embed to post at a specific time or on a recurring cron schedule. Supports timezone configuration so your announcements arrive when your community expects them.",
    examples: ["Daily server recap every night at 9 PM EST", "Weekly event reminder every Monday at noon", "Monthly newsletter in your announcements channel"],
  },
  {
    icon: Hash,
    title: "Channel Settings",
    desc: "Per-channel configuration for slowmode, content restrictions, automod overrides, and lockdown.",
    highlight: false,
    details: "Override global settings per channel — different slowmode values, specific automod rules, content restrictions, and lockdown controls. Grant moderators granular control without touching server-wide settings.",
    examples: ["#general: slowmode enabled, links blocked", "#staff: automod whitelisted completely", "#announcements: read-only lockdown toggle"],
  },
  {
    icon: MessageSquare,
    title: "Warnings System",
    desc: "Track warnings per user with automatic punishment escalation — mute, kick, or ban at configurable thresholds.",
    highlight: false,
    details: "Issue warnings to members with reasons that are logged and displayed in their profile. Configure automatic punishment escalation: 3 warns → mute, 5 warns → kick, 7 warns → ban. Mods can also review and clear warnings.",
    examples: ["3 warns triggers a 24h mute automatically", "Warning history visible in member profile", "Bulk clear warnings for a member after appeal"],
  },
  {
    icon: Activity,
    title: "Persistent Variables",
    desc: "Store server and user variables across commands. Build stateful bots that remember context between interactions.",
    highlight: false,
    details: "Create and update key-value variables tied to a server or user. Use them in custom command responses to build stateful interactions — track game scores, trivia answers, or custom counters that persist across sessions.",
    examples: ["Track a user's trivia score across sessions", "Store a server-wide event countdown variable", "Increment a custom command usage counter"],
  },
];

export default function Landing() {
  const { data: stats } = useStats();
  const { data: user } = useAuth();
  const { data: inviteData } = useQuery<{ url: string }>({ queryKey: ["/api/invite-url"] });
  const [selectedFeature, setSelectedFeature] = useState<typeof FEATURES[0] | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleInvite = useCallback(() => {
    if (inviteData?.url) window.open(inviteData.url, "_blank");
  }, [inviteData]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } }
  };

  const statItems = [
    { label: "Active Servers", value: stats?.totalServers || 12400, suffix: "+" },
    { label: "Total Members", value: stats?.totalMembers || 2100000, suffix: "+" },
    { label: "Commands Executed", value: stats?.commandsExecuted || 45000000, suffix: "+" },
    { label: "Uptime", value: 9999, suffix: "%" },
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">

      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-background/90 backdrop-blur-xl border-b border-white/8 shadow-lg shadow-black/20" : "bg-transparent"}`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 flex-shrink-0">
            <div className="w-9 h-9 rounded-xl overflow-hidden box-glow flex-shrink-0">
              <img src={archivistLogo} alt="Archivist" className="w-full h-full object-cover" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight text-glow">Archivist</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            <a href="#features" className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-white/5">Features</a>
            <a href="#compare" className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-white/5">Compare</a>
            <Link href="/premium" className="px-4 py-2 text-sm text-muted-foreground hover:text-yellow-400 transition-colors rounded-lg hover:bg-white/5 flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5 text-yellow-400" /> Premium
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleInvite}
              size="sm"
              className="hidden md:flex rounded-full px-4 h-9 text-sm font-semibold text-white box-glow gap-1.5"
              style={{ background: "linear-gradient(135deg, hsl(0,72%,51%), hsl(340,75%,55%))" }}
              data-testid="button-nav-invite"
            >
              <SiDiscord className="w-3.5 h-3.5" /> Add to Discord
            </Button>
            {user ? (
              <Button asChild size="sm" variant="outline" className="rounded-full px-4 h-9 text-sm font-semibold border-white/15 hidden md:flex">
                <a href="/dashboard">
                  <img src={getAvatarUrl(user)} alt="" className="w-5 h-5 rounded-full mr-1.5" />
                  Dashboard
                </a>
              </Button>
            ) : (
              <Button asChild size="sm" className="rounded-full px-4 h-9 text-sm font-semibold bg-[#5865F2] hover:bg-[#4752C4] text-white hidden md:flex" data-testid="button-nav-login">
                <a href="/auth/discord">
                  <SiDiscord className="w-3.5 h-3.5 mr-1.5" /> Login
                </a>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden px-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              <Menu className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-background/95 backdrop-blur-xl border-b border-white/8 px-6 py-4 space-y-2">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-white/5">Features</a>
            <a href="#compare" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-white/5">Compare</a>
            <Link href="/premium" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm text-yellow-400/80 hover:text-yellow-400 rounded-lg hover:bg-white/5">
              <Crown className="w-3.5 h-3.5" /> Premium
            </Link>
            <div className="pt-2 flex flex-col gap-2">
              <Button onClick={handleInvite} className="w-full rounded-lg text-sm font-semibold text-white gap-2" style={{ background: "linear-gradient(135deg, hsl(0,72%,51%), hsl(340,75%,55%))" }}>
                <SiDiscord className="w-4 h-4" /> Add to Discord
              </Button>
              {user ? (
                <Button asChild variant="outline" className="w-full rounded-lg border-white/15">
                  <a href="/dashboard">Dashboard</a>
                </Button>
              ) : (
                <Button asChild className="w-full rounded-lg bg-[#5865F2] hover:bg-[#4752C4] text-white">
                  <a href="/auth/discord"><SiDiscord className="w-4 h-4 mr-2" /> Login with Discord</a>
                </Button>
              )}
            </div>
          </div>
        )}
      </nav>

      <div className="pt-[72px]" />

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
                onClick={handleInvite}
                className="rounded-full px-8 h-12 text-base font-semibold text-white box-glow gap-2"
                style={{ background: "linear-gradient(135deg, hsl(0,72%,51%), hsl(340,75%,55%))" }}
                data-testid="button-hero-invite"
              >
                Add to Discord <ArrowRight className="w-4 h-4" />
              </Button>
              <Button size="lg" variant="outline" asChild className="rounded-full px-8 h-12 text-base font-semibold border-white/10 glass-card">
                {user ? (
                  <a href="/dashboard">Open Dashboard <ChevronRight className="w-4 h-4 ml-1" /></a>
                ) : (
                  <a href="/auth/discord">Open Dashboard <ChevronRight className="w-4 h-4 ml-1" /></a>
                )}
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
                    <TypingCounter target={stat.value} suffix={stat.suffix} />
                  </span>
                  <span className="section-header mt-1">{stat.label}</span>
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

      <main id="features" className="flex-1 flex flex-col items-center px-4 pb-24 relative z-10 max-w-7xl mx-auto w-full">
        <div className="w-full mb-24">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">
              Features No One Else Has
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              15+ modules to manage, moderate, and engage your community — click any card to learn more.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 text-left">
            {FEATURES.map((feature, i) => (
              <motion.button
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
                onClick={() => setSelectedFeature(feature)}
                data-testid={`button-feature-${feature.title.toLowerCase().replace(/\s+/g, "-")}`}
                className={`feature-card p-5 rounded-2xl transition-all duration-300 group relative overflow-hidden text-left w-full cursor-pointer hover:scale-[1.02] active:scale-[0.99] ${feature.highlight ? "border-primary/25 bg-primary/3" : ""}`}
              >
                <div className="glitch-fragment" />
                {feature.highlight && (
                  <>
                    <div className="absolute top-0 left-0 w-1 h-full rounded-l-2xl" style={{ background: "linear-gradient(180deg, #B11226, #FF2D4D)" }} />
                    <div className="absolute top-2 right-2">
                      <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full text-primary border border-primary/30 bg-primary/10">Exclusive</span>
                    </div>
                  </>
                )}
                <div className={`icon-container w-9 h-9 rounded-lg flex items-center justify-center mb-3 transition-colors duration-300 ${feature.highlight ? "bg-primary/15 text-primary" : "bg-secondary group-hover:bg-primary/15"}`}>
                  <feature.icon className={`w-4.5 h-4.5 ${feature.highlight ? "text-primary" : "text-muted-foreground group-hover:text-primary"}`} />
                </div>
                <h3 className="font-display font-bold text-sm mb-1.5">{feature.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{feature.desc}</p>
                <div className="mt-3 flex items-center gap-1 text-xs text-primary/70 group-hover:text-primary transition-colors">
                  <span>Learn more</span>
                  <ChevronRight className="w-3 h-3" />
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        <div id="compare" className="w-full mb-24">
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
              <div className="w-20 h-20 rounded-2xl overflow-hidden mx-auto mb-6 box-glow">
                <img src={archivistLogo} alt="Archivist" className="w-full h-full object-cover" />
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
                  onClick={handleInvite}
                  className="rounded-full px-10 h-12 text-base font-semibold text-white box-glow gap-2"
                  style={{ background: "linear-gradient(135deg, hsl(0,72%,51%), hsl(340,75%,55%))" }}
                  data-testid="button-cta-invite"
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
                    data-testid="button-cta-login"
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

      <footer className="relative z-10 border-t border-white/5 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl overflow-hidden box-glow">
                  <img src={archivistLogo} alt="Archivist" className="w-full h-full object-cover" />
                </div>
                <span className="font-display font-bold text-lg text-glow">Archivist</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
                The most powerful Discord bot dashboard — visual automation, economy, member CRM, and 15+ configurable modules.
              </p>
            </div>
            <div>
              <p className="section-header mb-4">Product</p>
              <ul className="space-y-2.5">
                <li><a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a></li>
                <li><Link href="/premium" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Premium</Link></li>
                <li><Link href="/marketplace" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Marketplace</Link></li>
                <li>
                  <button onClick={handleInvite} className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
                    Add to Discord <ExternalLink className="w-3 h-3" />
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <p className="section-header mb-4">Account</p>
              <ul className="space-y-2.5">
                {user ? (
                  <>
                    <li><Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Dashboard</Link></li>
                    <li><Link href="/dashboard/preferences" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Preferences</Link></li>
                  </>
                ) : (
                  <li><a href="/auth/discord" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Login with Discord</a></li>
                )}
              </ul>
            </div>
          </div>
          <div className="border-t border-white/5 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Archivist. Built for serious Discord communities.</p>
            <div className="flex items-center gap-4">
              <button onClick={handleInvite} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
                <SiDiscord className="w-3.5 h-3.5" /> Add Bot
              </button>
            </div>
          </div>
        </div>
      </footer>

      <Dialog open={!!selectedFeature} onOpenChange={(open) => !open && setSelectedFeature(null)}>
        <DialogContent className="glass-panel border-white/10 max-w-lg">
          {selectedFeature && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-1">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${selectedFeature.highlight ? "bg-primary/15" : "bg-secondary"}`}>
                    <selectedFeature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <DialogTitle className="font-display text-base">{selectedFeature.title}</DialogTitle>
                    {selectedFeature.highlight && (
                      <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full text-primary border border-primary/30 bg-primary/10">Exclusive</span>
                    )}
                  </div>
                </div>
                <DialogDescription className="text-sm leading-relaxed text-muted-foreground pt-1">
                  {selectedFeature.details}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">Examples</p>
                <ul className="space-y-2">
                  {selectedFeature.examples.map((ex, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>{ex}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Button
                asChild
                className="w-full mt-2 rounded-xl font-semibold text-white gap-2"
                style={{ background: "linear-gradient(135deg, hsl(0,72%,51%), hsl(340,75%,55%))" }}
                data-testid="button-feature-modal-dashboard"
              >
                {user ? (
                  <a href="/dashboard" onClick={() => setSelectedFeature(null)}>
                    Open in Dashboard <ChevronRight className="w-4 h-4" />
                  </a>
                ) : (
                  <a href="/auth/discord" onClick={() => setSelectedFeature(null)}>
                    Open in Dashboard <ChevronRight className="w-4 h-4" />
                  </a>
                )}
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>

      <style>{`
        @keyframes float {
          0%, 100% { transform: rotate(4deg) translateY(0); }
          50% { transform: rotate(4deg) translateY(-14px); }
        }
      `}</style>
    </div>
  );
}
