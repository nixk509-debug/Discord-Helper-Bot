import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { SiteEditorFieldDefinition, SiteEditorSectionDefinition } from "@/lib/site-editor";

export function SiteEditorSectionSheet({
  open,
  onOpenChange,
  section,
  isMobile,
  onFieldChange,
  onToggleVisible,
  onMove,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  section: SiteEditorSectionDefinition | null;
  isMobile: boolean;
  onFieldChange: (fieldKey: string, value: string) => void;
  onToggleVisible: () => void;
  onMove: (direction: "up" | "down") => void;
}) {
  const side = isMobile ? "bottom" : "right";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        className={
          isMobile
            ? "h-[92dvh] max-h-[100dvh] rounded-t-[28px] border-t border-white/10 bg-[#0d0f13] p-0"
            : "w-full max-w-[560px] border-l border-white/10 bg-[#0d0f13] p-0"
        }
      >
        <div className="flex h-full flex-col">
          <SheetHeader className="border-b border-white/6 px-4 pb-4 pt-5">
            <div className="space-y-1">
              <SheetTitle className="text-white">{section?.label || "Section"}</SheetTitle>
              <SheetDescription className="text-white/60">
                {section?.description || "Edit the values for this section and keep the page structured."}
              </SheetDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-3">
              <div className="flex items-center gap-2 rounded-[14px] border border-white/10 bg-[#15181e] px-3 py-2">
                <Switch checked={section?.visible ?? false} onCheckedChange={onToggleVisible} disabled={!section} />
                <span className="text-sm text-white">{section?.visible ? "Visible" : "Hidden"}</span>
              </div>
              <Button size="sm" variant="outline" className="rounded-[14px] border-white/10 bg-white/[0.03]" disabled={!section} onClick={() => onMove("up")}>
                Move up
              </Button>
              <Button size="sm" variant="outline" className="rounded-[14px] border-white/10 bg-white/[0.03]" disabled={!section} onClick={() => onMove("down")}>
                Move down
              </Button>
            </div>
          </SheetHeader>

          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 pb-[calc(env(safe-area-inset-bottom)+5.5rem)]">
            {section ? (
              section.fields.map((field) => <FieldEditor key={field.key} field={field} onChange={(value) => onFieldChange(field.key, value)} />)
            ) : (
              <div className="rounded-[18px] border border-white/8 bg-[#111318] px-4 py-4 text-sm text-white/56">
                No section selected.
              </div>
            )}
          </div>

          <div className="border-t border-white/8 bg-[#090a0d]/96 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-xl">
            <Button variant="outline" className="w-full rounded-[16px] border-white/10 bg-white/[0.03] text-white" onClick={() => onOpenChange(false)}>
              Done editing
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function FieldEditor({
  field,
  onChange,
}: {
  field: SiteEditorFieldDefinition;
  onChange: (value: string) => void;
}) {
  const inputId = `site-editor-${field.key}`;

  return (
    <label className="block space-y-2 rounded-[20px] border border-white/8 bg-[#111318] px-4 py-4">
      <div className="space-y-1">
        <Label htmlFor={inputId} className="text-white">
          {field.label}
        </Label>
        {field.description ? <p className="text-sm leading-6 text-white/56">{field.description}</p> : null}
      </div>

      {field.kind === "textarea" ? (
        <Textarea
          id={inputId}
          name={field.key}
          autoComplete="off"
          value={String(field.value ?? "")}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder}
          className="min-h-[110px] rounded-[16px] border-white/10 bg-[#171a20] text-white"
        />
      ) : (
        <Input
          id={inputId}
          name={field.key}
          type={field.kind === "link_url" || field.kind === "image_url" ? "url" : "text"}
          autoComplete="off"
          inputMode={field.kind === "link_url" || field.kind === "image_url" ? "url" : "text"}
          value={String(field.value ?? "")}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder}
          className="h-12 rounded-[16px] border-white/10 bg-[#171a20] text-white"
        />
      )}
    </label>
  );
}
