import type { Metadata } from "next";
import AudioPlayer from "@/components/AudioPlayer";
import { ensureStandalonePageAudio } from "@/lib/audio";
import { CoachSearch } from "./CoachSearch";
import { getCoachFacetOptions, listApprovedCoaches } from "@/lib/coaches";

export const metadata: Metadata = {
  title: "Find a WIAL Certified Coach",
  description:
    "Search WIAL's directory of certified Action Learning coaches by specialization, country, certification level, and language.",
};

export const revalidate = 300;

export default async function CoachesDirectoryPage() {
  const [initialCoaches, facets, audio] = await Promise.all([
    listApprovedCoaches({ limit: 20 }),
    getCoachFacetOptions(),
    ensureStandalonePageAudio({
      objectKey: "pages/global/coaches.mp3",
      language: "en",
      text: [
        "Coach directory.",
        "Find a WIAL-certified coach for your next high-stakes team challenge.",
        "Search across languages, specializations, and certification levels.",
        "The directory is designed for global discovery, so a Portuguese or Korean query can still surface the right coach.",
        "WIAL chapters can publish one vetted coach roster while still supporting local markets, multilingual search, and chapter-level approvals.",
      ].join(" "),
    }),
  ]);

  return (
    <div className="page-frame">
      <div className="site-shell space-y-6">
        <section className="site-panel overflow-hidden rounded-[2.4rem] px-6 py-10 md:px-10 md:py-12">
          <div className="coach-hero-grid">
            <div className="space-y-5">
              <span className="eyebrow">Coach directory</span>
              <h1 className="font-display text-[clamp(3.1rem,7vw,5.8rem)] leading-[0.94] tracking-[-0.07em] text-teal-deep">
                Find a WIAL-certified coach for your next high-stakes team
                challenge.
              </h1>
              <p className="max-w-3xl text-lg leading-8 text-foreground/75">
                Search across languages, specializations, and certification
                levels. The directory is designed for global discovery, so a
                Portuguese or Korean query can still surface the right coach.
              </p>
              <div className="max-w-3xl">
                <AudioPlayer
                  audioUrl={audio.audioUrl}
                  duration={audio.durationSeconds}
                  pageTitle="WIAL coach directory"
                />
              </div>
            </div>

            <div className="coach-callout">
              <p className="coach-callout-label">Why this directory matters</p>
              <p className="mt-3 text-base leading-7 text-foreground/72">
                WIAL chapters can publish one vetted coach roster while still
                supporting local markets, multilingual search, and chapter-level
                approvals.
              </p>
            </div>
          </div>
        </section>

        <CoachSearch facets={facets} initialCoaches={initialCoaches} />
      </div>
    </div>
  );
}
