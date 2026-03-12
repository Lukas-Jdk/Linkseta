// src/app/[locale]/dashboard/services/new/NewServiceForm.tsx
"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { csrfFetch } from "@/lib/csrfClient";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { compressImageFile } from "@/lib/imageCompress";
import styles from "./NewServiceForm.module.css";

type Option = { id: string; name: string; slug?: string };

type Props = {
  cities: Option[];
  categories: Option[];
};

type GalleryItem = {
  url: string;
  path: string;
};

const MAX_IMAGES = 15;

function trimOrEmpty(v: string) {
  return v.trim();
}

function publicStorageUrl(baseUrl: string, bucket: string, path: string) {
  return `${baseUrl}/storage/v1/object/public/${bucket}/${path}`;
}

export default function NewServiceForm({ cities, categories }: Props) {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "lt";

  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [title, setTitle] = useState("");
  const [cityId, setCityId] = useState(cities?.[0]?.id ?? "");
  const [categoryId, setCategoryId] = useState(categories?.[0]?.id ?? "");
  const [priceFrom, setPriceFrom] = useState<string>("");
  const [description, setDescription] = useState("");

  const [h1, setH1] = useState("");
  const [h2, setH2] = useState("");
  const [h3, setH3] = useState("");

  const [uploading, setUploading] = useState(false);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const highlights = useMemo(() => {
    return [h1, h2, h3].map(trimOrEmpty).filter(Boolean).slice(0, 3);
  }, [h1, h2, h3]);

  const canSubmit = useMemo(() => {
    return (
      title.trim().length >= 3 &&
      description.trim().length >= 10 &&
      Boolean(cityId) &&
      Boolean(categoryId) &&
      !submitting &&
      !uploading
    );
  }, [title, description, cityId, categoryId, submitting, uploading]);

  async function handlePickImages(files: FileList | null) {
    if (!files || files.length === 0) return;

    setError(null);

    const remainingSlots = MAX_IMAGES - gallery.length;
    if (remainingSlots <= 0) {
      setError(`Galima įkelti daugiausia ${MAX_IMAGES} nuotraukų.`);
      return;
    }

    const selected = Array.from(files).slice(0, remainingSlots);
    setUploading(true);

    try {
      const bucket = "service-images";

      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) {
        setError("Turite būti prisijungęs, kad įkeltumėte nuotraukas.");
        return;
      }

      const userId = userData.user.id;
      const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

      const uploaded: GalleryItem[] = [];

      for (const file of selected) {
        if (!file.type.startsWith("image/")) {
          throw new Error("Vienas iš failų nėra nuotrauka.");
        }

        if (file.size > 10 * 1024 * 1024) {
          throw new Error("Viena iš nuotraukų per didelė (max ~10MB prieš suspaudimą).");
        }

        const compressed = await compressImageFile(file, {
          maxWidth: 1600,
          maxHeight: 1600,
          quality: 0.82,
          mimeType: "image/jpeg",
        });

        if (compressed.size > 3 * 1024 * 1024) {
          throw new Error("Viena iš suspaustų nuotraukų vis dar per didelė.");
        }

        const fileName = `${crypto.randomUUID()}.jpg`;
        const path = `${userId}/services/${fileName}`;

        const { error: upErr } = await supabase.storage.from(bucket).upload(path, compressed, {
          cacheControl: "31536000",
          upsert: false,
          contentType: "image/jpeg",
        });

        if (upErr) {
          throw new Error(upErr.message || "Nepavyko įkelti vienos iš nuotraukų.");
        }

        uploaded.push({
          path,
          url: publicStorageUrl(baseUrl, bucket, path),
        });
      }

      setGallery((prev) => [...prev, ...uploaded]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Įvyko klaida keliant nuotraukas.");
    } finally {
      setUploading(false);
    }
  }

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
        highlights,
        galleryImageUrls: gallery.map((x) => x.url),
        galleryImagePaths: gallery.map((x) => x.path),
      };

      const res = await csrfFetch("/api/dashboard/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const msg =
          data?.error ??
          (res.status === 403 ? "Forbidden / CSRF check failed" : "Nepavyko sukurti paslaugos");
        throw new Error(msg);
      }

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
          <select className={styles.select} value={cityId} onChange={(e) => setCityId(e.target.value)}>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Kategorija</label>
          <select className={styles.select} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Kaina nuo: (NOK)</label>
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
          <div className={styles.highHeader}>
            <div className={styles.highTitle}>Kodėl rinktis mane? (nebūtina)</div>
            <div className={styles.highHint}>Gali įrašyti 1–3 punktus su ✅</div>
          </div>

          <div className={styles.highList}>
            <div className={styles.highRow}>
              <span className={styles.tick}>✅</span>
              <input
                className={styles.input}
                value={h1}
                onChange={(e) => setH1(e.target.value)}
                placeholder="Pvz. Greitas atvykimas"
                autoComplete="off"
              />
            </div>

            <div className={styles.highRow}>
              <span className={styles.tick}>✅</span>
              <input
                className={styles.input}
                value={h2}
                onChange={(e) => setH2(e.target.value)}
                placeholder="Pvz. 5 metų patirtis"
                autoComplete="off"
              />
            </div>

            <div className={styles.highRow}>
              <span className={styles.tick}>✅</span>
              <input
                className={styles.input}
                value={h3}
                onChange={(e) => setH3(e.target.value)}
                placeholder="Pvz. Garantija darbams"
                autoComplete="off"
              />
            </div>
          </div>
        </div>

        <div className={styles.fieldFull}>
          <label className={styles.label}>Galerijos nuotraukos (nebūtina)</label>

          <input
            className={styles.file}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              void handlePickImages(e.target.files);
              e.currentTarget.value = "";
            }}
          />

          {uploading && <div className={styles.muted}>Nuotraukos mažinamos ir įkeliamos...</div>}

          {gallery.length > 0 && (
            <div className={styles.preview} style={{ flexWrap: "wrap" }}>
              {gallery.map((img, idx) => (
                <div key={img.path} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <img src={img.url} alt={`Preview ${idx + 1}`} className={styles.previewImg} />
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => {
                      setGallery((prev) => prev.filter((x) => x.path !== img.path));
                    }}
                  >
                    Pašalinti
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && <div className={styles.errorInline}>{error}</div>}

      <button className={styles.submit} type="submit" disabled={!canSubmit}>
        {submitting ? "Kuriama..." : "Sukurti paslaugą"}
      </button>
    </form>
  );
}