// src/components/hero/AnimatedTitle.tsx
"use client";

import { useState, useEffect } from "react";
import styles from "./AnimatedTitle.module.css";

const WORDS = ["kirpėjo?", "mokytojo?", "meistro?", "specialisto?"];

export default function AnimatedTitle() {
  const [index, setIndex] = useState(0);
  const [animate, setAnimate] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimate(false);

      setTimeout(() => {
        setIndex((prev) => (prev + 1) % WORDS.length);
        setAnimate(true);
      }, 400);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.wrapper}>
      <h1 className={styles.title}>
        Ieškai tinkamo{" "}
        <span className={styles.slot}>
          <span
            className={`${styles.word} ${
              animate ? styles.slideIn : styles.slideOut
            }`}
          >
            {WORDS[index]}
          </span>
        </span>
      </h1>
    </div>
  );
}
