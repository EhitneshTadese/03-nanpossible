import { notFound, redirect } from "next/navigation";
import { ChapterHtmlPage } from "@/components/chapter/ChapterHtmlPage";
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

  return <ChapterHtmlPage chapterName={chapter.name} html={page.bodyHtml} title={page.title} />;
}
