import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { name, email, phone, cityId, categoryId, message } = body || {};

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
        phone,
        cityId: cityId || null,
        categoryId: categoryId || null,
        message: message || null,
      },
    });

    return NextResponse.json({ ok: true, id: created.id });
  } catch (error) {
    console.error("POST /api/provider-requests error:", error);
    return NextResponse.json(
      { error: "Serverio klaida. Bandykite vėliau." },
      { status: 500 }
    );
  }
}
