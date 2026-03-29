import { AccountPlaceholder } from "@/components/account-page-shell";
import { requireAccountViewer } from "@/lib/auth";

export default async function CoachesPage() {
  await requireAccountViewer("/account/coaches", ["chapter_admin"]);

  return (
    <AccountPlaceholder
      bullets={[
        "Review coach roster and chapter-specific directory records",
        "Approve or update coach details before public publication",
        "Prepare future links to certifications and dues status",
      ]}
      description="This route will grow into the chapter-head control surface for coach operations."
      eyebrow="Chapter workspace"
      focusLabel="Coach management"
      title="Coaches"
    />
  );
}
