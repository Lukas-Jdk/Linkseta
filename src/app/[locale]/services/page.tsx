// src/app/[locale]/services/page.tsx
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/seo";
import { setRequestLocale, getTranslations } from "next-intl/server";
import {
  validatePaginationParams,
  sanitizeStringParam,
} from "@/lib/validation";

import ServicesHero from "@/components/hero/ServicesHero";
import CardGrid from "@/components/cards/CardGrid";
import PaginationLinks from "@/components/seo/PaginationLinks";
import styles from "./services.module.css";

type SearchParams = {
  q?: string;
  city?: string;
  category?: string;
  page?: string;
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

export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "meta" });

  const title = t("servicesTitle");
  const description = t("servicesDesc");

  const resolved = await searchParams;
  const pageNum = Math.max(1, parseInt(resolved.page ?? "1", 10));

  const queryParams = new URLSearchParams();
  if (resolved.q) queryParams.set("q", resolved.q);
  if (resolved.city) queryParams.set("city", resolved.city);
  if (resolved.category) queryParams.set("category", resolved.category);
  const queryString = queryParams.toString();
  const baseQueryString = queryString ? `?${queryString}&` : "?";

  const canonicalPath =
    pageNum === 1
      ? `${siteUrl}/${locale}/services${queryString ? `?${queryString}` : ""}`
      : `${siteUrl}/${locale}/services${baseQueryString}page=${pageNum}`;

  const prevLink =
    pageNum > 1
      ? {
          rel: "prev" as const,
          href:
            pageNum === 2
              ? `${siteUrl}/${locale}/services${queryString ? `?${queryString}` : ""}`
              : `${siteUrl}/${locale}/services${baseQueryString}page=${pageNum - 1}`,
        }
      : null;

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
      url: canonicalPath,
      siteName: "Linkseta",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    ...(prevLink && {
      other: {
        prev: prevLink.href,
      },
    }),
  };
}

export default async function ServicesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const resolved = await searchParams;

  const paginationResult = validatePaginationParams(
    resolved.page,
    undefined,
  );

  if ("error" in paginationResult) {
    return (
      <main className={styles.page}>
        <ServicesHero />
        <section className={styles.results}>
          <div className="container">
            <p className={styles.emptyState}>
              Invalid page number. Please try again.
            </p>
          </div>
        </section>
      </main>
    );
  }

  const pageNum = paginationResult.page;
  const pageSize = paginationResult.pageSize;

  const q = sanitizeStringParam(resolved.q);
  const city = sanitizeStringParam(resolved.city);
  const category = sanitizeStringParam(resolved.category);

  const skip = (pageNum - 1) * pageSize;

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

  const [total, cities, categories, services] = await Promise.all([
    prisma.serviceListing.count({ where }),
    prisma.city.findMany({ orderBy: { name: "asc" } }),
    prisma.category.findMany({
      where: { type: "SERVICE" },
      orderBy: { name: "asc" },
    }),
    prisma.serviceListing.findMany({
      where,
      include: { city: true, category: true },
      orderBy: [{ highlighted: "desc" }, { createdAt: "desc" }],
      skip,
      take: pageSize,
    }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  const activeCityName = city
    ? (cities.find((c) => c.id === city)?.name ?? "")
    : "";
  const activeCategoryName = category
    ? (categories.find((cat) => cat.id === category)?.name ?? "")
    : "";

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

  const queryParams = new URLSearchParams();
  if (q) queryParams.set("q", q);
  if (city) queryParams.set("city", city);
  if (category) queryParams.set("category", category);

  const getPageUrl = (p: number) => {
    const params = new URLSearchParams(queryParams);
    params.set("page", String(p));
    return `/${locale}/services?${params.toString()}`;
  };

  return (
    <main className={styles.page}>
      <PaginationLinks
        locale={locale}
        pageNum={pageNum}
        totalPages={totalPages}
      />
      <ServicesHero />

      <section className={styles.results}>
        <div className="container">
          <p className={styles.meta}>
            {heading} · Found: <strong>{total}</strong>
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
            <>
              <div className={styles.gridWrap}>
                <CardGrid items={items} variant="compact" locale={locale} />
              </div>

              {totalPages > 1 && (
                <div className={styles.pagination}>
                  <div className={styles.paginationInfo}>
                    Page {pageNum} of {totalPages}
                  </div>
                  <div className={styles.paginationControls}>
                    {pageNum > 1 && (
                      <a
                        href={getPageUrl(pageNum - 1)}
                        className={styles.paginationButton}
                      >
                        ← Previous
                      </a>
                    )}

                    <div className={styles.pageNumbers}>
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(
                          (p) =>
                            p === 1 ||
                            p === totalPages ||
                            (p >= pageNum - 1 && p <= pageNum + 1),
                        )
                        .map((p, idx, arr) => {
                          const prevPage = arr[idx - 1];
                          const showEllipsis = prevPage && p - prevPage > 1;

                          return (
                            <div key={p}>
                              {showEllipsis && (
                                <span className={styles.ellipsis}>...</span>
                              )}
                              {p === pageNum ? (
                                <span className={styles.pageNumberActive}>
                                  {p}
                                </span>
                              ) : (
                                <a
                                  href={getPageUrl(p)}
                                  className={styles.pageNumber}
                                >
                                  {p}
                                </a>
                              )}
                            </div>
                          );
                        })}
                    </div>

                    {pageNum < totalPages && (
                      <a
                        href={getPageUrl(pageNum + 1)}
                        className={styles.paginationButton}
                      >
                        Next →
                      </a>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}