// src/app/api/auth/role/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RoleResponse = {
  role: "USER" | "ADMIN";
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");

  if (!email) {
    return NextResponse.json<RoleResponse>({ role: "USER" }, { status: 400 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { email },
    select: { role: true },
  });

  return NextResponse.json<RoleResponse>(
    { role: dbUser?.role ?? "USER" },
    { status: 200 }
  );
}
