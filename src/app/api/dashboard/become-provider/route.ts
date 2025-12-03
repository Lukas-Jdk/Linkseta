// src/app/api/dashboard/become-provider/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

type Body = {
  planId?: string;
};

// DEMO versija: be Stripe/Vipps.
// Tiesiog sukuria / atnaujina ProviderProfile ir pažymi isApproved = true.
export async function POST(req: Request) {
  try {
    const { user, response } = await requireUser();
    if (response || !user) {
      // jei neprisijungęs – requireUser grąžins 401
      return response ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: Body = {};
    try {
      body = await req.json();
    } catch {
      // jei body tuščias – ok
    }

    const planId = body.planId ?? "plan_demo";

    const plan = await prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      return NextResponse.json(
        { error: "Nerastas planas" },
        { status: 400 }
      );
    }

    // Sukuriam / atnaujinam provider profile ir pažymim kaip patvirtintą
    await prisma.providerProfile.upsert({
      where: { userId: user.id },
      update: {
        isApproved: true,
      },
      create: {
        userId: user.id,
        isApproved: true,
      },
    });

    // ČIA DEMO REŽIMAS.
    // Ateityje čia vietoj to darysim Stripe/Vipps checkout ir approve po webhook.

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("POST /api/dashboard/become-provider error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Serverio klaida", details: message },
      { status: 500 }
    );
  }
}
