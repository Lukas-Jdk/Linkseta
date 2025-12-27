// src/app/api/auth/me/route.ts
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type MeResponse = {
  user: {
    id: string;
    email: string;
    role: "USER" | "ADMIN";
    name: string | null;
    avatarUrl: string | null;
  } | null;
};

export async function GET() {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      const body: MeResponse = { user: null };
      return NextResponse.json(body, { status: 200 });
    }

    // ✅ pasiimam iš DB (kad turėtume avatarUrl)
    const dbUser = await prisma.user.findUnique({
      where: { id: auth.id },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
        avatarUrl: true,
      },
    });

    const body: MeResponse = {
      user: dbUser
        ? {
            id: dbUser.id,
            email: dbUser.email,
            role: dbUser.role,
            name: dbUser.name ?? null,
            avatarUrl: dbUser.avatarUrl ?? null,
          }
        : null,
    };

    return NextResponse.json(body, { status: 200 });
  } catch (err) {
    console.error("GET /api/auth/me error", err);
    const body: MeResponse = { user: null };
    return NextResponse.json(body, { status: 200 });
  }
}
