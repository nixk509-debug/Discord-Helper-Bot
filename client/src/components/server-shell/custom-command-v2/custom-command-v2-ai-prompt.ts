const SUPPORTED_TRIGGER_TYPES = [
  "slash",
  "keyword",
  "button",
  "select",
  "modal_submit",
  "schedule",
  "join",
  "role_add",
  "reaction",
] as const;

const SUPPORTED_STEP_TYPES = [
  "send_message",
  "send_embed",
  "reply_ephemeral",
  "add_button_row",
  "on_button_click",
  "add_select_menu",
  "on_select",
  "open_modal",
  "save_input",
  "set_variable",
  "add_role",
  "remove_role",
  "check_permission",
  "check_cooldown",
  "branch_if",
  "log_action",
  "call_webhook",
  "fallback_response",
] as const;

export interface ArchivistAiPromptConfig {
  commandGoal: string;
  triggerType: (typeof SUPPORTED_TRIGGER_TYPES)[number];
  skillLevel: "beginner" | "advanced";
  useRoles: boolean;
  useEmbeds: boolean;
  useButtons: boolean;
  useVariables: boolean;
  useStudioReferences: boolean;
}

export const DEFAULT_ARCHIVIST_AI_PROMPT_CONFIG: ArchivistAiPromptConfig = {
  commandGoal: "Build a safe Archivist command for Discord moderation or utility work.",
  triggerType: "slash",
  skillLevel: "beginner",
  useRoles: false,
  useEmbeds: false,
  useButtons: false,
  useVariables: false,
  useStudioReferences: false,
};

function buildFeatureRules(config: ArchivistAiPromptConfig) {
  const rules: string[] = [];
  rules.push(`- Preferred trigger type: ${config.triggerType}`);
  rules.push(`- Skill level: ${config.skillLevel}`);
  rules.push(`- ${config.useRoles ? "Role actions are allowed when needed." : "Do not add role actions unless required by the goal."}`);
  rules.push(`- ${config.useEmbeds ? "Embeds are allowed when they improve clarity." : "Prefer plain text over embeds."}`);
  rules.push(`- ${config.useButtons ? "Buttons are allowed when they materially improve the flow." : "Do not add buttons unless the workflow needs them."}`);
  rules.push(`- ${config.useVariables ? "Variables are allowed when needed for user input or branching." : "Avoid variables unless the goal cannot work without them."}`);
  rules.push(`- ${config.useStudioReferences ? "If presentation reuse is requested, keep it import-safe and do not invent Studio runtime fields." : "Do not invent Studio asset fields or Studio-only runtime fields."}`);
  if (config.skillLevel === "beginner") {
    rules.push("- Prefer the smallest possible workflow with the fewest steps.");
    rules.push("- Avoid advanced branching unless explicitly required.");
  } else {
    rules.push("- Advanced flows are allowed, but keep them import-safe and minimal.");
  }
  return rules.join("\n");
}

export function buildArchivistCustomCommandChatbotPrompt(config: ArchivistAiPromptConfig) {
  const commandGoal = config.commandGoal.trim() || DEFAULT_ARCHIVIST_AI_PROMPT_CONFIG.commandGoal;

  return `Generate exactly one Archivist Custom Command as raw JSON only.

ABSOLUTE OUTPUT RULES
- Return exactly one JSON object
- Return only raw JSON
- Do not return markdown
- Do not return code fences
- Do not return explanation text
- Do not return comments
- Do not wrap the JSON in prose
- Do not prepend or append any characters
- The first character of the entire response must be {
- The last character of the entire response must be }
- Use only standard ASCII JSON formatting
- Use straight double quotes only: "
- Never use smart quotes like “ ” or ‘ ’
- Never use typographic punctuation in place of JSON characters
- Do not include invisible characters, zero-width characters, or BOM markers
- The JSON must be import-safe on its own

TOP-LEVEL CONTRACT
- Include top-level fields: schemaVersion, kind, command
- schemaVersion must be 1
- kind must be "archivist-command"

Use this exact top-level shape:
{
  "schemaVersion": 1,
  "kind": "archivist-command",
  "command": {
    "meta": {
      "name": "",
      "description": "",
      "category": "utility",
      "tags": []
    },
    "trigger": {},
    "access": {
      "mode": "allow_all",
      "allowedRoleIds": [],
      "blockedRoleIds": [],
      "allowedChannelIds": [],
      "blockedChannelIds": [],
      "requiredPermissions": [],
      "ownerOnly": false,
      "premiumOnly": false
    },
    "behavior": {
      "enabled": false,
      "cooldownSeconds": 0,
      "cooldownScope": "user",
      "defaultEphemeral": false,
      "deleteInvocation": false,
      "logRuns": true
    },
    "variables": [],
    "workflow": {
      "entryStepId": "step-1",
      "steps": []
    },
    "fallbacks": {},
    "ui": {
      "mode": "workflow",
      "advancedSections": []
    }
  }
}

SUPPORTED TRIGGER TYPES ONLY
${SUPPORTED_TRIGGER_TYPES.map((value) => `- ${value}`).join("\n")}

SUPPORTED WORKFLOW STEP TYPES ONLY
${SUPPORTED_STEP_TYPES.map((value) => `- ${value}`).join("\n")}

FORBIDDEN OUTPUT
- Do not invent fields
- Do not invent trigger types
- Do not invent workflow step types
- Do not invent unsupported condition operators
- Do not include functions, scripts, JSX, TypeScript, JavaScript, or executable code
- Do not include comments
- Do not include placeholder junk
- Do not generate multiple commands
- Do not use curly quotes
- Do not use single quotes for JSON keys or string values

QUALITY RULES
- Use a concise command name
- Use a short, useful description
- Prefer safe defaults
- Keep the workflow minimal unless complexity is required
- Every referenced step ID must exist
- If a field is optional and not needed, omit it
- Use placeholders like ROLE_ID, CHANNEL_ID, MESSAGE_ID, WEBHOOK_URL only when a real value is required but unknown

FEATURE PREFERENCES
${buildFeatureRules(config)}

ADVANCED MINIMUM FIELD RULES
- add_button_row: include buttons with id, label, customId, style
- on_button_click: include customIds, timeoutSeconds, nextStepId
- add_select_menu: include customId and at least one option with label and value
- on_select: include customId, timeoutSeconds, nextStepId
- open_modal: include customId, title, and at least one field with id and label
- save_input: include source, inputKey, variableKey
- set_variable: include variableKey, operation, value
- add_role / remove_role: include roleId and target
- call_webhook: include method, url, timeoutMs, and only plain JSON headers/body objects

VARIABLE RULES
- If any step uses save_input or set_variable, declare that variable in command.variables
- Every variable needs key, label, scope, and dataType

FINAL RESPONSE REQUIREMENT
Return one import-safe JSON object only, using strict standard JSON with straight ASCII double quotes and no extra characters.

User request:
${commandGoal}`;
}

export const ARCHIVIST_CUSTOM_COMMAND_CHATBOT_PROMPT = buildArchivistCustomCommandChatbotPrompt(
  DEFAULT_ARCHIVIST_AI_PROMPT_CONFIG,
);
