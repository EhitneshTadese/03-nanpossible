import { createServiceRoleSupabaseClient } from "@/lib/supabase-admin";
import { createSupabaseContentClient } from "@/lib/supabase";
import type { EventRecord } from "@/lib/types";

type EventRow = {
  id: string;
  chapter_id: string;
  title: string;
  start_at: string;
  end_at: string | null;
  location: string | null;
  description: string | null;
  published: boolean;
  created_at: string;
  updated_at: string;
};

const eventColumns = [
  "id",
  "chapter_id",
  "title",
  "start_at",
  "end_at",
  "location",
  "description",
  "published",
  "created_at",
  "updated_at",
].join(", ");

function mapEventRow(row: EventRow): EventRecord {
  return {
    id: row.id,
    chapterId: row.chapter_id,
    title: row.title,
    startAt: row.start_at,
    endAt: row.end_at,
    location: row.location,
    description: row.description,
    published: row.published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listUpcomingEvents(
  chapterId: string,
  options: {
    limit?: number;
    tenantSubdomain?: string | null;
    publishedOnly?: boolean;
  } = {},
) {
  const client = createSupabaseContentClient({
    tenantSubdomain: options.tenantSubdomain,
  });

  if (!client) {
    return [] satisfies EventRecord[];
  }

  let query = client
    .from("events")
    .select(eventColumns)
    .eq("chapter_id", chapterId)
    .gte("start_at", new Date().toISOString())
    .order("start_at", { ascending: true })
    .limit(options.limit ?? 10);

  if (options.publishedOnly ?? true) {
    query = query.eq("published", true);
  }

  const { data } = await query;
  return ((data ?? []) as unknown as EventRow[]).map(mapEventRow);
}

export async function listEventsForAdmin(chapterId: string) {
  const client = createServiceRoleSupabaseClient();

  if (!client) {
    return [] satisfies EventRecord[];
  }

  const { data } = await client
    .from("events")
    .select(eventColumns)
    .eq("chapter_id", chapterId)
    .order("start_at", { ascending: true });

  return ((data ?? []) as unknown as EventRow[]).map(mapEventRow);
}

export async function getEventByIdForAdmin(eventId: string) {
  const client = createServiceRoleSupabaseClient();

  if (!client) {
    return null;
  }

  const { data } = await client
    .from("events")
    .select(eventColumns)
    .eq("id", eventId)
    .maybeSingle();

  return data ? mapEventRow(data as unknown as EventRow) : null;
}
