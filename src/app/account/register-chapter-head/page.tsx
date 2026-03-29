import { AccountPageShell } from "@/components/account-page-shell";
import { requireAccountViewer } from "@/lib/auth";
import { getChapterById } from "@/lib/tenant";
import { promoteToChapterHeadAction } from "./actions";

type RegisterChapterHeadPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

function getErrorMessage(error?: string) {
  switch (error) {
    case "migration-missing":
      return "The connected Supabase project is missing the public-visitor progression migration. Apply supabase/migrations/20260328233000_public_visitor_role_progression.sql, then try again.";
    case "chapter-required":
      return "This coach account is not attached to a chapter yet, so chapter-head registration is blocked.";
    case "missing-config":
      return "Supabase auth is not configured in this environment.";
    case "role-mismatch":
      return "This account is no longer eligible for chapter-head registration from the coach route.";
    case "upgrade-failed":
      return "WIAL could not promote this coach account to chapter head. Try again.";
    default:
      return null;
  }
}

export default async function RegisterChapterHeadPage({
  searchParams,
}: RegisterChapterHeadPageProps) {
  const [viewer, params] = await Promise.all([
    requireAccountViewer("/account/register-chapter-head", ["coach"]),
    searchParams,
  ]);
  const chapter = viewer.chapterId
    ? await getChapterById(viewer.chapterId)
    : null;
  const error = getErrorMessage(params.error);
  const canRegister = viewer.chapterId !== null;
  const chapterLabel = chapter?.name ?? (canRegister ? "Assigned chapter" : "No chapter assigned");

  return (
    <AccountPageShell
      badge="Immediate role upgrade"
      description="Register this coach account as the chapter head for its currently assigned chapter. This flow never switches chapters."
      eyebrow="Coach workspace"
      title="Register as chapter head"
    >
      {error ? <div className="account-flash is-error">{error}</div> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_320px]">
        <section className="site-panel rounded-[2rem] p-6 md:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            Assigned chapter
          </p>
          <h2 className="mt-3 font-display text-3xl leading-none tracking-[-0.04em] text-teal-deep">
            {chapterLabel}
          </h2>
          <p className="mt-4 text-base leading-7 text-foreground/75">
            Chapter-head registration applies only to the chapter already tied
            to this coach account. It does not create a new chapter or move the
            account to a different chapter.
          </p>

          <div className="mt-6 grid gap-3">
            {[
              "Your role changes from coach to chapter head immediately.",
              "The chapter content and chapter revenue routes unlock after the upgrade.",
              "The chapter assignment stays fixed to the current account record.",
            ].map((item) => (
              <article className="feature-card rounded-[1.35rem]" key={item}>
                <p className="text-base font-semibold text-teal-deep">{item}</p>
              </article>
            ))}
          </div>

          {canRegister ? (
            <form action={promoteToChapterHeadAction} className="mt-6">
              <button className="button-link primary" type="submit">
                Register as chapter head
              </button>
            </form>
          ) : (
            <div className="account-flash is-error mt-6">
              A WIAL admin must attach this coach account to an existing chapter
              before chapter-head registration can proceed.
            </div>
          )}
        </section>

        <aside className="site-panel rounded-[2rem] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/45">
            Account status
          </p>
          <h2 className="mt-3 font-display text-3xl leading-none tracking-[-0.04em] text-teal-deep">
            {viewer.name || "Coach account"}
          </h2>
          <p className="mt-2 text-sm font-semibold uppercase tracking-[0.16em] text-accent">
            {canRegister ? "Coach with assigned chapter" : "Coach without chapter"}
          </p>
          <p className="mt-4 text-sm leading-7 text-foreground/72">
            {canRegister
              ? `This account is currently tied to ${chapterLabel.toLowerCase()} and can promote only within that chapter.`
              : "This account can keep using coach routes, but chapter-head access remains blocked until a chapter is assigned."}
          </p>
        </aside>
      </div>
    </AccountPageShell>
  );
}
