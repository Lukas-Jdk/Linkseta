// src/app/[locale]/dashboard/services/new/NewServiceForm.tsx
"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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

type PriceItem = {
  label: string;
  priceText: string;
  note: string;
};

const MAX_IMAGES = 15;

function trimOrEmpty(v: string) {
  return v.trim();
}

function publicStorageUrl(baseUrl: string, bucket: string, path: string) {
  return `${baseUrl}/storage/v1/object/public/${bucket}/${path}`;
}

function emptyPriceItem(): PriceItem {
  return {
    label: "",
    priceText: "",
    note: "",
  };
}

export default function NewServiceForm({ cities, categories }: Props) {
  const t = useTranslations("dashboardNewServiceForm");
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "lt";

  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [title, setTitle] = useState("");
  const [cityId, setCityId] = useState(cities?.[0]?.id ?? "");
  const [categoryId, setCategoryId] = useState(categories?.[0]?.id ?? "");
  const [description, setDescription] = useState("");
  const [responseTime, setResponseTime] = useState("1h");

  const [h1, setH1] = useState("");
  const [h2, setH2] = useState("");
  const [h3, setH3] = useState("");

  const [priceItems, setPriceItems] = useState<PriceItem[]>([
    emptyPriceItem(),
  ]);

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

  async function handlePickImages(files: FileList | null) {
    if (!files || files.length === 0) return;

    setError(null);

    const remainingSlots = MAX_IMAGES - gallery.length;
    if (remainingSlots <= 0) {
      setError(t("errors.maxImages", { max: MAX_IMAGES }));
      return;
    }

    const selected = Array.from(files).slice(0, remainingSlots);
    setUploading(true);

    try {
      const bucket = "service-images";

      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) {
        setError(t("errors.mustBeLoggedIn"));
        return;
      }

      const userId = userData.user.id;
      const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

      const uploaded: GalleryItem[] = [];

      for (const file of selected) {
        if (!file.type.startsWith("image/")) {
          throw new Error(t("errors.fileNotImage"));
        }

        if (file.size > 10 * 1024 * 1024) {
          throw new Error(t("errors.fileTooLargeBeforeCompression"));
        }

        const compressed = await compressImageFile(file, {
          maxWidth: 1600,
          maxHeight: 1600,
          quality: 0.82,
          mimeType: "image/jpeg",
        });

        if (compressed.size > 3 * 1024 * 1024) {
          throw new Error(t("errors.fileTooLargeAfterCompression"));
        }

        const fileName = `${crypto.randomUUID()}.jpg`;
        const path = `${userId}/services/${fileName}`;

        const { error: upErr } = await supabase.storage
          .from(bucket)
          .upload(path, compressed, {
            cacheControl: "31536000",
            upsert: false,
            contentType: "image/jpeg",
          });

        if (upErr) {
          throw new Error(upErr.message || t("errors.uploadOneFailed"));
        }

        uploaded.push({
          path,
          url: publicStorageUrl(baseUrl, bucket, path),
        });
      }

      setGallery((prev) => [...prev, ...uploaded]);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errors.uploadGeneric"));
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
      const cleanPriceItems = priceItems
        .map((item) => ({
          label: item.label.trim(),
          priceText: item.priceText.trim(),
          note: item.note.trim(),
        }))
        .filter((item) => item.label || item.priceText || item.note)
        .slice(0, 20);

      const payload = {
        title: title.trim(),
        cityId,
        categoryId,
        description: description.trim(),
        responseTime,
        highlights,
        priceItems: cleanPriceItems,
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
          (res.status === 403
            ? t("errors.csrfOrForbidden")
            : t("errors.createFailed"));
        throw new Error(msg);
      }

      router.push(`/${locale}/dashboard/services`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.generic"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <div className={styles.grid}>
        <div className={styles.field}>
          <label className={styles.label}>{t("titleLabel")}</label>
          <input
            className={styles.input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("titlePlaceholder")}
            autoComplete="off"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>{t("cityLabel")}</label>
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
          <label className={styles.label}>{t("categoryLabel")}</label>
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

        <div className={styles.fieldFull}>
          <label className={styles.label}>{t("descriptionLabel")}</label>
          <textarea
            className={styles.textarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("descriptionPlaceholder")}
            rows={6}
          />
        </div>

        <div className={styles.fieldFull}>
          <div className={styles.highHeader}>
            <div className={styles.highTitle}>{t("highlightsTitle")}</div>
            <div className={styles.highHint}>{t("highlightsHint")}</div>
          </div>

          <div className={styles.highList}>
            <div className={styles.highRow}>
              <span className={styles.tick}>✅</span>
              <input
                className={styles.input}
                value={h1}
                onChange={(e) => setH1(e.target.value)}
                placeholder={t("highlightPlaceholder1")}
                autoComplete="off"
              />
            </div>

            <div className={styles.highRow}>
              <span className={styles.tick}>✅</span>
              <input
                className={styles.input}
                value={h2}
                onChange={(e) => setH2(e.target.value)}
                placeholder={t("highlightPlaceholder2")}
                autoComplete="off"
              />
            </div>

            <div className={styles.highRow}>
              <span className={styles.tick}>✅</span>
              <input
                className={styles.input}
                value={h3}
                onChange={(e) => setH3(e.target.value)}
                placeholder={t("highlightPlaceholder3")}
                autoComplete="off"
              />
            </div>
          </div>
        </div>

        <div className={styles.fieldFull}>
          <label className={styles.label}>Kainos</label>

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
                    className={styles.removeBtn}
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
              className={styles.removeBtn}
              onClick={addPriceItem}
            >
              Pridėti kainos eilutę
            </button>
          </div>
        </div>

        <div className={styles.fieldFull}>
          <label className={styles.label}>{t("galleryLabel")}</label>

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

          {uploading && <div className={styles.muted}>{t("uploading")}</div>}

          {gallery.length > 0 && (
            <div className={styles.preview} style={{ flexWrap: "wrap" }}>
              {gallery.map((img, idx) => (
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
                      alt={t("previewAlt", { index: idx + 1 })}
                      fill
                      sizes="180px"
                      className={styles.previewImg}
                      style={{ objectFit: "cover" }}
                    />
                  </div>

                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => {
                      setGallery((prev) =>
                        prev.filter((x) => x.path !== img.path),
                      );
                    }}
                  >
                    {t("remove")}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && <div className={styles.errorInline}>{error}</div>}

      <button className={styles.submit} type="submit" disabled={!canSubmit}>
        {submitting ? t("creating") : t("submit")}
      </button>
    </form>
  );
}