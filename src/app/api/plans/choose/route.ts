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

function isAllowedInBeta(params: {
  betaOnly: boolean;
  planSlug: string;
  user: { role: "USER" | "ADMIN"; betaAccess?: boolean };
}) {
  const { betaOnly, planSlug, user } = params;

  if (!betaOnly) return true; // jei ne beta režimas – ateity galėsi leist visus

  if (user.role === "ADMIN") return true;

  // ✅ visiems leidžiam demo
  if (planSlug === "demo") return true;

  // ✅ beta planas tik betaAccess
  if (planSlug === "beta") return Boolean(user.betaAccess);

  // ❌ basic/premium ir pan – užblokuoti beta režime
  return false;
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
    if (!user) return jsonNoStore({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as Body;
    const planSlug = typeof body.planSlug === "string" ? body.planSlug.trim() : "";
    if (!planSlug) return jsonNoStore({ error: "Missing planSlug" }, { status: 400 });

    const betaOnly = process.env.BETA_ONLY === "true";

    if (!isAllowedInBeta({ betaOnly, planSlug, user })) {
      return jsonNoStore(
        {
          error:
            planSlug === "beta"
              ? "Beta planas prieinamas tik atrinktiems testuotojams."
              : "Šiuo metu galimas tik Demo planas (testavimas).",
        },
        { status: 409 },
      );
    }

    const plan = await prisma.plan.findUnique({
      where: { slug: planSlug },
      select: { id: true, slug: true, name: true },
    });

    if (!plan) return jsonNoStore({ error: "Plan not found" }, { status: 404 });

    // ✅ užtikrinam, kad ProviderProfile egzistuoja
    const profile = await prisma.providerProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, planId: plan.id },
      select: { id: true },
    });

    // jei jau egzistuoja – atnaujinam planą
    await prisma.providerProfile.update({
      where: { id: profile.id },
      data: { planId: plan.id },
    });

    await auditLog({
      action: "PLAN_CHOOSE",
      entity: "ProviderProfile",
      entityId: profile.id,
      userId: user.id,
      ip,
      userAgent: req.headers.get("user-agent") ?? null,
      metadata: { planSlug: plan.slug, planName: plan.name, betaOnly },
    });

    return jsonNoStore(
      { ok: true, plan: { slug: plan.slug, name: plan.name } },
      { status: 200 },
    );
  });
}