// src/app/api/stripe/webhook/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

function toDateFromUnix(value?: number | null) {
  if (!value) return null;
  return new Date(value * 1000);
}

function getCurrentPeriodEnd(subscription: Stripe.Subscription) {
  return toDateFromUnix(
    (subscription as any).items?.data?.[0]?.current_period_end,
  );
}

async function getSubscription(subscriptionId: string) {
  return stripe.subscriptions.retrieve(subscriptionId);
}

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const sig = headersList.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    console.error("Webhook signature error:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const userId = session.metadata?.userId;
    const planSlug = session.metadata?.planSlug;

    if (!userId || !planSlug) {
      console.error("Missing Stripe metadata", { userId, planSlug });
      return NextResponse.json({ received: true });
    }

    const plan = await prisma.plan.findUnique({
      where: { slug: planSlug },
      select: { id: true, slug: true, name: true },
    });

    if (!plan) {
      console.error("Plan not found", { planSlug });
      return NextResponse.json({ received: true });
    }

    const stripeCustomerId =
      typeof session.customer === "string" ? session.customer : null;

    const stripeSubscriptionId =
      typeof session.subscription === "string" ? session.subscription : null;

    let subscriptionStatus: string | null = null;
    let currentPeriodEnd: Date | null = null;

    if (stripeSubscriptionId) {
      const subscription = await getSubscription(stripeSubscriptionId);

      subscriptionStatus = subscription.status;
      currentPeriodEnd = getCurrentPeriodEnd(subscription);
    }

    await prisma.providerProfile.upsert({
      where: { userId },
      update: {
        planId: plan.id,
        isApproved: true,
        trialEndsAt: null,
        stripeCustomerId,
        stripeSubscriptionId,
        subscriptionStatus,
        currentPeriodEnd,
      },
      create: {
        userId,
        planId: plan.id,
        isApproved: true,
        trialEndsAt: null,
        stripeCustomerId,
        stripeSubscriptionId,
        subscriptionStatus,
        currentPeriodEnd,
      },
    });

    console.log("✅ Stripe payment completed. Plan activated:", {
      userId,
      planSlug,
      stripeCustomerId,
      stripeSubscriptionId,
      subscriptionStatus,
      currentPeriodEnd,
    });
  }

  if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object as Stripe.Subscription;

    const stripeSubscriptionId = subscription.id;
    const subscriptionStatus = subscription.status;
    const currentPeriodEnd = getCurrentPeriodEnd(subscription);

    await prisma.providerProfile.updateMany({
      where: { stripeSubscriptionId },
      data: {
        subscriptionStatus,
        currentPeriodEnd,
      },
    });

    console.log("✅ Stripe subscription updated:", {
      stripeSubscriptionId,
      subscriptionStatus,
      currentPeriodEnd,
    });
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;

    await prisma.providerProfile.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        subscriptionStatus: "canceled",
        currentPeriodEnd: null,
      },
    });

    console.log("⚠️ Stripe subscription canceled:", {
      stripeSubscriptionId: subscription.id,
    });
  }

  return NextResponse.json({ received: true });
}