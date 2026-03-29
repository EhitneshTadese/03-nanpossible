"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { embedCoachById } from "@/lib/coach-embeddings";
import { requireAccountViewer } from "@/lib/auth";
import { getCoachByIdForAdmin } from "@/lib/coaches";
import { syncCoachCredlyBadgeFields } from "@/lib/credly";
import { sanitizeNextPath } from "@/lib/account";
import { createServiceRoleSupabaseClient } from "@/lib/supabase-admin";

function buildReturnPath(pathname: string, params: Record<string, string>) {
  return `${pathname}?${new URLSearchParams(params).toString()}`;
}

function resolveReturnPath(value: string, fallback: string) {
  return sanitizeNextPath(value) ?? fallback;
}

async function sendRejectionEmail(email: string, name: string, reason: string) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "WIAL <noreply@wial.org>",
      to: [email],
      subject: "Your WIAL coach profile needs revision",
      text: `Hello ${name},\n\nYour WIAL coach directory profile needs a revision before it can be published.\n\nReason: ${reason}\n\nPlease sign in to the WIAL platform and update your profile.\n`,
    }),
  });

  if (!response.ok) {
    throw new Error("Resend request failed");
  }
}

export async function approveCoachAction(formData: FormData) {
  const viewer = await requireAccountViewer("/dashboard/coaches", [
    "platform_admin",
    "chapter_admin",
  ]);
  const client = createServiceRoleSupabaseClient();
  const redirectTo = resolveReturnPath(
    String(formData.get("redirectTo") ?? ""),
    viewer.role === "platform_admin" ? "/admin/approvals" : "/dashboard/coaches",
  );

  if (!client) {
    redirect(buildReturnPath(redirectTo, { error: "missing-config" }));
  }

  const coachId = String(formData.get("coachId") ?? "");
  const coach = await getCoachByIdForAdmin(coachId);

  if (!coach) {
    redirect(buildReturnPath(redirectTo, { error: "coach-missing" }));
  }

  if (
    viewer.role !== "platform_admin" &&
    (!viewer.chapterId || coach.chapterId !== viewer.chapterId)
  ) {
    redirect(buildReturnPath(redirectTo, { error: "scope-denied" }));
  }

  const { error } = await client
    .from("coaches")
    .update({
      approved: true,
      last_approved_at: new Date().toISOString(),
      rejection_reason: null,
      rejected_at: null,
    })
    .eq("id", coachId);

  if (error) {
    redirect(buildReturnPath(redirectTo, { error: "approve-failed" }));
  }

  try {
    await syncCoachCredlyBadgeFields(coachId, coach.credlyBadgeUrl);
  } catch {
    // Badge enrichment is best-effort and should not block approval.
  }

  try {
    await embedCoachById(coachId);
  } catch {
    revalidatePath("/coaches");
    revalidatePath(`/coaches/${coachId}`);
    revalidatePath("/dashboard/coaches");
    revalidatePath("/admin/approvals");
    redirect(buildReturnPath(redirectTo, { notice: "approved-no-embedding" }));
  }

  revalidatePath("/coaches");
  revalidatePath(`/coaches/${coachId}`);
  revalidatePath("/dashboard/coaches");
  revalidatePath("/admin/approvals");
  redirect(buildReturnPath(redirectTo, { notice: "approved" }));
}

export async function rejectCoachAction(formData: FormData) {
  const viewer = await requireAccountViewer("/dashboard/coaches", [
    "platform_admin",
    "chapter_admin",
  ]);
  const client = createServiceRoleSupabaseClient();
  const redirectTo = resolveReturnPath(
    String(formData.get("redirectTo") ?? ""),
    viewer.role === "platform_admin" ? "/admin/approvals" : "/dashboard/coaches",
  );

  if (!client) {
    redirect(buildReturnPath(redirectTo, { error: "missing-config" }));
  }

  if (!process.env.RESEND_API_KEY) {
    redirect(buildReturnPath(redirectTo, { error: "resend-missing" }));
  }

  const coachId = String(formData.get("coachId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!reason) {
    redirect(buildReturnPath(redirectTo, { error: "reason-required" }));
  }

  const coach = await getCoachByIdForAdmin(coachId);

  if (!coach) {
    redirect(buildReturnPath(redirectTo, { error: "coach-missing" }));
  }

  if (
    viewer.role !== "platform_admin" &&
    (!viewer.chapterId || coach.chapterId !== viewer.chapterId)
  ) {
    redirect(buildReturnPath(redirectTo, { error: "scope-denied" }));
  }

  const { error } = await client
    .from("coaches")
    .update({
      approved: false,
      rejection_reason: reason,
      rejected_at: new Date().toISOString(),
    })
    .eq("id", coachId);

  if (error) {
    redirect(buildReturnPath(redirectTo, { error: "reject-failed" }));
  }

  if (coach.email) {
    try {
      await sendRejectionEmail(coach.email, coach.name, reason);
    } catch {
      redirect(buildReturnPath(redirectTo, { error: "email-failed" }));
    }
  }

  revalidatePath("/dashboard/coaches");
  revalidatePath("/admin/approvals");
  redirect(buildReturnPath(redirectTo, { notice: "rejected" }));
}
