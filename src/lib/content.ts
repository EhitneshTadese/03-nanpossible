import pages from "@/content/pages.json";
import { createSupabaseContentClient } from "@/lib/supabase";
import type { CanonicalPageSlug, ContentPageRecord } from "@/lib/types";

const pageFixtures = pages as ContentPageRecord[];

type GetContentPageOptions = {
  slug: CanonicalPageSlug;
  chapterId?: string | null;
  tenantSubdomain?: string | null;
};

function mapPageRecord(
  data: Omit<ContentPageRecord, "bodyRichtext" | "seo"> & {
    body_richtext?: ContentPageRecord["bodyRichtext"];
    body_html?: string | null;
    seo?: ContentPageRecord["seo"];
  },
) {
  return {
    id: data.id,
    chapterId: data.chapterId ?? null,
    slug: data.slug,
    title: data.title,
    published: data.published,
    bodyHtml: data.body_html ?? undefined,
    bodyRichtext: data.body_richtext ?? {
      heroIntro: "",
      metrics: [],
      sections: [],
    },
    seo: data.seo ?? {
      description: "",
      sourceUrl: "",
      sourceStatus: "unknown",
      sourceNotes: "",
    },
  } satisfies ContentPageRecord;
}

export async function getContentPage({
  slug,
  chapterId = null,
  tenantSubdomain = null,
}: GetContentPageOptions) {
  const client = createSupabaseContentClient({ tenantSubdomain });

  if (client) {
    if (chapterId) {
      const { data: chapterPage } = await client
        .from("content_pages")
        .select("id, chapter_id, slug, title, published, body_html, body_richtext, seo")
        .eq("chapter_id", chapterId)
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();

      if (chapterPage) {
        return mapPageRecord({
          ...chapterPage,
          chapterId: chapterPage.chapter_id,
        });
      }
    }

    const { data: globalPage } = await client
      .from("content_pages")
      .select("id, chapter_id, slug, title, published, body_html, body_richtext, seo")
      .is("chapter_id", null)
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle();

    if (globalPage) {
      return mapPageRecord({
        ...globalPage,
        chapterId: globalPage.chapter_id,
      });
    }
  }

  const chapterPage =
    chapterId != null
      ? pageFixtures.find(
          (page) => page.chapterId === chapterId && page.slug === slug,
        )
      : null;

  if (chapterPage) {
    return chapterPage;
  }

  return (
    pageFixtures.find((page) => page.chapterId === null && page.slug === slug) ??
    null
  );
}
