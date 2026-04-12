"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseAuthClient, hasSupabaseAuthConfig } from "@/lib/supabase-auth";

export async function forgotPasswordAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email) {
    redirect("/login?error=username-required");
  }

  if (!hasSupabaseAuthConfig()) {
    redirect("/login?error=missing-config");
  }

  const supabase = await createServerSupabaseAuthClient();

  if (!supabase) {
    redirect("/login?error=missing-config");
  }

  // Always show success to avoid leaking whether the email exists
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://03-nanpossible.vercel.app"}/auth/callback?type=recovery`,
  });

  redirect("/login?notice=recovery-sent");
}
