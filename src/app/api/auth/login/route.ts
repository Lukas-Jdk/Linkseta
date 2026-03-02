// src/app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { withApi } from "@/lib/withApi";
import { requireCsrf } from "@/lib/csrf";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return withApi(req, "POST /api/auth/login", async () => {
    const csrfErr = requireCsrf(req);
    if (csrfErr) return csrfErr;

    const body = (await req.json().catch(() => null)) as
      | { email?: string; password?: string }
      | null;

    const email = body?.email?.trim() ?? "";
    const password = body?.password ?? "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "Missing email or password" },
        { status: 400 },
      );
    }

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      return NextResponse.json(
        { error: error?.message ?? "Login failed" },
        { status: 401 },
      );
    }

    // Svarbu: createServerClient pats su setAll įrašys cookies į response per Next cookies store
    return NextResponse.json({ ok: true });
  });
}