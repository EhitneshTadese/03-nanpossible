import { AccountPlaceholder } from "@/components/account-page-shell";
import { requireAccountViewer } from "@/lib/auth";

export default async function DashboardPage() {
  await requireAccountViewer("/account/dashboard", ["platform_admin"]);

  return (
    <AccountPlaceholder
      bullets={[
        "Global metrics across chapters, coaches, and certifications",
        "At-a-glance platform adoption and operational health",
        "A launch point for future admin workflows and reporting",
      ]}
      description="This will become the admin-only landing view for the full WIAL network."
      eyebrow="Admin workspace"
      focusLabel="Role guard live"
      title="Dashboard"
    />
  );
}
