import { useState } from "react";
import { Trash2, Plus, RefreshCw, Shield, ShieldAlert, UserCheck, Coins, Hash, AlertTriangle, Zap } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  useUpdateSettings,
  useLeveling,
  useUpdateLeveling,
  useStarboard,
  useUpdateStarboard,
  useReactionRoles,
  useCreateReactionRole,
  useDeleteReactionRole,
  useEconomyLeaderboard,
  useRoleShop,
  useCreateShopItem,
  useDeleteShopItem,
  useGiveaways,
  useCreateGiveaway,
  useDeleteGiveaway,
  useRerollGiveaway,
  usePolls,
  useCreatePoll,
  useDeletePoll,
} from "@/hooks/use-bot";

// ─── Shared helpers ───────────────────────────────────────────────────────────

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-[18px] border border-white/8 bg-[#0a0c0f] px-4 py-6 text-center text-sm text-white/40">
      {label}
    </div>
  );
}

function SectionRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[18px] border border-white/8 bg-white/[0.04] px-4 py-3">
      {children}
    </div>
  );
}

function PageWrap({ children }: { children: React.ReactNode }) {
  return <div className="space-y-3">{children}</div>;
}

// ─── Leveling ────────────────────────────────────────────────────────────────

export function LevelingPage({ serverId, channels }: { serverId: number; channels: any[] }) {
  const { toast } = useToast();
  const { data, isLoading } = useLeveling(serverId);
  const update = useUpdateLeveling(serverId);

  const [enabled, setEnabled] = useState<boolean>(() => data?.enabled ?? false);
  const [xpPerMessage, setXpPerMessage] = useState<string>(() => String(data?.xpPerMessage ?? 15));
  const [cooldown, setCooldown] = useState<string>(() => String(data?.cooldown ?? 60));
  const [levelUpChannel, setLevelUpChannel] = useState<string>(() => data?.levelUpChannelId ?? "");
  const [levelUpMessage, setLevelUpMessage] = useState<string>(() => data?.levelUpMessage ?? "Congrats {user}, you reached level {level}!");
  const [rewards, setRewards] = useState<Array<{ level: number; roleId: string }>>(() => data?.rewards ?? []);
  const [addingReward, setAddingReward] = useState(false);
  const [newRewardLevel, setNewRewardLevel] = useState("");
  const [newRewardRole, setNewRewardRole] = useState("");

  // Sync state when data loads
  if (!isLoading && data && rewards === (data?.rewards ?? [])) {
    // intentional no-op; initial state handles it
  }

  function handleSave() {
    update.mutate(
      {
        enabled,
        xpPerMessage: Number(xpPerMessage) || 15,
        cooldown: Number(cooldown) || 60,
        levelUpChannelId: levelUpChannel || null,
        levelUpMessage,
        rewards,
      },
      {
        onSuccess: () => toast({ title: "Leveling saved" }),
        onError: () => toast({ title: "Failed to save leveling", variant: "destructive" }),
      },
    );
  }

  function addReward() {
    if (!newRewardLevel || !newRewardRole) return;
    setRewards((prev) => [...prev, { level: Number(newRewardLevel), roleId: newRewardRole }]);
    setNewRewardLevel("");
    setNewRewardRole("");
    setAddingReward(false);
  }

  return (
    <PageWrap>
      <SectionRow>
        <span className="text-sm font-medium text-white">Enable leveling</span>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </SectionRow>

      <SectionRow>
        <span className="text-sm text-white/70">XP per message</span>
        <Input
          type="number"
          min={1}
          max={100}
          value={xpPerMessage}
          onChange={(e) => setXpPerMessage(e.target.value)}
          className="w-24 bg-transparent border-white/12 text-white text-right"
        />
      </SectionRow>

      <SectionRow>
        <span className="text-sm text-white/70">XP cooldown (seconds)</span>
        <Input
          type="number"
          min={0}
          value={cooldown}
          onChange={(e) => setCooldown(e.target.value)}
          className="w-24 bg-transparent border-white/12 text-white text-right"
        />
      </SectionRow>

      <div className="rounded-[18px] border border-white/8 bg-white/[0.04] px-4 py-3 space-y-2">
        <p className="text-sm text-white/70">Level-up channel</p>
        <Select value={levelUpChannel} onValueChange={setLevelUpChannel}>
          <SelectTrigger className="bg-transparent border-white/12 text-white">
            <SelectValue placeholder="Same channel as message" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Same channel as message</SelectItem>
            {channels.map((ch) => (
              <SelectItem key={ch.id} value={ch.id}>#{ch.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-[18px] border border-white/8 bg-white/[0.04] px-4 py-3 space-y-2">
        <p className="text-sm text-white/70">Level-up message <span className="text-white/38 text-xs ml-1">use {"{user}"} and {"{level}"}</span></p>
        <Input
          value={levelUpMessage}
          onChange={(e) => setLevelUpMessage(e.target.value)}
          className="bg-transparent border-white/12 text-white"
        />
      </div>

      <div className="rounded-[18px] border border-white/8 bg-white/[0.04] px-4 py-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-white">Role rewards</p>
          <Button size="sm" variant="ghost" className="text-white/60 hover:text-white" onClick={() => setAddingReward(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
        {rewards.length === 0 && !addingReward && <EmptyState label="No role rewards configured." />}
        {rewards.map((r, i) => (
          <div key={i} className="flex items-center gap-3 rounded-[14px] border border-white/8 bg-[#0a0c0f] px-3 py-2">
            <span className="text-xs text-white/50">Lvl</span>
            <span className="text-sm font-medium text-white">{r.level}</span>
            <span className="flex-1 text-sm text-white/70 truncate">{r.roleId}</span>
            <button
              type="button"
              onClick={() => setRewards((prev) => prev.filter((_, j) => j !== i))}
              className="text-red-500/70 hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {addingReward && (
          <div className="flex items-center gap-2 rounded-[14px] border border-white/12 bg-[#0a0c0f] px-3 py-2">
            <Input
              type="number"
              placeholder="Level"
              value={newRewardLevel}
              onChange={(e) => setNewRewardLevel(e.target.value)}
              className="w-20 bg-transparent border-white/10 text-white"
            />
            <Input
              placeholder="Role ID or name"
              value={newRewardRole}
              onChange={(e) => setNewRewardRole(e.target.value)}
              className="flex-1 bg-transparent border-white/10 text-white"
            />
            <Button size="sm" onClick={addReward} className="bg-red-700 hover:bg-red-600 text-white">Add</Button>
            <Button size="sm" variant="ghost" onClick={() => setAddingReward(false)} className="text-white/50">Cancel</Button>
          </div>
        )}
      </div>

      <Button
        onClick={handleSave}
        disabled={update.isPending}
        className="w-full bg-red-700 hover:bg-red-600 text-white font-semibold"
      >
        {update.isPending ? "Saving…" : "Save leveling settings"}
      </Button>
    </PageWrap>
  );
}

// ─── Giveaways ────────────────────────────────────────────────────────────────

export function GiveawaysPage({ serverId, channels }: { serverId: number; channels: any[] }) {
  const { toast } = useToast();
  const { data: giveaways = [], isLoading } = useGiveaways(serverId);
  const create = useCreateGiveaway(serverId);
  const remove = useDeleteGiveaway(serverId);
  const reroll = useRerollGiveaway(serverId);

  const [showForm, setShowForm] = useState(false);
  const [prize, setPrize] = useState("");
  const [channelId, setChannelId] = useState("");
  const [winners, setWinners] = useState("1");
  const [endsAt, setEndsAt] = useState("");

  function handleCreate() {
    if (!prize || !channelId || !endsAt) {
      toast({ title: "Fill in all fields", variant: "destructive" });
      return;
    }
    create.mutate(
      { prize, channelId, winners: Number(winners) || 1, endsAt },
      {
        onSuccess: () => {
          toast({ title: "Giveaway created" });
          setPrize(""); setChannelId(""); setWinners("1"); setEndsAt(""); setShowForm(false);
        },
        onError: () => toast({ title: "Failed to create giveaway", variant: "destructive" }),
      },
    );
  }

  return (
    <PageWrap>
      {isLoading && <EmptyState label="Loading giveaways…" />}
      {!isLoading && giveaways.length === 0 && <EmptyState label="No active giveaways." />}
      {(giveaways as any[]).map((g: any) => (
        <div key={g.id} className="flex items-center gap-3 rounded-[18px] border border-white/8 bg-white/[0.04] px-4 py-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{g.prize}</p>
            <p className="text-xs text-white/40 mt-0.5">
              #{channels.find((c) => c.id === g.channelId)?.name ?? g.channelId} · ends {g.endsAt ? new Date(g.endsAt).toLocaleDateString() : "—"} · {g.entryCount ?? 0} entries
            </p>
          </div>
          <button
            type="button"
            title="Reroll"
            onClick={() => reroll.mutate(g.id, { onSuccess: () => toast({ title: "Rerolled!" }), onError: () => toast({ title: "Reroll failed", variant: "destructive" }) })}
            className="text-white/40 hover:text-white"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => remove.mutate(g.id, { onSuccess: () => toast({ title: "Deleted" }), onError: () => toast({ title: "Delete failed", variant: "destructive" }) })}
            className="text-red-500/60 hover:text-red-500"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}

      {!showForm ? (
        <Button variant="ghost" className="w-full border border-dashed border-white/12 text-white/50 hover:text-white hover:border-white/24" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Giveaway
        </Button>
      ) : (
        <div className="rounded-[18px] border border-white/12 bg-white/[0.04] px-4 py-4 space-y-3">
          <p className="text-sm font-medium text-white">New giveaway</p>
          <Input
            placeholder="Prize"
            value={prize}
            onChange={(e) => setPrize(e.target.value)}
            className="bg-transparent border-white/12 text-white"
          />
          <Select value={channelId} onValueChange={setChannelId}>
            <SelectTrigger className="bg-transparent border-white/12 text-white">
              <SelectValue placeholder="Channel" />
            </SelectTrigger>
            <SelectContent>
              {channels.map((ch) => (
                <SelectItem key={ch.id} value={ch.id}>#{ch.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-3">
            <Input
              type="number"
              min={1}
              placeholder="Winners"
              value={winners}
              onChange={(e) => setWinners(e.target.value)}
              className="w-28 bg-transparent border-white/12 text-white"
            />
            <Input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="flex-1 bg-transparent border-white/12 text-white"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={create.isPending} className="bg-red-700 hover:bg-red-600 text-white">
              {create.isPending ? "Creating…" : "Create"}
            </Button>
            <Button variant="ghost" onClick={() => setShowForm(false)} className="text-white/50">Cancel</Button>
          </div>
        </div>
      )}
    </PageWrap>
  );
}

// ─── Starboard ────────────────────────────────────────────────────────────────

export function StarboardPage({ serverId, channels }: { serverId: number; channels: any[] }) {
  const { toast } = useToast();
  const { data, isLoading } = useStarboard(serverId);
  const update = useUpdateStarboard(serverId);

  const [enabled, setEnabled] = useState<boolean>(() => data?.enabled ?? false);
  const [channelId, setChannelId] = useState<string>(() => data?.channelId ?? "");
  const [threshold, setThreshold] = useState<string>(() => String(data?.threshold ?? 3));
  const [emoji, setEmoji] = useState<string>(() => data?.emoji ?? "⭐");
  const [selfStar, setSelfStar] = useState<boolean>(() => data?.selfStar ?? false);

  function handleSave() {
    update.mutate(
      {
        enabled,
        channelId: channelId || null,
        threshold: Number(threshold) || 3,
        emoji,
        selfStar,
      },
      {
        onSuccess: () => toast({ title: "Starboard saved" }),
        onError: () => toast({ title: "Failed to save starboard", variant: "destructive" }),
      },
    );
  }

  if (isLoading) return <EmptyState label="Loading…" />;

  return (
    <PageWrap>
      <SectionRow>
        <span className="text-sm font-medium text-white">Enable starboard</span>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </SectionRow>

      <div className="rounded-[18px] border border-white/8 bg-white/[0.04] px-4 py-3 space-y-2">
        <p className="text-sm text-white/70">Starboard channel</p>
        <Select value={channelId} onValueChange={setChannelId}>
          <SelectTrigger className="bg-transparent border-white/12 text-white">
            <SelectValue placeholder="Select channel" />
          </SelectTrigger>
          <SelectContent>
            {channels.map((ch) => (
              <SelectItem key={ch.id} value={ch.id}>#{ch.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <SectionRow>
        <span className="text-sm text-white/70">Threshold (reactions)</span>
        <Input
          type="number"
          min={1}
          max={20}
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
          className="w-20 bg-transparent border-white/12 text-white text-right"
        />
      </SectionRow>

      <SectionRow>
        <span className="text-sm text-white/70">Emoji</span>
        <Input
          value={emoji}
          onChange={(e) => setEmoji(e.target.value)}
          className="w-20 bg-transparent border-white/12 text-white text-center"
        />
      </SectionRow>

      <SectionRow>
        <span className="text-sm text-white/70">Allow self-star</span>
        <Switch checked={selfStar} onCheckedChange={setSelfStar} />
      </SectionRow>

      <Button
        onClick={handleSave}
        disabled={update.isPending}
        className="w-full bg-red-700 hover:bg-red-600 text-white font-semibold"
      >
        {update.isPending ? "Saving…" : "Save starboard settings"}
      </Button>
    </PageWrap>
  );
}

// ─── Economy ─────────────────────────────────────────────────────────────────

export function EconomyPage({ serverId }: { serverId: number }) {
  const { toast } = useToast();
  const { data: leaderboard = [], isLoading: lbLoading } = useEconomyLeaderboard(serverId);
  const { data: shopItems = [], isLoading: shopLoading } = useRoleShop(serverId);
  const createItem = useCreateShopItem(serverId);
  const deleteItem = useDeleteShopItem(serverId);

  const [showForm, setShowForm] = useState(false);
  const [itemRole, setItemRole] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemDesc, setItemDesc] = useState("");

  function handleCreate() {
    if (!itemRole || !itemPrice) {
      toast({ title: "Role and price are required", variant: "destructive" });
      return;
    }
    createItem.mutate(
      { roleId: itemRole, price: Number(itemPrice), description: itemDesc },
      {
        onSuccess: () => {
          toast({ title: "Shop item added" });
          setItemRole(""); setItemPrice(""); setItemDesc(""); setShowForm(false);
        },
        onError: () => toast({ title: "Failed to add item", variant: "destructive" }),
      },
    );
  }

  return (
    <PageWrap>
      <div className="rounded-[18px] border border-white/8 bg-white/[0.04] px-4 py-3 space-y-2">
        <p className="text-sm font-medium text-white">Economy leaderboard</p>
        {lbLoading && <EmptyState label="Loading…" />}
        {!lbLoading && (leaderboard as any[]).length === 0 && <EmptyState label="No economy data yet." />}
        {(leaderboard as any[]).slice(0, 10).map((entry: any, i: number) => (
          <div key={entry.userId ?? i} className="flex items-center gap-3 rounded-[14px] border border-white/8 bg-[#0a0c0f] px-3 py-2">
            <span className="text-xs font-bold text-white/30 w-6 text-right">#{i + 1}</span>
            <span className="flex-1 text-sm text-white truncate">{entry.username ?? entry.userId}</span>
            <span className="text-sm font-semibold text-white/80">{entry.balance?.toLocaleString() ?? 0}</span>
          </div>
        ))}
      </div>

      <div className="rounded-[18px] border border-white/8 bg-white/[0.04] px-4 py-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-white">Role shop</p>
          <Button size="sm" variant="ghost" className="text-white/60 hover:text-white" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add item
          </Button>
        </div>
        {shopLoading && <EmptyState label="Loading…" />}
        {!shopLoading && (shopItems as any[]).length === 0 && !showForm && <EmptyState label="No shop items yet." />}
        {(shopItems as any[]).map((item: any) => (
          <div key={item.id} className="flex items-center gap-3 rounded-[14px] border border-white/8 bg-[#0a0c0f] px-3 py-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{item.roleId}</p>
              {item.description && <p className="text-xs text-white/40 truncate">{item.description}</p>}
            </div>
            <span className="text-sm text-white/60">{item.price?.toLocaleString()}</span>
            <button
              type="button"
              onClick={() => deleteItem.mutate(item.id, { onSuccess: () => toast({ title: "Deleted" }), onError: () => toast({ title: "Delete failed", variant: "destructive" }) })}
              className="text-red-500/60 hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {showForm && (
          <div className="flex flex-col gap-2 rounded-[14px] border border-white/12 bg-[#0a0c0f] px-3 py-3">
            <Input
              placeholder="Role ID or name"
              value={itemRole}
              onChange={(e) => setItemRole(e.target.value)}
              className="bg-transparent border-white/10 text-white"
            />
            <Input
              type="number"
              placeholder="Price"
              value={itemPrice}
              onChange={(e) => setItemPrice(e.target.value)}
              className="bg-transparent border-white/10 text-white"
            />
            <Input
              placeholder="Description (optional)"
              value={itemDesc}
              onChange={(e) => setItemDesc(e.target.value)}
              className="bg-transparent border-white/10 text-white"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate} disabled={createItem.isPending} className="bg-red-700 hover:bg-red-600 text-white">
                {createItem.isPending ? "Adding…" : "Add"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)} className="text-white/50">Cancel</Button>
            </div>
          </div>
        )}
      </div>
    </PageWrap>
  );
}

// ─── Reaction Roles ───────────────────────────────────────────────────────────

export function ReactionRolesPage({ serverId, channels, roles }: { serverId: number; channels: any[]; roles: any[] }) {
  const { toast } = useToast();
  const { data: reactionRoles = [], isLoading } = useReactionRoles(serverId);
  const create = useCreateReactionRole(serverId);
  const remove = useDeleteReactionRole(serverId);

  const [showForm, setShowForm] = useState(false);
  const [channelId, setChannelId] = useState("");
  const [emoji, setEmoji] = useState("");
  const [roleId, setRoleId] = useState("");
  const [mode, setMode] = useState<"toggle" | "add" | "remove">("toggle");

  function handleCreate() {
    if (!channelId || !emoji || !roleId) {
      toast({ title: "Fill in all fields", variant: "destructive" });
      return;
    }
    create.mutate(
      { channelId, emoji, roleId, mode },
      {
        onSuccess: () => {
          toast({ title: "Reaction role created" });
          setChannelId(""); setEmoji(""); setRoleId(""); setMode("toggle"); setShowForm(false);
        },
        onError: () => toast({ title: "Failed to create reaction role", variant: "destructive" }),
      },
    );
  }

  return (
    <PageWrap>
      {isLoading && <EmptyState label="Loading…" />}
      {!isLoading && (reactionRoles as any[]).length === 0 && <EmptyState label="No reaction roles configured." />}
      {(reactionRoles as any[]).map((rr: any) => (
        <div key={rr.id} className="flex items-center gap-3 rounded-[18px] border border-white/8 bg-white/[0.04] px-4 py-3">
          <span className="text-xl leading-none">{rr.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{roles.find((r) => r.id === rr.roleId)?.name ?? rr.roleId}</p>
            <p className="text-xs text-white/40">
              #{channels.find((c) => c.id === rr.channelId)?.name ?? rr.channelId} · {rr.mode}
            </p>
          </div>
          <button
            type="button"
            onClick={() => remove.mutate(rr.id, { onSuccess: () => toast({ title: "Deleted" }), onError: () => toast({ title: "Delete failed", variant: "destructive" }) })}
            className="text-red-500/60 hover:text-red-500"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}

      {!showForm ? (
        <Button variant="ghost" className="w-full border border-dashed border-white/12 text-white/50 hover:text-white hover:border-white/24" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add reaction role
        </Button>
      ) : (
        <div className="rounded-[18px] border border-white/12 bg-white/[0.04] px-4 py-4 space-y-3">
          <p className="text-sm font-medium text-white">New reaction role</p>
          <Select value={channelId} onValueChange={setChannelId}>
            <SelectTrigger className="bg-transparent border-white/12 text-white">
              <SelectValue placeholder="Channel" />
            </SelectTrigger>
            <SelectContent>
              {channels.map((ch) => (
                <SelectItem key={ch.id} value={ch.id}>#{ch.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-3">
            <Input
              placeholder="Emoji (e.g. ✅)"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              className="w-32 bg-transparent border-white/12 text-white"
            />
            <Select value={roleId} onValueChange={setRoleId}>
              <SelectTrigger className="flex-1 bg-transparent border-white/12 text-white">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Select value={mode} onValueChange={(v) => setMode(v as any)}>
            <SelectTrigger className="bg-transparent border-white/12 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="toggle">Toggle</SelectItem>
              <SelectItem value="add">Add only</SelectItem>
              <SelectItem value="remove">Remove only</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={create.isPending} className="bg-red-700 hover:bg-red-600 text-white">
              {create.isPending ? "Creating…" : "Create"}
            </Button>
            <Button variant="ghost" onClick={() => setShowForm(false)} className="text-white/50">Cancel</Button>
          </div>
        </div>
      )}
    </PageWrap>
  );
}

// ─── Polls ────────────────────────────────────────────────────────────────────

export function PollsPage({ serverId, channels }: { serverId: number; channels: any[] }) {
  const { toast } = useToast();
  const { data: polls = [], isLoading } = usePolls(serverId);
  const create = useCreatePoll(serverId);
  const remove = useDeletePoll(serverId);

  const [showForm, setShowForm] = useState(false);
  const [channelId, setChannelId] = useState("");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const [endTime, setEndTime] = useState("");

  function handleCreate() {
    const validOptions = options.filter((o) => o.trim());
    if (!channelId || !question || validOptions.length < 2) {
      toast({ title: "Channel, question, and at least 2 options are required", variant: "destructive" });
      return;
    }
    create.mutate(
      { channelId, question, options: validOptions, allowMultiple, anonymous, endTime: endTime || undefined },
      {
        onSuccess: () => {
          toast({ title: "Poll created" });
          setChannelId(""); setQuestion(""); setOptions(["", ""]); setAllowMultiple(false); setAnonymous(false); setEndTime(""); setShowForm(false);
        },
        onError: () => toast({ title: "Failed to create poll", variant: "destructive" }),
      },
    );
  }

  return (
    <PageWrap>
      {isLoading && <EmptyState label="Loading…" />}
      {!isLoading && (polls as any[]).length === 0 && <EmptyState label="No active polls." />}
      {(polls as any[]).map((poll: any) => (
        <div key={poll.id} className="flex items-center gap-3 rounded-[18px] border border-white/8 bg-white/[0.04] px-4 py-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{poll.question}</p>
            <p className="text-xs text-white/40">
              #{channels.find((c) => c.id === poll.channelId)?.name ?? poll.channelId} · {poll.options?.length ?? 0} options
              {poll.endTime ? ` · ends ${new Date(poll.endTime).toLocaleDateString()}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => remove.mutate(poll.id, { onSuccess: () => toast({ title: "Deleted" }), onError: () => toast({ title: "Delete failed", variant: "destructive" }) })}
            className="text-red-500/60 hover:text-red-500"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}

      {!showForm ? (
        <Button variant="ghost" className="w-full border border-dashed border-white/12 text-white/50 hover:text-white hover:border-white/24" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" /> Create Poll
        </Button>
      ) : (
        <div className="rounded-[18px] border border-white/12 bg-white/[0.04] px-4 py-4 space-y-3">
          <p className="text-sm font-medium text-white">New poll</p>
          <Select value={channelId} onValueChange={setChannelId}>
            <SelectTrigger className="bg-transparent border-white/12 text-white">
              <SelectValue placeholder="Channel" />
            </SelectTrigger>
            <SelectContent>
              {channels.map((ch) => (
                <SelectItem key={ch.id} value={ch.id}>#{ch.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="bg-transparent border-white/12 text-white"
          />
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  placeholder={`Option ${i + 1}`}
                  value={opt}
                  onChange={(e) => setOptions((prev) => prev.map((o, j) => (j === i ? e.target.value : o)))}
                  className="flex-1 bg-transparent border-white/12 text-white"
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => setOptions((prev) => prev.filter((_, j) => j !== i))}
                    className="text-red-500/60 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            <Button size="sm" variant="ghost" onClick={() => setOptions((prev) => [...prev, ""])} className="text-white/50">
              <Plus className="h-4 w-4 mr-1" /> Add option
            </Button>
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer">
              <Switch checked={allowMultiple} onCheckedChange={setAllowMultiple} />
              Multiple choice
            </label>
            <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer">
              <Switch checked={anonymous} onCheckedChange={setAnonymous} />
              Anonymous
            </label>
          </div>
          <Input
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="bg-transparent border-white/12 text-white"
          />
          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={create.isPending} className="bg-red-700 hover:bg-red-600 text-white">
              {create.isPending ? "Creating…" : "Create"}
            </Button>
            <Button variant="ghost" onClick={() => setShowForm(false)} className="text-white/50">Cancel</Button>
          </div>
        </div>
      )}
    </PageWrap>
  );
}

// ─── Shared settings section header ──────────────────────────────────────────
function SettingSection({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[20px] bg-white/[0.03]">
      <div className="flex items-center gap-2.5 border-b border-white/[0.05] px-4 py-3">
        <div className="h-3.5 w-[2px] rounded-full bg-[#E0001A]" />
        <Icon className="h-3.5 w-3.5 text-white/30" />
        <p className="text-[11px] font-semibold uppercase tracking-widest text-white/35">{title}</p>
      </div>
      <div className="space-y-2 p-4">{children}</div>
    </div>
  );
}

function ToggleRow({ label, sub, checked, onChange }: { label: string; sub?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[14px] border border-white/[0.05] bg-white/[0.02] px-4 py-3">
      <div>
        <p className="text-[13px] font-medium text-white">{label}</p>
        {sub ? <p className="mt-0.5 text-[11px] text-white/35">{sub}</p> : null}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-white/35">{label}</p>
      {children}
    </div>
  );
}

function SaveBtn({ pending, onClick }: { pending: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={pending}
      className="w-full rounded-[18px] bg-[#E0001A] py-3 text-[13px] font-semibold text-white active:opacity-80 disabled:opacity-50">
      {pending ? "Saving..." : "Save Changes"}
    </button>
  );
}
