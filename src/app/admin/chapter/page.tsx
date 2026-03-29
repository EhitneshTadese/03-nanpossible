import { notFound } from "next/navigation";
import { AccountPageShell } from "@/components/account-page-shell";
import { ContentEditor } from "@/components/admin/ContentEditor";
import { PageList } from "@/components/admin/PageList";
import { requireAccountViewer } from "@/lib/auth";
import { listChapterPagesForAdmin } from "@/lib/content";
import { resolveWorkspaceChapter } from "@/lib/chapter-workspace";

type ChapterAdminPageProps = {
  searchParams: Promise<{
    page?: string;
  }>;
};

export default async function ChapterAdminPage({
  searchParams,
}: ChapterAdminPageProps) {
  const viewer = await requireAccountViewer("/admin/chapter", [
    "platform_admin",
    "chapter_admin",
    "content_creator",
  ]);
  const chapter = await resolveWorkspaceChapter(viewer);

  if (!chapter) {
    notFound();
  }

  const params = await searchParams;
  const pages = await listChapterPagesForAdmin(chapter.id);
  const selectedPage =
    pages.find((page) => page.id === params.page) ?? pages[0] ?? null;

  return (
    <AccountPageShell
      badge="Chapter content"
      description="Edit the live chapter pages, save drafts, and generate localized copy with the chapter-in-a-box flow."
      eyebrow="Chapter workspace"
      title={chapter.name}
    >
      <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
        <PageList currentPageId={selectedPage?.id ?? null} pages={pages} />
        {selectedPage ? (
          <ContentEditor
            chapterId={chapter.id}
            defaultLanguage={chapter.language}
            initialContent={selectedPage.bodyJson ?? selectedPage.bodyRichtext}
            initialHtml={selectedPage.bodyHtml ?? ""}
            pageId={selectedPage.id}
            pageSlug={selectedPage.slug}
            pageTitle={selectedPage.title}
            published={selectedPage.published}
          />
        ) : (
          <section className="site-panel rounded-[2rem] p-8">
            <p className="text-lg leading-8 text-foreground/72">
              No content pages are seeded for this chapter yet.
            </p>
          </section>
        )}
      </div>
    </AccountPageShell>
  );
}
