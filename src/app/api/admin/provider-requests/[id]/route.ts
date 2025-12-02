// src/app/api/admin/provider-requests/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ProviderRequestStatus } from "@prisma/client";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

type ParamsArg =
  | { params: { id: string } }
  | { params: Promise<{ id: string }> };

async function resolveParams(props: ParamsArg): Promise<{ id: string }> {
  const value = props.params;
  if (typeof value === "object" && value !== null && "then" in value) {
    return (value as Promise<{ id: string }>);
  }
  return value as { id: string };
}

// 🔐 Bendra funkcija – patikrina, ar prisijungęs ADMIN
async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user?.email) {
    return { ok: false as const, status: 401, message: "Unauthorized" };
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: data.user.email },
    select: { role: true },
  });

  if (!dbUser || dbUser.role !== "ADMIN") {
    return { ok: false as const, status: 403, message: "Forbidden" };
  }

  return { ok: true as const };
}

// PATCH – keičiam providerRequest statusą + kuriam user/profile/service
export async function PATCH(req: Request, props: ParamsArg) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.message },
        { status: auth.status }
      );
    }

    const { id } = await resolveParams(props);
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

    let user = null;
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

      user = await prisma.user.upsert({
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

      const existingListing = await prisma.serviceListing.findFirst({
        where: { userId: user.id },
      });

      if (!existingListing) {
        serviceListing = await prisma.serviceListing.create({
          data: {
            userId: user.id,
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
      user,
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
