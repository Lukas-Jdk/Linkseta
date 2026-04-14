// src/app/api/services/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { withApi } from "@/lib/withApi";
import { withRateLimit } from "@/lib/apiGuard";
import {
  validatePaginationParams,
  sanitizeStringParam,
} from "@/lib/validation";

async function ensureUniqueSlugGlobal(slug: string) {
  let s = slug;
  let i = 2;

  while (true) {
    const exists = await prisma.serviceListing.findUnique({
      where: { slug: s },
      select: { id: true },
    });
    if (!exists) return s;
    s = `${slug}-${i}`;
    i += 1;
  }
}

function isCuidLike(value: string) {
  return value.length >= 20 && value.length <= 40;
}

export async function GET(req: Request) {
  return withApi(req, "GET /api/services", async () => {
    return withRateLimit(
      req,
      async () => {
        const { searchParams } = new URL(req.url);

        const paginationResult = validatePaginationParams(
          searchParams.get("page") ?? undefined,
          searchParams.get("pageSize") ?? undefined,
        );

        if ("error" in paginationResult) {
          return NextResponse.json(
            { error: paginationResult.error },
            { status: paginationResult.status },
          );
        }

        const pageNum = paginationResult.page;
        const pageSize = paginationResult.pageSize;

        const city = sanitizeStringParam(
          searchParams.get("city") ?? undefined,
          80,
        );
        const category = sanitizeStringParam(
          searchParams.get("category") ?? undefined,
          80,
        );
        const q = sanitizeStringParam(searchParams.get("q") ?? undefined, 120);

        const skip = (pageNum - 1) * pageSize;

        const where = {
          deletedAt: null,
          isActive: true,
          ...(city &&
            (isCuidLike(city)
              ? { cityId: city }
              : { city: { slug: city } })),
          ...(category &&
            (isCuidLike(category)
              ? { categoryId: category }
              : { category: { slug: category } })),
          ...(q && {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              { description: { contains: q, mode: "insensitive" as const } },
              { titleEn: { contains: q, mode: "insensitive" as const } },
              { descriptionEn: { contains: q, mode: "insensitive" as const } },
              { titleNo: { contains: q, mode: "insensitive" as const } },
              { descriptionNo: { contains: q, mode: "insensitive" as const } },
            ],
          }),
        };

        const total = await prisma.serviceListing.count({ where });
        const totalPages = Math.ceil(total / pageSize);

        if (pageNum > totalPages && totalPages > 0) {
          const res = NextResponse.json({
            data: [],
            total,
            page: pageNum,
            pageSize,
            totalPages,
          });
          res.headers.set("Cache-Control", "public, max-age=30, s-maxage=120");
          return res;
        }

        const services = await prisma.serviceListing.findMany({
          where,
          select: {
            id: true,
            title: true,
            titleEn: true,
            titleNo: true,
            slug: true,
            description: true,
            descriptionEn: true,
            descriptionNo: true,
            priceFrom: true,
            imageUrl: true,
            highlighted: true,
            createdAt: true,
            city: { select: { name: true, slug: true, postcode: true } },
            category: { select: { name: true, slug: true } },
            user: { select: { id: true, name: true } },
          },
          orderBy: [{ highlighted: "desc" }, { createdAt: "desc" }],
          skip,
          take: pageSize,
        });

        const res = NextResponse.json({
          data: services,
          total,
          page: pageNum,
          pageSize,
          totalPages,
        });
        res.headers.set("Cache-Control", "public, max-age=30, s-maxage=120");
        return res;
      },
      { name: "services_get", limit: 120, windowMs: 60_000 },
    );
  });
}

export async function POST(req: Request) {
  return withApi(req, "POST /api/services", async () => {
    return withRateLimit(
      req,
      async () => {
        const { user, response } = await requireAdmin();
        if (response || !user) {
          return (
            response ??
            NextResponse.json({ error: "Forbidden" }, { status: 403 })
          );
        }

        const body = await req.json().catch(() => ({} as any));

        const userId = typeof body?.userId === "string" ? body.userId : null;
        const title =
          typeof body?.title === "string"
            ? body.title.trim().slice(0, 120)
            : null;
        const slugRaw =
          typeof body?.slug === "string"
            ? body.slug.trim().slice(0, 80)
            : null;
        const description =
          typeof body?.description === "string"
            ? body.description.trim().slice(0, 4000)
            : null;

        if (!userId || !title || !slugRaw || !description) {
          return NextResponse.json({ error: "Missing fields" }, { status: 400 });
        }

        const slug = await ensureUniqueSlugGlobal(slugRaw);

        let highlights: string[] = [];
        if (Array.isArray(body?.highlights)) {
          highlights = body.highlights
            .map((s: unknown) => String(s).trim())
            .filter(Boolean)
            .slice(0, 6);
        } else if (typeof body?.highlights === "string") {
          highlights = body.highlights
            .split("\n")
            .map((s: string) => s.trim())
            .filter(Boolean)
            .slice(0, 6);
        }

        const service = await prisma.serviceListing.create({
          data: {
            userId,
            title,
            slug,
            description,
            priceFrom: body?.priceFrom ?? null,
            priceTo: body?.priceTo ?? null,
            cityId: body?.cityId ?? null,
            categoryId: body?.categoryId ?? null,
            highlights,
            isActive: true,
            highlighted: false,
            deletedAt: null,
          },
        });

        return NextResponse.json(service);
      },
      { name: "services_admin_post", limit: 30, windowMs: 60_000 },
    );
  });
}