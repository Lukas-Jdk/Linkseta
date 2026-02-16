// src/app/api/dashboard/services/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { getClientIp, rateLimitOrThrow } from "@/lib/rateLimit";
import { auditLog } from "@/lib/audit";
import { logError, newRequestId } from "@/lib/logger";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const requestId = newRequestId();
  const ip = getClientIp(req);
  const ua = req.headers.get("user-agent") ?? null;

  try {
    // rate limit
    rateLimitOrThrow({
      key: `dashboard:createService:${ip}`,
      limit: 15,
      windowMs: 60_000,
    });

    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
      ? body.highlights.map((s: unknown) => String(s).trim()).filter(Boolean).slice(0, 6)
      : [];

    const baseSlug = slugify(title);
    let slug = baseSlug;
    let i = 2;

    // slug unique tik tarp ne-deleted
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
      select: { id: true, slug: true },
    });

    await auditLog({
      action: "SERVICE_CREATE",
      entity: "ServiceListing",
      entityId: created.id,
      userId: dbUser.id,
      ip,
      userAgent: ua,
      metadata: { slug: created.slug, title },
    });

    return NextResponse.json({ ok: true, id: created.id });
  } catch (e: any) {
    if (e instanceof Response) return e;

    logError("POST /api/dashboard/services failed", {
      requestId,
      route: "/api/dashboard/services",
      ip,
      meta: { message: e?.message, stack: e?.stack },
    });

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}