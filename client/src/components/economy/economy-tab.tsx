import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Coins,
  Plus,
  Trash2,
  Trophy,
  Settings,
  ShoppingBag,
  TrendingUp,
  Dice5,
  Edit,
  Save,
  User,
  History,
  AlertTriangle,
} from "lucide-react";

interface EconomyTabProps {
  serverId: number;
  settings: any;
}

interface RoleShopItem {
  id: number;
  roleId: string;
  roleName: string;
  price: number;
  duration: number;
  stock: number;
  totalSold: number;
  isActive: boolean;
  description: string | null;
}

interface EconomyAccount {
  id: number;
  userId: string;
  username: string | null;
  balance: number | null;
  totalEarned: number | null;
  totalSpent: number | null;
}

interface EconomyTransaction {
  id: number;
  userId: string;
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string | null;
  createdAt: string;
}

export function EconomyTab({ serverId, settings }: EconomyTabProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("settings");
  const [addShopOpen, setAddShopOpen] = useState(false);
  const [editShopItem, setEditShopItem] = useState<RoleShopItem | null>(null);
  const [adminUserId, setAdminUserId] = useState("");
  const [adminAmount, setAdminAmount] = useState("");
  const [adminAction, setAdminAction] = useState<"give" | "take">("give");
  const [txUserId, setTxUserId] = useState("");
  const [localSettings, setLocalSettings] = useState({
    economyEnabled: settings?.economyEnabled ?? false,
    economyCurrencyName: settings?.economyCurrencyName ?? "Coins",
    economyCurrencySymbol: settings?.economyCurrencySymbol ?? "🪙",
    economyStartingBalance: settings?.economyStartingBalance ?? 100,
    economyDailyMin: settings?.economyDailyMin ?? 50,
    economyDailyMax: settings?.economyDailyMax ?? 200,
    economyWorkMin: settings?.economyWorkMin ?? 20,
    economyWorkMax: settings?.economyWorkMax ?? 100,
    economyWorkMessages: settings?.economyWorkMessages ?? [],
    economyMessageRewardEnabled: settings?.economyMessageRewardEnabled ?? false,
    economyMessageRewardAmount: settings?.economyMessageRewardAmount ?? 5,
    economyVoiceRewardEnabled: settings?.economyVoiceRewardEnabled ?? false,
    economyVoiceRewardRate: settings?.economyVoiceRewardRate ?? 10,
    economyGamblingEnabled: settings?.economyGamblingEnabled ?? true,
    economyRobEnabled: settings?.economyRobEnabled ?? false,
    economyRobSuccessChance: settings?.economyRobSuccessChance ?? 40,
  });
  const [newWorkMessage, setNewWorkMessage] = useState("");
  const [shopForm, setShopForm] = useState({
    roleId: "",
    roleName: "",
    price: 100,
    duration: 0,
    stock: -1,
    description: "",
    isActive: true,
  });

  const { data: leaderboard, isLoading: loadingLeaderboard } = useQuery<EconomyAccount[]>({
    queryKey: ["/api/servers", serverId, "economy", "leaderboard"],
    queryFn: () => fetch(`/api/servers/${serverId}/economy/leaderboard`).then((r) => r.json()),
  });

  const { data: shopItems, isLoading: loadingShop } = useQuery<RoleShopItem[]>({
    queryKey: ["/api/servers", serverId, "shop"],
    queryFn: () => fetch(`/api/servers/${serverId}/shop`).then((r) => r.json()),
  });

  const { data: transactions, isLoading: loadingTx } = useQuery<EconomyTransaction[]>({
    queryKey: ["/api/servers", serverId, "economy", txUserId, "transactions"],
    queryFn: () => txUserId ? fetch(`/api/servers/${serverId}/economy/${txUserId}/transactions`).then((r) => r.json()) : Promise.resolve([]),
    enabled: !!txUserId,
  });

  const saveSettings = useMutation({
    mutationFn: (data: any) =>
      apiRequest("PATCH", `/api/servers/${serverId}/settings`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/servers", serverId] });
      toast({ title: "Economy settings saved" });
    },
    onError: () => toast({ title: "Failed to save settings", variant: "destructive" }),
  });

  const createShopItem = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/servers/${serverId}/shop`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/servers", serverId, "shop"] });
      setAddShopOpen(false);
      resetShopForm();
      toast({ title: "Shop item created" });
    },
    onError: () => toast({ title: "Failed to create shop item", variant: "destructive" }),
  });

  const updateShopItem = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest("PUT", `/api/servers/${serverId}/shop/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/servers", serverId, "shop"] });
      setEditShopItem(null);
      toast({ title: "Shop item updated" });
    },
    onError: () => toast({ title: "Failed to update shop item", variant: "destructive" }),
  });

  const deleteShopItem = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/servers/${serverId}/shop/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/servers", serverId, "shop"] });
      toast({ title: "Shop item deleted" });
    },
    onError: () => toast({ title: "Failed to delete shop item", variant: "destructive" }),
  });

  const adminAdjust = useMutation({
    mutationFn: ({ userId, amount, type }: { userId: string; amount: number; type: string }) =>
      apiRequest("POST", `/api/servers/${serverId}/economy/${userId}/adjust`, { amount, type, description: `Admin ${type}` }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/servers", serverId, "economy", "leaderboard"] });
      toast({ title: "Balance adjusted successfully" });
      setAdminUserId("");
      setAdminAmount("");
    },
    onError: () => toast({ title: "Failed to adjust balance", variant: "destructive" }),
  });

  function resetShopForm() {
    setShopForm({ roleId: "", roleName: "", price: 100, duration: 0, stock: -1, description: "", isActive: true });
  }

  function handleSaveSettings() {
    saveSettings.mutate(localSettings);
  }

  function handleAdminAdjust() {
    const userId = adminUserId.trim();
    const amt = parseInt(adminAmount);
    if (!userId || isNaN(amt) || amt <= 0) {
      toast({ title: "Enter a valid user ID and amount", variant: "destructive" });
      return;
    }
    adminAdjust.mutate({ userId, amount: adminAction === "give" ? amt : -amt, type: "admin" });
  }

  function openEditShopItem(item: RoleShopItem) {
    setEditShopItem(item);
    setShopForm({
      roleId: item.roleId,
      roleName: item.roleName,
      price: item.price,
      duration: item.duration,
      stock: item.stock,
      description: item.description || "",
      isActive: item.isActive,
    });
  }

  function handleAddWorkMessage() {
    if (!newWorkMessage.trim()) return;
    setLocalSettings((prev) => ({
      ...prev,
      economyWorkMessages: [...(prev.economyWorkMessages || []), newWorkMessage.trim()],
    }));
    setNewWorkMessage("");
  }

  function handleRemoveWorkMessage(idx: number) {
    setLocalSettings((prev) => ({
      ...prev,
      economyWorkMessages: prev.economyWorkMessages.filter((_: string, i: number) => i !== idx),
    }));
  }

  const currencySymbol = localSettings.economyCurrencySymbol || "🪙";
  const currencyName = localSettings.economyCurrencyName || "Coins";

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
          <div>
            <CardTitle className="font-display flex items-center gap-2">
              <Coins className="w-5 h-5 text-primary" />
              Server Economy
            </CardTitle>
            <CardDescription>
              A full virtual economy system — currency, income, gambling, role shop, and leaderboards.
            </CardDescription>
          </div>
          <Switch
            checked={localSettings.economyEnabled}
            onCheckedChange={(v) => setLocalSettings((p) => ({ ...p, economyEnabled: v }))}
            data-testid="switch-economy-enabled"
          />
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card border border-white/5 w-full flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="settings" data-testid="tab-economy-settings" className="flex items-center gap-1.5">
            <Settings className="w-3.5 h-3.5" /> Settings
          </TabsTrigger>
          <TabsTrigger value="income" data-testid="tab-economy-income" className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" /> Income Sources
          </TabsTrigger>
          <TabsTrigger value="gambling" data-testid="tab-economy-gambling" className="flex items-center gap-1.5">
            <Dice5 className="w-3.5 h-3.5" /> Gambling
          </TabsTrigger>
          <TabsTrigger value="shop" data-testid="tab-economy-shop" className="flex items-center gap-1.5">
            <ShoppingBag className="w-3.5 h-3.5" /> Role Shop
          </TabsTrigger>
          <TabsTrigger value="leaderboard" data-testid="tab-economy-leaderboard" className="flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5" /> Leaderboard
          </TabsTrigger>
          <TabsTrigger value="admin" data-testid="tab-economy-admin" className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" /> Admin Tools
          </TabsTrigger>
        </TabsList>

        {/* ---- SETTINGS TAB ---- */}
        <TabsContent value="settings" className="mt-4 space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="font-display text-base">Currency Settings</CardTitle>
              <CardDescription>Define the currency used in your economy.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currency-name">Currency Name</Label>
                <Input
                  id="currency-name"
                  value={localSettings.economyCurrencyName}
                  onChange={(e) => setLocalSettings((p) => ({ ...p, economyCurrencyName: e.target.value }))}
                  placeholder="Coins"
                  data-testid="input-currency-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency-symbol">Currency Symbol</Label>
                <Input
                  id="currency-symbol"
                  value={localSettings.economyCurrencySymbol}
                  onChange={(e) => setLocalSettings((p) => ({ ...p, economyCurrencySymbol: e.target.value }))}
                  placeholder="🪙"
                  data-testid="input-currency-symbol"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="starting-balance">Starting Balance</Label>
                <Input
                  id="starting-balance"
                  type="number"
                  min={0}
                  value={localSettings.economyStartingBalance}
                  onChange={(e) => setLocalSettings((p) => ({ ...p, economyStartingBalance: parseInt(e.target.value) || 0 }))}
                  data-testid="input-starting-balance"
                />
                <p className="text-xs text-muted-foreground">Given to new members on first use.</p>
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-end">
            <Button
              onClick={handleSaveSettings}
              disabled={saveSettings.isPending}
              data-testid="button-save-economy-settings"
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              {saveSettings.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </TabsContent>

        {/* ---- INCOME TAB ---- */}
        <TabsContent value="income" className="mt-4 space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="font-display text-base">Daily Reward</CardTitle>
              <CardDescription>Users can claim once per day with /daily.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Min Reward ({currencySymbol})</Label>
                <Input
                  type="number"
                  min={0}
                  value={localSettings.economyDailyMin}
                  onChange={(e) => setLocalSettings((p) => ({ ...p, economyDailyMin: parseInt(e.target.value) || 0 }))}
                  data-testid="input-daily-min"
                />
              </div>
              <div className="space-y-2">
                <Label>Max Reward ({currencySymbol})</Label>
                <Input
                  type="number"
                  min={0}
                  value={localSettings.economyDailyMax}
                  onChange={(e) => setLocalSettings((p) => ({ ...p, economyDailyMax: parseInt(e.target.value) || 0 }))}
                  data-testid="input-daily-max"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="font-display text-base">Work Command</CardTitle>
              <CardDescription>Users earn coins with /work (per cooldown). Add custom messages.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Min Reward ({currencySymbol})</Label>
                  <Input
                    type="number"
                    min={0}
                    value={localSettings.economyWorkMin}
                    onChange={(e) => setLocalSettings((p) => ({ ...p, economyWorkMin: parseInt(e.target.value) || 0 }))}
                    data-testid="input-work-min"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Reward ({currencySymbol})</Label>
                  <Input
                    type="number"
                    min={0}
                    value={localSettings.economyWorkMax}
                    onChange={(e) => setLocalSettings((p) => ({ ...p, economyWorkMax: parseInt(e.target.value) || 0 }))}
                    data-testid="input-work-max"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Work Messages</Label>
                <p className="text-xs text-muted-foreground">Random message shown when someone uses /work. Leave empty for default.</p>
                <div className="flex gap-2">
                  <Input
                    value={newWorkMessage}
                    onChange={(e) => setNewWorkMessage(e.target.value)}
                    placeholder="You fixed some bugs and earned {amount} coins!"
                    onKeyDown={(e) => e.key === "Enter" && handleAddWorkMessage()}
                    data-testid="input-work-message"
                  />
                  <Button size="icon" variant="outline" onClick={handleAddWorkMessage} data-testid="button-add-work-message">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {(localSettings.economyWorkMessages || []).map((msg: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-sm bg-secondary/40 rounded-md px-3 py-1.5">
                      <span className="flex-1 truncate" data-testid={`text-work-message-${i}`}>{msg}</span>
                      <button onClick={() => handleRemoveWorkMessage(i)} className="shrink-0 text-muted-foreground hover:text-destructive transition-colors" data-testid={`button-remove-work-message-${i}`}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="font-display text-base">Passive Income</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4 p-4 rounded-md bg-secondary/20 border border-white/5">
                <div>
                  <p className="text-sm font-medium">Message Rewards</p>
                  <p className="text-xs text-muted-foreground">Earn {currencySymbol} per message sent in any channel.</p>
                </div>
                <Switch
                  checked={localSettings.economyMessageRewardEnabled}
                  onCheckedChange={(v) => setLocalSettings((p) => ({ ...p, economyMessageRewardEnabled: v }))}
                  data-testid="switch-message-reward"
                />
              </div>
              {localSettings.economyMessageRewardEnabled && (
                <div className="space-y-2">
                  <Label>Coins per Message</Label>
                  <Input
                    type="number"
                    min={1}
                    value={localSettings.economyMessageRewardAmount}
                    onChange={(e) => setLocalSettings((p) => ({ ...p, economyMessageRewardAmount: parseInt(e.target.value) || 1 }))}
                    className="max-w-[140px]"
                    data-testid="input-message-reward-amount"
                  />
                </div>
              )}

              <div className="flex items-center justify-between gap-4 p-4 rounded-md bg-secondary/20 border border-white/5">
                <div>
                  <p className="text-sm font-medium">Voice Time Rewards</p>
                  <p className="text-xs text-muted-foreground">Earn {currencySymbol} per minute spent in voice channels.</p>
                </div>
                <Switch
                  checked={localSettings.economyVoiceRewardEnabled}
                  onCheckedChange={(v) => setLocalSettings((p) => ({ ...p, economyVoiceRewardEnabled: v }))}
                  data-testid="switch-voice-reward"
                />
              </div>
              {localSettings.economyVoiceRewardEnabled && (
                <div className="space-y-2">
                  <Label>Coins per Minute in Voice</Label>
                  <Input
                    type="number"
                    min={1}
                    value={localSettings.economyVoiceRewardRate}
                    onChange={(e) => setLocalSettings((p) => ({ ...p, economyVoiceRewardRate: parseInt(e.target.value) || 1 }))}
                    className="max-w-[140px]"
                    data-testid="input-voice-reward-rate"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="font-display text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                Rob Command
              </CardTitle>
              <CardDescription>Allow members to attempt to steal coins from each other.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <Label>Enable /rob command</Label>
                <Switch
                  checked={localSettings.economyRobEnabled}
                  onCheckedChange={(v) => setLocalSettings((p) => ({ ...p, economyRobEnabled: v }))}
                  data-testid="switch-rob-enabled"
                />
              </div>
              {localSettings.economyRobEnabled && (
                <div className="space-y-2">
                  <Label>Success Chance (%)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={localSettings.economyRobSuccessChance}
                    onChange={(e) => setLocalSettings((p) => ({ ...p, economyRobSuccessChance: parseInt(e.target.value) || 40 }))}
                    className="max-w-[140px]"
                    data-testid="input-rob-success-chance"
                  />
                  <p className="text-xs text-muted-foreground">Chance of a successful rob. On failure, the robber pays a fine.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              onClick={handleSaveSettings}
              disabled={saveSettings.isPending}
              data-testid="button-save-income-settings"
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              {saveSettings.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </TabsContent>

        {/* ---- GAMBLING TAB ---- */}
        <TabsContent value="gambling" className="mt-4 space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="font-display text-base flex items-center gap-2">
                <Dice5 className="w-4 h-4 text-primary" />
                Gambling Games
              </CardTitle>
              <CardDescription>Enable or disable each gambling game available via slash commands.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-4 p-4 rounded-md bg-secondary/20 border border-white/5">
                <div>
                  <p className="text-sm font-medium">Enable All Gambling</p>
                  <p className="text-xs text-muted-foreground">Master toggle for all gambling commands.</p>
                </div>
                <Switch
                  checked={localSettings.economyGamblingEnabled}
                  onCheckedChange={(v) => setLocalSettings((p) => ({ ...p, economyGamblingEnabled: v }))}
                  data-testid="switch-gambling-enabled"
                />
              </div>

              {localSettings.economyGamblingEnabled && (
                <div className="space-y-2 pl-2">
                  {[
                    { key: "coinflip", label: "Coin Flip", desc: "/coinflip [amount] [heads/tails] — 50/50 chance, doubles the bet." },
                    { key: "slots", label: "Slots", desc: "/slots [bet] — Spin the slots for variable payout." },
                    { key: "blackjack", label: "Blackjack", desc: "/blackjack [bet] — Classic card game vs the dealer." },
                  ].map((game) => (
                    <div key={game.key} className="flex items-start gap-3 p-3 rounded-md border border-white/5 bg-card/40">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{game.label}</p>
                        <p className="text-xs text-muted-foreground">{game.desc}</p>
                      </div>
                      <Badge variant="secondary" data-testid={`badge-game-${game.key}`}>Active</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <div className="flex justify-end">
            <Button
              onClick={handleSaveSettings}
              disabled={saveSettings.isPending}
              data-testid="button-save-gambling-settings"
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              {saveSettings.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </TabsContent>

        {/* ---- ROLE SHOP TAB ---- */}
        <TabsContent value="shop" className="mt-4 space-y-4">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
              <div>
                <CardTitle className="font-display text-base flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-primary" />
                  Role Shop
                </CardTitle>
                <CardDescription>Roles members can purchase with {currencyName}. Use /shop and /buy in Discord.</CardDescription>
              </div>
              <Dialog open={addShopOpen} onOpenChange={setAddShopOpen}>
                <DialogTrigger asChild>
                  <Button size="default" className="gap-2" data-testid="button-add-shop-item">
                    <Plus className="w-4 h-4" />
                    Add Role
                  </Button>
                </DialogTrigger>
                <DialogContent className="glass-card max-w-md">
                  <DialogHeader>
                    <DialogTitle className="font-display">Add Shop Item</DialogTitle>
                  </DialogHeader>
                  <ShopItemForm
                    form={shopForm}
                    setForm={setShopForm}
                    currencySymbol={currencySymbol}
                    onSubmit={() => createShopItem.mutate(shopForm)}
                    isPending={createShopItem.isPending}
                    submitLabel="Add to Shop"
                  />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {loadingShop ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : !shopItems || shopItems.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No items in the shop yet. Add a purchasable role to get started.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Role</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Sold</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shopItems.map((item) => (
                      <TableRow key={item.id} data-testid={`row-shop-item-${item.id}`}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{item.roleName}</p>
                            {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">{currencySymbol} {item.price.toLocaleString()}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{item.duration === 0 ? "Permanent" : `${item.duration}m`}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{item.stock === -1 ? "Unlimited" : item.stock}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{item.totalSold}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.isActive ? "default" : "secondary"} data-testid={`badge-shop-item-status-${item.id}`}>
                            {item.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Dialog open={editShopItem?.id === item.id} onOpenChange={(open) => !open && setEditShopItem(null)}>
                              <DialogTrigger asChild>
                                <Button size="icon" variant="ghost" onClick={() => openEditShopItem(item)} data-testid={`button-edit-shop-item-${item.id}`}>
                                  <Edit className="w-3.5 h-3.5" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="glass-card max-w-md">
                                <DialogHeader>
                                  <DialogTitle className="font-display">Edit Shop Item</DialogTitle>
                                </DialogHeader>
                                <ShopItemForm
                                  form={shopForm}
                                  setForm={setShopForm}
                                  currencySymbol={currencySymbol}
                                  onSubmit={() => updateShopItem.mutate({ id: item.id, data: shopForm })}
                                  isPending={updateShopItem.isPending}
                                  submitLabel="Save Changes"
                                />
                              </DialogContent>
                            </Dialog>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => deleteShopItem.mutate(item.id)}
                              disabled={deleteShopItem.isPending}
                              data-testid={`button-delete-shop-item-${item.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="font-display text-sm text-muted-foreground">Available Commands</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {["/shop", "/buy [role-name]"].map((cmd) => (
                  <div key={cmd} className="font-mono text-xs bg-secondary/40 px-3 py-2 rounded-md text-muted-foreground">
                    {cmd}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- LEADERBOARD TAB ---- */}
        <TabsContent value="leaderboard" className="mt-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="font-display text-base flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" />
                Richest Members
              </CardTitle>
              <CardDescription>Top 10 members by {currencyName} balance.</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingLeaderboard ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : !leaderboard || leaderboard.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No economy data yet. Members earn coins by using bot commands.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {leaderboard.map((account, index) => (
                    <div
                      key={account.id}
                      className="flex items-center gap-4 p-3 rounded-md bg-secondary/20 border border-white/5"
                      data-testid={`row-leaderboard-${index}`}
                    >
                      <span
                        className={`text-lg font-bold font-display w-8 text-center shrink-0 ${
                          index === 0 ? "text-yellow-400" : index === 1 ? "text-slate-300" : index === 2 ? "text-amber-600" : "text-muted-foreground"
                        }`}
                        data-testid={`text-leaderboard-rank-${index}`}
                      >
                        #{index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate" data-testid={`text-leaderboard-username-${index}`}>
                          {account.username || account.userId}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Earned: {(account.totalEarned || 0).toLocaleString()} · Spent: {(account.totalSpent || 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono font-bold text-primary" data-testid={`text-leaderboard-balance-${index}`}>
                          {currencySymbol} {(account.balance || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- ADMIN TOOLS TAB ---- */}
        <TabsContent value="admin" className="mt-4 space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="font-display text-base">Give / Take Coins</CardTitle>
              <CardDescription>Manually adjust a member's balance.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Action</Label>
                  <Select value={adminAction} onValueChange={(v: "give" | "take") => setAdminAction(v)}>
                    <SelectTrigger data-testid="select-admin-action">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="give">Give Coins</SelectItem>
                      <SelectItem value="take">Take Coins</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Discord User ID</Label>
                  <Input
                    value={adminUserId}
                    onChange={(e) => setAdminUserId(e.target.value)}
                    placeholder="123456789012345678"
                    data-testid="input-admin-user-id"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Amount ({currencySymbol})</Label>
                  <Input
                    type="number"
                    min={1}
                    value={adminAmount}
                    onChange={(e) => setAdminAmount(e.target.value)}
                    placeholder="100"
                    data-testid="input-admin-amount"
                  />
                </div>
              </div>
              <Button
                onClick={handleAdminAdjust}
                disabled={adminAdjust.isPending}
                data-testid="button-admin-adjust"
                className="gap-2"
              >
                <Coins className="w-4 h-4" />
                {adminAdjust.isPending ? "Adjusting..." : adminAction === "give" ? "Give Coins" : "Take Coins"}
              </Button>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="font-display text-base flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                Transaction History
              </CardTitle>
              <CardDescription>View recent transactions for a specific user.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={txUserId}
                  onChange={(e) => setTxUserId(e.target.value)}
                  placeholder="Discord User ID"
                  className="max-w-xs"
                  data-testid="input-tx-user-id"
                />
                <Button
                  variant="outline"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/servers", serverId, "economy", txUserId, "transactions"] })}
                  data-testid="button-load-transactions"
                >
                  Load
                </Button>
              </div>

              {loadingTx ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : transactions && transactions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Balance After</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.id} data-testid={`row-transaction-${tx.id}`}>
                        <TableCell>
                          <Badge variant="secondary" data-testid={`badge-tx-type-${tx.id}`}>{tx.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className={`font-mono text-sm font-medium ${tx.amount >= 0 ? "text-green-400" : "text-destructive"}`} data-testid={`text-tx-amount-${tx.id}`}>
                            {tx.amount >= 0 ? "+" : ""}{tx.amount.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm" data-testid={`text-tx-balance-${tx.id}`}>{tx.balanceAfter.toLocaleString()}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">{tx.description}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleDateString()}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : txUserId ? (
                <p className="text-sm text-muted-foreground text-center py-4">No transactions found for this user.</p>
              ) : null}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="font-display text-sm text-muted-foreground">Economy Slash Commands</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {[
                  "/balance [@user]",
                  "/daily",
                  "/work",
                  "/transfer @user amount",
                  "/shop",
                  "/buy role-name",
                  "/slots [bet]",
                  "/coinflip [bet] [h/t]",
                  "/pay @user amount",
                  "/richest",
                  "/transactions [@user]",
                  "/rob @user",
                ].map((cmd) => (
                  <div key={cmd} className="font-mono text-xs bg-secondary/40 px-3 py-2 rounded-md text-muted-foreground">
                    {cmd}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ShopItemForm({
  form,
  setForm,
  currencySymbol,
  onSubmit,
  isPending,
  submitLabel,
}: {
  form: any;
  setForm: (fn: (prev: any) => any) => void;
  currencySymbol: string;
  onSubmit: () => void;
  isPending: boolean;
  submitLabel: string;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Role ID</Label>
          <Input
            value={form.roleId}
            onChange={(e) => setForm((p: any) => ({ ...p, roleId: e.target.value }))}
            placeholder="123456789..."
            data-testid="input-shop-role-id"
          />
        </div>
        <div className="space-y-2">
          <Label>Role Name</Label>
          <Input
            value={form.roleName}
            onChange={(e) => setForm((p: any) => ({ ...p, roleName: e.target.value }))}
            placeholder="VIP"
            data-testid="input-shop-role-name"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Price ({currencySymbol})</Label>
          <Input
            type="number"
            min={1}
            value={form.price}
            onChange={(e) => setForm((p: any) => ({ ...p, price: parseInt(e.target.value) || 1 }))}
            data-testid="input-shop-price"
          />
        </div>
        <div className="space-y-2">
          <Label>Duration (minutes)</Label>
          <Input
            type="number"
            min={0}
            value={form.duration}
            onChange={(e) => setForm((p: any) => ({ ...p, duration: parseInt(e.target.value) || 0 }))}
            placeholder="0 = permanent"
            data-testid="input-shop-duration"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Stock (-1 = unlimited)</Label>
        <Input
          type="number"
          min={-1}
          value={form.stock}
          onChange={(e) => setForm((p: any) => ({ ...p, stock: parseInt(e.target.value) ?? -1 }))}
          data-testid="input-shop-stock"
        />
      </div>
      <div className="space-y-2">
        <Label>Description (optional)</Label>
        <Textarea
          value={form.description}
          onChange={(e) => setForm((p: any) => ({ ...p, description: e.target.value }))}
          placeholder="A special role for dedicated members."
          rows={2}
          data-testid="input-shop-description"
        />
      </div>
      <div className="flex items-center justify-between gap-4">
        <Label>Active (visible in /shop)</Label>
        <Switch
          checked={form.isActive}
          onCheckedChange={(v) => setForm((p: any) => ({ ...p, isActive: v }))}
          data-testid="switch-shop-active"
        />
      </div>
      <Button
        onClick={onSubmit}
        disabled={isPending || !form.roleId || !form.roleName}
        className="w-full gap-2"
        data-testid="button-submit-shop-item"
      >
        <Save className="w-4 h-4" />
        {isPending ? "Saving..." : submitLabel}
      </Button>
    </div>
  );
}
