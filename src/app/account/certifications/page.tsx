import { AccountPlaceholder } from "@/components/account-page-shell";
import { requireAccountViewer } from "@/lib/auth";

export default async function CertificationsPage() {
  await requireAccountViewer("/account/certifications", ["coach"]);

  return (
    <AccountPlaceholder
      bullets={[
        "Browse assigned certification tracks and future learning modules",
        "Track where course access will connect to certification records",
        "Validate that coaches land in the correct default workspace",
      ]}
      description="This coach route anchors the future certification learning experience inside the shared account shell."
      eyebrow="Coach workspace"
      focusLabel="Coach default destination"
      title="Certification courses"
    />
  );
}
