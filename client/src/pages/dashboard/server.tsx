import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ServerSettingsLayout } from "@/components/layout/server-settings-layout";
import { useServer, useUpdateSettings, useCommands, useCreateCommand, useDeleteCommand } from "@/hooks/use-bot";
import { useRoute } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Shield, Terminal, Plus, Trash2, Save, Settings, Layout, Construction } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EmbedBuilderTab } from "@/components/embed-builder/embed-builder-tab";

const generalSchema = z.object({
  prefix: z.string().min(1, "Prefix is required").max(5, "Prefix too long"),
  welcomeChannelId: z.string().optional(),
  welcomeMessage: z.string().optional(),
  leaveMessage: z.string().optional(),
});

const automodSchema = z.object({
  automodEnabled: z.boolean(),
  antiSpamEnabled: z.boolean(),
  antiLinkEnabled: z.boolean(),
  bannedWords: z.string(),
});

const loggingSchema = z.object({
  logChannelId: z.string().optional(),
  logEvents: z.array(z.string()),
});

const commandSchema = z.object({
  name: z.string().min(1, "Command name is required").regex(/^[a-z0-9]+$/, "Lowercase letters and numbers only"),
  response: z.string().min(1, "Response is required"),
});

const LOG_EVENT_OPTIONS = [
  { id: "messageDelete", label: "Message Deleted" },
  { id: "messageUpdate", label: "Message Edited" },
  { id: "memberJoin", label: "Member Joined" },
  { id: "memberLeave", label: "Member Left" },
  { id: "channelCreate", label: "Channel Created" },
  { id: "channelDelete", label: "Channel Deleted" },
];

export default function ServerSettings() {
  const [, params] = useRoute("/dashboard/servers/:id");
  const serverId = parseInt(params?.id || "0");
  const { toast } = useToast();
  const [activeModule, setActiveModule] = useState("general");

  const { data: server, isLoading } = useServer(serverId);
  const updateSettings = useUpdateSettings(serverId);

  if (isLoading || !server) {
    return (
      <DashboardLayout>
        <div className="flex items-center gap-6 mb-8">
          <Skeleton className="w-20 h-20 rounded-2xl bg-white/5" />
          <div className="space-y-3">
            <Skeleton className="h-8 w-64 bg-white/5" />
            <Skeleton className="h-4 w-32 bg-white/5" />
          </div>
        </div>
        <Skeleton className="h-12 w-full bg-white/5 rounded-xl mb-6" />
        <Skeleton className="h-[400px] w-full bg-white/5 rounded-2xl" />
      </DashboardLayout>
    );
  }

  const moduleStatuses: Record<string, boolean> = {
    general: true,
    automod: server.settings?.automodEnabled ?? false,
    "audit-logs": !!(server.settings?.logChannelId),
    commands: (server.customCommands?.length ?? 0) > 0,
    embeds: (server.embeds?.length ?? 0) > 0,
    welcome: server.settings?.welcomeEnabled ?? false,
  };

  function renderActiveModule() {
    switch (activeModule) {
      case "general":
        return <GeneralSettingsTab serverId={serverId} settings={server.settings} updateSettings={updateSettings} toast={toast} />;
      case "automod":
        return <AutomodSettingsTab serverId={serverId} settings={server.settings} updateSettings={updateSettings} toast={toast} />;
      case "audit-logs":
        return <LoggingSettingsTab serverId={serverId} settings={server.settings} updateSettings={updateSettings} toast={toast} />;
      case "commands":
        return <CommandsTab serverId={serverId} commands={server.customCommands || []} toast={toast} />;
      case "embeds":
        return <EmbedBuilderTab serverId={serverId} embeds={server.embeds || []} toast={toast} />;
      default:
        return <PlaceholderModule moduleId={activeModule} />;
    }
  }

  return (
    <DashboardLayout>
      <div className="flex items-center gap-6 mb-8">
        {server.iconUrl ? (
          <img src={server.iconUrl} alt={server.name} className="w-20 h-20 rounded-2xl shadow-lg shadow-primary/20" data-testid="img-server-icon" />
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center text-2xl font-display font-bold shadow-lg" data-testid="img-server-icon-fallback">
            {server.name.substring(0, 2).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-3xl font-display font-bold" data-testid="text-server-name">{server.name}</h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1" data-testid="text-server-info">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            Connected &middot; {server.memberCount} Members
          </p>
        </div>
      </div>

      <ServerSettingsLayout
        activeModule={activeModule}
        onModuleChange={setActiveModule}
        moduleStatuses={moduleStatuses}
      >
        {renderActiveModule()}
      </ServerSettingsLayout>
    </DashboardLayout>
  );
}

function PlaceholderModule({ moduleId }: { moduleId: string }) {
  return (
    <Card className="glass-card">
      <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
        <Construction className="w-12 h-12 text-muted-foreground/50" />
        <h3 className="text-lg font-display font-bold" data-testid={`text-placeholder-${moduleId}`}>
          Coming Soon
        </h3>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          This module is under development and will be available in a future update.
        </p>
      </CardContent>
    </Card>
  );
}

function GeneralSettingsTab({ serverId, settings, updateSettings, toast }: any) {
  const form = useForm({
    resolver: zodResolver(generalSchema),
    defaultValues: {
      prefix: settings?.prefix || "!",
      welcomeChannelId: settings?.welcomeChannelId || "",
      welcomeMessage: settings?.welcomeMessage || "",
      leaveMessage: settings?.leaveMessage || "",
    },
  });

  const onSubmit = (data: any) => {
    updateSettings.mutate(data, {
      onSuccess: () => toast({ title: "Settings updated", description: "General settings saved successfully." }),
    });
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="font-display">General Configuration</CardTitle>
        <CardDescription>Basic settings for how the bot interacts in your server.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="prefix"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Command Prefix</FormLabel>
                  <FormControl>
                    <Input {...field} className="bg-background max-w-[200px]" data-testid="input-prefix" />
                  </FormControl>
                  <FormDescription>The character used to trigger bot commands.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
              <FormField
                control={form.control}
                name="welcomeChannelId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Welcome/Leave Channel ID</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. 123456789012345678" className="bg-background" data-testid="input-welcome-channel" />
                    </FormControl>
                    <FormDescription>Discord Channel ID for welcome messages.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="welcomeMessage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Welcome Message</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Welcome {user} to {server}!" className="bg-background min-h-[100px]" data-testid="input-welcome-message" />
                    </FormControl>
                    <FormDescription>Use {`{user}`} and {`{server}`} as variables.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="leaveMessage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Leave Message</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="{user} has left the server." className="bg-background min-h-[100px]" data-testid="input-leave-message" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" disabled={updateSettings.isPending} data-testid="button-save-general" className="gap-2 mt-4">
              <Save className="w-4 h-4" />
              {updateSettings.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function AutomodSettingsTab({ serverId, settings, updateSettings, toast }: any) {
  const form = useForm({
    resolver: zodResolver(automodSchema),
    defaultValues: {
      automodEnabled: settings?.automodEnabled || false,
      antiSpamEnabled: settings?.antiSpamEnabled || false,
      antiLinkEnabled: settings?.antiLinkEnabled || false,
      bannedWords: (settings?.bannedWords || []).join(", "),
    },
  });

  const onSubmit = (data: any) => {
    const bannedWordsArray = data.bannedWords
      .split(",")
      .map((w: string) => w.trim())
      .filter((w: string) => w.length > 0);

    updateSettings.mutate({
      ...data,
      bannedWords: bannedWordsArray
    }, {
      onSuccess: () => toast({ title: "Automod updated", description: "Security settings saved successfully." }),
    });
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="font-display">Automoderation</CardTitle>
        <CardDescription>Protect your community with automated filters.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

            <FormField
              control={form.control}
              name="automodEnabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between gap-4 rounded-xl border border-white/5 bg-background/50 p-6">
                  <div className="space-y-0.5">
                    <FormLabel className="text-lg font-display">Enable Automod Engine</FormLabel>
                    <FormDescription>Master switch for all automoderation features.</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-primary" data-testid="switch-automod-enabled" />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-opacity duration-300 ${!form.watch("automodEnabled") ? "opacity-50 pointer-events-none" : ""}`}>
              <FormField
                control={form.control}
                name="antiSpamEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between gap-4 rounded-xl border border-white/5 bg-background/30 p-5">
                    <div className="space-y-0.5">
                      <FormLabel>Anti-Spam</FormLabel>
                      <FormDescription className="text-xs">Prevent message flooding</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-anti-spam" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="antiLinkEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between gap-4 rounded-xl border border-white/5 bg-background/30 p-5">
                    <div className="space-y-0.5">
                      <FormLabel>Anti-Link</FormLabel>
                      <FormDescription className="text-xs">Delete unauthorized URLs</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-anti-link" />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="bannedWords"
              render={({ field }) => (
                <FormItem className={!form.watch("automodEnabled") ? "opacity-50 pointer-events-none" : ""}>
                  <FormLabel>Banned Words Filter</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="badword1, badword2, scam" className="bg-background min-h-[100px]" data-testid="input-banned-words" />
                  </FormControl>
                  <FormDescription>Comma-separated list of words to automatically delete.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={updateSettings.isPending} data-testid="button-save-automod" className="gap-2">
              <Save className="w-4 h-4" />
              {updateSettings.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function LoggingSettingsTab({ serverId, settings, updateSettings, toast }: any) {
  const form = useForm({
    resolver: zodResolver(loggingSchema),
    defaultValues: {
      logChannelId: settings?.logChannelId || "",
      logEvents: settings?.logEvents || [],
    },
  });

  const onSubmit = (data: any) => {
    updateSettings.mutate(data, {
      onSuccess: () => toast({ title: "Logging updated", description: "Audit log settings saved successfully." }),
    });
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="font-display">Audit Logging</CardTitle>
        <CardDescription>Track server activity in a designated channel.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

            <FormField
              control={form.control}
              name="logChannelId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Log Channel ID</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. 123456789012345678" className="bg-background max-w-md" data-testid="input-log-channel" />
                  </FormControl>
                  <FormDescription>The channel where logs will be sent. Leave blank to disable logging.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="logEvents"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel>Events to Log</FormLabel>
                    <FormDescription>Select which actions trigger a log message.</FormDescription>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {LOG_EVENT_OPTIONS.map((item) => (
                      <FormField
                        key={item.id}
                        control={form.control}
                        name="logEvents"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={item.id}
                              className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border border-white/5 p-4 bg-background/30 hover-elevate"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(item.id)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, item.id])
                                      : field.onChange(field.value?.filter((value: string) => value !== item.id))
                                  }}
                                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                  data-testid={`checkbox-log-${item.id}`}
                                />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">
                                {item.label}
                              </FormLabel>
                            </FormItem>
                          )
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={updateSettings.isPending} data-testid="button-save-logging" className="gap-2 mt-4">
              <Save className="w-4 h-4" />
              {updateSettings.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function CommandsTab({ serverId, commands, toast }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const createCommand = useCreateCommand(serverId);
  const deleteCommand = useDeleteCommand(serverId);

  const form = useForm({
    resolver: zodResolver(commandSchema),
    defaultValues: { name: "", response: "" },
  });

  const onSubmit = (data: any) => {
    createCommand.mutate(data, {
      onSuccess: () => {
        toast({ title: "Command created", description: `!${data.name} added successfully.` });
        setIsOpen(false);
        form.reset();
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-display font-bold text-glow" data-testid="text-commands-title">Custom Commands</h2>
          <p className="text-muted-foreground text-sm">Create automated responses for specific keywords.</p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="button-new-command">
              <Plus className="w-4 h-4" /> New Command
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-panel border border-white/10 sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create Command</DialogTitle>
              <DialogDescription>
                Add a new custom command to your server.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Command Name</FormLabel>
                      <div className="flex items-center">
                        <span className="bg-secondary px-3 py-2 rounded-l-md border border-r-0 border-white/10 text-muted-foreground">!</span>
                        <FormControl>
                          <Input {...field} placeholder="ping" className="rounded-l-none bg-background border-white/10 focus-visible:ring-primary" data-testid="input-command-name" />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="response"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bot Response</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Pong!" className="bg-background border-white/10 focus-visible:ring-primary min-h-[100px]" data-testid="input-command-response" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="pt-4">
                  <Button type="submit" disabled={createCommand.isPending} className="w-full" data-testid="button-create-command">
                    {createCommand.isPending ? "Creating..." : "Create Command"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {commands.length === 0 ? (
          <div className="col-span-full py-12 text-center glass-card rounded-xl border border-dashed border-white/10">
            <Terminal className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <h3 className="text-lg font-medium" data-testid="text-no-commands">No commands yet</h3>
            <p className="text-sm text-muted-foreground">Create your first custom command to get started.</p>
          </div>
        ) : (
          commands.map((cmd: any) => (
            <Card key={cmd.id} className="glass-card group" data-testid={`card-command-${cmd.id}`}>
              <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2 flex-wrap">
                <CardTitle className="text-lg font-mono text-primary bg-primary/10 px-2 py-1 rounded" data-testid={`text-command-name-${cmd.id}`}>!{cmd.name}</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground invisible group-hover:visible"
                  onClick={() => {
                    if (confirm("Are you sure you want to delete this command?")) {
                      deleteCommand.mutate(cmd.id, {
                        onSuccess: () => toast({ title: "Deleted", description: `Command !${cmd.name} removed.` })
                      });
                    }
                  }}
                  disabled={deleteCommand.isPending}
                  data-testid={`button-delete-command-${cmd.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground truncate" data-testid={`text-command-response-${cmd.id}`}>{cmd.response}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
