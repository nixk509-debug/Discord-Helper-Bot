import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useStarboard, useUpsertStarboard } from "@/hooks/use-bot";
import { Star, Save, Hash, Eye, Loader2, X, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface StarboardTabProps {
  serverId: number;
}

export function StarboardTab({ serverId }: StarboardTabProps) {
  const { toast } = useToast();
  const { data: config, isLoading } = useStarboard(serverId);
  const upsert = useUpsertStarboard(serverId);

  const [enabled, setEnabled] = useState(false);
  const [channelId, setChannelId] = useState("");
  const [threshold, setThreshold] = useState(3);
  const [emoji, setEmoji] = useState("star");
  const [selfStar, setSelfStar] = useState(false);
  const [nsfwAllowed, setNsfwAllowed] = useState(false);
  const [ignoredChannels, setIgnoredChannels] = useState<string[]>([]);
  const [ignoredInput, setIgnoredInput] = useState("");

  useEffect(() => {
    if (config) {
      setEnabled(config.enabled ?? false);
      setChannelId(config.channelId ?? "");
      setThreshold(config.threshold ?? 3);
      setEmoji(config.emoji ?? "star");
      setSelfStar(config.selfStar ?? false);
      setNsfwAllowed(config.nsfwAllowed ?? false);
      setIgnoredChannels(config.ignoredChannels ?? []);
    }
  }, [config]);

  const handleSave = () => {
    upsert.mutate(
      { enabled, channelId: channelId || null, threshold, emoji, selfStar, nsfwAllowed, ignoredChannels },
      {
        onSuccess: () => toast({ title: "Starboard updated", description: "Settings saved successfully." }),
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  };

  const addIgnoredChannel = () => {
    const trimmed = ignoredInput.trim();
    if (trimmed && !ignoredChannels.includes(trimmed)) {
      setIgnoredChannels([...ignoredChannels, trimmed]);
      setIgnoredInput("");
    }
  };

  const removeIgnoredChannel = (ch: string) => {
    setIgnoredChannels(ignoredChannels.filter((c) => c !== ch));
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full bg-white/5" />
        <Skeleton className="h-64 w-full bg-white/5 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold" data-testid="text-starboard-title">Starboard</h2>
        <p className="text-muted-foreground text-sm mt-1">Highlight popular messages in a dedicated channel when they receive enough reactions.</p>
      </div>

      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <div className="flex items-center gap-3">
            <div className="shrink-0 flex items-center justify-center w-9 h-9 rounded-md bg-yellow-500/10 text-yellow-500">
              <Star className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base font-display">Enable Starboard</CardTitle>
              <CardDescription className="text-xs">Master toggle for the starboard feature</CardDescription>
            </div>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} data-testid="switch-starboard-enabled" />
        </CardHeader>
      </Card>

      <div className={`space-y-4 transition-opacity duration-300 ${!enabled ? "opacity-50 pointer-events-none" : ""}`}>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base font-display">Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Starboard Channel ID</label>
                <Input value={channelId} onChange={(e) => setChannelId(e.target.value)} placeholder="123456789012345678" className="bg-background" data-testid="input-starboard-channel" />
                <p className="text-xs text-muted-foreground">The channel where starred messages will be posted.</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Reaction Threshold</label>
                <Input type="number" min={1} max={100} value={threshold} onChange={(e) => setThreshold(parseInt(e.target.value) || 1)} className="bg-background" data-testid="input-starboard-threshold" />
                <p className="text-xs text-muted-foreground">Minimum reactions required to appear on starboard.</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Reaction Emoji</label>
              <Input value={emoji} onChange={(e) => setEmoji(e.target.value)} placeholder="star" className="bg-background max-w-[200px]" data-testid="input-starboard-emoji" />
              <p className="text-xs text-muted-foreground">The emoji users react with (e.g. star, fire, heart).</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 rounded-lg border border-white/5 bg-background/30 p-4">
                <div>
                  <p className="text-sm font-medium">Self-Star</p>
                  <p className="text-xs text-muted-foreground">Allow message authors to star their own messages</p>
                </div>
                <Switch checked={selfStar} onCheckedChange={setSelfStar} data-testid="switch-starboard-self-star" />
              </div>
              <div className="flex items-center justify-between gap-4 rounded-lg border border-white/5 bg-background/30 p-4">
                <div>
                  <p className="text-sm font-medium">NSFW Content</p>
                  <p className="text-xs text-muted-foreground">Allow messages from NSFW channels on the starboard</p>
                </div>
                <Switch checked={nsfwAllowed} onCheckedChange={setNsfwAllowed} data-testid="switch-starboard-nsfw" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base font-display">Ignored Channels</CardTitle>
            <CardDescription>Messages from these channels won't appear on the starboard.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={ignoredInput}
                onChange={(e) => setIgnoredInput(e.target.value)}
                placeholder="Channel ID"
                className="bg-background max-w-[300px]"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addIgnoredChannel())}
                data-testid="input-starboard-ignored-channel"
              />
              <Button variant="outline" onClick={addIgnoredChannel} data-testid="button-add-ignored-channel">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {ignoredChannels.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {ignoredChannels.map((ch) => (
                  <Badge key={ch} variant="secondary" className="gap-1">
                    <Hash className="w-3 h-3" />
                    {ch}
                    <button onClick={() => removeIgnoredChannel(ch)} className="ml-1" data-testid={`button-remove-ignored-${ch}`}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base font-display flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              Starboard Preview
            </CardTitle>
            <CardDescription>How a starboard post might look</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-[#36393f] p-4 space-y-2 text-white/90" data-testid="preview-starboard">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-yellow-400">{emoji}</span>
                <span className="font-bold text-yellow-400">{threshold}</span>
                <span className="text-white/50">|</span>
                <Hash className="w-3 h-3 text-white/50" />
                <span className="text-white/50">{channelId || "general"}</span>
              </div>
              <div className="rounded-md bg-white/5 p-3 border-l-2 border-yellow-400">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-full bg-primary/30" />
                  <span className="text-sm font-medium text-white/80">ExampleUser</span>
                  <span className="text-xs text-white/40">Today at 12:00 PM</span>
                </div>
                <p className="text-sm text-white/70">This is a really cool message that everyone loved!</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Button onClick={handleSave} disabled={upsert.isPending} className="gap-2" data-testid="button-save-starboard">
        {upsert.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {upsert.isPending ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  );
}
