// src/app/api/admin/providers/plan/route.ts
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { requireCsrf } from "@/lib/csrf";
import { getClientIp, rateLimitOrThrow } from "@/lib/rateLimit";
import { auditLog } from "@/lib/audit";
import { withApi } from "@/lib/withApi";
import { jsonNoStore } from "@/lib/http";

type Body = {
  userId?: string;
  planSlug?: string | null;
};

export const dynamic = "force-dynamic";

function isCuidLike(id: string) {
  return typeof id === "string" && id.length >= 20 && id.length <= 40;
}

export async function POST(req: Request) {
  return withApi(req, "POST /api/admin/providers/plan", async () => {
    const csrfErr = requireCsrf(req);
    if (csrfErr) return csrfErr;

    const ip = getClientIp(req);

    await rateLimitOrThrow({
      key: `admin:providers:plan:${ip}`,
      limit: 30,
      windowMs: 60_000,
    });

    const { response, user } = await requireAdmin();

    if (response || !user) {
      return response ?? jsonNoStore({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await req.json().catch(() => null)) as Body | null;

    if (!body?.userId || !isCuidLike(body.userId)) {
      return jsonNoStore({ error: "Invalid userId" }, { status: 400 });
    }

    const planSlug =
      typeof body.planSlug === "string" && body.planSlug.trim()
        ? body.planSlug.trim()
        : null;

    let planId: string | null = null;
    let selectedPlan:
      | {
          id: string;
          slug: string;
          name: string;
          isTrial: boolean;
          trialDays: number | null;
        }
      | null = null;

    if (planSlug) {
      selectedPlan = await prisma.plan.findUnique({
        where: { slug: planSlug },
        select: {
          id: true,
          slug: true,
          name: true,
          isTrial: true,
          trialDays: true,
        },
      });

      if (!selectedPlan) {
        return jsonNoStore({ error: "Plan not found" }, { status: 404 });
      }

      planId = selectedPlan.id;
    }

    const trialEndsAt =
      selectedPlan?.isTrial && typeof selectedPlan.trialDays === "number"
        ? new Date(Date.now() + selectedPlan.trialDays * 24 * 60 * 60 * 1000)
        : null;

    const updated = await prisma.providerProfile.upsert({
      where: { userId: body.userId },
      update: planSlug
        ? {
            planId,
            trialEndsAt,
          }
        : {
            planId: null,
            trialEndsAt: null,
            stripeSubscriptionId: null,
            subscriptionStatus: null,
            currentPeriodEnd: null,
          },
      create: {
        userId: body.userId,
        isApproved: false,
        planId,
        trialEndsAt,
      },
      select: {
        userId: true,
        isApproved: true,
        lifetimeFree: true,
        lifetimeFreeGrantedAt: true,
        lifetimeFreeGrantedBy: true,
        trialEndsAt: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        subscriptionStatus: true,
        currentPeriodEnd: true,
        plan: {
          select: {
            id: true,
            slug: true,
            name: true,
          },
        },
      },
    });

    await auditLog({
      action: "ADMIN_PROVIDER_PLAN_SET",
      entity: "ProviderProfile",
      entityId: updated.userId,
      userId: user.id,
      ip,
      userAgent: req.headers.get("user-agent") ?? null,
      metadata: {
        targetUserId: body.userId,
        planSlug,
        trialEndsAt,
        stripeSubscriptionCleared: !planSlug,
      },
    });

    return jsonNoStore(
      {
        ok: true,
        profile: updated,
      },
      { status: 200 },
    );
  });
}