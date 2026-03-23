import type { CustomCommandV2JsonValue, CustomCommandV2WorkflowStep } from "@shared/custom-command-v2";
import type { CustomCommandV2ExecutionContext, CustomCommandV2HandlerResult, CustomCommandV2StepHandler } from "../types";

const DEFAULT_MODAL_CONTINUATION_TIMEOUT_SECONDS = 900;

function resolveJsonValue(value: CustomCommandV2JsonValue, context: CustomCommandV2ExecutionContext): CustomCommandV2JsonValue {
  if (typeof value === "string") return context.renderText(value);
  if (Array.isArray(value)) return value.map((entry) => resolveJsonValue(entry, context));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, resolveJsonValue(entry, context)]),
    );
  }
  return value;
}

function getCooldownKey(
  context: CustomCommandV2ExecutionContext,
  stepId: string,
  scope: "user" | "channel" | "server" | "global",
) {
  switch (scope) {
    case "channel":
      return `command:${context.commandKey}:step:${stepId}:server:${context.serverId}:channel:${context.channel.id || "unknown"}`;
    case "server":
      return `command:${context.commandKey}:step:${stepId}:server:${context.serverId}`;
    case "global":
      return `command:${context.commandKey}:step:${stepId}:global`;
    case "user":
    default:
      return `command:${context.commandKey}:step:${stepId}:server:${context.serverId}:user:${context.actor.id || "anonymous"}`;
  }
}

function compareValues(
  left: CustomCommandV2JsonValue,
  operator: string,
  right: CustomCommandV2JsonValue | undefined,
  caseSensitive: boolean,
) {
  const normalizeString = (value: unknown) => {
    const text = String(value ?? "");
    return caseSensitive ? text : text.toLowerCase();
  };

  switch (operator) {
    case "eq":
      return left === right;
    case "neq":
      return left !== right;
    case "contains":
      return normalizeString(left).includes(normalizeString(right));
    case "gt":
      return Number(left ?? 0) > Number(right ?? 0);
    case "gte":
      return Number(left ?? 0) >= Number(right ?? 0);
    case "lt":
      return Number(left ?? 0) < Number(right ?? 0);
    case "lte":
      return Number(left ?? 0) <= Number(right ?? 0);
    case "truthy":
      return Boolean(left);
    case "falsy":
      return !left;
    case "includes_any":
      return Array.isArray(left) && Array.isArray(right)
        ? left.some((value) => right.includes(value))
        : false;
    default:
      return false;
  }
}

const sendMessageHandler: CustomCommandV2StepHandler = async (step, context) => {
  if (step.type !== "send_message") return {};
  const payload = {
    content: context.renderText(step.content),
    channelTarget: step.channelTarget,
    channelId: step.channelId,
    mentionUser: step.mentionUser,
  };
  await context.adapter.sendMessage(payload);
  context.pushOutput({ kind: "message", summary: payload.content || "Sent a message.", payload });
  return { summary: payload.content || "Sent a message." };
};

const sendEmbedHandler: CustomCommandV2StepHandler = async (step, context) => {
  if (step.type !== "send_embed") return {};
  const payload = {
    embed: resolveJsonValue(step.embed as any, context),
    channelTarget: step.channelTarget,
    channelId: step.channelId,
  };
  await context.adapter.sendEmbed(payload);
  context.pushOutput({ kind: "embed", summary: step.embed.title || "Sent an embed.", payload });
  return { summary: step.embed.title || "Sent an embed." };
};

const ephemeralHandler: CustomCommandV2StepHandler = async (step, context) => {
  if (step.type !== "reply_ephemeral") return {};
  const payload = {
    content: context.renderText(step.content),
    embed: step.embed ? resolveJsonValue(step.embed as any, context) : undefined,
  };
  await context.adapter.replyEphemeral(payload);
  context.pushOutput({ kind: "ephemeral", summary: payload.content || "Sent an ephemeral reply.", payload });
  return { summary: payload.content || "Sent an ephemeral reply." };
};

const buttonRowHandler: CustomCommandV2StepHandler = async (step, context) => {
  if (step.type !== "add_button_row") return {};
  const buttons = step.buttons.map((button) => ({
    ...button,
    label: context.renderText(button.label),
  }));
  await context.adapter.addButtonRow({ buttons, responseMode: step.responseMode });
  context.pushOutput({ kind: "buttons", summary: `Added ${buttons.length} button${buttons.length === 1 ? "" : "s"}.`, payload: buttons });
  return { summary: `Added ${buttons.length} button${buttons.length === 1 ? "" : "s"}.` };
};

const selectMenuHandler: CustomCommandV2StepHandler = async (step, context) => {
  if (step.type !== "add_select_menu") return {};
  const payload = {
    customId: step.customId,
    placeholder: step.placeholder ? context.renderText(step.placeholder) : undefined,
    options: step.options.map((option) => ({
      ...option,
      label: context.renderText(option.label),
      description: option.description ? context.renderText(option.description) : undefined,
    })),
    minValues: step.minValues,
    maxValues: step.maxValues,
  };
  await context.adapter.addSelectMenu(payload);
  context.pushOutput({ kind: "select", summary: `Added select menu ${step.customId}.`, payload });
  return { summary: `Added select menu ${step.customId}.` };
};

const buttonWaitHandler: CustomCommandV2StepHandler = async (step, context) => {
  if (step.type !== "on_button_click") return {};
  context.pushOutput({
    kind: "await-button",
    summary: `Waits for button click on ${step.customIds.join(", ")}.`,
    payload: { customIds: step.customIds, timeoutSeconds: step.timeoutSeconds },
  });
  if (context.mode === "live") {
    await context.adapter.createContinuationSession({
      continuationType: "button",
      stepId: step.id,
      nextStepId: step.nextStepId,
      timeoutSeconds: step.timeoutSeconds,
      onTimeoutStepId: step.onTimeoutStepId,
      customIds: step.customIds,
      variables: { ...context.variables },
      input: { ...context.input },
    });
    return { stop: true, summary: "Awaiting a button click." };
  }
  return { nextStepId: step.nextStepId, summary: "Awaiting a button click." };
};

const selectWaitHandler: CustomCommandV2StepHandler = async (step, context) => {
  if (step.type !== "on_select") return {};
  context.pushOutput({
    kind: "await-select",
    summary: `Waits for select menu ${step.customId}.`,
    payload: { customId: step.customId, acceptedValues: step.acceptedValues },
  });
  if (context.mode === "live") {
    await context.adapter.createContinuationSession({
      continuationType: "select",
      stepId: step.id,
      nextStepId: step.nextStepId,
      timeoutSeconds: step.timeoutSeconds ?? DEFAULT_MODAL_CONTINUATION_TIMEOUT_SECONDS,
      onTimeoutStepId: step.onTimeoutStepId,
      customId: step.customId,
      acceptedValues: step.acceptedValues,
      variables: { ...context.variables },
      input: { ...context.input },
    });
    return { stop: true, summary: "Awaiting a select menu response." };
  }
  return { nextStepId: step.nextStepId, summary: "Awaiting a select menu response." };
};

const modalHandler: CustomCommandV2StepHandler = async (step, context) => {
  if (step.type !== "open_modal") return {};
  const payload = {
    customId: step.customId,
    title: context.renderText(step.title),
    fields: step.fields.map((field) => ({
      ...field,
      label: context.renderText(field.label),
      placeholder: field.placeholder ? context.renderText(field.placeholder) : undefined,
    })),
  };
  await context.adapter.openModal(payload);
  context.pushOutput({ kind: "modal", summary: `Opened modal ${step.customId}.`, payload });
  if (context.mode === "live") {
    if (step.nextStepId) {
      await context.adapter.createContinuationSession({
        continuationType: "modal_submit",
        stepId: step.id,
        nextStepId: step.nextStepId,
        timeoutSeconds: DEFAULT_MODAL_CONTINUATION_TIMEOUT_SECONDS,
        onTimeoutStepId: step.onCancelStepId,
        customId: step.customId,
        variables: { ...context.variables },
        input: { ...context.input },
      });
    }
    return { stop: true, summary: `Opened modal ${step.customId}.` };
  }
  return { summary: `Opened modal ${step.customId}.` };
};

const saveInputHandler: CustomCommandV2StepHandler = (step, context) => {
  if (step.type !== "save_input") return {};
  const value = context.input[step.inputKey] ?? step.defaultValue ?? null;
  context.setVariable(step.variableKey, value);
  context.pushOutput({ kind: "variable", summary: `Saved input ${step.inputKey} to ${step.variableKey}.`, payload: value });
  return { summary: `Saved input to ${step.variableKey}.` };
};

const setVariableHandler: CustomCommandV2StepHandler = (step, context) => {
  if (step.type !== "set_variable") return {};
  const existingValue = context.variables[step.variableKey];
  const resolvedValue = context.resolveOperand(step.value);
  let nextValue: CustomCommandV2JsonValue = resolvedValue;

  switch (step.operation) {
    case "append":
      if (Array.isArray(existingValue)) {
        nextValue = [...existingValue, resolvedValue];
      } else {
        nextValue = `${existingValue ?? ""}${resolvedValue ?? ""}`;
      }
      break;
    case "increment":
      nextValue = Number(existingValue ?? 0) + Number(resolvedValue ?? 0);
      break;
    case "decrement":
      nextValue = Number(existingValue ?? 0) - Number(resolvedValue ?? 0);
      break;
    case "set":
    default:
      nextValue = resolvedValue;
      break;
  }

  context.setVariable(step.variableKey, nextValue);
  context.pushOutput({ kind: "variable", summary: `Updated ${step.variableKey}.`, payload: nextValue });
  return { summary: `Updated ${step.variableKey}.` };
};

const addRoleHandler: CustomCommandV2StepHandler = async (step, context) => {
  if (step.type !== "add_role") return {};
  await context.adapter.addRole({ roleId: step.roleId, target: step.target });
  context.pushOutput({ kind: "role", summary: `Added role ${step.roleId}.`, payload: { roleId: step.roleId, target: step.target } });
  return { summary: `Added role ${step.roleId}.` };
};

const removeRoleHandler: CustomCommandV2StepHandler = async (step, context) => {
  if (step.type !== "remove_role") return {};
  await context.adapter.removeRole({ roleId: step.roleId, target: step.target });
  context.pushOutput({ kind: "role", summary: `Removed role ${step.roleId}.`, payload: { roleId: step.roleId, target: step.target } });
  return { summary: `Removed role ${step.roleId}.` };
};

const permissionHandler: CustomCommandV2StepHandler = (step, context) => {
  if (step.type !== "check_permission") return {};
  const actorPermissions = new Set(context.actor.permissions.map((value) => value.toLowerCase()));
  const required = step.permissions.map((value) => value.toLowerCase());
  const matched = step.mode === "all"
    ? required.every((value) => actorPermissions.has(value))
    : required.some((value) => actorPermissions.has(value));

  if (!matched) {
    if (step.denialMessage || context.compiled.fallbacks.permissionDeniedMessage) {
      context.pushOutput({
        kind: "guard",
        summary: step.denialMessage || context.compiled.fallbacks.permissionDeniedMessage || "Permission denied.",
      });
    }
    return {
      nextStepId: step.onDeniedStepId ?? null,
      stop: !step.onDeniedStepId,
      summary: "Permission guard blocked this run.",
    };
  }

  return { summary: "Permission guard passed." };
};

const cooldownHandler: CustomCommandV2StepHandler = (step, context) => {
  if (step.type !== "check_cooldown") return {};
  const seconds = step.seconds ?? context.compiled.behavior.cooldownSeconds;
  const scope = step.scope ?? context.compiled.behavior.cooldownScope;

  if (seconds <= 0) return { summary: "Cooldown skipped." };

  const key = getCooldownKey(context, step.id, scope);
  const expiresAt = context.cooldownStore.get(key) ?? 0;
  if (expiresAt > context.now.getTime()) {
    const denial = step.denialMessage || context.compiled.fallbacks.cooldownMessage || "Cooldown is still active.";
    context.pushOutput({ kind: "cooldown", summary: denial, payload: { scope, expiresAt } });
    return {
      nextStepId: step.onDeniedStepId ?? null,
      stop: !step.onDeniedStepId,
      summary: denial,
    };
  }

  context.cooldownStore.set(key, context.now.getTime() + seconds * 1000);
  return { summary: `Cooldown set for ${seconds}s.` };
};

const branchHandler: CustomCommandV2StepHandler = (step, context) => {
  if (step.type !== "branch_if") return {};
  const matched = compareValues(
    context.resolveOperand(step.condition.left),
    step.condition.operator,
    step.condition.right ? context.resolveOperand(step.condition.right) : undefined,
    step.condition.caseSensitive,
  );
  return {
    nextStepId: matched ? step.trueStepId : (step.falseStepId ?? null),
    stop: !matched && !step.falseStepId,
    summary: matched ? "Branch matched true." : "Branch matched false.",
  };
};

const logHandler: CustomCommandV2StepHandler = async (step, context) => {
  if (step.type !== "log_action") return {};
  const message = context.renderText(step.message);
  await context.adapter.log({ level: step.level, message });
  context.pushOutput({ kind: "log", summary: message, payload: { level: step.level } });
  return { summary: message };
};

const webhookHandler: CustomCommandV2StepHandler = async (step, context) => {
  if (step.type !== "call_webhook") return {};
  const payload = {
    method: step.method,
    url: step.url,
    headers: Object.fromEntries(
      Object.entries(step.headers).map(([key, value]) => [key, context.renderText(value)]),
    ),
    body: resolveJsonValue(step.body as any, context) as Record<string, CustomCommandV2JsonValue>,
    timeoutMs: step.timeoutMs,
  };
  const response = await context.adapter.callWebhook(payload);
  context.pushOutput({ kind: "webhook", summary: `Called ${step.method} ${step.url}`, payload: response });
  return { summary: `Called ${step.method} ${step.url}` };
};

const fallbackHandler: CustomCommandV2StepHandler = async (step, context) => {
  if (step.type !== "fallback_response") return {};
  const summary = context.renderText(step.content || "Fallback response sent.");
  if (step.ephemeral) {
    await context.adapter.replyEphemeral({ content: summary });
  } else {
    await context.adapter.sendMessage({ content: summary, channelTarget: "current" });
  }
  context.pushOutput({ kind: "fallback", summary, payload: { ephemeral: step.ephemeral } });
  return { summary, stop: step.stopAfter };
};

export const customCommandV2Handlers: Record<CustomCommandV2WorkflowStep["type"], CustomCommandV2StepHandler> = {
  send_message: sendMessageHandler,
  send_embed: sendEmbedHandler,
  reply_ephemeral: ephemeralHandler,
  add_button_row: buttonRowHandler,
  add_select_menu: selectMenuHandler,
  on_button_click: buttonWaitHandler,
  on_select: selectWaitHandler,
  open_modal: modalHandler,
  save_input: saveInputHandler,
  set_variable: setVariableHandler,
  add_role: addRoleHandler,
  remove_role: removeRoleHandler,
  check_permission: permissionHandler,
  check_cooldown: cooldownHandler,
  branch_if: branchHandler,
  log_action: logHandler,
  call_webhook: webhookHandler,
  fallback_response: fallbackHandler,
};

export function getDefaultNextStepId(step: CustomCommandV2WorkflowStep, result: CustomCommandV2HandlerResult) {
  if (result.nextStepId !== undefined) return result.nextStepId;

  switch (step.type) {
    case "send_message":
    case "send_embed":
    case "reply_ephemeral":
    case "add_button_row":
    case "add_select_menu":
    case "save_input":
    case "set_variable":
    case "add_role":
    case "remove_role":
    case "log_action":
    case "fallback_response":
    case "check_permission":
    case "check_cooldown":
    case "call_webhook":
    case "open_modal":
      return step.nextStepId ?? null;
    case "on_button_click":
    case "on_select":
      return step.nextStepId;
    case "branch_if":
      return null;
    default:
      return null;
  }
}
