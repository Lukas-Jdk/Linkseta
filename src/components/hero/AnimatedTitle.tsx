
// src/components/hero/AnimatedTitle.tsx
import styles from "./AnimatedTitle.module.css";

export default function AnimatedTitle() {
  return (
    <div className={styles.wrapper}>
      <h1 className={styles.title}>
        Ieškai tinkamo <span className={styles.highlight}>specialisto?</span>
      </h1>
    </div>
  );
}