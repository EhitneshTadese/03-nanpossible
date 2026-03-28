"use client";

import Link from "next/link";
import { useState } from "react";
import type { NavigationItem } from "@/lib/types";

type MobileNavProps = {
  items: NavigationItem[];
  chapterLabel?: string | null;
};

export function MobileNav({ items, chapterLabel }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        aria-expanded={open}
        aria-label="Toggle navigation"
        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white/70 text-teal-deep"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span className="flex flex-col gap-1.5">
          <span className="block h-0.5 w-5 rounded-full bg-current" />
          <span className="block h-0.5 w-5 rounded-full bg-current" />
          <span className="block h-0.5 w-5 rounded-full bg-current" />
        </span>
      </button>

      {open ? (
        <div className="site-panel absolute inset-x-4 top-[5.2rem] z-30 rounded-[1.6rem] p-5">
          {chapterLabel ? (
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-accent">
              {chapterLabel}
            </p>
          ) : null}
          <nav className="flex flex-col gap-2">
            {items.map((item) => (
              <Link
                className="rounded-2xl px-4 py-3 font-semibold text-teal-deep transition hover:bg-accent-soft"
                href={item.href}
                key={item.href}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
    </div>
  );
}
