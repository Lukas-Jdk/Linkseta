// src/app/api/dashboard/services/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getClientIp, rateLimitOrThrow } from "@/lib/rateLimit";
import { auditLog } from "@/lib/audit";
import { logError, newRequestId } from "@/lib/logger";
import { requireCsrf } from "@/lib/csrf";

export const dynamic = "force-dynamic";

const BUCKET = "service-images";

function clampText(x: unknown, max: number) {
  if (typeof x !== "string") return null;
  const t = x.trim();
  return t ? t.slice(0, max) : null;
}

async function removeFromStorage(path: string) {
  if (!path) return;
  try {
    const { error } = await supabaseAdmin.storage.from(BUCKET).remove([path]);
    if (error) console.warn("Storage remove error:", error.message);
  } catch (e) {
    console.warn("Storage remove exception:", e);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestId = newRequestId();
  const ip = getClientIp(req);
  const ua = req.headers.get("user-agent") ?? null;

  try {
    const csrfErr = requireCsrf(req);
    if (csrfErr) return csrfErr;

    await rateLimitOrThrow({
      key: `dashboard:patchService:${ip}`,
      limit: 60,
      windowMs: 60_000,
    });

    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const service = await prisma.serviceListing.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        userId: true,
        title: true,
        description: true,
        cityId: true,
        categoryId: true,
        priceFrom: true,
        isActive: true,
        imageUrl: true,
        imagePath: true,
        highlights: true,
      },
    });

    if (!service) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (service.userId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const safePrefix = `${user.id}/`;

    const body = await req.json().catch(() => ({} as any));

    const nextTitle = clampText(body?.title, 120) ?? service.title;
    const nextDesc = clampText(body?.description, 4000) ?? service.description;

    const nextCityId = typeof body?.cityId === "string" ? body.cityId : service.cityId;
    const nextCategoryId = typeof body?.categoryId === "string" ? body.categoryId : service.categoryId;

    const nextPriceFrom =
      body?.priceFrom === undefined
        ? service.priceFrom
        : body?.priceFrom === null
          ? null
          : Number.isFinite(Number(body.priceFrom))
            ? Math.max(0, Math.min(10_000_000, Math.trunc(Number(body.priceFrom))))
            : service.priceFrom;

    const nextIsActive = typeof body?.isActive === "boolean" ? body.isActive : service.isActive;

    const nextImageUrl =
      body?.imageUrl === undefined ? service.imageUrl : clampText(body?.imageUrl, 600);

    const requestedPath =
      body?.imagePath === undefined ? service.imagePath : clampText(body?.imagePath, 300);

    const nextImagePath = requestedPath && requestedPath.length > 0 ? requestedPath : null;

    if (nextImagePath && !nextImagePath.startsWith(safePrefix)) {
      return NextResponse.json({ error: "Invalid imagePath" }, { status: 400 });
    }

    const highlights: string[] = Array.isArray(body?.highlights)
      ? body.highlights
          .map((s: unknown) => String(s).trim())
          .filter(Boolean)
          .slice(0, 6)
      : service.highlights;

    const oldPath = service.imagePath;

    const isPathChanged = oldPath && nextImagePath && oldPath !== nextImagePath;
    const isRemoved = oldPath && !nextImagePath;
    const shouldDeleteOld = (isPathChanged || isRemoved) && oldPath!.startsWith(safePrefix);

    const updated = await prisma.serviceListing.update({
      where: { id: service.id },
      data: {
        title: nextTitle,
        description: nextDesc,
        cityId: nextCityId ?? null,
        categoryId: nextCategoryId ?? null,
        priceFrom: nextPriceFrom,
        isActive: nextIsActive,
        imageUrl: nextImageUrl,
        imagePath: nextImagePath,
        highlights,
      },
      select: { id: true, imagePath: true, isActive: true, title: true },
    });

    if (shouldDeleteOld) await removeFromStorage(oldPath!);

    await auditLog({
      action: "SERVICE_UPDATE",
      entity: "ServiceListing",
      entityId: updated.id,
      userId: user.id,
      ip,
      userAgent: ua,
      metadata: {
        changedKeys: Object.keys(body ?? {}),
        removedOldImage: Boolean(shouldDeleteOld),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e instanceof Response) return e;

    logError("PATCH /api/dashboard/services/[id] failed", {
      requestId,
      route: "/api/dashboard/services/[id]",
      ip,
      meta: { message: e?.message, stack: e?.stack },
    });

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestId = newRequestId();
  const ip = getClientIp(req);
  const ua = req.headers.get("user-agent") ?? null;

  try {
    const csrfErr = requireCsrf(req);
    if (csrfErr) return csrfErr;

    await rateLimitOrThrow({
      key: `dashboard:deleteService:${ip}`,
      limit: 20,
      windowMs: 60_000,
    });

    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const service = await prisma.serviceListing.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, userId: true, imagePath: true },
    });

    if (!service) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (service.userId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const safePrefix = `${user.id}/`;
    if (service.imagePath && service.imagePath.startsWith(safePrefix)) {
      await removeFromStorage(service.imagePath);
    }

    await prisma.serviceListing.update({
      where: { id: service.id },
      data: { deletedAt: new Date(), isActive: false },
    });

    await auditLog({
      action: "SERVICE_DELETE",
      entity: "ServiceListing",
      entityId: service.id,
      userId: user.id,
      ip,
      userAgent: ua,
      metadata: { softDelete: true },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e instanceof Response) return e;

    logError("DELETE /api/dashboard/services/[id] failed", {
      requestId,
      route: "/api/dashboard/services/[id]",
      ip,
      meta: { message: e?.message, stack: e?.stack },
    });

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}