"use server";

import { redirect } from "next/navigation";
import { getDefaultAccountHref } from "@/lib/account";
import { resolvePostAuthPath } from "@/lib/auth";
import { createServerSupabaseAuthClient, hasSupabaseAuthConfig } from "@/lib/supabase-auth";

function buildRegisterPath(
  nextPath: string,
  params: Record<string, string>,
) {
  const searchParams = new URLSearchParams({
    next: nextPath,
    ...params,
  });

  return `/register?${searchParams.toString()}`;
}

export async function registerPublicVisitorAction(formData: FormData) {
  const displayName = String(formData.get("displayName") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const nextPath = resolvePostAuthPath(String(formData.get("next") ?? ""));

  if (!displayName) {
    redirect(buildRegisterPath(nextPath, { error: "name-required" }));
  }

  if (!username) {
    redirect(buildRegisterPath(nextPath, { error: "username-required" }));
  }

  if (!username.includes("@")) {
    redirect(buildRegisterPath(nextPath, { error: "username-invalid" }));
  }

  if (!password) {
    redirect(buildRegisterPath(nextPath, { error: "password-required" }));
  }

  if (password.length < 8) {
    redirect(buildRegisterPath(nextPath, { error: "password-too-short" }));
  }

  if (password !== confirmPassword) {
    redirect(buildRegisterPath(nextPath, { error: "password-mismatch" }));
  }

  if (!hasSupabaseAuthConfig()) {
    redirect(buildRegisterPath(nextPath, { error: "missing-config" }));
  }

  const supabase = await createServerSupabaseAuthClient();

  if (!supabase) {
    redirect(buildRegisterPath(nextPath, { error: "missing-config" }));
  }

  const { data, error } = await supabase.auth.signUp({
    email: username,
    password,
    options: {
      data: {
        name: displayName,
      },
    },
  });

  if (error) {
    console.error("Supabase registration error:", error.message, error.status); // Log the specific error
    const normalizedMessage = error.message.toLowerCase();

    if (normalizedMessage.includes("already registered")) {
      redirect(buildRegisterPath(nextPath, { error: "account-exists" }));
    }

    redirect(buildRegisterPath(nextPath, { error: "register-failed" }));
  }

  if (data.session) {
    redirect(getDefaultAccountHref("public_visitor"));
  }

  redirect(
    `/login?notice=registration-success&next=${encodeURIComponent(nextPath)}`,
  );
}
