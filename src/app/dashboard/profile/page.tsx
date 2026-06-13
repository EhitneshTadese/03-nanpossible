import Image from "next/image";
import { AccountPageShell } from "@/components/account-page-shell";
import { requireAccountViewer } from "@/lib/auth";
import { getClaimableCoachByEmail, getCoachByUserId, getCoachInitials } from "@/lib/coaches";
import { saveCoachProfileAction } from "./actions";
import { PhoneInputField } from "@/components/phone-input-field";

type DashboardProfilePageProps = {
  searchParams: Promise<{
    error?: string;
    notice?: string;
  }>;
};

const specializationOptions = [
  "manufacturing",
  "government",
  "healthcare",
  "education",
  "finance",
  "tech",
  "leadership development",
  "team performance",
  "change management",
];

const languageOptions = ["en", "pt", "es", "fr", "de", "ko", "tl", "ja", "ar", "zh"];

function getNotice(notice?: string) {
  switch (notice) {
    case "submitted":
      return "Your changes have been submitted for review. They will appear in the directory once approved.";
    default:
      return null;
  }
}

function getError(error?: string) {
  switch (error) {
    case "missing-config":
      return "The Supabase service-role configuration is missing in this environment.";
    case "name-required":
      return "Coach name is required.";
    case "country-required":
      return "Country is required.";
    case "photo-type":
      return "Upload a JPG, PNG, or WebP photo only.";
    case "photo-size":
      return "Coach photos must be 2MB or smaller.";
    case "photo-upload":
      return "WIAL could not upload the coach photo. Try again.";
    case "claim-failed":
      return "WIAL could not claim the existing coach profile.";
    case "create-failed":
      return "WIAL could not create the new coach profile.";
    case "save-failed":
      return "WIAL could not save the coach profile changes.";
    default:
      return null;
  }
}

export default async function DashboardProfilePage({
  searchParams,
}: DashboardProfilePageProps) {
  const [viewer, params] = await Promise.all([
    requireAccountViewer("/dashboard/profile", ["coach"]),
    searchParams,
  ]);
  const [coachRecord, claimableCoach] = await Promise.all([
    getCoachByUserId(viewer.id),
    getClaimableCoachByEmail(viewer.email),
  ]);

  const activeCoach = coachRecord ?? claimableCoach;
  const mode = coachRecord ? "edit" : claimableCoach ? "claim" : "create";

  return (
    <AccountPageShell
      badge={
        mode === "edit"
          ? activeCoach?.approved
            ? "Currently live"
            : "Pending review"
          : mode === "claim"
            ? "Claim existing record"
            : "Create draft profile"
      }
      description="This profile powers the public coach directory. Changes are held for approval before they go live."
      eyebrow="Coach workspace"
      title="Coach directory profile"
    >
      {getNotice(params.notice) ? (
        <div className="account-flash is-success">{getNotice(params.notice)}</div>
      ) : null}
      {getError(params.error) ? (
        <div className="account-flash is-error">{getError(params.error)}</div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_340px]">
        <section className="site-panel rounded-[2rem] p-6 md:p-8">
          <div className="mb-6 rounded-[1.4rem] border border-line bg-white/55 px-4 py-4">
            <p className="text-sm font-semibold text-teal-deep">
              {mode === "claim"
                ? "WIAL found an existing directory record that matches your email. Saving will claim it and submit your latest changes for review."
                : mode === "create"
                  ? "No coach directory profile exists for this account yet. Saving will create a draft for approval."
                  : activeCoach?.approved
                    ? "Your current profile is public. Any changes you submit will move it back into review."
                    : "This profile is currently pending review. You can continue refining it before the next approval pass."}
            </p>
          </div>

          <form action={saveCoachProfileAction} className="space-y-6">
            <input
              name="currentPhotoUrl"
              type="hidden"
              value={activeCoach?.photoUrl ?? ""}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <label className="field-shell">
                <span className="field-label">Name</span>
                <input
                  className="field-input"
                  defaultValue={activeCoach?.name ?? viewer.name}
                  name="name"
                  required
                  type="text"
                />
              </label>
              <label className="field-shell">
                <span className="field-label">Contact email</span>
                <input
                  className="field-input"
                  defaultValue={activeCoach?.email ?? viewer.email}
                  name="email"
                  type="email"
                />
              </label>
              <label className="field-shell">
                <span className="field-label">City</span>
                <input
                  className="field-input"
                  defaultValue={activeCoach?.locationCity ?? ""}
                  name="locationCity"
                  type="text"
                />
              </label>
              <label className="field-shell">
                <span className="field-label">Country</span>
                <input
                  className="field-input"
                  defaultValue={activeCoach?.locationCountry ?? ""}
                  name="locationCountry"
                  required
                  type="text"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
            
    <label className="field-shell">
     <span className="field-label">Phone</span>
     <PhoneInputField
      defaultPhone={activeCoach?.phone}
      defaultCountryCode={activeCoach?.phoneCountryCode}
    />
   </label>
              <label className="field-shell">
                <span className="field-label">Certification level</span>
                <div className="field-shell is-readonly">
                  <p className="field-static">{activeCoach?.certLevel ?? "Pending WIAL review"}</p>
                </div>
              </label>
            </div>

            <label className="field-shell">
              <span className="field-label">Photo</span>
              <input
                accept="image/jpeg,image/png,image/webp"
                className="field-input"
                name="photo"
                type="file"
              />
            </label>

            <label className="field-shell">
              <span className="field-label">Bio</span>
              <textarea
                className="field-textarea"
                defaultValue={activeCoach?.bio ?? ""}
                maxLength={2000}
                name="bio"
                rows={8}
              />
            </label>

            <fieldset className="field-shell">
              <legend className="field-label">Specializations</legend>
              <div className="grid gap-2 md:grid-cols-3">
                {specializationOptions.map((option) => (
                  <label
                    className="coach-checkbox"
                    key={option}
                  >
                    <input
                      defaultChecked={activeCoach?.specializations.includes(option)}
                      name="specializations"
                      type="checkbox"
                      value={option}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
              <input
                className="field-input"
                defaultValue={activeCoach?.specializations
                  .filter((value) => !specializationOptions.includes(value))
                  .join(", ")}
                name="customSpecializations"
                placeholder="Add custom specialties, comma separated"
                type="text"
              />
            </fieldset>

            <fieldset className="field-shell">
              <legend className="field-label">Languages</legend>
              <div className="grid gap-2 md:grid-cols-5">
                {languageOptions.map((option) => (
                  <label className="coach-checkbox" key={option}>
                    <input
                      defaultChecked={activeCoach?.languages.includes(option)}
                      name="languages"
                      type="checkbox"
                      value={option}
                    />
                    <span>{option.toUpperCase()}</span>
                  </label>
                ))}
              </div>
              <input
                className="field-input"
                defaultValue={activeCoach?.languages
                  .filter((value) => !languageOptions.includes(value))
                  .join(", ")}
                name="customLanguages"
                placeholder="Add additional language codes, comma separated"
                type="text"
              />
            </fieldset>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="field-shell">
                <span className="field-label">Website</span>
                <input
                  className="field-input"
                  defaultValue={activeCoach?.website ?? ""}
                  name="website"
                  placeholder="https://..."
                  type="url"
                />
              </label>
              <label className="field-shell">
                <span className="field-label">LinkedIn</span>
                <input
                  className="field-input"
                  defaultValue={activeCoach?.linkedin ?? ""}
                  name="linkedin"
                  placeholder="https://linkedin.com/in/..."
                  type="url"
                />
              </label>
              <label className="field-shell md:col-span-2">
                <span className="field-label">Credly badge URL</span>
                <input
                  className="field-input"
                  defaultValue={activeCoach?.credlyBadgeUrl ?? ""}
                  name="credlyBadgeUrl"
                  placeholder="https://www.credly.com/..."
                  type="url"
                />
                <span className="text-sm leading-6 text-foreground/58">
                  Paste the public Credly badge page URL. WIAL will pull the public badge
                  image automatically for the directory when it can be resolved.
                </span>
              </label>
            </div>

            <button className="button-link primary" type="submit">
              Save directory profile
            </button>
          </form>
        </section>

        <aside className="site-panel rounded-[2rem] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/46">
            Preview card
          </p>
          <div className="mt-4 rounded-[1.65rem] border border-line bg-white/60 p-5">
            <div className="coach-avatar-frame h-24 w-24">
              {activeCoach?.photoUrl ? (
                <Image
                  alt={activeCoach.name}
                  className="h-full w-full object-cover"
                  height={96}
                  src={activeCoach.photoUrl}
                  width={96}
                />
              ) : (
                <span className="coach-avatar-fallback">
                  {getCoachInitials(activeCoach?.name ?? viewer.name)}
                </span>
              )}
            </div>
            <h2 className="mt-4 font-display text-3xl leading-none tracking-[-0.04em] text-teal-deep">
              {activeCoach?.name ?? viewer.name}
            </h2>
            <p className="mt-2 text-sm font-semibold uppercase tracking-[0.15em] text-accent">
              {activeCoach?.certLevel ?? "Pending WIAL review"}
            </p>
            <p className="mt-4 text-sm leading-7 text-foreground/75">
              Approved coach profiles appear in the public directory, semantic
              search, and coach detail pages after the next approval pass.
            </p>
          </div>
        </aside>
      </div>
    </AccountPageShell>
  );
}
