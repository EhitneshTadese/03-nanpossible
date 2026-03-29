import type { Metadata } from "next";
import { ensureContentPageAudio } from "@/lib/audio";
import { getContentPage } from "@/lib/content";
import { MarketingCertificationHub } from "@/components/certification-hub";

export const metadata: Metadata = {
  title: "WIAL Certification Hub",
  description:
    "Review CALC, PALC, SALC, and MALC requirements, progression paths, renewal rules, application forms, and WIAL LMS access.",
};

export default async function CertificationHubPage() {
  const page = await getContentPage({ slug: "certification" });
  const audio = await ensureContentPageAudio(page);

  return (
    <MarketingCertificationHub
      audioDurationSeconds={audio.durationSeconds ?? page?.audioDurationSeconds ?? null}
      audioUrl={audio.audioUrl ?? page?.audioUrl ?? null}
    />
  );
}
