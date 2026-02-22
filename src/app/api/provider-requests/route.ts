// src/app/api/provider-requests/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimitOrThrow } from "@/lib/rateLimit";
import { verifyRecaptchaV3 } from "@/lib/recaptcha";
import { auditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

function isEmail(x: unknown) {
  if (typeof x !== "string") return false;
  const s = x.trim().toLowerCase();
  if (s.length > 200) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function clampText(x: unknown, max: number) {
  if (typeof x !== "string") return null;
  const t = x.trim();
  return t ? t.slice(0, max) : null;
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req) || "unknown";

    await rateLimitOrThrow({
      key: `public:provider-requests:${ip}`,
      limit: 10,
      windowMs: 60_000,
    });

    const body = await req.json().catch(() => ({} as any));

    const website = clampText(body?.website, 200); // honeypot
    if (website) {
      // tyčia generinis atsakymas
      return NextResponse.json({ error: "Užklausa atmesta." }, { status: 400 });
    }

    const name = clampText(body?.name, 120);
    const emailRaw = typeof body?.email === "string" ? body.email.trim().toLowerCase() : null;
    const phone = clampText(body?.phone, 40);
    const cityId = typeof body?.cityId === "string" ? body.cityId : null;
    const categoryId = typeof body?.categoryId === "string" ? body.categoryId : null;
    const message = clampText(body?.message, 2000);

    if (!name || !emailRaw || !isEmail(emailRaw)) {
      return NextResponse.json({ error: "Neteisingas vardas arba el. paštas." }, { status: 400 });
    }

    const recaptchaToken = typeof body?.recaptchaToken === "string" ? body.recaptchaToken : null;
    if (!recaptchaToken) {
      return NextResponse.json(
        { error: "Nepavyko patvirtinti, kad esate žmogus. Bandykite dar kartą." },
        { status: 400 },
      );
    }

    const verify = await verifyRecaptchaV3({
      token: recaptchaToken,
      expectedAction: "provider_request",
      ip: ip === "unknown" ? null : ip,
    });

    if (!verify.ok) {
      return NextResponse.json({ error: "Apsauga suveikė. Bandykite dar kartą." }, { status: 429 });
    }

    const created = await prisma.providerRequest.create({
      data: {
        name,
        email: emailRaw,
        phone: phone ?? null,
        cityId,
        categoryId,
        message: message ?? null,
      },
      select: { id: true },
    });

    // audit anon (optional, bet naudinga)
    await auditLog({
      action: "PROVIDER_REQUEST_CREATE",
      entity: "ProviderRequest",
      entityId: created.id,
      userId: null,
      ip: ip === "unknown" ? null : ip,
      userAgent: req.headers.get("user-agent") ?? null,
      metadata: { recaptchaScore: verify.score ?? null, action: verify.action ?? null },
    });

    return NextResponse.json({ ok: true, id: created.id });
  } catch (e: any) {
    if (e instanceof Response) return e;

    console.error("POST /api/provider-requests error:", e);
    return NextResponse.json({ error: "Serverio klaida. Bandykite vėliau." }, { status: 500 });
  }
}