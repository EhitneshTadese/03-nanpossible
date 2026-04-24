import { describe, expect, it } from "vitest";
import { createInitialBuilderPageState } from "./builder-page";
import { getContentPage, normalizeContentPageRecord } from "./content";

describe("getContentPage", () => {
  it("returns the global page when no tenant override exists", async () => {
    const page = await getContentPage({ slug: "about" });

    expect(page?.title).toBe("About WIAL");
  });

  it("prefers chapter overrides before falling back to global content", async () => {
    const page = await getContentPage({
      slug: "contact",
      chapterId: "22222222-2222-4222-8222-222222222222",
      tenantSubdomain: "usa",
    });

    expect(page?.title).toBe("Contact WIAL USA");
  });

  it("keeps mixed-state builder pages on legacy live output until a snapshot exists", () => {
    const state = createInitialBuilderPageState({
      pageTitle: "About Mexico",
      chapterName: "Mexico",
    });

    const page = normalizeContentPageRecord({
      id: "page-1",
      chapterId: "chapter-1",
      slug: "about",
      title: "About Mexico",
      isGlobal: false,
      language: "en",
      sortOrder: 10,
      published: true,
      aiGenerated: false,
      body_json: state,
      body_html: "<p>Legacy html</p>",
      body_richtext: null,
      seo: null,
      audio_url: null,
      audio_duration_seconds: null,
      audio_generated_at: null,
    });

    expect(page.editorKind).toBe("builder");
    expect(page.publishedEditorKind).toBe("legacy");
    expect(page.hasPublishedBuilderSnapshot).toBe(false);
    expect(page.liveRenderSource).toBe("legacy");
  });

  it("marks published builder snapshot pages as builder live output", () => {
    const state = createInitialBuilderPageState({
      pageTitle: "Team",
      chapterName: "Mexico",
    });
    state.published = state.draft;

    const page = normalizeContentPageRecord({
      id: "page-2",
      chapterId: "chapter-1",
      slug: "team",
      title: "Team",
      isGlobal: false,
      language: "en",
      sortOrder: 20,
      published: true,
      aiGenerated: false,
      body_json: state,
      body_html: "<main>semantic</main>",
      body_richtext: null,
      seo: null,
      audio_url: null,
      audio_duration_seconds: null,
      audio_generated_at: null,
    });

    expect(page.publishedEditorKind).toBe("builder");
    expect(page.hasPublishedBuilderSnapshot).toBe(true);
    expect(page.liveRenderSource).toBe("builder");
  });
});
