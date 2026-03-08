import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUpdateSettings, useAutoRoles, useCreateAutoRole, useDeleteAutoRole, useEmbeds, useDiscordContext, useCreateStudioDocument, usePublishStudio, useStudioPublications } from "@/hooks/use-bot";
import { EmbedComposer, type EmbedData } from "@/components/embed-builder/embed-composer";
import { useToast } from "@/hooks/use-toast";
import {
  UserPlus,
  LogOut,
  Save,
  Eye,
  Plus,
  Trash2,
  Clock,
  Bot,
  Users,
  User,
  Hash,
  MessageSquare,
  Mail,
  Info,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import type { ServerSettings, AutoRole } from "@shared/schema";
import { useLocation } from "wouter";
import { StudioSurfaceCard } from "@/components/design-studio/studio-surface-card";
import { createStudioDocument as createStudioDocumentDraft } from "@/components/design-studio/studio-defaults";

interface WelcomeTabProps {
  serverId: number;
  settings?: ServerSettings;
}

const VARIABLES = [
  { key: "{user}", desc: "Username" },
  { key: "{user.name}", desc: "Display name" },
  { key: "{user.id}", desc: "User ID" },
  { key: "{user.mention}", desc: "Mention" },
  { key: "{user.avatar}", desc: "Avatar URL" },
  { key: "{server}", desc: "Server name" },
  { key: "{server.name}", desc: "Server name" },
  { key: "{server.id}", desc: "Server ID" },
  { key: "{server.membercount}", desc: "Member count" },
  { key: "{channel}", desc: "Channel name" },
  { key: "{channel.mention}", desc: "Channel mention" },
  { key: "{date}", desc: "Current date" },
  { key: "{time}", desc: "Current time" },
];

function replaceVariables(text: string): string {
  return text
    .replace(/\{user\}/g, "CoolUser")
    .replace(/\{user\.name\}/g, "CoolUser")
    .replace(/\{user\.id\}/g, "123456789012345678")
    .replace(/\{user\.mention\}/g, "@CoolUser")
    .replace(/\{user\.avatar\}/g, "https://cdn.discordapp.com/embed/avatars/0.png")
    .replace(/\{server\}/g, "My Awesome Server")
    .replace(/\{server\.name\}/g, "My Awesome Server")
    .replace(/\{server\.id\}/g, "987654321098765432")
    .replace(/\{server\.membercount\}/g, "1,234")
    .replace(/\{channel\}/g, "welcome")
    .replace(/\{channel\.mention\}/g, "#welcome")
    .replace(/\{date\}/g, new Date().toLocaleDateString())
    .replace(/\{time\}/g, new Date().toLocaleTimeString());
}

export function WelcomeTab({ serverId, settings }: WelcomeTabProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const updateSettings = useUpdateSettings(serverId);
  const createStudioDocument = useCreateStudioDocument(serverId);
  const publishStudio = usePublishStudio(serverId);
  const { data: studioPublications = [] } = useStudioPublications(serverId);
  const { data: autoRoles = [], isLoading: autoRolesLoading } = useAutoRoles(serverId);
  const createAutoRole = useCreateAutoRole(serverId);
  const deleteAutoRole = useDeleteAutoRole(serverId);
  const { data: embeds = [] } = useEmbeds(serverId);
  const { data: discordContext, isLoading: discordContextLoading } = useDiscordContext(serverId);
  const channelOptions = (discordContext?.channels || []).map((channel: any) => ({ id: channel.id, name: channel.name }));
  const roleOptions = (discordContext?.roles || []).map((role: any) => ({ id: role.id, name: role.name }));
  const roleNameById = Object.fromEntries(roleOptions.map((role) => [role.id, role.name]));
  const welcomePublication = (studioPublications as any[]).find((entry) => entry.documentId === settings?.welcomeStudioDocumentId) || null;
  const welcomeDmPublication = (studioPublications as any[]).find((entry) => entry.documentId === settings?.welcomeDmStudioDocumentId) || null;
  const leavePublication = (studioPublications as any[]).find((entry) => entry.documentId === settings?.leaveStudioDocumentId) || null;

  const [welcomeEnabled, setWelcomeEnabled] = useState(settings?.welcomeEnabled ?? false);
  const [welcomeChannelId, setWelcomeChannelId] = useState(settings?.welcomeChannelId ?? "");
  const [welcomeMessage, setWelcomeMessage] = useState(settings?.welcomeMessage ?? "Welcome {user.mention} to **{server}**! You are member #{server.membercount}.");
  const [welcomeEmbedId, setWelcomeEmbedId] = useState<number | null>(settings?.welcomeEmbedId ?? null);
  const [welcomeEmbedData, setWelcomeEmbedData] = useState<EmbedData | undefined>(undefined);
  const [welcomeDmEnabled, setWelcomeDmEnabled] = useState(settings?.welcomeDmEnabled ?? false);
  const [welcomeDmMessage, setWelcomeDmMessage] = useState(settings?.welcomeDmMessage ?? "Welcome to {server}! Please read the rules.");

  const [leaveEnabled, setLeaveEnabled] = useState(settings?.leaveEnabled ?? false);
  const [leaveChannelId, setLeaveChannelId] = useState(settings?.leaveChannelId ?? "");
  const [leaveMessage, setLeaveMessage] = useState(settings?.leaveMessage ?? "{user.name} has left the server. We now have {server.membercount} members.");
  const [leaveEmbedId, setLeaveEmbedId] = useState<number | null>(settings?.leaveEmbedId ?? null);
  const [leaveEmbedData, setLeaveEmbedData] = useState<EmbedData | undefined>(undefined);

  const [showPreview, setShowPreview] = useState(false);
  const [addRoleOpen, setAddRoleOpen] = useState(false);
  const [newRoleId, setNewRoleId] = useState("");
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDelay, setNewRoleDelay] = useState(0);
  const [newRoleType, setNewRoleType] = useState("join");

  const openStudio = (documentId: number) => {
    navigate(`/dashboard/servers/${serverId}/studio?documentId=${documentId}`);
  };

  const createSurface = (binding: "welcome" | "welcome_dm" | "leave", field: "welcomeStudioDocumentId" | "welcomeDmStudioDocumentId" | "leaveStudioDocumentId") => {
    const name = binding === "welcome" ? "Welcome Message" : binding === "welcome_dm" ? "Welcome DM Message" : "Leave Message";
    createStudioDocument.mutate(
      {
        scope: "server",
        kind: "surface",
        name,
        moduleBinding: binding,
        document: createStudioDocumentDraft(binding, name),
      },
      {
        onSuccess: (created: any) => {
          updateSettings.mutate(
            { [field]: created.id },
            {
              onSuccess: () => openStudio(created.id),
            }
          );
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  };

  const publishSurface = (documentId: number | null | undefined, channelIdValue: string, label: string) => {
    if (!documentId) {
      toast({ title: "No message bound", description: `Create a ${label.toLowerCase()} first.`, variant: "destructive" });
      return;
    }
    if (!channelIdValue) {
      toast({ title: "No channel selected", description: `Choose a channel for ${label.toLowerCase()} publishing.`, variant: "destructive" });
      return;
    }
    publishStudio.mutate(
      {
        documentId,
        target: {
          channelId: channelIdValue,
          viewId: "entry",
        },
      },
      {
        onSuccess: () => toast({ title: "Message published", description: `${label} sent to ${channelIdValue}.` }),
        onError: (err: any) => toast({ title: "Publish failed", description: err.message, variant: "destructive" }),
      }
    );
  };

  const handleSave = () => {
    updateSettings.mutate(
      {
        welcomeEnabled,
        welcomeChannelId: welcomeChannelId || undefined,
        welcomeMessage: welcomeMessage || undefined,
        welcomeEmbedId: welcomeEmbedId ?? undefined,
        welcomeDmEnabled,
        welcomeDmMessage: welcomeDmMessage || undefined,
        leaveEnabled,
        leaveChannelId: leaveChannelId || undefined,
        leaveMessage: leaveMessage || undefined,
        leaveEmbedId: leaveEmbedId ?? undefined,
      },
      {
        onSuccess: () =>
          toast({ title: "Settings saved", description: "Welcome & leave settings updated successfully." }),
        onError: (err: any) =>
          toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  };

  const handleSelectAutoRole = (roleId: string) => {
    setNewRoleId(roleId);
    setNewRoleName(roleNameById[roleId] || "");
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
          toast({ title: "Auto role added", description: `${newRoleName} will be assigned on ${newRoleType}.` });
          setNewRoleId("");
          setNewRoleName("");
          setNewRoleDelay(0);
          setNewRoleType("join");
          setAddRoleOpen(false);
        },
        onError: (err: any) =>
          toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  };

  const handleDeleteAutoRole = (id: number) => {
    deleteAutoRole.mutate(id, {
      onSuccess: () => toast({ title: "Auto role removed" }),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-display font-bold" data-testid="text-welcome-heading">
            Welcome & Leave
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configure messages sent when members join or leave your server.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowPreview(!showPreview)} data-testid="button-toggle-preview">
            <Eye className="w-4 h-4 mr-2" />
            {showPreview ? "Hide Preview" : "Show Preview"}
          </Button>
          <Button onClick={handleSave} disabled={updateSettings.isPending} data-testid="button-save-welcome">
            <Save className="w-4 h-4 mr-2" />
            {updateSettings.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <StudioSurfaceCard
          title="Welcome Message"
          description="Use Design Studio for the shared welcome/orientation message. It will auto-send on member join when welcome messages are enabled."
          documentId={settings?.welcomeStudioDocumentId}
          publication={welcomePublication}
          onCreate={() => createSurface("welcome", "welcomeStudioDocumentId")}
          onOpen={() => settings?.welcomeStudioDocumentId && openStudio(settings.welcomeStudioDocumentId)}
          onPublish={() => publishSurface(settings?.welcomeStudioDocumentId, welcomeChannelId, "Welcome message")}
        />
        <StudioSurfaceCard
          title="Welcome DM Message"
          description="Design the DM onboarding flow with views, modals, and reusable blocks. It auto-sends when welcome DMs are enabled."
          documentId={settings?.welcomeDmStudioDocumentId}
          publication={welcomeDmPublication}
          onCreate={() => createSurface("welcome_dm", "welcomeDmStudioDocumentId")}
          onOpen={() => settings?.welcomeDmStudioDocumentId && openStudio(settings.welcomeDmStudioDocumentId)}
          actionLabel="Create DM Message"
        />
        <StudioSurfaceCard
          title="Leave Message"
          description="Use Studio for leave notices, archive instructions, or offboarding copy. It auto-sends on member leave when leave messages are enabled."
          documentId={settings?.leaveStudioDocumentId}
          publication={leavePublication}
          onCreate={() => createSurface("leave", "leaveStudioDocumentId")}
          onOpen={() => settings?.leaveStudioDocumentId && openStudio(settings.leaveStudioDocumentId)}
          onPublish={() => publishSurface(settings?.leaveStudioDocumentId, leaveChannelId, "Leave message")}
        />
      </div>

      {showPreview && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-display text-base flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Message Preview
            </CardTitle>
            <CardDescription>Preview with sample data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {welcomeEnabled && welcomeMessage && (
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wider text-muted-foreground/70 font-medium">Welcome Message</p>
                <div className="rounded-md bg-background/50 border border-white/5 p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <Bot className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display font-bold text-sm" data-testid="text-preview-bot-name">Archivist</span>
                        <Badge variant="secondary" className="text-[10px]">BOT</Badge>
                        <span className="text-xs text-muted-foreground">Today at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-sm mt-1" data-testid="text-preview-welcome">{replaceVariables(welcomeMessage)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {welcomeDmEnabled && welcomeDmMessage && (
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wider text-muted-foreground/70 font-medium">Welcome DM</p>
                <div className="rounded-md bg-background/50 border border-white/5 p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                      <Mail className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display font-bold text-sm">Archivist</span>
                        <Badge variant="secondary" className="text-[10px]">BOT</Badge>
                      </div>
                      <p className="text-sm mt-1" data-testid="text-preview-dm">{replaceVariables(welcomeDmMessage)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {leaveEnabled && leaveMessage && (
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wider text-muted-foreground/70 font-medium">Leave Message</p>
                <div className="rounded-md bg-background/50 border border-white/5 p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center shrink-0">
                      <LogOut className="w-5 h-5 text-destructive" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display font-bold text-sm">Archivist</span>
                        <Badge variant="secondary" className="text-[10px]">BOT</Badge>
                        <span className="text-xs text-muted-foreground">Today at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-sm mt-1" data-testid="text-preview-leave">{replaceVariables(leaveMessage)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {!welcomeEnabled && !leaveEnabled && (
              <p className="text-sm text-muted-foreground text-center py-6">
                Enable welcome or leave messages to see a preview.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-green-500/10 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <CardTitle className="font-display">Welcome Messages</CardTitle>
                <CardDescription>Greet new members when they join</CardDescription>
              </div>
            </div>
            <Switch
              checked={welcomeEnabled}
              onCheckedChange={setWelcomeEnabled}
              data-testid="switch-welcome-enabled"
            />
          </div>
        </CardHeader>
        <CardContent className={`space-y-6 transition-opacity duration-300 ${!welcomeEnabled ? "opacity-50 pointer-events-none" : ""}`}>
          <div className="space-y-2">
            <label className="text-sm font-medium">Welcome Channel</label>
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4 text-muted-foreground shrink-0" />
              <Select value={welcomeChannelId || "__none__"} onValueChange={(value) => setWelcomeChannelId(value === "__none__" ? "" : value)}>
                <SelectTrigger className="bg-background max-w-md" data-testid="select-welcome-channel-id">
                  <SelectValue placeholder={discordContextLoading ? "Loading channels..." : "Select a channel"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Not Set</SelectItem>
                  {channelOptions.map((channel) => (
                    <SelectItem key={channel.id} value={channel.id}>
                      # {channel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">Pick the channel where welcome messages will be sent.</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Welcome Message</label>
            <Textarea
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              placeholder="Welcome {user.mention} to {server}!"
              className="bg-background min-h-[100px]"
              data-testid="input-welcome-message"
            />
            <VariableHints />
          </div>

          <EmbedComposer
            label="Welcome Embed (Optional)"
            value={welcomeEmbedData}
            onChange={setWelcomeEmbedData}
          />

          <Separator className="bg-white/5" />

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 rounded-md border border-white/5 bg-background/30 p-4">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Welcome DM</p>
                  <p className="text-xs text-muted-foreground">Send a direct message to new members</p>
                </div>
              </div>
              <Switch
                checked={welcomeDmEnabled}
                onCheckedChange={setWelcomeDmEnabled}
                data-testid="switch-welcome-dm"
              />
            </div>
            {welcomeDmEnabled && (
              <div className="space-y-2 pl-4 border-l-2 border-primary/20">
                <label className="text-sm font-medium">DM Message</label>
                <Textarea
                  value={welcomeDmMessage}
                  onChange={(e) => setWelcomeDmMessage(e.target.value)}
                  placeholder="Welcome to {server}! Here are some things to get started..."
                  className="bg-background min-h-[80px]"
                  data-testid="input-welcome-dm-message"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-destructive/10 flex items-center justify-center">
                <LogOut className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <CardTitle className="font-display">Leave Messages</CardTitle>
                <CardDescription>Notify when members leave the server</CardDescription>
              </div>
            </div>
            <Switch
              checked={leaveEnabled}
              onCheckedChange={setLeaveEnabled}
              data-testid="switch-leave-enabled"
            />
          </div>
        </CardHeader>
        <CardContent className={`space-y-6 transition-opacity duration-300 ${!leaveEnabled ? "opacity-50 pointer-events-none" : ""}`}>
          <div className="space-y-2">
            <label className="text-sm font-medium">Leave Channel</label>
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4 text-muted-foreground shrink-0" />
              <Select value={leaveChannelId || "__none__"} onValueChange={(value) => setLeaveChannelId(value === "__none__" ? "" : value)}>
                <SelectTrigger className="bg-background max-w-md" data-testid="select-leave-channel-id">
                  <SelectValue placeholder={discordContextLoading ? "Loading channels..." : "Select a channel"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Use Welcome Channel</SelectItem>
                  {channelOptions.map((channel) => (
                    <SelectItem key={channel.id} value={channel.id}>
                      # {channel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">Pick where leave messages will be sent. Leave blank to reuse the welcome channel.</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Leave Message</label>
            <Textarea
              value={leaveMessage}
              onChange={(e) => setLeaveMessage(e.target.value)}
              placeholder="{user.name} has left the server."
              className="bg-background min-h-[100px]"
              data-testid="input-leave-message"
            />
            <VariableHints />
          </div>

          <EmbedComposer
            label="Leave Embed (Optional)"
            value={leaveEmbedData}
            onChange={setLeaveEmbedData}
          />
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-accent/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-accent" />
              </div>
              <div>
                <CardTitle className="font-display">Auto Roles</CardTitle>
                <CardDescription>Automatically assign roles when members join</CardDescription>
              </div>
            </div>
            <Dialog open={addRoleOpen} onOpenChange={setAddRoleOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="button-add-auto-role">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Role
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-panel">
                <DialogHeader>
                  <DialogTitle className="font-display">Add Auto Role</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Role</label>
                    <Select value={newRoleId || "__none__"} onValueChange={(value) => handleSelectAutoRole(value === "__none__" ? "" : value)}>
                      <SelectTrigger className="bg-background" data-testid="select-auto-role-id">
                        <SelectValue placeholder={discordContextLoading ? "Loading roles..." : "Select a role"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Select Role</SelectItem>
                        {roleOptions.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={newRoleId}
                      onChange={(e) => setNewRoleId(e.target.value)}
                      placeholder="Role ID (manual fallback)"
                      className="bg-background"
                      data-testid="input-auto-role-id"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Role Name</label>
                    <Input
                      value={newRoleName}
                      onChange={(e) => setNewRoleName(e.target.value)}
                      placeholder="e.g. Member"
                      className="bg-background"
                      data-testid="input-auto-role-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Delay (seconds)</label>
                    <Input
                      type="number"
                      min={0}
                      value={newRoleDelay}
                      onChange={(e) => setNewRoleDelay(parseInt(e.target.value) || 0)}
                      className="bg-background max-w-[200px]"
                      data-testid="input-auto-role-delay"
                    />
                    <p className="text-xs text-muted-foreground">0 = assign instantly on join</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Assign To</label>
                    <Select value={newRoleType} onValueChange={setNewRoleType}>
                      <SelectTrigger className="bg-background" data-testid="select-auto-role-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="join">All Joins</SelectItem>
                        <SelectItem value="human">Humans Only</SelectItem>
                        <SelectItem value="bot">Bots Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddRoleOpen(false)} data-testid="button-cancel-auto-role">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddAutoRole}
                    disabled={!newRoleId.trim() || !newRoleName.trim() || createAutoRole.isPending}
                    data-testid="button-confirm-auto-role"
                  >
                    {createAutoRole.isPending ? "Adding..." : "Add Role"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {autoRolesLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (autoRoles as AutoRole[]).length === 0 ? (
            <div className="text-center py-10">
              <Users className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No auto roles configured.</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Add roles that will be automatically assigned to new members.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(autoRoles as AutoRole[]).map((role) => (
                <div
                  key={role.id}
                  className="flex items-center justify-between gap-4 rounded-md border border-white/5 bg-background/30 p-3"
                  data-testid={`card-auto-role-${role.id}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-md bg-accent/10 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-accent" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" data-testid={`text-auto-role-name-${role.id}`}>{role.roleName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        ID: {role.roleId}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {role.delay && role.delay > 0 ? (
                      <Badge variant="secondary" className="text-[10px]">
                        <Clock className="w-3 h-3 mr-1" />
                        {role.delay}s delay
                      </Badge>
                    ) : null}
                    <Badge variant="secondary" className="text-[10px]">
                      {role.type === "join" ? (
                        <><Users className="w-3 h-3 mr-1" />All</>
                      ) : role.type === "human" ? (
                        <><User className="w-3 h-3 mr-1" />Humans</>
                      ) : (
                        <><Bot className="w-3 h-3 mr-1" />Bots</>
                      )}
                    </Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDeleteAutoRole(role.id)}
                      data-testid={`button-delete-auto-role-${role.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-display text-base flex items-center gap-2">
            <Info className="w-4 h-4" />
            Available Variables
          </CardTitle>
          <CardDescription>Use these in your welcome and leave messages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {VARIABLES.map((v) => (
              <div
                key={v.key}
                className="flex items-center gap-2 rounded-md bg-background/30 border border-white/5 px-3 py-2"
              >
                <code className="text-xs text-primary font-mono" data-testid={`text-var-${v.key}`}>{v.key}</code>
                <ArrowRight className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                <span className="text-xs text-muted-foreground truncate">{v.desc}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function VariableHints() {
  return (
    <p className="text-xs text-muted-foreground">
      Use variables like <code className="text-primary/80">{"{user.mention}"}</code>,{" "}
      <code className="text-primary/80">{"{server}"}</code>,{" "}
      <code className="text-primary/80">{"{server.membercount}"}</code>
    </p>
  );
}

