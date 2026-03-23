import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getSiteEditorFieldValue, getSiteEditorSurfaceLabel, type SiteEditorSurfaceDocument, type SiteEditorSurfaceKey } from "@/lib/site-editor";

export function SiteEditorPreview({
  surface,
  document,
}: {
  surface: SiteEditorSurfaceKey;
  document: SiteEditorSurfaceDocument;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="archivist-eyebrow">Preview</p>
          <h2 className="mt-2 text-xl font-semibold text-white">{getSiteEditorSurfaceLabel(surface)} preview</h2>
        </div>
        <Badge variant="secondary" className="rounded-full">
          Draft snapshot
        </Badge>
      </div>

      {surface === "landing" ? renderLandingPreview(document) : null}
      {surface === "login" ? renderLoginPreview(document) : null}
      {surface === "dashboard_shell" ? renderDashboardShellPreview(document) : null}
    </div>
  );
}

function renderLandingPreview(document: SiteEditorSurfaceDocument) {
  const hero = document.sections.find((section) => section.id === "hero");
  const productRows = document.sections.find((section) => section.id === "product_rows");
  const previewPanel = document.sections.find((section) => section.id === "preview_panel");
  const finalCta = document.sections.find((section) => section.id === "final_cta");

  return (
    <div className="space-y-4 rounded-[28px] border border-white/10 bg-[#060709] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.34)]">
      <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(17,19,24,0.98),rgba(8,9,12,0.96))] p-5">
        <div className="flex flex-wrap gap-2">
          <Badge>{String(getSiteEditorFieldValue(hero, "badgePrimary") || "Command-first")}</Badge>
          <Badge variant="secondary">{String(getSiteEditorFieldValue(hero, "badgeSecondary") || "Live Discord workspace")}</Badge>
        </div>
        <h3 className="mt-4 max-w-xl font-display text-3xl font-bold leading-[0.95] text-white">
          {String(getSiteEditorFieldValue(hero, "titleLineOne") || "Build the server.")}
          <span className="block text-[#ff6479]">{String(getSiteEditorFieldValue(hero, "titleAccent") || "Not a pile of modules.")}</span>
        </h3>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-white/58">{String(getSiteEditorFieldValue(hero, "body") || "")}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button className="rounded-[16px]" disabled>
            {String(getSiteEditorFieldValue(hero, "primaryCtaLabel") || "Go to Dashboard")}
          </Button>
          <Button variant="outline" className="rounded-[16px] border-white/10 bg-white/[0.03] text-white" disabled>
            {String(getSiteEditorFieldValue(hero, "secondaryCtaLabel") || "Login with Discord")}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {[
          ["row1Title", "row1Body"],
          ["row2Title", "row2Body"],
          ["row3Title", "row3Body"],
        ].map(([titleKey, bodyKey]) => (
          <Card key={titleKey} className="border-white/8 bg-[#0b0d10]">
            <CardContent className="space-y-2 p-4">
              <p className="text-sm font-semibold text-white">{String(getSiteEditorFieldValue(productRows, titleKey) || "")}</p>
              <p className="text-sm leading-6 text-white/50">{String(getSiteEditorFieldValue(productRows, bodyKey) || "")}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {[
          ["feature1Label", "feature1Body"],
          ["feature2Label", "feature2Body"],
          ["feature3Label", "feature3Body"],
        ].map(([titleKey, bodyKey]) => (
          <Card key={titleKey} className="border-white/8 bg-[#0b0d10]">
            <CardContent className="space-y-2 p-4">
              <p className="text-sm font-semibold text-white">{String(getSiteEditorFieldValue(previewPanel, titleKey) || "")}</p>
              <p className="text-sm leading-6 text-white/50">{String(getSiteEditorFieldValue(previewPanel, bodyKey) || "")}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="rounded-[24px] border border-white/10 bg-[#0b0d10] p-4">
        <p className="text-lg font-semibold text-white">{String(getSiteEditorFieldValue(finalCta, "title") || "")}</p>
        <p className="mt-2 text-sm leading-6 text-white/58">{String(getSiteEditorFieldValue(finalCta, "body") || "")}</p>
      </div>
    </div>
  );
}

function renderLoginPreview(document: SiteEditorSurfaceDocument) {
  const hero = document.sections.find((section) => section.id === "hero");
  const trust = document.sections.find((section) => section.id === "trust_points");
  const ownerAccess = document.sections.find((section) => section.id === "owner_access");
  const footer = document.sections.find((section) => section.id === "footer_copy");

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.84fr)]">
      <div className="rounded-[28px] border border-white/10 bg-[#08090c] p-5">
        <p className="text-[10px] uppercase tracking-[0.3em] text-white/34">{String(getSiteEditorFieldValue(hero, "eyebrow") || "")}</p>
        <h3 className="mt-3 text-3xl font-bold leading-[0.95] text-white">{String(getSiteEditorFieldValue(hero, "title") || "")}</h3>
        <p className="mt-3 text-sm leading-7 text-white/58">{String(getSiteEditorFieldValue(hero, "body") || "")}</p>
      </div>

      <div className="space-y-3">
        {[
          ["point1", "Server list access only"],
          ["point2", "No message reading"],
          ["point3", "Revoke anytime from Discord"],
        ].map(([key, fallback]) => (
          <div key={key} className="rounded-[20px] border border-white/8 bg-[#0b0d10] px-4 py-4">
            <p className="text-sm font-medium text-white">{String(getSiteEditorFieldValue(trust, key) || fallback)}</p>
          </div>
        ))}

        <div className="rounded-[24px] border border-[#7d2432] bg-[#120b10] p-4">
          <p className="text-sm font-semibold text-white">{String(getSiteEditorFieldValue(ownerAccess, "title") || "Owner Access")}</p>
          <p className="mt-2 text-sm leading-6 text-white/56">{String(getSiteEditorFieldValue(ownerAccess, "body") || "")}</p>
        </div>
      </div>

      <div className="lg:col-span-2 rounded-[22px] border border-white/8 bg-[#090b0f] px-4 py-4 text-center text-xs uppercase tracking-[0.3em] text-white/36">
        {String(getSiteEditorFieldValue(footer, "tagline") || "")}
      </div>
    </div>
  );
}

function renderDashboardShellPreview(document: SiteEditorSurfaceDocument) {
  const brand = document.sections.find((section) => section.id === "workspace_brand");
  const shellCopy = document.sections.find((section) => section.id === "shell_copy");

  return (
    <div className="space-y-4 rounded-[28px] border border-white/10 bg-[#08090c] p-4">
      <div className="rounded-[24px] border border-white/10 bg-[#0b0d10] p-5">
        <p className="text-[10px] uppercase tracking-[0.3em] text-white/34">
          {String(getSiteEditorFieldValue(brand, "workspaceBadgeLabel") || "Workspace")}
        </p>
        <h3 className="mt-3 text-2xl font-bold text-white">{String(getSiteEditorFieldValue(brand, "brandName") || "Archivist")}</h3>
        <p className="mt-3 text-sm leading-7 text-white/58">{String(getSiteEditorFieldValue(brand, "mobileTagline") || "")}</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {[
          ["searchPlaceholder", "Search commands, drafts, logs"],
          ["inviteButtonLabel", "Invite Archivist"],
          ["footerTitle", "Directive"],
          ["footerBody", "Keep the first view simple."],
        ].map(([labelKey, fallback]) => (
          <div key={labelKey} className="rounded-[18px] border border-white/8 bg-[#0b0d10] px-4 py-3 text-sm text-white/74">
            {String(getSiteEditorFieldValue(shellCopy, labelKey) || fallback)}
          </div>
        ))}
      </div>
    </div>
  );
}
