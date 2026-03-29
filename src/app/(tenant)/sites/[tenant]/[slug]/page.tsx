import { notFound, redirect } from "next/navigation";
import AudioPlayer from "@/components/AudioPlayer";
import { ensureContentPageAudio } from "@/lib/audio";
import { getContentPage } from "@/lib/content";
import { normalizeChapterSlug } from "@/lib/routing";
import { getChapterBySubdomain } from "@/lib/tenant";

export const revalidate = 3600;

type TenantChapterPageProps = {
  params: Promise<{
    tenant: string;
    slug: string;
  }>;
};

export default async function TenantChapterPage({
  params,
}: TenantChapterPageProps) {
  const { tenant, slug } = await params;
  const chapter = await getChapterBySubdomain(tenant);

  if (!chapter) {
    notFound();
  }

  const route = normalizeChapterSlug(slug);

  if (route.redirectTo) {
    redirect(route.redirectTo);
  }

  if (!route.slug) {
    notFound();
  }

  const page = await getContentPage({
    slug: route.slug,
    chapterId: chapter.id,
    tenantSubdomain: chapter.subdomain,
  });

  if (!page?.published || !page.bodyHtml) {
    notFound();
  }

  const audio = await ensureContentPageAudio(page);

  return (
    <div className="page-frame">
      <div className="site-shell">
        <section className="site-panel rounded-[2rem] p-7 md:p-10">
          <span className="eyebrow">{chapter.name}</span>
          <h1 className="mt-5 font-display text-4xl tracking-[-0.05em] text-teal-deep md:text-6xl">
            {page.title}
          </h1>
          <div className="mt-6">
            <AudioPlayer
              audioUrl={audio.audioUrl ?? page.audioUrl ?? null}
              duration={audio.durationSeconds ?? page.audioDurationSeconds ?? null}
              pageTitle={page.title}
            />
          </div>
          <div
            className="prose mt-8 max-w-none"
            dangerouslySetInnerHTML={{ __html: page.bodyHtml }}
          />
        </section>
      </div>
    </div>
  );
}
