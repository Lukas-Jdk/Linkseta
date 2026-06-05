// src/app/[locale]/dashboard/services/new/NewServiceForm.tsx
"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
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
  planLimits: {
    planName: string;
    maxListings: number;
    maxImagesPerListing: number;
    maxServiceBlocks?: number;
    activeCount: number;
    canCreate: boolean;
    trialExpired: boolean;
  };
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

type ServiceBlock = {
  title: string;
  description: string;
  priceText: string;
  iconKey: string;
  images: GalleryItem[];
};

type UpgradePlanSlug = "basic" | "premium";

const OTHER_CITY_ID = "__OTHER_CITY__";

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

function getLocalText(locale: string) {
  if (locale === "en") {
    return {
      currentPlan: "Current plan",
      activeListings: "Service profiles",
      photosPerListing: "Photos in total",
      listingsLimitReached: "You have reached your plan limit",
      trialExpired: "Your Free Trial has expired.",
      title: "Plan limit reached",
      subtitle:
        "Your current plan does not allow more service profiles, service blocks or photos. Upgrade your plan to continue.",
      basicTitle: "Upgrade to Basic",
      basicDesc: "1 service profile and up to 15 photos.",
      premiumTitle: "Upgrade to Premium",
      premiumDesc:
        "1 service profile, up to 30 photos, chat and homepage visibility.",
      close: "Close",
      loading: "Redirecting...",
      error: "Could not start checkout. Please try again.",
      priceModeLabel: "Estimated price on card",
      from: "From",
      fixed: "Fixed",
      pricePlaceholder: "E.g. 600",
      serviceBlocksTitle: "Photo gallery",
      blockTitle: "Gallery group name",
      blockTitlePlaceholder: "E.g. Floors, Windows, Terraces",
      blockDescription: "Description",
      blockDescriptionPlaceholder: "Optional",
      blockPrice: "Price for this group",
      blockPricePlaceholder: "E.g. from 250 NOK, 900 NOK / kg",
      addBlock: "Add gallery group",
      removeBlock: "Remove group",
      uploadBlockImages: "Upload photos",
      noBlockImages: "No photos in this group yet",
      maxBlocksError: "You have reached your gallery group limit",
      maxImagesError: "You have reached your photo limit",
      logoLabel: "Main service photo",
      uploadLogo: "Upload main photo",
      otherCityOption: "Other city",
      customCityLabel: "City name *",
      customCityPlaceholder: "E.g. Molde, Alta, Narvik",
      customCityError: "Enter your city name.",
    };
  }

  if (locale === "no") {
    return {
      currentPlan: "Nåværende plan",
      activeListings: "Tjenesteprofiler",
      photosPerListing: "Bilder totalt",
      listingsLimitReached: "Du har nådd plangrensen",
      trialExpired: "Din Free Trial er utløpt.",
      title: "Plangrensen er nådd",
      subtitle:
        "Din nåværende plan tillater ikke flere tjenesteprofiler, tjenesteblokker eller bilder. Oppgrader planen for å fortsette.",
      basicTitle: "Oppgrader til Basic",
      basicDesc: "1 tjenesteprofil og opptil 15 bilder.",
      premiumTitle: "Oppgrader til Premium",
      premiumDesc:
        "1 tjenesteprofil, opptil 30 bilder, chat og synlighet på forsiden.",
      close: "Lukk",
      loading: "Sender videre...",
      error: "Kunne ikke starte betaling. Prøv igjen.",
      priceModeLabel: "Estimert pris på kortet",
      from: "Fra",
      fixed: "Fast",
      pricePlaceholder: "F.eks. 600",
      serviceBlocksTitle: "Fotogalleri",
      blockTitle: "Gruppenavn",
      blockTitlePlaceholder: "F.eks. Gulv, Vinduer, Terrasser",
      blockDescription: "Beskrivelse",
      blockDescriptionPlaceholder: "Valgfritt",
      blockPrice: "Pris for denne gruppen",
      blockPricePlaceholder: "F.eks. fra 250 NOK, 900 NOK / kg",
      addBlock: "Legg til gallerigruppe",
      removeBlock: "Fjern gruppe",
      uploadBlockImages: "Last opp bilder",
      noBlockImages: "Ingen bilder i denne gruppen ennå",
      maxBlocksError: "Du har nådd grensen for gallerigrupper",
      maxImagesError: "Du har nådd bildegrensen",
      logoLabel: "Hovedtjenestefoto",
      uploadLogo: "Last opp hovedfoto",
      otherCityOption: "Annen by",
      customCityLabel: "Bynavn *",
      customCityPlaceholder: "F.eks. Molde, Alta, Narvik",
      customCityError: "Skriv inn bynavnet ditt.",
    };
  }

  return {
    currentPlan: "Dabartinis planas",
    activeListings: "Paslaugų profiliai",
    photosPerListing: "Nuotraukų iš viso",
    listingsLimitReached: "Pasiekėte savo plano limitą",
    trialExpired: "Jūsų Free Trial laikotarpis baigėsi.",
    title: "Pasiektas plano limitas",
    subtitle:
      "Dabartinis planas neleidžia kurti daugiau paslaugų profilių, paslaugų blokų arba kelti daugiau nuotraukų. Atnaujink planą ir tęsk.",
    basicTitle: "Atnaujinti į Basic",
    basicDesc: "1 paslaugų profilis ir iki 15 nuotraukų.",
    premiumTitle: "Atnaujinti į Premium",
    premiumDesc:
      "1 paslaugų profilis, iki 30 nuotraukų, chat ir rodymas pagrindiniame puslapyje.",
    close: "Uždaryti",
    loading: "Nukreipiama...",
    error: "Nepavyko pradėti apmokėjimo. Bandyk dar kartą.",
    priceModeLabel: "Orientacinė kaina kortelėje",
    from: "Nuo",
    fixed: "Fiksuota",
    pricePlaceholder: "Pvz. 600",
    serviceBlocksTitle: "Nuotraukų galerija",
    blockTitle: "Galerijos grupės pavadinimas",
    blockTitlePlaceholder: "Pvz. Grindys, Langai, Terasos",
    blockDescription: "Aprašymas",
    blockDescriptionPlaceholder: "Nebūtina",
    blockPrice: "Šios grupės kaina",
    blockPricePlaceholder: "Pvz. nuo 250 NOK, 900 NOK / kg",
    addBlock: "Pridėti galerijos grupę",
    removeBlock: "Pašalinti grupę",
    uploadBlockImages: "Įkelti nuotraukas",
    noBlockImages: "Šioje grupėje nuotraukų dar nėra",
    maxBlocksError: "Pasiekėte galerijos grupių limitą",
    maxImagesError: "Pasiekėte nuotraukų limitą",
    logoLabel: "Pagrindinė paslaugos nuotrauka",
    uploadLogo: "Įkelti pagrindinę nuotrauką",
    otherCityOption: "Kitas miestas",
    customCityLabel: "Miesto pavadinimas *",
    customCityPlaceholder: "Pvz. Molde, Alta, Narvik",
    customCityError: "Įveskite miesto pavadinimą.",
  };
}

export default function NewServiceForm({
  cities,
  categories,
  planLimits,
}: Props) {
  const t = useTranslations("dashboardNewServiceForm");
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "lt";

  const text = getLocalText(locale);
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const maxServiceBlocks = planLimits.maxServiceBlocks ?? 6;

  const [title, setTitle] = useState("");
  const [cityId, setCityId] = useState("");
  const [customCity, setCustomCity] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [responseTime, setResponseTime] = useState("1h");

  const [priceMode, setPriceMode] = useState<"fixed" | "from">("from");
  const [mainPrice, setMainPrice] = useState("");

  const [brandLogoUrl, setBrandLogoUrl] = useState<string | null>(null);
  const [brandLogoPath, setBrandLogoPath] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [locationPostcode, setLocationPostcode] = useState("");
  const [locationRegion, setLocationRegion] = useState("");

  const [h1, setH1] = useState("");
  const [h2, setH2] = useState("");
  const [h3, setH3] = useState("");
  const [h4, setH4] = useState("");

  const [priceItems, setPriceItems] = useState<PriceItem[]>([emptyPriceItem()]);
  const [serviceBlocks, setServiceBlocks] = useState<ServiceBlock[]>([]);

  const [uploadingBlockIndex, setUploadingBlockIndex] = useState<number | null>(
    null,
  );

  const [submitting, setSubmitting] = useState(false);
  const [checkoutLoading, setCheckoutLoading] =
    useState<UpgradePlanSlug | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const initialLimitMessage = !planLimits.canCreate
    ? planLimits.trialExpired
      ? text.trialExpired
      : `${text.listingsLimitReached}: ${planLimits.activeCount}/${planLimits.maxListings}`
    : null;

  const [error, setError] = useState<string | null>(initialLimitMessage);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedCity = useMemo(
    () => cities.find((c) => c.id === cityId) ?? null,
    [cities, cityId],
  );

  const isOtherCity = cityId === OTHER_CITY_ID;
  const locationCity = isOtherCity
    ? customCity.trim()
    : (selectedCity?.name?.trim() ?? "");

  const highlights = useMemo(() => {
    return [h1, h2, h3, h4].map(trimOrEmpty).filter(Boolean).slice(0, 4);
  }, [h1, h2, h3, h4]);

  const normalizedMainPrice = useMemo(
    () => normalizePriceNumber(mainPrice),
    [mainPrice],
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
          block.title ||
          block.description ||
          block.priceText ||
          block.images.length,
      );
  }, [serviceBlocks]);

  const canSubmit = useMemo(() => {
    return (
      planLimits.canCreate &&
      title.trim().length >= 3 &&
      description.trim().length >= 10 &&
      Boolean(cityId) &&
      Boolean(categoryId) &&
      Boolean(locationCity) &&
      Boolean(locationPostcode.trim()) &&
      totalImages <= planLimits.maxImagesPerListing &&
      !submitting &&
      uploadingLogo === false &&
      uploadingBlockIndex === null
    );
  }, [
    planLimits.canCreate,
    planLimits.maxImagesPerListing,
    title,
    description,
    cityId,
    categoryId,
    locationCity,
    customCity,
    locationPostcode,
    totalImages,
    submitting,
    uploadingLogo,
    uploadingBlockIndex,
  ]);

  function openUpgradeModal(message?: string) {
    if (message) setError(message);
    setShowUpgradeModal(true);
  }

  async function startCheckout(planSlug: UpgradePlanSlug) {
    setCheckoutLoading(planSlug);
    setError(null);

    try {
      const res = await csrfFetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planSlug, locale }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.url) {
        throw new Error(data?.error || text.error);
      }

      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : text.error);
      setCheckoutLoading(null);
    }
  }

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
    if (serviceBlocks.length >= maxServiceBlocks) {
      setError(`${text.maxBlocksError}: ${maxServiceBlocks}`);
      return;
    }

    setServiceBlocks((prev) => [...prev, emptyServiceBlock()]);
  }

  function removeServiceBlock(index: number) {
    setServiceBlocks((prev) => prev.filter((_, i) => i !== index));
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
        setError(t("errors.mustBeLoggedIn"));
        return;
      }

      if (!file.type.startsWith("image/")) {
        throw new Error(t("errors.fileNotImage"));
      }

      if (file.size > 10 * 1024 * 1024) {
        throw new Error(t("errors.fileTooLargeBeforeCompression"));
      }

      const compressed = await compressImageFile(file, {
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.86,
        mimeType: "image/jpeg",
      });

      if (compressed.size > 3 * 1024 * 1024) {
        throw new Error(t("errors.fileTooLargeAfterCompression"));
      }

      const path = `${userData.user.id}/services/covers/${window.crypto.randomUUID()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("service-images")
        .upload(path, compressed, {
          cacheControl: "31536000",
          upsert: false,
          contentType: "image/jpeg",
        });

      if (uploadError) {
        throw new Error(uploadError.message || t("errors.uploadOneFailed"));
      }

      const { data } = supabase.storage
        .from("service-images")
        .getPublicUrl(path);

      if (!data?.publicUrl) {
        throw new Error(t("errors.uploadGeneric"));
      }

      setBrandLogoUrl(data.publicUrl);
      setBrandLogoPath(path);
      setSuccess(t("uploadSuccess"));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errors.uploadGeneric"));
    } finally {
      setUploadingLogo(false);
    }
  }

  function handleCityChange(nextCityId: string) {
    setCityId(nextCityId);

    if (nextCityId === OTHER_CITY_ID) {
      setCustomCity("");
      if (!locationPostcode.trim()) {
        setLocationPostcode("");
      }
      return;
    }

    const nextCity = cities.find((c) => c.id === nextCityId) ?? null;
    const nextCityPostcode = nextCity?.postcode?.trim() ?? "";

    setCustomCity("");

    if (!locationPostcode.trim()) {
      setLocationPostcode(nextCityPostcode);
    }
  }

  async function handlePickBlockImages(
    blockIndex: number,
    files: FileList | null,
  ) {
    if (!files || files.length === 0) return;

    setError(null);
    setSuccess(null);

    if (!planLimits.canCreate) {
      openUpgradeModal();
      return;
    }

    const remainingSlots = planLimits.maxImagesPerListing - totalImages;

    if (remainingSlots <= 0) {
      openUpgradeModal(
        `${text.maxImagesError}: ${planLimits.maxImagesPerListing}`,
      );
      return;
    }

    const selected = Array.from(files).slice(0, remainingSlots);
    setUploadingBlockIndex(blockIndex);

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

      setServiceBlocks((prev) =>
        prev.map((block, i) =>
          i === blockIndex
            ? {
                ...block,
                images: [...block.images, ...uploaded],
              }
            : block,
        ),
      );

      setSuccess(t("uploadSuccess"));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errors.uploadGeneric"));
    } finally {
      setUploadingBlockIndex(null);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!planLimits.canCreate) {
      openUpgradeModal(
        planLimits.trialExpired
          ? text.trialExpired
          : `${text.listingsLimitReached}: ${planLimits.activeCount}/${planLimits.maxListings}`,
      );
      return;
    }

    if (isOtherCity && !customCity.trim()) {
      setError(text.customCityError);
      return;
    }

    if (!locationCity || !locationPostcode.trim()) {
      setError(t("errors.invalidCityPostcode"));
      return;
    }

    if (description.trim().length < 10) {
      setError(
        locale === "en"
          ? "Description must be at least 10 characters"
          : locale === "no"
            ? "Beskrivelsen må være minst 10 tegn"
            : "Aprašymas turi būti bent 10 simbolių",
      );
      return;
    }

    if (totalImages > planLimits.maxImagesPerListing) {
      setError(`${text.maxImagesError}: ${planLimits.maxImagesPerListing}`);
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

      const hiddenServiceBlocks = cleanBlocks.map((block) => ({
        title: block.title,
        description: block.description,
        priceText: block.priceText,
        iconKey: block.iconKey || "other",
        images: block.images,
      }));

      const payload = {
        title: title.trim(),
        categoryId,
        description: description.trim(),
        responseTime,
        highlights,
        imageUrl: brandLogoUrl,
        imagePath: brandLogoPath,
        brandLogoUrl: null,
        brandLogoPath: null,
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
        locationPostcode: locationPostcode.trim(),
        locationCity,
        locationRegion: locationRegion.trim(),
        cityId: isOtherCity ? null : cityId,
      };

      const res = await csrfFetch("/api/dashboard/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        if (
          data?.code === "PLAN_LIMIT" ||
          data?.code === "PLAN_LISTING_LIMIT" ||
          data?.code === "PLAN_IMAGE_LIMIT" ||
          data?.code === "PLAN_BLOCK_LIMIT"
        ) {
          openUpgradeModal(data?.error);
          return;
        }

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
    <>
      {showUpgradeModal && (
        <div className={styles.upgradeOverlay} role="dialog" aria-modal="true">
          <div className={styles.upgradeModal}>
            <button
              type="button"
              className={styles.upgradeClose}
              onClick={() => setShowUpgradeModal(false)}
              aria-label={text.close}
            >
              ×
            </button>

            <div className={styles.upgradeIcon}>🚀</div>

            <h2 className={styles.upgradeTitle}>{text.title}</h2>
            <p className={styles.upgradeSubtitle}>{text.subtitle}</p>

            <div className={styles.upgradeStats}>
              <div>
                <strong>{planLimits.planName}</strong>
                <span>{text.currentPlan}</span>
              </div>

              <div>
                <strong>
                  {planLimits.activeCount}/{planLimits.maxListings}
                </strong>
                <span>{text.activeListings}</span>
              </div>

              <div>
                <strong>{planLimits.maxImagesPerListing}</strong>
                <span>{text.photosPerListing}</span>
              </div>
            </div>

            <div className={styles.upgradePlans}>
              <button
                type="button"
                className={styles.upgradePlan}
                onClick={() => void startCheckout("basic")}
                disabled={checkoutLoading !== null}
              >
                <span className={styles.upgradePlanIcon}>🔹</span>
                <span>
                  <strong>
                    {checkoutLoading === "basic"
                      ? text.loading
                      : text.basicTitle}
                  </strong>
                  <small>{text.basicDesc}</small>
                </span>
              </button>

              <button
                type="button"
                className={`${styles.upgradePlan} ${styles.upgradePlanPremium}`}
                onClick={() => void startCheckout("premium")}
                disabled={checkoutLoading !== null}
              >
                <span className={styles.upgradePlanIcon}>👑</span>
                <span>
                  <strong>
                    {checkoutLoading === "premium"
                      ? text.loading
                      : text.premiumTitle}
                  </strong>
                  <small>{text.premiumDesc}</small>
                </span>
              </button>
            </div>

            <button
              type="button"
              className={styles.upgradeLater}
              onClick={() => setShowUpgradeModal(false)}
              disabled={checkoutLoading !== null}
            >
              {text.close}
            </button>
          </div>
        </div>
      )}

      <form className={styles.form} onSubmit={onSubmit}>
        {error && <div className={styles.errorText}>{error}</div>}
        {success && <div className={styles.successText}>{success}</div>}

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
                disabled={!planLimits.canCreate}
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
                disabled={!planLimits.canCreate}
                style={{
                  border:
                    description.length > 0 && description.length < 10
                      ? "1px solid #ef4444"
                      : undefined,
                }}
              />
              <div className={styles.charHint}>{description.length} / 4000</div>
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
                      disabled={
                        uploadingLogo || submitting || !planLimits.canCreate
                      }
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
                    opacity: uploadingLogo || !planLimits.canCreate ? 0.65 : 1,
                    pointerEvents:
                      uploadingLogo || !planLimits.canCreate ? "none" : "auto",
                  }}
                >
                  {uploadingLogo ? t("uploading") : text.uploadLogo}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={
                      uploadingLogo || submitting || !planLimits.canCreate
                    }
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
            <h2 className={styles.sectionTitle}>{t("highlightsTitle")}</h2>
          </div>

          <div className={styles.sectionBody}>
            <div className={styles.formGroup}>
              <div className={styles.highHeader}>
                <div className={styles.highHint}>{t("highlightsHint")}</div>
              </div>

              <div className={styles.highList}>
                {[h1, h2, h3, h4].map((value, index) => (
                  <div key={index} className={styles.highRow}>
                    <span className={styles.tick}>✅</span>
                    <input
                      className={styles.input}
                      value={value}
                      onChange={(e) => {
                        if (index === 0) setH1(e.target.value);
                        if (index === 1) setH2(e.target.value);
                        if (index === 2) setH3(e.target.value);
                        if (index === 3) setH4(e.target.value);
                      }}
                      placeholder={
                        index === 0
                          ? t("highlightPlaceholder1")
                          : index === 1
                            ? t("highlightPlaceholder2")
                            : index === 2
                              ? t("highlightPlaceholder3")
                              : t("highlightPlaceholder3")
                      }
                      autoComplete="off"
                      disabled={!planLimits.canCreate}
                    />
                  </div>
                ))}
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
                disabled={!planLimits.canCreate}
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
                disabled={!planLimits.canCreate}
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
                disabled={!planLimits.canCreate}
              >
                <option value="">{t("selectCity")}</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
                <option value={OTHER_CITY_ID}>{text.otherCityOption}</option>
              </select>
            </div>

            {isOtherCity && (
              <div className={styles.formGroup}>
                <label className={styles.label}>{text.customCityLabel}</label>
                <input
                  className={styles.input}
                  value={customCity}
                  onChange={(e) => setCustomCity(e.target.value)}
                  placeholder={text.customCityPlaceholder}
                  autoComplete="address-level2"
                  disabled={!planLimits.canCreate}
                  required
                />
              </div>
            )}

            <div className={styles.formRow}>
              <div className={styles.formCol}>
                <label className={styles.label}>{t("postcodeLabel")}</label>
                <input
                  className={styles.input}
                  value={locationPostcode}
                  onChange={(e) => setLocationPostcode(e.target.value)}
                  placeholder={t("postcodePlaceholder")}
                  disabled={!planLimits.canCreate}
                />
              </div>

              <div className={styles.formCol}>
                <label className={styles.label}>{t("regionLabel")}</label>
                <input
                  className={styles.input}
                  value={locationRegion}
                  onChange={(e) => setLocationRegion(e.target.value)}
                  placeholder={t("regionPlaceholder")}
                  disabled={!planLimits.canCreate}
                />
              </div>
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
                disabled={!planLimits.canCreate}
              />
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
                      disabled={!planLimits.canCreate}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      {text.blockDescription}
                    </label>
                    <textarea
                      className={styles.textarea}
                      value={block.description}
                      onChange={(e) =>
                        updateServiceBlock(
                          blockIndex,
                          "description",
                          e.target.value,
                        )
                      }
                      placeholder={text.blockDescriptionPlaceholder}
                      rows={3}
                      disabled={!planLimits.canCreate}
                    />
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
                      disabled={!planLimits.canCreate}
                    />
                  </div>

                  <div className={styles.uploadRow}>
                    <label
                      className={styles.uploadBtn}
                      style={{
                        opacity:
                          !planLimits.canCreate ||
                          totalImages >= planLimits.maxImagesPerListing ||
                          uploadingBlockIndex !== null
                            ? 0.65
                            : 1,
                        pointerEvents:
                          !planLimits.canCreate ||
                          totalImages >= planLimits.maxImagesPerListing ||
                          uploadingBlockIndex !== null
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
                          !planLimits.canCreate || uploadingBlockIndex !== null
                        }
                        onChange={(e) => {
                          void handlePickBlockImages(
                            blockIndex,
                            e.target.files,
                          );
                          e.currentTarget.value = "";
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
                              alt={`${block.title || text.serviceBlocksTitle} ${
                                idx + 1
                              }`}
                              fill
                              sizes="180px"
                              className={styles.previewImg}
                              style={{ objectFit: "cover" }}
                            />
                          </div>

                          <button
                            type="button"
                            className={styles.secondaryButton}
                            onClick={() =>
                              removeBlockImage(blockIndex, img.path)
                            }
                            disabled={
                              !planLimits.canCreate ||
                              uploadingBlockIndex !== null
                            }
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
                      disabled={
                        !planLimits.canCreate || uploadingBlockIndex !== null
                      }
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
                  !planLimits.canCreate ||
                  serviceBlocks.length >= maxServiceBlocks ||
                  uploadingBlockIndex !== null
                }
              >
                + {text.addBlock}
              </button>
            </div>
          </div>
        </section>

        <div className={styles.actionsBar}>
          <div style={{ flex: 1 }} />

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
    </>
  );
}
