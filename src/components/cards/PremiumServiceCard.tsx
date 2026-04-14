// src/components/cards/PremiumServiceCard.tsx
import Image from "next/image";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { MapPin, CalendarDays, ShieldCheck } from "lucide-react";
import styles from "./PremiumServiceCard.module.css";

export interface PremiumServiceCardProps {
  id: string;
  title: string;
  description: string;
  city: string;
  category: string;
  priceFrom: number | null;
  slug: string;
  highlighted?: boolean;
  imageUrl?: string;
  locale: string;
  locationPostcode?: string;
  locationCity?: string;
  locationRegion?: string;
}

function formatPriceNOK(value: number) {
  return new Intl.NumberFormat("nb-NO").format(value);
}

function formatTodayLikeCard(locale: string) {
  const map: Record<string, string> = {
    lt: "lt-LT",
    en: "en-GB",
    no: "nb-NO",
  };

  return new Intl.DateTimeFormat(map[locale] ?? "lt-LT", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatLocationLabel(args: {
  locationPostcode?: string;
  locationCity?: string;
  locationRegion?: string;
  fallbackCity?: string;
}) {
  const postcode = args.locationPostcode?.trim() ?? "";
  const city = args.locationCity?.trim() ?? "";
  const region = args.locationRegion?.trim() ?? "";
  const fallbackCity = args.fallbackCity?.trim() ?? "";

  const primary = [postcode, city].filter(Boolean).join(" ");
  const withRegion = [primary, region].filter(Boolean).join(", ");

  if (withRegion) return withRegion;
  if (primary) return primary;
  if (city) return city;
  if (fallbackCity) return fallbackCity;

  return "—";
}

export default function PremiumServiceCard({
  id,
  title,
  city,
  category,
  priceFrom,
  slug,
  highlighted = false,
  imageUrl,
  locale,
  locationPostcode,
  locationCity,
  locationRegion,
}: PremiumServiceCardProps) {
  const t = useTranslations("serviceCard");
  const currentLocale = useLocale();

  const hasUserImage = Boolean(imageUrl && imageUrl.trim().length > 0);
  const defaultCenterImg = "/logo.webp";

  const serviceHref = `/${locale}/services/${slug}`;
  const contactHref = `/${locale}/services/${slug}#kontaktai`;

  const formattedPrice =
    priceFrom != null
      ? t("priceFrom", { price: formatPriceNOK(priceFrom) })
      : t("priceNegotiable");

  const locationLabel = formatLocationLabel({
    locationPostcode,
    locationCity,
    locationRegion,
    fallbackCity: city,
  });

  return (
    <div className={styles.cardContainer} data-id={id}>
      <div className={styles.card}>
        <Link
          href={serviceHref}
          className={styles.cardLinkOverlay}
          aria-label={t("openServiceAria", { title })}
        />

        <div className={styles.imageWrap} aria-hidden="true">
          {hasUserImage ? (
            <>
              <Image
                src={imageUrl as string}
                alt={title}
                fill
                sizes="(max-width: 768px) 100vw, 600px"
                className={styles.coverImage}
                priority={highlighted}
              />
              <div className={styles.imageShade} />
            </>
          ) : (
            <>
              <div className={styles.heroBg} />
              <div className={styles.heroShine} />
              <div className={styles.heroNoise} />
              <div className={styles.centerArt}>
                <Image
                  src={defaultCenterImg}
                  alt=""
                  width={200}
                  height={200}
                  className={styles.centerArtImg}
                  priority={false}
                />
              </div>
            </>
          )}

          {priceFrom != null && (
            <div className={styles.priceBadge}>{formattedPrice}</div>
          )}

          {highlighted && (
            <div className={styles.topBadge}>
              <ShieldCheck className={styles.topBadgeIcon} />
              {t("top")}
            </div>
          )}
        </div>

        <div className={styles.body}>
          <div className={styles.topRow}>
            <span className={styles.category}>
              {category || t("categoryFallback")}
            </span>
          </div>

          <h3 className={styles.title}>{title}</h3>

          <div className={styles.infoRow}>
            <span className={styles.infoItem}>
              <MapPin className={styles.infoIcon} />
              {locationLabel}
            </span>

            <span className={styles.infoItem}>
              <CalendarDays className={styles.infoIcon} />
              {formatTodayLikeCard(currentLocale)}
            </span>
          </div>

          <div className={styles.footer}>
            <div className={styles.buttonWrap}>
              <Link
                href={contactHref}
                className={`${styles.contactButton} ${
                  highlighted
                    ? styles.contactButtonPremium
                    : styles.contactButtonStandard
                }`}
              >
                {t("contact")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}