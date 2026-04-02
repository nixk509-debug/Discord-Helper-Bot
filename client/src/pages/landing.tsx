import { Link } from "wouter";
import { SiDiscord, SiGithub } from "react-icons/si";
import { ArrowRight, Zap, Palette, Shield, Users } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import archivistLogo from "@assets/FDEBE754-F9DF-41D4-A19B-B2933432B230_1772114960531.png";
import dashboardArt from "@assets/dashboard-art.png";

// Red pulled directly from the logo: pure glowing red, not crimson
const RED = "#e0001a";
const RED_GLOW = "rgba(224, 0, 26, 0.22)";
const RED_DIM = "rgba(224, 0, 26, 0.08)";
const RED_BORDER = "rgba(224, 0, 26, 0.3)";

export default function Landing() {
  const { data: user } = useAuth();

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ background: "#050507", color: "#f0ecee" }}>

      {/* Grain — matte texture */}
      <div
        className="pointer-events-none fixed inset-0 z-[1] opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "160px 160px",
        }}
      />

      {/* Hero bloom — centered, intense */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div
          className="absolute -top-20 left-1/2 h-[800px] w-[1100px] -translate-x-1/2"
          style={{
            background: `radial-gradient(ellipse at center, rgba(224,0,26,0.14) 0%, rgba(180,0,20,0.07) 38%, transparent 65%)`,
          }}
        />
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
            <div
              className="h-8 w-8 overflow-hidden rounded-[9px]"
              style={{ border: "1px solid rgba(255,255,255,0.08)", background: "#111115" }}
            >
              <img src={archivistLogo} alt="Archivist" className="h-full w-full object-cover" />
            </div>
            <span
              className="text-[15px] font-bold tracking-tight"
              style={{ fontFamily: "var(--font-display)", color: "#f0ecee" }}
            >
              Archivist
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {user ? (
              <Link href="/dashboard">
                <button
                  className="text-[13px] font-semibold transition-opacity hover:opacity-85"
                  style={{
                    background: RED,
                    color: "#fff",
                    padding: "7px 18px",
                    borderRadius: "9px",
                    letterSpacing: "-0.01em",
                    boxShadow: `0 0 18px ${RED_GLOW}`,
                  }}
                >
                  Dashboard
                </button>
              </Link>
            ) : (
              <>
                <a
                  href="/auth/discord"
                  className="hidden sm:block text-[13px] font-medium"
                  style={{ color: "rgba(240,236,238,0.4)" }}
                >
                  Login
                </a>
                <Link href="/dashboard">
                  <button
                    className="text-[13px] font-semibold transition-opacity hover:opacity-85"
                    style={{
                      background: RED,
                      color: "#fff",
                      padding: "7px 18px",
                      borderRadius: "9px",
                      letterSpacing: "-0.01em",
                      boxShadow: `0 0 18px ${RED_GLOW}`,
                    }}
                  >
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

        {/* Hero */}
        <section className="text-center">

          {/* Logo — large, glowing, centrepiece */}
          <div className="relative inline-block mb-8">
            {/* Bloom behind the logo */}
            <div
              className="absolute inset-0 -z-10 scale-[1.8] blur-[40px] opacity-60"
              style={{ background: `radial-gradient(ellipse, rgba(224,0,26,0.55) 0%, transparent 70%)` }}
            />
            <img
              src={archivistLogo}
              alt="Archivist"
              className="relative"
              style={{
                width: 110,
                height: 110,
                borderRadius: 22,
                display: "block",
                filter: "drop-shadow(0 0 24px rgba(224,0,26,0.6)) drop-shadow(0 0 60px rgba(224,0,26,0.25))",
              }}
            />
          </div>

          {/* Eyebrow pill */}
          <div className="flex justify-center mb-7">
            <div
              className="inline-flex items-center gap-2 rounded-full text-[10px] font-bold uppercase tracking-[0.22em] px-3.5 py-1.5"
              style={{
                border: `1px solid ${RED_BORDER}`,
                background: RED_DIM,
                color: "#ff5060",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: RED,
                  boxShadow: `0 0 8px ${RED}, 0 0 14px ${RED}`,
                }}
              />
              Discord Control System
            </div>
          </div>

          <h1
            className="mx-auto max-w-4xl font-bold leading-[1.07] text-4xl md:text-[5.25rem]"
            style={{
              fontFamily: "var(--font-display)",
              letterSpacing: "-0.03em",
              color: "#f0ecee",
            }}
          >
            Build the server.
            <br />
            <span style={{ color: "rgba(240,236,238,0.22)" }}>Not a pile of modules.</span>
          </h1>

          <p
            className="mx-auto mt-6 max-w-xl text-[15px] leading-relaxed md:text-[17px]"
            style={{ color: "rgba(240,236,238,0.38)" }}
          >
            One dark workspace. Commands, design, and community — unified under four clean pillars.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link href="/dashboard">
              <button
                className="flex items-center gap-2 text-[14px] font-semibold transition-opacity hover:opacity-85"
                style={{
                  background: RED,
                  color: "#fff",
                  padding: "13px 30px",
                  borderRadius: "11px",
                  letterSpacing: "-0.01em",
                  boxShadow: `0 4px 32px ${RED_GLOW}, 0 0 0 1px rgba(224,0,26,0.2)`,
                }}
              >
                Open Dashboard <ArrowRight size={14} />
              </button>
            </Link>
            {!user && (
              <a href="/auth/discord">
                <button
                  className="flex items-center gap-2 text-[14px] font-medium transition-opacity hover:opacity-80"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    color: "rgba(240,236,238,0.58)",
                    padding: "13px 26px",
                    borderRadius: "11px",
                    border: "1px solid rgba(255,255,255,0.09)",
                  }}
                >
                  <SiDiscord size={14} />
                  Login with Discord
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
              boxShadow: `0 0 80px rgba(224,0,26,0.08)`,
            }}
          >
            <div
              className="overflow-hidden rounded-[21px] relative"
              style={{ background: "#09090b" }}
            >
              {/* Chrome bar */}
              <div
                className="flex items-center gap-1.5 px-4"
                style={{
                  height: 38,
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                  background: "#0d0d10",
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: RED, boxShadow: `0 0 6px ${RED}` }} />
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(255,255,255,0.1)" }} />
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(255,255,255,0.1)" }} />
              </div>
              <img
                src={dashboardArt}
                alt="Archivist Dashboard"
                className="w-full h-auto block"
                style={{ opacity: 0.92 }}
              />
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: "linear-gradient(to top, rgba(5,5,7,0.9) 0%, rgba(5,5,7,0.1) 35%, transparent 55%)",
                }}
              />
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
            <div
              key={label}
              className="flex items-center gap-2 rounded-full px-4 py-2 text-[12px] font-medium"
              style={{
                background: "#0d0d10",
                border: "1px solid rgba(255,255,255,0.07)",
                color: "rgba(240,236,238,0.42)",
              }}
            >
              <span style={{ color: RED }}>{icon}</span>
              {label}
            </div>
          ))}
        </section>
      </main>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer
        className="relative z-10"
        style={{ borderTop: "1px solid rgba(255,255,255,0.055)" }}
      >
        <div className="mx-auto max-w-7xl px-4 py-14 md:px-6">

          {/* Top row */}
          <div className="grid grid-cols-2 gap-10 md:grid-cols-4">

            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5 mb-3">
                <div
                  className="h-7 w-7 overflow-hidden rounded-[8px]"
                  style={{ border: "1px solid rgba(255,255,255,0.08)", background: "#111115" }}
                >
                  <img src={archivistLogo} alt="Archivist" className="h-full w-full object-cover" />
                </div>
                <span
                  className="text-[14px] font-bold tracking-tight"
                  style={{ fontFamily: "var(--font-display)", color: "#f0ecee" }}
                >
                  Archivist
                </span>
              </div>
              <p className="text-[12px] leading-relaxed mb-5" style={{ color: "rgba(240,236,238,0.28)" }}>
                Discord server management,<br />done right.
              </p>
              <div className="flex items-center gap-2.5">
                <a
                  href="/auth/discord"
                  className="flex items-center justify-center rounded-[8px]"
                  style={{
                    width: 32,
                    height: 32,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "rgba(240,236,238,0.45)",
                  }}
                >
                  <SiDiscord size={14} />
                </a>
                <a
                  href="https://github.com"
                  className="flex items-center justify-center rounded-[8px]"
                  style={{
                    width: 32,
                    height: 32,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "rgba(240,236,238,0.45)",
                  }}
                >
                  <SiGithub size={14} />
                </a>
              </div>
            </div>

            {/* Product */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-4" style={{ color: "rgba(240,236,238,0.22)" }}>
                Product
              </p>
              <ul className="space-y-2.5">
                {[
                  { label: "Dashboard", href: "/dashboard" },
                  { label: "Commands", href: "/dashboard" },
                  { label: "Embed Studio", href: "/dashboard" },
                  { label: "Server Tools", href: "/dashboard" },
                ].map(({ label, href }) => (
                  <li key={label}>
                    <Link href={href} className="text-[13px]" style={{ color: "rgba(240,236,238,0.4)" }}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-4" style={{ color: "rgba(240,236,238,0.22)" }}>
                Resources
              </p>
              <ul className="space-y-2.5">
                {[
                  { label: "Documentation", href: "#" },
                  { label: "Support Server", href: "/auth/discord" },
                  { label: "Changelog", href: "#" },
                  { label: "Status", href: "#" },
                ].map(({ label, href }) => (
                  <li key={label}>
                    <a href={href} className="text-[13px]" style={{ color: "rgba(240,236,238,0.4)" }}>
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-4" style={{ color: "rgba(240,236,238,0.22)" }}>
                Legal
              </p>
              <ul className="space-y-2.5">
                {[
                  { label: "Privacy Policy", href: "#" },
                  { label: "Terms of Service", href: "#" },
                ].map(({ label, href }) => (
                  <li key={label}>
                    <a href={href} className="text-[13px]" style={{ color: "rgba(240,236,238,0.4)" }}>
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div
            className="mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3"
            style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
          >
            <p className="text-[11px]" style={{ color: "rgba(240,236,238,0.18)" }}>
              &copy; {new Date().getFullYear()} Archivist Control Systems. All rights reserved.
            </p>
            <div className="flex items-center gap-1.5">
              <span
                style={{
                  display: "inline-block",
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: "#1FA971",
                  boxShadow: "0 0 6px #1FA971",
                }}
              />
              <span className="text-[11px]" style={{ color: "rgba(240,236,238,0.26)" }}>
                All systems operational
              </span>
            </div>
          </div>

        </div>
      </footer>
    </div>
  );
}
