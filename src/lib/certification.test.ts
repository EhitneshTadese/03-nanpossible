import { describe, expect, it } from "vitest";
import {
  getCertificationHubContent,
  getCertificationLmsUrl,
  getTrackDocuments,
} from "@/lib/certification";

describe("certification hub data", () => {
  it("exposes all four certification tracks", () => {
    const content = getCertificationHubContent();

    expect(content.tracks.map((track) => track.level)).toEqual([
      "CALC",
      "PALC",
      "SALC",
      "MALC",
    ]);
  });

  it("provides mirrored application downloads for every level", () => {
    expect(getTrackDocuments("calc").application?.href).toBe(
      "/downloads/certification/calc-application.doc",
    );
    expect(getTrackDocuments("palc").application?.href).toBe(
      "/downloads/certification/palc-application.doc",
    );
    expect(getTrackDocuments("salc").application?.href).toBe(
      "/downloads/certification/salc-application.doc",
    );
    expect(getTrackDocuments("malc").application?.href).toBe(
      "/downloads/certification/malc-application.doc",
    );
  });

  it("falls back to the global LMS URL when a level-specific URL is not configured", () => {
    process.env.NEXT_PUBLIC_WIAL_LMS_URL = "https://wialportal.org/";
    delete process.env.NEXT_PUBLIC_WIAL_LMS_SALC_URL;

    expect(getCertificationLmsUrl("SALC")).toBe("https://wialportal.org/");
  });
});

