import { NextResponse } from "next/server";
import { canEditChapter, getCurrentUser } from "@/lib/auth";
import { getContentPageByIdForAdmin } from "@/lib/content";
import {
  createBuilderChromeDraftState,
  createBuilderDraftState,
} from "@/lib/content-page-editor";
import { createServiceRoleSupabaseClient } from "@/lib/supabase-admin";
import { getChapterById } from "@/lib/tenant";

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
    page_id?: string;
  };
  const pageId = String(body.page_id ?? "");

  if (!pageId) {
    return NextResponse.json({ error: "missing-page" }, { status: 400 });
  }

  const page = await getContentPageByIdForAdmin(pageId);

  if (!page || !page.chapterId) {
    return NextResponse.json({ error: "page-not-found" }, { status: 404 });
  }

  if (!canEditChapter(viewer, page.chapterId)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (page.builderState) {
    const chapter = await getChapterById(page.chapterId);
    const builderChrome =
      chapter?.builderChromeState ??
      (chapter
        ? createBuilderChromeDraftState(chapter)
        : null);

    return NextResponse.json({
      editorKind: "builder",
      success: true,
      bodyJson: page.builderState,
      builderChrome,
    });
  }

  const chapter = await getChapterById(page.chapterId);
  const builderState = createBuilderDraftState(page.title, chapter?.name ?? page.title);
  const builderChrome =
    chapter?.builderChromeState ??
    (chapter ? createBuilderChromeDraftState(chapter) : null);

  if (!chapter || !builderChrome) {
    return NextResponse.json({ error: "chapter-not-found" }, { status: 404 });
  }

  const { error } = await client
    .from("content_pages")
    .update({
      body_json: builderState,
    })
    .eq("id", pageId);

  if (error) {
    return NextResponse.json({ error: "create-failed" }, { status: 500 });
  }

  const { error: chapterError } = await client
    .from("chapters")
    .update({
      config: {
        ...(chapter.config ?? {}),
        builderChrome,
      },
    })
    .eq("id", page.chapterId);

  if (chapterError) {
    return NextResponse.json({ error: "create-failed" }, { status: 500 });
  }

  return NextResponse.json({
    editorKind: "builder",
    success: true,
    bodyJson: builderState,
    builderChrome,
  });
}
