"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { requireAccountViewer } from "@/lib/auth";
import { getClaimableCoachByEmail, getCoachByUserId } from "@/lib/coaches";
import { createServiceRoleSupabaseClient } from "@/lib/supabase-admin";

const allowedPhotoTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function buildDashboardProfilePath(params: Record<string, string>) {
  return `/dashboard/profile?${new URLSearchParams(params).toString()}`;
}

function parseList(values: string[], customValue: string) {
  const merged = [...values, ...customValue.split(",")];
  return [...new Set(merged.map((value) => value.trim()).filter(Boolean))];
}

function getFileExtension(mimeType: string) {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "bin";
  }
}

export async function saveCoachProfileAction(formData: FormData) {
  const viewer = await requireAccountViewer("/dashboard/profile", ["coach"]);
  const client = createServiceRoleSupabaseClient();

  if (!client) {
    redirect(buildDashboardProfilePath({ error: "missing-config" }));
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const locationCity = String(formData.get("locationCity") ?? "").trim();
  const locationCountry = String(formData.get("locationCountry") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const website = String(formData.get("website") ?? "").trim();
  const linkedin = String(formData.get("linkedin") ?? "").trim();
  const credlyBadgeUrl = String(formData.get("credlyBadgeUrl") ?? "").trim();
  const currentPhotoUrl = String(formData.get("currentPhotoUrl") ?? "").trim();
  const specializations = parseList(
    formData.getAll("specializations").map(String),
    String(formData.get("customSpecializations") ?? ""),
  );
  const languages = parseList(
    formData.getAll("languages").map(String),
    String(formData.get("customLanguages") ?? ""),
  );

  if (!name) {
    redirect(buildDashboardProfilePath({ error: "name-required" }));
  }

  if (!locationCountry) {
    redirect(buildDashboardProfilePath({ error: "country-required" }));
  }

  let photoUrl = currentPhotoUrl || null;
  const photo = formData.get("photo");

  if (photo instanceof File && photo.size > 0) {
    if (!allowedPhotoTypes.has(photo.type)) {
      redirect(buildDashboardProfilePath({ error: "photo-type" }));
    }

    if (photo.size > 2 * 1024 * 1024) {
      redirect(buildDashboardProfilePath({ error: "photo-size" }));
    }

    const objectPath = `${viewer.id}/${randomUUID()}.${getFileExtension(photo.type)}`;
    const { error: uploadError } = await client.storage
      .from("coach-photos")
      .upload(objectPath, photo, {
        cacheControl: "3600",
        contentType: photo.type,
        upsert: true,
      });

    if (uploadError) {
      redirect(buildDashboardProfilePath({ error: "photo-upload" }));
    }

    photoUrl = client.storage.from("coach-photos").getPublicUrl(objectPath).data.publicUrl;
  }

  const [existingCoach, claimableCoach] = await Promise.all([
    getCoachByUserId(viewer.id),
    getClaimableCoachByEmail(viewer.email),
  ]);

  const payload = {
    chapter_id: existingCoach?.chapterId ?? claimableCoach?.chapterId ?? viewer.chapterId,
    user_id: viewer.id,
    name,
    email: email || viewer.email,
    phone: phone || null,
    photo_url: photoUrl,
    cert_level: existingCoach?.certLevel ?? claimableCoach?.certLevel ?? null,
    location_city: locationCity || null,
    location_country: locationCountry,
    bio: bio || null,
    specializations,
    languages,
    website: website || null,
    linkedin: linkedin || null,
    credly_badge_url: credlyBadgeUrl || null,
    approved: false,
    embedding: null,
    rejection_reason: null,
    rejected_at: null,
  };

  if (existingCoach) {
    const { error } = await client
      .from("coaches")
      .update(payload)
      .eq("id", existingCoach.id)
      .eq("user_id", viewer.id);

    if (error) {
      redirect(buildDashboardProfilePath({ error: "save-failed" }));
    }
  } else if (claimableCoach) {
    const { error } = await client
      .from("coaches")
      .update(payload)
      .eq("id", claimableCoach.id)
      .is("user_id", null);

    if (error) {
      redirect(buildDashboardProfilePath({ error: "claim-failed" }));
    }
  } else {
    const { error } = await client.from("coaches").insert(payload);

    if (error) {
      redirect(buildDashboardProfilePath({ error: "create-failed" }));
    }
  }

  redirect(buildDashboardProfilePath({ notice: "submitted" }));
}
