import test from "node:test";
import assert from "node:assert/strict";
import { previewCustomCommandV2Import } from "./import-service";

function createBasePayload(trigger: Record<string, unknown>) {
  return {
    schemaVersion: 1,
    kind: "archivist-command",
    command: {
      meta: {
        name: "help-reply",
        description: "Reply with help details.",
        category: "utility",
        tags: ["support"],
      },
      trigger,
      access: {
        mode: "allow_all",
        allowedRoleIds: [],
        blockedRoleIds: [],
        allowedChannelIds: [],
        blockedChannelIds: [],
        requiredPermissions: [],
        ownerOnly: false,
        premiumOnly: false,
      },
      behavior: {
        enabled: false,
        cooldownSeconds: 0,
        cooldownScope: "user",
        defaultEphemeral: false,
        deleteInvocation: false,
        logRuns: true,
      },
      variables: [],
      workflow: {
        entryStepId: "step-1",
        steps: [
          {
            id: "step-1",
            type: "send_message",
            content: "Need help? A moderator will be with you shortly.",
            channelTarget: "current",
            mentionUser: false,
          },
        ],
      },
      fallbacks: {},
      ui: {
        mode: "workflow",
        advancedSections: [],
      },
    },
  };
}

function createKeywordPayload() {
  return createBasePayload({
    type: "keyword",
    pattern: "help",
    aliases: [],
    matchMode: "contains",
    caseSensitive: false,
  });
}

function createSlashPayload() {
  return createBasePayload({
    type: "slash",
    name: "help",
    description: "Show help",
  });
}

function stringify(value: unknown) {
  return JSON.stringify(value, null, 2);
}

test("perfectly valid raw JSON previews and imports cleanly", () => {
  const result = previewCustomCommandV2Import(stringify(createKeywordPayload()));

  assert.equal(result.importReady, true);
  assert.equal(result.draftReady, true);
  assert.equal(result.preview?.name, "help-reply");
  assert.equal(result.preview?.triggerType, "keyword");
  assert.equal(result.diagnostics.notices.length, 0);
});

test("valid JSON wrapped in markdown code fences is repaired safely", () => {
  const result = previewCustomCommandV2Import(`\`\`\`json\n${stringify(createKeywordPayload())}\n\`\`\``);

  assert.equal(result.importReady, true);
  assert.ok(result.diagnostics.notices.some((entry) => entry.code === "removed_code_fences"));
  assert.equal(result.preview?.outputPreview.mode, "message");
});

test("valid JSON with chatbot prose before and after is extracted", () => {
  const raw = `Here is your Archivist command:\n\n${stringify(createKeywordPayload())}\n\nUse it safely.`;
  const result = previewCustomCommandV2Import(raw);

  assert.equal(result.importReady, true);
  assert.ok(result.diagnostics.notices.some((entry) => entry.code === "extracted_wrapped_json"));
  assert.equal(result.preview?.triggerType, "keyword");
});

test("valid JSON with smart quotes is normalized on import", () => {
  const raw = stringify(createKeywordPayload()).replace(/"/g, "“");
  const result = previewCustomCommandV2Import(raw);

  assert.equal(result.importReady, true);
  assert.ok(result.diagnostics.notices.some((entry) => entry.code === "normalized_smart_quotes"));
});

test("valid JSON with leading invisible characters is repaired", () => {
  const raw = `\uFEFF\u200B${stringify(createKeywordPayload())}`;
  const result = previewCustomCommandV2Import(raw);

  assert.equal(result.importReady, true);
  assert.ok(result.diagnostics.notices.some((entry) => entry.code === "removed_bom"));
  assert.ok(result.diagnostics.notices.some((entry) => entry.code === "removed_zero_width"));
});

test("invalid JSON missing quotes is blocked with human guidance", () => {
  const raw = `{ schemaVersion: 1, "kind": "archivist-command" }`;
  const result = previewCustomCommandV2Import(raw);

  assert.equal(result.importReady, false);
  assert.equal(result.preview, null);
  assert.ok(result.issues[0]?.message.toLowerCase().includes("double quotes") || result.issues[0]?.message.toLowerCase().includes("structurally safe"));
  assert.ok(result.diagnostics.parseLocation);
});

test("structurally valid JSON with unsupported fields is blocked cleanly", () => {
  const payload = createKeywordPayload() as any;
  payload.command.ui.extraPanel = true;
  const result = previewCustomCommandV2Import(stringify(payload));

  assert.equal(result.importReady, false);
  assert.ok(result.issues.some((entry) => entry.code === "unsupported_fields"));
});

test("structurally valid JSON with an unsupported trigger type is blocked", () => {
  const payload = createKeywordPayload() as any;
  payload.command.trigger = { type: "magic", pattern: "help" };
  const result = previewCustomCommandV2Import(stringify(payload));

  assert.equal(result.importReady, false);
  assert.ok(result.issues.some((entry) => entry.code === "unsupported_trigger_type" || entry.code === "unsupported_variant"));
});

test("minimal valid beginner-safe keyword command previews correctly", () => {
  const result = previewCustomCommandV2Import(stringify(createKeywordPayload()));

  assert.equal(result.importReady, true);
  assert.equal(result.preview?.triggerType, "keyword");
  assert.equal(result.preview?.conditionCount, 0);
  assert.equal(result.preview?.actionCount, 1);
  assert.equal(result.preview?.outputPreview.message, "Need help? A moderator will be with you shortly.");
});

test("minimal valid slash command with one response step previews correctly", () => {
  const result = previewCustomCommandV2Import(stringify(createSlashPayload()));

  assert.equal(result.importReady, true);
  assert.equal(result.preview?.triggerType, "slash");
  assert.equal(result.preview?.actionCount, 1);
  assert.equal(result.preview?.outputPreview.mode, "message");
});
