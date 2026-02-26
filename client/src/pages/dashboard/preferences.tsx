import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Save, Palette, Layout, Tag, Eye, Zap, Layers, Cpu } from "lucide-react";

const EMBED_STYLES = [
  { id: "modern", label: "Modern", desc: "Clean cards with subtle borders and shadows." },
  { id: "compact", label: "Compact", desc: "Tight layout, more information per screen." },
  { id: "minimal", label: "Minimal", desc: "Stripped-back look, content front and center." },
];

export default function Preferences() {
  const { toast } = useToast();
  const { data: prefs, isLoading } = useQuery<any>({ queryKey: ["/api/preferences"] });

  const [accentColor, setAccentColor] = useState("#dc2626");
  const [embedStyle, setEmbedStyle] = useState("modern");
  const [brandName, setBrandName] = useState("");
  
  // V1 UI System additions
  const [eyeIntensity, setEyeIntensity] = useState("subtle");
  const [glowStrength, setGlowStrength] = useState(50);
  const [uiDensity, setUiDensity] = useState("comfort");
  const [glitchFx, setGlitchFx] = useState(true);

  useEffect(() => {
    if (prefs) {
      setAccentColor(prefs.accentColor || "#dc2626");
      setEmbedStyle(prefs.embedStyle || "modern");
      setBrandName(prefs.brandName || "");
      // Mock loading additional settings if they existed in DB, otherwise defaults
      setEyeIntensity(prefs.eyeIntensity || "subtle");
      setGlowStrength(prefs.glowStrength || 50);
      setUiDensity(prefs.uiDensity || "comfort");
      setGlitchFx(prefs.glitchFx !== undefined ? prefs.glitchFx : true);
    }
  }, [prefs]);

  const saveMutation = useMutation({
    mutationFn: () => apiRequest("PUT", "/api/preferences", { 
      accentColor, 
      embedStyle, 
      brandName,
      eyeIntensity,
      glowStrength,
      uiDensity,
      glitchFx
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/preferences"] });
      toast({ title: "Preferences saved", description: "Your customization settings have been updated." });
    },
    onError: () => {
      toast({ title: "Failed to save", description: "Please try again.", variant: "destructive" });
    },
  });

  return (
    <DashboardLayout>
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Preferences</h1>
          <p className="text-muted-foreground text-sm mt-1">Customize how Archivist looks and feels for your account.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="glass-card border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-display">
                <Palette className="w-4 h-4 text-primary" /> Accent Color
              </CardTitle>
              <CardDescription>Primary UI glow color.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer border border-white/10 bg-transparent p-0.5"
                />
                <Input
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="font-mono h-9 bg-secondary/50 border-white/10"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-display">
                <Tag className="w-4 h-4 text-primary" /> Brand Name
              </CardTitle>
              <CardDescription>Display name in bot replies.</CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="Archivist"
                className="h-9 bg-secondary/50 border-white/10"
              />
            </CardContent>
          </Card>
        </div>

        <Card className="glass-card border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-display text-primary">
              <Cpu className="w-4 h-4" /> Archivist UI System V1
            </CardTitle>
            <CardDescription>Advanced appearance engine settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Eye className="w-3.5 h-3.5" /> Eye Intensity
                </Label>
                <Select value={eyeIntensity} onValueChange={setEyeIntensity}>
                  <SelectTrigger className="w-[140px] h-8 bg-secondary/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="off">Off</SelectItem>
                    <SelectItem value="subtle">Subtle</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5" /> Glow Strength
                  </Label>
                  <span className="text-[10px] stats-monospace text-muted-foreground">{glowStrength}%</span>
                </div>
                <Slider 
                  value={[glowStrength]} 
                  onValueChange={(v) => setGlowStrength(v[0])} 
                  max={100} 
                  step={1} 
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5" /> UI Density
                </Label>
                <div className="flex bg-secondary/50 p-1 rounded-lg">
                  {["comfort", "compact"].map((d) => (
                    <button
                      key={d}
                      onClick={() => setUiDensity(d)}
                      className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
                        uiDensity === d ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5" /> Glitch FX
                </Label>
                <Switch checked={glitchFx} onCheckedChange={setGlitchFx} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-display">
              <Layout className="w-4 h-4 text-primary" /> Embed Style
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {EMBED_STYLES.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setEmbedStyle(style.id)}
                  className={`rounded-xl p-3 text-left border transition-all duration-200 ${
                    embedStyle === style.id
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-white/10 bg-secondary/30 text-muted-foreground hover:border-white/20"
                  }`}
                >
                  <p className="font-semibold text-xs">{style.label}</p>
                  <p className="text-[10px] mt-0.5 leading-relaxed text-muted-foreground/70">{style.desc}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || isLoading}
          className="w-full h-11 font-semibold text-white gap-2"
          style={{ background: "linear-gradient(135deg, #B11226, #FF2D4D)", boxShadow: `0 4px 20px ${accentColor}40` }}
        >
          <Save className="w-4 h-4" />
          {saveMutation.isPending ? "Updating Archive..." : "Save Preferences"}
        </Button>
      </div>
    </DashboardLayout>
  );
}
