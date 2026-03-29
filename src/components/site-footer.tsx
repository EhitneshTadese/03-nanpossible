import Link from "next/link";
import type { SiteContext } from "@/lib/types";

type SiteFooterProps = {
  siteContext: SiteContext;
};

export function SiteFooter({ siteContext }: SiteFooterProps) {
  const contactEmail =
    siteContext.tenant?.contactEmail ?? "info@wial.org";

  return (
    <footer className="pb-8">
      <div className="site-shell">
        <div className="site-panel rounded-[2rem] px-6 py-8 md:px-8">
          <div className="grid gap-8 md:grid-cols-[1.5fr_1fr_1fr]">
            <div className="space-y-4">
              <span className="eyebrow">Shared Chapter Shell</span>
              <h2 className="max-w-xl font-display text-3xl leading-none tracking-[-0.04em] text-teal-deep">
                A single WIAL platform for consistent chapters, safer content,
                and faster deployment.
              </h2>
              <p className="max-w-xl text-base leading-7 text-foreground/78">
                This foundation enforces the global layout across chapter sites
                while leaving room for chapter-specific content and future admin
                workflows.
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/55">
                Reach WIAL
              </p>
              <p className="text-sm leading-7 text-foreground/78">
                P.O. Box 7601 #83791
                <br />
                Washington, DC 20044
              </p>
              <Link className="font-semibold text-accent" href={`mailto:${contactEmail}`}>
                {contactEmail}
              </Link>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/55">
                Canonical Pages
              </p>
              <div className="flex flex-col gap-2 text-sm font-semibold text-teal-deep">
                <Link href="/">Home</Link>
                <Link href="/about">About WIAL</Link>
                <Link href="/certification">Certification</Link>
                <Link href="/clients">Our Clients</Link>
                <Link href="/contact">Contact</Link>
              </div>
            </div>
          </div>

          <div className="shell-divider my-7" />

          <div className="flex flex-col gap-3 text-sm text-foreground/62 md:flex-row md:items-center md:justify-between">
            <p>
              {siteContext.isGlobal
                ? "Global WIAL site shell"
                : `${siteContext.tenant?.name} chapter shell`}
              {" "}
              on Next.js, Supabase, Vercel, and Dolt.
            </p>
            <p>Broken archive links and unsafe legacy pages were intentionally excluded.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
