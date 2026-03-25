import { Switch, Route, useLocation } from "wouter";
import { useEffect, useState, type ComponentType } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useAuth, useAuthOptions, useOwnerLogin } from "@/hooks/use-auth";
import { DashboardEntryAnimation } from "@/components/dashboard-entry-animation";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";
import DashboardOverview from "@/pages/dashboard/index";
import WorkspacePage from "@/pages/dashboard/workspace";
import SiteEditorPage from "@/pages/dashboard/site-editor";

type AsyncPageComponent = ComponentType<any>;

function AppLoadingState() {
  return (
    <div className="min-h-screen bg-[var(--bg-app)] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin shadow-[0_0_15px_rgba(110,123,255,0.35)]" />
    </div>
  );
}

function RouteSuspense({
  component: Component,
}: {
  component: AsyncPageComponent;
}) {
  return <Component />;
}

function HomeRoute() {
  return <RouteSuspense component={Landing} />;
}

function ProtectedRoute({ component: Component }: { component: AsyncPageComponent }) {
  const { data: user, isLoading } = useAuth();
  const { data: authOptions } = useAuthOptions();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      if (authOptions?.discordLoginEnabled) {
        window.location.href = "/auth/discord";
      } else {
        setLocation("/login", { replace: true });
      }
    }
  }, [authOptions?.discordLoginEnabled, isLoading, user, setLocation]);

  if (isLoading) return <AppLoadingState />;
  if (!user) return null;

  return <RouteSuspense component={Component} />;
}

function OwnerUnlockPage({ returnTo }: { returnTo: string }) {
  const { data: authOptions } = useAuthOptions();
  const ownerLogin = useOwnerLogin();
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    try {
      await ownerLogin.mutateAsync({ username, password });
      setLocation(returnTo || "/dashboard/site-editor", { replace: true });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Owner unlock failed");
    }
  }

  return (
    <DashboardLayout mode="site-editor">
      <div className="mx-auto flex w-full max-w-xl flex-1 items-center px-4 py-8 sm:px-6">
        <div className="archivist-panel w-full p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[16px] border border-white/10 bg-[linear-gradient(180deg,rgba(24,28,34,0.92),rgba(13,15,19,0.98))] text-[#ff8194]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="archivist-kicker">Owner Tools</p>
              <h1 className="mt-1 text-xl font-bold text-white">Unlock Site Editor</h1>
              <p className="mt-2 text-sm leading-6 text-white/58">
                Use your owner credentials here without leaving the dashboard or bouncing through Discord again.
              </p>
            </div>
          </div>

          {authOptions?.ownerLoginEnabled ? (
            <form className="mt-5 space-y-3" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="owner-unlock-username" className="text-white/82">
                  Username
                </Label>
                <Input
                  id="owner-unlock-username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="Owner username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="owner-unlock-password" className="text-white/82">
                  Password
                </Label>
                <Input
                  id="owner-unlock-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Owner password"
                />
              </div>

              {error ? (
                <div className="rounded-[14px] border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
                  {error}
                </div>
              ) : null}

              <Button
                type="submit"
                className="w-full justify-center"
                disabled={ownerLogin.isPending || !username.trim() || !password}
              >
                {ownerLogin.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Unlocking...
                  </>
                ) : (
                  <>
                    <LockKeyhole className="h-4 w-4" />
                    Unlock Owner Access
                  </>
                )}
              </Button>
            </form>
          ) : (
            <div className="mt-5 rounded-[16px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-white/58">
              Owner login is not enabled in this environment.
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function OwnerRoute({ component: Component }: { component: AsyncPageComponent }) {
  const { data: user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      setLocation("/login", { replace: true });
    }
  }, [isLoading, setLocation, user]);

  if (isLoading) return <AppLoadingState />;
  if (!user) return <AppLoadingState />;
  if (!user.ownerAccess) return <OwnerUnlockPage returnTo={location} />;

  return <RouteSuspense component={Component} />;
}

function DashboardRoute() {
  return <RouteSuspense component={DashboardOverview} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeRoute} />
      <Route path="/login" component={() => <RouteSuspense component={Login} />} />
      <Route path="/dashboard" component={() => <ProtectedRoute component={DashboardRoute} />} />
      <Route path="/dashboard/site-editor" component={() => <OwnerRoute component={SiteEditorPage} />} />
      <Route path="/dashboard/servers/:id/:section/:subpage" component={() => <ProtectedRoute component={WorkspacePage} />} />
      <Route path="/dashboard/servers/:id/:section" component={() => <ProtectedRoute component={WorkspacePage} />} />
      <Route path="/dashboard/servers/:id" component={() => <ProtectedRoute component={WorkspacePage} />} />
      <Route component={() => <RouteSuspense component={NotFound} />} />
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
