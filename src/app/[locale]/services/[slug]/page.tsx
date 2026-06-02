// src/app/[locale]/services/[slug]/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/seo";
import ServiceGallery from "./ServiceGallery";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { absOg, localeAlternates } from "@/lib/seo-i18n";
import { hasPremiumAccess } from "@/lib/planAccess";
import StartConversationButton from "./StartConversationButton";
import ReviewForm from "./ReviewForm";
import InteractionLink from "./InteractionLink";
import InteractionViewTracker from "./InteractionViewTracker";
import {
  Award,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  Images,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Star,
  Zap,
} from "lucide-react";
import styles from "./slugPage.module.css";

export const revalidate = 120;

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

type WorkingHourRow = {
  label: string;
  value: string;
};

type ApprovedReview = {
  id: string;
  rating: number;
  weight: number;
  name: string;
  comment: string | null;
  createdAt: Date;
  user?: {
    avatarUrl: string | null;
  };
};

function stripHtml(input: string) {
  return input
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(input: string, max = 160) {
  const s = input.trim();
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "…";
}

function initialLetter(name: string | null, email: string) {
  const src = name?.trim() ? name.trim() : email;
  return src.slice(0, 1).toUpperCase() || "U";
}

function isSafeAvatarUrl(url: string | null | undefined) {
  if (!url) return false;
  const s = url.trim();
  return (
    s.startsWith("http://") || s.startsWith("https://") || s.startsWith("/")
  );
}

function normalizePhoneHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

function pickLocalizedValue(
  locale: string,
  base: string,
  en?: string | null,
  no?: string | null,
) {
  if (locale === "en") return en?.trim() || base;
  if (locale === "no") return no?.trim() || base;
  return base;
}

function pickLocalizedOptional(
  locale: string,
  base?: string | null,
  en?: string | null,
  no?: string | null,
) {
  if (locale === "en") return en?.trim() || base?.trim() || "";
  if (locale === "no") return no?.trim() || base?.trim() || "";
  return base?.trim() || "";
}

function pickLocalizedArray(
  locale: string,
  base: string[],
  en?: string[] | null,
  no?: string[] | null,
) {
  if (locale === "en" && Array.isArray(en) && en.length > 0) return en;
  if (locale === "no" && Array.isArray(no) && no.length > 0) return no;
  return base;
}

function formatServiceLocation(args: {
  locationPostcode?: string | null;
  locationCity?: string | null;
  locationRegion?: string | null;
  cityName?: string | null;
  cityPostcode?: string | null;
}) {
  const postcode = args.locationPostcode?.trim() ?? "";
  const city = args.locationCity?.trim() ?? "";
  const region = args.locationRegion?.trim() ?? "";

  if (postcode && city && region) return `${postcode} ${city}, ${region}`;
  if (postcode && city) return `${postcode} ${city}`;
  if (city && region) return `${city}, ${region}`;
  if (city) return city;
  if (postcode) return postcode;
  if (region) return region;

  const fallbackCity = args.cityName?.trim() ?? "";
  const fallbackPostcode = args.cityPostcode?.trim() ?? "";

  if (fallbackPostcode && fallbackCity)
    return `${fallbackPostcode} ${fallbackCity}`;
  if (fallbackCity) return fallbackCity;

  return "—";
}

type ServiceDetailsText = {
  home: string;
  services: string;
  topRated: string;
  activeProvider: string;
  availableNow: string;
  response1h: string;
  response24h: string;
  response48h: string;
  chat: string;
  chatLoading: string;
  call: string;
  email: string;
  noPhone: string;
  whatIDo: string;
  gallery: string;
  viewAllPhotos: string;
  aboutMe: string;
  reviews: string;
  workTime: string;
  experience: string;
  projects: string;
  replyFast: string;
  trusted: string;
  noBlocks: string;
  noGallery: string;
  noReviews: string;
  photoCount: string;
  reviewCount: string;
  urgent: string;
  weekdays: string;
  saturday: string;
  sunday: string;
  showAllReviews: string;
};

function getResponseTimeLabel(
  text: ServiceDetailsText,
  responseTime?: string | null,
) {
  if (responseTime === "24h") return text.response24h;
  if (responseTime === "48h") return text.response48h;
  return text.response1h;
}

function parseWorkingHours(
  value: unknown,
  text: ServiceDetailsText,
): WorkingHourRow[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [];
  }

  const data = value as Record<string, unknown>;

  const labels: Record<string, string> = {
    weekdays: text.weekdays,
    saturday: text.saturday,
    sunday: text.sunday,
  };

  return ["weekdays", "saturday", "sunday"]
    .map((key) => {
      const raw = data[key];

      if (typeof raw !== "string") return null;

      const clean = raw.trim();
      if (!clean) return null;

      return {
        label: labels[key] ?? key,
        value: clean,
      };
    })
    .filter(Boolean) as WorkingHourRow[];
}

function formatRating(value: number) {
  return value.toFixed(1).replace(".", ",");
}

function formatReviewDate(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function reviewInitial(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "U";
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
      titleEn: true,
      titleNo: true,
      description: true,
      descriptionEn: true,
      descriptionNo: true,
      imageUrl: true,
      isActive: true,
      deletedAt: true,
    },
  });

  if (!service || !service.isActive || service.deletedAt) {
    return { robots: { index: false, follow: false } };
  }

  const localizedTitle = pickLocalizedValue(
    locale,
    service.title,
    service.titleEn,
    service.titleNo,
  );

  const localizedDescription = pickLocalizedValue(
    locale,
    service.description || t("metaFallbackDescription"),
    service.descriptionEn,
    service.descriptionNo,
  );

  const title = `${localizedTitle} | ${tMeta("siteName")}`;
  const description = truncate(stripHtml(localizedDescription), 160);
  const canonical = `${siteUrl}/${locale}/services/${slug}`;

  const ogImage =
    service.imageUrl && service.imageUrl.startsWith("http")
      ? service.imageUrl
      : absOg("/og-v2.png");

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
      images: [{ url: ogImage, width: 1200, height: 630, alt: localizedTitle }],
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

  const text: ServiceDetailsText = {
    home: t("home"),
    services: t("services"),
    topRated: t("topRated"),
    activeProvider: t("activeProvider"),
    availableNow: t("availableNow"),
    response1h: t("response1h"),
    response24h: t("response24h"),
    response48h: t("response48h"),
    chat: t("chat"),
    chatLoading: t("chatLoading"),
    call: t("call"),
    email: t("email"),
    noPhone: t("noPhone"),
    whatIDo: t("whatIDo"),
    gallery: t("gallery"),
    viewAllPhotos: t("viewAllPhotos"),
    aboutMe: t("aboutMe"),
    reviews: t("reviews"),
    workTime: t("workTime"),
    experience: t("experience"),
    projects: t("projects"),
    replyFast: t("replyFast"),
    trusted: t("trusted"),
    noBlocks: t("noBlocks"),
    noGallery: t("noGallery"),
    noReviews: t("noReviews"),
    photoCount: t("photoCount"),
    reviewCount: t("reviewCount"),
    urgent: t("urgent"),
    weekdays: t("weekdays"),
    saturday: t("saturday"),
    sunday: t("sunday"),
    showAllReviews: t("showAllReviews"),
  };

  const service = await prisma.serviceListing.findFirst({
    where: {
      slug,
      isActive: true,
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
      titleEn: true,
      titleNo: true,
      description: true,
      descriptionEn: true,
      descriptionNo: true,
      slug: true,
      responseTime: true,
      highlighted: true,
      highlights: true,
      highlightsEn: true,
      highlightsNo: true,
      imageUrl: true,
      galleryImageUrls: true,

      brandLogoUrl: true,
      locationPostcode: true,
      locationCity: true,
      locationRegion: true,

      reviews: {
        where: {
          isApproved: true,
          isVisible: true,
        },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true,
          rating: true,
          weight: true,
          name: true,
          comment: true,
          createdAt: true,
          user: {
            select: {
              avatarUrl: true,
            },
          },
        },
      },

      blocks: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          title: true,
          titleEn: true,
          titleNo: true,
          description: true,
          descriptionEn: true,
          descriptionNo: true,
          priceText: true,
          priceTextEn: true,
          priceTextNo: true,
          iconKey: true,
          images: {
            orderBy: { sortOrder: "asc" },
            select: {
              url: true,
              altText: true,
            },
          },
        },
      },

      city: {
        select: {
          name: true,
          postcode: true,
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
              companyName: true,
              about: true,
              aboutEn: true,
              aboutNo: true,
              experienceYears: true,
              completedProjects: true,
              workingHours: true,
              lifetimeFree: true,
              trialEndsAt: true,
              stripeSubscriptionId: true,
              subscriptionStatus: true,
              plan: {
                select: {
                  slug: true,
                  isTrial: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!service) notFound();

  const canUseChat = hasPremiumAccess(service.user.profile);

  const gallery = Array.isArray(service.galleryImageUrls)
    ? service.galleryImageUrls.filter(Boolean)
    : [];

  const images =
    gallery.length > 0
      ? gallery
      : service.imageUrl
        ? [service.imageUrl]
        : ["/default.webp"];

  const heroImage = images[0] ?? "/default.webp";

  const city = formatServiceLocation({
    locationPostcode: service.locationPostcode,
    locationCity: service.locationCity,
    locationRegion: service.locationRegion,
    cityName: service.city?.name,
    cityPostcode: service.city?.postcode,
  });

  let category = service.category?.name ?? "—";
  if (service.category?.slug) {
    try {
      category = tCategories(service.category.slug);
    } catch {
      category = service.category.name ?? service.category.slug;
    }
  }

  const localizedTitle = pickLocalizedValue(
    locale,
    service.title,
    service.titleEn,
    service.titleNo,
  );

  const localizedDescription = pickLocalizedValue(
    locale,
    service.description,
    service.descriptionEn,
    service.descriptionNo,
  );

  const localizedProviderAbout = pickLocalizedOptional(
    locale,
    service.user.profile?.about,
    service.user.profile?.aboutEn,
    service.user.profile?.aboutNo,
  );

  const normalizedAbout = localizedProviderAbout?.trim() ?? "";

  const aboutText =
    normalizedAbout && normalizedAbout !== localizedDescription.trim()
      ? normalizedAbout
      : localizedDescription;

  const localizedHighlights = pickLocalizedArray(
    locale,
    Array.isArray(service.highlights) ? service.highlights : [],
    service.highlightsEn,
    service.highlightsNo,
  );

  const localizedBlocks = (service.blocks ?? []).map((block) => ({
    id: block.id,
    title: pickLocalizedValue(
      locale,
      block.title,
      block.titleEn,
      block.titleNo,
    ),
    description: pickLocalizedValue(
      locale,
      block.description ?? "",
      block.descriptionEn,
      block.descriptionNo,
    ),
    priceText: pickLocalizedOptional(
      locale,
      block.priceText,
      block.priceTextEn,
      block.priceTextNo,
    ),
    iconKey: block.iconKey,
    images: (block.images ?? []).map((img) => ({
      url: img.url,
      altText: img.altText,
    })),
  }));

  const sellerName =
    service.user.name?.trim() || service.user.email.split("@")[0];

  const sellerInitial = initialLetter(sellerName, service.user.email);
  const isVerified = Boolean(service.user.profile?.isApproved);

  const sellerAvatarUrl = isSafeAvatarUrl(service.user.avatarUrl)
    ? String(service.user.avatarUrl).trim()
    : null;

  const displayBrandLogoUrl = isSafeAvatarUrl(service.brandLogoUrl)
    ? String(service.brandLogoUrl).trim()
    : null;

  const phoneRaw = service.user.phone ? String(service.user.phone).trim() : "";
  const phone = phoneRaw || null;
  const telHref = phone ? normalizePhoneHref(phone) : null;

  const emailHref = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
    service.user.email,
  )}&su=${encodeURIComponent(
    t("emailSubject", { title: localizedTitle }),
  )}&body=${encodeURIComponent(t("emailBody", { title: localizedTitle }))}`;

  const responseTimeLabel = getResponseTimeLabel(text, service.responseTime);

  const workingHours: WorkingHourRow[] = parseWorkingHours(
    service.user.profile?.workingHours,
    text,
  );

  const approvedReviews: ApprovedReview[] =
    (service.reviews as ApprovedReview[]) ?? [];

  const reviewCount = approvedReviews.length;

  const totalReviewWeight = approvedReviews.reduce(
    (sum, review) => sum + (review.weight ?? 1),
    0,
  );

  const averageRating =
    reviewCount > 0 && totalReviewWeight > 0
      ? approvedReviews.reduce(
          (sum, review) => sum + review.rating * (review.weight ?? 1),
          0,
        ) / totalReviewWeight
      : null;

  const shouldShowRating = reviewCount >= 5 && averageRating != null;

  const ratingBreakdown = [5, 4, 3, 2, 1].map((star) => {
    const count = approvedReviews.filter(
      (review) => review.rating === star,
    ).length;

    const percent =
      reviewCount > 0 ? Math.round((count / reviewCount) * 100) : 0;

    return {
      star,
      count,
      percent,
    };
  });

  const experienceYears = service.user.profile?.experienceYears ?? null;
  const completedProjects = service.user.profile?.completedProjects ?? null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: localizedTitle,
    description: localizedDescription,
    areaServed: {
      "@type": "AdministrativeArea",
      name: city !== "—" ? city : "Norway",
    },
    url: `${siteUrl}/${locale}/services/${service.slug}`,
    ...(shouldShowRating
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: averageRating?.toFixed(1),
            reviewCount,
          },
        }
      : {}),
  };

  return (
    <main className={styles.page}>
      <InteractionViewTracker serviceId={service.id} />
      <div className="container">
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <nav className={styles.breadcrumbs} aria-label="Breadcrumbs">
          <Link href={`/${locale}`}>{text.home}</Link>
          <span>›</span>
          <Link href={`/${locale}/services`}>{text.services}</Link>
          <span>›</span>
          <span>{category !== "—" ? category : localizedTitle}</span>
        </nav>

        <section className={styles.heroShell}>
          <div className={styles.heroImageCol}>
            <div className={styles.heroImageWrap}>
              <Image
                src={heroImage}
                alt={localizedTitle}
                fill
                priority
                sizes="(max-width: 900px) 100vw, 360px"
                className={styles.heroImage}
              />

              {displayBrandLogoUrl && (
                <div className={styles.brandOverlay}>
                  <div className={styles.brandLogo}>
                    <Image
                      src={displayBrandLogoUrl}
                      alt="Logo"
                      fill
                      sizes="72px"
                      className={styles.brandLogoImg}
                    />
                  </div>
                </div>
              )}

              {images.length > 1 && (
                <div className={styles.photoBadge}>
                  <Images size={15} />
                  {images.length} {text.photoCount}
                </div>
              )}
            </div>
          </div>

          <div className={styles.heroInfo}>
            {service.highlighted && (
              <div className={styles.topRatedBadge}>
                <Star size={14} />
                {text.topRated}
              </div>
            )}

            <h1 className={styles.heroTitle}>{localizedTitle}</h1>

            <div className={styles.ratingLine}>
              {shouldShowRating && (
                <>
                  <span className={styles.stars}>★</span>
                  <strong>{formatRating(averageRating)}</strong>
                  <span>
                    ({reviewCount} {text.reviewCount})
                  </span>
                  <span className={styles.dotSep}>|</span>
                </>
              )}

              <MapPin size={16} />
              <span>{city}</span>
            </div>

            <p className={styles.heroDescription}>{localizedDescription}</p>

            <div className={styles.trustGrid}>
              {localizedHighlights.slice(0, 4).map((item, index) => (
                <div key={`${item}-${index}`} className={styles.trustItem}>
                  <CheckCircle2 size={16} />
                  <span>{item}</span>
                </div>
              ))}

              {localizedHighlights.length === 0 && isVerified && (
                <div className={styles.trustItem}>
                  <ShieldCheck size={16} />
                  <span>{text.activeProvider}</span>
                </div>
              )}

              {localizedHighlights.length === 0 && (
                <div className={styles.trustItem}>
                  <Clock3 size={16} />
                  <span>{responseTimeLabel}</span>
                </div>
              )}
            </div>
          </div>

          <aside className={styles.providerCard}>
            <div className={styles.providerAvatarWrap}>
              <div className={styles.providerAvatar}>
                {sellerAvatarUrl ? (
                  <Image
                    src={sellerAvatarUrl}
                    alt=""
                    fill
                    sizes="88px"
                    className={styles.providerAvatarImg}
                  />
                ) : (
                  sellerInitial
                )}
              </div>
              <span className={styles.onlineDot} />
            </div>

            <div className={styles.providerName}>{sellerName}</div>

            <div className={styles.providerActions}>
              {canUseChat && (
                <div className={styles.providerChatAction}>
                  <StartConversationButton
                    serviceId={service.id}
                    label="Chat"
                    loadingLabel={text.chatLoading}
                  />
                </div>
              )}

              {telHref ? (
                <InteractionLink
                  className={styles.providerActionButton}
                  href={telHref}
                  serviceId={service.id}
                  type="PHONE"
                >
                  <Phone size={17} />
                  <span>{text.call}</span>
                </InteractionLink>
              ) : (
                <button
                  className={styles.providerActionButton}
                  type="button"
                  disabled
                >
                  <Phone size={17} />
                  <span>{text.noPhone}</span>
                </button>
              )}

              <InteractionLink
                className={styles.providerActionButton}
                href={emailHref}
                target="_blank"
                rel="noopener noreferrer"
                serviceId={service.id}
                type="EMAIL"
              >
                <Mail size={17} />
                <span>{text.email}</span>
              </InteractionLink>
            </div>
          </aside>
        </section>

        <section className={styles.mainCard}>
          {localizedBlocks.some((block) => block.images.length > 0) ? (
            <ServiceGallery blocks={localizedBlocks} />
          ) : (
            <p className={styles.emptyText}>{text.noGallery}</p>
          )}
        </section>

        <section className={styles.bottomGrid}>
          <div className={styles.bottomTopGrid}>
            <div className={styles.infoPanel}>
              <h2>{text.aboutMe}</h2>
              <p>{aboutText}</p>

              <div className={styles.statsGrid}>
                {typeof experienceYears === "number" && experienceYears > 0 && (
                  <div>
                    <Award size={18} />
                    <strong>{experienceYears}+</strong>
                    <span>{text.experience}</span>
                  </div>
                )}

                {typeof completedProjects === "number" &&
                  completedProjects > 0 && (
                    <div>
                      <BriefcaseBusiness size={18} />
                      <strong>{completedProjects}+</strong>
                      <span>{text.projects}</span>
                    </div>
                  )}

                <div>
                  <MessageCircle size={18} />
                  <strong>{service.responseTime ?? "1h"}</strong>
                  <span>{text.replyFast}</span>
                </div>

                {isVerified && (
                  <div>
                    <ShieldCheck size={18} />
                    <strong>✓</strong>
                    <span>{text.trusted}</span>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.infoPanel}>
              <div className={styles.panelTop}>
                <h2>{text.reviews}</h2>
              </div>

              {approvedReviews.length > 0 ? (
                <>
                  {shouldShowRating && (
                    <div className={styles.reviewSummary}>
                      <div className={styles.reviewSummaryLeft}>
                        <div className={styles.reviewSummaryRatingBig}>
                          {formatRating(averageRating)}
                        </div>

                        <div className={styles.reviewSummaryStarsBig}>
                          ★★★★★
                        </div>

                        <div className={styles.reviewSummaryText}>
                          {t("basedOnReviews", { count: reviewCount })}
                        </div>
                      </div>

                      <div className={styles.reviewBars}>
                        {ratingBreakdown.map((row) => (
                          <div key={row.star} className={styles.reviewBarRow}>
                            <span className={styles.reviewBarLabel}>
                              {row.star} ★
                            </span>

                            <div className={styles.reviewBarTrack}>
                              <div
                                className={styles.reviewBarFill}
                                style={{
                                  width: `${row.percent}%`,
                                }}
                              />
                            </div>

                            <span className={styles.reviewBarPercent}>
                              {row.percent}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!shouldShowRating && (
                    <p className={styles.emptyText}>
                      {reviewCount} {text.reviewCount}
                    </p>
                  )}

                  <div className={styles.reviewGrid}>
                    {approvedReviews
                      .slice(0, 2)
                      .map((review: ApprovedReview) => {
                        const avatarUrl = isSafeAvatarUrl(
                          review.user?.avatarUrl,
                        )
                          ? String(review.user?.avatarUrl).trim()
                          : null;

                        return (
                          <div key={review.id} className={styles.reviewCard}>
                            <div className={styles.reviewCardTop}>
                              <div className={styles.reviewAvatar}>
                                {avatarUrl ? (
                                  <Image
                                    src={avatarUrl}
                                    alt=""
                                    fill
                                    sizes="44px"
                                    className={styles.reviewAvatarImg}
                                  />
                                ) : (
                                  reviewInitial(review.name)
                                )}
                              </div>

                              <div className={styles.reviewMeta}>
                                <strong>{review.name}</strong>
                                <span>
                                  {formatReviewDate(review.createdAt, locale)}
                                </span>
                              </div>
                            </div>

                            <div className={styles.reviewStars}>
                              {"★".repeat(
                                Math.max(1, Math.min(5, review.rating)),
                              )}
                              {"☆".repeat(
                                5 - Math.max(1, Math.min(5, review.rating)),
                              )}
                            </div>

                            <p>{review.comment || text.noReviews}</p>
                          </div>
                        );
                      })}
                  </div>

                  {approvedReviews.length > 2 && (
                    <details className={styles.moreReviews}>
                      <summary>{text.showAllReviews} →</summary>

                      <div className={styles.reviewGrid}>
                        {approvedReviews
                          .slice(2)
                          .map((review: ApprovedReview) => {
                            const avatarUrl = isSafeAvatarUrl(
                              review.user?.avatarUrl,
                            )
                              ? String(review.user?.avatarUrl).trim()
                              : null;

                            return (
                              <div
                                key={review.id}
                                className={styles.reviewCard}
                              >
                                <div className={styles.reviewCardTop}>
                                  <div className={styles.reviewAvatar}>
                                    {avatarUrl ? (
                                      <Image
                                        src={avatarUrl}
                                        alt=""
                                        fill
                                        sizes="44px"
                                        className={styles.reviewAvatarImg}
                                      />
                                    ) : (
                                      reviewInitial(review.name)
                                    )}
                                  </div>

                                  <div className={styles.reviewMeta}>
                                    <strong>{review.name}</strong>
                                    <span>
                                      {formatReviewDate(
                                        review.createdAt,
                                        locale,
                                      )}
                                    </span>
                                  </div>
                                </div>

                                <div className={styles.reviewStars}>
                                  {"★".repeat(
                                    Math.max(1, Math.min(5, review.rating)),
                                  )}
                                  {"☆".repeat(
                                    5 - Math.max(1, Math.min(5, review.rating)),
                                  )}
                                </div>

                                <p>{review.comment || text.noReviews}</p>
                              </div>
                            );
                          })}
                      </div>
                    </details>
                  )}
                </>
              ) : (
                <p className={styles.emptyText}>{text.noReviews}</p>
              )}

              <ReviewForm serviceId={service.id} />
            </div>
          </div>

          {workingHours.length > 0 && (
            <div className={styles.infoPanel}>
              <h2>{text.workTime}</h2>

              <div className={styles.workRows}>
                {workingHours.map((row) => (
                  <div key={row.label}>
                    <span>{row.label}</span>
                    <strong>{row.value}</strong>
                  </div>
                ))}
              </div>

              <div className={styles.urgentLine}>
                <Zap size={16} />
                {text.urgent}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
