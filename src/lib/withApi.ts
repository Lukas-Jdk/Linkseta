// src/lib/withApi.ts
import { NextResponse } from "next/server";
import { log } from "@/lib/log";

function getIpFromReq(req: Request) {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function getUaFromReq(req: Request) {
  return req.headers.get("user-agent") ?? "unknown";
}

// overload'ai (kad TS suprastų abu kvietimus)
export function withApi(
  name: string,
  fn: () => Promise<Response>
): Promise<Response>;
export function withApi(
  req: Request,
  name: string,
  fn: () => Promise<Response>
): Promise<Response>;

export async function withApi(
  a: Request | string,
  b: string | (() => Promise<Response>),
  c?: () => Promise<Response>
): Promise<Response> {
  const start = Date.now();

  const hasReq = typeof a !== "string";
  const req = hasReq ? (a as Request) : null;

  const name = hasReq ? (b as string) : (a as string);
  const fn = hasReq ? (c as () => Promise<Response>) : (b as () => Promise<Response>);

  const baseMeta = req
    ? { ip: getIpFromReq(req), ua: getUaFromReq(req) }
    : {};

  try {
    const res = await fn();

    log("info", `${name} ok`, {
      ...baseMeta,
      ms: Date.now() - start,
      status: res.status,
    });

    return res;
  } catch (e: any) {
    
    if (e instanceof Response) return e;

    log("error", `${name} fail`, {
      ...baseMeta,
      ms: Date.now() - start,
      error: e?.message ?? String(e),
    });

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}