// src/app/[locale]/dashboard/services/[id]/edit/EditServiceForm.tsx
"use client";

import Image from "next/image";
import { useMemo, useState, FormEvent, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
  locale: string;
  title: string;
  description: string;
  categoryId: string;
  responseTime?: string | null;

  locationPostcode: string;
  locationCity: string;
  locationRegion?: string;

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
  categories,
}: Props) {
  const t = useTranslations("dashboardEditServiceForm");
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? initial.locale ?? "lt";

  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);

  const [categoryId, setCategoryId] = useState(initial.categoryId || "");
  const [responseTime, setResponseTime] = useState(initial.responseTime ?? "1h");

  const [locationPostcode, setLocationPostcode] = useState(
    initial.locationPostcode || "",
  );
  const [locationCity, setLocationCity] = useState(
    initial.locationCity || "",
  );
  const [locationRegion, setLocationRegion] = useState(
    initial.locationRegion || "",
  );

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
      setError(t("maxImages", { max: MAX_IMAGES }));
      return;
    }

    setUploading(true);

    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();

      if (userErr || !userData.user) {
        setError(t("mustBeLoggedIn"));
        return;
      }

      const userId = userData.user.id;
      const selected = files.slice(0, remainingSlots);
      const uploaded: GalleryItem[] = [];

      for (const file of selected) {
        if (!file.type.startsWith("image/")) {
          throw new Error(t("fileNotImage"));
        }

        if (file.size > 10 * 1024 * 1024) {
          throw new Error(t("fileTooLargeBefore"));
        }

        const random = window.crypto.randomUUID();

        const compressed = await compressImageFile(file, {
          maxWidth: 1600,
          maxHeight: 1600,
          quality: 0.82,
          mimeType: "image/jpeg",
        });

        if (compressed.size > 3 * 1024 * 1024) {
          throw new Error(t("fileTooLargeAfter"));
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
          throw new Error(uploadError.message || t("uploadFailed"));
        }

        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);

        if (!data?.publicUrl) {
          throw new Error(t("urlFailed"));
        }

        uploaded.push({
          url: data.publicUrl,
          path,
        });
      }

      if (!uploaded.length) {
        setError(t("uploadFailed"));
        return;
      }

      setGallery((prev) => [...prev, ...uploaded]);
      setSuccess(t("imagesUploaded"));
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : t("genericError"));
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
          locale,
          title: title.trim(),
          description: description.trim(),
          locationPostcode: locationPostcode.trim(),
          locationCity: locationCity.trim(),
          locationRegion: locationRegion.trim(),
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
        setError((json as any)?.error || t("saveFailed"));
        return;
      }

      setGallery(cleanGallery);
      setSuccess(t("saved"));

      startTransition(() => {
        router.push(`/${locale}/dashboard/services`);
        router.refresh();
      });
    } catch (e) {
      console.error(e);
      setError(t("serverError"));
    }
  }

  async function handleDelete() {
    const ok = window.confirm(t("deleteConfirm"));
    if (!ok) return;

    setError(null);
    setSuccess(null);

    try {
      const res = await csrfFetch(`/api/dashboard/services/${initial.id}`, {
        method: "DELETE",
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setError((json as any)?.error || t("deleteFailed"));
        return;
      }

      startTransition(() => {
        router.push(`/${locale}/dashboard/services`);
        router.refresh();
      });
    } catch (e) {
      console.error(e);
      setError(t("serverError"));
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
        setError((json as any)?.error || t("toggleFailed"));
        return;
      }

      setSuccess(next ? t("enabled") : t("disabled"));
    } catch (e) {
      console.error(e);
      setIsActive(!next);
      setError(t("serverError"));
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {(error || success) && (
        <div className={styles.messageStack}>
          {error && <p className={styles.errorText}>{error}</p>}
          {success && <p className={styles.successText}>{success}</p>}
        </div>
      )}

      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionNumber}>1</div>
          <h2 className={styles.sectionTitle}>{t("mainInfo")}</h2>
        </div>

        <div className={styles.sectionBody}>
          <div className={styles.formGroup}>
            <label className={styles.label}>{t("titleLabel")}</label>
            <input
              className={styles.input}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>{t("descriptionLabel")}</label>
            <textarea
              className={styles.textarea}
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
            <div className={styles.charHint}>{description.length} / 4000</div>
          </div>
        </div>
      </section>

      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionNumber}>2</div>
          <h2 className={styles.sectionTitle}>{t("whyChooseTitle")}</h2>
        </div>

        <div className={styles.sectionBody}>
          <div className={styles.formGroup}>
            <label className={styles.label}>{t("highlightsLabel")}</label>
            <textarea
              className={styles.textarea}
              rows={5}
              value={highlightsText}
              onChange={(e) => setHighlightsText(e.target.value)}
              placeholder={t("highlightsPlaceholder")}
            />
            <div className={styles.charHint}>
              {t("pointsCount", { count: highlightsPreview.length })}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionNumber}>3</div>
          <h2 className={styles.sectionTitle}>{t("detailsAndPrices")}</h2>
        </div>

        <div className={styles.sectionBody}>
          <div className={styles.formRow}>
            <div className={styles.formCol}>
              <label className={styles.label}>Postcode *</label>
              <input
                className={styles.input}
                value={locationPostcode}
                onChange={(e) => setLocationPostcode(e.target.value)}
                placeholder="1396"
                required
              />
            </div>

            <div className={styles.formCol}>
              <label className={styles.label}>City *</label>
              <input
                className={styles.input}
                value={locationCity}
                onChange={(e) => setLocationCity(e.target.value)}
                placeholder="Billingstad"
                required
              />
            </div>

            <div className={styles.formCol}>
              <label className={styles.label}>Region</label>
              <input
                className={styles.input}
                value={locationRegion}
                onChange={(e) => setLocationRegion(e.target.value)}
                placeholder="Akershus"
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>{t("categoryLabel")}</label>
            <select
              className={styles.select}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">{t("selectCategory")}</option>
              {(categories ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>{t("responseTimeLabel")}</label>
            <select
              className={styles.select}
              value={responseTime}
              onChange={(e) => setResponseTime(e.target.value)}
            >
              <option value="1h">{t("response1h")}</option>
              <option value="24h">{t("response24h")}</option>
              <option value="48h">{t("response48h")}</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>{t("priceItemsTitle")}</label>

            <div className={styles.priceList}>
              {priceItems.map((item, index) => (
                <div key={index} className={styles.priceCard}>
                  <input
                    className={styles.input}
                    value={item.label}
                    onChange={(e) =>
                      updatePriceItem(index, "label", e.target.value)
                    }
                    placeholder={t("priceItemNamePlaceholder")}
                  />

                  <input
                    className={styles.input}
                    value={item.priceText}
                    onChange={(e) =>
                      updatePriceItem(index, "priceText", e.target.value)
                    }
                    placeholder={t("priceItemPricePlaceholder")}
                  />

                  <input
                    className={styles.input}
                    value={item.note}
                    onChange={(e) =>
                      updatePriceItem(index, "note", e.target.value)
                    }
                    placeholder={t("priceItemNotePlaceholder")}
                  />

                  <div className={styles.inlineActions}>
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={() => removePriceItem(index)}
                      disabled={priceItems.length <= 1}
                    >
                      {t("removePriceRow")}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.inlineActions}>
              <button
                type="button"
                className={styles.addRowButton}
                onClick={addPriceItem}
              >
                + {t("addPriceRow")}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionNumber}>4</div>
          <h2 className={styles.sectionTitle}>{t("imagesTitle")}</h2>
        </div>

        <div className={styles.sectionBody}>
          <div className={styles.uploadRow}>
            <label className={styles.uploadBtn}>
              {uploading ? t("uploading") : t("uploadButton")}
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

          <div className={styles.imagePreview}>
            {gallery.length > 0 ? (
              gallery.map((img, idx) => (
                <div key={img.path} className={styles.imageCard}>
                  <div className={styles.imageThumb}>
                    <Image
                      src={img.url}
                      alt={`${t("imageAlt")} ${idx + 1}`}
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
                    {t("removeImage")}
                  </button>
                </div>
              ))
            ) : (
              <div className={styles.emptyState}>
                <span className={styles.emptyText}>{t("noImages")}</span>
              </div>
            )}
          </div>

          <p className={styles.helpText}>{t("imagesHelp")}</p>
        </div>
      </section>

      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionNumber}>5</div>
          <h2 className={styles.sectionTitle}>{t("activityTitle")}</h2>
        </div>

        <div className={styles.sectionBody}>
          <div className={styles.activityRow}>
            <span className={styles.statusText}>
              {t("statusLabel")}{" "}
              <strong>{isActive ? t("statusActive") : t("statusInactive")}</strong>
            </span>

            <button
              type="button"
              className={styles.secondaryButton}
              onClick={handleToggleActive}
              disabled={uploading || pending}
            >
              {isActive ? t("disableButton") : t("enableButton")}
            </button>
          </div>
        </div>
      </section>

      <div className={styles.actionsBar}>
        <button
          type="button"
          className={styles.dangerButton}
          onClick={handleDelete}
          disabled={pending || uploading}
        >
          {t("deleteButton")}
        </button>

        <div className={styles.actionsRight}>
          <button
            type="submit"
            className={styles.primaryButton}
            disabled={pending || uploading}
          >
            {pending ? t("saving") : t("saveButton")}
          </button>
        </div>
      </div>
    </form>
  );
}