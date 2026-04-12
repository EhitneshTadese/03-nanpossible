import { getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key);
}

type PaymentRecord = {
  id: string;
  stripeSessionId: string;
  dueId: string;
  userId: string;
  userName: string;
  userRole: string;
  chapterId: string;
  chapterName: string;
  amount: number;
  currency: string;
  reason: string;
  status: string;
  paidAt: string;
};

export async function GET(req: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const url = new URL(req.url);
  const sessionId = url.searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.redirect(new URL("/account/dues?error=no-session", req.url));
  }

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return NextResponse.redirect(new URL("/account/dues?error=payment-failed", req.url));
    }

    const metadata = session.metadata as Record<string, string>;
    const paymentRecord: PaymentRecord = {
      id: randomUUID(),
      stripeSessionId: sessionId,
      dueId: metadata.dueId || "",
      userId: metadata.userId || user.id,
      userName: metadata.userName || user.name,
      userRole: metadata.userRole || user.role,
      chapterId: metadata.chapterId || user.chapterId || "",
      chapterName: metadata.chapterName || "",
      amount: Math.round((session.amount_total || 0) / 100),
      currency: session.currency?.toUpperCase() || "USD",
      reason: metadata.reason || "",
      status: "paid",
      paidAt: new Date().toISOString(),
    };

    // Read, update, and write payments cache
    const cacheFilePath = join(process.cwd(), "data", "payments_cache.json");
    let payments: PaymentRecord[] = [];

    try {
      const fileContent = await readFile(cacheFilePath, "utf-8");
      payments = JSON.parse(fileContent);
    } catch {
      payments = [];
    }

    payments.push(paymentRecord);
    await writeFile(cacheFilePath, JSON.stringify(payments, null, 2));

    return NextResponse.redirect(
      new URL(`/account/dues?payment=success&id=${paymentRecord.id}`, req.url)
    );
  } catch (error) {
    console.error("Payment success error:", error);
    return NextResponse.redirect(
      new URL("/account/dues?error=verification-failed", req.url)
    );
  }
}
