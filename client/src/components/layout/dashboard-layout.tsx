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
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
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

// Stars: { top, left, s=size, op=maxOpacity, dur=twinkle duration, del=delay }
const DASH_STARS = [
  // Layer 1 — small dim stars, slow twinkle
  { top: "2%",   left: "5%",   s: 1,   op: 0.10, dur: 9,  del: 0.0  },
  { top: "4%",   left: "22%",  s: 1.5, op: 0.12, dur: 7,  del: 1.3  },
  { top: "6%",   left: "48%",  s: 1,   op: 0.08, dur: 11, del: 0.6  },
  { top: "4%",   left: "71%",  s: 1.5, op: 0.13, dur: 8,  del: 2.1  },
  { top: "7%",   left: "88%",  s: 1,   op: 0.09, dur: 10, del: 0.3  },
  // Layer 2 — medium stars
  { top: "13%",  left: "11%",  s: 2,   op: 0.14, dur: 6,  del: 3.0  },
  { top: "11%",  left: "36%",  s: 1.5, op: 0.11, dur: 8,  del: 1.7  },
  { top: "15%",  left: "62%",  s: 2,   op: 0.15, dur: 7,  del: 0.4  },
  { top: "12%",  left: "83%",  s: 1.5, op: 0.12, dur: 9,  del: 2.6  },
  { top: "18%",  left: "95%",  s: 1,   op: 0.09, dur: 12, del: 1.1  },
  // Layer 3 — mid-screen
  { top: "24%",  left: "3%",   s: 2,   op: 0.13, dur: 7,  del: 4.2  },
  { top: "28%",  left: "19%",  s: 1.5, op: 0.10, dur: 8,  del: 2.8  },
  { top: "22%",  left: "41%",  s: 1,   op: 0.08, dur: 10, del: 0.9  },
  { top: "26%",  left: "57%",  s: 2,   op: 0.16, dur: 6,  del: 3.5  },
  { top: "30%",  left: "76%",  s: 1.5, op: 0.11, dur: 9,  del: 1.4  },
  { top: "25%",  left: "93%",  s: 1,   op: 0.09, dur: 11, del: 5.0  },
  // Layer 4 — lower-mid
  { top: "38%",  left: "8%",   s: 1.5, op: 0.12, dur: 8,  del: 0.7  },
  { top: "42%",  left: "28%",  s: 1,   op: 0.08, dur: 10, del: 3.3  },
  { top: "36%",  left: "52%",  s: 2,   op: 0.14, dur: 7,  del: 1.9  },
  { top: "44%",  left: "67%",  s: 1.5, op: 0.11, dur: 9,  del: 4.8  },
  { top: "39%",  left: "85%",  s: 1,   op: 0.09, dur: 6,  del: 2.2  },
  // Layer 5 — center mass
  { top: "52%",  left: "14%",  s: 2,   op: 0.13, dur: 8,  del: 1.0  },
  { top: "55%",  left: "33%",  s: 1.5, op: 0.10, dur: 10, del: 3.7  },
  { top: "48%",  left: "45%",  s: 1,   op: 0.08, dur: 7,  del: 0.2  },
  { top: "57%",  left: "61%",  s: 2,   op: 0.15, dur: 9,  del: 2.4  },
  { top: "50%",  left: "79%",  s: 1.5, op: 0.11, dur: 6,  del: 5.5  },
  // Layer 6 — lower
  { top: "64%",  left: "6%",   s: 1.5, op: 0.12, dur: 7,  del: 4.1  },
  { top: "68%",  left: "25%",  s: 1,   op: 0.09, dur: 11, del: 1.6  },
  { top: "62%",  left: "43%",  s: 2,   op: 0.14, dur: 8,  del: 2.9  },
  { top: "70%",  left: "59%",  s: 1.5, op: 0.10, dur: 9,  del: 0.5  },
  { top: "65%",  left: "75%",  s: 1,   op: 0.08, dur: 12, del: 3.8  },
  { top: "67%",  left: "91%",  s: 2,   op: 0.13, dur: 7,  del: 1.2  },
  // Layer 7 — bottom
  { top: "78%",  left: "12%",  s: 2,   op: 0.13, dur: 6,  del: 0.9  },
  { top: "82%",  left: "31%",  s: 1.5, op: 0.10, dur: 8,  del: 2.3  },
  { top: "75%",  left: "50%",  s: 1,   op: 0.08, dur: 10, del: 4.6  },
  { top: "85%",  left: "68%",  s: 2,   op: 0.14, dur: 7,  del: 1.8  },
  { top: "79%",  left: "87%",  s: 1.5, op: 0.11, dur: 9,  del: 3.2  },
  // Layer 8 — base
  { top: "92%",  left: "9%",   s: 1.5, op: 0.10, dur: 8,  del: 0.4  },
  { top: "95%",  left: "29%",  s: 1,   op: 0.08, dur: 11, del: 2.7  },
  { top: "90%",  left: "55%",  s: 2,   op: 0.12, dur: 7,  del: 5.2  },
  { top: "96%",  left: "74%",  s: 1.5, op: 0.10, dur: 9,  del: 1.5  },
  { top: "93%",  left: "94%",  s: 1,   op: 0.09, dur: 6,  del: 3.9  },
];

// Floating dust particles — different motion style (slow drift upward)
const DASH_PARTICLES = [
  { left: "8%",   s: 2.5, op: 0.07, dur: 18, del: 0   },
  { left: "19%",  s: 1.5, op: 0.06, dur: 22, del: 4   },
  { left: "31%",  s: 2,   op: 0.07, dur: 16, del: 8   },
  { left: "44%",  s: 1.5, op: 0.05, dur: 24, del: 2   },
  { left: "56%",  s: 2.5, op: 0.07, dur: 20, del: 11  },
  { left: "67%",  s: 1.5, op: 0.06, dur: 19, del: 6   },
  { left: "79%",  s: 2,   op: 0.07, dur: 25, del: 14  },
  { left: "89%",  s: 1.5, op: 0.05, dur: 17, del: 9   },
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
    if (!enabled) { previousLocationRef.current = location; return; }
    const prev = previousLocationRef.current;
    previousLocationRef.current = location;
    if (open && prev !== location) onOpenChange(false);
  }, [enabled, location, onOpenChange, open]);
}

function ArchivistItemIcon({ icon, className }: { icon: ArchivistNavItem["icon"]; className?: string }) {
  const Icon =
    icon === "commands" ? Braces
    : icon === "studio" ? Sparkles
    : icon === "games" ? Gamepad2
    : icon === "settings" ? ShieldCheck
    : icon === "plus" ? Plus
    : icon === "logs" ? Logs
    : icon === "drafts" ? FileStack
    : icon === "templates" ? LayoutTemplate
    : icon === "roles" ? Users
    : icon === "channels" ? Hash
    : icon === "permissions" ? Shield
    : icon === "backup" ? Archive
    : Compass;
  return <Icon className={className || "h-4 w-4"} />;
}

// ─── Bottom Nav ───────────────────────────────────────────────────────────────

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
    <div className="pointer-events-none fixed inset-x-0 bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-40 flex justify-center px-4">
      <div className="pointer-events-auto flex w-full max-w-sm items-center rounded-[32px] border border-white/[0.08] bg-[rgba(10,10,12,0.94)] p-1.5 shadow-[0_20px_60px_rgba(0,0,0,0.7)] backdrop-blur-2xl">
        {ARCHIVIST_NAVIGATION.map((section) => {
          const Icon = SECTION_ICON_MAP[section.id];
          const isActive = section.id === activeSection;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => {
                if (!activeServerId) { navigate("/dashboard"); return; }
                if (isActive) { onOpenTools(); return; }
                navigate(buildArchivistSectionPath(activeServerId, section.id));
              }}
              className={cn(
                "relative flex flex-1 flex-col items-center justify-center gap-1.5 rounded-[26px] py-3 transition-all duration-200",
                isActive
                  ? "bg-[rgba(255,255,255,0.06)]"
                  : "hover:bg-white/[0.03]",
              )}
            >
              <Icon
                className={cn(
                  "h-[18px] w-[18px] transition-colors",
                  isActive ? "text-white" : "text-white/30",
                )}
                strokeWidth={isActive ? 2.2 : 1.8}
              />
              <span
                className={cn(
                  "text-[10px] font-medium tracking-wide transition-colors",
                  isActive ? "text-white/80" : "text-white/25",
                )}
              >
                {section.label}
              </span>
              {isActive && (
                <span className="absolute bottom-1.5 h-[3px] w-[18px] rounded-full bg-[#E0001A]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Tool Drawer ──────────────────────────────────────────────────────────────

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
  const SectionIcon = SECTION_ICON_MAP[activeSection];
  const tools = getArchivistToolEntries(activeSection);

  const handleSelectTool = (tool: ArchivistToolEntry) => {
    if (!activeServerId) return;
    onOpenChange(false);
    navigate(buildArchivistToolPath(activeServerId, tool));
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="border-t border-white/[0.07] bg-[#0a0a0c] text-white">
        {/* Drag handle */}
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-white/[0.12]" />

        {/* Header */}
        <DrawerHeader className="flex items-center gap-3 px-5 pb-3 pt-4">
          <SectionIcon className="h-5 w-5 text-white/60" strokeWidth={1.8} />
          <DrawerTitle className="text-[15px] font-semibold text-white">{section.label}</DrawerTitle>
        </DrawerHeader>

        {/* Tool list — flat rows, no boxes */}
        <div className="px-4 pb-10">
          {tools.map((tool, i) => (
            <button
              key={tool.id}
              type="button"
              onClick={() => handleSelectTool(tool)}
              className={cn(
                "flex w-full items-center gap-4 px-2 py-3.5 text-left transition-colors hover:bg-white/[0.03] active:bg-white/[0.05]",
                i < tools.length - 1 && "border-b border-white/[0.05]",
              )}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-white/[0.05]">
                <ArchivistItemIcon icon={tool.icon} className="h-4 w-4 text-white/70" />
              </div>
              <span className="flex-1 text-[14px] font-medium text-white/85">{tool.label}</span>
              <ChevronRight className="h-4 w-4 text-white/20" />
            </button>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

// ─── Profile sheet ────────────────────────────────────────────────────────────

function ProfileBottomSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (nextOpen: boolean) => void;
}) {
  const { data: user } = useAuth();
  const logout = useLogout();
  const [, navigate] = useLocation();

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="border-t border-white/[0.07] bg-[#0a0a0c] text-white">
        <DrawerHeader className="sr-only">
          <DrawerTitle>Profile</DrawerTitle>
        </DrawerHeader>
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-white/[0.12]" />

        {user && (
          <div className="flex items-center gap-4 border-b border-white/[0.06] px-5 py-5">
            <img
              src={getAvatarUrl(user)}
              alt={user.username}
              className="h-12 w-12 rounded-full object-cover"
            />
            <div>
              <p className="text-[15px] font-semibold text-white">{user.username}</p>
              <p className="text-[12px] text-white/40">Discord Account</p>
            </div>
          </div>
        )}

        <div className="px-4 pb-10 pt-2">
          <button
            type="button"
            onClick={() => { onOpenChange(false); navigate("/dashboard"); }}
            className="flex w-full items-center gap-4 px-2 py-3.5 border-b border-white/[0.05] transition-colors hover:bg-white/[0.03]"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-white/[0.05]">
              <Home className="h-4 w-4 text-white/60" />
            </div>
            <span className="text-[14px] font-medium text-white/85">Switch Server</span>
            <ChevronRight className="ml-auto h-4 w-4 text-white/20" />
          </button>
          <button
            type="button"
            onClick={() => { onOpenChange(false); logout.mutate(); }}
            className="flex w-full items-center gap-4 px-2 py-3.5 transition-colors hover:bg-white/[0.03]"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-[rgba(224,0,26,0.08)]">
              <LogOut className="h-4 w-4 text-[#ff6070]" />
            </div>
            <span className="text-[14px] font-medium text-[#ff6070]">Sign out</span>
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

// ─── Headers ──────────────────────────────────────────────────────────────────

function WorkspaceHeader({
  activeServer,
  user,
  onAvatarClick,
}: {
  activeServer: { name: string; iconUrl?: string | null } | null;
  user: ReturnType<typeof useAuth>["data"];
  onAvatarClick: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 h-14 bg-[rgba(8,8,10,0.88)] backdrop-blur-2xl">
      <div className="flex h-full w-full items-center justify-between px-4">
        {/* Logo */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-white/[0.08] bg-[rgba(20,8,10,0.9)]">
          <img src={archivistLogo} alt="Archivist" className="h-full w-full object-cover" />
        </div>

        {/* Server name */}
        <div className="flex min-w-0 flex-1 justify-center">
          <p className="truncate text-[13px] font-semibold text-white/80">
            {activeServer?.name ?? "Archivist"}
          </p>
        </div>

        {/* Avatar */}
        {user ? (
          <button
            type="button"
            onClick={onAvatarClick}
            className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-white/[0.1]"
          >
            <img src={getAvatarUrl(user)} alt={user.username} className="h-full w-full object-cover" />
          </button>
        ) : <div className="w-8" />}
      </div>
    </header>
  );
}

function SimpleHeader({
  user,
  onAvatarClick,
}: {
  user: ReturnType<typeof useAuth>["data"];
  onAvatarClick: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 h-14 bg-[rgba(8,8,10,0.88)] backdrop-blur-xl">
      <div className="flex h-full w-full items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-white/[0.08] bg-[rgba(20,8,10,0.9)]">
            <img src={archivistLogo} alt="Archivist" className="h-full w-full object-cover" />
          </div>
          <span className="text-[13px] font-semibold text-white/80">Archivist</span>
        </div>
        {user ? (
          <button
            type="button"
            onClick={onAvatarClick}
            className="h-8 w-8 overflow-hidden rounded-full border border-white/[0.1]"
          >
            <img src={getAvatarUrl(user)} alt={user.username} className="h-full w-full object-cover" />
          </button>
        ) : null}
      </div>
    </header>
  );
}

// ─── Ambient ──────────────────────────────────────────────────────────────────

function AmbientLayers() {
  return (
    <>
      {/* Film grain texture */}
      <div
        className="pointer-events-none fixed inset-0 z-[1] opacity-[0.018]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "160px 160px",
        }}
      />

      {/* Deep radial red haze — top center, wide and very faint */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: "radial-gradient(ellipse 70% 38% at 50% 0%, rgba(224,0,26,0.055) 0%, transparent 100%)",
        }}
      />

      {/* Secondary red glow — upper-right edge, narrower */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: "radial-gradient(ellipse 34% 24% at 88% 6%, rgba(180,0,20,0.07) 0%, transparent 100%)",
        }}
      />

      {/* Slow breathing red pulse — center top */}
      <div
        className="pointer-events-none fixed z-0"
        style={{
          top: "-8%", left: "20%", right: "20%", height: "28%",
          background: "radial-gradient(ellipse at 50% 0%, rgba(224,0,26,0.038), transparent 80%)",
          animation: "dash-glow-pulse 12s ease-in-out infinite",
        }}
      />

      {/* Stars + particles canvas */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <style>{`
          @keyframes dash-twinkle {
            0%,100% { opacity: var(--op, 0.12); transform: scale(1); }
            50% { opacity: calc(var(--op, 0.12) * 0.15); transform: scale(0.35); }
          }
          @keyframes dash-float {
            0% { transform: translateY(100vh) scale(0.8); opacity: 0; }
            8% { opacity: var(--pop, 0.07); }
            92% { opacity: var(--pop, 0.07); }
            100% { transform: translateY(-6vh) scale(1.1); opacity: 0; }
          }
          @keyframes dash-glow-pulse {
            0%,100% { opacity: 1; transform: scaleX(1); }
            50% { opacity: 0.4; transform: scaleX(0.75); }
          }
        `}</style>

        {/* Stars */}
        {DASH_STARS.map((s, i) => (
          <span
            key={`star-${i}`}
            style={{
              position: "absolute", top: s.top, left: s.left,
              width: s.s, height: s.s, borderRadius: "50%",
              background: "#fff",
              ["--op" as any]: s.op,
              opacity: s.op,
              animation: `dash-twinkle ${s.dur}s ease-in-out ${s.del}s infinite`,
            }}
          />
        ))}

        {/* Floating dust particles */}
        {DASH_PARTICLES.map((p, i) => (
          <span
            key={`particle-${i}`}
            style={{
              position: "absolute", bottom: 0, left: p.left,
              width: p.s, height: p.s, borderRadius: "50%",
              background: "rgba(255,200,200,0.9)",
              ["--pop" as any]: p.op,
              animation: `dash-float ${p.dur}s linear ${p.del}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Bottom vignette fade — keeps lower content grounded */}
      <div
        className="pointer-events-none fixed bottom-0 inset-x-0 z-[1] h-32"
        style={{
          background: "linear-gradient(to top, rgba(5,5,7,0.5), transparent)",
        }}
      />
    </>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

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
  const [toolDrawerOpen, setToolDrawerOpen] = useState(false);
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);
  const isWorkspaceMode = mode === "workspace" && location.startsWith("/dashboard/servers/");

  const activeServerId = isWorkspaceMode ? getServerIdFromLocation(location) : null;
  const activeServer = useMemo(
    () => (activeServerId ? servers?.find((server: any) => server.id === activeServerId) ?? null : null),
    [activeServerId, servers],
  );
  const activeSection = isWorkspaceMode ? getArchivistSectionFromLocation(location) : "commands";
  // preserve for future use
  const _unused = isWorkspaceMode ? getArchivistItemFromLocation(location) : null;
  void _unused; void navigate;

  useDismissDrawerOnLocationChange({ enabled: isWorkspaceMode, location, open: toolDrawerOpen, onOpenChange: setToolDrawerOpen });
  useDismissDrawerOnLocationChange({ enabled: true, location, open: profileSheetOpen, onOpenChange: setProfileSheetOpen });

  if (!isWorkspaceMode) {
    return (
      <div className="relative min-h-screen bg-[#070709] text-white">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(224,0,26,0.08),transparent_50%),linear-gradient(180deg,#070709_0%,#060608_100%)]" />
        <AmbientLayers />
        <SimpleHeader user={user} onAvatarClick={() => setProfileSheetOpen(true)} />
        <main className="relative w-full px-4 py-5 pb-10">
          {children}
        </main>
        <ProfileBottomSheet open={profileSheetOpen} onOpenChange={setProfileSheetOpen} />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#070709] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(224,0,26,0.07),transparent_45%),linear-gradient(180deg,#060608_0%,#07070a_100%)]" />
      <AmbientLayers />

      <WorkspaceHeader
        activeServer={activeServer}
        user={user}
        onAvatarClick={() => setProfileSheetOpen(true)}
      />

      <main className="relative w-full px-4 pb-36 pt-4">
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

      <ProfileBottomSheet open={profileSheetOpen} onOpenChange={setProfileSheetOpen} />
    </div>
  );
}
