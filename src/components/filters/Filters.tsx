// src/components/filters/Filters.tsx

"use client";
import styles from "./Filters.module.css";

export default function Filters() {
  return (
    <div className={styles.row} role="group" aria-label="Paslaugų filtrai">

      <div className={styles.selectWrap}>
        <select className={styles.select} aria-label="Miestas">
          <option>Visi miestai</option>
          <option>Oslo</option>
          <option>Bergenas</option>
          <option>Stavangeris</option>
          <option>Trondheim</option>
        </select>
      </div>

      <div className={styles.selectWrap}>
        <select className={styles.select} aria-label="Kategorija">
          <option>Visos kategorijos</option>
          <option>Statyba</option>
          <option>Apskaita</option>
          <option>Automobiliai</option>
          <option>NT</option>
        </select>
      </div>

    </div>
  );
}

