import { useSearch } from "wouter";
import { ArrowUpRight, BadgePlus, Braces, ChevronRight, LayoutTemplate } from "lucide-react";
import type { StudioEntryIntent } from "@/components/design-studio-v2/studio-v2-empty-state";
import { inferStudioPrimarySurfaceType } from "@/components/design-studio/studio-defaults";
import { DesignStudioTab } from "@/components/design-studio/design-studio-tab";
import { CustomCommandV2Forge, type CommandForgeEntryIntent } from "@/components/server-shell/custom-command-v2/custom-command-v2-forge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildArchivistItemPath } from "@/lib/archivist-workspace";
import { cn } from "@/lib/utils";

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

function MetricTile({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "accent";
}) {
  return (
    <div
      className={cn(
        "rounded-[22px] border px-4 py-4",
        tone === "accent"
          ? "border-[rgba(163,33,57,0.32)] bg-[linear-gradient(180deg,rgba(40,13,18,0.96),rgba(15,8,10,0.99))]"
          : "border-white/8 bg-[#090b0e]",
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/38">{label}</p>
      <p className="mt-3 text-xl font-bold text-white">{value}</p>
    </div>
  );
}

function JumpRow({
  title,
  description,
  onClick,
}: {
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 rounded-[20px] border border-white/8 bg-[#0a0c0f] px-4 py-4 text-left transition hover:border-[#8e2635] hover:bg-[#121418]"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">{title}</p>
        <p className="mt-1 text-sm text-white/46">{description}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-white/30" />
    </button>
  );
}

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
  title: string;
  description: string;
  helperTitle: string;
  helperDescription: string;
  intent: CommandForgeEntryIntent;
  matches: (command: any) => boolean;
}> = {
  "commands-slash": {
    routeSlug: "slash-commands",
    eyebrow: "Slash Command Lane",
    title: "Open slash-first workflows without dropping back into the generic forge.",
    description: "This lane keeps slash commands feeling direct, visible, and easy to resume from the moment you enter.",
    helperTitle: "Best when the command starts with a visible slash name",
    helperDescription: "Use this route for commands members or staff run deliberately from the Discord composer.",
    intent: { triggerType: "slash", draftName: "New Slash Command", draftDescription: "Run this slash command in Archivist.", showStarterOnNewDraft: false, routeSlug: "slash-commands" },
    matches: (command) => getCommandFamily(command) === "slash",
  },
  "commands-message": {
    routeSlug: "message-commands",
    eyebrow: "Keyword Trigger Lane",
    title: "Shape keyword replies and message listeners in one focused route.",
    description: "Use this lane when the automation should wake up from message content instead of a slash invocation.",
    helperTitle: "Best when members type the trigger naturally",
    helperDescription: "Keep aliases, match mode, and the reply logic visible without bouncing back through the library.",
    intent: { triggerType: "keyword", draftName: "Keyword Reply", draftDescription: "Watch for a message pattern and respond.", showStarterOnNewDraft: false, routeSlug: "message-commands" },
    matches: (command) => getCommandFamily(command) === "keyword",
  },
  "commands-buttons": {
    routeSlug: "button-triggers",
    eyebrow: "Button Trigger Lane",
    title: "Continue interaction flows from button presses without losing the workflow context.",
    description: "This route is for button-driven handoffs, follow-ups, and panel actions that should feel immediate.",
    helperTitle: "Best when the next step starts from a saved custom ID",
    helperDescription: "Keep button logic and the follow-up steps together instead of treating buttons like a separate tool.",
    intent: { triggerType: "button", draftName: "Button Flow", draftDescription: "Continue when a saved button is pressed.", showStarterOnNewDraft: false, routeSlug: "button-triggers" },
    matches: (command) => getCommandFamily(command) === "button",
  },
  "commands-selects": {
    routeSlug: "select-menu-triggers",
    eyebrow: "Select Menu Lane",
    title: "Keep dropdown-driven flows readable from entry point to saved workflow.",
    description: "This lane is tuned for select menus and routed choices that need a clean handoff into follow-up steps.",
    helperTitle: "Best when one choice should branch the next response",
    helperDescription: "Use this when members are choosing an option and Archivist needs to route the result cleanly.",
    intent: { triggerType: "select", draftName: "Select Menu Flow", draftDescription: "Continue when a member chooses from a saved menu.", showStarterOnNewDraft: false, routeSlug: "select-menu-triggers" },
    matches: (command) => getCommandFamily(command) === "select",
  },
  "commands-modals": {
    routeSlug: "modal-triggers",
    eyebrow: "Modal Lane",
    title: "Open modal submit flows from a route that already understands forms and follow-up actions.",
    description: "Use this lane for forms, applications, and structured replies that begin after a modal submission.",
    helperTitle: "Best when the user needs to fill something out first",
    helperDescription: "Keep the modal response path and the action steps in one place so the flow stays legible.",
    intent: { triggerType: "modal_submit", draftName: "Modal Follow-up", draftDescription: "Continue when a saved modal is submitted.", showStarterOnNewDraft: false, routeSlug: "modal-triggers" },
    matches: (command) => getCommandFamily(command) === "modal_submit",
  },
  "commands-scheduled": {
    routeSlug: "scheduled-triggers",
    eyebrow: "Scheduled Lane",
    title: "Build timed routines from a route that stays honest about recurring automation.",
    description: "Use this when the command should run on a schedule, not because a member clicked or typed something.",
    helperTitle: "Best when time is the trigger",
    helperDescription: "Good for reminders, resets, rotations, and recurring posting flows.",
    intent: { triggerType: "schedule", draftName: "Scheduled Routine", draftDescription: "Run this automation on a recurring schedule.", showStarterOnNewDraft: false, routeSlug: "scheduled-triggers" },
    matches: (command) => getCommandFamily(command) === "schedule",
  },
  "commands-member-join": {
    routeSlug: "member-join-triggers",
    eyebrow: "Member Join Lane",
    title: "Keep join-time automation inside a route built for first-impression flows.",
    description: "Use this lane for welcome follow-ups, onboarding checks, and immediate join behavior.",
    helperTitle: "Best when the flow starts the moment a member enters",
    helperDescription: "Pair this lane with Design Studio welcome surfaces instead of splitting the setup across tools.",
    intent: { triggerType: "join", draftName: "Member Join Flow", draftDescription: "Run this automation when a member joins the server.", showStarterOnNewDraft: false, routeSlug: "member-join-triggers" },
    matches: (command) => getCommandFamily(command) === "join",
  },
  "commands-role-change": {
    routeSlug: "role-change-triggers",
    eyebrow: "Role Change Lane",
    title: "Role-based automations should start in a lane that already understands role handoffs.",
    description: "Use this route when Archivist should react as soon as a role is added and continue through a saved workflow.",
    helperTitle: "Best when a role grant should unlock the next action",
    helperDescription: "Good for onboarding, access upgrades, and staff-side operational handoffs.",
    intent: { triggerType: "role_add", draftName: "Role Change Flow", draftDescription: "Run this automation when a selected role is added.", showStarterOnNewDraft: false, routeSlug: "role-change-triggers" },
    matches: (command) => getCommandFamily(command) === "role_add",
  },
  "commands-reaction": {
    routeSlug: "reaction-triggers",
    eyebrow: "Reaction Lane",
    title: "Reaction-driven workflows should open in a route built for event-triggered follow-up.",
    description: "Use this when a specific emoji reaction should start the flow and carry into the next steps.",
    helperTitle: "Best when the message itself is the trigger surface",
    helperDescription: "Useful for reaction pickup, lightweight moderation flows, and event-style prompts.",
    intent: { triggerType: "reaction", draftName: "Reaction Flow", draftDescription: "Run this automation when a matching reaction appears.", showStarterOnNewDraft: false, routeSlug: "reaction-triggers" },
    matches: (command) => getCommandFamily(command) === "reaction",
  },
  "commands-internal": {
    routeSlug: "internal-triggers",
    eyebrow: "Manual / Internal Lane",
    title: "Manual handoffs and internal routines still need one clean launch surface.",
    description: "This route is for staff-run flows and internal handoff logic that should start from a deliberate operator action.",
    helperTitle: "Best when a staff member or internal tool is the real entry point",
    helperDescription: "Start with a deliberate manual trigger and shape the rest of the workflow without leaving this lane.",
    intent: { triggerType: "slash", draftName: "Internal Routine", draftDescription: "Run this workflow from an internal Archivist action.", showStarterOnNewDraft: false, routeSlug: "internal-triggers" },
    matches: (command) => ["slash", "button", "select", "modal_submit"].includes(getCommandFamily(command)),
  },
};

const STUDIO_ENTRY_CONFIG: Record<StudioEntryId, {
  routeSlug: string;
  eyebrow: string;
  title: string;
  description: string;
  helperTitle: string;
  helperDescription: string;
  entryIntent: StudioEntryIntent;
  matches: (document: any) => boolean;
}> = {
  "studio-create": {
    routeSlug: "create-new",
    eyebrow: "Focused Builder",
    title: "Open the Studio builder from a route that treats creation like the main event.",
    description: "This is the generic creation lane when you know you want the flagship builder and do not need a narrower surface first.",
    helperTitle: "Best when you want the cleanest path into Studio",
    helperDescription: "Start from the creation surface, then let the editor carry the rest of the work.",
    entryIntent: { eyebrow: "Focused Builder", title: "Build Discord surfaces with the real Studio flow.", description: "Start a new message, resume a draft, or move straight into the flagship builder without dashboard clutter.", preferredKinds: ["message", "embed", "components"], badges: ["Build", "Preview", "Issues", "Publish"] },
    matches: () => true,
  },
  "studio-embeds": {
    routeSlug: "embeds",
    eyebrow: "Embed Builder",
    title: "Shape embed-first surfaces from a route that already knows the message should feel rich.",
    description: "Use this lane when the embed is the main visual surface and the rest of the message should support it.",
    helperTitle: "Best when the embed carries the weight of the message",
    helperDescription: "Keep the builder, preview, and matching embed drafts in one place instead of bouncing through generic Studio routes.",
    entryIntent: { eyebrow: "Embed Builder", title: "Build richer embed surfaces live.", description: "Start from an embed-first draft, keep the real preview visible, and stay honest about how the message will publish.", preferredKinds: ["embed", "message", "components"], badges: ["Embeds", "Preview", "Issues", "Publish"], recommendedFlowLabel: "Embed flow", recommendedFlowTitle: "Start embed-first. Tap the live surface. Refine the payload in place.", recommendedFlowDescription: "Use this lane when the embed is the hero and the rest of the message should stay lighter." },
    matches: (document) => inferStudioPrimarySurfaceType(document.document) === "embed",
  },
  "studio-components": {
    routeSlug: "components-v2",
    eyebrow: "Components V2",
    title: "Build interaction-heavy layouts from a route that starts with structure, not generic forms.",
    description: "Use this lane for buttons, rows, selectors, and view-aware message structures that need a stronger builder entry.",
    helperTitle: "Best when layout and interaction matter as much as text",
    helperDescription: "Lead with blocks and actions, then let publish truth and diagnostics stay attached to the same editor.",
    entryIntent: { eyebrow: "Components V2", title: "Build interactive Discord layouts live.", description: "Start from structure, keep the live preview visible, and shape buttons, menus, and actions without leaving the builder.", preferredKinds: ["components", "message", "embed"], badges: ["Components", "Preview", "Issues", "Publish"], recommendedFlowLabel: "Interactive flow", recommendedFlowTitle: "Start with the layout. Add the next block. Then tune the action in context.", recommendedFlowDescription: "Use this lane when the message is really an interface, not just a formatted post." },
    matches: (document) => inferStudioPrimarySurfaceType(document.document) === "components",
  },
  "studio-welcome": {
    routeSlug: "welcome",
    eyebrow: "Welcome Builder",
    title: "Welcome surfaces should open in a route that feels like onboarding, not a generic draft list.",
    description: "Use this lane for first-impression messages, onboarding prompts, and member entry surfaces that deserve a cleaner start.",
    helperTitle: "Best when the message is part of the member arrival experience",
    helperDescription: "Pair this builder lane with member join command flows so the welcome system feels like one product.",
    entryIntent: { eyebrow: "Welcome Builder", title: "Shape onboarding surfaces that feel intentional from the first message.", description: "Welcome screens, join prompts, and first-impression copy belong in a Studio lane that stays focused on member entry.", preferredKinds: ["message", "embed", "components"], badges: ["Welcome", "Preview", "Issues", "Publish"], recommendedFlowLabel: "Onboarding flow", recommendedFlowTitle: "Start with the first impression. Keep the language and interaction surface calm.", recommendedFlowDescription: "This lane works best when the message is easy to scan, easy to trust, and simple to publish cleanly." },
    matches: (document) => document.moduleBinding === "welcome" || document.moduleBinding === "welcome_dm",
  },
  "studio-verify": {
    routeSlug: "verify",
    eyebrow: "Verification Panels",
    title: "Verification surfaces should open in a route that already feels like trust and access control.",
    description: "Use this lane for verification panels, access prompts, and role-aware trust messaging.",
    helperTitle: "Best when the message controls who gets through",
    helperDescription: "Keep the message surface, button logic, and publish truth close together so verification stays honest.",
    entryIntent: { eyebrow: "Verification Panels", title: "Build verification surfaces with the real publish truth attached.", description: "Use this Studio lane for access prompts, trust language, and role-aware verification flows that should stay composed.", preferredKinds: ["components", "message", "embed"], badges: ["Verify", "Preview", "Issues", "Publish"], recommendedFlowLabel: "Trust flow", recommendedFlowTitle: "Lead with the action members must take. Keep the surrounding copy tight.", recommendedFlowDescription: "Verification works best when the message feels confident and the interactive parts stay obvious." },
    matches: (document) => document.moduleBinding === "verify",
  },
  "studio-tickets": {
    routeSlug: "tickets",
    eyebrow: "Ticket Panels",
    title: "Ticket entry surfaces should open in a route built for support handoff, not generic browsing.",
    description: "Use this lane for support panels, department selectors, and intake-style message surfaces.",
    helperTitle: "Best when the message launches an operational flow",
    helperDescription: "Keep ticket panel design, interaction setup, and publishing inside one calmer Studio route.",
    entryIntent: { eyebrow: "Ticket Panels", title: "Build support entry surfaces that feel clear before a ticket even opens.", description: "Ticket launch messages, department selectors, and intake prompts need a Studio route that keeps the support flow readable.", preferredKinds: ["components", "message", "embed"], badges: ["Tickets", "Preview", "Issues", "Publish"], recommendedFlowLabel: "Support flow", recommendedFlowTitle: "Start with the member choice. Then keep the next step obvious.", recommendedFlowDescription: "This lane is strongest when the panel explains the path clearly and the interaction model stays tight." },
    matches: (document) => document.moduleBinding === "ticket_panel" || document.moduleBinding === "tickets",
  },
  "studio-announcements": {
    routeSlug: "announcement-builder",
    eyebrow: "Announcement Builder",
    title: "Announcement surfaces deserve a route that feels like shipping something public, not rummaging through drafts.",
    description: "Use this lane for published announcements, campaign posts, and higher-visibility message surfaces.",
    helperTitle: "Best when the message is meant to be seen, reused, or shipped broadly",
    helperDescription: "This route keeps recent announcement-ready surfaces visible while staying anchored in the real Studio editor.",
    entryIntent: { eyebrow: "Announcement Builder", title: "Build announcement surfaces that are ready to ship.", description: "Use this route for updates, launches, and high-visibility message surfaces that should feel polished before they go live.", preferredKinds: ["message", "embed", "components"], badges: ["Announcements", "Preview", "Issues", "Publish"], recommendedFlowLabel: "Shipping flow", recommendedFlowTitle: "Start with the core message. Add the visual weight only where it helps clarity.", recommendedFlowDescription: "Announcements are strongest when the hierarchy is clean and the publish path stays truthful." },
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
    <div className="space-y-4">
      <Card className="archivist-panel overflow-hidden border-[rgba(163,33,57,0.24)] bg-[linear-gradient(180deg,rgba(25,10,14,0.98),rgba(8,7,8,1))]">
        <CardContent className="space-y-5 p-5">
          <div className="space-y-3">
            <p className="archivist-kicker">{config.eyebrow}</p>
            <h1 className="max-w-4xl text-[1.9rem] font-bold leading-tight text-white sm:text-[2.5rem]">{config.title}</h1>
            <p className="max-w-3xl text-sm leading-7 text-white/62">{config.description}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricTile label="Matching" value={String(subset.length)} tone="accent" />
            <MetricTile label="Live" value={String(liveCount)} />
            <MetricTile label="Review" value={String(reviewCount)} />
          </div>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="rounded-[24px] border border-white/8 bg-[#090b0e] p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] border border-[#7a2330] bg-[#130d10] text-[#ff7d91]">
                  <Braces className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{config.helperTitle}</p>
                  <p className="mt-2 text-sm leading-6 text-white/52">{config.helperDescription}</p>
                </div>
              </div>
            </div>
            <div className="grid gap-3">
              <Button className="min-h-12 rounded-[18px] px-5" onClick={() => navigate(buildArchivistItemPath(serverId, "commands", config.routeSlug))}>
                <BadgePlus className="h-4 w-4" />
                Open Fresh Draft
              </Button>
              <Button variant="outline" className="min-h-12 rounded-[18px] border-white/10 bg-white/[0.03] px-5" onClick={() => navigate(buildArchivistItemPath(serverId, "commands", "commands"))}>
                <ArrowUpRight className="h-4 w-4" />
                Open Command Library
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
        <Card className="archivist-panel">
          <CardHeader>
            <CardTitle className="text-white">Recent matching flows</CardTitle>
            <CardDescription>Reopen work from this lane instead of bouncing back through the generic create route.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {subset.slice(0, 4).length ? subset.slice(0, 4).map((command) => (
              <JumpRow
                key={command.id}
                title={command.name}
                description={`${command.triggerType || "workflow"} trigger · ${getCommandStatusLabel(command)}`}
                onClick={() => navigate(buildArchivistItemPath(serverId, "commands", config.routeSlug, { search: { commandId: command.id } }))}
              />
            )) : (
              <div className="rounded-[20px] border border-dashed border-white/10 bg-[#0a0c0f] px-4 py-5 text-sm text-white/50">
                No saved workflows live in this lane yet. The builder below is ready for the first one.
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="archivist-panel">
          <CardHeader>
            <CardTitle className="text-white">Route truth</CardTitle>
            <CardDescription>This lane now owns its own drafts, reopen actions, and editor handoff.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-[18px] border border-white/8 bg-[#0a0c0f] px-4 py-4">
              <p className="text-sm font-semibold text-white">Current selection</p>
              <p className="mt-2 text-sm text-white/52">{selection === "new" ? "Fresh draft in this trigger lane." : "Editing an existing workflow without leaving this route."}</p>
            </div>
            <div className="rounded-[18px] border border-white/8 bg-[#0a0c0f] px-4 py-4">
              <p className="text-sm font-semibold text-white">Why this is cleaner</p>
              <p className="mt-2 text-sm text-white/52">Overview, drawer, and editor stay in the same route family so trigger-specific work no longer feels like a detour.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="archivist-panel overflow-hidden">
        <div className="border-b border-white/6 px-4 py-4">
          <p className="text-sm font-semibold text-white">Focused builder</p>
          <p className="mt-1 text-sm text-white/46">This editor stays anchored to the current trigger lane instead of sending you back through the generic create route.</p>
        </div>
        <div className="p-4">
          <CustomCommandV2Forge serverId={serverId} screen="create" initialSelection={selection} entryIntent={config.intent} />
        </div>
      </Card>
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
    <div className="space-y-4">
      <Card className="archivist-panel overflow-hidden border-[rgba(163,33,57,0.24)] bg-[linear-gradient(180deg,rgba(25,10,14,0.98),rgba(8,7,8,1))]">
        <CardContent className="space-y-5 p-5">
          <div className="space-y-3">
            <p className="archivist-kicker">Automation Lanes</p>
            <h1 className="max-w-4xl text-[1.9rem] font-bold leading-tight text-white sm:text-[2.5rem]">Automatic responses should open as a real routing surface, not a vague duplicate of the command library.</h1>
            <p className="max-w-3xl text-sm leading-7 text-white/62">Choose the event that actually starts the automation, then move straight into the matching lane and editor.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricTile label="Automatic" value={String(subset.length)} tone="accent" />
            <MetricTile label="Live" value={String(subset.filter((command) => command?.enabled).length)} />
            <MetricTile label="Review" value={String(subset.filter((command) => getCommandStatusLabel(command) !== "Live").length)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {automaticRoutes.map((route) => (
              <button
                key={route.slug}
                type="button"
                onClick={() => navigate(buildArchivistItemPath(serverId, "commands", route.slug))}
                className="flex min-h-[128px] flex-col items-start justify-between rounded-[22px] border border-white/8 bg-[#090b0e] px-4 py-4 text-left transition hover:border-[#8e2635] hover:bg-[#121418]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-[16px] border border-[#6e202c] bg-[#130d10] text-[#ff7488]">
                  <LayoutTemplate className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{route.label}</p>
                  <p className="mt-1 text-sm leading-6 text-white/46">{route.description}</p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="archivist-panel">
        <CardHeader>
          <CardTitle className="text-white">Recent automatic flows</CardTitle>
          <CardDescription>Open an existing automation from the route family that matches how it actually starts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {subset.slice(0, 6).length ? subset.slice(0, 6).map((command) => (
            <JumpRow
              key={command.id}
              title={command.name}
              description={`${command.triggerType || "automation"} trigger · ${getCommandStatusLabel(command)}`}
              onClick={() => navigate(buildArchivistItemPath(serverId, "commands", getCommandRouteForTrigger(String(command.triggerType || "")), { search: { commandId: command.id } }))}
            />
          )) : (
            <div className="rounded-[20px] border border-dashed border-white/10 bg-[#0a0c0f] px-4 py-5 text-sm text-white/50">
              No automatic flows are saved yet. Pick a route above to start with the right trigger context.
            </div>
          )}
        </CardContent>
      </Card>
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
    <div className="space-y-4">
      <Card className="archivist-panel overflow-hidden border-[rgba(163,33,57,0.24)] bg-[linear-gradient(180deg,rgba(25,10,14,0.98),rgba(8,7,8,1))]">
        <CardContent className="space-y-4 p-4 md:p-5">
          <div className="space-y-2.5">
            <p className="archivist-kicker">{config.eyebrow}</p>
            <h1 className="max-w-4xl text-[1.65rem] font-bold leading-tight text-white sm:text-[2.3rem]">{config.title}</h1>
            <p className="max-w-3xl text-sm leading-6 text-white/58">{config.description}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <MetricTile label="Matching drafts" value={String(matchingDrafts.length)} tone="accent" />
            <MetricTile label="Published" value={String(matchingPublished)} />
            <MetricTile label="Current" value={currentDraft ? currentDraft.name : "Fresh entry"} />
          </div>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="rounded-[22px] border border-white/8 bg-[#090b0e] p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border border-[#7a2330] bg-[#130d10] text-[#ff7d91]">
                  <LayoutTemplate className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{config.helperTitle}</p>
                  <p className="mt-1.5 text-sm leading-6 text-white/50">{config.helperDescription}</p>
                </div>
              </div>
            </div>
            <div className="grid gap-2.5">
              <Button className="min-h-12 rounded-[18px] px-5" onClick={() => navigate(secondaryRoute)}>
                <BadgePlus className="h-4 w-4" />
                {matchingDrafts[0] ? "Resume Matching Draft" : "Open Builder Lane"}
              </Button>
              <Button variant="outline" className="min-h-12 rounded-[18px] border-white/10 bg-white/[0.03] px-5" onClick={() => navigate(buildArchivistItemPath(serverId, "studio", "overview"))}>
                <ArrowUpRight className="h-4 w-4" />
                Back to Studio Overview
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="archivist-panel overflow-hidden">
        <div className="border-b border-white/6 px-4 py-4">
          <p className="text-sm font-semibold text-white">Focused editor</p>
          <p className="mt-1 text-sm text-white/46">The builder opens first so this route feels like a creation lane, not a preamble before Studio.</p>
        </div>
        <div className="p-3 sm:p-4">
          <DesignStudioTab serverId={serverId} entryIntent={config.entryIntent} />
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
        <Card className="archivist-panel">
          <CardHeader>
            <CardTitle className="text-white">Matching surfaces</CardTitle>
            <CardDescription>Recent drafts in this lane stay visible so you do not have to fall back to a generic Studio route.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {matchingDrafts.slice(0, 4).length ? matchingDrafts.slice(0, 4).map((document) => (
              <JumpRow
                key={document.id}
                title={document.name}
                description={`${publishedDocumentIds.has(document.id) ? "Published" : "Draft"} · ${document.moduleBinding || inferStudioPrimarySurfaceType(document.document)}`}
                onClick={() => navigate(buildArchivistItemPath(serverId, "studio", config.routeSlug, { search: { documentId: document.id } }))}
              />
            )) : (
              <div className="rounded-[20px] border border-dashed border-white/10 bg-[#0a0c0f] px-4 py-5 text-sm text-white/50">
                No matching Studio surfaces exist yet. The builder below opens directly in this lane.
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="archivist-panel">
          <CardHeader>
            <CardTitle className="text-white">Why this lane exists</CardTitle>
            <CardDescription>Tool routes should feel like real destinations, not aliases that all dump you back into the same generic launcher.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-[18px] border border-white/8 bg-[#0a0c0f] px-4 py-4">
              <p className="text-sm font-semibold text-white">Focused entry state</p>
              <p className="mt-2 text-sm text-white/52">The builder below adapts its create surface to this Studio lane instead of pretending every draft starts from the same context.</p>
            </div>
            <div className="rounded-[18px] border border-white/8 bg-[#0a0c0f] px-4 py-4">
              <p className="text-sm font-semibold text-white">Route handoff</p>
              <p className="mt-2 text-sm text-white/52">Recent surfaces reopen inside this same route family so Studio no longer feels like one destination disguised as many.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
