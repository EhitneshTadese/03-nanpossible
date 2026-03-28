import { AccountPlaceholder } from "@/components/account-page-shell";
import { requireAccountViewer } from "@/lib/auth";

export default async function DuesPage() {
  await requireAccountViewer("/account/dues", ["coach"]);

  return (
    <AccountPlaceholder
      bullets={[
        "Review dues obligations and future payment-state visibility",
        "Prepare the place where coaches will resolve pending charges",
        "Validate the coach-only navigation and route guard behavior",
      ]}
      description="This route is reserved for the payment-due experience that will follow after the account shell."
      eyebrow="Coach workspace"
      focusLabel="Payment routing live"
      title="Payment dues"
    />
  );
}
