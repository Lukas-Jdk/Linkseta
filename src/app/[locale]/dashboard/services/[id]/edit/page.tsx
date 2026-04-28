// src/app/[locale]/dashboard/services/[id]/edit/page.tsx
// src/app/[locale]/dashboard/services/[id]/edit/page.tsx
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { translateCategoryName } from "@/lib/categoryTranslations";
import EditServiceForm from "./EditServiceForm";
import styles from "./edit.module.css";

type PageProps = {
  params: Promise<{ id: string; locale: string }>;
};

export const dynamic = "force-dynamic";

function pickLocalizedValue(
  locale: string,
  base: string | null | undefined,
  en?: string | null,
  no?: string | null,
) {
  if (locale === "en") return en?.trim() || base?.trim() || "";
  if (locale === "no") return no?.trim() || base?.trim() || "";
  return base?.trim() || "";
}

function pickLocalizedArray(
  locale: string,
  base?: string[] | null,
  en?: string[] | null,
  no?: string[] | null,
) {
  if (locale === "en" && Array.isArray(en) && en.length > 0) return en;
  if (locale === "no" && Array.isArray(no) && no.length > 0) return no;
  return Array.isArray(base) ? base : [];
}

type LocalizedPriceItem = {
  label: string;
  priceText: string;
  note: string;
};

export default async function EditServicePage({ params }: PageProps) {
  const [{ id, locale }, authUser] = await Promise.all([
    params,
    getAuthUser(),
  ]);

  if (!authUser) redirect(`/${locale}/login`);

  setRequestLocale(locale);

  const t = await getTranslations({
    locale,
    namespace: "dashboardEditServicePage",
  });

  const service = await prisma.serviceListing.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,

      title: true,
      titleEn: true,
      titleNo: true,

      description: true,
      descriptionEn: true,
      descriptionNo: true,

      categoryId: true,
      responseTime: true,

      priceFrom: true,
      priceTo: true,

      imageUrl: true,
      imagePath: true,
      galleryImageUrls: true,
      galleryImagePaths: true,

      highlights: true,
      highlightsEn: true,
      highlightsNo: true,

      isActive: true,

      locationPostcode: true,
      locationCity: true,
      locationRegion: true,

      priceItems: {
        orderBy: { sortOrder: "asc" },
        select: {
          label: true,
          labelEn: true,
          labelNo: true,
          priceText: true,
          priceTextEn: true,
          priceTextNo: true,
          note: true,
          noteEn: true,
          noteNo: true,
        },
      },
    },
  });

  if (!service) redirect(`/${locale}/dashboard/services`);

  if (service.userId !== authUser.id) {
    redirect(`/${locale}/dashboard/services`);
  }

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: authUser.id },
    select: {
      plan: {
        select: {
          maxImagesPerListing: true,
        },
      },
    },
  });

  const maxImages =
    typeof profile?.plan?.maxImagesPerListing === "number"
      ? profile.plan.maxImagesPerListing
      : 5;

  const categories = await prisma.category.findMany({
    where: { type: "SERVICE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true },
  });

  const localizedPriceItems: LocalizedPriceItem[] = Array.isArray(
    service.priceItems,
  )
    ? service.priceItems.map((item) => ({
        label: pickLocalizedValue(
          locale,
          item.label,
          item.labelEn,
          item.labelNo,
        ),
        priceText: pickLocalizedValue(
          locale,
          item.priceText ?? "",
          item.priceTextEn,
          item.priceTextNo,
        ),
        note: pickLocalizedValue(
          locale,
          item.note ?? "",
          item.noteEn,
          item.noteNo,
        ),
      }))
    : [];

  const priceMode: "fixed" | "from" =
    service.priceFrom != null &&
    service.priceTo != null &&
    service.priceFrom === service.priceTo
      ? "fixed"
      : "from";

  const initial = {
    id: service.id,
    locale,

    title: pickLocalizedValue(
      locale,
      service.title,
      service.titleEn,
      service.titleNo,
    ),
    description: pickLocalizedValue(
      locale,
      service.description,
      service.descriptionEn,
      service.descriptionNo,
    ),

    categoryId: service.categoryId ?? "",
    responseTime: service.responseTime ?? "1h",

    locationPostcode: service.locationPostcode ?? "",
    locationCity: service.locationCity ?? "",
    locationRegion: service.locationRegion ?? "",

    priceMode,
    mainPrice: service.priceFrom != null ? String(service.priceFrom) : "",

    imageUrl: service.imageUrl ?? null,
    imagePath: service.imagePath ?? null,

    galleryImageUrls:
      Array.isArray(service.galleryImageUrls) &&
      service.galleryImageUrls.length > 0
        ? service.galleryImageUrls
        : service.imageUrl
          ? [service.imageUrl]
          : [],

    galleryImagePaths:
      Array.isArray(service.galleryImagePaths) &&
      service.galleryImagePaths.length > 0
        ? service.galleryImagePaths
        : service.imagePath
          ? [service.imagePath]
          : [],

    highlights: pickLocalizedArray(
      locale,
      service.highlights,
      service.highlightsEn,
      service.highlightsNo,
    ),

    isActive: service.isActive,
    priceItems: localizedPriceItems,
  };

  const localizedCategories = categories.map((c) => ({
    id: c.id,
    name: translateCategoryName(c.slug, c.name, locale),
  }));

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.pageTitle}>{t("title")}</h1>
            <p className={styles.pageSubtitle}>{t("subtitle")}</p>
          </div>
        </header>

        <div className={styles.formCard}>
          <EditServiceForm
            initial={initial}
            categories={localizedCategories}
            maxImages={maxImages} 
          />
        </div>
      </div>
    </main>
  );
}