import { describe, expect, it } from "vitest";
import {
  buildSearchCacheKey,
  isComplexCoachQuery,
  mergeCoachSearchResults,
} from "@/lib/coach-search";
import type { CoachRecord } from "@/lib/types";

const baseCoach: CoachRecord = {
  id: "coach-1",
  userId: null,
  chapterId: null,
  name: "Maria Santos",
  email: "maria@wial.org",
  phone: null,
  phoneCountryCode: null,
  photoUrl: null,
  certLevel: "SALC",
  locationCity: "Sao Paulo",
  locationCountry: "Brazil",
  locationLat: null,
  locationLng: null,
  bio: "Government leadership specialist",
  specializations: ["government"],
  languages: ["pt", "en"],
  website: null,
  linkedin: null,
  credlyBadgeUrl: null,
  approved: true,
  createdAt: "2026-03-01T00:00:00.000Z",
  updatedAt: "2026-03-01T00:00:00.000Z",
  lastApprovedAt: "2026-03-01T00:00:00.000Z",
  rejectionReason: null,
  rejectedAt: null,
};

describe("coach search helpers", () => {
  it("flags longer natural-language searches as complex", () => {
    expect(isComplexCoachQuery("Maria Santos")).toBe(false);
    expect(
      isComplexCoachQuery("I need a SALC near Sao Paulo who works with government agencies"),
    ).toBe(true);
  });

  it("builds stable cache keys for normalized filters", () => {
    expect(
      buildSearchCacheKey(" Maria Santos ", {
        certLevel: "SALC",
        country: " Brazil ",
        language: "pt",
      }),
    ).toBe(
      buildSearchCacheKey("maria santos", {
        certLevel: "SALC",
        country: "brazil",
        language: "pt",
      }),
    );
  });

  it("merges exact-name and semantic results without duplicates", () => {
    const merged = mergeCoachSearchResults(
      [{ ...baseCoach, similarity: 0.88 }],
      [{ ...baseCoach, similarity: 1 }],
    );

    expect(merged).toHaveLength(1);
    expect(merged[0]?.similarity).toBe(1);
  });
});
