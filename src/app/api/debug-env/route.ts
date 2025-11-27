// src/app/api/debug-env/route.ts
import { NextResponse } from "next/server";

type DebugEnv = {
  supabaseUrl?: string;
  nodeEnv?: string;
};

export async function GET() {
  const data: DebugEnv = {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    nodeEnv: process.env.NODE_ENV,
  };

  return NextResponse.json(data);
}
