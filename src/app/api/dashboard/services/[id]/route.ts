// src/app/api/dashboard/services/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getClientIp, rateLimitOrThrow } from "@/lib/rateLimit";

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
  try {
    const ip = getClientIp(req);

    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    //  rate limit po auth + userId + ip
    rateLimitOrThrow({
      key: `dashboard:patchService:${user.id}:${ip}`,
      limit: 60,
      windowMs: 60_000,
    });

    const { id } = await params;

    const service = await prisma.serviceListing.findFirst({
      where: { id, deletedAt: null },
    });

    if (!service) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (service.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    const nextImageUrl: string | null =
      body.imageUrl === undefined ? service.imageUrl : body.imageUrl;

    const nextImagePath: string | null =
      body.imagePath === undefined ? service.imagePath : body.imagePath;

    const highlights: string[] = Array.isArray(body.highlights)
      ? body.highlights
          .map((s: unknown) => String(s).trim())
          .filter(Boolean)
          .slice(0, 6)
      : service.highlights;

    const oldPath = service.imagePath;
    const safePrefix = `${user.id}/`;

    const isPathChanged =
      oldPath && nextImagePath && oldPath !== nextImagePath;

    const isRemoved =
      oldPath && (nextImagePath === null || nextImagePath === "");

    const shouldDelete =
      (isPathChanged || isRemoved) && oldPath.startsWith(safePrefix);

    await prisma.serviceListing.update({
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
    });

    if (shouldDelete) {
      await removeFromStorage(oldPath!);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e instanceof Response) return e;

    console.error("API error: PATCH /api/dashboard/services/[id]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(req);

    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

  
    rateLimitOrThrow({
      key: `dashboard:deleteService:${user.id}:${ip}`,
      limit: 20,
      windowMs: 60_000,
    });

    const { id } = await params;

    const service = await prisma.serviceListing.findFirst({
      where: { id, deletedAt: null },
    });

    if (!service) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (service.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (service.imagePath && service.imagePath.startsWith(`${user.id}/`)) {
      await removeFromStorage(service.imagePath);
    }

    await prisma.serviceListing.update({
      where: { id: service.id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e instanceof Response) return e;

    console.error("API error: DELETE /api/dashboard/services/[id]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}