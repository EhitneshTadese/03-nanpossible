import { NextResponse } from "next/server";
import { canEditChapter, getCurrentUser } from "@/lib/auth";
import { getContentPageByIdForAdmin } from "@/lib/content";
import {
  buildChapterConfigUpdatePayload,
  buildDraftUpdatePayload,
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
    editor_kind?: "legacy" | "builder";
    page_id?: string;
    body_json?: unknown;
    builder_chrome?: unknown;
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

  const editorKind = body.editor_kind === "builder" ? "builder" : "legacy";

  let updatePayload: ReturnType<typeof buildDraftUpdatePayload>;
  try {
    updatePayload = buildDraftUpdatePayload(page, {
      editorKind,
      bodyJson: body.body_json ?? null,
    });
  } catch {
    return NextResponse.json({ error: "invalid-update-payload" }, { status: 400 });
  }

  const { error } = await client.from("content_pages").update(updatePayload).eq("id", pageId);

  if (error) {
    return NextResponse.json({ error: "save-failed" }, { status: 500 });
  }

  if (editorKind === "builder" && body.builder_chrome != null) {
    const chapter = await getChapterById(page.chapterId);

    if (!chapter) {
      return NextResponse.json({ error: "missing-chapter" }, { status: 404 });
    }

    let configPayload: ReturnType<typeof buildChapterConfigUpdatePayload>;
    try {
      configPayload = buildChapterConfigUpdatePayload(chapter, body.builder_chrome);
    } catch {
      return NextResponse.json({ error: "invalid-update-payload" }, { status: 400 });
    }

    const { error: chapterError } = await client
      .from("chapters")
      .update({
        config: configPayload,
      })
      .eq("id", page.chapterId);

    if (chapterError) {
      return NextResponse.json({ error: "save-failed" }, { status: 500 });
    }
  }

  return NextResponse.json({
    success: true,
    savedAt: new Date().toISOString(),
  });
}
