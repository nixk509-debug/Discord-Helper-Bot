import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useUpdateSettings } from "@/hooks/use-bot";
import {
  Shield,
  ShieldAlert,
  Link2,
  Type,
  Smile,
  AtSign,
  MailWarning,
  Save,
  X,
  Plus,
  Download,
  Upload,
  Clock,
  Users,
  Hash,
  AlertTriangle,
} from "lucide-react";

interface AutomodTabProps {
  serverId: number;
  settings: any;
}

interface FilterCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: (val: boolean) => void;
  children?: React.ReactNode;
  testIdPrefix: string;
}

function FilterCard({ icon, title, description, enabled, onToggle, children, testIdPrefix }: FilterCardProps) {
  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="shrink-0 flex items-center justify-center w-9 h-9 rounded-md bg-primary/10 text-primary">
            {icon}
          </div>
          <div className="min-w-0">
            <CardTitle className="text-base font-display">{title}</CardTitle>
            <CardDescription className="text-xs mt-0.5">{description}</CardDescription>
          </div>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={onToggle}
          data-testid={`switch-${testIdPrefix}-enabled`}
        />
      </CardHeader>
      {enabled && children && (
        <CardContent className="pt-0 space-y-4 border-t border-white/5 mt-2 pt-4">
          {children}
        </CardContent>
      )}
    </Card>
  );
}

const ACTION_OPTIONS = [
  { value: "delete", label: "Delete Message" },
  { value: "warn", label: "Warn User" },
  { value: "mute", label: "Mute User" },
  { value: "kick", label: "Kick User" },
  { value: "ban", label: "Ban User" },
];

const MOCK_AUTOMOD_LOG = [
  { id: 1, action: "Deleted message", user: "SpamBot#1234", filter: "Anti-Spam", time: "2 min ago" },
  { id: 2, action: "Warned user", user: "ToxicUser#5678", filter: "Banned Words", time: "15 min ago" },
  { id: 3, action: "Deleted message", user: "LinkDropper#9012", filter: "Anti-Link", time: "1 hour ago" },
  { id: 4, action: "Muted user", user: "CapsLock#3456", filter: "Anti-Caps", time: "3 hours ago" },
  { id: 5, action: "Deleted message", user: "InviteSpam#7890", filter: "Anti-Invite", time: "5 hours ago" },
];

export function AutomodTab({ serverId, settings }: AutomodTabProps) {
  const { toast } = useToast();
  const updateSettings = useUpdateSettings(serverId);

  const [automodEnabled, setAutomodEnabled] = useState(settings?.automodEnabled ?? false);
  const [antiSpamEnabled, setAntiSpamEnabled] = useState(settings?.antiSpamEnabled ?? false);
  const [antiLinkEnabled, setAntiLinkEnabled] = useState(settings?.antiLinkEnabled ?? false);
  const [antiCapsEnabled, setAntiCapsEnabled] = useState(settings?.antiCapsEnabled ?? false);
  const [antiEmojiSpamEnabled, setAntiEmojiSpamEnabled] = useState(settings?.antiEmojiSpamEnabled ?? false);
  const [antiMassMentionEnabled, setAntiMassMentionEnabled] = useState(settings?.antiMassMentionEnabled ?? false);
  const [antiInviteEnabled, setAntiInviteEnabled] = useState(settings?.antiInviteEnabled ?? false);

  const [maxMentions, setMaxMentions] = useState(settings?.maxMentions ?? 5);
  const [capsThreshold, setCapsThreshold] = useState(settings?.capsThreshold ?? 70);
  const [automodAction, setAutomodAction] = useState(settings?.automodAction ?? "delete");
  const [automodActionDuration, setAutomodActionDuration] = useState(settings?.automodActionDuration ?? 0);

  const [bannedWords, setBannedWords] = useState<string[]>(settings?.bannedWords ?? []);
  const [newWord, setNewWord] = useState("");
  const [wildcardEnabled, setWildcardEnabled] = useState(false);

  const [whitelistedRoles, setWhitelistedRoles] = useState<string[]>(settings?.automodWhitelistedRoles ?? []);
  const [whitelistedChannels, setWhitelistedChannels] = useState<string[]>(settings?.automodWhitelistedChannels ?? []);
  const [newRole, setNewRole] = useState("");
  const [newChannel, setNewChannel] = useState("");

  const [raidProtectionEnabled, setRaidProtectionEnabled] = useState(settings?.raidProtectionEnabled ?? false);
  const [raidJoinThreshold, setRaidJoinThreshold] = useState(settings?.raidJoinThreshold ?? 10);
  const [raidJoinWindow, setRaidJoinWindow] = useState(settings?.raidJoinWindow ?? 10);
  const [raidAction, setRaidAction] = useState(settings?.raidAction ?? "lockdown");
  const [raidMinAccountAge, setRaidMinAccountAge] = useState(settings?.raidMinAccountAge ?? 0);

  function addBannedWord() {
    const word = newWord.trim().toLowerCase();
    if (word && !bannedWords.includes(word)) {
      setBannedWords([...bannedWords, word]);
      setNewWord("");
    }
  }

  function removeBannedWord(word: string) {
    setBannedWords(bannedWords.filter((w) => w !== word));
  }

  function handleImportWords() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".txt,.csv";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        const words = text
          .split(/[\n,]+/)
          .map((w) => w.trim().toLowerCase())
          .filter((w) => w.length > 0);
        const unique = Array.from(new Set([...bannedWords, ...words]));
        setBannedWords(unique);
        toast({ title: "Words imported", description: `${words.length} words processed.` });
      };
      reader.readAsText(file);
    };
    input.click();
  }

  function handleExportWords() {
    const blob = new Blob([bannedWords.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "banned-words.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  function addWhitelistedRole() {
    const id = newRole.trim();
    if (id && !whitelistedRoles.includes(id)) {
      setWhitelistedRoles([...whitelistedRoles, id]);
      setNewRole("");
    }
  }

  function addWhitelistedChannel() {
    const id = newChannel.trim();
    if (id && !whitelistedChannels.includes(id)) {
      setWhitelistedChannels([...whitelistedChannels, id]);
      setNewChannel("");
    }
  }

  function handleSave() {
    updateSettings.mutate(
      {
        automodEnabled,
        antiSpamEnabled,
        antiLinkEnabled,
        antiCapsEnabled,
        antiEmojiSpamEnabled,
        antiMassMentionEnabled,
        antiInviteEnabled,
        maxMentions,
        capsThreshold,
        automodAction,
        automodActionDuration,
        bannedWords,
        automodWhitelistedRoles: whitelistedRoles,
        automodWhitelistedChannels: whitelistedChannels,
        raidProtectionEnabled,
        raidJoinThreshold,
        raidJoinWindow,
        raidAction,
        raidMinAccountAge,
      },
      {
        onSuccess: () =>
          toast({ title: "Automod updated", description: "All automoderation settings saved." }),
      }
    );
  }

  const isDisabled = !automodEnabled;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-display font-bold text-glow" data-testid="text-automod-title">
            Automoderation
          </h2>
          <p className="text-muted-foreground text-sm">
            Configure automated content filters to protect your community.
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={updateSettings.isPending}
          className="gap-2"
          data-testid="button-save-automod"
        >
          <Save className="w-4 h-4" />
          {updateSettings.isPending ? "Saving..." : "Save All Changes"}
        </Button>
      </div>

      <Card className="glass-card">
        <CardContent className="flex items-center justify-between gap-4 p-6">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-primary" />
            <div>
              <p className="font-display font-bold text-lg" data-testid="text-master-toggle">
                Automod Engine
              </p>
              <p className="text-sm text-muted-foreground">
                Master switch for all automoderation features.
              </p>
            </div>
          </div>
          <Switch
            checked={automodEnabled}
            onCheckedChange={setAutomodEnabled}
            data-testid="switch-automod-master"
          />
        </CardContent>
      </Card>

      <div className={`space-y-4 transition-opacity duration-300 ${isDisabled ? "opacity-50 pointer-events-none" : ""}`}>
        <h3 className="text-sm font-display font-bold text-muted-foreground uppercase tracking-wider" data-testid="text-filters-heading">
          Content Filters
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <FilterCard
            icon={<AlertTriangle className="w-4 h-4" />}
            title="Anti-Spam"
            description="Prevent message flooding and rapid-fire spam"
            enabled={antiSpamEnabled}
            onToggle={setAntiSpamEnabled}
            testIdPrefix="anti-spam"
          >
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Action</label>
                <Select value={automodAction} onValueChange={setAutomodAction}>
                  <SelectTrigger className="mt-1 bg-background" data-testid="select-spam-action">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {(automodAction === "mute" || automodAction === "ban") && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Duration (minutes)</label>
                  <Input
                    type="number"
                    min={0}
                    value={automodActionDuration}
                    onChange={(e) => setAutomodActionDuration(parseInt(e.target.value) || 0)}
                    className="mt-1 bg-background"
                    data-testid="input-spam-duration"
                  />
                </div>
              )}
            </div>
          </FilterCard>

          <FilterCard
            icon={<Link2 className="w-4 h-4" />}
            title="Anti-Link"
            description="Delete unauthorized URLs and links"
            enabled={antiLinkEnabled}
            onToggle={setAntiLinkEnabled}
            testIdPrefix="anti-link"
          />

          <FilterCard
            icon={<Type className="w-4 h-4" />}
            title="Anti-Caps"
            description="Prevent excessive uppercase messages"
            enabled={antiCapsEnabled}
            onToggle={setAntiCapsEnabled}
            testIdPrefix="anti-caps"
          >
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Caps Threshold ({capsThreshold}%)
              </label>
              <Input
                type="number"
                min={30}
                max={100}
                value={capsThreshold}
                onChange={(e) => setCapsThreshold(parseInt(e.target.value) || 70)}
                className="mt-1 bg-background"
                data-testid="input-caps-threshold"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Messages with more than {capsThreshold}% uppercase characters will be flagged.
              </p>
            </div>
          </FilterCard>

          <FilterCard
            icon={<Smile className="w-4 h-4" />}
            title="Anti-Emoji Spam"
            description="Limit excessive emoji usage in messages"
            enabled={antiEmojiSpamEnabled}
            onToggle={setAntiEmojiSpamEnabled}
            testIdPrefix="anti-emoji"
          />

          <FilterCard
            icon={<AtSign className="w-4 h-4" />}
            title="Anti-Mass Mention"
            description="Prevent mass-mentioning members"
            enabled={antiMassMentionEnabled}
            onToggle={setAntiMassMentionEnabled}
            testIdPrefix="anti-mention"
          >
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Max Mentions per Message
              </label>
              <Input
                type="number"
                min={1}
                max={50}
                value={maxMentions}
                onChange={(e) => setMaxMentions(parseInt(e.target.value) || 5)}
                className="mt-1 bg-background"
                data-testid="input-max-mentions"
              />
            </div>
          </FilterCard>

          <FilterCard
            icon={<MailWarning className="w-4 h-4" />}
            title="Anti-Invite Link"
            description="Block Discord server invite links"
            enabled={antiInviteEnabled}
            onToggle={setAntiInviteEnabled}
            testIdPrefix="anti-invite"
          />
        </div>

        <h3 className="text-sm font-display font-bold text-muted-foreground uppercase tracking-wider pt-4" data-testid="text-banned-words-heading">
          Banned Words
        </h3>

        <Card className="glass-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="text-base font-display">Word Filter</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {bannedWords.length} word{bannedWords.length !== 1 ? "s" : ""} configured
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">Wildcard</label>
                  <Switch
                    checked={wildcardEnabled}
                    onCheckedChange={setWildcardEnabled}
                    data-testid="switch-wildcard"
                  />
                </div>
                <Button size="sm" variant="outline" onClick={handleImportWords} className="gap-1" data-testid="button-import-words">
                  <Upload className="w-3 h-3" /> Import
                </Button>
                <Button size="sm" variant="outline" onClick={handleExportWords} className="gap-1" data-testid="button-export-words">
                  <Download className="w-3 h-3" /> Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addBannedWord())}
                placeholder="Type a word and press Enter..."
                className="bg-background"
                data-testid="input-banned-word"
              />
              <Button onClick={addBannedWord} size="icon" variant="outline" data-testid="button-add-word">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {bannedWords.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 rounded-md bg-background/50 border border-white/5 max-h-48 overflow-y-auto">
                {bannedWords.map((word, i) => (
                  <Badge
                    key={`${word}-${i}`}
                    variant="secondary"
                    className="gap-1 cursor-pointer"
                    data-testid={`badge-word-${i}`}
                  >
                    {word}
                    <button
                      onClick={() => removeBannedWord(word)}
                      className="ml-1"
                      data-testid={`button-remove-word-${i}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <h3 className="text-sm font-display font-bold text-muted-foreground uppercase tracking-wider pt-4" data-testid="text-whitelist-heading">
          Whitelist
        </h3>

        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display">Whitelisted Roles & Channels</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              These roles and channels bypass all automod filters.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mb-2">
                <Users className="w-3.5 h-3.5" /> Whitelisted Roles (IDs)
              </label>
              <div className="flex gap-2">
                <Input
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addWhitelistedRole())}
                  placeholder="Enter role ID..."
                  className="bg-background"
                  data-testid="input-whitelist-role"
                />
                <Button onClick={addWhitelistedRole} size="icon" variant="outline" data-testid="button-add-whitelist-role">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {whitelistedRoles.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {whitelistedRoles.map((id, i) => (
                    <Badge key={id} variant="secondary" className="gap-1" data-testid={`badge-role-${i}`}>
                      {id}
                      <button onClick={() => setWhitelistedRoles(whitelistedRoles.filter((r) => r !== id))} data-testid={`button-remove-role-${i}`}>
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mb-2">
                <Hash className="w-3.5 h-3.5" /> Whitelisted Channels (IDs)
              </label>
              <div className="flex gap-2">
                <Input
                  value={newChannel}
                  onChange={(e) => setNewChannel(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addWhitelistedChannel())}
                  placeholder="Enter channel ID..."
                  className="bg-background"
                  data-testid="input-whitelist-channel"
                />
                <Button onClick={addWhitelistedChannel} size="icon" variant="outline" data-testid="button-add-whitelist-channel">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {whitelistedChannels.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {whitelistedChannels.map((id, i) => (
                    <Badge key={id} variant="secondary" className="gap-1" data-testid={`badge-channel-${i}`}>
                      {id}
                      <button onClick={() => setWhitelistedChannels(whitelistedChannels.filter((c) => c !== id))} data-testid={`button-remove-channel-${i}`}>
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <h3 className="text-sm font-display font-bold text-muted-foreground uppercase tracking-wider pt-4" data-testid="text-raid-heading">
          Raid Protection
        </h3>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-3">
            <div className="flex items-center gap-3">
              <div className="shrink-0 flex items-center justify-center w-9 h-9 rounded-md bg-destructive/10 text-destructive">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-base font-display">Raid Protection</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Automatically detect and respond to raid attacks.
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={raidProtectionEnabled}
              onCheckedChange={setRaidProtectionEnabled}
              data-testid="switch-raid-enabled"
            />
          </CardHeader>
          {raidProtectionEnabled && (
            <CardContent className="space-y-4 border-t border-white/5 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Join Threshold
                  </label>
                  <Input
                    type="number"
                    min={2}
                    value={raidJoinThreshold}
                    onChange={(e) => setRaidJoinThreshold(parseInt(e.target.value) || 10)}
                    className="mt-1 bg-background"
                    data-testid="input-raid-threshold"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Number of joins that triggers raid mode.
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Time Window (seconds)
                  </label>
                  <Input
                    type="number"
                    min={5}
                    value={raidJoinWindow}
                    onChange={(e) => setRaidJoinWindow(parseInt(e.target.value) || 10)}
                    className="mt-1 bg-background"
                    data-testid="input-raid-window"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Time period to measure joins in.
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Raid Action</label>
                <Select value={raidAction} onValueChange={setRaidAction}>
                  <SelectTrigger className="mt-1 bg-background" data-testid="select-raid-action">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lockdown">Lockdown Server</SelectItem>
                    <SelectItem value="kick">Kick New Accounts</SelectItem>
                    <SelectItem value="verification">Enable Verification</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Min Account Age (days)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={raidMinAccountAge}
                  onChange={(e) => setRaidMinAccountAge(parseInt(e.target.value) || 0)}
                  className="mt-1 bg-background"
                  data-testid="input-raid-account-age"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Block accounts younger than this during raid (0 = disabled).
                </p>
              </div>
            </CardContent>
          )}
        </Card>

        <h3 className="text-sm font-display font-bold text-muted-foreground uppercase tracking-wider pt-4" data-testid="text-log-heading">
          Recent Automod Actions
        </h3>

        <Card className="glass-card">
          <CardContent className="p-0">
            <div className="divide-y divide-white/5">
              {MOCK_AUTOMOD_LOG.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between gap-4 px-4 py-3"
                  data-testid={`row-log-${entry.id}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Shield className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm truncate">
                        <span className="font-medium">{entry.action}</span>
                        {" - "}
                        <span className="text-muted-foreground">{entry.user}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">{entry.filter}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                    <Clock className="w-3 h-3" />
                    {entry.time}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
