// src/app/api/admin/services/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type ParamsArg =
  | { params: { id: string } }
  | { params: Promise<{ id: string }> };

async function resolveParams(props: ParamsArg) {
  // @ts-ignore – Next 15 kartais duoda Promise
  if (props.params && "then" in props.params) {
    // @ts-ignore
    return await props.params;
  }
  // @ts-ignore
  return props.params;
}

// PATCH /api/admin/services/:id  – keičiam isActive / highlighted
export async function PATCH(req: Request, props: ParamsArg) {
  try {
    const { id } = await resolveParams(props);
    const body = await req.json();

    const data: any = {};
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
  } catch (err: any) {
    console.error("PATCH /api/admin/services/:id error", err);
    return NextResponse.json(
      { error: "Nepavyko atnaujinti paslaugos", details: String(err?.message) },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/services/:id
export async function DELETE(req: Request, props: ParamsArg) {
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
  } catch (err: any) {
    console.error("DELETE /api/admin/services/:id error", err);
    return NextResponse.json(
      { error: "Nepavyko ištrinti paslaugos", details: String(err?.message) },
      { status: 500 }
    );
  }
}

// GET /api/admin/services/:id (nebūtina, bet paliekam)
export async function GET(req: Request, props: ParamsArg) {
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
      return NextResponse.json(
        { error: "Paslauga nerasta" },
        { status: 404 }
      );
    }

    return NextResponse.json(service);
  } catch (err: any) {
    console.error("GET /api/admin/services/:id error", err);
    return NextResponse.json(
      { error: "Klaida", details: String(err?.message) },
      { status: 500 }
    );
  }
}
