// src/components/profile/AvatarUploader.tsx
"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import styles from "./AvatarUploader.module.css";
import { Pencil } from "lucide-react";
import { withCsrfHeaders } from "@/lib/csrfClient";

type Props = {
  avatarUrl?: string | null;
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

      //  CSRF header, bet FormData turi pats nustatyti Content-Type su boundary
      const headers = await withCsrfHeaders();
      headers.delete("Content-Type");

      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        headers,
        body: fd,
        credentials: "same-origin",
        cache: "no-store",
      });

      const json = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        setError(json?.error || "Nepavyko įkelti.");
        return;
      }

      const url = json.publicUrl as string;
      onUploaded?.(url);
    } catch (e) {
      console.error(e);
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
          if (f) void upload(f);
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

        <div className={styles.overlay} aria-hidden="true">
          <div className={styles.overlayInner}>
            <Pencil className={styles.icon} />
            <span className={styles.overlayText}>
              {loading ? "Įkeliama..." : "Keisti nuotrauką"}
            </span>
            <span className={styles.overlaySub}>JPG / PNG / WEBP · iki 5MB</span>
          </div>
        </div>

        <span className={styles.mobilePill} aria-hidden="true">
          <Pencil className={styles.mobileIcon} />
        </span>
      </button>

      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
}