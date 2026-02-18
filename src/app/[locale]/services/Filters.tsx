// src/app/[locale]/services/Filters.tsx
"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import styles from "./services.module.css";

type City = {
  id: string;
  name: string;
};

type Category = {
  id: string;
  name: string;
};

type FiltersProps = {
  cities: City[];
  categories: Category[];
  initialCity: string;
  initialCategory: string;
  initialQ: string;
};

export default function Filters({
  cities,
  categories,
  initialCity,
  initialCategory,
  initialQ,
}: FiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [city, setCity] = useState(initialCity);
  const [category, setCategory] = useState(initialCategory);
  const [q, setQ] = useState(initialQ);

  function applyFilters() {
    const params = new URLSearchParams(searchParams.toString());

    if (city) params.set("city", city);
    else params.delete("city");

    if (category) params.set("category", category);
    else params.delete("category");

    if (q.trim()) params.set("q", q.trim());
    else params.delete("q");

    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    applyFilters();
  }

  return (
    <form className={styles.filters} onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Ieškoti pagal pavadinimą ar aprašymą..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className={styles.searchInput}
      />

      <div className={styles.filterRow}>
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className={styles.select}
        >
          <option value="">Visi miestai</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={styles.select}
        >
          <option value="">Visos kategorijos</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>

        <button type="submit" className={styles.filterButton}>
          Filtruoti
        </button>
      </div>
    </form>
  );
}
