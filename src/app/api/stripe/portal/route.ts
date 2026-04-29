// src/app/api/stripe/portal/route.ts

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

export async function POST() {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: user.id },
    select: { stripeCustomerId: true },
  });

  if (!profile?.stripeCustomerId) {
    return NextResponse.json({ error: "No Stripe customer" }, { status: 400 });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/lt/dashboard`,
  });

  return NextResponse.json({ url: session.url });
}