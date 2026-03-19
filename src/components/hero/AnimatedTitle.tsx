
// src/components/hero/AnimatedTitle.tsx

import { useTranslations } from "next-intl";
import styles from "./AnimatedTitle.module.css";

export default function AnimatedTitle() {
  const t = useTranslations("hero");

  return (
    <div className={styles.wrapper}>
      <h1 className={styles.title}>
        {t.rich("title", {
          highlight: (chunks) => (
            <span className={styles.highlight}>{chunks}</span>
          ),
        })}
      </h1>
    </div>
  );
}