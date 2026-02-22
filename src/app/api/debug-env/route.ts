// src/app/api/debug-env/route.ts
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getClientIp, rateLimitOrThrow } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // Production'e šitas endpointas NETURI egzistuoti
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Dev'e vis tiek užrakinam admin + rate limit
  const ip = getClientIp(req);
  await rateLimitOrThrow({ key: `debug-env:${ip}`, limit: 10, windowMs: 60_000 });

  const { response } = await requireAdmin();
  if (response) return response;

  return NextResponse.json({
    ok: true,
    nodeEnv: process.env.NODE_ENV,
  });
}