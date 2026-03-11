import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowUpRight,
  Bot,
  Clock3,
  Eye,
  Hash,
  Mail,
  MessageSquareText,
  Plus,
  Rocket,
  ShieldAlert,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StudioPreview } from "@/components/design-studio/studio-preview";
import { createStudioPrimaryDocument, inferStudioPrimarySurfaceType } from "@/components/design-studio/studio-defaults";
import {
  useAutoRoles,
  useCreateAutoRole,
  useCreateStudioDocument,
  useDeleteAutoRole,
  useDiscordContext,
  usePublishStudio,
  useStudioDocuments,
  useStudioPublications,
  useTestStudio,
  useUpdateSettings,
} from "@/hooks/use-bot";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type {
  AutoRole,
  ServerSettings,
  StudioDiagnostic,
  StudioDocument,
  StudioDocumentRecord,
} from "@shared/schema";
import { collectStudioDiagnostics } from "@shared/studio-document";
import { buildStudioPreviewTokenContext, resolveStudioTokensInValue } from "@shared/studio-tokens";

interface WelcomeTabProps {
  serverId: number;
  settings?: ServerSettings;
}

type WelcomeSectionTab = "join" | "dm" | "leave" | "roles";
type WelcomeSurfaceKey = "join" | "dm" | "leave";

const TOKEN_HELP = [
  "{username}",
  "{mention}",
  "{server}",
  "{random:Welcome|Glad you're here|Good to have you}",
];

function parseDate(value: unknown) {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

function formatRelativeEditTime(value: unknown) {
  const date = parseDate(value);
  if (!date) return "Edited recently";

  const diffMs = date.getTime() - Date.now();
  const absMinutes = Math.round(Math.abs(diffMs) / 60000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (absMinutes < 60) return `Edited ${formatter.format(Math.round(diffMs / 60000), "minute")}`;
  const absHours = Math.round(absMinutes / 60);
  if (absHours < 24) return `Edited ${formatter.format(Math.round(diffMs / 3600000), "hour")}`;
  const absDays = Math.round(absHours / 24);
  if (absDays < 7) return `Edited ${formatter.format(Math.round(diffMs / 86400000), "day")}`;
  return `Edited ${date.toLocaleDateString([], { month: "short", day: "numeric" })}`;
}

function getByPath(input: unknown, path?: string) {
  if (!path) return undefined;
  const segments = path.replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
  let current: any = input;
  for (const segment of segments) {
    if (current == null) return undefined;
    current = current[segment];
  }
  return current;
}

function humanizeDiagnostic(diag: StudioDiagnostic, document: StudioDocument) {
  const value = getByPath(document, diag.path);
  const length = typeof value === "string" ? value.length : Array.isArray(value) ? value.length : null;

  switch (diag.code) {
    case "MESSAGE_CONTENT_LIMIT":
      return `Message content is ${length ?? "over"} characters. Discord max is 2000.`;
    case "EMBED_TITLE_LIMIT":
      return `Embed title is ${length ?? "over"} characters. Discord max is 256.`;
    case "EMBED_DESCRIPTION_LIMIT":
      return `Embed description is ${length ?? "over"} characters. Discord max is 4096.`;
    case "EMBED_FIELD_NAME_LIMIT":
      return `Embed field name is ${length ?? "over"} characters. Discord max is 256.`;
    case "EMBED_FIELD_VALUE_LIMIT":
      return `Embed field value is ${length ?? "over"} characters. Discord max is 1024.`;
    case "EMBED_TOTAL_LIMIT":
      return "Combined embed text is too long. Discord max is 6000 characters across one embed.";
    case "BUTTON_LABEL_LIMIT":
      return `Button label is ${length ?? "over"} characters. Discord max is 80.`;
    case "BUTTON_CUSTOM_ID_LIMIT":
      return `Button custom ID is ${length ?? "over"} characters. Discord max is 100.`;
    case "SELECT_PLACEHOLDER_LIMIT":
      return `Select placeholder is ${length ?? "over"} characters. Discord max is 150.`;
    case "SELECT_OPTIONS_LIMIT":
      return `Select menu has ${length ?? "too many"} options. Discord max is 25.`;
    case "SELECT_OPTION_LABEL_LIMIT":
      return `A select option label is ${length ?? "over"} characters. Discord max is 100.`;
    case "SELECT_OPTION_DESCRIPTION_LIMIT":
      return `A select option description is ${length ?? "over"} characters. Discord max is 100.`;
    case "MODAL_TITLE_LIMIT":
      return `Modal title is ${length ?? "over"} characters. Discord max is 45.`;
    case "MODAL_FIELDS_LIMIT":
      return `Modal has ${length ?? "too many"} fields. Discord max is 5.`;
    case "MODAL_FIELD_LABEL_LIMIT":
      return `Modal field label is ${length ?? "over"} characters. Discord max is 45.`;
    case "MODAL_FIELD_PLACEHOLDER_LIMIT":
      return `Modal field placeholder is ${length ?? "over"} characters. Discord max is 100.`;
    case "TOKEN_MEMBER_CONTEXT_ONLY":
      return "This token only resolves during member-triggered sends. Static publish leaves it as raw text.";
    case "TOKEN_POST_SEND_ONLY":
      return "This token only resolves after the message exists, so first publish leaves it as raw text.";
    case "TOKEN_UNKNOWN":
      return diag.message.replace("supported Studio token", "recognized Welcome or Studio token");
    default:
      return diag.message;
  }
}

function summarizeDocument(document: StudioDocument) {
  const entryView = document.views[document.meta.entryViewId];
  const parts = [
    String(entryView?.messageContent || "").trim(),
    String(entryView?.embeds?.[0]?.title || "").trim(),
    String(entryView?.embeds?.[0]?.description || "").trim(),
  ].filter(Boolean);

  if (parts.length > 0) return parts.join(" ").slice(0, 140);

  const rootNodeCount = entryView?.rootNodeIds?.length || 0;
  if (rootNodeCount > 0) {
    return `${rootNodeCount} interactive block${rootNodeCount === 1 ? "" : "s"} ready in the primary screen.`;
  }

  return "No content added yet.";
}

function WelcomeTokenHelper() {
  return (
    <Card className="border-white/10 bg-[linear-gradient(180deg,rgba(12,14,18,0.96),rgba(8,9,11,0.98))] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <CardHeader className="space-y-2 pb-3">
        <CardTitle className="flex items-center gap-2 text-sm text-white">
          <Sparkles className="h-4 w-4 text-primary" />
          Token Help
        </CardTitle>
        <CardDescription>
          Use simple inline tokens inside Studio. Random text is supported too, and previews sample the first option.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {TOKEN_HELP.map((token) => (
            <Badge key={token} variant="outline" className="border-white/10 bg-white/[0.03] text-xs text-white/90">
              {token}
            </Badge>
          ))}
        </div>
        <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
          <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
            <p className="font-medium text-white/90">Static-friendly</p>
            <p>{"{server}, {channel}, {date}, and {time} resolve in preview and publish when channel context exists."}</p>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
            <p className="font-medium text-white/90">Member-aware</p>
            <p>{"{username} and {mention} resolve in test sends and real join/leave events, not plain static publish."}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function WelcomeValidationCard({
  title,
  diagnostics,
  document,
}: {
  title: string;
  diagnostics: StudioDiagnostic[];
  document: StudioDocument;
}) {
  if (diagnostics.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
        <div className="flex items-center gap-2 font-medium">
          <Sparkles className="h-4 w-4" />
          {title} is publish-safe right now.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-400/15 bg-amber-400/10 px-4 py-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-amber-50">
        <ShieldAlert className="h-4 w-4" />
        Validation Summary
      </div>
      <div className="space-y-2">
        {diagnostics.slice(0, 4).map((diag, index) => (
          <div
            key={`${diag.code}-${index}`}
            className={cn(
              "rounded-xl border px-3 py-2 text-xs",
              diag.level === "error"
                ? "border-red-400/20 bg-red-500/10 text-red-100"
                : "border-white/10 bg-white/[0.04] text-white/80",
            )}
          >
            {humanizeDiagnostic(diag, document)}
          </div>
        ))}
      </div>
    </div>
  );
}

function SurfaceCard({
  title,
  description,
  documentRecord,
  publication,
  diagnostics,
  summary,
  enabled,
  channelLabel,
  onEdit,
  onPreview,
  onTest,
  onPublish,
  publishLabel = "Publish",
  publishing = false,
  testing = false,
}: {
  title: string;
  description: string;
  documentRecord: StudioDocumentRecord | null;
  publication: any | null;
  diagnostics: StudioDiagnostic[];
  summary: string;
  enabled: boolean;
  channelLabel?: string | null;
  onEdit: () => void;
  onPreview: () => void;
  onTest: () => void;
  onPublish: () => void;
  publishLabel?: string;
  publishing?: boolean;
  testing?: boolean;
}) {
  const document = documentRecord?.document || null;
  const primaryType = document ? inferStudioPrimarySurfaceType(document) : null;
  const hasWarnings = diagnostics.some((diag) => diag.level !== "info");
  const hasTokens = document ? /\{(?:random:[^{}]+|[a-zA-Z0-9._]+)\}/.test(JSON.stringify(document)) : false;
  const published = Boolean(publication?.active) && publication?.status !== "failed";

  return (
    <Card className="overflow-hidden border-white/10 bg-[linear-gradient(180deg,rgba(11,13,16,0.98),rgba(7,8,10,0.98))] shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
      <CardHeader className="border-b border-white/8 bg-[linear-gradient(180deg,rgba(177,18,38,0.16),rgba(177,18,38,0.02))]">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-base text-white">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "border-white/10 px-2.5 py-1",
              enabled ? "bg-emerald-400/10 text-emerald-100" : "bg-white/[0.04] text-white/70",
            )}
          >
            {enabled ? "Enabled" : "Off"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
          <div className="mb-3 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {documentRecord?.name || "No Studio draft bound yet"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {documentRecord ? formatRelativeEditTime(documentRecord.updatedAt) : "Create a Studio draft and edit it full-screen."}
              </p>
            </div>
            {channelLabel ? (
              <Badge variant="outline" className="border-white/10 bg-white/[0.04] text-white/80">
                <Hash className="mr-1 h-3 w-3" />
                {channelLabel}
              </Badge>
            ) : null}
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            <Badge variant={published ? "default" : "outline"}>{published ? "Published" : "Draft"}</Badge>
            {hasWarnings ? <Badge variant="secondary">Warnings</Badge> : null}
            {primaryType === "embed" ? <Badge variant="outline">Embed</Badge> : null}
            {primaryType === "components" ? <Badge variant="outline">Interactive</Badge> : null}
            {primaryType === "message" ? <Badge variant="outline">Message</Badge> : null}
            {hasTokens ? <Badge variant="outline">Tokens</Badge> : null}
          </div>

          <div className="rounded-xl border border-white/8 bg-[#101317] px-3 py-3 text-sm text-white/82">
            {summary}
          </div>
        </div>

        {document ? <WelcomeValidationCard title={title} diagnostics={diagnostics} document={document} /> : null}

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Button onClick={onEdit} className="gap-2">
            <ArrowUpRight className="h-4 w-4" />
            {documentRecord ? "Edit in Studio" : "Create in Studio"}
          </Button>
          <Button variant="outline" onClick={onPreview} disabled={!documentRecord} className="gap-2">
            <Eye className="h-4 w-4" />
            Preview
          </Button>
          <Button variant="outline" onClick={onTest} disabled={!documentRecord || testing} className="gap-2">
            <Bot className="h-4 w-4" />
            {testing ? "Sending..." : "Send Test"}
          </Button>
          <Button variant="outline" onClick={onPublish} disabled={!documentRecord || publishing} className="gap-2">
            <Rocket className="h-4 w-4" />
            {publishing ? "Publishing..." : publishLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function WelcomeTab({ serverId, settings }: WelcomeTabProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<WelcomeSectionTab>("join");
  const [previewSurface, setPreviewSurface] = useState<WelcomeSurfaceKey | null>(null);

  const updateSettings = useUpdateSettings(serverId);
  const createStudioDocument = useCreateStudioDocument(serverId);
  const publishStudio = usePublishStudio(serverId);
  const testStudio = useTestStudio(serverId);
  const { data: studioDocuments = [] } = useStudioDocuments(serverId);
  const { data: studioPublications = [] } = useStudioPublications(serverId);
  const { data: autoRoles = [], isLoading: autoRolesLoading } = useAutoRoles(serverId);
  const createAutoRole = useCreateAutoRole(serverId);
  const deleteAutoRole = useDeleteAutoRole(serverId);
  const { data: discordContext, isLoading: discordContextLoading } = useDiscordContext(serverId);

  const [welcomeEnabled, setWelcomeEnabled] = useState(settings?.welcomeEnabled ?? false);
  const [welcomeChannelId, setWelcomeChannelId] = useState(settings?.welcomeChannelId ?? "");
  const [welcomeDmEnabled, setWelcomeDmEnabled] = useState(settings?.welcomeDmEnabled ?? false);
  const [leaveEnabled, setLeaveEnabled] = useState(settings?.leaveEnabled ?? false);
  const [leaveChannelId, setLeaveChannelId] = useState(settings?.leaveChannelId ?? "");
  const [welcomeStudioDocumentId, setWelcomeStudioDocumentId] = useState<number | null>(settings?.welcomeStudioDocumentId ?? null);
  const [welcomeDmStudioDocumentId, setWelcomeDmStudioDocumentId] = useState<number | null>(settings?.welcomeDmStudioDocumentId ?? null);
  const [leaveStudioDocumentId, setLeaveStudioDocumentId] = useState<number | null>(settings?.leaveStudioDocumentId ?? null);

  const [addRoleOpen, setAddRoleOpen] = useState(false);
  const [newRoleId, setNewRoleId] = useState("");
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDelay, setNewRoleDelay] = useState(0);
  const [newRoleType, setNewRoleType] = useState("join");

  useEffect(() => {
    setWelcomeEnabled(settings?.welcomeEnabled ?? false);
    setWelcomeChannelId(settings?.welcomeChannelId ?? "");
    setWelcomeDmEnabled(settings?.welcomeDmEnabled ?? false);
    setLeaveEnabled(settings?.leaveEnabled ?? false);
    setLeaveChannelId(settings?.leaveChannelId ?? "");
    setWelcomeStudioDocumentId(settings?.welcomeStudioDocumentId ?? null);
    setWelcomeDmStudioDocumentId(settings?.welcomeDmStudioDocumentId ?? null);
    setLeaveStudioDocumentId(settings?.leaveStudioDocumentId ?? null);
  }, [settings]);

  const documents = studioDocuments as StudioDocumentRecord[];
  const publications = studioPublications as any[];
  const documentById = useMemo(() => new Map(documents.map((entry) => [entry.id, entry])), [documents]);
  const publicationByDocumentId = useMemo(
    () => new Map(publications.map((entry) => [entry.documentId, entry])),
    [publications],
  );

  const channelOptions = useMemo(
    () =>
      (discordContext?.channels || [])
        .filter((channel: any) => channel.isTextBased !== false && !channel.isThread && !channel.isCategory)
        .map((channel: any) => ({ id: channel.id, name: channel.name })),
    [discordContext],
  );
  const roleOptions = useMemo(
    () => (discordContext?.roles || []).map((role: any) => ({ id: role.id, name: role.name, managed: role.managed })),
    [discordContext],
  );
  const roleNameById = useMemo(() => Object.fromEntries(roleOptions.map((role) => [role.id, role.name])), [roleOptions]);

  const saveSettings = async (patch: Record<string, unknown>) => {
    await updateSettings.mutateAsync(patch);
  };

  const openStudio = (documentId: number) => {
    navigate(`/dashboard/servers/${serverId}/studio?intent=welcome&documentId=${documentId}`);
  };

  const getChannelName = (channelId?: string | null) =>
    channelOptions.find((channel) => channel.id === channelId)?.name || (channelId ? channelId : null);

  const getSurfaceRecord = (surface: WelcomeSurfaceKey) => {
    if (surface === "join") return welcomeStudioDocumentId ? documentById.get(welcomeStudioDocumentId) || null : null;
    if (surface === "dm") return welcomeDmStudioDocumentId ? documentById.get(welcomeDmStudioDocumentId) || null : null;
    return leaveStudioDocumentId ? documentById.get(leaveStudioDocumentId) || null : null;
  };

  const getSurfacePublication = (surface: WelcomeSurfaceKey) => {
    const record = getSurfaceRecord(surface);
    return record ? publicationByDocumentId.get(record.id) || null : null;
  };

  const buildPreviewContext = (surface: WelcomeSurfaceKey) => {
    const channelId = surface === "leave" ? leaveChannelId || welcomeChannelId : welcomeChannelId;
    const channelName = getChannelName(channelId) || (surface === "dm" ? "Direct Message" : "welcome");
    return buildStudioPreviewTokenContext({
      serverName: discordContext?.guildName || "Archivist HQ",
      memberCount: discordContext?.memberCount || "1,248",
      channelId: surface === "dm" ? null : channelId || null,
      channelName,
      channelMention: surface === "dm" ? "Direct Message" : channelName ? `#${channelName}` : "#welcome",
    });
  };

  const getSurfaceDiagnostics = (surface: WelcomeSurfaceKey) => {
    const record = getSurfaceRecord(surface);
    if (!record) return [];
    return collectStudioDiagnostics(record.document, record.document.meta.entryViewId, {
      tokenAvailability: {
        static: true,
        member: true,
        postSend: false,
      },
    });
  };

  const createSurfaceDocument = async (surface: WelcomeSurfaceKey) => {
    const nameBySurface: Record<WelcomeSurfaceKey, string> = {
      join: "Welcome Message",
      dm: "Welcome DM Message",
      leave: "Leave Message",
    };
    const fieldBySurface: Record<WelcomeSurfaceKey, "welcomeStudioDocumentId" | "welcomeDmStudioDocumentId" | "leaveStudioDocumentId"> = {
      join: "welcomeStudioDocumentId",
      dm: "welcomeDmStudioDocumentId",
      leave: "leaveStudioDocumentId",
    };
    const bindingBySurface = {
      join: "welcome",
      dm: "welcome_dm",
      leave: "leave",
    } as const;

    const document = createStudioPrimaryDocument("embed", nameBySurface[surface]);
    document.meta.category = bindingBySurface[surface];
    const created = await createStudioDocument.mutateAsync({
      scope: "server",
      kind: "surface",
      name: nameBySurface[surface],
      moduleBinding: bindingBySurface[surface],
      document,
    });

    await saveSettings({ [fieldBySurface[surface]]: created.id });

    if (surface === "join") setWelcomeStudioDocumentId(created.id);
    if (surface === "dm") setWelcomeDmStudioDocumentId(created.id);
    if (surface === "leave") setLeaveStudioDocumentId(created.id);

    return created as StudioDocumentRecord;
  };

  const ensureSurfaceDocument = async (surface: WelcomeSurfaceKey) => {
    const existing = getSurfaceRecord(surface);
    if (existing) return existing;
    return await createSurfaceDocument(surface);
  };

  const openSurfaceInStudio = async (surface: WelcomeSurfaceKey) => {
    try {
      const record = await ensureSurfaceDocument(surface);
      openStudio(record.id);
    } catch (error: any) {
      toast({ title: "Could not open Studio", description: error.message || "Try again in a moment.", variant: "destructive" });
    }
  };

  const humanizeActionError = (error: any, diagnostics: StudioDiagnostic[], document?: StudioDocument | null) => {
    const errorDiagnostic = diagnostics.find((diag) => diag.level === "error");
    if (errorDiagnostic && document) return humanizeDiagnostic(errorDiagnostic, document);
    const message = String(error?.message || "Something went wrong.");
    if (/invalid string length/i.test(message)) {
      return "Discord rejected one of the text fields for being too long. Check the validation summary and shorten the highlighted content.";
    }
    return message;
  };

  const handlePreview = async (surface: WelcomeSurfaceKey) => {
    try {
      await ensureSurfaceDocument(surface);
      setPreviewSurface(surface);
    } catch (error: any) {
      toast({ title: "Preview unavailable", description: error.message || "Try again in a moment.", variant: "destructive" });
    }
  };

  const handleTest = async (surface: WelcomeSurfaceKey) => {
    try {
      const record = await ensureSurfaceDocument(surface);
      const target =
        surface === "dm"
          ? { kind: "dm" as const, viewId: "entry" }
          : { kind: "channel" as const, channelId: surface === "leave" ? leaveChannelId || welcomeChannelId : welcomeChannelId, viewId: "entry" };

      if (target.kind === "channel" && !target.channelId) {
        toast({
          title: "Choose a channel first",
          description: surface === "leave" ? "Set a leave channel or reuse the join channel before sending a test." : "Pick the join channel before sending a test.",
          variant: "destructive",
        });
        return;
      }

      const response = await testStudio.mutateAsync({
        documentId: record.id,
        target,
      });
      const warningCount = (response?.diagnostics || []).filter((entry: StudioDiagnostic) => entry.level !== "info").length;
      toast({
        title: "Test sent",
        description: warningCount > 0 ? `Sent with ${warningCount} warning${warningCount === 1 ? "" : "s"}.` : "A test message was sent successfully.",
      });
    } catch (error: any) {
      const record = getSurfaceRecord(surface);
      toast({
        title: "Test failed",
        description: humanizeActionError(error, getSurfaceDiagnostics(surface), record?.document),
        variant: "destructive",
      });
    }
  };

  const handlePublish = async (surface: WelcomeSurfaceKey) => {
    try {
      const record = await ensureSurfaceDocument(surface);
      if (surface === "dm") {
        await saveSettings({
          welcomeDmEnabled,
          welcomeDmStudioDocumentId: record.id,
        });
        toast({
          title: "DM surface ready",
          description: "This DM message is now bound to Welcome. It sends whenever Welcome DM is enabled.",
        });
        return;
      }

      const channelId = surface === "leave" ? leaveChannelId || welcomeChannelId : welcomeChannelId;
      if (!channelId) {
        toast({
          title: "Choose a channel first",
          description: surface === "leave" ? "Set a leave channel or reuse the join channel before publishing." : "Pick a join channel before publishing.",
          variant: "destructive",
        });
        return;
      }

      const response = await publishStudio.mutateAsync({
        documentId: record.id,
        target: {
          channelId,
          viewId: "entry",
        },
      });
      const warningCount = (response?.diagnostics || []).filter((entry: StudioDiagnostic) => entry.level !== "info").length;
      toast({
        title: "Published",
        description: warningCount > 0 ? `Published with ${warningCount} warning${warningCount === 1 ? "" : "s"}.` : "Welcome surface published successfully.",
      });
    } catch (error: any) {
      const record = getSurfaceRecord(surface);
      toast({
        title: "Publish failed",
        description: humanizeActionError(error, getSurfaceDiagnostics(surface), record?.document),
        variant: "destructive",
      });
    }
  };

  const handleAddAutoRole = () => {
    if (!newRoleId.trim() || !newRoleName.trim()) return;
    createAutoRole.mutate(
      {
        roleId: newRoleId.trim(),
        roleName: newRoleName.trim(),
        delay: newRoleDelay,
        type: newRoleType,
      },
      {
        onSuccess: () => {
          toast({ title: "Role rule added", description: `${newRoleName} will be assigned automatically.` });
          setNewRoleId("");
          setNewRoleName("");
          setNewRoleDelay(0);
          setNewRoleType("join");
          setAddRoleOpen(false);
        },
        onError: (error: any) => {
          toast({ title: "Could not add role", description: error.message || "Try again in a moment.", variant: "destructive" });
        },
      },
    );
  };

  const welcomeRecord = getSurfaceRecord("join");
  const welcomeDmRecord = getSurfaceRecord("dm");
  const leaveRecord = getSurfaceRecord("leave");
  const welcomeSummary = welcomeRecord ? summarizeDocument(resolveStudioTokensInValue(welcomeRecord.document, buildPreviewContext("join"))) : "Create the main welcome post that new members will see in your chosen channel.";
  const welcomeDmSummary = welcomeDmRecord ? summarizeDocument(resolveStudioTokensInValue(welcomeDmRecord.document, buildPreviewContext("dm"))) : "Create the optional direct message for onboarding and follow-up instructions.";
  const leaveSummary = leaveRecord ? summarizeDocument(resolveStudioTokensInValue(leaveRecord.document, buildPreviewContext("leave"))) : "Create the message members see when someone leaves your server.";

  const previewRecord = previewSurface ? getSurfaceRecord(previewSurface) : null;
  const previewDocument = previewSurface && previewRecord
    ? resolveStudioTokensInValue(previewRecord.document, buildPreviewContext(previewSurface))
    : null;
  const previewDiagnostics = previewSurface && previewRecord
    ? getSurfaceDiagnostics(previewSurface).map((diag) => ({
        ...diag,
        message: humanizeDiagnostic(diag, previewRecord.document),
      }))
    : [];

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[#07080a] shadow-[0_30px_120px_rgba(0,0,0,0.45)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,55,90,0.14),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(177,18,38,0.22),transparent_42%)]" />
        <div className="absolute inset-x-0 top-0 h-32 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),transparent)]" />

        <div className="relative space-y-5 p-4 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <Badge className="border-none bg-primary/18 text-primary-foreground">Studio-powered Welcome</Badge>
              <div>
                <h2 className="font-display text-2xl font-bold text-white">Welcome</h2>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  Route join, DM, and leave surfaces through Studio instead of editing cramped inline forms. The module controls bindings, validation, testing, and publish state.
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/80">
              <p className="font-medium text-white">Beginner-safe setup</p>
              <p className="mt-1 text-xs text-muted-foreground">Pick a destination, open the bound Studio draft, then preview, test, and publish from here.</p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as WelcomeSectionTab)} className="space-y-4">
            <TabsList className="grid h-auto w-full grid-cols-4 rounded-[22px] border border-white/10 bg-white/[0.03] p-1">
              <TabsTrigger value="join" className="rounded-[18px] py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white">Join</TabsTrigger>
              <TabsTrigger value="dm" className="rounded-[18px] py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white">DM</TabsTrigger>
              <TabsTrigger value="leave" className="rounded-[18px] py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white">Leave</TabsTrigger>
              <TabsTrigger value="roles" className="rounded-[18px] py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white">Roles</TabsTrigger>
            </TabsList>

            <TabsContent value="join" className="space-y-4">
              <Card className="border-white/10 bg-[linear-gradient(180deg,rgba(13,15,18,0.96),rgba(8,9,12,0.98))]">
                <CardHeader>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/12 text-emerald-200">
                        <UserPlus className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-white">Join Flow</CardTitle>
                        <CardDescription>Main welcome message and channel delivery.</CardDescription>
                      </div>
                    </div>
                    <Switch checked={welcomeEnabled} onCheckedChange={setWelcomeEnabled} />
                  </div>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <p className="mb-2 text-sm font-medium text-white">Welcome channel</p>
                    <Select value={welcomeChannelId || "__none__"} onValueChange={(value) => setWelcomeChannelId(value === "__none__" ? "" : value)}>
                      <SelectTrigger className="border-white/10 bg-[#0d1014]">
                        <SelectValue placeholder={discordContextLoading ? "Loading channels..." : "Select a channel"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Not set</SelectItem>
                        {channelOptions.map((channel) => (
                          <SelectItem key={channel.id} value={channel.id}># {channel.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="mt-2 text-xs text-muted-foreground">This is where the join message will publish and where channel-aware tokens resolve.</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
                      <Clock3 className="h-4 w-4 text-primary" />
                      Send delay
                    </div>
                    <p className="text-sm text-white/80">Instant send is currently the supported path.</p>
                    <p className="mt-2 text-xs text-muted-foreground">If delayed welcome sends are added later, this slot is where they should live.</p>
                  </div>
                </CardContent>
              </Card>

              <SurfaceCard
                title="Welcome Message"
                description="The main public welcome message for new members."
                documentRecord={welcomeRecord}
                publication={getSurfacePublication("join")}
                diagnostics={getSurfaceDiagnostics("join")}
                summary={welcomeSummary}
                enabled={welcomeEnabled}
                channelLabel={getChannelName(welcomeChannelId)}
                onEdit={() => openSurfaceInStudio("join")}
                onPreview={() => handlePreview("join")}
                onTest={() => handleTest("join")}
                onPublish={() => handlePublish("join")}
                publishing={publishStudio.isPending}
                testing={testStudio.isPending}
              />

              <WelcomeTokenHelper />
            </TabsContent>

            <TabsContent value="dm" className="space-y-4">
              <Card className="border-white/10 bg-[linear-gradient(180deg,rgba(13,15,18,0.96),rgba(8,9,12,0.98))]">
                <CardHeader>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500/12 text-sky-200">
                        <Mail className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-white">Welcome DM</CardTitle>
                        <CardDescription>Optional onboarding message delivered in direct messages.</CardDescription>
                      </div>
                    </div>
                    <Switch checked={welcomeDmEnabled} onCheckedChange={setWelcomeDmEnabled} />
                  </div>
                </CardHeader>
              </Card>

              <SurfaceCard
                title="Welcome DM"
                description="A separate Studio draft for private onboarding or next-step instructions."
                documentRecord={welcomeDmRecord}
                publication={getSurfacePublication("dm")}
                diagnostics={getSurfaceDiagnostics("dm")}
                summary={welcomeDmSummary}
                enabled={welcomeDmEnabled}
                channelLabel="Direct Message"
                onEdit={() => openSurfaceInStudio("dm")}
                onPreview={() => handlePreview("dm")}
                onTest={() => handleTest("dm")}
                onPublish={() => handlePublish("dm")}
                publishLabel="Bind Live"
                publishing={updateSettings.isPending}
                testing={testStudio.isPending}
              />

              <WelcomeTokenHelper />
            </TabsContent>

            <TabsContent value="leave" className="space-y-4">
              <Card className="border-white/10 bg-[linear-gradient(180deg,rgba(13,15,18,0.96),rgba(8,9,12,0.98))]">
                <CardHeader>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500/12 text-rose-200">
                        <MessageSquareText className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-white">Leave Notices</CardTitle>
                        <CardDescription>Separate offboarding notices from your main join flow.</CardDescription>
                      </div>
                    </div>
                    <Switch checked={leaveEnabled} onCheckedChange={setLeaveEnabled} />
                  </div>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <p className="mb-2 text-sm font-medium text-white">Leave channel</p>
                    <Select value={leaveChannelId || "__inherit__"} onValueChange={(value) => setLeaveChannelId(value === "__inherit__" ? "" : value)}>
                      <SelectTrigger className="border-white/10 bg-[#0d1014]">
                        <SelectValue placeholder={discordContextLoading ? "Loading channels..." : "Select a channel"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__inherit__">Reuse join channel</SelectItem>
                        {channelOptions.map((channel) => (
                          <SelectItem key={channel.id} value={channel.id}># {channel.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="mt-2 text-xs text-muted-foreground">Leave blank to reuse the join channel for faster setup.</p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <p className="mb-2 text-sm font-medium text-white">Delivery note</p>
                    <p className="text-sm text-white/80">Leave is intentionally kept separate so the main Join experience stays clean.</p>
                  </div>
                </CardContent>
              </Card>

              <SurfaceCard
                title="Leave Message"
                description="A dedicated Studio draft for departures, archive notes, or offboarding reminders."
                documentRecord={leaveRecord}
                publication={getSurfacePublication("leave")}
                diagnostics={getSurfaceDiagnostics("leave")}
                summary={leaveSummary}
                enabled={leaveEnabled}
                channelLabel={getChannelName(leaveChannelId || welcomeChannelId)}
                onEdit={() => openSurfaceInStudio("leave")}
                onPreview={() => handlePreview("leave")}
                onTest={() => handleTest("leave")}
                onPublish={() => handlePublish("leave")}
                publishing={publishStudio.isPending}
                testing={testStudio.isPending}
              />

              <WelcomeTokenHelper />
            </TabsContent>

            <TabsContent value="roles" className="space-y-4">
              <Card className="border-white/10 bg-[linear-gradient(180deg,rgba(13,15,18,0.96),rgba(8,9,12,0.98))]">
                <CardHeader>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/12 text-violet-200">
                        <Users className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-white">Auto Roles</CardTitle>
                        <CardDescription>Keep role assignment practical and separate from the message builder.</CardDescription>
                      </div>
                    </div>
                    <Dialog open={addRoleOpen} onOpenChange={setAddRoleOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="gap-2">
                          <Plus className="h-4 w-4" />
                          Add Role
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="border-white/10 bg-[#090b0e] text-white">
                        <DialogHeader>
                          <DialogTitle>Add Auto Role</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-white">Role</label>
                            <Select value={newRoleId || "__none__"} onValueChange={(value) => {
                              const nextValue = value === "__none__" ? "" : value;
                              setNewRoleId(nextValue);
                              setNewRoleName(roleNameById[nextValue] || "");
                            }}>
                              <SelectTrigger className="border-white/10 bg-[#0f1318]">
                                <SelectValue placeholder={discordContextLoading ? "Loading roles..." : "Select a role"} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">Select role</SelectItem>
                                {roleOptions.map((role) => (
                                  <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input value={newRoleId} onChange={(event) => setNewRoleId(event.target.value)} placeholder="Role ID fallback" className="border-white/10 bg-[#0f1318]" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-white">Role name</label>
                            <Input value={newRoleName} onChange={(event) => setNewRoleName(event.target.value)} placeholder="Member" className="border-white/10 bg-[#0f1318]" />
                          </div>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-white">Delay (seconds)</label>
                              <Input type="number" min={0} value={newRoleDelay} onChange={(event) => setNewRoleDelay(parseInt(event.target.value, 10) || 0)} className="border-white/10 bg-[#0f1318]" />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-white">Assign to</label>
                              <Select value={newRoleType} onValueChange={setNewRoleType}>
                                <SelectTrigger className="border-white/10 bg-[#0f1318]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="join">All joins</SelectItem>
                                  <SelectItem value="human">Humans only</SelectItem>
                                  <SelectItem value="bot">Bots only</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setAddRoleOpen(false)}>Cancel</Button>
                          <Button onClick={handleAddAutoRole} disabled={!newRoleId.trim() || !newRoleName.trim() || createAutoRole.isPending}>
                            {createAutoRole.isPending ? "Adding..." : "Add Role"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm text-muted-foreground">
                    Auto roles are active whenever at least one rule exists. Delay and target filters stay here instead of cluttering the Join builder.
                  </div>

                  {autoRolesLoading ? (
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-10 text-center text-sm text-muted-foreground">
                      Loading role rules...
                    </div>
                  ) : (autoRoles as AutoRole[]).length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-12 text-center">
                      <Users className="mx-auto mb-3 h-10 w-10 text-white/25" />
                      <p className="text-sm text-white/80">No auto roles configured yet.</p>
                      <p className="mt-1 text-xs text-muted-foreground">Add a rule to assign roles automatically after join.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(autoRoles as AutoRole[]).map((role) => {
                        const linkedRole = roleOptions.find((entry) => entry.id === role.roleId);
                        return (
                          <div key={role.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-semibold text-white">{role.roleName}</p>
                                  <Badge variant="outline" className="border-white/10 bg-white/[0.04] text-white/75">
                                    {role.type === "join" ? "All joins" : role.type === "human" ? "Humans only" : "Bots only"}
                                  </Badge>
                                  {role.delay > 0 ? (
                                    <Badge variant="outline" className="border-white/10 bg-white/[0.04] text-white/75">
                                      {role.delay}s delay
                                    </Badge>
                                  ) : null}
                                </div>
                                <p className="text-xs text-muted-foreground">Role ID: {role.roleId}</p>
                                {linkedRole?.managed ? (
                                  <div className="rounded-xl border border-amber-400/15 bg-amber-400/10 px-3 py-2 text-xs text-amber-50">
                                    This role is managed by another integration and may not be assignable.
                                  </div>
                                ) : null}
                              </div>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => deleteAutoRole.mutate(role.id, {
                                  onSuccess: () => toast({ title: "Role rule removed" }),
                                  onError: (error: any) => toast({ title: "Could not remove role", description: error.message || "Try again in a moment.", variant: "destructive" }),
                                })}
                              >
                                <Trash2 className="h-4 w-4 text-red-300" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog open={Boolean(previewSurface && previewDocument)} onOpenChange={(open) => setPreviewSurface(open ? previewSurface : null)}>
        <DialogContent className="max-w-[720px] border-white/10 bg-[#08090c] text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              Preview {previewSurface === "join" ? "Welcome Message" : previewSurface === "dm" ? "Welcome DM" : "Leave Message"}
            </DialogTitle>
          </DialogHeader>
          {previewDocument ? (
            <StudioPreview
              document={previewDocument}
              viewId={previewDocument.meta.entryViewId}
              interactionRows={[]}
              diagnostics={previewDiagnostics}
              mode="mobile"
            />
          ) : (
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-10 text-center text-sm text-muted-foreground">
              No Studio draft bound yet.
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewSurface(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
