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

type PriceItem = {
  label: string;
  priceText: string;
  note: string;
};

type InitialData = {
  id: string;
  title: string;
  description: string;
  cityId: string;
  categoryId: string;
  responseTime?: string | null;
  priceItems?: PriceItem[];
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

function normalizeInitialGallery(
  urls?: string[],
  paths?: string[],
): GalleryItem[] {
  if (!Array.isArray(urls) || !Array.isArray(paths)) return [];

  const len = Math.min(urls.length, paths.length);

  const out: GalleryItem[] = [];

  for (let i = 0; i < len; i += 1) {
    const url = String(urls[i] ?? "").trim();
    const path = String(paths[i] ?? "").trim();

    if (!url || !path) continue;

    out.push({ url, path });
  }

  return out;
}

function emptyPriceItem(): PriceItem {
  return {
    label: "",
    priceText: "",
    note: "",
  };
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
  const [responseTime, setResponseTime] = useState(initial.responseTime ?? "1h");

  const [priceItems, setPriceItems] = useState<PriceItem[]>(
    Array.isArray(initial.priceItems) && initial.priceItems.length > 0
      ? initial.priceItems.map((item) => ({
          label: String(item?.label ?? ""),
          priceText: String(item?.priceText ?? ""),
          note: String(item?.note ?? ""),
        }))
      : [emptyPriceItem()],
  );

  const [highlightsText, setHighlightsText] = useState(
    (initial.highlights ?? []).join("\n"),
  );

  const highlightsPreview = useMemo(
    () => parseHighlights(highlightsText),
    [highlightsText],
  );

  const [gallery, setGallery] = useState<GalleryItem[]>(
    normalizeInitialGallery(initial.galleryImageUrls, initial.galleryImagePaths),
  );

  const [uploading, setUploading] = useState(false);
  const [isActive, setIsActive] = useState<boolean>(initial.isActive ?? true);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function updatePriceItem(
    index: number,
    key: keyof PriceItem,
    value: string,
  ) {
    setPriceItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
    );
  }

  function addPriceItem() {
    setPriceItems((prev) => [...prev, emptyPriceItem()]);
  }

  function removePriceItem(index: number) {
    setPriceItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleUpload(files: File[]) {
    if (!files.length) return;

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
      const selected = files.slice(0, remainingSlots);
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
          throw new Error(uploadError.message || "Nepavyko įkelti nuotraukos.");
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

      if (!uploaded.length) {
        setError("Nepavyko pridėti nuotraukų.");
        return;
      }

      setGallery((prev) => [...prev, ...uploaded]);
      setSuccess("Nuotraukos įkeltos. Nepamirškite išsaugoti pakeitimų.");
    } catch (e) {
      console.error(e);
      setError(
        e instanceof Error ? e.message : "Įvyko klaida įkeliant nuotrauką.",
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

    const cleanPriceItems = priceItems
      .map((item) => ({
        label: item.label.trim(),
        priceText: item.priceText.trim(),
        note: item.note.trim(),
      }))
      .filter((item) => item.label || item.priceText || item.note)
      .slice(0, 20);

    try {
      const res = await csrfFetch(`/api/dashboard/services/${initial.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          cityId: cityId || null,
          categoryId: categoryId || null,
          responseTime,
          priceItems: cleanPriceItems,
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
        <h2 className={styles.sectionTitle}>Detalės ir kainos</h2>

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

        <div className={styles.formGroup} style={{ marginTop: 16 }}>
          <label className={styles.label}>Atsakymo laikas</label>
          <select
            className={styles.select}
            value={responseTime}
            onChange={(e) => setResponseTime(e.target.value)}
          >
            <option value="1h">Per 1 val.</option>
            <option value="24h">Per 24 val.</option>
            <option value="48h">Per 48 val.</option>
          </select>
        </div>

        <div className={styles.formGroup} style={{ marginTop: 16 }}>
          <label className={styles.label}>Papildomos kainų eilutės</label>

          <div style={{ display: "grid", gap: 12 }}>
            {priceItems.map((item, index) => (
              <div
                key={index}
                style={{
                  border: "1px solid rgba(15, 23, 42, 0.08)",
                  borderRadius: 14,
                  padding: 12,
                  display: "grid",
                  gap: 10,
                  background: "#fff",
                }}
              >
                <input
                  className={styles.input}
                  value={item.label}
                  onChange={(e) =>
                    updatePriceItem(index, "label", e.target.value)
                  }
                  placeholder="Pvz. Landing Page"
                />
                <input
                  className={styles.input}
                  value={item.priceText}
                  onChange={(e) =>
                    updatePriceItem(index, "priceText", e.target.value)
                  }
                  placeholder="Pvz. Nuo 800 NOK"
                />
                <input
                  className={styles.input}
                  value={item.note}
                  onChange={(e) =>
                    updatePriceItem(index, "note", e.target.value)
                  }
                  placeholder="Pvz. Priklauso nuo funkcionalumo"
                />

                <div>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => removePriceItem(index)}
                    disabled={priceItems.length <= 1}
                  >
                    Pašalinti kainos eilutę
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 12 }}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={addPriceItem}
            >
              Pridėti kainos eilutę
            </button>
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
                const files = e.currentTarget.files
                  ? Array.from(e.currentTarget.files)
                  : [];

                e.currentTarget.value = "";
                void handleUpload(files);
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
                    style={{
                      objectFit: "cover",
                    }}
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