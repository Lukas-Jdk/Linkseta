// src/components/layout/ThemeToggle.tsx
"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import styles from "./ThemeToggle.module.css";

export default function ThemeToggle() {
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = localStorage.getItem("theme");
    const systemPrefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;

    const theme = stored ?? (systemPrefersLight ? "light" : "dark");
    document.documentElement.dataset.theme = theme;

    
  }, []);

  function toggle() {
    const newTheme = isLight ? "dark" : "light";
    document.documentElement.dataset.theme = newTheme;
    localStorage.setItem("theme", newTheme);
    setIsLight(!isLight);
  }

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={toggle}
      aria-label="Perjungti temą"
    >
      {isLight ? (
        <Sun className={styles.icon} strokeWidth={1.6} />
      ) : (
        <Moon className={styles.icon} strokeWidth={1.6} />
      )}
    </button>
  );
}
