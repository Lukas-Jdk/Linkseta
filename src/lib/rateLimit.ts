// src/lib/rateLimit.ts
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

type RateLimitArgs = {
  key: string;
  limit: number;
  windowMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number; // unix ms
};

type Bucket = {
  count: number;
  resetAt: number;
};

// Initialize Upstash Redis client or null if env vars missing
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

// Log once if Redis is not configured (dev still works)
let warnedNoRedis = false;

// Fallback in-memory store (dev)
const fallbackStore = new Map<string, Bucket>();

export async function rateLimit({
  key,
  limit,
  windowMs,
}: RateLimitArgs): Promise<RateLimitResult> {
  const now = Date.now();
  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));

  if (redis) {
    try {
      // increment
      const count = await redis.incr(key);

      // set expiry on first increment
      if (count === 1) {
        await redis.expire(key, windowSeconds);
      }

      // TTL tells the real reset moment (important!)
      const ttl = await redis.ttl(key); // seconds
      const ttlSeconds = typeof ttl === "number" && ttl > 0 ? ttl : windowSeconds;

      const resetAt = now + ttlSeconds * 1000;
      const allowed = count <= limit;

      return {
        allowed,
        remaining: Math.max(0, limit - count),
        resetAt,
      };
    } catch (error) {
      // If Redis fails: fail-open but log (so production doesn't die)
      console.error("Redis rate limit error:", error);
      return {
        allowed: true,
        remaining: limit,
        resetAt: now + windowMs,
      };
    }
  }

  // No Redis configured → fallback
  if (!warnedNoRedis) {
    warnedNoRedis = true;
    console.warn(
      "Rate limit: UPSTASH env vars missing. Using in-memory fallback (not production-safe).",
    );
  }

  const cur = fallbackStore.get(key);

  if (!cur || now >= cur.resetAt) {
    const resetAt = now + windowMs;
    fallbackStore.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: Math.max(0, limit - 1), resetAt };
  }

  if (cur.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: cur.resetAt };
  }

  cur.count += 1;
  fallbackStore.set(key, cur);

  return {
    allowed: true,
    remaining: Math.max(0, limit - cur.count),
    resetAt: cur.resetAt,
  };
}

export function getClientIp(req: Request) {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() || "unknown";

  const realIp = req.headers.get("x-real-ip");
  return realIp || "unknown";
}

export async function rateLimitOrThrow(args: RateLimitArgs) {
  const rl = await rateLimit(args);

  if (!rl.allowed) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((rl.resetAt - Date.now()) / 1000),
    );

    throw NextResponse.json(
      { error: "Per daug užklausų. Bandykite vėliau." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSeconds),
          "X-RateLimit-Remaining": String(rl.remaining),
          "X-RateLimit-Reset": String(rl.resetAt),
        },
      },
    );
  }

  return rl;
} 