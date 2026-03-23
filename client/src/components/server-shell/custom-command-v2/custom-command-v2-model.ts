import type {
  CustomCommandV2Compiled,
  CustomCommandV2Definition,
  CustomCommandV2Issue,
  CustomCommandV2Trigger,
  CustomCommandV2TriggerType,
  CustomCommandV2WorkflowStep,
} from "@shared/custom-command-v2";
import {
  buildCustomCommandV2Slug,
  createDefaultCustomCommandV2Definition,
} from "@shared/custom-command-v2";

export const WORKFLOW_STEP_OPTIONS: Array<{ value: CustomCommandV2WorkflowStep["type"]; label: string; description: string }> = [
  { value: "send_message", label: "Send Message", description: "Send a standard channel message." },
  { value: "send_embed", label: "Send Embed", description: "Send a Discord-style embed response." },
  { value: "reply_ephemeral", label: "Ephemeral Reply", description: "Reply privately when interactions support it." },
  { value: "add_button_row", label: "Buttons", description: "Attach an action row of buttons." },
  { value: "on_button_click", label: "Wait for Button", description: "Pause until one of the configured buttons is clicked." },
  { value: "add_select_menu", label: "Select Menu", description: "Add a select menu with options." },
  { value: "on_select", label: "Wait for Select", description: "Pause until the user chooses from a select menu." },
  { value: "open_modal", label: "Modal", description: "Open a modal to collect user input." },
  { value: "save_input", label: "Save Input", description: "Capture incoming input into a variable." },
  { value: "set_variable", label: "Set Variable", description: "Store or update a workflow variable." },
  { value: "check_permission", label: "Check Permission", description: "Gate a workflow behind Discord permissions." },
  { value: "check_cooldown", label: "Check Cooldown", description: "Stop rapid repeated runs." },
  { value: "branch_if", label: "Conditional Branch", description: "Split the workflow by a condition." },
  { value: "add_role", label: "Add Role", description: "Grant a role to the actor or target." },
  { value: "remove_role", label: "Remove Role", description: "Remove a role from the actor or target." },
  { value: "call_webhook", label: "Call Webhook", description: "Make a safe outbound request." },
  { value: "log_action", label: "Log Action", description: "Write a workflow trace line." },
  { value: "fallback_response", label: "Fallback Response", description: "Handle failure or denied states gracefully." },
];

export const TRIGGER_OPTIONS: Array<{ value: CustomCommandV2TriggerType; label: string }> = [
  { value: "slash", label: "Slash" },
  { value: "keyword", label: "Keyword" },
  { value: "button", label: "Button" },
  { value: "select", label: "Select Menu" },
  { value: "modal_submit", label: "Modal Submit" },
  { value: "schedule", label: "Schedule" },
  { value: "join", label: "Member Join" },
  { value: "role_add", label: "Role Added" },
  { value: "reaction", label: "Reaction" },
];

export type WorkflowBuilderStage = "setup" | "flow" | "rules" | "review";

export const WORKFLOW_BUILDER_STAGES: Array<{
  value: WorkflowBuilderStage;
  label: string;
  description: string;
}> = [
  {
    value: "setup",
    label: "Setup",
    description: "Name the command, choose how it starts, and pick a starter path.",
  },
  {
    value: "flow",
    label: "Flow",
    description: "Shape the actual response, interaction, and step order.",
  },
  {
    value: "rules",
    label: "Rules",
    description: "Control who can run it, how often, and which fallbacks show.",
  },
  {
    value: "review",
    label: "Review",
    description: "Validate, test, and save with a plain-language preview.",
  },
];

export type WorkflowStarterTemplateId =
  | "simple-response"
  | "auto-reply"
  | "welcome-message"
  | "verify-panel"
  | "staff-role-tool"
  | "application-form";

export const WORKFLOW_STARTER_TEMPLATES: Array<{
  id: WorkflowStarterTemplateId;
  label: string;
  description: string;
  triggerHint: string;
  complexity: string;
}> = [
  {
    id: "simple-response",
    label: "Simple Response",
    description: "Start with a safe slash command that sends one clean reply.",
    triggerHint: "Slash",
    complexity: "1 step",
  },
  {
    id: "auto-reply",
    label: "Auto Reply",
    description: "Watch for a keyword and answer with a saved response or FAQ.",
    triggerHint: "Keyword",
    complexity: "1 step",
  },
  {
    id: "welcome-message",
    label: "Welcome Message",
    description: "Send a polished greeting automatically when someone joins.",
    triggerHint: "Member Join",
    complexity: "1 step",
  },
  {
    id: "verify-panel",
    label: "Verify Panel",
    description: "Post a rules panel, wait for a button click, then grant a role.",
    triggerHint: "Slash + Button",
    complexity: "5 steps",
  },
  {
    id: "staff-role-tool",
    label: "Staff Role Tool",
    description: "Gate a staff-only slash command behind permissions, then add a role.",
    triggerHint: "Slash + Permission",
    complexity: "4 steps",
  },
  {
    id: "application-form",
    label: "Application Form",
    description: "Open a modal, capture answers, and send a clean application summary.",
    triggerHint: "Slash + Modal",
    complexity: "5 steps",
  },
];

function createSlashName(name: string) {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32) || "archivist-command"
  );
}

export function createWorkflowTriggerTemplate(
  type: CustomCommandV2TriggerType,
  input: { name?: string; description?: string } = {},
): CustomCommandV2Trigger {
  const name = input.name?.trim() || "Archivist Command";
  const description = input.description?.trim() || "Run this Archivist command";

  switch (type) {
    case "keyword":
      return { type: "keyword", pattern: name.toLowerCase(), aliases: [], matchMode: "exact", caseSensitive: false };
    case "button":
      return { type: "button", customId: "archivist:button" };
    case "select":
      return { type: "select", customId: "archivist:select", acceptedValues: [] };
    case "modal_submit":
      return { type: "modal_submit", customId: "archivist:modal" };
    case "schedule":
      return { type: "schedule", cron: "0 9 * * *", timezone: "UTC" };
    case "join":
      return { type: "join" };
    case "role_add":
      return { type: "role_add", roleIds: [] };
    case "reaction":
      return { type: "reaction", emoji: "🔥" };
    case "slash":
    default:
      return {
        type: "slash",
        name: createSlashName(name),
        description,
      };
  }
}

export function cloneWorkflowDefinition(definition: CustomCommandV2Definition) {
  return JSON.parse(JSON.stringify(definition)) as CustomCommandV2Definition;
}

export function createWorkflowDraft() {
  return createDefaultCustomCommandV2Definition();
}

export function createBlankWorkflowDraft(): CustomCommandV2Definition {
  return {
    meta: {
      name: "",
      description: "",
      category: "",
      tags: [],
    },
    trigger: {
      type: "slash",
      name: "",
      description: "",
    },
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
      entryStepId: "",
      steps: [],
    },
    fallbacks: {},
    ui: {
      mode: "workflow",
      advancedSections: [],
      starterTemplate: "blank",
    },
  };
}

export function createWorkflowStarterTemplate(templateId: WorkflowStarterTemplateId): CustomCommandV2Definition {
  const definition = createDefaultCustomCommandV2Definition();
  definition.ui.mode = "workflow";
  definition.ui.starterTemplate = templateId;
  definition.behavior.enabled = true;

  switch (templateId) {
    case "auto-reply":
      definition.meta = {
        name: "Archivist FAQ Reply",
        description: "Answer a keyword with a fast saved response.",
        category: "support",
        tags: ["starter", "faq", "keyword"],
      };
      definition.trigger = {
        type: "keyword",
        pattern: "help",
        aliases: ["faq", "support"],
        matchMode: "contains",
        caseSensitive: false,
      };
      definition.workflow = {
        entryStepId: "answer-faq",
        steps: [
          {
            id: "answer-faq",
            type: "send_message",
            label: "Answer FAQ",
            content: "Hey {user}, a moderator will help soon. Start with the pinned FAQ in {channel}.",
            channelTarget: "current",
            mentionUser: false,
          },
        ],
      };
      return definition;
    case "welcome-message":
      definition.meta = {
        name: "Archivist Welcome",
        description: "Greet members automatically when they join.",
        category: "community",
        tags: ["starter", "welcome", "join"],
      };
      definition.trigger = { type: "join" };
      definition.workflow = {
        entryStepId: "send-welcome",
        steps: [
          {
            id: "send-welcome",
            type: "send_embed",
            label: "Send welcome",
            channelTarget: "current",
            embed: {
              title: "Welcome in",
              description: "Glad you made it, {user}. Head to the rules and introductions to get settled.",
              fields: [],
            },
          },
        ],
      };
      return definition;
    case "verify-panel":
      definition.meta = {
        name: "Archivist Verify Panel",
        description: "Let members confirm the rules and receive a verified role.",
        category: "moderation",
        tags: ["starter", "verify", "roles"],
      };
      definition.trigger = {
        type: "slash",
        name: "verify",
        description: "Post the Archivist verify panel",
      };
      definition.workflow = {
        entryStepId: "send-panel",
        steps: [
          {
            id: "send-panel",
            type: "send_embed",
            label: "Send verify panel",
            channelTarget: "current",
            nextStepId: "add-verify-button",
            embed: {
              title: "Server verification",
              description: "Read the rules, then tap **Verify Me** to unlock the server.",
              fields: [],
            },
          },
          {
            id: "add-verify-button",
            type: "add_button_row",
            label: "Add verify button",
            responseMode: "reply",
            nextStepId: "await-verification",
            buttons: [
              {
                id: "verify-button",
                label: "Verify Me",
                customId: "verify:acknowledge",
                style: "success",
              },
            ],
          },
          {
            id: "await-verification",
            type: "on_button_click",
            label: "Wait for verify click",
            customIds: ["verify:acknowledge"],
            timeoutSeconds: 900,
            nextStepId: "grant-verified-role",
            onTimeoutStepId: "verify-timeout",
          },
          {
            id: "grant-verified-role",
            type: "add_role",
            label: "Grant verified role",
            roleId: "ROLE_ID",
            target: "actor",
            nextStepId: "confirm-verification",
          },
          {
            id: "confirm-verification",
            type: "reply_ephemeral",
            label: "Confirm verification",
            content: "You are verified now, {user}.",
          },
          {
            id: "verify-timeout",
            type: "fallback_response",
            label: "Handle verify timeout",
            content: "That verify button timed out. Run /verify again when you are ready.",
            ephemeral: true,
            stopAfter: true,
          },
        ],
      };
      return definition;
    case "staff-role-tool":
      definition.meta = {
        name: "Archivist Staff Role Tool",
        description: "Let staff grant one role through a protected slash command.",
        category: "moderation",
        tags: ["starter", "staff", "roles"],
      };
      definition.trigger = {
        type: "slash",
        name: "staff-role",
        description: "Run the staff role tool",
      };
      definition.workflow = {
        entryStepId: "check-staff-permission",
        steps: [
          {
            id: "check-staff-permission",
            type: "check_permission",
            label: "Check staff permission",
            permissions: ["manage_roles"],
            mode: "all",
            onDeniedStepId: "deny-staff-access",
            nextStepId: "grant-staff-role",
          },
          {
            id: "grant-staff-role",
            type: "add_role",
            label: "Grant role",
            roleId: "ROLE_ID",
            target: "actor",
            nextStepId: "confirm-staff-role",
          },
          {
            id: "confirm-staff-role",
            type: "reply_ephemeral",
            label: "Confirm role grant",
            content: "Archivist granted the configured role successfully.",
          },
          {
            id: "deny-staff-access",
            type: "fallback_response",
            label: "Deny access",
            content: "You need the Manage Roles permission to use this tool.",
            ephemeral: true,
            stopAfter: true,
          },
        ],
      };
      return definition;
    case "application-form":
      definition.meta = {
        name: "Archivist Application Form",
        description: "Collect an application with a modal and forward it into the current channel.",
        category: "applications",
        tags: ["starter", "modal", "applications"],
      };
      definition.trigger = {
        type: "slash",
        name: "apply",
        description: "Open the Archivist application form",
      };
      definition.variables = [
        {
          key: "applicationName",
          label: "Applicant name",
          scope: "execution",
          dataType: "string",
        },
        {
          key: "applicationReason",
          label: "Application reason",
          scope: "execution",
          dataType: "string",
        },
      ];
      definition.workflow = {
        entryStepId: "open-application-modal",
        steps: [
          {
            id: "open-application-modal",
            type: "open_modal",
            label: "Open application modal",
            customId: "application:modal",
            title: "Application form",
            nextStepId: "save-applicant-name",
            fields: [
              {
                id: "applicationName",
                label: "Display name",
                style: "short",
                required: true,
              },
              {
                id: "applicationReason",
                label: "Why do you want in?",
                style: "paragraph",
                required: true,
              },
            ],
          },
          {
            id: "save-applicant-name",
            type: "save_input",
            label: "Save applicant name",
            source: "modal",
            inputKey: "applicationName",
            variableKey: "applicationName",
            nextStepId: "save-application-reason",
          },
          {
            id: "save-application-reason",
            type: "save_input",
            label: "Save applicant reason",
            source: "modal",
            inputKey: "applicationReason",
            variableKey: "applicationReason",
            nextStepId: "send-application-summary",
          },
          {
            id: "send-application-summary",
            type: "send_embed",
            label: "Send application summary",
            channelTarget: "current",
            nextStepId: "confirm-application",
            embed: {
              title: "New application",
              description: "**Applicant:** {applicationName}\n\n**Reason:** {applicationReason}",
              fields: [],
            },
          },
          {
            id: "confirm-application",
            type: "reply_ephemeral",
            label: "Confirm submission",
            content: "Your application was submitted to the team.",
          },
        ],
      };
      return definition;
    case "simple-response":
    default:
      definition.meta = {
        name: "Archivist Quick Reply",
        description: "Send one clean response from a slash command.",
        category: "utility",
        tags: ["starter", "simple", "slash"],
      };
      definition.trigger = {
        type: "slash",
        name: "quick-reply",
        description: "Run the Archivist quick reply",
      };
      definition.ui.mode = "simple";
      definition.workflow = {
        entryStepId: "send-message",
        steps: [
          {
            id: "send-message",
            type: "send_message",
            label: "Send message",
            content: "Archivist is ready, {user}.",
            channelTarget: "current",
            mentionUser: false,
          },
        ],
      };
      return definition;
  }
}

export function createWorkflowStepTemplate(type: CustomCommandV2WorkflowStep["type"], index: number): CustomCommandV2WorkflowStep {
  const id = `${type.replace(/_/g, "-")}-${index + 1}`;

  switch (type) {
    case "send_embed":
      return {
        id,
        type,
        label: "Send embed",
        channelTarget: "current",
        embed: {
          title: "New Embed",
          description: "Describe what this step should send.",
          fields: [],
        },
      };
    case "reply_ephemeral":
      return {
        id,
        type,
        label: "Ephemeral reply",
        content: "Only the user should see this.",
        nextStepId: undefined,
      };
    case "add_button_row":
      return {
        id,
        type,
        label: "Add buttons",
        responseMode: "reply",
        buttons: [
          {
            id: `${id}-primary`,
            label: "Confirm",
            customId: `${id}:confirm`,
            style: "primary",
          },
        ],
      };
    case "add_select_menu":
      return {
        id,
        type,
        label: "Add select menu",
        customId: `${id}:select`,
        placeholder: "Pick an option",
        minValues: 1,
        maxValues: 1,
        options: [
          {
            label: "Option A",
            value: "option-a",
          },
        ],
      };
    case "on_button_click":
      return {
        id,
        type,
        label: "Wait for button",
        customIds: [`${id}:confirm`],
        timeoutSeconds: 900,
        nextStepId: "",
      };
    case "on_select":
      return {
        id,
        type,
        label: "Wait for select",
        customId: `${id}:select`,
        acceptedValues: [],
        timeoutSeconds: 900,
        nextStepId: "",
      };
    case "open_modal":
      return {
        id,
        type,
        label: "Open modal",
        customId: `${id}:modal`,
        title: "Collect details",
        fields: [
          {
            id: "details",
            label: "Details",
            style: "paragraph",
            required: true,
          },
        ],
      };
    case "save_input":
      return {
        id,
        type,
        label: "Save input",
        source: "context",
        inputKey: "input.value",
        variableKey: "lastInput",
      };
    case "set_variable":
      return {
        id,
        type,
        label: "Set variable",
        variableKey: "status",
        operation: "set",
        value: {
          source: "literal",
          value: "ready",
        },
      };
    case "check_permission":
      return {
        id,
        type,
        label: "Check permission",
        permissions: ["manage_messages"],
        mode: "all",
      };
    case "check_cooldown":
      return {
        id,
        type,
        label: "Check cooldown",
        seconds: 5,
        scope: "user",
      };
    case "branch_if":
      return {
        id,
        type,
        label: "Branch if",
        condition: {
          left: { source: "context", key: "actor.isPremium" },
          operator: "truthy",
          caseSensitive: false,
        },
        trueStepId: "",
      };
    case "add_role":
      return {
        id,
        type,
        label: "Add role",
        roleId: "",
        target: "actor",
      };
    case "remove_role":
      return {
        id,
        type,
        label: "Remove role",
        roleId: "",
        target: "actor",
      };
    case "call_webhook":
      return {
        id,
        type,
        label: "Call webhook",
        method: "POST",
        url: "https://example.com/webhook",
        headers: {},
        body: {},
        timeoutMs: 3500,
      };
    case "log_action":
      return {
        id,
        type,
        label: "Log action",
        level: "info",
        message: "Workflow step completed.",
      };
    case "fallback_response":
      return {
        id,
        type,
        label: "Fallback response",
        content: "Something went wrong. Try again in a moment.",
        ephemeral: true,
        stopAfter: true,
      };
    case "send_message":
    default:
      return {
        id,
        type: "send_message",
        label: "Send message",
        content: "Write the message this command should send.",
        channelTarget: "current",
        mentionUser: false,
      };
  }
}

export function buildWorkflowSavePayload(input: {
  definition: CustomCommandV2Definition;
  compiled?: CustomCommandV2Compiled;
  issues?: CustomCommandV2Issue[];
}) {
  return {
    schemaVersion: 1 as const,
    kind: "archivist-command" as const,
    definition: input.definition,
    importSource: {
      kind: "dashboard" as const,
      importedAt: new Date().toISOString(),
    },
  };
}

export function getWorkflowTriggerLabel(definition: CustomCommandV2Definition) {
  switch (definition.trigger.type) {
    case "slash":
      return `/${definition.trigger.name}`;
    case "keyword":
      return definition.trigger.pattern;
    case "button":
    case "select":
    case "modal_submit":
      return definition.trigger.customId;
    case "schedule":
      return `${definition.trigger.cron} (${definition.trigger.timezone})`;
    case "reaction":
      return definition.trigger.emoji;
    case "role_add":
      return definition.trigger.roleIds.join(", ") || "Any role";
    case "join":
      return "Member join";
    default:
      return "Trigger";
  }
}

export function summarizeIssues(issues: CustomCommandV2Issue[] | undefined) {
  const all = issues || [];
  const errors = all.filter((entry) => entry.severity === "error").length;
  const warnings = all.filter((entry) => entry.severity === "warning").length;
  return { errors, warnings };
}
