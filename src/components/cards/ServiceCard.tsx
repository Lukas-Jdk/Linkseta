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

function formatPriceNOK(value: number) {
  return new Intl.NumberFormat("nb-NO").format(value);
}

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
  const hasCover = Boolean(imageUrl && imageUrl.trim().length > 0);

  const priceLabel = priceFrom != null ? "Kaina nuo" : "Kaina";
  const priceValue =
    priceFrom != null ? `${formatPriceNOK(priceFrom)} NOK` : "Kaina sutartinė";

  // 👇 default “center art” kai nėra cover nuotraukos
  // įdėk į public/ tokį failą (arba pakeisk pavadinimą)
  const defaultArt = "/logo.webp";

  return (
    <Link href={`/services/${slug}`} className={styles.card}>
      {/* TOP HALF */}
      <div className={styles.imageWrap}>
        {hasCover ? (
          <>
            <Image
              src={imageUrl as string}
              alt={title}
              fill
              className={styles.image}
              sizes="(max-width: 768px) 100vw, 420px"
              priority={highlighted}
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
                width={200}
                height={200}
                className={styles.centerArtImg}
                priority={highlighted}
              />
            </div>
          </>
        )}

        {highlighted && (
          <div className={styles.topBadge}>
            <Star className={styles.topIcon} />
            TOP
          </div>
        )}
      </div>

      {/* BOTTOM HALF */}
      <div className={styles.body}>
        <div className={styles.metaRow}>
          <span className={styles.category} title={category || ""}>
            {category || "—"}
          </span>

          <span className={styles.location}>
            <MapPin className={styles.pin} />
            <span className={styles.locationText}>{city || "—"}</span>
          </span>
        </div>

        <h3 className={styles.title}>{title}</h3>
        <p className={styles.desc}>{description}</p>

        <div className={styles.footer}>
          <div className={styles.priceContainer}>
            <span className={styles.priceLabel}>{priceLabel}</span>
            <span className={styles.priceValue} title={priceValue}>
              {priceValue}
            </span>
          </div>

          <span className={styles.cta}>Žiūrėti</span>
        </div>
      </div>
    </Link>
  );
}
