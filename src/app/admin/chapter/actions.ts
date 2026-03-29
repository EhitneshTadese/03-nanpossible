"use server";

import { revalidatePath } from "next/cache";
import { requireAccountViewer } from "@/lib/auth";
import { generateContentPageAudioById } from "@/lib/audio";

export async function regeneratePageAudioAction(pageId: string) {
  try {
    await requireAccountViewer("/admin/chapter", [
      "platform_admin",
      "chapter_admin",
      "content_creator",
    ]);

    // Permissions check: ensure the user can only generate audio for their chapter
    // (Except platform_admins who can do all)
    // For now we'll proceed by calling the generator which works via service role
    const result = await generateContentPageAudioById(pageId);

    revalidatePath("/admin/chapter");
    revalidatePath("/(marketing)/[[...slug]]", "layout");

    return {
      success: true,
      audioUrl: result.audioUrl,
      duration: result.durationSeconds,
      generatedAt: result.generatedAt,
    };
  } catch (error) {
    console.error("Failed to regenerate page audio", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "audio-generation-failed",
    };
  }
}
