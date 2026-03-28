import chapters from "@/content/chapters.json";
import { createSupabaseContentClient } from "@/lib/supabase";
import type { ChapterRecord } from "@/lib/types";

const chapterFixtures = chapters as ChapterRecord[];

export async function getChapterBySubdomain(subdomain: string) {
  const client = createSupabaseContentClient({ tenantSubdomain: subdomain });

  if (client) {
    const { data } = await client
      .from("chapters")
      .select("id, name, subdomain, locale, status, contact_email, theme_json, tagline")
      .eq("subdomain", subdomain)
      .eq("status", "active")
      .maybeSingle();

    if (data) {
      return {
        id: data.id,
        name: data.name,
        subdomain: data.subdomain,
        locale: data.locale,
        status: data.status,
        contactEmail: data.contact_email,
        themeJson: data.theme_json ?? {},
        tagline: data.tagline,
      } satisfies ChapterRecord;
    }
  }

  return (
    chapterFixtures.find(
      (chapter) =>
        chapter.subdomain === subdomain && chapter.status === "active",
    ) ?? null
  );
}
