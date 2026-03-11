// src/lib/auth.ts
import { cache } from "react";
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

  betaAccess: boolean;
  lifetimeFree: boolean;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export const getAuthUser = cache(async (): Promise<AuthUser | null> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user?.email) return null;

  const supabaseId = data.user.id;
  const email = normalizeEmail(data.user.email);

  const meta = (data.user.user_metadata ?? {}) as Record<string, unknown>;
  const metaName = typeof meta.name === "string" ? meta.name.trim() : null;
  const metaPhone = typeof meta.phone === "string" ? meta.phone.trim() : null;

  let dbUser = await prisma.user.findUnique({
    where: { supabaseId },
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

  if (!dbUser) {
    dbUser = await prisma.user.create({
      data: {
        supabaseId,
        email,
        ...(metaName ? { name: metaName } : {}),
        ...(metaPhone ? { phone: metaPhone } : {}),
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
  } else {
    const needsEmailUpdate = dbUser.email !== email;
    const needsNameUpdate = metaName && dbUser.name !== metaName;
    const needsPhoneUpdate = metaPhone && dbUser.phone !== metaPhone;

    if (needsEmailUpdate || needsNameUpdate || needsPhoneUpdate) {
      dbUser = await prisma.user.update({
        where: { id: dbUser.id },
        data: {
          ...(needsEmailUpdate ? { email } : {}),
          ...(needsNameUpdate ? { name: metaName } : {}),
          ...(needsPhoneUpdate ? { phone: metaPhone } : {}),
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
    }
  }

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
});

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