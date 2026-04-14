// src/app/api/admin/providers/lifetime-free/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { requireCsrf } from "@/lib/csrf";
import { getClientIp, rateLimitOrThrow } from "@/lib/rateLimit";
import { auditLog } from "@/lib/audit";
import { withApi } from "@/lib/withApi";
import { jsonNoStore } from "@/lib/http";

type Body = {
  userId?: string;
  enabled?: boolean;
};

export const dynamic = "force-dynamic";

function isCuidLike(id: string) {
  return typeof id === "string" && id.length >= 20 && id.length <= 40;
}

export async function POST(req: Request) {
  return withApi(req, "POST /api/admin/providers/lifetime-free", async () => {
    const csrfErr = requireCsrf(req);
    if (csrfErr) return csrfErr;

    const ip = getClientIp(req);

    await rateLimitOrThrow({
      key: `admin:providers:lifetime-free:${ip}`,
      limit: 30,
      windowMs: 60_000,
    });

    const { response, user } = await requireAdmin();
    if (response || !user) {
      return response ?? jsonNoStore({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await req.json().catch(() => null)) as Body | null;

    if (!body?.userId || typeof body.enabled !== "boolean") {
      return jsonNoStore({ error: "Invalid payload" }, { status: 400 });
    }

    if (!isCuidLike(body.userId)) {
      return jsonNoStore({ error: "Invalid userId" }, { status: 400 });
    }

    const updated = await prisma.providerProfile.upsert({
      where: { userId: body.userId },
      update: {
        lifetimeFree: body.enabled,
        lifetimeFreeGrantedAt: body.enabled ? new Date() : null,
        lifetimeFreeGrantedBy: body.enabled ? user.id : null,
      },
      create: {
        userId: body.userId,
        isApproved: false,
        lifetimeFree: body.enabled,
        lifetimeFreeGrantedAt: body.enabled ? new Date() : null,
        lifetimeFreeGrantedBy: body.enabled ? user.id : null,
      },
      select: {
        userId: true,
        isApproved: true,
        lifetimeFree: true,
        lifetimeFreeGrantedAt: true,
        lifetimeFreeGrantedBy: true,
      },
    });

    await auditLog({
      action: body.enabled
        ? "ADMIN_PROVIDER_LIFETIME_FREE_ENABLE"
        : "ADMIN_PROVIDER_LIFETIME_FREE_DISABLE",
      entity: "ProviderProfile",
      entityId: updated.userId,
      userId: user.id,
      ip,
      userAgent: req.headers.get("user-agent") ?? null,
      metadata: {
        enabled: body.enabled,
        targetUserId: body.userId,
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