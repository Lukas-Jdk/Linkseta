// src/app/services/[slug]/page.tsx
import { prisma } from "@/lib/prisma";
import styles from "./slugPage.module.css";

// Next.js 15: params yra Promise
type ServicePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function ServicePage({ params }: ServicePageProps) {
  // 1. Išlaukiame parametrų
  const resolvedParams = await params;

  const service = await prisma.serviceListing.findFirst({
    where: { slug: resolvedParams.slug }, // Naudojame resolvedParams
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
    return <div className={styles.wrapper}>Paslauga nerasta.</div>;
  }

  return (
    <main className={styles.wrapper}>
      <h1 className={styles.title}>{service.title}</h1>

      <p className={styles.description}>{service.description}</p>

      <div className={styles.meta}>
        {service.city && (
          <span>🏙 Miestas: {service.city.name}</span>
        )}
        {service.category && (
          <span>📂 Kategorija: {service.category.name}</span>
        )}
        {service.priceFrom && (
          <span>💰 Kaina nuo: {service.priceFrom} NOK</span>
        )}
      </div>

      {service.user && (
        <div className={styles.author}>
          Skelbėjas: {service.user.name || "Nežinomas"} ({service.user.email})
        </div>
      )}
    </main>
  );
}