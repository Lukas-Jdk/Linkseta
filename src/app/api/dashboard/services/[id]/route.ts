// src/app/api/dashboard/services/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type ParamsArg =
  | { params: { id: string } }
  | { params: Promise<{ id: string }> };

async function resolveParams(props: ParamsArg) {
  // @ts-ignore
  if (props.params && "then" in props.params) {
    // @ts-ignore
    return await props.params;
  }
  // @ts-ignore
  return props.params;
}

// PATCH – atnaujinti paslaugą
export async function PATCH(req: Request, props: ParamsArg) {
  try {
    const { id } = await resolveParams(props);
    const body = await req.json();

    const {
      title,
      description,
      cityId,
      categoryId,
      priceFrom,
    } = body as {
      title?: string;
      description?: string;
      cityId?: string | null;
      categoryId?: string | null;
      priceFrom?: string | number | null;
    };

    if (!title || !description) {
      return NextResponse.json(
        { error: "Trūksta pavadinimo arba aprašymo" },
        { status: 400 }
      );
    }

    const price =
      priceFrom === null || priceFrom === "" || priceFrom === undefined
        ? null
        : Number(priceFrom);

    const updated = await prisma.serviceListing.update({
      where: { id },
      data: {
        title,
        description,
        cityId: cityId || null,
        categoryId: categoryId || null,
        priceFrom: isNaN(price as number) ? null : (price as number | null),
      },
    });

    return NextResponse.json({ success: true, service: updated });
  } catch (err: any) {
    console.error("PATCH /api/dashboard/services/:id error", err);
    return NextResponse.json(
      { error: "Nepavyko atnaujinti paslaugos", details: String(err?.message) },
      { status: 500 }
    );
  }
}

// DELETE – ištrinti
export async function DELETE(req: Request, props: ParamsArg) {
  try {
    const { id } = await resolveParams(props);

    await prisma.serviceListing.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/dashboard/services/:id error", err);
    return NextResponse.json(
      { error: "Nepavyko ištrinti paslaugos", details: String(err?.message) },
      { status: 500 }
    );
  }
}

// GET – jei kada prireiks
export async function GET(req: Request, props: ParamsArg) {
  try {
    const { id } = await resolveParams(props);

    const service = await prisma.serviceListing.findUnique({
      where: { id },
      include: { city: true, category: true },
    });

    if (!service) {
      return NextResponse.json(
        { error: "Paslauga nerasta" },
        { status: 404 }
      );
    }

    return NextResponse.json(service);
  } catch (err: any) {
    console.error("GET /api/dashboard/services/:id error", err);
    return NextResponse.json(
      { error: "Klaida", details: String(err?.message) },
      { status: 500 }
    );
  }
}
