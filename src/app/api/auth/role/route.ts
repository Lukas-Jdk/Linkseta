// src/app/api/auth/role/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

type Role = "GUEST" | "USER" | "ADMIN";

type RoleResponse = {
  role: Role;
};

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.auth.getUser();

    // jei nėra prisijungusio – GUEST
    if (error || !data?.user?.email) {
      const json: RoleResponse = { role: "GUEST" };
      return NextResponse.json(json, { status: 200 });
    }

    const email = data.user.email;

    const dbUser = await prisma.user.findUnique({
      where: { email },
      select: { role: true },
    });

    const role: Role =
      dbUser?.role === "ADMIN" ? "ADMIN" : "USER";

    const json: RoleResponse = { role };
    return NextResponse.json(json, { status: 200 });
  } catch (err) {
    console.error("/api/auth/role server error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
