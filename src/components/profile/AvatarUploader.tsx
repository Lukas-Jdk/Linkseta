// src/components/profile/AvatarUploader.tsx
"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import styles from "./AvatarUploader.module.css";
import { Pencil } from "lucide-react";

type Props = {
  /** jei turi url iš DB, paduok čia */
  avatarUrl?: string | null;
  /** raidė fallback’ui (pvz. "T") */
  initial: string;
  onUploaded?: (url: string) => void;
};

export default function AvatarUploader({ avatarUrl, initial, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setLoading(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/profile/avatar", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(json?.error || "Nepavyko įkelti.");
        return;
      }

      const url = json.publicUrl as string;
      onUploaded?.(url);
    } catch {
      setError("Nepavyko įkelti.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className={styles.hiddenInput}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          // kad galima būtų įkelti tą patį failą iš naujo
          e.currentTarget.value = "";
        }}
      />

      <button
        type="button"
        className={styles.avatarButton}
        onClick={() => inputRef.current?.click()}
        aria-label="Keisti profilio nuotrauką"
        disabled={loading}
      >
        <div className={styles.avatarCircle} aria-hidden="true">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt="Profilio nuotrauka"
              fill
              className={styles.avatarImg}
              sizes="96px"
            />
          ) : (
            <span className={styles.initial}>{initial}</span>
          )}
        </div>

        {/* overlay rodomas per CSS: hover/focus */}
        <div className={styles.overlay} aria-hidden="true">
          <div className={styles.overlayInner}>
            <Pencil className={styles.icon} />
            <span className={styles.overlayText}>
              {loading ? "Įkeliama..." : "Keisti nuotrauką"}
            </span>
            <span className={styles.overlaySub}>JPG / PNG / WEBP · iki 5MB</span>
          </div>
        </div>

        {/* mobile ikonėlė (rodoma tik mažam ekrane) */}
        <span className={styles.mobilePill} aria-hidden="true">
          <Pencil className={styles.mobileIcon} />
        </span>
      </button>

      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
}
