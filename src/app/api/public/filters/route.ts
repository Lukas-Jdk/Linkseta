import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const cities = await prisma.city.findMany({
    orderBy: { name: "asc" },
  });

  const categories = await prisma.category.findMany({
    where: { type: "SERVICE" },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ cities, categories });
}
