import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Braces, ChevronDown, Gamepad2, LockKeyhole, LogOut, Settings2, Sparkles, UserPlus } from "lucide-react";
import { getSiteEditorFieldValue, type SiteEditorSurfaceDocument } from "@shared/site-editor";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import archivistAvatar from "@assets/archivist-avatar.png";
import {
  ARCHIVIST_NAVIGATION,
  buildArchivistItemPath,
  buildArchivistSectionPath,
  getArchivistSectionFromLocation,
  getServerIdFromLocation,
} from "@/lib/archivist-workspace";
import { useServers } from "@/hooks/use-bot";
import { useAuth, useAuthOptions, useLogout } from "@/hooks/use-auth";
import { usePublishedSiteSurface } from "@/hooks/use-site-content";
import { cn } from "@/lib/utils";

type AppSidebarMode = "workspace" | "overview" | "site-editor";

function readShellField(
  document: SiteEditorSurfaceDocument | undefined,
  sectionId: string,
  fieldKey: string,
  fallback: string,
) {
  return document ? getSiteEditorFieldValue(document, sectionId, fieldKey, fallback) : fallback;
}

export function AppSidebar({ mode = "workspace" }: { mode?: AppSidebarMode }) {
  const [location, navigate] = useLocation();
  const { data: servers } = useServers();
  const { data: user } = useAuth();
  const { data: authOptions } = useAuthOptions();
  const logout = useLogout();
  const { data: shellContent } = usePublishedSiteSurface("dashboard_shell", { enabled: !!user });
  const { isMobile, setOpenMobile } = useSidebar();
  const isWorkspaceMode = mode === "workspace";
  const activeSection = isWorkspaceMode ? getArchivistSectionFromLocation(location) : "commands";
  const activeServerId = isWorkspaceMode ? getServerIdFromLocation(location) : null;
  const [openSection, setOpenSection] = useState(activeSection);
  const activeNavigation = ARCHIVIST_NAVIGATION.find((section) => section.id === openSection) ?? ARCHIVIST_NAVIGATION[0];
  const homeHref = mode === "site-editor" ? "/dashboard/site-editor" : "/dashboard";
  const sidebarBannerImageUrl = readShellField(shellContent, "workspace_brand", "sidebarBannerImageUrl", "").trim();
  const sidebarHeaderBackground = [
    sidebarBannerImageUrl
      ? `linear-gradient(180deg, rgba(5, 7, 10, 0.42), rgba(6, 8, 11, 0.82)), url("${sidebarBannerImageUrl}")`
      : null,
    "radial-gradient(circle at 50% -8%, rgba(255, 45, 77, 0.24), transparent 34%)",
    "radial-gradient(circle at 50% 112%, rgba(140, 19, 39, 0.2), transparent 42%)",
    "radial-gradient(circle at 18% 26%, rgba(255, 45, 77, 0.1), transparent 24%)",
    "linear-gradient(180deg, rgba(9,10,13,0.96), rgba(12,14,18,0.92))",
  ].filter(Boolean).join(", ");
  const sidebarHeaderBackgroundSize = [
    sidebarBannerImageUrl ? "cover" : null,
    "auto",
    "auto",
    "auto",
    "auto",
  ].filter(Boolean).join(", ");
  const sidebarHeaderBackgroundPosition = [
    sidebarBannerImageUrl ? "center top" : null,
    "center center",
    "center center",
    "center center",
    "center center",
  ].filter(Boolean).join(", ");

  useEffect(() => {
    if (!isWorkspaceMode) return;
    setOpenSection(activeSection);
  }, [activeSection, isWorkspaceMode]);

  return (
    <Sidebar variant="inset" className="border-r border-white/6 bg-[#0a0c10] md:max-w-[20rem]">
      <SidebarHeader className="border-b border-white/6 px-4 py-3">
        <div className="overflow-hidden rounded-[24px] border border-[#72212d]/45 bg-[#0b0d11] shadow-[0_24px_64px_rgba(0,0,0,0.42)]">
          <div
            className="relative overflow-hidden px-3.5 pb-3.5 pt-3"
            style={{
              backgroundImage: sidebarHeaderBackground,
              backgroundSize: sidebarHeaderBackgroundSize,
              backgroundPosition: sidebarHeaderBackgroundPosition,
              backgroundRepeat: "no-repeat",
            }}
          >
            <div className="pointer-events-none absolute inset-x-[-12%] top-7 h-[2px] rounded-full bg-[linear-gradient(90deg,rgba(146,14,34,0),rgba(255,43,75,0.92)_20%,rgba(255,241,243,0.96)_50%,rgba(255,43,75,0.92)_80%,rgba(146,14,34,0))] opacity-95 blur-[0.4px]" />
            <div className="pointer-events-none absolute inset-x-[-8%] top-[20px] h-10 rounded-full bg-[radial-gradient(circle,rgba(255,64,94,0.22)_0%,rgba(255,64,94,0.06)_34%,transparent_72%)] blur-2xl" />
            <div className="pointer-events-none absolute left-[4.9rem] top-[29px] h-6 w-px rounded-full bg-[linear-gradient(180deg,rgba(255,88,117,0.72),rgba(255,88,117,0))]" />
            <div className="pointer-events-none absolute left-[6.5rem] top-[31px] h-3 w-[3px] rounded-full bg-[linear-gradient(180deg,rgba(255,124,145,0.88),rgba(255,124,145,0.08))]" />
            <div className="pointer-events-none absolute right-[-18%] top-0 h-20 w-32 rotate-[8deg] bg-[radial-gradient(circle,rgba(255,55,86,0.2),transparent_68%)] blur-[32px]" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-[linear-gradient(180deg,rgba(0,0,0,0),rgba(4,5,7,0.38)_46%,rgba(4,5,7,0.82))]" />

            <div className="relative space-y-3">
              <div className="flex items-start justify-between gap-2.5">
                <Link href={isWorkspaceMode && activeServerId ? buildArchivistSectionPath(activeServerId, activeSection) : homeHref}>
                  <a className="flex min-w-0 items-center gap-3">
                    <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-[15px] border border-white/12 bg-[linear-gradient(180deg,rgba(12,14,18,0.84),rgba(8,10,13,0.96))] shadow-[0_14px_28px_rgba(0,0,0,0.34)]">
                      <div className="absolute inset-[1px] rounded-[13px] bg-[radial-gradient(circle_at_50%_12%,rgba(255,50,82,0.22),transparent_54%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0))]" />
                      <img src={archivistAvatar} alt="Archivist" className="relative h-7 w-7 object-contain drop-shadow-[0_0_16px_rgba(255,54,89,0.32)]" />
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <p className="font-display text-[0.98rem] font-bold tracking-tight text-white">
                        {readShellField(shellContent, "workspace_brand", "brandName", "Archivist")}
                      </p>
                      <p className="hidden max-w-[8.5rem] truncate text-[10px] leading-4 text-white/56 sm:block">
                        {readShellField(shellContent, "workspace_brand", "mobileTagline", "Mobile Control Center")}
                      </p>
                    </div>
                  </a>
                </Link>

                <div className="grid grid-cols-2 gap-2">
                  <a
                    href="/api/invite-url?redirect=1"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      if (isMobile) setOpenMobile(false);
                    }}
                    aria-label={readShellField(shellContent, "shell_copy", "inviteButtonLabel", "Invite Archivist")}
                    title={readShellField(shellContent, "shell_copy", "inviteButtonLabel", "Invite Archivist")}
                    className="group flex h-10 w-10 items-center justify-center rounded-[14px] border border-white/10 bg-[linear-gradient(180deg,rgba(19,22,28,0.9),rgba(12,14,18,0.98))] text-[#ff8798] shadow-[0_10px_20px_rgba(0,0,0,0.28)] transition hover:border-white/16 hover:text-white"
                  >
                    <UserPlus className="h-4 w-4 transition group-hover:scale-105" />
                  </a>
                  {user ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (isMobile) setOpenMobile(false);
                        logout.mutate();
                      }}
                      disabled={logout.isPending}
                      aria-label={logout.isPending ? "Signing out" : "Log out"}
                      title={logout.isPending ? "Signing out" : "Log out"}
                      className="group flex h-10 w-10 items-center justify-center rounded-[14px] border border-white/10 bg-[linear-gradient(180deg,rgba(19,22,28,0.9),rgba(12,14,18,0.98))] text-white/72 shadow-[0_10px_20px_rgba(0,0,0,0.28)] transition hover:border-white/16 hover:text-white disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      <LogOut className="h-4 w-4 transition group-hover:scale-105" />
                    </button>
                  ) : null}
                </div>
              </div>

              {isWorkspaceMode ? (
                <label className="block space-y-2">
                  <span className="archivist-kicker">Server</span>
                  <div className="relative">
                    <select
                      value={activeServerId ?? ""}
                      onChange={(event) => {
                        const nextServerId = Number.parseInt(event.target.value, 10);
                        if (!Number.isFinite(nextServerId)) return;
                        navigate(buildArchivistSectionPath(nextServerId, activeSection));
                      }}
                      className="archivist-field border-white/8 bg-black/25 pr-10 text-sm font-medium backdrop-blur-xl"
                    >
                      {servers?.map((server: any) => (
                        <option key={server.id} value={server.id}>
                          {server.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/36" />
                  </div>
                </label>
              ) : (
                <div className="rounded-[14px] border border-white/8 bg-black/20 px-3 py-3">
                  <p className="archivist-kicker">{mode === "site-editor" ? "Owner Tools" : "Dashboard"}</p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {mode === "site-editor" ? "Site Editor" : "Choose a server"}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-white/54">
                    {mode === "site-editor"
                      ? "Edit live landing, login, and dashboard shell surfaces without dropping into a server workspace."
                      : "Use the dashboard overview to open a connected server workspace."}
                  </p>
                </div>
              )}

              {user?.ownerAccess || authOptions?.ownerLoginEnabled ? (
                <Link href="/dashboard/site-editor">
                  <a className="flex items-center justify-between gap-3 rounded-[14px] border border-[#822434]/38 bg-[linear-gradient(180deg,rgba(28,14,18,0.78),rgba(19,11,14,0.96))] px-3 py-2 text-white/82 transition hover:border-[#c24e63] hover:text-white">
                    <div className="flex items-center gap-2.5">
                      {user?.ownerAccess ? (
                        <Sparkles className="h-4 w-4 text-[#ff8194]" />
                      ) : (
                        <LockKeyhole className="h-4 w-4 text-[#ff8194]" />
                      )}
                      <span className="text-sm font-medium">Site Editor</span>
                    </div>
                    <span className="text-[11px] uppercase tracking-[0.18em] text-white/36">
                      {user?.ownerAccess ? "Owner" : "Unlock"}
                    </span>
                  </a>
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        {!isWorkspaceMode ? (
          <div className="space-y-4">
            <div className="rounded-[20px] border border-white/8 bg-[#111318] p-3">
              <p className="archivist-kicker">Quick Links</p>
              <div className="mt-3 space-y-2">
                <Link href={homeHref}>
                  <a
                    onClick={() => {
                      if (isMobile) setOpenMobile(false);
                    }}
                    className="block rounded-[16px] border border-white/8 bg-[#171a20] px-3 py-3 text-sm text-white/82 transition hover:border-white/14 hover:text-white"
                  >
                    {mode === "site-editor" ? "Open Site Editor" : "Dashboard Overview"}
                  </a>
                </Link>
                {mode === "site-editor" ? (
                  <Link href="/dashboard">
                    <a
                      onClick={() => {
                        if (isMobile) setOpenMobile(false);
                      }}
                      className="block rounded-[16px] border border-white/8 bg-[#111318] px-3 py-3 text-sm text-white/68 transition hover:border-white/14 hover:text-white"
                    >
                      Back to dashboard
                    </a>
                  </Link>
                ) : null}
                {mode === "overview" && servers?.[0] ? (
                  <Link href={buildArchivistSectionPath(servers[0].id, "commands")}>
                    <a
                      onClick={() => {
                        if (isMobile) setOpenMobile(false);
                      }}
                      className="block rounded-[16px] border border-white/8 bg-[#111318] px-3 py-3 text-sm text-white/68 transition hover:border-white/14 hover:text-white"
                    >
                      Open first workspace
                    </a>
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="archivist-kicker px-1">Sections</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {ARCHIVIST_NAVIGATION.map((section) => {
                  const sectionActive = activeSection === section.id;
                  const selected = openSection === section.id;
                  const SectionIcon = getSectionIcon(section.id);

                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => {
                        setOpenSection(section.id);
                        if (activeServerId) {
                          navigate(buildArchivistSectionPath(activeServerId, section.id));
                          if (isMobile) setOpenMobile(false);
                        }
                      }}
                      className={cn(
                        "rounded-[18px] border px-3 py-3 text-left transition",
                        selected
                          ? "border-white/12 bg-[#15181e] text-white"
                          : "border-white/8 bg-[#111318] text-white/70 hover:border-white/12 hover:text-white",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] border border-white/8 bg-[#181b21]", sectionActive ? "text-[#ff7587]" : "text-white/56")}>
                          <SectionIcon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white">{section.label}</p>
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/44">{section.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[20px] border border-white/8 bg-[#111318]">
              <div className="flex items-center justify-between gap-3 border-b border-white/6 px-4 py-3">
                <div>
                  <p className="archivist-kicker">Tools</p>
                  <p className="mt-1 text-sm font-semibold text-white">{activeNavigation.label}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-white/30" />
              </div>
              <div className="space-y-1 p-2">
                {activeNavigation.items.map((item) => {
                  const href = activeServerId ? buildArchivistItemPath(activeServerId, activeNavigation.id, item.slug) : "/dashboard";
                  const isActive = location.startsWith(href);
                  return (
                    <Link key={item.id} href={href}>
                      <a
                        onClick={() => {
                          if (isMobile) setOpenMobile(false);
                        }}
                        className={cn(
                          "block rounded-[16px] px-3 py-3 text-sm transition",
                          isActive
                            ? "bg-[#1b1f26] text-white shadow-[inset_2px_0_0_#b64255]"
                            : "text-white/62 hover:bg-[#171a20] hover:text-white",
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span>{item.label}</span>
                          {isActive ? <span className="text-xs text-[#ff90a0]">Open</span> : null}
                        </div>
                      </a>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </SidebarContent>

    </Sidebar>
  );
}

function getSectionIcon(section: string) {
  switch (section) {
    case "commands":
      return Braces;
    case "studio":
      return Sparkles;
    case "creative":
      return Gamepad2;
    case "settings":
    default:
      return Settings2;
  }
}
