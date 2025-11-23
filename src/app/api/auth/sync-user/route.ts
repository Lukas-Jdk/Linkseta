// src/app/api/auth/sync-user/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = body.email as string | undefined;
    const name = body.name as string | undefined;
    const phone = body.phone as string | undefined;

    if (!email) {
      return NextResponse.json(
        { error: "Missing email" },
        { status: 400 }
      );
    }

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        // atnaujinam tik jei ateina reikšmė
        name: name ?? undefined,
        phone: phone ?? undefined,
      },
      create: {
        email,
        name: name ?? null,
        phone: phone ?? null,
        // role paliekam default(USER)
      },
    });

    return NextResponse.json({ ok: true, userId: user.id, user });
  } catch (error) {
    console.error("sync-user error:", error);
    return NextResponse.json(
      { error: "Server error", details: String(error) },
      { status: 500 }
    );
  }
}
