"use client";

import { useState, FormEvent, useTransition } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import styles from "./edit.module.css";

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
  imageUrl: string | null;
};

type Props = {
  initial: InitialData;
  cities: Option[];
  categories: Option[];
};

const BUCKET = "service-images";

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

  // 🔥 tikra nuotrauka (jei nėra – tuščia)
  const [imageUrl, setImageUrl] = useState<string>(initial.imageUrl || "");
  const [uploading, setUploading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleUpload(file: File) {
    setError(null);
    setSuccess(null);

    if (!file.type.startsWith("image/")) {
      setError("Pasirinkite paveikslėlį (JPG / PNG / WEBP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Nuotrauka per didelė. Maksimaliai 5MB.");
      return;
    }

    setUploading(true);

    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `services/${initial.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error(uploadError);
        setError("Nepavyko įkelti nuotraukos.");
        return;
      }

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);

      if (!data?.publicUrl) {
        setError("Nepavyko gauti nuotraukos URL.");
        return;
      }

      setImageUrl(data.publicUrl);
      setSuccess("Nuotrauka įkelta. Nepamirškite išsaugoti pakeitimų.");
    } catch (e) {
      console.error(e);
      setError("Įvyko klaida įkeliant nuotrauką.");
    } finally {
      setUploading(false);
    }
  }

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
          priceFrom: priceFrom ? Number(priceFrom) : null,
          imageUrl: imageUrl || null,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setError(json?.error || "Nepavyko išsaugoti paslaugos.");
        return;
      }

      setSuccess("Paslauga sėkmingai atnaujinta.");
      startTransition(() => {
        router.push("/dashboard/services");
        router.refresh();
      });
    } catch (e) {
      console.error(e);
      setError("Serverio klaida.");
    }
  }

  async function handleDelete() {
    const ok = window.confirm(
      "Ar tikrai nori ištrinti šią paslaugą? Šio veiksmo atšaukti nebus galima."
    );
    if (!ok) return;

    try {
      const res = await fetch(`/api/dashboard/services/${initial.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.error || "Nepavyko ištrinti paslaugos.");
        return;
      }

      startTransition(() => {
        router.push("/dashboard/services");
        router.refresh();
      });
    } catch (e) {
      console.error(e);
      setError("Serverio klaida.");
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {error && <p className={styles.errorText}>{error}</p>}
      {success && <p className={styles.successText}>{success}</p>}

      {/* PAGRINDINĖ INFORMACIJA */}
      <section className={styles.sectionCard}>
        <h2 className={styles.sectionTitle}>Pagrindinė informacija</h2>

        <div className={styles.formGroup}>
          <label className={styles.label}>Paslaugos pavadinimas</label>
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
            rows={6}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
          <div className={styles.charHint}>
            {description.length} / 2000 simbolių
          </div>
        </div>
      </section>

      {/* DETALĖS IR KAINA */}
      <section className={styles.sectionCard}>
        <h2 className={styles.sectionTitle}>Detalės ir kaina</h2>

        <div className={styles.formRow}>
          <div className={styles.formCol}>
            <label className={styles.label}>Miestas</label>
            <select
              className={styles.select}
              value={cityId}
              onChange={(e) => setCityId(e.target.value)}
            >
              <option value="">Pasirinkti miestą</option>
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
              <option value="">Pasirinkti kategoriją</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.priceRow}>
          <label className={styles.label}>Kaina nuo</label>
          <div className={styles.priceInput}>
            <input
              type="number"
              min={0}
              value={priceFrom}
              onChange={(e) => setPriceFrom(e.target.value)}
              placeholder="Pvz. 555"
            />
            <span>NOK</span>
          </div>
        </div>
      </section>

      {/* NUOTRAUKOS */}
      <section className={styles.sectionCard}>
        <h2 className={styles.sectionTitle}>Nuotraukos</h2>

        <div className={styles.uploadRow}>
          <label className={styles.uploadBtn}>
            {uploading ? "Įkeliama..." : "Įkelti nuotrauką"}
            <input
              type="file"
              accept="image/*"
              disabled={uploading || pending}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
                e.currentTarget.value = "";
              }}
            />
          </label>

          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => setImageUrl("")}
            disabled={uploading || pending}
          >
            Pašalinti nuotrauką
          </button>
        </div>

        <div className={styles.imagePreview}>
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="Nuotraukos peržiūra" />
          ) : (
            <div className={styles.emptyState}>
              <svg
                className={styles.emptyIcon}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>

              <span className={styles.emptyText}>Nuotrauka neįkelta</span>
            </div>
          )}
        </div>

        <p className={styles.helpText}>
          Rekomenduojamas formatas: JPG / PNG / WEBP. Maks. 5MB.
        </p>
      </section>

      {/* ACTIONS */}
      <div className={styles.actionsBar}>
       <button
            type="button"
            className={styles.dangerButton}
            onClick={handleDelete}
            disabled={pending || uploading}
          >
            Ištrinti paslaugą
          </button>

        <div className={styles.actionsRight}>
        

          <button
            type="submit"
            className={styles.primaryButton}
            disabled={pending || uploading}
          >
            {pending ? "Saugoma..." : "Išsaugoti pakeitimus"}
          </button>
        </div>
      </div>
    </form>
  );
}
