// src/app/api/auth/me/route.ts
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

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        role: true,
        name: true,
      },
    });

    if (!user) {
      return NextResponse.json({
        user: null,
        role: "USER",
      });
    }

    return NextResponse.json({
      user,
      role: user.role,
    });
  } catch (error) {
    console.error("auth/me error:", error);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
