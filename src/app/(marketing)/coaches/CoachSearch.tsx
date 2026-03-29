"use client";

import { useEffect, useState, useTransition } from "react";
import { CoachGrid } from "./CoachGrid";
import type {
  CoachFacetOptions,
  CoachRecord,
  CoachSearchFilters,
  CoachSearchMode,
  ParsedCoachQuery,
} from "@/lib/types";

type CoachSearchProps = {
  initialCoaches: CoachRecord[];
  facets: CoachFacetOptions;
};

type SearchPayload = {
  coaches: CoachRecord[];
  parsedQuery: ParsedCoachQuery | null;
  mode: CoachSearchMode;
  total: number;
  nextOffset: number | null;
};

async function requestCoachSearch(
  query: string,
  filters: CoachSearchFilters,
  offset: number,
) {
  const response = await fetch("/api/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      filters,
      offset,
    }),
  });

  const payload = (await response.json()) as SearchPayload & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "Search failed");
  }

  return payload;
}

function SearchSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          className="site-panel animate-pulse rounded-[2rem] p-5"
          key={index}
        >
          <div className="flex gap-4">
            <div className="h-24 w-24 rounded-[1.6rem] bg-teal-deep/10" />
            <div className="flex-1 space-y-3">
              <div className="h-5 w-2/3 rounded-full bg-teal-deep/10" />
              <div className="h-3 w-1/3 rounded-full bg-teal-deep/10" />
              <div className="h-3 w-full rounded-full bg-teal-deep/10" />
              <div className="h-3 w-5/6 rounded-full bg-teal-deep/10" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function hasFilters(filters: CoachSearchFilters) {
  return Boolean(
    filters.certLevel ||
      filters.country ||
      filters.language,
  );
}

export function CoachSearch({ initialCoaches, facets }: CoachSearchProps) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<CoachSearchFilters>({
    certLevel: null,
    country: null,
    language: null,
  });
  const [results, setResults] = useState(initialCoaches);
  const [parsedQuery, setParsedQuery] = useState<ParsedCoachQuery | null>(null);
  const [mode, setMode] = useState<CoachSearchMode>("filters");
  const [nextOffset, setNextOffset] = useState<number | null>(
    initialCoaches.length >= 20 ? initialCoaches.length : null,
  );
  const [total, setTotal] = useState(initialCoaches.length);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isIdle = !query.trim() && !hasFilters(filters);

  useEffect(() => {
    if (isIdle) {
      return;
    }

    const timer = window.setTimeout(() => {
      startTransition(async () => {
        try {
          setError(null);
          const payload = await requestCoachSearch(query, filters, 0);
          setParsedQuery(payload.parsedQuery ?? null);
          setMode(payload.mode);
          setTotal(payload.total);
          setNextOffset(payload.nextOffset);
          setResults(payload.coaches);
        } catch (caughtError) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "WIAL could not search coaches right now.",
          );
        }
      });
    }, 500);

    return () => window.clearTimeout(timer);
  }, [filters, isIdle, query]);

  const displayResults = isIdle ? initialCoaches : results;
  const displayParsedQuery = isIdle ? null : parsedQuery;
  const displayMode = isIdle ? "filters" : mode;
  const displayTotal = isIdle ? initialCoaches.length : total;
  const displayNextOffset = isIdle
    ? initialCoaches.length >= 20
      ? initialCoaches.length
      : null
    : nextOffset;
  const showAiBadge =
    Boolean(query.trim()) &&
    (displayMode === "semantic" || displayMode === "hybrid");

  return (
    <div className="space-y-5">
      <section className="site-panel rounded-[2rem] p-6 md:p-8">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,180px))]">
          <label className="field-shell">
            <span className="field-label">Search</span>
            <input
              className="field-input"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search coaches in any language... e.g. 'team dynamics in manufacturing' or 'SALC near São Paulo'"
              type="search"
              value={query}
            />
          </label>

          <label className="field-shell">
            <span className="field-label">Certification</span>
            <select
              className="field-input"
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  certLevel: event.target.value
                    ? (event.target.value as CoachSearchFilters["certLevel"])
                    : null,
                }))
              }
              value={filters.certLevel ?? ""}
            >
              <option value="">All</option>
              <option value="CALC">CALC</option>
              <option value="PALC">PALC</option>
              <option value="SALC">SALC</option>
              <option value="MALC">MALC</option>
            </select>
          </label>

          <label className="field-shell">
            <span className="field-label">Country</span>
            <select
              className="field-input"
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  country: event.target.value || null,
                }))
              }
              value={filters.country ?? ""}
            >
              <option value="">All</option>
              {facets.countries.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </label>

          <label className="field-shell">
            <span className="field-label">Language</span>
            <select
              className="field-input"
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  language: event.target.value || null,
                }))
              }
              value={filters.language ?? ""}
            >
              <option value="">All</option>
              {facets.languages.map((language) => (
                <option key={language} value={language}>
                  {language.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <span className="coach-result-chip">
            {displayTotal} {displayTotal === 1 ? "coach" : "coaches"}
          </span>
          {showAiBadge ? (
            <span className="coach-result-chip is-ai">Powered by AI</span>
          ) : null}
          {showAiBadge && displayParsedQuery?.semantic_query ? (
            <span className="coach-result-chip">
              Semantic focus: {displayParsedQuery.semantic_query}
            </span>
          ) : null}
          {error ? (
            <span className="coach-result-chip is-error">{error}</span>
          ) : null}
        </div>
      </section>

      {isPending && !displayResults.length ? <SearchSkeleton /> : null}

      {displayResults.length ? (
        <CoachGrid coaches={displayResults} />
      ) : !isPending ? (
        <CoachGrid coaches={[]} />
      ) : null}

      {displayNextOffset != null ? (
        <div className="flex justify-center pt-2">
          <button
            className="button-link secondary"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                try {
                  setError(null);
                  const payload = await requestCoachSearch(
                    query,
                    filters,
                    displayNextOffset,
                  );
                  setParsedQuery(payload.parsedQuery ?? null);
                  setMode(payload.mode);
                  setTotal(payload.total);
                  setNextOffset(payload.nextOffset);
                  setResults((current) => [...current, ...payload.coaches]);
                } catch (caughtError) {
                  setError(
                    caughtError instanceof Error
                      ? caughtError.message
                      : "WIAL could not load more coaches.",
                  );
                }
              })
            }
            type="button"
          >
            {isPending ? "Loading..." : "Load more coaches"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
