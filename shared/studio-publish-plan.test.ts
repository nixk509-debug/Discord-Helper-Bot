import test from "node:test";
import assert from "node:assert/strict";
import type { StudioDocument, StudioDraftMode } from "./schema";
import { createMigratedStudioDocument } from "./studio/migrate";
import { buildStudioPublishPlan } from "./studio-publish-plan";

function createBaseDocument(mode?: StudioDraftMode): StudioDocument {
  return {
    version: 2,
    meta: {
      name: "Test",
      entryViewId: "entry",
      ...(mode ? { mode } : {}),
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

test("text display only plans as exact V2 publish", () => {
  const document = createBaseDocument();
  document.nodes.txt = {
    id: "txt",
    type: "text_display",
    viewId: "entry",
    childIds: [],
    props: { text: "Hello world" },
  };
  document.views.entry.rootNodeIds = ["txt"];

  const plan = buildStudioPublishPlan(document, "entry");
  assert.equal(plan.mode, "exact");
  assert.equal(plan.publishPath, "v2");
  assert.equal(plan.usesComponentsV2, true);
  assert.equal(plan.liveMessage.components[0]?.type, 10);
});

test("media gallery with valid items plans as exact V2 publish", () => {
  const document = createBaseDocument();
  document.nodes.gallery = {
    id: "gallery",
    type: "media_gallery",
    viewId: "entry",
    childIds: [],
    props: {
      items: [{ url: "https://cdn.example.com/test.png", description: "alt" }],
    },
  };
  document.views.entry.rootNodeIds = ["gallery"];

  const plan = buildStudioPublishPlan(document, "entry");
  assert.equal(plan.mode, "exact");
  assert.equal(plan.liveMessage.components[0]?.type, 12);
});

test("container with text child plans as exact V2 publish", () => {
  const document = createBaseDocument();
  document.nodes.container = {
    id: "container",
    type: "container",
    viewId: "entry",
    childIds: ["txt"],
    props: { heading: "Rules" },
  };
  document.nodes.txt = {
    id: "txt",
    type: "text_display",
    viewId: "entry",
    parentId: "container",
    childIds: [],
    props: { text: "Be nice." },
  };
  document.views.entry.rootNodeIds = ["container"];

  const plan = buildStudioPublishPlan(document, "entry");
  assert.equal(plan.mode, "exact");
  assert.equal(plan.liveMessage.components[0]?.type, 17);
});

test("style block downgrades to simplified publish", () => {
  const document = createBaseDocument();
  document.nodes.style = {
    id: "style",
    type: "style_block",
    viewId: "entry",
    childIds: [],
    props: { title: "Alert", description: "Heads up" },
  };
  document.views.entry.rootNodeIds = ["style"];

  const plan = buildStudioPublishPlan(document, "entry");
  assert.equal(plan.mode, "downgraded");
  assert.equal(plan.liveMessage.embeds.length, 1);
  assert.equal(plan.downgradedNodeCount, 1);
});

test("action row with button plans as exact V2 publish", () => {
  const document = createBaseDocument();
  document.actions.reply = {
    id: "reply",
    type: "reply_message",
    response: {
      mode: "inline",
      inline: { content: "Hi" },
    },
    replyMode: "ephemeral",
  };
  document.nodes.row = {
    id: "row",
    type: "action_row",
    viewId: "entry",
    childIds: ["button"],
    props: {},
  };
  document.nodes.button = {
    id: "button",
    type: "button",
    viewId: "entry",
    parentId: "row",
    childIds: [],
    actionId: "reply",
    props: { label: "Go", style: 1 },
  };
  document.views.entry.rootNodeIds = ["row"];

  const plan = buildStudioPublishPlan(document, "entry");
  assert.equal(plan.mode, "exact");
  assert.equal(plan.liveMessage.components[0]?.type, 1);
});

test("string select without option bindings is blocked", () => {
  const document = createBaseDocument();
  document.nodes.select = {
    id: "select",
    type: "string_select",
    viewId: "entry",
    childIds: [],
    props: {
      label: "Pick",
      options: [{ label: "One", value: "one" }],
    },
    optionActionIds: {},
  };
  document.views.entry.rootNodeIds = ["select"];

  const plan = buildStudioPublishPlan(document, "entry");
  assert.equal(plan.mode, "blocked");
  assert.ok(plan.blockedNodeCount >= 1);
});

test("runtime-gated select menus are blocked", () => {
  const document = createBaseDocument();
  document.nodes.select = {
    id: "select",
    type: "role_select",
    viewId: "entry",
    childIds: [],
    props: { label: "Roles" },
  };
  document.views.entry.rootNodeIds = ["select"];

  const plan = buildStudioPublishPlan(document, "entry");
  assert.equal(plan.mode, "blocked");
  assert.equal(plan.usesInteractiveComponents, true);
});

test("legacy drafts auto-migrate into explicit standard mode with a backup snapshot", () => {
  const migrated = createMigratedStudioDocument(createBaseDocument());

  assert.equal(migrated.document.meta.mode, "standard");
  assert.ok(migrated.document.meta.migration?.backupDocument);
});

test("layout_v2 drafts with standard embeds are downgraded instead of reporting exact publish", () => {
  const document = createBaseDocument("layout_v2");
  document.views.entry.embeds = [{ title: "Legacy embed", description: "Needs downgrade" }];

  const plan = buildStudioPublishPlan(document, "entry");

  assert.equal(plan.mode, "downgraded");
  assert.equal(plan.publishPath, "downgraded");
  assert.ok(plan.diagnostics.some((entry) => entry.code === "LAYOUT_MODE_STANDARD_BODY"));
});

test("external file blocks downgrade in layout_v2 because Discord file components need uploaded attachments", () => {
  const document = createBaseDocument("layout_v2");
  document.nodes.file = {
    id: "file",
    type: "file",
    viewId: "entry",
    childIds: [],
    props: { url: "https://example.com/guide.pdf", label: "Guide" },
  };
  document.views.entry.rootNodeIds = ["file"];

  const plan = buildStudioPublishPlan(document, "entry");

  assert.equal(plan.mode, "downgraded");
  assert.equal(plan.liveMessage.content?.includes("https://example.com/guide.pdf"), true);
  assert.ok(plan.nodeOutcomes.some((entry) => entry.status === "downgraded"));
});
