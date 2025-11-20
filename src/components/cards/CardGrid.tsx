// src/components/cards/CardGrid.tsx

import Link from "next/link";
import styles from "./CardGrid.module.css";

export type ServiceCardItem = {
  id: string;
  title: string;
  description: string;
  city: string;
  category: string;
  priceFrom: number | null;
  slug: string;
};

type CardGridProps = {
  items: ServiceCardItem[];
};

export default function CardGrid({ items }: CardGridProps) {
  if (!items || items.length === 0) {
    return (
      <p className={styles.empty}>
        Dar nėra įkeltų paslaugų. Būk pirmas, kuris atsiras Linksetoje 👋
      </p>
    );
  }

  return (
    <div className={styles.grid}>
      {items.map((item) => (
        <Link
          key={item.id}
          href={`/services/${item.slug}`}
          className={styles.card}
        >
          <h2 className={styles.title}>{item.title}</h2>

          <p className={styles.description}>{item.description}</p>

          <div className={styles.meta}>
            {item.city && <span>🏙 {item.city}</span>}
            {item.category && <span>📂 {item.category}</span>}
            {item.priceFrom != null && (
              <span>💰 nuo {item.priceFrom} NOK</span>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}

