"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();
  const chapterLabel = siteContext.tenant?.name ?? null;

  const voiceNavigationRoutes = [
    { href: "/", label: "Home" },
    ...navigationItems,
    ...(viewer ? getAccountNavItems(viewer.role) : []),
    ...(!viewer
      ? [
          { href: "/login", label: "Sign in" },
          { href: "/register", label: "Register" },
        ]
      : []),
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-transparent bg-[var(--background)]/85 py-3 backdrop-blur-xl">
      <div className="site-shell">
        <div className="site-panel flex items-center gap-3 px-4 py-3 sm:px-5 lg:gap-5 lg:px-6">
          <div className="min-w-0 flex-1">
            <WialLogo chapterLabel={chapterLabel} />
          </div>

          <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex xl:gap-2">
            {navigationItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`whitespace-nowrap rounded-full px-3 py-2 text-sm font-semibold transition xl:px-4 ${
                    isActive
                      ? "bg-accent-soft text-teal-deep"
                      : "text-teal-deep/80 hover:bg-accent-soft/50 hover:text-teal-deep"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
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

            {!viewer && (
              <Link
                href="/register"
                className={`hidden text-sm font-semibold transition xl:inline-flex ${
                  pathname === "/register"
                    ? "text-teal-deep"
                    : "text-teal-deep/78 hover:text-teal-deep"
                }`}
              >
                Register
              </Link>
            )}

            <AccessibilityPreferencesWidget
              navigationRoutes={voiceNavigationRoutes}
              variant="desktop"
            />

            {viewer ? (
              <form
                action="/auth/sign-out"
                method="post"
                className="hidden sm:block"
              >
                <button
                  type="submit"
                  className="button-link secondary px-4 py-2.5 text-sm"
                >
                  Logout
                </button>
              </form>
            ) : (
              <Link
                href="/login"
                className="button-link secondary hidden min-w-[8.75rem] px-4 py-2.5 text-sm sm:inline-flex sm:min-w-[9.5rem]"
              >
                Sign in
              </Link>
            )}

            <div className="flex items-center gap-2 lg:hidden">
              <AccessibilityPreferencesWidget
                navigationRoutes={voiceNavigationRoutes}
                variant="mobile"
              />

              <MobileNav
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