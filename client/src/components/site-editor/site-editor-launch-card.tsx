import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SurfacePanel } from "@/components/layout/archivist-surfaces";

export function SiteEditorLaunchCard() {
  return (
    <SurfacePanel className="overflow-hidden">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1.05fr)_minmax(280px,0.95fr)]">
        <div className="space-y-4 px-4 py-5 md:px-6">
          <div className="flex flex-wrap gap-2">
            <Badge variant="default">Owner only</Badge>
            <Badge variant="secondary">Drafts first</Badge>
          </div>
          <div>
            <p className="archivist-eyebrow">Archivist Site Editor</p>
            <h2 className="mt-2 text-2xl font-semibold text-white md:text-3xl">Edit landing, login, and dashboard shell content without leaving mobile.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/60">
              Keep changes in draft, preview the real surface, then publish only when the page is ready.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/site-editor">
              <Button className="rounded-[16px]">
                Open Site Editor
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="border-t border-white/6 bg-[#111318] px-4 py-5 lg:border-l lg:border-t-0">
          <div className="rounded-[20px] border border-white/8 bg-[#171a20] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-white/8 bg-[#1d2027] text-[#ff6479]">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Mobile-first workflow</p>
                <p className="text-xs text-white/48">Surface tabs, section sheets, and explicit publish.</p>
              </div>
            </div>

            <div className="mt-4 grid gap-2">
              {[
                "Landing page hero and CTA copy",
                "Login screen trust notes and owner access",
                "Dashboard shell labels, cards, and quick actions",
              ].map((item) => (
                <div key={item} className="rounded-[16px] border border-white/8 bg-[#1d2027] px-3 py-3 text-sm text-white/72">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SurfacePanel>
  );
}
