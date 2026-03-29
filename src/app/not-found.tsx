import Link from "next/link";

export default function NotFound() {
  return (
    <div className="page-frame">
      <div className="site-shell">
        <div className="site-panel rounded-[2rem] p-8 md:p-12">
          <span className="eyebrow">Unavailable Page</span>
          <div className="mt-6 max-w-2xl space-y-5">
            <h1 className="font-display text-4xl leading-none tracking-[-0.04em] text-teal-deep md:text-6xl">
              This WIAL page is not available.
            </h1>
            <p className="max-w-xl text-lg leading-8 text-foreground/80">
              The page may not have been migrated yet, the chapter subdomain may
              be unknown, or the original WordPress source was not safe enough
              to import.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link className="button-link primary" href="/">
                Return to the global site
              </Link>
              <Link className="button-link secondary" href="/contact">
                Contact WIAL
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
