import Link from "next/link";
import { AccountPageShell } from "@/components/account-page-shell";
import { requireAccountViewer } from "@/lib/auth";
import { listEventsForAdmin } from "@/lib/events";
import { resolveWorkspaceChapter } from "@/lib/chapter-workspace";
import { deleteEventAction, upsertEventAction } from "./actions";

type ChapterEventsPageProps = {
  searchParams: Promise<{
    notice?: string;
    error?: string;
    edit?: string;
  }>;
};

function toDateTimeLocalValue(value?: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function getNotice(notice?: string) {
  switch (notice) {
    case "created":
      return "Event created.";
    case "updated":
      return "Event updated.";
    case "deleted":
      return "Event deleted.";
    default:
      return null;
  }
}

function getError(error?: string) {
  switch (error) {
    case "missing-config":
      return "The Supabase service-role configuration is missing.";
    case "missing-fields":
      return "Title, chapter, and start date are required.";
    case "forbidden":
      return "This account cannot edit events for the active chapter.";
    case "save-failed":
      return "WIAL could not save this event.";
    case "delete-failed":
      return "WIAL could not delete this event.";
    default:
      return null;
  }
}

export default async function ChapterEventsPage({
  searchParams,
}: ChapterEventsPageProps) {
  const viewer = await requireAccountViewer("/admin/chapter/events", [
    "platform_admin",
    "chapter_admin",
    "content_creator",
  ]);
  const chapter = await resolveWorkspaceChapter(viewer);
  const [params, events] = await Promise.all([
    searchParams,
    chapter ? listEventsForAdmin(chapter.id) : Promise.resolve([]),
  ]);

  if (!chapter) {
    return null;
  }

  const selectedEvent =
    events.find((event) => event.id === params.edit) ?? null;

  return (
    <AccountPageShell
      badge="Events admin"
      description="Manage the events that appear on the chapter homepage and feed the chapter-in-a-box generator."
      eyebrow="Chapter workspace"
      title="Events"
    >
      {getNotice(params.notice) ? (
        <div className="account-flash is-success">{getNotice(params.notice)}</div>
      ) : null}
      {getError(params.error) ? (
        <div className="account-flash is-error">{getError(params.error)}</div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_360px]">
        <section className="site-panel rounded-[2rem] p-6 md:p-8">
          <div className="grid gap-3">
            {events.map((event) => (
              <article className="feature-card rounded-[1.35rem]" key={event.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                      {event.published ? "Published" : "Draft"}
                    </p>
                    <h3 className="mt-3 text-xl font-semibold text-teal-deep">{event.title}</h3>
                    <p className="mt-2 text-sm text-foreground/65">
                      {new Date(event.startAt).toLocaleString()}
                      {event.location ? ` • ${event.location}` : ""}
                    </p>
                    {event.description ? (
                      <p className="mt-3 text-sm leading-7 text-foreground/72">
                        {event.description}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      className="button-link secondary"
                      href={`/admin/chapter/events?edit=${event.id}`}
                    >
                      Edit
                    </Link>
                    <form action={deleteEventAction}>
                      <input name="eventId" type="hidden" value={event.id} />
                      <input name="chapterId" type="hidden" value={chapter.id} />
                      <button className="button-link secondary" type="submit">
                        Delete
                      </button>
                    </form>
                  </div>
                </div>
              </article>
            ))}
            {events.length === 0 ? (
              <article className="feature-card rounded-[1.35rem]">
                <p className="text-sm leading-7 text-foreground/72">
                  No events are scheduled yet. Add the first event to power the chapter homepage and AI generation context.
                </p>
              </article>
            ) : null}
          </div>
        </section>

        <aside className="site-panel rounded-[2rem] p-6">
          <p className="eyebrow">{selectedEvent ? "Edit event" : "Add event"}</p>
          <form action={upsertEventAction} className="mt-5 space-y-4" key={selectedEvent?.id ?? "new"}>
            <input name="eventId" type="hidden" value={selectedEvent?.id ?? ""} />
            <input name="chapterId" type="hidden" value={chapter.id} />
            <label className="field-shell">
              <span className="field-label">Title</span>
              <input
                className="field-input"
                defaultValue={selectedEvent?.title ?? ""}
                name="title"
                required
                type="text"
              />
            </label>
            <label className="field-shell">
              <span className="field-label">Start</span>
              <input
                className="field-input"
                defaultValue={toDateTimeLocalValue(selectedEvent?.startAt)}
                name="startAt"
                required
                type="datetime-local"
              />
            </label>
            <label className="field-shell">
              <span className="field-label">End</span>
              <input
                className="field-input"
                defaultValue={toDateTimeLocalValue(selectedEvent?.endAt)}
                name="endAt"
                type="datetime-local"
              />
            </label>
            <label className="field-shell">
              <span className="field-label">Location</span>
              <input
                className="field-input"
                defaultValue={selectedEvent?.location ?? ""}
                name="location"
                type="text"
              />
            </label>
            <label className="field-shell">
              <span className="field-label">Description</span>
              <textarea
                className="field-textarea"
                defaultValue={selectedEvent?.description ?? ""}
                name="description"
                rows={5}
              />
            </label>
            <label className="coach-checkbox">
              <input
                defaultChecked={selectedEvent?.published ?? false}
                name="published"
                type="checkbox"
              />
              <span>Publish this event</span>
            </label>
            <div className="flex flex-wrap gap-3">
              <button className="button-link primary" type="submit">
                {selectedEvent ? "Update event" : "Save event"}
              </button>
              {selectedEvent ? (
                <Link className="button-link secondary" href="/admin/chapter/events">
                  Cancel
                </Link>
              ) : null}
            </div>
          </form>
        </aside>
      </div>
    </AccountPageShell>
  );
}
