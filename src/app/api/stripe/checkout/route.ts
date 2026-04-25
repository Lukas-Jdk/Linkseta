// src/app/api/stripe/checkout/route.ts
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { requireCsrf } from "@/lib/csrf";
import { getClientIp, rateLimitOrThrow } from "@/lib/rateLimit";
import { withApi } from "@/lib/withApi";

export const dynamic = "force-dynamic";

type PlanSlug = "basic" | "premium";

type Body = {
  planSlug?: PlanSlug;
  locale?: string;
};

function jsonNoStore(data: unknown, init?: ResponseInit) {
  const res = NextResponse.json(data, init);
  res.headers.set("Cache-Control", "no-store");
  return res;
}

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key);
}

function getPriceId(planSlug: PlanSlug) {
  if (planSlug === "basic") return process.env.STRIPE_PRICE_BASIC;
  if (planSlug === "premium") return process.env.STRIPE_PRICE_PREMIUM;
  return null;
}

function safeLocale(locale: unknown) {
  if (locale === "en" || locale === "no" || locale === "lt") return locale;
  return "lt";
}

function isActiveStripeStatus(status: string | null) {
  return status === "active" || status === "trialing" || status === "past_due";
}

export async function POST(req: Request) {
  return withApi(req, "POST /api/stripe/checkout", async () => {
    const csrfErr = requireCsrf(req);
    if (csrfErr) return csrfErr;

    const ip = getClientIp(req);

    await rateLimitOrThrow({
      key: `stripe:checkout:${ip}`,
      limit: 20,
      windowMs: 60_000,
    });

    const user = await getAuthUser();

    if (!user) {
      return jsonNoStore({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as Body;

    const planSlug = body.planSlug;
    const locale = safeLocale(body.locale);

    if (planSlug !== "basic" && planSlug !== "premium") {
      return jsonNoStore({ error: "Invalid plan" }, { status: 400 });
    }

    const profile = await prisma.providerProfile.findUnique({
      where: { userId: user.id },
      select: {
        stripeSubscriptionId: true,
        subscriptionStatus: true,
      },
    });

    if (
      profile?.stripeSubscriptionId &&
      isActiveStripeStatus(profile.subscriptionStatus)
    ) {
      return jsonNoStore(
        {
          error:
            "Jau turite aktyvią prenumeratą. Norėdami keisti planą, susisiekite su administracija.",
        },
        { status: 409 },
      );
    }

    const priceId = getPriceId(planSlug);

    if (!priceId) {
      return jsonNoStore(
        { error: `Missing Stripe price id for ${planSlug}` },
        { status: 500 },
      );
    }

    const origin = new URL(req.url).origin;
    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer_email: user.email,
      client_reference_id: user.id,
      metadata: {
        userId: user.id,
        planSlug,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          planSlug,
        },
      },
      allow_promotion_codes: true,
      success_url: `${origin}/${locale}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/${locale}/tapti-teikeju?checkout=cancelled`,
    });

    if (!session.url) {
      return jsonNoStore(
        { error: "Stripe checkout URL not created" },
        { status: 500 },
      );
    }

    return jsonNoStore({ ok: true, url: session.url }, { status: 200 });
  });
}