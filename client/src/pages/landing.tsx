import { motion } from "framer-motion";
import { Link } from "wouter";
import {
  Shield, Zap, BarChart, ArrowRight, Terminal, MessageSquare, UserPlus,
  TrendingUp, Star, Ticket, Clock, Layout, Hash, Crown, Workflow, Coins,
  Users, Activity, Globe, Check, X, ChevronRight, Menu, ExternalLink,
  Layers, Code2, Gamepad2,
} from "lucide-react";
import { SiDiscord, SiGithub } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useStats } from "@/hooks/use-bot";
import { useAuth, getAvatarUrl } from "@/hooks/use-auth";
import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
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

// ── Sparkle star background ──────────────────────────────────────
const STARS = [
  { top: "8%",  left: "6%",  size: 10, delay: "0s",   dur: "3.2s" },
  { top: "15%", left: "88%", size: 7,  delay: "0.8s",  dur: "2.8s" },
  { top: "28%", left: "72%", size: 14, delay: "1.4s",  dur: "4s"   },
  { top: "42%", left: "3%",  size: 8,  delay: "0.3s",  dur: "3.5s" },
  { top: "55%", left: "92%", size: 6,  delay: "2s",    dur: "2.6s" },
  { top: "62%", left: "18%", size: 12, delay: "0.6s",  dur: "3.8s" },
  { top: "75%", left: "80%", size: 9,  delay: "1.1s",  dur: "3s"   },
  { top: "85%", left: "44%", size: 5,  delay: "1.7s",  dur: "2.9s" },
  { top: "20%", left: "34%", size: 7,  delay: "2.3s",  dur: "3.4s" },
  { top: "35%", left: "58%", size: 11, delay: "0.5s",  dur: "4.2s" },
  { top: "68%", left: "63%", size: 6,  delay: "1.9s",  dur: "2.7s" },
  { top: "90%", left: "12%", size: 8,  delay: "0.9s",  dur: "3.1s" },
  { top: "5%",  left: "51%", size: 9,  delay: "1.5s",  dur: "3.7s" },
  { top: "50%", left: "27%", size: 6,  delay: "2.1s",  dur: "3.3s" },
  { top: "78%", left: "95%", size: 7,  delay: "0.4s",  dur: "2.5s" },
];

function StarField() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      {STARS.map((s, i) => (
        <div
          key={i}
          className="star"
          style={{
            top: s.top,
            left: s.left,
            width: s.size,
            height: s.size,
            animation: `star-twinkle ${s.dur} ${s.delay} ease-in-out infinite`,
            filter: "drop-shadow(0 0 4px #FF2D4D)",
          }}
        />
      ))}
      {/* sweep arcs */}
      <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.12 }} xmlns="http://www.w3.org/2000/svg">
        <path d="M-100 400 Q 400 -100 900 400" fill="none" stroke="#FF2D4D" strokeWidth="1.5"
          strokeDasharray="800" strokeDashoffset="800"
          style={{ animation: "sweep-arc 8s 1s linear infinite" }} />
        <path d="M 200 800 Q 700 200 1200 600" fill="none" stroke="#B11226" strokeWidth="1"
          strokeDasharray="900" strokeDashoffset="900"
          style={{ animation: "sweep-arc 11s 4s linear infinite" }} />
      </svg>
    </div>
  );
}

// ── Module pills ──────────────────────────────────────────────────
const PILLS = [
  { label: "Slash Commands", icon: Code2 },
  { label: "Embed Studio",   icon: Layers },
  { label: "Moderation",     icon: Shield },
  { label: "Community Tools",icon: Users  },
];

export default function Landing() {
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


  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">

      <StarField />

      {/* ── Nav ── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-background/90 backdrop-blur-xl border-b border-white/8 shadow-lg shadow-black/20" : "bg-transparent"}`}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 rounded-xl overflow-hidden box-glow flex-shrink-0">
              <img src={archivistLogo} alt="Archivist" className="w-full h-full object-cover" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight text-glow">Archivist</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            <a href="#features" className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-white/5">Features</a>
            <a href="#compare" className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-white/5">Compare</a>
            <Link href="/premium" className="px-3 py-2 text-sm text-muted-foreground hover:text-yellow-400 transition-colors rounded-lg hover:bg-white/5 flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5 text-yellow-400" /> Premium
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="rounded-full px-5 h-9 text-sm font-semibold text-white hidden md:flex"
              style={{ background: "linear-gradient(135deg, #B11226, #FF2D4D)" }}
              asChild
            >
              {user ? (
                <a href="/dashboard">Dashboard</a>
              ) : (
                <a href="/auth/discord">Dashboard</a>
              )}
            </Button>
            <Button variant="ghost" size="sm" className="md:hidden px-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              <Menu className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-background/95 backdrop-blur-xl border-b border-white/8 px-6 py-4 space-y-2">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-white/5">Features</a>
            <a href="#compare" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-white/5">Compare</a>
            <div className="pt-2">
              <Button className="w-full rounded-lg text-sm font-semibold text-white" style={{ background: "linear-gradient(135deg, #B11226, #FF2D4D)" }} asChild>
                {user ? <a href="/dashboard">Dashboard</a> : <a href="/auth/discord">Dashboard</a>}
              </Button>
            </div>
          </div>
        )}
      </nav>

      <div className="pt-[72px]" />

      {/* ── Hero ── */}
      <section className="relative z-10 py-28 px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="max-w-3xl mx-auto flex flex-col items-center"
        >
          {/* Logo / mascot */}
          <div
            className="w-24 h-24 rounded-3xl overflow-hidden mb-8 flex-shrink-0"
            style={{ boxShadow: "0 0 60px -10px #FF2D4D, 0 0 30px -5px #B11226" }}
          >
            <img src={archivistLogo} alt="Archivist" className="w-full h-full object-cover" />
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold tracking-widest uppercase mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Discord Control System
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-display font-extrabold tracking-tighter leading-tight mb-4">
            <span className="text-foreground">Build the server.</span>
            <span className="block text-muted-foreground/50">Not a pile of modules.</span>
          </h1>

          <p className="text-base md:text-lg text-muted-foreground max-w-xl mb-10 leading-relaxed">
            One dark workspace. Commands, design, and community — unified under four clean pillars.
          </p>

          {/* CTA */}
          <Button
            size="lg"
            className="rounded-full px-10 h-12 text-base font-semibold text-white gap-2 box-glow"
            style={{ background: "linear-gradient(135deg, #B11226, #FF2D4D)" }}
            asChild
            data-testid="button-hero-dashboard"
          >
            {user ? (
              <a href="/dashboard">Open Dashboard <ArrowRight className="w-4 h-4" /></a>
            ) : (
              <a href="/auth/discord">Open Dashboard <ArrowRight className="w-4 h-4" /></a>
            )}
          </Button>
        </motion.div>
      </section>

      {/* ── Workspace preview ── */}
      <section className="relative z-10 py-16 px-4">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="rounded-2xl overflow-hidden border border-white/10"
            style={{ boxShadow: "0 0 60px -15px rgba(177,18,38,0.4)" }}
          >
            {/* Window chrome */}
            <div className="bg-[#111418] border-b border-white/5 px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/70" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <div className="w-3 h-3 rounded-full bg-green-500/70" />
              </div>
              <span className="text-xs text-muted-foreground font-mono ml-2">Archivist Workspace</span>
            </div>
            {/* Module tiles */}
            <div className="bg-[#0B0D10] p-4 grid grid-cols-2 gap-3">
              {[
                { icon: Code2,    label: "Commands",   sub: "12 active" },
                { icon: Layers,   label: "Studio",     sub: "4 drafts"  },
                { icon: Gamepad2, label: "Fun & Creative", sub: ""      },
                { icon: Shield,   label: "Moderation", sub: "OK"        },
              ].map(({ icon: Icon, label, sub }) => (
                <div key={label} className="feature-card rounded-xl p-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{label}</p>
                    {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Module pills ── */}
      <section className="relative z-10 py-8 px-4">
        <div className="max-w-2xl mx-auto flex flex-wrap justify-center gap-3">
          {PILLS.map(({ label, icon: Icon }) => (
            <a
              key={label}
              href="#features"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card border border-white/8 text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all duration-200"
            >
              <Icon className="w-3.5 h-3.5 text-primary" />
              {label}
            </a>
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

      <footer className="relative z-10 border-t border-white/5 py-14 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl overflow-hidden box-glow">
                  <img src={archivistLogo} alt="Archivist" className="w-full h-full object-cover" />
                </div>
                <span className="font-display font-bold text-base text-glow">Archivist</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                Discord server management, done right.
              </p>
              <div className="flex items-center gap-3">
                <a href="https://discord.gg" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-[#5865F2] transition-colors">
                  <SiDiscord className="w-4 h-4" />
                </a>
                <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                  <SiGithub className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Product */}
            <div>
              <p className="section-header mb-4">Product</p>
              <ul className="space-y-2.5">
                <li><Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Dashboard</Link></li>
                <li><a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Commands</a></li>
                <li><a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Embed Studio</a></li>
                <li><a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Server Tools</a></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <p className="section-header mb-4">Resources</p>
              <ul className="space-y-2.5">
                <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Documentation</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Support Server</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Changelog</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Status</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <p className="section-header mb-4">Legal</p>
              <ul className="space-y-2.5">
                <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/5 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Archivist Control Systems. All rights reserved.</p>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
              <span className="text-xs text-muted-foreground">All systems operational</span>
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

    </div>
  );
}
