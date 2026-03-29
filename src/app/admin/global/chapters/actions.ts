"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assignContentCreatorToChapter } from "@/lib/chapters-admin";
import { requireAccountViewer } from "@/lib/auth";

function buildReturnPath(params: Record<string, string>) {
  return `/admin/global/chapters?${new URLSearchParams(params).toString()}`;
}

export async function assignContentCreatorAction(formData: FormData) {
  await requireAccountViewer("/admin/global/chapters", ["platform_admin"]);

  const email = String(formData.get("email") ?? "").trim();
  const chapterId = String(formData.get("chapterId") ?? "").trim();

  if (!email || !chapterId) {
    redirect(buildReturnPath({ error: "missing-fields" }));
  }

  try {
    await assignContentCreatorToChapter({
      email,
      chapterId,
    });
  } catch (error) {
    redirect(
      buildReturnPath({
        error:
          error instanceof Error && error.message === "user-not-found"
            ? "user-not-found"
            : "assign-failed",
      }),
    );
  }

  revalidatePath("/admin/global/chapters");
  redirect(buildReturnPath({ notice: "assigned" }));
}
