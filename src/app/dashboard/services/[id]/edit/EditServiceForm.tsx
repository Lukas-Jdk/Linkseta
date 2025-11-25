// src/app/dashboard/services/[id]/edit/EditServiceForm.tsx
"use client";

import { useState, FormEvent, useTransition } from "react";
import { useRouter } from "next/navigation";
import styles from "@/app/dashboard/services/services.module.css";

type Option = {
  id: string;
  name: string;
};

type InitialData = {
  id: string;
  title: string;
  description: string;
  cityId: string;
  categoryId: string;
  priceFrom: number | null;
};

type Props = {
  initial: InitialData;
  cities: Option[];
  categories: Option[];
};

export default function EditServiceForm({
  initial,
  cities,
  categories,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [cityId, setCityId] = useState(initial.cityId || "");
  const [categoryId, setCategoryId] = useState(initial.categoryId || "");
  const [priceFrom, setPriceFrom] = useState(
    initial.priceFrom != null ? String(initial.priceFrom) : ""
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/dashboard/services/${initial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          cityId: cityId || null,
          categoryId: categoryId || null,
          priceFrom: priceFrom || null,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Nepavyko išsaugoti paslaugos.");
        return;
      }

      setSuccess("Paslauga sėkmingai atnaujinta.");
      startTransition(() => {
        router.push("/dashboard/services");
        router.refresh();
      });
    } catch (err) {
      console.error(err);
      setError("Įvyko klaida. Bandykite dar kartą.");
    }
  }

  async function handleDelete() {
    const ok = window.confirm(
      "Ar tikrai nori ištrinti šią paslaugą? Šio veiksmo atšaukti nebus galima."
    );
    if (!ok) return;

    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/dashboard/services/${initial.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const json = await res.json();
        setError(json.error || "Nepavyko ištrinti paslaugos.");
        return;
      }

      startTransition(() => {
        router.push("/dashboard/services");
        router.refresh();
      });
    } catch (err) {
      console.error(err);
      setError("Įvyko klaida. Bandykite dar kartą.");
    }
  }

  return (
    <form className={styles.formCard} onSubmit={handleSubmit}>
      {error && <p className={styles.errorText}>{error}</p>}
      {success && <p className={styles.successText}>{success}</p>}

      <div className={styles.formGroup}>
        <label className={styles.label}>Pavadinimas</label>
        <input
          className={styles.input}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>Aprašymas</label>
        <textarea
          className={styles.textarea}
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </div>

      <div className={styles.formRow}>
        <div className={styles.formCol}>
          <label className={styles.label}>Miestas</label>
          <select
            className={styles.select}
            value={cityId}
            onChange={(e) => setCityId(e.target.value)}
          >
            <option value="">Neparinkta</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formCol}>
          <label className={styles.label}>Kategorija</label>
          <select
            className={styles.select}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">Neparinkta</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>Kaina nuo (NOK)</label>
        <input
          className={styles.input}
          type="number"
          min={0}
          value={priceFrom}
          onChange={(e) => setPriceFrom(e.target.value)}
          placeholder="Pvz. 200"
        />
      </div>

      <div className={styles.actionsRow}>
        <button
          type="submit"
          className={styles.primaryButton}
          disabled={pending}
        >
          {pending ? "Saugoma..." : "Išsaugoti pakeitimus"}
        </button>

        <button
          type="button"
          className={styles.dangerButton}
          onClick={handleDelete}
          disabled={pending}
        >
          Ištrinti paslaugą
        </button>

        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => router.push("/dashboard/services")}
          disabled={pending}
        >
          Grįžti į mano paslaugas
        </button>
      </div>
    </form>
  );
}
