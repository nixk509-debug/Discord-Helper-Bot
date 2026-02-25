import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { SiDiscord } from "react-icons/si";
import { Loader2, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

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
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-background to-blue-900/20" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-md mx-auto px-4">
        <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-8 shadow-2xl shadow-purple-500/5">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold font-display text-foreground" data-testid="text-login-title">
              Welcome to Archivist
            </h1>
            <p className="text-muted-foreground mt-2 text-center">
              Sign in with Discord to manage your servers
            </p>
          </div>

          <Button
            asChild
            size="lg"
            className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium py-6"
            data-testid="button-discord-login"
          >
            <a href="/auth/discord">
              <SiDiscord className="w-5 h-5 mr-2" />
              Continue with Discord
            </a>
          </Button>

          <p className="text-xs text-muted-foreground text-center mt-6">
            We only request access to your profile and server list
          </p>
        </div>
      </div>
    </div>
  );
}
