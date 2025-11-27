// src/app/api/auth/me/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

type MeResponse = {
  user: {
    id: string;
    email: string;
    name: string | null;
    phone: string | null;
    createdAt: string;
  } | null;
  role: "USER" | "ADMIN";
  error?: string;
};

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.auth.getUser();

    if (error || !data?.user || !data.user.email) {
      const body: MeResponse = {
        user: null,
        role: "USER",
      };
      return NextResponse.json(body, { status: 200 });
    }

    const email = data.user.email;

    const dbUser = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        role: true,
        name: true,
        phone: true,
        createdAt: true,
      },
    });

    if (!dbUser) {
      const body: MeResponse = {
        user: null,
        role: "USER",
      };
      return NextResponse.json(body, { status: 200 });
    }

    const body: MeResponse = {
      user: {
        id: dbUser.id,
        email,
        name: dbUser.name,
        phone: dbUser.phone,
        createdAt: dbUser.createdAt.toISOString(),
      },
      role: dbUser.role,
    };

    return NextResponse.json(body, { status: 200 });
  } catch (err) {
    console.error("GET /api/auth/me error", err);

    const body: MeResponse = {
      user: null,
      role: "USER",
      error: "Internal error",
    };

    return NextResponse.json(body, { status: 200 });
  }
}
