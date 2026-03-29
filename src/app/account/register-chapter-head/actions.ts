"use server";

import { redirect } from "next/navigation";
import { getDefaultAccountHref } from "@/lib/account";
import { requireAccountViewer } from "@/lib/auth";
import {
  createServerSupabaseAuthClient,
  hasSupabaseAuthConfig,
} from "@/lib/supabase-auth";

function buildRegisterChapterHeadPath(error: string) {
  const searchParams = new URLSearchParams({ error });

  return `/account/register-chapter-head?${searchParams.toString()}`;
}

function mapPromoteToChapterHeadError(error: { code?: string; message?: string }) {
  if (error.code === "PGRST202") {
    return "migration-missing";
  }

  const message = error.message?.toLowerCase() ?? "";

  if (message.includes("only coaches")) {
    return "role-mismatch";
  }

  if (message.includes("chapter assignment")) {
    return "chapter-required";
  }

  return "upgrade-failed";
}

export async function promoteToChapterHeadAction() {
  const viewer = await requireAccountViewer("/account/register-chapter-head", [
    "coach",
  ]);

  if (!viewer.chapterId) {
    redirect(buildRegisterChapterHeadPath("chapter-required"));
  }

  if (!hasSupabaseAuthConfig()) {
    redirect(buildRegisterChapterHeadPath("missing-config"));
  }

  const supabase = await createServerSupabaseAuthClient();

  if (!supabase) {
    redirect(buildRegisterChapterHeadPath("missing-config"));
  }

  const { error } = await supabase.rpc("promote_self_to_chapter_admin");

  if (error) {
    console.error("promoteToChapterHeadAction failed", error);
    redirect(buildRegisterChapterHeadPath(mapPromoteToChapterHeadError(error)));
  }

  await supabase.auth.refreshSession();

  redirect(getDefaultAccountHref("chapter_admin"));
}
