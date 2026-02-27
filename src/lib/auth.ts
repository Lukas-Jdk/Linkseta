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

  //  BETA kontrolė (iš DB)
  betaAccess: boolean;
  lifetimeFree: boolean;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

// Paimti userį iš Supabase + DB (sync name/phone)
export async function getAuthUser(): Promise<AuthUser | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user?.email) return null;

  const supabaseId = data.user.id;
  const email = normalizeEmail(data.user.email);

  const meta = (data.user.user_metadata ?? {}) as Record<string, unknown>;
  const metaName = typeof meta.name === "string" ? meta.name.trim() : null;
  const metaPhone = typeof meta.phone === "string" ? meta.phone.trim() : null;

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
      // betaAccess/lifetimeFree paliekam default iš schemos
    },
    select: {
      id: true,
      supabaseId: true,
      email: true,
      role: true,
      name: true,
      phone: true,
      avatarUrl: true,
      betaAccess: true,
      lifetimeFree: true,
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
    betaAccess: dbUser.betaAccess,
    lifetimeFree: dbUser.lifetimeFree,
  };
}

export async function requireUser() {
  const user = await getAuthUser();

  if (!user) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      user: null as AuthUser | null,
    };
  }

  return { response: null as NextResponse | null, user };
}

export async function requireAdmin() {
  const { user, response } = await requireUser();
  if (response || !user) return { response, user: null as AuthUser | null };

  if (user.role !== "ADMIN") {
    return {
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      user: null as AuthUser | null,
    };
  }

  return { response: null as NextResponse | null, user };
}