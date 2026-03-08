import type { StudioDocument, StudioModuleBinding } from "@shared/schema";

function makeId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createStudioDocument(binding?: StudioModuleBinding, name?: string): StudioDocument {
  const entryViewId = "entry";
  const textId = makeId("txt");
  const dividerId = makeId("div");
  const buttonId = makeId("btn");
  const actionId = makeId("act");
  const modalId = makeId("modal");
  const submitActionId = makeId("act");
  const topicFieldId = makeId("field");
  const detailFieldId = makeId("field");

  const title = name || defaultSurfaceName(binding);
  const descriptionByBinding: Record<string, string> = {
    verify: "Explain the verification requirements and define what happens when members continue.",
    welcome: "Create an onboarding surface for new members.",
    welcome_dm: "Create a DM onboarding message for new members.",
    leave: "Create a departure or archive surface.",
    tickets: "Build ticket launchers, routing menus, and intake flows.",
    ticket_panel: "Build a ticket panel with a launcher, modal intake, and follow-up routing.",
  };

  const isTicketPanel = binding === "ticket_panel";

  return {
    version: 2,
    meta: {
      name: title,
      category: binding || "surface",
      entryViewId,
    },
    views: {
      [entryViewId]: {
        id: entryViewId,
        name: "Entry",
        messageContent: "",
        embeds: [
          {
            title,
            description: descriptionByBinding[binding || ""] || "Author a reusable Discord interaction surface.",
            color: "#B11226",
          },
        ],
        rootNodeIds: [textId, dividerId, buttonId],
      },
    },
    nodes: {
      [textId]: {
        id: textId,
        type: "text_display",
        viewId: entryViewId,
        childIds: [],
        props: {
          text: "Use the visual builder to add views, components, actions, and modals.",
        },
      },
      [dividerId]: {
        id: dividerId,
        type: "divider",
        viewId: entryViewId,
        childIds: [],
        props: {
          mode: "symbol",
          symbol: "*",
          repeat: 6,
        },
      },
      [buttonId]: {
        id: buttonId,
        type: "button",
        viewId: entryViewId,
        childIds: [],
        actionId,
        props: {
          label: binding === "verify" ? "Verify" : isTicketPanel ? "Open Ticket" : "Continue",
          style: 1,
        },
      },
    },
    actions: {
      [actionId]: {
        id: actionId,
        type: binding === "verify" ? "confirm" : isTicketPanel ? "open_modal" : "reply_message",
        label: binding === "verify" ? "Confirm access" : isTicketPanel ? "Open intake modal" : "Reply",
        replyMode: "ephemeral",
        modalId: isTicketPanel ? modalId : undefined,
        response: {
          mode: "inline",
          inline: {
            content: binding === "verify" ? "Verification confirmed." : isTicketPanel ? "Fill out the ticket intake form." : "Action received.",
          },
        },
      },
      ...(isTicketPanel ? {
        [submitActionId]: {
          id: submitActionId,
          type: "ticket_create" as const,
          label: "Create support ticket",
          replyMode: "ephemeral" as const,
          response: {
            mode: "inline" as const,
            inline: {
              content: "A new support ticket has been opened.",
              embeds: [
                {
                  title: "Support Request",
                  description: "A team member will join this ticket shortly. Include any extra details or screenshots in the channel.",
                  color: "#5865F2",
                },
              ],
            },
          },
        },
      } : {}),
    },
    modals: isTicketPanel ? {
      [modalId]: {
        id: modalId,
        title: "Open Support Ticket",
        customIdSeed: "ticket_intake",
        fields: [
          {
            id: topicFieldId,
            label: "Topic",
            style: "short",
            placeholder: "Billing, report, bug, access issue...",
            required: true,
            minLength: 2,
            maxLength: 100,
          },
          {
            id: detailFieldId,
            label: "Details",
            style: "paragraph",
            placeholder: "Tell the team what you need and include any relevant context.",
            required: true,
            minLength: 5,
            maxLength: 1000,
          },
        ],
        submitActionIds: [submitActionId],
      },
    } : {},
    assets: [],
    libraries: {
      dividerPresetIds: [],
      styleBlockIds: [],
      themePackIds: [],
    },
    design: {
      dividerPresets: [],
      styleBlocks: [],
      themePacks: [],
    },
  };
}

export function defaultSurfaceName(binding?: StudioModuleBinding | null) {
  switch (binding) {
    case "verify":
      return "Verification Surface";
    case "welcome":
      return "Welcome Surface";
    case "welcome_dm":
      return "Welcome DM Surface";
    case "leave":
      return "Leave Surface";
    case "tickets":
      return "Ticket Flow Surface";
    case "ticket_panel":
      return "Ticket Panel Surface";
    default:
      return "Untitled Surface";
  }
}

export const STUDIO_MOBILE_SECTIONS = [
  { id: "build", label: "Build" },
  { id: "tree", label: "Tree" },
  { id: "actions", label: "Actions" },
  { id: "modals", label: "Modals" },
  { id: "publish", label: "Publish" },
] as const;

export const STUDIO_BUILD_SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "content", label: "Content" },
  { id: "embeds", label: "Embeds" },
  { id: "design", label: "Design" },
  { id: "templates", label: "Templates" },
  { id: "assets", label: "Assets" },
] as const;
