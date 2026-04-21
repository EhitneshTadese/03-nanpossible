"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { appRoles } from "@/lib/account";
import { requireAccountViewer } from "@/lib/auth";
import { updateUserRoleAssignment } from "@/lib/chapters-admin";
import type { AppRole } from "@/lib/types";

function buildReturnPath(params: Record<string, string>) {
  return `/admin/global/users?${new URLSearchParams(params).toString()}`;
}

const roleAssignmentErrorCodes = new Set([
  "missing-config",
  "invalid-service-key",
  "user-not-found",
  "chapter-required",
  "assigned-chapters-required",
  "invalid-chapter",
  "invalid-chapters",
  "self-demotion-forbidden",
  "last-platform-admin",
]);

function isAppRole(value: string): value is AppRole {
  return appRoles.includes(value as AppRole);
}

export async function saveUserRoleAction(formData: FormData) {
  const viewer = await requireAccountViewer("/admin/global/users", ["platform_admin"]);
  const userId = String(formData.get("userId") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();
  const chapterId = String(formData.get("chapterId") ?? "").trim();
  const assignedChapters = formData
    .getAll("assignedChapters")
    .map((value) => String(value).trim())
    .filter(Boolean);

  if (!userId || !role) {
    redirect(buildReturnPath({ error: "missing-fields" }));
  }

  if (!isAppRole(role)) {
    redirect(buildReturnPath({ error: "invalid-role" }));
  }

  try {
    await updateUserRoleAssignment({
      actorUserId: viewer.id,
      userId,
      role,
      chapterId: chapterId || null,
      assignedChapters,
    });
  } catch (error) {
    const code =
      error instanceof Error && roleAssignmentErrorCodes.has(error.message)
        ? error.message
        : "save-failed";
    redirect(buildReturnPath({ error: code }));
  }

  revalidatePath("/admin/global");
  revalidatePath("/admin/global/chapters");
  revalidatePath("/admin/global/users");
  redirect(buildReturnPath({ notice: "saved" }));
}
