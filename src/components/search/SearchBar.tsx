// src/components/search/SearchBar.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./SearchBar.module.css";
import { Search, ChevronDown } from "lucide-react";
import { categoryIconMap, DefaultCategoryIcon } from "@/lib/categoryIcons";
import { useParams, useRouter } from "next/navigation";

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

export default function SearchBar() {
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "lt";

  const [mounted, setMounted] = useState(false);

  const [cities, setCities] = useState<CityOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  const [q, setQ] = useState("");
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

  useOnClickOutside(
    [cityWrapRef, cityDropdownRef, catWrapRef, categoryDropdownRef],
    () => {
      setOpenCity(false);
      setOpenCategory(false);
    },
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/public/filters", { cache: "no-store" });
      const data = await res.json().catch(() => ({} as any));
      setCities(data.cities ?? []);
      setCategories(data.categories ?? []);
    }
    load();
  }, []);

  const cityName = useMemo(() => {
    if (!cityId) return "Pasirinkite...";
    return cities.find((c) => c.id === cityId)?.name ?? "Pasirinkite...";
  }, [cityId, cities]);

  const categoryName = useMemo(() => {
    if (!categoryId) return "Pasirinkite...";
    return categories.find((c) => c.id === categoryId)?.name ?? "Pasirinkite...";
  }, [categoryId, categories]);

  const filteredCities = useMemo(() => {
    const nq = normalize(cityQuery);
    if (!nq) return cities;
    return cities.filter((c) => normalize(c.name).includes(nq));
  }, [cities, cityQuery]);

  const filteredCategories = useMemo(() => {
    const nq = normalize(categoryQuery);
    if (!nq) return categories;
    return categories.filter((c) => normalize(c.name).includes(nq));
  }, [categories, categoryQuery]);

  const anyDropdownOpen = openCity || openCategory;

  function closeAll() {
    setOpenCity(false);
    setOpenCategory(false);
  }

  function calcPanelStyle(el: HTMLButtonElement): React.CSSProperties {
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
  }

  function updateCityPanelPosition() {
    const el = cityBtnRef.current;
    if (!el) return;
    setCityPanelStyle(calcPanelStyle(el));
  }

  function updateCategoryPanelPosition() {
    const el = catBtnRef.current;
    if (!el) return;
    setCategoryPanelStyle(calcPanelStyle(el));
  }

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
  }, [openCity]);

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
  }, [openCategory]);

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

  function toggleCity() {
    const btn = cityBtnRef.current;

    if (openCity) {
      setOpenCity(false);
      return;
    }

    if (btn) {
      setCityPanelStyle(calcPanelStyle(btn));
    }

    setOpenCategory(false);
    setCityQuery("");
    setOpenCity(true);
  }

  function toggleCategory() {
    const btn = catBtnRef.current;

    if (openCategory) {
      setOpenCategory(false);
      return;
    }

    if (btn) {
      setCategoryPanelStyle(calcPanelStyle(btn));
    }

    setOpenCity(false);
    setCategoryQuery("");
    setOpenCategory(true);
  }

  function goSearch() {
    const searchParams = new URLSearchParams();
    if (q.trim()) searchParams.set("q", q.trim());
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
            <div className={styles.label}>
              <div className={styles.labelText}>Miestas</div>

              <button
                type="button"
                className={styles.dropdownBtn}
                onClick={toggleCity}
                ref={cityBtnRef}
                aria-haspopup="listbox"
                aria-expanded={openCity}
              >
                <span className={styles.dropdownLeft}>
                  <span className={styles.fakeValue}>{cityName}</span>
                </span>
                <ChevronDown className={styles.chev} />
              </button>
            </div>
          </div>

          <div className={styles.segment} ref={catWrapRef}>
            <div className={styles.label}>
              <div className={styles.labelText}>Kategorija</div>

              <button
                type="button"
                className={styles.dropdownBtn}
                onClick={toggleCategory}
                ref={catBtnRef}
                aria-haspopup="listbox"
                aria-expanded={openCategory}
              >
                <span className={styles.dropdownLeft}>
                  <span className={styles.fakeValue}>{categoryName}</span>
                </span>
                <ChevronDown className={styles.chev} />
              </button>
            </div>
          </div>

          <button
            type="submit"
            className={styles.searchButton}
            aria-label="Ieškoti paslaugų"
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
                    placeholder="Ieškoti miesto..."
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
                      Išvalyti
                    </button>
                  )}
                </div>

                <div className={styles.dropdownList}>
                  <button
                    type="button"
                    className={`${styles.option} ${!cityId ? styles.optionActive : ""}`}
                    onClick={() => {
                      setCityId("");
                      setOpenCity(false);
                    }}
                  >
                    <span className={styles.optionName}>Visi miestai</span>
                  </button>

                  {filteredCities.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={`${styles.option} ${cityId === c.id ? styles.optionActive : ""}`}
                      onClick={() => {
                        setCityId(c.id);
                        setOpenCity(false);
                      }}
                    >
                      <span className={styles.optionName}>{c.name}</span>
                    </button>
                  ))}

                  {filteredCities.length === 0 && (
                    <div className={styles.noResults}>Nieko nerasta.</div>
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
                    placeholder="Ieškoti kategorijos..."
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
                      Išvalyti
                    </button>
                  )}
                </div>

                <div className={styles.dropdownList}>
                  <button
                    type="button"
                    className={`${styles.option} ${!categoryId ? styles.optionActive : ""}`}
                    onClick={() => {
                      setCategoryId("");
                      setOpenCategory(false);
                    }}
                  >
                    <span className={styles.optionName}>Visos kategorijos</span>
                  </button>

                  {filteredCategories.map((c) => {
                    const Icon = categoryIconMap[c.slug] ?? DefaultCategoryIcon;

                    return (
                      <button
                        key={c.id}
                        type="button"
                        className={`${styles.option} ${categoryId === c.id ? styles.optionActive : ""}`}
                        onClick={() => {
                          setCategoryId(c.id);
                          setOpenCategory(false);
                        }}
                      >
                        <Icon className={styles.optionIcon} aria-hidden="true" />
                        <span className={styles.optionName}>{c.name}</span>
                      </button>
                    );
                  })}

                  {filteredCategories.length === 0 && (
                    <div className={styles.noResults}>Nieko nerasta.</div>
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