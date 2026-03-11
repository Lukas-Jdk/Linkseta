// src/app/[locale]/auth/confirm/route.ts
import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

const ALLOWED_TYPES: EmailOtpType[] = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
];

function isOtpType(value: string | null): value is EmailOtpType {
  return Boolean(value && ALLOWED_TYPES.includes(value as EmailOtpType));
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  const url = new URL(req.url);

  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const flow = url.searchParams.get("flow");

  const loginUrl = new URL(`/${locale}/login`, url.origin);
  const errorUrl = new URL(`/${locale}/login`, url.origin);
  errorUrl.searchParams.set("error", "confirm_failed");

  if (!tokenHash || !isOtpType(type)) {
    return NextResponse.redirect(errorUrl);
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });

  if (error) {
    console.error("GET /auth/confirm verifyOtp error:", error);
    return NextResponse.redirect(errorUrl);
  }

  if (flow === "signup-confirmed") {
    loginUrl.searchParams.set("confirmed", "1");
    return NextResponse.redirect(loginUrl);
  }

  const dashboardUrl = new URL(`/${locale}/dashboard`, url.origin);
  return NextResponse.redirect(dashboardUrl);
}