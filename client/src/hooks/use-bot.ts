import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { ServerWithRelations } from "@shared/routes";
import type {
  ChannelSetting,
  CommandAction,
  CommandCondition,
  CreateCustomCommandV2Request,
  CustomCommand,
  CustomCommandV2Record,
  CreateCommandRequest,
  PermissionRule,
  StudioDocumentRecord,
  StudioPublication,
} from "@shared/schema";
import type {
  CustomCommandV2Definition,
  CustomCommandV2DryRunInput,
  CustomCommandV2ImportCreateRequest,
  CustomCommandV2Issue,
  CustomCommandV2ImportPreviewResponse,
} from "@shared/custom-command-v2";
import { buildApiUrl } from "@/lib/http";

export class ApiIssuesError extends Error {
  issues: CustomCommandV2Issue[];

  constructor(message: string, issues: CustomCommandV2Issue[] = []) {
    super(message);
    this.name = "ApiIssuesError";
    this.issues = issues;
  }
}

export function isApiIssuesError(error: unknown): error is ApiIssuesError {
  return error instanceof ApiIssuesError;
}

export class ApiResponseError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiResponseError";
    this.status = status;
  }
}

export function isApiResponseError(error: unknown): error is ApiResponseError {
  return error instanceof ApiResponseError;
}

async function fetchApiJson<T>(url: string, fallbackMessage: string): Promise<T> {
  const res = await fetch(buildApiUrl(url), { credentials: "include" });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiResponseError(res.status, payload.message || fallbackMessage);
  }
  return await res.json() as T;
}

async function throwApiIssuesError(response: Response, fallbackMessage: string): Promise<never> {
  const payload = await response.json().catch(() => ({}));
  throw new ApiIssuesError(payload.message || fallbackMessage, Array.isArray(payload.issues) ? payload.issues : []);
}

export function useStats() {
  return useQuery({
    queryKey: [api.stats.get.path],
    queryFn: async () => {
      const res = await fetch(buildApiUrl(api.stats.get.path), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return await res.json();
    },
  });
}

export function useBotStatus() {
  return useQuery({
    queryKey: [api.bot.status.path],
    queryFn: async () => {
      const res = await fetch(buildApiUrl(api.bot.status.path), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch bot status");
      return await res.json();
    },
    refetchInterval: 15_000,
  });
}

export function useServers(options?: { enabled?: boolean }) {
  return useQuery<ServerWithRelations[]>({
    queryKey: [api.servers.list.path],
    queryFn: async () => {
      try {
        return await fetchApiJson<ServerWithRelations[]>(api.servers.list.path, "Failed to fetch servers");
      } catch (error) {
        if (isApiResponseError(error) && error.status === 401) return [];
        throw error;
      }
    },
    enabled: options?.enabled ?? true,
    retry: false,
  });
}

export function useServer(id: number) {
  return useQuery<ServerWithRelations | null>({
    queryKey: [api.servers.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.servers.get.path, { id });
      try {
        return await fetchApiJson(url, "Failed to fetch server");
      } catch (error) {
        if (isApiResponseError(error) && error.status === 404) return null;
        throw error;
      }
    },
    enabled: !!id,
  });
}

export interface DiscordContextChannel {
  id: string;
  name: string;
  type: string;
  typeName?: string;
  parentId: string | null;
  position?: number;
  isTextBased?: boolean;
  isVoiceBased?: boolean;
  isAnnouncement?: boolean;
  isForum?: boolean;
  isStage?: boolean;
  isCategory?: boolean;
  isThread?: boolean;
  nsfw?: boolean;
  topic?: string | null;
  slowmodeSeconds?: number;
  lockedForEveryone?: boolean;
}

export interface DiscordContextRole {
  id: string;
  name: string;
  color: number;
  position: number;
  managed?: boolean;
  mentionable?: boolean;
  hoist?: boolean;
}

export interface DiscordContextEmoji {
  id: string;
  name: string;
  animated?: boolean;
  available?: boolean;
  managed?: boolean;
}

export interface DiscordContextResponse {
  guildId: string;
  guildName: string;
  memberCount: number;
  channels: DiscordContextChannel[];
  roles: DiscordContextRole[];
  emojis: DiscordContextEmoji[];
}

export function useDiscordContext(serverId: number, options?: { enabled?: boolean }) {
  return useQuery<DiscordContextResponse>({
    queryKey: [api.servers.discordContext.path, serverId],
    queryFn: async () => {
      const url = buildUrl(api.servers.discordContext.path, { serverId });
      return await fetchApiJson<DiscordContextResponse>(url, "Failed to fetch Discord context");
    },
    enabled: !!serverId && (options?.enabled ?? true),
    staleTime: 60_000,
  });
}

export interface WorkspaceOverviewResponse {
  server: {
    id: number;
    discordId: string;
    name: string;
    iconUrl: string | null;
    memberCount: number;
    channelCount: number;
    roleCount: number;
    ownerId: string;
  };
  bot: {
    ready: boolean;
    uptimeMs: number | null;
    guildCount: number;
    gatewayPingMs: number | null;
    lastHeartbeatAt: string | null;
    startedAt: string | null;
    wsStatus: string;
  };
  metrics: {
    totalChannels: number;
    totalRoles: number;
    recentCommands: number;
    recentFailures: number;
  };
  commandUsage: Array<{ command: string; count: number }>;
  recentActivity: Array<{
    id: string;
    guildId: string;
    guildName: string;
    commandPath: string;
    actorId: string;
    actorTag: string;
    status: "success" | "failure";
    summary: string;
    durationMs: number;
    createdAt: string;
  }>;
  recentFailures: Array<{
    id: string;
    guildId: string;
    guildName: string;
    commandPath: string;
    actorId: string;
    actorTag: string;
    status: "success" | "failure";
    summary: string;
    durationMs: number;
    createdAt: string;
    code: string;
    message: string;
  }>;
}

export function useWorkspaceOverview(serverId: number, options?: { enabled?: boolean }) {
  return useQuery<WorkspaceOverviewResponse>({
    queryKey: [api.servers.workspaceOverview.path, serverId],
    queryFn: async () => {
      const url = buildUrl(api.servers.workspaceOverview.path, { serverId });
      try {
        return await fetchApiJson<WorkspaceOverviewResponse>(url, "Failed to fetch workspace overview");
      } catch (error) {
        if (isApiResponseError(error) && error.status === 404) return null as any;
        throw error;
      }
    },
    enabled: !!serverId && (options?.enabled ?? true),
    refetchInterval: 15_000,
  });
}

export interface WorkspaceLogResponse {
  activity: WorkspaceOverviewResponse["recentActivity"];
  failures: WorkspaceOverviewResponse["recentFailures"];
}

export function useCommandLogs(serverId: number, options?: { enabled?: boolean }) {
  return useQuery<WorkspaceLogResponse>({
    queryKey: [api.servers.commandLogs.path, serverId],
    queryFn: async () => {
      const url = buildUrl(api.servers.commandLogs.path, { serverId });
      try {
        return await fetchApiJson<WorkspaceLogResponse>(url, "Failed to fetch command logs");
      } catch (error) {
        if (isApiResponseError(error) && error.status === 404) return null as any;
        throw error;
      }
    },
    enabled: !!serverId && (options?.enabled ?? true),
    refetchInterval: 15_000,
  });
}

export function useChannelSettings(serverId: number, options?: { enabled?: boolean }) {
  return useQuery<ChannelSetting[]>({
    queryKey: [api.channelSettings.list.path, serverId],
    queryFn: async () => {
      const url = buildUrl(api.channelSettings.list.path, { serverId });
      return await fetchApiJson<ChannelSetting[]>(url, "Failed to fetch channel settings");
    },
    enabled: !!serverId && (options?.enabled ?? true),
  });
}

export interface ApplyChannelLiveChangesResponse {
  channelId: string;
  channelName: string;
  applied: Array<{ field: string; value: string }>;
  ignored: string[];
}

export type CommandMutationResponse = CustomCommand & {
  syncWarning?: string | null;
};

export interface CreateLiveChannelResponse {
  channelId: string;
  channelName: string;
  typeName: string;
}

export function useUpsertChannelSettings(serverId: number) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<ChannelSetting, "id" | "serverId">) => {
      const url = buildUrl(api.channelSettings.upsert.path, { serverId });
      const res = await fetch(buildApiUrl(url), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.message || "Failed to save channel settings");
      }
      return await res.json() as ChannelSetting;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [api.channelSettings.list.path, serverId] });
    },
  });
}

export function useDeleteChannelSettings(serverId: number) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.channelSettings.delete.path, { id });
      const res = await fetch(buildApiUrl(url), {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.message || "Failed to delete channel settings");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [api.channelSettings.list.path, serverId] });
    },
  });
}

export function useApplyChannelLiveChanges(serverId: number) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      channelId,
      data,
    }: {
      channelId: string;
      data: {
        name?: string;
        parentId?: string | null;
        positionMove?: "up" | "down" | "top" | "bottom";
        topic?: string | null;
        nsfw?: boolean;
        slowmode?: number;
        lockedDown?: boolean;
      };
    }) => {
      const url = buildUrl(api.channelSettings.applyLive.path, { serverId, channelId });
      const res = await fetch(buildApiUrl(url), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.message || "Failed to apply channel changes to Discord");
      }
      return await res.json() as ApplyChannelLiveChangesResponse;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [api.servers.discordContext.path, serverId] });
    },
  });
}

export function useCreateLiveChannel(serverId: number) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      kind: "category" | "text" | "voice" | "announcement" | "forum" | "stage";
      parentId?: string | null;
      topic?: string | null;
    }) => {
      const url = buildUrl(api.channelSettings.createLive.path, { serverId });
      const res = await fetch(buildApiUrl(url), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.message || "Failed to create live channel");
      }
      return await res.json() as CreateLiveChannelResponse;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [api.servers.discordContext.path, serverId] });
    },
  });
}

export function usePermissionRules(serverId: number, options?: { enabled?: boolean }) {
  return useQuery<PermissionRule[]>({
    queryKey: ["/api/servers/:serverId/permissions", serverId],
    queryFn: async () => {
      const url = `/api/servers/${serverId}/permissions`;
      return await fetchApiJson<PermissionRule[]>(url, "Failed to fetch permission rules");
    },
    enabled: !!serverId && (options?.enabled ?? true),
  });
}

export interface ArchivistCommand extends Omit<CustomCommand, "conditions" | "actions"> {
  conditions: CommandCondition[];
  actions: CommandAction[];
}

export interface ArchivistCommandV2 extends CustomCommandV2Record {}

export function useServerCommands(serverId: number, options?: { enabled?: boolean }) {
  return useQuery<ArchivistCommand[]>({
    queryKey: [api.commands.list.path, serverId],
    queryFn: async () => {
      const url = buildUrl(api.commands.list.path, { serverId });
      return await fetchApiJson<ArchivistCommand[]>(url, "Failed to fetch commands");
    },
    enabled: !!serverId && (options?.enabled ?? true),
  });
}

export function useCreateCommand(serverId: number) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCommandRequest) => {
      const url = buildUrl(api.commands.create.path, { serverId });
      const res = await fetch(buildApiUrl(url), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.message || "Failed to create command");
      }
      return await res.json() as CommandMutationResponse;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [api.commands.list.path, serverId] });
      qc.invalidateQueries({ queryKey: [api.servers.workspaceOverview.path, serverId] });
    },
  });
}

export function useUpdateCommand(serverId: number) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CreateCommandRequest> }) => {
      const url = buildUrl(api.commands.update.path, { id });
      const res = await fetch(buildApiUrl(url), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.message || "Failed to update command");
      }
      return await res.json() as CommandMutationResponse;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [api.commands.list.path, serverId] });
      qc.invalidateQueries({ queryKey: [api.servers.workspaceOverview.path, serverId] });
    },
  });
}

export function useDeleteCommand(serverId: number) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.commands.delete.path, { id });
      const res = await fetch(buildApiUrl(url), {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.message || "Failed to delete command");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [api.commands.list.path, serverId] });
      qc.invalidateQueries({ queryKey: [api.servers.workspaceOverview.path, serverId] });
    },
  });
}

export function useServerCommandsV2(serverId: number, options?: { enabled?: boolean }) {
  return useQuery<ArchivistCommandV2[]>({
    queryKey: [api.commandWorkflowsV2.list.path, serverId],
    queryFn: async () => {
      const url = buildUrl(api.commandWorkflowsV2.list.path, { serverId });
      const res = await fetch(buildApiUrl(url), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch workflow commands");
      return await res.json();
    },
    enabled: !!serverId && (options?.enabled ?? true),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useCustomCommandV2Template(serverId: number, options?: { enabled?: boolean }) {
  return useQuery<CustomCommandV2Definition>({
    queryKey: [api.commandWorkflowsV2.template.path, serverId],
    queryFn: async () => {
      const url = buildUrl(api.commandWorkflowsV2.template.path, { serverId });
      const res = await fetch(buildApiUrl(url), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch workflow template");
      return await res.json();
    },
    enabled: !!serverId && (options?.enabled ?? true),
  });
}

export function usePreviewCommandImportV2(serverId: number) {
  return useMutation({
    mutationFn: async (data: { raw: string; sourceKind?: CustomCommandV2ImportCreateRequest["sourceKind"] }) => {
      const url = buildUrl(api.commandWorkflowsV2.previewImport.path, { serverId });
      const res = await fetch(buildApiUrl(url), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        await throwApiIssuesError(res, "Failed to preview import");
      }
      return await res.json() as CustomCommandV2ImportPreviewResponse;
    },
  });
}

export function useImportCommandV2(serverId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CustomCommandV2ImportCreateRequest) => {
      const url = buildUrl(api.commandWorkflowsV2.import.path, { serverId });
      const res = await fetch(buildApiUrl(url), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        await throwApiIssuesError(res, "Failed to import workflow command");
      }
      return await res.json() as { command: ArchivistCommandV2 };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [api.commandWorkflowsV2.list.path, serverId] });
      qc.invalidateQueries({ queryKey: [api.servers.workspaceOverview.path, serverId] });
    },
  });
}

export function useCreateCommandV2(serverId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateCustomCommandV2Request) => {
      const url = buildUrl(api.commandWorkflowsV2.create.path, { serverId });
      const res = await fetch(buildApiUrl(url), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        await throwApiIssuesError(res, "Failed to create workflow command");
      }
      return await res.json() as ArchivistCommandV2;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [api.commandWorkflowsV2.list.path, serverId] });
      qc.invalidateQueries({ queryKey: [api.servers.workspaceOverview.path, serverId] });
    },
  });
}

export function useUpdateCommandV2(serverId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CreateCustomCommandV2Request> }) => {
      const url = buildUrl(api.commandWorkflowsV2.update.path, { id });
      const res = await fetch(buildApiUrl(url), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        await throwApiIssuesError(res, "Failed to update workflow command");
      }
      return await res.json() as ArchivistCommandV2;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [api.commandWorkflowsV2.list.path, serverId] });
      qc.invalidateQueries({ queryKey: [api.servers.workspaceOverview.path, serverId] });
    },
  });
}

export function useDeleteCommandV2(serverId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.commandWorkflowsV2.delete.path, { id });
      const res = await fetch(buildApiUrl(url), {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.message || "Failed to delete workflow command");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [api.commandWorkflowsV2.list.path, serverId] });
      qc.invalidateQueries({ queryKey: [api.servers.workspaceOverview.path, serverId] });
    },
  });
}

export function useDryRunCommandV2(serverId: number) {
  return useMutation({
    mutationFn: async (data: CustomCommandV2DryRunInput) => {
      const url = buildUrl(api.commandWorkflowsV2.dryRun.path, { serverId });
      const res = await fetch(buildApiUrl(url), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        await throwApiIssuesError(res, "Failed to dry-run workflow command");
      }
      return await res.json();
    },
  });
}

export function useStudioDocuments(serverId: number, options?: { enabled?: boolean }) {
  return useQuery<StudioDocumentRecord[]>({
    queryKey: [api.servers.studioDocuments.list.path, serverId],
    queryFn: async () => {
      const url = buildUrl(api.servers.studioDocuments.list.path, { serverId });
      return await fetchApiJson<StudioDocumentRecord[]>(url, "Failed to fetch Studio documents");
    },
    enabled: !!serverId && (options?.enabled ?? true),
  });
}

export function useCreateStudioDocument(serverId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const url = buildUrl(api.servers.studioDocuments.create.path, { serverId });
      const res = await fetch(buildApiUrl(url), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.message || "Failed to create Studio document");
      }
      return await res.json();
    },
    onSuccess: (created: StudioDocumentRecord) => {
      qc.setQueryData<StudioDocumentRecord[] | undefined>([api.servers.studioDocuments.list.path, serverId], (current) => {
        const next = Array.isArray(current) ? [...current] : [];
        const existingIndex = next.findIndex((entry) => entry.id === created.id);
        if (existingIndex >= 0) {
          next[existingIndex] = created;
          return next;
        }
        return [created, ...next];
      });
      qc.invalidateQueries({ queryKey: [api.servers.studioDocuments.list.path, serverId] });
    },
  });
}

export function useUpdateStudioDocument(serverId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const url = buildUrl(api.studio.documents.update.path, { id });
      const res = await fetch(buildApiUrl(url), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.message || "Failed to update Studio document");
      }
      return await res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [api.servers.studioDocuments.list.path, serverId] });
      qc.invalidateQueries({ queryKey: [api.servers.studioPublications.list.path, serverId] });
    },
  });
}

export function useDeleteStudioDocument(serverId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.studio.documents.delete.path, { id });
      const res = await fetch(buildApiUrl(url), {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.message || "Failed to delete Studio document");
      }
      return id;
    },
    onSuccess: (deletedId: number) => {
      qc.setQueryData<StudioDocumentRecord[] | undefined>([api.servers.studioDocuments.list.path, serverId], (current) =>
        Array.isArray(current) ? current.filter((entry) => entry.id !== deletedId) : current,
      );
      qc.invalidateQueries({ queryKey: [api.servers.studioDocuments.list.path, serverId] });
      qc.invalidateQueries({ queryKey: [api.servers.studioPublications.list.path, serverId] });
    },
  });
}

export function useStudioPublications(serverId: number, options?: { enabled?: boolean }) {
  return useQuery<StudioPublication[]>({
    queryKey: [api.servers.studioPublications.list.path, serverId],
    queryFn: async () => {
      const url = buildUrl(api.servers.studioPublications.list.path, { serverId });
      return await fetchApiJson<StudioPublication[]>(url, "Failed to fetch Studio publications");
    },
    enabled: !!serverId && (options?.enabled ?? true),
  });
}

export function useUploadStudioAsset(serverId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; dataUrl: string; scope?: "personal" | "server" }) => {
      const url = buildUrl(api.servers.studioUploads.create.path, { serverId });
      const res = await fetch(buildApiUrl(url), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.message || "Failed to upload Studio asset");
      }
      return await res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [api.servers.studioLibrary.list.path, serverId] });
    },
  });
}

export function usePublishStudio(serverId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const url = buildUrl(api.servers.studioPublish.publish.path, { serverId });
      const res = await fetch(buildApiUrl(url), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.message || "Failed to publish Studio document");
      }
      return await res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [api.servers.studioPublications.list.path, serverId] });
      qc.invalidateQueries({ queryKey: [api.servers.studioDocuments.list.path, serverId] });
    },
  });
}

export function useStudioPreflight(serverId: number) {
  return useMutation({
    mutationFn: async (data: any) => {
      const url = buildUrl(api.servers.studioPublish.preflight.path, { serverId });
      const res = await fetch(buildApiUrl(url), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.message || "Failed to build Studio preflight");
      }
      return await res.json();
    },
  });
}
