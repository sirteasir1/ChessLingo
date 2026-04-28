import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-04-10",
});

export async function POST(req: NextRequest) {
  try {
    const { plan, userId, email } = await req.json();

    const priceId = plan === "annual"
      ? process.env.STRIPE_PRICE_ANNUAL!
      : process.env.STRIPE_PRICE_MONTHLY!;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { userId },
      success_url: `${process.env.NEXTAUTH_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}?canceled=true`,
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Stripe error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
