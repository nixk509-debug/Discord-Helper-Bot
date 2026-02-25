import { useAuth, usePremiumStatus } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Check, Crown, Loader2, Sparkles, ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";

const FREE_FEATURES = [
  "Up to 25 custom commands",
  "Basic automod (3 filters)",
  "2 saved templates",
  "Welcome/leave messages",
  "Reaction roles",
  "Basic logging",
];

const PREMIUM_FEATURES = [
  "Unlimited custom commands",
  "All 6 automod filters + raid protection",
  "10 saved templates",
  "Advanced command conditions & actions",
  "Regex & keyword triggers",
  "Priority support",
  "Leveling system",
  "Starboard",
  "Ticket system",
  "Scheduled messages",
  "Audit log with webhooks",
  "Custom bot nickname",
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
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-background to-blue-900/20" />
      <div className="absolute top-20 left-1/3 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-1/3 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-12">
        <Button
          variant="ghost"
          className="mb-8"
          onClick={() => setLocation("/dashboard")}
          data-testid="button-back-dashboard"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </Button>

        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-4">
            <Crown className="w-8 h-8 text-yellow-400" />
            <h1 className="text-4xl font-bold font-display text-foreground" data-testid="text-premium-title">
              Archivist Premium
            </h1>
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Unlock the full power of Archivist with advanced features, unlimited commands, and priority support.
          </p>
        </div>

        {isPremium && (
          <div className="mb-8 p-4 rounded-xl bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              <span className="font-semibold text-yellow-400">
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

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="bg-card/80 backdrop-blur-xl border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-xl">Free</span>
                <Badge variant="secondary">Current</Badge>
              </CardTitle>
              <p className="text-3xl font-bold">$0<span className="text-sm text-muted-foreground font-normal">/month</span></p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {FREE_FEATURES.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm" data-testid={`text-free-feature-${feature.substring(0, 15)}`}>
                    <Check className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-xl border-purple-500/30 shadow-lg shadow-purple-500/10 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-blue-500" />
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-400" />
                <span className="text-xl">Premium</span>
                {isPremium && <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Active</Badge>}
              </CardTitle>
              <p className="text-3xl font-bold">
                $4.99<span className="text-sm text-muted-foreground font-normal">/month</span>
              </p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                {PREMIUM_FEATURES.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm" data-testid={`text-premium-feature-${feature.substring(0, 15)}`}>
                    <Sparkles className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {!isPremium && (
                <Button
                  className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
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
      </div>
    </div>
  );
}
