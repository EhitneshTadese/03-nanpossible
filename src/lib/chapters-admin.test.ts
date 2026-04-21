import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServiceRoleSupabaseClient: vi.fn(),
  listChapters: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/lib/supabase-admin", () => ({
  createServiceRoleSupabaseClient: mocks.createServiceRoleSupabaseClient,
}));

vi.mock("@/lib/tenant", () => ({
  listChapters: mocks.listChapters,
}));

import {
  assertRoleAssignmentAllowed,
  deleteChapter,
  listAdminUsers,
  normalizeRoleAssignmentForDeletedChapter,
  normalizeRoleAssignment,
  syncUserAccess,
} from "@/lib/chapters-admin";

describe("role assignment normalization", () => {
  it("clears irrelevant fields for platform admins and coaches", () => {
    expect(
      normalizeRoleAssignment({
        role: "platform_admin",
        chapterId: "chapter-1",
        assignedChapters: ["chapter-2"],
      }),
    ).toEqual({
      role: "platform_admin",
      chapterId: null,
      assignedChapters: [],
    });

    expect(
      normalizeRoleAssignment({
        role: "coach",
        chapterId: " chapter-1 ",
        assignedChapters: ["chapter-2", "chapter-3"],
      }),
    ).toEqual({
      role: "coach",
      chapterId: "chapter-1",
      assignedChapters: [],
    });
  });

  it("requires a primary chapter for chapter heads", () => {
    expect(() =>
      normalizeRoleAssignment({
        role: "chapter_admin",
        chapterId: null,
        assignedChapters: [],
      }),
    ).toThrowError("chapter-required");
  });

  it("requires assigned chapters for content creators", () => {
    expect(() =>
      normalizeRoleAssignment({
        role: "content_creator",
        chapterId: "chapter-1",
        assignedChapters: [],
      }),
    ).toThrowError("assigned-chapters-required");
  });
});

describe("chapter deletion role cleanup", () => {
  it("demotes chapter heads and trims content creator access when a chapter is deleted", () => {
    expect(
      normalizeRoleAssignmentForDeletedChapter(
        {
          role: "chapter_admin",
          chapter_id: "chapter-1",
          assigned_chapters: [],
        },
        "chapter-1",
      ),
    ).toEqual({
      role: "public_visitor",
      chapterId: null,
      assignedChapters: [],
    });

    expect(
      normalizeRoleAssignmentForDeletedChapter(
        {
          role: "content_creator",
          chapter_id: null,
          assigned_chapters: ["chapter-1", "chapter-2"],
        },
        "chapter-1",
      ),
    ).toEqual({
      role: "content_creator",
      chapterId: null,
      assignedChapters: ["chapter-2"],
    });

    expect(
      normalizeRoleAssignmentForDeletedChapter(
        {
          role: "coach",
          chapter_id: "chapter-1",
          assigned_chapters: [],
        },
        "chapter-1",
      ),
    ).toEqual({
      role: "coach",
      chapterId: null,
      assignedChapters: [],
    });
  });
});

describe("role assignment safety", () => {
  it("blocks self-demotion from platform admin", () => {
    expect(() =>
      assertRoleAssignmentAllowed({
        actorUserId: "user-1",
        targetUserId: "user-1",
        currentRole: "platform_admin",
        nextRole: "coach",
        platformAdminCount: 2,
      }),
    ).toThrowError("self-demotion-forbidden");
  });

  it("blocks demoting the last remaining platform admin", () => {
    expect(() =>
      assertRoleAssignmentAllowed({
        actorUserId: "user-2",
        targetUserId: "user-1",
        currentRole: "platform_admin",
        nextRole: "chapter_admin",
        platformAdminCount: 1,
      }),
    ).toThrowError("last-platform-admin");
  });
});

describe("syncUserAccess", () => {
  beforeEach(() => {
    mocks.createServiceRoleSupabaseClient.mockReset();
    mocks.listChapters.mockReset();
    mocks.revalidatePath.mockReset();
  });

  it("persists assigned chapters to the public user row and auth metadata", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const updateUserById = vi.fn().mockResolvedValue({ error: null });

    mocks.createServiceRoleSupabaseClient.mockReturnValue({
      from: vi.fn(() => ({
        upsert,
      })),
      auth: {
        admin: {
          updateUserById,
        },
      },
    });

    await syncUserAccess({
      userId: "user-1",
      email: "admin@wial.org",
      name: "Admin User",
      role: "content_creator",
      chapterId: null,
      assignedChapters: ["chapter-1", "chapter-2", "chapter-1"],
    });

    expect(upsert).toHaveBeenCalledWith({
      id: "user-1",
      email: "admin@wial.org",
      name: "Admin User",
      role: "content_creator",
      chapter_id: null,
      assigned_chapters: ["chapter-1", "chapter-2"],
    });
    expect(updateUserById).toHaveBeenCalledWith("user-1", {
      app_metadata: {
        role: "content_creator",
        chapter_id: null,
        assigned_chapters: ["chapter-1", "chapter-2"],
      },
    });
  });

  it("normalizes invalid Supabase API key errors for admin data loads", async () => {
    const select = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "Invalid API key" },
    });

    mocks.createServiceRoleSupabaseClient.mockReturnValue({
      from: vi.fn(() => ({
        select,
      })),
    });
    mocks.listChapters.mockResolvedValue([]);

    await expect(listAdminUsers()).rejects.toThrowError("invalid-service-key");
  });

  it("updates affected users before deleting a chapter", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const updateUserById = vi.fn().mockResolvedValue({ error: null });
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: "chapter-1", name: "WIAL USA", subdomain: "usa" },
      error: null,
    });
    const chapterDeleteEq = vi.fn().mockResolvedValue({ error: null });
    const usersSelect = vi.fn().mockResolvedValue({
      data: [
        {
          id: "user-1",
          email: "lead@wial.org",
          name: "Lead",
          role: "chapter_admin",
          chapter_id: "chapter-1",
          assigned_chapters: [],
        },
        {
          id: "user-2",
          email: "creator@wial.org",
          name: "Creator",
          role: "content_creator",
          chapter_id: null,
          assigned_chapters: ["chapter-1", "chapter-2"],
        },
        {
          id: "user-3",
          email: "coach@wial.org",
          name: "Coach",
          role: "coach",
          chapter_id: "chapter-1",
          assigned_chapters: [],
        },
        {
          id: "user-4",
          email: "platform@wial.org",
          name: "Platform Admin",
          role: "platform_admin",
          chapter_id: null,
          assigned_chapters: [],
        },
      ],
      error: null,
    });

    mocks.createServiceRoleSupabaseClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "users") {
          return {
            select: usersSelect,
            upsert,
          };
        }

        if (table === "chapters") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle,
              })),
            })),
            delete: vi.fn(() => ({
              eq: chapterDeleteEq,
            })),
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      }),
      auth: {
        admin: {
          updateUserById,
        },
      },
    });

    await deleteChapter("chapter-1");

    expect(upsert).toHaveBeenNthCalledWith(1, {
      id: "user-1",
      email: "lead@wial.org",
      name: "Lead",
      role: "public_visitor",
      chapter_id: null,
      assigned_chapters: [],
    });
    expect(upsert).toHaveBeenNthCalledWith(2, {
      id: "user-2",
      email: "creator@wial.org",
      name: "Creator",
      role: "content_creator",
      chapter_id: null,
      assigned_chapters: ["chapter-2"],
    });
    expect(upsert).toHaveBeenNthCalledWith(3, {
      id: "user-3",
      email: "coach@wial.org",
      name: "Coach",
      role: "coach",
      chapter_id: null,
      assigned_chapters: [],
    });
    expect(updateUserById).toHaveBeenCalledTimes(3);
    expect(chapterDeleteEq).toHaveBeenCalledWith("id", "chapter-1");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/global/chapters");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/sites/usa");
  });

  it("blocks deletion of the protected global chapter record", async () => {
    mocks.createServiceRoleSupabaseClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "chapters") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: "chapter-global", name: "WIAL Global", subdomain: "global" },
                  error: null,
                }),
              })),
            })),
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      }),
    });

    await expect(deleteChapter("chapter-global")).rejects.toThrowError(
      "protected-chapter",
    );
  });
});
