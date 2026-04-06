import { getServerRecord } from "../repositories/server-repository";
import { getBotClient, getBotStatus } from "./bot/runtime";
import { commandActivityStore } from "./lib/logger/activity-store";

export async function getServerWorkspaceOverview(serverId: number) {
  const server = await getServerRecord(serverId);
  if (!server) return null;

  const client = getBotClient();
  const guild = server.discordId ? client?.guilds.cache.get(server.discordId) : null;
  const channels = guild ? guild.channels.cache.filter((channel) => !channel.isThread()) : null;
  const roles = guild ? guild.roles.cache.filter((role) => role.id !== guild.id) : null;
  const activity = commandActivityStore.getSummary(server.discordId);

  const commandUsage = activity.recentActivity.reduce<Record<string, number>>((acc, entry) => {
    const root = entry.commandPath.split(" ")[0] || entry.commandPath;
    acc[root] = (acc[root] || 0) + 1;
    return acc;
  }, {});

  return {
    server: {
      id: server.id,
      discordId: server.discordId,
      name: server.name,
      iconUrl: server.iconUrl,
      memberCount: guild?.memberCount ?? server.memberCount ?? 0,
      channelCount: channels?.size ?? 0,
      roleCount: roles?.size ?? 0,
      ownerId: server.ownerId,
    },
    bot: getBotStatus(),
    metrics: {
      totalChannels: channels?.size ?? 0,
      totalRoles: roles?.size ?? 0,
      recentCommands: activity.totalExecutions,
      recentFailures: activity.failureCount,
    },
    commandUsage: Object.entries(commandUsage).map(([command, count]) => ({ command, count })),
    recentActivity: activity.recentActivity,
    recentFailures: activity.recentFailures,
  };
}

export async function getServerCommandLogs(serverId: number, limit = 25) {
  const server = await getServerRecord(serverId);
  if (!server) return null;

  return {
    activity: commandActivityStore.listRecentActivity(server.discordId, limit),
    failures: commandActivityStore.listRecentFailures(server.discordId, limit),
  };
}
