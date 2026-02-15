// src/app/api/services/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

// ---------------------------------------------
// GET /api/services
// ---------------------------------------------
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const city = searchParams.get("city") || undefined;
    const category = searchParams.get("category") || undefined;
    const q = searchParams.get("q") || undefined;

    const services = await prisma.serviceListing.findMany({
      where: {
        isActive: true,
        deletedAt: null, // ✅ svarbiausia apsauga
        city: city ? { slug: city } : undefined,
        category: category ? { slug: category } : undefined,
        OR: q
          ? [
              { title: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ]
          : undefined,
      },
      include: {
        city: true,
        category: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(services);
  } catch (error) {
    console.error("GET /api/services error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ---------------------------------------------
// POST /api/services (ADMIN only)
// ---------------------------------------------
export async function POST(req: Request) {
  try {
    const { user, response } = await requireAdmin();
    if (response || !user) {
      return (
        response ?? NextResponse.json({ error: "Forbidden" }, { status: 403 })
      );
    }

    const body = await req.json();

    if (!body.userId || !body.title || !body.slug || !body.description) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    let highlights: string[] = [];

    if (Array.isArray(body.highlights)) {
      highlights = body.highlights
        .map((s: unknown) => String(s).trim())
        .filter(Boolean)
        .slice(0, 6);
    }

    const service = await prisma.serviceListing.create({
      data: {
        userId: body.userId,
        title: body.title,
        slug: body.slug,
        description: body.description,
        priceFrom: body.priceFrom ?? null,
        priceTo: body.priceTo ?? null,
        cityId: body.cityId ?? null,
        categoryId: body.categoryId ?? null,
        highlights,
        isActive: true,
        highlighted: false,
        deletedAt: null,
      },
    });

    return NextResponse.json(service);
  } catch (error) {
    console.error("POST /api/services error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}