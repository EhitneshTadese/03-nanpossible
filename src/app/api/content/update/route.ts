import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { canEditChapter, getCurrentUser } from "@/lib/auth";
import { getContentPageByIdForAdmin, listChapterPages } from "@/lib/content";
import {
  buildPublishUpdatePayload,
  parseBuilderChromeDraftState,
} from "@/lib/content-page-editor";
import { sanitizeContentPageHtml } from "@/lib/content-html";
import { mergeBuilderChromeIntoConfig } from "@/lib/builder-page";
import { createServiceRoleSupabaseClient } from "@/lib/supabase-admin";
import { getChapterById } from "@/lib/tenant";

function getTenantPaths(subdomain: string, slug: string) {
  const base = `/sites/${subdomain}`;

  return [
    base,
    slug === "home" ? base : `${base}/${slug}`,
  ];
}

function hasPersistedBuilderSnapshot(value: unknown) {
  return Boolean(
    value &&
      typeof value === "object" &&
      "published" in value &&
      (value as { published?: unknown }).published != null,
  );
}

export async function POST(request: Request) {
  const viewer = await getCurrentUser();

  if (!viewer) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const client = createServiceRoleSupabaseClient();

  if (!client) {
    return NextResponse.json({ error: "missing-config" }, { status: 500 });
  }

  const body = (await request.json()) as {
    editor_kind?: "legacy" | "builder";
    page_id?: string;
    body_json?: unknown;
    body_html?: string;
    builder_chrome?: unknown;
    published?: boolean;
  };
  const pageId = String(body.page_id ?? "");
  const page = await getContentPageByIdForAdmin(pageId);

  if (!page || !page.chapterId) {
    return NextResponse.json({ error: "page-not-found" }, { status: 404 });
  }

  if (!canEditChapter(viewer, page.chapterId)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const chapter = await getChapterById(page.chapterId);

  if (!chapter) {
    return NextResponse.json({ error: "missing-chapter" }, { status: 404 });
  }

  const editorKind = body.editor_kind === "builder" ? "builder" : "legacy";

  if (editorKind === "builder" && body.published && body.builder_chrome == null) {
    return NextResponse.json({ error: "missing-builder-chrome" }, { status: 400 });
  }

  let nextChromeState: ReturnType<typeof parseBuilderChromeDraftState> | null = null;
  let persistedChromeState: ReturnType<typeof parseBuilderChromeDraftState> | null = null;
  let updatePayload: ReturnType<typeof buildPublishUpdatePayload>;

  try {
    nextChromeState =
      editorKind === "builder" && body.builder_chrome != null
        ? parseBuilderChromeDraftState(chapter, body.builder_chrome)
        : null;
    persistedChromeState =
      nextChromeState == null
        ? null
        : body.published
          ? {
              ...nextChromeState,
              published: nextChromeState.draft,
            }
          : nextChromeState;

    updatePayload =
      editorKind === "builder"
        ? buildPublishUpdatePayload(page, {
            editorKind,
            bodyJson: body.body_json ?? null,
            builderChrome: body.builder_chrome ?? null,
            published: Boolean(body.published),
          })
        : buildPublishUpdatePayload(page, {
            editorKind,
            bodyJson: body.body_json ?? null,
            bodyHtml: sanitizeContentPageHtml(String(body.body_html ?? "")),
            published: Boolean(body.published),
          });
  } catch {
    return NextResponse.json({ error: "invalid-update-payload" }, { status: 400 });
  }

  if (
    editorKind === "builder" &&
    body.published &&
    (!hasPersistedBuilderSnapshot(updatePayload.body_json) || persistedChromeState?.published == null)
  ) {
    return NextResponse.json({ error: "invalid-builder-publish-state" }, { status: 500 });
  }

  const { error } = await client.from("content_pages").update(updatePayload).eq("id", pageId);

  if (error) {
    return NextResponse.json({ error: "update-failed" }, { status: 500 });
  }

  if (persistedChromeState != null) {
    const { error: chapterError } = await client
      .from("chapters")
      .update({
        config: mergeBuilderChromeIntoConfig(chapter.config, persistedChromeState),
      })
      .eq("id", page.chapterId);

    if (chapterError) {
      return NextResponse.json({ error: "update-failed" }, { status: 500 });
    }
  }

  if (body.published) {
    const chapterPages = await listChapterPages(chapter.id, {
      tenantSubdomain: chapter.subdomain,
      publishedOnly: false,
    });

    for (const chapterPage of chapterPages) {
      for (const path of getTenantPaths(chapter.subdomain, chapterPage.slug)) {
        revalidatePath(path);
      }
    }
  }

  const hasPublishedBuilderSnapshot =
    editorKind === "builder" && body.published
      ? true
      : page.hasPublishedBuilderSnapshot;

  return NextResponse.json({
    success: true,
    hasPublishedBuilderSnapshot,
    liveRenderSource: hasPublishedBuilderSnapshot ? "builder" : "legacy",
    updatedAt: new Date().toISOString(),
  });
}
