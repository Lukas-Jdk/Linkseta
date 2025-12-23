// src/components/search/SearchBar.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./SearchBar.module.css";
import { Search, ChevronDown} from "lucide-react";
import { categoryIconMap, DefaultCategoryIcon } from "@/lib/categoryIcons";

type CityOption = { id: string; name: string };
type CategoryOption = { id: string; name: string; slug: string };

function useOnClickOutside<T extends HTMLElement>(
  refs: React.RefObject<T | null>[],
  handler: () => void
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

  useOnClickOutside([cityWrapRef], () => setOpenCity(false));
  useOnClickOutside([catWrapRef], () => setOpenCategory(false));

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/public/filters", { cache: "no-store" });
      const data = await res.json();

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
    return (
      categories.find((c) => c.id === categoryId)?.name ?? "Pasirinkite..."
    );
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

  function toggleCity() {
    setOpenCity((v) => {
      const next = !v;
      if (next) {
        setOpenCategory(false);
        setCityQuery("");
      }
      return next;
    });
  }

  function toggleCategory() {
    setOpenCategory((v) => {
      const next = !v;
      if (next) {
        setOpenCity(false);
        setCategoryQuery("");
      }
      return next;
    });
  }

  return (
    <form className={styles.wrap} role="search" action="/services" method="get">
      {/* hidden inputai, kad /services filtrai veiktų kaip dabar */}
      <input type="hidden" name="city" value={cityId} />
      <input type="hidden" name="category" value={categoryId} />

      <div className={styles.bar}>
        {/* RAKTINIS */}
        <div className={styles.segment}>
          <div className={styles.label}>
            <div className={styles.labelText}>Raktinis žodis</div>
            <input
              className={styles.input}
              name="q"
              placeholder="Neprivaloma..."
              autoComplete="off"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        {/* MIESTAS */}
        <div className={styles.segment} ref={cityWrapRef}>
          <div className={styles.label}>
            <div className={styles.labelText}>Miestas</div>
            

            <button
              type="button"
              className={styles.dropdownBtn}
              onClick={toggleCity}
              aria-haspopup="listbox"
              aria-expanded={openCity}
            >
              <span className={styles.dropdownLeft}>
                
                <span className={styles.fakeValue}>{cityName}</span>
              </span>
              <ChevronDown className={styles.chev} />
            </button>

            {openCity && (
              <div className={styles.dropdown} role="listbox">
                <div className={styles.dropdownTop}>
                  <input
                    className={styles.dropdownSearch}
                    placeholder="Ieškoti miesto..."
                    value={cityQuery}
                    onChange={(e) => setCityQuery(e.target.value)}
                    autoFocus
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

                  {filteredCities.length === 0 && (
                    <div className={styles.noResults}>Nieko nerasta.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* KATEGORIJA (su ikonėlėm) */}
        <div className={styles.segment} ref={catWrapRef}>
          <div className={styles.label}>
            <div className={styles.labelText}>Kategorija</div>

            <button
              type="button"
              className={styles.dropdownBtn}
              onClick={toggleCategory}
              aria-haspopup="listbox"
              aria-expanded={openCategory}
            >
              <span className={styles.dropdownLeft}>
                
                <span className={styles.fakeValue}>{categoryName}</span>
              </span>
              <ChevronDown className={styles.chev} />
            </button>

            {openCategory && (
              <div className={styles.dropdown} role="listbox">
                <div className={styles.dropdownTop}>
                  <input
                    className={styles.dropdownSearch}
                    placeholder="Ieškoti kategorijos..."
                    value={categoryQuery}
                    onChange={(e) => setCategoryQuery(e.target.value)}
                    autoFocus
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
                    className={`${styles.option} ${
                      !categoryId ? styles.optionActive : ""
                    }`}
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
                        className={`${styles.option} ${
                          categoryId === c.id ? styles.optionActive : ""
                        }`}
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
          </div>
        </div>

        {/* SEARCH */}
        <button
          type="submit"
          className={styles.searchButton}
          aria-label="Ieškoti paslaugų"
        >
          <Search className={styles.searchIcon} strokeWidth={2} />
        </button>
      </div>
    </form>
  );
}
