import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type UpdateSettingsInput, type CreateCommandInput, type CreateEmbedInput, type UpdateEmbedInput } from "@shared/routes";
import { z } from "zod";

function parseWithLogging<T>(schema: z.ZodSchema<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod] ${label} validation failed:`, result.error.format());
    throw result.error;
  }
  return result.data;
}

export function useStats() {
  return useQuery({
    queryKey: [api.stats.get.path],
    queryFn: async () => {
      const res = await fetch(api.stats.get.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch stats");
      const data = await res.json();
      return parseWithLogging(api.stats.get.responses[200], data, "stats.get");
    },
  });
}

export function useServers() {
  return useQuery({
    queryKey: [api.servers.list.path],
    queryFn: async () => {
      const res = await fetch(api.servers.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch servers");
      const data = await res.json();
      return parseWithLogging(api.servers.list.responses[200], data, "servers.list");
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
      const data = await res.json();
      return parseWithLogging(api.servers.get.responses[200], data, `servers.get(${id})`);
    },
    enabled: !!id,
  });
}

export function useUpdateSettings(serverId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (updates: UpdateSettingsInput) => {
      const url = buildUrl(api.settings.update.path, { serverId });
      const res = await fetch(url, {
        method: api.settings.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.settings.update.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to update settings");
      }
      return api.settings.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.servers.get.path, serverId] });
      queryClient.invalidateQueries({ queryKey: [api.servers.list.path] });
    },
  });
}

export function useCommands(serverId: number) {
  return useQuery({
    queryKey: [api.commands.list.path, serverId],
    queryFn: async () => {
      const url = buildUrl(api.commands.list.path, { serverId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch commands");
      const data = await res.json();
      return parseWithLogging(api.commands.list.responses[200], data, `commands.list(${serverId})`);
    },
    enabled: !!serverId,
  });
}

export function useCreateCommand(serverId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<CreateCommandInput, "serverId">) => {
      const url = buildUrl(api.commands.create.path, { serverId });
      const res = await fetch(url, {
        method: api.commands.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, serverId }),
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.commands.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to create command");
      }
      return api.commands.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.commands.list.path, serverId] });
      queryClient.invalidateQueries({ queryKey: [api.servers.get.path, serverId] });
    },
  });
}

export function useDeleteCommand(serverId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.commands.delete.path, { id });
      const res = await fetch(url, {
        method: api.commands.delete.method,
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 404) throw new Error("Command not found");
        throw new Error("Failed to delete command");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.commands.list.path, serverId] });
      queryClient.invalidateQueries({ queryKey: [api.servers.get.path, serverId] });
    },
  });
}

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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateEmbedInput) => {
      const url = buildUrl(api.embeds.create.path, { serverId });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create embed");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.embeds.list.path, serverId] });
      queryClient.invalidateQueries({ queryKey: [api.servers.get.path, serverId] });
    },
  });
}

export function useUpdateEmbed(serverId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateEmbedInput }) => {
      const url = buildUrl(api.embeds.update.path, { id });
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update embed");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.embeds.list.path, serverId] });
      queryClient.invalidateQueries({ queryKey: [api.servers.get.path, serverId] });
    },
  });
}

export function useDeleteEmbed(serverId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.embeds.delete.path, { id });
      const res = await fetch(url, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete embed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.embeds.list.path, serverId] });
      queryClient.invalidateQueries({ queryKey: [api.servers.get.path, serverId] });
    },
  });
}
