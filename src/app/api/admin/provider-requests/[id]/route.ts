// src/app/api/admin/provider-requests/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ProviderRequestStatus } from "@prisma/client";

export async function PATCH(
  req: Request,
  props: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  try {
    // ⬇ Universalus params ištraukimas (veikia abiem atvejais!)
    const resolved = "then" in props.params ? await props.params : props.params;
    const id = resolved.id;

    if (!id) {
      return NextResponse.json({ error: "Missing ID in URL" }, { status: 400 });
    }

    const body = await req.json();
    const status = body.status as ProviderRequestStatus | undefined;

    const allowed = Object.values(ProviderRequestStatus);
    if (!status || !allowed.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status", allowed, received: status },
        { status: 400 }
      );
    }

    // 1️⃣ Paimam esamą ProviderRequest
    const existing = await prisma.providerRequest.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "ProviderRequest not found" },
        { status: 404 }
      );
    }

    let user = null;
    let providerProfile = null;
    let serviceListing = null;

    // 2️⃣ Jei status keičiam į APPROVED ir anksčiau nebuvo APPROVED →
    //    sukuriam/susiejame User + ProviderProfile + ServiceListing
    if (status === "APPROVED" && existing.status !== "APPROVED") {
      if (!existing.email) {
        return NextResponse.json(
          { error: "ProviderRequest has no email – cannot create User" },
          { status: 400 }
        );
      }

      // 2.1. User upsert pagal email
      user = await prisma.user.upsert({
        where: { email: existing.email },
        update: {
          // jei vartotojas jau yra – atnaujinam basic info
          name: existing.name,
          phone: existing.phone ?? undefined,
        },
        create: {
          email: existing.email,
          name: existing.name,
          phone: existing.phone ?? undefined,
          // role nereikia – @default(USER)
        },
      });

      // 2.2. ProviderProfile upsert pagal userId
      providerProfile = await prisma.providerProfile.upsert({
        where: { userId: user.id },
        update: {
          companyName: existing.name,
          description: existing.message ?? undefined,
          isApproved: true,
        },
        create: {
          userId: user.id,
          companyName: existing.name,
          description: existing.message ?? undefined,
          isApproved: true,
        },
      });

      // 2.3. Automatinis ServiceListing sukūrimas (jei dar neturi)
      const existingListing = await prisma.serviceListing.findFirst({
        where: { userId: user.id },
      });

      if (!existingListing) {
        serviceListing = await prisma.serviceListing.create({
          data: {
            userId: user.id,
            title: existing.name,
            slug: `service-${existing.id}`, // unikalus pagal request id
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

    // 3️⃣ Atnaujinam patį ProviderRequest (tik statusą)
    const updated = await prisma.providerRequest.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({
      ok: true,
      updated,
      user,
      providerProfile,
      serviceListing,
    });
  } catch (error) {
    console.error("PATCH request error:", error);
    return NextResponse.json(
      { error: "Server error", details: String(error) },
      { status: 500 }
    );
  }
}
