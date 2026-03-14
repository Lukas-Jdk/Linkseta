// src/app/[locale]/dashboard/services/[id]/edit/EditServiceForm.tsx
"use client";

import Image from "next/image";
import { useMemo, useState, FormEvent, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { csrfFetch } from "@/lib/csrfClient";
import { compressImageFile } from "@/lib/imageCompress";
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
  imagePath: string | null;
  highlights: string[];
  isActive?: boolean;
  galleryImageUrls?: string[];
  galleryImagePaths?: string[];
};

type Props = {
  initial: InitialData;
  cities: Option[];
  categories: Option[];
};

type GalleryItem = {
  url: string;
  path: string;
};

const BUCKET = "service-images";
const MAX_IMAGES = 15;

function parseHighlights(text: string) {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 6);
}

function normalizeGallery(
  urls?: string[],
  paths?: string[],
): GalleryItem[] {
  if (!Array.isArray(urls) || urls.length === 0) return [];

  return urls
    .map((url, idx) => ({
      url: String(url ?? "").trim(),
      path: String(paths?.[idx] ?? "").trim(),
    }))
    .filter((item) => item.url.length > 0 && item.path.length > 0);
}

export default function EditServiceForm({
  initial,
  cities,
  categories,
}: Props) {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "lt";

  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [cityId, setCityId] = useState(initial.cityId || "");
  const [categoryId, setCategoryId] = useState(initial.categoryId || "");
  const [priceFrom, setPriceFrom] = useState(
    initial.priceFrom != null ? String(initial.priceFrom) : "",
  );

  const [highlightsText, setHighlightsText] = useState(
    (initial.highlights ?? []).join("\n"),
  );

  const highlightsPreview = useMemo(
    () => parseHighlights(highlightsText),
    [highlightsText],
  );

  const [gallery, setGallery] = useState<GalleryItem[]>(
    normalizeGallery(initial.galleryImageUrls, initial.galleryImagePaths),
  );

  const [uploading, setUploading] = useState(false);
  const [isActive, setIsActive] = useState<boolean>(initial.isActive ?? true);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;

    setError(null);
    setSuccess(null);

    const remainingSlots = MAX_IMAGES - gallery.length;
    if (remainingSlots <= 0) {
      setError(`Galima įkelti daugiausia ${MAX_IMAGES} nuotraukų.`);
      return;
    }

    setUploading(true);

    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) {
        setError("Turite būti prisijungęs, kad įkeltumėte nuotraukas.");
        return;
      }

      const userId = userData.user.id;
      const selected = Array.from(files).slice(0, remainingSlots);
      const uploaded: GalleryItem[] = [];

      for (const file of selected) {
        if (!file.type.startsWith("image/")) {
          throw new Error("Pasirinkite paveikslėlį (JPG / PNG / WEBP).");
        }

        if (file.size > 10 * 1024 * 1024) {
          throw new Error(
            "Nuotrauka per didelė. Maksimaliai 10MB prieš suspaudimą.",
          );
        }

        const random = window.crypto.randomUUID();

        const compressed = await compressImageFile(file, {
          maxWidth: 1600,
          maxHeight: 1600,
          quality: 0.82,
          mimeType: "image/jpeg",
        });

        if (compressed.size > 3 * 1024 * 1024) {
          throw new Error(
            "Suspausta nuotrauka vis dar per didelė. Pasirinkite mažesnę.",
          );
        }

        const path = `${userId}/services/${random}.jpg`;

        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(path, compressed, {
            cacheControl: "31536000",
            upsert: false,
            contentType: "image/jpeg",
          });

        if (uploadError) {
          throw new Error("Nepavyko įkelti nuotraukos.");
        }

        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);

        if (!data?.publicUrl) {
          throw new Error("Nepavyko gauti nuotraukos URL.");
        }

        uploaded.push({
          url: data.publicUrl,
          path,
        });
      }

      setGallery((prev) => [...prev, ...uploaded]);
      setSuccess("Nuotraukos įkeltos. Nepamirškite išsaugoti pakeitimų.");
    } catch (e) {
      console.error(e);
      setError(
        e instanceof Error
          ? e.message
          : "Įvyko klaida įkeliant nuotrauką.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const highlights = parseHighlights(highlightsText);

    const cleanGallery = gallery.filter(
      (item) => item.url.trim().length > 0 && item.path.trim().length > 0,
    );

    try {
      const res = await csrfFetch(`/api/dashboard/services/${initial.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          cityId: cityId || null,
          categoryId: categoryId || null,
          priceFrom: priceFrom ? Number(priceFrom) : null,
          galleryImageUrls: cleanGallery.map((x) => x.url),
          galleryImagePaths: cleanGallery.map((x) => x.path),
          highlights,
          isActive,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setError((json as any)?.error || "Nepavyko išsaugoti paslaugos.");
        return;
      }

      setGallery(cleanGallery);
      setSuccess("Paslauga sėkmingai atnaujinta.");

      startTransition(() => {
        router.push(`/${locale}/dashboard/services`);
        router.refresh();
      });
    } catch (e) {
      console.error(e);
      setError("Serverio klaida.");
    }
  }

  async function handleDelete() {
    const ok = window.confirm(
      "Ar tikrai nori ištrinti šią paslaugą? (Soft delete: paslauga dings iš sąrašo.)",
    );
    if (!ok) return;

    setError(null);
    setSuccess(null);

    try {
      const res = await csrfFetch(`/api/dashboard/services/${initial.id}`, {
        method: "DELETE",
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setError((json as any)?.error || "Nepavyko ištrinti paslaugos.");
        return;
      }

      startTransition(() => {
        router.push(`/${locale}/dashboard/services`);
        router.refresh();
      });
    } catch (e) {
      console.error(e);
      setError("Serverio klaida.");
    }
  }

  async function handleToggleActive() {
    setError(null);
    setSuccess(null);

    const next = !isActive;
    setIsActive(next);

    try {
      const res = await csrfFetch(`/api/dashboard/services/${initial.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: next }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setIsActive(!next);
        setError((json as any)?.error || "Nepavyko pakeisti aktyvumo.");
        return;
      }

      setSuccess(next ? "Paslauga įjungta." : "Paslauga išjungta.");
    } catch (e) {
      console.error(e);
      setIsActive(!next);
      setError("Serverio klaida.");
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
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

      <section className={styles.sectionCard}>
        <h2 className={styles.sectionTitle}>
          Kodėl verta rinktis šią paslaugą?
        </h2>

        <div className={styles.formGroup}>
          <label className={styles.label}>
            Privalumai (1 eilutė = 1 punktas)
          </label>
          <textarea
            className={styles.textarea}
            rows={5}
            value={highlightsText}
            onChange={(e) => setHighlightsText(e.target.value)}
            placeholder={"Pvz:\nGreita komunikacija\nGarantija\nAiškūs terminai"}
          />
          <div className={styles.charHint}>
            Punktų: {highlightsPreview.length} / 6
          </div>
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
          <label className={styles.label}>Kaina nuo:</label>
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

      <section className={styles.sectionCard}>
        <h2 className={styles.sectionTitle}>Nuotraukos</h2>

        <div className={styles.uploadRow}>
          <label className={styles.uploadBtn}>
            {uploading ? "Įkeliama..." : "Įkelti nuotraukas"}
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={uploading || pending}
              onChange={(e) => {
                void handleUpload(e.target.files);
                e.currentTarget.value = "";
              }}
            />
          </label>
        </div>

        <div
          className={styles.imagePreview}
          style={{
            height: "auto",
            minHeight: 240,
            padding: 12,
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "flex-start",
            justifyContent: "flex-start",
          }}
        >
          {gallery.length > 0 ? (
            gallery.map((img, idx) => (
              <div
                key={img.path}
                style={{ display: "flex", flexDirection: "column", gap: 8 }}
              >
                <div
                  style={{
                    position: "relative",
                    width: 180,
                    height: 130,
                    borderRadius: 12,
                    overflow: "hidden",
                  }}
                >
                  <Image
                    src={img.url}
                    alt={`Nuotrauka ${idx + 1}`}
                    fill
                    sizes="180px"
                    style={{ objectFit: "cover" }}
                  />
                </div>

                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => {
                    setGallery((prev) =>
                      prev.filter((x) => x.path !== img.path),
                    );
                  }}
                  disabled={uploading || pending}
                >
                  Pašalinti
                </button>
              </div>
            ))
          ) : (
            <div className={styles.emptyState}>
              <span className={styles.emptyText}>Nuotraukų nėra</span>
            </div>
          )}
        </div>

        <p className={styles.helpText}>
          Galite įkelti kelias nuotraukas. Maks. 10MB prieš suspaudimą.
        </p>
        {error && <p className={styles.errorText}>{error}</p>}
        {success && <p className={styles.successText}>{success}</p>}
      </section>

      <section className={styles.sectionCard}>
        <h2 className={styles.sectionTitle}>Aktyvumas</h2>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span>
            Statusas: <strong>{isActive ? "Aktyvi" : "Išjungta"}</strong>
          </span>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={handleToggleActive}
            disabled={uploading || pending}
          >
            {isActive ? "Išjungti" : "Įjungti"}
          </button>
        </div>
      </section>

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