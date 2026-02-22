// src/lib/http.ts
import { NextResponse } from "next/server";

export function jsonNoStore(body: unknown, init?: ResponseInit) {
  const res = NextResponse.json(body, init);
  res.headers.set("Cache-Control", "no-store, max-age=0");
  res.headers.set("Pragma", "no-cache");
  return res;
}

export function textNoStore(text: string, init?: ResponseInit) {
  const res = new NextResponse(text, init);
  res.headers.set("Cache-Control", "no-store, max-age=0");
  res.headers.set("Pragma", "no-cache");
  return res;
}