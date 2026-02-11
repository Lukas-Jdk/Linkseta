// src/app/api/dashboard/services/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

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

    const highlights: string[] = Array.isArray(body.highlights)
      ? body.highlights
          .map((s: unknown) => String(s).trim())
          .filter(Boolean)
          .slice(0, 6)
      : service.highlights;

    await prisma.serviceListing.update({
      where: { id },
      data: {
        title: body.title ?? service.title,
        description: body.description ?? service.description,
        cityId: body.cityId ?? service.cityId,
        categoryId: body.categoryId ?? service.categoryId,
        priceFrom: body.priceFrom ?? service.priceFrom,
        imageUrl: body.imageUrl ?? service.imageUrl,
        highlights, 
      },
    });

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

    await prisma.serviceListing.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/dashboard/services/[id] error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
