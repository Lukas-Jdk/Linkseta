// src/app/api/dashboard/my-services/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function POST() {
  try {
    const { response, user } = await requireUser();
    if (response || !user) return response!; // 401

    const services = await prisma.serviceListing.findMany({
      where: { userId: user.id },
      include: {
        city: true,
        category: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const providerProfile = await prisma.providerProfile.findUnique({
      where: { userId: user.id },
    });

    return NextResponse.json({
      services,
      providerProfile,
    });
  } catch (error) {
    console.error("my-services error:", error);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
