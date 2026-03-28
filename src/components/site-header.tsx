import Link from "next/link";
import { MobileNav } from "@/components/mobile-nav";
import { WialLogo } from "@/components/wial-logo";
import { navigationItems } from "@/lib/routing";
import type { SiteContext } from "@/lib/types";

type SiteHeaderProps = {
  siteContext: SiteContext;
};

export function SiteHeader({ siteContext }: SiteHeaderProps) {
  const chapterLabel = siteContext.tenant?.name ?? null;

  return (
    <header className="sticky top-0 z-40 border-b border-transparent bg-background/88 py-4 backdrop-blur-xl">
      <div className="site-shell">
        <div className="site-panel flex items-center justify-between gap-6 rounded-[2rem] px-5 py-4 md:px-7">
          <WialLogo chapterLabel={chapterLabel} />

          <nav className="hidden items-center gap-2 md:flex">
            {navigationItems.map((item) => (
              <Link
                className="rounded-full px-4 py-2 text-sm font-semibold text-teal-deep transition hover:bg-accent-soft"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden text-right md:block">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/50">
                Platform
              </p>
              <p className="text-sm font-semibold text-teal-deep">
                {siteContext.isGlobal
                  ? "Global WIAL"
                  : `${siteContext.tenant?.subdomain}.wial.org`}
              </p>
            </div>
            <MobileNav chapterLabel={chapterLabel} items={navigationItems} />
          </div>
        </div>
      </div>
    </header>
  );
}
