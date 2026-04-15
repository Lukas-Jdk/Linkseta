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

    let planId: string | null = null;
    let selectedPlan:
      | {
          id: string;
          slug: string;
          name: string;
        }
      | null = null;

    if (body.planSlug) {
      selectedPlan = await prisma.plan.findUnique({
        where: { slug: body.planSlug },
        select: {
          id: true,
          slug: true,
          name: true,
        },
      });

      if (!selectedPlan) {
        return jsonNoStore({ error: "Plan not found" }, { status: 404 });
      }

      planId = selectedPlan.id;
    }

    const updated = await prisma.providerProfile.upsert({
      where: { userId: body.userId },
      update: {
        planId,
      },
      create: {
        userId: body.userId,
        isApproved: false,
        planId,
      },
      select: {
        userId: true,
        isApproved: true,
        lifetimeFree: true,
        lifetimeFreeGrantedAt: true,
        lifetimeFreeGrantedBy: true,
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
        planSlug: body.planSlug ?? null,
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