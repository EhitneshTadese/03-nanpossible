import { ChapterProvider } from "@/components/providers/ChapterProvider";
import { requireAccountViewer } from "@/lib/auth";
import { resolveWorkspaceChapter } from "@/lib/chapter-workspace";

export default async function ChapterAdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const viewer = await requireAccountViewer("/admin/chapter", [
    "platform_admin",
    "chapter_admin",
    "content_creator",
  ]);
  const chapter = await resolveWorkspaceChapter(viewer);

  if (!chapter) {
    return (
      <div className="site-panel rounded-[2rem] p-8">
        <p className="eyebrow">Chapter admin</p>
        <h1 className="mt-4 font-display text-4xl text-teal-deep">
          No chapter workspace selected
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-foreground/72">
          Open this route on a chapter subdomain or ask a WIAL platform admin to
          assign this account to a chapter workspace.
        </p>
      </div>
    );
  }

  return (
    <ChapterProvider
      value={{
        id: chapter.id,
        subdomain: chapter.subdomain,
        name: chapter.name,
        language: chapter.language,
      }}
    >
      <>{children}</>
    </ChapterProvider>
  );
}
