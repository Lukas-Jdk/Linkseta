// src/components/cards/PremiumServiceCard.tsx
"use client";

import { useRef, useState } from "react";
import type { MouseEvent } from "react";
import Link from "next/link";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { Star, MapPin, ArrowRight, ShieldCheck } from "lucide-react";
import styles from "./PremiumServiceCard.module.css";

const springConfig = {
  damping: 30,
  stiffness: 100,
  mass: 2,
};

export type PremiumServiceCardProps = {
  id: string;
  title: string;
  description: string | null;
  city: string;
  category: string;
  priceFrom: number | null;
  slug: string;
  highlighted?: boolean;
  imageUrl: string;
};

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
  const ref = useRef<HTMLDivElement | null>(null);

  const rotateX = useSpring(0, springConfig);
  const rotateY = useSpring(0, springConfig);
  const scale = useSpring(1, springConfig);

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();

    const offsetX = e.clientX - rect.left - rect.width / 2;
    const offsetY = e.clientY - rect.top - rect.height / 2;

    const rotationX = (offsetY / (rect.height / 2)) * -10;
    const rotationY = (offsetX / (rect.width / 2)) * 10;

    rotateX.set(rotationX);
    rotateY.set(rotationY);
  }

  function handleMouseEnter() {
    scale.set(1.02);
  }

  function handleMouseLeave() {
    rotateX.set(0);
    rotateY.set(0);
    scale.set(1);
  }

  const shortDescription =
    description && description.length > 140
      ? description.slice(0, 140) + "…"
      : description || "Aprašymas nepateiktas.";

  const priceText = priceFrom != null ? `${priceFrom} €` : "Kaina sutartinė";
  const safeImage = imageUrl || "/default-service.png";
  return (
    <div
      ref={ref}
      className={styles.cardContainer}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        className={styles.card}
        style={{
          rotateX,
          rotateY,
          scale,
        }}
      >
        {/* Fonas su nuotrauka */}
        <div className={styles.backgroundContainer}>
          <motion.img
            src={safeImage}
            alt={title}
            className={styles.backgroundImage}
            animate={{
              scale: [1, 1.12, 1],
              x: [0, -12, 0],
            }}
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

        {/* Turinio overlay */}
        <div className={styles.content}>
          {/* Viršus */}
          <div className={styles.header}>
            <div className={styles.badges}>
              <span className={styles.categoryBadge}>
                {category || "Paslaugos"}
              </span>

              {highlighted && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={styles.premiumBadge}
                >
                  <ShieldCheck className={styles.premiumIcon} />
                  TOP
                </motion.span>
              )}
            </div>

            <div className={styles.ratingContainer}>
              <div className={styles.ratingBadge}>
                <Star className={styles.starIcon} />
                <span className={styles.ratingValue}>4.9</span>
              </div>
              <span className={styles.reviewCount}>120 atsiliepimų</span>
            </div>
          </div>

          {/* Apačia */}
          <div className={styles.info}>
            <div>
              <div className={styles.location}>
                <MapPin className={styles.locationIcon} />
                {city || "Norvegija"}
              </div>

              <h3 className={styles.title}>{title}</h3>

              <p className={styles.description}>{shortDescription}</p>
            </div>

            <div className={styles.footer}>
              <div className={styles.priceContainer}>
                <span className={styles.priceLabel}>nuo</span>
                <span className={styles.priceValue}>
                  {priceText}
                  <span className={styles.priceUnit}> / val.</span>
                </span>
              </div>

              <div className={styles.actions}>
                <Link
                  href={`/services/${slug}`}
                  className={styles.iconButtonLink}
                  aria-label={`Peržiūrėti paslaugą ${title}`}
                >
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={styles.iconButton}
                  >
                    <ArrowRight className={styles.arrowIcon} />
                  </motion.div>
                </Link>

                <Link
                  href={`/services/${slug}`}
                  className={styles.contactButtonLink}
                >
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    className={`${styles.contactButton} ${
                      highlighted
                        ? styles.contactButtonPremium
                        : styles.contactButtonStandard
                    }`}
                  >
                    Susisiekti
                  </motion.button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
