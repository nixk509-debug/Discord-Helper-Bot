import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { SiteEditorWorkspace } from "@/components/site-editor/site-editor-workspace";

export default function SiteEditorPage() {
  return (
    <DashboardLayout mode="site-editor">
      <SiteEditorWorkspace />
    </DashboardLayout>
  );
}
