// src/app/services/page.tsx
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import ServicesHero from "@/components/hero/ServicesHero";
import CardGrid from "@/components/cards/CardGrid";
import styles from "./services.module.css";

type SearchParams = {
  q?: string;
  city?: string;
  category?: string;
};

type Props = {
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
    deletedAt: null, // ✅ soft-delete filtras
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

  
  let heading = "Paslaugos Norvegijoje";

  if (activeCityName && activeCategoryName) {
    heading = `${activeCategoryName} – paslaugos ${activeCityName}`;
  } else if (activeCityName) {
    heading = `Paslaugos ${activeCityName}`;
  } else if (activeCategoryName) {
    heading = `${activeCategoryName} – paslaugos Norvegijoje`;
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
            {heading} · Rasta paslaugų: <strong>{services.length}</strong>
            {q && (
              <>
                {" "}
                pagal paiešką <strong>&quot;{q}&quot;</strong>
              </>
            )}
          </p>

          {services.length === 0 ? (
            <p className={styles.emptyState}>
              Šiuo metu pagal pasirinktus filtrus paslaugų nerasta.
              <br />
              Pabandykite pakoreguoti paiešką arba pasirinkti kitą miestą / kategoriją.
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