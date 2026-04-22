// src/app/api/admin/providers/plan/route.ts
import { revalidatePath } from "next/cache";
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

function revalidatePlanRelatedPages() {
  revalidatePath("/lt");
  revalidatePath("/en");
  revalidatePath("/no");

  revalidatePath("/lt/dashboard");
  revalidatePath("/en/dashboard");
  revalidatePath("/no/dashboard");

  revalidatePath("/lt/admin/providers");
  revalidatePath("/en/admin/providers");
  revalidatePath("/no/admin/providers");
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

    if (body.planSlug) {
      selectedPlan = await prisma.plan.findUnique({
        where: { slug: body.planSlug },
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

    const updated = await prisma.$transaction(async (tx) => {
      const profile = await tx.providerProfile.upsert({
        where: { userId: body.userId! },
        update: {
          planId,
          trialEndsAt,
        },
        create: {
          userId: body.userId!,
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
          plan: {
            select: {
              id: true,
              slug: true,
              name: true,
            },
          },
        },
      });

      await tx.serviceListing.updateMany({
        where: {
          userId: body.userId!,
          deletedAt: null,
        },
        data: {
          planId,
        },
      });

      return profile;
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
        planSlug: body.planSlug ?? null,
        trialEndsAt,
        syncedServiceListingsPlanId: true,
      },
    });

    revalidatePlanRelatedPages();

    return jsonNoStore(
      {
        ok: true,
        profile: updated,
      },
      { status: 200 },
    );
  });
}