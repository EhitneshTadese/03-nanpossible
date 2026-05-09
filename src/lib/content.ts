import pages from "@/content/pages.json";
import {
  getPageEditorKind,
  getPublishedPageEditorKind,
  parseBuilderPageState,
} from "@/lib/builder-page";
import { createServiceRoleSupabaseClient } from "@/lib/supabase-admin";
import { createSupabaseContentClient } from "@/lib/supabase";
import type { ContentBody, ContentPageRecord } from "@/lib/types";

type StaticContentPageFixture = {
  id: string;
  chapterId: string | null;
  slug: string;
  title: string;
  published: boolean;
  bodyHtml?: string;
  bodyJson?: unknown;
  bodyRichtext?: ContentBody | null;
  seo?: ContentPageRecord["seo"] | null;
  isGlobal?: boolean | null;
  language?: string | null;
  sortOrder?: number | null;
  aiGenerated?: boolean | null;
};

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
  audio_url?: string | null;
  audio_duration_seconds?: number | null;
  audio_generated_at?: string | null;
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
  "audio_url",
  "audio_duration_seconds",
  "audio_generated_at",
].join(", ");

function getEmptyBody(): ContentBody {
  return {
    heroIntro: "",
    metrics: [],
    sections: [],
  };
}

export function normalizeContentPageRecord(
  data: {
    id: string;
    chapterId: string | null;
    slug: string;
    title: string;
    isGlobal: boolean;
    language: string;
    sortOrder: number;
    published: boolean;
    aiGenerated: boolean;
    body_json?: unknown;
    body_richtext?: ContentBody | null;
    body_html?: string | null;
    seo?: ContentPageRecord["seo"] | null;
    audio_url?: string | null;
    audio_duration_seconds?: number | null;
    audio_generated_at?: string | null;
  },
) {
  const builderState = parseBuilderPageState(data.body_json ?? null);
  const hasPublishedBuilderSnapshot = Boolean(data.published && builderState?.published);
  const liveRenderSource = hasPublishedBuilderSnapshot ? "builder" : "legacy";

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
    editorKind: getPageEditorKind(data.body_json ?? null),
    publishedEditorKind: getPublishedPageEditorKind(
      data.body_json ?? null,
      data.published,
    ),
    hasPublishedBuilderSnapshot,
    liveRenderSource,
    bodyHtml: data.body_html ?? undefined,
    bodyJson: data.body_json ?? data.body_richtext ?? null,
    bodyRichtext: data.body_richtext ?? getEmptyBody(),
    builderState,
    builderDraft: builderState?.draft ?? null,
    builderPublished: builderState?.published ?? null,
    seo: data.seo ?? {
      description: "",
      sourceUrl: "",
      sourceStatus: "unknown",
      sourceNotes: "",
    },
    ...(data.audio_url
      ? {
          audioUrl: data.audio_url,
        }
      : {}),
    ...(typeof data.audio_duration_seconds === "number"
      ? {
          audioDurationSeconds: data.audio_duration_seconds,
        }
      : {}),
    ...(data.audio_generated_at
      ? {
          audioGeneratedAt: data.audio_generated_at,
        }
      : {}),
  } satisfies ContentPageRecord;
}

const pageFixtures = (pages as StaticContentPageFixture[]).map((page) =>
  normalizeContentPageRecord({
    id: page.id,
    chapterId: page.chapterId,
    slug: page.slug,
    title: page.title,
    isGlobal: Boolean(page.isGlobal ?? (page.chapterId == null)),
    language: page.language ?? "en",
    sortOrder: page.sortOrder ?? 0,
    published: page.published,
    aiGenerated: Boolean(page.aiGenerated),
    body_json: page.bodyJson ?? null,
    body_richtext: page.bodyRichtext ?? null,
    body_html: page.bodyHtml ?? null,
    seo: page.seo ?? null,
    audio_url: null,
    audio_duration_seconds: null,
    audio_generated_at: null,
  }),
);

function mapPageRow(data: ContentPageRow) {
  return normalizeContentPageRecord({
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
    audio_url: data.audio_url ?? null,
    audio_duration_seconds: data.audio_duration_seconds ?? null,
    audio_generated_at: data.audio_generated_at ?? null,
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
