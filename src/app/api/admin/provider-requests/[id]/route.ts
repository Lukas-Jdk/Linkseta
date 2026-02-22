// src/app/api/admin/provider-requests/[id]/route.ts
import { prisma } from "@/lib/prisma";
import { ProviderRequestStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { getClientIp, rateLimitOrThrow } from "@/lib/rateLimit";
import { auditLog } from "@/lib/audit";
import { withApi } from "@/lib/withApi";
import { requireCsrf } from "@/lib/csrf";
import { jsonNoStore } from "@/lib/http";

type Params = { id: string };

export const dynamic = "force-dynamic";

function isCuidLike(id: string) {
  return typeof id === "string" && id.length >= 20 && id.length <= 40;
}

async function uniqueServiceSlug(tx: typeof prisma, base: string) {
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

export async function PATCH(req: Request, { params }: { params: Promise<Params> }) {
  return withApi(req, "PATCH /api/admin/provider-requests/[id]", async () => {
    const csrfErr = requireCsrf(req);
    if (csrfErr) return csrfErr;

    const ip = getClientIp(req);
    await rateLimitOrThrow({
      key: `admin:providerRequests:patch:${ip}`,
      limit: 60,
      windowMs: 60_000,
    });

    const { response, user } = await requireAdmin();
    if (response || !user) return response!;

    const { id } = await params;
    if (!isCuidLike(id)) return jsonNoStore({ error: "Invalid id" }, { status: 400 });

    const body = await req.json().catch(() => ({} as any));
    const status = body?.status as ProviderRequestStatus | undefined;

    const allowed = Object.values(ProviderRequestStatus);
    if (!status || !allowed.includes(status)) {
      return jsonNoStore({ error: "Invalid status", allowed, received: status }, { status: 400 });
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
        const email = (existing.email ?? "").trim().toLowerCase();
        if (!email) return { kind: "BAD_REQUEST" as const, error: "ProviderRequest has no email" };

        const userFromReq = await tx.user.upsert({
          where: { email },
          update: {
            name: existing.name,
            phone: existing.phone ?? undefined,
          },
          create: {
            email,
            name: existing.name,
            phone: existing.phone ?? undefined,
          },
          select: { id: true, email: true },
        });

        createdUser = userFromReq;

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

        const existingListing = await tx.serviceListing.findFirst({
          where: { userId: userFromReq.id, deletedAt: null },
          select: { id: true, slug: true },
        });

        if (!existingListing) {
          const base = `service-${existing.id}`;
          const slug = await uniqueServiceSlug(tx as any, base);

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
        user: createdUser,
        providerProfile,
        serviceListing,
      };
    });

    if (result.kind === "NOT_FOUND") {
      return jsonNoStore({ error: "ProviderRequest not found" }, { status: 404 });
    }
    if (result.kind === "BAD_REQUEST") {
      return jsonNoStore({ error: result.error }, { status: 400 });
    }

    await auditLog({
      action: "PROVIDER_REQUEST_STATUS_UPDATE",
      entity: "ProviderRequest",
      entityId: id,
      userId: user.id,
      ip,
      userAgent: ua,
      metadata: {
        status,
        createdUserId: result.user?.id ?? null,
        createdServiceId: result.serviceListing?.id ?? null,
      },
    });

    return jsonNoStore(
      {
        ok: true,
        updated: result.updated,
        createdUser: result.user,
        providerProfile: result.providerProfile,
        serviceListing: result.serviceListing,
      },
      { status: 200 },
    );
  });
}