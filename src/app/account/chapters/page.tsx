import { AccountPlaceholder } from "@/components/account-page-shell";
import { requireAccountViewer } from "@/lib/auth";

export default async function ChaptersPage() {
  await requireAccountViewer("/account/chapters", ["platform_admin"]);

  return (
    <AccountPlaceholder
      bullets={[
        "Manage the global chapter registry and chapter-head assignments",
        "Review chapter status, tenant metadata, and readiness for rollout",
        "Prepare future invite and governance workflows for chapter leads",
      ]}
      description="This route is reserved for global administrators who manage chapters and their leaders."
      eyebrow="Admin workspace"
      focusLabel="Network administration"
      title="Chapters and Chapter Heads"
    />
  );
}
