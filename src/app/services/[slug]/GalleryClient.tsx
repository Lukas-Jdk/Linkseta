// src/app/services/[slug]/GalleryClient.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import styles from "./slugPage.module.css";

type Props = {
  title: string;
  images: string[];
  highlighted?: boolean;
};

export default function GalleryClient({ title, images, highlighted }: Props) {
  const safeImages = useMemo(
    () => (images?.length ? images : ["/def.webp"]),
    [images]
  );

  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);

  const openAt = useCallback((idx: number) => {
    setActive(idx);
    setOpen(true);
  }, []);

  const close = useCallback(() => setOpen(false), []);

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

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close, prev, next]);

  return (
    <div className={styles.gallery}>
      <div
        className={styles.mainImage}
        role="button"
        tabIndex={0}
        onClick={() => openAt(active)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") openAt(active);
        }}
        aria-label="Atidaryti nuotrauką"
      >
        <Image
          src={safeImages[active]}
          alt={title}
          fill
          className={styles.coverImg}
          sizes="(max-width: 980px) 100vw, 760px"
          priority={highlighted}
        />
        {highlighted && <span className={styles.topBadge}>TOP skelbimas</span>}
        <div className={styles.zoomHint}>🔍</div>
      </div>

      {safeImages.length > 1 && (
        <div className={styles.thumbs}>
          {safeImages.slice(0, 6).map((src, idx) => (
            <button
              key={`${src}-${idx}`}
              type="button"
              className={`${styles.thumb} ${
                idx === active ? styles.thumbActive : ""
              }`}
              onClick={() => setActive(idx)}
              aria-label={`Nuotrauka ${idx + 1}`}
            >
              <Image
                src={src}
                alt={`${title} ${idx + 1}`}
                fill
                className={styles.thumbImg}
                sizes="140px"
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
              aria-label="Uždaryti"
            >
              ✕
            </button>

            {safeImages.length > 1 && (
              <>
                <button
                  type="button"
                  className={styles.lightboxNavLeft}
                  onClick={prev}
                  aria-label="Ankstesnė"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className={styles.lightboxNavRight}
                  onClick={next}
                  aria-label="Kita"
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
                sizes="(max-width: 980px) 96vw, 1100px"
                priority
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
