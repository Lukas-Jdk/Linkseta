// src/app/api/auth/me/route.ts
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";

type MeResponse = {
  user: {
    id: string;
    email: string;
    role: "USER" | "ADMIN";
    name: string | null;
    phone: string | null;
    avatarUrl: string | null;
  } | null;
};

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getAuthUser();

    const body: MeResponse = {
      user: user
        ? {
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
            phone: user.phone,
            avatarUrl: user.avatarUrl,
          }
        : null,
    };

    const res = NextResponse.json(body, { status: 200 });
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (err) {
    console.error("GET /api/auth/me error", err);
    const res = NextResponse.json({ user: null } satisfies MeResponse, { status: 200 });
    res.headers.set("Cache-Control", "no-store");
    return res;
  }
}