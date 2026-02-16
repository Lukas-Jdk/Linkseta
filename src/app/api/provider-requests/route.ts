// src/app/api/provider-requests/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimitOrThrow } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    //  Rate limit (apsauga nuo spam flood)
    const ip = getClientIp(req);
    rateLimitOrThrow({
      key: `providerRequest:${ip}`,
      limit: 10,
      windowMs: 60_000,
    });

    const body = await req.json();

    const {
      name,
      email,
      phone,
      cityId,
      categoryId,
      message,
      website, // honeypot
    } = body || {};

    // ✅ Honeypot bot protection
    if (website && String(website).trim().length > 0) {
      // Botas užpildė paslėptą lauką → ignoruojam tyliai
      return NextResponse.json({ ok: true });
    }

    if (!name || !email) {
      return NextResponse.json(
        { error: "Reikalingi bent vardas ir el. paštas." },
        { status: 400 }
      );
    }

    const created = await prisma.providerRequest.create({
      data: {
        name,
        email,
        phone: phone || null,
        cityId: cityId || null,
        categoryId: categoryId || null,
        message: message || null,
      },
    });

    return NextResponse.json({ ok: true, id: created.id });
  } catch (e: any) {
    if (e instanceof Response) return e;

    console.error("API error: /api/provider-requests", e);
    return NextResponse.json(
      { error: "Serverio klaida. Bandykite vėliau." },
      { status: 500 }
    );
  }
}