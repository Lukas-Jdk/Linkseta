// src/app/api/dashboard/services/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getClientIp, rateLimitOrThrow } from "@/lib/rateLimit";
import { auditLog } from "@/lib/audit";
import { logError, newRequestId } from "@/lib/logger";

export const dynamic = "force-dynamic";

const BUCKET = "service-images";

async function removeFromStorage(path: string) {
  if (!path) return;
  try {
    const { error } = await supabaseAdmin.storage.from(BUCKET).remove([path]);
    if (error) console.warn("Storage remove error:", error.message);
  } catch (e) {
    console.warn("Storage remove exception:", e);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = newRequestId();
  const ip = getClientIp(req);
  const ua = req.headers.get("user-agent") ?? null;

  try {
    rateLimitOrThrow({
      key: `dashboard:patchService:${ip}`,
      limit: 60,
      windowMs: 60_000,
    });

    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const service = await prisma.serviceListing.findFirst({
      where: { id, deletedAt: null },
    });

    if (!service) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (service.userId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();

    const nextImageUrl: string | null =
      body.imageUrl === undefined ? service.imageUrl : body.imageUrl;

    const nextImagePath: string | null =
      body.imagePath === undefined ? service.imagePath : body.imagePath;

    const highlights: string[] = Array.isArray(body.highlights)
      ? body.highlights.map((s: unknown) => String(s).trim()).filter(Boolean).slice(0, 6)
      : service.highlights;

    const oldPath = service.imagePath;
    const safePrefix = `${user.id}/`;

    const isPathChanged = oldPath && nextImagePath && oldPath !== nextImagePath;
    const isRemoved = oldPath && (nextImagePath === null || nextImagePath === "");
    const shouldDelete = (isPathChanged || isRemoved) && oldPath.startsWith(safePrefix);

    const updated = await prisma.serviceListing.update({
      where: { id: service.id },
      data: {
        title: body.title ?? service.title,
        description: body.description ?? service.description,
        cityId: body.cityId ?? service.cityId,
        categoryId: body.categoryId ?? service.categoryId,
        priceFrom: body.priceFrom ?? service.priceFrom,
        isActive: body.isActive ?? service.isActive,
        imageUrl: nextImageUrl,
        imagePath: nextImagePath || null,
        highlights,
      },
      select: {
        id: true,
        title: true,
        isActive: true,
        imagePath: true,
      },
    });

    if (shouldDelete) await removeFromStorage(oldPath!);

    await auditLog({
      action: "SERVICE_UPDATE",
      entity: "ServiceListing",
      entityId: updated.id,
      userId: user.id,
      ip,
      userAgent: ua,
      metadata: {
        changed: Object.keys(body ?? {}),
        removedOldImage: Boolean(shouldDelete),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e instanceof Response) return e;

    logError("PATCH /api/dashboard/services/[id] failed", {
      requestId,
      route: "/api/dashboard/services/[id]",
      ip,
      userId: undefined,
      meta: { message: e?.message, stack: e?.stack },
    });

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = newRequestId();
  const ip = getClientIp(req);
  const ua = req.headers.get("user-agent") ?? null;

  try {
    rateLimitOrThrow({
      key: `dashboard:deleteService:${ip}`,
      limit: 20,
      windowMs: 60_000,
    });

    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const service = await prisma.serviceListing.findFirst({
      where: { id, deletedAt: null },
    });

    if (!service) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (service.userId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    if (service.imagePath && service.imagePath.startsWith(`${user.id}/`)) {
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