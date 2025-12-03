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
  // Next 16: searchParams yra Promise<>
  searchParams: Promise<SearchParams>;
};

export const dynamic = "force-dynamic";

export default async function ServicesPage({ searchParams }: Props) {
  // GAUNAM tikrą objektą iš Promise
  const resolved = await searchParams;

  const q = resolved.q?.trim() ?? "";
  const city = resolved.city ?? "";
  const category = resolved.category ?? "";

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
      orderBy: [{ highlighted: "desc" }, { createdAt: "desc" }],
    }),
    prisma.city.findMany({ orderBy: { name: "asc" } }),
    prisma.category.findMany({
      where: { type: "SERVICE" },
      orderBy: { name: "asc" },
    }),
  ]);

  // 🔹 Dinaminė antraštė pagal pasirinktus filtrus (SEO + UX)
  const activeCityName = city
    ? cities.find((c) => c.id === city)?.name ?? ""
    : "";
  const activeCategoryName = category
    ? categories.find((cat) => cat.id === category)?.name ?? ""
    : "";

  let heading = "Lietuvių paslaugos Norvegijoje";

  if (activeCityName && activeCategoryName) {
    heading = `${activeCategoryName} – lietuvių paslaugos ${activeCityName}`;
  } else if (activeCityName) {
    heading = `Lietuvių paslaugos ${activeCityName}`;
  } else if (activeCategoryName) {
    heading = `${activeCategoryName} – lietuvių paslaugos Norvegijoje`;
  }

  return (
    <main className={styles.wrapper}>
      <h1 className={styles.heading}>{heading}</h1>

      <p style={{ fontSize: 14, color: "#4b5563", marginBottom: 16 }}>
        Rasta paslaugų: <strong>{services.length}</strong>
        {q && (
          <>
            {" "}
            pagal paiešką <strong>&quot;{q}&quot;</strong>
          </>
        )}
      </p>

      {/* Filtrai – paprasta GET forma */}
      <form className={styles.filters}>
        <input
          name="q"
          type="search"
          className={styles.searchInput}
          placeholder="Ko ieškote? Pvz.: santechnikas, elektrikas, valytoja"
          defaultValue={q}
        />

        <select name="city" className={styles.select} defaultValue={city}>
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
      </form>

      {/* Rezultatai */}
      <div className={styles.grid}>
        {services.length === 0 && (
          <p className={styles.emptyState}>
            Šiuo metu pagal pasirinktus filtrus paslaugų nerasta.
            <br />
            Pabandykite pakoreguoti paiešką arba pasirinkti kitą miestą /
            kategoriją.
          </p>
        )}

        {services.map((service) => (
          <article key={service.id} className={styles.card}>
            <header className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>{service.title}</h2>
              <p className={styles.cardMeta}>
                {service.city?.name && <span>{service.city.name}</span>}
                {service.category?.name && (
                  <span> · {service.category.name}</span>
                )}
              </p>
            </header>

            <p className={styles.cardDescription}>
              {service.description.length > 180
                ? service.description.slice(0, 180) + "..."
                : service.description}
            </p>

            <footer className={styles.cardFooter}>
              <div className={styles.cardPrice}>
                {service.priceFrom ? (
                  <>
                    Nuo <strong>{service.priceFrom} NOK</strong>
                  </>
                ) : (
                  <span>Kaina sutartinė</span>
                )}
              </div>
              <Link
                href={`/services/${service.slug}`}
                className={styles.cardLink}
              >
                Žiūrėti paslaugą
              </Link>
            </footer>
          </article>
        ))}
      </div>
    </main>
  );
}
