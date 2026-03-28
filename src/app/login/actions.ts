"use server";

import { redirect } from "next/navigation";
import { resolvePostAuthPath } from "@/lib/auth";
import { createServerSupabaseAuthClient, hasSupabaseAuthConfig } from "@/lib/supabase-auth";

function buildLoginPath(
  nextPath: string,
  params: Record<string, string>,
) {
  const searchParams = new URLSearchParams({
    next: nextPath,
    ...params,
  });

  return `/login?${searchParams.toString()}`;
}

export async function signInWithPasswordAction(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const nextPath = resolvePostAuthPath(String(formData.get("next") ?? ""));

  if (!username) {
    redirect(buildLoginPath(nextPath, { error: "username-required" }));
  }

  if (!password) {
    redirect(buildLoginPath(nextPath, { error: "password-required" }));
  }

  if (!hasSupabaseAuthConfig()) {
    redirect(buildLoginPath(nextPath, { error: "missing-config" }));
  }

  const supabase = await createServerSupabaseAuthClient();

  if (!supabase) {
    redirect(buildLoginPath(nextPath, { error: "missing-config" }));
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: username,
    password,
  });

  if (error) {
    redirect(buildLoginPath(nextPath, { error: "invalid-credentials" }));
  }

  redirect(nextPath);
}
