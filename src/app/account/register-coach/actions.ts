"use server";

import { redirect } from "next/navigation";
import { getDefaultAccountHref } from "@/lib/account";
import { requireAccountViewer } from "@/lib/auth";
import {
  createServerSupabaseAuthClient,
  hasSupabaseAuthConfig,
} from "@/lib/supabase-auth";

function buildRegisterCoachPath(error: string) {
  const searchParams = new URLSearchParams({ error });

  return `/account/register-coach?${searchParams.toString()}`;
}

function mapPromoteToCoachError(error: { code?: string; message?: string }) {
  if (error.code === "PGRST202") {
    return "migration-missing";
  }

  if (error.message?.toLowerCase().includes("only public visitors")) {
    return "role-mismatch";
  }

  return "upgrade-failed";
}

export async function promoteToCoachAction() {
  await requireAccountViewer("/account/register-coach", ["public_visitor"]);

  if (!hasSupabaseAuthConfig()) {
    redirect(buildRegisterCoachPath("missing-config"));
  }

  const supabase = await createServerSupabaseAuthClient();

  if (!supabase) {
    redirect(buildRegisterCoachPath("missing-config"));
  }

  const { error } = await supabase.rpc("promote_self_to_coach");

  if (error) {
    console.error("promoteToCoachAction failed", error);
    redirect(buildRegisterCoachPath(mapPromoteToCoachError(error)));
  }

  await supabase.auth.refreshSession();

  redirect(getDefaultAccountHref("coach"));
}
