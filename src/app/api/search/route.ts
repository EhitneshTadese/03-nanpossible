import { NextResponse } from "next/server";
import {
  assertRateLimit,
  buildSearchCacheKey,
  fallbackKeywordSearch,
  getCachedSearch,
  isComplexCoachQuery,
  mergeCoachSearchResults,
  parseCoachQuery,
  searchCoachesByName,
  setCachedSearch,
  vectorSearchCoaches,
} from "@/lib/coach-search";
import { listApprovedCoaches } from "@/lib/coaches";
import type {
  CoachSearchFilters,
  CoachSearchResponse,
  ParsedCoachQuery,
} from "@/lib/types";

type SearchRequestBody = {
  query?: string;
  filters?: {
    certLevel?: string | null;
    country?: string | null;
    city?: string | null;
    language?: string | null;
    specializations?: string[] | null;
  };
  offset?: number;
};

function getIpAddress(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}

function normalizeFilters(
  filters: SearchRequestBody["filters"],
): CoachSearchFilters {
  return {
    certLevel:
      filters?.certLevel === "CALC" ||
      filters?.certLevel === "PALC" ||
      filters?.certLevel === "SALC" ||
      filters?.certLevel === "MALC"
        ? filters.certLevel
        : null,
    country: filters?.country?.trim() || null,
    city: filters?.city?.trim() || null,
    language: filters?.language?.trim() || null,
    specializations:
      filters?.specializations?.filter(Boolean).map((value) => value.trim()) ??
      null,
  };
}

function mergeParsedFilters(
  filters: CoachSearchFilters,
  parsedQuery: ParsedCoachQuery | null,
): CoachSearchFilters {
  return {
    certLevel: filters.certLevel ?? parsedQuery?.cert_level ?? null,
    country: filters.country ?? parsedQuery?.country ?? null,
    city: filters.city ?? parsedQuery?.city ?? null,
    language: filters.language ?? parsedQuery?.language ?? null,
    specializations:
      filters.specializations?.length
        ? filters.specializations
        : parsedQuery?.specializations ?? null,
  };
}

export async function POST(request: Request) {
  try {
    assertRateLimit(getIpAddress(request));
  } catch {
    return NextResponse.json(
      {
        error: "Rate limit exceeded. Try again in a minute.",
      },
      { status: 429 },
    );
  }

  const body = (await request.json()) as SearchRequestBody;
  const query = body.query?.trim() ?? "";
  const offset = Math.max(0, body.offset ?? 0);
  const filters = normalizeFilters(body.filters);
  const cacheKey = buildSearchCacheKey(query, filters, offset);
  const cached = getCachedSearch(cacheKey);

  if (cached) {
    return NextResponse.json(cached);
  }

  if (!query) {
    const coaches = await listApprovedCoaches({
      filters,
      limit: 20,
      offset,
    });

    const payload: CoachSearchResponse = {
      coaches,
      parsedQuery: null,
      mode: "filters",
      total: coaches.length,
      nextOffset: coaches.length === 20 ? offset + 20 : null,
    };

    setCachedSearch(cacheKey, payload);
    return NextResponse.json(payload);
  }

  let parsedQuery: ParsedCoachQuery | null = null;
  let activeFilters = filters;

  if (isComplexCoachQuery(query)) {
    try {
      parsedQuery = await parseCoachQuery(query);
    } catch {
      parsedQuery = null;
    }
    activeFilters = mergeParsedFilters(filters, parsedQuery);
  }

  try {
    const semanticQuery = parsedQuery?.semantic_query || query;
    const [vectorMatches, nameMatches, keywordMatches] = await Promise.all([
      vectorSearchCoaches({
        query: semanticQuery,
        filters: activeFilters,
        offset,
      }),
      searchCoachesByName(query, activeFilters, offset),
      fallbackKeywordSearch(semanticQuery, activeFilters, offset),
    ]);

    const coaches = mergeCoachSearchResults(
      vectorMatches,
      mergeCoachSearchResults(nameMatches, keywordMatches),
    ).slice(0, 20);
    const payload: CoachSearchResponse = {
      coaches,
      parsedQuery,
      mode:
        vectorMatches.length && (nameMatches.length || keywordMatches.length)
          ? "hybrid"
          : vectorMatches.length
            ? "semantic"
            : "name_fallback",
      total: coaches.length,
      nextOffset: coaches.length === 20 ? offset + 20 : null,
    };

    setCachedSearch(cacheKey, payload);
    return NextResponse.json(payload);
  } catch {
    const coaches = await fallbackKeywordSearch(
      parsedQuery?.semantic_query || query,
      activeFilters,
      offset,
    );

    const payload: CoachSearchResponse = {
      coaches,
      parsedQuery,
      mode: "name_fallback",
      total: coaches.length,
      nextOffset: coaches.length === 20 ? offset + 20 : null,
    };

    setCachedSearch(cacheKey, payload);
    return NextResponse.json(payload);
  }
}
