// src/components/cards/PremiumServiceCard.tsx
"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Star, MapPin, ArrowRight, ShieldCheck } from "lucide-react";
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
  const displayPrice = priceFrom != null ? `${priceFrom} NOK` : "Kaina sutartinė";

  const rating = highlighted ? 4.9 : 4.7;
  const reviewCount = highlighted ? 32 : 12;

  const bgSrc = imageUrl || "/default-service.webp";

  return (
    <div className={styles.cardContainer} data-id={id}>
      <div className={styles.card}>
        {/* Background (STABILUS, BE ANIMACIJŲ) */}
        <div className={styles.backgroundContainer}>
          {/* ✅ FIX: Next/Image vietoj <img> */}
          <Image
            src={bgSrc}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, 600px"
            className={styles.backgroundImage}
            priority={highlighted} // jei TOP – pakraunam greičiau
          />

          <div className={styles.gradientOverlay} />
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

            <div className={styles.ratingContainer}>
              <div className={styles.ratingBadge}>
                <Star className={styles.starIcon} />
                <span className={styles.ratingValue}>{rating.toFixed(1)}</span>
              </div>
              <span className={styles.reviewCount}>{reviewCount} atsiliepimai</span>
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
                <span className={styles.priceLabel}>Kaina nuo</span>
                <span className={styles.priceValue}>{displayPrice}</span>
              </div>

              <div className={styles.actions}>
                <motion.button
                  className={styles.iconButton}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => (window.location.href = `/services/${slug}`)}
                  type="button"
                >
                  <ArrowRight className={styles.arrowIcon} />
                </motion.button>

                <motion.button
                  className={`${styles.contactButton} ${
                    highlighted ? styles.contactButtonPremium : styles.contactButtonStandard
                  }`}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => (window.location.href = `/services/${slug}#kontaktai`)}
                  type="button"
                >
                  Susisiekti
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
