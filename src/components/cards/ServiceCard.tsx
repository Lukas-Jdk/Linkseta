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

function formatTodayLikeCard() {
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

  const priceValue =
    priceFrom != null ? `nuo ${formatPriceNOK(priceFrom)} NOK` : "Kaina sutartinė";

  const defaultArt = "/logo.webp";

  // kol nera realaus ratingo sistemos – paliekam demo
  const ratingValue = 4.9;

  return (
    <Link href={`/${locale}/services/${slug}`} className={styles.card}>
      <div className={styles.imageWrap}>
        {hasCover ? (
          <Image
            src={imageUrl as string}
            alt={title}
            fill
            className={styles.image}
            sizes="(max-width: 768px) 100vw, 420px"
            priority={highlighted}
          />
        ) : (
          <>
            <div className={styles.heroBg} />
            <div className={styles.centerArt}>
              <Image
                src={defaultArt}
                alt=""
                width={180}
                height={180}
                className={styles.centerArtImg}
                priority={highlighted}
              />
            </div>
          </>
        )}

        <div className={styles.imageShade} />

        {priceFrom != null && (
          <div className={styles.priceBadge}>{priceValue}</div>
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
          <span className={styles.cta}>
            Žiūrėti
          </span>
        </div>
      </div>
    </Link>
  );
}