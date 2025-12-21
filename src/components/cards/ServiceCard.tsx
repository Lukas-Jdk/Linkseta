// src/components/cards/ServiceCard.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import styles from "./ServiceCard.module.css";
import { MapPin, Star } from "lucide-react";

type Props = {
  title: string;
  description: string;
  city: string;
  category: string;
  priceFrom: number | null;
  slug: string;
  highlighted?: boolean;
  imageUrl?: string;
};

export default function ServiceCard({
  title,
  description,
  city,
  category,
  priceFrom,
  slug,
  highlighted = false,
  imageUrl,
}: Props) {
  const displayPrice = priceFrom != null ? `${priceFrom} NOK` : "Kaina sutartinė";
  const cover = imageUrl || "/default-service.webp";

  return (
    <Link href={`/services/${slug}`} className={styles.card}>
      <div className={styles.imageWrap}>
        <Image
          src={cover}
          alt={title}
          fill
          className={styles.image}
          sizes="(max-width: 768px) 100vw, 420px"
        />
        {highlighted && (
          <div className={styles.topBadge}>
            <Star className={styles.topIcon} />
            TOP
          </div>
        )}
      </div>

      <div className={styles.body}>
        <div className={styles.metaRow}>
          <span className={styles.category}>{category || "—"}</span>
          <span className={styles.location}>
            <MapPin className={styles.pin} />
            {city || "—"}
          </span>
        </div>

        <h3 className={styles.title}>{title}</h3>
        <p className={styles.desc}>{description}</p>

        <div className={styles.footer}>
          <span className={styles.priceLabel}>Kaina nuo</span>
          <span className={styles.priceValue}>{displayPrice}</span>
        </div>
      </div>
    </Link>
  );
}
