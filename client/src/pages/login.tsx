import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { SiDiscord } from "react-icons/si";
import { Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import archivistAvatar from "@assets/archivist-avatar.png";
import heroBg from "@assets/hero-art.png";

export default function Login() {
  const { data: user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user) setLocation("/dashboard");
  }, [user, setLocation]);

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
