// src/lib/auth.ts
import { NextResponse } from "next/server";
import { prisma } from "./prisma";
import { createSupabaseServerClient } from "./supabaseServer";

export type AuthUser = {
  id: string;
  email: string;
  role: "USER" | "ADMIN";
};

// 🔹 Pagrindinė funkcija – paimti userį iš Supabase + DB
export async function getAuthUser(): Promise<AuthUser | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user || !data.user.email) {
    return null;
  }

  const email = data.user.email;

  // 🔥 PAGRINDINIS PATOBULINIMAS:
  // jei DB user nerastas, mes jį AUTOMATIŠKAI sukuriam (default role = USER)
  const dbUser = await prisma.user.upsert({
    where: { email },
    update: {}, // kol kas nieko neatnaujinam
    create: {
      email,
      // name, phone galėsi atsinaujinti per /api/auth/sync-user
      // role pagal schema.prisma default yra USER
    },
    select: {
      id: true,
      role: true,
    },
  });

  return {
    id: dbUser.id,
    email,
    role: dbUser.role,
  };
}

// 🔹 Reikia prisijungusio USER
export async function requireUser() {
  const user = await getAuthUser();

  if (!user) {
    return {
      response: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      ),
      user: null as AuthUser | null,
    };
  }

  return {
    response: null as NextResponse | null,
    user,
  };
}

// 🔹 Reikia ADMIN
export async function requireAdmin() {
  const { user, response } = await requireUser();

  if (response || !user) {
    return {
      response,
      user: null as AuthUser | null,
    };
  }

  if (user.role !== "ADMIN") {
    return {
      response: NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      ),
      user: null as AuthUser | null,
    };
  }

  return {
    response: null as NextResponse | null,
    user,
  };
}
