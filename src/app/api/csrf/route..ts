// src/app/api/csrf/route.ts
import { NextResponse } from "next/server";
import { CSRF_COOKIE, newCsrfToken } from "@/lib/csrf";

export const dynamic = "force-dynamic";

export async function GET() {
  const token = newCsrfToken();

  const res = NextResponse.json({ token }, { status: 200 });

  // CSRF cookie MUST be readable by browser (not HttpOnly),
  // because we also send it in header from JS.
  res.cookies.set({
    name: CSRF_COOKIE,
    value: token,
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return res;
}