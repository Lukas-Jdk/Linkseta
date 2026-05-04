// src/app/[locale]/dashboard/BillingPortalButton.tsx
"use client";

import { useState } from "react";
import styles from "./dashboard.module.css";

type Props = {
  label: string;
  loadingLabel: string;
};

export default function BillingPortalButton({ label, loadingLabel }: Props) {
  const [loading, setLoading] = useState(false);

  async function openBillingPortal() {
    setLoading(true);

    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.url) {
        throw new Error(data?.error || "Nepavyko atidaryti prenumeratos.");
      }

      window.location.href = data.url;
    } catch (err) {
      alert(err instanceof Error ? err.message : "Įvyko klaida.");
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      className={styles.billingManageBtn}
      onClick={openBillingPortal}
      disabled={loading}
    >
      {loading ? loadingLabel : label}
    </button>
  );
}