import Link from "next/link";
import { AccountPageShell } from "@/components/account-page-shell";
import { requireAccountViewer } from "@/lib/auth";
import { getCoachByUserId } from "@/lib/coaches";
import { listChapters } from "@/lib/tenant";
import { registerCoachProfileAction } from "./actions";

type RegisterCoachPageProps = {
  searchParams: Promise<{
    error?: string;
    notice?: string;
  }>;
};

function getErrorMessage(error?: string) {
  switch (error) {
    case "name-required":
      return "Please enter the name you want displayed on your coach profile.";
    case "email-required":
      return "A contact email is required so chapter leads can reach you.";
    case "chapter-required":
      return "Select the WIAL chapter you want to be associated with.";
    case "bio-too-short":
      return "Please share at least 40 characters of biography so the directory has context about your practice.";
    case "photoUrl-invalid":
      return "Profile photo URL must be a valid http(s) link.";
    case "website-invalid":
      return "Website must be a valid http(s) URL.";
    case "linkedin-invalid":
      return "LinkedIn must be a valid http(s) URL.";
    case "credlyBadgeUrl-invalid":
      return "Credly badge URL must be a valid http(s) URL.";
    case "missing-config":
      return "WIAL service role credentials are not configured in this environment.";
    case "insert-failed":
      return "WIAL could not save the coach profile. Try again in a moment.";
    case "already-registered":
      return "This account already has a coach profile.";
    default:
      return null;
  }
}

function getNoticeMessage(notice?: string) {
  switch (notice) {
    case "submitted":
      return "Your coach profile was submitted. A chapter admin will review it before it appears in the public directory.";
    default:
      return null;
  }
}

export default async function RegisterCoachPage({
  searchParams,
}: RegisterCoachPageProps) {
  const [viewer, params] = await Promise.all([
    requireAccountViewer("/account/register-coach", [
      "public_visitor",
      "coach",
    ]),
    searchParams,
  ]);

  const existingCoach = await getCoachByUserId(viewer.id);
  const chapters = await listChapters();

  const error = getErrorMessage(params.error);
  const notice = getNoticeMessage(params.notice);

  // Already-registered status panel
  if (existingCoach) {
    return (
      <AccountPageShell
        badge={existingCoach.approved ? "Approved" : "Pending review"}
        description="WIAL keeps a single coach profile per account. You can continue editing the core profile details from the account workspace."
        eyebrow="Coach profile"
        title="You're already on the coach roster"
      >
        {notice ? <div className="account-flash is-success">{notice}</div> : null}

        <section className="site-panel rounded-[2rem] p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            Profile status
          </p>
          <h2 className="mt-4 font-display text-3xl leading-none tracking-[-0.04em] text-teal-deep">
            {existingCoach.approved
              ? "Published on the public directory."
              : "Awaiting chapter admin approval."}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-foreground/72">
            {existingCoach.approved
              ? "Your coach card is visible on the /coaches directory and your profile feeds the AI coach search."
              : "You'll see this page flip to \u201CApproved\u201D once a chapter admin reviews your submission. Keep editing your profile details from your account profile in the meantime."}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link className="button-link primary" href="/account/profile">
              Edit account details
            </Link>
            <Link className="button-link ghost" href="/coaches">
              View coach directory
            </Link>
          </div>
        </section>
      </AccountPageShell>
    );
  }

  const chapterOptions = chapters.filter(
    (chapter) => chapter.status === "active",
  );

  return (
    <AccountPageShell
      badge="Coach registration"
      description="Submit a full coach profile. Chapter admins approve each new submission before it appears in the public /coaches directory."
      eyebrow="Join the WIAL coach roster"
      title="Register as a coach"
    >
      {notice ? <div className="account-flash is-success">{notice}</div> : null}
      {error ? <div className="account-flash is-error">{error}</div> : null}

      <form action={registerCoachProfileAction} className="space-y-5">
        <section className="site-panel rounded-[2rem] p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            Identity
          </p>
          <h2 className="mt-3 font-display text-2xl leading-none tracking-[-0.03em] text-teal-deep md:text-3xl">
            How you show up on the directory
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="field-shell">
              <span className="field-label">Display name</span>
              <input
                className="field-input"
                defaultValue={viewer.name}
                name="name"
                required
                type="text"
              />
            </label>

            <label className="field-shell">
              <span className="field-label">Contact email</span>
              <input
                className="field-input"
                defaultValue={viewer.email}
                name="email"
                required
                type="email"
              />
            </label>

            <label className="field-shell">
              <span className="field-label">Phone</span>
              <input
                className="field-input"
                defaultValue={viewer.phone ?? ""}
                name="phone"
                placeholder="Optional"
                type="tel"
              />
            </label>

            <label className="field-shell">
              <span className="field-label">Profile photo URL</span>
              <input
                className="field-input"
                defaultValue={viewer.photoUrl ?? ""}
                name="photoUrl"
                placeholder="https://..."
                type="url"
              />
            </label>
          </div>
        </section>

        <section className="site-panel rounded-[2rem] p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            Practice
          </p>
          <h2 className="mt-3 font-display text-2xl leading-none tracking-[-0.03em] text-teal-deep md:text-3xl">
            Where and how you coach
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="field-shell">
              <span className="field-label">WIAL chapter</span>
              <select
                className="field-input"
                defaultValue={viewer.chapterId ?? ""}
                name="chapterId"
                required
              >
                <option value="">Select a chapter…</option>
                {chapterOptions.map((chapter) => (
                  <option key={chapter.id} value={chapter.id}>
                    {chapter.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field-shell">
              <span className="field-label">Certification level</span>
              <select className="field-input" defaultValue="" name="certLevel">
                <option value="">Not yet certified</option>
                <option value="CALC">CALC</option>
                <option value="PALC">PALC</option>
                <option value="SALC">SALC</option>
                <option value="MALC">MALC</option>
              </select>
            </label>

            <label className="field-shell">
              <span className="field-label">City</span>
              <input
                className="field-input"
                name="locationCity"
                placeholder="Sydney"
                type="text"
              />
            </label>

            <label className="field-shell">
              <span className="field-label">Country</span>
              <input
                className="field-input"
                name="locationCountry"
                placeholder="Australia"
                type="text"
              />
            </label>

            <label className="field-shell md:col-span-2">
              <span className="field-label">Languages</span>
              <input
                className="field-input"
                name="languages"
                placeholder="English, Spanish, Portuguese (comma separated)"
                type="text"
              />
              <span className="mt-1 text-xs text-foreground/55">
                Comma-separated list. Used by the directory&apos;s language
                filter.
              </span>
            </label>

            <label className="field-shell md:col-span-2">
              <span className="field-label">Specializations</span>
              <input
                className="field-input"
                name="specializations"
                placeholder="Leadership development, team coaching, change management"
                type="text"
              />
              <span className="mt-1 text-xs text-foreground/55">
                Comma-separated list. Powers specialization filters and AI
                search.
              </span>
            </label>
          </div>
        </section>

        <section className="site-panel rounded-[2rem] p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            Bio & credentials
          </p>
          <h2 className="mt-3 font-display text-2xl leading-none tracking-[-0.03em] text-teal-deep md:text-3xl">
            Tell clients why they should reach out
          </h2>

          <div className="mt-6 space-y-4">
            <label className="field-shell">
              <span className="field-label">Professional bio</span>
              <textarea
                className="field-textarea"
                defaultValue={viewer.bio ?? ""}
                minLength={40}
                name="bio"
                placeholder="Share your coaching philosophy, signature engagements, and credentials. 80–300 words works well."
                required
                rows={7}
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="field-shell">
                <span className="field-label">Website</span>
                <input
                  className="field-input"
                  name="website"
                  placeholder="https://..."
                  type="url"
                />
              </label>

              <label className="field-shell">
                <span className="field-label">LinkedIn</span>
                <input
                  className="field-input"
                  name="linkedin"
                  placeholder="https://linkedin.com/in/..."
                  type="url"
                />
              </label>

              <label className="field-shell md:col-span-2">
                <span className="field-label">Credly badge URL</span>
                <input
                  className="field-input"
                  name="credlyBadgeUrl"
                  placeholder="https://www.credly.com/badges/..."
                  type="url"
                />
                <span className="mt-1 text-xs text-foreground/55">
                  Optional. Populates the badge icon on your public coach card
                  after approval.
                </span>
              </label>
            </div>
          </div>
        </section>

        <div className="site-panel flex flex-col gap-4 rounded-[2rem] p-6 md:flex-row md:items-center md:justify-between md:p-8">
          <p className="max-w-xl text-sm leading-6 text-foreground/70">
            Submissions are reviewed by a chapter admin before they appear in
            the public directory. You&apos;ll receive access to the coach
            workspace immediately after submitting.
          </p>
          <button className="button-link primary" type="submit">
            Submit coach profile
          </button>
        </div>
      </form>
    </AccountPageShell>
  );
}
