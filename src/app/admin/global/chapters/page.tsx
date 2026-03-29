import Link from "next/link";
import { AccountPageShell } from "@/components/account-page-shell";
import { requireAccountViewer } from "@/lib/auth";
import { listChapters } from "@/lib/tenant";
import { assignContentCreatorAction } from "./actions";

type GlobalChaptersPageProps = {
  searchParams: Promise<{
    notice?: string;
    error?: string;
  }>;
};

function getNotice(notice?: string) {
  switch (notice) {
    case "assigned":
      return "Content creator assignment saved.";
    default:
      return null;
  }
}

function getError(error?: string) {
  switch (error) {
    case "missing-fields":
      return "Choose a chapter and email before assigning.";
    case "user-not-found":
      return "That email does not belong to an existing WIAL user yet.";
    case "assign-failed":
      return "WIAL could not update the content creator assignment.";
    default:
      return null;
  }
}

export default async function GlobalChaptersPage({
  searchParams,
}: GlobalChaptersPageProps) {
  await requireAccountViewer("/admin/global/chapters", ["platform_admin"]);
  const [params, chapters] = await Promise.all([searchParams, listChapters()]);

  return (
    <AccountPageShell
      badge="Chapter provisioning"
      description="Track chapter readiness, provision new chapter sites, and assign content creators to specific chapter workspaces."
      eyebrow="Global admin"
      title="Chapters"
    >
      {getNotice(params.notice) ? (
        <div className="account-flash is-success">{getNotice(params.notice)}</div>
      ) : null}
      {getError(params.error) ? (
        <div className="account-flash is-error">{getError(params.error)}</div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_360px]">
        <section className="site-panel rounded-[2rem] p-6 md:p-8">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow">Network chapters</p>
              <h2 className="mt-3 font-display text-3xl text-teal-deep">
                {chapters.length} chapter records
              </h2>
            </div>
            <Link className="button-link primary" href="/admin/global/chapters/new">
              New chapter
            </Link>
          </div>

          <div className="grid gap-3">
            {chapters.map((chapter) => (
              <article className="feature-card rounded-[1.35rem]" key={chapter.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                      {chapter.status}
                    </p>
                    <h3 className="text-xl font-semibold text-teal-deep">{chapter.name}</h3>
                    <p className="text-sm text-foreground/65">
                      {chapter.subdomain}.wial.org
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm text-foreground/65">
                    {chapter.country ? <span>{chapter.country}</span> : null}
                    {chapter.language ? <span>{chapter.language.toUpperCase()}</span> : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="site-panel rounded-[2rem] p-6">
          <p className="eyebrow">Assign content creator</p>
          <p className="mt-3 text-sm leading-7 text-foreground/72">
            This grants content editing and events access without coach approvals or chapter settings control.
          </p>

          <form action={assignContentCreatorAction} className="mt-5 space-y-4">
            <label className="field-shell">
              <span className="field-label">User email</span>
              <input className="field-input" name="email" required type="email" />
            </label>

            <label className="field-shell">
              <span className="field-label">Chapter</span>
              <select className="field-input" name="chapterId" required>
                <option value="">Select chapter</option>
                {chapters.map((chapter) => (
                  <option key={chapter.id} value={chapter.id}>
                    {chapter.name}
                  </option>
                ))}
              </select>
            </label>

            <button className="button-link primary" type="submit">
              Save assignment
            </button>
          </form>
        </aside>
      </div>
    </AccountPageShell>
  );
}
