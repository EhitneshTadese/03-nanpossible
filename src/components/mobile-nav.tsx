"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { getAccountNavItems, getRoleLabel } from "@/lib/account";
import type { NavigationItem, UserProfile } from "@/lib/types";

type MobileNavProps = {
  items: NavigationItem[];
  chapterLabel?: string | null;
  viewer: UserProfile | null;
};

function CloseIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24">
      <path
        d="M6 6 18 18M18 6 6 18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function DrawerLink({
  href,
  label,
  onClick,
}: {
  href: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link className="account-sidebar-link" href={href} onClick={onClick}>
      <span className="account-sidebar-icon">
        <span className="block h-2.5 w-2.5 rounded-full bg-white/70" />
      </span>
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function MobileNav({
  items,
  chapterLabel,
  viewer,
}: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const canPortal = typeof window !== "undefined";
  const workspaceItems = viewer ? getAccountNavItems(viewer.role) : [];

  useEffect(() => {
    if (!canPortal || !open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [canPortal, open]);

  const closeDrawer = () => setOpen(false);

  const drawer =
    open && canPortal
      ? createPortal(
          <div
            className="account-sidebar-drawer"
            onClick={closeDrawer}
            role="presentation"
          >
            <div
              className="account-sidebar-panel account-sidebar-drawer-panel"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Site navigation"
            >
              <div className="account-sidebar-inner">
                <div className="account-sidebar-header">
                  <div className="account-sidebar-brand">
                    <div className="account-sidebar-mark" aria-hidden="true">
                      W
                    </div>
                    <div className="min-w-0">
                      <p className="account-sidebar-overline">Navigation</p>
                      <h2 className="account-sidebar-title truncate">
                        {chapterLabel ?? "Global WIAL"}
                      </h2>
                    </div>
                  </div>

                  <button
                    aria-label="Close navigation"
                    className="account-sidebar-close"
                    onClick={closeDrawer}
                    type="button"
                  >
                    <CloseIcon />
                  </button>
                </div>

                <div className="account-sidebar-pill">
                  {viewer ? getRoleLabel(viewer.role) : "Public visitor"}
                </div>

                <div className="account-sidebar-nav">
                  <section className="account-sidebar-section">
                    <p className="account-sidebar-section-title">Explore</p>

                    <nav className="flex flex-col gap-1.5">
                      <DrawerLink
                        href="/"
                        label="Home"
                        onClick={closeDrawer}
                      />

                      {items.map((item) => (
                        <DrawerLink
                          key={item.href}
                          href={item.href}
                          label={item.label}
                          onClick={closeDrawer}
                        />
                      ))}
                    </nav>
                  </section>

                  <div className="account-sidebar-divider" />

                  {viewer ? (
                    <section className="account-sidebar-section">
                      <p className="account-sidebar-section-title">
                        Workspace
                      </p>

                      <nav className="flex flex-col gap-1.5">
                        {workspaceItems.map((item) => (
                          <DrawerLink
                            key={item.href}
                            href={item.href}
                            label={item.label}
                            onClick={closeDrawer}
                          />
                        ))}
                      </nav>
                    </section>
                  ) : (
                    <section className="account-sidebar-section">
                      <p className="account-sidebar-section-title">
                        Access
                      </p>

                      <div className="grid gap-3">
                        <Link
                          className="account-sidebar-signout"
                          href="/login"
                          onClick={closeDrawer}
                        >
                          Sign in
                        </Link>

                        <Link
                          className="account-sidebar-signout"
                          href="/register"
                          onClick={closeDrawer}
                        >
                          Register
                        </Link>
                      </div>
                    </section>
                  )}
                </div>

                <div className="account-sidebar-footer">
                  {viewer ? (
                    <form action="/auth/sign-out" method="post">
                      <button
                        className="account-sidebar-signout w-full"
                        type="submit"
                      >
                        Logout
                      </button>
                    </form>
                  ) : (
                    <div className="account-sidebar-note">
                      <p className="account-sidebar-note-label">
                        Public signup
                      </p>

                      <p className="account-sidebar-note-body">
                        Registration creates a public visitor account. After
                        sign-in, public visitors can register as coaches and
                        coaches assigned to a chapter can register as chapter
                        heads.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div>
      <button
        aria-expanded={open}
        aria-label="Toggle navigation"
        className="inline-flex h-11 items-center justify-center rounded-full border border-line bg-white/70 px-4 text-sm font-semibold text-teal-deep"
        onClick={() => setOpen(true)}
        type="button"
      >
        Menu
      </button>

      {drawer}
    </div>
  );
}
