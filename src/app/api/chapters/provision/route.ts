import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { provisionChapter } from "@/lib/chapters-admin";

export async function POST(request: Request) {
  const viewer = await getCurrentUser();

  if (!viewer) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (viewer.role !== "platform_admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const result = await provisionChapter({
    name: String(body.name ?? ""),
    subdomain: String(body.subdomain ?? ""),
    region: String(body.region ?? ""),
    country: String(body.country ?? ""),
    language: String(body.language ?? ""),
    leadEmail: String(body.lead_email ?? body.leadEmail ?? ""),
    contactEmail: String(body.contact_email ?? body.contactEmail ?? ""),
    contactPhone: String(body.contact_phone ?? body.contactPhone ?? ""),
    description: String(body.description ?? ""),
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error,
        message: result.message,
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    success: true,
    chapter_id: result.chapterId,
    url: result.url,
    warning: result.warning,
  });
}
