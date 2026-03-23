import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { ReactNode, useEffect, useMemo, useState, type CSSProperties } from "react";
import { useLocation } from "wouter";
import { Search, LogOut, ChevronDown, ShieldCheck, UserPlus } from "lucide-react";
import { getSiteEditorFieldValue, type SiteEditorSurfaceDocument } from "@shared/site-editor";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth, useLogout, getAvatarUrl } from "@/hooks/use-auth";
import { useServers } from "@/hooks/use-bot";
import { usePublishedSiteSurface } from "@/hooks/use-site-content";
import {
  buildArchivistSectionPath,
  getArchivistItemFromLocation,
  getArchivistSectionFromLocation,
  getServerIdFromLocation,
} from "@/lib/archivist-workspace";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusPill } from "./archivist-surfaces";
import archivistLogo from "@assets/FDEBE754-F9DF-41D4-A19B-B2933432B230_1772114960531.png";

const SECTION_LABELS = {
  commands: "Custom Commands",
  studio: "Design Studio",
  creative: "Fun & Games",
  settings: "Settings",
} as const;

type DashboardLayoutMode = "workspace" | "overview" | "site-editor";

function updateSearchParam(location: string, query: string) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.origin + location);
  if (query.trim()) url.searchParams.set("q", query.trim());
  else url.searchParams.delete("q");
  const next = `${url.pathname}${url.search ? url.search : ""}`;
  window.history.replaceState({}, "", next);
  window.dispatchEvent(new Event("archivist-search"));
}

function readShellField(
  document: SiteEditorSurfaceDocument | undefined,
  sectionId: string,
  fieldKey: string,
  fallback: string,
) {
  return document ? getSiteEditorFieldValue(document, sectionId, fieldKey, fallback) : fallback;
}

export function DashboardLayout({
  children,
  mode = "workspace",
}: {
  children: ReactNode;
  mode?: DashboardLayoutMode;
}) {
  const { data: user } = useAuth();
  const { data: servers } = useServers();
  const { data: shellContent } = usePublishedSiteSurface("dashboard_shell", { enabled: !!user });
  const logout = useLogout();
  const [location, navigate] = useLocation();
  const [searchValue, setSearchValue] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const inviteHref = "/api/invite-url?redirect=1";
  const isWorkspaceMode = mode === "workspace";

  const style = {
    "--sidebar-width": "18.5rem",
    "--sidebar-width-icon": "4.2rem",
  } as CSSProperties & Record<string, string>;

  const activeSection = isWorkspaceMode ? getArchivistSectionFromLocation(location) : "commands";
  const activeItem = isWorkspaceMode ? getArchivistItemFromLocation(location) : null;
  const activeServerId = isWorkspaceMode ? getServerIdFromLocation(location) : null;
  const activeServer = useMemo(
    () => (activeServerId ? servers?.find((server: any) => server.id === activeServerId) ?? null : null),
    [servers, activeServerId],
  );
  const sectionLabel =
    mode === "site-editor"
      ? "Site Editor"
      : mode === "overview"
        ? "Dashboard"
        : SECTION_LABELS[activeSection];
  const itemLabel =
    mode === "site-editor"
      ? "Owner surfaces"
      : mode === "overview"
        ? "Overview"
        : activeItem?.label || "Overview";

  useEffect(() => {
    if (!isWorkspaceMode) {
      setSearchValue("");
      return;
    }
    if (typeof window === "undefined") return;
    setSearchValue(new URLSearchParams(window.location.search).get("q") || "");
  }, [isWorkspaceMode, location]);

  useEffect(() => {
    setMobileSearchOpen(false);
  }, [location]);

  return (
    <SidebarProvider style={style}>
      <div className="relative flex min-h-screen w-full overflow-hidden bg-[#090a0d] text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(178,43,67,0.12),transparent_20%),radial-gradient(circle_at_bottom_right,rgba(105,19,34,0.1),transparent_28%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.04] archivist-grid" />

        <AppSidebar mode={mode} />

        <div className="relative z-10 flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-white/6 bg-[#0d0f13]/88 backdrop-blur-xl">
            <div className="relative px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:hidden">
              <div className="flex items-center justify-between gap-3">
                <SidebarTrigger className="h-11 w-11 rounded-[14px] border border-white/8 bg-[#121419] p-0 text-white/70 transition hover:border-white/16 hover:text-white" />
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-[12px] border border-white/10 bg-[#13161b]">
                    <img src={archivistLogo} alt="Archivist" className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-display text-lg font-bold tracking-tight text-white">
                      {readShellField(shellContent, "workspace_brand", "brandName", "Archivist")}
                    </p>
                    <p className="truncate text-xs text-white/52">{itemLabel}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isWorkspaceMode ? (
                    <button
                      type="button"
                      aria-label="Search"
                      onClick={() => setMobileSearchOpen((open) => !open)}
                      className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-white/8 bg-[#121419] text-white/66 transition hover:border-white/14 hover:text-white"
                    >
                      <Search className="h-4 w-4" />
                    </button>
                  ) : null}
                  {user ? (
                    <img
                      src={getAvatarUrl(user)}
                      alt={user.username}
                      className="h-11 w-11 rounded-[14px] border border-white/10 object-cover"
                    />
                  ) : (
                    <div className="h-11 w-11" />
                  )}
                </div>
              </div>
              {isWorkspaceMode && mobileSearchOpen ? (
                <div className="mt-3">
                  <label className="sr-only" htmlFor="mobile-dashboard-search">
                    Search commands, drafts, and logs
                  </label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                    <Input
                      id="mobile-dashboard-search"
                      value={searchValue}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        setSearchValue(nextValue);
                        updateSearchParam(location, nextValue);
                      }}
                      placeholder={readShellField(shellContent, "shell_copy", "searchPlaceholder", "Search commands, drafts, logs")}
                      className="pl-10"
                    />
                  </div>
                </div>
              ) : null}
              <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
                <StatusPill tone="accent">{sectionLabel}</StatusPill>
                {activeServer ? <StatusPill>{activeServer.name}</StatusPill> : null}
              </div>
            </div>
            <div className="relative hidden min-h-[74px] flex-wrap items-center gap-3 px-4 py-3 md:flex md:px-6">
              <SidebarTrigger className="rounded-[14px] border border-white/8 bg-[#121419] p-2 text-white/70 transition hover:border-white/16 hover:text-white" />

              <div className="min-w-0">
                <p className="text-xs font-medium tracking-[0.08em] text-white/48">Workspace</p>
                <p className="mt-1 text-lg font-semibold text-white">{sectionLabel}</p>
              </div>

              {isWorkspaceMode ? (
                <div className="min-w-0 flex-1 md:max-w-[260px]">
                  <label className="sr-only" htmlFor="server-selector">
                    Select server
                  </label>
                  <select
                    id="server-selector"
                    value={activeServerId ?? ""}
                    onChange={(event) => {
                      const nextServerId = Number.parseInt(event.target.value, 10);
                      if (!Number.isFinite(nextServerId)) return;
                      navigate(buildArchivistSectionPath(nextServerId, activeSection));
                    }}
                    className="archivist-field pr-10 text-sm font-medium"
                  >
                    {servers?.map((server: any) => (
                      <option key={server.id} value={server.id}>
                        {server.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {isWorkspaceMode ? (
                <div className="relative min-w-0 flex-1 lg:max-w-[420px]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                  <Input
                    value={searchValue}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setSearchValue(nextValue);
                      updateSearchParam(location, nextValue);
                    }}
                    placeholder={readShellField(shellContent, "shell_copy", "searchPlaceholder", "Search commands, drafts, logs")}
                    className="pl-10"
                  />
                </div>
              ) : null}

              <div className="ml-auto hidden items-center gap-2 xl:flex">
                <StatusPill tone="accent">
                  <ShieldCheck className="mr-1.5 inline h-3.5 w-3.5" />
                  {readShellField(shellContent, "workspace_brand", "workspaceBadgeLabel", mode === "site-editor" ? "Owner Tools" : "Workspace")}
                </StatusPill>
                {activeServer ? <StatusPill>{activeServer.name}</StatusPill> : null}
                <Button asChild variant="outline" className="min-h-11 rounded-[16px] border-white/10 bg-[#121419] text-white hover:border-white/16 hover:bg-[#16191f]">
                  <a href={inviteHref} target="_blank" rel="noopener noreferrer">
                    <UserPlus className="h-4 w-4" />
                    {readShellField(shellContent, "shell_copy", "inviteButtonLabel", "Invite Archivist")}
                  </a>
                </Button>
              </div>

              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="min-h-11 rounded-[16px] px-2.5 normal-case tracking-normal">
                      <img
                        src={getAvatarUrl(user)}
                        alt={user.username}
                        className="h-7 w-7 rounded-[10px] border border-white/10"
                      />
                      <div className="hidden min-w-0 text-left sm:block">
                        <p className="truncate text-sm font-semibold text-white">{user.username}</p>
                        <p className="truncate text-[11px] uppercase tracking-[0.18em] text-white/32">
                          {sectionLabel}
                        </p>
                      </div>
                      <ChevronDown className="h-4 w-4 text-white/40" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 border-white/10 bg-[#0e1013] text-white">
                    <DropdownMenuItem
                      onClick={() => logout.mutate()}
                      disabled={logout.isPending}
                      className="cursor-pointer"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
          </header>

          <main className="min-w-0 flex-1 overflow-y-auto px-3 py-4 pb-[calc(6rem+env(safe-area-inset-bottom))] md:px-6 md:py-6 md:pb-6">
            <div className="mx-auto max-w-[1520px] min-w-0">{children}</div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
