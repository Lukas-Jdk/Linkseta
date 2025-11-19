// src/components/cards/CardGrid.tsx

import styles from "./CardGrid.module.css";

type Card = { id: string; title: string; city: string; category: string };

export default function CardGrid({ items }: { items: Card[] }) {
  if (!items || items.length === 0) {
    return (
      <div className={styles.empty}>
        <span aria-hidden>😊</span> Nėra atitinkančių kortelių.
      </div>
    );
  }

  return (
    <div className={styles.grid} role="list">
      {items.map((it) => (
        <article key={it.id} role="listitem" className={styles.card}>
          <h3 className={styles.title}>{it.title}</h3>
          <div className={styles.meta}>{it.city} • {it.category}</div>
        </article>
      ))}
    </div>
  );
}
