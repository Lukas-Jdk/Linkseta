// src/app/services/[slug]/page.tsx
import { notFound } from "next/navigation";
import type { Metadata, ResolvingMetadata } from "next";
import { prisma } from "@/lib/prisma";
import styles from "./slugPage.module.css";

type ServicePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

// Kad Next galėtų sugeneruoti SEO tagus per slug
export async function generateMetadata(
  { params }: ServicePageProps
): Promise<Metadata> {

  const { slug } = await params;

  const service = await prisma.serviceListing.findFirst({
    where: { slug, isActive: true },
    include: {
      city: true,
      category: true,
    },
  });

  if (!service) {
    return {
      title: "Paslauga nerasta | Linkseta",
      description:
        "Šios paslaugos sistemoje nebėra. Ji galėjo būti ištrinta arba tapo neaktyvi.",
    };
  }

  const title = `${service.title} | Linkseta`;
  const description =
    service.description?.slice(0, 150) ??
    "Peržiūrėkite paslaugos informaciją platformoje Linkseta.";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
  };
}

export const dynamic = "force-dynamic";

export default async function ServicePage({ params }: ServicePageProps) {
  const { slug } = await params;

  const service = await prisma.serviceListing.findFirst({
    where: { slug, isActive: true }, // 👈 tik aktyvios
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
    // gražus 404 + Next notFound (kad header'iai teisingi)
    notFound();
  }

  return (
    <main className={styles.wrapper}>
      <header className={styles.headerRow}>
        <h1 className={styles.title}>{service.title}</h1>

        {service.highlighted && <span className={styles.topBadge}>TOP</span>}
      </header>

      <p className={styles.description}>{service.description}</p>

      <div className={styles.meta}>
        {service.city && <span>🏙 Miestas: {service.city.name}</span>}
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
