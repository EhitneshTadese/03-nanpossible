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
    <section className="site-panel rounded-[2rem] p-5 md:p-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-3">
          <p className="eyebrow">Chapter admin</p>
          <div>
            <h2 className="font-display text-4xl leading-none tracking-[-0.05em] text-teal-deep md:text-5xl">
              {chapter.name}
            </h2>
            <p className="mt-3 text-sm uppercase tracking-[0.16em] text-foreground/45">
              {chapter.subdomain}.{process.env.NEXT_PUBLIC_SITE_DOMAIN ?? "localhost:3000"}
            </p>
          </div>
        </div>

        <nav className="overflow-x-auto pb-1 xl:max-w-[68%]">
          <div className="inline-flex min-w-full items-center gap-2 rounded-[1.45rem] border border-line/80 bg-white/68 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] xl:min-w-0 xl:justify-end">
        {links.map((item) => {
          const isActive = pathname === item.href;
          const href =
            item.href === "/admin/chapter" && searchParams.get("page")
              ? `${item.href}?page=${searchParams.get("page")}`
              : item.href;

          return (
            <Link
              className={`shrink-0 whitespace-nowrap rounded-[1rem] px-4 py-2.5 text-sm font-semibold tracking-[0.01em] transition-colors ${
                isActive
                  ? "bg-teal-deep text-white shadow-[0_12px_24px_rgba(22,63,61,0.14)]"
                  : "bg-transparent text-foreground/64 hover:bg-teal-deep/6 hover:text-teal-deep"
              }`}
              href={href}
              key={item.href}
            >
              <span>{item.label}</span>
            </Link>
          );
        })}
          </div>
        </nav>
      </div>
    </section>
  );
}
