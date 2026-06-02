// src/app/api/chat/start/route.ts
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { requireCsrf } from "@/lib/csrf";
import { getClientIp, rateLimitOrThrow } from "@/lib/rateLimit";
import { auditLog } from "@/lib/audit";
import { logError, newRequestId } from "@/lib/logger";
import { hasPremiumAccess } from "@/lib/planAccess";

export const dynamic = "force-dynamic";

type StartChatBody = {
  serviceId?: unknown;
};

function jsonNoStore(data: unknown, init?: ResponseInit) {
  const res = NextResponse.json(data, init);
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function POST(req: Request) {
  const requestId = newRequestId();
  const ip = getClientIp(req);
  const ua = req.headers.get("user-agent") ?? null;

  try {
    const csrfErr = requireCsrf(req);
    if (csrfErr) return csrfErr;

    await rateLimitOrThrow({
      key: `chat:start:${ip}`,
      limit: 30,
      windowMs: 60_000,
    });

    const user = await getAuthUser();

    if (!user) {
      return jsonNoStore(
        { error: "Prisijunkite, kad galėtumėte rašyti žinutę." },
        { status: 401 },
      );
    }

    const body = (await req.json().catch(() => ({}))) as StartChatBody;

    const serviceId =
      typeof body.serviceId === "string" ? body.serviceId.trim() : "";

    if (!serviceId) {
      return jsonNoStore({ error: "Trūksta paslaugos ID." }, { status: 400 });
    }

    const service = await prisma.serviceListing.findFirst({
      where: {
        id: serviceId,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        user: {
          select: {
            id: true,
            profile: {
              select: {
                lifetimeFree: true,
                trialEndsAt: true,
                stripeSubscriptionId: true,
                subscriptionStatus: true,
                plan: {
                  select: {
                    slug: true,
                    isTrial: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!service) {
      return jsonNoStore({ error: "Paslauga nerasta." }, { status: 404 });
    }

    const sellerUserId = service.user.id;

    if (sellerUserId === user.id) {
      return jsonNoStore(
        { error: "Negalite rašyti žinutės sau." },
        { status: 400 },
      );
    }

    if (!hasPremiumAccess(service.user.profile)) {
      return jsonNoStore(
        {
          error: "Šis paslaugos teikėjas šiuo metu neturi aktyvaus chat.",
          code: "SELLER_CHAT_NOT_AVAILABLE",
        },
        { status: 403 },
      );
    }

    const existing = await prisma.$queryRaw<Array<{ id: string }>>`
      select c.id
      from conversations c
      where c.service_id = ${service.id}
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
            and cp2.user_id = ${sellerUserId}
        )
      limit 1
    `;

    if (existing[0]?.id) {
      await prisma.providerInteraction.upsert({
        where: {
          serviceId_userId_type: {
            serviceId: service.id,
            userId: user.id,
            type: "CHAT",
          },
        },
        update: {},
        create: {
          serviceId: service.id,
          providerId: sellerUserId,
          userId: user.id,
          type: "CHAT",
          ipHash: null,
        },
      });

      return jsonNoStore({
        ok: true,
        conversationId: existing[0].id,
        created: false,
      });
    }

    const conversationId = randomUUID();
    const buyerParticipantId = randomUUID();
    const sellerParticipantId = randomUUID();

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        insert into conversations (
          id,
          service_id,
          created_by,
          created_at,
          last_message_at
        )
        values (
          ${conversationId},
          ${service.id},
          ${user.id},
          now(),
          now()
        )
      `;

      await tx.$executeRaw`
        insert into conversation_participants (
          id,
          conversation_id,
          user_id,
          created_at
        )
        values (
          ${buyerParticipantId},
          ${conversationId},
          ${user.id},
          now()
        )
      `;

      await tx.$executeRaw`
        insert into conversation_participants (
          id,
          conversation_id,
          user_id,
          created_at
        )
        values (
          ${sellerParticipantId},
          ${conversationId},
          ${sellerUserId},
          now()
        )
      `;

      await tx.providerInteraction.upsert({
        where: {
          serviceId_userId_type: {
            serviceId: service.id,
            userId: user.id,
            type: "CHAT",
          },
        },
        update: {},
        create: {
          serviceId: service.id,
          providerId: sellerUserId,
          userId: user.id,
          type: "CHAT",
          ipHash: null,
        },
      });
    });

    await auditLog({
      action: "CHAT_CONVERSATION_CREATE",
      entity: "Conversation",
      entityId: conversationId,
      userId: user.id,
      ip,
      userAgent: ua,
      metadata: {
        serviceId: service.id,
        serviceTitle: service.title,
        sellerUserId,
      },
    });

    return jsonNoStore({
      ok: true,
      conversationId,
      created: true,
    });
  } catch (e: any) {
    if (e instanceof Response) return e;

    logError("POST /api/chat/start failed", {
      requestId,
      route: "/api/chat/start",
      ip,
      meta: { message: e?.message, stack: e?.stack },
    });

    return jsonNoStore({ error: "Serverio klaida." }, { status: 500 });
  }
}