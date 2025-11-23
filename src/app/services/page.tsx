// src/app/services/page.tsx
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import styles from "./services.module.css";
import Filters from "./Filters";

export const dynamic = "force-dynamic";

type ServicesPageProps = {
  // NEXT 15: searchParams yra Promise
  searchParams: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
};

export default async function ServicesPage({ searchParams }: ServicesPageProps) {
  // 1. Išpakuojam Promise
  const resolvedParams = await searchParams;

  // 2. Pasiimam filtrus
  const cityFilter = (resolvedParams?.city as string | undefined) ?? "";
  const categoryFilter = (resolvedParams?.category as string | undefined) ?? "";
  const q = (resolvedParams?.q as string | undefined) ?? "";

  // 3. Prisma WHERE
  const where: any = {
    isActive: true,
  };

  if (cityFilter) {
    where.cityId = cityFilter;
  }

  if (categoryFilter) {
    where.categoryId = categoryFilter;
  }

  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }

  const [cities, categories, services] = await Promise.all([
    prisma.city.findMany({ orderBy: { name: "asc" } }),
    prisma.category.findMany({
      where: { type: "SERVICE" },
      orderBy: { name: "asc" },
    }),
    prisma.serviceListing.findMany({
      where,
      include: {
        city: true,
        category: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
  ]);

  return (
    <main className={styles.wrapper}>
      <h1 className={styles.heading}>Paslaugų sąrašas</h1>

      {/* Filtrų juosta */}
      <Filters
        cities={cities.map((c) => ({ id: c.id, name: c.name }))}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        initialCity={cityFilter}
        initialCategory={categoryFilter}
        initialQ={q}
      />

      {services.length === 0 && (
        <p className={styles.empty}>Pagal pasirinktus filtrus paslaugų nėra.</p>
      )}

      <div className={styles.grid}>
        {services.map((service) => (
          <Link
            key={service.id}
            href={`/services/${service.slug}`}
            className={styles.card}
          >
            <article>
              <h2 className={styles.cardTitle}>{service.title}</h2>

              <p className={styles.cardDescription}>{service.description}</p>

              <div className={styles.meta}>
                {service.city && (
                  <span className={styles.metaItem}>🏙 {service.city.name}</span>
                )}
                {service.category && (
                  <span className={styles.metaItem}>
                    📂 {service.category.name}
                  </span>
                )}
                {service.priceFrom != null && (
                  <span className={styles.metaItem}>
                    💰 nuo {service.priceFrom} NOK
                  </span>
                )}
              </div>

              {service.user && (
                <p className={styles.author}>
                  Skelbėjas: {service.user.name || "Nežinomas"} (
                  {service.user.email})
                </p>
              )}
            </article>
          </Link>
        ))}
      </div>
    </main>
  );
}
