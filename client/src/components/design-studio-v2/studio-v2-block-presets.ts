import type { StudioAction, StudioNode } from "@shared/schema";
import { createDefaultAction, makeId, type StudioNodeBundle } from "@/components/design-studio-v2/studio-v2-utils";

export interface StudioBlockPresetDefinition {
  id: string;
  label: string;
  description: string;
  eyebrow: string;
}

export const STUDIO_BLOCK_PRESETS: StudioBlockPresetDefinition[] = [
  {
    id: "welcome_hero",
    label: "Welcome Hero",
    description: "Heading, supporting copy, and a clean first action for onboarding-style surfaces.",
    eyebrow: "Preset",
  },
  {
    id: "verification_prompt",
    label: "Verification Prompt",
    description: "A notice plus one clear verification action for trust-gated flows.",
    eyebrow: "Preset",
  },
  {
    id: "announcement_stack",
    label: "Announcement Stack",
    description: "Launch headline, detail copy, and a supporting callout for broadcast posts.",
    eyebrow: "Preset",
  },
  {
    id: "cta_row",
    label: "CTA Row",
    description: "A paired primary and secondary action row for cleaner decision points.",
    eyebrow: "Preset",
  },
];

function buildButton(viewId: string, parentId: string, label: string, style: number, actionLabel: string) {
  const action = createDefaultAction(actionLabel);
  const buttonId = makeId("btn");
  const button: StudioNode = {
    id: buttonId,
    type: "button",
    viewId,
    parentId,
    childIds: [],
    actionId: action.id,
    props: {
      label,
      style,
      customId: makeId("button"),
    },
  };

  return { action, button };
}

function buildActionRow(viewId: string, buttons: Array<{ label: string; style: number; actionLabel: string }>) {
  const rowId = makeId("row");
  const row: StudioNode = {
    id: rowId,
    type: "action_row",
    viewId,
    childIds: [],
    props: {},
  };

  const actions: StudioAction[] = [];
  const nodes: StudioNode[] = [row];

  buttons.forEach((config) => {
    const next = buildButton(viewId, rowId, config.label, config.style, config.actionLabel);
    actions.push(next.action);
    nodes.push(next.button);
    row.childIds.push(next.button.id);
  });

  return {
    rowId,
    actions,
    nodes,
  };
}

export function createStudioBlockPresetBundle(presetId: string, viewId: string): StudioNodeBundle {
  if (presetId === "verification_prompt") {
    const noticeId = makeId("note");
    const notice: StudioNode = {
      id: noticeId,
      type: "style_block",
      viewId,
      childIds: [],
      props: {
        title: "Verify your access",
        description: "Confirm your membership so Archivist can unlock the rest of the server cleanly.",
        accentColor: "#E0001A",
      },
    };
    const rowBundle = buildActionRow(viewId, [
      { label: "Verify Me", style: 1, actionLabel: "Verify member" },
    ]);
    return {
      nodeIds: [notice.id, rowBundle.rowId],
      nodes: [notice, ...rowBundle.nodes],
      actions: rowBundle.actions,
    };
  }

  if (presetId === "announcement_stack") {
    const titleId = makeId("txt");
    const detailId = makeId("txt");
    const noticeId = makeId("note");
    const dividerId = makeId("div");

    return {
      nodeIds: [titleId, detailId, dividerId, noticeId],
      nodes: [
        {
          id: titleId,
          type: "text_display",
          viewId,
          childIds: [],
          props: { text: "**Launch update**\nHeadline first. Keep the change clear before the detail." },
        },
        {
          id: detailId,
          type: "text_display",
          viewId,
          childIds: [],
          props: { text: "Add the rollout details, timing, and what members should do next." },
        },
        {
          id: dividerId,
          type: "divider",
          viewId,
          childIds: [],
          props: { mode: "line", text: "--------" },
        },
        {
          id: noticeId,
          type: "style_block",
          viewId,
          childIds: [],
          props: {
            title: "What changed",
            description: "Use this callout for the one detail members should not miss.",
            accentColor: "#E0001A",
          },
        },
      ],
      actions: [],
    };
  }

  if (presetId === "cta_row") {
    const rowBundle = buildActionRow(viewId, [
      { label: "Primary Action", style: 1, actionLabel: "Primary CTA" },
      { label: "Secondary Action", style: 2, actionLabel: "Secondary CTA" },
    ]);
    return {
      nodeIds: [rowBundle.rowId],
      nodes: rowBundle.nodes,
      actions: rowBundle.actions,
    };
  }

  const sectionId = makeId("sec");
  const heroTextId = makeId("txt");
  const supportingTextId = makeId("txt");
  const rowBundle = buildActionRow(viewId, [
    { label: "Get Started", style: 1, actionLabel: "Open onboarding flow" },
  ]);

  const section: StudioNode = {
    id: sectionId,
    type: "section",
    viewId,
    childIds: [heroTextId, supportingTextId, rowBundle.rowId],
    props: {
      heading: "Welcome to the server",
      description: "Lead with the first message members should trust.",
    },
  };

  const heroText: StudioNode = {
    id: heroTextId,
    type: "text_display",
    viewId,
    parentId: sectionId,
    childIds: [],
    props: {
      text: "**Welcome aboard.** Use this first block to orient new members in one clean beat.",
    },
  };

  const supportingText: StudioNode = {
    id: supportingTextId,
    type: "text_display",
    viewId,
    parentId: sectionId,
    childIds: [],
    props: {
      text: "Then add the next step, rule, or interaction only if it truly helps the member move forward.",
    },
  };

  rowBundle.nodes.forEach((node) => {
    if (node.id === rowBundle.rowId) {
      node.parentId = sectionId;
      return;
    }
  });

  return {
    nodeIds: [sectionId],
    nodes: [section, heroText, supportingText, ...rowBundle.nodes],
    actions: rowBundle.actions,
  };
}
