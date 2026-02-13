// src/lib/rateLimit.ts
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

type Options = { limit: number; windowMs: number };

export function rateLimit(key: string, opts: Options) {
  const now = Date.now();
  const b = buckets.get(key);

  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true };
  }

  if (b.count >= opts.limit) {
    return { ok: false };
  }

  b.count += 1;
  buckets.set(key, b);
  return { ok: true };
}

export function getIp(req: Request) {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}