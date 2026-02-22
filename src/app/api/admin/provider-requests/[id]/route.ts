// src/app/api/admin/provider-requests/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ProviderRequestStatus, Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { getClientIp, rateLimitOrThrow } from "@/lib/rateLimit";
import { auditLog } from "@/lib/audit";
import { withApi } from "@/lib/withApi";

type Params = { id: string };

export const dynamic = "force-dynamic";

function isCuid(id: string) {
  if (typeof id !== "string") return false;
  if (id.length < 20 || id.length > 50) return false;
  return /^[a-zA-Z0-9]+$/.test(id);
}

async function uniqueServiceSlug(tx: Prisma.TransactionClient, base: string) {
  // DB turi slug UNIQUE globaliai → tikrinam globaliai, ne tik deletedAt:null
  let slug = base;
  let i = 2;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const exists = await tx.serviceListing.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!exists) return slug;

    slug = `${base}-${i}`;
    i += 1;
  }
}

/**
 * Case-insensitive "get or create" by email.
 * Why: Postgres unique index on TEXT is case-sensitive by default,
 * so "Test@x.com" and "test@x.com" can exist as different strings.
 * We want stable behavior.
 */
async function getOrCreateUserByEmail(tx: Prisma.TransactionClient, input: {
  email: string;
  name: string;
  phone?: string | null;
}) {
  const email = input.email.trim().toLowerCase();
  if (!email) throw new Error("Missing email");

  // 1) Try exact match
  const exact = await tx.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });

  if (exact) {
    const updated = await tx.user.update({
      where: { id: exact.id },
      data: {
        name: input.name,
        phone: input.phone ?? undefined,
        email, // normalize
      },
      select: { id: true, email: true },
    });
    return updated;
  }

  // 2) Try case-insensitive match (covers legacy mixed-case records)
  const ci = await tx.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, email: true },
  });

  if (ci) {
    const updated = await tx.user.update({
      where: { id: ci.id },
      data: {
        name: input.name,
        phone: input.phone ?? undefined,
        email, // normalize stored value
      },
      select: { id: true, email: true },
    });
    return updated;
  }

  // 3) Create new
  const created = await tx.user.create({
    data: {
      email,
      name: input.name,
      phone: input.phone ?? undefined,
    },
    select: { id: true, email: true },
  });

  return created;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<Params> },
) {
  return withApi(req, "PATCH /api/admin/provider-requests/[id]", async () => {
    const ip = getClientIp(req);

    await rateLimitOrThrow({
      key: `admin:providerRequests:patch:${ip}`,
      limit: 60,
      windowMs: 60_000,
    });

    const { response, user } = await requireAdmin();
    if (response || !user) {
      return response ?? NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    if (!isCuid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({} as any));
    const status = body?.status as ProviderRequestStatus | undefined;

    const allowed = Object.values(ProviderRequestStatus);
    if (!status || !allowed.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status", allowed, received: status },
        { status: 400 },
      );
    }

    const ua = req.headers.get("user-agent") ?? null;

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.providerRequest.findUnique({ where: { id } });
      if (!existing) return { kind: "NOT_FOUND" as const };

      const willApproveFirstTime =
        status === "APPROVED" && existing.status !== "APPROVED";

      let createdUser: { id: string; email: string } | null = null;
      let providerProfile: { id: string; userId: string } | null = null;
      let serviceListing: { id: string; slug: string } | null = null;

      if (willApproveFirstTime) {
        const email = (existing.email ?? "").trim();
        if (!email) {
          return {
            kind: "BAD_REQUEST" as const,
            error: "ProviderRequest has no email",
          };
        }

        // 1) user get/create (case-insensitive safe)
        const userFromReq = await getOrCreateUserByEmail(tx, {
          email,
          name: existing.name,
          phone: existing.phone ?? null,
        });

        createdUser = userFromReq;

        // 2) provider profile upsert + approved
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
          select: { id: true, userId: true },
        });

        // 3) create first listing if user has no non-deleted listing
        const existingListing = await tx.serviceListing.findFirst({
          where: { userId: userFromReq.id, deletedAt: null },
          select: { id: true, slug: true },
        });

        if (!existingListing) {
          const base = `service-${existing.id}`;
          const slug = await uniqueServiceSlug(tx, base);

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
              imagePath: null,
              highlights: [],
              deletedAt: null,
            },
            select: { id: true, slug: true },
          });
        } else {
          serviceListing = existingListing;
        }
      }

      const updated = await tx.providerRequest.update({
        where: { id },
        data: { status },
      });

      return {
        kind: "OK" as const,
        updated,
        createdUser,
        providerProfile,
        serviceListing,
        prevStatus: existing.status,
      };
    });

    if (result.kind === "NOT_FOUND") {
      return NextResponse.json({ error: "ProviderRequest not found" }, { status: 404 });
    }

    if (result.kind === "BAD_REQUEST") {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // audit outside transaction
    await auditLog({
      action: "PROVIDER_REQUEST_STATUS_UPDATE",
      entity: "ProviderRequest",
      entityId: id,
      userId: user.id,
      ip,
      userAgent: ua,
      metadata: {
        fromStatus: result.prevStatus,
        toStatus: status,
        createdUserId: result.createdUser?.id ?? null,
        createdServiceId: result.serviceListing?.id ?? null,
      },
    });

    return NextResponse.json({
      ok: true,
      updated: result.updated,
      createdUser: result.createdUser,
      providerProfile: result.providerProfile,
      serviceListing: result.serviceListing,
    });
  });
}