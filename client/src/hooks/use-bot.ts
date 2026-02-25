import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

export function useStats() {
  return useQuery({
    queryKey: [api.stats.get.path],
    queryFn: async () => {
      const res = await fetch(api.stats.get.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return await res.json();
    },
  });
}

export function useServers() {
  return useQuery({
    queryKey: [api.servers.list.path],
    queryFn: async () => {
      const res = await fetch(api.servers.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch servers");
      return await res.json();
    },
  });
}

export function useServer(id: number) {
  return useQuery({
    queryKey: [api.servers.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.servers.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch server");
      return await res.json();
    },
    enabled: !!id,
  });
}

export function useUpdateSettings(serverId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: any) => {
      const url = buildUrl(api.settings.update.path, { serverId });
      const res = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates), credentials: "include" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Failed"); }
      return await res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [api.servers.get.path, serverId] });
      qc.invalidateQueries({ queryKey: [api.servers.list.path] });
    },
  });
}

// --- COMMANDS ---
export function useCommands(serverId: number) {
  return useQuery({
    queryKey: [api.commands.list.path, serverId],
    queryFn: async () => {
      const url = buildUrl(api.commands.list.path, { serverId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch commands");
      return await res.json();
    },
    enabled: !!serverId,
  });
}

export function useCreateCommand(serverId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const url = buildUrl(api.commands.create.path, { serverId });
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data), credentials: "include" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Failed"); }
      return await res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [api.commands.list.path, serverId] });
      qc.invalidateQueries({ queryKey: [api.servers.get.path, serverId] });
    },
  });
}

export function useUpdateCommand(serverId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const url = buildUrl(api.commands.update.path, { id });
      const res = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data), credentials: "include" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Failed"); }
      return await res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [api.commands.list.path, serverId] });
      qc.invalidateQueries({ queryKey: [api.servers.get.path, serverId] });
    },
  });
}

export function useDeleteCommand(serverId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.commands.delete.path, { id });
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete command");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [api.commands.list.path, serverId] });
      qc.invalidateQueries({ queryKey: [api.servers.get.path, serverId] });
    },
  });
}

// --- EMBEDS ---
export function useEmbeds(serverId: number) {
  return useQuery({
    queryKey: [api.embeds.list.path, serverId],
    queryFn: async () => {
      const url = buildUrl(api.embeds.list.path, { serverId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch embeds");
      return await res.json();
    },
    enabled: !!serverId,
  });
}

export function useCreateEmbed(serverId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const url = buildUrl(api.embeds.create.path, { serverId });
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data), credentials: "include" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Failed"); }
      return await res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [api.embeds.list.path, serverId] });
      qc.invalidateQueries({ queryKey: [api.servers.get.path, serverId] });
    },
  });
}

export function useUpdateEmbed(serverId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const url = buildUrl(api.embeds.update.path, { id });
      const res = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data), credentials: "include" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Failed"); }
      return await res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [api.embeds.list.path, serverId] });
      qc.invalidateQueries({ queryKey: [api.servers.get.path, serverId] });
    },
  });
}

export function useDeleteEmbed(serverId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.embeds.delete.path, { id });
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete embed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [api.embeds.list.path, serverId] });
      qc.invalidateQueries({ queryKey: [api.servers.get.path, serverId] });
    },
  });
}

// --- CHANNEL SETTINGS ---
export function useChannelSettings(serverId: number) {
  return useQuery({
    queryKey: [api.channelSettings.list.path, serverId],
    queryFn: async () => {
      const url = buildUrl(api.channelSettings.list.path, { serverId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed"); return await res.json();
    },
    enabled: !!serverId,
  });
}

export function useUpsertChannelSettings(serverId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const url = buildUrl(api.channelSettings.upsert.path, { serverId });
      const res = await fetch(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data), credentials: "include" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Failed"); }
      return await res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [api.channelSettings.list.path, serverId] });
      qc.invalidateQueries({ queryKey: [api.servers.get.path, serverId] });
    },
  });
}

export function useDeleteChannelSettings(serverId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.channelSettings.delete.path, { id });
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [api.channelSettings.list.path, serverId] });
      qc.invalidateQueries({ queryKey: [api.servers.get.path, serverId] });
    },
  });
}

// --- REACTION ROLES ---
export function useReactionRoles(serverId: number) {
  return useQuery({
    queryKey: [api.reactionRoles.list.path, serverId],
    queryFn: async () => {
      const url = buildUrl(api.reactionRoles.list.path, { serverId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed"); return await res.json();
    },
    enabled: !!serverId,
  });
}

export function useCreateReactionRole(serverId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const url = buildUrl(api.reactionRoles.create.path, { serverId });
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data), credentials: "include" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Failed"); }
      return await res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [api.reactionRoles.list.path, serverId] });
      qc.invalidateQueries({ queryKey: [api.servers.get.path, serverId] });
    },
  });
}

export function useDeleteReactionRole(serverId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.reactionRoles.delete.path, { id });
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [api.reactionRoles.list.path, serverId] });
      qc.invalidateQueries({ queryKey: [api.servers.get.path, serverId] });
    },
  });
}

// --- AUTO ROLES ---
export function useAutoRoles(serverId: number) {
  return useQuery({
    queryKey: [api.autoRoles.list.path, serverId],
    queryFn: async () => {
      const url = buildUrl(api.autoRoles.list.path, { serverId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed"); return await res.json();
    },
    enabled: !!serverId,
  });
}

export function useCreateAutoRole(serverId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const url = buildUrl(api.autoRoles.create.path, { serverId });
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data), credentials: "include" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Failed"); }
      return await res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [api.autoRoles.list.path, serverId] });
      qc.invalidateQueries({ queryKey: [api.servers.get.path, serverId] });
    },
  });
}

export function useDeleteAutoRole(serverId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.autoRoles.delete.path, { id });
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [api.autoRoles.list.path, serverId] });
      qc.invalidateQueries({ queryKey: [api.servers.get.path, serverId] });
    },
  });
}

// --- WARNINGS ---
export function useWarnings(serverId: number) {
  return useQuery({
    queryKey: [api.warnings.list.path, serverId],
    queryFn: async () => {
      const url = buildUrl(api.warnings.list.path, { serverId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed"); return await res.json();
    },
    enabled: !!serverId,
  });
}

export function useCreateWarning(serverId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const url = buildUrl(api.warnings.create.path, { serverId });
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data), credentials: "include" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Failed"); }
      return await res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [api.warnings.list.path, serverId] });
      qc.invalidateQueries({ queryKey: [api.servers.get.path, serverId] });
    },
  });
}

export function useDeleteWarning(serverId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.warnings.delete.path, { id });
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [api.warnings.list.path, serverId] });
      qc.invalidateQueries({ queryKey: [api.servers.get.path, serverId] });
    },
  });
}

export function useClearWarnings(serverId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const url = buildUrl(api.warnings.clear.path, { serverId, userId });
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [api.warnings.list.path, serverId] });
    },
  });
}

// --- PUNISHMENT CONFIG ---
export function usePunishments(serverId: number) {
  return useQuery({
    queryKey: [api.punishments.list.path, serverId],
    queryFn: async () => {
      const url = buildUrl(api.punishments.list.path, { serverId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed"); return await res.json();
    },
    enabled: !!serverId,
  });
}

export function useUpsertPunishment(serverId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const url = buildUrl(api.punishments.upsert.path, { serverId });
      const res = await fetch(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data), credentials: "include" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Failed"); }
      return await res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [api.punishments.list.path, serverId] }); },
  });
}

export function useDeletePunishment(serverId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.punishments.delete.path, { id });
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [api.punishments.list.path, serverId] }); },
  });
}

// --- LEVELING ---
export function useLeveling(serverId: number) {
  return useQuery({
    queryKey: [api.leveling.get.path, serverId],
    queryFn: async () => {
      const url = buildUrl(api.leveling.get.path, { serverId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed"); return await res.json();
    },
    enabled: !!serverId,
  });
}

export function useUpsertLeveling(serverId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const url = buildUrl(api.leveling.upsert.path, { serverId });
      const res = await fetch(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data), credentials: "include" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Failed"); }
      return await res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [api.leveling.get.path, serverId] });
      qc.invalidateQueries({ queryKey: [api.servers.get.path, serverId] });
    },
  });
}

// --- STARBOARD ---
export function useStarboard(serverId: number) {
  return useQuery({
    queryKey: [api.starboard.get.path, serverId],
    queryFn: async () => {
      const url = buildUrl(api.starboard.get.path, { serverId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed"); return await res.json();
    },
    enabled: !!serverId,
  });
}

export function useUpsertStarboard(serverId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const url = buildUrl(api.starboard.upsert.path, { serverId });
      const res = await fetch(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data), credentials: "include" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Failed"); }
      return await res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [api.starboard.get.path, serverId] });
      qc.invalidateQueries({ queryKey: [api.servers.get.path, serverId] });
    },
  });
}

// --- TICKETS ---
export function useTicketConfig(serverId: number) {
  return useQuery({
    queryKey: [api.tickets.getConfig.path, serverId],
    queryFn: async () => {
      const url = buildUrl(api.tickets.getConfig.path, { serverId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed"); return await res.json();
    },
    enabled: !!serverId,
  });
}

export function useUpsertTicketConfig(serverId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const url = buildUrl(api.tickets.upsertConfig.path, { serverId });
      const res = await fetch(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data), credentials: "include" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Failed"); }
      return await res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [api.tickets.getConfig.path, serverId] });
      qc.invalidateQueries({ queryKey: [api.servers.get.path, serverId] });
    },
  });
}

export function useTicketPanels(serverId: number) {
  return useQuery({
    queryKey: [api.tickets.listPanels.path, serverId],
    queryFn: async () => {
      const url = buildUrl(api.tickets.listPanels.path, { serverId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed"); return await res.json();
    },
    enabled: !!serverId,
  });
}

export function useCreateTicketPanel(serverId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const url = buildUrl(api.tickets.createPanel.path, { serverId });
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data), credentials: "include" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Failed"); }
      return await res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [api.tickets.listPanels.path, serverId] }); },
  });
}

export function useDeleteTicketPanel(serverId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.tickets.deletePanel.path, { id });
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [api.tickets.listPanels.path, serverId] }); },
  });
}

// --- SCHEDULED MESSAGES ---
export function useScheduledMessages(serverId: number) {
  return useQuery({
    queryKey: [api.scheduledMessages.list.path, serverId],
    queryFn: async () => {
      const url = buildUrl(api.scheduledMessages.list.path, { serverId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed"); return await res.json();
    },
    enabled: !!serverId,
  });
}

export function useCreateScheduledMessage(serverId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const url = buildUrl(api.scheduledMessages.create.path, { serverId });
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data), credentials: "include" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Failed"); }
      return await res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [api.scheduledMessages.list.path, serverId] }); },
  });
}

export function useUpdateScheduledMessage(serverId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const url = buildUrl(api.scheduledMessages.update.path, { id });
      const res = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data), credentials: "include" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Failed"); }
      return await res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [api.scheduledMessages.list.path, serverId] }); },
  });
}

export function useDeleteScheduledMessage(serverId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.scheduledMessages.delete.path, { id });
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [api.scheduledMessages.list.path, serverId] }); },
  });
}

// --- AUDIT LOG ---
export function useAuditLogConfig(serverId: number) {
  return useQuery({
    queryKey: [api.auditLog.get.path, serverId],
    queryFn: async () => {
      const url = buildUrl(api.auditLog.get.path, { serverId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed"); return await res.json();
    },
    enabled: !!serverId,
  });
}

export function useUpsertAuditLogConfig(serverId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const url = buildUrl(api.auditLog.upsert.path, { serverId });
      const res = await fetch(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data), credentials: "include" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Failed"); }
      return await res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [api.auditLog.get.path, serverId] });
      qc.invalidateQueries({ queryKey: [api.servers.get.path, serverId] });
    },
  });
}
