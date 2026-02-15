// src/app/api/debug-env/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  // Production'e šitas endpointas neturi egzistuot.
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }


  return NextResponse.json({
    ok: true,
    nodeEnv: process.env.NODE_ENV,
  });
}