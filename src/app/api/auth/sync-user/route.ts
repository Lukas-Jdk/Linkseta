// src/app/api/auth/sync-user/route.ts
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { getClientIp, rateLimitOrThrow } from "@/lib/rateLimit";
import { withApi } from "@/lib/withApi";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return withApi(req, "POST /api/auth/sync-user", async () => {
    const ip = getClientIp(req);

    await rateLimitOrThrow({
      key: `auth:sync-user:${ip}`,
      limit: 20,
      windowMs: 60_000,
    });

    const { user, response } = await requireUser();
    if (response || !user) return response!;

    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();

    const meta = (data.user?.user_metadata ?? {}) as Record<string, unknown>;
    const metaName = typeof meta.name === "string" ? meta.name.trim() : null;
    const metaPhone = typeof meta.phone === "string" ? meta.phone.trim() : null;

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(metaName ? { name: metaName } : {}),
        ...(metaPhone ? { phone: metaPhone } : {}),
      },
      select: { id: true, email: true, name: true, phone: true, role: true, avatarUrl: true },
    });

    return NextResponse.json({ ok: true, user: updated }, { status: 200 });
  });
}