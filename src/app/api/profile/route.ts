// src/app/api/profile/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { requireCsrf } from "@/lib/csrf";
import { getClientIp, rateLimitOrThrow } from "@/lib/rateLimit";
import { auditLog } from "@/lib/audit";
import { logError, newRequestId } from "@/lib/logger";

export const dynamic = "force-dynamic";

function cleanText(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function cleanNullableText(value: unknown, max: number) {
  const cleaned = cleanText(value, max);
  return cleaned.length > 0 ? cleaned : null;
}

function isValidPhone(phone: string | null) {
  if (!phone) return true;
  return /^[0-9+\-\s()]{5,30}$/.test(phone);
}

export async function PATCH(req: Request) {
  const requestId = newRequestId();
  const ip = getClientIp(req);
  const ua = req.headers.get("user-agent") ?? null;

  try {
    const csrfErr = requireCsrf(req);
    if (csrfErr) return csrfErr;

    await rateLimitOrThrow({
      key: `profile:update:${ip}`,
      limit: 20,
      windowMs: 60_000,
    });

    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: "Neprisijungęs." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

    const name = cleanText(body?.name, 80);
    const phone = cleanNullableText(body?.phone, 30);
    const companyName = cleanNullableText(body?.companyName, 120);

    if (name.length < 2) {
      return NextResponse.json(
        { error: "Vardas turi būti bent 2 simbolių." },
        { status: 400 },
      );
    }

    if (!isValidPhone(phone)) {
      return NextResponse.json(
        { error: "Telefono numeris neteisingas." },
        { status: 400 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          name,
          phone,
        },
      });

      await tx.providerProfile.updateMany({
        where: { userId: user.id },
        data: {
          companyName,
        },
      });
    });

    await auditLog({
      action: "PROFILE_UPDATE",
      entity: "User",
      entityId: user.id,
      userId: user.id,
      ip,
      userAgent: ua,
      metadata: {
        changedFields: ["name", "phone", "companyName"],
      },
    });

    return NextResponse.json({
      ok: true,
      profile: {
        name,
        phone,
        companyName,
      },
    });
  } catch (err: unknown) {
    if (err instanceof Response) return err;

    logError("PATCH /api/profile failed", {
      requestId,
      route: "/api/profile",
      ip,
      meta: { message: err instanceof Error ? err.message : String(err) },
    });

    return NextResponse.json({ error: "Serverio klaida." }, { status: 500 });
  }
}