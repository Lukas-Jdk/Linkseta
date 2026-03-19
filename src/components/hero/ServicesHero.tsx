// src/components/hero/ServicesHero.tsx
import { useTranslations } from "next-intl";
import SearchBar from "@/components/search/SearchBar";
import styles from "./ServicesHero.module.css";

export default function ServicesHero() {
  const t = useTranslations("servicesHero");

  return (
    <section className={styles.hero} aria-label={t("aria")}>
      <div className="container">
        <h1 className={styles.title}>
          {t.rich("title", {
            mark: (chunks) => <span className={styles.mark}>{chunks}</span>,
          })}
        </h1>

        <p className={styles.subtitle}>
          {t.rich("subtitle", {
            accent: (chunks) => (
              <span className={styles.softAccent}>{chunks}</span>
            ),
          })}
        </p>

        <div className={styles.searchWrap}>
          <SearchBar />
        </div>

        <div className={styles.divider} />
      </div>
    </section>
  );
}