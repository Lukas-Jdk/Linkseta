// src/app/api/dashboard/filters/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
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
    // trumpas cache OK (tai nėra privati info)
    res.headers.set("Cache-Control", "public, max-age=60, s-maxage=300");
    return res;
  } catch (error) {
    console.error("dashboard/filters error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}