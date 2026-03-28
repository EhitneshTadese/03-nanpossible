import { AccountPlaceholder } from "@/components/account-page-shell";
import { requireAccountViewer } from "@/lib/auth";

export default async function RevenuePage() {
  await requireAccountViewer("/account/revenue", ["chapter_admin"]);

  return (
    <AccountPlaceholder
      bullets={[
        "Monitor chapter dues, paid totals, and upcoming payment activity",
        "Surface payment trends tied to local chapter operations",
        "Establish the layout and permissions for future finance reporting",
      ]}
      description="This chapter-head view is intentionally live now so revenue reporting can plug into a ready-made workspace."
      eyebrow="Chapter workspace"
      focusLabel="Finance placeholder"
      title="Chapter revenue dashboard"
    />
  );
}
