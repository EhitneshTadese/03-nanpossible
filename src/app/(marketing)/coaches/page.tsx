import type { Metadata } from "next";
import Link from "next/link";
import { CoachSearch } from "./CoachSearch";
import { getCoachFacetOptions, listApprovedCoaches } from "@/lib/coaches";
import { getCurrentViewer } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Find a WIAL Certified Coach",
  description:
    "Search WIAL's directory of certified Action Learning coaches by specialization, country, certification level, and language.",
};

export const revalidate = 300;

export default async function CoachesDirectoryPage() {
  const [initialCoaches, facets, viewer] = await Promise.all([
    listApprovedCoaches({ limit: 20 }),
    getCoachFacetOptions(),
    getCurrentViewer(),
  ]);

  const directoryIsEmpty =
    initialCoaches.length === 0 &&
    facets.countries.length === 0 &&
    facets.languages.length === 0;

  const registrationHref = viewer ? "/account/register-coach" : "/register";
  const registrationLabel = viewer
    ? "Register as a coach"
    : "Create an account to register";

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

        {directoryIsEmpty ? (
          <section className="site-panel rounded-[2rem] px-6 py-12 text-center md:px-10 md:py-16">
            <span className="eyebrow">The coach directory is growing</span>
            <h2 className="mx-auto mt-4 max-w-2xl font-display text-[clamp(2.2rem,4vw,3.4rem)] leading-[1.05] tracking-[-0.05em] text-teal-deep">
              No coaches have been approved yet.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-foreground/72">
              New coach profiles appear here as soon as they&apos;re approved by
              a chapter administrator. Check back soon — or register your own
              profile to be part of the launch roster.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link className="button-link primary" href={registrationHref}>
                {registrationLabel}
              </Link>
              <Link className="button-link ghost" href="/certification">
                Learn about certification
              </Link>
            </div>
          </section>
        ) : (
          <CoachSearch facets={facets} initialCoaches={initialCoaches} />
        )}
      </div>
    </div>
  );
}
