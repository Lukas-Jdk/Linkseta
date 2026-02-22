// src/app/[locale]/admin/services/ActionButtons.tsx
"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import styles from "../provider-requests/provider-requests.module.css";

type ActionProps = {
  id: string;
  isActive: boolean;
  highlighted: boolean;
};

type ApiError = { error?: string; details?: string };

async function readJsonIfPossible(res: Response): Promise<unknown | null> {
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    // bandom paimt tekstą dėl debug, bet neversim į JSON
    return null;
  }
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function extractError(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "error" in payload) {
    const err = (payload as ApiError).error;
    if (typeof err === "string" && err.trim()) return err;
  }
  return fallback;
}

export default function ActionButtons({ id, isActive, highlighted }: ActionProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [busyAction, setBusyAction] = useState<"active" | "highlight" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const disabled = pending || busyAction !== null;

  const activeLabel = useMemo(() => (isActive ? "Išjungti" : "Įjungti"), [isActive]);
  const topLabel = useMemo(
    () => (highlighted ? "Nuimti TOP" : "Pažymėti TOP"),
    [highlighted],
  );

  async function patch(data: { isActive?: boolean; highlighted?: boolean }) {
    const res = await fetch(`/api/admin/services/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const json = await readJsonIfPossible(res);
    if (!res.ok) {
      throw new Error(extractError(json, "Nepavyko atnaujinti paslaugos."));
    }
  }

  async function toggleActive() {
    try {
      setError(null);

      // optional: patvirtinimas prieš išjungimą
      if (isActive) {
        const ok = window.confirm("Tikrai išjungti paslaugą? Ji nebesimatys viešai.");
        if (!ok) return;
      }

      setBusyAction("active");
      await patch({ isActive: !isActive });

      startTransition(() => {
        router.refresh();
      });
    } catch (e: any) {
      console.error("toggleActive error:", e);
      setError(e?.message ?? "Serverio klaida. Bandykite dar kartą.");
    } finally {
      setBusyAction(null);
    }
  }

  async function toggleHighlight() {
    try {
      setError(null);
      setBusyAction("highlight");
      await patch({ highlighted: !highlighted });

      startTransition(() => {
        router.refresh();
      });
    } catch (e: any) {
      console.error("toggleHighlight error:", e);
      setError(e?.message ?? "Serverio klaida. Bandykite dar kartą.");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className={styles.actionsCell}>
      <button
        type="button"
        onClick={toggleActive}
        disabled={disabled}
        className={isActive ? styles.btnSecondary : styles.btnPrimary}
        aria-busy={busyAction === "active" ? "true" : "false"}
      >
        {busyAction === "active" ? "Vykdoma..." : activeLabel}
      </button>

      <button
        type="button"
        onClick={toggleHighlight}
        disabled={disabled}
        className={highlighted ? styles.btnSecondary : styles.btnHighlight}
        aria-busy={busyAction === "highlight" ? "true" : "false"}
      >
        {busyAction === "highlight" ? "Vykdoma..." : topLabel}
      </button>

      {error && <p className={styles.inlineError}>{error}</p>}
    </div>
  );
}