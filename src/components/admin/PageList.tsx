import Link from "next/link";
import type { ContentPageRecord } from "@/lib/types";

type PageListProps = {
  currentPageId: string | null;
  pages: ContentPageRecord[];
};

export function PageList({ currentPageId, pages }: PageListProps) {
  return (
    <section className="site-panel rounded-[2rem] p-5">
      <p className="eyebrow">Pages</p>
      <div className="mt-5 flex flex-col gap-2">
        {pages.map((page) => (
          <Link
            className={`account-sidebar-link ${currentPageId === page.id ? "is-active" : ""}`}
            href={`/admin/chapter?page=${page.id}`}
            key={page.id}
          >
            <span>{page.title}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
