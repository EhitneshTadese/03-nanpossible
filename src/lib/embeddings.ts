const COHERE_EMBEDDING_DIMENSION = 1024;
const DEFAULT_COHERE_EMBEDDING_MODEL = "embed-multilingual-v3.0";

type CohereEmbeddingResponse = {
  embeddings?:
    | number[][]
    | {
        float?: number[][];
      };
  message?: string;
};

function extractEmbedding(payload: CohereEmbeddingResponse) {
  if (Array.isArray(payload.embeddings) && Array.isArray(payload.embeddings[0])) {
    return payload.embeddings[0];
  }

  if (
    payload.embeddings &&
    !Array.isArray(payload.embeddings) &&
    Array.isArray(payload.embeddings.float?.[0])
  ) {
    return payload.embeddings.float[0];
  }

  return null;
}

export function getEmbeddingDimension() {
  return COHERE_EMBEDDING_DIMENSION;
}

export async function generateEmbedding(
  text: string,
  inputType: "search_document" | "search_query",
) {
  const apiKey = process.env.COHERE_API_KEY;
  const model =
    process.env.COHERE_EMBEDDING_MODEL?.trim() ||
    DEFAULT_COHERE_EMBEDDING_MODEL;

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
      model,
      texts: [text],
      input_type: inputType,
      embedding_types: ["float"],
    }),
  });

  const payload = (await response.json()) as CohereEmbeddingResponse;

  if (!response.ok) {
    throw new Error(payload.message ?? "Cohere embedding request failed");
  }

  const embedding = extractEmbedding(payload);

  if (!embedding || embedding.length !== COHERE_EMBEDDING_DIMENSION) {
    throw new Error("Unexpected embedding dimension returned by Cohere");
  }

  return embedding;
}
