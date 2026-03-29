"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canEditChapter, requireAccountViewer } from "@/lib/auth";
import { createServiceRoleSupabaseClient } from "@/lib/supabase-admin";
import { getChapterById } from "@/lib/tenant";

function buildReturnPath(params: Record<string, string>) {
  return `/admin/chapter/events?${new URLSearchParams(params).toString()}`;
}

function getTenantPaths(subdomain: string) {
  return [`/sites/${subdomain}`, `/sites/${subdomain}/events`];
}

export async function upsertEventAction(formData: FormData) {
  const viewer = await requireAccountViewer("/admin/chapter/events", [
    "platform_admin",
    "chapter_admin",
    "content_creator",
  ]);
  const client = createServiceRoleSupabaseClient();

  if (!client) {
    redirect(buildReturnPath({ error: "missing-config" }));
  }

  const eventId = String(formData.get("eventId") ?? "");
  const chapterId = String(formData.get("chapterId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const startAt = String(formData.get("startAt") ?? "").trim();
  const endAt = String(formData.get("endAt") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const published = formData.get("published") === "on";

  if (!chapterId || !title || !startAt) {
    redirect(buildReturnPath({ error: "missing-fields" }));
  }

  if (!canEditChapter(viewer, chapterId)) {
    redirect(buildReturnPath({ error: "forbidden" }));
  }

  const payload = {
    chapter_id: chapterId,
    title,
    start_at: new Date(startAt).toISOString(),
    end_at: endAt ? new Date(endAt).toISOString() : null,
    location: location || null,
    description: description || null,
    published,
  };

  const query = eventId
    ? client.from("events").update(payload).eq("id", eventId)
    : client.from("events").insert(payload);

  const { error } = await query;

  if (error) {
    redirect(buildReturnPath({ error: "save-failed" }));
  }

  const chapter = await getChapterById(chapterId);

  if (chapter) {
    for (const path of getTenantPaths(chapter.subdomain)) {
      revalidatePath(path);
    }
  }

  redirect(buildReturnPath({ notice: eventId ? "updated" : "created" }));
}

export async function deleteEventAction(formData: FormData) {
  const viewer = await requireAccountViewer("/admin/chapter/events", [
    "platform_admin",
    "chapter_admin",
    "content_creator",
  ]);
  const client = createServiceRoleSupabaseClient();

  if (!client) {
    redirect(buildReturnPath({ error: "missing-config" }));
  }

  const eventId = String(formData.get("eventId") ?? "");
  const chapterId = String(formData.get("chapterId") ?? "");

  if (!eventId || !chapterId) {
    redirect(buildReturnPath({ error: "missing-fields" }));
  }

  if (!canEditChapter(viewer, chapterId)) {
    redirect(buildReturnPath({ error: "forbidden" }));
  }

  const { error } = await client.from("events").delete().eq("id", eventId);

  if (error) {
    redirect(buildReturnPath({ error: "delete-failed" }));
  }

  const chapter = await getChapterById(chapterId);

  if (chapter) {
    for (const path of getTenantPaths(chapter.subdomain)) {
      revalidatePath(path);
    }
  }

  redirect(buildReturnPath({ notice: "deleted" }));
}
