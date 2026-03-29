import { headers } from "next/headers";
import type { ChapterContextValue } from "@/lib/types";

export async function getChapterFromHeaders(): Promise<ChapterContextValue> {
  const headerStore = await headers();
  const id = headerStore.get("x-chapter-id");
  const subdomain = headerStore.get("x-chapter-subdomain");
  const name = headerStore.get("x-chapter-name");
  const language = headerStore.get("x-chapter-language");

  if (!id || !subdomain || !name) {
    return null;
  }

  return {
    id,
    subdomain,
    name,
    language: language ?? "en",
  };
}
