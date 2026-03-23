import test from "node:test";
import assert from "node:assert/strict";
import { TextDisplayBuilder } from "@discordjs/builders";
import type { StudioDocument, StudioPublishPlan } from "../shared/schema";
import { COMPONENT_TYPES } from "../shared/schema";
import { buildStudioPublishPlan } from "../shared/studio-publish-plan";
import { buildStudioDiscordPayload } from "./studio-discord";

function createLayoutDocument(): StudioDocument {
  return {
    version: 2,
    meta: {
      name: "Regression",
      entryViewId: "entry",
      mode: "layout_v2",
    },
    views: {
      entry: {
        id: "entry",
        name: "Entry",
        messageContent: "",
        embeds: [],
        rootNodeIds: ["txt"],
      },
    },
    nodes: {
      txt: {
        id: "txt",
        type: "text_display",
        viewId: "entry",
        childIds: [],
        props: { text: "Planner node" },
      },
    },
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

test("discord payload builder accepts mixed studio components without component.toJSON failures", () => {
  const plan = buildStudioPublishPlan(createLayoutDocument(), "entry");
  const mixedPlan: StudioPublishPlan = {
    ...plan,
    liveMessage: {
      ...plan.liveMessage,
      components: [
        { type: COMPONENT_TYPES.TEXT_DISPLAY, content: "Raw JSON content" } as any,
        new TextDisplayBuilder().setContent("Builder content") as any,
        ...plan.liveMessage.components,
      ] as any,
    },
  };

  assert.doesNotThrow(() => buildStudioDiscordPayload(mixedPlan, 42));

  const payload = buildStudioDiscordPayload(mixedPlan, 42);
  assert.equal(payload.components.length, 3);
  assert.equal(payload.components[0]?.type, COMPONENT_TYPES.TEXT_DISPLAY);
});
