// src/app/[locale]/dashboard/services/new/NewServiceForm.tsx
"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { csrfFetch } from "@/lib/csrfClient";
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

function loginUrl(locale: string, nextPath: string) {
  return `/${locale}/login?next=${encodeURIComponent(nextPath)}`;
}

export default function NewServiceForm({ cities, categories }: Props) {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const pathname = usePathname();
  const locale = params?.locale ?? "lt";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cityId, setCityId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [priceFrom, setPriceFrom] = useState<string>("");

  const [highlightsText, setHighlightsText] = useState("");
  const highlightsPreview = useMemo(
    () => parseHighlights(highlightsText),
    [highlightsText],
  );

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");

  const [uploading, setUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  function onPickFile(file: File) {
    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("Pasirinkite paveikslėlį (JPG / PNG / WEBP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Nuotrauka per didelė. Maksimaliai 5MB.");
      return;
    }

    setImageFile(file);

    if (imagePreview) URL.revokeObjectURL(imagePreview);
    const url = URL.createObjectURL(file);
    setImagePreview(url);
  }

  async function uploadServiceImage(serviceId: string): Promise<{
    publicUrl: string;
    path: string;
  } | null> {
    if (!imageFile) return null;

    setUploading(true);
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) {
        setError("Turite būti prisijungęs, kad įkeltumėte nuotrauką.");
        return null;
      }

      const ext = imageFile.name.split(".").pop() || "jpg";
      const userId = userData.user.id;
      const path = `${userId}/services/${serviceId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, imageFile, { cacheControl: "3600", upsert: false });

      if (uploadError) {
        console.error(uploadError);
        setError("Nepavyko įkelti nuotraukos.");
        return null;
      }

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      if (!data?.publicUrl) {
        setError("Nepavyko gauti nuotraukos URL.");
        return null;
      }

      return { publicUrl: data.publicUrl, path };
    } catch (e) {
      console.error(e);
      setError("Įvyko klaida įkeliant nuotrauką.");
      return null;
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !description.trim()) {
      setError("Pavadinimas ir aprašymas yra privalomi.");
      return;
    }

    const highlights = parseHighlights(highlightsText);

    setIsSubmitting(true);
    try {
      // 1) create service (mutating -> csrfFetch)
      const res = await csrfFetch("/api/dashboard/services", {
        method: "POST",
        body: JSON.stringify({
          title,
          description,
          cityId: cityId || null,
          categoryId: categoryId || null,
          priceFrom: priceFrom ? Number(priceFrom) : null,
          imageUrl: null,
          imagePath: null,
          highlights,
        }),
      });

      if (res.status === 401) {
        router.push(loginUrl(locale, pathname));
        return;
      }
      if (res.status === 403) {
        setError("Neturite teikėjo statuso (DEMO planas / patvirtinimas).");
        return;
      }

      const json = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        setError(
          json?.error || "Nepavyko sukurti paslaugos. Bandykite dar kartą vėliau.",
        );
        return;
      }

      const serviceId = json.id as string;

      // 2) upload (supabase storage)
      const uploaded = await uploadServiceImage(serviceId);

      // 3) patch service with image (mutating -> csrfFetch)
      if (uploaded) {
        const patchRes = await csrfFetch(`/api/dashboard/services/${serviceId}`, {
          method: "PATCH",
          body: JSON.stringify({
            imageUrl: uploaded.publicUrl,
            imagePath: uploaded.path,
          }),
        });

        if (!patchRes.ok) {
          console.warn(
            "Image patch failed",
            await patchRes.text().catch(() => ""),
          );
        }
      }

      router.push(`/${locale}/dashboard`);
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
          <div className={styles.charHint}>{description.length} / 2000 simbolių</div>
        </div>
      </section>

      <section className={styles.sectionCard}>
        <h2 className={styles.sectionTitle}>Kodėl verta rinktis šią paslaugą?</h2>

        <div className={styles.formGroup}>
          <label className={styles.label}>Privalumai (1 eilutė = 1 punktas, max 6)</label>

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
            <span className={styles.smallHint}>Punktų: {highlightsPreview.length} / 6</span>
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
              placeholder="0"
            />
            <span>NOK</span>
          </div>
        </div>
      </section>

      <section className={styles.sectionCard}>
        <h2 className={styles.sectionTitle}>Nuotraukos</h2>

        <div className={styles.uploadRow}>
          <label className={styles.uploadBtn}>
            {uploading ? "Įkeliama..." : "Pasirinkti nuotrauką"}
            <input
              type="file"
              accept="image/*"
              disabled={uploading || isSubmitting}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onPickFile(f);
                e.currentTarget.value = "";
              }}
            />
          </label>

          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => {
              setImageFile(null);
              if (imagePreview) URL.revokeObjectURL(imagePreview);
              setImagePreview("");
            }}
            disabled={uploading || isSubmitting}
          >
            Pašalinti nuotrauką
          </button>
        </div>

        <div className={styles.imagePreview}>
          {imagePreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imagePreview} alt="Nuotraukos peržiūra" />
          ) : (
            <div className={styles.emptyState}>
              <span className={styles.emptyText}>Nuotrauka neįkelta</span>
            </div>
          )}
        </div>

        <p className={styles.helpText}>Rekomenduojamas formatas: JPG / PNG / WEBP. Maks. 5MB.</p>
      </section>

      <div className={styles.actionsBar}>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => router.push(`/${locale}/dashboard`)}
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