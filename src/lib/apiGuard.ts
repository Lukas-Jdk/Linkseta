// src/lib/apiGuard.ts
import { NextResponse } from "next/server";
import { getClientIp, rateLimit } from "@/lib/rateLimit";

type GuardOptions = {
  limit: number;
  windowMs: number;
  name?: string;
};

export async function withRateLimit(
  req: Request,
  handler: () => Promise<NextResponse>,
  opts: GuardOptions
) {
  const ip = getClientIp(req);
  const key = `ip:${ip}:${opts.name ?? "api"}`;

  const rl = rateLimit({ key, limit: opts.limit, windowMs: opts.windowMs });

  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Per daug užklausų. Bandykite vėliau." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Remaining": String(rl.remaining),
          "X-RateLimit-Reset": String(rl.resetAt),
        },
      }
    );
  }

  const res = await handler();
  res.headers.set("X-RateLimit-Remaining", String(rl.remaining));
  res.headers.set("X-RateLimit-Reset", String(rl.resetAt));
  return res;
}