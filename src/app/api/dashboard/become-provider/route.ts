// src/app/api/dashboard/become-provider/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getClientIp, rateLimitOrThrow } from "@/lib/rateLimit";
import { auditLog } from "@/lib/audit";
import { withApi } from "@/lib/withApi";
import { requireCsrf } from "@/lib/csrf";

type Body = {
  planSlug?: "demo" | "basic" | "premium";
};

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return withApi(req, "POST /api/dashboard/become-provider", async () => {
    const csrfErr = requireCsrf(req);
    if (csrfErr) return csrfErr;

    const ip = getClientIp(req);

    await rateLimitOrThrow({
      key: `dashboard:become-provider:${ip}`,
      limit: 15,
      windowMs: 60_000,
    });

    const { user, response } = await requireUser();
    if (response || !user) {
      return response ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: Body = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const planSlug = body.planSlug ?? "demo";

    const plan = await prisma.plan.findUnique({
      where: { slug: planSlug },
      select: { id: true, slug: true },
    });

    if (!plan) {
      return NextResponse.json({ error: "Nerastas planas" }, { status: 400 });
    }

    await prisma.providerProfile.upsert({
      where: { userId: user.id },
      update: { isApproved: true },
      create: { userId: user.id, isApproved: true },
    });

    await auditLog({
      action: "PROVIDER_PROFILE_APPROVE_DEMO",
      entity: "ProviderProfile",
      entityId: user.id,
      userId: user.id,
      ip,
      userAgent: req.headers.get("user-agent") ?? null,
      metadata: { planSlug: plan.slug },
    });

    return NextResponse.json({ ok: true, planSlug: plan.slug });
  });
}