// src/app/api/dashboard/check-provider/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function POST() {
  try {
    const { user, response } = await requireUser();

    if (response || !user) {
      return (
        response ??
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    const provider = await prisma.providerProfile.findUnique({
      where: { userId: user.id },
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
