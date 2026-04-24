import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  buildPublishUpdatePayload: vi.fn(),
  canEditChapter: vi.fn(),
  createServiceRoleSupabaseClient: vi.fn(),
  getChapterById: vi.fn(),
  getContentPageByIdForAdmin: vi.fn(),
  getCurrentUser: vi.fn(),
  listChapterPages: vi.fn(),
  parseBuilderChromeDraftState: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/lib/auth", () => ({
  canEditChapter: mocks.canEditChapter,
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/content", () => ({
  getContentPageByIdForAdmin: mocks.getContentPageByIdForAdmin,
  listChapterPages: mocks.listChapterPages,
}));

vi.mock("@/lib/content-page-editor", () => ({
  buildPublishUpdatePayload: mocks.buildPublishUpdatePayload,
  parseBuilderChromeDraftState: mocks.parseBuilderChromeDraftState,
}));

vi.mock("@/lib/supabase-admin", () => ({
  createServiceRoleSupabaseClient: mocks.createServiceRoleSupabaseClient,
}));

vi.mock("@/lib/tenant", () => ({
  getChapterById: mocks.getChapterById,
}));

import { POST } from "./route";

describe("POST /api/content/update", () => {
  beforeEach(() => {
    mocks.buildPublishUpdatePayload.mockReset();
    mocks.canEditChapter.mockReset();
    mocks.createServiceRoleSupabaseClient.mockReset();
    mocks.getChapterById.mockReset();
    mocks.getContentPageByIdForAdmin.mockReset();
    mocks.getCurrentUser.mockReset();
    mocks.listChapterPages.mockReset();
    mocks.parseBuilderChromeDraftState.mockReset();
    mocks.revalidatePath.mockReset();

    mocks.getCurrentUser.mockResolvedValue({ id: "viewer-1" });
    mocks.canEditChapter.mockReturnValue(true);
    mocks.getContentPageByIdForAdmin.mockResolvedValue({
      id: "page-1",
      chapterId: "chapter-1",
      hasPublishedBuilderSnapshot: false,
    });
    mocks.getChapterById.mockResolvedValue({
      id: "chapter-1",
      name: "Mexico",
      subdomain: "mexico",
      config: {},
    });
    mocks.parseBuilderChromeDraftState.mockReturnValue({
      schemaVersion: 1,
      draft: {
        schemaVersion: 1,
        brandHref: "/",
        brandLabel: "Mexico",
        navigationItems: [{ href: "/", label: "Home" }],
        footerLegal: "Mexico chapter site",
        header: {
          minHeight: 132,
          background: {
            tone: "canvas",
            color: "linear-gradient(180deg, rgba(255,252,248,0.98), rgba(251,247,242,0.92))",
            accent: "rgba(22,63,61,0.08)",
          },
          nodes: [],
        },
        footer: {
          minHeight: 240,
          background: {
            tone: "warm",
            color: "linear-gradient(135deg, rgba(255,245,233,0.98), rgba(255,250,244,0.92))",
            accent: "rgba(180,83,9,0.12)",
          },
          nodes: [],
        },
      },
      published: null,
    });
  });

  it("publishes builder pages with a live builder snapshot and returns live-source status", async () => {
    const contentUpdateEq = vi.fn().mockResolvedValue({ error: null });
    const chapterUpdateEq = vi.fn().mockResolvedValue({ error: null });
    const contentUpdate = vi.fn(() => ({ eq: contentUpdateEq }));
    const chapterUpdate = vi.fn(() => ({ eq: chapterUpdateEq }));
    const from = vi.fn((table: string) =>
      table === "content_pages" ? { update: contentUpdate } : { update: chapterUpdate },
    );

    mocks.createServiceRoleSupabaseClient.mockReturnValue({ from });
    mocks.buildPublishUpdatePayload.mockReturnValue({
      body_json: {
        editorKind: "builder",
        schemaVersion: 2,
        draft: { schemaVersion: 2, title: "About Mexico" },
        published: { schemaVersion: 2, title: "About Mexico" },
      },
      body_html: '<main data-builder-surface="page"></main>',
      published: true,
    });
    mocks.listChapterPages.mockResolvedValue([
      { slug: "about" },
      { slug: "team" },
    ]);

    const response = await POST(
      new Request("http://localhost/api/content/update", {
        method: "POST",
        body: JSON.stringify({
          editor_kind: "builder",
          page_id: "page-1",
          body_json: {
            editorKind: "builder",
          },
          builder_chrome: {
            schemaVersion: 1,
          },
          published: true,
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      hasPublishedBuilderSnapshot: true,
      liveRenderSource: "builder",
      success: true,
    });
    expect(contentUpdate).toHaveBeenCalledTimes(1);
    expect(chapterUpdate).toHaveBeenCalledTimes(1);
    expect(chapterUpdate).toHaveBeenCalledWith({
      config: expect.objectContaining({
        builderChrome: expect.objectContaining({
          published: expect.objectContaining({
            schemaVersion: 1,
          }),
        }),
      }),
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/sites/mexico");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/sites/mexico/about");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/sites/mexico/team");
  });

  it("rejects builder publishes when no published snapshot would be persisted", async () => {
    const from = vi.fn();

    mocks.createServiceRoleSupabaseClient.mockReturnValue({ from });
    mocks.buildPublishUpdatePayload.mockReturnValue({
      body_json: {
        editorKind: "builder",
        schemaVersion: 2,
        draft: { schemaVersion: 2, title: "About Mexico" },
        published: null,
      },
      body_html: '<main data-builder-surface="page"></main>',
      published: true,
    });

    const response = await POST(
      new Request("http://localhost/api/content/update", {
        method: "POST",
        body: JSON.stringify({
          editor_kind: "builder",
          page_id: "page-1",
          body_json: {
            editorKind: "builder",
          },
          builder_chrome: {
            schemaVersion: 1,
          },
          published: true,
        }),
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "invalid-builder-publish-state",
    });
    expect(from).not.toHaveBeenCalled();
  });

  it("returns a 400 when builder payload parsing fails", async () => {
    const from = vi.fn();

    mocks.createServiceRoleSupabaseClient.mockReturnValue({ from });
    mocks.buildPublishUpdatePayload.mockImplementation(() => {
      throw new Error("invalid-builder-state");
    });

    const response = await POST(
      new Request("http://localhost/api/content/update", {
        method: "POST",
        body: JSON.stringify({
          editor_kind: "builder",
          page_id: "page-1",
          body_json: {
            editorKind: "builder",
          },
          builder_chrome: {
            schemaVersion: 1,
          },
          published: false,
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "invalid-update-payload",
    });
    expect(from).not.toHaveBeenCalled();
  });
});
