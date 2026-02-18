//  src/app/[locale]/admin/services/ActionButtons.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import styles from "../provider-requests/provider-requests.module.css";

type ActionProps = {
  id: string;
  isActive: boolean;
  highlighted: boolean;
};

export default function ActionButtons({
  id,
  isActive,
  highlighted,
}: ActionProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function toggleActive() {
    try {
      setError(null);

      const res = await fetch(`/api/admin/services/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        console.error("toggleActive failed:", json);
        setError(
          (json && typeof json === "object" && "error" in json
            ? (json as { error?: string }).error
            : null) || "Nepavyko atnaujinti paslaugos."
        );
        return;
      }

      startTransition(() => {
        router.refresh();
      });
    } catch (e) {
      console.error("toggleActive error:", e);
      setError("Serverio klaida. Bandykite dar kartą.");
    }
  }

  async function toggleHighlight() {
    try {
      setError(null);

      const res = await fetch(`/api/admin/services/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ highlighted: !highlighted }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        console.error("toggleHighlight failed:", json);
        setError(
          (json && typeof json === "object" && "error" in json
            ? (json as { error?: string }).error
            : null) || "Nepavyko atnaujinti highlight statuso."
        );
        return;
      }

      startTransition(() => {
        router.refresh();
      });
    } catch (e) {
      console.error("toggleHighlight error:", e);
      setError("Serverio klaida. Bandykite dar kartą.");
    }
  }

  return (
    <div className={styles.actionsCell}>
      <button
        type="button"
        onClick={toggleActive}
        disabled={pending}
        className={isActive ? styles.btnSecondary : styles.btnPrimary}
      >
        {isActive ? "Išjungti" : "Įjungti"}
      </button>

      <button
        type="button"
        onClick={toggleHighlight}
        disabled={pending}
        className={highlighted ? styles.btnSecondary : styles.btnHighlight}
      >
        {highlighted ? "Nuimti TOP" : "Pažymėti TOP"}
      </button>

      {error && <p className={styles.inlineError}>{error}</p>}
    </div>
  );
}
