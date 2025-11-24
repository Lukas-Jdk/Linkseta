// src/app/api/dashboard/check-provider/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "Missing email" },
        { status: 400 }
      );
    }

    // 1) Susirandam User pagal email
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) {
      // nėra user -> tikrai nėra ir provider
      return NextResponse.json({ isProvider: false });
    }

    // 2) Tikrinam, ar yra ProviderProfile su tuo userId
    const provider = await prisma.providerProfile.findUnique({
      where: { userId: user.id }, // userId pas tave yra @unique, tai tinka findUnique
      select: { id: true },
    });

    return NextResponse.json({ isProvider: !!provider });
  } catch (err) {
    console.error("check-provider error:", err);
    return NextResponse.json(
      { error: "Server error", details: String(err) },
      { status: 500 }
    );
  }
}
