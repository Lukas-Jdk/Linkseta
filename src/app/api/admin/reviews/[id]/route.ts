// src/app/api/admin/reviews/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { requireCsrf } from "@/lib/csrf";
import { logError, newRequestId } from "@/lib/logger";
import { getClientIp, rateLimitOrThrow } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

type Body = {
  action?: "approve" | "reject";
};

function jsonNoStore(data: unknown, init?: ResponseInit) {
  const res = NextResponse.json(data, init);
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = newRequestId();
  const ip = getClientIp(req);

  try {
    const csrfErr = requireCsrf(req);
    if (csrfErr) return csrfErr;

    const { response } = await requireAdmin();
    if (response) return response;

    await rateLimitOrThrow({
      key: `admin:reviews:${ip}`,
      limit: 60,
      windowMs: 60_000,
    });

    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as Body;

    if (body.action !== "approve" && body.action !== "reject") {
      return jsonNoStore({ error: "Invalid action" }, { status: 400 });
    }

    const existing = await prisma.serviceReview.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return jsonNoStore({ error: "Review not found" }, { status: 404 });
    }

    if (body.action === "approve") {
      await prisma.serviceReview.update({
        where: { id },
        data: {
          isApproved: true,
          isVisible: true,
        },
      });

      return jsonNoStore({
        ok: true,
        action: "approve",
      });
    }

    await prisma.serviceReview.update({
      where: { id },
      data: {
        isApproved: false,
        isVisible: false,
        isSuspicious: false,
      },
    });

    return jsonNoStore({
      ok: true,
      action: "reject",
    });
  } catch (err) {
    logError("PATCH /api/admin/reviews/[id] failed", {
      requestId,
      route: "/api/admin/reviews/[id]",
      ip,
      meta: {
        message: err instanceof Error ? err.message : String(err),
      },
    });

    return jsonNoStore({ error: "Serverio klaida." }, { status: 500 });
  }
}