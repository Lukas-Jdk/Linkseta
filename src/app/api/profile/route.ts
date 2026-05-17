// src/app/api/profile/route.ts
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
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

function cleanOptionalInt(value: unknown, max: number) {
  if (value === null || value === undefined || value === "") return null;

  const num = Number(value);
  if (!Number.isInteger(num) || num < 0 || num > max) return null;

  return num;
}

function cleanWorkingHours(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const data = value as Record<string, unknown>;

  const weekdays = cleanText(data.weekdays, 80);
  const saturday = cleanText(data.saturday, 80);
  const sunday = cleanText(data.sunday, 80);

  if (!weekdays && !saturday && !sunday) return null;

  return {
    weekdays,
    saturday,
    sunday,
  };
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

    const about = cleanNullableText(body?.about, 2000);
    const aboutEn = cleanNullableText(body?.aboutEn, 2000);
    const aboutNo = cleanNullableText(body?.aboutNo, 2000);

    const experienceYears = cleanOptionalInt(body?.experienceYears, 80);
    const completedProjects = cleanOptionalInt(body?.completedProjects, 100000);
    const workingHours = cleanWorkingHours(body?.workingHours);

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

    const updated = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          name,
          phone,
        },
        select: {
          name: true,
          phone: true,
        },
      });

      await tx.providerProfile.updateMany({
        where: { userId: user.id },
        data: {
          companyName,
          about,
          aboutEn,
          aboutNo,
          experienceYears,
          completedProjects,
          workingHours: workingHours ?? Prisma.JsonNull,
        },
      });

      return updatedUser;
    });

    await auditLog({
      action: "PROFILE_UPDATE",
      entity: "User",
      entityId: user.id,
      userId: user.id,
      ip,
      userAgent: ua,
      metadata: {
        changedFields: [
          "name",
          "phone",
          "companyName",
          "about",
          "aboutEn",
          "aboutNo",
          "experienceYears",
          "completedProjects",
          "workingHours",
        ],
      },
    });

    return NextResponse.json({
      ok: true,
      profile: {
        name: updated.name,
        phone: updated.phone,
        companyName,
        about,
        aboutEn,
        aboutNo,
        experienceYears,
        completedProjects,
        workingHours: workingHours ?? null,
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