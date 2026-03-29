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
    value === "chapter_admin"
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
  phone: string | null;
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
    phone: data.phone,
    location: data.location,
    bio: data.bio,
    photoUrl: data.photo_url,
  } satisfies UserProfile;
}

export const getCurrentViewer = cache(async () => {
  if (!hasSupabaseAuthConfig()) {
    return null;
  }

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
    .select("id, email, name, role, chapter_id, phone, location, bio, photo_url")
    .eq("id", user.id)
    .maybeSingle();

  if (data) {
    return mapProfileRow(data);
  }

  return {
    id: user.id,
    email: user.email ?? "",
    name: typeof user.user_metadata?.name === "string" ? user.user_metadata.name : "",
    role: coerceRole(
      typeof user.app_metadata?.role === "string"
        ? user.app_metadata.role
        : null,
    ),
    chapterId:
      typeof user.app_metadata?.chapter_id === "string"
        ? user.app_metadata.chapter_id
        : null,
    phone: null,
    location: null,
    bio: null,
    photoUrl: null,
  } satisfies UserProfile;
});

export async function requireAccountViewer(
  nextPath: string,
  allowedRoles: AppRole[] = appRoles,
) {
  const viewer = await getCurrentViewer();

  if (!viewer) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  if (!allowedRoles.includes(viewer.role)) {
    redirect(getDefaultAccountHref(viewer.role));
  }

  return viewer;
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
