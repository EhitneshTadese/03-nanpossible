import { getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";

const HARDCODED_DUES = [
  {
    id: "dues-001",
    description: "Annual Membership Fee",
    amount: 150,
    reason: "Annual dues",
    chapter: "WIAL North America",
    dueDate: "2026-04-15",
  },
  {
    id: "dues-002",
    description: "Certification Renewal – CALC",
    amount: 75,
    reason: "Certification renewal",
    chapter: "WIAL North America",
    dueDate: "2026-04-30",
  },
  {
    id: "dues-003",
    description: "Workshop Registration Fee",
    amount: 50,
    reason: "Event registration",
    chapter: "WIAL North America",
    dueDate: "2026-05-01",
  },
];

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "coach") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(HARDCODED_DUES);
}
