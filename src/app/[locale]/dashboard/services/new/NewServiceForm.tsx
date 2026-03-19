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

const MAX_IMAGES = 15;

function trimOrEmpty(v: string) {
  return v.trim();
}

function publicStorageUrl(baseUrl: string, bucket: string, path: string) {
  return `${baseUrl}/storage/v1/object/public/${bucket}/${path}`;
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
          throw new Error(
            upErr.message || t("errors.uploadOneFailed"),
          );
        }

        uploaded.push({
          path,
          url: publicStorageUrl(baseUrl, bucket, path),
        });
      }

      setGallery((prev) => [...prev, ...uploaded]);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : t("errors.uploadGeneric"),
      );
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
          <label className={styles.label}>{t("priceLabel")}</label>
          <input
            className={styles.input}
            value={priceFrom}
            onChange={(e) => setPriceFrom(e.target.value)}
            placeholder={t("pricePlaceholder")}
            inputMode="numeric"
          />
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

          {uploading && (
            <div className={styles.muted}>
              {t("uploading")}
            </div>
          )}

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