// src/app/api/dashboard/filters/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  try {
    const cities = await prisma.city.findMany({
      orderBy: { name: "asc" },
    });

    const categories = await prisma.category.findMany({
      where: { type: "SERVICE" }, // tik paslaugų kategorijos
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ cities, categories });
  } catch (error) {
    console.error("filters error:", error);
    return NextResponse.json(
      { error: "Server error", details: String(error) },
      { status: 500 }
    );
  }
}
