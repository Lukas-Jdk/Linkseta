// src/app/dashboard/services/new/NewServiceForm.tsx
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./NewServiceForm.module.css";

type Option = {
  id: string;
  name: string;
};

type Props = {
  cities: Option[];
  categories: Option[];
};

export default function NewServiceForm({ cities, categories }: Props) {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cityId, setCityId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [priceFrom, setPriceFrom] = useState<string>("");
  const [imageUrl, setImageUrl] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title || !description) {
      setError("Pavadinimas ir aprašymas yra privalomi.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/dashboard/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          cityId: cityId || null,
          categoryId: categoryId || null,
          priceFrom: priceFrom || null,
          imageUrl: imageUrl || null,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(
          json?.error ||
            "Nepavyko sukurti paslaugos. Bandykite dar kartą vėliau."
        );
        return;
      }

      // Po sėkmingo sukūrimo – į dashboard
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      setError("Serverio klaida. Bandykite dar kartą.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.row}>
        <label className={styles.label}>
          Pavadinimas*
          <input
            className={styles.input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </label>
      </div>

      <div className={styles.row}>
        <label className={styles.label}>
          Aprašymas*
          <textarea
            className={styles.textarea}
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            placeholder="Trumpai aprašykite, kokias paslaugas teikiate, kokius darbus atliekate, patirtį ir pan."
          />
        </label>
      </div>

      <div className={styles.row}>
        <label className={styles.label}>
          Miestas
          <select
            className={styles.input}
            value={cityId}
            onChange={(e) => setCityId(e.target.value)}
          >
            <option value="">Pasirinkti...</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.label}>
          Kategorija
          <select
            className={styles.input}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">Pasirinkti...</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.row}>
        <label className={styles.label}>
          Kaina nuo (NOK)
          <input
            className={styles.input}
            type="number"
            min={0}
            inputMode="numeric"
            value={priceFrom}
            onChange={(e) => setPriceFrom(e.target.value)}
            placeholder="pvz. 500"
          />
        </label>

        <label className={styles.label}>
          Nuotraukos URL
          <input
            className={styles.input}
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://..."
          />
        </label>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <button
        type="submit"
        className={`btn btn-primary ${styles.submitButton}`}
        disabled={isSubmitting}
      >
        {isSubmitting ? "Kuriama..." : "Sukurti paslaugą"}
      </button>
    </form>
  );
}
