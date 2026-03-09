// src/components/cards/PremiumServiceCard.tsx
import Image from "next/image";
import Link from "next/link";
import { Star, MapPin, CalendarDays, ShieldCheck } from "lucide-react";
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
}

function formatPriceNOK(value: number) {
  return new Intl.NumberFormat("nb-NO").format(value);
}

function formatTodayLikeCard() {
  return new Intl.DateTimeFormat("lt-LT", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
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
}: PremiumServiceCardProps) {
  const hasUserImage = Boolean(imageUrl && imageUrl.trim().length > 0);
  const defaultCenterImg = "/logo.webp";

  const serviceHref = `/${locale}/services/${slug}`;
  const contactHref = `/${locale}/services/${slug}#kontaktai`;

  const formattedPrice =
    priceFrom != null
      ? `nuo ${formatPriceNOK(priceFrom)} NOK`
      : "Kaina sutartinė";

  const ratingValue = highlighted ? 5.0 : 4.9;

  return (
    <div className={styles.cardContainer} data-id={id}>
      <div className={styles.card}>
        <Link
          href={serviceHref}
          className={styles.cardLinkOverlay}
          aria-label={`Atidaryti paslaugą: ${title}`}
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
              TOP
            </div>
          )}
        </div>

        <div className={styles.body}>
          <div className={styles.topRow}>
            <span className={styles.category}>{category || "Kategorija"}</span>

            <span className={styles.rating}>
              <Star className={styles.ratingIcon} />
              {ratingValue.toFixed(1)}
            </span>
          </div>

          <h3 className={styles.title}>{title}</h3>

          <div className={styles.infoRow}>
            <span className={styles.infoItem}>
              <MapPin className={styles.infoIcon} />
              {city || "—"}
            </span>

            <span className={styles.infoItem}>
              <CalendarDays className={styles.infoIcon} />
              {formatTodayLikeCard()}
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
                Susisiekti
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}