import Link from "next/link";
import { AccountPageShell } from "@/components/account-page-shell";
import { requireAccountViewer } from "@/lib/auth";
import { listPendingCoaches } from "@/lib/coaches";
import { listChapters } from "@/lib/tenant";

export default async function GlobalAdminPage() {
  await requireAccountViewer("/admin/global", ["platform_admin"]);
  const [chapters, pendingCoaches] = await Promise.all([
    listChapters(),
    listPendingCoaches({ limit: 100 }),
  ]);

  return (
    <AccountPageShell
      badge="Global control surface"
      description="Provision chapters, manage user roles, and monitor the network from one admin workspace."
      eyebrow="Platform admin"
      title="Global chapter operations"
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_320px]">
        <section className="site-panel rounded-[2rem] p-6 md:p-8">
          <div className="grid gap-4 md:grid-cols-3">
            <article className="feature-card rounded-[1.4rem]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                Active chapters
              </p>
              <p className="mt-4 font-display text-4xl text-teal-deep">
                {chapters.filter((chapter) => chapter.status === "active").length}
              </p>
            </article>
            <article className="feature-card rounded-[1.4rem]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                Total chapters
              </p>
              <p className="mt-4 font-display text-4xl text-teal-deep">
                {chapters.length}
              </p>
            </article>
            <article className="feature-card rounded-[1.4rem]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                Pending coach approvals
              </p>
              <p className="mt-4 font-display text-4xl text-teal-deep">
                {pendingCoaches.length}
              </p>
            </article>
          </div>
        </section>

        <aside className="site-panel rounded-[2rem] p-6">
          <p className="eyebrow">Actions</p>
          <div className="mt-4 flex flex-col gap-3">
            <Link className="button-link primary" href="/admin/global/chapters/new">
              Provision new chapter
            </Link>
            <Link className="button-link secondary" href="/admin/global/chapters">
              View all chapters
            </Link>
            <Link className="button-link secondary" href="/admin/global/users">
              Manage users &amp; roles
            </Link>
            <Link className="button-link secondary" href="/admin/approvals">
              Review coach approvals
            </Link>
          </div>
        </aside>
      </div>
    </AccountPageShell>
  );
}
