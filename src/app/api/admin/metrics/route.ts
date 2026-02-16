// src/app/api/admin/metrics/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { getClientIp, rateLimitOrThrow } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const ip = getClientIp(req);
    rateLimitOrThrow({ key: `admin:metrics:${ip}`, limit: 30, windowMs: 60_000 });

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

    return NextResponse.json({
      usersTotal,
      providersApproved,
      servicesTotal,
      servicesActive,
      servicesDeleted,
      providerRequestsPending,
      auditLast24h,
    });
  } catch (e: any) {
    if (e instanceof Response) return e;
    console.error("GET /api/admin/metrics error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}