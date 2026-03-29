import { getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Allow both coaches (to check their own payments) and chapter_admins (to see all payments)
  if (user.role !== "coach" && user.role !== "chapter_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const cacheFilePath = join(process.cwd(), "data", "payments_cache.json");
    const fileContent = await readFile(cacheFilePath, "utf-8");
    const payments = JSON.parse(fileContent);

    return NextResponse.json(payments);
  } catch {
    return NextResponse.json([]);
  }
}
