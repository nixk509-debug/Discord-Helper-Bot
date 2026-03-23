import crypto from "crypto";

export type CommandExecutionStatus = "success" | "failure";

export interface CommandActivityRecord {
  id: string;
  guildId: string;
  guildName: string;
  commandPath: string;
  actorId: string;
  actorTag: string;
  status: CommandExecutionStatus;
  summary: string;
  durationMs: number;
  createdAt: string;
}

export interface CommandFailureRecord extends CommandActivityRecord {
  code: string;
  message: string;
}

const MAX_ACTIVITY = 150;
const MAX_FAILURES = 75;

class CommandActivityStore {
  private activity: CommandActivityRecord[] = [];
  private failures: CommandFailureRecord[] = [];

  recordSuccess(input: Omit<CommandActivityRecord, "id" | "status" | "createdAt">) {
    const entry: CommandActivityRecord = {
      id: crypto.randomUUID(),
      status: "success",
      createdAt: new Date().toISOString(),
      ...input,
    };
    this.activity.unshift(entry);
    this.activity = this.activity.slice(0, MAX_ACTIVITY);
    return entry;
  }

  recordFailure(input: Omit<CommandFailureRecord, "id" | "status" | "createdAt">) {
    const entry: CommandFailureRecord = {
      id: crypto.randomUUID(),
      status: "failure",
      createdAt: new Date().toISOString(),
      ...input,
    };
    this.activity.unshift(entry);
    this.failures.unshift(entry);
    this.activity = this.activity.slice(0, MAX_ACTIVITY);
    this.failures = this.failures.slice(0, MAX_FAILURES);
    return entry;
  }

  listRecentActivity(guildId?: string, limit = 12) {
    return this.activity.filter((entry) => !guildId || entry.guildId === guildId).slice(0, limit);
  }

  listRecentFailures(guildId?: string, limit = 8) {
    return this.failures.filter((entry) => !guildId || entry.guildId === guildId).slice(0, limit);
  }

  getSummary(guildId?: string) {
    const activity = this.listRecentActivity(guildId, 50);
    const failures = this.listRecentFailures(guildId, 50);
    return {
      totalExecutions: activity.length,
      successCount: activity.filter((entry) => entry.status === "success").length,
      failureCount: failures.length,
      recentActivity: this.listRecentActivity(guildId, 8),
      recentFailures: this.listRecentFailures(guildId, 6),
    };
  }
}

export const commandActivityStore = new CommandActivityStore();
