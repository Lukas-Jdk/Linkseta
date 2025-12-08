/* src/components/hero/Hero.tsx */

import AnimatedTitle from "./AnimatedTitle";
import styles from "./Hero.module.css";

export default function Hero({ children }: { children: React.ReactNode }) {
  return (
    <section className={styles.hero} role="region" aria-label="Paieška">
      <div className="container">
        <AnimatedTitle />
        <p className={styles.subtitle}>
          Čia rasi paslaugų teikėjus iš Norvegijos – peržiūrėk
          profilius ir susisiek tiesiogiai.
        </p>
        {children}
      </div>
    </section>
  );
}
