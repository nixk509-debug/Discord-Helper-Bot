import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useDiscordContext, useLeveling, useUpsertLeveling } from "@/hooks/use-bot";
import type { LevelingConfigType } from "@shared/schema";
import {
  TrendingUp,
  Save,
  Plus,
  Trash2,
  Trophy,
  Star,
  Zap,
  MessageSquare,
  Clock,
  Hash,
  Users,
  Crown,
  ArrowUpDown,
  RotateCcw,
  X,
} from "lucide-react";
import { DiscordEntityListPicker, DiscordEntityPicker } from "@/components/discord/entity-pickers";

interface LevelingTabProps {
  serverId: number;
}

interface RoleReward {
  level: number;
  roleId: string;
  roleName: string;
}

interface XpMultiplier {
  roleId: string;
  roleName: string;
  multiplier: number;
}

const MOCK_LEADERBOARD = [
  { rank: 1, name: "DragonSlayer99", level: 42, xp: 84200, avatar: "DS" },
  { rank: 2, name: "NightOwl", level: 38, xp: 72100, avatar: "NO" },
  { rank: 3, name: "PixelMaster", level: 35, xp: 65400, avatar: "PM" },
  { rank: 4, name: "CodeWizard", level: 31, xp: 58900, avatar: "CW" },
  { rank: 5, name: "StarGazer", level: 28, xp: 51200, avatar: "SG" },
  { rank: 6, name: "ThunderBolt", level: 25, xp: 44700, avatar: "TB" },
  { rank: 7, name: "MoonWalker", level: 22, xp: 38100, avatar: "MW" },
  { rank: 8, name: "SkyRider", level: 19, xp: 31600, avatar: "SR" },
  { rank: 9, name: "FireStorm", level: 16, xp: 25000, avatar: "FS" },
  { rank: 10, name: "IceBreaker", level: 13, xp: 18400, avatar: "IB" },
];

function xpForLevel(level: number): number {
  return 5 * level * level + 50 * level + 100;
}

export function LevelingTab({ serverId }: LevelingTabProps) {
  const { toast } = useToast();
  const { data: config, isLoading } = useLeveling(serverId);
  const upsertLeveling = useUpsertLeveling(serverId);
  const { data: discordContext } = useDiscordContext(serverId);

  const textChannelOptions = (discordContext?.channels || [])
    .filter((channel) => channel.isTextBased && !channel.isThread && !channel.isCategory)
    .map((channel) => ({
      id: channel.id,
      label: `#${channel.name}`,
      description: channel.id,
    }));

  const roleOptions = (discordContext?.roles || []).map((role) => ({
    id: role.id,
    label: role.name,
    description: role.id,
  }));

  const [enabled, setEnabled] = useState(false);
  const [xpPerMessage, setXpPerMessage] = useState(15);
  const [xpCooldown, setXpCooldown] = useState(60);
  const [levelUpChannelId, setLevelUpChannelId] = useState("");
  const [levelUpMessage, setLevelUpMessage] = useState("Congratulations {user}, you reached level {level}!");
  const [roleRewards, setRoleRewards] = useState<RoleReward[]>([]);
  const [stackRewards, setStackRewards] = useState(true);
  const [xpMultipliers, setXpMultipliers] = useState<XpMultiplier[]>([]);
  const [ignoredChannels, setIgnoredChannels] = useState<string[]>([]);
  const [ignoredRoles, setIgnoredRoles] = useState<string[]>([]);

  const [newRewardLevel, setNewRewardLevel] = useState("");
  const [newRewardRoleId, setNewRewardRoleId] = useState("");
  const [newRewardRoleName, setNewRewardRoleName] = useState("");

  const [newMultRoleId, setNewMultRoleId] = useState("");
  const [newMultRoleName, setNewMultRoleName] = useState("");
  const [newMultValue, setNewMultValue] = useState("1.5");

  useEffect(() => {
    if (config) {
      setEnabled(config.enabled ?? false);
      setXpPerMessage(config.xpPerMessage ?? 15);
      setXpCooldown(config.xpCooldown ?? 60);
      setLevelUpChannelId(config.levelUpChannelId ?? "");
      setLevelUpMessage(config.levelUpMessage ?? "Congratulations {user}, you reached level {level}!");
      setRoleRewards(config.roleRewards ?? []);
      setStackRewards(config.stackRewards ?? true);
      setXpMultipliers(config.xpMultipliers ?? []);
      setIgnoredChannels(config.ignoredChannels ?? []);
      setIgnoredRoles(config.ignoredRoles ?? []);
    }
  }, [config]);

  const handleSave = () => {
    upsertLeveling.mutate(
      {
        enabled,
        xpPerMessage,
        xpCooldown,
        levelUpChannelId: levelUpChannelId || null,
        levelUpMessage,
        roleRewards,
        stackRewards,
        xpMultipliers,
        ignoredChannels,
        ignoredRoles,
      },
      {
        onSuccess: () => {
          toast({ title: "Leveling settings saved", description: "Configuration updated successfully." });
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  const addRoleReward = () => {
    const level = parseInt(newRewardLevel);
    if (!level || level < 1 || !newRewardRoleId.trim() || !newRewardRoleName.trim()) {
      toast({ title: "Invalid input", description: "Please fill in level, role ID, and role name.", variant: "destructive" });
      return;
    }
    if (roleRewards.some((r) => r.level === level)) {
      toast({ title: "Duplicate level", description: "A reward for this level already exists.", variant: "destructive" });
      return;
    }
    setRoleRewards((prev) => [...prev, { level, roleId: newRewardRoleId.trim(), roleName: newRewardRoleName.trim() }].sort((a, b) => a.level - b.level));
    setNewRewardLevel("");
    setNewRewardRoleId("");
    setNewRewardRoleName("");
  };

  const removeRoleReward = (level: number) => {
    setRoleRewards((prev) => prev.filter((r) => r.level !== level));
  };

  const addMultiplier = () => {
    const mult = parseFloat(newMultValue);
    if (!newMultRoleId.trim() || !newMultRoleName.trim() || isNaN(mult) || mult <= 0) {
      toast({ title: "Invalid input", description: "Please fill in role ID, name, and a valid multiplier.", variant: "destructive" });
      return;
    }
    if (xpMultipliers.some((m) => m.roleId === newMultRoleId.trim())) {
      toast({ title: "Duplicate role", description: "A multiplier for this role already exists.", variant: "destructive" });
      return;
    }
    setXpMultipliers((prev) => [...prev, { roleId: newMultRoleId.trim(), roleName: newMultRoleName.trim(), multiplier: mult }]);
    setNewMultRoleId("");
    setNewMultRoleName("");
    setNewMultValue("1.5");
  };

  const removeMultiplier = (roleId: string) => {
    setXpMultipliers((prev) => prev.filter((m) => m.roleId !== roleId));
  };

  const previewMessage = levelUpMessage
    .replace("{user}", "@DragonSlayer99")
    .replace("{level}", "42")
    .replace("{role}", "Elite Member");

  if (isLoading) {
    return (
      <div className="space-y-6 p-6" data-testid="leveling-loading">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6" data-testid="leveling-tab">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-display font-bold flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary" />
            <span data-testid="text-leveling-title">Leveling & XP System</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configure XP gains, level-up rewards, and leaderboard settings
          </p>
        </div>
        <Button onClick={handleSave} disabled={upsertLeveling.isPending} data-testid="button-save-leveling">
          <Save className="w-4 h-4 mr-2" />
          {upsertLeveling.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0 flex items-center justify-center w-9 h-9 rounded-md bg-primary/10 text-primary">
              <Zap className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base font-display">Leveling System</CardTitle>
              <CardDescription className="text-xs mt-0.5">Enable or disable the XP and leveling system</CardDescription>
            </div>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={setEnabled}
            data-testid="switch-leveling-enabled"
          />
        </CardHeader>
      </Card>

      {enabled && (
        <>
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="shrink-0 flex items-center justify-center w-9 h-9 rounded-md bg-accent/10 text-accent">
                  <Star className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-display">XP Settings</CardTitle>
                  <CardDescription className="text-xs mt-0.5">Configure how users earn experience points</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="xp-per-message" className="text-sm font-medium flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-muted-foreground" />
                    XP Per Message
                  </Label>
                  <Input
                    id="xp-per-message"
                    type="number"
                    min={1}
                    max={100}
                    value={xpPerMessage}
                    onChange={(e) => setXpPerMessage(parseInt(e.target.value) || 15)}
                    data-testid="input-xp-per-message"
                  />
                  <p className="text-xs text-muted-foreground">Base XP awarded for each message (1-100)</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="xp-cooldown" className="text-sm font-medium flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    Cooldown (seconds)
                  </Label>
                  <Input
                    id="xp-cooldown"
                    type="number"
                    min={0}
                    max={3600}
                    value={xpCooldown}
                    onChange={(e) => setXpCooldown(parseInt(e.target.value) || 0)}
                    data-testid="input-xp-cooldown"
                  />
                  <p className="text-xs text-muted-foreground">Minimum seconds between XP gains per user</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="shrink-0 flex items-center justify-center w-9 h-9 rounded-md bg-primary/10 text-primary">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-display">Level-Up Notifications</CardTitle>
                  <CardDescription className="text-xs mt-0.5">Configure where and how level-up messages appear</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="levelup-channel" className="text-sm font-medium flex items-center gap-2">
                  <Hash className="w-4 h-4 text-muted-foreground" />
                  Level-Up Channel ID
                </Label>
                <DiscordEntityPicker
                  value={levelUpChannelId}
                  onChange={setLevelUpChannelId}
                  options={textChannelOptions}
                  placeholder="Leave empty for current channel"
                  manualPlaceholder="Channel ID"
                  testIdPrefix="input-levelup-channel"
                />
                <p className="text-xs text-muted-foreground">Channel to send level-up messages. Leave blank to use the channel where the user leveled up.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="levelup-message" className="text-sm font-medium">Level-Up Message</Label>
                <Textarea
                  id="levelup-message"
                  value={levelUpMessage}
                  onChange={(e) => setLevelUpMessage(e.target.value)}
                  className="resize-none"
                  rows={3}
                  data-testid="input-levelup-message"
                />
                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary" className="text-xs">{"{user}"}</Badge>
                  <Badge variant="secondary" className="text-xs">{"{level}"}</Badge>
                  <Badge variant="secondary" className="text-xs">{"{role}"}</Badge>
                </div>
              </div>
              <div className="rounded-md bg-secondary/50 p-3">
                <p className="text-xs text-muted-foreground mb-1">Preview</p>
                <p className="text-sm" data-testid="text-levelup-preview">{previewMessage}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="shrink-0 flex items-center justify-center w-9 h-9 rounded-md bg-primary/10 text-primary">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-display">Role Rewards</CardTitle>
                  <CardDescription className="text-xs mt-0.5">Assign roles when users reach specific levels</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">Stack Rewards</Label>
                  <Switch
                    checked={stackRewards}
                    onCheckedChange={setStackRewards}
                    data-testid="switch-stack-rewards"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {stackRewards ? "Users keep all earned roles" : "Users only keep the highest earned role"}
                </p>
              </div>

              {roleRewards.length > 0 && (
                <div className="rounded-md border border-white/5 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5 bg-secondary/30">
                        <th className="text-left p-3 font-medium text-muted-foreground">Level</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Role</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Role ID</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roleRewards.map((reward) => (
                        <tr key={reward.level} className="border-b border-white/5 last:border-0" data-testid={`row-role-reward-${reward.level}`}>
                          <td className="p-3">
                            <Badge variant="secondary">{reward.level}</Badge>
                          </td>
                          <td className="p-3 font-medium">{reward.roleName}</td>
                          <td className="p-3 text-muted-foreground font-mono text-xs">{reward.roleId}</td>
                          <td className="p-3 text-right">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => removeRoleReward(reward.level)}
                              data-testid={`button-remove-reward-${reward.level}`}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex items-end gap-2 flex-wrap">
                <div className="space-y-1.5 flex-shrink-0">
                  <Label className="text-xs">Level</Label>
                  <Input
                    type="number"
                    min={1}
                    placeholder="5"
                    value={newRewardLevel}
                    onChange={(e) => setNewRewardLevel(e.target.value)}
                    className="w-20"
                    data-testid="input-reward-level"
                  />
                </div>
                <div className="space-y-1.5 flex-1 min-w-[180px]">
                  <DiscordEntityPicker
                    label="Role ID"
                    value={newRewardRoleId}
                    onChange={(value) => {
                      setNewRewardRoleId(value);
                      const selectedRole = (discordContext?.roles || []).find((role) => role.id === value);
                      if (selectedRole) setNewRewardRoleName(selectedRole.name);
                    }}
                    options={roleOptions}
                    placeholder="Select role..."
                    manualPlaceholder="Role ID"
                    testIdPrefix="input-reward-role-id"
                  />
                </div>
                <div className="space-y-1.5 flex-1 min-w-[120px]">
                  <Label className="text-xs">Role Name</Label>
                  <Input
                    placeholder="Role Name"
                    value={newRewardRoleName}
                    onChange={(e) => setNewRewardRoleName(e.target.value)}
                    data-testid="input-reward-role-name"
                  />
                </div>
                <Button onClick={addRoleReward} data-testid="button-add-reward">
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="shrink-0 flex items-center justify-center w-9 h-9 rounded-md bg-accent/10 text-accent">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-display">XP Multipliers</CardTitle>
                  <CardDescription className="text-xs mt-0.5">Give specific roles bonus XP per message</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {xpMultipliers.length > 0 && (
                <div className="space-y-2">
                  {xpMultipliers.map((mult) => (
                    <div
                      key={mult.roleId}
                      className="flex items-center justify-between gap-3 rounded-md bg-secondary/30 p-3"
                      data-testid={`row-multiplier-${mult.roleId}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Badge variant="secondary">{mult.multiplier}x</Badge>
                        <span className="font-medium truncate">{mult.roleName}</span>
                        <span className="text-xs text-muted-foreground font-mono">{mult.roleId}</span>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeMultiplier(mult.roleId)}
                        data-testid={`button-remove-multiplier-${mult.roleId}`}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-end gap-2 flex-wrap">
                <div className="space-y-1.5 flex-1 min-w-[180px]">
                  <DiscordEntityPicker
                    label="Role ID"
                    value={newMultRoleId}
                    onChange={(value) => {
                      setNewMultRoleId(value);
                      const selectedRole = (discordContext?.roles || []).find((role) => role.id === value);
                      if (selectedRole) setNewMultRoleName(selectedRole.name);
                    }}
                    options={roleOptions}
                    placeholder="Select role..."
                    manualPlaceholder="Role ID"
                    testIdPrefix="input-mult-role-id"
                  />
                </div>
                <div className="space-y-1.5 flex-1 min-w-[120px]">
                  <Label className="text-xs">Role Name</Label>
                  <Input
                    placeholder="e.g. Server Boosters"
                    value={newMultRoleName}
                    onChange={(e) => setNewMultRoleName(e.target.value)}
                    data-testid="input-mult-role-name"
                  />
                </div>
                <div className="space-y-1.5 flex-shrink-0">
                  <Label className="text-xs">Multiplier</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min={0.1}
                    max={10}
                    value={newMultValue}
                    onChange={(e) => setNewMultValue(e.target.value)}
                    className="w-24"
                    data-testid="input-mult-value"
                  />
                </div>
                <Button onClick={addMultiplier} data-testid="button-add-multiplier">
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="shrink-0 flex items-center justify-center w-9 h-9 rounded-md bg-destructive/10 text-destructive">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-display">Ignored Channels & Roles</CardTitle>
                  <CardDescription className="text-xs mt-0.5">These channels and roles will not earn any XP</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Hash className="w-4 h-4 text-muted-foreground" />
                  Ignored Channels
                </Label>
                <DiscordEntityListPicker
                  values={ignoredChannels}
                  onChange={setIgnoredChannels}
                  options={textChannelOptions}
                  placeholder="Add ignored channel..."
                  manualPlaceholder="Channel ID"
                  testIdPrefix="ignored-channels"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  Ignored Roles
                </Label>
                <DiscordEntityListPicker
                  values={ignoredRoles}
                  onChange={setIgnoredRoles}
                  options={roleOptions}
                  placeholder="Add ignored role..."
                  manualPlaceholder="Role ID"
                  testIdPrefix="ignored-roles"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="shrink-0 flex items-center justify-center w-9 h-9 rounded-md bg-primary/10 text-primary">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-display">Leaderboard Preview</CardTitle>
                  <CardDescription className="text-xs mt-0.5">Sample leaderboard display with mock data</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-white/5 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5 bg-secondary/30">
                      <th className="text-left p-3 font-medium text-muted-foreground w-12">#</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">User</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Level</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Total XP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_LEADERBOARD.map((entry) => (
                      <tr
                        key={entry.rank}
                        className="border-b border-white/5 last:border-0"
                        data-testid={`row-leaderboard-${entry.rank}`}
                      >
                        <td className="p-3">
                          {entry.rank <= 3 ? (
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                              entry.rank === 1 ? "bg-yellow-500/20 text-yellow-400" :
                              entry.rank === 2 ? "bg-gray-400/20 text-gray-300" :
                              "bg-amber-700/20 text-amber-500"
                            }`}>
                              {entry.rank}
                            </div>
                          ) : (
                            <span className="text-muted-foreground ml-2">{entry.rank}</span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                              {entry.avatar}
                            </div>
                            <span className="font-medium">{entry.name}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant="secondary">{entry.level}</Badge>
                        </td>
                        <td className="p-3 text-right text-muted-foreground font-mono text-xs">
                          {entry.xp.toLocaleString()} XP
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="shrink-0 flex items-center justify-center w-9 h-9 rounded-md bg-destructive/10 text-destructive">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-display">Reset Options</CardTitle>
                  <CardDescription className="text-xs mt-0.5">Reset XP data (these actions cannot be undone)</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-4 rounded-md bg-secondary/30 p-3 flex-wrap">
                <div>
                  <p className="text-sm font-medium">Reset User XP</p>
                  <p className="text-xs text-muted-foreground">Remove all XP from a specific user</p>
                </div>
                <Button variant="outline" size="sm" data-testid="button-reset-user-xp">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset User
                </Button>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-md bg-destructive/5 border border-destructive/10 p-3 flex-wrap">
                <div>
                  <p className="text-sm font-medium">Reset All XP</p>
                  <p className="text-xs text-muted-foreground">Remove all XP data for the entire server</p>
                </div>
                <Button variant="destructive" size="sm" data-testid="button-reset-all-xp">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Reset All
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
