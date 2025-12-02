// src/components/cards/CardGrid.tsx
"use client";

import PremiumServiceCard from "./PremiumServiceCard";
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
};

export default function CardGrid({ items }: Props) {
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
        <h2 className={styles.heading}>Populiariausios lietuvių paslaugos</h2>
        <p className={styles.subheading}>
          Atrinktos patikimos paslaugos su geriausiais atsiliepimais ir aiškiomis
          kainomis.
        </p>
      </header>

      <div className={styles.grid}>
        {items.map((item) => (
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
          />
        ))}
      </div>
    </div>
  );
}
