import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  formatCoachLocation,
  getApprovedCoachById,
  getCertificationBadgeTone,
  getCoachInitials,
  listApprovedCoachIds,
} from "@/lib/coaches";

import { formatPhoneNumberIntl } from "react-phone-number-input";
import { parsePhoneNumber } from "libphonenumber-js"

type CoachDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export const revalidate = 300;

export async function generateStaticParams() {
  const ids = await listApprovedCoachIds();
  return ids.map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: CoachDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const coach = await getApprovedCoachById(id);

  if (!coach) {
    return {
      title: "Coach not found",
    };
  }

  return {
    title: `${coach.name} | WIAL Coach Directory`,
    description:
      coach.bio?.slice(0, 155) ??
      `${coach.name} is a WIAL-certified coach listed in the global directory.`,
  };
}

export default async function CoachDetailPage({ params }: CoachDetailPageProps) {
  const { id } = await params;
  const coach = await getApprovedCoachById(id);

  if (!coach) {
    notFound();
  }

  const location = formatCoachLocation(coach);
  const credlyBadgeImage =
    coach.credlyBadgeImageUrl ??
    (coach.credlyBadgeUrl?.match(/\.(png|jpg|jpeg|webp|svg)(?:\?.*)?$/i)
      ? coach.credlyBadgeUrl
      : null);
  const showCredlyBadgeImage = Boolean(
    credlyBadgeImage?.match(/^https:\/\/(images\.credly\.com|wial\.org|www\.wial\.org)\//i),
  );

  return (
    <div className="page-frame">
      <div className="site-shell space-y-6">
        <Link
          className="inline-flex items-center gap-2 text-sm font-semibold text-teal transition hover:text-accent"
          href="/coaches"
        >
          <span aria-hidden="true">←</span>
          Back to directory
        </Link>

        <section className="site-panel overflow-hidden rounded-[2.4rem] p-6 md:p-10">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_340px]">
            <div className="space-y-6">
              <div className="flex flex-wrap items-start gap-5">
                <div className="coach-avatar-frame h-28 w-28">
                  {coach.photoUrl ? (
                    <Image
                      alt={coach.name}
                      className="h-full w-full object-cover"
                      height={112}
                      src={coach.photoUrl}
                      width={112}
                    />
                  ) : (
                    <span className="coach-avatar-fallback text-3xl">
                      {getCoachInitials(coach.name)}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-3">
                  <span className="eyebrow">Approved WIAL coach</span>
                  <h1 className="font-display text-5xl leading-none tracking-[-0.06em] text-teal-deep">
                    {coach.name}
                  </h1>
                  <div className="flex flex-wrap gap-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] ${getCertificationBadgeTone(coach.certLevel)}`}
                    >
                      {coach.certLevel ?? "Pending"}
                    </span>
                    {location ? (
                      <span className="coach-result-chip">{location}</span>
                    ) : null}
                    {coach.languages.length ? (
                      <span className="coach-result-chip">
                        {coach.languages.map((language) => language.toUpperCase()).join(", ")}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="site-panel rounded-[1.75rem] border border-line/60 bg-white/55 p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/46">
                  Full bio
                </p>
                <p className="mt-4 text-lg leading-8 text-foreground/78">
                  {coach.bio ?? "This coach has not added a public bio yet."}
                </p>
              </div>

              {coach.specializations.length ? (
                <section className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/46">
                    Specializations
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {coach.specializations.map((specialization) => (
                      <span className="coach-pill" key={specialization}>
                        {specialization}
                      </span>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>

            <aside className="space-y-5">
              <section className="site-panel rounded-[1.85rem] p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/46">
                  Contact
                </p>
                <div className="mt-4 grid gap-3 text-sm leading-7 text-foreground/78">
                  {coach.email ? (
                    <a href={`mailto:${coach.email}`}>{coach.email}</a>
                  ) : null}
               {coach.phone ? (
  <a href={`tel:${coach.phone}`}>
    {parsePhoneNumber(coach.phone)?.formatInternational() ?? coach.phone}
  </a>
) : null}
                  {coach.website ? (
                    <a href={coach.website} rel="noreferrer" target="_blank">
                      Website
                    </a>
                  ) : null}
                  {coach.linkedin ? (
                    <a href={coach.linkedin} rel="noreferrer" target="_blank">
                      LinkedIn
                    </a>
                  ) : null}
                </div>
              </section>

              <section className="site-panel rounded-[1.85rem] p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/46">
                  Location
                </p>
                <p className="mt-4 text-base leading-7 text-foreground/78">
                  {location || "Location not published"}
                </p>
              </section>

              {coach.credlyBadgeUrl ? (
                <section className="site-panel rounded-[1.85rem] p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/46">
                    Credly badge
                  </p>
                  {coach.credlyBadgeTitle ? (
                    <p className="mt-3 text-sm font-semibold text-teal-deep">
                      {coach.credlyBadgeTitle}
                    </p>
                  ) : null}
                  {showCredlyBadgeImage && credlyBadgeImage ? (
                    <Image
                      alt={coach.credlyBadgeTitle ?? `${coach.name} Credly badge`}
                      className="mt-4 rounded-[1.25rem] border border-line bg-white/80"
                      height={180}
                      src={credlyBadgeImage}
                      width={180}
                    />
                  ) : null}
                  <a
                    className="button-link secondary mt-4"
                    href={coach.credlyBadgeUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    View Credly badge
                  </a>
                </section>
              ) : null}
            </aside>
          </div>
        </section>
      </div>
    </div>
  );
}
