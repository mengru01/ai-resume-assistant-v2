import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing Stripe webhook secret." }, { status: 500 });
  }

  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");
  const stripe = getStripe();

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid webhook signature.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId ?? session.client_reference_id ?? undefined;
    const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;

    if (userId && customerId && session.payment_status === "paid") {
      await prisma.user.update({
        where: { id: userId },
        data: {
          stripeCustomerId: customerId,
          stripeCheckoutSession: session.id,
          hasProAccess: true
        }
      });
    }
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object as Stripe.PaymentIntent;
    const userId = intent.metadata.userId;
    const customerId = typeof intent.customer === "string" ? intent.customer : intent.customer?.id;

    if (userId) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          stripeCustomerId: customerId,
          hasProAccess: true
        }
      });
    }
  }

  return NextResponse.json({ received: true });
}
