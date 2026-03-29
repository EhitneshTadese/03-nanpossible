import { NextResponse } from "next/server";
import { generateContentPageAudioById } from "@/lib/audio";

function isAuthorized(request: Request) {
  const configuredSecret = process.env.AUDIO_GENERATION_SECRET?.trim();
  const requestSecret = request.headers.get("x-wial-audio-secret")?.trim();

  return Boolean(configuredSecret && requestSecret && configuredSecret === requestSecret);
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        page_id?: string;
      }
    | null;
  const pageId = String(body?.page_id ?? "").trim();

  if (!pageId) {
    return NextResponse.json({ error: "missing-page-id" }, { status: 400 });
  }

  try {
    const result = await generateContentPageAudioById(pageId);

    return NextResponse.json({
      success: true,
      audio_url: result.audioUrl,
      audio_duration_seconds: result.durationSeconds,
    });
  } catch (error) {
    console.error("WIAL audio generation failed", {
      pageId,
      error,
    });

    return NextResponse.json({ error: "audio-generation-failed" }, { status: 500 });
  }
}
