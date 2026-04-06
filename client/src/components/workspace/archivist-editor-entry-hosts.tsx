import { useSearch } from "wouter";
import { ArrowUpRight, BadgePlus, LayoutTemplate } from "lucide-react";
import type { StudioEntryIntent } from "@/components/design-studio-v2/studio-v2-empty-state";
import { inferStudioPrimarySurfaceType } from "@/components/design-studio/studio-defaults";
import { DesignStudioTab } from "@/components/design-studio/design-studio-tab";
import { CustomCommandV2Forge, type CommandForgeEntryIntent } from "@/components/server-shell/custom-command-v2/custom-command-v2-forge";
import { buildArchivistItemPath } from "@/lib/archivist-workspace";

type CommandEntryId =
  | "commands-slash"
  | "commands-message"
  | "commands-buttons"
  | "commands-selects"
  | "commands-modals"
  | "commands-scheduled"
  | "commands-member-join"
  | "commands-role-change"
  | "commands-reaction"
  | "commands-internal";

type StudioEntryId =
  | "studio-create"
  | "studio-embeds"
  | "studio-components"
  | "studio-welcome"
  | "studio-verify"
  | "studio-tickets"
  | "studio-announcements";


function getCommandFamily(command: any) {
  switch (command?.triggerType) {
    case "slash":
    case "keyword":
    case "button":
    case "select":
    case "modal_submit":
    case "schedule":
    case "join":
    case "role_add":
    case "reaction":
      return command.triggerType;
    default:
      return "other";
  }
}

function getCommandStatusLabel(command: any) {
  const issues = Array.isArray(command?.lastValidation) ? command.lastValidation : [];
  if (issues.some((entry: any) => entry?.severity === "error")) return "Needs fix";
  if (!command?.enabled) return "Draft";
  if (issues.some((entry: any) => entry?.severity === "warning")) return "Review";
  return "Live";
}

function getCommandRouteForTrigger(triggerType: string) {
  switch (triggerType) {
    case "schedule":
      return "scheduled-triggers";
    case "join":
      return "member-join-triggers";
    case "role_add":
      return "role-change-triggers";
    case "reaction":
      return "reaction-triggers";
    case "button":
      return "button-triggers";
    case "select":
      return "select-menu-triggers";
    case "modal_submit":
      return "modal-triggers";
    default:
      return "internal-triggers";
  }
}

const COMMAND_ENTRY_CONFIG: Record<CommandEntryId, {
  routeSlug: string;
  eyebrow: string;
  intent: CommandForgeEntryIntent;
  matches: (command: any) => boolean;
}> = {
  "commands-slash": {
    routeSlug: "slash-commands",
    eyebrow: "Slash commands",
    intent: { triggerType: "slash", draftName: "New Slash Command", draftDescription: "Run this slash command in Archivist.", showStarterOnNewDraft: false, routeSlug: "slash-commands" },
    matches: (command) => getCommandFamily(command) === "slash",
  },
  "commands-message": {
    routeSlug: "message-commands",
    eyebrow: "Message commands",
    intent: { triggerType: "keyword", draftName: "Keyword Reply", draftDescription: "Watch for a message pattern and respond.", showStarterOnNewDraft: false, routeSlug: "message-commands" },
    matches: (command) => getCommandFamily(command) === "keyword",
  },
  "commands-buttons": {
    routeSlug: "button-triggers",
    eyebrow: "Button triggers",
    intent: { triggerType: "button", draftName: "Button Flow", draftDescription: "Continue when a saved button is pressed.", showStarterOnNewDraft: false, routeSlug: "button-triggers" },
    matches: (command) => getCommandFamily(command) === "button",
  },
  "commands-selects": {
    routeSlug: "select-menu-triggers",
    eyebrow: "Select menus",
    intent: { triggerType: "select", draftName: "Select Menu Flow", draftDescription: "Continue when a member chooses from a saved menu.", showStarterOnNewDraft: false, routeSlug: "select-menu-triggers" },
    matches: (command) => getCommandFamily(command) === "select",
  },
  "commands-modals": {
    routeSlug: "modal-triggers",
    eyebrow: "Modals",
    intent: { triggerType: "modal_submit", draftName: "Modal Follow-up", draftDescription: "Continue when a saved modal is submitted.", showStarterOnNewDraft: false, routeSlug: "modal-triggers" },
    matches: (command) => getCommandFamily(command) === "modal_submit",
  },
  "commands-scheduled": {
    routeSlug: "scheduled-triggers",
    eyebrow: "Scheduled",
    intent: { triggerType: "schedule", draftName: "Scheduled Routine", draftDescription: "Run this automation on a recurring schedule.", showStarterOnNewDraft: false, routeSlug: "scheduled-triggers" },
    matches: (command) => getCommandFamily(command) === "schedule",
  },
  "commands-member-join": {
    routeSlug: "member-join-triggers",
    eyebrow: "Member join",
    intent: { triggerType: "join", draftName: "Member Join Flow", draftDescription: "Run this automation when a member joins the server.", showStarterOnNewDraft: false, routeSlug: "member-join-triggers" },
    matches: (command) => getCommandFamily(command) === "join",
  },
  "commands-role-change": {
    routeSlug: "role-change-triggers",
    eyebrow: "Role change",
    intent: { triggerType: "role_add", draftName: "Role Change Flow", draftDescription: "Run this automation when a selected role is added.", showStarterOnNewDraft: false, routeSlug: "role-change-triggers" },
    matches: (command) => getCommandFamily(command) === "role_add",
  },
  "commands-reaction": {
    routeSlug: "reaction-triggers",
    eyebrow: "Reactions",
    intent: { triggerType: "reaction", draftName: "Reaction Flow", draftDescription: "Run this automation when a matching reaction appears.", showStarterOnNewDraft: false, routeSlug: "reaction-triggers" },
    matches: (command) => getCommandFamily(command) === "reaction",
  },
  "commands-internal": {
    routeSlug: "internal-triggers",
    eyebrow: "Manual / internal",
    intent: { triggerType: "slash", draftName: "Internal Routine", draftDescription: "Run this workflow from an internal Archivist action.", showStarterOnNewDraft: false, routeSlug: "internal-triggers" },
    matches: (command) => ["slash", "button", "select", "modal_submit"].includes(getCommandFamily(command)),
  },
};

const STUDIO_ENTRY_CONFIG: Record<StudioEntryId, {
  routeSlug: string;
  eyebrow: string;
  entryIntent: StudioEntryIntent;
  matches: (document: any) => boolean;
}> = {
  "studio-create": {
    routeSlug: "create-new",
    eyebrow: "Studio",
    entryIntent: { eyebrow: "Studio", title: "Choose a surface" },
    matches: () => true,
  },
  "studio-embeds": {
    routeSlug: "embeds",
    eyebrow: "Embeds",
    entryIntent: { eyebrow: "Embeds", title: "Build an embed" },
    matches: (document) => inferStudioPrimarySurfaceType(document.document) === "embed",
  },
  "studio-components": {
    routeSlug: "components-v2",
    eyebrow: "Components",
    entryIntent: { eyebrow: "Components", title: "Build interactive components" },
    matches: (document) => inferStudioPrimarySurfaceType(document.document) === "components",
  },
  "studio-welcome": {
    routeSlug: "welcome",
    eyebrow: "Welcome",
    entryIntent: { eyebrow: "Welcome", title: "Build a welcome message" },
    matches: (document) => document.moduleBinding === "welcome" || document.moduleBinding === "welcome_dm",
  },
  "studio-verify": {
    routeSlug: "verify",
    eyebrow: "Verification",
    entryIntent: { eyebrow: "Verification", title: "Build a verification panel" },
    matches: (document) => document.moduleBinding === "verify",
  },
  "studio-tickets": {
    routeSlug: "tickets",
    eyebrow: "Tickets",
    entryIntent: { eyebrow: "Tickets", title: "Build a ticket panel" },
    matches: (document) => document.moduleBinding === "ticket_panel" || document.moduleBinding === "tickets",
  },
  "studio-announcements": {
    routeSlug: "announcement-builder",
    eyebrow: "Announcements",
    entryIntent: { eyebrow: "Announcements", title: "Build an announcement" },
    matches: (document) => String(document.moduleBinding || "").includes("announcement") || /announce|launch|update/i.test(String(document.name || "")),
  },
};

export function CommandEditorEntry({
  serverId,
  itemId,
  commands,
  navigate,
}: {
  serverId: number;
  itemId: CommandEntryId;
  commands: any[];
  navigate: (href: string) => void;
}) {
  const search = useSearch();
  const config = COMMAND_ENTRY_CONFIG[itemId];
  const selectedId = Number(new URLSearchParams(search).get("commandId") || 0);
  const selection = Number.isFinite(selectedId) && selectedId > 0 ? selectedId : "new";
  const subset = commands.filter((command) => config.matches(command));
  const liveCount = subset.filter((command) => command?.enabled).length;
  const reviewCount = subset.filter((command) => getCommandStatusLabel(command) !== "Live").length;

  return (
    <div className="space-y-3">
      {/* Inline stats */}
      <div className="flex items-center justify-between">
        <div className="flex gap-5">
          <div>
            <p className="text-[22px] font-bold leading-none text-[#E0001A]">{String(subset.length)}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-white/35">Matching</p>
          </div>
          <div>
            <p className="text-[22px] font-bold leading-none text-white">{String(liveCount)}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-white/35">Live</p>
          </div>
          <div>
            <p className="text-[22px] font-bold leading-none text-white">{String(reviewCount)}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-white/35">Review</p>
          </div>
        </div>
        <button type="button" onClick={() => navigate(buildArchivistItemPath(serverId, "commands", config.routeSlug))}
          className="flex items-center gap-1.5 rounded-full bg-[#E0001A] px-4 py-2 text-[13px] font-semibold text-white active:opacity-80">
          <BadgePlus className="h-3.5 w-3.5" /> New
        </button>
      </div>

      {/* Recent in this lane */}
      <div className="rounded-[20px] bg-white/[0.03] px-4 py-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-white/35">Recent</p>
          <button type="button" onClick={() => navigate(buildArchivistItemPath(serverId, "commands", "commands"))}
            className="rounded-full bg-white/[0.06] px-3 py-1.5 text-[12px] font-medium text-white/60 active:bg-white/10">All</button>
        </div>
        {subset.slice(0, 5).length ? subset.slice(0, 5).map((command: any) => (
          <button key={command.id} type="button"
            onClick={() => navigate(buildArchivistItemPath(serverId, "commands", config.routeSlug, { search: { commandId: command.id } }))}
            className="flex w-full items-center justify-between gap-3 border-b border-white/[0.05] py-3 text-left last:border-0 active:opacity-70">
            <div className="min-w-0">
              <p className="truncate text-[14px] font-medium text-white">{command.name}</p>
              <p className="mt-0.5 text-[12px] text-white/35">{command.triggerType || "auto"} · {getCommandStatusLabel(command)}</p>
            </div>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-white/20" />
          </button>
        )) : <p className="py-4 text-center text-[13px] text-white/25">No commands yet</p>}
      </div>

      {/* Builder */}
      <div className="rounded-[20px] bg-white/[0.03] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.05]">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-white/35">{config.eyebrow}</p>
        </div>
        <div className="p-3">
          <CustomCommandV2Forge serverId={serverId} screen="create" initialSelection={selection} entryIntent={config.intent} />
        </div>
      </div>
    </div>
  );
}

export function CommandAutomationEntry({
  serverId,
  commands,
  navigate,
}: {
  serverId: number;
  commands: any[];
  navigate: (href: string) => void;
}) {
  const subset = commands.filter((command) => !["slash", "keyword"].includes(String(command?.triggerType || "")));
  const automaticRoutes = [
    { label: "Scheduled", description: "Time-based routines and recurring posts.", slug: "scheduled-triggers" },
    { label: "Member Join", description: "Welcome automation and onboarding reactions.", slug: "member-join-triggers" },
    { label: "Role Change", description: "Role-based automation and gated handoffs.", slug: "role-change-triggers" },
    { label: "Reaction", description: "Reaction-driven follow-up and event flows.", slug: "reaction-triggers" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex gap-5">
        <div>
          <p className="text-[22px] font-bold leading-none text-[#E0001A]">{String(subset.length)}</p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-white/35">Automatic</p>
        </div>
        <div>
          <p className="text-[22px] font-bold leading-none text-white">{String(subset.filter((c: any) => c?.enabled).length)}</p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-white/35">Live</p>
        </div>
      </div>

      <div className="rounded-[20px] bg-white/[0.03] px-4 py-4">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-white/35">Lanes</p>
        <div className="grid grid-cols-2 gap-2">
          {automaticRoutes.map((route) => (
            <button key={route.slug} type="button"
              onClick={() => navigate(buildArchivistItemPath(serverId, "commands", route.slug))}
              className="flex flex-col items-start gap-3 rounded-[18px] bg-white/[0.04] p-4 text-left active:bg-white/[0.07]">
              <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-white/[0.06] text-white/60">
                <LayoutTemplate className="h-4 w-4" />
              </div>
              <p className="text-[13px] font-semibold text-white/80">{route.label}</p>
            </button>
          ))}
        </div>
      </div>

      {subset.slice(0, 5).length > 0 && (
        <div className="rounded-[20px] bg-white/[0.03] px-4 py-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-white/35">Recent</p>
          {subset.slice(0, 5).map((command: any) => (
            <button key={command.id} type="button"
              onClick={() => navigate(buildArchivistItemPath(serverId, "commands", getCommandRouteForTrigger(String(command.triggerType || "")), { search: { commandId: command.id } }))}
              className="flex w-full items-center justify-between gap-3 border-b border-white/[0.05] py-3 text-left last:border-0 active:opacity-70">
              <div className="min-w-0">
                <p className="truncate text-[14px] font-medium text-white">{command.name}</p>
                <p className="mt-0.5 text-[12px] text-white/35">{command.triggerType || "auto"} · {getCommandStatusLabel(command)}</p>
              </div>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-white/20" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function StudioEditorEntry({
  serverId,
  itemId,
  documents,
  drafts,
  publishedDocumentIds,
  navigate,
}: {
  serverId: number;
  itemId: StudioEntryId;
  documents: any[];
  drafts: any[];
  publishedDocumentIds: Set<number>;
  navigate: (href: string) => void;
}) {
  const search = useSearch();
  const config = STUDIO_ENTRY_CONFIG[itemId];
  const matchingDrafts = drafts.filter((document) => config.matches(document));
  const matchingPublished = documents.filter((document) => config.matches(document) && publishedDocumentIds.has(document.id)).length;
  const requestedId = Number(new URLSearchParams(search).get("documentId") || 0);
  const currentDraft = requestedId ? matchingDrafts.find((document) => document.id === requestedId) || null : null;
  const secondaryRoute = matchingDrafts[0]
    ? buildArchivistItemPath(serverId, "studio", config.routeSlug, { search: { documentId: matchingDrafts[0].id } })
    : buildArchivistItemPath(serverId, "studio", config.routeSlug);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex gap-5">
          <div>
            <p className="text-[22px] font-bold leading-none text-[#E0001A]">{String(matchingDrafts.length)}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-white/35">Drafts</p>
          </div>
          <div>
            <p className="text-[22px] font-bold leading-none text-white">{String(matchingPublished)}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-white/35">Published</p>
          </div>
        </div>
        <button type="button" onClick={() => navigate(secondaryRoute)}
          className="flex items-center gap-1.5 rounded-full bg-[#E0001A] px-4 py-2 text-[13px] font-semibold text-white active:opacity-80">
          <BadgePlus className="h-3.5 w-3.5" /> {matchingDrafts[0] ? "Resume" : "New"}
        </button>
      </div>

      {matchingDrafts.length > 0 && (
        <div className="rounded-[20px] bg-white/[0.03] px-4 py-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-white/35">Drafts</p>
          {matchingDrafts.slice(0, 4).map((document: any) => (
            <button key={document.id} type="button"
              onClick={() => navigate(buildArchivistItemPath(serverId, "studio", config.routeSlug, { search: { documentId: document.id } }))}
              className="flex w-full items-center justify-between gap-3 border-b border-white/[0.05] py-3 text-left last:border-0 active:opacity-70">
              <div className="min-w-0">
                <p className="truncate text-[14px] font-medium text-white">{document.name}</p>
                <p className="mt-0.5 text-[12px] text-white/35">{publishedDocumentIds.has(document.id) ? "Published" : "Draft"}</p>
              </div>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-white/20" />
            </button>
          ))}
        </div>
      )}

      <div className="rounded-[20px] bg-white/[0.03] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.05]">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-white/35">{config.eyebrow}</p>
        </div>
        <div className="p-3">
          <DesignStudioTab serverId={serverId} entryIntent={config.entryIntent} />
        </div>
      </div>
    </div>
  );
}
