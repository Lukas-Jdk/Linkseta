// src/app/api/provider-requests/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimitOrThrow } from "@/lib/rateLimit";
import { verifyRecaptchaV3 } from "@/lib/recaptcha";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    
    const ip = getClientIp(req) || "unknown";
    rateLimitOrThrow({
      key: `public:provider-requests:${ip}`,
      limit: 10,
      windowMs: 60_000,
    });

    const body = await req.json().catch(() => ({}));

    const {
      name,
      email,
      phone,
      cityId,
      categoryId,
      message,
      recaptchaToken,
      website, // honeypot laukas (turi būti tuščias)
    } = body || {};

    // ✅ honeypot: jei užpildė — botas
    if (typeof website === "string" && website.trim().length > 0) {
      // tyčia grąžinam generinį atsakymą (nepasakom kad pagavom botą)
      return NextResponse.json({ error: "Užklausa atmesta." }, { status: 400 });
    }

    if (!name || !email) {
      return NextResponse.json(
        { error: "Reikalingi bent vardas ir el. paštas." },
        { status: 400 }
      );
    }

    // ✅ reCAPTCHA privalomas
    if (!recaptchaToken || typeof recaptchaToken !== "string") {
      return NextResponse.json(
        { error: "Nepavyko patvirtinti, kad esate žmogus. Bandykite dar kartą." },
        { status: 400 }
      );
    }

    const verify = await verifyRecaptchaV3({
      token: recaptchaToken,
      expectedAction: "provider_request",
      ip: ip === "unknown" ? null : ip,
    });

    if (!verify.ok) {
      // 429 tinka, nes realiai "anti-abuse" blokas
      return NextResponse.json(
        { error: "Apsauga suveikė. Bandykite dar kartą." },
        { status: 429 }
      );
    }

    const created = await prisma.providerRequest.create({
      data: {
        name: String(name),
        email: String(email),
        phone: phone ? String(phone) : null,
        cityId: cityId || null,
        categoryId: categoryId || null,
        message: message ? String(message) : null,
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, id: created.id });
  } catch (e: any) {
    // rateLimitOrThrow gali "mesti" Response/NextResponse
    if (e instanceof Response) return e;

    console.error("POST /api/provider-requests error:", e);
    return NextResponse.json(
      { error: "Serverio klaida. Bandykite vėliau." },
      { status: 500 }
    );
  }
}