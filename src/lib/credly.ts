import { createServiceRoleSupabaseClient } from "@/lib/supabase-admin";

export type CredlyBadgeMetadata = {
  imageUrl: string | null;
  title: string | null;
  syncedAt: string;
};

function getMetaContent(html: string, key: string) {
  const pattern = new RegExp(
    `<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["']`,
    "i",
  );
  return html.match(pattern)?.[1] ?? null;
}

function getDocumentTitle(html: string) {
  const match = html.match(/<title>([^<]+)<\/title>/i);
  return match?.[1]?.trim() ?? null;
}

function isDirectImageUrl(url: string) {
  return /\.(png|jpe?g|webp|svg)(?:\?.*)?$/i.test(url);
}

export function extractCredlyBadgeMetadataFromHtml(html: string) {
  return {
    imageUrl:
      getMetaContent(html, "og:image") ?? getMetaContent(html, "twitter:image"),
    title:
      getMetaContent(html, "og:title") ??
      getMetaContent(html, "twitter:title") ??
      getDocumentTitle(html),
  };
}

export async function resolveCredlyBadgeMetadata(
  credlyBadgeUrl: string,
): Promise<CredlyBadgeMetadata> {
  const syncedAt = new Date().toISOString();
  const trimmed = credlyBadgeUrl.trim();

  if (!trimmed) {
    return {
      imageUrl: null,
      title: null,
      syncedAt,
    };
  }

  if (isDirectImageUrl(trimmed) || trimmed.includes("images.credly.com")) {
    return {
      imageUrl: trimmed,
      title: null,
      syncedAt,
    };
  }

  try {
    const response = await fetch(trimmed, {
      headers: {
        "User-Agent": "WIAL Platform Badge Resolver/1.0",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return {
        imageUrl: null,
        title: null,
        syncedAt,
      };
    }

    const html = await response.text();
    const metadata = extractCredlyBadgeMetadataFromHtml(html);

    return {
      imageUrl: metadata.imageUrl,
      title: metadata.title,
      syncedAt,
    };
  } catch {
    return {
      imageUrl: null,
      title: null,
      syncedAt,
    };
  }
}

export async function syncCoachCredlyBadgeFields(
  coachId: string,
  credlyBadgeUrl: string | null,
) {
  const client = createServiceRoleSupabaseClient();

  if (!client) {
    return false;
  }

  const trimmed = credlyBadgeUrl?.trim() ?? "";

  if (!trimmed) {
    const { error } = await client
      .from("coaches")
      .update({
        credly_badge_image_url: null,
        credly_badge_title: null,
        credly_badge_synced_at: null,
      })
      .eq("id", coachId);

    if (error) {
      throw new Error(error.message);
    }

    return true;
  }

  const metadata = await resolveCredlyBadgeMetadata(trimmed);
  const { error } = await client
    .from("coaches")
    .update({
      credly_badge_image_url: metadata.imageUrl,
      credly_badge_title: metadata.title,
      credly_badge_synced_at: metadata.syncedAt,
    })
    .eq("id", coachId);

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(metadata.imageUrl);
}

