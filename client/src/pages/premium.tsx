import { useAuth, usePremiumStatus } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Check, Crown, Loader2, Sparkles, ArrowLeft, ExternalLink, Zap, Terminal, Shield, TrendingUp, Ticket, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import archivistAvatar from "@assets/archivist-avatar.png";

const FREE_FEATURES = [
  "Up to 25 custom commands",
  "Basic automod (3 filters)",
  "2 saved embed templates",
  "Welcome/leave messages",
  "Reaction roles",
  "Basic logging",
];

const PREMIUM_FEATURES = [
  "Unlimited custom commands",
  "All 6 automod filters + raid protection",
  "10 saved embed templates",
  "Advanced command conditions & actions",
  "Regex & keyword triggers",
  "Economy system + role shop",
  "Leveling & XP system",
  "Starboard & ticket system",
  "Scheduled messages",
  "Audit log with webhooks",
  "Priority support",
  "Custom bot nickname",
];

const UNLOCK_TILES = [
  { icon: Terminal, label: "Unlimited Commands", desc: "No cap on custom commands" },
  { icon: Shield, label: "All Automod Filters", desc: "6 filters + raid protection" },
  { icon: Sparkles, label: "10 Templates", desc: "Save & reuse embed templates" },
  { icon: TrendingUp, label: "Economy + Leveling", desc: "Full economy & XP system" },
  { icon: Ticket, label: "Ticket System", desc: "Support ticket panels" },
  { icon: Clock, label: "Scheduled Messages", desc: "Cron-based announcements" },
];

export default function Premium() {
  const { data: user, isLoading: authLoading } = useAuth();
  const { data: premiumData, isLoading: premiumLoading } = usePremiumStatus();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!authLoading && !user) setLocation("/login");
  }, [user, authLoading, setLocation]);

  const checkoutMutation = useMutation({
    mutationFn: async (priceId: string) => {
      const res = await fetch("/api/premium/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to start checkout");
      return await res.json();
    },
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/premium/portal", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to open portal");
      return await res.json();
    },
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
  });

  if (authLoading || premiumLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isPremium = premiumData?.isPremium || false;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute top-0 left-1/3 w-[600px] h-[400px] rounded-full blur-[160px] pointer-events-none" style={{ background: "hsl(0 72% 51% / 0.08)" }} />
      <div className="absolute bottom-0 right-1/3 w-[400px] h-[400px] rounded-full blur-[120px] pointer-events-none" style={{ background: "hsl(340 75% 55% / 0.08)" }} />

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-10">
        <Button
          variant="ghost"
          className="mb-6 text-muted-foreground hover:text-foreground"
          onClick={() => setLocation("/dashboard")}
          data-testid="button-back-dashboard"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </Button>

        <div className="rounded-2xl overflow-hidden mb-10 relative" style={{ background: "linear-gradient(135deg, hsl(0,72%,51%), hsl(340,75%,55%))" }}>
          <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(135deg, rgba(0,0,0,0.3), rgba(0,0,0,0))" }} />
          <div className="relative z-10 flex items-center gap-6 px-8 py-8">
            <div className="w-20 h-20 rounded-2xl overflow-hidden ring-2 ring-white/30 shadow-xl flex-shrink-0">
              <img src={archivistAvatar} alt="Archivist" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Crown className="w-6 h-6 text-yellow-300" />
                <h1 className="text-3xl font-display font-extrabold text-white" data-testid="text-premium-title">
                  Archivist Premium
                </h1>
              </div>
              <p className="text-white/80 text-lg max-w-xl">
                Unlock the full power of Archivist — unlimited commands, all modules, priority support.
              </p>
            </div>
          </div>
        </div>

        {isPremium && (
          <div className="mb-8 p-4 rounded-xl bg-primary/5 border border-primary/20 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="font-semibold text-primary">
                {premiumData?.reason === "owner" ? "Owner Premium Active" : "Premium Active"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {premiumData?.reason === "owner"
                ? "You have full access as a bot owner."
                : "All premium features are unlocked."}
            </p>
            {premiumData?.reason === "subscription" && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => portalMutation.mutate()}
                disabled={portalMutation.isPending}
                data-testid="button-manage-subscription"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                {portalMutation.isPending ? "Opening..." : "Manage Subscription"}
              </Button>
            )}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 mb-10">
          <Card className="glass-card border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-xl">Free</span>
                {!isPremium && <Badge variant="secondary">Current Plan</Badge>}
              </CardTitle>
              <p className="text-3xl font-bold font-display">$0<span className="text-sm text-muted-foreground font-normal">/month</span></p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {FREE_FEATURES.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm" data-testid={`text-free-feature-${feature.substring(0, 15)}`}>
                    <Check className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="glass-card border-primary/30 relative overflow-hidden box-glow">
            <div className="absolute top-0 left-0 right-0 h-1 gradient-brand" />
            <div className="absolute top-3 right-3">
              <Badge className="bg-primary/20 text-primary border-primary/30 text-xs font-semibold">Most Popular</Badge>
            </div>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-400" />
                <span className="text-xl">Premium</span>
                {isPremium && <Badge className="bg-primary/20 text-primary border-primary/30">Active</Badge>}
              </CardTitle>
              <p className="text-3xl font-bold font-display text-glow">
                $4.99<span className="text-sm text-muted-foreground font-normal">/month</span>
              </p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2.5 mb-6">
                {PREMIUM_FEATURES.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm" data-testid={`text-premium-feature-${feature.substring(0, 15)}`}>
                    <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {!isPremium && (
                <Button
                  className="w-full text-white font-semibold gradient-brand box-glow hover:opacity-90"
                  size="lg"
                  onClick={() => checkoutMutation.mutate("premium_monthly")}
                  disabled={checkoutMutation.isPending}
                  data-testid="button-upgrade-premium"
                >
                  {checkoutMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Crown className="w-4 h-4 mr-2" />
                  )}
                  {checkoutMutation.isPending ? "Redirecting..." : "Upgrade to Premium"}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <h2 className="text-xl font-display font-bold mb-4 text-center">What Premium Unlocks</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {UNLOCK_TILES.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="glass-card rounded-xl p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
