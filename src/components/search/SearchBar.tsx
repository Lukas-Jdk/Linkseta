// src/components/search/SearchBar.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./SearchBar.module.css";
import { Search } from "lucide-react";

type Option = { id: string; name: string };

export default function SearchBar() {
  const [cities, setCities] = useState<Option[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);

  // kad gražiai rodytų pasirinktą reikšmę
  const [q, setQ] = useState("");
  const [cityId, setCityId] = useState("");
  const [categoryId, setCategoryId] = useState("");

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/public/filters");
      const data = await res.json();
      setCities(data.cities ?? []);
      setCategories(data.categories ?? []);
    }
    load();
  }, []);

  const cityName = useMemo(() => {
    if (!cityId) return "Pasirinkite...";
    return cities.find((c) => c.id === cityId)?.name ?? "Pasirinkite...";
  }, [cityId, cities]);

  const categoryName = useMemo(() => {
    if (!categoryId) return "Pasirinkite...";
    return (
      categories.find((c) => c.id === categoryId)?.name ?? "Pasirinkite..."
    );
  }, [categoryId, categories]);

  return (
    <form className={styles.wrap} role="search" action="/services" method="get">
      <div className={styles.bar}>
        {/* PAVADINIMAS */}
        <div className={styles.segment}>
          <div className={styles.label}>
            <div className={styles.labelText}>Vardas</div>
            <input
              className={styles.input}
              name="q"
              placeholder="Neprivaloma..."
              autoComplete="off"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        {/* MIESTAS (overlay select per visą segmentą) */}
        <div className={styles.segment}>
          <div className={styles.label}>
            <div className={styles.labelText}>Miestas</div>

            {/* Čia rodom tekstą (UI) */}
            <div className={styles.fakeValue}>{cityName}</div>

            {/* Čia tikras select, bet jis uždėtas per visą segmentą */}
            <select
              name="city"
              className={styles.selectOverlay}
              value={cityId}
              onChange={(e) => setCityId(e.target.value)}
              aria-label="Miestas"
            >
              <option value="">Pasirinkite...</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* KATEGORIJA (overlay select per visą segmentą) */}
        <div className={styles.segment}>
          <div className={styles.label}>
            <div className={styles.labelText}>Kategorija</div>

            <div className={styles.fakeValue}>{categoryName}</div>

            <select
              name="category"
              className={styles.selectOverlay}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              aria-label="Kategorija"
            >
              <option value="">Pasirinkite...</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* SEARCH */}
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
