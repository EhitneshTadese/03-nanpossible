import Link from "next/link";
import type { ContentPageRecord } from "@/lib/types";

type PageListProps = {
  currentPageId: string | null;
  pages: ContentPageRecord[];
};

export function PageList({ currentPageId, pages }: PageListProps) {
  return (
    <section className="site-panel rounded-[2rem] p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="eyebrow">Pages</p>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground/42">
          Switch pages without leaving the editor
        </p>
      </div>

      <div className="mt-5 overflow-x-auto pb-1">
        <div className="inline-flex min-w-full gap-2 md:min-w-0 md:flex-wrap">
        {pages.map((page) => (
          <Link
            className={`whitespace-nowrap rounded-[1rem] border px-4 py-3 text-sm font-semibold tracking-[0.01em] transition-colors ${
              currentPageId === page.id
                ? "border-teal/20 bg-white text-teal-deep shadow-[0_10px_24px_rgba(22,63,61,0.06)]"
                : "border-line/80 bg-white/45 text-foreground/68 hover:border-teal/16 hover:bg-white/72 hover:text-teal-deep"
            }`}
            href={`/admin/chapter?page=${page.id}`}
            key={page.id}
          >
            <span>{page.title}</span>
          </Link>
        ))}
        </div>
      </div>
    </section>
  );
}
