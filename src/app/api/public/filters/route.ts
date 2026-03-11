// src/app/api/public/filters/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 3600;

export async function GET() {
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

  const res = NextResponse.json({ cities, categories });
  res.headers.set(
    "Cache-Control",
    "public, s-maxage=3600, stale-while-revalidate=86400",
  );
  return res;
}