// src/components/cta/BecomeProviderCTA.tsx
import Link from "next/link";
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

        <Link href="/tapti-teikeju" className={styles.button}>
          Tapti teikėju
        </Link>
      </div>
    </section>
  );
}