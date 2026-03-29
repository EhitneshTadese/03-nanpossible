import Link from "next/link";
import { AccountPageShell } from "@/components/account-page-shell";
import { ChapterProvisionForm } from "@/components/admin/ChapterProvisionForm";
import { requireAccountViewer } from "@/lib/auth";

export default async function NewChapterPage() {
  await requireAccountViewer("/admin/global/chapters/new", ["platform_admin"]);

  return (
    <AccountPageShell
      badge="Provisioning flow"
      description="Create a new WIAL chapter, assign its lead, and seed the editable pages needed for the chapter-in-a-box workflow."
      eyebrow="Global admin"
      title="Provision a new chapter"
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_320px]">
        <section className="site-panel rounded-[2rem] p-6 md:p-8">
          <ChapterProvisionForm />
        </section>

        <aside className="site-panel rounded-[2rem] p-6">
          <p className="eyebrow">What happens next</p>
          <div className="mt-4 grid gap-3">
            {[
              "Seed About, Team, Events, Resources, Testimonials, and Contact pages",
              "Assign or invite the chapter lead account",
              "Make the chapter ready for content editing and AI generation",
            ].map((item) => (
              <article className="feature-card rounded-[1.3rem]" key={item}>
                <p className="text-sm font-semibold text-teal-deep">{item}</p>
              </article>
            ))}
          </div>
          <Link className="button-link secondary mt-5" href="/admin/global/chapters">
            Back to chapters
          </Link>
        </aside>
      </div>
    </AccountPageShell>
  );
}
