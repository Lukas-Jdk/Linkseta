// src/lib/auth.ts
import { NextResponse } from "next/server";
import { prisma } from "./prisma";
import { createSupabaseServerClient } from "./supabaseServer";

export type AuthUser = {
  id: string;
  email: string;
  role: "USER" | "ADMIN";
};

export async function getAuthUser(): Promise<AuthUser | null> {
  // 👇 DABAR BŪTINAI su await
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user || !data.user.email) {
    return null;
  }

  const email = data.user.email;

  const dbUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true },
  });

  if (!dbUser) return null;

  return {
    id: dbUser.id,
    email,
    role: dbUser.role,
  };
}

// requireUser ir requireAdmin gali likti tokie pat kaip turi
