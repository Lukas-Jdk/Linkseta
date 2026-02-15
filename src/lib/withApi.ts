// src/lib/withApi.ts
import { NextResponse } from "next/server";
import { log } from "@/lib/logger";

export async function withApi<T>(
  req: Request,
  name: string,
  fn: () => Promise<NextResponse<T>>
) {
  const start = Date.now();

  try {
    const res = await fn();
    log("info", `${name} ok`, {
      ms: Date.now() - start,
      status: res.status,
    });
    return res;
  } catch (e) {
    log("error", `${name} error`, {
      ms: Date.now() - start,
      error: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}