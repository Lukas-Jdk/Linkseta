// src/app/api/dashboard/services/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

type Params = { id: string };

// PATCH – atnaujinti savo paslaugą
export async function PATCH(
  req: Request,
  { params }: { params: Promise<Params> }
) {
  const { id } = await params;

  const { response, user } = await requireUser();
  if (response || !user) {
    return response!;
  }

  try {
    const body = await req.json();

    const {
      title,
      description,
      cityId,
      categoryId,
      priceFrom,
      imageUrl,
    } = body as {
      title?: string;
      description?: string;
      cityId?: string | null;
      categoryId?: string | null;
      priceFrom?: string | number | null;
      imageUrl?: string | null;
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

    const result = await prisma.serviceListing.updateMany({
      where: {
        id,
        userId: user.id, // 👈 labai svarbu – tik savo skelbimą
      },
      data: {
        title,
        description,
        cityId: cityId || null,
        categoryId: categoryId || null,
        priceFrom: Number.isNaN(price as number)
          ? null
          : (price as number | null),
        imageUrl: imageUrl || null,
      },
    });

    if (result.count === 0) {
      // arba nėra tokios paslaugos, arba ji ne to userio
      return NextResponse.json(
        { error: "Paslauga nerasta arba neturite teisės ją redaguoti" },
        { status: 404 }
      );
    }

    // perskaitom atnaujintą įrašą, kad grąžinti realius duomenis
    const service = await prisma.serviceListing.findUnique({
      where: { id },
      include: {
        city: true,
        category: true,
      },
    });

    return NextResponse.json({ success: true, service });
  } catch (err: unknown) {
    console.error("PATCH /api/dashboard/services/:id error", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Nepavyko atnaujinti paslaugos", details: message },
      { status: 500 }
    );
  }
}

// DELETE – ištrinti savo paslaugą
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<Params> }
) {
  const { id } = await params;

  const { response, user } = await requireUser();
  if (response || !user) {
    return response!;
  }

  try {
    const result = await prisma.serviceListing.deleteMany({
      where: {
        id,
        userId: user.id,
      },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: "Paslauga nerasta arba neturite teisės ją ištrinti" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("DELETE /api/dashboard/services/:id error", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Nepavyko ištrinti paslaugos", details: message },
      { status: 500 }
    );
  }
}

// GET – gauti savo paslaugą
export async function GET(
  _req: Request,
  { params }: { params: Promise<Params> }
) {
  const { id } = await params;

  const { response, user } = await requireUser();
  if (response || !user) {
    return response!;
  }

  try {
    const service = await prisma.serviceListing.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: { city: true, category: true },
    });

    if (!service) {
      return NextResponse.json(
        { error: "Paslauga nerasta" },
        { status: 404 }
      );
    }

    return NextResponse.json(service);
  } catch (err: unknown) {
    console.error("GET /api/dashboard/services/:id error", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Klaida", details: message },
      { status: 500 }
    );
  }
}
