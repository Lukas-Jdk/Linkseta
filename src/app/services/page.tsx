// src/app/services/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import styles from "./services.module.css";

type SearchParams = {
  q?: string;
  city?: string;
  category?: string;
};

type Props = {
  searchParams?: SearchParams;
};

export const dynamic = "force-dynamic";

export default async function ServicesPage({ searchParams }: Props) {
  const q = searchParams?.q?.trim() ?? "";
  const city = searchParams?.city ?? "";
  const category = searchParams?.category ?? "";

  const where: Prisma.ServiceListingWhereInput = {
    isActive: true,
  };

  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }

  if (city) {
    where.cityId = city;
  }

  if (category) {
    where.categoryId = category;
  }

  const [services, cities, categories] = await Promise.all([
    prisma.serviceListing.findMany({
      where,
      include: {
        city: true,
        category: true,
        user: {
          select: { name: true, email: true },
        },
      },
      orderBy: [
        { highlighted: "desc" },
        { createdAt: "desc" },
      ],
    }),
    prisma.city.findMany({ orderBy: { name: "asc" } }),
    prisma.category.findMany({
      where: { type: "SERVICE" },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <main className={styles.wrapper}>
      <h1 className={styles.heading}>Visos paslaugos</h1>

      {/* Filtrai – paprasta GET forma */}
      <form className={styles.filters}>
        <input
          name="q"
          type="search"
          className={styles.searchInput}
          placeholder="Ko ieškote? Pvz.: santechnikas, elektrik as, kirpėja..."
          defaultValue={q}
        />

        <div className={styles.filterRow}>
          <select
            name="city"
            className={styles.select}
            defaultValue={city}
          >
            <option value="">Visi miestai</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            name="category"
            className={styles.select}
            defaultValue={category}
          >
            <option value="">Visos kategorijos</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          <button type="submit" className={styles.filterButton}>
            Filtruoti
          </button>
        </div>
      </form>

      {/* Sąrašas */}
      {services.length === 0 ? (
        <p className={styles.empty}>
          Pagal pasirinktus filtrus paslaugų nerasta.
        </p>
      ) : (
        <div className={styles.grid}>
          {services.map((s) => (
            <Link
              key={s.id}
              href={`/services/${s.slug}`}
              className={styles.card}
            >
              <h2 className={styles.cardTitle}>{s.title}</h2>
              <p className={styles.cardDescription}>
                {s.description?.length
                  ? s.description.length > 180
                    ? s.description.slice(0, 180) + "…"
                    : s.description
                  : "Aprašymas nepateiktas."}
              </p>

              <div className={styles.meta}>
                {s.city?.name && (
                  <span className={styles.metaItem}>🏙 {s.city.name}</span>
                )}
                {s.category?.name && (
                  <span className={styles.metaItem}>
                    📂 {s.category.name}
                  </span>
                )}
                {s.priceFrom != null && (
                  <span className={styles.metaItem}>
                    💰 nuo {s.priceFrom} NOK
                  </span>
                )}
              </div>

              {s.user && (
                <div className={styles.author}>
                  Skelbėjas: {s.user.name || s.user.email}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
