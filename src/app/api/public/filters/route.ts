// src/app/api/public/filters/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { translateCategoryName } from "@/lib/categoryTranslations";

export const revalidate = 3600;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const locale = url.searchParams.get("locale") ?? "lt";

  const [cities, categories] = await Promise.all([
    prisma.city.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    }),
    prisma.category.findMany({
      where: { type: "SERVICE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    }),
  ]);

  const localizedCategories = categories.map((category) => ({
    ...category,
    name: translateCategoryName(category.slug, category.name, locale),
  }));

  const res = NextResponse.json({
    cities,
    categories: localizedCategories,
  });

  res.headers.set(
    "Cache-Control",
    "public, s-maxage=3600, stale-while-revalidate=86400",
  );

  return res;
}