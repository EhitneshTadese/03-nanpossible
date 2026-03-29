import sanitizeHtml from "sanitize-html";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { canEditChapter, getCurrentUser } from "@/lib/auth";
import { getContentPageByIdForAdmin } from "@/lib/content";
import { createServiceRoleSupabaseClient } from "@/lib/supabase-admin";
import { getChapterById } from "@/lib/tenant";

function getTenantPaths(subdomain: string, slug: string) {
  const base = `/sites/${subdomain}`;

  return [
    base,
    slug === "home" ? base : `${base}/${slug}`,
  ];
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
    page_id?: string;
    body_json?: unknown;
    body_html?: string;
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

  const cleanHtml = sanitizeHtml(String(body.body_html ?? ""), {
    allowedTags: ["h2", "h3", "p", "ul", "ol", "li", "strong", "em", "a", "blockquote", "img"],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt"],
    },
    allowedSchemes: ["http", "https", "mailto"],
  });

  const { error } = await client
    .from("content_pages")
    .update({
      body_richtext: body.body_json ?? null,
      body_html: cleanHtml,
      published: Boolean(body.published),
    })
    .eq("id", pageId);

  if (error) {
    return NextResponse.json({ error: "update-failed" }, { status: 500 });
  }

  if (body.published) {
    const chapter = await getChapterById(page.chapterId);

    if (chapter) {
      for (const path of getTenantPaths(chapter.subdomain, page.slug)) {
        revalidatePath(path);
      }
    }
  }

  return NextResponse.json({ success: true });
}
