// src/lib/rateLimit.ts
import { NextResponse } from "next/server";

type Bucket = {
  count: number;
  resetAt: number; // epoch ms
};

const buckets = new Map<string, Bucket>();

/**
 * Paprastas in-memory rate limit.
 * ✅ Tinka MVP / dev / small traffic
 * ⚠️ Serverless'e (Vercel) gali resetintis tarp instancų — bet vis tiek labai padeda.
 */
export function rateLimitOrThrow(opts: {
  key: string;
  limit: number; // kiek leidžiam per window
  windowMs: number; // pvz 60_000
}) {
  const now = Date.now();
  const existing = buckets.get(opts.key);

  if (!existing || now > existing.resetAt) {
    buckets.set(opts.key, { count: 1, resetAt: now + opts.windowMs });
    return;
  }

  existing.count += 1;

  if (existing.count > opts.limit) {
    const retryAfterSec = Math.ceil((existing.resetAt - now) / 1000);
    throw NextResponse.json(
      { error: "Per daug užklausų. Bandykite vėliau." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSec),
        },
      }
    );
  }
}

export function getClientIp(req: Request) {
  // Vercel / proxies dažnai siunčia x-forwarded-for
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return "unknown";
}