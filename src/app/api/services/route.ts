// src/app/api/services/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { withApi } from "@/lib/withApi";
import { withRateLimit } from "@/lib/apiGuard";

// ---------------------------------------------
// GET /api/services (public)
// ---------------------------------------------
export async function GET(req: Request) {
  return withApi(req, "GET /api/services", async () => {
    return withRateLimit(
      req,
      async () => {
        const { searchParams } = new URL(req.url);

        const city = searchParams.get("city") || undefined;
        const category = searchParams.get("category") || undefined;
        const q = searchParams.get("q") || undefined;

        // Pagination
        const pageNum = Math.max(
          1,
          parseInt(searchParams.get("page") || "1", 10),
        );
        const pageSize = 24;
        const skip = (pageNum - 1) * pageSize;

        const where = {
          deletedAt: null,
          isActive: true,
          ...(city && { city: { slug: city } }),
          ...(category && { category: { slug: category } }),
          ...(q && {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              { description: { contains: q, mode: "insensitive" as const } },
            ],
          }),
        };

        const [services, total] = await Promise.all([
          prisma.serviceListing.findMany({
            where,
            select: {
              id: true,
              title: true,
              slug: true,
              description: true,
              priceFrom: true,
              imageUrl: true,
              highlighted: true,
              createdAt: true,
              city: { select: { name: true, slug: true } },
              category: { select: { name: true, slug: true } },
              user: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: "desc" },
            skip,
            take: pageSize,
          }),
          prisma.serviceListing.count({ where }),
        ]);

        const totalPages = Math.ceil(total / pageSize);

        return NextResponse.json({
          data: services,
          total,
          page: pageNum,
          pageSize,
          totalPages,
        });
      },
      { name: "services_get", limit: 120, windowMs: 60_000 },
    );
  });
}

// ---------------------------------------------
// POST /api/services  (ADMIN-only)
// ---------------------------------------------
export async function POST(req: Request) {
  return withApi(req, "POST /api/services", async () => {
    // admin endpointui griežtesnis rate limit
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

        const body = await req.json();

        if (!body.userId || !body.title || !body.slug || !body.description) {
          return NextResponse.json(
            { error: "Missing fields" },
            { status: 400 },
          );
        }

        let highlights: string[] = [];
        if (Array.isArray(body.highlights)) {
          highlights = body.highlights
            .map((s: unknown) => String(s).trim())
            .filter(Boolean)
            .slice(0, 6);
        } else if (typeof body.highlights === "string") {
          highlights = body.highlights
            .split("\n")
            .map((s: string) => s.trim())
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
          },
        });

        return NextResponse.json(service);
      },
      { name: "services_admin_post", limit: 30, windowMs: 60_000 },
    );
  });
}
