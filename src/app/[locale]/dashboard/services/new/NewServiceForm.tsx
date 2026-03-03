// src/app/[locale]/dashboard/services/new/NewServiceForm.tsx
"use client";

import { useMemo, useState } from "react";
import styles from "./NewServiceForm.module.css";

type CityOption = { id: string; name: string };
type CategoryOption = { id: string; name: string; slug: string };

type Props = {
  cities: CityOption[];
  categories: CategoryOption[];
  locale: string;
};

export default function NewServiceForm({ cities, categories, locale }: Props) {
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cityId, setCityId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [priceFrom, setPriceFrom] = useState<string>("");
  const [imageUrl, setImageUrl] = useState("");

  const canSubmit = useMemo(() => {
    return title.trim().length >= 3 && description.trim().length >= 10 && cityId && categoryId;
  }, [title, description, cityId, categoryId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setError(null);

    const payload = {
      title: title.trim(),
      description: description.trim(),
      cityId,
      categoryId,
      priceFrom: priceFrom ? Number(priceFrom) : null,
      imageUrl: imageUrl.trim() ? imageUrl.trim() : null,
    };

    try {
      // ⚠️ jei tavo endpointas vadinasi kitaip – pakeisk tik šitą URL
      const res = await fetch("/api/dashboard/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error ?? `Create failed (${res.status})`);
      }

      // jei backend grąžina slug arba id – redirectinam
      const slug = json?.slug as string | undefined;
      const id = json?.id as string | undefined;

      if (slug) {
        window.location.href = `/${locale}/dashboard/services/${slug}`;
        return;
      }
      if (id) {
        window.location.href = `/${locale}/dashboard/services/${id}`;
        return;
      }

      window.location.href = `/${locale}/dashboard/services`;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nepavyko sukurti paslaugos.");
    }
  }

  return (
    <form className={styles.card} onSubmit={onSubmit}>
      <div className={styles.grid}>
        <label className={styles.field}>
          <span className={styles.label}>Pavadinimas</span>
          <input
            className={styles.input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Pvz. Elektriko paslaugos Osle"
            minLength={3}
            required
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Miestas</span>
          <select className={styles.input} value={cityId} onChange={(e) => setCityId(e.target.value)} required>
            <option value="">Pasirinkite...</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Kategorija</span>
          <select
            className={styles.input}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
          >
            <option value="">Pasirinkite...</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Kaina nuo (NOK)</span>
          <input
            className={styles.input}
            value={priceFrom}
            onChange={(e) => setPriceFrom(e.target.value)}
            placeholder="Pvz. 500"
            inputMode="numeric"
          />
        </label>

        <label className={styles.fieldFull}>
          <span className={styles.label}>Aprašymas</span>
          <textarea
            className={styles.textarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Trumpai aprašyk paslaugą, miestą, kainą, terminus ir pan."
            minLength={10}
            required
          />
        </label>

        <label className={styles.fieldFull}>
          <span className={styles.label}>Nuotraukos URL (nebūtina)</span>
          <input
            className={styles.input}
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://..."
          />
        </label>
      </div>

      {error && <div className={styles.errorInline}>{error}</div>}

      <button className={styles.submit} type="submit" disabled={!canSubmit}>
        Sukurti paslaugą
      </button>
    </form>
  );
}