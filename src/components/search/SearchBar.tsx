/* src/components/search/SearchBar.tsx */

"use client";
import styles from "./SearchBar.module.css";

export default function SearchBar() {
  return (
    <form className={styles.wrap} role="search" action="/" onSubmit={(e)=>e.preventDefault()}>
      <input
        className={styles.input}
        placeholder="Ieškoti pagal vardą..."
        aria-label="Ieškoti pagal vardą"
      />
      <button className={styles.btn} aria-label="Ieškoti">🔍</button>
    </form>
  );
}
