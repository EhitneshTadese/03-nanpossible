"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { AccountNavItem } from "@/lib/types";

type AccountSidebarProps = {
  items: AccountNavItem[];
  platformLabel: string;
  roleLabel: string;
};

type SidebarGroup = {
  title: string;
  items: AccountNavItem[];
};

type IconName =
  | "dashboard"
  | "chapters"
  | "content"
  | "coaches"
  | "revenue"
  | "certifications"
  | "dues"
  | "profile";

function getIconName(href: string): IconName {
  switch (href) {
    case "/account/dashboard":
      return "dashboard";
    case "/account/chapters":
      return "chapters";
    case "/account/content":
      return "content";
    case "/account/coaches":
      return "coaches";
    case "/account/revenue":
      return "revenue";
    case "/account/certifications":
      return "certifications";
    case "/account/dues":
      return "dues";
    default:
      return "profile";
  }
}

function splitItemsIntoGroups(items: AccountNavItem[]): SidebarGroup[] {
  const workspaceItems = items.filter((item) => item.href !== "/account/profile");
  const accountItems = items.filter((item) => item.href === "/account/profile");
  const groups: SidebarGroup[] = [];

  if (workspaceItems.length) {
    groups.push({
      title: "Workspace",
      items: workspaceItems,
    });
  }

  if (accountItems.length) {
    groups.push({
      title: "Account",
      items: accountItems,
    });
  }

  return groups;
}

function SidebarIcon({ name }: { name: IconName }) {
  switch (name) {
    case "dashboard":
      return (
        <svg fill="none" viewBox="0 0 24 24">
          <path
            d="M3 11.5 12 4l9 7.5M6.75 10.5V20h10.5v-9.5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </svg>
      );
    case "chapters":
      return (
        <svg fill="none" viewBox="0 0 24 24">
          <path
            d="M8 8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM16.5 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM3.5 18.5c.8-2.6 2.8-4 6-4s5.2 1.4 6 4M13.75 18.5c.45-1.6 1.8-2.5 4.05-2.5 1.15 0 2.1.22 2.85.66"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </svg>
      );
    case "content":
      return (
        <svg fill="none" viewBox="0 0 24 24">
          <path
            d="M6 4.75h8.75L19 9v10.25A1.75 1.75 0 0 1 17.25 21H6.75A1.75 1.75 0 0 1 5 19.25V6.5A1.75 1.75 0 0 1 6.75 4.75H6ZM9 12h6M9 16h4.5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </svg>
      );
    case "coaches":
      return (
        <svg fill="none" viewBox="0 0 24 24">
          <path
            d="M8 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM16.5 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM3.5 20c1-3 3.15-4.5 6.45-4.5S15.4 17 16.4 20M14 19.5c.55-1.7 2.03-2.55 4.45-2.55.7 0 1.39.1 2.05.31"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </svg>
      );
    case "revenue":
      return (
        <svg fill="none" viewBox="0 0 24 24">
          <path
            d="M4 18.5h16M6.5 15.5l3.25-3.25 2.5 2.5 5-5M15 7.25h2.25V9.5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </svg>
      );
    case "certifications":
      return (
        <svg fill="none" viewBox="0 0 24 24">
          <path
            d="M12 3.75 14.25 6l3-.25.25 3L20.25 11 18 13.25l.25 3-3 .25L12 18.75 9.75 16.5l-3-.25-.25-3L3.75 11 6 8.75l-.25-3 3-.25L12 3.75ZM10.25 11.5l1.2 1.25 2.55-2.75M10 19l-1 2.75L12 20.5l3 1.25L14 19"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </svg>
      );
    case "dues":
      return (
        <svg fill="none" viewBox="0 0 24 24">
          <path
            d="M4.5 7.25h15A1.75 1.75 0 0 1 21.25 9v6A1.75 1.75 0 0 1 19.5 16.75h-15A1.75 1.75 0 0 1 2.75 15V9A1.75 1.75 0 0 1 4.5 7.25ZM2.75 10.75h18.5M6.25 14.25h4"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </svg>
      );
    case "profile":
      return (
        <svg fill="none" viewBox="0 0 24 24">
          <path
            d="M12 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM5 20c1.15-3.2 3.5-4.8 7-4.8 3.5 0 5.85 1.6 7 4.8"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </svg>
      );
  }
}

function ChevronIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24">
      <path
        d="m9 6 6 6-6 6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

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

function SidebarSection({
  items,
  pathname,
  onNavigate,
  title,
}: {
  items: AccountNavItem[];
  pathname: string;
  onNavigate?: () => void;
  title: string;
}) {
  return (
    <section className="account-sidebar-section">
      <p className="account-sidebar-section-title">{title}</p>
      <nav className="flex flex-col gap-1.5">
        {items.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              className={`account-sidebar-link ${isActive ? "is-active" : ""}`}
              href={item.href}
              key={item.href}
              onClick={onNavigate}
            >
              <span className="account-sidebar-icon">
                <SidebarIcon name={getIconName(item.href)} />
              </span>
              <span className="truncate">{item.label}</span>
              <span className="account-sidebar-link-arrow">
                <ChevronIcon />
              </span>
            </Link>
          );
        })}
      </nav>
    </section>
  );
}

function SidebarContent({
  items,
  onClose,
  onNavigate,
  pathname,
  platformLabel,
  roleLabel,
}: {
  items: AccountNavItem[];
  onClose?: () => void;
  onNavigate?: () => void;
  pathname: string;
  platformLabel: string;
  roleLabel: string;
}) {
  const sections = splitItemsIntoGroups(items);

  return (
    <div className="account-sidebar-inner">
      <div className="account-sidebar-header">
        <div className="account-sidebar-brand">
          <div className="account-sidebar-mark" aria-hidden="true">
            W
          </div>
          <div className="min-w-0">
            <p className="account-sidebar-overline">WIAL workspace</p>
            <h2 className="account-sidebar-title truncate">{platformLabel}</h2>
          </div>
        </div>
        {onClose ? (
          <button
            aria-label="Close workspace navigation"
            className="account-sidebar-close"
            onClick={onClose}
            type="button"
          >
            <CloseIcon />
          </button>
        ) : null}
      </div>

      <div className="account-sidebar-pill">{roleLabel}</div>

      <div className="account-sidebar-nav">
        {sections.map((section, index) => (
          <div key={section.title}>
            {index > 0 ? <div className="account-sidebar-divider" /> : null}
            <SidebarSection
              items={section.items}
              onNavigate={onNavigate}
              pathname={pathname}
              title={section.title}
            />
          </div>
        ))}
      </div>

      <div className="account-sidebar-footer">
        <div className="account-sidebar-note">
          <p className="account-sidebar-note-label">Access model</p>
          <p className="account-sidebar-note-body">
            Public registrations start with coach access. Admin and chapter-head
            permissions are assigned by WIAL.
          </p>
        </div>

        <form action="/auth/sign-out" method="post">
          <button className="account-sidebar-signout" type="submit">
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}

export function AccountSidebar({
  items,
  platformLabel,
  roleLabel,
}: AccountSidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const canPortal = typeof window !== "undefined";

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

  const drawer = open && canPortal
    ? createPortal(
        <div
          className="account-sidebar-drawer lg:hidden"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <div
            className="account-sidebar-panel account-sidebar-drawer-panel"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Workspace navigation"
          >
            <SidebarContent
              items={items}
              onClose={() => setOpen(false)}
              onNavigate={() => setOpen(false)}
              pathname={pathname}
              platformLabel={platformLabel}
              roleLabel={roleLabel}
            />
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <aside className="account-sidebar-panel hidden lg:block">
        <SidebarContent
          items={items}
          pathname={pathname}
          platformLabel={platformLabel}
          roleLabel={roleLabel}
        />
      </aside>

      <div className="mb-4 lg:hidden">
        <button
          aria-expanded={open}
          aria-label="Open workspace navigation"
          className="account-sidebar-launcher"
          onClick={() => setOpen(true)}
          type="button"
        >
          <div>
            <p className="account-sidebar-launcher-kicker">{roleLabel}</p>
            <p className="account-sidebar-launcher-title">{platformLabel}</p>
          </div>
          <span className="account-sidebar-launcher-pill">Menu</span>
        </button>
      </div>

      {drawer}
    </>
  );
}
