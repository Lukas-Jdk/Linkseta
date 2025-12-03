// src/app/api/admin/provider-requests/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ProviderRequestStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";

type Params = { id: string };

// PATCH – keičiam providerRequest statusą + kuriam user/profile/service
export async function PATCH(
  req: Request,
  { params }: { params: Promise<Params> }
) {
  const { id } = await params;

  // 🔐 Tik ADMIN
  const { response, user } = await requireAdmin();
  if (response || !user) {
    return response!;
  }

  try {
    const body = await req.json();
    const status = body.status as ProviderRequestStatus | undefined;

    const allowed = Object.values(ProviderRequestStatus);
    if (!status || !allowed.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status", allowed, received: status },
        { status: 400 }
      );
    }

    // 1) randam esamą requestą
    const existing = await prisma.providerRequest.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "ProviderRequest not found" },
        { status: 404 }
      );
    }

    let createdUser = null;
    let providerProfile = null;
    let serviceListing = null;

    // 2) jei patvirtinam pirmą kartą – kuriam user + providerProfile + serviceListing
    if (status === "APPROVED" && existing.status !== "APPROVED") {
      if (!existing.email) {
        return NextResponse.json(
          { error: "ProviderRequest has no email – cannot create User" },
          { status: 400 }
        );
      }

      const userFromReq = await prisma.user.upsert({
        where: { email: existing.email },
        update: {
          name: existing.name,
          phone: existing.phone ?? undefined,
        },
        create: {
          email: existing.email,
          name: existing.name,
          phone: existing.phone ?? undefined,
        },
      });

      createdUser = userFromReq;

      providerProfile = await prisma.providerProfile.upsert({
        where: { userId: userFromReq.id },
        update: {
          companyName: existing.name,
          description: existing.message ?? undefined,
          isApproved: true,
        },
        create: {
          userId: userFromReq.id,
          companyName: existing.name,
          description: existing.message ?? undefined,
          isApproved: true,
        },
      });

      const existingListing = await prisma.serviceListing.findFirst({
        where: { userId: userFromReq.id },
      });

      if (!existingListing) {
        serviceListing = await prisma.serviceListing.create({
          data: {
            userId: userFromReq.id,
            title: existing.name,
            slug: `service-${existing.id}`,
            description:
              existing.message && existing.message.trim().length > 0
                ? existing.message
                : "Paslaugų teikėjas Norvegijoje.",
            cityId: existing.cityId ?? undefined,
            categoryId: existing.categoryId ?? undefined,
            isActive: true,
            highlighted: false,
          },
        });
      } else {
        serviceListing = existingListing;
      }
    }

    // 3) atnaujinam patį requestą
    const updated = await prisma.providerRequest.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({
      ok: true,
      updated,
      user: createdUser,
      providerProfile,
      serviceListing,
    });
  } catch (error) {
    console.error("PATCH /api/admin/provider-requests/:id error:", error);
    return NextResponse.json(
      { error: "Server error", details: String(error) },
      { status: 500 }
    );
  }
}
