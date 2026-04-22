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

    if (!planSlug) {
      return jsonNoStore({ error: "Missing planSlug" }, { status: 400 });
    }

    if (planSlug !== "free-trial") {
      return jsonNoStore(
        {
          error:
            "Apmokėjimai dar neįjungti. Kol kas galite naudoti tik Free Trial.",
        },
        { status: 409 },
      );
    }

    const plan = await prisma.plan.findUnique({
      where: { slug: planSlug },
      select: {
        id: true,
        slug: true,
        name: true,
        isTrial: true,
        trialDays: true,
      },
    });

    if (!plan) {
      return jsonNoStore({ error: "Plan not found" }, { status: 404 });
    }

    const now = new Date();
    const trialEndsAt =
      plan.isTrial && typeof plan.trialDays === "number"
        ? new Date(now.getTime() + plan.trialDays * 24 * 60 * 60 * 1000)
        : null;

    const providerProfile = await prisma.providerProfile.upsert({
      where: { userId: user.id },
      update: {
        planId: plan.id,
        isApproved: true,
        trialEndsAt,
      },
      create: {
        userId: user.id,
        planId: plan.id,
        isApproved: true,
        trialEndsAt,
      },
      select: {
        id: true,
        isApproved: true,
        planId: true,
        trialEndsAt: true,
      },
    });

    await auditLog({
      action: "PLAN_CHOOSE",
      entity: "ProviderProfile",
      entityId: providerProfile.id,
      userId: user.id,
      ip,
      userAgent: req.headers.get("user-agent") ?? null,
      metadata: {
        planSlug: plan.slug,
        planName: plan.name,
        autoApproved: true,
        trialEndsAt: providerProfile.trialEndsAt,
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