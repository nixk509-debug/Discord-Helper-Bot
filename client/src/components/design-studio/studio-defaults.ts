import type { StudioDocument, StudioModuleBinding, StudioNodeType } from "@shared/schema";

function makeId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

export const STUDIO_ENTRY_INTENTS = ["blank", "ticket", "welcome", "verify", "template"] as const;
export type StudioEntryIntent = (typeof STUDIO_ENTRY_INTENTS)[number];
export const STUDIO_PRIMARY_SURFACE_TYPES = ["message", "embed", "components"] as const;
export type StudioPrimarySurfaceType = (typeof STUDIO_PRIMARY_SURFACE_TYPES)[number];
export const STUDIO_CREATION_KINDS = ["plain_message", "embed_message", "interactive_message"] as const;
export type StudioCreationKind = (typeof STUDIO_CREATION_KINDS)[number];

export interface StudioCommunityStarter {
  id: string;
  title: string;
  description: string;
  eyebrow: string;
  primaryType: StudioPrimarySurfaceType;
  createDocument: () => StudioDocument;
}

export function parseStudioEntryIntent(value: string | null | undefined): StudioEntryIntent {
  if (!value) return "blank";
  return (STUDIO_ENTRY_INTENTS as readonly string[]).includes(value) ? (value as StudioEntryIntent) : "blank";
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
    welcome: "Create an onboarding message for new members.",
    welcome_dm: "Create a DM onboarding message for new members.",
    leave: "Create a leave or archive message.",
    tickets: "Build ticket launchers, routing menus, and intake flows.",
    ticket_panel: "Build a ticket panel with a launcher, modal intake, and follow-up routing.",
  };

  const isTicketPanel = binding === "ticket_panel";

  return {
    version: 2,
    meta: {
      name: title,
      category: binding || "project",
      entryViewId,
      mode: "standard",
    },
    views: {
      [entryViewId]: {
        id: entryViewId,
        name: "Entry",
        messageContent: "",
        embeds: [
          {
            title,
            description: descriptionByBinding[binding || ""] || "Author a reusable Discord message project.",
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

function createBaseStudioDocument(name: string): StudioDocument {
  return {
    version: 2,
    meta: {
      name,
      category: "project",
      entryViewId: "entry",
      mode: "standard",
    },
    views: {
      entry: {
        id: "entry",
        name: "Entry",
        messageContent: "",
        embeds: [],
        rootNodeIds: [],
      },
    },
    nodes: {},
    actions: {},
    modals: {},
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

export function defaultStudioDesignName() {
  return "Untitled Design";
}

export function createStudioBlankDocument(name = defaultStudioDesignName()): StudioDocument {
  return createBaseStudioDocument(name);
}

export function defaultPrimarySurfaceName(primaryType: StudioPrimarySurfaceType) {
  switch (primaryType) {
    case "message":
      return "Untitled Message";
    case "embed":
      return "Untitled Embed";
    case "components":
      return "Untitled Components";
    default:
      return "Untitled Project";
  }
}

export function createStudioPrimaryDocument(primaryType: StudioPrimarySurfaceType, name?: string): StudioDocument {
  const title = name || defaultPrimarySurfaceName(primaryType);
  const document = createBaseStudioDocument(title);
  document.meta.mode = primaryType === "components" ? "layout_v2" : "standard";

  if (primaryType === "embed") {
    document.views.entry.embeds = [
      {
        title: "",
        description: "",
        color: "#B11226",
      },
    ];
    return document;
  }

  if (primaryType === "components") {
    const sectionId = makeId("sec");
    const actionRowId = makeId("row");
    const buttonId = makeId("btn");
    const actionId = makeId("act");

    document.nodes[sectionId] = {
      id: sectionId,
      type: "section",
      viewId: "entry",
      childIds: [],
      props: {
        heading: "Components Layout",
        description: "Start arranging sections, buttons, and menus for this message.",
      },
    };
    document.nodes[actionRowId] = {
      id: actionRowId,
      type: "action_row",
      viewId: "entry",
      childIds: [buttonId],
      props: {},
    };
    document.nodes[buttonId] = {
      id: buttonId,
      type: "button",
      viewId: "entry",
      childIds: [],
      actionId,
      props: {
        label: "Primary Action",
        style: 1,
      },
    };
    document.actions[actionId] = {
      id: actionId,
      type: "reply_message",
      label: "Reply",
      replyMode: "ephemeral",
      response: {
        mode: "inline",
        inline: {
          content: "Action received.",
          embeds: [],
        },
      },
    };
    document.views.entry.rootNodeIds = [sectionId, actionRowId];
    return document;
  }

  return document;
}

function createRulesStarterDocument() {
  const document = createStudioPrimaryDocument("embed", "Rules Message");
  document.views.entry.messageContent = "Welcome to **{server}**. Read the rules below before you dive in.";
  document.views.entry.embeds = [
    {
      title: "Server Rules",
      description: "Be respectful, keep things on topic, and use the right channels. Staff may step in when needed.",
      color: "#B11226",
      fields: [
        { name: "Respect", value: "Treat members and staff with respect.", inline: false },
        { name: "No spam", value: "Avoid spam, scams, or disruptive self-promo.", inline: false },
        { name: "Ask for help", value: "Need help? Open a ticket and we will jump in.", inline: false },
      ],
      footerText: "Last updated {date}",
    },
  ];
  return document;
}

function createRolePickerStarterDocument() {
  const document = createStudioPrimaryDocument("components", "Role Picker");
  document.views.entry.messageContent = "Pick the roles that fit you best and keep your notifications clean.";
  const rootSectionId = Object.keys(document.nodes).find((nodeId) => document.nodes[nodeId]?.type === "section");
  const actionRowId = Object.keys(document.nodes).find((nodeId) => document.nodes[nodeId]?.type === "action_row");
  const buttonId = actionRowId ? document.nodes[actionRowId].childIds[0] : null;
  const actionId = buttonId ? document.nodes[buttonId].actionId || null : null;

  if (rootSectionId) {
    document.nodes[rootSectionId].props.heading = "Choose Your Roles";
    document.nodes[rootSectionId].props.description = "Tap a button or swap the row for menus once your server roles are mapped.";
  }

  if (buttonId) {
    document.nodes[buttonId].props.label = "Get Updates";
    document.nodes[buttonId].props.style = 3;
  }

  if (actionId && document.actions[actionId]) {
    document.actions[actionId].type = "role_toggle";
    document.actions[actionId].label = "Toggle updates role";
    document.actions[actionId].response = {
      mode: "inline",
      inline: {
        content: "Your role settings were updated.",
        embeds: [],
      },
    };
  }

  return document;
}

function createStaffIntakeStarterDocument() {
  const document = createStudioDocument("ticket_panel", "Staff App Form");
  document.views.entry.messageContent = "Apply to join the Archivist team. Press the button below to open the intake form.";
  const entryEmbed = document.views.entry.embeds[0];
  if (entryEmbed) {
    entryEmbed.title = "Staff Applications";
    entryEmbed.description = "We are looking for calm, active staff who can guide members and keep things moving.";
    entryEmbed.color = "#7A0F1F";
  }
  return document;
}

export function creationKindToPrimaryType(kind: StudioCreationKind): StudioPrimarySurfaceType {
  switch (kind) {
    case "embed_message":
      return "embed";
    case "interactive_message":
      return "components";
    case "plain_message":
    default:
      return "message";
  }
}

export const STUDIO_COMMUNITY_STARTERS: StudioCommunityStarter[] = [
  {
    id: "rules_message",
    title: "Rules Message",
    description: "A polished server rules post with ready-to-edit fields and a clean intro line.",
    eyebrow: "Community Shared",
    primaryType: "embed",
    createDocument: createRulesStarterDocument,
  },
  {
    id: "role_picker",
    title: "Role Picker",
    description: "A starter interactive message for self-assign roles and notification toggles.",
    eyebrow: "Community Shared",
    primaryType: "components",
    createDocument: createRolePickerStarterDocument,
  },
  {
    id: "staff_app_form",
    title: "Staff App Form",
    description: "A starter intake flow with a polished panel and modal-based application prompt.",
    eyebrow: "Community Shared",
    primaryType: "components",
    createDocument: createStaffIntakeStarterDocument,
  },
];

export function inferStudioPrimarySurfaceType(document: StudioDocument): StudioPrimarySurfaceType {
  const nodes = Object.values(document.nodes || {});
  const hasAdvancedInteractiveLayout = nodes.some((node) =>
    [
      "action_row",
      "string_select",
      "role_select",
      "user_select",
      "channel_select",
      "mentionable_select",
    ].includes(node.type as StudioNodeType),
  ) || Object.keys(document.modals || {}).length > 0;

  if (hasAdvancedInteractiveLayout) {
    return "components";
  }

  const hasEmbeds = Object.values(document.views || {}).some((view) => (view.embeds || []).length > 0);
  if (hasEmbeds) {
    return "embed";
  }

  const hasButtons = nodes.some((node) => node.type === "button");
  return hasButtons ? "components" : "message";
}

export function defaultSurfaceName(binding?: StudioModuleBinding | null) {
  switch (binding) {
    case "verify":
      return "Verification Panel";
    case "welcome":
      return "Welcome Message";
    case "welcome_dm":
      return "Welcome DM Message";
    case "leave":
      return "Leave Message";
    case "tickets":
      return "Ticket Flow";
    case "ticket_panel":
      return "Ticket Panel";
    default:
      return "Untitled Project";
  }
}

export const STUDIO_MAIN_AREAS = [
  { id: "build", label: "Build" },
  { id: "preview", label: "Preview" },
  { id: "library", label: "Library" },
  { id: "publish", label: "Publish" },
] as const;

// Keep these exports for compatibility with existing imports.
export const STUDIO_MOBILE_SECTIONS = STUDIO_MAIN_AREAS;

export const STUDIO_BUILD_SECTIONS = [
  { id: "message", label: "Message" },
  { id: "embeds", label: "Embeds" },
  { id: "components", label: "Components" },
] as const;
