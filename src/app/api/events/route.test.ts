import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  canEditChapter: vi.fn(),
  createServiceRoleSupabaseClient: vi.fn(),
  getChapterById: vi.fn(),
  getCurrentUser: vi.fn(),
  getEventByIdForAdmin: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/lib/auth", () => ({
  canEditChapter: mocks.canEditChapter,
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/events", () => ({
  getEventByIdForAdmin: mocks.getEventByIdForAdmin,
}));

vi.mock("@/lib/supabase-admin", () => ({
  createServiceRoleSupabaseClient: mocks.createServiceRoleSupabaseClient,
}));

vi.mock("@/lib/tenant", () => ({
  getChapterById: mocks.getChapterById,
}));

import { DELETE, POST } from "./route";

function buildSupabaseMock() {
  const updateChain = {
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: "event-1" }, error: null }),
  };
  const insertChain = {
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: "event-1" }, error: null }),
  };
  const deleteChain = {
    eq: vi.fn().mockReturnThis(),
    then: undefined,
  };
  // delete().eq().eq() resolves; mock the terminal eq to resolve
  const deleteEqOuter = vi.fn(() => Promise.resolve({ error: null }));
  const deleteEqInner = vi.fn(() => ({ eq: deleteEqOuter }));
  const update = vi.fn(() => updateChain);
  const insert = vi.fn(() => insertChain);
  const del = vi.fn(() => ({ eq: deleteEqInner }));
  const from = vi.fn(() => ({
    update,
    insert,
    delete: del,
  }));

  return { from, update, insert, delete: del, updateChain, insertChain, deleteEqInner, deleteEqOuter };
}

describe("/api/events route", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((m) => m.mockReset());
    mocks.getCurrentUser.mockResolvedValue({ id: "viewer-1" });
    mocks.canEditChapter.mockReturnValue(true);
    mocks.getChapterById.mockResolvedValue({
      id: "chapter-a",
      subdomain: "alpha",
    });
  });

  describe("POST", () => {
    it("returns 401 when unauthenticated", async () => {
      mocks.getCurrentUser.mockResolvedValue(null);
      const response = await POST(
        new Request("http://localhost/api/events", {
          method: "POST",
          body: JSON.stringify({}),
        }),
      );
      expect(response.status).toBe(401);
    });

    it("returns 400 when required fields are missing", async () => {
      mocks.createServiceRoleSupabaseClient.mockReturnValue(buildSupabaseMock());
      const response = await POST(
        new Request("http://localhost/api/events", {
          method: "POST",
          body: JSON.stringify({
            id: null,
            chapterId: "",
            title: "",
            startAt: "",
            endAt: "",
            location: "",
            description: "",
            published: false,
          }),
        }),
      );
      expect(response.status).toBe(400);
    });

    it("returns 403 when caller cannot edit the target chapter", async () => {
      mocks.canEditChapter.mockReturnValue(false);
      mocks.createServiceRoleSupabaseClient.mockReturnValue(buildSupabaseMock());
      const response = await POST(
        new Request("http://localhost/api/events", {
          method: "POST",
          body: JSON.stringify({
            id: null,
            chapterId: "chapter-a",
            title: "Demo",
            startAt: "2026-06-01T12:00",
            endAt: "",
            location: "",
            description: "",
            published: false,
          }),
        }),
      );
      expect(response.status).toBe(403);
    });

    it("returns 403 when updating an event that belongs to a different chapter", async () => {
      const supabase = buildSupabaseMock();
      mocks.createServiceRoleSupabaseClient.mockReturnValue(supabase);
      // Caller authorized for chapter-a, but the event actually belongs to chapter-b.
      mocks.getEventByIdForAdmin.mockResolvedValue({
        id: "event-9",
        chapterId: "chapter-b",
      });

      const response = await POST(
        new Request("http://localhost/api/events", {
          method: "POST",
          body: JSON.stringify({
            id: "event-9",
            chapterId: "chapter-a",
            title: "Hijack",
            startAt: "2026-06-01T12:00",
            endAt: "",
            location: "",
            description: "",
            published: false,
          }),
        }),
      );

      expect(response.status).toBe(403);
      expect(supabase.update).not.toHaveBeenCalled();
    });

    it("returns 404 when updating a non-existent event", async () => {
      const supabase = buildSupabaseMock();
      mocks.createServiceRoleSupabaseClient.mockReturnValue(supabase);
      mocks.getEventByIdForAdmin.mockResolvedValue(null);

      const response = await POST(
        new Request("http://localhost/api/events", {
          method: "POST",
          body: JSON.stringify({
            id: "missing",
            chapterId: "chapter-a",
            title: "Demo",
            startAt: "2026-06-01T12:00",
            endAt: "",
            location: "",
            description: "",
            published: false,
          }),
        }),
      );

      expect(response.status).toBe(404);
      expect(supabase.update).not.toHaveBeenCalled();
    });
  });

  describe("DELETE", () => {
    it("returns 400 with chapter/event-id message when fields are missing", async () => {
      mocks.createServiceRoleSupabaseClient.mockReturnValue(buildSupabaseMock());
      const response = await DELETE(
        new Request("http://localhost/api/events", {
          method: "DELETE",
          body: JSON.stringify({}),
        }),
      );
      expect(response.status).toBe(400);
      const json = (await response.json()) as { error: string };
      expect(json.error).toMatch(/chapter and event id/i);
    });

    it("returns 403 when the event belongs to a different chapter than the caller", async () => {
      const supabase = buildSupabaseMock();
      mocks.createServiceRoleSupabaseClient.mockReturnValue(supabase);
      mocks.getEventByIdForAdmin.mockResolvedValue({
        id: "event-9",
        chapterId: "chapter-b",
      });

      const response = await DELETE(
        new Request("http://localhost/api/events", {
          method: "DELETE",
          body: JSON.stringify({
            chapterId: "chapter-a",
            eventId: "event-9",
          }),
        }),
      );

      expect(response.status).toBe(403);
      expect(supabase.delete).not.toHaveBeenCalled();
    });

    it("deletes the event when the caller is authorized and the event matches the chapter", async () => {
      const supabase = buildSupabaseMock();
      mocks.createServiceRoleSupabaseClient.mockReturnValue(supabase);
      mocks.getEventByIdForAdmin.mockResolvedValue({
        id: "event-9",
        chapterId: "chapter-a",
      });

      const response = await DELETE(
        new Request("http://localhost/api/events", {
          method: "DELETE",
          body: JSON.stringify({
            chapterId: "chapter-a",
            eventId: "event-9",
          }),
        }),
      );

      expect(response.status).toBe(200);
      expect(supabase.delete).toHaveBeenCalledTimes(1);
      expect(supabase.deleteEqInner).toHaveBeenCalledWith("id", "event-9");
      expect(supabase.deleteEqOuter).toHaveBeenCalledWith("chapter_id", "chapter-a");
    });
  });
});
