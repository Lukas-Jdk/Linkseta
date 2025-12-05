// src/components/hero/ServicesHero.tsx
import SearchBar from "@/components/search/SearchBar";
import styles from "./ServicesHero.module.css";

export default function ServicesHero() {
  return (
    <section className={styles.hero} aria-label="Paslaugų paieška">
      <div className="container">
        <h1 className={styles.title}>Rask lietuvių paslaugas Norvegijoje</h1>
        <p className={styles.subtitle}>
          Filtruok pagal miestą, kategoriją ir raktinius žodžius – surask
          tinkamą specialistą savo mieste.
        </p>

        <div className={styles.searchWrap}>
          <SearchBar />
        </div>
      </div>
    </section>
  );
}
