import type {
  CustomCommandV2Compiled,
  CustomCommandV2Definition,
  CustomCommandV2ImportSource,
  CustomCommandV2Issue,
  CustomCommandV2WorkflowStep,
} from "@shared/custom-command-v2";
import {
  buildCustomCommandV2Slug,
  customCommandV2CompiledSchema,
  customCommandV2DefinitionSchema,
} from "@shared/custom-command-v2";

function issue(path: string, code: string, message: string, severity: "error" | "warning" = "error", suggestedFix?: string): CustomCommandV2Issue {
  return { path, code, message, severity, suggestedFix };
}

function liveOnlySeverity(enabled: boolean): "error" | "warning" {
  return enabled ? "error" : "warning";
}

function isLikelyPlaceholderValue(value: string | null | undefined) {
  if (!value) return false;
  const normalized = value.trim();
  if (!normalized) return false;
  return [
    "ROLE_ID",
    "CHANNEL_ID",
    "MESSAGE_ID",
    "WEBHOOK_URL",
    "USER_ID",
    "CUSTOM_ID",
    "SELECT_VALUE",
  ].some((token) => normalized.includes(token))
    || /^https?:\/\/example\.com/i.test(normalized);
}

function looksLikeCronExpression(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return parts.length === 5 || parts.length === 6;
}

function collectOperandVariableKeys(step: CustomCommandV2WorkflowStep) {
  switch (step.type) {
    case "set_variable":
      return step.value.source === "variable" ? [step.value.key] : [];
    case "branch_if": {
      const keys: string[] = [];
      if (step.condition.left.source === "variable") keys.push(step.condition.left.key);
      if (step.condition.right?.source === "variable") keys.push(step.condition.right.key);
      return keys;
    }
    default:
      return [];
  }
}

function getStepReferenceEntries(step: CustomCommandV2WorkflowStep) {
  switch (step.type) {
    case "send_message":
    case "send_embed":
    case "add_role":
    case "remove_role":
    case "call_webhook":
      return [
        ["nextStepId", step.nextStepId],
        ["onFailureStepId", step.onFailureStepId],
      ] as const;
    case "reply_ephemeral":
    case "add_button_row":
    case "add_select_menu":
    case "save_input":
    case "set_variable":
    case "log_action":
    case "fallback_response":
      return [["nextStepId", step.nextStepId]] as const;
    case "on_button_click":
    case "on_select":
      return [
        ["nextStepId", step.nextStepId],
        ["onTimeoutStepId", step.onTimeoutStepId],
      ] as const;
    case "open_modal":
      return [
        ["nextStepId", step.nextStepId],
        ["onCancelStepId", step.onCancelStepId],
      ] as const;
    case "check_permission":
    case "check_cooldown":
      return [
        ["nextStepId", step.nextStepId],
        ["onDeniedStepId", step.onDeniedStepId],
      ] as const;
    case "branch_if":
      return [
        ["trueStepId", step.trueStepId],
        ["falseStepId", step.falseStepId],
      ] as const;
    default:
      return [] as const;
  }
}

function buildMatchHints(definition: CustomCommandV2Definition) {
  switch (definition.trigger.type) {
    case "slash":
      return { names: [definition.trigger.name.toLowerCase()], customIds: [], acceptedValues: [] };
    case "keyword": {
      const trigger = definition.trigger;
      return {
        names: [trigger.pattern, ...trigger.aliases].map((value) =>
          trigger.caseSensitive ? value : value.toLowerCase(),
        ),
        customIds: [],
        acceptedValues: [],
      };
    }
    case "button":
      return { names: [], customIds: [definition.trigger.customId], acceptedValues: [] };
    case "select":
      return {
        names: [],
        customIds: [definition.trigger.customId],
        acceptedValues: definition.trigger.acceptedValues,
      };
    case "modal_submit":
      return { names: [], customIds: [definition.trigger.customId], acceptedValues: [] };
    case "schedule":
      return {
        names: [],
        customIds: [],
        acceptedValues: [],
        cron: definition.trigger.cron,
        timezone: definition.trigger.timezone,
      };
    case "reaction":
      return { names: [], customIds: [], acceptedValues: [], emoji: definition.trigger.emoji };
    default:
      return { names: [], customIds: [], acceptedValues: [] };
  }
}

export function validateCustomCommandV2Definition(input: unknown) {
  const parsed = customCommandV2DefinitionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      definition: null,
      issues: parsed.error.issues.map((entry) =>
        issue(
          entry.path.length > 0 ? entry.path.join(".") : "command",
          entry.code,
          entry.message,
        ),
      ),
    };
  }

  const definition = parsed.data;
  const issues: CustomCommandV2Issue[] = [];
  const enabledSeverity = liveOnlySeverity(definition.behavior.enabled);
  const seenSteps = new Set<string>();
  const declaredVariables = new Set<string>();
  const workflowVariableKeys = new Set<string>();
  const availableButtonCustomIds = new Set<string>();
  const availableSelectCustomIds = new Set<string>();

  definition.variables.forEach((variable, index) => {
    if (declaredVariables.has(variable.key)) {
      issues.push(issue(`command.variables.${index}.key`, "duplicate_variable", `Variable "${variable.key}" is declared more than once.`));
    }
    declaredVariables.add(variable.key);
  });

  definition.workflow.steps.forEach((step, index) => {
    if (seenSteps.has(step.id)) {
      issues.push(issue(`command.workflow.steps.${index}.id`, "duplicate_step", `Step "${step.id}" is declared more than once.`));
    }
    seenSteps.add(step.id);

    if (step.type === "save_input" || step.type === "set_variable") {
      workflowVariableKeys.add(step.variableKey);
    }
    if (step.type === "add_button_row") {
      step.buttons.forEach((button) => availableButtonCustomIds.add(button.customId));
    }
    if (step.type === "add_select_menu") {
      availableSelectCustomIds.add(step.customId);
    }
  });

  const knownVariableKeys = new Set([...Array.from(declaredVariables), ...Array.from(workflowVariableKeys)]);

  if (!seenSteps.has(definition.workflow.entryStepId)) {
    issues.push(issue("command.workflow.entryStepId", "missing_entry", `Entry step "${definition.workflow.entryStepId}" does not exist.`));
  }

  definition.workflow.steps.forEach((step, index) => {
    for (const [field, reference] of getStepReferenceEntries(step)) {
      if (!reference) continue;
      if (!seenSteps.has(reference)) {
        issues.push(
          issue(
            `command.workflow.steps.${index}.${field}`,
            "missing_reference",
            `Step "${step.id}" points to missing step "${reference}".`,
          ),
        );
      }
    }

    if (step.type === "save_input" || step.type === "set_variable") {
      if (!declaredVariables.has(step.variableKey)) {
        issues.push(
          issue(
            `command.workflow.steps.${index}.variableKey`,
            "undeclared_variable",
            `Variable "${step.variableKey}" is used without a declaration.`,
            "warning",
            "Add it in the Variables section so the editor can explain and validate it more clearly.",
          ),
        );
      }
    }

    collectOperandVariableKeys(step).forEach((variableKey) => {
      if (!knownVariableKeys.has(variableKey)) {
        issues.push(
          issue(
            `command.workflow.steps.${index}`,
            "unknown_variable_reference",
            `Step "${step.id}" reads variable "${variableKey}", but Archivist cannot find where that variable comes from.`,
            "warning",
            "Declare the variable or add a save/set step that fills it before this branch runs.",
          ),
        );
      }
    });

    switch (step.type) {
      case "send_message":
      case "send_embed":
        if (step.channelTarget === "configured" && isLikelyPlaceholderValue(step.channelId)) {
          issues.push(
            issue(
              `command.workflow.steps.${index}.channelId`,
              "placeholder_channel_id",
              `Step "${step.id}" still uses a placeholder channel ID.`,
              enabledSeverity,
              "Replace CHANNEL_ID with a real Discord channel ID before enabling the command.",
            ),
          );
        }
        break;
      case "add_role":
      case "remove_role":
        if (isLikelyPlaceholderValue(step.roleId)) {
          issues.push(
            issue(
              `command.workflow.steps.${index}.roleId`,
              "placeholder_role_id",
              `Step "${step.id}" still uses a placeholder role ID.`,
              enabledSeverity,
              "Replace ROLE_ID with a real Discord role ID before publishing live.",
            ),
          );
        }
        break;
      case "call_webhook":
        if (isLikelyPlaceholderValue(step.url)) {
          issues.push(
            issue(
              `command.workflow.steps.${index}.url`,
              "placeholder_webhook_url",
              `Step "${step.id}" still points at a placeholder webhook URL.`,
              enabledSeverity,
              "Replace WEBHOOK_URL or example.com with the real endpoint before enabling the command.",
            ),
          );
        } else if (!step.url.startsWith("https://")) {
          issues.push(
            issue(
              `command.workflow.steps.${index}.url`,
              "insecure_webhook_url",
              `Step "${step.id}" uses a non-HTTPS webhook URL.`,
              "warning",
              "Switch webhook calls to HTTPS so Archivist sends data over a secure connection.",
            ),
          );
        }
        break;
      case "on_button_click":
        if (definition.trigger.type !== "button" && step.customIds.every((customId) => !availableButtonCustomIds.has(customId))) {
          issues.push(
            issue(
              `command.workflow.steps.${index}.customIds`,
              "unbound_button_wait",
              `Step "${step.id}" waits for buttons that are not added anywhere in this workflow.`,
              enabledSeverity,
              "Add a Buttons step first or align the custom IDs with an existing button trigger.",
            ),
          );
        }
        break;
      case "on_select":
        if (definition.trigger.type !== "select" && !availableSelectCustomIds.has(step.customId)) {
          issues.push(
            issue(
              `command.workflow.steps.${index}.customId`,
              "unbound_select_wait",
              `Step "${step.id}" waits for a select menu that is not added anywhere in this workflow.`,
              enabledSeverity,
              "Add a Select Menu step first or align the custom ID with an existing select trigger.",
            ),
          );
        }
        break;
      case "open_modal":
        if (!["slash", "button", "select"].includes(definition.trigger.type)) {
          issues.push(
            issue(
              `command.workflow.steps.${index}.type`,
              "unsupported_modal_trigger",
              `Step "${step.id}" opens a modal, but the "${definition.trigger.type}" trigger cannot reliably open forms in Discord.`,
              enabledSeverity,
              "Use a slash, button, or select-based command before opening a modal.",
            ),
          );
        }
        break;
      default:
        break;
    }
  });

  if (definition.access.mode === "restricted"
    && definition.access.allowedRoleIds.length === 0
    && definition.access.allowedChannelIds.length === 0
    && definition.access.requiredPermissions.length === 0
    && !definition.access.ownerOnly
  ) {
    issues.push(
      issue(
        "command.access.mode",
        "empty_restriction",
        "Restricted access is enabled, but there are no allow rules yet.",
        enabledSeverity,
        "Add an allowed role, channel, permission, or switch back to allow all.",
      ),
    );
  }

  definition.access.allowedRoleIds.forEach((roleId, index) => {
    if (isLikelyPlaceholderValue(roleId)) {
      issues.push(
        issue(
          `command.access.allowedRoleIds.${index}`,
          "placeholder_role_id",
          "An allowed role list still contains a placeholder role ID.",
          enabledSeverity,
          "Replace ROLE_ID with a real Discord role ID before publishing live.",
        ),
      );
    }
  });

  definition.access.allowedChannelIds.forEach((channelId, index) => {
    if (isLikelyPlaceholderValue(channelId)) {
      issues.push(
        issue(
          `command.access.allowedChannelIds.${index}`,
          "placeholder_channel_id",
          "An allowed channel list still contains a placeholder channel ID.",
          enabledSeverity,
          "Replace CHANNEL_ID with a real Discord channel ID before publishing live.",
        ),
      );
    }
  });

  if (definition.trigger.type === "schedule" && !looksLikeCronExpression(definition.trigger.cron)) {
    issues.push(
      issue(
        "command.trigger.cron",
        "invalid_schedule_shape",
        "Scheduled commands need a standard cron expression with 5 or 6 parts.",
        enabledSeverity,
        "Use a normal cron string like 0 9 * * * or */15 * * * *.",
      ),
    );
  }

  if (definition.trigger.type === "button" || definition.trigger.type === "select" || definition.trigger.type === "reaction") {
    if (isLikelyPlaceholderValue(definition.trigger.channelId)) {
      issues.push(
        issue(
          "command.trigger.channelId",
          "placeholder_channel_id",
          "The trigger still uses a placeholder channel ID.",
          enabledSeverity,
          "Replace CHANNEL_ID with a real Discord channel ID before publishing live.",
        ),
      );
    }
    if ("messageId" in definition.trigger && isLikelyPlaceholderValue(definition.trigger.messageId)) {
      issues.push(
        issue(
          "command.trigger.messageId",
          "placeholder_message_id",
          "The trigger still uses a placeholder message ID.",
          enabledSeverity,
          "Replace MESSAGE_ID with a real Discord message ID before publishing live.",
        ),
      );
    }
  }

  if (definition.trigger.type === "role_add") {
    definition.trigger.roleIds.forEach((roleId, index) => {
      if (isLikelyPlaceholderValue(roleId)) {
        issues.push(
          issue(
            `command.trigger.roleIds.${index}`,
            "placeholder_role_id",
            "This role trigger still uses a placeholder role ID.",
            enabledSeverity,
            "Replace ROLE_ID with a real Discord role ID before publishing live.",
          ),
        );
      }
    });
  }

  if (definition.behavior.cooldownSeconds > 0 && definition.workflow.steps.every((step) => step.type !== "check_cooldown")) {
    issues.push(
      issue(
        "command.behavior.cooldownSeconds",
        "behavior_cooldown_only",
        "This command has a command-level cooldown, but no explicit cooldown step in the workflow.",
        "warning",
      ),
    );
  }

  return { definition, issues };
}

export function compileCustomCommandV2Definition(definition: CustomCommandV2Definition) {
  const validation = validateCustomCommandV2Definition(definition);
  if (!validation.definition) {
    return { compiled: null, issues: validation.issues };
  }

  const fatalIssues = validation.issues.filter((entry) => entry.severity === "error");
  if (fatalIssues.length > 0) {
    return { compiled: null, issues: validation.issues };
  }

  const stepsById = Object.fromEntries(
    validation.definition.workflow.steps.map((step) => [step.id, step]),
  );

  const compiled = customCommandV2CompiledSchema.parse({
    schemaVersion: 1,
    kind: "archivist-command-runtime",
    meta: validation.definition.meta,
    trigger: validation.definition.trigger,
    triggerType: validation.definition.trigger.type,
    match: buildMatchHints(validation.definition),
    access: validation.definition.access,
    behavior: validation.definition.behavior,
    variables: validation.definition.variables,
    workflow: {
      entryStepId: validation.definition.workflow.entryStepId,
      stepOrder: validation.definition.workflow.steps.map((step) => step.id),
      stepsById,
    },
    fallbacks: validation.definition.fallbacks,
    ui: validation.definition.ui,
  });

  return { compiled, issues: validation.issues };
}

export function buildCustomCommandV2CreateInput(input: {
  definition: CustomCommandV2Definition;
  compiled: CustomCommandV2Compiled;
  issues?: CustomCommandV2Issue[];
  source?: CustomCommandV2ImportSource | null;
}) {
  return {
    schemaVersion: 1,
    kind: "archivist-command",
    name: input.definition.meta.name,
    slug: buildCustomCommandV2Slug(input.definition.meta.name),
    enabled: input.definition.behavior.enabled,
    triggerType: input.definition.trigger.type,
    definition: input.definition,
    compiled: input.compiled,
    importSource: input.source ?? null,
    lastValidation: input.issues ?? [],
  };
}
