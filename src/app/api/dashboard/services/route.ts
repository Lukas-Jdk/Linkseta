// src/app/api/dashboard/services/route.ts
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { getClientIp, rateLimitOrThrow } from "@/lib/rateLimit";
import { auditLog } from "@/lib/audit";
import { logError, newRequestId } from "@/lib/logger";
import { requireCsrf } from "@/lib/csrf";
import { hasActiveProviderAccess, getPlanLimits } from "@/lib/planAccess";
import {
  translatePriceItems,
  translateServiceContent,
} from "@/lib/deepl";

export const dynamic = "force-dynamic";

type RawPriceItem = {
  label?: unknown;
  priceText?: unknown;
  note?: unknown;
};

type RawServiceBlockImage = {
  url?: unknown;
  path?: unknown;
  altText?: unknown;
};

type RawServiceBlock = {
  title?: unknown;
  description?: unknown;
  iconKey?: unknown;
  images?: unknown;
};

const ALLOWED_ICON_KEYS = new Set([
  "carpentry",
  "kitchen",
  "floors",
  "walls",
  "ceiling",
  "bathroom",
  "terrace",
  "doors",
  "windows",
  "painting",
  "plumbing",
  "electrical",
  "cleaning",
  "transport",
  "auto",
  "beauty",
  "it",
  "accounting",
  "legal",
  "real_estate",
  "training",
  "childcare",
  "pets",
  "food",
  "household",
  "other",
]);

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

function clampText(x: unknown, max: number) {
  if (typeof x !== "string") return "";
  return x.trim().slice(0, max);
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

async function uniqueSlugGlobal(base: string) {
  let slug = base;
  let i = 2;

  while (true) {
    const exists = await prisma.serviceListing.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!exists) return slug;

    slug = `${base}-${i}`;
    i += 1;
  }
}

function jsonNoStore(data: any, init?: ResponseInit) {
  const res = NextResponse.json(data, init);
  res.headers.set("Cache-Control", "no-store");
  return res;
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

function normalizePriceItems(input: unknown) {
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
        priceText: priceText || "",
        note: note || "",
        sortOrder: index,
      };
    })
    .filter(Boolean)
    .slice(0, 20) as Array<{
    label: string;
    priceText: string;
    note: string;
    sortOrder: number;
  }>;
}

function normalizeIconKey(input: unknown) {
  const raw = typeof input === "string" ? input.trim() : "";
  if (!raw) return "other";

  const safe = raw
    .toLowerCase()
    .replace(/[^\w-]/g, "_")
    .slice(0, 40);

  return ALLOWED_ICON_KEYS.has(safe) ? safe : "other";
}

function normalizeServiceBlocks(input: unknown, maxBlocks: number) {
  if (!Array.isArray(input)) return [];

  return input
    .map((item, index) => {
      const raw = (item ?? {}) as RawServiceBlock;

      const title = clampText(raw.title, 80);
      const description = clampText(raw.description, 400);
      const iconKey = normalizeIconKey(raw.iconKey);

      const images = Array.isArray(raw.images)
        ? raw.images
            .map((image, imageIndex) => {
              const img = (image ?? {}) as RawServiceBlockImage;

              const url = clampText(img.url, 600);
              const path = clampText(img.path, 300);
              const altText = clampText(img.altText, 120);

              if (!url || !path) return null;

              return {
                url,
                path,
                altText: altText || null,
                sortOrder: imageIndex,
              };
            })
            .filter(Boolean)
        : [];

      if (!title && !description && images.length === 0) return null;

      return {
        title: title || "Paslauga",
        description: description || null,
        iconKey,
        sortOrder: index,
        images: images as Array<{
          url: string;
          path: string;
          altText: string | null;
          sortOrder: number;
        }>,
      };
    })
    .filter(Boolean)
    .slice(0, maxBlocks) as Array<{
    title: string;
    description: string | null;
    iconKey: string;
    sortOrder: number;
    images: Array<{
      url: string;
      path: string;
      altText: string | null;
      sortOrder: number;
    }>;
  }>;
}

function countBlockImages(
  blocks: Array<{
    images: Array<{ url: string; path: string }>;
  }>,
) {
  return blocks.reduce((sum, block) => sum + block.images.length, 0);
}

function collectBlockImagePaths(
  blocks: Array<{
    images: Array<{ path: string }>;
  }>,
) {
  return blocks.flatMap((block) => block.images.map((image) => image.path));
}

function collectBlockImageUrls(
  blocks: Array<{
    images: Array<{ url: string }>;
  }>,
) {
  return blocks.flatMap((block) => block.images.map((image) => image.url));
}

function revalidateServicePages(slug: string) {
  revalidatePath("/lt");
  revalidatePath("/en");
  revalidatePath("/no");

  revalidatePath("/lt/services");
  revalidatePath("/en/services");
  revalidatePath("/no/services");

  revalidatePath(`/lt/services/${slug}`);
  revalidatePath(`/en/services/${slug}`);
  revalidatePath(`/no/services/${slug}`);
}

export async function POST(req: Request) {
  const requestId = newRequestId();
  const ip = getClientIp(req);
  const ua = req.headers.get("user-agent") ?? null;

  try {
    const csrfErr = requireCsrf(req);
    if (csrfErr) return csrfErr;

    await rateLimitOrThrow({
      key: `dashboard:createService:${ip}`,
      limit: 15,
      windowMs: 60_000,
    });

    const user = await getAuthUser();
    if (!user) return jsonNoStore({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.providerProfile.findUnique({
      where: { userId: user.id },
      select: {
        id: true,
        isApproved: true,
        lifetimeFree: true,
        trialEndsAt: true,
        stripeSubscriptionId: true,
        subscriptionStatus: true,
        planId: true,
        plan: {
          select: {
            slug: true,
            name: true,
            isTrial: true,
            maxServiceBlocks: true,
          },
        },
      },
    });

    if (!profile?.isApproved || !hasActiveProviderAccess(profile)) {
      return jsonNoStore(
        { error: "Jūsų planas neaktyvus arba Free Trial pasibaigė." },
        { status: 403 },
      );
    }

    const limits = getPlanLimits(profile);
    const planSlug = profile.plan?.slug ?? "none";
    const planName = profile.plan?.name ?? "—";

    const maxListings = limits.maxListings;
    const maxImagesPerListing = limits.maxImagesPerListing;
    const maxServiceBlocks = limits.maxServiceBlocks;

    const activeCount = await prisma.serviceListing.count({
      where: { userId: user.id, isActive: true, deletedAt: null },
    });

    if (activeCount >= maxListings) {
      return jsonNoStore(
        {
          error: `Pasiekėte savo plano limitą: ${maxListings} aktyvus paslaugų profilis.`,
          code: "PLAN_LIMIT",
          plan: {
            slug: planSlug,
            name: planName,
            maxListings,
            maxImagesPerListing,
            maxServiceBlocks,
          },
          activeCount,
        },
        { status: 409 },
      );
    }

    const body = await req.json().catch(() => ({} as any));

    const title = clampText(body?.title, 120);
    const description = clampText(body?.description, 4000);

    const categoryId =
      typeof body?.categoryId === "string" ? body.categoryId : null;

    const cityId = typeof body?.cityId === "string" ? body.cityId : null;

    const locationPostcode = clampText(body?.locationPostcode, 20);
    const locationCity = clampText(body?.locationCity, 120);
    const locationRegion = clampText(body?.locationRegion, 120);

    const priceMode = body?.priceMode === "fixed" ? "fixed" : "from";
    const mainPrice = parsePositiveInt(body?.mainPrice);

    if (!title || !description || !locationPostcode || !locationCity) {
      return jsonNoStore({ error: "Missing fields" }, { status: 400 });
    }

    const responseTime =
      body?.responseTime === "24h" || body?.responseTime === "48h"
        ? body.responseTime
        : "1h";

    const normalizedBlocks = normalizeServiceBlocks(
      body?.serviceBlocks,
      maxServiceBlocks,
    );

    const blockImageCount = countBlockImages(normalizedBlocks);

    const incomingGalleryUrlCount = Array.isArray(body?.galleryImageUrls)
      ? body.galleryImageUrls.length
      : 0;

    const incomingGalleryPathCount = Array.isArray(body?.galleryImagePaths)
      ? body.galleryImagePaths.length
      : 0;

    const incomingImageCount = Math.max(
      incomingGalleryUrlCount,
      incomingGalleryPathCount,
      blockImageCount,
    );

    if (incomingImageCount > maxImagesPerListing) {
      return jsonNoStore(
        {
          error: `Pasiekėte plano nuotraukų limitą: ${maxImagesPerListing}.`,
          code: "PLAN_IMAGE_LIMIT",
          plan: {
            slug: planSlug,
            name: planName,
            maxListings,
            maxImagesPerListing,
            maxServiceBlocks,
          },
        },
        { status: 409 },
      );
    }

    if (normalizedBlocks.length > maxServiceBlocks) {
      return jsonNoStore(
        {
          error: `Pasiekėte plano paslaugų blokų limitą: ${maxServiceBlocks}.`,
          code: "PLAN_BLOCK_LIMIT",
          plan: {
            slug: planSlug,
            name: planName,
            maxListings,
            maxImagesPerListing,
            maxServiceBlocks,
          },
        },
        { status: 409 },
      );
    }

    const galleryImageUrls =
      normalizedBlocks.length > 0
        ? collectBlockImageUrls(normalizedBlocks).slice(0, maxImagesPerListing)
        : normalizeGalleryStrings(
            body?.galleryImageUrls,
            maxImagesPerListing,
            600,
          );

    const galleryImagePaths =
      normalizedBlocks.length > 0
        ? collectBlockImagePaths(normalizedBlocks).slice(
            0,
            maxImagesPerListing,
          )
        : normalizeGalleryStrings(
            body?.galleryImagePaths,
            maxImagesPerListing,
            300,
          );

    if (galleryImageUrls.length !== galleryImagePaths.length) {
      return jsonNoStore(
        { error: "Nesutampa nuotraukų duomenys." },
        { status: 400 },
      );
    }

    const highlights: string[] = Array.isArray(body?.highlights)
      ? body.highlights
          .map((s: unknown) => String(s).trim())
          .filter(Boolean)
          .slice(0, 6)
      : [];

    const normalizedPriceItems = normalizePriceItems(body?.priceItems);

    const safePrefix = user.supabaseId ? `${user.supabaseId}/` : "";
    if (!safePrefix) {
      return jsonNoStore({ error: "Missing supabaseId" }, { status: 400 });
    }

    const allImagePaths = [
      ...galleryImagePaths,
      ...collectBlockImagePaths(normalizedBlocks),
    ];

    for (const path of allImagePaths) {
      if (!path.startsWith(safePrefix)) {
        return jsonNoStore({ error: "Invalid imagePath" }, { status: 400 });
      }
    }

    const baseSlug = slugify(title) || "service";
    const slug = await uniqueSlugGlobal(baseSlug);

    const coverImageUrl = galleryImageUrls[0] ?? null;
    const coverImagePath = galleryImagePaths[0] ?? null;

    let titleEn: string | null = null;
    let titleNo: string | null = null;
    let descriptionEn: string | null = null;
    let descriptionNo: string | null = null;
    let highlightsEn: string[] = [];
    let highlightsNo: string[] = [];

    try {
      const translated = await translateServiceContent({
        title,
        description,
        highlights,
      });

      titleEn = translated.en.title;
      descriptionEn = translated.en.description;
      highlightsEn = translated.en.highlights;

      titleNo = translated.no.title;
      descriptionNo = translated.no.description;
      highlightsNo = translated.no.highlights;
    } catch (translationError: any) {
      logError("DeepL translate failed on service create", {
        requestId,
        route: "/api/dashboard/services",
        ip,
        meta: {
          message: translationError?.message,
          stack: translationError?.stack,
        },
      });
    }

    let priceItems = normalizedPriceItems.map((item) => ({
      label: item.label,
      labelEn: item.label,
      labelNo: item.label,
      priceText: item.priceText || null,
      priceTextEn: item.priceText || null,
      priceTextNo: item.priceText || null,
      note: item.note || null,
      noteEn: item.note || null,
      noteNo: item.note || null,
      sortOrder: item.sortOrder,
    }));

    if (normalizedPriceItems.length > 0) {
      try {
        const translatedPrices = await translatePriceItems(
          normalizedPriceItems.map((item) => ({
            label: item.label,
            priceText: item.priceText,
            note: item.note,
          })),
        );

        priceItems = normalizedPriceItems.map((item, index) => ({
          label: item.label,
          labelEn: translatedPrices.en[index]?.label || item.label,
          labelNo: translatedPrices.no[index]?.label || item.label,
          priceText: item.priceText || null,
          priceTextEn:
            translatedPrices.en[index]?.priceText || item.priceText || null,
          priceTextNo:
            translatedPrices.no[index]?.priceText || item.priceText || null,
          note: item.note || null,
          noteEn: translatedPrices.en[index]?.note || item.note || null,
          noteNo: translatedPrices.no[index]?.note || item.note || null,
          sortOrder: item.sortOrder,
        }));
      } catch (translationError: any) {
        logError("DeepL translate failed on price items create", {
          requestId,
          route: "/api/dashboard/services",
          ip,
          meta: {
            message: translationError?.message,
            stack: translationError?.stack,
          },
        });
      }
    }

    const created = await prisma.serviceListing.create({
      data: {
        userId: user.id,
        title,
        slug,
        description,
        categoryId,
        cityId,
        responseTime,
        priceFrom: mainPrice,
        priceTo: priceMode === "fixed" && mainPrice != null ? mainPrice : null,
        imageUrl: coverImageUrl,
        imagePath: coverImagePath,
        galleryImageUrls,
        galleryImagePaths,
        highlights,
        sourceLocale: "lt",
        titleEn,
        titleNo,
        descriptionEn,
        descriptionNo,
        highlightsEn,
        highlightsNo,
        isActive: true,
        highlighted: false,
        deletedAt: null,
        planId: profile.planId ?? null,

        locationPostcode,
        locationCity,
        locationRegion: locationRegion || null,

        priceItems: {
          create: priceItems,
        },

        blocks: {
          create: normalizedBlocks.map((block) => ({
            title: block.title,
            description: block.description,
            iconKey: block.iconKey,
            sortOrder: block.sortOrder,
            titleEn: block.title,
            titleNo: block.title,
            descriptionEn: block.description,
            descriptionNo: block.description,
            images: {
              create: block.images,
            },
          })),
        },
      },
      select: { id: true, slug: true },
    });

    await auditLog({
      action: "SERVICE_CREATE",
      entity: "ServiceListing",
      entityId: created.id,
      userId: user.id,
      ip,
      userAgent: ua,
      metadata: {
        slug: created.slug,
        title,
        imageCount: galleryImageUrls.length,
        blockImageCount,
        serviceBlocksCount: normalizedBlocks.length,
        priceItemsCount: priceItems.length,
        responseTime,
        locationPostcode,
        locationCity,
        locationRegion,
        priceMode,
        mainPrice,
        plan: {
          slug: planSlug,
          name: planName,
          maxListings,
          maxImagesPerListing,
          maxServiceBlocks,
          canUseChat: limits.canUseChat,
          canCollectReviews: limits.canCollectReviews,
          canBecomeTopRated: limits.canBecomeTopRated,
          canAppearOnHomepage: limits.canAppearOnHomepage,
        },
      },
    });

    revalidateServicePages(created.slug);

    return jsonNoStore(
      { ok: true, id: created.id, slug: created.slug },
      { status: 200 },
    );
  } catch (e: any) {
    if (e instanceof Response) return e;

    logError("POST /api/dashboard/services failed", {
      requestId,
      route: "/api/dashboard/services",
      ip,
      meta: { message: e?.message, stack: e?.stack },
    });

    return jsonNoStore({ error: "Server error" }, { status: 500 });
  }
}