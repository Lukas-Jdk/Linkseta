// src/app/api/dashboard/my-services/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth"; // 👈 BŪTINAI taip

export async function POST() {
  // 1) Auth – paimam userį
  const { user, response } = await requireUser();

  // jei neprisijungęs – grąžinam 401
  if (response || !user) {
    return response!;
  }

  try {
    // 2) Provider profilio info + jo paslaugos
    const [providerProfile, services] = await Promise.all([
      prisma.providerProfile.findUnique({
        where: { userId: user.id },
        select: {
          id: true,
          isApproved: true,
          companyName: true,
        },
      }),
      prisma.serviceListing.findMany({
        where: { userId: user.id },
        include: {
          city: { select: { name: true } },
          category: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json(
      {
        providerProfile,
        services: services.map((s) => ({
          id: s.id,
          title: s.title,
          description: s.description,
          priceFrom: s.priceFrom,
          createdAt: s.createdAt,
          slug: s.slug,
          city: s.city ? { name: s.city.name } : null,
          category: s.category ? { name: s.category.name } : null,
        })),
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("my-services API error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
