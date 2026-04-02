import { Link } from "wouter";
import { SiDiscord, SiGithub } from "react-icons/si";
import { ArrowRight, Zap, Palette, Shield, Users } from "lucide-react";
import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import archivistLogo from "@assets/FDEBE754-F9DF-41D4-A19B-B2933432B230_1772114960531.png";
import dashboardArt from "@assets/dashboard-art.png";

const RED = "#e0001a";
const RED_GLOW = "rgba(224, 0, 26, 0.22)";
const RED_DIM = "rgba(224, 0, 26, 0.08)";
const RED_BORDER = "rgba(224, 0, 26, 0.3)";

// Deterministic star positions — 3 depth layers
const STARS_BACK = [
  { top: "6%",  left: "8%",  s: 1.5, op: 0.18, dur: 7,  del: 0   },
  { top: "12%", left: "55%", s: 1,   op: 0.14, dur: 9,  del: 1.2 },
  { top: "18%", left: "88%", s: 1.5, op: 0.16, dur: 8,  del: 2.4 },
  { top: "32%", left: "22%", s: 1,   op: 0.12, dur: 11, del: 0.8 },
  { top: "45%", left: "72%", s: 1.5, op: 0.15, dur: 7,  del: 3.1 },
  { top: "58%", left: "40%", s: 1,   op: 0.13, dur: 10, del: 1.7 },
  { top: "70%", left: "91%", s: 1.5, op: 0.17, dur: 8,  del: 0.4 },
  { top: "82%", left: "15%", s: 1,   op: 0.12, dur: 9,  del: 2.9 },
  { top: "91%", left: "62%", s: 1.5, op: 0.14, dur: 6,  del: 1.5 },
];

const STARS_MID = [
  { top: "4%",  left: "33%", s: 2,   op: 0.28, dur: 5,  del: 0.6 },
  { top: "22%", left: "5%",  s: 2.5, op: 0.24, dur: 7,  del: 2.0 },
  { top: "28%", left: "80%", s: 2,   op: 0.3,  dur: 6,  del: 1.1 },
  { top: "50%", left: "18%", s: 2.5, op: 0.22, dur: 8,  del: 3.4 },
  { top: "62%", left: "58%", s: 2,   op: 0.26, dur: 5,  del: 0.3 },
  { top: "75%", left: "85%", s: 2.5, op: 0.2,  dur: 7,  del: 1.8 },
  { top: "88%", left: "44%", s: 2,   op: 0.25, dur: 6,  del: 2.6 },
];

const STARS_FRONT = [
  { top: "9%",  left: "68%", s: 3.5, op: 0.38, dur: 4,  del: 0.9 },
  { top: "35%", left: "92%", s: 3,   op: 0.32, dur: 5,  del: 2.2 },
  { top: "52%", left: "3%",  s: 3.5, op: 0.36, dur: 4,  del: 0.5 },
  { top: "78%", left: "30%", s: 3,   op: 0.3,  dur: 6,  del: 3.0 },
];

function StarLayer({ stars, parallaxSpeed }: { stars: typeof STARS_BACK; parallaxSpeed: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onScroll = () => {
      if (ref.current) {
        ref.current.style.transform = `translateY(${window.scrollY * parallaxSpeed}px)`;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [parallaxSpeed]);

  return (
    <div ref={ref} className="absolute inset-0 will-change-transform">
      {stars.map((s, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            top: s.top,
            left: s.left,
            width: s.s,
            height: s.s,
            borderRadius: "50%",
            background: "#fff",
            opacity: s.op,
            animation: `twinkle ${s.dur}s ease-in-out ${s.del}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

export default function Landing() {
  const { data: user } = useAuth();
  const bloomRef = useRef<HTMLDivElement>(null);

  // Subtle mouse-tracking light shift on the bloom
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!bloomRef.current) return;
      const xPct = (e.clientX / window.innerWidth - 0.5) * 30;
      const yPct = (e.clientY / window.innerHeight - 0.5) * 20;
      bloomRef.current.style.transform = `translate(calc(-50% + ${xPct}px), ${yPct}px)`;
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ background: "#050507", color: "#f0ecee" }}>

      {/* ── Keyframe animations ───────────────────────────────────── */}
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: var(--op, 0.2); transform: scale(1); }
          50%       { opacity: calc(var(--op, 0.2) * 0.25); transform: scale(0.6); }
        }
        @keyframes pulse-bloom {
          0%, 100% { opacity: 1;    transform: translate(-50%, 0) scale(1);    }
          50%       { opacity: 0.75; transform: translate(-50%, 0) scale(1.08); }
        }
        @keyframes pulse-logo {
          0%, 100% { filter: drop-shadow(0 0 20px rgba(224,0,26,0.55)) drop-shadow(0 0 55px rgba(224,0,26,0.22)); }
          50%       { filter: drop-shadow(0 0 32px rgba(224,0,26,0.75)) drop-shadow(0 0 80px rgba(224,0,26,0.35)); }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .landing-fade-1 { animation: fade-up 0.7s ease both 0.1s; }
        .landing-fade-2 { animation: fade-up 0.7s ease both 0.25s; }
        .landing-fade-3 { animation: fade-up 0.7s ease both 0.4s; }
        .landing-fade-4 { animation: fade-up 0.7s ease both 0.55s; }
      `}</style>

      {/* ── Grain overlay ─────────────────────────────────────────── */}
      <div
        className="pointer-events-none fixed inset-0 z-[1] opacity-[0.032]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "160px 160px",
        }}
      />

      {/* ── Stars ─────────────────────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <StarLayer stars={STARS_BACK}  parallaxSpeed={0.04} />
        <StarLayer stars={STARS_MID}   parallaxSpeed={0.09} />
        <StarLayer stars={STARS_FRONT} parallaxSpeed={0.16} />
      </div>

      {/* ── Animated hero bloom ───────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div
          ref={bloomRef}
          className="absolute -top-32 left-1/2 h-[750px] w-[1100px] transition-transform duration-[1200ms] ease-out"
          style={{
            transform: "translate(-50%, 0)",
            background: "radial-gradient(ellipse at center, rgba(224,0,26,0.15) 0%, rgba(180,0,20,0.07) 38%, transparent 65%)",
            animation: "pulse-bloom 8s ease-in-out infinite",
          }}
        />
        {/* Deep background blood glow — bottom */}
        <div
          className="absolute bottom-0 left-1/2 h-[400px] w-[900px] -translate-x-1/2"
          style={{
            background: "radial-gradient(ellipse at center, rgba(160,0,15,0.08) 0%, transparent 65%)",
          }}
        />
      </div>

      {/* ── Faint grid accent lines ───────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-[0.035]">
        {/* Horizontal lines */}
        {[18, 38, 58, 78].map((pct) => (
          <div
            key={pct}
            className="absolute w-full"
            style={{
              top: `${pct}%`,
              height: 1,
              background: "linear-gradient(to right, transparent 5%, rgba(224,0,26,0.7) 30%, rgba(224,0,26,0.7) 70%, transparent 95%)",
            }}
          />
        ))}
        {/* Vertical lines */}
        {[20, 50, 80].map((pct) => (
          <div
            key={pct}
            className="absolute h-full"
            style={{
              left: `${pct}%`,
              width: 1,
              background: "linear-gradient(to bottom, transparent 5%, rgba(224,0,26,0.5) 30%, rgba(224,0,26,0.5) 70%, transparent 95%)",
            }}
          />
        ))}
      </div>

      {/* ── Header ───────────────────────────────────────────────── */}
      <header
        className="relative z-10 sticky top-0"
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(5,5,7,0.86)",
          backdropFilter: "blur(22px)",
          WebkitBackdropFilter: "blur(22px)",
        }}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 overflow-hidden rounded-[9px]" style={{ border: "1px solid rgba(255,255,255,0.08)", background: "#111115" }}>
              <img src={archivistLogo} alt="Archivist" className="h-full w-full object-cover" />
            </div>
            <span className="text-[15px] font-bold tracking-tight" style={{ fontFamily: "var(--font-display)", color: "#f0ecee" }}>
              Archivist
            </span>
          </Link>
          <div className="flex items-center gap-3">
            {user ? (
              <Link href="/dashboard">
                <button className="text-[13px] font-semibold" style={{ background: RED, color: "#fff", padding: "7px 18px", borderRadius: "9px", letterSpacing: "-0.01em", boxShadow: `0 0 18px ${RED_GLOW}` }}>
                  Dashboard
                </button>
              </Link>
            ) : (
              <>
                <a href="/auth/discord" className="hidden sm:block text-[13px] font-medium" style={{ color: "rgba(240,236,238,0.4)" }}>Login</a>
                <Link href="/dashboard">
                  <button className="text-[13px] font-semibold" style={{ background: RED, color: "#fff", padding: "7px 18px", borderRadius: "9px", letterSpacing: "-0.01em", boxShadow: `0 0 18px ${RED_GLOW}` }}>
                    Get Started
                  </button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Main ─────────────────────────────────────────────────── */}
      <main className="relative z-10 mx-auto max-w-7xl px-4 pt-16 pb-16 md:px-6 md:pt-24">

        <section className="text-center">

          {/* Logo */}
          <div className="relative inline-block mb-8 landing-fade-1">
            <div className="absolute inset-0 -z-10 scale-[2] blur-[50px] opacity-50"
              style={{ background: "radial-gradient(ellipse, rgba(224,0,26,0.6) 0%, transparent 70%)" }} />
            <img
              src={archivistLogo}
              alt="Archivist"
              style={{ width: 110, height: 110, borderRadius: 22, display: "block", animation: "pulse-logo 4s ease-in-out infinite" }}
            />
          </div>

          {/* Eyebrow */}
          <div className="flex justify-center mb-7 landing-fade-2">
            <div className="inline-flex items-center gap-2 rounded-full text-[10px] font-bold uppercase tracking-[0.22em] px-3.5 py-1.5"
              style={{ border: `1px solid ${RED_BORDER}`, background: RED_DIM, color: "#ff5060" }}>
              <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: RED, boxShadow: `0 0 8px ${RED}, 0 0 14px ${RED}` }} />
              Discord Control System
            </div>
          </div>

          <h1
            className="mx-auto max-w-4xl font-bold leading-[1.07] text-4xl md:text-[5.25rem] landing-fade-3"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.03em", color: "#f0ecee" }}
          >
            Build the server.
            <br />
            <span style={{ color: "rgba(240,236,238,0.22)" }}>Not a pile of modules.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-[15px] leading-relaxed md:text-[17px] landing-fade-4"
            style={{ color: "rgba(240,236,238,0.38)" }}>
            One dark workspace. Commands, design, and community — unified under four clean pillars.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-3 landing-fade-4">
            <Link href="/dashboard">
              <button
                className="flex items-center gap-2 text-[14px] font-semibold"
                style={{ background: RED, color: "#fff", padding: "13px 30px", borderRadius: "11px", letterSpacing: "-0.01em", boxShadow: `0 4px 32px ${RED_GLOW}, 0 0 0 1px rgba(224,0,26,0.2)` }}
              >
                Open Dashboard <ArrowRight size={14} />
              </button>
            </Link>
            {!user && (
              <a href="/auth/discord">
                <button
                  className="flex items-center gap-2 text-[14px] font-medium"
                  style={{ background: "rgba(255,255,255,0.04)", color: "rgba(240,236,238,0.58)", padding: "13px 26px", borderRadius: "11px", border: "1px solid rgba(255,255,255,0.09)" }}
                >
                  <SiDiscord size={14} /> Login with Discord
                </button>
              </a>
            )}
          </div>
        </section>

        {/* Dashboard screenshot */}
        <section className="mt-20">
          <div
            className="mx-auto max-w-5xl rounded-[22px] p-[1px]"
            style={{
              background: `linear-gradient(135deg, ${RED_BORDER} 0%, rgba(255,255,255,0.05) 50%, rgba(224,0,26,0.1) 100%)`,
              boxShadow: `0 0 90px rgba(224,0,26,0.09), 0 40px 80px rgba(0,0,0,0.5)`,
            }}
          >
            <div className="overflow-hidden rounded-[21px] relative" style={{ background: "#09090b" }}>
              <div className="flex items-center gap-1.5 px-4"
                style={{ height: 38, borderBottom: "1px solid rgba(255,255,255,0.05)", background: "#0d0d10" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: RED, boxShadow: `0 0 6px ${RED}` }} />
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(255,255,255,0.1)" }} />
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(255,255,255,0.1)" }} />
              </div>
              <img src={dashboardArt} alt="Archivist Dashboard" className="w-full h-auto block" style={{ opacity: 0.92 }} />
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: "linear-gradient(to top, rgba(5,5,7,0.9) 0%, rgba(5,5,7,0.1) 35%, transparent 55%)" }} />
            </div>
          </div>
        </section>

        {/* Feature pills */}
        <section className="mt-10 flex flex-wrap justify-center gap-2.5">
          {[
            { icon: <Zap size={12} />, label: "Slash Commands" },
            { icon: <Palette size={12} />, label: "Embed Studio" },
            { icon: <Shield size={12} />, label: "Moderation" },
            { icon: <Users size={12} />, label: "Community Tools" },
          ].map(({ icon, label }) => (
            <div key={label} className="flex items-center gap-2 rounded-full px-4 py-2 text-[12px] font-medium"
              style={{ background: "#0d0d10", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(240,236,238,0.42)" }}>
              <span style={{ color: RED }}>{icon}</span>
              {label}
            </div>
          ))}
        </section>
      </main>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="relative z-10" style={{ borderTop: "1px solid rgba(255,255,255,0.055)" }}>
        <div className="mx-auto max-w-7xl px-4 py-14 md:px-6">
          <div className="grid grid-cols-2 gap-10 md:grid-cols-4">

            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="h-7 w-7 overflow-hidden rounded-[8px]" style={{ border: "1px solid rgba(255,255,255,0.08)", background: "#111115" }}>
                  <img src={archivistLogo} alt="Archivist" className="h-full w-full object-cover" />
                </div>
                <span className="text-[14px] font-bold tracking-tight" style={{ fontFamily: "var(--font-display)", color: "#f0ecee" }}>Archivist</span>
              </div>
              <p className="text-[12px] leading-relaxed mb-5" style={{ color: "rgba(240,236,238,0.28)" }}>
                Discord server management,<br />done right.
              </p>
              <div className="flex items-center gap-2.5">
                {[
                  { href: "/auth/discord", icon: <SiDiscord size={14} /> },
                  { href: "https://github.com", icon: <SiGithub size={14} /> },
                ].map(({ href, icon }) => (
                  <a key={href} href={href} className="flex items-center justify-center rounded-[8px]"
                    style={{ width: 32, height: 32, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(240,236,238,0.45)" }}>
                    {icon}
                  </a>
                ))}
              </div>
            </div>

            {[
              {
                title: "Product",
                links: [
                  { label: "Dashboard", href: "/dashboard" },
                  { label: "Commands", href: "/dashboard" },
                  { label: "Embed Studio", href: "/dashboard" },
                  { label: "Server Tools", href: "/dashboard" },
                ],
              },
              {
                title: "Resources",
                links: [
                  { label: "Documentation", href: "#" },
                  { label: "Support Server", href: "/auth/discord" },
                  { label: "Changelog", href: "#" },
                  { label: "Status", href: "#" },
                ],
              },
              {
                title: "Legal",
                links: [
                  { label: "Privacy Policy", href: "#" },
                  { label: "Terms of Service", href: "#" },
                ],
              },
            ].map(({ title, links }) => (
              <div key={title}>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-4" style={{ color: "rgba(240,236,238,0.22)" }}>{title}</p>
                <ul className="space-y-2.5">
                  {links.map(({ label, href }) => (
                    <li key={label}>
                      <a href={href} className="text-[13px]" style={{ color: "rgba(240,236,238,0.4)" }}>{label}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3"
            style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <p className="text-[11px]" style={{ color: "rgba(240,236,238,0.18)" }}>
              &copy; {new Date().getFullYear()} Archivist Control Systems. All rights reserved.
            </p>
            <div className="flex items-center gap-1.5">
              <span style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: "#1FA971", boxShadow: "0 0 6px #1FA971" }} />
              <span className="text-[11px]" style={{ color: "rgba(240,236,238,0.26)" }}>All systems operational</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
