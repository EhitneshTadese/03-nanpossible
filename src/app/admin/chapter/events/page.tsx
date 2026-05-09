import { AccountPageShell } from "@/components/account-page-shell";
import { EventWorkbench } from "@/components/admin/EventWorkbench";
import { requireAccountViewer } from "@/lib/auth";
import { listEventsForAdmin } from "@/lib/events";
import { resolveWorkspaceChapter } from "@/lib/chapter-workspace";

type ChapterEventsPageProps = {
  searchParams: Promise<{
    edit?: string;
  }>;
};

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

  return (
    <AccountPageShell
      badge="Events admin"
      description="Manage the events that appear on the chapter homepage and feed the chapter-in-a-box generator."
      eyebrow="Chapter workspace"
      title="Events"
    >
      <EventWorkbench
        chapterId={chapter.id}
        chapterSubdomain={chapter.subdomain}
        initialEvents={events}
        initialSelectedEventId={params.edit ?? null}
      />
    </AccountPageShell>
  );
}
