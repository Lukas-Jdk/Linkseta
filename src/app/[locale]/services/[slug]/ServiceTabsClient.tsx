// src/app/[locale]/services/[slug]/ServiceTabsClient.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import styles from "./slugPage.module.css";

type Props = {
  title: string;
  description: string;
  highlights: string[];
  images: string[];
};

type TabKey = "about" | "gallery" | "reviews";

export default function ServiceTabsClient({
  title,
  description,
  highlights,
  images,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("about");

  const hasHighlights = highlights.length > 0;
  const hasGallery = images.length > 0;

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
          Apie paslaugą
        </button>

        <button
          type="button"
          className={`${styles.tab} ${
            activeTab === "gallery" ? styles.tabActive : ""
          }`}
          onClick={() => setActiveTab("gallery")}
        >
          Galerija
        </button>

        <button
          type="button"
          className={`${styles.tab} ${
            activeTab === "reviews" ? styles.tabActive : ""
          }`}
          onClick={() => setActiveTab("reviews")}
        >
          Atsiliepimai
        </button>
      </div>

      {activeTab === "about" && (
        <>
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Aprašymas</h2>
            <p className={styles.desc}>{description}</p>
          </div>

          {hasHighlights && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                Kodėl verta rinktis šią paslaugą?
              </h2>
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
          <h2 className={styles.sectionTitle}>Galerija</h2>

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
                  style={{
                    display: "block",
                    textDecoration: "none",
                  }}
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
                      alt={`${title} nuotrauka ${index + 1}`}
                      fill
                      sizes="(max-width: 768px) 50vw, 220px"
                      style={{
                        objectFit: "cover",
                      }}
                    />
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <p className={styles.descSmall}>Galerijos nuotraukų dar nėra.</p>
          )}
        </div>
      )}

      {activeTab === "reviews" && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Atsiliepimai</h2>
          <p className={styles.descSmall}>
            Atsiliepimai bus vėliau (kai pridėsime review sistemą).
          </p>
        </div>
      )}
    </div>
  );
}