// src/components/hero/Hero.tsx

import { useTranslations } from "next-intl";
import AnimatedTitle from "./AnimatedTitle";
import styles from "./Hero.module.css";

type Props = {
  children: React.ReactNode;
};

export default function Hero({ children }: Props) {
  const t = useTranslations("hero");

  return (
    <section
      className={styles.hero}
      role="region"
      aria-label={t("aria")}
    >
      <div className={styles.bgGlow} aria-hidden="true" />

      <div className="container">
        <div className={styles.inner}>
          <AnimatedTitle />

          <p className={styles.subtitle}>
            {t("subtitle")}
          </p>

          <div className={styles.searchWrap}>{children}</div>
        </div>

        <div className={styles.divider} />
      </div>
    </section>
  );
}