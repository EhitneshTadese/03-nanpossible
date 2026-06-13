import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  appRoles,
  getDefaultAccountHref,
  sanitizeNextPath,
} from "@/lib/account";
import { createServerSupabaseAuthClient, hasSupabaseAuthConfig } from "@/lib/supabase-auth";
import type { AppRole, UserProfile } from "@/lib/types";

function coerceRole(value?: string | null): AppRole {
  if (
    value === "public_visitor" ||
    value === "platform_admin" ||
    value === "chapter_admin" ||
    value === "content_creator"
  ) {
    return value;
  }

  return value === "coach" ? "coach" : "public_visitor";
}

function mapProfileRow(data: {
  id: string;
  email: string;
  name: string | null;
  role: string | null;
  chapter_id: string | null;
  assigned_chapters: string[] | null;
  phone: string | null;
  phone_country_code: string | null;
  location: string | null;
  bio: string | null;
  photo_url: string | null;
}) {
  return {
    id: data.id,
    email: data.email,
    name: data.name ?? "",
    role: coerceRole(data.role),
    chapterId: data.chapter_id,
    assignedChapters: data.assigned_chapters ?? [],
    phone: data.phone,
    phoneCountryCode: data.phone_country_code,
    location: data.location,
    bio: data.bio,
    photoUrl: data.photo_url,
  } satisfies UserProfile;
}

export const getCurrentUser = cache(async () => {
  if (!hasSupabaseAuthConfig()) {
    return null;
  }

  try {
    const supabase = await createServerSupabaseAuthClient();

    if (!supabase) {
      return null;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    const { data } = await supabase
      .from("users")
      .select(
        "id, email, name, role, chapter_id, assigned_chapters, phone,phone_country_code, location, bio, photo_url",
      )
      .eq("id", user.id)
      .maybeSingle();

    const metadataRole = coerceRole(
      typeof user.app_metadata?.role === "string"
        ? user.app_metadata.role
        : null,
    );

    if (data) {
      const profile = mapProfileRow(data);
      // app_metadata is authoritative (only service_role can set it).
      // If it carries a non-default role that differs from the DB row, prefer it.
      if (metadataRole !== "public_visitor" && metadataRole !== profile.role) {
        return { ...profile, role: metadataRole };
      }
      return profile;
    }

    return {
      id: user.id,
      email: user.email ?? "",
      name: typeof user.user_metadata?.name === "string" ? user.user_metadata.name : "",
      role: metadataRole,
      chapterId:
        typeof user.app_metadata?.chapter_id === "string"
          ? user.app_metadata.chapter_id
          : null,
      assignedChapters: Array.isArray(user.app_metadata?.assigned_chapters)
        ? user.app_metadata.assigned_chapters
            .filter((value): value is string => typeof value === "string")
        : [],
      phone: null,
      location: null,
      bio: null,
      photoUrl: null,
    } satisfies UserProfile;
  } catch {
    return null;
  }
});

export const getCurrentViewer = getCurrentUser;

export async function requireRole(
  nextPath: string,
  allowedRoles: AppRole[] = appRoles,
) {
  const viewer = await getCurrentUser();

  if (!viewer) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  if (!allowedRoles.includes(viewer.role)) {
    redirect(getDefaultAccountHref(viewer.role));
  }

  return viewer;
}

export async function requireAccountViewer(
  nextPath: string,
  allowedRoles: AppRole[] = appRoles,
) {
  return requireRole(nextPath, allowedRoles);
}

export function canEditChapter(user: UserProfile, chapterId: string) {
  if (user.role === "platform_admin") {
    return true;
  }

  if (user.role === "chapter_admin") {
    return user.chapterId === chapterId;
  }

  if (user.role === "content_creator") {
    return user.assignedChapters.includes(chapterId);
  }

  return false;
}

export function canManageCoaches(user: UserProfile, chapterId: string) {
  if (user.role === "platform_admin") {
    return true;
  }

  return user.role === "chapter_admin" && user.chapterId === chapterId;
}

export function canProvisionChapter(user: UserProfile) {
  return user.role === "platform_admin";
}

export async function buildAbsoluteUrl(pathname: string) {
  const headerStore = await headers();
  const host =
    headerStore.get("x-forwarded-host") ??
    headerStore.get("host") ??
    "localhost:3000";
  const protocol =
    headerStore.get("x-forwarded-proto") ??
    (host.includes("localhost") || host.includes("127.0.0.1")
      ? "http"
      : "https");

  return `${protocol}://${host}${pathname}`;
}

export function resolvePostAuthPath(candidate?: string | null) {
  return sanitizeNextPath(candidate) ?? "/account";
}
