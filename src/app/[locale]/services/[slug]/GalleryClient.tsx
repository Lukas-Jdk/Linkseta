// src/app/[locale]/services/[slug]/GalleryClient.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import styles from "./slugPage.module.css";

type Props = {
  title: string;
  images: string[];
  highlighted?: boolean;
};

export default function GalleryClient({ title, images, highlighted }: Props) {
  const t = useTranslations("gallery");

  const safeImages = useMemo(
    () => (images?.length ? images : ["/def.webp"]),
    [images],
  );

  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);

  const openAt = useCallback((idx: number) => {
    setActive(idx);
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  const prev = useCallback(() => {
    setActive((i) => (i - 1 + safeImages.length) % safeImages.length);
  }, [safeImages.length]);

  const next = useCallback(() => {
    setActive((i) => (i + 1) % safeImages.length);
  }, [safeImages.length]);

  useEffect(() => {
    if (!open) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    document.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close, prev, next]);

  return (
    <div className={styles.gallery}>
      <div
        className={styles.mainImage}
        role="button"
        tabIndex={0}
        onClick={() => openAt(active)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openAt(active);
          }
        }}
        aria-label={t("openImage")}
      >
        <Image
          src={safeImages[active]}
          alt={title}
          fill
          className={styles.coverImg}
          sizes="(max-width: 680px) 100vw, 50vw"
          priority
        />

        {highlighted && <span className={styles.topBadge}>{t("topAd")}</span>}

        <div className={styles.zoomHint}>🔍</div>
      </div>

      {safeImages.length > 1 && (
        <div className={styles.thumbs}>
          {safeImages.map((src, idx) => (
            <button
              key={`${src}-${idx}`}
              type="button"
              className={`${styles.thumb} ${
                idx === active ? styles.thumbActive : ""
              }`}
              onClick={() => setActive(idx)}
              aria-label={t("photo", { index: idx + 1 })}
            >
              <Image
                src={src}
                alt={t("photo", { index: idx + 1 })}
                fill
                className={styles.thumbImg}
                sizes="92px"
              />
            </button>
          ))}
        </div>
      )}

      {open && (
        <div className={styles.lightbox} onMouseDown={close}>
          <div
            className={styles.lightboxInner}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className={styles.lightboxClose}
              onClick={close}
              aria-label={t("close")}
            >
              ✕
            </button>

            {safeImages.length > 1 && (
              <>
                <button
                  type="button"
                  className={styles.lightboxNavLeft}
                  onClick={prev}
                  aria-label={t("prev")}
                >
                  ‹
                </button>

                <button
                  type="button"
                  className={styles.lightboxNavRight}
                  onClick={next}
                  aria-label={t("next")}
                >
                  ›
                </button>
              </>
            )}

            <div className={styles.lightboxImgWrap}>
              <Image
                src={safeImages[active]}
                alt={title}
                fill
                className={styles.lightboxImg}
                sizes="100vw"
                priority
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}