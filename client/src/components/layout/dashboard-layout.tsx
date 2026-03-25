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
  fun: "Fun And Creative",
  server: "Server Management",
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
      ? "Owner Tools"
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

  return (
    <SidebarProvider style={style}>
      <div className="relative flex min-h-screen w-full bg-[var(--bg-app)] text-[var(--text-primary)]">
        <AppSidebar mode={mode} />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-[var(--border-subtle)] bg-[var(--bg-app)]/80 backdrop-blur-xl">
            <div className="flex h-16 items-center justify-between px-4 md:px-6">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="md:hidden" />
                <div className="hidden flex-col md:flex">
                  <p className="archivist-kicker leading-none">Workspace</p>
                  <p className="mt-1.5 text-sm font-bold leading-none">{sectionLabel}</p>
                </div>
              </div>

              <div className="flex flex-1 items-center justify-end gap-3">
                {isWorkspaceMode && (
                  <div className="relative hidden max-w-sm flex-1 lg:block">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-faint)]" />
                    <Input
                      value={searchValue}
                      onChange={(e) => {
                        setSearchValue(e.target.value);
                        updateSearchParam(location, e.target.value);
                      }}
                      placeholder="Search workspace..."
                      className="h-9 border-[var(--border-default)] bg-[var(--bg-panel-inset)] pl-9 text-sm focus:border-[var(--accent-primary)]"
                    />
                  </div>
                )}

                {user && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-panel-raised)] p-1 pr-2 transition-colors hover:border-[var(--border-strong)]">
                        <img
                          src={getAvatarUrl(user)}
                          alt={user.username}
                          className="h-7 w-7 rounded-md object-cover"
                        />
                        <span className="hidden text-xs font-bold sm:inline">{user.username}</span>
                        <ChevronDown className="h-3 w-3 text-[var(--text-faint)]" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 border-[var(--border-default)] bg-[var(--bg-panel)]">
                      <DropdownMenuItem onClick={() => logout.mutate()} className="text-[var(--danger)] focus:text-[var(--danger)]">
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
