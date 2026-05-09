import type { Metadata } from "next";
import { MarketingCertificationHub } from "@/components/certification-hub";

export const metadata: Metadata = {
  title: "WIAL Certification Hub",
  description:
    "Review CALC, PALC, SALC, and MALC requirements, progression paths, renewal rules, application forms, and WIAL LMS access.",
};

export default async function CertificationHubPage() {
  return <MarketingCertificationHub />;
}
