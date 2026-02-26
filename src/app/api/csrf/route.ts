// src/app/api/csrf/route.ts
import { NextResponse } from "next/server";
import { CSRF_COOKIE, newCsrfToken } from "@/lib/csrf";

export const dynamic = "force-dynamic";

export async function GET() {
  const token = newCsrfToken();

  const res = NextResponse.json({ token }, { status: 200 });
  res.headers.set("Cache-Control", "no-store");

  res.cookies.set(CSRF_COOKIE, token, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return res;
}