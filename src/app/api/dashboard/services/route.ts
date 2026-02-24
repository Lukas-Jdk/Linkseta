// src/app/api/dashboard/services/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { getClientIp, rateLimitOrThrow } from "@/lib/rateLimit";
import { auditLog } from "@/lib/audit";
import { logError, newRequestId } from "@/lib/logger";
import { requireCsrf } from "@/lib/csrf";

export const dynamic = "force-dynamic";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

function clampText(x: unknown, max: number) {
  if (typeof x !== "string") return "";
  return x.trim().slice(0, max);
}

async function uniqueSlugGlobal(base: string) {
  let slug = base;
  let i = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const exists = await prisma.serviceListing.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!exists) return slug;
    slug = `${base}-${i}`;
    i += 1;
  }
}

export async function POST(req: Request) {
  const requestId = newRequestId();
  const ip = getClientIp(req);
  const ua = req.headers.get("user-agent") ?? null;

  try {
    const csrfErr = requireCsrf(req);
    if (csrfErr) return csrfErr;

    await rateLimitOrThrow({
      key: `dashboard:createService:${ip}`,
      limit: 15,
      windowMs: 60_000,
    });

    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.providerProfile.findUnique({
      where: { userId: user.id },
      select: { isApproved: true },
    });

    if (!profile?.isApproved) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({} as any));

    const title = clampText(body?.title, 120);
    const description = clampText(body?.description, 4000);

    if (!title || !description) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const cityId = typeof body?.cityId === "string" ? body.cityId : null;
    const categoryId = typeof body?.categoryId === "string" ? body.categoryId : null;

    const priceFrom =
      body?.priceFrom === null || body?.priceFrom === undefined
        ? null
        : Number.isFinite(Number(body.priceFrom))
          ? Math.max(0, Math.min(10_000_000, Math.trunc(Number(body.priceFrom))))
          : null;

    const imageUrl =
      typeof body?.imageUrl === "string" ? body.imageUrl.trim().slice(0, 600) : null;
    const imagePath =
      typeof body?.imagePath === "string" ? body.imagePath.trim().slice(0, 300) : null;

    const highlights: string[] = Array.isArray(body?.highlights)
      ? body.highlights
          .map((s: unknown) => String(s).trim())
          .filter(Boolean)
          .slice(0, 6)
      : [];

    const baseSlug = slugify(title) || "service";
    const slug = await uniqueSlugGlobal(baseSlug);

    const created = await prisma.serviceListing.create({
      data: {
        userId: user.id,
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
      userId: user.id,
      ip,
      userAgent: ua,
      metadata: { slug: created.slug, title },
    });

    return NextResponse.json({ ok: true, id: created.id, slug: created.slug });
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