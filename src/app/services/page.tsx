// src/app/services/page.tsx
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import ServicesHero from "@/components/hero/ServicesHero";
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
      },
      orderBy: [{ highlighted: "desc" }, { createdAt: "desc" }],
    }),
    prisma.city.findMany({ orderBy: { name: "asc" } }),
    prisma.category.findMany({
      where: { type: "SERVICE" },
      orderBy: { name: "asc" },
    }),
  ]);

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
    <main className={styles.page}>
      <ServicesHero />

      <section className={styles.results}>
        <div className="container">
          <p className={styles.meta}>
            {heading} · Rasta paslaugų: <strong>{services.length}</strong>
            {q && (
              <>
                {" "}
                pagal paiešką <strong>&quot;{q}&quot;</strong>
              </>
            )}
          </p>

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
                  <div className={styles.chips}>
                    {service.city?.name && (
                      <span className={styles.chip}>{service.city.name}</span>
                    )}
                    {service.category?.name && (
                      <span className={styles.chip}>
                        {service.category.name}
                      </span>
                    )}
                    {service.highlighted && (
                      <span
                        className={`${styles.chip} ${styles.chipPremium}`}
                      >
                        Rekomenduojama
                      </span>
                    )}
                  </div>
                  <h2 className={styles.cardTitle}>{service.title}</h2>
                </header>

                <p className={styles.cardDescription}>
                  {service.description.length > 190
                    ? service.description.slice(0, 190) + "..."
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
        </div>
      </section>
    </main>
  );
}
