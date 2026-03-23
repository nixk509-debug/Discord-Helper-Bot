import { useAuth, useAuthOptions, useOwnerLogin } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { SiDiscord } from "react-icons/si";
import { Loader2, Check, LockKeyhole, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import archivistAvatar from "@assets/archivist-avatar.png";
import heroBg from "@assets/hero-art.png";

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

  async function handleOwnerLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOwnerError("");

    try {
      const result = await ownerLogin.mutateAsync({ username, password });
      setLocation(result.redirectTo || "/dashboard");
    } catch (error) {
      setOwnerError(error instanceof Error ? error.message : "Owner login failed");
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" data-testid="login-loading">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[120px]" style={{ background: "hsl(0 72% 51% / 0.12)" }} />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full blur-[100px]" style={{ background: "hsl(340 75% 55% / 0.10)" }} />
      </div>

      <div className="relative z-10 w-full md:w-1/2 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="bg-card/80 backdrop-blur-xl border border-white/10 rounded-2xl p-10 shadow-2xl">
            <div className="flex flex-col items-center mb-8">
              <div className="relative mb-6">
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: "linear-gradient(135deg, hsl(0,72%,51%), hsl(340,75%,55%))",
                    padding: "3px",
                    borderRadius: "9999px",
                  }}
                />
                <div className="relative w-24 h-24 rounded-full overflow-hidden ring-[3px] ring-primary/60 ring-offset-2 ring-offset-background shadow-[0_0_30px_hsl(0_72%_51%/0.5)]">
                  <img src={archivistAvatar} alt="Archivist" className="w-full h-full object-cover" />
                </div>
              </div>
              <h1 className="text-3xl font-display font-extrabold text-foreground text-glow mb-1" data-testid="text-login-title">
                Archivist
              </h1>
              <p className="text-muted-foreground text-center text-sm">
                Sign in with Discord to manage your servers
              </p>
            </div>

            {authOptions?.ownerLoginEnabled ? (
              <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]" data-testid="owner-access-card">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-white/10 bg-[#171a20] text-white">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">Owner Access</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      Internal login for direct dashboard access when Discord OAuth gets in the way.
                    </p>
                  </div>
                </div>

                <form className="mt-4 space-y-3" onSubmit={handleOwnerLogin}>
                  <div className="space-y-2">
                    <Label htmlFor="owner-username" className="text-foreground/90">
                      Username
                    </Label>
                    <Input
                      id="owner-username"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      placeholder="Owner username"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="owner-password" className="text-foreground/90">
                      Password
                    </Label>
                    <Input
                      id="owner-password"
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Owner password"
                    />
                  </div>

                  {ownerError ? (
                    <div className="rounded-[14px] border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
                      {ownerError}
                    </div>
                  ) : null}

                  <Button
                    type="submit"
                    variant="outline"
                    className="w-full justify-center"
                    disabled={ownerLogin.isPending || !username.trim() || !password}
                  >
                    {ownerLogin.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        <LockKeyhole className="h-4 w-4" />
                        Continue with Owner Access
                      </>
                    )}
                  </Button>
                </form>
              </div>
            ) : null}

            <div className="my-6 flex items-center gap-3 text-white/28">
              <div className="h-px flex-1 bg-white/8" />
              <span className="text-[11px] font-medium uppercase tracking-[0.24em] text-white/38">
                {authOptions?.ownerLoginEnabled ? "Or use Discord" : "Discord"}
              </span>
              <div className="h-px flex-1 bg-white/8" />
            </div>

            <Button
              asChild
              size="lg"
              className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold py-6 rounded-xl text-base transition-all duration-200 hover:shadow-[0_0_20px_rgba(88,101,242,0.4)]"
              data-testid="button-discord-login"
            >
              <a href="/auth/discord">
                <SiDiscord className="w-5 h-5 mr-2" />
                Continue with Discord
              </a>
            </Button>

            <div className="mt-6 space-y-2">
              {["Server list access only", "No message reading", "Revoke anytime"].map((item) => (
                <div key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="hidden md:flex w-1/2 relative overflow-hidden">
        <img src={heroBg} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to right, hsl(0 0% 5% / 0.85), hsl(0 0% 5% / 0.5))" }} />
        <div className="relative z-10 flex flex-col justify-center px-12">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-6">
              The dashboard no one else built
            </div>
            <blockquote className="text-4xl font-display font-extrabold leading-tight mb-4">
              "The bot dashboard that actually makes sense."
            </blockquote>
            <p className="text-muted-foreground text-lg">
              Visual flows, economy systems, member CRM — all in one place.
            </p>
          </div>
          <ul className="space-y-3">
            {[
              "Visual node-based automation builder",
              "Full server economy with role shop",
              "Member intelligence CRM with notes",
              "HTTP request actions in commands",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-sm">
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-primary" />
                </div>
                <span className="text-foreground/90">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
