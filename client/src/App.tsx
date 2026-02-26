import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Premium from "@/pages/premium";
import DashboardOverview from "@/pages/dashboard/index";
import ServerSettings from "@/pages/dashboard/server";
import MembersPage from "@/pages/dashboard/members";
import Marketplace from "@/pages/marketplace";
import Preferences from "@/pages/dashboard/preferences";
import { useAuth } from "@/hooks/use-auth";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { data: user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [isLoading, user, setLocation]);

  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
  if (!user) return null;
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/premium" component={Premium} />
      <Route path="/marketplace" component={Marketplace} />
      <Route path="/dashboard" component={() => <ProtectedRoute component={DashboardOverview} />} />
      <Route path="/dashboard/servers/:id" component={() => <ProtectedRoute component={ServerSettings} />} />
      <Route path="/dashboard/servers/:id/members" component={() => <ProtectedRoute component={MembersPage} />} />
      <Route path="/dashboard/preferences" component={() => <ProtectedRoute component={Preferences} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
