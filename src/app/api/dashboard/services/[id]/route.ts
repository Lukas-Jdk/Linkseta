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
import { translatePriceItems, translateServiceContent } from "@/lib/deepl";

export const dynamic = "force-dynamic";

const BUCKET = "service-images";

type GalleryPair = {
  url: string;
  path: string;
};

type RawPriceItem = {
  label?: unknown;
  priceText?: unknown;
  note?: unknown;
};

type NormalizedPriceItem = {
  label: string;
  priceText: string;
  note: string;
  sortOrder: number;
};

function clampText(x: unknown, max: number) {
  if (typeof x !== "string") return null;
  const t = x.trim();
  return t ? t.slice(0, max) : null;
}

function parsePositiveInt(x: unknown) {
  if (typeof x === "number" && Number.isFinite(x) && x > 0) {
    return Math.floor(x);
  }

  if (typeof x === "string") {
    const digits = x.replace(/[^\d]/g, "");
    if (!digits) return null;

    const parsed = Number.parseInt(digits, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

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
    const url = String(urls[i] ?? "")
      .trim()
      .slice(0, 600);
    const path = String(paths[i] ?? "")
      .trim()
      .slice(0, 300);

    if (!url || !path) continue;

    pairs.push({ url, path });
  }

  return pairs;
}

function normalizePriceItems(input: unknown): NormalizedPriceItem[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((item, index) => {
      const raw = (item ?? {}) as RawPriceItem;

      const label =
        typeof raw.label === "string" ? raw.label.trim().slice(0, 120) : "";
      const priceText =
        typeof raw.priceText === "string"
          ? raw.priceText.trim().slice(0, 120)
          : "";
      const note =
        typeof raw.note === "string" ? raw.note.trim().slice(0, 220) : "";

      if (!label && !priceText && !note) return null;

      return {
        label: label || "Paslauga",
        priceText,
        note,
        sortOrder: index,
      };
    })
    .filter(Boolean) as NormalizedPriceItem[];
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
        titleEn: true,
        titleNo: true,

        description: true,
        descriptionEn: true,
        descriptionNo: true,

        cityId: true,
        categoryId: true,
        responseTime: true,
        isActive: true,

        priceFrom: true,
        priceTo: true,

        imageUrl: true,
        imagePath: true,
        galleryImageUrls: true,
        galleryImagePaths: true,

        highlights: true,
        highlightsEn: true,
        highlightsNo: true,

        sourceLocale: true,

        locationPostcode: true,
        locationCity: true,
        locationRegion: true,

        priceItems: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            label: true,
            labelEn: true,
            labelNo: true,
            priceText: true,
            priceTextEn: true,
            priceTextNo: true,
            note: true,
            noteEn: true,
            noteNo: true,
            sortOrder: true,
          },
        },
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
        isApproved: true,
        plan: {
          select: {
            slug: true,
            name: true,
            maxListings: true,
            maxImagesPerListing: true,
            isTrial: true,
          },
        },
      },
    });

    if (!profile?.isApproved) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (
      profile.plan?.isTrial &&
      profile.trialEndsAt &&
      new Date(profile.trialEndsAt).getTime() < Date.now()
    ) {
      return NextResponse.json(
        { error: "Jūsų Free Trial laikotarpis baigėsi." },
        { status: 409 },
      );
    }

    const maxListings =
      typeof profile.plan?.maxListings === "number"
        ? profile.plan.maxListings
        : 1;

    const maxImagesPerListing =
      typeof profile.plan?.maxImagesPerListing === "number"
        ? profile.plan.maxImagesPerListing
        : 5;

    const safePrefix = user.supabaseId ? `${user.supabaseId}/` : "";
    if (!safePrefix) {
      return NextResponse.json(
        { error: "Missing supabaseId" },
        { status: 400 },
      );
    }

    const body = await req.json().catch(() => ({}) as any);

    if (
      Array.isArray(body?.galleryImageUrls) &&
      body.galleryImageUrls.length > maxImagesPerListing
    ) {
      return NextResponse.json(
        {
          error: `Pasiekėte plano nuotraukų limitą: ${maxImagesPerListing}.`,
          code: "PLAN_IMAGE_LIMIT",
        },
        { status: 409 },
      );
    }

    if (
      Array.isArray(body?.galleryImagePaths) &&
      body.galleryImagePaths.length > maxImagesPerListing
    ) {
      return NextResponse.json(
        {
          error: `Pasiekėte plano nuotraukų limitą: ${maxImagesPerListing}.`,
          code: "PLAN_IMAGE_LIMIT",
        },
        { status: 409 },
      );
    }

    const locale =
      body?.locale === "en" || body?.locale === "no" || body?.locale === "lt"
        ? body.locale
        : "lt";

    const nextCityId =
      typeof body?.cityId === "string" ? body.cityId : service.cityId;

    const nextCategoryId =
      typeof body?.categoryId === "string"
        ? body.categoryId
        : body?.categoryId === null
          ? null
          : service.categoryId;

    const nextResponseTime =
      body?.responseTime === "24h" || body?.responseTime === "48h"
        ? body.responseTime
        : body?.responseTime === "1h"
          ? "1h"
          : (service.responseTime ?? "1h");

    const nextIsActive =
      typeof body?.isActive === "boolean" ? body.isActive : service.isActive;

    if (!service.isActive && nextIsActive) {
      const activeCount = await prisma.serviceListing.count({
        where: {
          userId: user.id,
          isActive: true,
          deletedAt: null,
          id: { not: service.id },
        },
      });

      if (activeCount >= maxListings) {
        return NextResponse.json(
          {
            error: `Pasiekėte savo plano limitą: ${maxListings} aktyvus skelbimas(-ai).`,
            code: "PLAN_LISTING_LIMIT",
          },
          { status: 409 },
        );
      }
    }

    const nextLocationPostcode =
      body?.locationPostcode !== undefined
        ? clampText(body.locationPostcode, 20)
        : service.locationPostcode;

    const nextLocationCity =
      body?.locationCity !== undefined
        ? clampText(body.locationCity, 120)
        : service.locationCity;

    const nextLocationRegion =
      body?.locationRegion !== undefined
        ? clampText(body.locationRegion, 120)
        : service.locationRegion;

    const hasPriceUpdate =
      body?.priceMode !== undefined || body?.mainPrice !== undefined;

    const nextPriceMode = body?.priceMode === "fixed" ? "fixed" : "from";
    const nextMainPrice = hasPriceUpdate
      ? parsePositiveInt(body?.mainPrice)
      : service.priceFrom;

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

    const nextTitle = clampText(body?.title, 120);
    const nextDescription = clampText(body?.description, 4000);
    if (
      body?.description !== undefined &&
      (!nextDescription || nextDescription.length < 10)
    ) {
      return NextResponse.json(
        {
          error: "Aprašymas turi būti bent 10 simbolių.",
          code: "DESCRIPTION_TOO_SHORT",
        },
        { status: 400 },
      );
    }

    const nextHighlights: string[] = Array.isArray(body?.highlights)
      ? body.highlights
          .map((s: unknown) => String(s).trim())
          .filter(Boolean)
          .slice(0, 6)
      : [];

    const normalizedIncomingPriceItems = normalizePriceItems(body?.priceItems);

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

    const data: Record<string, unknown> = {
      cityId: nextCityId ?? null,
      categoryId: nextCategoryId ?? null,
      responseTime: nextResponseTime,
      isActive: nextIsActive,
      imageUrl: nextGalleryImageUrls[0] ?? null,
      imagePath: nextGalleryImagePaths[0] ?? null,
      galleryImageUrls: nextGalleryImageUrls,
      galleryImagePaths: nextGalleryImagePaths,
      sourceLocale: service.sourceLocale ?? "lt",
      locationPostcode: nextLocationPostcode,
      locationCity: nextLocationCity,
      locationRegion: nextLocationRegion,
    };

    if (hasPriceUpdate) {
      data.priceFrom = nextMainPrice;
      data.priceTo =
        nextPriceMode === "fixed" && nextMainPrice != null
          ? nextMainPrice
          : null;
    }

    if (locale === "lt") {
      const finalTitle = nextTitle ?? service.title;
      const finalDescription = nextDescription ?? service.description;
      const finalHighlights = Array.isArray(body?.highlights)
        ? nextHighlights
        : service.highlights;

      data.title = finalTitle;
      data.description = finalDescription;
      data.highlights = finalHighlights;

      try {
        const translated = await translateServiceContent({
          title: finalTitle,
          description: finalDescription,
          highlights: finalHighlights,
        });

        titleEn = translated.en.title;
        titleNo = translated.no.title;
        descriptionEn = translated.en.description;
        descriptionNo = translated.no.description;
        highlightsEn = translated.en.highlights;
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

      data.titleEn = titleEn;
      data.titleNo = titleNo;
      data.descriptionEn = descriptionEn;
      data.descriptionNo = descriptionNo;
      data.highlightsEn = highlightsEn;
      data.highlightsNo = highlightsNo;
    }

    if (locale === "en") {
      data.titleEn = nextTitle ?? service.titleEn ?? service.title;
      data.descriptionEn =
        nextDescription ?? service.descriptionEn ?? service.description;
      data.highlightsEn = Array.isArray(body?.highlights)
        ? nextHighlights
        : Array.isArray(service.highlightsEn)
          ? service.highlightsEn
          : [];
    }

    if (locale === "no") {
      data.titleNo = nextTitle ?? service.titleNo ?? service.title;
      data.descriptionNo =
        nextDescription ?? service.descriptionNo ?? service.description;
      data.highlightsNo = Array.isArray(body?.highlights)
        ? nextHighlights
        : Array.isArray(service.highlightsNo)
          ? service.highlightsNo
          : [];
    }

    let nextPriceItems: Array<{
      serviceId: string;
      label: string;
      labelEn: string | null;
      labelNo: string | null;
      priceText: string | null;
      priceTextEn: string | null;
      priceTextNo: string | null;
      note: string | null;
      noteEn: string | null;
      noteNo: string | null;
      sortOrder: number;
    }> | null = null;

    if (body?.priceItems !== undefined) {
      if (locale === "lt") {
        let translatedEn: Awaited<
          ReturnType<typeof translatePriceItems>
        >["en"] = [];
        let translatedNo: Awaited<
          ReturnType<typeof translatePriceItems>
        >["no"] = [];

        if (normalizedIncomingPriceItems.length > 0) {
          try {
            const translated = await translatePriceItems(
              normalizedIncomingPriceItems.map((item) => ({
                label: item.label,
                priceText: item.priceText,
                note: item.note,
              })),
            );
            translatedEn = translated.en;
            translatedNo = translated.no;
          } catch (translationError: any) {
            logError("DeepL translate failed on price items update", {
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

        nextPriceItems = normalizedIncomingPriceItems.map((item, index) => ({
          serviceId: service.id,
          label: item.label || "Paslauga",
          labelEn: translatedEn[index]?.label || item.label || "Service",
          labelNo: translatedNo[index]?.label || item.label || "Tjeneste",
          priceText: item.priceText || null,
          priceTextEn: translatedEn[index]?.priceText || item.priceText || null,
          priceTextNo: translatedNo[index]?.priceText || item.priceText || null,
          note: item.note || null,
          noteEn: translatedEn[index]?.note || item.note || null,
          noteNo: translatedNo[index]?.note || item.note || null,
          sortOrder: item.sortOrder,
        }));
      }

      if (locale === "en") {
        nextPriceItems = normalizedIncomingPriceItems.map((item, index) => {
          const existing = service.priceItems[index];

          return {
            serviceId: service.id,
            label: existing?.label || "",
            labelEn: item.label || "Service",
            labelNo: existing?.labelNo || null,
            priceText: existing?.priceText || null,
            priceTextEn: item.priceText || null,
            priceTextNo: existing?.priceTextNo || null,
            note: existing?.note || null,
            noteEn: item.note || null,
            noteNo: existing?.noteNo || null,
            sortOrder: item.sortOrder,
          };
        });
      }

      if (locale === "no") {
        nextPriceItems = normalizedIncomingPriceItems.map((item, index) => {
          const existing = service.priceItems[index];

          return {
            serviceId: service.id,
            label: existing?.label || "",
            labelEn: existing?.labelEn || null,
            labelNo: item.label || "Tjeneste",
            priceText: existing?.priceText || null,
            priceTextEn: existing?.priceTextEn || null,
            priceTextNo: item.priceText || null,
            note: existing?.note || null,
            noteEn: existing?.noteEn || null,
            noteNo: item.note || null,
            sortOrder: item.sortOrder,
          };
        });
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.serviceListing.update({
        where: { id: service.id },
        data,
      });

      if (nextPriceItems) {
        await tx.servicePriceItem.deleteMany({
          where: { serviceId: service.id },
        });

        if (nextPriceItems.length > 0) {
          await tx.servicePriceItem.createMany({
            data: nextPriceItems,
          });
        }
      }
    });

    if (toDelete.length) {
      await removeFromStorage(toDelete);
    }

    await auditLog({
      action: "SERVICE_UPDATE",
      entity: "ServiceListing",
      entityId: service.id,
      userId: user.id,
      ip,
      userAgent: ua,
      metadata: {
        locale,
        changedKeys: Object.keys(body ?? {}),
        deletedImagesCount: toDelete.length,
        imageCount: nextGalleryImageUrls.length,
        priceItemsCount: normalizedIncomingPriceItems.length,
        responseTime: nextResponseTime,
        priceMode: hasPriceUpdate ? nextPriceMode : undefined,
        mainPrice: hasPriceUpdate ? nextMainPrice : undefined,
        plan: {
          slug: profile.plan?.slug ?? null,
          name: profile.plan?.name ?? null,
          maxListings,
          maxImagesPerListing,
        },
      },
    });

    revalidateServicePaths(service.slug);

    return NextResponse.json({
      ok: true,
      galleryImageUrls: nextGalleryImageUrls,
      galleryImagePaths: nextGalleryImagePaths,
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
