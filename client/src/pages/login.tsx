import { useAuth, useAuthOptions, useOwnerLogin } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { SiDiscord } from "react-icons/si";
import { Loader2, LockKeyhole, ShieldCheck, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import archivistLogo from "@assets/FDEBE754-F9DF-41D4-A19B-B2933432B230_1772114960531.png";

const RED = "#e0001a";
const RED_GLOW = "rgba(224,0,26,0.22)";
const RED_BORDER = "rgba(224,0,26,0.28)";
const RED_DIM = "rgba(224,0,26,0.07)";

const STARS = [
  { top: "5%",  left: "10%", s: 2,   op: 0.28, dur: 6,  del: 0   },
  { top: "11%", left: "72%", s: 1.5, op: 0.2,  dur: 8,  del: 1.4 },
  { top: "22%", left: "88%", s: 2.5, op: 0.32, dur: 5,  del: 0.7 },
  { top: "34%", left: "4%",  s: 1.5, op: 0.18, dur: 9,  del: 2.1 },
  { top: "48%", left: "94%", s: 2,   op: 0.26, dur: 6,  del: 1.8 },
  { top: "60%", left: "25%", s: 1.5, op: 0.2,  dur: 7,  del: 3.2 },
  { top: "72%", left: "80%", s: 2.5, op: 0.3,  dur: 5,  del: 0.4 },
  { top: "85%", left: "50%", s: 2,   op: 0.22, dur: 8,  del: 2.6 },
  { top: "92%", left: "15%", s: 1.5, op: 0.18, dur: 6,  del: 1.1 },
  { top: "8%",  left: "42%", s: 3,   op: 0.34, dur: 4,  del: 0.9 },
  { top: "55%", left: "60%", s: 1.5, op: 0.16, dur: 9,  del: 2.8 },
  { top: "78%", left: "35%", s: 2,   op: 0.24, dur: 7,  del: 0.3 },
];

export default function Login() {
  const { data: user, isLoading } = useAuth();
  const { data: authOptions } = useAuthOptions();
  const ownerLogin = useOwnerLogin();
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [ownerError, setOwnerError] = useState("");

  useEffect(() => {
    if (user) setLocation("/dashboard");
  }, [user, setLocation]);

  async function handleOwnerLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setOwnerError("");
    try {
      const result = await ownerLogin.mutateAsync({ username, password });
      setLocation(result.redirectTo || "/dashboard");
    } catch (err) {
      setOwnerError(err instanceof Error ? err.message : "Owner login failed");
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#050507" }} data-testid="login-loading">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: RED }} />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden" style={{ background: "#050507", color: "#f0ecee" }}>

      {/* Keyframes */}
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: var(--op, 0.2); transform: scale(1); }
          50%       { opacity: calc(var(--op, 0.2) * 0.2); transform: scale(0.55); }
        }
        @keyframes pulse-bloom-login {
          0%, 100% { opacity: 1;    transform: translate(-50%, -50%) scale(1);    }
          50%       { opacity: 0.7; transform: translate(-50%, -50%) scale(1.1); }
        }
        @keyframes pulse-logo-login {
          0%, 100% { filter: drop-shadow(0 0 18px rgba(224,0,26,0.5)) drop-shadow(0 0 50px rgba(224,0,26,0.2)); }
          50%       { filter: drop-shadow(0 0 28px rgba(224,0,26,0.72)) drop-shadow(0 0 72px rgba(224,0,26,0.32)); }
        }
        @keyframes card-in {
          from { opacity: 0; transform: translateY(20px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .login-card-in { animation: card-in 0.6s cubic-bezier(0.22,1,0.36,1) both 0.1s; }
      `}</style>

      {/* Grain */}
      <div className="pointer-events-none fixed inset-0 z-[1] opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "160px 160px",
        }}
      />

      {/* Stars */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {STARS.map((s, i) => (
          <span key={i} style={{
            position: "absolute", top: s.top, left: s.left,
            width: s.s, height: s.s, borderRadius: "50%",
            background: "#fff", opacity: s.op,
            animation: `twinkle ${s.dur}s ease-in-out ${s.del}s infinite`,
          }} />
        ))}
      </div>

      {/* Bloom */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 h-[700px] w-[900px]"
          style={{
            background: "radial-gradient(ellipse at center, rgba(224,0,26,0.13) 0%, rgba(180,0,20,0.06) 38%, transparent 65%)",
            animation: "pulse-bloom-login 8s ease-in-out infinite",
          }}
        />
        {/* Bottom low glow */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[300px] w-[700px]"
          style={{ background: "radial-gradient(ellipse at center, rgba(160,0,15,0.07) 0%, transparent 65%)" }}
        />
      </div>

      {/* Faint grid lines */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-[0.03]">
        {[25, 50, 75].map((pct) => (
          <div key={pct} className="absolute w-full" style={{
            top: `${pct}%`, height: 1,
            background: "linear-gradient(to right, transparent 5%, rgba(224,0,26,0.8) 30%, rgba(224,0,26,0.8) 70%, transparent 95%)",
          }} />
        ))}
        {[33, 66].map((pct) => (
          <div key={pct} className="absolute h-full" style={{
            left: `${pct}%`, width: 1,
            background: "linear-gradient(to bottom, transparent 5%, rgba(224,0,26,0.6) 30%, rgba(224,0,26,0.6) 70%, transparent 95%)",
          }} />
        ))}
      </div>

      {/* ── Card ─────────────────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-md px-4 py-12 login-card-in">
        <div
          className="rounded-[24px] p-[1px]"
          style={{
            background: `linear-gradient(135deg, ${RED_BORDER} 0%, rgba(255,255,255,0.06) 50%, rgba(224,0,26,0.1) 100%)`,
            boxShadow: `0 32px 80px rgba(0,0,0,0.6), 0 0 60px rgba(224,0,26,0.07)`,
          }}
        >
          <div className="rounded-[23px] p-8" style={{ background: "rgba(10,10,13,0.92)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" }}>

            {/* Logo */}
            <div className="flex flex-col items-center mb-8">
              <div className="relative mb-5">
                <div className="absolute inset-0 -z-10 scale-[2.2] blur-[40px] opacity-50"
                  style={{ background: "radial-gradient(ellipse, rgba(224,0,26,0.55) 0%, transparent 70%)" }} />
                <img
                  src={archivistLogo}
                  alt="Archivist"
                  style={{ width: 88, height: 88, borderRadius: 18, display: "block", animation: "pulse-logo-login 4s ease-in-out infinite" }}
                />
              </div>
              <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ fontFamily: "var(--font-display)", color: "#f0ecee" }}
                data-testid="text-login-title">
                Archivist
              </h1>
              <p className="text-[13px] text-center" style={{ color: "rgba(240,236,238,0.38)" }}>
                Sign in to manage your servers
              </p>
            </div>

            {/* Owner login */}
            {authOptions?.ownerLoginEnabled && (
              <div className="mb-6 rounded-[16px] p-4"
                style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}
                data-testid="owner-access-card">
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-[11px] flex-shrink-0"
                    style={{ background: RED_DIM, border: `1px solid ${RED_BORDER}`, color: "#ff5060" }}>
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold" style={{ color: "#f0ecee" }}>Owner Access</p>
                    <p className="text-[12px] mt-0.5 leading-relaxed" style={{ color: "rgba(240,236,238,0.38)" }}>
                      Internal login for direct dashboard access.
                    </p>
                  </div>
                </div>
                <form className="space-y-3" onSubmit={handleOwnerLogin}>
                  <div className="space-y-1.5">
                    <Label htmlFor="owner-username" className="text-[12px] font-medium" style={{ color: "rgba(240,236,238,0.55)" }}>Username</Label>
                    <Input id="owner-username" value={username} onChange={(e) => setUsername(e.target.value)}
                      placeholder="Owner username" autoCapitalize="none" autoCorrect="off" spellCheck={false}
                      className="archivist-field" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="owner-password" className="text-[12px] font-medium" style={{ color: "rgba(240,236,238,0.55)" }}>Password</Label>
                    <Input id="owner-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                      placeholder="Owner password" className="archivist-field" />
                  </div>
                  {ownerError && (
                    <div className="rounded-[12px] px-3 py-2 text-[12px]"
                      style={{ background: "rgba(224,0,26,0.1)", border: "1px solid rgba(224,0,26,0.22)", color: "#ffa0a8" }}>
                      {ownerError}
                    </div>
                  )}
                  <button type="submit"
                    disabled={ownerLogin.isPending || !username.trim() || !password}
                    className="w-full flex items-center justify-center gap-2 text-[13px] font-medium rounded-[11px] transition-opacity disabled:opacity-40"
                    style={{ height: 40, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(240,236,238,0.7)" }}>
                    {ownerLogin.isPending ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Signing in...</> : <><LockKeyhole className="h-3.5 w-3.5" />Continue with Owner Access</>}
                  </button>
                </form>
              </div>
            )}

            {/* Divider */}
            <div className="flex items-center gap-3 mb-5">
              <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.07)" }} />
              <span className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: "rgba(240,236,238,0.28)" }}>
                {authOptions?.ownerLoginEnabled ? "Or use Discord" : "Discord"}
              </span>
              <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.07)" }} />
            </div>

            {/* Discord button */}
            <a href="/auth/discord" data-testid="button-discord-login">
              <button
                className="w-full flex items-center justify-center gap-2.5 text-[14px] font-semibold rounded-[12px] transition-opacity hover:opacity-88"
                style={{
                  height: 48,
                  background: "#5865F2",
                  color: "#fff",
                  boxShadow: "0 4px 24px rgba(88,101,242,0.3)",
                  letterSpacing: "-0.01em",
                }}
              >
                <SiDiscord size={18} />
                Continue with Discord
              </button>
            </a>

            {/* Trust badges */}
            <div className="mt-5 space-y-2">
              {["Server list access only", "No message reading", "Revoke anytime"].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: RED }} />
                  <span className="text-[12px]" style={{ color: "rgba(240,236,238,0.35)" }}>{item}</span>
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-[11px] mt-6" style={{ color: "rgba(240,236,238,0.18)" }}>
          &copy; {new Date().getFullYear()} Archivist Control Systems
        </p>
      </div>
    </div>
  );
}
