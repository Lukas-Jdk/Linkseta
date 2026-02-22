// src/components/cards/CardGrid.tsx
"use client";

import PremiumServiceCard from "./PremiumServiceCard";
import ServiceCard from "./ServiceCard";
import styles from "./CardGrid.module.css";

export type CardGridItem = {
  id: string;
  title: string;
  description: string | null;
  city: string;
  category: string;
  priceFrom: number | null;
  slug: string;
  highlighted?: boolean;
  imageUrl: string | null;
};

type Props = {
  items: CardGridItem[];
  variant?: "premium" | "compact";
  locale: string;
};

export default function CardGrid({
  items,
  variant = "premium",
  locale,
}: Props) {
  if (!items.length) {
    return (
      <div className={styles.empty}>
        Šiuo metu dar neturime rodomų paslaugų.
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <h2 className={styles.heading}>
          {variant === "premium" ? "Populiariausios paslaugos" : "Rezultatai"}
        </h2>
      </header>

      <div className={styles.grid}>
        {items.map((item) =>
          variant === "premium" ? (
            <PremiumServiceCard
              key={item.id}
              id={item.id}
              title={item.title}
              description={item.description ?? ""}
              city={item.city}
              category={item.category}
              priceFrom={item.priceFrom}
              slug={item.slug}
              highlighted={item.highlighted}
              imageUrl={item.imageUrl || ""}
              locale={locale}
            />
          ) : (
            <ServiceCard
              key={item.id}
              title={item.title}
              description={item.description ?? ""}
              city={item.city}
              category={item.category}
              priceFrom={item.priceFrom}
              slug={item.slug}
              highlighted={item.highlighted}
              imageUrl={item.imageUrl || ""}
              locale={locale}
            />
          ),
        )}
      </div>
    </div>
  );
}
