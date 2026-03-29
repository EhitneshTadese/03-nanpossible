import type {
  CertificationLevel,
  CoachRecord,
  CoachSearchFilters,
  CoachSearchResponse,
  ParsedCoachQuery,
} from "@/lib/types";
import { generateEmbedding } from "@/lib/embeddings";
import { chatCompletion } from "@/lib/openrouter";
import { createServiceRoleSupabaseClient } from "@/lib/supabase-admin";
import { searchApprovedCoachesByKeyword } from "@/lib/coaches";

const RATE_LIMIT_WINDOW_MS = 60_000;
const SEARCH_LIMIT = 20;
const DEFAULT_OPENROUTER_SEARCH_MODEL = "anthropic/claude-3.5-haiku";

type CacheEntry = {
  expiresAt: number;
  payload: CoachSearchResponse;
};

const searchCache = new Map<string, CacheEntry>();
const requestCounters = new Map<string, { count: number; resetAt: number }>();

type SearchRow = {
  id: string;
  user_id: string | null;
  chapter_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  photo_url: string | null;
  cert_level: CertificationLevel | null;
  location_city: string | null;
  location_country: string | null;
  location_lat: number | null;
  location_lng: number | null;
  bio: string | null;
  specializations: string[] | null;
  languages: string[] | null;
  website: string | null;
  linkedin: string | null;
  credly_badge_url: string | null;
  approved: boolean;
  created_at: string;
  updated_at: string;
  last_approved_at: string | null;
  rejection_reason: string | null;
  rejected_at: string | null;
};

function toOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toOptionalStringArray(value: unknown) {
  if (Array.isArray(value)) {
    const normalized = value
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim())
      .filter(Boolean);

    return normalized.length ? normalized : null;
  }

  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }

  return null;
}

function toCertificationLevel(value: unknown): CertificationLevel | null {
  return value === "CALC" ||
    value === "PALC" ||
    value === "SALC" ||
    value === "MALC"
    ? value
    : null;
}

export function isComplexCoachQuery(query: string) {
  const normalized = query.trim();

  if (!normalized) {
    return false;
  }

  const wordCount = normalized.split(/\s+/).length;
  const hasStructuredCue =
    /\b(need|near|works with|looking for|who speaks|government|manufacturing|leadership|healthcare)\b/i.test(
      normalized,
    );

  return (
    wordCount > 5 ||
    /[,.!?]/.test(normalized) ||
    (wordCount > 2 && hasStructuredCue)
  );
}

export function buildSearchCacheKey(query: string, filters: CoachSearchFilters, offset = 0) {
  return JSON.stringify({
    query: query.trim().toLowerCase(),
    filters: {
      certLevel: filters.certLevel ?? null,
      country: filters.country?.trim().toLowerCase() ?? null,
      city: filters.city?.trim().toLowerCase() ?? null,
      language: filters.language?.trim().toLowerCase() ?? null,
      specializations: [...(filters.specializations ?? [])]
        .map((value) => value.trim().toLowerCase())
        .sort(),
    },
    offset,
  });
}

export function getCachedSearch(cacheKey: string) {
  const cached = searchCache.get(cacheKey);

  if (!cached) {
    return null;
  }

  if (cached.expiresAt < Date.now()) {
    searchCache.delete(cacheKey);
    return null;
  }

  return cached.payload;
}

export function setCachedSearch(cacheKey: string, payload: CoachSearchResponse) {
  searchCache.set(cacheKey, {
    expiresAt: Date.now() + 5 * 60_000,
    payload,
  });
}

export function assertRateLimit(ip: string) {
  const now = Date.now();
  const current = requestCounters.get(ip);

  if (!current || current.resetAt < now) {
    requestCounters.set(ip, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return;
  }

  if (current.count >= 30) {
    throw new Error("RATE_LIMIT_EXCEEDED");
  }

  current.count += 1;
}

export async function parseCoachQuery(query: string): Promise<ParsedCoachQuery | null> {
  if (!process.env.OPENROUTER_API_KEY) {
    return null;
  }

  const model =
    process.env.OPENROUTER_SEARCH_MODEL?.trim() ||
    DEFAULT_OPENROUTER_SEARCH_MODEL;

  let content = "";

  try {
    content = await chatCompletion({
      model,
      responseFormat: "json",
      messages: [
        {
          role: "system",
          content:
            "You parse coach search queries for a global coaching directory. Return JSON only with cert_level, country, city, specializations, language, semantic_query. Use null when a field is not present.",
        },
        {
          role: "user",
          content: query,
        },
      ],
    });
  } catch {
    return null;
  }

  if (!content) {
    return null;
  }

  try {
    const parsed = JSON.parse(content) as ParsedCoachQuery;
    return {
      cert_level: toCertificationLevel(parsed.cert_level),
      country: toOptionalString(parsed.country),
      city: toOptionalString(parsed.city),
      specializations: toOptionalStringArray(parsed.specializations),
      language: toOptionalString(parsed.language),
      semantic_query: toOptionalString(parsed.semantic_query) || query,
    };
  } catch {
    return null;
  }
}

export function mergeCoachSearchResults(
  vectorMatches: CoachRecord[],
  nameMatches: CoachRecord[],
) {
  const merged = new Map<string, CoachRecord>();

  for (const coach of nameMatches) {
    merged.set(coach.id, {
      ...coach,
      similarity: coach.similarity ?? 1,
    });
  }

  for (const coach of vectorMatches) {
    const existing = merged.get(coach.id);

    if (!existing) {
      merged.set(coach.id, coach);
      continue;
    }

    merged.set(coach.id, {
      ...coach,
      similarity: Math.max(existing.similarity ?? 0, coach.similarity ?? 0),
    });
  }

  return [...merged.values()].sort(
    (left, right) => (right.similarity ?? 0) - (left.similarity ?? 0),
  );
}

export async function searchCoachesByName(
  query: string,
  filters: CoachSearchFilters,
  offset = 0,
) {
  const client = createServiceRoleSupabaseClient();

  if (!client) {
    return [] satisfies CoachRecord[];
  }

  let request = client
    .from("coaches")
    .select(
      [
        "id",
        "user_id",
        "chapter_id",
        "name",
        "email",
        "phone",
        "photo_url",
        "cert_level",
        "location_city",
        "location_country",
        "location_lat",
        "location_lng",
        "bio",
        "specializations",
        "languages",
        "website",
        "linkedin",
        "credly_badge_url",
        "approved",
        "created_at",
        "updated_at",
        "last_approved_at",
        "rejection_reason",
        "rejected_at",
      ].join(", "),
    )
    .eq("approved", true)
    .ilike("name", `%${query}%`)
    .order("name", { ascending: true })
    .range(offset, offset + SEARCH_LIMIT - 1);

  if (filters.certLevel) {
    request = request.eq("cert_level", filters.certLevel);
  }

  if (filters.country) {
    request = request.ilike("location_country", `%${filters.country}%`);
  }

  if (filters.city) {
    request = request.ilike("location_city", `%${filters.city}%`);
  }

  if (filters.language) {
    request = request.contains("languages", [filters.language]);
  }

  if (filters.specializations?.length) {
    request = request.overlaps("specializations", filters.specializations);
  }

  const { data } = await request;
  const rows = (data ?? []) as unknown as SearchRow[];

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    chapterId: row.chapter_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    photoUrl: row.photo_url,
    certLevel: row.cert_level,
    locationCity: row.location_city,
    locationCountry: row.location_country,
    locationLat: row.location_lat,
    locationLng: row.location_lng,
    bio: row.bio,
    specializations: row.specializations ?? [],
    languages: row.languages ?? [],
    website: row.website,
    linkedin: row.linkedin,
    credlyBadgeUrl: row.credly_badge_url,
    approved: row.approved,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastApprovedAt: row.last_approved_at,
    rejectionReason: row.rejection_reason,
    rejectedAt: row.rejected_at,
    similarity: 1,
  }));
}

export async function fallbackKeywordSearch(
  query: string,
  filters: CoachSearchFilters,
  offset = 0,
) {
  return searchApprovedCoachesByKeyword({
    query,
    filters,
    offset,
    limit: SEARCH_LIMIT,
  });
}

export async function vectorSearchCoaches(options: {
  query: string;
  filters: CoachSearchFilters;
  offset?: number;
}) {
  const client = createServiceRoleSupabaseClient();

  if (!client || !process.env.COHERE_API_KEY) {
    return [] satisfies CoachRecord[];
  }

  const embedding = await generateEmbedding(options.query, "search_query");
  const vectorLiteral = `[${embedding.join(",")}]`;

  const { data, error } = await client.rpc("search_coaches", {
    query_embedding: vectorLiteral,
    filter_cert_level: options.filters.certLevel ?? null,
    filter_country: options.filters.country ?? null,
    filter_city: options.filters.city ?? null,
    filter_language: options.filters.language ?? null,
    filter_specializations: options.filters.specializations ?? null,
    match_count: SEARCH_LIMIT,
    match_offset: options.offset ?? 0,
  });

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as Array<Record<string, unknown>>;

  return rows.map((row) => ({
    id: String(row.id),
    userId: null,
    chapterId: null,
    name: String(row.name),
    email: typeof row.email === "string" ? row.email : null,
    phone: typeof row.phone === "string" ? row.phone : null,
    photoUrl: typeof row.photo_url === "string" ? row.photo_url : null,
    certLevel: toCertificationLevel(row.cert_level),
    locationCity: typeof row.location_city === "string" ? row.location_city : null,
    locationCountry:
      typeof row.location_country === "string" ? row.location_country : null,
    locationLat:
      typeof row.location_lat === "number" ? row.location_lat : null,
    locationLng:
      typeof row.location_lng === "number" ? row.location_lng : null,
    bio: typeof row.bio === "string" ? row.bio : null,
    specializations: Array.isArray(row.specializations)
      ? row.specializations.map(String)
      : [],
    languages: Array.isArray(row.languages) ? row.languages.map(String) : [],
    website: typeof row.website === "string" ? row.website : null,
    linkedin: typeof row.linkedin === "string" ? row.linkedin : null,
    credlyBadgeUrl:
      typeof row.credly_badge_url === "string" ? row.credly_badge_url : null,
    approved: true,
    createdAt: typeof row.created_at === "string" ? row.created_at : "",
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : "",
    lastApprovedAt:
      typeof row.last_approved_at === "string" ? row.last_approved_at : null,
    rejectionReason: null,
    rejectedAt: null,
    similarity:
      typeof row.similarity === "number" ? row.similarity : Number(row.similarity ?? 0),
  }));
}
