// src/lib/supabaseServer.ts
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase env variables");
}

function isProd() {
  return process.env.NODE_ENV === "production";
}

/**
 * Supabase SSR cookies:
 * - keep Supabase-provided options (maxAge/expires/domain/path)
 * - enforce secure in production
 * - enforce sameSite=lax (good CSRF baseline for normal web apps)
 * - default httpOnly=true if not provided (auth cookies should be httpOnly)
 * - ensure path="/"
 */
function hardenCookieOptions(options: CookieOptions): CookieOptions {
  return {
    ...options,

    // default to httpOnly=true if Supabase didn't specify
    httpOnly: typeof options.httpOnly === "boolean" ? options.httpOnly : true,

    secure: isProd(),
    sameSite: (options.sameSite ?? "lax") as CookieOptions["sameSite"],
    path: options.path ?? "/",
  };
}

type CookieStoreLike = {
  get(name: string): { value: string } | undefined;
  set(name: string, value: string, options: CookieOptions): void;
};

export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const cookieStore = (await cookies()) as unknown as CookieStoreLike;

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },

      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set(name, value, hardenCookieOptions(options));
        } catch {
          // kai kuriuose runtime cookies gali būti read-only (pvz. edge / static) – ignore
        }
      },

      remove(name: string, options: CookieOptions) {
        try {
          // svarbu: išlaikyti expires/maxAge logiką
          cookieStore.set(
            name,
            "",
            hardenCookieOptions({
              ...options,
              maxAge: 0,
            }),
          );
        } catch {
          // ignore
        }
      },
    },
  });
}