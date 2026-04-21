import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { canEditChapter, getCurrentUser } from "@/lib/auth";
import { getEventByIdForAdmin } from "@/lib/events";
import { normalizeEventDraftForSave, type EventDraft } from "@/lib/events-workbench";
import { createServiceRoleSupabaseClient } from "@/lib/supabase-admin";
import { getChapterById } from "@/lib/tenant";

function getTenantPaths(subdomain: string) {
  return [`/sites/${subdomain}`, `/sites/${subdomain}/events`];
}

export async function POST(request: Request) {
  const viewer = await getCurrentUser();

  if (!viewer) {
    return NextResponse.json({ error: "You must be signed in to edit events." }, { status: 401 });
  }

  const client = createServiceRoleSupabaseClient();

  if (!client) {
    return NextResponse.json(
      { error: "The Supabase service-role configuration is missing." },
      { status: 500 },
    );
  }

  const body = (await request.json().catch(() => null)) as EventDraft | null;
  const normalized = normalizeEventDraftForSave(
    body ?? {
      id: null,
      chapterId: "",
      title: "",
      startAt: "",
      endAt: "",
      location: "",
      description: "",
      published: false,
    },
  );

  if (!normalized.ok) {
    return NextResponse.json(
      { error: "Title, chapter, and start date are required." },
      { status: 400 },
    );
  }

  if (!canEditChapter(viewer, normalized.payload.chapterId)) {
    return NextResponse.json(
      { error: "This account cannot edit events for the active chapter." },
      { status: 403 },
    );
  }

  const payload = {
    chapter_id: normalized.payload.chapterId,
    title: normalized.payload.title,
    start_at: normalized.payload.startAt,
    end_at: normalized.payload.endAt,
    location: normalized.payload.location,
    description: normalized.payload.description,
    published: normalized.payload.published,
  };

  const query = normalized.payload.eventId
    ? client
        .from("events")
        .update(payload)
        .eq("id", normalized.payload.eventId)
        .select("id")
        .single()
    : client.from("events").insert(payload).select("id").single();

  const { data, error } = await query;

  if (error || !data?.id) {
    return NextResponse.json({ error: "WIAL could not save this event." }, { status: 500 });
  }

  const savedEvent = await getEventByIdForAdmin(data.id);

  if (!savedEvent) {
    return NextResponse.json(
      { error: "WIAL could not load the saved event." },
      { status: 500 },
    );
  }

  const chapter = await getChapterById(savedEvent.chapterId);

  if (chapter) {
    for (const path of getTenantPaths(chapter.subdomain)) {
      revalidatePath(path);
    }
  }

  return NextResponse.json({
    event: savedEvent,
    savedAt: new Date().toISOString(),
  });
}

export async function DELETE(request: Request) {
  const viewer = await getCurrentUser();

  if (!viewer) {
    return NextResponse.json({ error: "You must be signed in to edit events." }, { status: 401 });
  }

  const client = createServiceRoleSupabaseClient();

  if (!client) {
    return NextResponse.json(
      { error: "The Supabase service-role configuration is missing." },
      { status: 500 },
    );
  }

  const body = (await request.json().catch(() => null)) as
    | {
        chapterId?: string;
        eventId?: string;
      }
    | null;
  const chapterId = String(body?.chapterId ?? "");
  const eventId = String(body?.eventId ?? "");

  if (!chapterId || !eventId) {
    return NextResponse.json(
      { error: "Title, chapter, and start date are required." },
      { status: 400 },
    );
  }

  if (!canEditChapter(viewer, chapterId)) {
    return NextResponse.json(
      { error: "This account cannot edit events for the active chapter." },
      { status: 403 },
    );
  }

  const { error } = await client.from("events").delete().eq("id", eventId);

  if (error) {
    return NextResponse.json({ error: "WIAL could not delete this event." }, { status: 500 });
  }

  const chapter = await getChapterById(chapterId);

  if (chapter) {
    for (const path of getTenantPaths(chapter.subdomain)) {
      revalidatePath(path);
    }
  }

  return NextResponse.json({
    deletedEventId: eventId,
    savedAt: new Date().toISOString(),
  });
}
