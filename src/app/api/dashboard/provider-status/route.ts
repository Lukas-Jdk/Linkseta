// src/app/api/dashboard/provider-status/route.ts
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

    // 1. User pagal email (gali ir nebūti, teoriškai)
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    // 2. Ar jau yra ProviderProfile (t.y. patvirtintas teikėjas)?
    if (user) {
      const providerProfile = await prisma.providerProfile.findUnique({
        where: { userId: user.id },
        select: { id: true, isApproved: true },
      });

      if (providerProfile) {
        // jei kada nors naudosi isApproved false – čia galima skirti
        if (providerProfile.isApproved) {
          return NextResponse.json({ status: "APPROVED" as const });
        }
      }
    }

    // 3. Jei nėra profilio, tikrinam ProviderRequest pagal email
    //    (čia laikom informaciją apie paraišką ir jos statusą)
    const latestRequest = await prisma.providerRequest.findFirst({
      where: { email },
      orderBy: { createdAt: "desc" },
      select: { status: true },
    });

    if (!latestRequest) {
      // niekada nepildė paraiškos
      return NextResponse.json({ status: "NONE" as const });
    }

    if (latestRequest.status === "PENDING") {
      return NextResponse.json({ status: "PENDING" as const });
    }

    if (latestRequest.status === "APPROVED") {
      // teoriškai APPROVED, bet profilis nesusikūrė – laikom kaip APPROVED
      return NextResponse.json({ status: "APPROVED" as const });
    }

    // jei REJECTED – laikom kaip NONE (gali pildyti iš naujo)
    return NextResponse.json({ status: "NONE" as const });
  } catch (err) {
    console.error("provider-status error:", err);
    return NextResponse.json(
      { error: "Server error", details: String(err) },
      { status: 500 }
    );
  }
}
