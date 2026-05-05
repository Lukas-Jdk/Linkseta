// src/app/api/search/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimitOrThrow } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

function cleanQuery(value: string | null) {
  return (value ?? "").trim().slice(0, 80);
}

export async function GET(req: Request) {
  try {
    const ip = getClientIp(req);

    await rateLimitOrThrow({
      key: `global-search:${ip}`,
      limit: 120,
      windowMs: 60_000,
    });

    const { searchParams } = new URL(req.url);
    const q = cleanQuery(searchParams.get("q"));
    const locale = searchParams.get("locale") ?? "lt";

    if (q.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const services = await prisma.serviceListing.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { titleEn: { contains: q, mode: "insensitive" } },
          { descriptionEn: { contains: q, mode: "insensitive" } },
          { titleNo: { contains: q, mode: "insensitive" } },
          { descriptionNo: { contains: q, mode: "insensitive" } },
          {
            category: {
              name: { contains: q, mode: "insensitive" },
            },
          },
          {
            city: {
              name: { contains: q, mode: "insensitive" },
            },
          },
        ],
      },
      select: {
        id: true,
        slug: true,
        title: true,
        titleEn: true,
        titleNo: true,
        description: true,
        descriptionEn: true,
        descriptionNo: true,
        imageUrl: true,
        priceFrom: true,
        locationCity: true,
        locationPostcode: true,
        city: {
          select: {
            name: true,
          },
        },
        category: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
      orderBy: [{ highlighted: "desc" }, { createdAt: "desc" }],
      take: 8,
    });

    const results = services.map((service) => {
      const title =
        locale === "en"
          ? service.titleEn || service.title
          : locale === "no"
            ? service.titleNo || service.title
            : service.title;

      const description =
        locale === "en"
          ? service.descriptionEn || service.description
          : locale === "no"
            ? service.descriptionNo || service.description
            : service.description;

      return {
        id: service.id,
        type: "service",
        title,
        description: description.slice(0, 120),
        href: `/${locale}/services/${service.slug}`,
        imageUrl: service.imageUrl,
        categoryName: service.category?.name ?? null,
        categorySlug: service.category?.slug ?? null,
        location:
          [service.locationPostcode, service.locationCity || service.city?.name]
            .filter(Boolean)
            .join(" ") || null,
        priceFrom: service.priceFrom,
      };
    });

    return NextResponse.json({ results });
  } catch (error) {
    console.error("GET /api/search failed:", error);

    return NextResponse.json(
      { error: "Search failed", results: [] },
      { status: 500 },
    );
  }
}