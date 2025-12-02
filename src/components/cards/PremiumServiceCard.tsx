// src/components/cards/PremiumServiceCard.tsx
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
  const displayPrice =
    priceFrom != null ? `${priceFrom} NOK` : "Kaina sutartinė";

  // Kol kas neturim realių reitingų – panaudojam „fake“,
  // kad dizainas išliktų toks, koks tau patinka.
  const rating = highlighted ? 4.9 : 4.7;
  const reviewCount = highlighted ? 32 : 12;

  return (
    <div className={styles.cardContainer} data-id={id}>
      <div className={styles.card}>
        {/* Background su Ken Burns efektu */}
        <div className={styles.backgroundContainer}>
          <motion.img
            src={imageUrl || "/placeholder-service.jpg"}
            alt={title}
            className={styles.backgroundImage}
            animate={{ scale: [1, 1.15, 1], x: [0, -10, 0] }}
            transition={{
              duration: 20,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "linear",
            }}
          />
          <div className={styles.gradientOverlay} />
          {highlighted && <div className={styles.premiumGlow} />}
        </div>

        {/* Content */}
        <div className={styles.content}>
          {/* Viršus */}
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
              <span className={styles.reviewCount}>
                {reviewCount} atsiliepimai
              </span>
            </div>
          </div>

          {/* Apačia */}
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
                <span className={styles.priceValue}>
                  {displayPrice}
                </span>
              </div>

              <div className={styles.actions}>
                <motion.button
                  type="button"
                  className={styles.iconButton}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    // perėjimas į slug puslapį – galima tvarkyt per router vėliau
                    window.location.href = `/services/${slug}`;
                  }}
                >
                  <ArrowRight className={styles.arrowIcon} />
                </motion.button>
                <motion.button
                  type="button"
                  className={`${styles.contactButton} ${
                    highlighted
                      ? styles.contactButtonPremium
                      : styles.contactButtonStandard
                  }`}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    // čia vėliau galim daryt "Susisiekti" modalą
                    window.location.href = `/services/${slug}#kontaktai`;
                  }}
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
