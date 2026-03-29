import chapters from "@/content/chapters.json";
import { createServiceRoleSupabaseClient } from "@/lib/supabase-admin";
import { createSupabaseContentClient } from "@/lib/supabase";
import type { ChapterRecord } from "@/lib/types";

const chapterFixtures = chapters as Array<Record<string, unknown>>;

type ChapterDbRow = {
  id: string;
  name: string;
  subdomain: string;
  region: string | null;
  language: string | null;
  country: string | null;
  lead_user_id: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  description: string | null;
  logo_url: string | null;
  stripe_account_id: string | null;
  config: Record<string, unknown> | null;
  status: ChapterRecord["status"];
  locale?: string | null;
  theme_json?: Record<string, string> | null;
  tagline?: string | null;
};

function mapChapterRow(row: ChapterDbRow): ChapterRecord {
  return {
    id: row.id,
    name: row.name,
    subdomain: row.subdomain,
    region: row.region,
    language: row.language ?? row.locale ?? "en",
    country: row.country,
    leadUserId: row.lead_user_id,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    description: row.description ?? row.tagline ?? null,
    logoUrl: row.logo_url,
    stripeAccountId: row.stripe_account_id,
    config: row.config ?? row.theme_json ?? {},
    status: row.status,
    locale: row.locale ?? row.language ?? "en",
    themeJson: row.theme_json ?? undefined,
    tagline: row.tagline ?? row.description ?? undefined,
  };
}

function mapFixture(record: Record<string, unknown>): ChapterRecord {
  return {
    id: String(record.id),
    name: String(record.name),
    subdomain: String(record.subdomain),
    region: typeof record.region === "string" ? record.region : null,
    language:
      typeof record.language === "string"
        ? record.language
        : typeof record.locale === "string"
          ? record.locale
          : "en",
    country: typeof record.country === "string" ? record.country : null,
    leadUserId: typeof record.leadUserId === "string" ? record.leadUserId : null,
    contactEmail:
      typeof record.contactEmail === "string"
        ? record.contactEmail
        : typeof record.contact_email === "string"
          ? record.contact_email
          : null,
    contactPhone:
      typeof record.contactPhone === "string"
        ? record.contactPhone
        : typeof record.contact_phone === "string"
          ? record.contact_phone
          : null,
    description:
      typeof record.description === "string"
        ? record.description
        : typeof record.tagline === "string"
          ? record.tagline
          : null,
    logoUrl:
      typeof record.logoUrl === "string"
        ? record.logoUrl
        : typeof record.logo_url === "string"
          ? record.logo_url
          : null,
    stripeAccountId:
      typeof record.stripeAccountId === "string"
        ? record.stripeAccountId
        : typeof record.stripe_account_id === "string"
          ? record.stripe_account_id
          : null,
    config:
      (typeof record.config === "object" && record.config !== null
        ? (record.config as Record<string, unknown>)
        : typeof record.themeJson === "object" && record.themeJson !== null
          ? (record.themeJson as Record<string, unknown>)
          : typeof record.theme_json === "object" && record.theme_json !== null
            ? (record.theme_json as Record<string, unknown>)
            : {}) ?? {},
    status:
      record.status === "active" ||
      record.status === "draft" ||
      record.status === "inactive"
        ? record.status
        : "draft",
    locale: typeof record.locale === "string" ? record.locale : undefined,
    themeJson:
      typeof record.themeJson === "object" && record.themeJson !== null
        ? (record.themeJson as Record<string, string>)
        : undefined,
    tagline: typeof record.tagline === "string" ? record.tagline : undefined,
  };
}

const publicChapterColumns = [
  "id",
  "name",
  "subdomain",
  "locale",
  "status",
  "contact_email",
  "theme_json",
  "tagline",
].join(", ");

export async function getChapterBySubdomain(subdomain: string) {
  const client = createSupabaseContentClient({ tenantSubdomain: subdomain });

  if (client) {
    try {
      const { data } = await client
        .from("chapters")
        .select(publicChapterColumns)
        .eq("subdomain", subdomain)
        .eq("status", "active")
        .maybeSingle();

      if (data) {
        return mapChapterRow(data as unknown as ChapterDbRow);
      }
    } catch {
      // fall through to fixtures
    }
  }

  const fallback = chapterFixtures.find(
    (chapter) =>
      chapter.subdomain === subdomain && chapter.status === "active",
  );

  return fallback ? mapFixture(fallback) : null;
}

export async function getChapterById(id: string) {
  const client = createSupabaseContentClient();

  if (client) {
    try {
      const { data } = await client
        .from("chapters")
        .select(publicChapterColumns)
        .eq("id", id)
        .maybeSingle();

      if (data) {
        return mapChapterRow(data as unknown as ChapterDbRow);
      }
    } catch {
      // fall through to fixtures
    }
  }

  const fallback = chapterFixtures.find((chapter) => chapter.id === id);
  return fallback ? mapFixture(fallback) : null;
}

export async function listChapters() {
  const client = createServiceRoleSupabaseClient();

  if (client) {
    const { data } = await client
      .from("chapters")
      .select(publicChapterColumns)
      .order("name", { ascending: true });

    if (data) {
      return (data as unknown as ChapterDbRow[]).map(mapChapterRow);
    }
  }

  return chapterFixtures.map(mapFixture).sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}
