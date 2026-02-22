// src/app/api/admin/services/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { getClientIp, rateLimitOrThrow } from "@/lib/rateLimit";
import { auditLog } from "@/lib/audit";
import { withApi } from "@/lib/withApi";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Params = { id: string };

export const dynamic = "force-dynamic";

const SERVICE_IMAGES_BUCKET = "service-images";

/**
 * Minimal CUID / CUID2 guard.
 * - cuid(): typically starts with "c" and is base36-like
 * - cuid2(): can be mixed-case and longer
 * We just block obviously invalid garbage.
 */
function isCuid(id: string) {
  if (typeof id !== "string") return false;
  if (id.length < 20 || id.length > 50) return false;
  // allow letters, digits only (cuid/cuid2 are URL-safe)
  return /^[a-zA-Z0-9]+$/.test(id);
}

function parseBool(v: string | null) {
  if (!v) return false;
  return v === "1" || v === "true" || v === "yes";
}

function isSafeStoragePath(p: string) {
  if (!p) return false;
  if (p.length > 500) return false;
  if (p.startsWith("/")) return false;
  if (p.includes("..")) return false;
  return true;
}

async function removeServiceImage(path: string) {
  if (!isSafeStoragePath(path)) return;

  try {
    const { error } = await supabaseAdmin.storage
      .from(SERVICE_IMAGES_BUCKET)
      .remove([path]);

    if (error) {
      console.warn("Admin storage remove error:", error.message);
    }
  } catch (e) {
    console.warn("Admin storage remove exception:", e);
  }
}

// PATCH /api/admin/services/:id  – keičiam isActive / highlighted
export async function PATCH(
  req: Request,
  { params }: { params: Promise<Params> },
) {
  return withApi(req, "PATCH /api/admin/services/[id]", async () => {
    const ip = getClientIp(req);

    await rateLimitOrThrow({
      key: `admin:services:patch:${ip}`,
      limit: 90,
      windowMs: 60_000,
    });

    const { response, user } = await requireAdmin();
    if (response || !user) return response ?? NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    if (!isCuid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({} as any));

    const data: { isActive?: boolean; highlighted?: boolean } = {};
    if (typeof body?.isActive === "boolean") data.isActive = body.isActive;
    if (typeof body?.highlighted === "boolean") data.highlighted = body.highlighted;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nėra laukų atnaujinimui" }, { status: 400 });
    }

    const ua = req.headers.get("user-agent") ?? null;

    const existing = await prisma.serviceListing.findUnique({
      where: { id },
      select: { id: true, deletedAt: true, isActive: true, highlighted: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Paslauga nerasta" }, { status: 404 });
    }

    if (existing.deletedAt) {
      return NextResponse.json({ error: "Paslauga ištrinta (soft-deleted)" }, { status: 409 });
    }

    // Business rule (optional but recommended): TOP only for active services
    // If you DON'T want this rule — delete this block.
    const nextIsActive = data.isActive ?? existing.isActive;
    const nextHighlighted = data.highlighted ?? existing.highlighted;
    if (!nextIsActive && nextHighlighted) {
      return NextResponse.json(
        { error: "Negalima pažymėti TOP, jei paslauga išjungta." },
        { status: 400 },
      );
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

    return NextResponse.json({ ok: true, service: updated });
  });
}

// DELETE /api/admin/services/:id  (soft delete + remove storage image if exists)
export async function DELETE(
  req: Request,
  { params }: { params: Promise<Params> },
) {
  return withApi(req, "DELETE /api/admin/services/[id]", async () => {
    const ip = getClientIp(req);

    await rateLimitOrThrow({
      key: `admin:services:delete:${ip}`,
      limit: 30,
      windowMs: 60_000,
    });

    const { response, user } = await requireAdmin();
    if (response || !user) return response ?? NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    if (!isCuid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const ua = req.headers.get("user-agent") ?? null;

    const existing = await prisma.serviceListing.findUnique({
      where: { id },
      select: { id: true, deletedAt: true, imagePath: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Paslauga nerasta" }, { status: 404 });
    }

    if (existing.deletedAt) {
      return NextResponse.json({ ok: true, message: "Jau ištrinta (soft-deleted)" });
    }

    // Try remove storage image if present
    if (existing.imagePath) {
      await removeServiceImage(existing.imagePath);
    }

    const updated = await prisma.serviceListing.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, highlighted: false },
      select: { id: true, deletedAt: true, isActive: true, highlighted: true },
    });

    await auditLog({
      action: "ADMIN_SERVICE_DELETE",
      entity: "ServiceListing",
      entityId: id,
      userId: user.id,
      ip,
      userAgent: ua,
      metadata: {
        softDelete: true,
        removedImage: Boolean(existing.imagePath),
      },
    });

    return NextResponse.json({ ok: true, service: updated });
  });
}

// GET /api/admin/services/:id
// Default: hide soft-deleted. Add ?includeDeleted=1 to see them.
export async function GET(
  req: Request,
  { params }: { params: Promise<Params> },
) {
  return withApi(req, "GET /api/admin/services/[id]", async () => {
    const ip = getClientIp(req);

    await rateLimitOrThrow({
      key: `admin:services:get:${ip}`,
      limit: 180,
      windowMs: 60_000,
    });

    const { response, user } = await requireAdmin();
    if (response || !user) return response ?? NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    if (!isCuid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const url = new URL(req.url);
    const includeDeleted = parseBool(url.searchParams.get("includeDeleted"));

    const service = await prisma.serviceListing.findFirst({
      where: {
        id,
        ...(includeDeleted ? {} : { deletedAt: null }),
      },
      include: {
        user: { select: { id: true, email: true, name: true } },
        city: true,
        category: true,
      },
    });

    if (!service) {
      return NextResponse.json({ error: "Paslauga nerasta" }, { status: 404 });
    }

    return NextResponse.json(service);
  });
}