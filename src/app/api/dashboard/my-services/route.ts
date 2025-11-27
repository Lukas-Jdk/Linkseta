// src/app/api/dashboard/my-services/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = body.email as string | undefined;

    if (!email) {
      return NextResponse.json(
        { error: "Missing email" },
        { status: 400 }
      );
    }

    // 1. Randam User pagal email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // jei userio nėra DB – grąžinam tuščius duomenis, bet 200
      return NextResponse.json({
        services: [],
        providerProfile: null,
      });
    }

    // 2. Randam ProviderProfile (jei yra)
    const providerProfile = await prisma.providerProfile.findUnique({
      where: { userId: user.id },
    });

    // 3. Paimam visas šio userio paslaugas
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
