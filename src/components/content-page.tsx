import Link from "next/link";
import type { ContentPageRecord, ContentSection, SiteContext } from "@/lib/types";

type ContentPageProps = {
  page: ContentPageRecord;
  siteContext: SiteContext;
};

function renderSection(section: ContentSection) {
  switch (section.type) {
    case "prose":
      return (
        <section className="section-stack" key={section.title}>
          <div className="space-y-4">
            <h2 className="section-title text-teal-deep">{section.title}</h2>
            <div className="section-copy">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {section.bullets?.length ? (
                <ul className="section-list list-disc">
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </section>
      );
    case "feature_grid":
      return (
        <section className="section-stack" key={section.title}>
          <h2 className="section-title text-teal-deep">{section.title}</h2>
          <div className="feature-grid">
            {section.items.map((item) => (
              <article className="feature-card rounded-[1.5rem]" key={item.title}>
                {item.eyebrow ? (
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                    {item.eyebrow}
                  </p>
                ) : null}
                <h3>{item.title}</h3>
                <p className="mt-3">{item.body}</p>
                {item.href && item.label ? (
                  <Link className="mt-5 inline-flex font-semibold text-teal" href={item.href}>
                    {item.label}
                  </Link>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      );
    case "timeline":
      return (
        <section className="section-stack" key={section.title}>
          <h2 className="section-title text-teal-deep">{section.title}</h2>
          <div className="grid gap-4">
            {section.items.map((item) => (
              <article
                className="feature-card rounded-[1.5rem] md:grid md:grid-cols-[120px_1fr] md:items-start md:gap-6"
                key={`${item.title}-${item.year ?? "present"}`}
              >
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
                  {item.year ?? "Now"}
                </p>
                <div className="mt-3 space-y-2 md:mt-0">
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      );
    case "quote":
      return (
        <section className="quote-block rounded-[1.75rem]" key={section.attribution}>
          <p>&quot;{section.quote}&quot;</p>
          <span className="mt-4 inline-block text-sm font-semibold uppercase tracking-[0.16em] text-teal">
            {section.attribution}
          </span>
        </section>
      );
    case "resource_list":
      return (
        <section className="section-stack" key={section.title}>
          <div className="space-y-4">
            <h2 className="section-title text-teal-deep">{section.title}</h2>
            <p className="max-w-3xl text-base leading-7 text-foreground/75">
              {section.description}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {section.items.map((item) => (
              <article className="feature-card rounded-[1.5rem]" key={item.title}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                  {item.kind}
                </p>
                <h3 className="mt-3">{item.title}</h3>
                <p className="mt-3">{item.body}</p>
                <Link
                  className="mt-5 inline-flex font-semibold text-teal"
                  href={item.href}
                  rel="noreferrer"
                  target="_blank"
                >
                  {item.label}
                </Link>
              </article>
            ))}
          </div>
        </section>
      );
    case "contact_cards":
      return (
        <section className="section-stack" key={section.title}>
          <h2 className="section-title text-teal-deep">{section.title}</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {section.items.map((item) => (
              <article className="feature-card rounded-[1.5rem]" key={item.title}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                  {item.eyebrow}
                </p>
                <h3 className="mt-3">{item.title}</h3>
                <p className="mt-3 whitespace-pre-line">{item.body}</p>
                {item.href && item.label ? (
                  <Link className="mt-5 inline-flex font-semibold text-teal" href={item.href}>
                    {item.label}
                  </Link>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      );
    case "cta":
      return (
        <section
          className="rounded-[1.9rem] border border-line bg-[linear-gradient(135deg,rgba(32,92,89,0.08),rgba(200,100,47,0.08))] p-6 md:p-8"
          key={section.title}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl space-y-3">
              <span className="eyebrow">Next step</span>
              <h2 className="section-title text-teal-deep">{section.title}</h2>
              <p className="text-base leading-7 text-foreground/78">{section.body}</p>
            </div>
            <Link className="button-link primary" href={section.href}>
              {section.label}
            </Link>
          </div>
        </section>
      );
  }
}

export function ContentPage({ page, siteContext }: ContentPageProps) {
  const body = page.bodyRichtext;

  return (
    <div className="page-frame">
      <div className="site-shell">
        <div className="hero-grid">
          <section className="site-panel rounded-[2rem] p-7 md:p-10">
            <div className="space-y-5">
              <span className="eyebrow">
                {siteContext.isGlobal ? "Global WIAL" : `${siteContext.tenant?.name} chapter`}
              </span>
              <div className="space-y-4">
                <h1 className="max-w-4xl font-display text-4xl leading-none tracking-[-0.05em] text-teal-deep md:text-7xl">
                  {page.title}
                </h1>
                {body.heroIntro ? (
                  <p className="max-w-3xl text-lg leading-8 text-foreground/82">
                    {body.heroIntro}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-3">
                <Link className="button-link primary" href="/contact">
                  Contact WIAL
                </Link>
                <Link className="button-link secondary" href="/resources">
                  Explore resources
                </Link>
              </div>
            </div>
          </section>

          <aside className="site-panel rounded-[2rem] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/55">
              Page context
            </p>
            <div className="mt-4 grid gap-3">
              {body.metrics.map((metric) => (
                <article className="metric-card rounded-[1.35rem]" key={metric.label}>
                  <p className="metric-value text-teal-deep">{metric.value}</p>
                  <p className="mt-2 text-sm font-semibold uppercase tracking-[0.14em] text-foreground/60">
                    {metric.label}
                  </p>
                </article>
              ))}
            </div>
          </aside>
        </div>

        <div className="mt-6 grid gap-5">
          {body.sections.map((section) => renderSection(section))}
        </div>
      </div>
    </div>
  );
}
