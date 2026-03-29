import { headers } from "next/headers";
import { canEditChapter } from "@/lib/auth";
import { getChapterFromHeaders } from "@/lib/chapter-context";
import { getChapterById } from "@/lib/tenant";
import type { ChapterRecord, UserProfile } from "@/lib/types";

export async function resolveWorkspaceChapter(
  viewer: UserProfile,
): Promise<ChapterRecord | null> {
  const headerChapter = await getChapterFromHeaders();

  if (headerChapter) {
    const fullChapter = await getChapterById(headerChapter.id);

    if (fullChapter && canEditChapter(viewer, fullChapter.id)) {
      return fullChapter;
    }
  }

  if (viewer.role === "chapter_admin" && viewer.chapterId) {
    return getChapterById(viewer.chapterId);
  }

  if (viewer.role === "content_creator" && viewer.assignedChapters.length) {
    const requestedChapter = (await headers()).get("x-chapter-id");

    if (requestedChapter && viewer.assignedChapters.includes(requestedChapter)) {
      return getChapterById(requestedChapter);
    }

    return getChapterById(viewer.assignedChapters[0]);
  }

  return null;
}
