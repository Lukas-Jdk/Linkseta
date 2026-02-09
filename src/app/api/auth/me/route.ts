// src/app/api/auth/me/route.ts
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";

type MeResponse = {
  user: {
    id: string;
    email: string;
    role: "USER" | "ADMIN";
    // jei nori – gali laikyt name, bet tik jei getAuthUser jį tikrai grąžina
    // name?: string | null;
  } | null;
};

export async function GET() {
  try {
    const user = await getAuthUser();

    const body: MeResponse = {
      user: user
        ? {
            id: user.id,
            email: user.email,
            role: user.role,
          }
        : null,
    };

    return NextResponse.json(body, { status: 200 });
  } catch (err: unknown) {
    console.error("GET /api/auth/me error", err);

    const body: MeResponse = { user: null };
    return NextResponse.json(body, { status: 200 });
  }
}
