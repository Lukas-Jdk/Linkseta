// src/lib/csrf.ts
import { NextResponse } from "next/server";
import crypto from "crypto";

export const CSRF_COOKIE = "csrf_token";
export const CSRF_HEADER = "x-csrf-token";

// Simple cookie parser for Request headers
function readCookie(req: Request, name: string): string | null {
  const cookie = req.headers.get("cookie");
  if (!cookie) return null;

  // cookie header: "a=b; c=d"
  const parts = cookie.split(";").map((p) => p.trim());
  for (const p of parts) {
    const eq = p.indexOf("=");
    if (eq === -1) continue;
    const k = p.slice(0, eq).trim();
    if (k !== name) continue;
    const v = p.slice(eq + 1);
    try {
      return decodeURIComponent(v);
    } catch {
      return v;
    }
  }
  return null;
}

export function newCsrfToken() {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * CSRF check: for non-GET/HEAD/OPTIONS methods require:
 * - cookie csrf_token exists
 * - header x-csrf-token exists
 * - header === cookie
 */
export function requireCsrf(req: Request): NextResponse | null {
  const method = req.method.toUpperCase();
  const safe = method === "GET" || method === "HEAD" || method === "OPTIONS";
  if (safe) return null;

  const cookieToken = readCookie(req, CSRF_COOKIE);
  const headerToken = req.headers.get(CSRF_HEADER);

  if (!cookieToken || !headerToken || headerToken !== cookieToken) {
    return NextResponse.json(
      { error: "CSRF check failed" },
      { status: 403 },
    );
  }

  return null;
}