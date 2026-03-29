import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

type CertificationLevel = "CALC" | "PALC" | "SALC" | "MALC";

type SeedCoachRecord = {
  id: string;
  userId: string | null;
  chapterId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  photoUrl: string | null;
  certLevel: CertificationLevel | null;
  locationCity: string | null;
  locationCountry: string | null;
  locationLat: number | null;
  locationLng: number | null;
  bio: string | null;
  specializations: string[];
  languages: string[];
  website: string | null;
  linkedin: string | null;
  credlyBadgeUrl: string | null;
  approved: boolean;
  createdAt: string;
  updatedAt: string;
  lastApprovedAt: string | null;
  rejectionReason: string | null;
  rejectedAt: string | null;
};

function loadEnvFiles() {
  process.loadEnvFile?.(".env.local");
  process.loadEnvFile?.(".env");
}

async function readSeedData() {
  const filePath = resolve(process.cwd(), "data/coaches-seed.json");
  const file = await readFile(filePath, "utf8");
  return JSON.parse(file) as SeedCoachRecord[];
}

function buildEmbeddingText(coach: SeedCoachRecord) {
  return [
    coach.name,
    coach.certLevel,
    [coach.locationCity, coach.locationCountry].filter(Boolean).join(", "),
    coach.specializations.join(", "),
    coach.languages.join(", "),
    coach.bio ?? "",
  ]
    .filter(Boolean)
    .join(" | ");
}

async function generateEmbedding(
  text: string,
  inputType: "search_document" | "search_query",
) {
  const apiKey = process.env.COHERE_API_KEY;

  if (!apiKey) {
    throw new Error("COHERE_API_KEY is not configured");
  }

  const response = await fetch("https://api.cohere.ai/v1/embed", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "embed-multilingual-v3.0",
      texts: [text],
      input_type: inputType,
      embedding_types: ["float"],
    }),
  });

  const payload = (await response.json()) as {
    embeddings?: { float?: number[][] } | number[][];
    message?: string;
  };

  if (!response.ok) {
    throw new Error(payload.message ?? "Cohere request failed");
  }

  const embedding =
    Array.isArray(payload.embeddings) && Array.isArray(payload.embeddings[0])
      ? payload.embeddings[0]
      : payload.embeddings &&
          !Array.isArray(payload.embeddings) &&
          Array.isArray(payload.embeddings.float?.[0])
        ? payload.embeddings.float[0]
        : null;

  if (!embedding || embedding.length !== 1024) {
    throw new Error("Unexpected embedding dimension returned by Cohere");
  }

  return embedding;
}

async function main() {
  loadEnvFiles();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.",
    );
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const seedData = await readSeedData();

  for (const [index, coach] of seedData.entries()) {
    const { error: upsertError } = await supabase.from("coaches").upsert({
      id: coach.id,
      user_id: coach.userId,
      chapter_id: coach.chapterId,
      name: coach.name,
      email: coach.email,
      phone: coach.phone,
      photo_url: coach.photoUrl,
      cert_level: coach.certLevel,
      location_city: coach.locationCity,
      location_country: coach.locationCountry,
      location_lat: coach.locationLat,
      location_lng: coach.locationLng,
      bio: coach.bio,
      specializations: coach.specializations,
      languages: coach.languages,
      website: coach.website,
      linkedin: coach.linkedin,
      credly_badge_url: coach.credlyBadgeUrl,
      approved: coach.approved,
      created_at: coach.createdAt,
      updated_at: coach.updatedAt,
      last_approved_at: coach.lastApprovedAt,
      rejection_reason: coach.rejectionReason,
      rejected_at: coach.rejectedAt,
    });

    if (upsertError) {
      throw new Error(`Failed to upsert ${coach.name}: ${upsertError.message}`);
    }

    const embedding = await generateEmbedding(
      buildEmbeddingText(coach),
      "search_document",
    );
    const embeddingLiteral = `[${embedding.join(",")}]`;
    const { error: embedError } = await supabase.rpc("set_coach_embedding", {
      target_coach_id: coach.id,
      embedding_literal: embeddingLiteral,
    });

    if (embedError) {
      throw new Error(`Failed to store embedding for ${coach.name}: ${embedError.message}`);
    }

    console.log(`Embedded coach ${index + 1}/${seedData.length}: ${coach.name}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
