"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { AccountNavItem, AppRole } from "@/lib/types";

type AccountSidebarProps = {
  items: AccountNavItem[];
  platformLabel: string;
  role: AppRole;
  roleLabel: string;
};

type SidebarGroup = {
  title: string;
  items: AccountNavItem[];
};

type IconName =
  | "approvals"
  | "dashboard"
  | "chapters"
  | "content"
  | "coaches"
  | "events"
  | "settings"
  | "revenue"
  | "certifications"
  | "dues"
  | "profile";

function getIconName(href: string): IconName {
  switch (href) {
    case "/admin/approvals":
      return "approvals";
    case "/admin/global":
      return "dashboard";
    case "/admin/global/chapters":
      return "chapters";
    case "/admin/chapter":
      return "content";
    case "/admin/chapter/coaches":
      return "coaches";
    case "/admin/chapter/events":
      return "events";
    case "/admin/chapter/settings":
      return "settings";
    case "/dashboard/profile":
      return "profile";
    case "/dashboard/coaches":
      return "approvals";
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
    case "approvals":
      return (
        <svg fill="none" viewBox="0 0 24 24">
          <path
            d="M7.75 4.75H16.25C17.4926 4.75 18.5 5.75736 18.5 7V18C18.5 19.2426 17.4926 20.25 16.25 20.25H7.75C6.50736 20.25 5.5 19.2426 5.5 18V7C5.5 5.75736 6.50736 4.75 7.75 4.75ZM8.75 10.75L11 13L15.25 8.75M8.75 16H15.25"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </svg>
      );
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
    case "events":
      return (
        <svg fill="none" viewBox="0 0 24 24">
          <path
            d="M7 4.75V7.25M17 4.75V7.25M5.75 8.5H18.25M6.75 6.25H17.25C18.3546 6.25 19.25 7.14543 19.25 8.25V17.25C19.25 18.3546 18.3546 19.25 17.25 19.25H6.75C5.64543 19.25 4.75 18.3546 4.75 17.25V8.25C4.75 7.14543 5.64543 6.25 6.75 6.25ZM8 11.75H12.5M8 15.25H15.5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </svg>
      );
    case "settings":
      return (
        <svg fill="none" viewBox="0 0 24 24">
          <path
            d="M12 8.75A3.25 3.25 0 1 0 12 15.25A3.25 3.25 0 1 0 12 8.75ZM19.25 13.25V10.75L17.2 10.1C17.05 9.61 16.85 9.15 16.57 8.73L17.55 6.8L15.2 4.45L13.27 5.43C12.85 5.15 12.39 4.95 11.9 4.8L11.25 2.75H8.75L8.1 4.8C7.61 4.95 7.15 5.15 6.73 5.43L4.8 4.45L2.45 6.8L3.43 8.73C3.15 9.15 2.95 9.61 2.8 10.1L0.75 10.75V13.25L2.8 13.9C2.95 14.39 3.15 14.85 3.43 15.27L2.45 17.2L4.8 19.55L6.73 18.57C7.15 18.85 7.61 19.05 8.1 19.2L8.75 21.25H11.25L11.9 19.2C12.39 19.05 12.85 18.85 13.27 18.57L15.2 19.55L17.55 17.2L16.57 15.27C16.85 14.85 17.05 14.39 17.2 13.9L19.25 13.25Z"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.4"
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
      <nav className="account-sidebar-links">
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
  role,
  roleLabel,
}: {
  items: AccountNavItem[];
  onClose?: () => void;
  onNavigate?: () => void;
  pathname: string;
  platformLabel: string;
  role: AppRole;
  roleLabel: string;
}) {
  const sections = splitItemsIntoGroups(items);
  const note =
    role === "public_visitor"
      ? "This account starts as a public visitor. Register as a coach to unlock certification and dues routes."
      : role === "coach"
        ? "Coaches manage their public directory profile in the new dashboard workspace, then use the account area for certification and dues."
        : role === "chapter_admin"
          ? "Chapter-head access applies only to the chapter currently assigned to your account, including coach approvals and directory review."
          : "Platform admins can oversee coach approvals, chapter assignments, and elevated access across the full WIAL network.";

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
            <div className="account-sidebar-pill">{roleLabel}</div>
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
          <p className="account-sidebar-note-body">{note}</p>
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
  role,
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
              role={role}
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
          role={role}
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
