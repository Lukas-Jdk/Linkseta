// src/app/api/dashboard/my-services/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 🟦 PATCH – redaguoti paslaugą
export async function PATCH(
  req: Request,
  props:
    | { params: { id: string } }
    | { params: Promise<{ id: string }> }
) {
  try {
    const resolved =
      "then" in props.params ? await props.params : props.params;
    const id = resolved.id;

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const body = await req.json();
    const {
      title,
      description,
      priceFrom,
      priceTo,
      cityId,
      categoryId,
    } = body as {
      title?: string;
      description?: string;
      priceFrom?: number | null;
      priceTo?: number | null;
      cityId?: string | null;
      categoryId?: string | null;
    };

    if (!title || !description) {
      return NextResponse.json(
        { error: "Title and description are required" },
        { status: 400 }
      );
    }

    const service = await prisma.serviceListing.update({
      where: { id },
      data: {
        title,
        description,
        priceFrom: priceFrom ?? null,
        priceTo: priceTo ?? null,
        cityId: cityId || null,
        categoryId: categoryId || null,
      },
      include: {
        city: true,
        category: true,
      },
    });

    return NextResponse.json({ ok: true, service });
  } catch (error) {
    console.error("update service error:", error);
    return NextResponse.json(
      { error: "Server error", details: String(error) },
      { status: 500 }
    );
  }
}

// 🟥 DELETE – ištrinti paslaugą
export async function DELETE(
  _req: Request,
  props:
    | { params: { id: string } }
    | { params: Promise<{ id: string }> }
) {
  try {
    const resolved =
      "then" in props.params ? await props.params : props.params;
    const id = resolved.id;

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    await prisma.serviceListing.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("delete service error:", error);
    return NextResponse.json(
      { error: "Server error", details: String(error) },
      { status: 500 }
    );
  }
}
