// src/components/cta/BecomeProviderCTA.tsx
import Link from "next/link";
import styles from "./BecomeProviderCTA.module.css";

export default function BecomeProviderCTA() {
  return (
    <section className={styles.section} aria-label="Tapti paslaugų teikėju">
      <div className={styles.inner}>
        <h2 className={styles.title}>Siūlykite savo paslaugas</h2>

        <p className={styles.subtitle}>
          Prisijunkite prie augančios bendruomenės ir pasiekite tūkstančius
          lietuvių klientų visoje Norvegijoje.
        </p>

        <Link href="/register" className={styles.button}>
          Tapti teikėju
        </Link>
      </div>
    </section>
  );
}
