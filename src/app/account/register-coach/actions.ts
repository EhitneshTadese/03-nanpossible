"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAccountViewer } from "@/lib/auth";
import { getCoachByUserId } from "@/lib/coaches";
import { createServiceRoleSupabaseClient } from "@/lib/supabase-admin";
import {
  createServerSupabaseAuthClient,
  hasSupabaseAuthConfig,
} from "@/lib/supabase-auth";
import type { CertificationLevel } from "@/lib/types";

const CERT_LEVELS: CertificationLevel[] = ["CALC", "PALC", "SALC", "MALC"];

function buildRegisterCoachPath(error: string) {
  const searchParams = new URLSearchParams({ error });

  return `/account/register-coach?${searchParams.toString()}`;
}

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalString(formData: FormData, key: string) {
  const value = readString(formData, key);
  return value.length ? value : null;
}

function readStringArray(formData: FormData, key: string) {
  return readString(formData, key)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseCertLevel(value: string): CertificationLevel | null {
  return CERT_LEVELS.includes(value as CertificationLevel)
    ? (value as CertificationLevel)
    : null;
}

function isValidUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function registerCoachProfileAction(formData: FormData) {
  const viewer = await requireAccountViewer("/account/register-coach", [
    "public_visitor",
    "coach",
  ]);

  // Block duplicate registrations
  const existing = await getCoachByUserId(viewer.id);

  if (existing) {
    redirect(buildRegisterCoachPath("already-registered"));
  }

  const name = readString(formData, "name");
  const email = readString(formData, "email") || viewer.email;
  const chapterId = readString(formData, "chapterId");
  const bio = readString(formData, "bio");

  if (!name) {
    redirect(buildRegisterCoachPath("name-required"));
  }

  if (!email) {
    redirect(buildRegisterCoachPath("email-required"));
  }

  if (!chapterId) {
    redirect(buildRegisterCoachPath("chapter-required"));
  }

  if (!bio || bio.length < 40) {
    redirect(buildRegisterCoachPath("bio-too-short"));
  }

  const phone = readOptionalString(formData, "phone");
  const photoUrl = readOptionalString(formData, "photoUrl");
  const locationCity = readOptionalString(formData, "locationCity");
  const locationCountry = readOptionalString(formData, "locationCountry");
  const website = readOptionalString(formData, "website");
  const linkedin = readOptionalString(formData, "linkedin");
  const credlyBadgeUrl = readOptionalString(formData, "credlyBadgeUrl");
  const certLevel = parseCertLevel(readString(formData, "certLevel"));
  const specializations = readStringArray(formData, "specializations");
  const languages = readStringArray(formData, "languages");

  for (const [field, value] of [
    ["photoUrl", photoUrl],
    ["website", website],
    ["linkedin", linkedin],
    ["credlyBadgeUrl", credlyBadgeUrl],
  ] as const) {
    if (value && !isValidUrl(value)) {
      redirect(buildRegisterCoachPath(`${field}-invalid`));
    }
  }

  const admin = createServiceRoleSupabaseClient();

  if (!admin) {
    redirect(buildRegisterCoachPath("missing-config"));
  }

  const { error: insertError } = await admin.from("coaches").insert({
    user_id: viewer.id,
    chapter_id: chapterId,
    name,
    email,
    phone,
    photo_url: photoUrl,
    cert_level: certLevel,
    location_city: locationCity,
    location_country: locationCountry,
    bio,
    specializations,
    languages,
    website,
    linkedin,
    credly_badge_url: credlyBadgeUrl,
    approved: false,
  });

  if (insertError) {
    console.error("registerCoachProfileAction insert failed", insertError);
    redirect(buildRegisterCoachPath("insert-failed"));
  }

  // Promote role from public_visitor to coach if needed
  if (viewer.role === "public_visitor" && hasSupabaseAuthConfig()) {
    const supabase = await createServerSupabaseAuthClient();

    if (supabase) {
      const { error: promoteError } = await supabase.rpc(
        "promote_self_to_coach",
      );

      if (promoteError) {
        console.error(
          "registerCoachProfileAction promote_self_to_coach failed",
          promoteError,
        );
      } else {
        await supabase.auth.refreshSession();
      }
    }
  }

  revalidatePath("/admin/approvals");
  revalidatePath("/dashboard/coaches");
  revalidatePath("/account/register-coach");

  redirect("/account/register-coach?notice=submitted");
}
