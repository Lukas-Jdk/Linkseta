// src/app/api/dashboard/services/route.ts
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { getClientIp, rateLimitOrThrow } from "@/lib/rateLimit";
import { auditLog } from "@/lib/audit";
import { logError, newRequestId } from "@/lib/logger";
import { requireCsrf } from "@/lib/csrf";
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
        trialEndsAt: true,
        planId: true,
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
      return jsonNoStore({ error: "Forbidden" }, { status: 403 });
    }

    if (
      profile.plan?.isTrial &&
      profile.trialEndsAt &&
      new Date(profile.trialEndsAt).getTime() < Date.now()
    ) {
      return jsonNoStore(
        { error: "Jūsų Free Trial laikotarpis baigėsi." },
        { status: 409 },
      );
    }

    const planSlug = profile.plan?.slug ?? "free-trial";
    const planName = profile.plan?.name ?? "Free Trial";
    const maxListings =
      typeof profile.plan?.maxListings === "number"
        ? profile.plan.maxListings
        : 1;
    const maxImagesPerListing =
      typeof profile.plan?.maxImagesPerListing === "number"
        ? profile.plan.maxImagesPerListing
        : 3;

    if (Number.isFinite(maxListings) && maxListings > 0) {
      const activeCount = await prisma.serviceListing.count({
        where: { userId: user.id, isActive: true, deletedAt: null },
      });

      if (activeCount >= maxListings) {
        return jsonNoStore(
          {
            error: `Pasiekėte savo plano limitą: ${maxListings} aktyvus skelbimas(-ai).`,
            code: "PLAN_LIMIT",
            plan: {
              slug: planSlug,
              name: planName,
              maxListings,
              maxImagesPerListing,
            },
            activeCount,
          },
          { status: 409 },
        );
      }
    }

    const body = await req.json().catch(() => ({} as any));

    const title = clampText(body?.title, 120);
    const description = clampText(body?.description, 4000);

    if (!title || !description) {
      return jsonNoStore({ error: "Missing fields" }, { status: 400 });
    }

    const cityId = typeof body?.cityId === "string" ? body.cityId : null;
    const categoryId =
      typeof body?.categoryId === "string" ? body.categoryId : null;

    const responseTime =
      body?.responseTime === "24h" || body?.responseTime === "48h"
        ? body.responseTime
        : "1h";

    const galleryImageUrls = normalizeGalleryStrings(
      body?.galleryImageUrls,
      maxImagesPerListing,
      600,
    );

    const galleryImagePaths = normalizeGalleryStrings(
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

    for (const path of galleryImagePaths) {
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
        cityId,
        categoryId,
        responseTime,
        priceFrom: null,
        priceTo: null,
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
        priceItems: {
          create: priceItems,
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
        priceItemsCount: priceItems.length,
        responseTime,
        plan: {
          slug: planSlug,
          name: planName,
          maxListings,
          maxImagesPerListing,
        },
      },
    });

    revalidatePath("/[locale]", "page");
    revalidatePath("/[locale]/services", "page");
    revalidatePath("/[locale]/services/[slug]", "page");
    revalidatePath(`/${created.slug}`);

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