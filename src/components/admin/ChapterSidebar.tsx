"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ChapterRecord } from "@/lib/types";

type ChapterSidebarProps = {
  chapter: ChapterRecord;
};

const links = [
  { href: "/admin/chapter", label: "Pages" },
  { href: "/admin/chapter/coaches", label: "Coaches" },
  { href: "/admin/chapter/events", label: "Events" },
  { href: "/admin/chapter/settings", label: "Settings" },
];

export function ChapterSidebar({ chapter }: ChapterSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <aside className="site-panel rounded-[2rem] p-5">
      <p className="eyebrow">Chapter admin</p>
      <h2 className="mt-3 font-display text-3xl leading-none tracking-[-0.04em] text-teal-deep">
        {chapter.name}
      </h2>
      <p className="mt-2 text-sm uppercase tracking-[0.16em] text-foreground/45">
        {chapter.subdomain}.{process.env.NEXT_PUBLIC_SITE_DOMAIN ?? "localhost:3000"}
      </p>

      <nav className="mt-6 flex flex-col gap-2">
        {links.map((item) => {
          const isActive = pathname === item.href;
          const href =
            item.href === "/admin/chapter" && searchParams.get("page")
              ? `${item.href}?page=${searchParams.get("page")}`
              : item.href;

          return (
            <Link
              className={`account-sidebar-link ${isActive ? "is-active" : ""}`}
              href={href}
              key={item.href}
            >
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
