// src/app/api/dashboard/services/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

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
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    const highlights: string[] = Array.isArray(body.highlights)
      ? body.highlights
          .map((s: unknown) => String(s).trim())
          .filter(Boolean)
          .slice(0, 6)
      : [];

    const baseSlug = slugify(title);
    let slug = baseSlug;
    let i = 2;

    while (await prisma.serviceListing.findUnique({ where: { slug } })) {
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
        highlights, 
        isActive: true,
        highlighted: false,
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, id: created.id });
  } catch (e) {
    console.error("POST /api/dashboard/services error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
