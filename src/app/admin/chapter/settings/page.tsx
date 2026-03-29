import { AccountPageShell } from "@/components/account-page-shell";
import { requireAccountViewer } from "@/lib/auth";
import { resolveWorkspaceChapter } from "@/lib/chapter-workspace";
import { chapterLanguages, chapterRegions } from "@/lib/chapter-options";
import { saveChapterSettingsAction } from "./actions";

const languageOptions = [
  { code: "en", label: chapterLanguages[0] },
  { code: "es", label: chapterLanguages[1] },
  { code: "pt", label: chapterLanguages[2] },
  { code: "fr", label: chapterLanguages[3] },
];

type ChapterSettingsPageProps = {
  searchParams: Promise<{
    notice?: string;
    error?: string;
  }>;
};

function getNotice(notice?: string) {
  switch (notice) {
    case "saved":
      return "Chapter settings saved.";
    default:
      return null;
  }
}

function getError(error?: string) {
  switch (error) {
    case "missing-chapter":
      return "Chapter context is missing.";
    case "forbidden":
      return "This account cannot edit chapter settings.";
    case "save-failed":
      return "WIAL could not save these settings.";
    default:
      return null;
  }
}

export default async function ChapterSettingsPage({
  searchParams,
}: ChapterSettingsPageProps) {
  const viewer = await requireAccountViewer("/admin/chapter/settings", [
    "platform_admin",
    "chapter_admin",
  ]);
  const chapter = await resolveWorkspaceChapter(viewer);
  const params = await searchParams;
  const selectedLanguage =
    languageOptions.find((option) => option.code === chapter?.language)?.label ??
    chapterLanguages[0];

  if (!chapter) {
    return null;
  }

  return (
    <AccountPageShell
      badge="Chapter settings"
      description="Update the chapter profile that powers the homepage hero, contact details, and chapter-wide identity."
      eyebrow="Chapter workspace"
      title="Settings"
    >
      {getNotice(params.notice) ? (
        <div className="account-flash is-success">{getNotice(params.notice)}</div>
      ) : null}
      {getError(params.error) ? (
        <div className="account-flash is-error">{getError(params.error)}</div>
      ) : null}

      <section className="site-panel rounded-[2rem] p-6 md:p-8">
        <form action={saveChapterSettingsAction} className="grid gap-4 md:grid-cols-2">
          <input name="chapterId" type="hidden" value={chapter.id} />

          <label className="field-shell">
            <span className="field-label">Chapter name</span>
            <input className="field-input" defaultValue={chapter.name} name="name" required type="text" />
          </label>

          <label className="field-shell">
            <span className="field-label">Region</span>
            <select className="field-input" defaultValue={chapter.region ?? chapterRegions[0]} name="region">
              {chapterRegions.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </label>

          <label className="field-shell">
            <span className="field-label">Country</span>
            <input className="field-input" defaultValue={chapter.country ?? ""} name="country" type="text" />
          </label>

          <label className="field-shell">
            <span className="field-label">Language</span>
            <select className="field-input" defaultValue={selectedLanguage} name="language">
              {languageOptions.map((option) => (
                <option key={option.code} value={option.label}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field-shell">
            <span className="field-label">Contact email</span>
            <input
              className="field-input"
              defaultValue={chapter.contactEmail ?? ""}
              name="contactEmail"
              type="email"
            />
          </label>

          <label className="field-shell">
            <span className="field-label">Contact phone</span>
            <input
              className="field-input"
              defaultValue={chapter.contactPhone ?? ""}
              name="contactPhone"
              type="text"
            />
          </label>

          <label className="field-shell md:col-span-2">
            <span className="field-label">Description</span>
            <textarea
              className="field-textarea"
              defaultValue={chapter.description ?? ""}
              name="description"
              rows={5}
            />
          </label>

          <label className="field-shell md:col-span-2">
            <span className="field-label">Logo URL</span>
            <input className="field-input" defaultValue={chapter.logoUrl ?? ""} name="logoUrl" type="url" />
          </label>

          <div className="md:col-span-2">
            <button className="button-link primary" type="submit">
              Save settings
            </button>
          </div>
        </form>
      </section>
    </AccountPageShell>
  );
}
