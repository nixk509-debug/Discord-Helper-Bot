import { ReactNode, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  Archive,
  Braces,
  ChevronRight,
  Compass,
  FileStack,
  Gamepad2,
  Hash,
  Home,
  LayoutTemplate,
  LogOut,
  Logs,
  Plus,
  Shield,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth, useLogout, getAvatarUrl } from "@/hooks/use-auth";
import { useServers } from "@/hooks/use-bot";
import {
  ARCHIVIST_NAVIGATION,
  buildArchivistSectionPath,
  buildArchivistToolPath,
  getArchivistItemFromLocation,
  getArchivistSection,
  getArchivistSectionFromLocation,
  getArchivistToolEntries,
  getServerIdFromLocation,
  type ArchivistCanonicalSection,
  type ArchivistNavItem,
  type ArchivistToolEntry,
} from "@/lib/archivist-workspace";
import { cn } from "@/lib/utils";
import archivistLogo from "@assets/FDEBE754-F9DF-41D4-A19B-B2933432B230_1772114960531.png";

type DashboardLayoutMode = "workspace" | "overview" | "site-editor";

const DASH_STARS = [
  { top: "4%",  left: "7%",  s: 1.5, op: 0.16, dur: 7,  del: 0   },
  { top: "9%",  left: "63%", s: 2,   op: 0.22, dur: 5,  del: 1.4 },
  { top: "16%", left: "91%", s: 1.5, op: 0.18, dur: 8,  del: 0.7 },
  { top: "28%", left: "3%",  s: 2,   op: 0.2,  dur: 6,  del: 2.2 },
  { top: "38%", left: "78%", s: 1.5, op: 0.15, dur: 9,  del: 0.5 },
  { top: "52%", left: "45%", s: 2,   op: 0.18, dur: 7,  del: 3.1 },
  { top: "65%", left: "88%", s: 1.5, op: 0.14, dur: 8,  del: 1.8 },
  { top: "78%", left: "12%", s: 2,   op: 0.2,  dur: 6,  del: 0.9 },
  { top: "88%", left: "55%", s: 1.5, op: 0.16, dur: 7,  del: 2.5 },
  { top: "95%", left: "30%", s: 2,   op: 0.18, dur: 5,  del: 1.2 },
];

const SECTION_ICON_MAP: Record<ArchivistCanonicalSection, typeof Braces> = {
  commands: Braces,
  studio: Sparkles,
  community: Gamepad2,
  operations: ShieldCheck,
};

function useDismissDrawerOnLocationChange({
  enabled,
  location,
  open,
  onOpenChange,
}: {
  enabled: boolean;
  location: string;
  open: boolean;
  onOpenChange: (nextOpen: boolean) => void;
}) {
  const previousLocationRef = useRef(location);

  useLayoutEffect(() => {
    if (!enabled) {
      previousLocationRef.current = location;
      return;
    }

    const previousLocation = previousLocationRef.current;
    previousLocationRef.current = location;

    if (open && previousLocation !== location) {
      onOpenChange(false);
    }
  }, [enabled, location, onOpenChange, open]);
}

function ArchivistItemIcon({ icon, className }: { icon: ArchivistNavItem["icon"]; className?: string }) {
  const Icon =
    icon === "commands"
      ? Braces
      : icon === "studio"
        ? Sparkles
        : icon === "games"
          ? Gamepad2
          : icon === "settings"
            ? ShieldCheck
            : icon === "plus"
              ? Plus
              : icon === "logs"
                ? Logs
                : icon === "drafts"
                  ? FileStack
                  : icon === "templates"
                    ? LayoutTemplate
                    : icon === "roles"
                      ? Users
                      : icon === "channels"
                        ? Hash
                        : icon === "permissions"
                          ? Shield
                          : icon === "backup"
                            ? Archive
                            : Compass;

  return <Icon className={className || "h-4 w-4"} />;
}

function WorkspaceBottomNav({
  activeSection,
  activeServerId,
  onOpenTools,
}: {
  activeSection: ArchivistCanonicalSection;
  activeServerId: number | null;
  onOpenTools: () => void;
}) {
  const [, navigate] = useLocation();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 flex justify-center px-3">
      <div className="pointer-events-auto flex w-full max-w-xl items-center gap-1 rounded-[28px] border border-white/10 bg-[rgba(8,8,10,0.92)] p-2 shadow-[0_24px_80px_rgba(0,0,0,0.58)] backdrop-blur-2xl">
        {ARCHIVIST_NAVIGATION.map((section) => {
          const Icon = SECTION_ICON_MAP[section.id];
          const isActive = section.id === activeSection;

          return (
            <button
              key={section.id}
              type="button"
              onClick={() => {
                if (!activeServerId) {
                  navigate("/dashboard");
                  return;
                }

                if (isActive) {
                  onOpenTools();
                  return;
                }

                navigate(buildArchivistSectionPath(activeServerId, section.id));
              }}
              className={cn(
                "flex min-h-[60px] flex-1 flex-col items-center justify-center gap-1 rounded-[22px] px-2 py-2 text-center transition",
                isActive
                  ? "border border-[rgba(224,0,26,0.22)] bg-[linear-gradient(180deg,rgba(18,8,10,0.98),rgba(9,8,9,1))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_0_18px_rgba(224,0,26,0.1),0_12px_28px_rgba(0,0,0,0.22)]"
                  : "text-[var(--text-muted)] hover:bg-white/[0.04] hover:text-[var(--text-primary)]",
              )}
            >
              <Icon className={cn("h-4 w-4", isActive ? "text-[#ff6070]" : "text-[var(--text-faint)]")} />
              <span className={cn("text-[11px] font-semibold tracking-[0.02em]", isActive ? "text-white" : "text-[var(--text-secondary)]")}>
                {section.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WorkspaceToolDrawer({
  open,
  onOpenChange,
  activeSection,
  activeServerId,
}: {
  open: boolean;
  onOpenChange: (nextOpen: boolean) => void;
  activeSection: ArchivistCanonicalSection;
  activeServerId: number | null;
}) {
  const [, navigate] = useLocation();
  const section = getArchivistSection(activeSection);
  const tools = getArchivistToolEntries(activeSection);
  const handleSelectTool = (tool: ArchivistToolEntry) => {
    if (!activeServerId) return;
    onOpenChange(false);
    navigate(buildArchivistToolPath(activeServerId, tool));
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="border-[var(--border-strong)] bg-[linear-gradient(180deg,rgba(11,11,13,0.99),rgba(5,5,6,1))] text-[var(--text-primary)]">
        <DrawerHeader className="border-b border-white/8 px-4 pb-4 pt-5 text-left">
          <p className="archivist-kicker">Tool Drawer</p>
          <DrawerTitle className="mt-2 text-2xl font-bold text-white">{section.label}</DrawerTitle>
          <DrawerDescription className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-muted)]">
            Pick a focused tool without falling into nested dashboard routing. The bottom nav stays the pillar truth. This sheet is the sub-tool map.
          </DrawerDescription>
        </DrawerHeader>
        <div className="space-y-6 px-4 py-5">
          <div className="grid gap-3">
            {tools.filter((tool) => tool.featured).map((tool) => (
              <button
                key={tool.id}
                type="button"
                onClick={() => handleSelectTool(tool)}
                className="flex items-center gap-4 rounded-[24px] border border-[rgba(224,0,26,0.16)] bg-[linear-gradient(180deg,rgba(16,10,11,0.98),rgba(9,8,9,1))] px-4 py-4 text-left transition hover:border-[rgba(224,0,26,0.28)] hover:bg-[linear-gradient(180deg,rgba(20,10,12,0.99),rgba(10,8,9,1))]"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border border-[rgba(224,0,26,0.16)] bg-[rgba(224,0,26,0.05)] text-[#ff6070]">
                  <ArchivistItemIcon icon={tool.icon} className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white">{tool.label}</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">{tool.description}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-faint)]" />
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-faint)]">All tools</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {tools.map((tool) => (
                <button
                  key={`${tool.id}-all`}
                  type="button"
                  onClick={() => handleSelectTool(tool)}
                  className="flex min-h-[112px] flex-col items-start justify-between rounded-[24px] border border-[var(--border-subtle)] bg-[linear-gradient(180deg,rgba(16,16,18,0.96),rgba(8,9,10,0.99))] px-4 py-4 text-left transition hover:border-[rgba(92,40,50,0.18)] hover:bg-[linear-gradient(180deg,rgba(18,15,16,0.98),rgba(10,9,10,1))]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-[16px] border border-white/8 bg-white/[0.03] text-white/72">
                    <ArchivistItemIcon icon={tool.icon} className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{tool.label}</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">{tool.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function SimpleHeader({ mode }: { mode: DashboardLayoutMode }) {
  const { data: user } = useAuth();
  const logout = useLogout();

  return (
    <header className="sticky top-0 z-30 border-b border-white/6 bg-[rgba(7,7,8,0.78)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-[16px] border border-white/10 bg-[linear-gradient(180deg,rgba(34,14,18,0.96),rgba(12,9,10,0.98))]">
            <img src={archivistLogo} alt="Archivist" className="h-full w-full object-cover" />
          </div>
          <div>
            <p className="archivist-kicker">{mode === "site-editor" ? "Owner Surface" : "Archivist"}</p>
            <p className="mt-1 text-sm font-semibold text-white">{mode === "site-editor" ? "Site Editor" : "Dashboard"}</p>
          </div>
        </div>

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-[18px] border border-white/10 bg-white/[0.03] p-1.5 pr-2.5 transition hover:border-white/18 hover:bg-white/[0.05]">
                <img src={getAvatarUrl(user)} alt={user.username} className="h-8 w-8 rounded-[12px] object-cover" />
                <span className="hidden text-xs font-semibold text-white sm:inline">{user.username}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 border-white/10 bg-[#0d0d0f] text-white">
              <DropdownMenuItem onClick={() => logout.mutate()} className="text-[#ff6070] focus:text-[#ff6070]">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </header>
  );
}

export function DashboardLayout({
  children,
  mode = "workspace",
}: {
  children: ReactNode;
  mode?: DashboardLayoutMode;
}) {
  const [location, navigate] = useLocation();
  const { data: user } = useAuth();
  const { data: servers } = useServers();
  const logout = useLogout();
  const [toolDrawerOpen, setToolDrawerOpen] = useState(false);
  const isWorkspaceMode = mode === "workspace" && location.startsWith("/dashboard/servers/");

  const activeServerId = isWorkspaceMode ? getServerIdFromLocation(location) : null;
  const activeServer = useMemo(
    () => (activeServerId ? servers?.find((server: any) => server.id === activeServerId) ?? null : null),
    [activeServerId, servers],
  );
  const activeSection = isWorkspaceMode ? getArchivistSectionFromLocation(location) : "commands";
  const activeItem = isWorkspaceMode ? getArchivistItemFromLocation(location) : null;
  const activeSectionConfig = getArchivistSection(activeSection);

  useDismissDrawerOnLocationChange({
    enabled: isWorkspaceMode,
    location,
    open: toolDrawerOpen,
    onOpenChange: setToolDrawerOpen,
  });

  const ambientLayers = (
    <>
      {/* Grain */}
      <div className="pointer-events-none fixed inset-0 z-[1] opacity-[0.028]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "160px 160px",
        }}
      />
      {/* Stars */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <style>{`@keyframes dash-twinkle{0%,100%{opacity:var(--op,0.2);transform:scale(1)}50%{opacity:calc(var(--op,0.2)*0.2);transform:scale(0.5)}}`}</style>
        {DASH_STARS.map((s, i) => (
          <span key={i} style={{
            position: "absolute", top: s.top, left: s.left,
            width: s.s, height: s.s, borderRadius: "50%",
            background: "#fff", opacity: s.op,
            animation: `dash-twinkle ${s.dur}s ease-in-out ${s.del}s infinite`,
          }} />
        ))}
      </div>
    </>
  );

  if (!isWorkspaceMode) {
    return (
      <div className="relative min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)]">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(224,0,26,0.12),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(140,0,16,0.1),transparent_28%),linear-gradient(180deg,#050507_0%,#09090c_46%,#060608_100%)]" />
        {ambientLayers}
        <SimpleHeader mode={mode} />
        <main className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-7xl flex-col px-4 py-6 md:px-6 md:py-8">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(224,0,26,0.16),transparent_22%),radial-gradient(circle_at_80%_22%,rgba(140,0,16,0.14),transparent_22%),radial-gradient(circle_at_bottom,rgba(80,0,10,0.12),transparent_28%),linear-gradient(180deg,#040406_0%,#070709_45%,#040406_100%)]" />
      {ambientLayers}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-10 h-32 bg-[linear-gradient(180deg,rgba(0,0,0,0.52),transparent)]" />

      <header className="sticky top-0 z-30 border-b border-white/6 bg-[rgba(6,6,7,0.74)] backdrop-blur-2xl">
        <div className="mx-auto flex w-full max-w-7xl items-start justify-between gap-3 px-4 pb-4 pt-4 md:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[18px] border border-white/10 bg-[linear-gradient(180deg,rgba(28,10,12,0.98),rgba(11,9,10,0.98))] shadow-[0_10px_32px_rgba(0,0,0,0.32)] transition hover:border-[rgba(224,0,26,0.32)]"
            >
              {activeServer?.iconUrl ? (
                <img src={activeServer.iconUrl} alt={activeServer.name} className="h-full w-full object-cover" />
              ) : (
                <Home className="h-4 w-4 text-[#ff6070]" />
              )}
            </button>

            <div className="min-w-0">
              <p className="archivist-kicker">Archivist Workspace</p>
              <p className="mt-1 truncate text-sm font-semibold text-white">
                {activeServer?.name || "Choose a server"}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                  {activeSectionConfig.label}
                </span>
                <span className="rounded-full border border-[rgba(224,0,26,0.28)] bg-[rgba(224,0,26,0.1)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#ff6070]">
                  {activeItem?.label || "Overview"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              className="min-h-11 rounded-[18px] border-white/10 bg-white/[0.03] px-4 text-white hover:bg-white/[0.06]"
              onClick={() => setToolDrawerOpen(true)}
            >
              <ArchivistItemIcon icon={activeSectionConfig.icon} className="h-4 w-4" />
              Tools
            </Button>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-[18px] border border-white/10 bg-white/[0.03] p-1.5 pr-2.5 transition hover:border-white/18 hover:bg-white/[0.05]">
                    <img src={getAvatarUrl(user)} alt={user.username} className="h-8 w-8 rounded-[12px] object-cover" />
                    <span className="hidden text-xs font-semibold text-white lg:inline">{user.username}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 border-white/10 bg-[#0d0d0f] text-white">
                  <DropdownMenuItem onClick={() => navigate("/dashboard")} className="focus:text-white">
                    <Home className="mr-2 h-4 w-4" />
                    Servers
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => logout.mutate()} className="text-[#ff6070] focus:text-[#ff6070]">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-7xl px-4 pb-36 pt-4 md:px-6 md:pt-5">
        {children}
      </main>

      <WorkspaceBottomNav
        activeSection={activeSection}
        activeServerId={activeServerId}
        onOpenTools={() => setToolDrawerOpen(true)}
      />

      <WorkspaceToolDrawer
        open={toolDrawerOpen}
        onOpenChange={setToolDrawerOpen}
        activeSection={activeSection}
        activeServerId={activeServerId}
      />
    </div>
  );
}
