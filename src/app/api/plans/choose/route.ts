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

function isAllowedPlanInBetaMode(user: { role: "USER" | "ADMIN"; betaAccess: boolean }, planSlug: string) {
  if (user.role === "ADMIN") return true;
  if (planSlug === "demo") return true;
  if (planSlug === "beta") return Boolean(user.betaAccess);
  return false; // basic/premium blocked in beta mode
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

    //  BETA režimas: demo visiems, beta tik betaAccess, basic/premium coming soon
    if (betaOnly) {
      if (!isAllowedPlanInBetaMode(user, planSlug)) {
        return jsonNoStore(
          { error: "Šiuo metu galimas tik Demo planas. Beta planas – tik pakviestiems testuotojams." },
          { status: 409 },
        );
      }
    } else {
      // Ateity: jei lifetimeFree -> galima duoti beta (arba demo)
      // Kol kas basic/premium vistiek gali būti išjungti UI
      if (planSlug === "basic" || planSlug === "premium") {
        return jsonNoStore({ error: "Apmokėjimai dar neįjungti (coming soon)." }, { status: 409 });
      }
    }

    const plan = await prisma.plan.findUnique({
      where: { slug: planSlug },
      select: { id: true, slug: true, name: true },
    });

    if (!plan) return jsonNoStore({ error: "Plan not found" }, { status: 404 });

    //  ensure ProviderProfile exists
    const profile = await prisma.providerProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
      select: { id: true },
    });

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

    return jsonNoStore({ ok: true, plan: { slug: plan.slug, name: plan.name } }, { status: 200 });
  });
}