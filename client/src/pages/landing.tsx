import { Link } from "wouter";
import { SiDiscord } from "react-icons/si";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import archivistLogo from "@assets/FDEBE754-F9DF-41D4-A19B-B2933432B230_1772114960531.png";
import dashboardArt from "@assets/dashboard-art.png";

export default function Landing() {
  const { data: user } = useAuth();

  return (
    <div className="relative min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)]">
      {/* Background Gradients */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-[10%] left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-[var(--accent-primary)]/5 blur-[120px]" />
      </div>

      <header className="sticky top-0 z-50 border-b border-[var(--border-subtle)] bg-[var(--bg-app)]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="h-9 w-9 overflow-hidden rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-panel-raised)]">
              <img src={archivistLogo} alt="Archivist" className="h-full w-full object-cover" />
            </div>
            <p className="font-display text-lg font-bold tracking-tight">Archivist</p>
          </Link>

          <div className="flex items-center gap-3">
            {user ? (
              <Button asChild variant="secondary" size="sm">
                <Link href="/dashboard">Open Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="hidden sm:flex">
                  <a href="/auth/discord">Login with Discord</a>
                </Button>
                <Button asChild size="sm">
                  <Link href="/dashboard">Get Started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24">
        {/* Hero Section */}
        <section className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-brand)] bg-[var(--accent-primary)]/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--accent-primary)]">
            <ShieldCheck className="h-3 w-3" />
            Control System
          </div>
          
          <h1 className="mx-auto mt-8 max-w-4xl font-display text-4xl font-bold leading-[1.1] tracking-tight md:text-7xl">
            Build the server. <br />
            <span className="text-[var(--text-secondary)]">Not a pile of modules.</span>
          </h1>
          
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-[var(--text-secondary)] md:text-lg">
            A single, dark control workspace for commands, design, and community growth. One product, four pillars, zero clutter.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" className="h-12 px-8">
              <Link href="/dashboard">Open Dashboard</Link>
            </Button>
            {!user && (
              <Button asChild variant="outline" size="lg" className="h-12 px-8">
                <a href="/auth/discord">
                  <SiDiscord className="mr-2 h-4 w-4" />
                  Login with Discord
                </a>
              </Button>
            )}
          </div>
        </section>

        {/* Proof Block: Compact Dashboard Preview */}
        <section className="mt-20">
          <div className="archivist-panel-raised mx-auto max-w-5xl overflow-hidden rounded-[24px] border-[var(--border-strong)] bg-gradient-to-b from-[var(--bg-panel-raised)] to-[var(--bg-panel)] p-1 shadow-2xl">
            <div className="relative overflow-hidden rounded-[20px] bg-[var(--bg-app)]">
              <img 
                src={dashboardArt} 
                alt="Archivist Dashboard" 
                className="h-auto w-full opacity-90 transition-opacity hover:opacity-100" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-app)] via-transparent to-transparent" />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--border-subtle)] py-12 text-center">
        <p className="text-sm text-[var(--text-faint)]">
          &copy; {new Date().getFullYear()} Archivist Control Systems.
        </p>
      </footer>
    </div>
  );
}
