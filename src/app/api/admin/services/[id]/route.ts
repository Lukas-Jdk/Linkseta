// src/app/api/admin/services/[id]/route.ts
import { prisma } from "@/lib/prisma";
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

// PATCH /api/admin/services/:id
export async function PATCH(req: Request, { params }: { params: Promise<Params> }) {
  return withApi(req, "PATCH /api/admin/services/[id]", async () => {
    const csrfErr = requireCsrf(req);
    if (csrfErr) return csrfErr;

    const ip = getClientIp(req);
    await rateLimitOrThrow({
      key: `admin:services:patch:${ip}`,
      limit: 90,
      windowMs: 60_000,
    });

    const { response, user } = await requireAdmin();
    if (response || !user) return response!;

    const { id } = await params;
    if (!isCuidLike(id)) return jsonNoStore({ error: "Invalid id" }, { status: 400 });

    const body = await req.json().catch(() => ({} as any));

    const data: { isActive?: boolean; highlighted?: boolean } = {};
    if (typeof body?.isActive === "boolean") data.isActive = body.isActive;
    if (typeof body?.highlighted === "boolean") data.highlighted = body.highlighted;

    if (Object.keys(data).length === 0) {
      return jsonNoStore({ error: "Nėra laukų atnaujinimui" }, { status: 400 });
    }

    const ua = req.headers.get("user-agent") ?? null;

    const existing = await prisma.serviceListing.findUnique({
      where: { id },
      select: { id: true, deletedAt: true, isActive: true, highlighted: true },
    });

    if (!existing) return jsonNoStore({ error: "Paslauga nerasta" }, { status: 404 });
    if (existing.deletedAt) {
      return jsonNoStore({ error: "Paslauga ištrinta (soft-deleted)" }, { status: 409 });
    }

    const updated = await prisma.serviceListing.update({
      where: { id },
      data,
      select: { id: true, isActive: true, highlighted: true },
    });

    await auditLog({
      action: "ADMIN_SERVICE_UPDATE",
      entity: "ServiceListing",
      entityId: id,
      userId: user.id,
      ip,
      userAgent: ua,
      metadata: {
        changed: Object.keys(data),
        from: existing,
        to: updated,
      },
    });

    return jsonNoStore({ ok: true, service: updated }, { status: 200 });
  });
}

// DELETE /api/admin/services/:id
export async function DELETE(req: Request, { params }: { params: Promise<Params> }) {
  return withApi(req, "DELETE /api/admin/services/[id]", async () => {
    const csrfErr = requireCsrf(req);
    if (csrfErr) return csrfErr;

    const ip = getClientIp(req);
    await rateLimitOrThrow({
      key: `admin:services:delete:${ip}`,
      limit: 30,
      windowMs: 60_000,
    });

    const { response, user } = await requireAdmin();
    if (response || !user) return response!;

    const { id } = await params;
    if (!isCuidLike(id)) return jsonNoStore({ error: "Invalid id" }, { status: 400 });

    const ua = req.headers.get("user-agent") ?? null;

    const existing = await prisma.serviceListing.findUnique({
      where: { id },
      select: { id: true, deletedAt: true },
    });

    if (!existing) return jsonNoStore({ error: "Paslauga nerasta" }, { status: 404 });
    if (existing.deletedAt) {
      return jsonNoStore({ ok: true, message: "Jau ištrinta (soft-deleted)" }, { status: 200 });
    }

    const updated = await prisma.serviceListing.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
      select: { id: true, deletedAt: true, isActive: true },
    });

    await auditLog({
      action: "ADMIN_SERVICE_DELETE",
      entity: "ServiceListing",
      entityId: id,
      userId: user.id,
      ip,
      userAgent: ua,
      metadata: { softDelete: true },
    });

    return jsonNoStore({ ok: true, service: updated }, { status: 200 });
  });
}

// GET /api/admin/services/:id
export async function GET(req: Request, { params }: { params: Promise<Params> }) {
  return withApi(req, "GET /api/admin/services/[id]", async () => {
    const ip = getClientIp(req);
    await rateLimitOrThrow({
      key: `admin:services:get:${ip}`,
      limit: 180,
      windowMs: 60_000,
    });

    const { response } = await requireAdmin();
    if (response) return response;

    const { id } = await params;
    if (!isCuidLike(id)) return jsonNoStore({ error: "Invalid id" }, { status: 400 });

    const service = await prisma.serviceListing.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, name: true } },
        city: true,
        category: true,
      },
    });

    if (!service) return jsonNoStore({ error: "Paslauga nerasta" }, { status: 404 });

    return jsonNoStore(service, { status: 200 });
  });
}