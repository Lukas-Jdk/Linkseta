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
import { translateServiceContent } from "@/lib/deepl";

export const dynamic = "force-dynamic";

const BUCKET = "service-images";

function clampText(x: unknown, max: number) {
  if (typeof x !== "string") return null;
  const t = x.trim();
  return t ? t.slice(0, max) : null;
}

type GalleryPair = {
  url: string;
  path: string;
};

function normalizeGalleryPairs(
  urlsInput: unknown,
  pathsInput: unknown,
  maxItems: number,
) {
  const urls = Array.isArray(urlsInput) ? urlsInput : [];
  const paths = Array.isArray(pathsInput) ? pathsInput : [];

  const maxLen = Math.min(urls.length, paths.length, maxItems);

  const pairs: GalleryPair[] = [];

  for (let i = 0; i < maxLen; i += 1) {
    const url = String(urls[i] ?? "").trim().slice(0, 600);
    const path = String(paths[i] ?? "").trim().slice(0, 300);

    if (!url || !path) continue;

    pairs.push({ url, path });
  }

  return pairs;
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
        sourceLocale: true,
        titleEn: true,
        titleNo: true,
        descriptionEn: true,
        descriptionNo: true,
        highlightsEn: true,
        highlightsNo: true,
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

    const currentPairs = normalizeGalleryPairs(
      service.galleryImageUrls ?? [],
      service.galleryImagePaths ?? [],
      maxImagesPerListing,
    );

    const nextPairs =
      body?.galleryImageUrls === undefined &&
      body?.galleryImagePaths === undefined
        ? currentPairs
        : normalizeGalleryPairs(
            body?.galleryImageUrls,
            body?.galleryImagePaths,
            maxImagesPerListing,
          );

    for (const pair of nextPairs) {
      if (!pair.path.startsWith(safePrefix)) {
        return NextResponse.json(
          { error: "Invalid imagePath" },
          { status: 400 },
        );
      }
    }

    const highlights: string[] = Array.isArray(body?.highlights)
      ? body.highlights
          .map((s: unknown) => String(s).trim())
          .filter(Boolean)
          .slice(0, 6)
      : service.highlights;

    const oldPathsSet = new Set(
      [
        ...(Array.isArray(service.galleryImagePaths)
          ? service.galleryImagePaths
          : []),
        ...(service.imagePath ? [service.imagePath] : []),
      ]
        .map((x) => String(x ?? "").trim())
        .filter(Boolean),
    );

    const nextPathsSet = new Set(nextPairs.map((x) => x.path));

    const toDelete = Array.from(oldPathsSet).filter(
      (path) => path.startsWith(safePrefix) && !nextPathsSet.has(path),
    );

    const nextGalleryImageUrls = nextPairs.map((x) => x.url);
    const nextGalleryImagePaths = nextPairs.map((x) => x.path);

    const shouldRetranslate =
      nextTitle !== service.title ||
      nextDesc !== service.description ||
      JSON.stringify(highlights) !== JSON.stringify(service.highlights);

    let titleEn = service.titleEn;
    let titleNo = service.titleNo;
    let descriptionEn = service.descriptionEn;
    let descriptionNo = service.descriptionNo;
    let highlightsEn = Array.isArray(service.highlightsEn)
      ? service.highlightsEn
      : [];
    let highlightsNo = Array.isArray(service.highlightsNo)
      ? service.highlightsNo
      : [];

    if (shouldRetranslate) {
      try {
        const translated = await translateServiceContent({
          title: nextTitle,
          description: nextDesc,
          highlights,
        });

        titleEn = translated.en.title;
        descriptionEn = translated.en.description;
        highlightsEn = translated.en.highlights;

        titleNo = translated.no.title;
        descriptionNo = translated.no.description;
        highlightsNo = translated.no.highlights;
      } catch (translationError: any) {
        logError("DeepL translate failed on service update", {
          requestId,
          route: "/api/dashboard/services/[id]",
          ip,
          meta: {
            message: translationError?.message,
            stack: translationError?.stack,
          },
        });
      }
    }

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
        sourceLocale: service.sourceLocale ?? "lt",
        titleEn,
        titleNo,
        descriptionEn,
        descriptionNo,
        highlightsEn,
        highlightsNo,
      },
      select: {
        id: true,
        slug: true,
        isActive: true,
        title: true,
        galleryImageUrls: true,
        galleryImagePaths: true,
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
        retranslated: shouldRetranslate,
      },
    });

    revalidateServicePaths(updated.slug);

    return NextResponse.json({
      ok: true,
      galleryImageUrls: updated.galleryImageUrls,
      galleryImagePaths: updated.galleryImagePaths,
    });
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

    const paths = [
      ...(Array.isArray(service.galleryImagePaths)
        ? service.galleryImagePaths
        : []),
      ...(service.imagePath ? [service.imagePath] : []),
    ]
      .map((x) => String(x ?? "").trim())
      .filter((p) => p.startsWith(safePrefix));

    const uniquePaths = Array.from(new Set(paths));

    if (uniquePaths.length) {
      await removeFromStorage(uniquePaths);
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