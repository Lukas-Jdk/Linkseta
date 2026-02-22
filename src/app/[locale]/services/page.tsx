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

// Helper to build pagination link
function buildPaginationLink(
  locale: string,
  q?: string,
  city?: string,
  category?: string,
  page?: number,
): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (city) params.set("city", city);
  if (category) params.set("category", category);
  if (page && page > 1) params.set("page", String(page));

  const queryString = params.toString();
  return `${siteUrl}/${locale}/services${queryString ? `?${queryString}` : ""}`;
}

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

  // Build query string without page param
  const queryParams = new URLSearchParams();
  if (resolved.q) queryParams.set("q", resolved.q);
  if (resolved.city) queryParams.set("city", resolved.city);
  if (resolved.category) queryParams.set("category", resolved.category);
  const queryString = queryParams.toString();
  const baseQueryString = queryString ? `?${queryString}&` : "?";

  // Canonical: no page param for page 1, with page param for page > 1
  const canonicalPath =
    pageNum === 1
      ? `${siteUrl}/${locale}/services${queryString ? `?${queryString}` : ""}`
      : `${siteUrl}/${locale}/services${baseQueryString}page=${pageNum}`;

  // Prev link (if not on page 1)
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

  // Next link (we'll use a placeholder; totalPages will be available in the component)
  // Note: We can't know totalPages here without querying the DB, so next link will be added in JSX

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

  // Validate and parse pagination params
  const paginationResult = validatePaginationParams(
    resolved.page,
    undefined, // pageSize is not supported in this UI, use default
  );

  // Invalid pagination params - render error (can be improved with better UX)
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

  // Sanitize string params
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

  // Fetch total count and filter options in parallel
  const [total, cities, categories] = await Promise.all([
    prisma.serviceListing.count({ where }),
    prisma.city.findMany({ orderBy: { name: "asc" } }),
    prisma.category.findMany({
      where: { type: "SERVICE" },
      orderBy: { name: "asc" },
    }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  // If page is beyond totalPages, render empty results with correct metadata
  let services: Array<any> = [];
  if (pageNum <= totalPages || totalPages === 0) {
    services = await prisma.serviceListing.findMany({
      where,
      include: { city: true, category: true },
      orderBy: [{ highlighted: "desc" }, { createdAt: "desc" }],
      skip,
      take: pageSize,
    });
  }

  const activeCityName = city
    ? (cities.find((c) => c.id === city)?.name ?? "")
    : "";
  const activeCategoryName = category
    ? (categories.find((cat) => cat.id === category)?.name ?? "")
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

  // Build query string for pagination links
  const queryParams = new URLSearchParams();
  if (q) queryParams.set("q", q);
  if (city) queryParams.set("city", city);
  if (category) queryParams.set("category", category);
  const baseUrl = `/${locale}/services?${queryParams.toString()}`;
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

              {/* Pagination controls */}
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

                    {/* Page numbers */}
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
