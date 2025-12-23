// src/app/api/public/filters/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [cities, categories] = await Promise.all([
    prisma.city.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.category.findMany({
      where: { type: "SERVICE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true }, // ✅ SVARBU
    }),
  ]);

  return NextResponse.json({ cities, categories });
}
