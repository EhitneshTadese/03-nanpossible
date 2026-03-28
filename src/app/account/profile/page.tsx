import { AccountPageShell } from "@/components/account-page-shell";
import { requireAccountViewer } from "@/lib/auth";
import { getRoleLabel } from "@/lib/account";
import { updateProfileAction } from "./actions";

type ProfilePageProps = {
  searchParams: Promise<{
    error?: string;
    notice?: string;
  }>;
};

function getProfileNotice(notice?: string) {
  switch (notice) {
    case "saved":
      return "Your account details were updated.";
    case "email-pending":
      return "Your profile was saved. Confirm the email change from your inbox to finish updating your address.";
    default:
      return null;
  }
}

function getProfileError(error?: string) {
  switch (error) {
    case "name-required":
      return "Display name is required.";
    case "email-invalid":
      return "Enter a valid email address.";
    case "photo-invalid":
      return "Photo URL must be a full URL.";
    case "missing-config":
      return "Supabase auth is not configured in this environment.";
    case "email-update-failed":
      return "WIAL could not begin the email-change flow. Try again later.";
    case "save-failed":
      return "WIAL could not save the profile details. Try again.";
    default:
      return null;
  }
}

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const [viewer, params] = await Promise.all([
    requireAccountViewer("/account/profile"),
    searchParams,
  ]);
  const notice = getProfileNotice(params.notice);
  const error = getProfileError(params.error);

  return (
    <AccountPageShell
      badge="Live profile editor"
      description="Manage the self-service profile fields that travel with your WIAL account while keeping role and chapter membership read-only."
      eyebrow="Account settings"
      title="Update account details"
    >
      {notice ? <div className="account-flash is-success">{notice}</div> : null}
      {error ? <div className="account-flash is-error">{error}</div> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_320px]">
        <section className="site-panel rounded-[2rem] p-6 md:p-8">
          <form action={updateProfileAction} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
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
                <span className="field-label">Email</span>
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
                  type="tel"
                />
              </label>

              <label className="field-shell">
                <span className="field-label">Location</span>
                <input
                  className="field-input"
                  defaultValue={viewer.location ?? ""}
                  name="location"
                  type="text"
                />
              </label>
            </div>

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

            <label className="field-shell">
              <span className="field-label">Bio</span>
              <textarea
                className="field-textarea"
                defaultValue={viewer.bio ?? ""}
                name="bio"
                rows={6}
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="field-shell is-readonly">
                <span className="field-label">Role</span>
                <p className="field-static">{getRoleLabel(viewer.role)}</p>
              </div>
              <div className="field-shell is-readonly">
                <span className="field-label">Chapter</span>
                <p className="field-static">
                  {viewer.chapterId ? "Assigned by WIAL admin" : "Global account"}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <button className="button-link primary" type="submit">
                Save account details
              </button>
              <p className="text-sm leading-6 text-foreground/60">
                Email changes go through Supabase confirmation. Role and chapter
                assignment remain admin-managed.
              </p>
            </div>
          </form>
        </section>

        <aside className="site-panel rounded-[2rem] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/45">
            Profile summary
          </p>
          <div className="mt-5 rounded-[1.65rem] border border-line bg-white/60 p-5">
            <div className="account-avatar">
              <span>{viewer.name.slice(0, 1).toUpperCase() || "W"}</span>
            </div>
            <h2 className="mt-4 font-display text-3xl leading-none tracking-[-0.04em] text-teal-deep">
              {viewer.name || "WIAL Member"}
            </h2>
            <p className="mt-2 text-sm font-semibold uppercase tracking-[0.16em] text-accent">
              {getRoleLabel(viewer.role)}
            </p>
            <p className="mt-4 text-sm leading-7 text-foreground/72">
              Keep your core contact details current so future certification,
              coaching, and chapter workflows start from a trustworthy profile.
            </p>
          </div>
        </aside>
      </div>
    </AccountPageShell>
  );
}
