// src/app/[locale]/services/[slug]/ServiceGallery.tsx
"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import styles from "./slugPage.module.css";

type GalleryImage = {
  url: string;
  altText?: string | null;
};

type GalleryBlock = {
  id: string;
  title: string;
  description?: string | null;
  priceText?: string | null;
  images: GalleryImage[];
};

type Props = {
  blocks: GalleryBlock[];
};

function clampIndex(index: number, length: number) {
  if (length <= 0) return 0;
  if (index < 0) return length - 1;
  if (index >= length) return 0;
  return index;
}

export default function ServiceGallery({ blocks }: Props) {
  const t = useTranslations("serviceDetailsPage");

  const blocksWithImages = useMemo(
    () => blocks.filter((block) => block.images.length > 0),
    [blocks],
  );

  const [activeBlock, setActiveBlock] = useState<GalleryBlock | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const activeImages = activeBlock?.images ?? [];
  const currentImage = activeImages[activeImageIndex];
  const activeDescription = activeBlock?.description?.trim() ?? "";
  const activePrice = activeBlock?.priceText?.trim() ?? "";

  if (!blocksWithImages.length) return null;

  function openGallery(block: GalleryBlock, imageIndex = 0) {
    setActiveBlock(block);
    setActiveImageIndex(clampIndex(imageIndex, block.images.length));
    setLightboxOpen(false);
  }

  function closeGallery() {
    setActiveBlock(null);
    setActiveImageIndex(0);
    setLightboxOpen(false);
  }

  function openLightbox() {
    if (!currentImage) return;
    setLightboxOpen(true);
  }

  function closeLightbox() {
    setLightboxOpen(false);
  }

  function nextImage() {
    setActiveImageIndex((prev) => clampIndex(prev + 1, activeImages.length));
  }

  function prevImage() {
    setActiveImageIndex((prev) => clampIndex(prev - 1, activeImages.length));
  }

  return (
    <>
      <div className={styles.galleryHead}>
        <h2>{t("whatWeOffer")}</h2>
      </div>

      <div className={styles.galleryPreviewGrid}>
        {blocksWithImages.map((block) => (
          <button
            key={block.id}
            type="button"
            onClick={() => openGallery(block)}
            className={styles.galleryPreviewItem}
          >
            <Image
              src={block.images[0].url}
              alt={block.title}
              fill
              sizes="(max-width: 900px) 50vw, 280px"
              className={styles.galleryPreviewImage}
            />

            <span>
              {block.title} ({block.images.length})
            </span>
          </button>
        ))}
      </div>

      {activeBlock && currentImage && (
        <div className={styles.galleryModal} onClick={closeGallery}>
          <div
            className={styles.galleryModalInner}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className={styles.galleryClose}
              onClick={closeGallery}
              aria-label={t("closeGallery")}
            >
              ×
            </button>

            <div className={styles.galleryModalGrid}>
              <div className={styles.galleryMediaPanel}>
                <button
                  type="button"
                  className={styles.galleryImageWrap}
                  onClick={openLightbox}
                  aria-label={t("openFullscreen")}
                >
                  <Image
                    src={currentImage.url}
                    alt={currentImage.altText || activeBlock.title}
                    fill
                    sizes="(max-width: 900px) 100vw, 760px"
                    className={styles.galleryBigImage}
                  />
                </button>

                {activeImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      className={styles.galleryArrowLeft}
                      onClick={prevImage}
                      aria-label={t("previousImage")}
                    >
                      ‹
                    </button>

                    <button
                      type="button"
                      className={styles.galleryArrowRight}
                      onClick={nextImage}
                      aria-label={t("nextImage")}
                    >
                      ›
                    </button>
                  </>
                )}

                {activeImages.length > 1 && (
                  <div className={styles.galleryThumbs}>
                    {activeImages.map((image, index) => (
                      <button
                        key={`${image.url}-${index}`}
                        type="button"
                        className={
                          index === activeImageIndex
                            ? `${styles.galleryThumb} ${styles.galleryThumbActive}`
                            : styles.galleryThumb
                        }
                        onClick={() => setActiveImageIndex(index)}
                        aria-label={t("openImage", { number: index + 1 })}
                      >
                        <Image
                          src={image.url}
                          alt={image.altText || activeBlock.title}
                          fill
                          sizes="90px"
                          className={styles.galleryThumbImage}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <aside className={styles.galleryInfoPanel}>
                <div className={styles.galleryCounter}>
                  {activeImageIndex + 1}/{activeImages.length}
                </div>

                <h3>{activeBlock.title}</h3>

            
                {activeDescription && <p>{activeDescription}</p>}
    {activePrice && (
                  <div className={styles.galleryPrice}>{activePrice}</div>
                )}

                <div className={styles.galleryInfoDivider} />
              </aside>
            </div>
          </div>
        </div>
      )}

      {lightboxOpen && activeBlock && currentImage && (
        <div className={styles.lightboxOverlay} onClick={closeLightbox}>
          <div
            className={styles.lightboxInner}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className={styles.lightboxClose}
              onClick={closeLightbox}
              aria-label={t("closeFullscreen")}
            >
              ×
            </button>

            <div className={styles.lightboxCounter}>
              {activeImageIndex + 1} / {activeImages.length}
            </div>

            {activeImages.length > 1 && (
              <>
                <button
                  type="button"
                  className={styles.lightboxArrowLeft}
                  onClick={prevImage}
                  aria-label={t("previousImage")}
                >
                  ‹
                </button>

                <button
                  type="button"
                  className={styles.lightboxArrowRight}
                  onClick={nextImage}
                  aria-label={t("nextImage")}
                >
                  ›
                </button>
              </>
            )}

            <div className={styles.lightboxImageWrap}>
              <Image
                src={currentImage.url}
                alt={currentImage.altText || activeBlock.title}
                fill
                sizes="100vw"
                className={styles.lightboxImage}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
