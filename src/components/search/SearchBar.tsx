// src/components/search/SearchBar.tsx
"use client";

import { useEffect, useState } from "react";
import styles from "./SearchBar.module.css";
import { Search } from "lucide-react";

type Option = { id: string; name: string };

export default function SearchBar() {
  const [cities, setCities] = useState<Option[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/public/filters");
      const data = await res.json();
      setCities(data.cities ?? []);
      setCategories(data.categories ?? []);
    }
    load();
  }, []);

  return (
    <form className={styles.wrap} role="search" action="/services" method="get">
      <div className={styles.bar}>
         {/* PAVADINIMAS / PAIEŠKA */}
        <div className={styles.segment}>
          <label className={styles.label}>
            <span className={styles.labelText}>Vardas</span>
            <input
              className={styles.input}
              name="q"
              placeholder="Neprivaloma..."
              autoComplete="off"
            />
          </label>
        </div>

        {/* MIESTAS */}
        <div className={styles.segment}>
          <label className={styles.label}>
            <span className={styles.labelText}>Miestas</span>
            <select name="city" className={styles.select} defaultValue="">
              <option value="">Pasirinkite...</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* KATEGORIJA */}
        <div className={styles.segment}>
          <label className={styles.label}>
            <span className={styles.labelText}>Kategorija</span>
            <select
              name="category"
              className={styles.select}
              defaultValue=""
            >
              <option value="">Pasirinkite...</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </label>
        </div>
       

        {/* SEARCH MYGTUKAS */}
        <button
          type="submit"
          className={styles.searchButton}
          aria-label="Ieškoti paslaugų"
        >
          <Search className={styles.searchIcon} strokeWidth={2} />
        </button>
      </div>
    </form>
  );
}
