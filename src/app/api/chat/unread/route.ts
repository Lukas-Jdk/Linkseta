// src/app/api/chat/unread/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { logError, newRequestId } from "@/lib/logger";
import { getClientIp, rateLimitOrThrow } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

function jsonNoStore(data: unknown, init?: ResponseInit) {
  const res = NextResponse.json(data, init);
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function GET(req: Request) {
  const requestId = newRequestId();
  const ip = getClientIp(req);

  try {
    await rateLimitOrThrow({
      key: `chat:unread:${ip}`,
      limit: 120,
      windowMs: 60_000,
    });

    const user = await getAuthUser();

    if (!user) {
      return jsonNoStore({ unread: 0, loggedIn: false });
    }

    const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
      select count(*)::bigint as count
      from messages m
      where m.sender_id <> ${user.id}
        and m.read_at is null
        and exists (
          select 1
          from conversation_participants cp
          where cp.conversation_id = m.conversation_id
            and cp.user_id = ${user.id}
        )
    `;

    const unread = Number(rows[0]?.count ?? 0);

    return jsonNoStore({
      unread,
      loggedIn: true,
    });
  } catch (e: any) {
    logError("GET /api/chat/unread failed", {
      requestId,
      route: "/api/chat/unread",
      ip,
      meta: { message: e?.message, stack: e?.stack },
    });

    return jsonNoStore({ unread: 0, loggedIn: false });
  }
}