// src/app/api/admin/services/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type ParamsArg =
  | { params: { id: string } }
  | { params: Promise<{ id: string }> };

async function resolveParams(props: ParamsArg): Promise<{ id: string }> {
  const value = props.params;

  if (typeof value === "object" && value !== null && "then" in value) {
    // Promise variantas (Next 15)
    return value as Promise<{ id: string }>;
  }

  return value as { id: string };
}

// PATCH /api/admin/services/:id  – keičiam isActive / highlighted
export async function PATCH(req: Request, props: ParamsArg) {
  try {
    const { id } = await resolveParams(props);
    const body = await req.json();

    const data: { isActive?: boolean; highlighted?: boolean } = {};
    if ("isActive" in body) data.isActive = Boolean(body.isActive);

    if ("highlighted" in body) data.highlighted = Boolean(body.highlighted);

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "Nėra laukų atnaujinimui" },
        { status: 400 }
      );
    }

    const service = await prisma.serviceListing.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, service });
  } catch (err: unknown) {
    console.error("PATCH /api/admin/services/:id error", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Nepavyko atnaujinti paslaugos", details: message },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/services/:id
export async function DELETE(_req: Request, props: ParamsArg) {
  try {
    const { id } = await resolveParams(props);

    const service = await prisma.serviceListing.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Paslauga ištrinta",
      service,
    });
  } catch (err: unknown) {
    console.error("DELETE /api/admin/services/:id error", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Nepavyko ištrinti paslaugos", details: message },
      { status: 500 }
    );
  }
}

// GET /api/admin/services/:id
export async function GET(_req: Request, props: ParamsArg) {
  try {
    const { id } = await resolveParams(props);

    const service = await prisma.serviceListing.findUnique({
      where: { id },
      include: {
        user: true,
        city: true,
        category: true,
      },
    });

    if (!service) {
      return NextResponse.json({ error: "Paslauga nerasta" }, { status: 404 });
    }

    return NextResponse.json(service);
  } catch (err: unknown) {
    console.error("GET /api/admin/services/:id error", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Klaida", details: message },
      { status: 500 }
    );
  }
}
