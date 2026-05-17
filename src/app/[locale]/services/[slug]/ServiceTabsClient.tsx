// src/app/[locale]/services/[slug]/ServiceTabsClient.tsx
"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  Armchair,
  Bath,
  Brush,
  Car,
  ChefHat,
  DoorOpen,
  Dumbbell,
  Hammer,
  Home,
  Laptop,
  PawPrint,
  Plug,
  Scale,
  Sparkles,
  Trees,
  Truck,
  Utensils,
  Wrench,
} from "lucide-react";
import styles from "./slugPage.module.css";

type PriceItem = {
  label: string;
  priceText: string;
  note: string;
};

type ServiceBlockImage = {
  url: string;
  altText?: string | null;
};

type ServiceBlock = {
  id: string;
  title: string;
  description: string;
  iconKey: string;
  images: ServiceBlockImage[];
};

type Props = {
  title: string;
  description: string;
  highlights: string[];
  images: string[];
  priceItems: PriceItem[];
  serviceBlocks: ServiceBlock[];
};

type TabKey = "about" | "services" | "gallery" | "prices";

function getBlockIcon(iconKey: string) {
  switch (iconKey) {
    case "carpentry":
      return Hammer;
    case "kitchen":
      return ChefHat;
    case "floors":
      return Home;
    case "walls":
    case "painting":
      return Brush;
    case "bathroom":
    case "plumbing":
      return Bath;
    case "terrace":
      return Trees;
    case "doors":
    case "windows":
      return DoorOpen;
    case "electrical":
      return Plug;
    case "cleaning":
    case "beauty":
      return Sparkles;
    case "transport":
      return Truck;
    case "auto":
      return Car;
    case "it":
      return Laptop;
    case "legal":
      return Scale;
    case "training":
      return Dumbbell;
    case "pets":
      return PawPrint;
    case "food":
      return Utensils;
    case "household":
      return Armchair;
    default:
      return Wrench;
  }
}

export default function ServiceTabsClient({
  title,
  description,
  highlights,
  images,
  priceItems,
  serviceBlocks,
}: Props) {
  const t = useTranslations("serviceDetailsTabs");

  const [activeTab, setActiveTab] = useState<TabKey>("about");
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(
    serviceBlocks[0]?.id ?? null,
  );

  const hasHighlights = highlights.length > 0;
  const hasGallery = images.length > 0;
  const hasPrices = priceItems.length > 0;
  const hasBlocks = serviceBlocks.length > 0;

  const selectedBlock = useMemo(() => {
    if (!selectedBlockId) return serviceBlocks[0] ?? null;
    return serviceBlocks.find((block) => block.id === selectedBlockId) ?? null;
  }, [selectedBlockId, serviceBlocks]);

  const galleryImages =
    selectedBlock && selectedBlock.images.length > 0
      ? selectedBlock.images.map((img) => img.url)
      : images;

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
            activeTab === "services" ? styles.tabActive : ""
          }`}
          onClick={() => setActiveTab("services")}
        >
          Paslaugos
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

      {activeTab === "services" && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Ką atlieka</h2>

          {hasBlocks ? (
            <div className={styles.serviceBlocksGrid}>
              {serviceBlocks.map((block) => {
                const Icon = getBlockIcon(block.iconKey);
                const cover = block.images[0]?.url ?? null;

                return (
                  <button
                    key={block.id}
                    type="button"
                    className={`${styles.serviceBlockCard} ${
                      selectedBlockId === block.id
                        ? styles.serviceBlockCardActive
                        : ""
                    }`}
                    onClick={() => {
                      setSelectedBlockId(block.id);
                      setActiveTab("gallery");
                    }}
                  >
                    {cover && (
                      <div className={styles.serviceBlockImage}>
                        <Image
                          src={cover}
                          alt={block.title}
                          fill
                          sizes="220px"
                          style={{ objectFit: "cover" }}
                        />
                      </div>
                    )}

                    <div className={styles.serviceBlockIconWrap}>
                      <Icon size={22} />
                    </div>

                    <div className={styles.serviceBlockTitle}>
                      {block.title}
                    </div>

                    {block.description ? (
                      <div className={styles.serviceBlockDesc}>
                        {block.description}
                      </div>
                    ) : null}

                    {block.images.length > 0 && (
                      <div className={styles.serviceBlockCount}>
                        {block.images.length} foto
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className={styles.descSmall}>Paslaugų blokai dar nepridėti.</p>
          )}
        </div>
      )}

      {activeTab === "gallery" && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            {selectedBlock ? selectedBlock.title : t("gallery")}
          </h2>

          {hasBlocks && (
            <div className={styles.galleryFilterRow}>
              {serviceBlocks.map((block) => (
                <button
                  key={block.id}
                  type="button"
                  className={`${styles.galleryFilterBtn} ${
                    selectedBlockId === block.id
                      ? styles.galleryFilterBtnActive
                      : ""
                  }`}
                  onClick={() => setSelectedBlockId(block.id)}
                >
                  {block.title}
                </button>
              ))}
            </div>
          )}

          {galleryImages.length > 0 ? (
            <div className={styles.galleryGrid}>
              {galleryImages.map((img, index) => (
                <a
                  key={`${img}-${index}`}
                  href={img}
                  target="_blank"
                  rel="noreferrer"
                >
                  <div className={styles.galleryThumb}>
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