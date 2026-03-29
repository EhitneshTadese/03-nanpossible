import Link from "next/link";
import AudioPlayer from "@/components/AudioPlayer";
import { AccountPageShell } from "@/components/account-page-shell";
import {
  getCertificationHubContent,
  getCertificationLmsUrl,
  getDocumentTargetProps,
  getGlobalCertificationDocuments,
  getTrackDocuments,
} from "@/lib/certification";
import type { CertificationDocument, CertificationTrack } from "@/lib/types";

function DocumentCard({
  document,
  accent,
}: {
  document: CertificationDocument;
  accent?: string;
}) {
  return (
    <article className="feature-card rounded-[1.4rem]">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
        {document.kind.replace("_", " ")} · {document.fileType.toUpperCase()}
      </p>
      <h3 className="mt-3 text-xl leading-tight text-teal-deep">{document.label}</h3>
      <p className="mt-3 text-sm leading-6 text-foreground/70">{document.updatedLabel}</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          className={`button-link ${accent ?? "secondary"}`}
          href={document.href}
          {...getDocumentTargetProps(document)}
        >
          Open download
        </Link>
        {document.sourceUrl ? (
          <Link
            className="inline-flex items-center text-sm font-semibold text-teal transition hover:text-accent"
            href={document.sourceUrl}
            rel="noreferrer"
            target="_blank"
          >
            Source file
          </Link>
        ) : null}
      </div>
    </article>
  );
}

function TrackSection({ track }: { track: CertificationTrack }) {
  const documents = getTrackDocuments(track.key);
  const lmsUrl = getCertificationLmsUrl(track.level);

  return (
    <section className="site-panel rounded-[2rem] p-6 md:p-8" id={track.anchor}>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_340px]">
        <div className="space-y-6">
          <div className="space-y-3">
            <span className="eyebrow">{track.level}</span>
            <div className="space-y-3">
              <h2 className="section-title text-teal-deep">{track.title}</h2>
              <p className="text-base font-semibold uppercase tracking-[0.16em] text-foreground/52">
                {track.tagline}
              </p>
              <p className="max-w-4xl text-lg leading-8 text-foreground/76">
                {track.summary}
              </p>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <article className="feature-card rounded-[1.55rem]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                Eligibility
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-foreground/78">
                {track.eligibility.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-accent" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="feature-card rounded-[1.55rem]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                What the application expects
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-foreground/78">
                {track.requirements.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-teal" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          </div>

          <article className="rounded-[1.55rem] border border-line/70 bg-[linear-gradient(135deg,rgba(32,92,89,0.08),rgba(184,143,69,0.08))] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
              Progression note
            </p>
            <p className="mt-3 text-base leading-7 text-foreground/76">
              {track.progressionLabel}
            </p>
          </article>
        </div>

        <aside className="space-y-4">
          {documents.requirements ? (
            <DocumentCard document={documents.requirements} accent="primary" />
          ) : null}
          {documents.application ? (
            <DocumentCard document={documents.application} accent="secondary" />
          ) : null}
          {documents.recertification ? (
            <DocumentCard document={documents.recertification} accent="secondary" />
          ) : null}

          <section className="site-panel rounded-[1.6rem] border border-line/60 bg-white/55 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
              External LMS
            </p>
            <p className="mt-3 text-sm leading-7 text-foreground/74">{track.lmsSummary}</p>
            {lmsUrl ? (
              <Link
                className="button-link secondary mt-5"
                href={lmsUrl}
                rel="noreferrer"
                target="_blank"
              >
                Open {track.level} in LMS
              </Link>
            ) : null}
          </section>
        </aside>
      </div>
    </section>
  );
}

function CertificationHubSections({
  audioDurationSeconds,
  audioUrl,
  mode,
}: {
  audioDurationSeconds?: number | null;
  audioUrl?: string | null;
  mode: "marketing" | "account";
}) {
  const content = getCertificationHubContent();
  const globalDocuments = getGlobalCertificationDocuments();

  return (
    <div className="space-y-6">
      {mode === "marketing" ? (
        <section className="site-panel overflow-hidden rounded-[2.4rem] p-6 md:p-10">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_320px]">
            <div className="space-y-5">
              <span className="eyebrow">{content.hero.eyebrow}</span>
              <div className="space-y-4">
                <h1 className="max-w-5xl font-display text-[clamp(3.2rem,7vw,6.2rem)] leading-[0.94] tracking-[-0.07em] text-teal-deep">
                  {content.hero.title}
                </h1>
                <p className="max-w-4xl text-lg leading-8 text-foreground/78">
                  {content.hero.intro}
                </p>
                <AudioPlayer
                  audioUrl={audioUrl ?? null}
                  duration={audioDurationSeconds ?? null}
                  pageTitle="WIAL Certification Hub"
                />
              </div>
            </div>

            <aside className="grid gap-3">
              {content.hero.metrics.map((metric) => (
                <article className="metric-card rounded-[1.3rem]" key={metric.label}>
                  <p className="metric-value text-teal-deep">{metric.value}</p>
                  <p className="mt-2 text-sm font-semibold uppercase tracking-[0.14em] text-foreground/58">
                    {metric.label}
                  </p>
                </article>
              ))}
            </aside>
          </div>

          <nav className="mt-8 overflow-x-auto">
            <div className="flex min-w-max gap-3">
              {content.hero.anchors.map((anchor) => (
                <Link
                  className="rounded-full border border-line bg-white/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-teal transition hover:border-accent hover:text-accent"
                  href={`#${anchor.id}`}
                  key={anchor.id}
                >
                  {anchor.label}
                </Link>
              ))}
            </div>
          </nav>
        </section>
      ) : (
        <section className="site-panel rounded-[2rem] p-5 md:p-6">
          <div className="space-y-4">
            <p className="max-w-4xl text-base leading-7 text-foreground/74">
              Use this page to review certification requirements, renewal rules, application
              packets, and the current LMS launch points without leaving the shared account
              shell.
            </p>
            <nav className="overflow-x-auto">
              <div className="flex min-w-max gap-3">
                {content.hero.anchors.map((anchor) => (
                  <Link
                    className="rounded-full border border-line bg-white/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-teal transition hover:border-accent hover:text-accent"
                    href={`#${anchor.id}`}
                    key={anchor.id}
                  >
                    {anchor.label}
                  </Link>
                ))}
              </div>
            </nav>
          </div>
        </section>
      )}

      <section className="site-panel rounded-[2rem] p-6 md:p-8" id="progression">
        <div className="space-y-4">
          <span className="eyebrow">Progression</span>
          <h2 className="section-title text-teal-deep">
            One structured path from foundational coaching to master-level leadership.
          </h2>
          <p className="max-w-4xl text-lg leading-8 text-foreground/76">
            WIAL progression is cumulative. Each level adds new coaching scope, more
            documented experience, stronger observation requirements, and a higher bar for
            contribution to the Action Learning community.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {content.progression.map((step, index) => (
            <article className="feature-card rounded-[1.55rem]" key={step.title}>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                Step {index + 1}
              </p>
              <h3 className="mt-3 text-2xl leading-none text-teal-deep">{step.title}</h3>
              <p className="mt-4 text-sm leading-7 text-foreground/74">{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      {content.tracks.map((track) => (
        <TrackSection key={track.key} track={track} />
      ))}

      <section className="site-panel rounded-[2rem] p-6 md:p-8" id="recertification">
        <div className="space-y-4">
          <span className="eyebrow">Recertification</span>
          <h2 className="section-title text-teal-deep">
            Renewal requirements are clear, level-specific, and tied to current WIAL packets.
          </h2>
          <p className="max-w-4xl text-lg leading-8 text-foreground/76">
            Renewal expectations differ by certification level. The cards below summarize the
            current requirements and link back to the official packet that carries the detailed
            renewal rules.
          </p>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {content.recertification.map((rule) => {
            const track = content.tracks.find((entry) => entry.key === rule.track);
            const recertDocument = getTrackDocuments(rule.track).recertification;

            return (
              <article className="feature-card rounded-[1.65rem]" key={rule.track}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                      {track?.level} renewal
                    </p>
                    <h3 className="mt-2 text-2xl leading-none text-teal-deep">
                      Valid for {rule.validity}
                    </h3>
                  </div>
                  {recertDocument ? (
                    <Link
                      className="button-link secondary"
                      href={recertDocument.href}
                      {...getDocumentTargetProps(recertDocument)}
                    >
                      Renewal packet
                    </Link>
                  ) : null}
                </div>

                <ul className="mt-5 space-y-3 text-sm leading-7 text-foreground/76">
                  {rule.annualRequirements.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-teal" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                {rule.expiredPolicy?.length ? (
                  <div className="mt-5 rounded-[1.25rem] border border-line/70 bg-white/55 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                      Expired credential policy
                    </p>
                    <ul className="mt-3 space-y-3 text-sm leading-7 text-foreground/74">
                      {rule.expiredPolicy.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      <section className="site-panel rounded-[2rem] p-6 md:p-8" id="forms">
        <div className="space-y-4">
          <span className="eyebrow">Forms and downloads</span>
          <h2 className="section-title text-teal-deep">
            Current application packets, requirement guides, and reference files.
          </h2>
          <p className="max-w-4xl text-lg leading-8 text-foreground/76">
            WIAL still uses a mix of PDFs and legacy Word application forms. The mirrored
            downloads below preserve the current application packets while avoiding brittle
            third-party or unstable source links.
          </p>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {content.documents.map((document) => (
            <DocumentCard document={document} key={document.id} />
          ))}
        </div>
      </section>

      <section className="site-panel rounded-[2rem] p-6 md:p-8" id="lms">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_360px]">
          <div className="space-y-4">
            <span className="eyebrow">External LMS</span>
            <h2 className="section-title text-teal-deep">
              WIAL keeps the current LMS and the website acts as the guide rail, not the course host.
            </h2>
            <p className="max-w-4xl text-lg leading-8 text-foreground/76">
              The LMS remains the canonical home for e-learning, course progress, and
              credential refresh workflows. This website explains the path, points coaches to
              the right entry point, and stays aligned with the current external system instead
              of duplicating it.
            </p>
          </div>

          <div className="grid gap-4">
            {content.tracks.map((track) => (
              <article className="feature-card rounded-[1.45rem]" key={track.key}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                  {track.level}
                </p>
                <h3 className="mt-3 text-xl text-teal-deep">{track.title}</h3>
                <p className="mt-3 text-sm leading-7 text-foreground/74">{track.lmsSummary}</p>
                <Link
                  className="button-link secondary mt-5"
                  href={getCertificationLmsUrl(track.level) ?? "https://wialportal.org/"}
                  rel="noreferrer"
                  target="_blank"
                >
                  Open LMS
                </Link>
              </article>
            ))}
            {globalDocuments.map((document) => (
              <DocumentCard document={document} key={document.id} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export function MarketingCertificationHub({
  audioDurationSeconds,
  audioUrl,
}: {
  audioDurationSeconds?: number | null;
  audioUrl?: string | null;
}) {
  return (
    <div className="page-frame">
      <div className="site-shell">
        <CertificationHubSections
          audioDurationSeconds={audioDurationSeconds}
          audioUrl={audioUrl}
          mode="marketing"
        />
      </div>
    </div>
  );
}

export function AccountCertificationHub() {
  return (
    <AccountPageShell
      badge="Coach learning map"
      description="Use the same global certification standard, renewal guidance, application packets, and LMS links that power the public certification hub."
      eyebrow="Coach workspace"
      title="Certification courses"
    >
      <CertificationHubSections mode="account" />
    </AccountPageShell>
  );
}
