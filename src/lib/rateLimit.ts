// src/lib/rateLimit.ts
import { NextResponse } from "next/server";

type Bucket = {
  count: number;
  resetAt: number; // ms timestamp
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

type RateLimitOpts = {
  key: string;
  limit: number;
  windowMs: number;
};

// Paprastas in-memory rate limit (ok dev'ui / mažam deploy).
// Serverless prod'e gali resetintis tarp instancų -> vėliau galima perkelti į Redis/Upstash.
const buckets = new Map<string, Bucket>();

export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();

  const xri = req.headers.get("x-real-ip");
  if (xri) return xri.trim();

  return "unknown";
}

export function rateLimit(opts: RateLimitOpts): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(opts.key);

  if (!bucket || now >= bucket.resetAt) {
    const resetAt = now + opts.windowMs;
    buckets.set(opts.key, { count: 1, resetAt });
    return { allowed: true, remaining: opts.limit - 1, resetAt };
  }

  bucket.count += 1;

  const remaining = Math.max(0, opts.limit - bucket.count);
  const allowed = bucket.count <= opts.limit;

  return { allowed, remaining, resetAt: bucket.resetAt };
}

/**
 * Jei viršijo limitą — meta Response (NextResponse), kurį gali `catch` ir `return`.
 */
export function rateLimitOrThrow(opts: RateLimitOpts): void {
  const rl = rateLimit(opts);

  if (!rl.allowed) {
    throw NextResponse.json(
      {
        error: "Per daug užklausų. Bandykite vėliau.",
        resetAt: rl.resetAt,
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Remaining": String(rl.remaining),
          "X-RateLimit-Reset": String(rl.resetAt),
        },
      }
    );
  }
}