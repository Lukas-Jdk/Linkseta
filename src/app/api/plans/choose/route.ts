// src/app/api/plans/choose/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { requireCsrf } from "@/lib/csrf";
import { getClientIp, rateLimitOrThrow } from "@/lib/rateLimit";
import { withApi } from "@/lib/withApi";
import { auditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

type Body = { planSlug?: string };

function jsonNoStore(data: any, init?: ResponseInit) {
  const res = NextResponse.json(data, init);
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function POST(req: Request) {
  return withApi(req, "POST /api/plans/choose", async () => {
    const csrfErr = requireCsrf(req);
    if (csrfErr) return csrfErr;

    const ip = getClientIp(req);

    await rateLimitOrThrow({
      key: `plans:choose:${ip}`,
      limit: 20,
      windowMs: 60_000,
    });

    const user = await getAuthUser();

    if (!user) {
      return jsonNoStore({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as Body;
    const planSlug =
      typeof body.planSlug === "string" ? body.planSlug.trim() : "";

    if (planSlug !== "free-trial") {
      return jsonNoStore(
        { error: "Šį planą pasirinkite per apmokėjimo puslapį." },
        { status: 409 },
      );
    }

    const existingProfile = await prisma.providerProfile.findUnique({
      where: { userId: user.id },
      select: {
        id: true,
        trialEndsAt: true,
        stripeSubscriptionId: true,
        subscriptionStatus: true,
        lifetimeFree: true,
        plan: {
          select: {
            slug: true,
            isTrial: true,
          },
        },
      },
    });

    if (existingProfile?.lifetimeFree) {
      return jsonNoStore(
        { error: "Jums jau suteikta lifetime prieiga." },
        { status: 409 },
      );
    }

    if (existingProfile?.stripeSubscriptionId) {
      return jsonNoStore(
        { error: "Jūs jau turite aktyvią arba buvusią prenumeratą." },
        { status: 409 },
      );
    }

    if (existingProfile?.trialEndsAt) {
      return jsonNoStore(
        { error: "Free Trial galima aktyvuoti tik vieną kartą." },
        { status: 409 },
      );
    }

    const plan = await prisma.plan.findUnique({
      where: { slug: "free-trial" },
      select: {
        id: true,
        slug: true,
        name: true,
        isTrial: true,
        trialDays: true,
      },
    });

    if (!plan) {
      return jsonNoStore({ error: "Free Trial planas nerastas." }, { status: 404 });
    }

    const trialDays =
      plan.isTrial && typeof plan.trialDays === "number" && plan.trialDays > 0
        ? plan.trialDays
        : 30;

    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

    const providerProfile = await prisma.providerProfile.upsert({
      where: { userId: user.id },
      update: {
        planId: plan.id,
        isApproved: true,
        trialEndsAt,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        subscriptionStatus: null,
        currentPeriodEnd: null,
      },
      create: {
        userId: user.id,
        planId: plan.id,
        isApproved: true,
        trialEndsAt,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        subscriptionStatus: null,
        currentPeriodEnd: null,
      },
      select: {
        id: true,
        isApproved: true,
        planId: true,
        trialEndsAt: true,
      },
    });

    await auditLog({
      action: "PLAN_CHOOSE_FREE_TRIAL",
      entity: "ProviderProfile",
      entityId: providerProfile.id,
      userId: user.id,
      ip,
      userAgent: req.headers.get("user-agent") ?? null,
      metadata: {
        planSlug: plan.slug,
        planName: plan.name,
        autoApproved: true,
        trialDays,
        trialEndsAt: providerProfile.trialEndsAt,
        access: "premium_during_trial",
      },
    });

    return jsonNoStore(
      {
        ok: true,
        plan: { slug: plan.slug, name: plan.name },
        providerProfile: {
          id: providerProfile.id,
          isApproved: providerProfile.isApproved,
          trialEndsAt: providerProfile.trialEndsAt,
        },
      },
      { status: 200 },
    );
  });
}