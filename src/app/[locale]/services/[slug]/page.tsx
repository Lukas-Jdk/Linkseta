// src/app/[locale]/services/[slug]/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/seo";
import { setRequestLocale } from "next-intl/server";

import styles from "./slugPage.module.css";
import GalleryClient from "./GalleryClient";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

function stripHtml(input: string) {
  return input.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function truncate(input: string, max = 160) {
  const s = input.trim();
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "…";
}

function formatDateLT(date: Date) {
  return new Intl.DateTimeFormat("lt-LT", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatPriceNOK(value: number) {
  return new Intl.NumberFormat("nb-NO").format(value);
}

function initialLetter(name: string | null, email: string) {
  const src = name?.trim() ? name.trim() : email;
  return src.slice(0, 1).toUpperCase() || "U";
}

function buildLanguageAlternates(slug: string) {
  const path = `/services/${slug}`;
  return {
    lt: `${siteUrl}/lt${path}`,
    en: `${siteUrl}/en${path}`,
    no: `${siteUrl}/no${path}`,
  };
}

function isSafeAvatarUrl(url: string | null | undefined) {
  if (!url) return false;
  const s = url.trim();
  if (!s) return false;
  // leiskim tik http(s) arba local path (/...)
  return s.startsWith("http://") || s.startsWith("https://") || s.startsWith("/");
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const service = await prisma.serviceListing.findUnique({
    where: { slug },
    select: {
      title: true,
      description: true,
      imageUrl: true,
      isActive: true,
      city: { select: { name: true } },
      category: { select: { name: true } },
    },
  });

  if (!service || !service.isActive) {
    return { robots: { index: false, follow: false } };
  }

  const title = `${service.title} | Linkseta`;
  const description = truncate(
    stripHtml(service.description || "Find service providers in Norway on Linkseta."),
    160,
  );

  const canonical = `${siteUrl}/${locale}/services/${slug}`;

  const ogImage =
    service.imageUrl && service.imageUrl.startsWith("http")
      ? service.imageUrl
      : `${siteUrl}/og.png`;

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: buildLanguageAlternates(slug),
    },
    openGraph: {
      url: canonical,
      title,
      description,
      siteName: "Linkseta",
      type: "article",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: service.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function ServiceDetailsPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const service = await prisma.serviceListing.findFirst({
    where: {
      slug,
      isActive: true,
      deletedAt: null,
    },
    include: {
      city: true,
      category: true,
      user: { include: { profile: true } },
    },
  });

  if (!service) notFound();

  const cover = service.imageUrl || "/def.webp";
  const images = service.imageUrl ? [cover, cover, cover] : [cover];

  const city = service.city?.name ?? "—";
  const category = service.category?.name ?? "—";
  const created = formatDateLT(service.createdAt);

  // DEMO rating
  const ratingValue = 5.0;
  const ratingCount = 1;

  const sellerName = service.user.name?.trim() || service.user.email.split("@")[0];
  const sellerInitial = initialLetter(service.user.name, service.user.email);
  const isVerified = Boolean(service.user.profile?.isApproved);

  // ✅ AVATAR (nuotrauka jei yra, kitaip initial)
  const sellerAvatarUrl = isSafeAvatarUrl((service.user as any)?.avatarUrl)
    ? String((service.user as any)?.avatarUrl).trim()
    : null;

  const priceLabel = service.priceFrom != null ? "Kaina nuo" : "Kaina";
  const priceValue =
    service.priceFrom != null ? `${formatPriceNOK(service.priceFrom)} NOK` : "Kaina sutartinė";

  const mailto = `mailto:${service.user.email}?subject=${encodeURIComponent(
    `Užklausa dėl paslaugos: ${service.title}`,
  )}`;

  const highlights = Array.isArray(service.highlights) ? service.highlights : [];
  const hasHighlights = highlights.length > 0;

  // JSON-LD (Service schema)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.title,
    description: service.description,
    areaServed: {
      "@type": "AdministrativeArea",
      name: city !== "—" ? city : "Norway",
    },
    provider: {
      "@type": "Person",
      name: sellerName,
    },
    offers: {
      "@type": "Offer",
      priceCurrency: "NOK",
      price: service.priceFrom ?? undefined,
      availability: "https://schema.org/InStock",
      url: `${siteUrl}/${locale}/services/${service.slug}`,
    },
  };

  return (
    <main className={styles.page}>
      <div className="container">
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <div className={styles.topBar}>
          <Link href={`/${locale}/services`} className={styles.backLink}>
            ← Grįžti į sąrašą
          </Link>
        </div>

        <div className={styles.layout}>
          {/* LEFT */}
          <section className={styles.left}>
            <div className={styles.stackCard}>
              {/* HERO */}
              <div className={styles.heroCard}>
                <div className={styles.heroTop}>
                  <div className={styles.heroMedia}>
                    <GalleryClient
                      title={service.title}
                      images={images}
                      highlighted={service.highlighted}
                    />
                  </div>

                  <div className={styles.heroContent}>
                    <h1 className={styles.title}>{service.title}</h1>

                    <div className={styles.ratingRow}>
                      <span className={styles.ratingValue}>⭐ {ratingValue.toFixed(1)}</span>
                      <span className={styles.ratingCount}>({ratingCount})</span>
                    </div>

                    <div className={styles.metaRow}>
                      <span className={styles.metaChip}>📍 {city}</span>
                      <span className={styles.metaChip}>📁 {category}</span>
                      <span className={styles.metaChip}>📅 {created}</span>
                    </div>

                    <div className={styles.quickInfo}>⚡ Dažniausiai atsako per 1 val.</div>
                  </div>
                </div>
              </div>

              {/* CONTENT */}
              <div className={styles.contentCard}>
                <div className={styles.tabs}>
                  <a className={`${styles.tab} ${styles.tabActive}`} href="#apie">
                    Apie paslaugą
                  </a>
                  <a className={styles.tab} href="#atsiliepimai">
                    Atsiliepimai
                  </a>
                </div>

                <div id="apie" className={styles.section}>
                  <h2 className={styles.sectionTitle}>Aprašymas</h2>
                  <p className={styles.desc}>{service.description}</p>
                </div>

                {hasHighlights && (
                  <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>Kodėl verta rinktis šią paslaugą?</h2>
                    <ul className={styles.bullets}>
                      {highlights.map((h, i) => (
                        <li key={i}>✅ {h}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div id="atsiliepimai" className={styles.section}>
                  <h2 className={styles.sectionTitle}>Atsiliepimai</h2>
                  <p className={styles.descSmall}>
                    DEMO: atsiliepimai bus vėliau (kai pridėsiu review sistemą).
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* RIGHT */}
          <aside className={styles.right}>
            <div className={styles.sideCard}>
              <div className={styles.priceBlock}>
                <div className={styles.sideLabel}>{priceLabel}</div>
                <div className={styles.sidePrice}>{priceValue}</div>
              </div>

              <div className={styles.sellerBlock}>
                <div className={styles.sellerRow}>
                  <div className={styles.sellerAvatar} aria-hidden="true">
                    {sellerAvatarUrl ? (
                      <img
                        className={styles.sellerAvatarImg}
                        src={sellerAvatarUrl}
                        alt=""
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      sellerInitial
                    )}
                  </div>

                  <div className={styles.sellerInfo}>
                    <div className={styles.sellerLabel}>Skelbėjas</div>

                    <div className={styles.sellerNameRow}>
                      <span className={styles.sellerName}>{sellerName}</span>
                      {isVerified && <span className={styles.verified}>✔ Patvirtintas</span>}
                    </div>
                  </div>
                </div>

                <a className={styles.primaryBtn} href={mailto}>
                  ✉ Rašyti el. paštu
                </a>

                <button className={styles.secondaryBtn} type="button" disabled>
                  💬 Siųsti žinutę (bus vėliau)
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}