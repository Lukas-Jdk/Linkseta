// src/app/api/admin/provider-requests/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ProviderRequestStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";

type Params = { id: string };

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<Params> }) {
  const { id } = await params;

  const { response, user } = await requireAdmin();
  if (response || !user) return response!;

  try {
    const body = await req.json().catch(() => ({}));
    const status = body.status as ProviderRequestStatus | undefined;

    const allowed = Object.values(ProviderRequestStatus);
    if (!status || !allowed.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status", allowed, received: status },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1) paimam request
      const existing = await tx.providerRequest.findUnique({ where: { id } });
      if (!existing) {
        return { kind: "NOT_FOUND" as const };
      }

      // 2) jei tiesiog keičiam į PENDING/REJECTED arba jau buvo APPROVED -> tik update
      const willApproveFirstTime =
        status === "APPROVED" && existing.status !== "APPROVED";

      let createdUser = null;
      let providerProfile = null;
      let serviceListing = null;

      if (willApproveFirstTime) {
        if (!existing.email) {
          return { kind: "BAD_REQUEST" as const, error: "ProviderRequest has no email" };
        }

        // 2.1) user upsert
        const userFromReq = await tx.user.upsert({
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

        // 2.2) provider profile upsert + patvirtinam
        providerProfile = await tx.providerProfile.upsert({
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

        // 2.3) pirmas listing (jei dar nėra)
        const existingListing = await tx.serviceListing.findFirst({
          where: { userId: userFromReq.id },
        });

        if (!existingListing) {
          // slug – stabilus ir unikalus pagal request id
          const slug = `service-${existing.id}`;

          serviceListing = await tx.serviceListing.create({
            data: {
              userId: userFromReq.id,
              title: existing.name,
              slug,
              description:
                existing.message && existing.message.trim().length > 0
                  ? existing.message
                  : "Paslaugų teikėjas Norvegijoje.",
              cityId: existing.cityId ?? undefined,
              categoryId: existing.categoryId ?? undefined,
              isActive: true,
              highlighted: false,
              priceFrom: null,
              imageUrl: null,
              highlights: [],
            },
          });
        } else {
          serviceListing = existingListing;
        }
      }

      // 3) update request status
      const updated = await tx.providerRequest.update({
        where: { id },
        data: { status },
      });

      return {
        kind: "OK" as const,
        updated,
        user: createdUser,
        providerProfile,
        serviceListing,
      };
    });

    if (result.kind === "NOT_FOUND") {
      return NextResponse.json({ error: "ProviderRequest not found" }, { status: 404 });
    }

    if (result.kind === "BAD_REQUEST") {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      updated: result.updated,
      user: result.user,
      providerProfile: result.providerProfile,
      serviceListing: result.serviceListing,
    });
  } catch (error) {
    console.error("PATCH /api/admin/provider-requests/:id error:", error);
    return NextResponse.json(
      { error: "Server error", details: String(error) },
      { status: 500 }
    );
  }
}
