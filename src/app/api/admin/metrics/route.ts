// src/app/api/admin/metrics/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { getClientIp, rateLimitOrThrow } from "@/lib/rateLimit";
import { withApi } from "@/lib/withApi";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return withApi(req, "GET /api/admin/metrics", async () => {
    const ip = getClientIp(req);

    // rate limit: admin metrics neturi būti spaminamas
    await rateLimitOrThrow({
      key: `admin:metrics:${ip}`,
      limit: 30,
      windowMs: 60_000,
    });

    const { user, response } = await requireAdmin();
    if (response || !user) {
      return response ?? NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [
      usersTotal,
      providersApproved,
      servicesTotal,
      servicesActive,
      servicesDeleted,
      providerRequestsPending,
      auditLast24h,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.providerProfile.count({ where: { isApproved: true } }),
      prisma.serviceListing.count({ where: { deletedAt: null } }),
      prisma.serviceListing.count({ where: { deletedAt: null, isActive: true } }),
      prisma.serviceListing.count({ where: { deletedAt: { not: null } } }),
      prisma.providerRequest.count({ where: { status: "PENDING" } }),
      prisma.auditLog.count({
        where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      }),
    ]);

    const res = NextResponse.json({
      usersTotal,
      providersApproved,
      servicesTotal,
      servicesActive,
      servicesDeleted,
      providerRequestsPending,
      auditLast24h,
    });

    // no-store: admin metrics neturi būti cache’inami
    res.headers.set("Cache-Control", "no-store");
    return res;
  });
}