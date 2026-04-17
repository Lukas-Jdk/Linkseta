// src/app/[locale]/dashboard/services/new/NewServiceForm.tsx
"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { csrfFetch } from "@/lib/csrfClient";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { compressImageFile } from "@/lib/imageCompress";
import styles from "./newService.module.css";

type Option = {
  id: string;
  name: string;
  postcode?: string | null;
};

type Props = {
  cities: Option[];
  categories: { id: string; name: string }[];
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

function normalizePriceNumber(value: string) {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return null;

  const parsed = Number.parseInt(digits, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;

  return parsed;
}

export default function NewServiceForm({ cities, categories }: Props) {
  const t = useTranslations("dashboardNewServiceForm");
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "lt";

  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [title, setTitle] = useState("");
  const [cityId, setCityId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [responseTime, setResponseTime] = useState("1h");

  const [priceMode, setPriceMode] = useState<"fixed" | "from">("from");
  const [mainPrice, setMainPrice] = useState("");

  const [locationPostcode, setLocationPostcode] = useState("");
  const [locationRegion, setLocationRegion] = useState("");

  const [h1, setH1] = useState("");
  const [h2, setH2] = useState("");
  const [h3, setH3] = useState("");

  const [priceItems, setPriceItems] = useState<PriceItem[]>([emptyPriceItem()]);

  const [uploading, setUploading] = useState(false);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const feedbackRef = useRef<HTMLDivElement | null>(null);

  const selectedCity = useMemo(
    () => cities.find((c) => c.id === cityId) ?? null,
    [cities, cityId],
  );

  const locationCity = selectedCity?.name?.trim() ?? "";

  const highlights = useMemo(() => {
    return [h1, h2, h3].map(trimOrEmpty).filter(Boolean).slice(0, 3);
  }, [h1, h2, h3]);

  const normalizedMainPrice = useMemo(
    () => normalizePriceNumber(mainPrice),
    [mainPrice],
  );

  const canSubmit = useMemo(() => {
    return (
      title.trim().length >= 3 &&
      description.trim().length >= 10 &&
      Boolean(cityId) &&
      Boolean(categoryId) &&
      Boolean(locationCity) &&
      Boolean(locationPostcode.trim()) &&
      !submitting &&
      !uploading
    );
  }, [
    title,
    description,
    cityId,
    categoryId,
    locationCity,
    locationPostcode,
    submitting,
    uploading,
  ]);

  useEffect(() => {
    if (!error && !success) return;

    feedbackRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [error, success]);

  function updatePriceItem(index: number, key: keyof PriceItem, value: string) {
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

  function handleCityChange(nextCityId: string) {
    const nextCity = cities.find((c) => c.id === nextCityId) ?? null;
    const nextCityPostcode = nextCity?.postcode?.trim() ?? "";

    setCityId(nextCityId);

    if (!locationPostcode.trim()) {
      setLocationPostcode(nextCityPostcode);
    }
  }

  async function handlePickImages(files: FileList | null) {
    if (!files || files.length === 0) return;

    setError(null);
    setSuccess(null);

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
      setSuccess(t("uploadSuccess"));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errors.uploadGeneric"));
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!locationCity || !locationPostcode.trim()) {
      setError(t("errors.invalidCityPostcode"));
      return;
    }

    if (!canSubmit) {
      setError(t("errors.missingRequired"));
      return;
    }

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
        categoryId,
        description: description.trim(),
        responseTime,
        highlights,
        priceMode,
        mainPrice: normalizedMainPrice,
        priceItems: cleanPriceItems,
        galleryImageUrls: gallery.map((x) => x.url),
        galleryImagePaths: gallery.map((x) => x.path),
        locationPostcode: locationPostcode.trim(),
        locationCity,
        locationRegion: locationRegion.trim(),
        cityId,
      };

      const res = await csrfFetch("/api/dashboard/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const msg =
          data?.error ??
          (res.status === 403
            ? t("errors.csrfOrForbidden")
            : t("errors.createFailed"));
        throw new Error(msg);
      }

      setSuccess(t("createSuccess"));
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
      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionNumber}>1</div>
          <h2 className={styles.sectionTitle}>{t("titleLabel")}</h2>
        </div>

        <div className={styles.sectionBody}>
          <div className={styles.formGroup}>
            <label className={styles.label}>{t("titleLabel")}</label>
            <input
              className={styles.input}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("titlePlaceholder")}
              autoComplete="off"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>{t("descriptionLabel")}</label>
            <textarea
              className={styles.textarea}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("descriptionPlaceholder")}
              rows={6}
            />
            <div className={styles.charHint}>{description.length} / 4000</div>
          </div>
        </div>
      </section>

      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionNumber}>2</div>
          <h2 className={styles.sectionTitle}>{t("highlightsTitle")}</h2>
        </div>

        <div className={styles.sectionBody}>
          <div className={styles.formGroup}>
            <div className={styles.highHeader}>
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
        </div>
      </section>

      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionNumber}>3</div>
          <h2 className={styles.sectionTitle}>{t("detailsLocationTitle")}</h2>
        </div>

        <div className={styles.sectionBody}>
          <div className={styles.formGroup}>
            <label className={styles.label}>{t("categoryLabel")}</label>
            <select
              className={styles.select}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">{t("selectCategory")}</option>
              {categories.map((c) => (
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
            <label className={styles.label}>{t("cityLabel")}</label>
            <select
              className={styles.select}
              value={cityId}
              onChange={(e) => handleCityChange(e.target.value)}
            >
              <option value="">{t("selectCity")}</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formCol}>
              <label className={styles.label}>{t("postcodeLabel")}</label>
              <input
                className={styles.input}
                value={locationPostcode}
                onChange={(e) => setLocationPostcode(e.target.value)}
                placeholder={t("postcodePlaceholder")}
              />
            </div>

            <div className={styles.formCol}>
              <label className={styles.label}>{t("regionLabel")}</label>
              <input
                className={styles.input}
                value={locationRegion}
                onChange={(e) => setLocationRegion(e.target.value)}
                placeholder={t("regionPlaceholder")}
              />
            </div>
          </div>
        </div>
      </section>

      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionNumber}>4</div>
          <h2 className={styles.sectionTitle}>{t("pricesSectionTitle")}</h2>
        </div>

        <div className={styles.sectionBody}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Orientacinė kaina kortelėje</label>

            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                marginBottom: 12,
              }}
            >
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setPriceMode("from")}
                style={{
                  background: priceMode === "from" ? "#0f172a" : undefined,
                  color: priceMode === "from" ? "#fff" : undefined,
                }}
              >
                Nuo
              </button>

              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setPriceMode("fixed")}
                style={{
                  background: priceMode === "fixed" ? "#0f172a" : undefined,
                  color: priceMode === "fixed" ? "#fff" : undefined,
                }}
              >
                Fiksuota
              </button>
            </div>

            <input
              className={styles.input}
              value={mainPrice}
              onChange={(e) => setMainPrice(e.target.value)}
              placeholder="Pvz. 600"
              inputMode="numeric"
            />

            <div className={styles.charHint}>
              Ši kaina bus rodoma kortelėje prieš atidarant paslaugą.
            </div>
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
          <div className={styles.sectionNumber}>5</div>
          <h2 className={styles.sectionTitle}>{t("galleryLabel")}</h2>
        </div>

        <div className={styles.sectionBody}>
          <div className={styles.uploadRow}>
            <label className={styles.uploadBtn}>
              {uploading ? t("uploading") : t("uploadButton")}
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  void handlePickImages(e.target.files);
                  e.currentTarget.value = "";
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
                      alt={t("previewAlt", { index: idx + 1 })}
                      fill
                      sizes="180px"
                      className={styles.previewImg}
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
                  >
                    {t("remove")}
                  </button>
                </div>
              ))
            ) : (
              <div className={styles.emptyState}>
                <span className={styles.emptyText}>{t("noImagesYet")}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className={styles.actionsBar} ref={feedbackRef}>
        <div style={{ flex: 1 }}>
          {error && <div className={styles.errorText}>{error}</div>}
          {success && <div className={styles.successText}>{success}</div>}
        </div>

        <div className={styles.actionsRight}>
          <button
            className={styles.primaryButton}
            type="submit"
            disabled={!canSubmit}
          >
            {submitting ? t("creating") : t("submit")}
          </button>
        </div>
      </div>
    </form>
  );
}