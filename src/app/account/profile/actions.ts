"use server";

import { redirect } from "next/navigation";
import { requireAccountViewer } from "@/lib/auth";
import { createServerSupabaseAuthClient, hasSupabaseAuthConfig } from "@/lib/supabase-auth";

function buildProfilePath(state: "notice" | "error", value: string) {
  const searchParams = new URLSearchParams({
    [state]: value,
  });

  return `/account/profile?${searchParams.toString()}`;
}

export async function updateProfileAction(formData: FormData) {
  await requireAccountViewer("/account/profile");

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const phoneCountryCode = String(formData.get("phone_country_code") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const photoUrl = String(formData.get("photoUrl") ?? "").trim();

  if (!name) {
    redirect(buildProfilePath("error", "name-required"));
  }

  if (!email || !email.includes("@")) {
    redirect(buildProfilePath("error", "email-invalid"));
  }

  if (photoUrl) {
    try {
      new URL(photoUrl);
    } catch {
      redirect(buildProfilePath("error", "photo-invalid"));
    }
  }

  if (!hasSupabaseAuthConfig()) {
    redirect(buildProfilePath("error", "missing-config"));
  }

  const supabase = await createServerSupabaseAuthClient();

  if (!supabase) {
    redirect(buildProfilePath("error", "missing-config"));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=%2Faccount%2Fprofile");
  }

  const { error: profileError } = await supabase.rpc("update_my_profile", {
    profile_name: name,
    profile_phone: phone || null,
    profile_phone_country_code: phoneCountryCode || null,
    profile_location: location || null,
    profile_bio: bio || null,
    profile_photo_url: photoUrl || null,
  });

  if (profileError) {
    redirect(buildProfilePath("error", "save-failed"));
  }

  if (email !== (user.email ?? "").toLowerCase()) {
    const { error: emailError } = await supabase.auth.updateUser({
      email,
    });

    if (emailError) {
      redirect(buildProfilePath("error", "email-update-failed"));
    }

    redirect(buildProfilePath("notice", "email-pending"));
  }

  redirect(buildProfilePath("notice", "saved"));
}
