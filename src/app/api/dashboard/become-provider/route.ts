// src/app/api/dashboard/become-provider/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

type Body = {
  planSlug?: "demo" | "basic" | "premium";
};

// DEMO versija: be Stripe/Vipps.
// Tiesiog sukuria / atnaujina ProviderProfile ir pažymi isApproved = true.
export async function POST(req: Request) {
  try {
    const { user, response } = await requireUser();
    if (response || !user) {
      return response ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: Body = {};
    try {
      body = await req.json();
    } catch {
      // body gali būti tuščias – ok
    }

    const planSlug = body.planSlug ?? "demo";

    const plan = await prisma.plan.findUnique({
      where: { slug: planSlug },
      select: { id: true, slug: true },
    });

    if (!plan) {
      return NextResponse.json({ error: "Nerastas planas" }, { status: 400 });
    }

    await prisma.providerProfile.upsert({
      where: { userId: user.id },
      update: { isApproved: true },
      create: { userId: user.id, isApproved: true },
    });

    return NextResponse.json({ success: true, planSlug: plan.slug });
  } catch (err: unknown) {
    console.error("POST /api/dashboard/become-provider error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Serverio klaida", details: message }, { status: 500 });
  }
}
