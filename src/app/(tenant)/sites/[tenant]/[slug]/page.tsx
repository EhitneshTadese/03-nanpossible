import { notFound, redirect } from "next/navigation";
import { BuilderPageRenderer } from "@/components/chapter/BuilderPageRenderer";
import { ChapterHtmlPage } from "@/components/chapter/ChapterHtmlPage";
import { SiteChromeFrame } from "@/components/site-chrome-frame";
import { getCurrentViewer } from "@/lib/auth";
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

  if (!page?.published) {
    notFound();
  }

  const viewer = await getCurrentViewer();
  const siteContext = {
    isGlobal: false as const,
    tenant: chapter,
    host: `${chapter.subdomain}.${process.env.NEXT_PUBLIC_SITE_DOMAIN ?? "wial.org"}`,
  };

  if (page.liveRenderSource === "builder" && page.builderPublished) {
    return (
      <SiteChromeFrame siteContext={siteContext} viewer={viewer}>
        <BuilderPageRenderer
          chapter={chapter}
          chrome={chapter.builderChromePublished ?? null}
          doc={page.builderPublished}
          suppressChrome
        />
      </SiteChromeFrame>
    );
  }

  if (!page.bodyHtml) {
    notFound();
  }

  return (
    <SiteChromeFrame siteContext={siteContext} viewer={viewer}>
      <ChapterHtmlPage chapterName={chapter.name} html={page.bodyHtml} title={page.title} />
    </SiteChromeFrame>
  );
}
