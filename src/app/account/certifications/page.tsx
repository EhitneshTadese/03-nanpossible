import { AccountCertificationHub } from "@/components/certification-hub";
import { requireAccountViewer } from "@/lib/auth";

export default async function CertificationsPage() {
  await requireAccountViewer("/account/certifications", ["coach"]);

  return <AccountCertificationHub />;
}

