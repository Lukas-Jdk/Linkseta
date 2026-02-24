import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { withApi } from "@/lib/withApi";
import { requireCsrf } from "@/lib/csrf";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return withApi(req, "POST /api/auth/logout", async () => {
    // logout yra mutating veiksmas su cookie session -> CSRF
    const csrfErr = requireCsrf(req);
    if (csrfErr) return csrfErr;

    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();

    // 204 - be body (greita ir švaru)
    return new NextResponse(null, { status: 204 });
  });
}