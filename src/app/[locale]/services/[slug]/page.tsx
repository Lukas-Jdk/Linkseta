
// src/app/[locale]/services/[slug]/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/seo";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { absOg, localeAlternates } from "@/lib/seo-i18n";

import { MapPin, Folder, Zap, Mail, Phone, BadgeCheck } from "lucide-react";

import styles from "./slugPage.module.css";
import GalleryClient from "./GalleryClient";
import ServiceTabsClient from "./ServiceTabsClient";

export const revalidate = 120;

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

function formatPriceNOK(value: number) {
  return new Intl.NumberFormat("nb-NO").format(value);
}

function initialLetter(name: string | null, email: string) {
  const src = name?.trim() ? name.trim() : email;
  return src.slice(0, 1).toUpperCase() || "U";
}

function isSafeAvatarUrl(url: string | null | undefined) {
  if (!url) return false;
  const s = url.trim();
  if (!s) return false;
  return (
    s.startsWith("http://") || s.startsWith("https://") || s.startsWith("/")
  );
}

function normalizePhoneHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const tMeta = await getTranslations({ locale, namespace: "meta" });
  const t = await getTranslations({ locale, namespace: "serviceDetailsPage" });

  const service = await prisma.serviceListing.findUnique({
    where: { slug },
    select: {
      title: true,
      description: true,
      imageUrl: true,
      isActive: true,
      deletedAt: true,
    },
  });

  if (!service || !service.isActive || service.deletedAt) {
    return { robots: { index: false, follow: false } };
  }

  const title = `${service.title} | ${tMeta("siteName")}`;
  const description = truncate(
    stripHtml(service.description || t("metaFallbackDescription")),
    160,
  );

  const canonical = `${siteUrl}/${locale}/services/${slug}`;

  const ogImage =
    service.imageUrl && service.imageUrl.startsWith("http")
      ? service.imageUrl
      : absOg("/og.png");

  return {
    title,
    description,
    alternates: {
      ...localeAlternates(`/services/${slug}`),
      canonical,
    },
    openGraph: {
      url: canonical,
      title,
      description,
      siteName: tMeta("siteName"),
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

  const t = await getTranslations({
    locale,
    namespace: "serviceDetailsPage",
  });

  const tCategories = await getTranslations({
    locale,
    namespace: "categories",
  });

  const service = await prisma.serviceListing.findFirst({
    where: {
      slug,
      isActive: true,
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
      description: true,
      slug: true,
      priceFrom: true,
      highlighted: true,
      highlights: true,
      imageUrl: true,
      galleryImageUrls: true,
      city: {
        select: {
          name: true,
        },
      },
      category: {
        select: {
          name: true,
          slug: true,
        },
      },
      user: {
        select: {
          email: true,
          name: true,
          phone: true,
          avatarUrl: true,
          profile: {
            select: {
              isApproved: true,
            },
          },
        },
      },
    },
  });

  if (!service) notFound();

  const gallery = Array.isArray(service.galleryImageUrls)
    ? service.galleryImageUrls.filter(Boolean)
    : [];

  const images =
    gallery.length > 0
      ? gallery
      : service.imageUrl
        ? [service.imageUrl]
        : ["/def.webp"];

  const city = service.city?.name ?? "—";
  const category = service.category?.slug
    ? tCategories(service.category.slug)
    : "—";

  const ratingValue = 5.0;
  const ratingCount = 1;

  const sellerName =
    service.user.name?.trim() || service.user.email.split("@")[0];
  const sellerInitial = initialLetter(service.user.name, service.user.email);
  const isVerified = Boolean(service.user.profile?.isApproved);

  const sellerAvatarUrl = isSafeAvatarUrl(service.user.avatarUrl)
    ? String(service.user.avatarUrl).trim()
    : null;

  const phoneRaw = service.user.phone ? String(service.user.phone).trim() : "";
  const phone = phoneRaw || null;
  const telHref = phone ? normalizePhoneHref(phone) : null;

  const priceValue =
    service.priceFrom != null
      ? `${formatPriceNOK(service.priceFrom)} NOK`
      : t("priceNegotiable");

  const mobileCompactPriceValue =
    service.priceFrom != null
      ? `${formatPriceNOK(service.priceFrom)} NOK`
      : "—";

  const emailHref = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
    service.user.email,
  )}&su=${encodeURIComponent(
    t("emailSubject", { title: service.title }),
  )}&body=${encodeURIComponent(
    t("emailBody", { title: service.title }),
  )}`;

  const highlights = Array.isArray(service.highlights)
    ? service.highlights
    : [];

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

  const SellerCard = (
    <div className={styles.sideCard}>
      <div className={styles.sellerHeader}>
        <div className={styles.sellerAvatarWrap}>
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

          <span className={styles.onlineDot} aria-hidden="true" />
        </div>

        <div className={styles.sellerName}>{sellerName}</div>

        <div className={styles.sellerSubtitle}>
          {isVerified ? t("activeProvider") : t("provider")}
        </div>

        {isVerified && (
          <div className={styles.verifiedBadge}>
            <BadgeCheck size={16} />
            {t("active")}
          </div>
        )}
      </div>

      <div className={styles.priceBox}>
        <div className={styles.priceBoxLabel}>{t("servicePriceLabel")}</div>
        <div className={styles.priceBoxValue}>{priceValue}</div>
      </div>

      <div className={styles.sideActions}>
        <a
          className={styles.primaryBtn}
          href={emailHref}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Mail size={18} />
          {t("writeEmail")}
        </a>

        {telHref ? (
          <a className={styles.secondaryBtn} href={telHref}>
            <Phone size={18} />
            {phone}
          </a>
        ) : (
          <button className={styles.secondaryBtn} type="button" disabled>
            <Phone size={18} />
            {t("noPhone")}
          </button>
        )}
      </div>
    </div>
  );

  const TabletInlineSeller = (
    <div className={styles.tabletInlineSeller}>
      <div className={styles.tabletInlineSellerLeft}>
        <div className={styles.tabletInlineAvatarWrap}>
          <div className={styles.tabletInlineAvatar} aria-hidden="true">
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
        </div>

        <div className={styles.tabletInlineInfo}>
          <div className={styles.tabletInlineName}>{sellerName}</div>
          <div className={styles.tabletInlineSubtitle}>{t("provider")}</div>
        </div>
      </div>

      <div className={styles.tabletInlinePrice}>
        <div className={styles.tabletInlinePriceValue}>
          {mobileCompactPriceValue}
        </div>
        <div className={styles.tabletInlinePriceLabel}>
          {t("priceFromLabel")}
        </div>
      </div>
    </div>
  );

  const MobileSellerCompact = (
    <div className={styles.mobileCompactSellerCard}>
      <div className={styles.mobileCompactSeller}>
        <div className={styles.mobileCompactLeft}>
          <div className={styles.mobileCompactAvatarWrap}>
            <div className={styles.mobileCompactAvatar} aria-hidden="true">
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
          </div>

          <div className={styles.mobileCompactInfo}>
            <div className={styles.mobileCompactName}>{sellerName}</div>
            <div className={styles.mobileCompactSubtitle}>{t("provider")}</div>
          </div>
        </div>

        <div className={styles.mobileCompactPrice}>
          <div className={styles.mobileCompactPriceValue}>
            {mobileCompactPriceValue}
          </div>
          <div className={styles.mobileCompactPriceLabel}>
            {t("priceFromLabel")}
          </div>
        </div>
      </div>
    </div>
  );

  const MobileBottomSellerCard = (
    <div className={styles.mobileBottomSellerCard}>
      <div className={styles.mobileBottomSellerHeader}>
        <div className={styles.mobileBottomAvatarWrap}>
          <div className={styles.mobileBottomAvatar} aria-hidden="true">
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
          <span className={styles.onlineDot} aria-hidden="true" />
        </div>

        <div className={styles.mobileBottomSellerName}>{sellerName}</div>
        <div className={styles.mobileBottomSellerSubtitle}>
          {isVerified ? t("activeProvider") : t("provider")}
        </div>

        {isVerified && (
          <div className={styles.verifiedBadge}>
            <BadgeCheck size={16} />
            {t("active")}
          </div>
        )}
      </div>

      <div className={styles.mobileBottomPriceBox}>
        <div className={styles.mobileBottomPriceLabel}>
          {t("servicePriceLabel")}
        </div>
        <div className={styles.mobileBottomPriceValue}>{priceValue}</div>
      </div>

      <div className={styles.mobileBottomActions}>
        <a
          className={styles.primaryBtn}
          href={emailHref}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Mail size={18} />
          {t("writeEmail")}
        </a>

        {telHref ? (
          <a className={styles.secondaryBtn} href={telHref}>
            <Phone size={18} />
            {phone}
          </a>
        ) : (
          <button className={styles.secondaryBtn} type="button" disabled>
            <Phone size={18} />
            {t("noPhone")}
          </button>
        )}
      </div>
    </div>
  );

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
            ← {t("backToList")}
          </Link>
        </div>

        <div className={styles.layout}>
          <section className={styles.left}>
            <div className={styles.mobileCards}>
              <div className={styles.heroCardWrap}>
                <div className={styles.heroCard}>
                  <div className={styles.heroTop}>
                    <div className={styles.heroMedia}>
                      <GalleryClient
                        title={service.title}
                        images={images}
                        highlighted={service.highlighted}
                      />

                      <div className={styles.categoryPillOnImage}>
                        {category !== "—" ? category : t("serviceFallback")}
                      </div>

                      {images.length > 1 && (
                        <div
                          style={{
                            position: "absolute",
                            right: 12,
                            bottom: 12,
                            zIndex: 3,
                            background: "rgba(2, 6, 23, 0.78)",
                            color: "#fff",
                            padding: "6px 10px",
                            borderRadius: 999,
                            fontSize: 13,
                            fontWeight: 800,
                            backdropFilter: "blur(6px)",
                          }}
                        >
                          {t("photosCount", { count: images.length })}
                        </div>
                      )}
                    </div>

                    <div className={styles.heroContent}>
                      <h1 className={styles.title}>{service.title}</h1>

                      <div className={styles.ratingRow}>
                        <span className={styles.ratingValue}>
                          ⭐ {ratingValue.toFixed(1)}
                        </span>
                        <span className={styles.ratingCount}>
                          ({ratingCount})
                        </span>
                      </div>

                      <div className={styles.metaRow}>
                        <span className={styles.metaChip}>
                          <MapPin size={16} />
                          {city}
                        </span>
                        <span className={styles.metaChip}>
                          <Folder size={16} />
                          {category}
                        </span>
                      </div>

                      <div className={styles.quickInfo}>
                        <Zap size={16} />
                        {t("respondsFast")}
                      </div>

                      {TabletInlineSeller}
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.mobileSeller}>{MobileSellerCompact}</div>

              <div className={styles.contentCardWrap}>
                <ServiceTabsClient
                  title={service.title}
                  description={service.description}
                  highlights={highlights}
                  images={images}
                />
              </div>

              <div className={styles.mobileBottomSeller}>
                {MobileBottomSellerCard}
              </div>
            </div>
          </section>

          <aside className={styles.right}>
            <div className={styles.desktopSeller}>{SellerCard}</div>
          </aside>
        </div>
      </div>
    </main>
  );
}