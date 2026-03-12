// src/app/api/dashboard/services/route.ts
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { getClientIp, rateLimitOrThrow } from "@/lib/rateLimit";
import { auditLog } from "@/lib/audit";
import { logError, newRequestId } from "@/lib/logger";
import { requireCsrf } from "@/lib/csrf";

export const dynamic = "force-dynamic";

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

    const priceFrom =
      body?.priceFrom === null || body?.priceFrom === undefined
        ? null
        : Number.isFinite(Number(body.priceFrom))
          ? Math.max(0, Math.min(10_000_000, Math.trunc(Number(body.priceFrom))))
          : null;

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

    const created = await prisma.serviceListing.create({
      data: {
        userId: user.id,
        title,
        slug,
        description,
        cityId,
        categoryId,
        priceFrom,
        imageUrl: coverImageUrl,
        imagePath: coverImagePath,
        galleryImageUrls,
        galleryImagePaths,
        highlights,
        isActive: true,
        highlighted: false,
        deletedAt: null,
        planId: profile.planId ?? null,
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