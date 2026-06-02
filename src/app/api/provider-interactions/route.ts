// src/app/api/provider-interactions/route.ts
import { NextResponse } from "next/server";
import { ProviderInteractionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { requireCsrf } from "@/lib/csrf";
import { getClientIp, rateLimitOrThrow } from "@/lib/rateLimit";
import crypto from "crypto";

export const dynamic = "force-dynamic";

function hashIp(ip: string) {
  return crypto
    .createHash("sha256")
    .update(`provider-interaction:${ip}`)
    .digest("hex");
}

function cleanType(value: unknown): ProviderInteractionType | null {
  if (value === "VIEW") return "VIEW";
  if (value === "CHAT") return "CHAT";
  if (value === "PHONE") return "PHONE";
  if (value === "EMAIL") return "EMAIL";
  return null;
}

export async function POST(req: Request) {
  const ip = getClientIp(req);

  try {
    const csrfErr = requireCsrf(req);
    if (csrfErr) return csrfErr;

    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    await rateLimitOrThrow({
      key: `provider-interaction:${ip}:${user.id}`,
      limit: 60,
      windowMs: 60_000,
    });

    const body = await req.json().catch(() => ({}));

    const serviceId =
      typeof body?.serviceId === "string" ? body.serviceId.trim() : "";

    const type = cleanType(body?.type);

    if (!serviceId || !type) {
      return NextResponse.json(
        { error: "Invalid interaction." },
        { status: 400 },
      );
    }

    const service = await prisma.serviceListing.findFirst({
      where: {
        id: serviceId,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!service) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    if (service.userId === user.id) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    await prisma.providerInteraction.upsert({
      where: {
        serviceId_userId_type: {
          serviceId: service.id,
          userId: user.id,
          type,
        },
      },
      update: {},
      create: {
        serviceId: service.id,
        providerId: service.userId,
        userId: user.id,
        type,
        ipHash: hashIp(ip),
      },
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}