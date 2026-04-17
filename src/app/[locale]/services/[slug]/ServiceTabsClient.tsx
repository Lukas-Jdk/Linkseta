// src/app/[locale]/services/[slug]/ServiceTabsClient.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import styles from "./slugPage.module.css";

type PriceItem = {
  label: string;
  priceText: string;
  note: string;
};

type Props = {
  title: string;
  description: string;
  highlights: string[];
  images: string[];
  priceItems: PriceItem[];
};

type TabKey = "about" | "gallery" | "prices";

export default function ServiceTabsClient({
  title,
  description,
  highlights,
  images,
  priceItems,
}: Props) {
  const t = useTranslations("serviceDetailsTabs");

  const [activeTab, setActiveTab] = useState<TabKey>("about");

  const hasHighlights = highlights.length > 0;
  const hasGallery = images.length > 0;
  const hasPrices = priceItems.length > 0;

  return (
    <div className={styles.contentCard}>
      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tab} ${
            activeTab === "about" ? styles.tabActive : ""
          }`}
          onClick={() => setActiveTab("about")}
        >
          {t("about")}
        </button>

        <button
          type="button"
          className={`${styles.tab} ${
            activeTab === "gallery" ? styles.tabActive : ""
          }`}
          onClick={() => setActiveTab("gallery")}
        >
          {t("gallery")}
        </button>

        <button
          type="button"
          className={`${styles.tab} ${
            activeTab === "prices" ? styles.tabActive : ""
          }`}
          onClick={() => setActiveTab("prices")}
        >
          {t("prices")}
        </button>

       

      </div>

      {activeTab === "about" && (
        <>
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>{t("descriptionTitle")}</h2>
            <p className={styles.desc}>{description}</p>
          </div>

          {hasHighlights && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>{t("whyChoose")}</h2>
              <ul className={styles.bullets}>
                {highlights.map((h, i) => (
                  <li key={i}>✅ {h}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {activeTab === "gallery" && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t("gallery")}</h2>

          {hasGallery ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                gap: 12,
              }}
            >
              {images.map((img, index) => (
                <a
                  key={`${img}-${index}`}
                  href={img}
                  target="_blank"
                  rel="noreferrer"
                >
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      aspectRatio: "4 / 3",
                      overflow: "hidden",
                      borderRadius: 14,
                      border: "1px solid rgba(15, 23, 42, 0.08)",
                      background: "#f8fafc",
                    }}
                  >
                    <Image
                      src={img}
                      alt={t("photoAlt", { title, index: index + 1 })}
                      fill
                      sizes="(max-width: 768px) 50vw, 220px"
                      style={{ objectFit: "cover" }}
                    />
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <p className={styles.descSmall}>{t("noGallery")}</p>
          )}
        </div>
      )}

      {activeTab === "prices" && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t("pricesTitle")}</h2>

          {hasPrices ? (
            <div className={styles.priceList}>
              {priceItems.map((item, index) => (
                <div key={`${item.label}-${index}`} className={styles.priceCard}>
                  <div className={styles.priceCardTop}>
                    <div className={styles.priceCardName}>{item.label}</div>

                    {item.priceText ? (
                      <div className={styles.priceCardValue}>
                        {item.priceText}
                      </div>
                    ) : null}
                  </div>

                  {item.note ? (
                    <div className={styles.priceCardNote}>{item.note}</div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.descSmall}>{t("noPrices")}</p>
          )}
        </div>
      )}
    </div>
  );
}