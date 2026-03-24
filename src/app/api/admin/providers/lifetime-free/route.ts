// src/app/api/admin/providers/lifetime-free/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

type Body = {
  userId?: string;
  enabled?: boolean;
};

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const authUser = await getAuthUser();

    if (!authUser || authUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await req.json().catch(() => null)) as Body | null;

    if (!body?.userId || typeof body.enabled !== "boolean") {
      return NextResponse.json(
        { error: "Invalid payload" },
        { status: 400 },
      );
    }

    const updated = await prisma.providerProfile.upsert({
      where: { userId: body.userId },
      update: {
        lifetimeFree: body.enabled,
        lifetimeFreeGrantedAt: body.enabled ? new Date() : null,
        lifetimeFreeGrantedBy: body.enabled ? authUser.id : null,
      },
      create: {
        userId: body.userId,
        isApproved: false,
        lifetimeFree: body.enabled,
        lifetimeFreeGrantedAt: body.enabled ? new Date() : null,
        lifetimeFreeGrantedBy: body.enabled ? authUser.id : null,
      },
      select: {
        userId: true,
        isApproved: true,
        lifetimeFree: true,
        lifetimeFreeGrantedAt: true,
        lifetimeFreeGrantedBy: true,
      },
    });

    return NextResponse.json({
      ok: true,
      profile: updated,
    });
  } catch (error) {
    console.error("POST /api/admin/providers/lifetime-free error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}