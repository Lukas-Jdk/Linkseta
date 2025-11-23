/* src/components/search/SearchBar.tsx */

"use client";
import styles from "./SearchBar.module.css";
import { useEffect, useState } from "react";

export default function SearchBar() {
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    []
  );

  // Pasiimam iš DB
  useEffect(() => {
    async function load() {
      const res = await fetch("/api/public/filters");
      const data = await res.json();
      setCities(data.cities);
      setCategories(data.categories);
    }
    load();
  }, []);

  return (
    <form
      className={styles.wrap}
      role="search"
      action="/services"
      method="get"
    >
      <div className={styles.topRow}>
        <input
          className={styles.input}
          name="q"
          placeholder="Ieškoti pagal pavadinimą..."
        />
        <button className={styles.btn} type="submit">🔍</button>
      </div>

      <div className={styles.bottomRow}>
        <div className={styles.selectWrap}>
          <select name="city" className={styles.select} defaultValue="">
            <option value="">Visi miestai</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.selectWrap}>
          <select name="category" className={styles.select} defaultValue="">
            <option value="">Visos kategorijos</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </form>
  );
}
