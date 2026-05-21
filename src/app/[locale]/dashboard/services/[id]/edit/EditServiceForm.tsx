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

type GalleryItem = {
  url: string;
  path: string;
  altText?: string;
};

type ServiceBlock = {
  title: string;
  description: string;
  priceText: string;
  iconKey: string;
  images: GalleryItem[];
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
  priceMode: "fixed" | "from";
  mainPrice: string;
  priceItems?: PriceItem[];
  imageUrl: string | null;
  imagePath: string | null;
  brandLogoUrl: string | null;
  brandLogoPath: string | null;
  highlights: string[];
  isActive?: boolean;
  galleryImageUrls?: string[];
  galleryImagePaths?: string[];
  serviceBlocks?: ServiceBlock[];
};

type Props = {
  initial: InitialData;
  categories: Option[];
  maxImages: number;
  maxServiceBlocks: number;
};

const BUCKET = "service-images";
const MIN_DESCRIPTION_LENGTH = 10;

function getDescriptionMinError(locale: string) {
  if (locale === "en") return "Description must be at least 10 characters.";
  if (locale === "no") return "Beskrivelsen må være minst 10 tegn.";
  return "Aprašymas turi būti bent 10 simbolių.";
}

function getLocalText(locale: string) {
  if (locale === "en") {
    return {
      serviceBlocksTitle: "Photo gallery",
      serviceBlocksHint: "",
      blockTitle: "Gallery group name",
      blockTitlePlaceholder: "E.g. Floors, Windows, Terraces",
      blockDescription: "Gallery description",
      blockDescriptionPlaceholder: "Describe what is shown in this photo group",
      blockPrice: "Price for this group",
      blockPricePlaceholder: "E.g. from 250 NOK, 900 NOK / kg",
      addBlock: "Add gallery group",
      removeBlock: "Remove group",
      uploadBlockImages: "Upload photos",
      noBlockImages: "No photos in this group yet",
      galleryFallback: "Gallery",
      serviceFallback: "Service",
      logoLabel: "Logo",
      uploadLogo: "Upload logo",
      postcodeLabel: "Postcode *",
      cityLabel: "City *",
      regionLabel: "Region",
      maxBlocksError: "You have reached your gallery group limit",
      maxImagesError: "You have reached your photo limit",
      priceModeLabel: "Estimated price on card",
      from: "From",
      fixed: "Fixed",
      pricePlaceholder: "E.g. 600",
      priceHint: "This price is shown on the service card before opening it.",
    };
  }

  if (locale === "no") {
    return {
      serviceBlocksTitle: "Fotogalleri",
      serviceBlocksHint: "",
      blockTitle: "Gruppenavn",
      blockTitlePlaceholder: "F.eks. Gulv, Vinduer, Terrasser",
      blockDescription: "Beskrivelse av galleriet",
      blockDescriptionPlaceholder: "Beskriv hva som vises i denne bildegruppen",
      blockPrice: "Pris for denne gruppen",
      blockPricePlaceholder: "F.eks. fra 250 NOK, 900 NOK / kg",
      addBlock: "Legg til gallerigruppe",
      removeBlock: "Fjern gruppe",
      uploadBlockImages: "Last opp bilder",
      noBlockImages: "Ingen bilder i denne gruppen ennå",
      galleryFallback: "Galleri",
      serviceFallback: "Tjeneste",
      logoLabel: "Logo",
      uploadLogo: "Last opp logo",
      postcodeLabel: "Postnummer *",
      cityLabel: "By *",
      regionLabel: "Region",
      maxBlocksError: "Du har nådd grensen for gallerigrupper",
      maxImagesError: "Du har nådd bildegrensen",
      priceModeLabel: "Estimert pris på kortet",
      from: "Fra",
      fixed: "Fast",
      pricePlaceholder: "F.eks. 600",
      priceHint: "Denne prisen vises på tjenestekortet før åpning.",
    };
  }

  return {
    serviceBlocksTitle: "Nuotraukų galerija",
    serviceBlocksHint: "",
    blockTitle: "Galerijos grupės pavadinimas",
    blockTitlePlaceholder: "Pvz. Grindys, Langai, Terasos",
    blockDescription: "Galerijos aprašymas",
    blockDescriptionPlaceholder: "Trumpai aprašykite, kas rodoma šioje nuotraukų grupėje",
    blockPrice: "Šios grupės kaina",
    blockPricePlaceholder: "Pvz. nuo 250 NOK, 900 NOK / kg",
    addBlock: "Pridėti galerijos grupę",
    removeBlock: "Pašalinti grupę",
    uploadBlockImages: "Įkelti nuotraukas",
    noBlockImages: "Šioje grupėje nuotraukų dar nėra",
    galleryFallback: "Galerija",
    serviceFallback: "Paslauga",
    logoLabel: "Logo",
    uploadLogo: "Įkelti logo",
    postcodeLabel: "Pašto kodas *",
    cityLabel: "Miestas *",
    regionLabel: "Regionas",
    maxBlocksError: "Pasiekėte galerijos grupių limitą",
    maxImagesError: "Pasiekėte nuotraukų limitą",
    priceModeLabel: "Orientacinė kaina kortelėje",
    from: "Nuo",
    fixed: "Fiksuota",
    pricePlaceholder: "Pvz. 600",
    priceHint: "Ši kaina bus rodoma kortelėje prieš atidarant paslaugą.",
  };
}

function parseHighlights(text: string) {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 6);
}

function emptyPriceItem(): PriceItem {
  return { label: "", priceText: "", note: "" };
}

function emptyServiceBlock(): ServiceBlock {
  return {
    title: "",
    description: "",
    priceText: "",
    iconKey: "other",
    images: [],
  };
}

function normalizePriceNumber(value: string) {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return null;

  const parsed = Number.parseInt(digits, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;

  return parsed;
}

export default function EditServiceForm({
  initial,
  categories,
  maxImages,
  maxServiceBlocks,
}: Props) {
  const t = useTranslations("dashboardEditServiceForm");
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? initial.locale ?? "lt";

  const text = getLocalText(locale);

  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [pending, startTransition] = useTransition();

  const maxImagesSafe = Math.max(1, Number.isFinite(maxImages) ? maxImages : 5);
  const maxServiceBlocksSafe = Math.max(
    1,
    Number.isFinite(maxServiceBlocks) ? maxServiceBlocks : 6,
  );

  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);

  const [brandLogoUrl, setBrandLogoUrl] = useState<string | null>(
    initial.brandLogoUrl ?? null,
  );
  const [brandLogoPath, setBrandLogoPath] = useState<string | null>(
    initial.brandLogoPath ?? null,
  );
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [categoryId, setCategoryId] = useState(initial.categoryId || "");
  const [responseTime, setResponseTime] = useState(
    initial.responseTime ?? "1h",
  );

  const [locationPostcode, setLocationPostcode] = useState(
    initial.locationPostcode || "",
  );
  const [locationCity, setLocationCity] = useState(initial.locationCity || "");
  const [locationRegion, setLocationRegion] = useState(
    initial.locationRegion || "",
  );

  const [priceMode, setPriceMode] = useState<"fixed" | "from">(
    initial.priceMode ?? "from",
  );
  const [mainPrice, setMainPrice] = useState(initial.mainPrice ?? "");

  const [priceItems, setPriceItems] = useState<PriceItem[]>(
    Array.isArray(initial.priceItems) && initial.priceItems.length > 0
      ? initial.priceItems.map((item) => ({
          label: String(item?.label ?? ""),
          priceText: String(item?.priceText ?? ""),
          note: String(item?.note ?? ""),
        }))
      : [emptyPriceItem()],
  );

  const [serviceBlocks, setServiceBlocks] = useState<ServiceBlock[]>(
    Array.isArray(initial.serviceBlocks) && initial.serviceBlocks.length > 0
      ? initial.serviceBlocks.map((block) => ({
          title: String(block.title ?? ""),
          description: String(block.description ?? ""),
          priceText: String((block as any).priceText ?? ""),
          iconKey: String(block.iconKey ?? "other"),
          images: Array.isArray(block.images)
            ? block.images
                .map((img) => ({
                  url: String(img.url ?? ""),
                  path: String(img.path ?? ""),
                  altText: String(img.altText ?? ""),
                }))
                .filter((img) => img.url && img.path)
            : [],
        }))
      : [emptyServiceBlock()],
  );

  const [highlightsText, setHighlightsText] = useState(
    (initial.highlights ?? []).join("\n"),
  );

  const highlightsPreview = useMemo(
    () => parseHighlights(highlightsText),
    [highlightsText],
  );

  const totalImages = useMemo(() => {
    return serviceBlocks.reduce((sum, block) => sum + block.images.length, 0);
  }, [serviceBlocks]);

  const cleanBlocks = useMemo(() => {
    return serviceBlocks
      .map((block) => ({
        title: block.title.trim(),
        description: block.description.trim(),
        priceText: block.priceText.trim(),
        iconKey: block.iconKey || "other",
        images: block.images,
      }))
      .filter(
        (block) =>
          block.title || block.description || block.priceText || block.images.length,
      );
  }, [serviceBlocks]);

  const [uploadingBlockIndex, setUploadingBlockIndex] = useState<number | null>(
    null,
  );
  const [isActive, setIsActive] = useState<boolean>(initial.isActive ?? true);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const descriptionTooShort =
    description.trim().length > 0 &&
    description.trim().length < MIN_DESCRIPTION_LENGTH;

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

  function updateServiceBlock(
    index: number,
    key: keyof Omit<ServiceBlock, "images">,
    value: string,
  ) {
    setServiceBlocks((prev) =>
      prev.map((block, i) =>
        i === index ? { ...block, [key]: value } : block,
      ),
    );
  }

  function addServiceBlock() {
    if (serviceBlocks.length >= maxServiceBlocksSafe) {
      setError(`${text.maxBlocksError}: ${maxServiceBlocksSafe}`);
      return;
    }

    setServiceBlocks((prev) => [...prev, emptyServiceBlock()]);
  }

  function removeServiceBlock(index: number) {
    setServiceBlocks((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }

  function removeBlockImage(blockIndex: number, path: string) {
    setServiceBlocks((prev) =>
      prev.map((block, i) =>
        i === blockIndex
          ? {
              ...block,
              images: block.images.filter((img) => img.path !== path),
            }
          : block,
      ),
    );
  }

  function removeBrandLogo() {
    setBrandLogoUrl(null);
    setBrandLogoPath(null);
  }

  async function handleUploadBrandLogo(file: File | null) {
    if (!file) return;

    setError(null);
    setSuccess(null);
    setUploadingLogo(true);

    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();

      if (userErr || !userData.user) {
        setError(t("mustBeLoggedIn"));
        return;
      }

      if (!file.type.startsWith("image/")) {
        throw new Error(t("fileNotImage"));
      }

      if (file.size > 10 * 1024 * 1024) {
        throw new Error(t("fileTooLargeBefore"));
      }

      const compressed = await compressImageFile(file, {
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.86,
        mimeType: "image/jpeg",
      });

      if (compressed.size > 3 * 1024 * 1024) {
        throw new Error(t("fileTooLargeAfter"));
      }

      const path = `${userData.user.id}/services/logos/${window.crypto.randomUUID()}.jpg`;

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

      setBrandLogoUrl(data.publicUrl);
      setBrandLogoPath(path);
      setSuccess(t("imagesUploaded"));
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : t("genericError"));
    } finally {
      setUploadingLogo(false);
    }
  }
  async function handleUploadBlockImages(blockIndex: number, files: File[]) {
    if (!files.length) return;

    setError(null);
    setSuccess(null);

    const remainingSlots = maxImagesSafe - totalImages;

    if (remainingSlots <= 0) {
      setError(`${text.maxImagesError}: ${maxImagesSafe}`);
      return;
    }

    const selected = files.slice(0, remainingSlots);

    if (files.length > remainingSlots) {
      setError(`${text.maxImagesError}: ${maxImagesSafe}`);
    }

    setUploadingBlockIndex(blockIndex);

    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();

      if (userErr || !userData.user) {
        setError(t("mustBeLoggedIn"));
        return;
      }

      const userId = userData.user.id;
      const uploaded: GalleryItem[] = [];

      for (const file of selected) {
        if (!file.type.startsWith("image/")) {
          throw new Error(t("fileNotImage"));
        }

        if (file.size > 10 * 1024 * 1024) {
          throw new Error(t("fileTooLargeBefore"));
        }

        const compressed = await compressImageFile(file, {
          maxWidth: 1600,
          maxHeight: 1600,
          quality: 0.82,
          mimeType: "image/jpeg",
        });

        if (compressed.size > 3 * 1024 * 1024) {
          throw new Error(t("fileTooLargeAfter"));
        }

        const path = `${userId}/services/${window.crypto.randomUUID()}.jpg`;

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
          altText: "",
        });
      }

      setServiceBlocks((prev) =>
        prev.map((block, i) =>
          i === blockIndex
            ? { ...block, images: [...block.images, ...uploaded] }
            : block,
        ),
      );

      setSuccess(t("imagesUploaded"));
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : t("genericError"));
    } finally {
      setUploadingBlockIndex(null);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (description.trim().length < MIN_DESCRIPTION_LENGTH) {
      setError(getDescriptionMinError(locale));
      return;
    }

    const hiddenServiceBlocks =
      cleanBlocks.length > 0
        ? cleanBlocks
        : [
            {
              title: title.trim() || text.serviceFallback,
              description: description.trim(),
              priceText: "",
              iconKey: "other",
              images: [],
            },
          ];

    if (hiddenServiceBlocks.length > maxServiceBlocksSafe) {
      setError(`${text.maxBlocksError}: ${maxServiceBlocksSafe}`);
      return;
    }

    if (totalImages > maxImagesSafe) {
      setError(`${text.maxImagesError}: ${maxImagesSafe}`);
      return;
    }

    const highlights = parseHighlights(highlightsText);
    const normalizedMainPrice = normalizePriceNumber(mainPrice);

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
          brandLogoUrl,
          brandLogoPath,
          locationPostcode: locationPostcode.trim(),
          locationCity: locationCity.trim(),
          locationRegion: locationRegion.trim(),
          categoryId: categoryId || null,
          responseTime,
          priceMode,
          mainPrice: normalizedMainPrice,
          priceItems: cleanPriceItems,
          serviceBlocks: hiddenServiceBlocks,
          galleryImageUrls: hiddenServiceBlocks.flatMap((block) =>
            block.images.map((x) => x.url),
          ),
          galleryImagePaths: hiddenServiceBlocks.flatMap((block) =>
            block.images.map((x) => x.path),
          ),
          highlights,
          isActive,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setError((json as any)?.error || t("saveFailed"));
        return;
      }

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
              style={{
                borderColor: descriptionTooShort ? "#ef4444" : undefined,
              }}
            />
            <div className={styles.charHint}>{description.length} / 4000</div>

            {descriptionTooShort && (
              <p className={styles.errorText}>
                {getDescriptionMinError(locale)}
              </p>
            )}
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>{text.logoLabel}</label>

            {brandLogoUrl && (
              <div className={styles.imagePreview}>
                <div className={styles.imageCard}>
                  <div className={styles.imageThumb}>
                    <Image
                      src={brandLogoUrl}
                      alt={text.logoLabel}
                      fill
                      sizes="180px"
                      style={{ objectFit: "contain" }}
                    />
                  </div>

                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={removeBrandLogo}
                    disabled={uploadingLogo || pending}
                  >
                    {t("removeImage")}
                  </button>
                </div>
              </div>
            )}

            <div className={styles.uploadRow}>
              <label
                className={styles.uploadBtn}
                style={{
                  opacity: uploadingLogo ? 0.65 : 1,
                  pointerEvents: uploadingLogo ? "none" : "auto",
                }}
              >
                {uploadingLogo ? t("uploading") : text.uploadLogo}
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingLogo || pending}
                  onChange={(e) => {
                    const file = e.currentTarget.files?.[0] ?? null;
                    e.currentTarget.value = "";
                    void handleUploadBrandLogo(file);
                  }}
                />
              </label>
            </div>
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
              <label className={styles.label}>{text.postcodeLabel}</label>
              <input
                className={styles.input}
                value={locationPostcode}
                onChange={(e) => setLocationPostcode(e.target.value)}
                placeholder="1396"
                required
              />
            </div>

            <div className={styles.formCol}>
              <label className={styles.label}>{text.cityLabel}</label>
              <input
                className={styles.input}
                value={locationCity}
                onChange={(e) => setLocationCity(e.target.value)}
                placeholder="Billingstad"
                required
              />
            </div>

            <div className={styles.formCol}>
              <label className={styles.label}>{text.regionLabel}</label>
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
            <label className={styles.label}>{text.priceModeLabel}</label>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setPriceMode("from")}
                style={{
                  background: priceMode === "from" ? "#0f172a" : undefined,
                  color: priceMode === "from" ? "#fff" : undefined,
                }}
              >
                {text.from}
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
                {text.fixed}
              </button>
            </div>

            <input
              className={styles.input}
              value={mainPrice}
              onChange={(e) => setMainPrice(e.target.value)}
              placeholder={text.pricePlaceholder}
              inputMode="numeric"
            />

            <div className={styles.charHint}>{text.priceHint}</div>
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
          <h2 className={styles.sectionTitle}>{text.serviceBlocksTitle}</h2>
        </div>

        <div className={styles.sectionBody}>
          <div className={styles.priceList}>
            {serviceBlocks.map((block, blockIndex) => (
              <div key={blockIndex} className={styles.priceCard}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>{text.blockTitle}</label>
                  <input
                    className={styles.input}
                    value={block.title}
                    onChange={(e) =>
                      updateServiceBlock(blockIndex, "title", e.target.value)
                    }
                    placeholder={text.blockTitlePlaceholder}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    {text.blockDescription}
                  </label>
                  <textarea
                    className={styles.textarea}
                    rows={4}
                    value={block.description}
                    onChange={(e) =>
                      updateServiceBlock(
                        blockIndex,
                        "description",
                        e.target.value,
                      )
                    }
                    placeholder={text.blockDescriptionPlaceholder}
                  />
                  <div className={styles.charHint}>
                    {block.description.length} / 500
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>{text.blockPrice}</label>
                  <input
                    className={styles.input}
                    value={block.priceText}
                    onChange={(e) =>
                      updateServiceBlock(
                        blockIndex,
                        "priceText",
                        e.target.value,
                      )
                    }
                    placeholder={text.blockPricePlaceholder}
                  />
                </div>

                <div className={styles.uploadRow}>
                  <label
                    className={styles.uploadBtn}
                    style={{
                      opacity:
                        totalImages >= maxImagesSafe || uploadingBlockIndex !== null
                          ? 0.65
                          : 1,
                      pointerEvents:
                        totalImages >= maxImagesSafe || uploadingBlockIndex !== null
                          ? "none"
                          : "auto",
                    }}
                  >
                    {uploadingBlockIndex === blockIndex
                      ? t("uploading")
                      : text.uploadBlockImages}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={
                        pending ||
                        uploadingBlockIndex !== null ||
                        totalImages >= maxImagesSafe
                      }
                      onChange={(e) => {
                        const files = e.currentTarget.files
                          ? Array.from(e.currentTarget.files)
                          : [];
                        e.currentTarget.value = "";
                        void handleUploadBlockImages(blockIndex, files);
                      }}
                    />
                  </label>
                </div>

                <div className={styles.imagePreview}>
                  {block.images.length > 0 ? (
                    block.images.map((img, idx) => (
                      <div key={img.path} className={styles.imageCard}>
                        <div className={styles.imageThumb}>
                          <Image
                            src={img.url}
                            alt={`${block.title || text.serviceBlocksTitle} ${idx + 1}`}
                            fill
                            sizes="180px"
                            style={{ objectFit: "cover" }}
                          />
                        </div>

                        <button
                          type="button"
                          className={styles.secondaryButton}
                          onClick={() => removeBlockImage(blockIndex, img.path)}
                          disabled={uploadingBlockIndex !== null || pending}
                        >
                          {t("removeImage")}
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className={styles.emptyState}>
                      <span className={styles.emptyText}>
                        {text.noBlockImages}
                      </span>
                    </div>
                  )}
                </div>

                <div className={styles.inlineActions}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => removeServiceBlock(blockIndex)}
                    disabled={serviceBlocks.length <= 1 || pending}
                  >
                    {text.removeBlock}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.inlineActions}>
            <button
              type="button"
              className={styles.addRowButton}
              onClick={addServiceBlock}
              disabled={
                serviceBlocks.length >= maxServiceBlocksSafe ||
                pending ||
                uploadingBlockIndex !== null
              }
            >
              + {text.addBlock}
            </button>
          </div>
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
              <strong>
                {isActive ? t("statusActive") : t("statusInactive")}
              </strong>
            </span>

            <button
              type="button"
              className={styles.secondaryButton}
              onClick={handleToggleActive}
              disabled={pending}
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
          disabled={pending}
        >
          {t("deleteButton")}
        </button>

        <div className={styles.actionsRight}>
          <button
            type="submit"
            className={styles.primaryButton}
            disabled={
              pending ||
              description.trim().length < MIN_DESCRIPTION_LENGTH
            }
          >
            {pending ? t("saving") : t("saveButton")}
          </button>
        </div>
      </div>
    </form>
  );
}
