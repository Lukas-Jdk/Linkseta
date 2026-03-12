// src/app/api/dashboard/services/[id]/route.ts
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getClientIp, rateLimitOrThrow } from "@/lib/rateLimit";
import { auditLog } from "@/lib/audit";
import { logError, newRequestId } from "@/lib/logger";
import { requireCsrf } from "@/lib/csrf";

export const dynamic = "force-dynamic";

const BUCKET = "service-images";

function clampText(x: unknown, max: number) {
  if (typeof x !== "string") return null;
  const t = x.trim();
  return t ? t.slice(0, max) : null;
}

function normalizeGalleryStrings(
  input: unknown,
  maxItems: number,
  maxLen: number,
) {
  if (!Array.isArray(input)) return [];
  return input
    .map((x) => String(x).trim())
    .filter(Boolean)
    .slice(0, maxItems)
    .map((x) => x.slice(0, maxLen));
}

async function removeFromStorage(paths: string[]) {
  if (!paths.length) return;
  try {
    const { error } = await supabaseAdmin.storage.from(BUCKET).remove(paths);
    if (error) console.warn("Storage remove error:", error.message);
  } catch (e) {
    console.warn("Storage remove exception:", e);
  }
}

function revalidateServicePaths(slug: string) {
  revalidatePath("/[locale]", "page");
  revalidatePath("/[locale]/services", "page");
  revalidatePath("/[locale]/services/[slug]", "page");
  revalidatePath(`/lt/services/${slug}`);
  revalidatePath(`/en/services/${slug}`);
  revalidatePath(`/no/services/${slug}`);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = newRequestId();
  const ip = getClientIp(req);
  const ua = req.headers.get("user-agent") ?? null;

  try {
    const csrfErr = requireCsrf(req);
    if (csrfErr) return csrfErr;

    await rateLimitOrThrow({
      key: `dashboard:patchService:${ip}`,
      limit: 60,
      windowMs: 60_000,
    });

    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const service = await prisma.serviceListing.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        slug: true,
        userId: true,
        title: true,
        description: true,
        cityId: true,
        categoryId: true,
        priceFrom: true,
        isActive: true,
        imageUrl: true,
        imagePath: true,
        galleryImageUrls: true,
        galleryImagePaths: true,
        highlights: true,
      },
    });

    if (!service) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (service.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const profile = await prisma.providerProfile.findUnique({
      where: { userId: user.id },
      select: {
        trialEndsAt: true,
        plan: {
          select: {
            maxImagesPerListing: true,
            isTrial: true,
          },
        },
      },
    });

    if (
      profile?.plan?.isTrial &&
      profile.trialEndsAt &&
      new Date(profile.trialEndsAt).getTime() < Date.now()
    ) {
      return NextResponse.json(
        { error: "Jūsų Free Trial laikotarpis baigėsi." },
        { status: 409 },
      );
    }

    const maxImagesPerListing =
      typeof profile?.plan?.maxImagesPerListing === "number"
        ? profile.plan.maxImagesPerListing
        : 3;

    const safePrefix = user.supabaseId ? `${user.supabaseId}/` : "";
    if (!safePrefix) {
      return NextResponse.json(
        { error: "Missing supabaseId" },
        { status: 400 },
      );
    }

    const body = await req.json().catch(() => ({} as any));

    const nextTitle = clampText(body?.title, 120) ?? service.title;
    const nextDesc = clampText(body?.description, 4000) ?? service.description;

    const nextCityId =
      typeof body?.cityId === "string" ? body.cityId : service.cityId;

    const nextCategoryId =
      typeof body?.categoryId === "string"
        ? body.categoryId
        : service.categoryId;

    const nextPriceFrom =
      body?.priceFrom === undefined
        ? service.priceFrom
        : body?.priceFrom === null
          ? null
          : Number.isFinite(Number(body.priceFrom))
            ? Math.max(
                0,
                Math.min(10_000_000, Math.trunc(Number(body.priceFrom))),
              )
            : service.priceFrom;

    const nextIsActive =
      typeof body?.isActive === "boolean" ? body.isActive : service.isActive;

    const nextGalleryImageUrls =
      body?.galleryImageUrls === undefined
        ? service.galleryImageUrls
        : normalizeGalleryStrings(
            body?.galleryImageUrls,
            maxImagesPerListing,
            600,
          );

    const nextGalleryImagePaths =
      body?.galleryImagePaths === undefined
        ? service.galleryImagePaths
        : normalizeGalleryStrings(
            body?.galleryImagePaths,
            maxImagesPerListing,
            300,
          );

    if (nextGalleryImageUrls.length !== nextGalleryImagePaths.length) {
      return NextResponse.json(
        { error: "Nesutampa nuotraukų duomenys." },
        { status: 400 },
      );
    }

    for (const path of nextGalleryImagePaths) {
      if (!path.startsWith(safePrefix)) {
        return NextResponse.json({ error: "Invalid imagePath" }, { status: 400 });
      }
    }

    const highlights: string[] = Array.isArray(body?.highlights)
      ? body.highlights
          .map((s: unknown) => String(s).trim())
          .filter(Boolean)
          .slice(0, 6)
      : service.highlights;

    const oldPaths = service.galleryImagePaths ?? [];
    const nextPaths = nextGalleryImagePaths ?? [];

    const toDelete = oldPaths.filter(
      (path) => path && !nextPaths.includes(path) && path.startsWith(safePrefix),
    );

    const updated = await prisma.serviceListing.update({
      where: { id: service.id },
      data: {
        title: nextTitle,
        description: nextDesc,
        cityId: nextCityId ?? null,
        categoryId: nextCategoryId ?? null,
        priceFrom: nextPriceFrom,
        isActive: nextIsActive,
        imageUrl: nextGalleryImageUrls[0] ?? null,
        imagePath: nextGalleryImagePaths[0] ?? null,
        galleryImageUrls: nextGalleryImageUrls,
        galleryImagePaths: nextGalleryImagePaths,
        highlights,
      },
      select: {
        id: true,
        slug: true,
        isActive: true,
        title: true,
      },
    });

    if (toDelete.length) {
      await removeFromStorage(toDelete);
    }

    await auditLog({
      action: "SERVICE_UPDATE",
      entity: "ServiceListing",
      entityId: updated.id,
      userId: user.id,
      ip,
      userAgent: ua,
      metadata: {
        changedKeys: Object.keys(body ?? {}),
        deletedImagesCount: toDelete.length,
        imageCount: nextGalleryImageUrls.length,
      },
    });

    revalidateServicePaths(updated.slug);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e instanceof Response) return e;

    logError("PATCH /api/dashboard/services/[id] failed", {
      requestId,
      route: "/api/dashboard/services/[id]",
      ip,
      meta: { message: e?.message, stack: e?.stack },
    });

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = newRequestId();
  const ip = getClientIp(req);
  const ua = req.headers.get("user-agent") ?? null;

  try {
    const csrfErr = requireCsrf(req);
    if (csrfErr) return csrfErr;

    await rateLimitOrThrow({
      key: `dashboard:deleteService:${ip}`,
      limit: 20,
      windowMs: 60_000,
    });

    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const service = await prisma.serviceListing.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        slug: true,
        userId: true,
        imagePath: true,
        galleryImagePaths: true,
      },
    });

    if (!service) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (service.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const safePrefix = user.supabaseId ? `${user.supabaseId}/` : "";
    if (!safePrefix) {
      return NextResponse.json(
        { error: "Missing supabaseId" },
        { status: 400 },
      );
    }

    const paths = (service.galleryImagePaths ?? []).filter((p) =>
      p.startsWith(safePrefix),
    );

    if (paths.length) {
      await removeFromStorage(paths);
    } else if (service.imagePath && service.imagePath.startsWith(safePrefix)) {
      await removeFromStorage([service.imagePath]);
    }

    await prisma.serviceListing.update({
      where: { id: service.id },
      data: { deletedAt: new Date(), isActive: false },
    });

    await auditLog({
      action: "SERVICE_DELETE",
      entity: "ServiceListing",
      entityId: service.id,
      userId: user.id,
      ip,
      userAgent: ua,
      metadata: { softDelete: true },
    });

    revalidateServicePaths(service.slug);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e instanceof Response) return e;

    logError("DELETE /api/dashboard/services/[id] failed", {
      requestId,
      route: "/api/dashboard/services/[id]",
      ip,
      meta: { message: e?.message, stack: e?.stack },
    });

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}