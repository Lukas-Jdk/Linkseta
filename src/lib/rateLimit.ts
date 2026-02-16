// src/lib/rateLimit.ts
import { NextResponse } from "next/server";

type RateLimitArgs = {
  key: string;
  limit: number;
  windowMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number; // unix ms, kada langas “atsinaujina”
};

type Bucket = {
  count: number;
  resetAt: number;
};

// ⚠️ In-memory – ant Vercel serverless tai “best effort” (gerai nuo basic spam),
// rimtam rate limit vėliau darysim su Redis/Upstash/KV.
const store = new Map<string, Bucket>();

export function rateLimit({ key, limit, windowMs }: RateLimitArgs): RateLimitResult {
  const now = Date.now();
  const cur = store.get(key);

  if (!cur || now >= cur.resetAt) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: Math.max(0, limit - 1), resetAt };
  }

  if (cur.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: cur.resetAt };
  }

  cur.count += 1;
  store.set(key, cur);

  return { allowed: true, remaining: Math.max(0, limit - cur.count), resetAt: cur.resetAt };
}

export function getClientIp(req: Request) {
  // Vercel / proxies
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() || "unknown";

  // fallback
  const realIp = req.headers.get("x-real-ip");
  return realIp || "unknown";
}

// Jei viršijo limitą – metame Response (kad galėtum catch’e `if (e instanceof Response) return e`)
export function rateLimitOrThrow(args: RateLimitArgs) {
  const rl = rateLimit(args);

  if (!rl.allowed) {
    const retryAfterSeconds = Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000));

    throw NextResponse.json(
      { error: "Per daug užklausų. Bandykite vėliau." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSeconds),
          "X-RateLimit-Remaining": String(rl.remaining),
          "X-RateLimit-Reset": String(rl.resetAt),
        },
      }
    );
  }

  return rl;
}