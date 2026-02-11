// src/app/dashboard/services/new/NewServiceForm.tsx
"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import styles from "./NewServiceForm.module.css";

type Option = {
  id: string;
  name: string;
};

type Props = {
  cities: Option[];
  categories: Option[];
};

const BUCKET = "service-images";

function parseHighlights(text: string) {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 6);
}

export default function NewServiceForm({ cities, categories }: Props) {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cityId, setCityId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [priceFrom, setPriceFrom] = useState<string>("");

  const [highlightsText, setHighlightsText] = useState("");

  const highlightsPreview = useMemo(
    () => parseHighlights(highlightsText),
    [highlightsText]
  );

  
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
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
      const path = `services/new/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { cacheControl: "3600", upsert: false });

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
      setSuccess("Nuotrauka įkelta.");
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

    if (!title || !description) {
      setError("Pavadinimas ir aprašymas yra privalomi.");
      return;
    }

    const highlights = parseHighlights(highlightsText);

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
          priceFrom: priceFrom ? Number(priceFrom) : null,
          imageUrl: imageUrl || null,
          highlights,
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

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("Serverio klaida. Bandykite dar kartą.");
    } finally {
      setIsSubmitting(false);
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
          <label className={styles.label}>Paslaugos pavadinimas*</label>
          <input
            className={styles.input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Pvz.: Profesionalios buhalterinės paslaugos"
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Aprašymas*</label>
          <textarea
            className={styles.textarea}
            rows={6}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Išsamiai aprašykite savo teikiamą paslaugą..."
            required
          />
          <div className={styles.charHint}>
            {description.length} / 2000 simbolių
          </div>
        </div>
      </section>

   
      <section className={styles.sectionCard}>
        <h2 className={styles.sectionTitle}>Kodėl verta rinktis šią paslaugą?</h2>

        <div className={styles.formGroup}>
          <label className={styles.label}>
            Privalumai (1 eilutė = 1 punktas, max 6)
          </label>

          <textarea
            className={styles.textarea}
            rows={5}
            value={highlightsText}
            onChange={(e) => setHighlightsText(e.target.value)}
            placeholder={"Pvz:\nGreita komunikacija\nSutarti terminai\nGarantija darbams"}
          />

          <div className={styles.hintsRow}>
            <span className={styles.smallHint}>
              Rodoma kaip „checklist“ tavo paslaugos puslapyje.
            </span>
            <span className={styles.smallHint}>
              Punktų: {highlightsPreview.length} / 6
            </span>
          </div>

          {highlightsPreview.length > 0 && (
            <div className={styles.previewBox}>
              <div className={styles.previewTitle}>Peržiūra:</div>
              <ul className={styles.previewList}>
                {highlightsPreview.map((h, i) => (
                  <li key={i}>✅ {h}</li>
                ))}
              </ul>
            </div>
          )}
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
              className={styles.priceField}
              type="number"
              min={0}
              inputMode="numeric"
              value={priceFrom}
              onChange={(e) => setPriceFrom(e.target.value)}
              placeholder="0.00"
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
              disabled={uploading || isSubmitting}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleUpload(f);
                e.currentTarget.value = "";
              }}
            />
          </label>

          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => setImageUrl("")}
            disabled={uploading || isSubmitting}
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

      <div className={styles.actionsBar}>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => router.push("/dashboard")}
          disabled={isSubmitting || uploading}
        >
          Atšaukti
        </button>

        <button
          type="submit"
          className={styles.primaryButton}
          disabled={isSubmitting || uploading}
        >
          {isSubmitting ? "Kuriama..." : "Sukurti paslaugą"}
        </button>
      </div>
    </form>
  );
}
