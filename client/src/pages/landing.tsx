import { useMemo, useState } from "react";
import { Link } from "wouter";
import { SiDiscord } from "react-icons/si";
import {
  ArrowRight,
  Braces,
  Laugh,
  Menu,
  Palette,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { getSiteEditorFieldValue, type SiteEditorSurfaceDocument } from "@shared/site-editor";
import { Button } from "@/components/ui/button";
import { SurfacePanel, SurfaceRow, StatusPill } from "@/components/layout/archivist-surfaces";
import { useServers, useStats } from "@/hooks/use-bot";
import { useAuth, getAvatarUrl } from "@/hooks/use-auth";
import { usePublishedSiteSurface } from "@/hooks/use-site-content";
import { buildArchivistSectionPath } from "@/lib/archivist-workspace";
import archivistLogo from "@assets/FDEBE754-F9DF-41D4-A19B-B2933432B230_1772114960531.png";
import archivistAvatar from "@assets/archivist-avatar.png";
import heroArt from "@assets/hero-art.png";
import dashboardArt from "@assets/dashboard-art.png";

function formatStat(value: number | null | undefined, fallback = "0") {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return value.toLocaleString();
}

const PRODUCT_ROWS = [
  {
    id: "commands",
    title: "Custom Commands",
    description: "Triggers, filters, conditions, roles, messages, delays, and branching in one command system.",
    icon: Braces,
  },
  {
    id: "studio",
    title: "Design Studio",
    description: "Live Discord message building with drafts, reusable layouts, components, and visual feedback.",
    icon: Palette,
  },
  {
    id: "creative",
    title: "Fun & Creative",
    description: "Lighter community tools that stay sharp, useful, and secondary to the real workspace.",
    icon: Laugh,
  },
] as const;

function readField(
  document: SiteEditorSurfaceDocument | undefined,
  sectionId: string,
  fieldKey: string,
  fallback: string,
) {
  return document ? getSiteEditorFieldValue(document, sectionId, fieldKey, fallback) : fallback;
}

function isSectionVisible(document: SiteEditorSurfaceDocument | undefined, sectionId: string) {
  return document?.sections.find((section) => section.id === sectionId)?.visible ?? true;
}

export default function Landing() {
  const { data: stats } = useStats();
  const { data: user } = useAuth();
  const { data: servers } = useServers({ enabled: !!user });
  const { data: surfaceContent } = usePublishedSiteSurface("landing");
  const [navOpen, setNavOpen] = useState(false);

  const firstServerId = Array.isArray(servers) && servers.length > 0 ? servers[0]?.id : null;
  const workspaceHref = firstServerId ? buildArchivistSectionPath(firstServerId, "commands") : "/dashboard";
  const dashboardHref = user ? workspaceHref : "/login";
  const secondaryHref = user ? "/api/invite-url?redirect=1" : "/auth/discord";
  const secondaryTarget = user ? "_blank" : undefined;
  const secondaryRel = user ? "noopener noreferrer" : undefined;
  const heroSecondaryLabel = user
    ? "Invite Archivist"
    : readField(surfaceContent, "hero", "secondaryCtaLabel", "Login with Discord");
  const finalSecondaryLabel = user
    ? "Invite Archivist"
    : readField(surfaceContent, "final_cta", "secondaryCtaLabel", "Login with Discord");

  const productRows = [
    {
      id: "commands",
      title: readField(surfaceContent, "product_rows", "row1Title", PRODUCT_ROWS[0].title),
      description: readField(surfaceContent, "product_rows", "row1Body", PRODUCT_ROWS[0].description),
      icon: Braces,
    },
    {
      id: "studio",
      title: readField(surfaceContent, "product_rows", "row2Title", PRODUCT_ROWS[1].title),
      description: readField(surfaceContent, "product_rows", "row2Body", PRODUCT_ROWS[1].description),
      icon: Palette,
    },
    {
      id: "creative",
      title: readField(surfaceContent, "product_rows", "row3Title", PRODUCT_ROWS[2].title),
      description: readField(surfaceContent, "product_rows", "row3Body", PRODUCT_ROWS[2].description),
      icon: Laugh,
    },
  ] as const;

  const heroMetrics = useMemo(
    () => [
      {
        label: readField(surfaceContent, "metrics", "serversLabel", "Servers"),
        value: formatStat(stats?.totalServers),
      },
      {
        label: readField(surfaceContent, "metrics", "membersLabel", "Members"),
        value: formatStat(stats?.totalMembers),
      },
      {
        label: readField(surfaceContent, "metrics", "commandsLabel", "Commands"),
        value: formatStat(stats?.commandsExecuted),
      },
      {
        label: readField(surfaceContent, "metrics", "statusLabel", "Status"),
        value: stats?.bot?.ready ? "Connected" : "Offline",
      },
    ],
    [stats, surfaceContent],
  );

  return (
    <div className="min-h-screen bg-[#050608] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(185,28,47,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(122,13,27,0.24),transparent_36%)]" />

      <header className="sticky top-0 z-30 border-b border-white/6 bg-[#090a0d]/92 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-6">
          <button
            type="button"
            onClick={() => setNavOpen((current) => !current)}
            className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-white/10 bg-[#0d0f12] text-white/74 transition hover:border-[#7d2432] hover:text-white lg:hidden"
            aria-label="Toggle navigation"
          >
            {navOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>

          <Link
            href="/"
            className="absolute left-1/2 flex max-w-[calc(100%-7rem)] -translate-x-1/2 items-center gap-3 lg:static lg:max-w-none lg:translate-x-0"
          >
            <div className="h-11 w-11 overflow-hidden rounded-[14px] border border-[#74202d] bg-black/40 shadow-[0_0_24px_rgba(177,18,38,0.18)]">
              <img src={archivistLogo} alt="Archivist" className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0">
              <p className="font-display text-lg font-bold tracking-tight text-white">Archivist</p>
              <p className="hidden text-[10px] uppercase tracking-[0.28em] text-white/34 sm:block">Discord control system</p>
            </div>
          </Link>

          <div className="hidden items-center gap-2 sm:flex">
            {user ? (
              <Button asChild variant="outline">
                <a href={workspaceHref}>
                  <img src={getAvatarUrl(user)} alt="" className="h-4 w-4 rounded-full" />
                  Dashboard
                </a>
              </Button>
            ) : (
              <Button asChild variant="outline">
                <a href="/auth/discord">
                  <SiDiscord className="h-4 w-4" />
                  Login
                </a>
              </Button>
            )}
            <Button asChild className="px-4">
              <a href={dashboardHref}>{readField(surfaceContent, "hero", "primaryCtaLabel", "Go to Dashboard")}</a>
            </Button>
          </div>

          <div className="h-10 w-10 shrink-0 sm:hidden" aria-hidden="true" />
        </div>

        {navOpen ? (
          <div className="border-t border-white/6 bg-[#0a0c0f] px-4 py-3 lg:hidden">
            <div className="space-y-2">
              {productRows.map((row) => (
                <a
                  key={row.id}
                  href={`#${row.id}`}
                  onClick={() => setNavOpen(false)}
                  className="flex items-center justify-between rounded-[16px] border border-white/8 bg-[#0d0f12] px-4 py-3 text-sm text-white/76"
                >
                  <span>{row.title}</span>
                  <ArrowRight className="h-4 w-4 text-white/36" />
                </a>
              ))}
              <a
                href={secondaryHref}
                target={secondaryTarget}
                rel={secondaryRel}
                className="flex items-center justify-between rounded-[16px] border border-[#74202d] bg-[#140d11] px-4 py-3 text-sm text-white"
              >
                <span>{heroSecondaryLabel}</span>
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        ) : null}
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-4 pb-16 pt-5 md:px-6 md:pb-24 md:pt-8">
        <section className="archivist-panel overflow-hidden">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
            <div className="relative px-5 py-6 md:px-8 md:py-8">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,45,77,0.18),transparent_34%)]" />
              <div className="relative">
                <div className="flex flex-wrap gap-2">
                  <StatusPill tone="accent">{readField(surfaceContent, "hero", "badgePrimary", "Command-first")}</StatusPill>
                  <StatusPill>{readField(surfaceContent, "hero", "badgeSecondary", "Live Discord workspace")}</StatusPill>
                </div>
                <h1 className="mt-5 max-w-3xl font-display text-[2.5rem] font-bold leading-[0.94] tracking-tight text-white md:text-[4.5rem]">
                  {readField(surfaceContent, "hero", "titleLineOne", "Build the server.")}
                  <span className="block text-[#ff6479]">{readField(surfaceContent, "hero", "titleAccent", "Not a pile of modules.")}</span>
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/60 md:text-base">
                  {readField(
                    surfaceContent,
                    "hero",
                    "body",
                    "Archivist turns triggers, conditions, message design, and server behavior into one dark control workspace.",
                  )}
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Button asChild size="lg">
                    <a href={dashboardHref}>
                      {readField(surfaceContent, "hero", "primaryCtaLabel", "Go to Dashboard")}
                      <ArrowRight className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <a href={secondaryHref} target={secondaryTarget} rel={secondaryRel}>
                      {user ? null : <SiDiscord className="h-4 w-4" />}
                      {heroSecondaryLabel}
                    </a>
                  </Button>
                </div>

                <div className="mt-7 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  {heroMetrics.map((metric) => (
                    <div key={metric.label} className="rounded-[18px] border border-white/8 bg-[#0b0d10]/88 px-3 py-3">
                      <p className="text-[10px] uppercase tracking-[0.22em] text-white/34">{metric.label}</p>
                      <p className="mt-2 text-sm font-semibold text-white md:text-base">{metric.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="relative min-h-[320px] border-t border-white/6 bg-[#060709] lg:min-h-full lg:border-l lg:border-t-0">
              <img src={heroArt} alt="" className="absolute inset-0 h-full w-full object-cover opacity-78" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,6,8,0.18),rgba(5,6,8,0.78))]" />
              <div className="relative flex h-full flex-col justify-end gap-4 px-5 py-5 md:px-7 md:py-7">
                <div className="max-w-sm rounded-[20px] border border-white/10 bg-[#090b0e]/86 p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-[#7d2432] bg-[#140d11]">
                      <img src={archivistAvatar} alt="" className="h-7 w-7 object-contain" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Archivist runtime</p>
                      <p className="text-xs uppercase tracking-[0.18em] text-white/36">custom commands + studio</p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-3 text-sm text-white/62">
                    <div className="flex items-center justify-between">
                      <span>Slash + keyword triggers</span>
                      <span className="text-white">Live</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Studio message sends</span>
                      <span className="text-white">Ready</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Role and channel actions</span>
                      <span className="text-white">Active</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {isSectionVisible(surfaceContent, "product_rows") ? (
          <section className="mt-4">
            <SurfacePanel>
              <div className="border-b border-white/6 px-4 py-4 md:px-6">
                <p className="archivist-eyebrow">{readField(surfaceContent, "product_rows", "eyebrow", "Core systems")}</p>
                <h2 className="mt-2 text-xl font-semibold text-white md:text-2xl">
                  {readField(surfaceContent, "product_rows", "title", "Three systems. One product.")}
                </h2>
              </div>
              {productRows.map((row) => {
                const Icon = row.icon;
                return (
                  <div key={row.id} id={row.id}>
                    <SurfaceRow
                      title={row.title}
                      description={row.description}
                      accent={(
                        <div className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-white/8 bg-[#100d10] text-[#ff6479]">
                          <Icon className="h-4 w-4" />
                        </div>
                      )}
                      meta={<ArrowRight className="h-4 w-4 text-white/28" />}
                      className="scroll-mt-24"
                    />
                  </div>
                );
              })}
            </SurfacePanel>
          </section>
        ) : null}

        <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          {isSectionVisible(surfaceContent, "preview_panel") ? (
            <SurfacePanel className="overflow-hidden">
              <div className="border-b border-white/6 px-4 py-4 md:px-6">
                <p className="archivist-eyebrow">{readField(surfaceContent, "preview_panel", "eyebrow", "Product preview")}</p>
                <h2 className="mt-2 text-xl font-semibold text-white md:text-2xl">
                  {readField(surfaceContent, "preview_panel", "title", "A real workspace, not a promo screen.")}
                </h2>
              </div>
              <div className="space-y-4 px-4 py-4 md:px-6 md:py-6">
                <div className="rounded-[22px] border border-white/10 bg-[#090b0e] p-3">
                  <img src={dashboardArt} alt="Archivist workspace preview" className="h-auto w-full rounded-[18px] border border-white/10 object-cover" />
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <PreviewRow
                    icon={Search}
                    label={readField(surfaceContent, "preview_panel", "feature1Label", "Quick access")}
                    body={readField(surfaceContent, "preview_panel", "feature1Body", "Find commands, drafts, and logs without leaving the workspace.")}
                  />
                  <PreviewRow
                    icon={ShieldCheck}
                    label={readField(surfaceContent, "preview_panel", "feature2Label", "Command safety")}
                    body={readField(surfaceContent, "preview_panel", "feature2Body", "Filters, permissions, conditions, and action flow stay visible while you build.")}
                  />
                  <PreviewRow
                    icon={Sparkles}
                    label={readField(surfaceContent, "preview_panel", "feature3Label", "Studio linked")}
                    body={readField(surfaceContent, "preview_panel", "feature3Body", "Pick saved message designs directly inside command actions.")}
                  />
                </div>
              </div>
            </SurfacePanel>
          ) : null}

          {isSectionVisible(surfaceContent, "copy_points") ? (
            <SurfacePanel>
              <div className="border-b border-white/6 px-4 py-4 md:px-6">
                <p className="archivist-eyebrow">{readField(surfaceContent, "copy_points", "eyebrow", "Built for Discord owners")}</p>
                <h2 className="mt-2 text-xl font-semibold text-white md:text-2xl">
                  {readField(surfaceContent, "copy_points", "title", "Short copy. Clear control. Real outcomes.")}
                </h2>
              </div>
              <div className="divide-y divide-white/6">
                {[
                  readField(surfaceContent, "copy_points", "point1", "Welcome, verify, moderation, and rules flows belong inside Custom Commands."),
                  readField(surfaceContent, "copy_points", "point2", "Design Studio drafts plug directly into command actions instead of living on their own island."),
                  readField(surfaceContent, "copy_points", "point3", "Fun & Creative stays present, but never overwhelms the command engine."),
                  readField(surfaceContent, "copy_points", "point4", "Everything stays dark, sharp, and mobile-usable without turning into stacked marketing boxes."),
                ].map((line) => (
                  <div key={line} className="flex items-start gap-3 px-4 py-4 md:px-6">
                    <div className="mt-1 h-2.5 w-2.5 rounded-full bg-[#ff4b62] shadow-[0_0_12px_rgba(255,75,98,0.42)]" />
                    <p className="text-sm leading-7 text-white/58">{line}</p>
                  </div>
                ))}
              </div>
            </SurfacePanel>
          ) : null}
        </section>

        {isSectionVisible(surfaceContent, "final_cta") ? (
          <section className="mt-4">
            <SurfacePanel className="overflow-hidden">
              <div className="flex flex-col gap-5 px-4 py-5 md:px-6 md:py-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-2">
                  <p className="archivist-eyebrow">{readField(surfaceContent, "final_cta", "eyebrow", "Open the workspace")}</p>
                  <h2 className="text-2xl font-semibold text-white md:text-3xl">
                    {readField(surfaceContent, "final_cta", "title", "Step into Archivist.")}
                  </h2>
                  <p className="max-w-2xl text-sm leading-6 text-white/54">
                    {readField(
                      surfaceContent,
                      "final_cta",
                      "body",
                      "Use the dashboard if you are ready to build. Invite the bot if the server connection comes first.",
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button asChild size="lg">
                    <a href={dashboardHref}>{readField(surfaceContent, "final_cta", "primaryCtaLabel", "Open Dashboard")}</a>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <a href={secondaryHref} target={secondaryTarget} rel={secondaryRel}>
                      {finalSecondaryLabel}
                    </a>
                  </Button>
                </div>
              </div>
            </SurfacePanel>
          </section>
        ) : null}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/8 bg-[#090a0d]/94 px-3 py-3 backdrop-blur-xl md:hidden">
        <div className="mx-auto flex max-w-7xl gap-2">
          <Button asChild className="flex-1">
            <a href={dashboardHref}>{readField(surfaceContent, "final_cta", "primaryCtaLabel", "Go to Dashboard")}</a>
          </Button>
          <Button asChild variant="outline" className="flex-1">
            <a href={secondaryHref} target={secondaryTarget} rel={secondaryRel}>
              {finalSecondaryLabel}
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}

function PreviewRow({
  icon: Icon,
  label,
  body,
}: {
  icon: typeof Search;
  label: string;
  body: string;
}) {
  return (
    <div className="rounded-[18px] border border-white/8 bg-[#0b0d10] px-4 py-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-white/8 bg-[#100d10] text-[#ff6479]">
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-4 text-sm font-semibold text-white">{label}</p>
      <p className="mt-1 text-sm leading-6 text-white/50">{body}</p>
    </div>
  );
}
