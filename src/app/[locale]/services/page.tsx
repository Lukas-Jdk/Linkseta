// src/app/[locale]/services/page.tsx
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/seo";
import { setRequestLocale, getTranslations } from "next-intl/server";

import ServicesHero from "@/components/hero/ServicesHero";
import CardGrid from "@/components/cards/CardGrid";
import styles from "./services.module.css";

type SearchParams = {
  q?: string;
  city?: string;
  category?: string;
};

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
};

export const dynamic = "force-dynamic";

function buildLanguageAlternates(path: string) {
  return {
    lt: `${siteUrl}/lt${path}`,
    en: `${siteUrl}/en${path}`,
    no: `${siteUrl}/no${path}`,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "meta" });

  const title = t("servicesTitle");
  const description = t("servicesDesc");
  const canonicalPath = `/${locale}/services`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
      languages: buildLanguageAlternates("/services"),
    },
    openGraph: {
      title,
      description,
      url: `${siteUrl}${canonicalPath}`,
      siteName: "Linkseta",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function ServicesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const resolved = await searchParams;

  const q = resolved.q?.trim() ?? "";
  const city = resolved.city ?? "";
  const category = resolved.category ?? "";

  const where: Prisma.ServiceListingWhereInput = {
    isActive: true,
    deletedAt: null,
  };

  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }

  if (city) where.cityId = city;
  if (category) where.categoryId = category;

  const [services, cities, categories] = await Promise.all([
    prisma.serviceListing.findMany({
      where,
      include: { city: true, category: true },
      orderBy: [{ highlighted: "desc" }, { createdAt: "desc" }],
    }),
    prisma.city.findMany({ orderBy: { name: "asc" } }),
    prisma.category.findMany({
      where: { type: "SERVICE" },
      orderBy: { name: "asc" },
    }),
  ]);

  const activeCityName = city ? cities.find((c) => c.id === city)?.name ?? "" : "";
  const activeCategoryName = category
    ? categories.find((cat) => cat.id === category)?.name ?? ""
    : "";

  // (čia tekstą vėliau persikelsi į translations; kol kas palieku kaip buvo)
  let heading = "Services in Norway";

  if (activeCityName && activeCategoryName) {
    heading = `${activeCategoryName} – ${activeCityName}`;
  } else if (activeCityName) {
    heading = `Services in ${activeCityName}`;
  } else if (activeCategoryName) {
    heading = `${activeCategoryName} – Services in Norway`;
  }

  const items = services.map((service) => ({
    id: service.id,
    title: service.title,
    description: service.description,
    city: service.city?.name ?? "",
    category: service.category?.name ?? "",
    priceFrom: service.priceFrom,
    slug: service.slug,
    highlighted: service.highlighted ?? false,
    imageUrl: service.imageUrl,
  }));

  return (
    <main className={styles.page}>
      <ServicesHero />

      <section className={styles.results}>
        <div className="container">
          <p className={styles.meta}>
            {heading} · Found: <strong>{services.length}</strong>
            {q && (
              <>
                {" "}
                for <strong>&quot;{q}&quot;</strong>
              </>
            )}
          </p>

          {services.length === 0 ? (
            <p className={styles.emptyState}>
              No services found for your filters.
              <br />
              Try changing city/category or search terms.
            </p>
          ) : (
            <div className={styles.gridWrap}>
              <CardGrid items={items} variant="compact" />
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
