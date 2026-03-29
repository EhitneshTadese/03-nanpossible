import { AccountPageShell } from "@/components/account-page-shell";
import { requireAccountViewer } from "@/lib/auth";
import { DuesClient } from "./DuesClient";

export default async function DuesPage() {
  const user = await requireAccountViewer("/account/dues", ["coach"]);

  return (
    <AccountPageShell
      badge="Payment integration live"
      description="Review your payment obligations and pay outstanding dues using Stripe."
      eyebrow="Coach workspace"
      title="Payment dues"
    >
      <DuesClient userName={user.name} />
    </AccountPageShell>
  );
}
