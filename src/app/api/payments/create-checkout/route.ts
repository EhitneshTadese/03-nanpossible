import { getCurrentUser } from "@/lib/auth";
import { buildAbsoluteUrl } from "@/lib/auth";
import { NextResponse } from "next/server";
import Stripe from "stripe";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key);
}

export async function POST(req: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "coach") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { dueId, description, amount, reason, chapter } = body;

    const appUrl = await buildAbsoluteUrl("");

    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: description,
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/api/payments/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/account/dues`,
      metadata: {
        dueId,
        userId: user.id,
        userName: user.name,
        chapterId: user.chapterId || "",
        chapterName: chapter,
        userRole: user.role,
        reason,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
