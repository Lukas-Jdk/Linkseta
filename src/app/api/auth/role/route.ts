// src/app/api/auth/role/route.ts
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";

type Role = "GUEST" | "USER" | "ADMIN";
type RoleResponse = { role: Role };

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getAuthUser();

    const role: Role = !user ? "GUEST" : user.role === "ADMIN" ? "ADMIN" : "USER";

    const res = NextResponse.json({ role } satisfies RoleResponse, { status: 200 });
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (err) {
    console.error("/api/auth/role server error:", err);
    return NextResponse.json({ role: "GUEST" } satisfies RoleResponse, { status: 200 });
  }
}