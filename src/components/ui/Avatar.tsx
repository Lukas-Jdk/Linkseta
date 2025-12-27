// src/components/ui/Avatar.tsx
"use client";

import Image from "next/image";
import styles from "./Avatar.module.css";

type Props = {
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  size?: number; // px
  className?: string;
};

function initialLetter(name?: string | null, email?: string | null) {
  const src = name?.trim() ? name.trim() : (email || "");
  return src.slice(0, 1).toUpperCase() || "U";
}

export default function Avatar({
  name,
  email,
  avatarUrl,
  size = 56,
  className,
}: Props) {
  const initial = initialLetter(name, email);

  return (
    <div
      className={`${styles.avatar} ${className ?? ""}`}
      style={{ width: size, height: size }}
      aria-label="Vartotojo avataras"
    >
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt="Profilio nuotrauka"
          fill
          sizes={`${size}px`}
          className={styles.img}
          priority
        />
      ) : (
        <span className={styles.initial} aria-hidden="true">
          {initial}
        </span>
      )}
    </div>
  );
}
