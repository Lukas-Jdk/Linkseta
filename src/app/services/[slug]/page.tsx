// src/app/services/[slug]/page.tsx
import { prisma } from "@/lib/prisma";
import styles from "./slugPage.module.css";

type ServicePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function ServicePage({ params }: ServicePageProps) {
  const { slug } = await params;

  const service = await prisma.serviceListing.findFirst({
    where: { slug },
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
  });

  if (!service) {
    return (
      <main className={styles.wrapper}>
        <h1 className={styles.title}>Paslauga nerasta</h1>
        <p className={styles.description}>
          Tokios paslaugos sistemoje neradome. Ji galėjo būti ištrinta arba
          tapo neaktyvi.
        </p>
      </main>
    );
  }

  return (
    <main className={styles.wrapper}>
      <header className={styles.headerRow}>
        <h1 className={styles.title}>{service.title}</h1>

        {service.highlighted && (
          <span className={styles.topBadge}>TOP</span>
        )}
      </header>

      <p className={styles.description}>{service.description}</p>

      <div className={styles.meta}>
        {service.city && (
          <span>🏙 Miestas: {service.city.name}</span>
        )}
        {service.category && (
          <span>📂 Kategorija: {service.category.name}</span>
        )}
        {service.priceFrom != null && (
          <span>💰 Kaina nuo: {service.priceFrom} NOK</span>
        )}
      </div>

      {service.user && (
        <div className={styles.authorBox}>
          <p className={styles.author}>
            Skelbėjas: {service.user.name || "Nežinomas"} (
            {service.user.email})
          </p>

          <a
            href={`mailto:${service.user.email}`}
            className={styles.emailButton}
          >
            Rašyti el. paštu
          </a>
        </div>
      )}
    </main>
  );
}
