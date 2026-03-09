// src/components/cards/ServiceCard.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import styles from "./ServiceCard.module.css";
import { MapPin, Star, CalendarDays } from "lucide-react";

type Props = {
  title: string;
  description: string;
  city: string;
  category: string;
  priceFrom: number | null;
  slug: string;
  highlighted?: boolean;
  imageUrl?: string;
  locale: string;
};

function formatPriceNOK(value: number) {
  return new Intl.NumberFormat("nb-NO").format(value);
}

function formatCardDate() {
  return new Intl.DateTimeFormat("lt-LT", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default function ServiceCard({
  title,
  city,
  category,
  priceFrom,
  slug,
  highlighted = false,
  imageUrl,
  locale,
}: Props) {
  const hasCover = Boolean(imageUrl && imageUrl.trim().length > 0);
  const defaultArt = "/logo.webp";

  const priceValue =
    priceFrom != null ? `nuo ${formatPriceNOK(priceFrom)} NOK` : "Kaina sutartinė";

  const ratingValue = highlighted ? 5.0 : 4.9;

  return (
    <Link href={`/${locale}/services/${slug}`} className={styles.card}>
      <div className={styles.imageWrap}>
        {hasCover ? (
          <>
            <Image
              src={imageUrl as string}
              alt={title}
              fill
              className={styles.image}
              sizes="(max-width: 640px) 92vw, (max-width: 1024px) 48vw, 380px"
            />
            <div className={styles.imageOverlay} />
          </>
        ) : (
          <>
            <div className={styles.heroBg} />
            <div className={styles.imageOverlay} />
            <div className={styles.centerArt}>
              <Image
                src={defaultArt}
                alt=""
                width={180}
                height={180}
                className={styles.centerArtImg}
              />
            </div>
          </>
        )}

        {priceFrom != null && (
          <div className={styles.priceBadge}>{priceValue}</div>
        )}

        {highlighted && (
          <div className={styles.topBadge}>
            <Star className={styles.topIcon} />
            TOP
          </div>
        )}
      </div>

      <div className={styles.body}>
        <div className={styles.topRow}>
          <span className={styles.category} title={category || ""}>
            {category || "Kategorija"}
          </span>

          <span className={styles.rating}>
            <Star className={styles.ratingIcon} />
            {ratingValue.toFixed(1)}
          </span>
        </div>

        <h3 className={styles.title}>{title}</h3>

        <div className={styles.infoRow}>
          <span className={styles.infoItem}>
            <MapPin className={styles.infoIcon} />
            <span className={styles.infoText}>{city || "—"}</span>
          </span>

          <span className={styles.infoItem}>
            <CalendarDays className={styles.infoIcon} />
            <span className={styles.infoText}>{formatCardDate()}</span>
          </span>
        </div>

        <div className={styles.footer}>
          <span className={styles.cta}>Susisiekti</span>
        </div>
      </div>
    </Link>
  );
}