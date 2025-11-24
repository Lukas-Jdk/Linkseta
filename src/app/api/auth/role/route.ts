// src/app/api/auth/role/route.ts
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

    const user = await prisma.user.findUnique({
      where: { email },
      select: { role: true },
    });

    const role = user?.role ?? "USER";
    const isAdmin = role === "ADMIN";

    return NextResponse.json({ role, isAdmin });
  } catch (err) {
    console.error("auth/role error:", err);
    return NextResponse.json(
      { error: "Server error", details: String(err) },
      { status: 500 }
    );
  }
}
