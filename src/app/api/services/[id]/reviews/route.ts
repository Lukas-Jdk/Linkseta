//src/app/api/services/[id]/reviews/route.ts
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCsrf } from "@/lib/csrf";
import { getAuthUser } from "@/lib/auth";
import { getClientIp, rateLimitOrThrow } from "@/lib/rateLimit";
import { logError, newRequestId } from "@/lib/logger";
import crypto from "crypto";

export const dynamic = "force-dynamic";

function cleanNullableText(value: unknown, max: number) {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().slice(0, max);
  return cleaned.length > 0 ? cleaned : null;
}

function cleanRating(value: unknown) {
  const num = Number(value);
  if (!Number.isInteger(num)) return null;
  if (num < 1 || num > 5) return null;
  return num;
}

function hashIp(ip: string) {
  return crypto.createHash("sha256").update(`review:${ip}`).digest("hex");
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = newRequestId();
  const ip = getClientIp(req);

  try {
    const csrfErr = requireCsrf(req);
    if (csrfErr) return csrfErr;

    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json(
        { error: "Atsiliepimą gali palikti tik prisijungęs vartotojas." },
        { status: 401 },
      );
    }

    await rateLimitOrThrow({
      key: `review:create:${ip}:${user.id}`,
      limit: 3,
      windowMs: 60_000,
    });

    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const rating = cleanRating(body?.rating);
    const comment = cleanNullableText(body?.comment, 1000);

    if (!rating) {
      return NextResponse.json(
        { error: "Pasirinkite įvertinimą nuo 1 iki 5." },
        { status: 400 },
      );
    }

    const service = await prisma.serviceListing.findFirst({
      where: {
        id,
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!service) {
      return NextResponse.json({ error: "Paslauga nerasta." }, { status: 404 });
    }

    if (service.userId === user.id) {
      return NextResponse.json(
        { error: "Negalite palikti atsiliepimo savo paslaugai." },
        { status: 400 },
      );
    }

    const name = user.name?.trim() || user.email.split("@")[0];
    const ipHash = hashIp(ip);

    await prisma.serviceReview.create({
      data: {
        serviceId: service.id,
        userId: user.id,
        ipHash,
        name,
        rating,
        comment,
        isApproved: true,
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Atsiliepimas išsaugotas.",
    });
  } catch (err: unknown) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Jūs jau palikote atsiliepimą šiai paslaugai." },
        { status: 409 },
      );
    }

    logError("POST /api/services/[id]/reviews failed", {
      requestId,
      route: "/api/services/[id]/reviews",
      ip,
      meta: { message: err instanceof Error ? err.message : String(err) },
    });

    return NextResponse.json({ error: "Serverio klaida." }, { status: 500 });
  }
}
