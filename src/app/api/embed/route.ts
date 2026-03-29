import { NextResponse } from "next/server";
import { embedCoachById, embedPendingApprovedCoaches } from "@/lib/coach-embeddings";
import { getCoachByIdForAdmin } from "@/lib/coaches";
import { getCurrentViewer } from "@/lib/auth";

type EmbedRequestBody = {
  coach_id?: string;
  batch?: boolean;
};

export async function POST(request: Request) {
  const viewer = await getCurrentViewer();

  if (!viewer) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const body = (await request.json()) as EmbedRequestBody;

  if (body.batch) {
    if (viewer.role !== "platform_admin") {
      return NextResponse.json(
        { error: "Only platform admins can trigger batch embeddings." },
        { status: 403 },
      );
    }

    try {
      const embedded = await embedPendingApprovedCoaches();

      return NextResponse.json({
        embedded,
        count: embedded.length,
      });
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Batch embedding failed.",
        },
        { status: 500 },
      );
    }
  }

  if (!body.coach_id) {
    return NextResponse.json(
      { error: "coach_id is required when batch=false." },
      { status: 400 },
    );
  }

  const coach = await getCoachByIdForAdmin(body.coach_id);

  if (!coach) {
    return NextResponse.json({ error: "Coach not found." }, { status: 404 });
  }

  if (
    viewer.role !== "platform_admin" &&
    !(
      viewer.role === "chapter_admin" &&
      viewer.chapterId &&
      coach.chapterId === viewer.chapterId
    )
  ) {
    return NextResponse.json(
      { error: "You do not have access to embed this coach." },
      { status: 403 },
    );
  }

  try {
    const embedded = await embedCoachById(body.coach_id);
    return NextResponse.json(embedded);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Coach embedding failed.",
      },
      { status: 500 },
    );
  }
}
