// src/components/search/SearchBar.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search, ChevronDown } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import styles from "./SearchBar.module.css";
import { categoryIconMap, DefaultCategoryIcon } from "@/lib/categoryIcons";

type CityOption = { id: string; name: string };
type CategoryOption = { id: string; name: string; slug: string };

function useOnClickOutside(
  refs: Array<React.RefObject<HTMLElement | null>>,
  handler: () => void,
) {
  useEffect(() => {
    function onDown(e: MouseEvent | TouchEvent) {
      const target = e.target as Node;
      const clickedInside = refs.some((r) => r.current?.contains(target));
      if (!clickedInside) handler();
    }

    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);

    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [refs, handler]);
}

function normalize(s: string) {
  return s.toLowerCase().trim();
}

const CATEGORY_LABELS: Record<string, Record<string, string>> = {
  lt: {
    apskaita: "Apskaita",
    automobiliai: "Automobiliai",
    nt: "NT",
    statybos: "Statybos",
    remontas: "Remontas",
    santechnika: "Santechnika",
    elektra: "Elektra",
    "buitin-technika": "Buitinė technika",
    transportas: "Transportas",
    valymas: "Valymas",
    grois: "Grožis",
    sveikata: "Sveikata",
    "teisins-paslaugos": "Teisinės paslaugos",
    "it-paslaugos": "IT paslaugos",
    fotografija: "Fotografija",
    mokymai: "Mokymai",
    "vaik-prieira": "Vaikų priežiūra",
    "gyvn-prieira": "Gyvūnų priežiūra",
    maistas: "Maistas",
    "nam-kis": "Namų ūkis",
    kita: "Kita",
    konditerija: "Konditerija",
    mat: "Mat",
    "maistas-kateris": "Maistas / Kateris",
    mityba: "Mityba",
    renginiai: "Renginiai",
  },
  en: {
    apskaita: "Accounting",
    automobiliai: "Automotive",
    nt: "Real estate",
    statybos: "Construction",
    remontas: "Repair",
    santechnika: "Plumbing",
    elektra: "Electrical",
    "buitin-technika": "Appliances",
    transportas: "Transport",
    valymas: "Cleaning",
    grois: "Beauty",
    sveikata: "Health",
    "teisins-paslaugos": "Legal services",
    "it-paslaugos": "IT services",
    fotografija: "Photography",
    mokymai: "Training",
    "vaik-prieira": "Childcare",
    "gyvn-prieira": "Pet care",
    maistas: "Food",
    "nam-kis": "Household",
    kita: "Other",
    konditerija: "Confectionery",
    mat: "Food",
    "maistas-kateris": "Food / Catering",
    mityba: "Nutrition",
    renginiai: "Events",
  },
  no: {
    apskaita: "Regnskap",
    automobiliai: "Bil",
    nt: "Eiendom",
    statybos: "Bygg",
    remontas: "Reparasjon",
    santechnika: "Rørlegger",
    elektra: "Elektriker",
    "buitin-technika": "Hvitevarer",
    transportas: "Transport",
    valymas: "Rengjøring",
    grois: "Skjønnhet",
    sveikata: "Helse",
    "teisins-paslaugos": "Juridiske tjenester",
    "it-paslaugos": "IT-tjenester",
    fotografija: "Fotografi",
    mokymai: "Kurs",
    "vaik-prieira": "Barnepass",
    "gyvn-prieira": "Dyrepass",
    maistas: "Mat",
    "nam-kis": "Husholdning",
    kita: "Annet",
    konditerija: "Konditori",
    mat: "Mat",
    "maistas-kateris": "Mat og catering",
    mityba: "Ernæring",
    renginiai: "Arrangementer",
  },
};

export default function SearchBar() {
  const t = useTranslations("searchBar");
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "lt";

  const [mounted, setMounted] = useState(false);

  const [cities, setCities] = useState<CityOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  const [filtersLoaded, setFiltersLoaded] = useState(false);
  const [filtersLoading, setFiltersLoading] = useState(false);

  const [cityId, setCityId] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const [openCity, setOpenCity] = useState(false);
  const [openCategory, setOpenCategory] = useState(false);

  const [cityQuery, setCityQuery] = useState("");
  const [categoryQuery, setCategoryQuery] = useState("");

  const cityWrapRef = useRef<HTMLDivElement>(null);
  const catWrapRef = useRef<HTMLDivElement>(null);

  const cityBtnRef = useRef<HTMLButtonElement>(null);
  const catBtnRef = useRef<HTMLButtonElement>(null);

  const cityDropdownRef = useRef<HTMLDivElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  const cityInputRef = useRef<HTMLInputElement>(null);
  const categoryInputRef = useRef<HTMLInputElement>(null);

  const [cityPanelStyle, setCityPanelStyle] = useState<React.CSSProperties>({});
  const [categoryPanelStyle, setCategoryPanelStyle] =
    useState<React.CSSProperties>({});

  const anyDropdownOpen = openCity || openCategory;

  const closeAll = useCallback(() => {
    setOpenCity(false);
    setOpenCategory(false);
  }, []);

  useOnClickOutside(
    [cityWrapRef, cityDropdownRef, catWrapRef, categoryDropdownRef],
    closeAll,
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  const getCategoryLabel = useCallback(
    (category: CategoryOption) => {
      return CATEGORY_LABELS[locale]?.[category.slug] ?? category.name;
    },
    [locale],
  );

  const ensureFiltersLoaded = useCallback(async () => {
    if (filtersLoaded || filtersLoading) return;

    setFiltersLoading(true);
    try {
      const res = await fetch(`/api/public/filters?locale=${locale}`, {
        cache: "force-cache",
      });
      const data = await res.json().catch(() => ({} as any));
      setCities(data.cities ?? []);
      setCategories(data.categories ?? []);
      setFiltersLoaded(true);
    } finally {
      setFiltersLoading(false);
    }
  }, [filtersLoaded, filtersLoading, locale]);

  const cityName = useMemo(() => {
    if (!cityId) return t("selectPlaceholder");
    return cities.find((c) => c.id === cityId)?.name ?? t("selectPlaceholder");
  }, [cityId, cities, t]);

  const categoryName = useMemo(() => {
    if (!categoryId) return t("selectPlaceholder");

    const selected = categories.find((c) => c.id === categoryId);
    if (!selected) return t("selectPlaceholder");

    return getCategoryLabel(selected);
  }, [categoryId, categories, t, getCategoryLabel]);

  const filteredCities = useMemo(() => {
    const nq = normalize(cityQuery);
    if (!nq) return cities;
    return cities.filter((c) => normalize(c.name).includes(nq));
  }, [cities, cityQuery]);

  const filteredCategories = useMemo(() => {
    const nq = normalize(categoryQuery);
    if (!nq) return categories;

    return categories.filter((c) =>
      normalize(getCategoryLabel(c)).includes(nq),
    );
  }, [categories, categoryQuery, getCategoryLabel]);

  const calcPanelStyle = useCallback(
    (el: HTMLButtonElement): React.CSSProperties => {
      const rect = el.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const gap = 12;

      const desiredWidth =
        viewportWidth <= 640
          ? viewportWidth - gap * 2
          : Math.max(rect.width, 280);

      const maxWidth = viewportWidth - gap * 2;
      const width = Math.min(desiredWidth, maxWidth);

      let left = rect.left;

      if (left + width > viewportWidth - gap) {
        left = viewportWidth - gap - width;
      }

      if (left < gap) left = gap;

      return {
        position: "fixed",
        top: `${rect.bottom + 10}px`,
        left: `${left}px`,
        width: `${width}px`,
        zIndex: 100001,
      };
    },
    [],
  );

  const updateCityPanelPosition = useCallback(() => {
    const el = cityBtnRef.current;
    if (!el) return;
    setCityPanelStyle(calcPanelStyle(el));
  }, [calcPanelStyle]);

  const updateCategoryPanelPosition = useCallback(() => {
    const el = catBtnRef.current;
    if (!el) return;
    setCategoryPanelStyle(calcPanelStyle(el));
  }, [calcPanelStyle]);

  useEffect(() => {
    if (!openCity) return;

    function onRecalc() {
      updateCityPanelPosition();
    }

    window.addEventListener("resize", onRecalc);
    window.addEventListener("scroll", onRecalc, true);

    return () => {
      window.removeEventListener("resize", onRecalc);
      window.removeEventListener("scroll", onRecalc, true);
    };
  }, [openCity, updateCityPanelPosition]);

  useEffect(() => {
    if (!openCategory) return;

    function onRecalc() {
      updateCategoryPanelPosition();
    }

    window.addEventListener("resize", onRecalc);
    window.addEventListener("scroll", onRecalc, true);

    return () => {
      window.removeEventListener("resize", onRecalc);
      window.removeEventListener("scroll", onRecalc, true);
    };
  }, [openCategory, updateCategoryPanelPosition]);

  useEffect(() => {
    if (!openCity) return;

    const id = window.requestAnimationFrame(() => {
      cityInputRef.current?.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(id);
  }, [openCity]);

  useEffect(() => {
    if (!openCategory) return;

    const id = window.requestAnimationFrame(() => {
      categoryInputRef.current?.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(id);
  }, [openCategory]);

  async function toggleCity() {
    if (openCity) {
      setOpenCity(false);
      return;
    }

    await ensureFiltersLoaded();

    const btn = cityBtnRef.current;
    if (btn) setCityPanelStyle(calcPanelStyle(btn));

    setOpenCategory(false);
    setCityQuery("");
    setOpenCity(true);
  }

  async function toggleCategory() {
    if (openCategory) {
      setOpenCategory(false);
      return;
    }

    await ensureFiltersLoaded();

    const btn = catBtnRef.current;
    if (btn) setCategoryPanelStyle(calcPanelStyle(btn));

    setOpenCity(false);
    setCategoryQuery("");
    setOpenCategory(true);
  }

  function goSearch() {
    const searchParams = new URLSearchParams();
    if (cityId) searchParams.set("city", cityId);
    if (categoryId) searchParams.set("category", categoryId);

    const qs = searchParams.toString();
    router.push(`/${locale}/services${qs ? `?${qs}` : ""}`);
  }

  return (
    <>
      <form
        className={styles.wrap}
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          goSearch();
        }}
      >
        <div className={styles.bar}>
          <div className={styles.segment} ref={cityWrapRef}>
            <button
              type="button"
              className={styles.dropdownField}
              onClick={toggleCity}
              ref={cityBtnRef}
              aria-haspopup="listbox"
              aria-expanded={openCity}
            >
              <span className={styles.dropdownFieldTop}>{t("cityLabel")}</span>

              <span className={styles.dropdownFieldBottom}>
                <span className={styles.fakeValue}>{cityName}</span>
                <ChevronDown className={styles.chev} />
              </span>
            </button>
          </div>

          <div className={styles.segment} ref={catWrapRef}>
            <button
              type="button"
              className={styles.dropdownField}
              onClick={toggleCategory}
              ref={catBtnRef}
              aria-haspopup="listbox"
              aria-expanded={openCategory}
            >
              <span className={styles.dropdownFieldTop}>
                {t("categoryLabel")}
              </span>

              <span className={styles.dropdownFieldBottom}>
                <span className={styles.fakeValue}>{categoryName}</span>
                <ChevronDown className={styles.chev} />
              </span>
            </button>
          </div>

          <button
            type="submit"
            className={styles.searchButton}
            aria-label={t("searchAria")}
          >
            <Search className={styles.searchIcon} strokeWidth={2} />
          </button>
        </div>
      </form>

      {mounted &&
        anyDropdownOpen &&
        createPortal(
          <>
            <div
              className={styles.dropdownBackdrop}
              onClick={closeAll}
              aria-hidden="true"
            />

            {openCity && (
              <div
                ref={cityDropdownRef}
                className={styles.dropdown}
                style={cityPanelStyle}
                role="listbox"
              >
                <div className={styles.dropdownTop}>
                  <input
                    ref={cityInputRef}
                    className={styles.dropdownSearch}
                    placeholder={t("searchCityPlaceholder")}
                    value={cityQuery}
                    onChange={(e) => setCityQuery(e.target.value)}
                  />
                  {cityId && (
                    <button
                      type="button"
                      className={styles.clearBtn}
                      onClick={() => {
                        setCityId("");
                        setOpenCity(false);
                      }}
                    >
                      {t("clear")}
                    </button>
                  )}
                </div>

                <div className={styles.dropdownList}>
                  <button
                    type="button"
                    className={`${styles.option} ${
                      !cityId ? styles.optionActive : ""
                    }`}
                    onClick={() => {
                      setCityId("");
                      setOpenCity(false);
                    }}
                  >
                    <span className={styles.optionName}>{t("allCities")}</span>
                  </button>

                  {filtersLoading && (
                    <div className={styles.noResults}>{t("loading")}</div>
                  )}

                  {!filtersLoading &&
                    filteredCities.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className={`${styles.option} ${
                          cityId === c.id ? styles.optionActive : ""
                        }`}
                        onClick={() => {
                          setCityId(c.id);
                          setOpenCity(false);
                        }}
                      >
                        <span className={styles.optionName}>{c.name}</span>
                      </button>
                    ))}

                  {!filtersLoading && filteredCities.length === 0 && (
                    <div className={styles.noResults}>{t("noResults")}</div>
                  )}
                </div>
              </div>
            )}

            {openCategory && (
              <div
                ref={categoryDropdownRef}
                className={styles.dropdown}
                style={categoryPanelStyle}
                role="listbox"
              >
                <div className={styles.dropdownTop}>
                  <input
                    ref={categoryInputRef}
                    className={styles.dropdownSearch}
                    placeholder={t("searchCategoryPlaceholder")}
                    value={categoryQuery}
                    onChange={(e) => setCategoryQuery(e.target.value)}
                  />
                  {categoryId && (
                    <button
                      type="button"
                      className={styles.clearBtn}
                      onClick={() => {
                        setCategoryId("");
                        setOpenCategory(false);
                      }}
                    >
                      {t("clear")}
                    </button>
                  )}
                </div>

                <div className={styles.dropdownList}>
                  <button
                    type="button"
                    className={`${styles.option} ${
                      !categoryId ? styles.optionActive : ""
                    }`}
                    onClick={() => {
                      setCategoryId("");
                      setOpenCategory(false);
                    }}
                  >
                    <span className={styles.optionName}>
                      {t("allCategories")}
                    </span>
                  </button>

                  {filtersLoading && (
                    <div className={styles.noResults}>{t("loading")}</div>
                  )}

                  {!filtersLoading &&
                    filteredCategories.map((c) => {
                      const Icon =
                        categoryIconMap[c.slug] ?? DefaultCategoryIcon;

                      return (
                        <button
                          key={c.id}
                          type="button"
                          className={`${styles.option} ${
                            categoryId === c.id ? styles.optionActive : ""
                          }`}
                          onClick={() => {
                            setCategoryId(c.id);
                            setOpenCategory(false);
                          }}
                        >
                          <Icon
                            className={styles.optionIcon}
                            aria-hidden="true"
                          />
                          <span className={styles.optionName}>
                            {getCategoryLabel(c)}
                          </span>
                        </button>
                      );
                    })}

                  {!filtersLoading && filteredCategories.length === 0 && (
                    <div className={styles.noResults}>{t("noResults")}</div>
                  )}
                </div>
              </div>
            )}
          </>,
          document.body,
        )}
    </>
  );
}