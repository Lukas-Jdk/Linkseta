// src/app/api/dashboard/services/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

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
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const service = await prisma.serviceListing.findUnique({ where: { id } });
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

    // ✅ jei imagePath pasikeitė → trinam seną failą
    const oldPath = service.imagePath;
    const isPathChanged =
      oldPath && nextImagePath && oldPath !== nextImagePath;

    // ✅ jei vartotojas pašalino nuotrauką (nusiuntė null/""), ir buvo sena → trinam seną
    const isRemoved =
      oldPath && (nextImagePath === null || nextImagePath === "");

    // Saugumo “guard”: trinam tik savo user foldery
    const safePrefix = `${user.id}/`;
    const shouldDelete =
      (isPathChanged || isRemoved) && oldPath.startsWith(safePrefix);

    await prisma.serviceListing.update({
      where: { id },
      data: {
        title: body.title ?? service.title,
        description: body.description ?? service.description,
        cityId: body.cityId ?? service.cityId,
        categoryId: body.categoryId ?? service.categoryId,
        priceFrom: body.priceFrom ?? service.priceFrom,
        imageUrl: nextImageUrl,
        imagePath: nextImagePath || null,
        highlights,
      },
    });

    if (shouldDelete) {
      await removeFromStorage(oldPath);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/dashboard/services/[id] error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const service = await prisma.serviceListing.findUnique({ where: { id } });
    if (!service) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (service.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ✅ pirma ištrinam failą iš storage, tada DB įrašą
    if (service.imagePath && service.imagePath.startsWith(`${user.id}/`)) {
      await removeFromStorage(service.imagePath);
    }

    await prisma.serviceListing.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/dashboard/services/[id] error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}