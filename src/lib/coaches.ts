import { cache } from "react";
import coachSeedSource from "../../data/coaches-seed.json";
import {
  formatCoachLocation,
  getCertificationBadgeTone,
  getCoachInitials,
} from "@/lib/coach-presenters";
import { createServiceRoleSupabaseClient } from "@/lib/supabase-admin";
import { createSupabaseContentClient } from "@/lib/supabase";
import type {
  CertificationLevel,
  CoachFacetOptions,
  CoachRecord,
  CoachSearchFilters,
} from "@/lib/types";

const coachSeedRecords = coachSeedSource as CoachRecord[];

const coachColumns = [
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
  "credly_badge_image_url",
  "credly_badge_title",
  "credly_badge_synced_at",
  "approved",
  "created_at",
  "updated_at",
  "last_approved_at",
  "rejection_reason",
  "rejected_at",
].join(", ");

type CoachDbRow = {
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
  credly_badge_image_url: string | null;
  credly_badge_title: string | null;
  credly_badge_synced_at: string | null;
  approved: boolean;
  created_at: string;
  updated_at: string;
  last_approved_at: string | null;
  rejection_reason: string | null;
  rejected_at: string | null;
  similarity?: number | null;
};

type CoachListOptions = {
  limit?: number;
  offset?: number;
  filters?: CoachSearchFilters;
  nameQuery?: string | null;
  chapterId?: string | null;
};

type KeywordSearchOptions = {
  query: string;
  filters?: CoachSearchFilters;
  limit?: number;
  offset?: number;
};

type CoachFilterQuery = {
  eq(column: string, value: string | boolean | null): CoachFilterQuery;
  ilike(column: string, pattern: string): CoachFilterQuery;
  contains(column: string, value: string[]): CoachFilterQuery;
  overlaps(column: string, value: string[]): CoachFilterQuery;
};

const COACH_SEARCH_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "any",
  "around",
  "coach",
  "coaches",
  "consulting",
  "expert",
  "expertise",
  "for",
  "i",
  "in",
  "is",
  "me",
  "my",
  "near",
  "need",
  "of",
  "on",
  "or",
  "the",
  "who",
  "with",
]);

function toArray(value: string[] | null | undefined) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function toText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function extractSearchTerms(query: string) {
  const terms = normalizeSearchText(query)
    .split(/[^\p{L}\p{N}]+/u)
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value) => value.length > 1)
    .filter((value) => !COACH_SEARCH_STOP_WORDS.has(value));

  return [...new Set(terms)];
}

function mapCoachRecord(row: CoachDbRow): CoachRecord {
  return {
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
    specializations: toArray(row.specializations),
    languages: toArray(row.languages),
    website: row.website,
    linkedin: row.linkedin,
    credlyBadgeUrl: row.credly_badge_url,
    credlyBadgeImageUrl: row.credly_badge_image_url,
    credlyBadgeTitle: row.credly_badge_title,
    credlyBadgeSyncedAt: row.credly_badge_synced_at,
    approved: row.approved,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastApprovedAt: row.last_approved_at,
    rejectionReason: row.rejection_reason,
    rejectedAt: row.rejected_at,
    ...(typeof row.similarity === "number"
      ? { similarity: Number(row.similarity) }
      : {}),
  };
}

function applyCoachFilters<T extends CoachFilterQuery>(
  query: T,
  filters: CoachSearchFilters = {},
) {
  if (filters.certLevel) {
    query.eq("cert_level", filters.certLevel);
  }

  if (filters.country) {
    query.ilike("location_country", `%${filters.country}%`);
  }

  if (filters.city) {
    query.ilike("location_city", `%${filters.city}%`);
  }

  if (filters.language) {
    query.contains("languages", [filters.language]);
  }

  if (filters.specializations?.length) {
    query.overlaps("specializations", filters.specializations);
  }

  return query;
}

function matchesSeedFilters(coach: CoachRecord, filters: CoachSearchFilters = {}) {
  if (filters.certLevel && coach.certLevel !== filters.certLevel) {
    return false;
  }

  if (
    filters.country &&
    !coach.locationCountry?.toLowerCase().includes(filters.country.toLowerCase())
  ) {
    return false;
  }

  if (
    filters.city &&
    !coach.locationCity?.toLowerCase().includes(filters.city.toLowerCase())
  ) {
    return false;
  }

  if (
    filters.language &&
    !coach.languages.some(
      (language) => language.toLowerCase() === filters.language?.toLowerCase(),
    )
  ) {
    return false;
  }

  if (
    filters.specializations?.length &&
    !filters.specializations.some((specialization) =>
      coach.specializations.some(
        (value) => value.toLowerCase() === specialization.toLowerCase(),
      ),
    )
  ) {
    return false;
  }

  return true;
}

function fallbackApprovedCoaches({
  filters = {},
  limit = 20,
  offset = 0,
  nameQuery = null,
  chapterId = null,
}: CoachListOptions = {}) {
  const loweredQuery = nameQuery?.trim().toLowerCase() ?? "";

  return coachSeedRecords
    .filter((coach) => coach.approved)
    .filter((coach) => (chapterId ? coach.chapterId === chapterId : true))
    .filter((coach) => matchesSeedFilters(coach, filters))
    .filter((coach) =>
      loweredQuery ? coach.name.toLowerCase().includes(loweredQuery) : true,
    )
    .sort((left, right) => left.name.localeCompare(right.name))
    .slice(offset, offset + limit);
}

function buildCoachKeywordHaystack(coach: CoachRecord) {
  return normalizeSearchText(
    [
      coach.name,
      coach.certLevel ?? "",
      coach.locationCity ?? "",
      coach.locationCountry ?? "",
      coach.bio ?? "",
    coach.specializations.join(" "),
      coach.languages.join(" "),
      coach.website ?? "",
      coach.linkedin ?? "",
    ].join(" "),
  );
}

function getKeywordSimilarity(
  coach: CoachRecord,
  normalizedQuery: string,
  searchTerms: string[],
) {
  const haystack = buildCoachKeywordHaystack(coach);
  const name = normalizeSearchText(coach.name);
  const location = [coach.locationCity, coach.locationCountry]
    .filter(Boolean)
    .join(" ")
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
  const matchedTermCount = searchTerms.filter((term) => haystack.includes(term)).length;
  const coverage = searchTerms.length ? matchedTermCount / searchTerms.length : 0;

  if (name === normalizedQuery) {
    return 0.99;
  }

  if (name.includes(normalizedQuery)) {
    return 0.94;
  }

  if (coach.specializations.some((value) => value.toLowerCase().includes(normalizedQuery))) {
    return 0.88;
  }

  if (location.includes(normalizedQuery)) {
    return 0.82;
  }

  if ((coach.bio ?? "").toLowerCase().includes(normalizedQuery)) {
    return 0.76;
  }

  if (coverage > 0) {
    return Math.min(0.9, 0.58 + coverage * 0.28);
  }

  return 0.68;
}

export const listApprovedCoaches = cache(
  async ({
    filters = {},
    limit = 20,
    offset = 0,
    nameQuery = null,
    chapterId = null,
  }: CoachListOptions = {}) => {
    const client = createSupabaseContentClient();

    if (client) {
      try {
        let query = client
          .from("coaches")
          .select(coachColumns)
          .eq("approved", true)
          .order("name", { ascending: true })
          .range(offset, offset + limit - 1);

        if (chapterId) {
          query = query.eq("chapter_id", chapterId);
        }

        query = applyCoachFilters(query, filters);

        if (nameQuery) {
          query.ilike("name", `%${nameQuery}%`);
        }

        const { data } = await query;

        if (data) {
          return (data as unknown as CoachDbRow[]).map((row) =>
            mapCoachRecord(row),
          );
        }
      } catch {
        // fall through to local seed records
      }
    }

    return fallbackApprovedCoaches({ filters, limit, offset, nameQuery, chapterId });
  },
);

export const listApprovedCoachIds = cache(async () => {
  const client = createSupabaseContentClient();

  if (client) {
    try {
      const { data } = await client
        .from("coaches")
        .select("id")
        .eq("approved", true)
        .order("name", { ascending: true })
        .limit(200);

      if (data) {
        return data.map((row) => row.id);
      }
    } catch {
      // fall back to static seed records
    }
  }

  return coachSeedRecords.filter((coach) => coach.approved).map((coach) => coach.id);
});

export async function searchApprovedCoachesByKeyword({
  query,
  filters = {},
  limit = 20,
  offset = 0,
}: KeywordSearchOptions) {
  const normalizedQuery = normalizeSearchText(query.trim());
  const searchTerms = extractSearchTerms(query);

  if (!normalizedQuery) {
    return [] satisfies CoachRecord[];
  }

  const dbBackedCoaches = await listApprovedCoaches({
    filters,
    limit: 200,
    offset: 0,
  });

  const source =
    dbBackedCoaches.length > 0
      ? dbBackedCoaches
      : fallbackApprovedCoaches({
          filters,
          limit: coachSeedRecords.length,
          offset: 0,
        });

  return source
    .filter((coach) => {
      const haystack = buildCoachKeywordHaystack(coach);

      if (haystack.includes(normalizedQuery)) {
        return true;
      }

      if (!searchTerms.length) {
        return false;
      }

      return searchTerms.some((term) => haystack.includes(term));
    })
    .map((coach) => ({
      ...coach,
      similarity: getKeywordSimilarity(coach, normalizedQuery, searchTerms),
    }))
    .sort((left, right) => (right.similarity ?? 0) - (left.similarity ?? 0))
    .slice(offset, offset + limit);
}

export const getCoachFacetOptions = cache(async (): Promise<CoachFacetOptions> => {
  const client = createSupabaseContentClient();

  if (client) {
    try {
      const { data } = await client
        .from("coaches")
        .select("location_country, languages")
        .eq("approved", true)
        .order("location_country", { ascending: true })
        .limit(1000);

      if (data) {
        const countries = new Set<string>();
        const languages = new Set<string>();

        for (const row of data) {
          const country = toText(row.location_country);

          if (country) {
            countries.add(country);
          }

          for (const language of toArray(row.languages)) {
            languages.add(language);
          }
        }

        return {
          countries: [...countries].sort((left, right) => left.localeCompare(right)),
          languages: [...languages].sort((left, right) => left.localeCompare(right)),
        };
      }
    } catch {
      // fall through to seed facets
    }
  }

  const countries = new Set<string>();
  const languages = new Set<string>();

  for (const coach of coachSeedRecords) {
    if (!coach.approved) {
      continue;
    }

    if (coach.locationCountry) {
      countries.add(coach.locationCountry);
    }

    for (const language of coach.languages) {
      languages.add(language);
    }
  }

  return {
    countries: [...countries].sort((left, right) => left.localeCompare(right)),
    languages: [...languages].sort((left, right) => left.localeCompare(right)),
  };
});

export async function getApprovedCoachById(id: string) {
  const client = createSupabaseContentClient();

  if (client) {
    try {
      const { data } = await client
        .from("coaches")
        .select(coachColumns)
        .eq("id", id)
        .eq("approved", true)
        .maybeSingle();

      if (data) {
        return mapCoachRecord(data as unknown as CoachDbRow);
      }
    } catch {
      // fall through to seed fallback
    }
  }

  return (
    coachSeedRecords.find((coach) => coach.id === id && coach.approved) ?? null
  );
}

export async function getCoachByIdForAdmin(id: string) {
  const client = createServiceRoleSupabaseClient();

  if (!client) {
    return null;
  }

  const { data } = await client
    .from("coaches")
    .select(coachColumns)
    .eq("id", id)
    .maybeSingle();

  return data ? mapCoachRecord(data as unknown as CoachDbRow) : null;
}

export async function getCoachByUserId(userId: string) {
  const client = createServiceRoleSupabaseClient();

  if (!client) {
    return null;
  }

  const { data } = await client
    .from("coaches")
    .select(coachColumns)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ? mapCoachRecord(data as unknown as CoachDbRow) : null;
}

export async function getClaimableCoachByEmail(email: string) {
  const client = createServiceRoleSupabaseClient();

  if (!client) {
    return null;
  }

  const { data } = await client
    .from("coaches")
    .select(coachColumns)
    .is("user_id", null)
    .ilike("email", email)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ? mapCoachRecord(data as unknown as CoachDbRow) : null;
}

export async function listPendingCoaches(options: {
  chapterId?: string | null;
  limit?: number;
}) {
  const client = createServiceRoleSupabaseClient();

  if (!client) {
    return [];
  }

  let query = client
    .from("coaches")
    .select(coachColumns)
    .eq("approved", false)
    .order("updated_at", { ascending: false })
    .limit(options.limit ?? 50);

  if (options.chapterId) {
    query = query.eq("chapter_id", options.chapterId);
  }

  const { data } = await query;

  return ((data ?? []) as unknown as CoachDbRow[]).map((row) =>
    mapCoachRecord(row),
  );
}

export function buildCoachEmbeddingText(coach: Pick<
  CoachRecord,
  | "name"
  | "certLevel"
  | "locationCity"
  | "locationCountry"
  | "specializations"
  | "languages"
  | "bio"
>) {
  return [
    coach.name,
    coach.certLevel,
    [coach.locationCity, coach.locationCountry].filter(Boolean).join(", "),
    coach.specializations.join(", "),
    coach.languages.join(", "),
    coach.bio ?? "",
  ]
    .filter(Boolean)
    .join(" | ");
}

export { formatCoachLocation, getCertificationBadgeTone, getCoachInitials };
