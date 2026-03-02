// src/lib/auth/index.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { prisma } from "@/lib/prisma";

type Role = "USER" | "ADMIN";

export type AuthUser = {
  id: string;
  email: string;
  role: Role;
  name: string | null;
  phone: string | null;
  avatarUrl: string | null;
};

function getEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

async function getServerSupabase() {
  const cookieStore = await cookies(); // ✅ FIX

  return createServerClient(
    getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // ignore (server component contexts)
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: "", ...options, maxAge: 0 });
          } catch {
            // ignore
          }
        },
      },
    },
  );
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const supabase = await getServerSupabase(); // ✅ FIX

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const email = data.user.email;
  if (!email) return null;

  const dbUser = await prisma.user.findUnique({
    where: { id: data.user.id },
    select: {
      id: true,
      email: true,
      role: true,
      name: true,
      phone: true,
      avatarUrl: true,
    },
  });

  if (!dbUser) {
    return {
      id: data.user.id,
      email,
      role: "USER",
      name: null,
      phone: null,
      avatarUrl: null,
    };
  }

  return {
    id: dbUser.id,
    email: dbUser.email,
    role: dbUser.role as Role,
    name: dbUser.name,
    phone: dbUser.phone,
    avatarUrl: dbUser.avatarUrl,
  };
}