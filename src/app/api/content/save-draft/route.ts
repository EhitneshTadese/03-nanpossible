import { NextResponse } from "next/server";
import { canEditChapter, getCurrentUser } from "@/lib/auth";
import { getContentPageByIdForAdmin } from "@/lib/content";
import { createServiceRoleSupabaseClient } from "@/lib/supabase-admin";

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
    body_json?: unknown;
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

  const { error } = await client
    .from("content_pages")
    .update({
      body_richtext: body.body_json ?? null,
    })
    .eq("id", pageId);

  if (error) {
    return NextResponse.json({ error: "save-failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
