// src/components/cards/PremiumServiceCard.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Star, MapPin, ShieldCheck } from "lucide-react";
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
}

export default function PremiumServiceCard({
  id,
  title,
  description,
  city,
  category,
  priceFrom,
  slug,
  highlighted = false,
  imageUrl,
}: PremiumServiceCardProps) {
  const formattedPrice =
    priceFrom != null
      ? `${new Intl.NumberFormat("nb-NO").format(priceFrom)} NOK`
      : "Kaina sutartinė";

  const hasUserImage = Boolean(imageUrl && imageUrl.trim().length > 0);
  const defaultCenterImg = "/logo.webp";

  const serviceHref = `/services/${slug}`;
  const contactHref = `/services/${slug}#kontaktai`;

  return (
    <div className={styles.cardContainer} data-id={id}>
      <div className={styles.card}>
       
        <Link
          href={serviceHref}
          className={styles.cardLinkOverlay}
          aria-label={`Atidaryti paslaugą: ${title}`}
        />

        {/* Background */}
        <div className={styles.backgroundContainer} aria-hidden="true">
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
              <div className={styles.coverOverlay} />
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
                  width={220}
                  height={220}
                  className={styles.centerArtImg}
                  priority={false}
                />
              </div>
            </>
          )}

          {highlighted && <div className={styles.premiumGlow} />}
        </div>

        {/* Content */}
        <div className={styles.content}>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.badges}>
              <span className={styles.categoryBadge}>{category}</span>

              {highlighted && (
                <span className={styles.premiumBadge}>
                  <ShieldCheck className={styles.premiumIcon} />
                  TOP
                </span>
              )}
            </div>

            <div className={styles.ratingContainer} aria-label="Atsiliepimai">
              <div className={styles.ratingBadge}>
                <Star className={styles.starIcon} />
                <span className={styles.ratingText}>Nėra įvertinimų</span>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className={styles.info}>
            <div>
              <div className={styles.location}>
                <MapPin className={styles.locationIcon} />
                {city}
              </div>

              <h3 className={styles.title}>{title}</h3>
              <p className={styles.description}>{description}</p>
            </div>

            <div className={styles.footer}>
              <div className={styles.priceContainer}>
                <span className={styles.priceLabel}>
                  {priceFrom != null ? "Kaina nuo" : "Kaina"}
                </span>
                <span className={styles.priceValue} title={formattedPrice}>
                  {formattedPrice}
                </span>
              </div>

              <div className={styles.actions}>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
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
                </motion.div>
              </div>
            </div>
          </div>
          {/* /info */}
        </div>
        {/* /content */}
      </div>
    </div>
  );
}
