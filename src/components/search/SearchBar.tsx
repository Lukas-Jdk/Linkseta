/* src/components/search/SearchBar.tsx */

"use client";
import styles from "./SearchBar.module.css";

export default function SearchBar() {
  return (
    <form
      className={styles.wrap}
      role="search"
      action="/services"
      method="get"
    >
      {/* VIRŠUS: paieškos juosta + mygtukas */}
      <div className={styles.topRow}>
        <input
          className={styles.input}
          name="q"
          placeholder="Ieškoti pagal vardą..."
          aria-label="Ieškoti pagal vardą"
        />

        <button
          className={styles.btn}
          aria-label="Ieškoti"
          type="submit"
        >
          🔍
        </button>
      </div>

      {/* APAČIA: miestas + kategorija */}
      <div className={styles.bottomRow}>
        <div className={styles.selectWrap}>
          <select
            name="city"
            className={styles.select}
            aria-label="Miestas"
            defaultValue=""
          >
            <option value="">Visi miestai</option>
            <option value="oslo">Oslo</option>
            <option value="bergen">Bergenas</option>
            <option value="stavanger">Stavangeris</option>
            <option value="trondheim">Trondheim</option>
          </select>
        </div>

        <div className={styles.selectWrap}>
          <select
            name="category"
            className={styles.select}
            aria-label="Kategorija"
            defaultValue=""
          >
            <option value="">Visos kategorijos</option>
            <option value="statybos">Statyba</option>
            <option value="apskaita">Apskaita</option>
            <option value="automobiliai">Automobiliai</option>
            <option value="nt">NT</option>
          </select>
        </div>
      </div>
    </form>
  );
}
