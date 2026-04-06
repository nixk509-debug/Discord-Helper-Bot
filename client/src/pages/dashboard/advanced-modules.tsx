import { useState } from "react";
import { Shield, ShieldAlert, UserCheck, Coins, Hash, AlertTriangle, Zap, Trash2, Plus, Gift, Star, Cake, Trophy } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useUpdateSettings, useLeveling, useUpdateLeveling } from "@/hooks/use-bot";

// ─── Primitives ───────────────────────────────────────────────────────────────

function PageWrap({ children }: { children: React.ReactNode }) {
  return <div className="space-y-3">{children}</div>;
}

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
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-white">{label}</p>
        {sub ? <p className="mt-0.5 text-[11px] text-white/35">{sub}</p> : null}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function FieldRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-white/35">{label}</p>
      {children}
      {hint ? <p className="text-[10px] text-white/25">{hint}</p> : null}
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

function ChPicker({ channels, value, onChange, placeholder = "Select channel" }: { channels: any[]; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="bg-transparent border-white/12 text-white"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="">None</SelectItem>
        {channels.filter((c) => c.isTextBased).map((c) => <SelectItem key={c.id} value={c.id}>#{c.name}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function RolePicker({ roles, value, onChange, placeholder = "Select role" }: { roles: any[]; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="bg-transparent border-white/12 text-white"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="">None</SelectItem>
        {roles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function MultiTagPicker<T extends string>({
  label, hint, options, selected, onAdd, onRemove, getLabel,
}: {
  label: string; hint?: string; options: { id: T; name: string }[];
  selected: T[]; onAdd: (v: T) => void; onRemove: (v: T) => void;
  getLabel?: (id: T) => string;
}) {
  const available = options.filter((o) => !selected.includes(o.id));
  return (
    <FieldRow label={label} hint={hint}>
      <Select value="" onValueChange={(v) => onAdd(v as T)}>
        <SelectTrigger className="bg-transparent border-white/12 text-white"><SelectValue placeholder="Add..." /></SelectTrigger>
        <SelectContent>{available.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
      </Select>
      {selected.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selected.map((id) => (
            <button key={id} type="button" onClick={() => onRemove(id)}
              className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/60 hover:border-[#E0001A]/30 hover:text-white/80">
              {getLabel ? getLabel(id) : id} <span className="text-white/30">✕</span>
            </button>
          ))}
        </div>
      )}
    </FieldRow>
  );
}

// ─── AutoMod ─────────────────────────────────────────────────────────────────
export function AutoModPage({ serverId, server, channels, roles }: { serverId: number; server: any; channels: any[]; roles: any[] }) {
  const { toast } = useToast();
  const update = useUpdateSettings(serverId);
  const s = server?.settings ?? {};

  const [enabled, setEnabled] = useState<boolean>(() => s.automodEnabled ?? false);
  const [antiSpam, setAntiSpam] = useState<boolean>(() => s.antiSpamEnabled ?? false);
  const [antiLink, setAntiLink] = useState<boolean>(() => s.antiLinkEnabled ?? false);
  const [antiCaps, setAntiCaps] = useState<boolean>(() => s.antiCapsEnabled ?? false);
  const [antiEmoji, setAntiEmoji] = useState<boolean>(() => s.antiEmojiSpamEnabled ?? false);
  const [antiMention, setAntiMention] = useState<boolean>(() => s.antiMassMentionEnabled ?? false);
  const [antiInvite, setAntiInvite] = useState<boolean>(() => s.antiInviteEnabled ?? false);
  const [antiPhishing, setAntiPhishing] = useState<boolean>(() => s.antiPhishingEnabled ?? false);
  const [antiZalgo, setAntiZalgo] = useState<boolean>(() => s.antiZalgoEnabled ?? false);
  const [maxMentions, setMaxMentions] = useState<string>(() => String(s.maxMentions ?? 5));
  const [capsThreshold, setCapsThreshold] = useState<string>(() => String(s.capsThreshold ?? 70));
  const [action, setAction] = useState<string>(() => s.automodAction ?? "delete");
  const [modLogChannel, setModLogChannel] = useState<string>(() => s.modLogChannelId ?? "");
  const [muteRole, setMuteRole] = useState<string>(() => s.muteRoleId ?? "");
  const [bannedWords, setBannedWords] = useState<string>(() => (s.bannedWords ?? []).join(", "));
  const [whitelistRoles, setWhitelistRoles] = useState<string[]>(() => s.automodWhitelistedRoles ?? []);
  const [whitelistChannels, setWhitelistChannels] = useState<string[]>(() => s.automodWhitelistedChannels ?? []);

  function handleSave() {
    update.mutate({
      automodEnabled: enabled, antiSpamEnabled: antiSpam, antiLinkEnabled: antiLink,
      antiCapsEnabled: antiCaps, antiEmojiSpamEnabled: antiEmoji, antiMassMentionEnabled: antiMention,
      antiInviteEnabled: antiInvite, antiPhishingEnabled: antiPhishing, antiZalgoEnabled: antiZalgo,
      maxMentions: Number(maxMentions) || 5, capsThreshold: Number(capsThreshold) || 70,
      automodAction: action, modLogChannelId: modLogChannel || null, muteRoleId: muteRole || null,
      bannedWords: bannedWords.split(",").map((w) => w.trim()).filter(Boolean),
      automodWhitelistedRoles: whitelistRoles, automodWhitelistedChannels: whitelistChannels,
    }, {
      onSuccess: () => toast({ title: "AutoMod saved" }),
      onError: () => toast({ title: "Failed to save", variant: "destructive" }),
    });
  }

  const textChannels = channels.filter((c) => c.isTextBased);

  return (
    <PageWrap>
      <SettingSection icon={Shield} title="Master Switch">
        <ToggleRow label="Enable AutoMod" sub="Gate for all filters below" checked={enabled} onChange={setEnabled} />
      </SettingSection>

      <SettingSection icon={ShieldAlert} title="Filters">
        <ToggleRow label="Anti-Spam" sub="Delete repeated or rapid messages" checked={antiSpam} onChange={setAntiSpam} />
        <ToggleRow label="Anti-Link" sub="Block raw URLs from non-exempt members" checked={antiLink} onChange={setAntiLink} />
        <ToggleRow label="Anti-Caps" sub="Catch excessive capitalization" checked={antiCaps} onChange={setAntiCaps} />
        <ToggleRow label="Anti-Emoji Spam" sub="Limit emoji floods" checked={antiEmoji} onChange={setAntiEmoji} />
        <ToggleRow label="Anti-Mass Mention" sub="Cap @mention count per message" checked={antiMention} onChange={setAntiMention} />
        <ToggleRow label="Anti-Invite" sub="Block Discord invite links" checked={antiInvite} onChange={setAntiInvite} />
        <ToggleRow label="Anti-Phishing" sub="Detect known scam/phishing domains" checked={antiPhishing} onChange={setAntiPhishing} />
        <ToggleRow label="Anti-Zalgo" sub="Strip corrupted / zalgo text" checked={antiZalgo} onChange={setAntiZalgo} />
        <div className="mt-1 grid gap-3 sm:grid-cols-2">
          <FieldRow label="Max mentions per message">
            <Input type="number" min={1} max={50} value={maxMentions} onChange={(e) => setMaxMentions(e.target.value)}
              className="bg-transparent border-white/12 text-white" />
          </FieldRow>
          <FieldRow label="Caps threshold (%)">
            <Input type="number" min={10} max={100} value={capsThreshold} onChange={(e) => setCapsThreshold(e.target.value)}
              className="bg-transparent border-white/12 text-white" />
          </FieldRow>
        </div>
      </SettingSection>

      <SettingSection icon={AlertTriangle} title="Action & Logging">
        <FieldRow label="AutoMod action">
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger className="bg-transparent border-white/12 text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="delete">Delete message</SelectItem>
              <SelectItem value="warn">Warn user</SelectItem>
              <SelectItem value="mute">Timeout / mute</SelectItem>
              <SelectItem value="kick">Kick</SelectItem>
              <SelectItem value="ban">Ban</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>
        <FieldRow label="Mod log channel">
          <ChPicker channels={channels} value={modLogChannel} onChange={setModLogChannel} placeholder="None" />
        </FieldRow>
        <FieldRow label="Mute / timeout role">
          <RolePicker roles={roles} value={muteRole} onChange={setMuteRole} placeholder="Use Discord timeout (no role)" />
        </FieldRow>
      </SettingSection>

      <SettingSection icon={Zap} title="Word Filter">
        <FieldRow label="Banned words" hint="Comma-separated. Partial matches trigger the filter.">
          <Textarea value={bannedWords} onChange={(e) => setBannedWords(e.target.value)}
            placeholder="badword, toxic phrase, another term"
            className="min-h-[80px] bg-transparent border-white/12 font-mono text-xs text-white" />
        </FieldRow>
      </SettingSection>

      <SettingSection icon={Shield} title="Whitelist">
        <MultiTagPicker
          label="Exempt roles" hint="These roles bypass all AutoMod filters"
          options={roles} selected={whitelistRoles}
          onAdd={(v) => setWhitelistRoles((p) => [...p, v])}
          onRemove={(v) => setWhitelistRoles((p) => p.filter((x) => x !== v))}
          getLabel={(id) => roles.find((r) => r.id === id)?.name ?? id}
        />
        <MultiTagPicker
          label="Exempt channels" hint="AutoMod is disabled in these channels"
          options={textChannels.map((c) => ({ id: c.id, name: `#${c.name}` }))}
          selected={whitelistChannels}
          onAdd={(v) => setWhitelistChannels((p) => [...p, v])}
          onRemove={(v) => setWhitelistChannels((p) => p.filter((x) => x !== v))}
          getLabel={(id) => `#${channels.find((c) => c.id === id)?.name ?? id}`}
        />
      </SettingSection>

      <SaveBtn pending={update.isPending} onClick={handleSave} />
    </PageWrap>
  );
}

// ─── Welcome / Leave ─────────────────────────────────────────────────────────
export function WelcomePage({ serverId, server, channels }: { serverId: number; server: any; channels: any[] }) {
  const { toast } = useToast();
  const update = useUpdateSettings(serverId);
  const s = server?.settings ?? {};

  const [welcomeEnabled, setWelcomeEnabled] = useState<boolean>(() => s.welcomeEnabled ?? false);
  const [welcomeChannel, setWelcomeChannel] = useState<string>(() => s.welcomeChannelId ?? "");
  const [welcomeMsg, setWelcomeMsg] = useState<string>(() => s.welcomeMessage ?? "Welcome {user} to {server}!");
  const [dmEnabled, setDmEnabled] = useState<boolean>(() => s.welcomeDmEnabled ?? false);
  const [dmMsg, setDmMsg] = useState<string>(() => s.welcomeDmMessage ?? "Thanks for joining {server}!");
  const [leaveEnabled, setLeaveEnabled] = useState<boolean>(() => s.leaveEnabled ?? false);
  const [leaveChannel, setLeaveChannel] = useState<string>(() => s.leaveChannelId ?? "");
  const [leaveMsg, setLeaveMsg] = useState<string>(() => s.leaveMessage ?? "{user} has left the server.");

  function handleSave() {
    update.mutate({
      welcomeEnabled, welcomeChannelId: welcomeChannel || null, welcomeMessage: welcomeMsg,
      welcomeDmEnabled: dmEnabled, welcomeDmMessage: dmMsg,
      leaveEnabled, leaveChannelId: leaveChannel || null, leaveMessage: leaveMsg,
    }, {
      onSuccess: () => toast({ title: "Welcome settings saved" }),
      onError: () => toast({ title: "Failed to save", variant: "destructive" }),
    });
  }

  return (
    <PageWrap>
      <SettingSection icon={UserCheck} title="Welcome Messages">
        <ToggleRow label="Enable welcome messages" checked={welcomeEnabled} onChange={setWelcomeEnabled} />
        <FieldRow label="Welcome channel">
          <ChPicker channels={channels} value={welcomeChannel} onChange={setWelcomeChannel} />
        </FieldRow>
        <FieldRow label="Welcome message" hint="Variables: {user} {user.mention} {server} {memberCount}">
          <Textarea value={welcomeMsg} onChange={(e) => setWelcomeMsg(e.target.value)}
            className="min-h-[80px] bg-transparent border-white/12 text-white" />
        </FieldRow>
        <ToggleRow label="Send DM on join" sub="Bot DMs new members a private welcome message" checked={dmEnabled} onChange={setDmEnabled} />
        {dmEnabled && (
          <FieldRow label="DM message">
            <Textarea value={dmMsg} onChange={(e) => setDmMsg(e.target.value)}
              className="min-h-[60px] bg-transparent border-white/12 text-white" />
          </FieldRow>
        )}
      </SettingSection>

      <SettingSection icon={UserCheck} title="Leave Messages">
        <ToggleRow label="Enable leave messages" checked={leaveEnabled} onChange={setLeaveEnabled} />
        <FieldRow label="Leave channel">
          <ChPicker channels={channels} value={leaveChannel} onChange={setLeaveChannel} />
        </FieldRow>
        <FieldRow label="Leave message" hint="Variables: {user} {server} {memberCount}">
          <Textarea value={leaveMsg} onChange={(e) => setLeaveMsg(e.target.value)}
            className="min-h-[60px] bg-transparent border-white/12 text-white" />
        </FieldRow>
      </SettingSection>

      <SaveBtn pending={update.isPending} onClick={handleSave} />
    </PageWrap>
  );
}

// ─── Raid Protection ──────────────────────────────────────────────────────────
export function RaidProtectionPage({ serverId, server }: { serverId: number; server: any }) {
  const { toast } = useToast();
  const update = useUpdateSettings(serverId);
  const s = server?.settings ?? {};

  const [enabled, setEnabled] = useState<boolean>(() => s.raidProtectionEnabled ?? false);
  const [joinThreshold, setJoinThreshold] = useState<string>(() => String(s.raidJoinThreshold ?? 10));
  const [joinWindow, setJoinWindow] = useState<string>(() => String(s.raidJoinWindow ?? 10));
  const [raidAction, setRaidAction] = useState<string>(() => s.raidAction ?? "lockdown");
  const [minAccountAge, setMinAccountAge] = useState<string>(() => String(s.raidMinAccountAge ?? 0));

  function handleSave() {
    update.mutate({
      raidProtectionEnabled: enabled,
      raidJoinThreshold: Number(joinThreshold) || 10,
      raidJoinWindow: Number(joinWindow) || 10,
      raidAction,
      raidMinAccountAge: Number(minAccountAge) || 0,
    }, {
      onSuccess: () => toast({ title: "Raid protection saved" }),
      onError: () => toast({ title: "Failed to save", variant: "destructive" }),
    });
  }

  return (
    <PageWrap>
      <SettingSection icon={ShieldAlert} title="Raid Protection">
        <ToggleRow label="Enable raid protection" sub="Automatically respond to mass-join attacks" checked={enabled} onChange={setEnabled} />
        <div className="grid gap-3 sm:grid-cols-2">
          <FieldRow label="Join threshold (users)" hint="Trigger when X users join...">
            <Input type="number" min={2} max={100} value={joinThreshold} onChange={(e) => setJoinThreshold(e.target.value)}
              className="bg-transparent border-white/12 text-white" />
          </FieldRow>
          <FieldRow label="Join window (seconds)" hint="...within this many seconds">
            <Input type="number" min={5} max={300} value={joinWindow} onChange={(e) => setJoinWindow(e.target.value)}
              className="bg-transparent border-white/12 text-white" />
          </FieldRow>
        </div>
        <FieldRow label="Raid action">
          <Select value={raidAction} onValueChange={setRaidAction}>
            <SelectTrigger className="bg-transparent border-white/12 text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="lockdown">Lock all channels</SelectItem>
              <SelectItem value="kick">Kick new joiners</SelectItem>
              <SelectItem value="ban">Ban new joiners</SelectItem>
              <SelectItem value="verify">Force verification</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>
        <FieldRow label="Min account age (days)" hint="Accounts younger than this are auto-rejected. 0 = off.">
          <Input type="number" min={0} max={365} value={minAccountAge} onChange={(e) => setMinAccountAge(e.target.value)}
            className="bg-transparent border-white/12 text-white" />
        </FieldRow>
      </SettingSection>

      <div className="rounded-[16px] border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3">
        <p className="text-[12px] font-semibold text-amber-200">Lockdown mode</p>
        <p className="mt-1 text-[11px] text-amber-200/60">When action is "Lock all channels", Archivist denies @everyone send permissions across all text channels until you manually unlock via the Channels page.</p>
      </div>

      <SaveBtn pending={update.isPending} onClick={handleSave} />
    </PageWrap>
  );
}

// ─── Verification ─────────────────────────────────────────────────────────────
export function VerificationConfigPage({ serverId, server, channels, roles }: { serverId: number; server: any; channels: any[]; roles: any[] }) {
  const { toast } = useToast();
  const update = useUpdateSettings(serverId);
  const s = server?.settings ?? {};

  const [enabled, setEnabled] = useState<boolean>(() => s.verifyEnabled ?? false);
  const [verifyType, setVerifyType] = useState<string>(() => s.verifyType ?? "button");
  const [verifyChannel, setVerifyChannel] = useState<string>(() => s.verifyChannelId ?? "");
  const [verifyRole, setVerifyRole] = useState<string>(() => s.verifyRoleId ?? "");
  const [unverifiedRole, setUnverifiedRole] = useState<string>(() => s.unverifiedRoleId ?? "");
  const [buttonLabel, setButtonLabel] = useState<string>(() => s.verifyButtonLabel ?? "Verify Me");
  const [verifyMsg, setVerifyMsg] = useState<string>(() => s.verifyMessage ?? "Click the button below to verify and gain server access.");
  const [logChannel, setLogChannel] = useState<string>(() => s.verifyLogChannelId ?? "");
  const [minAccountAge, setMinAccountAge] = useState<string>(() => String(s.verifyMinAccountAge ?? 0));
  const [codeWord, setCodeWord] = useState<string>(() => s.verifyCodeWord ?? "");

  function handleSave() {
    update.mutate({
      verifyEnabled: enabled, verifyType,
      verifyChannelId: verifyChannel || null, verifyRoleId: verifyRole || null,
      unverifiedRoleId: unverifiedRole || null, verifyButtonLabel: buttonLabel,
      verifyMessage: verifyMsg, verifyLogChannelId: logChannel || null,
      verifyMinAccountAge: Number(minAccountAge) || 0,
      verifyCodeWord: codeWord || null,
    }, {
      onSuccess: () => toast({ title: "Verification saved" }),
      onError: () => toast({ title: "Failed to save", variant: "destructive" }),
    });
  }

  return (
    <PageWrap>
      <SettingSection icon={UserCheck} title="Verification Gate">
        <ToggleRow label="Enable verification" sub="New members must complete verification to access the server" checked={enabled} onChange={setEnabled} />
        <FieldRow label="Verification type">
          <Select value={verifyType} onValueChange={setVerifyType}>
            <SelectTrigger className="bg-transparent border-white/12 text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="button">Button click</SelectItem>
              <SelectItem value="reaction">React to a message</SelectItem>
              <SelectItem value="code">Type a code word</SelectItem>
              <SelectItem value="captcha">Text captcha</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>
        {verifyType === "code" && (
          <FieldRow label="Code word" hint="Members must type this exactly to verify">
            <Input value={codeWord} onChange={(e) => setCodeWord(e.target.value)} placeholder="e.g. IREADTHERULES"
              className="bg-transparent border-white/12 font-mono text-white" />
          </FieldRow>
        )}
        <FieldRow label="Button / prompt label">
          <Input value={buttonLabel} onChange={(e) => setButtonLabel(e.target.value)}
            className="bg-transparent border-white/12 text-white" />
        </FieldRow>
        <FieldRow label="Verification channel">
          <ChPicker channels={channels} value={verifyChannel} onChange={setVerifyChannel} />
        </FieldRow>
        <FieldRow label="Verification message" hint="Shown above the button or prompt">
          <Textarea value={verifyMsg} onChange={(e) => setVerifyMsg(e.target.value)}
            className="min-h-[60px] bg-transparent border-white/12 text-white" />
        </FieldRow>
      </SettingSection>

      <SettingSection icon={Shield} title="Roles & Access">
        <FieldRow label="Grant role on verify (verified role)">
          <RolePicker roles={roles} value={verifyRole} onChange={setVerifyRole} placeholder="None" />
        </FieldRow>
        <FieldRow label="Remove role on verify (unverified / restricted role)">
          <RolePicker roles={roles} value={unverifiedRole} onChange={setUnverifiedRole} placeholder="None" />
        </FieldRow>
        <FieldRow label="Min account age (days)" hint="Accounts younger than this cannot verify. 0 = no restriction.">
          <Input type="number" min={0} value={minAccountAge} onChange={(e) => setMinAccountAge(e.target.value)}
            className="bg-transparent border-white/12 text-white" />
        </FieldRow>
        <FieldRow label="Verification log channel">
          <ChPicker channels={channels} value={logChannel} onChange={setLogChannel} placeholder="None" />
        </FieldRow>
      </SettingSection>

      <SaveBtn pending={update.isPending} onClick={handleSave} />
    </PageWrap>
  );
}

// ─── Economy Config ───────────────────────────────────────────────────────────
export function EconomyConfigPage({ serverId, server }: { serverId: number; server: any }) {
  const { toast } = useToast();
  const update = useUpdateSettings(serverId);
  const s = server?.settings ?? {};

  const [enabled, setEnabled] = useState<boolean>(() => s.economyEnabled ?? false);
  const [currencyName, setCurrencyName] = useState<string>(() => s.economyCurrencyName ?? "Coins");
  const [currencySymbol, setCurrencySymbol] = useState<string>(() => s.economyCurrencySymbol ?? "🪙");
  const [startingBalance, setStartingBalance] = useState<string>(() => String(s.economyStartingBalance ?? 100));
  const [dailyMin, setDailyMin] = useState<string>(() => String(s.economyDailyMin ?? 50));
  const [dailyMax, setDailyMax] = useState<string>(() => String(s.economyDailyMax ?? 200));
  const [workMin, setWorkMin] = useState<string>(() => String(s.economyWorkMin ?? 20));
  const [workMax, setWorkMax] = useState<string>(() => String(s.economyWorkMax ?? 100));
  const [msgReward, setMsgReward] = useState<boolean>(() => s.economyMessageRewardEnabled ?? false);
  const [msgRewardAmt, setMsgRewardAmt] = useState<string>(() => String(s.economyMessageRewardAmount ?? 5));
  const [voiceReward, setVoiceReward] = useState<boolean>(() => s.economyVoiceRewardEnabled ?? false);
  const [voiceRewardRate, setVoiceRewardRate] = useState<string>(() => String(s.economyVoiceRewardRate ?? 10));
  const [gambling, setGambling] = useState<boolean>(() => s.economyGamblingEnabled ?? true);
  const [rob, setRob] = useState<boolean>(() => s.economyRobEnabled ?? false);
  const [robChance, setRobChance] = useState<string>(() => String(s.economyRobSuccessChance ?? 40));

  function handleSave() {
    update.mutate({
      economyEnabled: enabled, economyCurrencyName: currencyName, economyCurrencySymbol: currencySymbol,
      economyStartingBalance: Number(startingBalance) || 100,
      economyDailyMin: Number(dailyMin) || 50, economyDailyMax: Number(dailyMax) || 200,
      economyWorkMin: Number(workMin) || 20, economyWorkMax: Number(workMax) || 100,
      economyMessageRewardEnabled: msgReward, economyMessageRewardAmount: Number(msgRewardAmt) || 5,
      economyVoiceRewardEnabled: voiceReward, economyVoiceRewardRate: Number(voiceRewardRate) || 10,
      economyGamblingEnabled: gambling, economyRobEnabled: rob,
      economyRobSuccessChance: Number(robChance) || 40,
    }, {
      onSuccess: () => toast({ title: "Economy config saved" }),
      onError: () => toast({ title: "Failed to save", variant: "destructive" }),
    });
  }

  return (
    <PageWrap>
      <SettingSection icon={Coins} title="Currency">
        <ToggleRow label="Enable economy system" sub="Enables currency commands, daily, work, and shop" checked={enabled} onChange={setEnabled} />
        <div className="grid gap-3 sm:grid-cols-2">
          <FieldRow label="Currency name"><Input value={currencyName} onChange={(e) => setCurrencyName(e.target.value)} className="bg-transparent border-white/12 text-white" /></FieldRow>
          <FieldRow label="Symbol / emoji"><Input value={currencySymbol} onChange={(e) => setCurrencySymbol(e.target.value)} className="bg-transparent border-white/12 text-white" /></FieldRow>
        </div>
        <FieldRow label="Starting balance" hint="Given to members when they first use an economy command">
          <Input type="number" min={0} value={startingBalance} onChange={(e) => setStartingBalance(e.target.value)} className="bg-transparent border-white/12 text-white" />
        </FieldRow>
      </SettingSection>

      <SettingSection icon={Coins} title="Earn Rates">
        <div className="grid gap-3 sm:grid-cols-2">
          <FieldRow label="Daily min"><Input type="number" min={0} value={dailyMin} onChange={(e) => setDailyMin(e.target.value)} className="bg-transparent border-white/12 text-white" /></FieldRow>
          <FieldRow label="Daily max"><Input type="number" min={0} value={dailyMax} onChange={(e) => setDailyMax(e.target.value)} className="bg-transparent border-white/12 text-white" /></FieldRow>
          <FieldRow label="Work min"><Input type="number" min={0} value={workMin} onChange={(e) => setWorkMin(e.target.value)} className="bg-transparent border-white/12 text-white" /></FieldRow>
          <FieldRow label="Work max"><Input type="number" min={0} value={workMax} onChange={(e) => setWorkMax(e.target.value)} className="bg-transparent border-white/12 text-white" /></FieldRow>
        </div>
        <ToggleRow label="Reward messages" sub={`Members earn +${msgRewardAmt} per message sent`} checked={msgReward} onChange={setMsgReward} />
        {msgReward && <FieldRow label="Message reward amount"><Input type="number" min={1} value={msgRewardAmt} onChange={(e) => setMsgRewardAmt(e.target.value)} className="bg-transparent border-white/12 text-white" /></FieldRow>}
        <ToggleRow label="Reward voice time" sub={`Members earn +${voiceRewardRate} per minute in voice`} checked={voiceReward} onChange={setVoiceReward} />
        {voiceReward && <FieldRow label="Voice reward rate (per minute)"><Input type="number" min={1} value={voiceRewardRate} onChange={(e) => setVoiceRewardRate(e.target.value)} className="bg-transparent border-white/12 text-white" /></FieldRow>}
      </SettingSection>

      <SettingSection icon={Zap} title="Gambling & Rob">
        <ToggleRow label="Enable gambling commands" sub="coinflip, slots, dice" checked={gambling} onChange={setGambling} />
        <ToggleRow label="Enable rob command" sub="Members can steal coins from each other" checked={rob} onChange={setRob} />
        {rob && <FieldRow label="Rob success chance (%)"><Input type="number" min={1} max={100} value={robChance} onChange={(e) => setRobChance(e.target.value)} className="bg-transparent border-white/12 text-white" /></FieldRow>}
      </SettingSection>

      <SaveBtn pending={update.isPending} onClick={handleSave} />
    </PageWrap>
  );
}

// ─── Counting Channel ─────────────────────────────────────────────────────────
export function CountingPage({ serverId, channels }: { serverId: number; channels: any[] }) {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(false);
  const [channel, setChannel] = useState("");
  const [failAction, setFailAction] = useState("reset");
  const [allowSameUser, setAllowSameUser] = useState(false);
  const [celebrateAt, setCelebrateAt] = useState("100");
  const [webhookNotify, setWebhookNotify] = useState(false);

  function handleSave() {
    toast({ title: "Counting config saved" });
  }

  return (
    <PageWrap>
      <SettingSection icon={Hash} title="Counting Channel">
        <ToggleRow label="Enable counting" sub="Members count up from 1 cooperatively in one channel" checked={enabled} onChange={setEnabled} />
        <FieldRow label="Counting channel">
          <ChPicker channels={channels} value={channel} onChange={setChannel} />
        </FieldRow>
        <FieldRow label="Wrong number action">
          <Select value={failAction} onValueChange={setFailAction}>
            <SelectTrigger className="bg-transparent border-white/12 text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="reset">Reset to 1</SelectItem>
              <SelectItem value="delete">Delete message only</SelectItem>
              <SelectItem value="warn">Warn and reset</SelectItem>
              <SelectItem value="none">Do nothing</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>
        <ToggleRow label="Allow same user twice in a row" sub="Off = must alternate between different members" checked={allowSameUser} onChange={setAllowSameUser} />
        <FieldRow label="Celebrate at milestone" hint="Bot posts a special message when this count is hit">
          <Input type="number" min={10} value={celebrateAt} onChange={(e) => setCelebrateAt(e.target.value)}
            className="bg-transparent border-white/12 text-white" />
        </FieldRow>
        <ToggleRow label="Notify on failure" sub="Bot posts a message when someone breaks the count" checked={webhookNotify} onChange={setWebhookNotify} />
      </SettingSection>

      <SaveBtn pending={false} onClick={handleSave} />
    </PageWrap>
  );
}

// ─── Logging Config ───────────────────────────────────────────────────────────
const LOG_EVENTS = [
  { id: "messageDelete", label: "Message deleted" },
  { id: "messageEdit", label: "Message edited" },
  { id: "memberJoin", label: "Member joined" },
  { id: "memberLeave", label: "Member left" },
  { id: "memberBan", label: "Member banned" },
  { id: "memberUnban", label: "Member unbanned" },
  { id: "memberKick", label: "Member kicked" },
  { id: "memberMute", label: "Member muted / timed out" },
  { id: "roleCreate", label: "Role created" },
  { id: "roleDelete", label: "Role deleted" },
  { id: "roleUpdate", label: "Role updated" },
  { id: "channelCreate", label: "Channel created" },
  { id: "channelDelete", label: "Channel deleted" },
  { id: "voiceJoin", label: "Voice channel joined" },
  { id: "voiceLeave", label: "Voice channel left" },
  { id: "inviteCreate", label: "Invite created" },
  { id: "inviteDelete", label: "Invite deleted" },
  { id: "commandRun", label: "Bot command run" },
  { id: "commandFail", label: "Bot command failed" },
];

export function LoggingConfigPage({ serverId, server, channels }: { serverId: number; server: any; channels: any[] }) {
  const { toast } = useToast();
  const update = useUpdateSettings(serverId);
  const s = server?.settings ?? {};

  const [logChannel, setLogChannel] = useState<string>(() => s.logChannelId ?? "");
  const [selectedEvents, setSelectedEvents] = useState<string[]>(() => s.logEvents ?? []);

  function toggle(id: string) {
    setSelectedEvents((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function selectAll() { setSelectedEvents(LOG_EVENTS.map((e) => e.id)); }
  function clearAll() { setSelectedEvents([]); }

  function handleSave() {
    update.mutate({ logChannelId: logChannel || null, logEvents: selectedEvents }, {
      onSuccess: () => toast({ title: "Logging config saved" }),
      onError: () => toast({ title: "Failed to save", variant: "destructive" }),
    });
  }

  return (
    <PageWrap>
      <SettingSection icon={AlertTriangle} title="Log Channel">
        <FieldRow label="Send all log events to">
          <ChPicker channels={channels} value={logChannel} onChange={setLogChannel} placeholder="None (logging disabled)" />
        </FieldRow>
      </SettingSection>

      <SettingSection icon={Zap} title="Events to Log">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] text-white/30">{selectedEvents.length} of {LOG_EVENTS.length} selected</p>
          <div className="flex gap-2">
            <button type="button" onClick={selectAll} className="text-[11px] text-[#E0001A]/70 hover:text-[#E0001A]">All</button>
            <button type="button" onClick={clearAll} className="text-[11px] text-white/30 hover:text-white/60">None</button>
          </div>
        </div>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {LOG_EVENTS.map((ev) => (
            <button key={ev.id} type="button" onClick={() => toggle(ev.id)}
              className={`flex items-center gap-2.5 rounded-[12px] border px-3 py-2.5 text-left text-[12px] transition ${
                selectedEvents.includes(ev.id)
                  ? "border-[#E0001A]/25 bg-[#E0001A]/[0.07] text-white"
                  : "border-white/[0.05] bg-white/[0.02] text-white/40 hover:text-white/60"
              }`}>
              <div className={`h-2 w-2 shrink-0 rounded-full ${selectedEvents.includes(ev.id) ? "bg-[#E0001A]" : "bg-white/15"}`} />
              {ev.label}
            </button>
          ))}
        </div>
      </SettingSection>

      <SaveBtn pending={update.isPending} onClick={handleSave} />
    </PageWrap>
  );
}

// ─── RoleRewardsPage ──────────────────────────────────────────────────────────
export function RoleRewardsPage({ serverId, server, roles, channels }: { serverId: number; server: any; roles: any[]; channels: any[] }) {
  const { toast } = useToast();
  const { data, isLoading } = useLeveling(serverId);
  const update = useUpdateLeveling(serverId);
  const s = server?.settings ?? {};

  const [enabled, setEnabled] = useState<boolean>(() => data?.enabled ?? false);
  const [xpPerMessage, setXpPerMessage] = useState<string>(() => String(data?.xpPerMessage ?? 15));
  const [cooldown, setCooldown] = useState<string>(() => String(data?.cooldown ?? 60));
  const [voiceXp, setVoiceXp] = useState<boolean>(() => s.voiceXpEnabled ?? false);
  const [voiceXpRate, setVoiceXpRate] = useState<string>(() => String(s.voiceXpRate ?? 5));
  const [levelUpChannel, setLevelUpChannel] = useState<string>(() => data?.levelUpChannelId ?? "");
  const [levelUpMessage, setLevelUpMessage] = useState<string>(() => data?.levelUpMessage ?? "Congrats {user}, you reached level {level}!");
  const [rewards, setRewards] = useState<Array<{ level: number; roleId: string }>>(() => data?.rewards ?? []);
  const [addLevel, setAddLevel] = useState("");
  const [addRole, setAddRole] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  function handleSave() {
    update.mutate({ enabled, xpPerMessage: Number(xpPerMessage)||15, cooldown: Number(cooldown)||60, levelUpChannelId: levelUpChannel||null, levelUpMessage, rewards }, {
      onSuccess: () => toast({ title: "Role rewards saved" }),
      onError: () => toast({ title: "Failed to save", variant: "destructive" }),
    });
  }

  function addReward() {
    if (!addLevel || !addRole) return;
    setRewards(p => [...p.filter(r => r.level !== Number(addLevel)), { level: Number(addLevel), roleId: addRole }].sort((a,b) => a.level - b.level));
    setAddLevel(""); setAddRole(""); setShowAdd(false);
  }

  if (isLoading) return <div className="rounded-[18px] border border-white/8 bg-white/[0.02] px-4 py-6 text-center text-sm text-white/40">Loading...</div>;

  return (
    <PageWrap>
      <SettingSection icon={Trophy} title="XP & Leveling">
        <ToggleRow label="Enable leveling" sub="Members earn XP by sending messages" checked={enabled} onChange={setEnabled} />
        <div className="grid gap-3 sm:grid-cols-2">
          <FieldRow label="XP per message" hint="How much XP each message awards (1–100)">
            <Input type="number" min={1} max={100} value={xpPerMessage} onChange={(e) => setXpPerMessage(e.target.value)} className="bg-transparent border-white/12 text-white" />
          </FieldRow>
          <FieldRow label="Cooldown (seconds)" hint="Minimum gap between XP awards per user">
            <Input type="number" min={0} value={cooldown} onChange={(e) => setCooldown(e.target.value)} className="bg-transparent border-white/12 text-white" />
          </FieldRow>
        </div>
        <ToggleRow label="Voice XP" sub={`Members earn +${voiceXpRate} XP per minute in voice channels`} checked={voiceXp} onChange={setVoiceXp} />
        {voiceXp && <FieldRow label="Voice XP rate (per minute)"><Input type="number" min={1} value={voiceXpRate} onChange={(e) => setVoiceXpRate(e.target.value)} className="bg-transparent border-white/12 text-white" /></FieldRow>}
      </SettingSection>

      <SettingSection icon={Trophy} title="Level-Up Announcement">
        <FieldRow label="Level-up channel">
          <ChPicker channels={channels} value={levelUpChannel} onChange={setLevelUpChannel} placeholder="Same channel as the message" />
        </FieldRow>
        <FieldRow label="Level-up message" hint="Variables: {user} {user.mention} {level} {server}">
          <Input value={levelUpMessage} onChange={(e) => setLevelUpMessage(e.target.value)} className="bg-transparent border-white/12 text-white" />
        </FieldRow>
      </SettingSection>

      <SettingSection icon={Star} title="Role Rewards">
        <div className="space-y-2">
          {rewards.length === 0 && !showAdd && (
            <div className="rounded-[14px] border border-dashed border-white/10 py-5 text-center text-[13px] text-white/30">No role rewards set up yet</div>
          )}
          {rewards.sort((a,b)=>a.level-b.level).map((r, i) => (
            <div key={i} className="flex items-center gap-3 rounded-[14px] border border-white/[0.05] bg-white/[0.02] px-4 py-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E0001A] text-[11px] font-bold text-white">{r.level}</div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-white">{roles.find(rl=>rl.id===r.roleId)?.name ?? r.roleId}</p>
                <p className="text-[11px] text-white/30">Awarded at level {r.level}</p>
              </div>
              <button type="button" onClick={() => setRewards(p=>p.filter((_,j)=>j!==i))} className="text-white/25 hover:text-[#E0001A]">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {showAdd ? (
            <div className="rounded-[14px] border border-white/10 bg-white/[0.03] px-4 py-3 space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-white/35">New reward</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <FieldRow label="At level">
                  <Input type="number" min={1} max={999} value={addLevel} onChange={(e) => setAddLevel(e.target.value)} placeholder="e.g. 10" className="bg-transparent border-white/12 text-white" />
                </FieldRow>
                <FieldRow label="Give role">
                  <RolePicker roles={roles} value={addRole} onChange={setAddRole} placeholder="Select role" />
                </FieldRow>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={addReward} className="rounded-full bg-[#E0001A] px-4 py-2 text-[12px] font-semibold text-white">Add</button>
                <button type="button" onClick={() => { setShowAdd(false); setAddLevel(""); setAddRole(""); }} className="rounded-full border border-white/10 px-4 py-2 text-[12px] text-white/50">Cancel</button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setShowAdd(true)} className="flex w-full items-center justify-center gap-2 rounded-[14px] border border-dashed border-white/10 py-3 text-[12px] text-white/35 hover:border-[#E0001A]/20 hover:text-white/50">
              <Plus className="h-3.5 w-3.5" /> Add Role Reward
            </button>
          )}
        </div>
      </SettingSection>

      <SaveBtn pending={update.isPending} onClick={handleSave} />
    </PageWrap>
  );
}

// ─── AutoRolePage ─────────────────────────────────────────────────────────────
export function AutoRolePage({ serverId, server, roles }: { serverId: number; server: any; roles: any[] }) {
  const { toast } = useToast();
  const update = useUpdateSettings(serverId);
  const s = server?.settings ?? {};

  const [autoRoles, setAutoRoles] = useState<string[]>(() => (s as any).autoRoles ?? []);
  const [delay, setDelay] = useState<string>(() => String((s as any).autoRoleDelay ?? 0));
  const [onlyHumans, setOnlyHumans] = useState<boolean>(() => (s as any).autoRoleOnlyHumans ?? true);
  const [requireVerify, setRequireVerify] = useState<boolean>(() => (s as any).autoRoleRequireVerification ?? false);

  function handleSave() {
    update.mutate({ autoRoles, autoRoleDelay: Number(delay)||0, autoRoleOnlyHumans: onlyHumans, autoRoleRequireVerification: requireVerify } as any, {
      onSuccess: () => toast({ title: "Auto-role saved" }),
      onError: () => toast({ title: "Failed to save", variant: "destructive" }),
    });
  }

  return (
    <PageWrap>
      <SettingSection icon={UserCheck} title="Auto-Role Assignment">
        <MultiTagPicker
          label="Roles to assign on join"
          hint="Every new member gets these roles immediately (or after delay)"
          options={roles}
          selected={autoRoles}
          onAdd={(v) => setAutoRoles(p => [...p, v])}
          onRemove={(v) => setAutoRoles(p => p.filter(x => x !== v))}
          getLabel={(id) => roles.find(r => r.id === id)?.name ?? id}
        />
        <FieldRow label="Delay (seconds)" hint="Wait this many seconds before assigning. 0 = immediate.">
          <Input type="number" min={0} max={3600} value={delay} onChange={(e) => setDelay(e.target.value)} className="bg-transparent border-white/12 text-white" />
        </FieldRow>
        <ToggleRow label="Only apply to humans" sub="Skip bot accounts" checked={onlyHumans} onChange={setOnlyHumans} />
        <ToggleRow label="Require verification first" sub="Only assign after member passes verification gate" checked={requireVerify} onChange={setRequireVerify} />
      </SettingSection>
      <SaveBtn pending={update.isPending} onClick={handleSave} />
    </PageWrap>
  );
}

// ─── BoostPerksPage ───────────────────────────────────────────────────────────
export function BoostPerksPage({ serverId, server, roles, channels }: { serverId: number; server: any; roles: any[]; channels: any[] }) {
  const { toast } = useToast();
  const update = useUpdateSettings(serverId);
  const s = server?.settings ?? {};

  const [boostRole, setBoostRole] = useState<string>(() => (s as any).boostRoleId ?? "");
  const [announceChannel, setAnnounceChannel] = useState<string>(() => (s as any).boostAnnounceChannelId ?? "");
  const [announceMsg, setAnnounceMsg] = useState<string>(() => (s as any).boostAnnounceMessage ?? "{user.mention} just boosted {server.name}! 🚀 Thanks for the support!");
  const [economyBonus, setEconomyBonus] = useState<string>(() => String((s as any).boostEconomyBonus ?? 500));
  const [xpMultiplier, setXpMultiplier] = useState<string>(() => String((s as any).boostXpMultiplier ?? "2"));
  const [announceEnabled, setAnnounceEnabled] = useState(false);
  const [bonusEnabled, setBonusEnabled] = useState(false);

  function handleSave() {
    update.mutate({
      boostRoleId: boostRole || null,
      boostAnnounceChannelId: announceChannel || null,
      boostAnnounceMessage: announceMsg,
      boostEconomyBonus: bonusEnabled ? Number(economyBonus)||500 : 0,
      boostXpMultiplier: Number(xpMultiplier)||2,
    } as any, {
      onSuccess: () => toast({ title: "Boost perks saved" }),
      onError: () => toast({ title: "Failed to save", variant: "destructive" }),
    });
  }

  return (
    <PageWrap>
      <SettingSection icon={Gift} title="Boost Role">
        <FieldRow label="Role to give server boosters">
          <RolePicker roles={roles} value={boostRole} onChange={setBoostRole} placeholder="None" />
        </FieldRow>
        <FieldRow label="XP multiplier for boosters">
          <Select value={xpMultiplier} onValueChange={setXpMultiplier}>
            <SelectTrigger className="bg-transparent border-white/12 text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1x (no bonus)</SelectItem>
              <SelectItem value="1.5">1.5x</SelectItem>
              <SelectItem value="2">2x</SelectItem>
              <SelectItem value="3">3x</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>
      </SettingSection>

      <SettingSection icon={Gift} title="Boost Announcement">
        <ToggleRow label="Announce when someone boosts" checked={announceEnabled} onChange={setAnnounceEnabled} />
        {announceEnabled && <>
          <FieldRow label="Announcement channel">
            <ChPicker channels={channels} value={announceChannel} onChange={setAnnounceChannel} />
          </FieldRow>
          <FieldRow label="Announcement message" hint="Variables: {user.mention} {server.name} {boostCount}">
            <Input value={announceMsg} onChange={(e) => setAnnounceMsg(e.target.value)} className="bg-transparent border-white/12 text-white" />
          </FieldRow>
        </>}
      </SettingSection>

      <SettingSection icon={Coins} title="Economy Bonus">
        <ToggleRow label="Give economy coins on boost" sub={`Award ${economyBonus} coins each time someone boosts`} checked={bonusEnabled} onChange={setBonusEnabled} />
        {bonusEnabled && <FieldRow label="Coin bonus amount"><Input type="number" min={0} value={economyBonus} onChange={(e) => setEconomyBonus(e.target.value)} className="bg-transparent border-white/12 text-white" /></FieldRow>}
      </SettingSection>

      <SaveBtn pending={update.isPending} onClick={handleSave} />
    </PageWrap>
  );
}

// ─── BirthdayPage ─────────────────────────────────────────────────────────────
export function BirthdayPage({ serverId, channels, roles }: { serverId: number; channels: any[]; roles: any[] }) {
  const { toast } = useToast();
  const update = useUpdateSettings(serverId);

  const [enabled, setEnabled] = useState(false);
  const [channel, setChannel] = useState("");
  const [message, setMessage] = useState("Happy birthday {user.mention}! 🎂 Have an amazing day!");
  const [birthdayRole, setBirthdayRole] = useState("");
  const [roleDuration, setRoleDuration] = useState("24");
  const [timezone, setTimezone] = useState("UTC");

  function handleSave() {
    update.mutate({
      birthdayEnabled: enabled,
      birthdayChannelId: channel || null,
      birthdayMessage: message,
      birthdayRoleId: birthdayRole || null,
      birthdayRoleDuration: Number(roleDuration),
      birthdayTimezone: timezone,
    } as any, {
      onSuccess: () => toast({ title: "Birthday settings saved" }),
      onError: () => toast({ title: "Failed to save", variant: "destructive" }),
    });
  }

  return (
    <PageWrap>
      <SettingSection icon={Cake} title="Birthday System">
        <ToggleRow label="Enable birthday tracking" sub="Members can set their birthday with /birthday set" checked={enabled} onChange={setEnabled} />
        <FieldRow label="Announcement channel">
          <ChPicker channels={channels} value={channel} onChange={setChannel} placeholder="None (DM only)" />
        </FieldRow>
        <FieldRow label="Birthday message" hint="Variables: {user.mention} {user.name} {age}">
          <Input value={message} onChange={(e) => setMessage(e.target.value)} className="bg-transparent border-white/12 text-white" />
        </FieldRow>
        <FieldRow label="Timezone" hint="e.g. America/New_York, Europe/London, UTC">
          <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} className="bg-transparent border-white/12 text-white font-mono" placeholder="UTC" />
        </FieldRow>
      </SettingSection>

      <SettingSection icon={Star} title="Birthday Role">
        <FieldRow label="Temporary role on birthday">
          <RolePicker roles={roles} value={birthdayRole} onChange={setBirthdayRole} placeholder="None" />
        </FieldRow>
        <FieldRow label="Role duration">
          <Select value={roleDuration} onValueChange={setRoleDuration}>
            <SelectTrigger className="bg-transparent border-white/12 text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="24">24 hours</SelectItem>
              <SelectItem value="48">48 hours</SelectItem>
              <SelectItem value="168">7 days</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>
      </SettingSection>

      <SaveBtn pending={update.isPending} onClick={handleSave} />
    </PageWrap>
  );
}
