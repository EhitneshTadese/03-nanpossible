"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assignContentCreatorToChapter, deleteChapter } from "@/lib/chapters-admin";
import { requireAccountViewer } from "@/lib/auth";

function buildReturnPath(params: Record<string, string>) {
  return `/admin/global/chapters?${new URLSearchParams(params).toString()}`;
}

export async function assignContentCreatorAction(formData: FormData) {
  const viewer = await requireAccountViewer("/admin/global/chapters", ["platform_admin"]);

  const email = String(formData.get("email") ?? "").trim();
  const chapterId = String(formData.get("chapterId") ?? "").trim();

  if (!email || !chapterId) {
    redirect(buildReturnPath({ error: "missing-fields" }));
  }

  try {
    await assignContentCreatorToChapter({
      actorUserId: viewer.id,
      email,
      chapterId,
    });
  } catch (error) {
    redirect(
      buildReturnPath({
        error:
          error instanceof Error &&
          (
            error.message === "missing-config" ||
            error.message === "user-not-found" ||
            error.message === "invalid-service-key"
          )
            ? error.message
            : "assign-failed",
      }),
    );
  }

  revalidatePath("/admin/global/chapters");
  redirect(buildReturnPath({ notice: "assigned" }));
}

const chapterDeleteErrorCodes = new Set([
  "missing-config",
  "invalid-service-key",
  "chapter-not-found",
  "protected-chapter",
]);

export async function deleteChapterAction(formData: FormData) {
  await requireAccountViewer("/admin/global/chapters", ["platform_admin"]);

  const chapterId = String(formData.get("chapterId") ?? "").trim();

  if (!chapterId) {
    redirect(buildReturnPath({ error: "missing-fields" }));
  }

  try {
    await deleteChapter(chapterId);
  } catch (error) {
    const code =
      error instanceof Error && chapterDeleteErrorCodes.has(error.message)
        ? error.message
        : "delete-failed";
    redirect(buildReturnPath({ error: code }));
  }

  revalidatePath("/admin/global");
  revalidatePath("/admin/global/chapters");
  revalidatePath("/admin/global/users");
  redirect(buildReturnPath({ notice: "deleted" }));
}
