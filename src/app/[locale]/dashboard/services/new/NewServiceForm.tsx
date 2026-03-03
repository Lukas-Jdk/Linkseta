// src/app/[locale]/dashboard/services/new/NewServiceForm.tsx
"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { csrfFetch } from "@/lib/csrfClient";
import styles from "./NewServiceForm.module.css";

type Option = { id: string; name: string };

type Props = {
  cities: Option[];
  categories: Option[];
};

export default function NewServiceForm({ cities, categories }: Props) {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "lt";

  const [title, setTitle] = useState("");
  const [cityId, setCityId] = useState(cities?.[0]?.id ?? "");
  const [categoryId, setCategoryId] = useState(categories?.[0]?.id ?? "");
  const [priceFrom, setPriceFrom] = useState<string>("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return (
      title.trim().length >= 3 &&
      description.trim().length >= 10 &&
      Boolean(cityId) &&
      Boolean(categoryId) &&
      !submitting
    );
  }, [title, description, cityId, categoryId, submitting]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        cityId,
        categoryId,
        priceFrom: priceFrom.trim() ? Number(priceFrom) : null,
        description: description.trim(),
        imageUrl: imageUrl.trim() ? imageUrl.trim() : null,
      };

      const res = await csrfFetch("/api/dashboard/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // jei tavo csrfFetch nededa pats – tada būtina:
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        // serveris pas tave dažniausiai grąžina JSON { error: "..."}
        const data = await res.json().catch(() => null);
        const msg =
          data?.error ??
          (res.status === 403 ? "CSRF check failed" : "Nepavyko sukurti paslaugos");
        throw new Error(msg);
      }

      // jei serveris grąžina { id } ar { slug } – pasiimk ir redirectink gražiau.
      // dabar tiesiog grįžtam į dashboard services listą:
      router.push(`/${locale}/dashboard/services`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Įvyko klaida");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <div className={styles.grid}>
        <div className={styles.field}>
          <label className={styles.label}>Pavadinimas</label>
          <input
            className={styles.input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Pvz. Elektrikas Osle"
            autoComplete="off"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Miestas</label>
          <select
            className={styles.select}
            value={cityId}
            onChange={(e) => setCityId(e.target.value)}
          >
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Kategorija</label>
          <select
            className={styles.select}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Kaina nuo (NOK)</label>
          <input
            className={styles.input}
            value={priceFrom}
            onChange={(e) => setPriceFrom(e.target.value)}
            placeholder="Pvz. 500"
            inputMode="numeric"
          />
        </div>

        <div className={styles.fieldFull}>
          <label className={styles.label}>Aprašymas</label>
          <textarea
            className={styles.textarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Parašyk kuo aiškiau, ką siūlai."
            rows={6}
          />
        </div>

        <div className={styles.fieldFull}>
          <label className={styles.label}>Nuotraukos URL (nebūtina)</label>
          <input
            className={styles.input}
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://..."
            autoComplete="off"
          />
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <button className={styles.submit} type="submit" disabled={!canSubmit}>
        {submitting ? "Kuriama..." : "Sukurti paslaugą"}
      </button>
    </form>
  );
}