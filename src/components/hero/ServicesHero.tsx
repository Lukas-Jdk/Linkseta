// src/components/hero/ServicesHero.tsx
import SearchBar from "@/components/search/SearchBar";
import styles from "./ServicesHero.module.css";

export default function ServicesHero() {
  return (
    <section className={styles.hero} aria-label="Paslaugų paieška">
      <div className="container">
       
        <h1 className={styles.title}>
          Paslaugos tavo mieste{" "}
          <span className={styles.mark}>Norvegijoje</span>
        </h1>

        <p className={styles.subtitle}>
          Filtruok pagal{" "}
          <span className={styles.softAccent}>miestą</span>,{" "}
          <span className={styles.softAccent}>kategoriją</span> ar{" "}
          <span className={styles.softAccent}>raktinius žodžius</span> – surask
          tinkamą specialistą savo mieste.
        </p>

        <div className={styles.searchWrap}>
          <SearchBar />
        </div>

        <div className={styles.divider} />
      </div>
    </section>
  );
}
