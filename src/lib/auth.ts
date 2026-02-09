// src/lib/auth.ts
import { NextResponse } from "next/server";
import { prisma } from "./prisma";
import { createSupabaseServerClient } from "./supabaseServer";

export type AuthUser = {
  id: string;
  supabaseId: string | null;
  email: string;
  role: "USER" | "ADMIN";
  name: string | null;
  phone: string | null;
  avatarUrl: string | null;
};

// 🔹 Pagrindinė funkcija – paimti userį iš Supabase + DB (ir pasisyncinti vardą/telefoną)
export async function getAuthUser(): Promise<AuthUser | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user || !data.user.email) {
    return null;
  }

  const email = data.user.email;
  const supabaseId = data.user.id; // Supabase auth user id (stabilus)

  const meta = (data.user.user_metadata ?? {}) as Record<string, unknown>;
  const metaName = typeof meta.name === "string" ? meta.name.trim() : null;
  const metaPhone = typeof meta.phone === "string" ? meta.phone.trim() : null;

  // Upsertinam vartotoją DB pagal supabaseId (geriausia praktika)
  const dbUser = await prisma.user.upsert({
    where: { supabaseId },
    update: {
      email,
      ...(metaName ? { name: metaName } : {}),
      ...(metaPhone ? { phone: metaPhone } : {}),
    },
    create: {
      supabaseId,
      email,
      ...(metaName ? { name: metaName } : {}),
      ...(metaPhone ? { phone: metaPhone } : {}),
      // role default USER pagal schema
    },
    select: {
      id: true,
      supabaseId: true,
      email: true,
      role: true,
      name: true,
      phone: true,
      avatarUrl: true,
    },
  });

  return {
    id: dbUser.id,
    supabaseId: dbUser.supabaseId ?? null,
    email: dbUser.email,
    role: dbUser.role,
    name: dbUser.name,
    phone: dbUser.phone,
    avatarUrl: dbUser.avatarUrl,
  };
}

// 🔹 Reikia prisijungusio USER
export async function requireUser() {
  const user = await getAuthUser();

  if (!user) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
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
    return { response, user: null as AuthUser | null };
  }

  if (user.role !== "ADMIN") {
    return {
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      user: null as AuthUser | null,
    };
  }

  return { response: null as NextResponse | null, user };
}
