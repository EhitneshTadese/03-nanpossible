import Link from "next/link";
import { AccountPageShell } from "@/components/account-page-shell";
import { requireAccountViewer } from "@/lib/auth";
import { listChapters } from "@/lib/tenant";
import { assignContentCreatorAction, deleteChapterAction } from "./actions";

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
    case "deleted":
      return "Chapter deleted and related user access was updated.";
    default:
      return null;
  }
}

function getError(error?: string) {
  switch (error) {
    case "missing-config":
      return "The Supabase service-role configuration is missing.";
    case "missing-fields":
      return "Choose a chapter and email before assigning.";
    case "user-not-found":
      return "That email does not belong to an existing WIAL user yet.";
    case "invalid-service-key":
      return "The Supabase service-role key in this environment is invalid. Update `SUPABASE_SERVICE_ROLE_KEY` and restart the dev server.";
    case "chapter-not-found":
      return "That chapter record no longer exists.";
    case "protected-chapter":
      return "The global WIAL record cannot be deleted from this screen.";
    case "assign-failed":
      return "WIAL could not update the content creator assignment.";
    case "delete-failed":
      return "WIAL could not delete that chapter.";
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
                      {chapter.subdomain}.{process.env.NEXT_PUBLIC_SITE_DOMAIN ?? "localhost:3000"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm text-foreground/65">
                    {chapter.country ? <span>{chapter.country}</span> : null}
                    {chapter.language ? <span>{chapter.language.toUpperCase()}</span> : null}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line/70 pt-4">
                  <p className="max-w-xl text-sm leading-6 text-foreground/62">
                    Deleting a chapter removes its local pages and events and clears related user access for chapter heads, coaches, and content creators.
                  </p>

                  {chapter.subdomain === "global" ? (
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground/45">
                      Protected record
                    </span>
                  ) : (
                    <form action={deleteChapterAction}>
                      <input name="chapterId" type="hidden" value={chapter.id} />
                      <button
                        className="inline-flex items-center justify-center rounded-full border border-[rgba(209,0,52,0.22)] px-4 py-2 text-sm font-semibold text-[var(--teal)] transition hover:border-[rgba(209,0,52,0.4)] hover:bg-[rgba(209,0,52,0.05)]"
                        type="submit"
                      >
                        Delete chapter
                      </button>
                    </form>
                  )}
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
