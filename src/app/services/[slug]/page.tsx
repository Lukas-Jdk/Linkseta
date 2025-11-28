// src/app/services/[slug]/page.tsx
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/seo";
import styles from "./slugPage.module.css";

type ServicePageParams = {
  slug: string;
};

type ServicePageProps = {
  params: Promise<ServicePageParams>;
};

export const dynamic = "force-dynamic";

// SEO: sugeneruojam unikalų title/description kiekvienai paslaugai
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
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const cityName = service.city?.name ?? "Norvegija";
  const title = `${service.title} – ${cityName} | Linkseta`;
  const baseDesc =
    service.description?.trim() ||
    `Lietuvių paslaugos Norvegijoje – ${service.title}.`;
  const description =
    baseDesc.length > 155 ? `${baseDesc.slice(0, 152)}...` : baseDesc;

  const url = `${siteUrl}/services/${slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      type: "article",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

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
