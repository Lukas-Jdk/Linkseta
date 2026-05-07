// src/app/api/chat/read/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { requireCsrf } from "@/lib/csrf";
import { getClientIp, rateLimitOrThrow } from "@/lib/rateLimit";
import { logError, newRequestId } from "@/lib/logger";

export const dynamic = "force-dynamic";

type Body = {
  conversationId?: unknown;
};

function jsonNoStore(data: unknown, init?: ResponseInit) {
  const res = NextResponse.json(data, init);
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function POST(req: Request) {
  const requestId = newRequestId();
  const ip = getClientIp(req);

  try {
    const csrfErr = requireCsrf(req);
    if (csrfErr) return csrfErr;

    await rateLimitOrThrow({
      key: `chat:read:${ip}`,
      limit: 120,
      windowMs: 60_000,
    });

    const user = await getAuthUser();

    if (!user) {
      return jsonNoStore({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as Body;
    const conversationId =
      typeof body.conversationId === "string"
        ? body.conversationId.trim()
        : "";

    if (!conversationId) {
      return jsonNoStore({ error: "Missing conversationId" }, { status: 400 });
    }

    const participant = await prisma.$queryRaw<Array<{ id: string }>>`
      select id
      from conversation_participants
      where conversation_id = ${conversationId}
        and user_id = ${user.id}
      limit 1
    `;

    if (!participant[0]) {
      return jsonNoStore({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.$executeRaw`
      update messages
      set read_at = now()
      where conversation_id = ${conversationId}
        and sender_id <> ${user.id}
        and read_at is null
    `;

    return jsonNoStore({
      ok: true,
      updated,
    });
  } catch (e: any) {
    if (e instanceof Response) return e;

    logError("POST /api/chat/read failed", {
      requestId,
      route: "/api/chat/read",
      ip,
      meta: { message: e?.message, stack: e?.stack },
    });

    return jsonNoStore({ error: "Server error" }, { status: 500 });
  }
}