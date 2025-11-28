// src/app/susisiekite/ContactForm.tsx
"use client";

import styles from "./susisiekite.module.css";

export default function ContactForm() {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    alert(
      "Forma šiuo metu testinė. Parašykite į info@linkseta.com 😊"
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label className={styles.label}>Vardas</label>
        <input
          className={styles.input}
          type="text"
          placeholder="Jūsų vardas"
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>El. paštas</label>
        <input
          className={styles.input}
          type="email"
          placeholder="jusu@pastas.lt"
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Žinutė</label>
        <textarea
          className={styles.textarea}
          rows={4}
          placeholder="Trumpai aprašykite klausimą ar idėją"
        />
      </div>

      <button type="submit" className={styles.submitButton}>
        Siųsti žinutę (demo)
      </button>
    </form>
  );
}
