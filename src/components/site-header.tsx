import Link from "next/link";
import { AccessibilityPreferencesWidget } from "@/components/accessibility-preferences";
import { MobileNav } from "@/components/mobile-nav";
import { WialLogo } from "@/components/wial-logo";
import { getAccountNavItems } from "@/lib/account";
import { navigationItems } from "@/lib/routing";
import type { SiteContext, UserProfile } from "@/lib/types";

type SiteHeaderProps = {
  siteContext: SiteContext;
  viewer: UserProfile | null;
};

export function SiteHeader({ siteContext, viewer }: SiteHeaderProps) {
  const chapterLabel = siteContext.tenant?.name ?? null;
  const accountLink = viewer
    ? {
        href: "/account",
        label: "Open account",
      }
    : {
        href: "/login",
        label: "Sign in",
      };
  const voiceNavigationRoutes = [
    { href: "/", label: "Home" },
    ...navigationItems,
    ...(viewer ? getAccountNavItems(viewer.role) : []),
    accountLink,
    ...(!viewer ? [{ href: "/register", label: "Register" }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-transparent bg-[var(--background)]/85 py-3 backdrop-blur-xl">
      <div className="site-shell">
        <div className="site-panel flex items-center gap-3 px-4 py-3 sm:px-5 lg:gap-5 lg:px-6">
          <div className="min-w-0 flex-1">
            <WialLogo chapterLabel={chapterLabel} />
          </div>

          <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex xl:gap-2">
            {navigationItems.map((item) => (
              <Link
                className="whitespace-nowrap rounded-full px-3 py-2 text-sm font-semibold text-teal-deep transition hover:bg-accent-soft xl:px-4"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            <div className="hidden text-right xl:block">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/50">
                Platform
              </p>
              <p className="text-sm font-semibold text-teal-deep">
                {siteContext.isGlobal
                  ? "Global WIAL"
                  : `${siteContext.tenant?.subdomain}.wial.org`}
              </p>
            </div>
            {!viewer ? (
              <Link
                className="hidden text-sm font-semibold text-teal-deep/78 transition hover:text-teal-deep xl:inline-flex"
                href="/register"
              >
                Register
              </Link>
            ) : null}
            <AccessibilityPreferencesWidget
              navigationRoutes={voiceNavigationRoutes}
              variant="desktop"
            />
            <Link
              className="button-link secondary hidden min-w-[8.75rem] px-4 py-2.5 text-sm sm:inline-flex sm:min-w-[9.5rem]"
              href={accountLink.href}
            >
              {accountLink.label}
            </Link>
            <div className="flex items-center gap-2 lg:hidden">
              <AccessibilityPreferencesWidget
                navigationRoutes={voiceNavigationRoutes}
                variant="mobile"
              />
              <MobileNav
                accountLink={accountLink}
                chapterLabel={chapterLabel}
                items={navigationItems}
                viewer={viewer}
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
