// src/components/cta/BecomeProviderCTA.tsx
"use client";

import LocalizedLink from "@/components/i18n/LocalizedLink";
import styles from "./BecomeProviderCTA.module.css";

export default function BecomeProviderCTA() {
  return (
    <section className={styles.section} aria-label="Tapti paslaugų teikėju">
      <div className={styles.inner}>
        <h2 className={styles.title}>Siūlykite savo paslaugas Norvegijoje</h2>

        <p className={styles.subtitle}>
          Prisijunkite prie Linkseta ir tapkite matomi žmonėms, ieškantiems
          patikimų paslaugų teikėjų. Sukurkite skelbimą ir pradėkite gauti
          užklausas.
        </p>

        <LocalizedLink href="/tapti-teikeju" className={styles.button}>
          Tapti teikėju
        </LocalizedLink>
      </div>
    </section>
  );
}
