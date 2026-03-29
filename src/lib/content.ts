import pages from "@/content/pages.json";
import { createServiceRoleSupabaseClient } from "@/lib/supabase-admin";
import { createSupabaseContentClient } from "@/lib/supabase";
import type { ContentBody, ContentPageRecord } from "@/lib/types";

const pageFixtures = pages as ContentPageRecord[];

type GetContentPageOptions = {
  slug: string;
  chapterId?: string | null;
  tenantSubdomain?: string | null;
  publishedOnly?: boolean;
};

type ContentPageRow = {
  id: string;
  chapter_id: string | null;
  slug: string;
  title: string;
  published: boolean;
  body_html?: string | null;
  body_json?: unknown;
  body_richtext?: ContentBody | null;
  seo?: ContentPageRecord["seo"] | null;
  is_global?: boolean | null;
  language?: string | null;
  sort_order?: number | null;
  ai_generated?: boolean | null;
};

const contentPageColumns = [
  "id",
  "chapter_id",
  "slug",
  "title",
  "published",
  "body_html",
  "body_json",
  "body_richtext",
  "seo",
  "is_global",
  "language",
  "sort_order",
  "ai_generated",
].join(", ");

function getEmptyBody(): ContentBody {
  return {
    heroIntro: "",
    metrics: [],
    sections: [],
  };
}

function mapPageRecord(
  data: Omit<ContentPageRecord, "bodyRichtext" | "seo"> & {
    body_json?: unknown;
    body_richtext?: ContentBody | null;
    body_html?: string | null;
    seo?: ContentPageRecord["seo"] | null;
  },
) {
  return {
    id: data.id,
    chapterId: data.chapterId ?? null,
    slug: data.slug,
    title: data.title,
    isGlobal: data.isGlobal,
    language: data.language,
    sortOrder: data.sortOrder,
    published: data.published,
    aiGenerated: data.aiGenerated,
    bodyHtml: data.body_html ?? undefined,
    bodyJson: data.body_json ?? data.body_richtext ?? null,
    bodyRichtext: data.body_richtext ?? getEmptyBody(),
    seo: data.seo ?? {
      description: "",
      sourceUrl: "",
      sourceStatus: "unknown",
      sourceNotes: "",
    },
  } satisfies ContentPageRecord;
}

function mapPageRow(data: ContentPageRow) {
  return mapPageRecord({
    id: data.id,
    chapterId: data.chapter_id,
    slug: data.slug,
    title: data.title,
    isGlobal: Boolean(data.is_global ?? (data.chapter_id == null)),
    language: data.language ?? "en",
    sortOrder: data.sort_order ?? 0,
    published: data.published,
    aiGenerated: Boolean(data.ai_generated),
    body_html: data.body_html ?? null,
    body_json: data.body_json ?? null,
    body_richtext: data.body_richtext ?? null,
    seo: data.seo ?? null,
  });
}

function sortPages(left: ContentPageRecord, right: ContentPageRecord) {
  return left.sortOrder - right.sortOrder || left.title.localeCompare(right.title);
}

function getFixturePage(slug: string, chapterId?: string | null) {
  const chapterPage =
    chapterId != null
      ? pageFixtures.find((page) => page.chapterId === chapterId && page.slug === slug)
      : null;

  if (chapterPage) {
    return chapterPage;
  }

  return pageFixtures.find((page) => page.chapterId === null && page.slug === slug) ?? null;
}

export async function getContentPage({
  slug,
  chapterId = null,
  tenantSubdomain = null,
  publishedOnly = true,
}: GetContentPageOptions) {
  const client = createSupabaseContentClient({ tenantSubdomain });

  if (client) {
    try {
      if (chapterId) {
        let chapterQuery = client
          .from("content_pages")
          .select(contentPageColumns)
          .eq("chapter_id", chapterId)
          .eq("slug", slug);

        if (publishedOnly) {
          chapterQuery = chapterQuery.eq("published", true);
        }

        const { data: chapterPage } = await chapterQuery.maybeSingle();

        if (chapterPage) {
          return mapPageRow(chapterPage as unknown as ContentPageRow);
        }
      }

      let globalQuery = client
        .from("content_pages")
        .select(contentPageColumns)
        .is("chapter_id", null)
        .eq("slug", slug);

      if (publishedOnly) {
        globalQuery = globalQuery.eq("published", true);
      }

      const { data: globalPage } = await globalQuery.maybeSingle();

      if (globalPage) {
        return mapPageRow(globalPage as unknown as ContentPageRow);
      }
    } catch {
      // fall through to fixtures
    }
  }

  return getFixturePage(slug, chapterId);
}

export async function listChapterPages(
  chapterId: string,
  options: {
    tenantSubdomain?: string | null;
    publishedOnly?: boolean;
  } = {},
) {
  const client = createSupabaseContentClient({
    tenantSubdomain: options.tenantSubdomain,
  });

  if (client) {
    try {
      let query = client
        .from("content_pages")
        .select(contentPageColumns)
        .eq("chapter_id", chapterId)
        .order("sort_order", { ascending: true })
        .order("title", { ascending: true });

      if (options.publishedOnly ?? true) {
        query = query.eq("published", true);
      }

      const { data } = await query;

      if (data) {
        return (data as unknown as ContentPageRow[]).map(mapPageRow);
      }
    } catch {
      // fall through
    }
  }

  return pageFixtures
    .filter((page) => page.chapterId === chapterId)
    .filter((page) => ((options.publishedOnly ?? true) ? page.published : true))
    .sort(sortPages);
}

export async function listChapterPagesForAdmin(chapterId: string) {
  const client = createServiceRoleSupabaseClient();

  if (!client) {
    return listChapterPages(chapterId, { publishedOnly: false });
  }

  const { data } = await client
    .from("content_pages")
    .select(contentPageColumns)
    .eq("chapter_id", chapterId)
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });

  return ((data ?? []) as unknown as ContentPageRow[]).map(mapPageRow);
}

export async function getContentPageByIdForAdmin(pageId: string) {
  const client = createServiceRoleSupabaseClient();

  if (!client) {
    return (
      pageFixtures.find((page) => page.id === pageId) ?? null
    );
  }

  const { data } = await client
    .from("content_pages")
    .select(contentPageColumns)
    .eq("id", pageId)
    .maybeSingle();

  return data ? mapPageRow(data as unknown as ContentPageRow) : null;
}
