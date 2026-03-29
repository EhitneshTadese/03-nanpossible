import { AccountPageShell } from "@/components/account-page-shell";
import { requireAccountViewer } from "@/lib/auth";
import { RevenueClient } from "./RevenueClient";

export default async function RevenuePage() {
  await requireAccountViewer("/account/revenue", ["chapter_admin"]);

  return (
    <AccountPageShell
      badge="Finance dashboard live"
      description="Monitor chapter dues, paid totals, and payment trends in real-time."
      eyebrow="Chapter workspace"
      title="Chapter revenue dashboard"
    >
      <RevenueClient />
    </AccountPageShell>
  );
}
