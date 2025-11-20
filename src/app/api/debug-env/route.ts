import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$connect();
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("DB TEST ERROR:", error);
    return NextResponse.json(
      {
        ok: false,
        name: error?.name,
        code: error?.code,
        message: error?.message,
      },
      { status: 500 }
    );
  }
}
