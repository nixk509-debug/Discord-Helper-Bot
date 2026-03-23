import type {
  CustomCommandV2Compiled,
  CustomCommandV2Definition,
  CustomCommandV2JsonValue,
  CustomCommandV2Operand,
  CustomCommandV2WorkflowStep,
} from "@shared/custom-command-v2";

export interface CustomCommandV2RuntimeActor {
  id?: string;
  username?: string;
  tag?: string;
  roleIds: string[];
  permissions: string[];
  isOwner: boolean;
  isPremium: boolean;
}

export interface CustomCommandV2RuntimeChannel {
  id?: string;
  name?: string;
}

export interface CustomCommandV2ExecutionOutput {
  kind: string;
  summary: string;
  payload?: unknown;
}

export interface CustomCommandV2ContinuationSessionRequest {
  continuationType: "button" | "select" | "modal_submit";
  stepId: string;
  nextStepId: string;
  timeoutSeconds: number;
  onTimeoutStepId?: string;
  customId?: string;
  customIds?: string[];
  acceptedValues?: string[];
  variables: Record<string, CustomCommandV2JsonValue>;
  input: Record<string, CustomCommandV2JsonValue>;
}

export interface CustomCommandV2ExecutionTrace {
  stepId: string;
  stepType: string;
  status: "skipped" | "completed" | "failed";
  summary: string;
}

export interface CustomCommandV2ExecutionAdapter {
  sendMessage(payload: { content: string; channelTarget: string; channelId?: string; mentionUser?: boolean }): Promise<void> | void;
  sendEmbed(payload: { embed: unknown; channelTarget: string; channelId?: string }): Promise<void> | void;
  replyEphemeral(payload: { content: string; embed?: unknown }): Promise<void> | void;
  addButtonRow(payload: { buttons: unknown[]; responseMode: string }): Promise<void> | void;
  addSelectMenu(payload: { customId: string; placeholder?: string; options: unknown[]; minValues: number; maxValues: number }): Promise<void> | void;
  openModal(payload: { customId: string; title: string; fields: unknown[] }): Promise<void> | void;
  createContinuationSession(payload: CustomCommandV2ContinuationSessionRequest): Promise<void> | void;
  addRole(payload: { roleId: string; target: string }): Promise<void> | void;
  removeRole(payload: { roleId: string; target: string }): Promise<void> | void;
  callWebhook(payload: { method: string; url: string; headers: Record<string, string>; body: Record<string, CustomCommandV2JsonValue>; timeoutMs: number }): Promise<unknown>;
  log(payload: { level: "info" | "warn" | "error"; message: string }): Promise<void> | void;
}

export interface CustomCommandV2ExecutionContext {
  serverId: number;
  commandId?: number;
  commandKey: string;
  mode: "dry-run" | "live";
  definition: CustomCommandV2Definition;
  compiled: CustomCommandV2Compiled;
  actor: CustomCommandV2RuntimeActor;
  channel: CustomCommandV2RuntimeChannel;
  input: Record<string, CustomCommandV2JsonValue>;
  variables: Record<string, CustomCommandV2JsonValue>;
  outputs: CustomCommandV2ExecutionOutput[];
  trace: CustomCommandV2ExecutionTrace[];
  adapter: CustomCommandV2ExecutionAdapter;
  now: Date;
  cooldownStore: Map<string, number>;
  renderText(value: string): string;
  resolveOperand(operand: CustomCommandV2Operand): CustomCommandV2JsonValue;
  setVariable(key: string, value: CustomCommandV2JsonValue): void;
  pushOutput(output: CustomCommandV2ExecutionOutput): void;
}

export interface CustomCommandV2HandlerResult {
  nextStepId?: string | null;
  stop?: boolean;
  summary?: string;
}

export type CustomCommandV2StepHandler<TStep extends CustomCommandV2WorkflowStep = CustomCommandV2WorkflowStep> =
  (step: TStep, context: CustomCommandV2ExecutionContext) => Promise<CustomCommandV2HandlerResult> | CustomCommandV2HandlerResult;
