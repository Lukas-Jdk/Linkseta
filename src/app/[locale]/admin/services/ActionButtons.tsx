// src/app/[locale]/admin/services/ActionButtons.tsx
"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import styles from "../admin.module.css";
import { csrfFetch } from "@/lib/csrfClient";

type ActionProps = {
  id: string;
  isActive: boolean;
  highlighted: boolean;
};

type ApiError = { error?: string };

function extractError(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "error" in payload) {
    const err = (payload as ApiError).error;
    if (typeof err === "string" && err.trim()) return err;
  }
  return fallback;
}

async function readJsonIfPossible(res: Response): Promise<unknown | null> {
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export default function ActionButtons({ id, isActive, highlighted }: ActionProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  async function doPatch(
    payload: { isActive?: boolean; highlighted?: boolean },
    fallbackMsg: string,
  ) {
    try {
      if (mountedRef.current) setError(null);

      const res = await csrfFetch(`/api/admin/services/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      const json = await readJsonIfPossible(res);

      if (!res.ok) {
        const msg =
          res.status === 403
            ? "Saugumo patikra nepraėjo (CSRF / teisės). Perkrauk puslapį ir bandyk dar."
            : res.status === 429
              ? "Per daug veiksmų per trumpą laiką. Palauk minutę ir bandyk dar."
              : extractError(json, fallbackMsg);

        console.error("Admin service patch failed:", { status: res.status, json });

        if (mountedRef.current) setError(msg);
        return;
      }

      startTransition(() => router.refresh());
    } catch (e) {
      console.error("Admin service patch error:", e);
      if (mountedRef.current) setError("Serverio klaida. Bandykite dar kartą.");
    }
  }

  return (
    <div className={styles.actionsCell}>
      <button
        type="button"
        onClick={() =>
          doPatch({ isActive: !isActive }, "Nepavyko atnaujinti paslaugos.")
        }
        disabled={pending}
        className={isActive ? styles.btnSecondary : styles.btnPrimary}
      >
        {isActive ? "Išjungti" : "Įjungti"}
      </button>

      <button
        type="button"
        onClick={() =>
          doPatch({ highlighted: !highlighted }, "Nepavyko atnaujinti TOP statuso.")
        }
        disabled={pending}
        className={highlighted ? styles.btnSecondary : styles.btnHighlight}
      >
        {highlighted ? "Nuimti TOP" : "Pažymėti TOP"}
      </button>

      {error && <p className={styles.inlineError}>{error}</p>}
    </div>
  );
}