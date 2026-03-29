import { buildCoachEmbeddingText, getCoachByIdForAdmin } from "@/lib/coaches";
import { generateEmbedding } from "@/lib/embeddings";
import { createServiceRoleSupabaseClient } from "@/lib/supabase-admin";

export async function embedCoachById(coachId: string) {
  const client = createServiceRoleSupabaseClient();

  if (!client) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }

  const coach = await getCoachByIdForAdmin(coachId);

  if (!coach) {
    throw new Error("Coach not found");
  }

  const embeddingText = buildCoachEmbeddingText(coach);
  const embedding = await generateEmbedding(embeddingText, "search_document");
  const embeddingLiteral = `[${embedding.join(",")}]`;

  const { error } = await client.rpc("set_coach_embedding", {
    target_coach_id: coachId,
    embedding_literal: embeddingLiteral,
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    coachId,
    embeddingText,
    dimension: embedding.length,
  };
}

export async function embedPendingApprovedCoaches(limit = 100) {
  const client = createServiceRoleSupabaseClient();

  if (!client) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }

  const { data, error } = await client
    .from("coaches")
    .select("id")
    .eq("approved", true)
    .is("embedding", null)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  const embedded: string[] = [];

  for (const row of data ?? []) {
    await embedCoachById(row.id);
    embedded.push(row.id);
  }

  return embedded;
}
