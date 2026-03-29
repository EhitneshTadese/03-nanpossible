import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { generateContentPageAudioById } from "@/lib/audio";
import { createServiceRoleSupabaseClient } from "@/lib/supabase-admin";

async function main() {
  const client = createServiceRoleSupabaseClient();

  if (!client) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }

  const { data, error } = await client
    .from("content_pages")
    .select("id, title, slug, chapter_id, published")
    .eq("published", true)
    .order("updated_at", { ascending: false })
    .limit(500);

  if (error) {
    throw new Error(error.message);
  }

  const rows = data ?? [];

  for (const [index, row] of rows.entries()) {
    const scope = row.chapter_id ? `chapter ${row.chapter_id}` : "global";
    const label = `${row.title ?? row.slug} (${scope})`;

    try {
      const result = await generateContentPageAudioById(row.id);
      console.log(
        `Generated page audio ${index + 1}/${rows.length}: ${label} -> ${result.audioUrl ?? "cleared"}`,
      );
    } catch (audioError) {
      console.error(
        `Failed page audio ${index + 1}/${rows.length}: ${label}`,
        audioError,
      );
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
