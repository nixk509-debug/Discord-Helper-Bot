import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Save, Palette, Layout, Tag } from "lucide-react";

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

  useEffect(() => {
    if (prefs) {
      setAccentColor(prefs.accentColor || "#dc2626");
      setEmbedStyle(prefs.embedStyle || "modern");
      setBrandName(prefs.brandName || "");
    }
  }, [prefs]);

  const saveMutation = useMutation({
    mutationFn: () => apiRequest("PUT", "/api/preferences", { accentColor, embedStyle, brandName }),
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

        <Card className="glass-card border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-display">
              <Palette className="w-4 h-4 text-primary" /> Accent Color
            </CardTitle>
            <CardDescription>Used for highlights and interactive elements across your dashboard.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="w-12 h-12 rounded-lg cursor-pointer border border-white/10 bg-transparent p-0.5"
                data-testid="input-accent-color"
              />
              <Input
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                placeholder="#dc2626"
                className="font-mono w-36 bg-secondary/50 border-white/10"
                data-testid="input-accent-color-hex"
              />
              <div
                className="w-10 h-10 rounded-lg flex-shrink-0"
                style={{ backgroundColor: accentColor, boxShadow: `0 0 16px ${accentColor}60` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">Default: <span className="font-mono">#dc2626</span> (Archivist red)</p>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-display">
              <Layout className="w-4 h-4 text-primary" /> Embed Style
            </CardTitle>
            <CardDescription>Controls the visual density of embed previews in the builder.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {EMBED_STYLES.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setEmbedStyle(style.id)}
                  data-testid={`button-embed-style-${style.id}`}
                  className={`rounded-xl p-3 text-left border transition-all duration-200 ${
                    embedStyle === style.id
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-white/10 bg-secondary/30 text-muted-foreground hover:border-white/20"
                  }`}
                >
                  <p className="font-semibold text-sm">{style.label}</p>
                  <p className="text-xs mt-0.5 leading-relaxed">{style.desc}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-display">
              <Tag className="w-4 h-4 text-primary" /> Brand Name
            </CardTitle>
            <CardDescription>Optional display name used in welcome messages and bot responses.</CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="e.g. My Server Bot"
              className="bg-secondary/50 border-white/10"
              maxLength={64}
              data-testid="input-brand-name"
            />
            <p className="text-xs text-muted-foreground mt-2">Leave blank to use the default "Archivist" name.</p>
          </CardContent>
        </Card>

        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || isLoading}
          className="w-full h-11 font-semibold text-white gap-2"
          style={{ background: "linear-gradient(135deg, hsl(0,72%,51%), hsl(340,75%,55%))" }}
          data-testid="button-save-preferences"
        >
          <Save className="w-4 h-4" />
          {saveMutation.isPending ? "Saving..." : "Save Preferences"}
        </Button>
      </div>
    </DashboardLayout>
  );
}
