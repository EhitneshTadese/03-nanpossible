import { syncCoachCredlyBadgeFields } from "@/lib/credly";
import { createServiceRoleSupabaseClient } from "@/lib/supabase-admin";

async function main() {
  const client = createServiceRoleSupabaseClient();

  if (!client) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }

  const { data, error } = await client
    .from("coaches")
    .select("id, name, credly_badge_url")
    .not("credly_badge_url", "is", null)
    .order("updated_at", { ascending: false })
    .limit(500);

  if (error) {
    throw new Error(error.message);
  }

  const rows = data ?? [];

  for (const [index, row] of rows.entries()) {
    const label = `${row.name ?? "Unknown coach"} (${row.id})`;

    try {
      await syncCoachCredlyBadgeFields(row.id, row.credly_badge_url);
      console.log(`Synced badge ${index + 1}/${rows.length}: ${label}`);
    } catch (syncError) {
      console.error(
        `Failed to sync badge ${index + 1}/${rows.length}: ${label}`,
        syncError,
      );
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

