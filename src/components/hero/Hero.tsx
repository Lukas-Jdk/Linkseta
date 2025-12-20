// src/components/hero/Hero.tsx

import AnimatedTitle from "./AnimatedTitle";
import styles from "./Hero.module.css";

export default function Hero({ children }: { children: React.ReactNode }) {
  return (
    <section className={styles.hero} role="region" aria-label="Paieška">
      <div className={styles.bgGlow} aria-hidden="true" />
      <div className="container">
        <div className={styles.inner}>
        

          <AnimatedTitle />

          <p className={styles.subtitle}>
            Čia rasi paslaugų teikėjus iš Norvegijos – peržiūrėk
            profilius ir susisiek tiesiogiai.
          </p>

          <div className={styles.searchWrap}>{children}</div>

          {/* jei norėsi, čia galima pridėti statistiką / punktus */}
          {/* <div className={styles.metaRow}>
            <span>+120 patikrintų paslaugų teikėjų</span>
            <span>Paslaugos visuose didžiausiuose miestuose</span>
          </div> */}
        </div>
        <div className={styles.divider}></div>
      </div>
      
    </section>
  );
}
