import type {
  CustomCommandV2Compiled,
  CustomCommandV2Definition,
  CustomCommandV2DryRunInput,
  CustomCommandV2JsonValue,
  CustomCommandV2Operand,
  CustomCommandV2WorkflowStep,
} from "@shared/custom-command-v2";
import { summarizeCustomCommandV2 } from "@shared/custom-command-v2";
import { getDefaultNextStepId, customCommandV2Handlers } from "./handlers/index";
import type {
  CustomCommandV2ExecutionAdapter,
  CustomCommandV2ExecutionContext,
  CustomCommandV2ExecutionOutput,
  CustomCommandV2ExecutionTrace,
  CustomCommandV2RuntimeActor,
  CustomCommandV2RuntimeChannel,
} from "./types";

const commandBehaviorCooldownStore = new Map<string, number>();
const commandStepCooldownStore = new Map<string, number>();

function resolveContextValue(actor: CustomCommandV2RuntimeActor, channel: CustomCommandV2RuntimeChannel, input: Record<string, CustomCommandV2JsonValue>, key: string) {
  switch (key) {
    case "actor.id":
      return actor.id ?? null;
    case "actor.username":
      return actor.username ?? null;
    case "actor.tag":
      return actor.tag ?? null;
    case "actor.isOwner":
      return actor.isOwner;
    case "actor.isPremium":
      return actor.isPremium;
    case "channel.id":
      return channel.id ?? null;
    case "channel.name":
      return channel.name ?? null;
    default:
      if (key.startsWith("input.")) {
        return input[key.replace(/^input\./, "")] ?? null;
      }
      return null;
  }
}

function renderTemplate(value: string, variables: Record<string, CustomCommandV2JsonValue>, actor: CustomCommandV2RuntimeActor, channel: CustomCommandV2RuntimeChannel, input: Record<string, CustomCommandV2JsonValue>) {
  return value.replace(/\{([^}]+)\}/g, (_, token: string) => {
    const trimmed = token.trim();
    if (trimmed === "user") return actor.id ? `<@${actor.id}>` : actor.username || "user";
    if (trimmed === "channel") return channel.id ? `<#${channel.id}>` : channel.name || "channel";
    if (trimmed in variables) return String(variables[trimmed] ?? "");
    const contextValue = resolveContextValue(actor, channel, input, trimmed);
    return contextValue == null ? "" : String(contextValue);
  });
}

function resolveOperand(
  operand: CustomCommandV2Operand,
  variables: Record<string, CustomCommandV2JsonValue>,
  actor: CustomCommandV2RuntimeActor,
  channel: CustomCommandV2RuntimeChannel,
  input: Record<string, CustomCommandV2JsonValue>,
): CustomCommandV2JsonValue {
  switch (operand.source) {
    case "literal":
      return operand.value;
    case "variable":
      return variables[operand.key] ?? null;
    case "context":
      return resolveContextValue(actor, channel, input, operand.key);
    default:
      return null;
  }
}

function createDryRunExecutionAdapter(outputs: CustomCommandV2ExecutionOutput[]): CustomCommandV2ExecutionAdapter {
  return {
    sendMessage(payload) {
      outputs.push({ kind: "message", summary: payload.content || "Would send a message.", payload });
    },
    sendEmbed(payload) {
      const embed = payload.embed as Record<string, unknown> | undefined;
      outputs.push({ kind: "embed", summary: String(embed?.title || embed?.description || "Would send an embed."), payload });
    },
    replyEphemeral(payload) {
      outputs.push({ kind: "ephemeral", summary: payload.content || "Would send an ephemeral reply.", payload });
    },
    addButtonRow(payload) {
      outputs.push({ kind: "buttons", summary: `Would add ${payload.buttons.length} button${payload.buttons.length === 1 ? "" : "s"}.`, payload });
    },
    addSelectMenu(payload) {
      outputs.push({ kind: "select", summary: `Would add select menu ${payload.customId}.`, payload });
    },
    openModal(payload) {
      outputs.push({ kind: "modal", summary: `Would open modal ${payload.customId}.`, payload });
    },
    createContinuationSession(payload) {
      outputs.push({
        kind: "continuation",
        summary: `Would wait for ${payload.continuationType.replace(/_/g, " ")} input.`,
        payload,
      });
    },
    addRole(payload) {
      outputs.push({ kind: "role", summary: `Would add role ${payload.roleId}.`, payload });
    },
    removeRole(payload) {
      outputs.push({ kind: "role", summary: `Would remove role ${payload.roleId}.`, payload });
    },
    async callWebhook(payload) {
      outputs.push({ kind: "webhook", summary: `Would call ${payload.method} ${payload.url}.`, payload });
      return { dryRun: true, status: 0 };
    },
    log(payload) {
      outputs.push({ kind: "log", summary: payload.message, payload });
    },
  };
}

function buildBehaviorCooldownKey(
  commandKey: string,
  serverId: number,
  actor: CustomCommandV2RuntimeActor,
  channel: CustomCommandV2RuntimeChannel,
  scope: "user" | "channel" | "server" | "global",
) {
  switch (scope) {
    case "channel":
      return `behavior:${commandKey}:${serverId}:channel:${channel.id || "unknown"}`;
    case "server":
      return `behavior:${commandKey}:${serverId}`;
    case "global":
      return `behavior:${commandKey}:global`;
    case "user":
    default:
      return `behavior:${commandKey}:${serverId}:user:${actor.id || "anonymous"}`;
  }
}

function evaluateAccess(context: {
  compiled: CustomCommandV2Compiled;
  actor: CustomCommandV2RuntimeActor;
  channel: CustomCommandV2RuntimeChannel;
}) {
  const { compiled, actor, channel } = context;
  const roleSet = new Set(actor.roleIds);
  const permissionSet = new Set(actor.permissions.map((value) => value.toLowerCase()));

  if (!compiled.behavior.enabled) {
    return { ok: false, summary: compiled.fallbacks.emptyStateMessage || "This command is disabled." };
  }
  if (compiled.access.ownerOnly && !actor.isOwner) {
    return { ok: false, summary: compiled.fallbacks.permissionDeniedMessage || "This command is limited to the server owner." };
  }
  if (compiled.access.premiumOnly && !actor.isPremium) {
    return { ok: false, summary: compiled.fallbacks.permissionDeniedMessage || "This command requires premium access." };
  }
  if (compiled.access.blockedRoleIds.some((roleId) => roleSet.has(roleId))) {
    return { ok: false, summary: compiled.fallbacks.permissionDeniedMessage || "One of your roles is blocked from this command." };
  }
  if (compiled.access.blockedChannelIds.includes(channel.id || "")) {
    return { ok: false, summary: compiled.fallbacks.permissionDeniedMessage || "This channel is blocked for this command." };
  }

  const requiredPermissions = compiled.access.requiredPermissions.map((value) => value.toLowerCase());
  if (requiredPermissions.length > 0 && !requiredPermissions.every((value) => permissionSet.has(value))) {
    return { ok: false, summary: compiled.fallbacks.permissionDeniedMessage || "You are missing required permissions." };
  }

  if (compiled.access.mode === "restricted") {
    const hasAllowRules = compiled.access.allowedRoleIds.length > 0
      || compiled.access.allowedChannelIds.length > 0
      || compiled.access.requiredPermissions.length > 0
      || compiled.access.ownerOnly;
    const allowedByRole = compiled.access.allowedRoleIds.length > 0 && compiled.access.allowedRoleIds.some((roleId) => roleSet.has(roleId));
    const allowedByChannel = compiled.access.allowedChannelIds.length > 0 && compiled.access.allowedChannelIds.includes(channel.id || "");
    const allowedByExplicitRule = compiled.access.allowedRoleIds.length === 0 && compiled.access.allowedChannelIds.length === 0
      ? true
      : allowedByRole || allowedByChannel;
    if (!hasAllowRules || !allowedByExplicitRule) {
      return { ok: false, summary: compiled.fallbacks.permissionDeniedMessage || "This command is restricted." };
    }
  }

  return { ok: true, summary: "Access granted." };
}

function applyBehaviorCooldown(
  commandKey: string,
  serverId: number,
  compiled: CustomCommandV2Compiled,
  actor: CustomCommandV2RuntimeActor,
  channel: CustomCommandV2RuntimeChannel,
  now: Date,
) {
  if (compiled.behavior.cooldownSeconds <= 0) {
    return { ok: true, summary: "" };
  }

  const key = buildBehaviorCooldownKey(commandKey, serverId, actor, channel, compiled.behavior.cooldownScope);
  const expiresAt = commandBehaviorCooldownStore.get(key) ?? 0;
  if (expiresAt > now.getTime()) {
    return { ok: false, summary: compiled.fallbacks.cooldownMessage || "This command is cooling down." };
  }

  commandBehaviorCooldownStore.set(key, now.getTime() + compiled.behavior.cooldownSeconds * 1000);
  return { ok: true, summary: "" };
}

export async function executeCustomCommandV2(input: {
  serverId: number;
  commandId?: number;
  commandKey?: string;
  definition: CustomCommandV2Definition;
  compiled: CustomCommandV2Compiled;
  actor?: Partial<CustomCommandV2RuntimeActor>;
  channel?: Partial<CustomCommandV2RuntimeChannel>;
  runtimeInput?: Record<string, CustomCommandV2JsonValue>;
  entryStepId?: string;
  initialVariables?: Record<string, CustomCommandV2JsonValue>;
  skipBehaviorCooldown?: boolean;
  mode?: "dry-run" | "live";
  adapter?: CustomCommandV2ExecutionAdapter;
}) {
  const outputs: CustomCommandV2ExecutionOutput[] = [];
  const trace: CustomCommandV2ExecutionTrace[] = [];
  const commandKey = input.commandKey || `command:${input.definition.meta.name.toLowerCase()}`;
  const actor: CustomCommandV2RuntimeActor = {
    roleIds: [],
    permissions: [],
    isOwner: false,
    isPremium: false,
    ...input.actor,
  };
  const channel: CustomCommandV2RuntimeChannel = {
    ...input.channel,
  };
  const runtimeInput = input.runtimeInput ?? {};
  const initialVariables = {
    ...Object.fromEntries(
      input.definition.variables.map((variable) => [variable.key, variable.initialValue ?? null]),
    ),
    ...(input.initialVariables ?? {}),
  };

  const adapter = input.adapter ?? createDryRunExecutionAdapter(outputs);
  const now = new Date();

  const context: CustomCommandV2ExecutionContext = {
    serverId: input.serverId,
    commandId: input.commandId,
    commandKey,
    mode: input.mode ?? "dry-run",
    definition: input.definition,
    compiled: input.compiled,
    actor,
    channel,
    input: runtimeInput,
    variables: initialVariables,
    outputs,
    trace,
    adapter,
    now,
    cooldownStore: commandStepCooldownStore,
    renderText(value) {
      return renderTemplate(value, this.variables, this.actor, this.channel, this.input);
    },
    resolveOperand(operand) {
      return resolveOperand(operand, this.variables, this.actor, this.channel, this.input);
    },
    setVariable(key, value) {
      this.variables[key] = value;
    },
    pushOutput(output) {
      this.outputs.push(output);
    },
  };

  const access = evaluateAccess({ compiled: input.compiled, actor, channel });
  if (!access.ok) {
    outputs.push({ kind: "guard", summary: access.summary });
    return {
      ok: false,
      preview: summarizeCustomCommandV2(input.definition),
      compiled: input.compiled,
      outputs,
      trace,
      variables: context.variables,
    };
  }

  if (!input.skipBehaviorCooldown) {
    const cooldown = applyBehaviorCooldown(commandKey, input.serverId, input.compiled, actor, channel, now);
    if (!cooldown.ok) {
      outputs.push({ kind: "cooldown", summary: cooldown.summary });
      return {
        ok: false,
        preview: summarizeCustomCommandV2(input.definition),
        compiled: input.compiled,
        outputs,
        trace,
        variables: context.variables,
      };
    }
  }

  let currentStepId: string | null = input.entryStepId ?? input.compiled.workflow.entryStepId;
  const visited = new Set<string>();
  let safetyCounter = 0;

  while (currentStepId && safetyCounter < 100) {
    safetyCounter += 1;
    const step: CustomCommandV2WorkflowStep | undefined = input.compiled.workflow.stepsById[currentStepId];
    if (!step) {
      trace.push({
        stepId: currentStepId,
        stepType: "missing",
        status: "failed",
        summary: `Step "${currentStepId}" was missing from the compiled workflow.`,
      });
      break;
    }

    if (visited.has(currentStepId) && safetyCounter > input.compiled.workflow.stepOrder.length + 10) {
      trace.push({
        stepId: step.id,
        stepType: step.type,
        status: "failed",
        summary: "Loop protection stopped the workflow.",
      });
      break;
    }

    visited.add(currentStepId);

    try {
      const handler = customCommandV2Handlers[step.type];
      const result = await handler(step, context);
      trace.push({
        stepId: step.id,
        stepType: step.type,
        status: "completed",
        summary: result.summary || `${step.type} completed.`,
      });

      if (result.stop) break;
      currentStepId = getDefaultNextStepId(step, result);
    } catch (error) {
      trace.push({
        stepId: step.id,
        stepType: step.type,
        status: "failed",
        summary: error instanceof Error ? error.message : "Step failed.",
      });

      const fallbackMessage = input.compiled.fallbacks.runtimeErrorMessage || "The workflow failed.";
      outputs.push({ kind: "error", summary: fallbackMessage });

      if ("onFailureStepId" in step && step.onFailureStepId) {
        currentStepId = step.onFailureStepId;
        continue;
      }
      break;
    }
  }

  if (safetyCounter >= 100) {
    trace.push({
      stepId: "runtime",
      stepType: "guard",
      status: "failed",
      summary: "Step limit reached before the workflow could finish.",
    });
  }

  return {
    ok: trace.every((entry) => entry.status !== "failed"),
    preview: summarizeCustomCommandV2(input.definition),
    compiled: input.compiled,
    outputs,
    trace,
    variables: context.variables,
  };
}

export async function dryRunCustomCommandV2(input: CustomCommandV2DryRunInput & { serverId: number; compiled: CustomCommandV2Compiled }) {
  return executeCustomCommandV2({
    serverId: input.serverId,
    definition: input.definition,
    compiled: input.compiled,
    actor: input.actor,
    channel: input.channel,
    runtimeInput: input.input,
    mode: "dry-run",
  });
}
