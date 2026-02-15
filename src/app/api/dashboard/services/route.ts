// src/app/api/dashboard/services/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { getClientIp, rateLimitOrThrow } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);

    // ✅ Auth pirmiau (kad rate-limit raktas būtų stabilus pagal userId)
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ✅ Rate limit (userId + ip)
    rateLimitOrThrow({
      key: `dashboard:createService:${user.id}:${ip}`,
      limit: 15,
      windowMs: 60_000,
    });

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { profile: true },
    });

    if (!dbUser || !dbUser.profile?.isApproved) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    if (!body.title || !body.description) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const title: string = body.title;
    const description: string = body.description;

    const cityId: string | null = body.cityId ?? null;
    const categoryId: string | null = body.categoryId ?? null;
    const priceFrom: number | null = body.priceFrom ?? null;

    const imageUrl: string | null = body.imageUrl ?? null;
    const imagePath: string | null = body.imagePath ?? null;

    const highlights: string[] = Array.isArray(body.highlights)
      ? body.highlights
          .map((s: unknown) => String(s).trim())
          .filter(Boolean)
          .slice(0, 6)
      : [];

    const baseSlug = slugify(title);
    let slug = baseSlug;
    let i = 2;

    // ✅ slug unikalumas tik tarp ne-deleted
    while (
      await prisma.serviceListing.findFirst({
        where: { slug, deletedAt: null },
        select: { id: true },
      })
    ) {
      slug = `${baseSlug}-${i}`;
      i += 1;
    }

    const created = await prisma.serviceListing.create({
      data: {
        userId: dbUser.id,
        title,
        slug,
        description,
        cityId,
        categoryId,
        priceFrom,
        imageUrl,
        imagePath,
        highlights,
        isActive: true,
        highlighted: false,
        deletedAt: null,
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, id: created.id });
  } catch (e: any) {
    // ✅ jei rateLimitOrThrow grąžino Response/NextResponse — atiduodam jį
    if (e instanceof Response) return e;

    console.error("API error: POST /api/dashboard/services", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}