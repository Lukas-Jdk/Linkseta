// src/app/api/chat/support/start/route.ts
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { requireCsrf } from "@/lib/csrf";
import { getClientIp, rateLimitOrThrow } from "@/lib/rateLimit";
import { logError, newRequestId } from "@/lib/logger";

export const dynamic = "force-dynamic";

function jsonNoStore(data: unknown, init?: ResponseInit) {
  const res = NextResponse.json(data, init);
  res.headers.set("Cache-Control", "no-store");
  return res;
}

async function getSupportUserId() {
  const supportUserId = process.env.LINKSETA_SUPPORT_USER_ID?.trim();

  if (supportUserId) {
    const user = await prisma.user.findUnique({
      where: { id: supportUserId },
      select: { id: true },
    });

    if (user) return user.id;
  }

  const supportEmail =
    process.env.LINKSETA_SUPPORT_EMAIL?.trim() || "info@linkseta.com";

  const supportUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: supportEmail },
        { name: { equals: "Linkseta Support", mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });

  return supportUser?.id ?? null;
}

export async function POST(req: Request) {
  const requestId = newRequestId();
  const ip = getClientIp(req);

  try {
    const csrfErr = requireCsrf(req);
    if (csrfErr) return csrfErr;

    await rateLimitOrThrow({
      key: `chat:support:start:${ip}`,
      limit: 20,
      windowMs: 60_000,
    });

    const user = await getAuthUser();

    if (!user) {
      return jsonNoStore(
        { error: "Prisijunkite, kad galėtumėte rašyti į support." },
        { status: 401 },
      );
    }

    const supportUserId = await getSupportUserId();

    if (!supportUserId) {
      return jsonNoStore(
        {
          error:
            "Support paskyra nerasta. Sukurkite userį info@linkseta.com arba pridėkite LINKSETA_SUPPORT_USER_ID.",
        },
        { status: 500 },
      );
    }

    if (supportUserId === user.id) {
      return jsonNoStore(
        { error: "Jūs jau esate support paskyroje." },
        { status: 400 },
      );
    }

    const existing = await prisma.$queryRaw<Array<{ id: string }>>`
      select c.id
      from conversations c
      where c.service_id is null
        and exists (
          select 1
          from conversation_participants cp1
          where cp1.conversation_id = c.id
            and cp1.user_id = ${user.id}
        )
        and exists (
          select 1
          from conversation_participants cp2
          where cp2.conversation_id = c.id
            and cp2.user_id = ${supportUserId}
        )
      limit 1
    `;

    if (existing[0]?.id) {
      return jsonNoStore({
        ok: true,
        conversationId: existing[0].id,
        created: false,
      });
    }

    const conversationId = randomUUID();
    const userParticipantId = randomUUID();
    const supportParticipantId = randomUUID();

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        insert into conversations (id, service_id, created_by, created_at, last_message_at)
        values (${conversationId}, null, ${user.id}, now(), now())
      `;

      await tx.$executeRaw`
        insert into conversation_participants (id, conversation_id, user_id, created_at)
        values (${userParticipantId}, ${conversationId}, ${user.id}, now())
      `;

      await tx.$executeRaw`
        insert into conversation_participants (id, conversation_id, user_id, created_at)
        values (${supportParticipantId}, ${conversationId}, ${supportUserId}, now())
      `;
    });

    return jsonNoStore({
      ok: true,
      conversationId,
      created: true,
    });
  } catch (err) {
    logError("POST /api/chat/support/start failed", {
      requestId,
      route: "/api/chat/support/start",
      ip,
      meta: {
        message: err instanceof Error ? err.message : String(err),
      },
    });

    return jsonNoStore({ error: "Serverio klaida." }, { status: 500 });
  }
}