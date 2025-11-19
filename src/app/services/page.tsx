// src/app/services/page.tsx
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import styles from "./services.module.css";

type ServicesPageProps = {
  searchParams?: {
    [key: string]: string | string[] | undefined;
  };
};

export default async function ServicesPage({ searchParams }: ServicesPageProps) {
  const cityFilter = (searchParams?.city as string | undefined) ?? "";
  const categoryFilter = (searchParams?.category as string | undefined) ?? "";
  const q = (searchParams?.q as string | undefined) ?? "";

  const services = await prisma.serviceListing.findMany({
    where: {
      isActive: true,
      city: cityFilter ? { slug: cityFilter } : undefined,
      category: categoryFilter ? { slug: categoryFilter } : undefined,
      OR: q
        ? [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ]
        : undefined,
    },
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
  });

  return (
    <main className={styles.wrapper}>
      <h1 className={styles.heading}>Paslaugų sąrašas</h1>

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
                {service.priceFrom && (
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
