// src/app/api/dashboard/provider-status/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

type ProviderStatus = "NONE" | "PENDING" | "APPROVED";

export async function POST() {
  try {
    const { user, response } = await requireUser();

    if (response || !user) {
      return (
        response ??
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    // 1. Ar vartotojas jau turi ProviderProfile?
    const providerProfile = await prisma.providerProfile.findUnique({
      where: { userId: user.id },
      select: { isApproved: true },
    });

    if (providerProfile?.isApproved) {
      return NextResponse.json({ status: "APPROVED" as ProviderStatus });
    }

    // 2. Jei nėra profilio – ar yra ProviderRequest pagal jo email
    const latestRequest = await prisma.providerRequest.findFirst({
      where: { email: user.email },
      orderBy: { createdAt: "desc" },
      select: { status: true },
    });

    if (!latestRequest) {
      return NextResponse.json({ status: "NONE" as ProviderStatus });
    }

    if (latestRequest.status === "PENDING") {
      return NextResponse.json({ status: "PENDING" as ProviderStatus });
    }

    if (latestRequest.status === "APPROVED") {
      return NextResponse.json({ status: "APPROVED" as ProviderStatus });
    }

    // REJECTED – laikom kaip NONE
    return NextResponse.json({ status: "NONE" as ProviderStatus });
  } catch (err) {
    console.error("provider-status error:", err);
    return NextResponse.json(
      { error: "Server error", details: String(err) },
      { status: 500 }
    );
  }
}
